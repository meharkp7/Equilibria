from environment.reward import RewardFunction


def test_reward_function_returns_valid_bounds() -> None:
    reward_fn = RewardFunction()
    reward, breakdown = reward_fn.compute(
        engagement=0.5,
        satisfaction=0.6,
        trust=0.7,
        fatigue=0.2,
        manipulation_score=0.1,
        addiction_risk=0.1,
        diversity_score=0.8,
    )

    assert 0.0001 <= reward <= 0.9999
    assert breakdown["R_engagement"] >= 0.0
    assert breakdown["P_fatigue"] >= 0.0
    assert breakdown["P_manipulation"] >= 0.0
    assert breakdown["reward"] == reward
