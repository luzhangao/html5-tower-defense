/**
 * LeaderboardUI - renders leaderboard panel and refreshes data.
 */
class LeaderboardUI {
  constructor({ apiClient, containerId, listId, meId, statusId, maxEntries = 100 } = {}) {
    this.apiClient = apiClient;
    this.containerId = containerId;
    this.listId = listId;
    this.meId = meId;
    this.statusId = statusId;
    this.maxEntries = maxEntries;
  }

  init() {
    this.container = document.getElementById(this.containerId);
    this.list = document.getElementById(this.listId);
    this.me = document.getElementById(this.meId);
    this.status = document.getElementById(this.statusId);
  }

  setStatus(msg) {
    if (this.status) {
      this.status.textContent = msg || '';
    }
  }

  open() {
    if (this.container) {
      this.container.style.display = 'block';
    }
    this.refresh();
  }

  close() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  renderList(entries) {
    if (!this.list) return;
    this.list.innerHTML = '';
    entries.forEach((entry) => {
      const li = document.createElement('li');
      li.textContent = `#${entry.rank}  ${entry.score}  (Lv ${entry.level})`;
      this.list.appendChild(li);
    });
  }

  renderMe(entry) {
    if (!this.me) return;
    if (!entry || !entry.rank) {
      this.me.textContent = '-';
      return;
    }
    this.me.textContent = `#${entry.rank}  ${entry.score}  (Lv ${entry.level})`;
  }

  refresh() {
    if (!this.apiClient) return;
    this.setStatus('Loading...');
    const topPromise = this.apiClient.getLeaderboard(this.maxEntries);
    const mePromise = this.apiClient.getMyRank();
    Promise.all([topPromise, mePromise])
      .then(([top, me]) => {
        this.renderList(top?.entries || []);
        this.renderMe(me);
        this.setStatus('Updated');
      })
      .catch((err) => {
        this.setStatus(err.message || 'Load failed');
      });
  }
}

export { LeaderboardUI };
export default LeaderboardUI;
