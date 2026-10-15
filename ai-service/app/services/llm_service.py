import json
import os
import re
from pathlib import Path
from typing import Any

import requests


NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
REQUEST_TIMEOUT_SECONDS = 35
MAX_EXPLANATION_LENGTH = 2000

SECRET_PATTERNS = [
    re.compile(
        r"""(?i)\b(api[_-]?key|access[_-]?token|auth[_-]?token|"""
        r"""password|passwd|secret|client[_-]?secret)\b"""
        r"""(\s*[:=]\s*|\s+)(["']?)[^\s"'`,;}\]]+\3"""
    ),
    re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+"),
    re.compile(
        r"\b(?:sk-[A-Za-z0-9_-]{12,}|"
        r"gh[pousr]_[A-Za-z0-9_]{20,}|"
        r"AKIA[A-Z0-9]{16})\b"
    ),
    re.compile(
        r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?"
        r"-----END [A-Z ]*PRIVATE KEY-----",
        re.DOTALL,
    ),
]


def redact_sensitive_text(value: str) -> str:
    """Redact common secret values from text."""
    redacted = value

    for pattern in SECRET_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)

    return redacted


def redact_finding(value: Any) -> Any:
    """Recursively redact sensitive strings in scanner findings."""
    if isinstance(value, str):
        return redact_sensitive_text(value)

    if isinstance(value, list):
        return [redact_finding(item) for item in value]

    if isinstance(value, dict):
        return {
            key: redact_finding(item)
            for key, item in value.items()
        }

    return value


def _extract_json(
    content: str,
    allowed_rules: set[str],
) -> dict[str, Any]:
    """
    Parse and validate explanations.

    Unknown rules are rejected, duplicate rules are ignored,
    and missing explanations are explicitly reported.
    """
    content = content.strip()

    # Support JSON wrapped in Markdown code fences.
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)

    result = json.loads(content)

    if not isinstance(result, dict):
        raise ValueError("The model response must be a JSON object.")

    explanations = result.get("explanations")

    if not isinstance(explanations, list):
        raise ValueError("Missing explanations list.")

    required_fields = {
        "rule",
        "root_cause",
        "impact",
        "suggested_fix",
        "confidence",
    }
    valid_confidence = {"low", "medium", "high"}

    validated: list[dict[str, str]] = []
    explained_rules: set[str] = set()
    rejected_rules: list[str] = []

    for item in explanations:
        if not isinstance(item, dict):
            raise ValueError("An explanation must be a JSON object.")

        if not required_fields.issubset(item.keys()):
            raise ValueError("An explanation is missing required fields.")

        if any(
            not isinstance(item[field], str)
            for field in required_fields
        ):
            raise ValueError("Explanation fields must be strings.")

        rule = item["rule"].strip()

        # Reject explanations for rules absent from scanner evidence.
        if rule not in allowed_rules:
            rejected_rules.append(rule or "(empty rule)")
            continue

        # Avoid duplicate explanations for the same rule.
        if rule in explained_rules:
            continue

        text_fields = (
            "root_cause",
            "impact",
            "suggested_fix",
        )

        cleaned: dict[str, str] = {}

        for field in text_fields:
            value = item[field].strip()

            if not value:
                raise ValueError(
                    f"Explanation field '{field}' cannot be empty."
                )

            cleaned[field] = value[:MAX_EXPLANATION_LENGTH]

        confidence = item["confidence"].strip().lower()

        if confidence not in valid_confidence:
            confidence = "medium"

        validated.append({
            "rule": rule,
            "root_cause": cleaned["root_cause"],
            "impact": cleaned["impact"],
            "suggested_fix": cleaned["suggested_fix"],
            "confidence": confidence,
        })

        explained_rules.add(rule)

    missing_rules = sorted(allowed_rules - explained_rules)

    return {
        "explanations": validated,
        "validation": {
            "expected_rules": len(allowed_rules),
            "explained_rules": len(explained_rules),
            "missing_rules": missing_rules,
            "rejected_rules": rejected_rules,
            "complete": len(missing_rules) == 0,
        },
    }


def _request_model(
    model: str,
    api_key: str,
    language: str,
    filename: str,
    findings: list[dict[str, Any]],
) -> dict[str, Any]:
    """Request evidence-based explanations from an NVIDIA model."""

    safe_findings = redact_finding(findings)

    allowed_rules = {
        str(finding["rule"]).strip()
        for finding in safe_findings
        if isinstance(finding, dict)
        and finding.get("rule") is not None
        and str(finding["rule"]).strip()
    }

    prompt = f"""
You are DevMind, an AI code-analysis assistant.

Explain the supplied static-analysis findings using only the
provided scanner evidence. A scanner finding is evidence of a
detection, but the detection may be a false positive.

Language: {language}
Filename: {Path(filename).name}

Scanner findings:
{json.dumps(safe_findings, ensure_ascii=True)}

Return only valid JSON in this format:
{{
  "explanations": [
    {{
      "rule": "exact rule value copied from a supplied finding",
      "root_cause": "specific reason supported by the evidence",
      "impact": "realistic possible impact",
      "suggested_fix": "practical suggested correction",
      "confidence": "low, medium, or high"
    }}
  ]
}}

Requirements:
- Use the exact rule value from the supplied finding.
- Explain every distinct rule supplied.
- Use the finding message, line number, severity, and source when available.
- Do not invent evidence, code, line numbers, or vulnerabilities.
- Do not claim a potential secret is a confirmed real credential.
- Do not claim a fix was applied, tested, or verified.
- Avoid exaggerated claims about performance or memory usage.
- If evidence is insufficient, explicitly say so and use low confidence.
- Keep explanations concise, practical, and understandable.
- Do not include credentials or secret values.
- Return an empty explanations array if no findings were supplied.
- Return JSON only, without Markdown or code fences.
"""

    response = requests.post(
        NVIDIA_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You explain static-analysis findings accurately. "
                        "Use only supplied evidence and return valid JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "max_tokens": 2500,
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )

    response.raise_for_status()

    payload = response.json()
    choices = payload.get("choices")

    if not isinstance(choices, list) or not choices:
        raise ValueError("The model returned no choices.")

    message = choices[0].get("message", {})
    content = message.get("content")

    if not isinstance(content, str) or not content.strip():
        raise ValueError("The model returned empty content.")

    parsed = _extract_json(content, allowed_rules)

    return {
        "status": "success",
        "provider": "nvidia",
        "model": model,
        **parsed,
    }


def explain_findings(
    language: str,
    filename: str,
    source_code: str,
    findings: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Explain scanner findings using NVIDIA-hosted models.

    Raw source code is intentionally not sent to the LLM.
    Original scanner findings remain available if all models fail.
    """

    # Preserve the existing privacy decision.
    del source_code

    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    configured_models = os.getenv("NVIDIA_MODELS", "").strip()

    if (
        not api_key
        or api_key in {
            "YOUR_NEW_API_KEY",
            "your_actual_nvidia_api_key",
            "your_new_nvidia_api_key",
        }
    ):
        return {
            "status": "unavailable",
            "message": "NVIDIA_API_KEY is not configured.",
            "explanations": [],
            "validation": {
                "expected_rules": len({
                    str(item["rule"]).strip()
                    for item in findings
                    if item.get("rule") is not None
                    and str(item["rule"]).strip()
                }),
                "explained_rules": 0,
                "missing_rules": sorted({
                    str(item["rule"]).strip()
                    for item in findings
                    if item.get("rule") is not None
                    and str(item["rule"]).strip()
                }),
                "rejected_rules": [],
                "complete": not findings,
            },
        }

    models = list(dict.fromkeys(
        model.strip()
        for model in configured_models.split(",")
        if model.strip()
    ))

    if not models:
        return {
            "status": "unavailable",
            "message": "NVIDIA_MODELS is not configured.",
            "explanations": [],
        }

    allowed_rules = {
        str(item["rule"]).strip()
        for item in findings
        if item.get("rule") is not None
        and str(item["rule"]).strip()
    }

    if not findings:
        return {
            "status": "success",
            "provider": "nvidia",
            "model": models[0],
            "fallback_used": False,
            "explanations": [],
            "validation": {
                "expected_rules": 0,
                "explained_rules": 0,
                "missing_rules": [],
                "rejected_rules": [],
                "complete": True,
            },
        }

    failed_models: list[str] = []

    for model in models:
        try:
            result = _request_model(
                model=model,
                api_key=api_key,
                language=language,
                filename=filename,
                findings=findings,
            )

            result["fallback_used"] = bool(failed_models)

            if failed_models:
                result["failed_models"] = failed_models

            return result

        except requests.Timeout:
            print(f"NVIDIA model timed out: {model}")

        except requests.HTTPError as exc:
            status_code = (
                exc.response.status_code
                if exc.response is not None
                else "unknown"
            )
            print(
                f"NVIDIA model returned HTTP {status_code}: {model}"
            )

        except requests.RequestException as exc:
            print(
                f"NVIDIA network request failed for {model}: "
                f"{type(exc).__name__}"
            )

        except (ValueError, KeyError, IndexError, TypeError) as exc:
            print(
                f"NVIDIA response validation failed for {model}: "
                f"{type(exc).__name__}"
            )

        failed_models.append(model)

    return {
        "status": "unavailable",
        "message": (
            "All configured NVIDIA models failed. "
            "Original scanner findings remain available."
        ),
        "failed_models": failed_models,
        "explanations": [],
        "validation": {
            "expected_rules": len(allowed_rules),
            "explained_rules": 0,
            "missing_rules": sorted(allowed_rules),
            "rejected_rules": [],
            "complete": not allowed_rules,
        },
    }