
import json
from unittest.mock import call, patch

import pytest
import requests

from app.services.llm_service import _extract_json, explain_findings


def test_valid_explanation_is_accepted():
    content = """
    {
      "explanations": [
        {
          "rule": "B307",
          "root_cause": "The code uses eval().",
          "impact": "Untrusted input could execute unintended code.",
          "suggested_fix": "Use a safer alternative where appropriate.",
          "confidence": "high"
        }
      ]
    }
    """
    result = _extract_json(content, {"B307"})

    assert result["validation"]["complete"] is True
    assert result["validation"]["explained_rules"] == 1
    assert result["explanations"][0]["rule"] == "B307"


def test_unknown_rule_is_rejected():
    content = """
    {
      "explanations": [
        {
          "rule": "UNKNOWN_RULE",
          "root_cause": "Unsupported finding.",
          "impact": "Unknown.",
          "suggested_fix": "Review the scanner output.",
          "confidence": "low"
        }
      ]
    }
    """
    result = _extract_json(content, {"B307"})

    assert result["explanations"] == []
    assert result["validation"]["rejected_rules"] == ["UNKNOWN_RULE"]
    assert result["validation"]["missing_rules"] == ["B307"]
    assert result["validation"]["complete"] is False


def test_duplicate_rule_is_explained_only_once():
    explanation = {
        "rule": "B307",
        "root_cause": "The code uses eval().",
        "impact": "Untrusted input may execute code.",
        "suggested_fix": "Use a safer alternative.",
        "confidence": "high",
    }
    result = _extract_json(
        json.dumps({"explanations": [explanation, explanation]}),
        {"B307"},
    )

    assert len(result["explanations"]) == 1
    assert result["validation"]["explained_rules"] == 1


def test_missing_explanation_is_reported():
    result = _extract_json('{"explanations": []}', {"B307", "F401"})

    assert result["validation"]["missing_rules"] == ["B307", "F401"]
    assert result["validation"]["complete"] is False


def test_invalid_json_is_rejected():
    with pytest.raises(ValueError):
        _extract_json("this is not valid JSON", {"B307"})


def test_missing_required_field_is_rejected():
    content = """
    {
      "explanations": [
        {
          "rule": "B307",
          "root_cause": "The code uses eval()."
        }
      ]
    }
    """
    with pytest.raises(ValueError):
        _extract_json(content, {"B307"})


@pytest.fixture
def scanner_findings():
    return [
        {
            "rule": "B307",
            "severity": "warning",
            "message": "Use of eval detected.",
            "line": 4,
        }
    ]


@pytest.fixture
def valid_model_result():
    return {
        "status": "success",
        "provider": "nvidia",
        "model": "model-two",
        "explanations": [
            {
                "rule": "B307",
                "root_cause": "The code uses eval().",
                "impact": "Untrusted input could execute code.",
                "suggested_fix": "Use a safer alternative.",
                "confidence": "high",
            }
        ],
        "validation": {
            "expected_rules": 1,
            "explained_rules": 1,
            "missing_rules": [],
            "rejected_rules": [],
            "complete": True,
        },
    }


@patch("app.services.llm_service._request_model")
def test_fallback_succeeds_when_first_model_fails(
    mock_request_model,
    scanner_findings,
    valid_model_result,
    monkeypatch,
):
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODELS", "model-one,model-two")
    mock_request_model.side_effect = [
        requests.Timeout("Simulated timeout"),
        valid_model_result,
    ]

    result = explain_findings(
        language="python",
        filename="sample.py",
        source_code="print('example')",
        findings=scanner_findings,
    )

    assert result["status"] == "success"
    assert result["fallback_used"] is True
    assert result["failed_models"] == ["model-one"]
    assert result["model"] == "model-two"
    assert mock_request_model.call_args_list == [
        call(
            model="model-one",
            api_key="test-key",
            language="python",
            filename="sample.py",
            findings=scanner_findings,
        ),
        call(
            model="model-two",
            api_key="test-key",
            language="python",
            filename="sample.py",
            findings=scanner_findings,
        ),
    ]


@patch("app.services.llm_service._request_model")
def test_all_models_failing_returns_unavailable(
    mock_request_model,
    scanner_findings,
    monkeypatch,
):
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODELS", "model-one,model-two")
    mock_request_model.side_effect = [
        requests.Timeout("Simulated timeout"),
        requests.ConnectionError("Simulated connection failure"),
    ]

    result = explain_findings(
        language="python",
        filename="sample.py",
        source_code="print('example')",
        findings=scanner_findings,
    )

    assert result["status"] == "unavailable"
    assert result["failed_models"] == ["model-one", "model-two"]
    assert result["explanations"] == []
    assert result["validation"]["missing_rules"] == ["B307"]
    assert result["validation"]["complete"] is False
    assert mock_request_model.call_count == 2


@patch("app.services.llm_service._request_model")
def test_invalid_model_response_triggers_fallback(
    mock_request_model,
    scanner_findings,
    valid_model_result,
    monkeypatch,
):
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODELS", "model-one,model-two")
    mock_request_model.side_effect = [
        ValueError("Invalid model response"),
        valid_model_result,
    ]

    result = explain_findings(
        language="python",
        filename="sample.py",
        source_code="print('example')",
        findings=scanner_findings,
    )

    assert result["status"] == "success"
    assert result["fallback_used"] is True
    assert result["failed_models"] == ["model-one"]
    assert result["model"] == "model-two"
    assert result["validation"]["complete"] is True
    assert mock_request_model.call_count == 2
