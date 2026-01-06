/**
 * DebugRenderer - renders core state to a DOM pre element.
 */
class DebugRenderer {
  constructor({ runner, intervalMs = 500, containerId = 'core-debug' } = {}) {
    this.runner = runner;
    this.intervalMs = intervalMs;
    this.containerId = containerId;
    this.timer = null;
    this.el = null;
  }

  start() {
    if (!this.runner || this.timer) return;
    if (typeof document !== 'undefined') {
      this.el = document.getElementById(this.containerId);
      if (!this.el) {
        this.el = document.createElement('pre');
        this.el.id = this.containerId;
        this.el.style.cssText = 'position:fixed;bottom:0;left:0;max-width:50%;max-height:40%;overflow:auto;padding:8px;background:#fff;border:1px solid #ccc;font:12px/1.4 monospace;z-index:9999;';
        document.body.appendChild(this.el);
      }
    }
    this.timer = setInterval(() => {
      const state = this.runner.engine.getFinalState();
      const payload = {
        seed: this.runner.engine.seed,
        ...state
      };
      if (this.el) {
        this.el.textContent = JSON.stringify(payload, null, 2);
      }
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export default DebugRenderer;
