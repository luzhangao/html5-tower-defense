def test_anonymous_auth_returns_token(app_client):
    response = app_client.post("/api/auth/anonymous")
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert "token" in data
