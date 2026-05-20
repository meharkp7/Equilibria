import numpy as np
import pytest
from stable_baselines3 import PPO

from environment.eval_rl import _resolve_model_path
from environment.rl_wrapper import AttentionEnvWrapper, ALL_CONTENT_IDS, META_ACTIONS, OBS_SIZE


def test_attention_env_wrapper_reset_and_obs_shape():
    env = AttentionEnvWrapper(task_id="easy")
    obs, info = env.reset(seed=123)

    assert isinstance(obs, np.ndarray)
    assert obs.shape == (OBS_SIZE,)
    assert obs.dtype == np.float32
    assert env.action_space.n == len(ALL_CONTENT_IDS) + len(META_ACTIONS)
    assert obs.min() >= 0.0 and obs.max() <= 1.0
    assert info == {}


def test_attention_env_wrapper_random_action_masks_and_step():
    env = AttentionEnvWrapper(task_id="medium")
    obs, _ = env.reset(seed=42)
    masks = env.action_masks()

    assert masks.shape == (env.action_space.n,)
    assert masks.dtype == bool
    assert masks[-len(META_ACTIONS):].all()

    valid_indices = np.flatnonzero(masks)
    assert valid_indices.size > 0

    action = int(valid_indices[0])
    obs2, reward, terminated, truncated, info = env.step(action)

    assert isinstance(obs2, np.ndarray)
    assert obs2.shape == (OBS_SIZE,)
    assert isinstance(reward, float)
    assert isinstance(terminated, bool)
    assert isinstance(truncated, bool)
    assert isinstance(info, dict)


def test_attention_env_wrapper_reset_seed_reproducible():
    env1 = AttentionEnvWrapper(task_id="easy")
    obs1, _ = env1.reset(seed=123)

    env2 = AttentionEnvWrapper(task_id="easy")
    obs2, _ = env2.reset(seed=123)

    np.testing.assert_allclose(obs1, obs2, atol=1e-6)


def test_attention_env_wrapper_max_steps_override():
    env = AttentionEnvWrapper(task_id="easy", max_steps=5)
    _, _ = env.reset(seed=1)

    assert env._env.max_steps == 5
    assert env._env.max_steps != 15


def test_attention_env_wrapper_sb3_compatibility():
    env = AttentionEnvWrapper(task_id="easy")
    model = PPO("MlpPolicy", env, verbose=0)
    model.learn(total_timesteps=16)
    env.close()

    assert hasattr(model, "policy")


def test_resolve_model_path_missing_model_raises():
    with pytest.raises(FileNotFoundError, match="No model at"):
        _resolve_model_path("invalid_task", model_path="does/not/exist")
