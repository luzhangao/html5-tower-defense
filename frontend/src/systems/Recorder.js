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
    // 每局开始时重置记录器
    this.seed = seed;
    this.rulesVersion = rulesVersion;
    this.actions = [];
    this.result = null;
    this.actionsPerTick.clear();
  }

  record(action) {
    // 记录 action，保证 tick 内数量上限
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
    // 游戏结束时写入最终状态
    this.result = {
      score: finalState.score,
      wave: finalState.wave,
      endTick: finalState.endTick,
      missedMonsters: finalState.missedMonsters,
      money: finalState.money
    };
  }

  export() {
    // 导出提交给后端的回放结构
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
