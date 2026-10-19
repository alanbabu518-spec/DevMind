"""Conservative, language-agnostic detection of likely hardcoded secrets.

This scanner never executes submitted code and never returns matched secret values.
Pattern matches are heuristic signals, not proof that a credential is active.
"""
from __future__ import annotations

import re
from typing import Pattern


# Keep patterns bounded and avoid returning the matched credential in findings.
SECRET_PATTERNS: tuple[tuple[str, str, Pattern[str]], ...] = (
    (
        "SECRET001",
        "API key or access token",
        re.compile(
            r"(?i)\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|"
            r"client[_-]?secret|client[_-]?token)\b\s*[:=]\s*"
            r"(?:[\"']([^\"']{8,})[\"']|([A-Za-z0-9_./+=:-]{12,}))"
        ),
    ),
    (
        "SECRET002",
        "Password or secret",
        re.compile(
            r"(?i)\b(?:password|passwd|pwd|secret|db_password|database_password)\b"
            r"\s*[:=]\s*(?:[\"']([^\"']{4,})[\"']|([^\s,;#]{4,}))"
        ),
    ),
    (
        "SECRET003",
        "Private key material",
        re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    ),
    (
        "SECRET004",
        "Bearer token",
        re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]{12,}"),
    ),
    (
        "SECRET005",
        "GitHub token",
        re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b"),
    ),
    (
        "SECRET006",
        "AWS access key ID",
        re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    ),
    (
        "SECRET007",
        "OpenAI-style API key",
        re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    ),
    (
        "SECRET008",
        "Stripe-style secret key",
        re.compile(r"\b(?:sk_live|rk_live)_[A-Za-z0-9]{16,}\b"),
    ),
    (
        "SECRET009",
        "Google API key",
        re.compile(r"\bAIza[0-9A-Za-z_-]{30,}\b"),
    ),
)

_PLACEHOLDER_VALUES = {
    "changeme", "change-me", "example", "placeholder", "your_api_key",
    "your-secret", "your_secret", "your-password", "your_password",
    "insert-key-here", "replace-me", "replace_me", "test", "dummy",
}


def _is_placeholder(value: str) -> bool:
    normalized = value.strip().strip("\"'` ").lower()
    if not normalized:
        return True
    if normalized in _PLACEHOLDER_VALUES:
        return True
    return any(
        marker in normalized
        for marker in ("<your", "your_", "example_", "placeholder", "changeme")
    )


def detect_secrets(source_code: str) -> list[dict[str, object]]:
    """Return one redacted finding per matching rule and line."""
    findings: list[dict[str, object]] = []
    seen: set[tuple[str, int]] = set()

    for line_number, line in enumerate(source_code.splitlines(), start=1):
        for rule, secret_type, pattern in SECRET_PATTERNS:
            match = pattern.search(line)
            if not match:
                continue

            # For assignment patterns, don't flag obvious sample placeholders.
            captured = next((group for group in match.groups() if group), "")
            if captured and _is_placeholder(captured):
                continue

            key = (rule, line_number)
            if key in seen:
                continue
            seen.add(key)
            findings.append(
                {
                    "rule": rule,
                    "severity": "error",
                    "message": f"Potential hardcoded {secret_type} detected. Rotate it if it is real, and load credentials from a secret manager or environment variable.",
                    "line": line_number,
                    "source": "SecretDetector",
                    "evidence": "[REDACTED: potential secret omitted]",
                }
            )

    return findings
