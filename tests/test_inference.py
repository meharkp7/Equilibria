import pytest

from inference import run_episode


def test_inference_dry_run_easy() -> None:
    result = run_episode("easy", dry_run=True)

    assert isinstance(result, dict)
    assert result["steps"] > 0
    assert 0.0001 <= result["score"] <= 0.9999
    assert isinstance(result["episode_grade"], dict)
    assert "final_score" in result["episode_grade"]
    assert isinstance(result["success"], bool)
