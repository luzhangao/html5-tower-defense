const { ActionDispatcher } = require('../../src/systems/ActionSystem');

function createContext(overrides = {}) {
  const building = {
    is_valid: true,
    money: 0,
    getUpgradeCost: jest.fn(() => 10),
    getSellMoney: jest.fn(() => 5),
    upgrade: jest.fn(),
    updateBtnDesc: jest.fn(),
    grid: { removeBuilding: jest.fn() },
    map: { selected_building: null, select_hl: { hide: jest.fn() }, checkHasWeapon: jest.fn() },
    scene: { panel: { btn_upgrade: { hide: jest.fn() }, btn_sell: { hide: jest.fn() }, balloontip: { hide: jest.fn() } } }
  };

  const grid = {
    build_flag: 1,
    building: null,
    checkBlock: jest.fn(() => false),
    addBuilding: jest.fn(() => building)
  };

  const map = {
    is_main_map: true,
    getGrid: jest.fn(() => grid)
  };

  const scene = { state: 1, map };
  const stage = { current_act: { current_scene: scene } };

  const entity = { data: { building } };
  const entityManager = {
    create: jest.fn(() => 'E1'),
    get: jest.fn(() => ({ data: {} })),
    assertActive: jest.fn(() => entity),
    remove: jest.fn()
  };

  const recorder = { getActionCount: jest.fn(() => 0), record: jest.fn() };

  const context = {
    stage,
    money: 100,
    getCurrentTick: () => 10,
    entityManager,
    recorder,
    getDefaultBuildingAttributes: () => ({ cost: 10 })
  };

  return { ...context, ...overrides };
}

describe('ActionDispatcher', () => {
  test('places building and records action', () => {
    const context = createContext();
    const dispatcher = new ActionDispatcher(context);
    const result = dispatcher.dispatch({ t: 10, op: 'place', entityType: 'cannon', pos: [1, 1] });
    expect(result.entityId).toBe('E1');
    expect(context.money).toBe(90);
    expect(context.recorder.record).toHaveBeenCalled();
  });

  test('rejects upgrade when money is insufficient', () => {
    const context = createContext({ money: 5 });
    const dispatcher = new ActionDispatcher(context);
    expect(() => dispatcher.dispatch({ t: 11, op: 'upgrade', entityId: 'E1' }))
      .toThrow('Not enough money');
  });
});
