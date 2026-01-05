/**
 * APIClient - handles API requests to backend.
 */
class APIClient {
  constructor({ baseUrl = '', authManager = null } = {}) {
    this.baseUrl = baseUrl;
    this.authManager = authManager;
  }

  _headers() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.authManager?.token) {
      headers.Authorization = `Bearer ${this.authManager.token}`;
    }
    return headers;
  }

  _request(path, options) {
    const url = `${this.baseUrl}${path}`;
    return fetch(url, options).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      return res.json();
    });
  }

  get(path) {
    return this._request(path, {
      method: 'GET',
      headers: this._headers()
    });
  }

  post(path, body) {
    return this._request(path, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body || {})
    });
  }

  startGame(rulesVersion) {
    return this.post('/api/game/start', { rules_version: rulesVersion });
  }

  submitScore(payload) {
    return this.post('/api/game/submit', payload);
  }

  getLeaderboard(limit = 100) {
    return this.get(`/api/leaderboard?limit=${limit}`);
  }

  getMyRank() {
    return this.get('/api/leaderboard/me');
  }
}

export { APIClient };
export default APIClient;
