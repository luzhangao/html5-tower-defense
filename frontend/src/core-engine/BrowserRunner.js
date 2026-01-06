/**
 * BrowserRunner - drives CoreEngine with requestAnimationFrame.
 */
import TickClock from '../core/TickClock';
import CoreEngine from './EngineCore';

class BrowserRunner {
  constructor({ seed, rulesVersion, tickRate, debug } = {}) {
    this.engine = new CoreEngine({ seed, rulesVersion, tickRate, debug });
    this.tickClock = new TickClock(tickRate || 24);
    this.isRunning = false;
    this.lastFrameTime = 0;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    this.isRunning = false;
  }

  reset({ seed, rulesVersion, tickRate, debug } = {}) {
    const nextSeed = seed !== undefined && seed !== null ? seed : Date.now();
    const nextRules = rulesVersion || this.engine.rulesVersion;
    const nextRate = tickRate || this.tickClock.getTickRate();
    const nextDebug = debug !== undefined ? debug : this.engine.debug;
    this.engine = new CoreEngine({
      seed: nextSeed,
      rulesVersion: nextRules,
      tickRate: nextRate,
      debug: nextDebug
    });
    this.tickClock.reset();
    this.lastFrameTime = performance.now();
  }

  queueAction(action) {
    this.engine.queueAction(action);
  }

  syncToTick(targetTick) {
    this.engine.runToTick(targetTick);
  }

  setSpeed(speed) {
    this.tickClock.setGameSpeed(speed);
  }

  setPaused(isPaused) {
    this.tickClock.setPaused(!!isPaused);
  }

  _loop(currentTime) {
    if (!this.isRunning) return;
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    const ticks = this.tickClock.update(deltaTime);
    for (let i = 0; i < ticks.length; i += 1) {
      this.engine.stepOneTick();
    }
    requestAnimationFrame((t) => this._loop(t));
  }
}

export default BrowserRunner;
