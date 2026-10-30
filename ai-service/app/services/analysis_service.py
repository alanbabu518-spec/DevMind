"""Language-aware static analysis for DevMind.

Python uses Ruff + Bandit. JavaScript/TypeScript use conservative source-level
checks. Go, Ruby, C, and C++ use language-specific static-analysis tools through
native_language_analyzer. Submitted source is never executed by this module.
"""
import re
from pathlib import PurePosixPath, PureWindowsPath

from app.analyzers.ruff_analyzer import analyze_python_code
from app.analyzers.bandit_analyzer import analyze_python_security
from app.analyzers.secret_analyzer import detect_secrets
from app.services.llm_service import explain_findings
from app.services.native_language_analyzer import (
    analyze_native_language,
    language_from_extension,
)

JS_TS_EXTENSIONS = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"}
PYTHON_EXTENSIONS = {".py", ".pyw"}
NATIVE_LANGUAGES = {"go", "ruby", "c", "cpp"}


def _language_from_filename(filename: str) -> str | None:
    suffix = PurePosixPath(filename.replace("\\", "/")).suffix.lower()
    if not suffix:
        suffix = PureWindowsPath(filename).suffix.lower()
    if suffix in PYTHON_EXTENSIONS:
        return "python"
    if suffix in JS_TS_EXTENSIONS:
        return "typescript" if suffix in {".ts", ".tsx", ".mts", ".cts"} else "javascript"
    return language_from_extension(filename)


def _analyze_javascript_typescript(source_code: str) -> list[dict]:
    """Run conservative, evidence-backed JS/TS checks without executing code."""
    checks = [
        ("JSSEC001", "error", "Potential unsafe HTML injection via innerHTML.", re.compile(r"\b(?:\w+\.)?innerHTML\s*=|\bouterHTML\s*=")),
        ("JSSEC002", "error", "Dynamic code execution via eval() can enable code injection.", re.compile(r"\beval\s*\(")),
        ("JSSEC003", "warning", "Dynamic Function construction can execute generated code.", re.compile(r"\bnew\s+Function\s*\(")),
        ("JSSEC004", "warning", "Potentially unsafe URL navigation or resource assignment; validate untrusted URLs.", re.compile(r"\b(?:location\.href|window\.location|src|href)\s*=\s*(?:req\.|request\.|params\.|query\.)")),
        ("JSQUAL001", "info", "debug console statement found; remove or gate it before production if unintended.", re.compile(r"\bconsole\.(?:log|debug|info)\s*\(")),
        ("JSQUAL002", "warning", "Loose equality can produce type-coercion surprises; use strict equality when intended.", re.compile(r"(?<![=!])==(?!=)|!=(?!=)")),
    ]
    findings: list[dict] = []
    for line_number, line in enumerate(source_code.splitlines(), start=1):
        if line.lstrip().startswith(("//", "*", "/*")):
            continue
        for rule, severity, message, pattern in checks:
            if pattern.search(line):
                findings.append({
                    "rule": rule, "severity": severity, "message": message,
                    "line": line_number, "source": "DevMind-JS/TS-BasicChecks",
                    "evidence": line.strip()[:240],
                })
    findings.extend(detect_secrets(source_code))
    return findings


def analyze_code(language: str, source_code: str, filename: str) -> dict:
    """Analyze supported source code and attach evidence-based AI explanations."""
    requested = (language or "auto").strip().lower()
    inferred = _language_from_filename(filename)
    aliases = {
        "py": "python", "python": "python",
        "js": "javascript", "javascript": "javascript", "jsx": "javascript", "mjs":"javascript", "cjs": "javascript",
        "ts": "typescript", "typescript": "typescript", "tsx": "typescript", "mts":"typescript", "cts": "typescript",
        "golang": "go", "go": "go",
        "rb": "ruby", "ruby": "ruby",
        "c": "c", "cpp": "cpp", "c++": "cpp", "cc": "cpp", "cxx": "cpp",
    }
    normalized = aliases.get(requested, requested)
    if normalized in {"", "auto"}:
        normalized = inferred or ""
    if not normalized:
        raise ValueError("Could not detect language from filename. Provide a supported language or use a recognized extension.")
    if inferred is not None and normalized != inferred:
        raise ValueError(f"The selected language '{normalized}' does not match the filename extension for '{inferred}'.")

    limitations: list[str] = []
    quality_findings: list[dict] = []
    security_findings: list[dict] = []
    secret_findings: list[dict] = []
    analyzers: list[str] = []
    analysis_level = "static-analysis"
    analysis_status = "success"

    if normalized == "python":
        quality_findings = analyze_python_code(source_code)
        security_findings = analyze_python_security(source_code)
        secret_findings = detect_secrets(source_code)
        findings = quality_findings + security_findings + secret_findings
        analyzers = ["Ruff", "Bandit", "SecretDetector"]
    elif normalized in {"javascript", "typescript"}:
        findings = _analyze_javascript_typescript(source_code)
        quality_findings = [f for f in findings if str(f.get("rule", "")).startswith("JSQUAL")]
        security_findings = [f for f in findings if str(f.get("rule", "")).startswith("JSSEC")]
        secret_findings = [f for f in findings if f.get("source") == "SecretDetector"]
        analyzers = ["DevMind-JS/TS-BasicChecks", "SecretDetector"]
        analysis_level = "basic-pattern-checks"
        limitations = [
            "JavaScript/TypeScript checks are a lightweight first pass, not a full ESLint or TypeScript compiler analysis.",
            "A clean result does not prove the code is bug-free or secure.",
        ]
    elif normalized in NATIVE_LANGUAGES:
        native_result = analyze_native_language(normalized, source_code, filename)
        findings = list(native_result.get("findings", []))
        secret_findings = detect_secrets(source_code)
        findings.extend(secret_findings)
        analyzers = list(native_result.get("analyzers", [])) + (["SecretDetector"] if secret_findings else [])
        limitations = list(native_result.get("limitations", []))
        analysis_status = str(native_result.get("status", "partial"))
        analysis_level = "tool-based-static-analysis" if analyzers else "unavailable"
        security_findings = [f for f in findings if str(f.get("severity", "")).lower() == "error"]
        quality_findings = [
            finding
            for finding in findings
            if finding not in security_findings and finding not in secret_findings
        ]
        if not analyzers:
            limitations.append("No language-specific analyzer completed. Do not interpret this result as a clean analysis.")
    else:
        raise ValueError(
            "Unsupported language. Supported: Python, JavaScript, TypeScript, Go, Ruby, C, and C++. "
            "Use a matching filename extension such as .py, .js, .ts, .go, .rb, .c,.h, .cpp, .cc, or .hpp."
        )

    severity_counts = {"error": 0, "warning": 0, "info": 0}
    for finding in findings:
        severity = str(finding.get("severity", "")).lower()
        if severity in severity_counts:
            severity_counts[severity] += 1

    ai_explanations = explain_findings(
        language=normalized,
        filename=filename,
        source_code=source_code,
        findings=findings,
    )
    return {
        "status": analysis_status,
        "service": "DevMind AI Service",
        "language": normalized,
        "filename": filename,
        "analysis_level": analysis_level,
        "limitations": limitations,
        "analyzers": analyzers,
        "summary": {
            "issues_found": len(findings),
            "errors": severity_counts["error"],
            "warnings": severity_counts["warning"],
            "info": severity_counts["info"],
            "code_quality_issues": len(quality_findings),
            "security_issues": len(security_findings),
            "potential_secrets": len(secret_findings),
        },
        "findings": findings,
        "ai_explanations": ai_explanations,
    }
