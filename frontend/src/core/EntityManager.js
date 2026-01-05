/**
 * EntityManager - manages entity IDs and lifecycle.
 */
const EntityState = {
  NON_EXISTENT: 'NON_EXISTENT',
  ACTIVE: 'ACTIVE',
  REMOVED: 'REMOVED'
};

class EntityManager {
  constructor() {
    this.entities = new Map();
    this.nextEntityId = 1;
  }

  reset() {
    this.entities.clear();
    this.nextEntityId = 1;
  }

  _allocateId() {
    return `E${this.nextEntityId++}`;
  }

  _ensureIdAvailable(entityId) {
    if (this.entities.has(entityId)) {
      throw new Error(`Entity ID already exists: ${entityId}`);
    }
    if (entityId.startsWith('E')) {
      const parsed = Number.parseInt(entityId.slice(1), 10);
      if (!Number.isNaN(parsed) && parsed >= this.nextEntityId) {
        this.nextEntityId = parsed + 1;
      }
    }
  }

  create(type, gridPos, data = {}, forcedId = null, currentTick = 0) {
    const entityId = forcedId || this._allocateId();
    this._ensureIdAvailable(entityId);
    this.entities.set(entityId, {
      id: entityId,
      state: EntityState.ACTIVE,
      type,
      gridPos,
      data,
      createdAtTick: currentTick,
      removedAtTick: null
    });
    return entityId;
  }

  get(entityId) {
    return this.entities.get(entityId) || null;
  }

  assertActive(entityId) {
    const entity = this.get(entityId);
    if (!entity || entity.state !== EntityState.ACTIVE) {
      throw new Error(`Entity not active: ${entityId}`);
    }
    return entity;
  }

  remove(entityId, currentTick = 0) {
    const entity = this.get(entityId);
    if (!entity) {
      throw new Error(`Entity does not exist: ${entityId}`);
    }
    entity.state = EntityState.REMOVED;
    entity.removedAtTick = currentTick;
  }
}

export { EntityManager, EntityState };
export default EntityManager;
