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
		var headers = { "Content-Type": "application/json" };
		if (this.authManager && this.authManager.token) {
			headers.Authorization = "Bearer " + this.authManager.token;
		}
		return headers;
	};

	APIClient.prototype._request = function (path, options, retried) {
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
		return this.post("/api/game/start", {
			rules_version: rulesVersion
		});
	};

	APIClient.prototype.submitScore = function (payload) {
		return this.post("/api/game/submit", payload);
	};

	APIClient.prototype.getLeaderboard = function (limit) {
		var q = limit ? ("?limit=" + limit) : "";
		return this.get("/api/leaderboard" + q);
	};

	APIClient.prototype.getMyRank = function () {
		return this.get("/api/leaderboard/me");
	};

	TD.APIClient = APIClient;
}); // _TD.a.push end
