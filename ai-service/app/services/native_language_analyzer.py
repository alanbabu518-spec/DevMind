"""Static-analysis adapters for Go, Ruby, C, and C++.

These adapters never execute submitted programs. They invoke language-specific
static analysis tools in a temporary directory with a bounded timeout. Missing
or failed analyzers are reported as limitations, never as a clean result.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

TOOL_TIMEOUT_SECONDS = 20
EXTENSION_LANGUAGE = {
    ".go": "go", ".rb": "ruby", ".c": "c", ".h": "c",
    ".cc": "cpp", ".cpp": "cpp", ".cxx": "cpp",
    ".hh": "cpp", ".hpp": "cpp", ".hxx": "cpp",
}


def language_from_extension(filename: str) -> str | None:
    return EXTENSION_LANGUAGE.get(Path(filename.replace("\\", "/")).suffix.lower())


def _finding(rule: str, severity: str, message: str, line: int | None, source: str) -> dict[str, Any]:
    item: dict[str, Any] = {
        "rule": rule,
        "severity": severity,
        "message": message[:1000],
        "source": source,
    }
    if line is not None:
        item["line"] = line
    return item


def _run(command: list[str], cwd: str, stdin_text: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        input=stdin_text,
        text=True,
        capture_output=True,
        timeout=TOOL_TIMEOUT_SECONDS,
        check=False,
        env={**os.environ, "CI": "1", "GOTOOLCHAIN": "local", "GOPROXY": "off", "GOSUMDB": "off"},
    )


def _unavailable(language: str, tool: str, reason: str) -> dict[str, Any]:
    return {
        "status": "partial", "language": language, "analyzers": [], "findings": [],
        "limitations": [f"{tool} analysis did not complete: {reason}. This is not a clean result."],
    }


def _parse_rubocop_json(payload: str) -> list[dict[str, Any]]:
    try:
        data = json.loads(payload)
    except (json.JSONDecodeError, TypeError):
        return []
    findings: list[dict[str, Any]] = []
    for file_result in data.get("files", []):
        for offense in file_result.get("offenses", []):
            location = offense.get("location") or {}
            severity_text = str(offense.get("severity", "convention")).lower()
            severity = "error" if severity_text in {"fatal", "error"} else (
                "warning" if severity_text in {"warning", "refactor"} else "info"
            )
            line = location.get("start_line")
            findings.append(_finding(
                f"RUBY-{offense.get('cop_name', 'RuboCop')}", severity,
                str(offense.get("message", "RuboCop reported an offense.")),
                line if isinstance(line, int) else None, "RuboCop",
            ))
    return findings


def _parse_clang_tidy(text: str, source_name: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    pattern = re.compile(
        r"^(?:.*[/\\])?" + re.escape(source_name)
        + r":(\d+):\d+:\s*(warning|error|note):\s*(.*?)(?:\s+\[([^\]]+)\])?$"
    )
    for line in text.splitlines():
        match = pattern.match(line.strip())
        if not match:
            continue
        line_number, level, message, rule = match.groups()
        severity = "error" if level == "error" else ("info" if level == "note" else "warning")
        findings.append(_finding(f"CLANG-{rule or level.upper()}", severity, message, int(line_number), "clang-tidy"))
    return findings


def analyze_native_language(language: str, source_code: str, filename: str) -> dict[str, Any]:
    """Run a language-specific static analyzer and return normalized findings."""
    language = language.lower()
    tool = {"go": "go vet", "ruby": "RuboCop", "c": "clang-tidy", "cpp": "clang-tidy"}[language]
    executable = {"go": "go", "ruby": "rubocop", "c": "clang-tidy", "cpp": "clang-tidy"}[language]
    if not shutil.which(executable):
        return _unavailable(language, tool, f"'{executable}' is not installed")

    findings: list[dict[str, Any]] = []
    limitations: list[str] = []
    analyzers: list[str] = []
    try:
        with tempfile.TemporaryDirectory(prefix="devmind-analysis-") as temp_dir:
            root = Path(temp_dir)
            safe_name = Path(filename.replace("\\", "/")).name or f"submitted.{language}"
            source_path = root / safe_name
            source_path.write_text(source_code, encoding="utf-8", errors="replace")

            if language == "go":
                (root / "go.mod").write_text("module devmind.local/review\n\ngo 1.21\n", encoding="utf-8")
                result = _run(["go", "vet", "."], cwd=temp_dir)
                analyzers = ["go vet"]
                for output_line in (result.stdout + "\n" + result.stderr).splitlines()[:500]:
                    match = re.match(r"^(.+\.go):(\d+):(?:(\d+):)?\s*(.*)$", output_line.strip())
                    if match:
                        _, line_number, _, message = match.groups()
                        findings.append(_finding("GO-VET", "warning", message, int(line_number), "go vet"))
                if result.returncode != 0 and not findings:
                    limitations.append("go vet could not analyze this file; project dependencies or package context may be required.")

            elif language == "ruby":
                result = _run(["rubocop", "--format", "json", "--stdin", safe_name], cwd=temp_dir, stdin_text=source_code)
                analyzers = ["RuboCop"]
                findings.extend(_parse_rubocop_json(result.stdout))
                if result.returncode not in (0, 1):
                    limitations.append("RuboCop exited with an error; some checks may not have completed.")

            else:
                standard = "c11" if language == "c" else "c++17"
                result = _run(["clang-tidy", str(source_path), "--", f"-std={standard}"], cwd=temp_dir)
                analyzers = ["clang-tidy"]
                findings.extend(_parse_clang_tidy(result.stdout + "\n" + result.stderr, safe_name))
                if result.returncode != 0 and not findings:
                    limitations.append("clang-tidy produced no parseable findings; headers or build configuration may be required.")
    except subprocess.TimeoutExpired:
        return _unavailable(language, tool, f"timed out after {TOOL_TIMEOUT_SECONDS} seconds")
    except OSError as exc:
        return _unavailable(language, tool, type(exc).__name__)

    return {
        "status": "success" if not limitations else "partial",
        "language": language,
        "analyzers": analyzers,
        "findings": findings,
        "limitations": limitations,
    }
