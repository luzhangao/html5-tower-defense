def _get_token(app_client):
    response = app_client.post("/api/auth/anonymous")
    data = response.json()
    return data["token"]


def test_start_game_returns_attempt(app_client):
    token = _get_token(app_client)
    response = app_client.post(
        "/api/game/start",
        headers={"Authorization": f"Bearer {token}"},
        json={"rules_version": "1.0.0"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "attempt_id" in data
    assert "seed" in data
    assert data["rules_version"] == "1.0.0"
