/*
 * EntityManager - manages entity IDs and lifecycle.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	var EntityState = {
		NON_EXISTENT: "NON_EXISTENT",
		ACTIVE: "ACTIVE",
		REMOVED: "REMOVED"
	};

	function EntityManager() {
		this.entities = {};
		this.nextEntityId = 1;
	}

	EntityManager.prototype.reset = function () {
		this.entities = {};
		this.nextEntityId = 1;
	};

	EntityManager.prototype._allocateId = function () {
		return "E" + (this.nextEntityId++);
	};

	EntityManager.prototype._ensureIdAvailable = function (entityId) {
		if (this.entities[entityId]) {
			throw new Error("Entity ID already exists: " + entityId);
		}
		if (entityId.charAt(0) === "E") {
			var parsed = parseInt(entityId.slice(1), 10);
			if (!isNaN(parsed) && parsed >= this.nextEntityId) {
				this.nextEntityId = parsed + 1;
			}
		}
	};

	EntityManager.prototype.create = function (type, gridPos, data, forcedId, currentTick) {
		var entityId = forcedId || this._allocateId();
		this._ensureIdAvailable(entityId);
		this.entities[entityId] = {
			id: entityId,
			state: EntityState.ACTIVE,
			type: type,
			gridPos: gridPos,
			data: data || {},
			createdAtTick: currentTick || 0,
			removedAtTick: null
		};
		return entityId;
	};

	EntityManager.prototype.get = function (entityId) {
		return this.entities[entityId] || null;
	};

	EntityManager.prototype.assertActive = function (entityId) {
		var entity = this.get(entityId);
		if (!entity || entity.state !== EntityState.ACTIVE) {
			throw new Error("Entity not active: " + entityId);
		}
		return entity;
	};

	EntityManager.prototype.remove = function (entityId, currentTick) {
		var entity = this.get(entityId);
		if (!entity) {
			throw new Error("Entity does not exist: " + entityId);
		}
		entity.state = EntityState.REMOVED;
		entity.removedAtTick = currentTick || 0;
	};

	TD.EntityManager = EntityManager;
	TD.EntityState = EntityState;
}); // _TD.a.push end
