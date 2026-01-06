import { BrowserRunner, DebugRenderer } from './index';

const debugEnabled = true;
const runner = new BrowserRunner({
  seed: Date.now(),
  rulesVersion: '1.0.0',
  tickRate: 24,
  debug: debugEnabled
});
const debug = new DebugRenderer({ runner });

if (typeof window !== 'undefined' && window.CORE_AUTOSTART) {
  runner.start();
}
debug.start();

if (typeof window !== 'undefined') {
  window.CoreRunner = {
    placeLMG() {
      runner.queueAction({ t: runner.engine.state.tick + 1, op: 'place', entityType: 'LMG' });
    },
    upgrade(id) {
      runner.queueAction({ t: runner.engine.state.tick + 1, op: 'upgrade', entityId: id });
    },
    sell(id) {
      runner.queueAction({ t: runner.engine.state.tick + 1, op: 'sell', entityId: id });
    },
    getState() {
      return runner.engine.getFinalState();
    },
    reset(opts) {
      const next = opts || {};
      if (next.debug === undefined && typeof window !== 'undefined' && window.CORE_DEBUG === true) {
        next.debug = true;
      }
      runner.reset(next);
    },
    setSpeed(speed) {
      runner.setSpeed(speed);
    },
    setPaused(isPaused) {
      runner.setPaused(isPaused);
    },
    getRunner() {
      return runner;
    }
  };
}
