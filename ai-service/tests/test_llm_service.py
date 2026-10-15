import pytest

from app.services.llm_service import _extract_json


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

    import json

    result = _extract_json(
        json.dumps({"explanations": [explanation, explanation]}),
        {"B307"},
    )

    assert len(result["explanations"]) == 1
    assert result["validation"]["explained_rules"] == 1


def test_missing_explanation_is_reported():
    result = _extract_json(
        '{"explanations": []}',
        {"B307", "F401"},
    )

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