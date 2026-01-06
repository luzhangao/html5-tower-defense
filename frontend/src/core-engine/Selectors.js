function getEntity(state, entityId) {
  if (!state || !state.entities) return null;
  return state.entities[entityId] || null;
}

function getUpgradeInfo(state, entityId) {
  const entity = getEntity(state, entityId);
  if (!entity) return null;
  return {
    upgradeCost: entity.upgradeCost,
    nextLevel: entity.level + 1
  };
}

function getSellInfo(state, entityId) {
  const entity = getEntity(state, entityId);
  if (!entity) return null;
  return {
    sellMoney: entity.sellMoney
  };
}

export { getEntity, getUpgradeInfo, getSellInfo };
