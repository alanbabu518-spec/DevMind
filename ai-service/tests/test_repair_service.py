from unittest.mock import MagicMock, patch

import pytest

from app.services.repair_service import propose_repair


SOURCE_CODE = """def calculate(value):
    return eval(value)
"""

FIXED_CODE = """def calculate(value):
    return int(value)
"""

FINDING = {
    "rule": "B307",
    "severity": "warning",
    "message": "Use of possibly insecure eval.",
    "line": 2,
    "source": "Bandit",
}


@pytest.fixture
def mock_scanners():
    with (
        patch(
            "app.services.repair_service._get_findings",
            return_value=[FINDING],
        ) as scanner,
        patch(
            "app.services.repair_service.OpenAI",
        ) as openai_class,
    ):
        client = MagicMock()
        openai_class.return_value.__enter__.return_value = client

        yield scanner, client


def configure_model_response(client, content):
    response = MagicMock()
    response.choices[0].message.content = content
    client.chat.completions.create.return_value = response


def test_unknown_rule_is_rejected(mock_scanners, monkeypatch):
    scanner, client = mock_scanners
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")

    scanner.return_value = []

    with pytest.raises(ValueError, match="not found"):
        propose_repair(
            language="python",
            filename="sample.py",
            source_code=SOURCE_CODE,
            rule="UNKNOWN_RULE",
        )

    client.chat.completions.create.assert_not_called()


def test_detectable_secret_is_rejected_before_model_call(
    mock_scanners, monkeypatch
):
    _, client = mock_scanners
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")

    source_with_secret = (
        'api_key = "sk-12345678901234567890"\n'
        "def calculate(value):\n"
        "    return eval(value)\n"
    )

    with pytest.raises(ValueError, match="Potential secrets"):
        propose_repair(
            language="python",
            filename="sample.py",
            source_code=source_with_secret,
            rule="B307",
        )

    client.chat.completions.create.assert_not_called()


def test_valid_proposal_is_scanner_checked(
    mock_scanners, monkeypatch
):
    scanner, client = mock_scanners
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODELS", "test-model")

    scanner.side_effect = [
        [FINDING],  # Original code contains B307.
        [],          # Proposed code no longer contains B307.
    ]

    configure_model_response(client, FIXED_CODE)

    original_source = SOURCE_CODE

    result = propose_repair(
        language="python",
        filename="sample.py",
        source_code=original_source,
        rule="B307",
    )

    assert result["status"] == "scanner_checked"
    assert result["rule"] == "B307"
    assert result["filename"] == "sample.py"
    assert "--- a/sample.py" in result["patch"]
    assert "+++ b/sample.py" in result["patch"]
    assert result["verification"]["syntax_valid"] is True
    assert result["verification"]["scanner_rechecked"] is True
    assert result["verification"]["target_finding_resolved"] is True
    assert result["verification"]["tests_run"] is False
    assert result["verification"]["applied"] is False
    assert result["verification"]["verified"] is False
    assert original_source == SOURCE_CODE



def test_invalid_python_from_model_is_rejected(
    mock_scanners, monkeypatch
):
    _, client = mock_scanners
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODELS", "test-model")

    configure_model_response(
        client,
        "def calculate(value):\n    return (\n",
    )

    result = propose_repair(
        language="python",
        filename="sample.py",
        source_code=SOURCE_CODE,
        rule="B307",
    )

    assert result["status"] == "unavailable"
    assert "valid repair proposal" in result["message"]
    assert result["failed_models"] == ["test-model"]
    client.chat.completions.create.assert_called_once()


def test_non_python_repair_is_rejected(mock_scanners):
    with pytest.raises(ValueError, match="only Python"):
        propose_repair(
            language="javascript",
            filename="sample.js",
            source_code="const value = 1;",
            rule="B307",
        )


def test_non_python_filename_is_rejected(mock_scanners):
    with pytest.raises(ValueError, match=".py files"):
        propose_repair(
            language="python",
            filename="sample.txt",
            source_code=SOURCE_CODE,
            rule="B307",
        )


def test_proposal_is_not_verified_when_finding_remains(
    mock_scanners, monkeypatch
):
    scanner, client = mock_scanners
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODELS", "test-model")

    scanner.side_effect = [
        [FINDING],  # Original code has B307.
        [FINDING],  # Proposed code still has B307.
    ]

    configure_model_response(client, FIXED_CODE)

    result = propose_repair(
        language="python",
        filename="sample.py",
        source_code=SOURCE_CODE,
        rule="B307",
    )

    assert result["status"] == "verification_failed"
    assert result["verification"]["scanner_rechecked"] is True
    assert result["verification"]["target_finding_resolved"] is False
    assert result["verification"]["verified"] is False
    assert result["verification"]["applied"] is False
