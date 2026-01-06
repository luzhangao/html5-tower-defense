/**
 * Deterministic core state scaffold.
 */
function createInitialState({ rulesVersion } = {}) {
  return {
    rulesVersion: rulesVersion || '1.0.0',
    tick: 0,
    wave: 0,
    score: 0,
    money: 1000,
    life: 100,
    missedMonsters: 0,
    waveDamage: 0,
    difficulty: 1.0,
    isGameOver: false,
    hasWeapon: false,
    buildingPower: 0,
    monsters: [],
    buildingOrder: [],
    entities: {},
    nextEntityId: 1
  };
}

export { createInitialState };
