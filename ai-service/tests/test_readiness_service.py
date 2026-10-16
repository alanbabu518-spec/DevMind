from app.services.readiness_service import calculate_readiness


def test_missing_evidence_keeps_categories_unknown():
    result = calculate_readiness({})

    assert result["status"] == "success"
    assert result["score"] is None
    assert result["unknown_categories"] == [
        "security",
        "tests",
        "dependencies",
        "configuration",
        "deployment",
    ]
    assert result["production_ready"] is False


def test_zero_security_findings_gives_provisional_full_score():
    analysis = {
        "summary": {
            "security_issues": 0,
            "potential_secrets": 0,
        },
        "findings": [],
        "analyzers": ["Bandit", "SecretDetector"],
    }

    result = calculate_readiness(analysis)

    assert result["score"] == 100
    assert result["score_type"] == "provisional"
    assert result["scoring"]["earned_points"] == 30
    assert result["scoring"]["assessed_weight"] == 30
    assert result["categories"]["security"]["status"] == "passed"
    assert result["production_ready"] is False


def test_security_findings_fail_security_category():
    analysis = {
        "summary": {
            "security_issues": 2,
            "potential_secrets": 1,
        },
        "findings": [],
        "analyzers": ["Bandit", "SecretDetector"],
    }

    result = calculate_readiness(analysis)

    assert result["categories"]["security"]["status"] == "failed"
    assert result["categories"]["security"]["earned_points"] == 0
    assert result["score"] == 0
    assert result["production_ready"] is False


def test_score_uses_only_assessed_category_weights():
    analysis = {
        "summary": {
            "security_issues": 0,
            "potential_secrets": 0,
        },
        "findings": [],
        "analyzers": ["Bandit", "SecretDetector"],
    }

    result = calculate_readiness(analysis)

    assert result["scoring"]["total_weight"] == 100
    assert result["scoring"]["assessed_weight"] == 30
    assert result["scoring"]["earned_points"] == 30
    assert result["unknown_categories"] == [
        "tests",
        "dependencies",
        "configuration",
        "deployment",
    ]


def test_missing_scanner_evidence_does_not_pass_security():
    analysis = {
        "summary": {
            "security_issues": 0,
            "potential_secrets": 0,
        },
        "findings": [],
        "analyzers": ["Bandit"],
    }

    result = calculate_readiness(analysis)

    assert result["categories"]["security"]["status"] == "unknown"
    assert result["categories"]["security"]["earned_points"] == 0
    assert result["score"] is None
    assert result["production_ready"] is False
