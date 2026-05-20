from environment.models import UserState, ContentItem
from environment.state_manager import StateManager


def test_state_manager_initialize_and_apply_step() -> None:
    user = UserState(
        user_id="test_user",
        interest_distribution={"technology": 1.0},
        fatigue=0.0,
        trust=0.5,
        addiction_risk=0.1,
        satisfaction=0.5,
        boredom=0.0,
        session_length=0,
        fatigue_sensitivity=1.0,
        trust_decay_rate=1.0,
    )
    content = ContentItem(
        content_id="rel_tech_01",
        title="Tech",
        topic_relevance={"technology": 1.0},
        addictiveness=0.1,
        manipulation_score=0.05,
        educational_value=0.9,
        novelty=0.8,
    )

    manager = StateManager()
    manager.initialize(user)

    changes = manager.apply_step(
        content=content,
        fatigue_delta=0.1,
        trust_delta=0.05,
        satisfaction_delta=0.1,
        addiction_risk_delta=0.05,
        boredom_delta=0.02,
    )

    assert manager.step_count == 1
    assert manager.history == ["rel_tech_01"]
    assert changes["step_count"] == 1
    assert manager.user.fatigue == 0.1
    assert manager.user.session_length == 1


def test_state_manager_history_recently() -> None:
    user = UserState(
        user_id="test_user",
        interest_distribution={"technology": 1.0},
        fatigue=0.0,
        trust=0.5,
        addiction_risk=0.1,
        satisfaction=0.5,
        boredom=0.0,
        session_length=0,
        fatigue_sensitivity=1.0,
        trust_decay_rate=1.0,
    )
    manager = StateManager()
    manager.initialize(user)
    manager.apply_step(
        content=ContentItem(
            content_id="rel_tech_01",
            title="Tech",
            topic_relevance={"technology": 1.0},
            addictiveness=0.1,
            manipulation_score=0.05,
            educational_value=0.9,
            novelty=0.8,
        ),
        fatigue_delta=0.0,
        trust_delta=0.0,
        satisfaction_delta=0.0,
        addiction_risk_delta=0.0,
        boredom_delta=0.0,
    )

    assert manager.has_seen_recently("rel_tech_01") is True
    assert manager.has_seen_recently("does_not_exist") is False
