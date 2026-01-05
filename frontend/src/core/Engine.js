/**
 * HeadlessEngine - minimal deterministic validator for Node verifier.
 * TODO: replace with full game simulation.
 */
import { RandomGenerator } from '../core/RandomGenerator.js';
import RulesManager from '../systems/RulesManager.js';
import ScoringSystem from '../systems/ScoringSystem.js';

class HeadlessEngine {
  constructor({ seed, rulesVersion, gridWidth = 16, gridHeight = 16, startMoney = 500 } = {}) {
    if (seed === undefined || seed === null) {
      throw new Error('seed required');
    }
    this.seed = seed;
    this.rulesManager = new RulesManager();
    if (rulesVersion) {
      this.rulesManager.setVersion(rulesVersion);
    }
    this.rules = this.rulesManager.getRules();
    this.random = new RandomGenerator(seed);
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.money = startMoney;
    this.currentTick = 0;
    this.entities = new Map();
    this.nextEntityId = 1;
    this.occupied = new Set();
    this.actionsPerTick = new Map();
  }

  _gridKey(pos) {
    return `${pos[0]},${pos[1]}`;
  }

  _ensureTick(action) {
    if (action.t < this.currentTick) {
      throw new Error('Tick must be monotonically increasing');
    }
  }

  _recordTick(action) {
    const count = this.actionsPerTick.get(action.t) || 0;
    if (count >= 2) {
      throw new Error('Too many actions in single tick');
    }
    this.actionsPerTick.set(action.t, count + 1);
  }

  _validatePos(pos) {
    if (!pos || pos.length !== 2) return false;
    return pos[0] >= 0 && pos[0] < this.gridWidth && pos[1] >= 0 && pos[1] < this.gridHeight;
  }

  _allocateId() {
    return `E${this.nextEntityId++}`;
  }

  _getBuildingConfig(type) {
    return this.rules.buildings[type] || null;
  }

  applyAction(action) {
    this._ensureTick(action);
    this._recordTick(action);
    this.currentTick = action.t;

    if (action.op === 'place') {
      if (!this._validatePos(action.pos)) throw new Error('Invalid grid position');
      const key = this._gridKey(action.pos);
      if (this.occupied.has(key)) throw new Error('Grid not buildable');
      const cfg = this._getBuildingConfig(action.entityType);
      if (!cfg) throw new Error('Invalid building type');
      const cost = cfg.cost || 0;
      if (this.money < cost) throw new Error('Not enough money');

      const entityId = action.entityId || this._allocateId();
      if (this.entities.has(entityId)) throw new Error('Entity ID already exists');
      this.money -= cost;
      this.entities.set(entityId, {
        id: entityId,
        type: action.entityType,
        pos: action.pos,
        level: 0,
        moneySpent: cost,
        active: true
      });
      this.occupied.add(key);
      return { entityId };
    }

    if (action.op === 'upgrade') {
      const entity = this.entities.get(action.entityId);
      if (!entity || !entity.active) throw new Error('Invalid entity');
      const cost = Math.floor(entity.moneySpent * 0.75) || 1;
      if (this.money < cost) throw new Error('Not enough money');
      this.money -= cost;
      entity.moneySpent += cost;
      entity.level += 1;
      return { entityId: action.entityId };
    }

    if (action.op === 'sell') {
      const entity = this.entities.get(action.entityId);
      if (!entity || !entity.active) throw new Error('Invalid entity');
      const sellValue = Math.floor(entity.moneySpent * 0.5) || 1;
      this.money += sellValue;
      entity.active = false;
      const key = this._gridKey(entity.pos);
      this.occupied.delete(key);
      return { entityId: action.entityId };
    }

    throw new Error('Unknown action');
  }

  getFinalState(claimedLevel) {
    const wave = typeof claimedLevel === 'number' ? claimedLevel : 0;
    return {
      wave,
      endTick: this.currentTick,
      missedMonsters: 0,
      money: this.money
    };
  }
}

function verifyReplay({ seed, rulesVersion, actions, claimedScore, claimedLevel }) {
  const engine = new HeadlessEngine({ seed, rulesVersion });
  if (Array.isArray(actions)) {
    for (let i = 0; i < actions.length; i++) {
      engine.applyAction(actions[i]);
      if (engine.currentTick > 100000) {
        return { valid: false, error: 'Game too long (>100000 ticks)' };
      }
    }
  }

  const finalState = engine.getFinalState(claimedLevel);
  const scoringResult = ScoringSystem.calculateFinalScore(finalState, engine.rules);

  const score = scoringResult.total;
  const level = finalState.wave;

  const valid = typeof claimedScore === 'number' ? score === claimedScore : true;

  return {
    valid,
    score,
    level,
    breakdown: scoringResult.breakdown,
    error: valid ? null : 'Score mismatch'
  };
}

export { HeadlessEngine, verifyReplay };
