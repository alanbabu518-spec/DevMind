
import re


SECRET_PATTERNS = [
    (
        "SECRET001",
        "API key",
        re.compile(
            r"""(?i)\b(?:api[_-]?key|access[_-]?token)\b\s*[:=]\s*["']([^"']{8,})["']"""
        ),
    ),
    (
        "SECRET002",
        "Password",
        re.compile(
            r"""(?i)\b(?:password|passwd|pwd)\b\s*[:=]\s*["']([^"']{4,})["']"""
        ),
    ),
    (
        "SECRET003",
        "Private key",
        re.compile(
            r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"
        ),
    ),
]


def detect_secrets(source_code: str) -> list[dict]:
    """Detect common hardcoded-secret patterns without executing source code."""

    findings = []

    for line_number, line in enumerate(source_code.splitlines(), start=1):
        for rule, secret_type, pattern in SECRET_PATTERNS:
            if pattern.search(line):
                findings.append(
                    {
                        "rule": rule,
                        "severity": "error",
                        "message": f"Potential hardcoded {secret_type} detected.",
                        "line": line_number,
                        "source": "SecretDetector",
                    }
                )
                # Avoid duplicate matches for the same line.
                break

    return findings
