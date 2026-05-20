import pytest

from environment.env_core import AttentionEconomyEnv
from environment.models import Action


def test_environment_reset_returns_observation() -> None:
    env = AttentionEconomyEnv()
    obs = env.reset("easy")

    assert obs.task_id == "easy"
    assert obs.step_count == 0
    assert obs.visible_fatigue == 0.0
    assert obs.visible_trust > 0.0
    assert len(obs.available_content) > 0
    assert obs.recent_diversity_score == 0.0


def test_environment_recommend_step_updates_state() -> None:
    env = AttentionEconomyEnv()
    env.reset("easy")
    action = Action(action_type="recommend", content_id="rel_tech_01")

    obs, reward, done, info = env.step(action)

    assert obs.step_count == 1
    assert reward >= 0.0001
    assert isinstance(done, bool)
    assert "diagnostics" in info
    assert info["diagnostics"]["interest_match"] >= 0.0


def test_environment_invalid_content_id_raises() -> None:
    env = AttentionEconomyEnv()
    env.reset("easy")

    with pytest.raises(ValueError, match="Invalid content_id"):
        env.step({"action_type": "recommend", "content_id": "does_not_exist"})


def test_environment_invalid_action_type_raises() -> None:
    env = AttentionEconomyEnv()
    env.reset("easy")

    with pytest.raises(Exception):
        env.step({"action_type": "invalid_action"})


def test_environment_completes_episode_and_returns_grade() -> None:
    env = AttentionEconomyEnv()
    env.reset("easy")
    info = {}

    while not env.done:
        _, _, done, info = env.step(Action(action_type="pause_session"))
        if done:
            break

    assert env.done is True
    assert "episode_grade" in info
    assert 0.0001 <= info["episode_grade"]["final_score"] < 1.0
