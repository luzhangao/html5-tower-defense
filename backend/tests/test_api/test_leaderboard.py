def _get_token(app_client):
    response = app_client.post("/api/auth/anonymous")
    data = response.json()
    return data["token"]


def test_leaderboard_empty(app_client):
    response = app_client.get("/api/leaderboard")
    assert response.status_code == 200
    data = response.json()
    assert data["entries"] == []
    assert data["total"] == 0


def test_leaderboard_me_empty(app_client):
    token = _get_token(app_client)
    response = app_client.get("/api/leaderboard/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["rank"] is None
