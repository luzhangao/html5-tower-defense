/**
 * AuthManager - manages anonymous identity.
 */
class AuthManager {
  constructor() {
    this.userId = null;
    this.token = null;
  }

  load() {
    try {
      this.userId = window.localStorage.getItem('td_user_id');
      this.token = window.localStorage.getItem('td_token');
    } catch (error) {
      this.userId = null;
      this.token = null;
    }
  }

  save() {
    try {
      window.localStorage.setItem('td_user_id', this.userId || '');
      window.localStorage.setItem('td_token', this.token || '');
    } catch (error) {
      // ignore storage errors
    }
  }

  ensureIdentity(apiClient) {
    this.load();
    if (this.userId && this.token) {
      return Promise.resolve({ user_id: this.userId, token: this.token });
    }
    return apiClient.post('/api/auth/anonymous', {}).then((res) => {
      this.userId = res.user_id;
      this.token = res.token;
      this.save();
      return res;
    });
  }
}

export { AuthManager };
export default AuthManager;
