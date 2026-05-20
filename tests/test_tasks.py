import pytest

from environment.tasks import get_task


def test_get_task_aliases() -> None:
    for alias, expected in {
        "easy": "easy",
        "easy_recommendation": "easy",
        "medium": "medium",
        "diverse_feed": "medium",
        "hard": "hard",
        "trust_preservation": "hard",
    }.items():
        cfg, user = get_task(alias)
        assert cfg.task_id == expected
        assert user.user_id.startswith("user_")


def test_get_task_unknown_raises() -> None:
    with pytest.raises(ValueError, match="Unknown task"):
        get_task("unknown")
