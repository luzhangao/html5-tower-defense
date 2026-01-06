/*
 * APIClient - handles API requests to backend.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	function APIClient(cfg) {
		cfg = cfg || {};
		this.baseUrl = cfg.baseUrl || "";
		this.authManager = cfg.authManager || null;
	}

	APIClient.prototype._headers = function () {
		// 带上 JWT（如果已登录/匿名身份已建立）
		var headers = { "Content-Type": "application/json" };
		if (this.authManager && this.authManager.token) {
			headers.Authorization = "Bearer " + this.authManager.token;
		}
		return headers;
	};

	APIClient.prototype._request = function (path, options, retried) {
		// 统一请求入口：遇到 401 自动刷新身份并重试
		var url = this.baseUrl + path;
		var _this = this;
		return fetch(url, options).then(function (res) {
			if (res.status === 401 && _this.authManager && !retried) {
				_this.authManager.clear();
				return _this.authManager.ensureIdentity(_this).then(function () {
					var retryOptions = Object.assign({}, options, { headers: _this._headers() });
					return _this._request(path, retryOptions, true);
				});
			}
			if (!res.ok) {
				return res.text().then(function (txt) {
					throw new Error(txt || ("HTTP " + res.status));
				});
			}
			return res.json();
		});
	};

	APIClient.prototype.get = function (path) {
		return this._request(path, {
			method: "GET",
			headers: this._headers()
		});
	};

	APIClient.prototype.post = function (path, body) {
		return this._request(path, {
			method: "POST",
			headers: this._headers(),
			body: JSON.stringify(body || {})
		});
	};

	APIClient.prototype.startGame = function (rulesVersion) {
		// 开始排行榜模式，后端会返回 seed + attempt_id
		return this.post("/api/game/start", {
			rules_version: rulesVersion
		});
	};

	APIClient.prototype.submitScore = function (payload) {
		// 提交回放与声明分数，后端验证后入榜
		return this.post("/api/game/submit", payload);
	};

	APIClient.prototype.getLeaderboard = function (limit) {
		// 获取排行榜列表
		var q = limit ? ("?limit=" + limit) : "";
		return this.get("/api/leaderboard" + q);
	};

	APIClient.prototype.getMyRank = function () {
		// 获取当前用户在榜单中的名次
		return this.get("/api/leaderboard/me");
	};

	TD.APIClient = APIClient;
}); // _TD.a.push end
