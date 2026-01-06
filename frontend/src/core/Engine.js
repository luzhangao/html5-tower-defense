/**
 * LegacyHeadlessEngine - runs the legacy game logic in Node for verifier.
 *
 * This loads legacy scripts in a shared VM context and drives ticks manually.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const SCRIPT_ORDER = [
  'td.js',
  'td-random.js',
  'td-tick-clock.js',
  'td-rules-manager.js',
  'td-entity-manager.js',
  'td-recorder.js',
  'td-action-dispatcher.js',
  'td-scoring-system.js',
  'td-speed-controller.js',
  'td-audio.js',
  'td-lang.js',
  'td-event.js',
  'td-stage.js',
  'td-element.js',
  'td-obj-map.js',
  'td-obj-grid.js',
  'td-obj-building.js',
  'td-obj-monster.js',
  'td-obj-panel.js',
  'td-data-stage-1.js',
  'td-cfg-buildings.js',
  'td-cfg-monsters.js',
  'td-render-buildings.js',
  'td-msg-zh.js',
  'td-walk.js'
];

function createNoopContext() {
  const fn = () => {};
  return {
    beginPath: fn,
    closePath: fn,
    fill: fn,
    stroke: fn,
    fillRect: fn,
    strokeRect: fn,
    arc: fn,
    moveTo: fn,
    lineTo: fn,
    clearRect: fn,
    fillText: fn,
    drawImage: fn
  };
}

function setupHeadlessDom() {
  const ctx = createNoopContext();
  const canvas = {
    style: {},
    getContext: () => ctx,
    setAttribute: () => {},
    getElementsByTagName: () => []
  };
  const board = {
    getElementsByTagName: () => [canvas]
  };

  if (!globalThis.window) {
    globalThis.window = globalThis;
  }
  globalThis.document = {
    getElementById: () => board,
    createElement: () => ({ setAttribute: () => {} }),
    documentElement: { scrollLeft: 0, scrollTop: 0 },
    body: { scrollLeft: 0, scrollTop: 0 },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  if (!globalThis.navigator) {
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'node' },
        configurable: true
      });
    } catch (error) {
      // ignore if navigator is read-only
    }
  }
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {}
  };
  globalThis.Audio = function () {
    return {
      paused: true,
      ended: true,
      currentTime: 0,
      volume: 0,
      play: () => Promise.resolve()
    };
  };
  globalThis.performance = {
    now: () => Date.now()
  };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = () => {};
}

function loadLegacyScripts(baseDir) {
  SCRIPT_ORDER.forEach((file) => {
    const filePath = path.resolve(baseDir, 'src/js', file);
    const code = fs.readFileSync(filePath, 'utf8');
    vm.runInThisContext(code, { filename: filePath });
  });
}

class LegacyHeadlessEngine {
  constructor({ seed, rulesVersion } = {}) {
    if (seed === undefined || seed === null) {
      throw new Error('seed required');
    }
    setupHeadlessDom();
    globalThis.__TD_HEADLESS__ = true;
    globalThis.__TD_HEADLESS_SEED__ = seed;
    globalThis.__TD_HEADLESS_RULES_VERSION__ = rulesVersion || null;

    const baseDir = path.resolve(__dirname, '..', '..');
    loadLegacyScripts(baseDir);

    if (!globalThis._TD || !globalThis._TD.init) {
      throw new Error('Legacy TD init not found');
    }

    globalThis._TD.init('td-board', true);
    this.TD = globalThis._TD.runtime;
    if (!this.TD) {
      throw new Error('Legacy TD runtime not exposed');
    }
    this.scene = this.TD.stage.current_act.current_scene;
    this.maxTicks = 100000;
    this.TD.game_mode = 'normal';
  }

  _stepOneTick() {
    const nextTick = this.TD.getCurrentTick() + 1;
    this.TD.tickClock.currentTick = nextTick;
    this.TD.iframe = nextTick;
    this.TD.stage.step();
  }

  advanceToTick(targetTick) {
    while (this.TD.getCurrentTick() < targetTick && !this.scene.is_gameover) {
      this._stepOneTick();
      if (this.TD.getCurrentTick() > this.maxTicks) {
        throw new Error('Game too long (>100000 ticks)');
      }
    }
  }

  applyAction(action) {
    this.advanceToTick(action.t);
    this.TD.actionDispatcher.dispatch(action, true);
  }

  runWithActions(actions) {
    let index = 0;
    let currentTick = this.TD.getCurrentTick();

    while (index < actions.length && actions[index].t === currentTick) {
      this.TD.actionDispatcher.dispatch(actions[index], true);
      index++;
    }

    while (!this.scene.is_gameover && currentTick < this.maxTicks) {
      const nextTick = currentTick + 1;
      this.TD.tickClock.currentTick = nextTick;
      this.TD.iframe = nextTick;

      while (index < actions.length && actions[index].t === nextTick) {
        this.TD.actionDispatcher.dispatch(actions[index], true);
        index++;
      }

      this.TD.stage.step();
      currentTick = nextTick;
    }
  }

  runToGameOver() {
    while (!this.scene.is_gameover && this.TD.getCurrentTick() < this.maxTicks) {
      this._stepOneTick();
    }
  }

  getFinalState() {
    return {
      score: this.TD.score,
      wave: this.scene.wave,
      endTick: this.TD.getCurrentTick(),
      missedMonsters: this.TD.missed_monsters || 0,
      money: this.TD.money || 0,
      breakdown: this.TD.score_breakdown || null
    };
  }
}

function verifyReplay({ seed, rulesVersion, actions, claimedScore, claimedLevel }) {
  const engine = new LegacyHeadlessEngine({ seed, rulesVersion });

  if (Array.isArray(actions)) {
    engine.runWithActions(actions);
  } else {
    engine.runToGameOver();
  }
  const finalState = engine.getFinalState();
  const valid = typeof claimedScore === 'number' ? finalState.score === claimedScore : true;
  const level = finalState.wave;

  if (typeof claimedLevel === 'number' && claimedLevel !== level) {
    return { valid: false, error: 'Level mismatch', score: finalState.score, level };
  }

  return {
    valid,
    score: finalState.score,
    level,
    breakdown: finalState.breakdown || {},
    error: valid ? null : 'Score mismatch'
  };
}

export { LegacyHeadlessEngine, verifyReplay };
