from app.analyzers.ruff_analyzer import analyze_python_code
from app.analyzers.bandit_analyzer import analyze_python_security
from app.analyzers.secret_analyzer import detect_secrets
from app.services.llm_service import explain_findings


def analyze_code(
    language: str,
    source_code: str,
    filename: str,
) -> dict:
    """Run static analysis and optionally explain findings with Gemini."""

    if language.strip().lower() != "python":
        raise ValueError("Currently, only Python analysis is supported.")

    # 1. Code-quality analysis
    quality_findings = analyze_python_code(source_code)

    # 2. Security vulnerability analysis
    security_findings = analyze_python_security(source_code)

    # 3. Hardcoded-secret detection
    secret_findings = detect_secrets(source_code)

    # Combine the original scanner findings.
    findings = quality_findings + security_findings + secret_findings

    # Count the original findings without changing their severities.
    severity_counts = {
        "error": 0,
        "warning": 0,
        "info": 0,
    }

    for finding in findings:
        severity = finding.get("severity")
        if severity in severity_counts:
            severity_counts[severity] += 1

    # 4. Ask Gemini to explain the scanner findings.
    # The LLM service should handle provider errors and return
    # status="unavailable" rather than losing the scanner report.
    ai_explanations = explain_findings(
        language="python",
        filename=filename,
        source_code=source_code,
        findings=findings,
    )

    return {
        "status": "success",
        "service": "DevMind AI Service",
        "language": "python",
        "filename": filename,
        "analyzers": [
            "Ruff",
            "Bandit",
            "SecretDetector",
        ],
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
