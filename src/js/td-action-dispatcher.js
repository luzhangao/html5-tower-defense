/*
 * ActionDispatcher - validates and applies player actions.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	function ActionDispatcher(td) {
		this.td = td;
		this.lastActionTick = 0;
	}

	ActionDispatcher.prototype.dispatch = function (action, isReplay) {
		var td = this.td;
		if (!isReplay && td.recorder && td.recorder.result) {
			throw new Error("Game is over");
		}
		if (!action || typeof action.t !== "number") {
			throw new Error("Invalid action: missing tick");
		}
		if (action.t < this.lastActionTick) {
			throw new Error("Tick must be monotonically increasing");
		}
		if (!isReplay && td.recorder && td.recorder.getActionCount(action.t) >= 2) {
			throw new Error("Too many actions in single tick");
		}

		if (!isReplay && TD.core_mode && window.CoreRunner && window.CoreRunner.getRunner) {
			var runner = window.CoreRunner.getRunner();
			if (runner && runner.engine) {
				var coreAction = TD.lang.mix({}, action, true);
				var beforeIds = Object.keys(runner.engine.state.entities || {});
				var coreTick = runner.engine.state ? runner.engine.state.tick : 0;
				if (typeof coreAction.t === "number" && coreAction.t > coreTick && runner.engine.runToTick) {
					runner.engine.runToTick(coreAction.t);
					coreTick = runner.engine.state ? runner.engine.state.tick : coreTick;
				}
				if (runner.engine.state && runner.engine.state.isGameOver) {
					throw new Error("Game is over");
				}
				try {
					runner.engine.applyAction(coreAction);
				} catch (coreError) {
					throw coreError;
				}

				this.lastActionTick = action.t;

				if (td.recorder) {
					var recordedCore = TD.lang.mix({}, coreAction, true);
					var afterIds = Object.keys(runner.engine.state.entities || {});
					if (!recordedCore.entityId && coreAction.op === "place") {
						for (var idx = 0; idx < afterIds.length; idx++) {
							if (beforeIds.indexOf(afterIds[idx]) === -1) {
								recordedCore.entityId = afterIds[idx];
								break;
							}
						}
					}
					td.recorder.record(recordedCore);
				}

				if (TD.coreSync && TD.coreSync.sync) {
					TD.coreSync.sync();
				}

				return { entityId: coreAction.entityId || null };
			}
		}

		switch (action.op) {
			case "place":
				this.validatePlace(action, isReplay);
				break;
			case "upgrade":
				this.validateUpgrade(action);
				break;
			case "sell":
				this.validateSell(action);
				break;
			default:
				throw new Error("Unknown action: " + action.op);
		}

		var result = this.execute(action, isReplay);
		this.lastActionTick = action.t;

		var recorded = null;
		if (!isReplay && td.recorder) {
			recorded = TD.lang.mix({}, action, true);
			if (result && result.entityId) {
				recorded.entityId = result.entityId;
			}
			td.recorder.record(recorded);
		}

		if (!isReplay && window.CoreRunner && window.CoreRunner.getRunner) {
			var runner = window.CoreRunner.getRunner();
			if (runner && runner.engine) {
				var coreAction = TD.lang.mix({}, recorded || action, true);
				if (result && result.entityId) {
					coreAction.entityId = result.entityId;
				}
				var coreTick = runner.engine.state ? runner.engine.state.tick : 0;
				if (typeof coreAction.t === "number" && coreAction.t <= coreTick) {
					runner.engine.applyAction(coreAction);
				} else {
					runner.queueAction(coreAction);
				}
			}
		}

		return result;
	};

	ActionDispatcher.prototype.validatePlace = function (action, isReplay) {
		var td = this.td;
		var scene = td.stage && td.stage.current_act && td.stage.current_act.current_scene;
		if (!scene || scene.state !== 1) {
			throw new Error("Game is not running");
		}
		var map = scene.map;
		if (!map || !map.is_main_map) {
			throw new Error("Invalid map for placement");
		}
		if (!action.entityType || !action.pos || action.pos.length !== 2) {
			throw new Error("Invalid place action");
		}
		if (!isReplay && action.entityId) {
			throw new Error("Client cannot provide entityId for place");
		}
		if (isReplay && !action.entityId) {
			throw new Error("Replay action missing entityId");
		}

		var grid = map.getGrid(action.pos[0], action.pos[1]);
		if (!grid) throw new Error("Invalid grid position");
		if (grid.build_flag !== 1 || grid.building) {
			throw new Error("Grid not buildable");
		}
		if (grid.checkBlock()) {
			throw new Error(grid._block_msg || "Blocked");
		}

		var cost = TD.getDefaultBuildingAttributes(action.entityType).cost || 0;
		if (td.money < cost) {
			throw new Error("Not enough money");
		}
	};

	ActionDispatcher.prototype.validateUpgrade = function (action) {
		var td = this.td;
		if (!action.entityId) throw new Error("Missing entityId");
		var entity = td.entityManager.assertActive(action.entityId);
		var building = entity.data.building;
		if (!building || !building.is_valid) {
			throw new Error("Invalid building");
		}
		var cost = building.getUpgradeCost();
		if (td.money < cost) {
			throw new Error("Not enough money");
		}
	};

	ActionDispatcher.prototype.validateSell = function (action) {
		if (!action.entityId) throw new Error("Missing entityId");
		var entity = this.td.entityManager.assertActive(action.entityId);
		if (!entity.data.building || !entity.data.building.is_valid) {
			throw new Error("Invalid building");
		}
	};

	ActionDispatcher.prototype.execute = function (action, isReplay) {
		switch (action.op) {
			case "place":
				return this.executePlace(action, isReplay);
			case "upgrade":
				return this.executeUpgrade(action);
			case "sell":
				return this.executeSell(action);
		}
		return null;
	};

	ActionDispatcher.prototype.executePlace = function (action, isReplay) {
		var td = this.td;
		var map = td.stage.current_act.current_scene.map;
		var grid = map.getGrid(action.pos[0], action.pos[1]);
		var cost = TD.getDefaultBuildingAttributes(action.entityType).cost || 0;

		var currentTick = td.getCurrentTick();
		var forcedId = isReplay ? action.entityId : null;
		var entityId = td.entityManager.create(
			action.entityType,
			action.pos,
			{},
			forcedId,
			currentTick
		);

		td.money -= cost;
		var building = grid.addBuilding(action.entityType, entityId);
		var entity = td.entityManager.get(entityId);
		entity.data.building = building;

		return { entityId: entityId };
	};

	ActionDispatcher.prototype.executeUpgrade = function (action) {
		var td = this.td;
		var entity = td.entityManager.assertActive(action.entityId);
		var building = entity.data.building;
		var cost = building.getUpgradeCost();
		td.money -= cost;
		building.money += cost;
		building.upgrade();
		building.updateBtnDesc();
		return { entityId: action.entityId };
	};

	ActionDispatcher.prototype.executeSell = function (action) {
		var td = this.td;
		var entity = td.entityManager.assertActive(action.entityId);
		var building = entity.data.building;
		td.money += building.getSellMoney();
		building.grid.removeBuilding();
		building.is_valid = false;
		building.map.selected_building = null;
		building.map.select_hl.hide();
		building.map.checkHasWeapon();
		if (building.scene.panel) {
			building.scene.panel.btn_upgrade.hide();
			building.scene.panel.btn_sell.hide();
			building.scene.panel.balloontip.hide();
		}
		td.entityManager.remove(action.entityId, td.getCurrentTick());
		return { entityId: action.entityId };
	};

	TD.ActionDispatcher = ActionDispatcher;
}); // _TD.a.push end
