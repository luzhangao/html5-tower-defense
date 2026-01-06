import types
import pytest

from backend.app.services.validator import ReplayValidator


class _FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = str(self._payload)

    def json(self):
        return self._payload


class _FakeClient:
    def __init__(self, response):
        self._response = response

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, json):
        return self._response


@pytest.mark.asyncio
async def test_validator_success(monkeypatch):
    payload = {
        "valid": True,
        "state": {"score": 100, "wave": 2, "breakdown": {"base_score": 100}},
    }
    response = _FakeResponse(payload=payload)
    fake_client = _FakeClient(response)
    monkeypatch.setattr("backend.app.services.validator.httpx.AsyncClient", lambda timeout: fake_client)

    validator = ReplayValidator("http://localhost:3001")
    result = await validator.validate(1, "1.0.0", [], 100, 2, 10)
    assert result.valid is True
    assert result.score == 100
    assert result.level == 2


@pytest.mark.asyncio
async def test_validator_error(monkeypatch):
    response = _FakeResponse(status_code=500, payload={"error": "bad"})
    fake_client = _FakeClient(response)
    monkeypatch.setattr("backend.app.services.validator.httpx.AsyncClient", lambda timeout: fake_client)

    validator = ReplayValidator("http://localhost:3001")
    result = await validator.validate(1, "1.0.0", [], 100, 2, 10)
    assert result.valid is False
    assert result.error.startswith("Verifier error")
