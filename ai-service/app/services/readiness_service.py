from typing import Any


CATEGORY_WEIGHTS = {
    "security": 30,
    "tests": 25,
    "dependencies": 15,
    "configuration": 15,
    "deployment": 15,
}


def calculate_readiness(
    analysis: dict[str, Any],
) -> dict[str, Any]:
    """
    Calculate a provisional readiness score from available evidence.

    Unknown categories are excluded from the score denominator.
    They are never treated as passing.
    """

    summary = analysis.get("summary", {})
    findings = analysis.get("findings", [])

    if not isinstance(summary, dict):
        summary = {}

    if not isinstance(findings, list):
        findings = []

    # Security can only be assessed provisionally from scanner output.
    # An empty finding list alone does not prove complete security.
    security_available = (
        isinstance(summary.get("security_issues"), int)
        and isinstance(summary.get("potential_secrets"), int)
        and isinstance(analysis.get("analyzers"), list)
        and all(
            name in analysis["analyzers"]
            for name in ("Bandit", "SecretDetector")
        )
    )

    categories: dict[str, dict[str, Any]] = {
        "security": {
            "weight": CATEGORY_WEIGHTS["security"],
            "status": "unknown",
            "earned_points": 0,
            "evidence": [],
        },
        "tests": {
            "weight": CATEGORY_WEIGHTS["tests"],
            "status": "unknown",
            "earned_points": 0,
            "evidence": [],
        },
        "dependencies": {
            "weight": CATEGORY_WEIGHTS["dependencies"],
            "status": "unknown",
            "earned_points": 0,
            "evidence": [],
        },
        "configuration": {
            "weight": CATEGORY_WEIGHTS["configuration"],
            "status": "unknown",
            "earned_points": 0,
            "evidence": [],
        },
        "deployment": {
            "weight": CATEGORY_WEIGHTS["deployment"],
            "status": "unknown",
            "earned_points": 0,
            "evidence": [],
        },
    }

    if security_available:
        security_issues = (
            summary["security_issues"]
            + summary["potential_secrets"]
        )

        categories["security"]["status"] = (
            "failed" if security_issues > 0 else "passed"
        )

        categories["security"]["evidence"] = [
            {
                "source": "Bandit",
                "reported_security_issues": summary["security_issues"],
            },
            {
                "source": "SecretDetector",
                "reported_potential_secrets": summary["potential_secrets"],
            },
        ]

        # A conservative provisional rule: award security points only
        # when these scanners report zero findings.
        # This is not a guarantee that the code is secure.
        if security_issues == 0:
            categories["security"]["earned_points"] = (
                CATEGORY_WEIGHTS["security"]
            )

    # Tests, dependencies, configuration, and deployment remain unknown
    # until their respective evidence sources are implemented.

    known_weight = sum(
        category["weight"]
        for category in categories.values()
        if category["status"] != "unknown"
    )

    earned_points = sum(
        category["earned_points"]
        for category in categories.values()
    )

    score = (
        round(earned_points / known_weight * 100)
        if known_weight > 0
        else None
    )

    unknown_categories = [
        name
        for name, category in categories.items()
        if category["status"] == "unknown"
    ]

    return {
        "status": "success",
        "score": score,
        "score_type": "provisional",
        "scoring": {
            "earned_points": earned_points,
            "assessed_weight": known_weight,
            "total_weight": 100,
        },
        "categories": categories,
        "unknown_categories": unknown_categories,
        "production_ready": False,
        "note": (
            "This provisional score covers only categories with "
            "available evidence. A zero scanner finding count does "
            "not prove that an application is secure or production-ready."
        ),
    }
