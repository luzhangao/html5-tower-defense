import importlib
import os
import sys

import pytest
from fastapi.testclient import TestClient


repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)


@pytest.fixture()
def app_client(tmp_path, monkeypatch):
    db_path = tmp_path / "td_test.db"
    monkeypatch.setenv("TD_DB_PATH", str(db_path))

    from backend.app.database import connection
    importlib.reload(connection)

    # Ensure models/APIs are re-imported against the reloaded Base/engine.
    for name in (
        "backend.app.models",
        "backend.app.models.user",
        "backend.app.models.attempt",
        "backend.app.models.submission",
        "backend.app.models.leaderboard",
        "backend.app.api.auth",
        "backend.app.api.game",
        "backend.app.api.leaderboard",
        "backend.app.main",
    ):
        sys.modules.pop(name, None)

    main = importlib.import_module("backend.app.main")
    connection.init_db()

    with TestClient(main.app) as client:
        yield client
