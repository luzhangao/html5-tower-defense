/**
 * Recorder - records deterministic actions and final results.
 */
class Recorder {
  constructor() {
    this.seed = null;
    this.rulesVersion = null;
    this.actions = [];
    this.result = null;
    this.actionsPerTick = new Map();
  }

  init(seed, rulesVersion) {
    this.seed = seed;
    this.rulesVersion = rulesVersion;
    this.actions = [];
    this.result = null;
    this.actionsPerTick.clear();
  }

  record(action) {
    const tick = action.t;
    const count = this.actionsPerTick.get(tick) || 0;
    if (count >= 2) {
      throw new Error('Too many actions in single tick');
    }
    this.actionsPerTick.set(tick, count + 1);
    this.actions.push(action);
  }

  getActionCount(tick) {
    return this.actionsPerTick.get(tick) || 0;
  }

  finalize(finalState) {
    this.result = {
      score: finalState.score,
      wave: finalState.wave,
      endTick: finalState.endTick,
      missedMonsters: finalState.missedMonsters,
      money: finalState.money
    };
  }

  export() {
    return {
      seed: this.seed,
      rulesVersion: this.rulesVersion,
      actions: this.actions,
      result: this.result
    };
  }
}

export { Recorder };
export default Recorder;
