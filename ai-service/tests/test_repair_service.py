
from unittest.mock import patch

import pytest

from app.services.repair_service import propose_repair

from unittest.mock import MagicMock, patch

SOURCE_CODE = """def calculate(value):
    return eval(value)
"""

FIXED_CODE = """import ast

def calculate(value):
    return ast.literal_eval(value)
"""

FINDING = {
    "rule": "B307",
    "message": "Use of eval detected.",
    "line": 2,
}


@pytest.fixture
def mock_scanners(monkeypatch):
    """Mock scanners and the NVIDIA client."""
    from unittest.mock import MagicMock

    scanner = MagicMock()
    client = MagicMock()

    monkeypatch.setattr(
        "app.services.repair_service._get_findings",
        scanner,
    )

    openai_context = MagicMock()
    openai_context.__enter__.return_value = client
    openai_context.__exit__.return_value = False

    monkeypatch.setattr(
        "app.services.repair_service.OpenAI",
        MagicMock(return_value=openai_context),
    )

    # Keep unit tests independent of the real Docker sandbox.
    monkeypatch.setattr(
        "app.services.repair_service._verify_in_sandbox",
        lambda **kwargs: {
            "status": "syntax_checked",
            "syntax_valid": True,
            "tests_run": False,
            "tests_passed": False,
            "message": "Syntax is valid. No tests were supplied.",
        },
    )

    return scanner, client


def configure_model_response(client, content):
    """Configure the mocked NVIDIA model response."""
    message = MagicMock()
    message.content = content

    choice = MagicMock()
    choice.message = message

    response = MagicMock()
    response.choices = [choice]

    client.chat.completions.create.return_value = response


def test_unknown_rule_is_rejected(monkeypatch):
    monkeypatch.setattr(
        "app.services.repair_service._get_findings",
        lambda source: [],
    )

    with pytest.raises(ValueError, match="rule was not found"):
        propose_repair(
            language="python",
            filename="sample.py",
            source_code=SOURCE_CODE,
            rule="UNKNOWN",
        )


def test_detected_secret_is_rejected(monkeypatch):
    monkeypatch.setattr(
        "app.services.repair_service.redact_sensitive_text",
        lambda source: source.replace("secret-value", "[REDACTED]"),
    )

    with pytest.raises(ValueError, match="Potential secrets"):
        propose_repair(
            language="python",
            filename="sample.py",
            source_code='password = "secret-value"\n',
            rule="B307",
        )


def test_valid_proposal_is_scanner_checked(
    mock_scanners,
    monkeypatch,
):
    scanner, client = mock_scanners

    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODELS", "test-model")

    scanner.side_effect = [
        [FINDING],
        [],
    ]

    configure_model_response(client, FIXED_CODE)

    result = propose_repair(
        language="python",
        filename="sample.py",
        source_code=SOURCE_CODE,
        rule="B307",
    )

    assert result["status"] == "awaiting_tests"
    assert result["verification"]["syntax_valid"] is True
    assert result["verification"]["scanner_rechecked"] is True
    assert result["verification"]["target_finding_resolved"] is True
    assert result["verification"]["tests_run"] is False
    assert result["verification"]["verified"] is False
    assert result["verification"]["approval_required"] is True
    assert result["verification"]["applied"] is False
    assert "ast.literal_eval" in result["proposed_code"]


def test_invalid_model_output_is_rejected(
    mock_scanners,
    monkeypatch,
):
    scanner, client = mock_scanners

    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODELS", "test-model")

    scanner.return_value = [FINDING]
    configure_model_response(client, "def broken(:\n")

    result = propose_repair(
        language="python",
        filename="sample.py",
        source_code=SOURCE_CODE,
        rule="B307",
    )

    assert result["status"] == "unavailable"
    assert "test-model" in result["failed_models"]


def test_non_python_language_is_rejected():
    with pytest.raises(ValueError, match="only Python"):
        propose_repair(
            language="javascript",
            filename="sample.js",
            source_code="console.log('hello');",
            rule="B307",
        )


def test_non_python_filename_is_rejected():
    with pytest.raises(ValueError, match=".py files"):
        propose_repair(
            language="python",
            filename="sample.js",
            source_code=SOURCE_CODE,
            rule="B307",
        )


def test_target_finding_persists(
    mock_scanners,
    monkeypatch,
):
    scanner, client = mock_scanners

    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODELS", "test-model")

    scanner.side_effect = [
        [FINDING],
        [FINDING],
    ]

    configure_model_response(client, FIXED_CODE)

    result = propose_repair(
        language="python",
        filename="sample.py",
        source_code=SOURCE_CODE,
        rule="B307",
    )

    assert result["status"] == "verification_failed"
    assert result["verification"]["target_finding_resolved"] is False
    assert result["verification"]["verified"] is False


def test_sandbox_failure_does_not_mark_repair_verified(
    mock_scanners,
    monkeypatch,
):
    scanner, client = mock_scanners

    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODELS", "test-model")

    scanner.side_effect = [
        [FINDING],
        [],
    ]

    configure_model_response(client, FIXED_CODE)

    monkeypatch.setattr(
        "app.services.repair_service._verify_in_sandbox",
        lambda **kwargs: {
            "status": "verification_unavailable",
            "syntax_valid": False,
            "tests_run": False,
            "tests_passed": False,
            "message": "Sandbox unavailable.",
        },
    )

    result = propose_repair(
        language="python",
        filename="sample.py",
        source_code=SOURCE_CODE,
        rule="B307",
    )

    assert result["verification"]["verified"] is False
    assert result["verification"]["applied"] is False
    assert result["verification"]["approval_required"] is True
    assert result["verification"]["sandbox_status"] == (
        "verification_unavailable"
    )
