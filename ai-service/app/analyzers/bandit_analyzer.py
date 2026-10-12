import json
import subprocess
import sys
import tempfile
from pathlib import Path


def analyze_python_security(source_code: str) -> list[dict]:
    """Scan Python source code for potential security issues using Bandit."""

    with tempfile.TemporaryDirectory() as temporary_directory:
        source_path = Path(temporary_directory) / "submitted.py"
        source_path.write_text(source_code, encoding="utf-8")

        try:
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "bandit",
                    "-f",
                    "json",
                    "-q",
                    str(source_path),
                ],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("Security analysis timed out.") from exc
        except OSError as exc:
            raise RuntimeError(
                "Unable to start the Bandit security analyzer."
            ) from exc

        # Bandit can return a non-zero exit code when it finds issues.
        # Therefore, parse its JSON output instead of relying only on the exit code.
        try:
            report = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "Bandit failed to return a valid security report."
            ) from exc

    findings = []

    for item in report.get("results", []):
        severity = item.get("issue_severity", "MEDIUM").lower()

        if severity == "high":
            presentation_severity = "error"
        elif severity == "medium":
            presentation_severity = "warning"
        else:
            presentation_severity = "info"

        findings.append(
            {
                "rule": item.get("test_id", "UNKNOWN"),
                "severity": presentation_severity,
                "message": item.get("issue_text", "No message provided"),
                "line": item.get("line_number"),
                "confidence": item.get("issue_confidence", "UNKNOWN").lower(),
                "source": "Bandit",
            }
        )

    return findings
