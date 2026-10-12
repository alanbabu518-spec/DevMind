import json
import subprocess
import sys
import tempfile
from pathlib import Path

def analyze_python_code(source_code: str) -> list[dict]:
    """
    Analyze Python source code using Ruff without executing the submitted code.
    """

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
        findings.append(
            {
                "rule": item.get("code", "UNKNOWN"),
                "severity": "warning",
                "message": item.get("message", "No message provided"),
                "line": item.get("location", {}).get("row"),
                "column": item.get("location", {}).get("column"),
                "end_line": item.get("end_location", {}).get("row"),
                "end_column": item.get("end_location", {}).get("column"),
            }
        )

    return findings
