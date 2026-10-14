import json
import os
import re
from pathlib import Path
from typing import Any

import requests


NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
REQUEST_TIMEOUT_SECONDS = 35

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


def _extract_json(content: str) -> dict[str, Any]:
    """Parse and validate the model's JSON response."""
    content = content.strip()

    # Handle models that wrap JSON in Markdown code fences.
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

    for item in explanations:
        if not isinstance(item, dict):
            raise ValueError("An explanation must be a JSON object.")

        if not required_fields.issubset(item.keys()):
            raise ValueError("An explanation is missing required fields.")

        for field in required_fields:
            if not isinstance(item[field], str):
                raise ValueError(
                    f"Invalid value for explanation field: {field}"
                )

        if item["confidence"].lower() not in valid_confidence:
            item["confidence"] = "medium"

    return {"explanations": explanations}


def _request_model(
    model: str,
    api_key: str,
    language: str,
    filename: str,
    findings: list[dict[str, Any]],
) -> dict[str, Any]:
    """Request explanations from one NVIDIA-hosted model."""

    safe_findings = redact_finding(findings)

    prompt = f"""
You are DevMind, an AI code-analysis assistant.

Explain the supplied static-analysis findings.
Do not invent findings or claim a fix was applied or tested.

Language: {language}
Filename: {Path(filename).name}

Scanner findings:
{json.dumps(safe_findings, ensure_ascii=True)}

Return only a valid JSON object in this format:
{{
  "explanations": [
    {{
      "rule": "scanner rule or finding name",
      "root_cause": "why the issue may occur",
      "impact": "possible impact",
      "suggested_fix": "practical suggested correction",
      "confidence": "low, medium, or high"
    }}
  ]
}}

Instructions:
- Explain only the supplied findings.
- Use simple, concise language.
- Do not invent evidence.
- Do not include credentials or secrets.
- If evidence is insufficient, say so.
- Return an empty explanations array if there are no findings.
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
                        "You explain static-analysis findings. "
                        "Return valid JSON only."
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

    parsed = _extract_json(content)

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
    Explain existing scanner findings using NVIDIA-hosted models.

    Models are tried in the order configured in NVIDIA_MODELS.
    If all fail, return an unavailable result without raising an
    exception that would prevent the original findings being returned.
    """

    # Intentionally do not send the full source code to the LLM.
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
        }

    models = list(
        dict.fromkeys(
            model.strip()
            for model in configured_models.split(",")
            if model.strip()
        )
    )

    if not models:
        return {
            "status": "unavailable",
            "message": "NVIDIA_MODELS is not configured.",
            "explanations": [],
        }

    if not findings:
        return {
            "status": "success",
            "provider": "nvidia",
            "model": models[0],
            "fallback_used": False,
            "explanations": [],
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

            if result.get("status") == "success":
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
    }
