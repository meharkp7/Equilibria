from environment.demo import heuristic_agent, run_episode
from environment.env_core import AttentionEconomyEnv
from environment.models import Action


def test_heuristic_agent_returns_valid_action() -> None:
    env = AttentionEconomyEnv()
    obs = env.reset("easy")
    action = heuristic_agent(obs)

    assert action.action_type in {"recommend", "pause_session", "diversify_feed", "explore_new_topic"}
    if action.action_type == "recommend":
        assert isinstance(action.content_id, str)
        assert action.content_id in {content.content_id for content in obs.available_content}


def test_demo_run_episode_finishes() -> None:
    result = run_episode("easy")
    assert result is None
