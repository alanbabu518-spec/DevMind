import json
import subprocess
import sys
import tempfile
from pathlib import Path


def get_severity(rule: str) -> str:
    """Map Ruff rule prefixes to a presentation severity."""

    if rule.startswith(("E", "F")):
        return "error"

    if rule.startswith(("W", "B", "S")):
        return "warning"

    if rule.startswith(("I", "UP", "SIM", "C4", "N")):
        return "info"

    return "warning"


def analyze_python_code(source_code: str) -> list[dict]:
    """Analyze Python source code using Ruff without executing it."""

    with tempfile.TemporaryDirectory() as temporary_directory:
        source_path = Path(temporary_directory) / "submitted.py"
        source_path.write_text(source_code, encoding="utf-8")

        try:
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "ruff",
                    "check",
                    "--output-format",
                    "json",
                    str(source_path),
                ],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("Code analysis timed out.") from exc
        except OSError as exc:
            raise RuntimeError("Unable to start the Ruff analyzer.") from exc

        if result.returncode not in (0, 1):
            raise RuntimeError("Ruff failed to analyze the submitted code.")

        try:
            raw_findings = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            raise RuntimeError("Ruff returned an invalid analysis response.") from exc

    findings = []

    for item in raw_findings:
        rule = item.get("code", "UNKNOWN")
        location = item.get("location") or {}
        end_location = item.get("end_location") or {}

        findings.append(
            {
                "rule": rule,
                "severity": get_severity(rule),
                "message": item.get("message", "No message provided"),
                "line": location.get("row"),
                "column": location.get("column"),
                "end_line": end_location.get("row"),
                "end_column": end_location.get("column"),
            }
        )

    return findings
