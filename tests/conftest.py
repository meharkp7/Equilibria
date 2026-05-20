import pytest
from fastapi.testclient import TestClient

from server.main import app
from server.sessions import DEFAULT_SESSION_ID, sessions


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_server_env() -> None:
    """Reset the default session environment between tests."""
    sessions.clear_all()
    env = sessions.get(DEFAULT_SESSION_ID)
    env.user = None
    env.history = []
    env.step_count = 0
    env.done = False
    env.task_id = None
    env.allowed_content_ids = []
    env.reward_fn = None
    env.engagement_history = []
    env.consecutive_pauses = 0
    yield
