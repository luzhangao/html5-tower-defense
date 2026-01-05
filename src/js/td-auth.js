/*
 * AuthManager - manages anonymous identity.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	function AuthManager() {
		this.userId = null;
		this.token = null;
	}

	AuthManager.prototype.load = function () {
		try {
			this.userId = window.localStorage.getItem("td_user_id");
			this.token = window.localStorage.getItem("td_token");
		} catch (error) {
			this.userId = null;
			this.token = null;
		}
	};

	AuthManager.prototype.save = function () {
		try {
			window.localStorage.setItem("td_user_id", this.userId || "");
			window.localStorage.setItem("td_token", this.token || "");
		} catch (error) {
			// ignore storage errors
		}
	};

	AuthManager.prototype.ensureIdentity = function (apiClient) {
		this.load();
		if (this.userId && this.token) {
			return Promise.resolve({ user_id: this.userId, token: this.token });
		}
		return apiClient.post("/api/auth/anonymous", {}).then(function (res) {
			this.userId = res.user_id;
			this.token = res.token;
			this.save();
			return res;
		}.bind(this));
	};

	TD.AuthManager = AuthManager;
}); // _TD.a.push end
