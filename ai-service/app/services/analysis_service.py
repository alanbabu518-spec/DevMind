from app.analyzers.ruff_analyzer import analyze_python_code

def analyze_code(
    language: str,
    source_code: str,
    filename: str,
) -> dict:
    """Coordinate code analysis and build the API response."""

    if language.strip().lower() != "python":
        raise ValueError("Currently, only Python analysis is supported.")

    findings = analyze_python_code(source_code)

    return {
        "status": "success",
        "service": "DevMind AI Service",
        "language": "python",
        "analyzer": "Ruff",
        "filename": filename,
        "summary": {
            "issues_found": len(findings),
        },
        "findings": findings,
    }
