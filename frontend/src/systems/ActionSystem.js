/**
 * ActionDispatcher - validates and applies player actions.
 *
 * Expects a context with: stage, mode, money, getCurrentTick(), entityManager,
 * recorder, and TD helpers for building lookup.
 */
class ActionDispatcher {
  constructor(context) {
    this.context = context;
    this.lastActionTick = 0;
  }

  dispatch(action, isReplay = false) {
    // 统一入口：校验 -> 执行 -> 记录
    if (!action || typeof action.t !== 'number') {
      throw new Error('Invalid action: missing tick');
    }
    if (action.t < this.lastActionTick) {
      throw new Error('Tick must be monotonically increasing');
    }
    if (!isReplay && this.context.recorder && this.context.recorder.getActionCount(action.t) >= 2) {
      throw new Error('Too many actions in single tick');
    }

    switch (action.op) {
      case 'place':
        this.validatePlace(action, isReplay);
        break;
      case 'upgrade':
        this.validateUpgrade(action);
        break;
      case 'sell':
        this.validateSell(action);
        break;
      default:
        throw new Error(`Unknown action: ${action.op}`);
    }

    const result = this.execute(action, isReplay);
    this.lastActionTick = action.t;

    if (!isReplay && this.context.recorder) {
      const recorded = { ...action };
      if (result && result.entityId) {
        recorded.entityId = result.entityId;
      }
      this.context.recorder.record(recorded);
    }

    return result;
  }

  validatePlace(action, isReplay) {
    // 放置建筑前检查位置与金币
    const { stage, money } = this.context;
    const scene = stage?.current_act?.current_scene;
    if (!scene || scene.state !== 1) {
      throw new Error('Game is not running');
    }
    const map = scene.map;
    if (!map || !map.is_main_map) {
      throw new Error('Invalid map for placement');
    }
    if (!action.entityType || !action.pos || action.pos.length !== 2) {
      throw new Error('Invalid place action');
    }
    if (!isReplay && action.entityId) {
      throw new Error('Client cannot provide entityId for place');
    }
    if (isReplay && !action.entityId) {
      throw new Error('Replay action missing entityId');
    }

    const grid = map.getGrid(action.pos[0], action.pos[1]);
    if (!grid) throw new Error('Invalid grid position');
    if (grid.build_flag !== 1 || grid.building) {
      throw new Error('Grid not buildable');
    }
    if (grid.checkBlock()) {
      throw new Error(grid._block_msg || 'Blocked');
    }

    const cost = this.context.getDefaultBuildingAttributes(action.entityType).cost || 0;
    if (money < cost) {
      throw new Error('Not enough money');
    }
  }

  validateUpgrade(action) {
    if (!action.entityId) throw new Error('Missing entityId');
    const entity = this.context.entityManager.assertActive(action.entityId);
    const building = entity.data.building;
    if (!building || !building.is_valid) {
      throw new Error('Invalid building');
    }
    const cost = building.getUpgradeCost();
    if (this.context.money < cost) {
      throw new Error('Not enough money');
    }
  }

  validateSell(action) {
    if (!action.entityId) throw new Error('Missing entityId');
    const entity = this.context.entityManager.assertActive(action.entityId);
    if (!entity.data.building || !entity.data.building.is_valid) {
      throw new Error('Invalid building');
    }
  }

  execute(action, isReplay) {
    // 根据 op 执行具体逻辑
    switch (action.op) {
      case 'place':
        return this.executePlace(action, isReplay);
      case 'upgrade':
        return this.executeUpgrade(action);
      case 'sell':
        return this.executeSell(action);
      default:
        return null;
    }
  }

  executePlace(action, isReplay) {
    const scene = this.context.stage.current_act.current_scene;
    const map = scene.map;
    const grid = map.getGrid(action.pos[0], action.pos[1]);
    const cost = this.context.getDefaultBuildingAttributes(action.entityType).cost || 0;
    const currentTick = this.context.getCurrentTick();
    const forcedId = isReplay ? action.entityId : null;

    const entityId = this.context.entityManager.create(
      action.entityType,
      action.pos,
      {},
      forcedId,
      currentTick
    );

    this.context.money -= cost;
    const building = grid.addBuilding(action.entityType, entityId);
    const entity = this.context.entityManager.get(entityId);
    entity.data.building = building;

    return { entityId };
  }

  executeUpgrade(action) {
    const entity = this.context.entityManager.assertActive(action.entityId);
    const building = entity.data.building;
    const cost = building.getUpgradeCost();
    this.context.money -= cost;
    building.money += cost;
    building.upgrade();
    building.updateBtnDesc();
    return { entityId: action.entityId };
  }

  executeSell(action) {
    const entity = this.context.entityManager.assertActive(action.entityId);
    const building = entity.data.building;
    this.context.money += building.getSellMoney();
    building.grid.removeBuilding();
    building.is_valid = false;
    building.map.selected_building = null;
    building.map.select_hl.hide();
    building.map.checkHasWeapon();
    building.scene.panel.btn_upgrade.hide();
    building.scene.panel.btn_sell.hide();
    building.scene.panel.balloontip.hide();
    this.context.entityManager.remove(action.entityId, this.context.getCurrentTick());
    return { entityId: action.entityId };
  }
}

export { ActionDispatcher };
export default ActionDispatcher;
