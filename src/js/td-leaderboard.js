/*
 * LeaderboardUI - renders leaderboard panel and refreshes data.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	function LeaderboardUI(cfg) {
		cfg = cfg || {};
		this.apiClient = cfg.apiClient;
		this.maxEntries = cfg.maxEntries || 100;
		this.container = null;
		this.list = null;
		this.me = null;
		this.status = null;
	}

	LeaderboardUI.prototype.init = function () {
		this.container = TD.lang.$e("td-leaderboard-panel");
		this.list = TD.lang.$e("td-leaderboard-list");
		this.me = TD.lang.$e("td-leaderboard-me");
		this.status = TD.lang.$e("td-leaderboard-status");
		var btnOpen = TD.lang.$e("td-btn-leaderboard-open");
		var btnClose = TD.lang.$e("td-leaderboard-close");
		var btnRefresh = TD.lang.$e("td-leaderboard-refresh");

		if (btnOpen) btnOpen.onclick = this.open.bind(this);
		if (btnClose) btnClose.onclick = this.close.bind(this);
		if (btnRefresh) btnRefresh.onclick = this.refresh.bind(this);
	};

	LeaderboardUI.prototype.setStatus = function (msg) {
		if (this.status) {
			this.status.textContent = msg || "";
		}
	};

	LeaderboardUI.prototype.open = function () {
		if (this.container) {
			this.container.style.display = "block";
		}
		this.refresh();
	};

	LeaderboardUI.prototype.close = function () {
		if (this.container) {
			this.container.style.display = "none";
		}
	};

	LeaderboardUI.prototype.renderList = function (entries) {
		if (!this.list) return;
		this.list.innerHTML = "";
		var i;
		for (i = 0; i < entries.length; i++) {
			var li = document.createElement("li");
			li.textContent = "#" + entries[i].rank + "  " + entries[i].score + "  (Lv " + entries[i].level + ")";
			this.list.appendChild(li);
		}
	};

	LeaderboardUI.prototype.renderMe = function (entry) {
		if (!this.me) return;
		if (!entry || !entry.rank) {
			this.me.textContent = "-";
			return;
		}
		this.me.textContent = "#" + entry.rank + "  " + entry.score + "  (Lv " + entry.level + ")";
	};

	LeaderboardUI.prototype.refresh = function () {
		if (!this.apiClient) return;
		this.setStatus("Loading...");
		var topPromise = this.apiClient.getLeaderboard(this.maxEntries);
		var mePromise = this.apiClient.getMyRank();
		Promise.all([topPromise, mePromise]).then(function (res) {
			var entries = (res[0] && res[0].entries) || [];
			this.renderList(entries);
			this.renderMe(res[1]);
			this.setStatus("Updated");
		}.bind(this)).catch(function (err) {
			this.setStatus(err.message || "Load failed");
		}.bind(this));
	};

	TD.LeaderboardUI = LeaderboardUI;
}); // _TD.a.push end
