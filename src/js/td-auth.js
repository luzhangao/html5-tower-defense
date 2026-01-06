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
		// 从 localStorage 读取匿名身份
		try {
			this.userId = window.localStorage.getItem("td_user_id");
			this.token = window.localStorage.getItem("td_token");
		} catch (error) {
			this.userId = null;
			this.token = null;
		}
	};

	AuthManager.prototype.save = function () {
		// 将匿名身份持久化到本地
		try {
			window.localStorage.setItem("td_user_id", this.userId || "");
			window.localStorage.setItem("td_token", this.token || "");
		} catch (error) {
			// ignore storage errors
		}
	};

	AuthManager.prototype.clear = function () {
		// 清空本地身份，触发重新获取
		this.userId = null;
		this.token = null;
		this.save();
	};

	AuthManager.prototype.ensureIdentity = function (apiClient) {
		// 如果本地没有身份，则向后端申请匿名用户
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
