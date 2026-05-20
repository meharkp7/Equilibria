import numpy as np
import pytest

from environment.eval_rl import _aggregate, _heuristic as eval_heuristic
from environment.env_core import AttentionEconomyEnv
from environment.models import Action
from environment.plot_results import _pad, _heuristic as plot_heuristic


def test_eval_rl_aggregate_empty_returns_empty_dict():
    assert _aggregate([]) == {}


def test_eval_rl_aggregate_computes_mean_and_std():
    grades = [
        {"final_score": 0.2},
        {"final_score": 0.4},
    ]
    result = _aggregate(grades)

    assert result["final_score"] == pytest.approx(0.3, rel=1e-6)
    assert result["final_score_mean"] == pytest.approx(0.3, rel=1e-6)
    assert result["final_score_std"] == pytest.approx(np.std([0.2, 0.4]), rel=1e-6)


def test_eval_rl_heuristic_returns_action_object():
    env = AttentionEconomyEnv()
    obs = env.reset("easy", seed=42)
    action = eval_heuristic(obs)

    assert isinstance(action, Action)
    assert action.action_type in {
        "recommend", "diversify_feed", "explore_new_topic", "pause_session"
    }


def test_plot_results_pad_extends_short_list():
    padded = _pad([1.0, 2.0], 5, fill=0.5)
    assert padded == [1.0, 2.0, 0.5, 0.5, 0.5]


def test_plot_results_pad_keeps_long_list_intact():
    assert _pad([1.0, 2.0, 3.0], 2, fill=0.5) == [1.0, 2.0, 3.0]


def test_plot_results_heuristic_returns_action_object():
    env = AttentionEconomyEnv()
    obs = env.reset("easy", seed=42)
    action = plot_heuristic(obs)

    assert isinstance(action, Action)
    assert action.action_type in {
        "recommend", "diversify_feed", "explore_new_topic", "pause_session"
    }
