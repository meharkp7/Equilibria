"""Per-client environment sessions for concurrent API users."""

from __future__ import annotations

import threading
import uuid
from typing import Dict

from environment.env_core import AttentionEconomyEnv

DEFAULT_SESSION_ID = "default"


class SessionManager:
    def __init__(self) -> None:
        self._sessions: Dict[str, AttentionEconomyEnv] = {}
        self._lock = threading.Lock()

    def resolve_id(self, header_value: str | None) -> str:
        if header_value and header_value.strip():
            return header_value.strip()
        return DEFAULT_SESSION_ID

    def new_id(self) -> str:
        return str(uuid.uuid4())

    def get(self, session_id: str) -> AttentionEconomyEnv:
        with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = AttentionEconomyEnv()
            return self._sessions[session_id]

    def delete(self, session_id: str) -> bool:
        with self._lock:
            return self._sessions.pop(session_id, None) is not None

    def clear_all(self) -> None:
        """Test helper — wipe every session."""
        with self._lock:
            self._sessions.clear()


sessions = SessionManager()

# Backward-compatible alias used by tests
env = sessions.get(DEFAULT_SESSION_ID)
