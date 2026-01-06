/**
 * HeadlessRunner - executes the deterministic core without rendering.
 */
import CoreEngine from './EngineCore';

class HeadlessRunner {
  constructor({ seed, rulesVersion, tickRate } = {}) {
    this.engine = new CoreEngine({ seed, rulesVersion, tickRate });
  }

  run(actions, finalTick) {
    this.engine.runWithActions(actions);
    if (typeof finalTick === 'number') {
      this.engine.runToTick(finalTick);
    }
    return this.engine.getState();
  }
}

export default HeadlessRunner;
