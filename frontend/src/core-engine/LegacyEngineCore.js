import TickClock from '../core/TickClock';
import { RandomGenerator } from '../core/RandomGenerator';
import { createInitialState } from './State';
import { getRules, RULES_VERSION } from './Rules';
import { calculateFinalScore } from './Scoring';
import { WAVE_CONFIG } from './Waves';

const GRID_SIZE = 32;
const PADDING = 10;

const STAGE_MAIN_CONFIG = {
  map: {
    grid_x: 16,
    grid_y: 16,
    x: PADDING,
    y: PADDING,
    entrance: [0, 0],
    exit: [15, 15],
    grids_cfg: [
      { pos: [3, 3], passable_flag: 0 },
      { pos: [7, 15], build_flag: 0 },
      { pos: [4, 12], building: 'wall' },
      { pos: [4, 13], building: 'wall' }
    ]
  },
  config: {
    endless: true,
    wait_new_wave: WAVE_CONFIG.waitNewWaveTicks,
    difficulty: 1.0,
    wave: 0,
    max_wave: -1,
    wave_damage: 0,
    max_monsters_per_wave: 100,
    money: 500,
    score: 0,
    life: 100,
    waves: WAVE_CONFIG.waves
  }
};

function rndSort(list, random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random.next() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function rndRGB(random) {
  const r = Math.floor(random.next() * 256);
  const g = Math.floor(random.next() * 256);
  const b = Math.floor(random.next() * 256);
  const toHex = (v) => (v.toString(16).length === 2 ? v.toString(16) : `0${v.toString(16)}`);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

class FindWay {
  constructor(w, h, x1, y1, x2, y2, fPassable, random) {
    this.m = [];
    this.w = w;
    this.h = h;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.way = [];
    this.len = this.w * this.h;
    this.is_blocked = false;
    this.is_arrived = false;
    this.fPassable = typeof fPassable === 'function' ? fPassable : () => true;
    this.random = random;
    this._init();
  }

  _init() {
    if (this.x1 === this.x2 && this.y1 === this.y2) {
      this.is_arrived = true;
      this.way = [[this.x1, this.y1]];
      return;
    }
    for (let i = 0; i < this.len; i += 1) {
      this.m[i] = -2;
    }
    this.x = this.x1;
    this.y = this.y1;
    this.distance = 0;
    this.current = [[this.x, this.y]];
    this.setVal(this.x, this.y, 0);
    while (this.next()) {
      // iterate
    }
  }

  getVal(x, y) {
    const p = y * this.w + x;
    return p < this.len ? this.m[p] : -1;
  }

  setVal(x, y, v) {
    const p = y * this.w + x;
    if (p > this.len) return false;
    this.m[p] = v;
    return true;
  }

  getNeighborsOf(x, y) {
    const nbs = [];
    if (y > 0) nbs.push([x, y - 1]);
    if (x < this.w - 1) nbs.push([x + 1, y]);
    if (y < this.h - 1) nbs.push([x, y + 1]);
    if (x > 0) nbs.push([x - 1, y]);
    return nbs;
  }

  getAllNeighbors() {
    let nbs = [];
    for (let i = 0; i < this.current.length; i += 1) {
      nbs = nbs.concat(this.getNeighborsOf(this.current[i][0], this.current[i][1]));
    }
    return nbs;
  }

  findWay() {
    let x = this.x2;
    let y = this.y2;
    const maxLen = this.len;
    let minV = -1;
    while ((x !== this.x1 || y !== this.y1) && minV !== 0 && this.way.length < maxLen) {
      this.way.unshift([x, y]);
      const nbs = this.getNeighborsOf(x, y);
      let closest = [];
      minV = -1;
      for (let i = 0; i < nbs.length; i += 1) {
        const v = this.getVal(nbs[i][0], nbs[i][1]);
        if (v < 0) continue;
        if (minV < 0 || minV > v) minV = v;
      }
      for (let i = 0; i < nbs.length; i += 1) {
        const nb = nbs[i];
        if (minV === this.getVal(nb[0], nb[1])) {
          closest.push(nb);
        }
      }
      const l = closest.length;
      const idx = l > 1 ? Math.floor(this.random.next() * l) : 0;
      const nb = closest[idx];
      x = nb[0];
      y = nb[1];
    }
  }

  arrive() {
    this.current = [];
    this.is_arrived = true;
    this.findWay();
  }

  blocked() {
    this.current = [];
    this.is_blocked = true;
  }

  next() {
    const neighbors = this.getAllNeighbors();
    const validNeighbors = [];
    this.distance += 1;
    for (let i = 0; i < neighbors.length; i += 1) {
      const nb = neighbors[i];
      const x = nb[0];
      const y = nb[1];
      if (this.getVal(x, y) !== -2) continue;
      let v;
      if (this.fPassable(x, y)) {
        v = this.distance;
        validNeighbors.push(nb);
      } else {
        v = -1;
      }
      this.setVal(x, y, v);
      if (x === this.x2 && y === this.y2) {
        this.arrive();
        return false;
      }
    }
    if (validNeighbors.length === 0) {
      this.blocked();
      return false;
    }
    this.current = validNeighbors;
    return true;
  }
}

class GridCore {
  constructor(map, cfg) {
    this.map = map;
    this.mx = cfg.mx;
    this.my = cfg.my;
    this.passable_flag = 1;
    this.build_flag = 1;
    this.building = null;
    this.is_entrance = false;
    this.is_exit = false;
    this.caculatePos();
  }

  caculatePos() {
    this.x = this.map.x + this.mx * GRID_SIZE;
    this.y = this.map.y + this.my * GRID_SIZE;
    this.x2 = this.x + GRID_SIZE;
    this.y2 = this.y + GRID_SIZE;
    this.cx = Math.floor(this.x + GRID_SIZE / 2);
    this.cy = Math.floor(this.y + GRID_SIZE / 2);
  }

  checkBlock() {
    if (!this.map.is_main_map || !this.map.entrance || !this.map.exit) return false;
    if (this.is_entrance || this.is_exit) return true;
    const fw = new FindWay(
      this.map.grid_x,
      this.map.grid_y,
      this.map.entrance.mx,
      this.map.entrance.my,
      this.map.exit.mx,
      this.map.exit.my,
      (x, y) => !(x === this.mx && y === this.my) && this.map.checkPassable(x, y),
      this.map.engine.random
    );
    let isBlocked = fw.is_blocked;
    if (!isBlocked) {
      isBlocked = !!this.map.anyMonster((obj) => obj.chkIfBlocked(this.mx, this.my));
    }
    return isBlocked;
  }

  addBuilding(buildingType, entityId, free) {
    if (this.building) this.removeBuilding();
    const building = new BuildingCore(this.map.engine, {
      type: buildingType,
      entityId,
      map: this.map,
      grid: this,
      step_level: this.map.step_level
    });
    building.locate(this);
    this.map.buildings.push(building);
    this.map.engine._addElement(building);
    this.building = building;
    this.build_flag = 2;
    if (!free) {
      this.map.engine.state.money -= building.cost || 0;
    }
    this.map.checkHasWeapon();
    return building;
  }

  removeBuilding() {
    if (this.build_flag === 2) this.build_flag = 1;
    if (this.building) {
      this.building.remove();
    }
    this.building = null;
    this.map.checkHasWeapon();
  }

  addMonster(monster) {
    monster.beAddToGrid(this);
    if (monster.step_level === undefined) {
      monster.step_level = this.map.step_level;
    }
    this.map.monsters.push(monster);
    this.map.engine._addElement(monster);
  }
}

class MapCore {
  constructor(engine, cfg) {
    this.engine = engine;
    this.is_valid = true;
    this.is_paused = false;
    this.step_level = cfg.step_level || 1;
    this.grid_x = cfg.grid_x || 10;
    this.grid_y = cfg.grid_y || 10;
    this.x = cfg.x || 0;
    this.y = cfg.y || 0;
    this.width = this.grid_x * GRID_SIZE;
    this.height = this.grid_y * GRID_SIZE;
    this.x2 = this.x + this.width;
    this.y2 = this.y + this.height;
    this.grids = [];
    this.entrance = null;
    this.exit = null;
    this.buildings = [];
    this.monsters = [];
    this.bullets = [];
    this.is_main_map = !!cfg.is_main_map;
    this._wait_clearInvalidElements = 20;
    this._wait_add_monsters = 0;
    this._wait_add_monsters_arr = [];
    for (let i = 0; i < this.grid_x * this.grid_y; i += 1) {
      const d = { mx: i % this.grid_x, my: Math.floor(i / this.grid_x) };
      const grid = new GridCore(this, d);
      this.grids.push(grid);
    }
    if (cfg.entrance && cfg.exit && (cfg.entrance[0] !== cfg.exit[0] || cfg.entrance[1] !== cfg.exit[1])) {
      this.entrance = this.getGrid(cfg.entrance[0], cfg.entrance[1]);
      this.entrance.is_entrance = true;
      this.exit = this.getGrid(cfg.exit[0], cfg.exit[1]);
      this.exit.is_exit = true;
    }
    if (cfg.grids_cfg) {
      cfg.grids_cfg.forEach((obj) => {
        const grid = this.getGrid(obj.pos[0], obj.pos[1]);
        if (!grid) return;
        if (!Number.isNaN(obj.passable_flag)) grid.passable_flag = obj.passable_flag;
        if (!Number.isNaN(obj.build_flag)) grid.build_flag = obj.build_flag;
        if (obj.building) {
          grid.addBuilding(obj.building, null, true);
        }
      });
    }
    this.checkHasWeapon();
  }

  checkHasWeapon() {
    this.has_weapon = this.anyBuilding((obj) => obj.is_weapon) != null;
  }

  getGrid(mx, my) {
    return this.grids[my * this.grid_x + mx];
  }

  checkPassable(mx, my) {
    const grid = this.getGrid(mx, my);
    return grid != null && grid.passable_flag === 1 && grid.build_flag !== 2;
  }

  anyMonster(f) {
    for (let i = 0; i < this.monsters.length; i += 1) {
      if (f(this.monsters[i])) return this.monsters[i];
    }
    return null;
  }

  anyBuilding(f) {
    for (let i = 0; i < this.buildings.length; i += 1) {
      if (f(this.buildings[i])) return this.buildings[i];
    }
    return null;
  }

  anyBullet(f) {
    for (let i = 0; i < this.bullets.length; i += 1) {
      if (f(this.bullets[i])) return this.bullets[i];
    }
    return null;
  }

  clearInvalidElements() {
    if (this._wait_clearInvalidElements > 0) {
      this._wait_clearInvalidElements -= 1;
      return;
    }
    this._wait_clearInvalidElements = 20;
    this.buildings = this.buildings.filter((obj) => obj.is_valid);
    this.monsters = this.monsters.filter((obj) => obj.is_valid);
    this.bullets = this.bullets.filter((obj) => obj.is_valid);
  }

  addMonster(monster) {
    if (!this.entrance) return;
    if (typeof monster === 'number') {
      monster = new MonsterCore(this.engine, {
        idx: monster,
        difficulty: this.engine.state.difficulty,
        step_level: this.step_level
      });
    }
    this.entrance.addMonster(monster);
  }

  addMonsters(n, monster) {
    this._wait_add_monsters = n;
    this._wait_add_monsters_objidx = monster;
  }

  addMonsters2(arr) {
    this._wait_add_monsters_arr = arr.slice();
  }

  step() {
    this.clearInvalidElements();
    if (this._wait_add_monsters > 0) {
      this.addMonster(this._wait_add_monsters_objidx);
      this._wait_add_monsters -= 1;
    } else if (this._wait_add_monsters_arr.length > 0) {
      const a = this._wait_add_monsters_arr.shift();
      this.addMonsters(a[0], a[1]);
    }
  }
}

class MonsterCore {
  constructor(engine, cfg) {
    this.engine = engine;
    this.is_valid = true;
    this.is_paused = false;
    this.step_level = cfg.step_level || 1;
    this.idx = cfg.idx || 1;
    this.difficulty = cfg.difficulty || 1.0;
    const attr = this.engine.getDefaultMonsterAttributes(this.idx);
    this.speed = Math.floor((attr.speed + this.difficulty / 2) * (this.engine.random.next() * 0.5 + 0.75));
    if (this.speed < 1) this.speed = 1;
    if (cfg.max_speed && this.speed > cfg.max_speed) this.speed = cfg.max_speed;
    this.life = this.life0 = Math.floor(attr.life * (this.difficulty + 1) * (this.engine.random.next() + 0.5) * 0.5);
    if (this.life < 1) this.life = this.life0 = 1;
    this.shield = Math.floor(attr.shield + this.difficulty / 2);
    if (this.shield < 0) this.shield = 0;
    this.damage = Math.floor((attr.damage || 1) * (this.engine.random.next() * 0.5 + 0.75));
    if (this.damage < 1) this.damage = 1;
    this.money = attr.money || Math.floor(Math.sqrt((this.speed + this.life) * (this.shield + 1) * this.damage));
    if (this.money < 1) this.money = 1;
    this.color = attr.color || rndRGB(this.engine.random);
    this.r = Math.floor(this.damage * 1.2);
    if (this.r < 4) this.r = 4;
    if (this.r > GRID_SIZE / 2 - 4) this.r = GRID_SIZE / 2 - 4;
    this.grid = null;
    this.map = null;
    this.next_grid = null;
    this.way = [];
    this.toward = 2;
    this._dx = 0;
    this._dy = 0;
    this.is_blocked = false;
  }

  beHit(building, damage) {
    if (!this.is_valid) return;
    const minDamage = Math.ceil(damage * 0.1);
    damage -= this.shield;
    if (damage <= minDamage) damage = minDamage;
    this.life -= damage;
    this.engine.state.score += Math.floor(Math.sqrt(damage));
    if (this.life <= 0) {
      this.beKilled(building);
    }
  }

  beKilled(building) {
    if (!this.is_valid) return;
    this.life = 0;
    this.is_valid = false;
    this.engine.state.money += this.money;
    if (building) building.killed += 1;
    if (this.engine.debug && typeof console !== 'undefined' && console.log) {
      console.log('[core] monster killed', {
        tick: this.engine.state.tick,
        typeIndex: this.idx,
        money: this.money,
        by: building ? building.entityId : null
      });
    }
  }

  arrive() {
    this.grid = this.next_grid;
    this.next_grid = null;
    this.checkFinish();
  }

  findWay() {
    const fw = new FindWay(
      this.map.grid_x,
      this.map.grid_y,
      this.grid.mx,
      this.grid.my,
      this.map.exit.mx,
      this.map.exit.my,
      (x, y) => this.map.checkPassable(x, y),
      this.engine.random
    );
    this.way = fw.way;
  }

  checkFinish() {
    if (this.grid && this.map && this.grid === this.map.exit) {
      this.engine.state.life -= this.damage;
      this.engine.state.waveDamage += this.damage;
      this.engine.state.missedMonsters += 1;
      if (this.engine.debug && typeof console !== 'undefined' && console.log) {
        console.log('[core] monster escaped', {
          tick: this.engine.state.tick,
          typeIndex: this.idx,
          damage: this.damage,
          money: this.money
        });
      }
      if (this.engine.state.life <= 0) {
        this.engine.state.life = 0;
        this.engine.state.isGameOver = true;
      } else {
        this.pause();
        this.del();
      }
    }
  }

  beAddToGrid(grid) {
    this.grid = grid;
    this.map = grid.map;
    this.cx = grid.cx;
    this.cy = grid.cy;
  }

  getNextGrid() {
    if (this.way.length === 0 || this.engine.random.next() < 0.1) {
      this.findWay();
    }
    let next = this.way.shift();
    if (next && !this.map.checkPassable(next[0], next[1])) {
      this.findWay();
      next = this.way.shift();
    }
    if (!next) return;
    this.next_grid = this.map.getGrid(next[0], next[1]);
  }

  chkIfBlocked(mx, my) {
    const fw = new FindWay(
      this.map.grid_x,
      this.map.grid_y,
      this.grid.mx,
      this.grid.my,
      this.map.exit.mx,
      this.map.exit.my,
      (x, y) => !(x === mx && y === my) && this.map.checkPassable(x, y),
      this.engine.random
    );
    return fw.is_blocked;
  }

  beBlocked() {
    this.is_blocked = true;
  }

  pause() {
    this.is_paused = true;
  }

  del() {
    this.is_valid = false;
  }

  step() {
    if (!this.is_valid || this.is_paused || !this.grid) return;
    if (!this.next_grid) {
      this.getNextGrid();
      if (!this.next_grid) {
        this.beBlocked();
        return;
      }
    }
    if (this.cx === this.next_grid.cx && this.cy === this.next_grid.cy) {
      this.arrive();
    } else {
      const dpx = this.next_grid.cx - this.cx;
      const dpy = this.next_grid.cy - this.cy;
      const sx = dpx < 0 ? -1 : 1;
      const sy = dpy < 0 ? -1 : 1;
      const speed = this.speed * this.engine.globalSpeed;
      if (Math.abs(dpx) < speed && Math.abs(dpy) < speed) {
        this.cx = this.next_grid.cx;
        this.cy = this.next_grid.cy;
        this._dx = speed - Math.abs(dpx);
        this._dy = speed - Math.abs(dpy);
      } else {
        this.cx += dpx === 0 ? 0 : sx * (speed + this._dx);
        this.cy += dpy === 0 ? 0 : sy * (speed + this._dy);
        this._dx = 0;
        this._dy = 0;
      }
    }
  }
}

class BuildingCore {
  constructor(engine, cfg) {
    this.engine = engine;
    this.is_valid = true;
    this.is_paused = false;
    this.step_level = cfg.step_level || 1;
    this.is_selected = false;
    this.level = 0;
    this.killed = 0;
    this.target = null;
    this.entityId = cfg.entityId || null;
    this.map = cfg.map || null;
    this.grid = cfg.grid || null;
    this.bullet_type = cfg.bullet_type || 1;
    this.type = cfg.type;
    this.speed = cfg.speed;
    this.bullet_speed = cfg.bullet_speed;
    this.is_pre_building = !!cfg.is_pre_building;
    this.blink = this.is_pre_building;
    this.wait_blink = 20;
    this.is_weapon = this.type !== 'wall';
    const o = this.engine.getDefaultBuildingAttributes(this.type);
    Object.assign(this, o);
    this.range_px = this.range * GRID_SIZE;
    this.money = this.cost;
  }

  getUpgradeCost() {
    return Math.floor(this.money * 0.75);
  }

  getSellMoney() {
    return Math.floor(this.money * 0.5) || 1;
  }

  locate(grid) {
    this.grid = grid;
    this.map = grid.map;
    this.cx = grid.cx;
    this.cy = grid.cy;
    this.x = grid.x;
    this.y = grid.y;
    this.x2 = grid.x2;
    this.y2 = grid.y2;
    this.width = GRID_SIZE;
    this.height = GRID_SIZE;
    this._fire_wait = Math.floor(Math.max(2 / (this.speed * this.engine.globalSpeed), 1));
    this._fire_wait2 = this._fire_wait;
  }

  remove() {
    if (this.grid && this.grid.building === this) this.grid.building = null;
    this.del();
  }

  del() {
    this.is_valid = false;
  }

  findTarget() {
    if (!this.is_weapon || this.is_pre_building || !this.grid) return;
    const cx = this.cx;
    const cy = this.cy;
    const range2 = Math.pow(this.range_px, 2);
    if (this.target && this.target.is_valid &&
      Math.pow(this.target.cx - cx, 2) + Math.pow(this.target.cy - cy, 2) <= range2) {
      return;
    }
    this.target = rndSort(this.map.monsters, this.engine.random).find(
      (obj) => Math.pow(obj.cx - cx, 2) + Math.pow(obj.cy - cy, 2) <= range2
    ) || null;
  }

  fire() {
    if (!this.target || !this.target.is_valid) return;
    if (this.type === 'laser_gun') {
      this.target.beHit(this, this.damage);
      return;
    }
    const cx = this.cx;
    const cy = this.cy;
    new BulletCore(this.engine, {
      building: this,
      damage: this.damage,
      target: this.target,
      speed: this.bullet_speed,
      x: cx,
      y: cy
    });
  }

  tryToFire() {
    if (!this.is_weapon || !this.target) return;
    this._fire_wait -= 1;
    if (this._fire_wait > 0) {
      return;
    }
    if (this._fire_wait < 0) {
      this._fire_wait = this._fire_wait2;
    } else {
      this.fire();
    }
  }

  _upgrade2(k) {
    if (!this._upgrade_records) this._upgrade_records = {};
    if (!this._upgrade_records[k]) this._upgrade_records[k] = this[k];
    let v = this._upgrade_records[k];
    const mk = `max_${k}`;
    const uk = `_upgrade_rule_${k}`;
    const uf = this[uk] || this.engine.default_upgrade_rule;
    if (!v || Number.isNaN(v)) return;
    v = uf(this.level, v);
    if (this[mk] && !Number.isNaN(this[mk]) && this[mk] < v) v = this[mk];
    this._upgrade_records[k] = v;
    this[k] = Math.floor(v);
  }

  upgrade() {
    const attrs = ['damage', 'range', 'speed', 'life', 'shield'];
    for (let i = 0; i < attrs.length; i += 1) {
      this._upgrade2(attrs[i]);
    }
    this.level += 1;
    this.range_px = this.range * GRID_SIZE;
  }

  step() {
    this.findTarget();
    this.tryToFire();
  }
}

class BulletCore {
  constructor(engine, cfg) {
    this.engine = engine;
    this.is_valid = true;
    this.is_paused = false;
    this.step_level = cfg.step_level || (cfg.building ? cfg.building.step_level : 1);
    this.speed = cfg.speed;
    this.damage = cfg.damage;
    this.target = cfg.target;
    this.cx = cfg.x;
    this.cy = cfg.y;
    this.r = cfg.r || Math.max(Math.log(this.damage), 2);
    if (this.r < 1) this.r = 1;
    if (this.r > 6) this.r = 6;
    this.building = cfg.building || null;
    this.map = cfg.map || this.building.map;
    this.type = cfg.type || 1;
    this.map.bullets.push(this);
    this.engine._addElement(this);
    if (this.type === 1) {
      this.caculate();
    }
  }

  caculate() {
    const tx = this.target.cx;
    const ty = this.target.cy;
    const sx = tx - this.cx;
    const sy = ty - this.cy;
    const c = Math.sqrt(Math.pow(sx, 2) + Math.pow(sy, 2));
    const speed = 20 * this.speed * this.engine.globalSpeed;
    this.vx = (sx * speed) / c;
    this.vy = (sy * speed) / c;
  }

  checkOutOfMap() {
    this.is_valid = !(
      this.cx < this.map.x ||
      this.cx > this.map.x2 ||
      this.cy < this.map.y ||
      this.cy > this.map.y2
    );
    return !this.is_valid;
  }

  checkHit() {
    const cx = this.cx;
    const cy = this.cy;
    const r = this.r;
    const monster = this.map.anyMonster((obj) =>
      Math.pow(obj.cx - cx, 2) + Math.pow(obj.cy - cy, 2) <= Math.pow(obj.r + r, 2) * 2
    );
    if (monster) {
      monster.beHit(this.building, this.damage);
      this.is_valid = false;
      return true;
    }
    return false;
  }

  step() {
    if (this.checkOutOfMap() || this.checkHit()) return;
    this.cx += this.vx;
    this.cy += this.vy;
  }
}

class LegacyEngineCore {
  // 核心逻辑引擎：在 Node/浏览器中保持确定性
  constructor({ seed, rulesVersion, tickRate, debug } = {}) {
    if (seed === undefined || seed === null) {
      throw new Error('CoreEngine requires seed');
    }
    this.seed = seed;
    this.debug = !!debug;
    this.rulesVersion = rulesVersion || RULES_VERSION;
    this.rules = getRules(this.rulesVersion);
    this.tickClock = new TickClock(tickRate || this.rules.tickRate || 24);
    this.random = new RandomGenerator(seed);
    this.globalSpeed = this.rules.globalSpeed || 0.1;
    this.state = createInitialState({ rulesVersion: this.rulesVersion });
    this.state.money = STAGE_MAIN_CONFIG.config.money;
    this.state.life = STAGE_MAIN_CONFIG.config.life;
    this.state.difficulty = STAGE_MAIN_CONFIG.config.difficulty;
    this.state.wave = STAGE_MAIN_CONFIG.config.wave;
    this.state.waveDamage = STAGE_MAIN_CONFIG.config.wave_damage;
    this.state.score = STAGE_MAIN_CONFIG.config.score;
    this.state.isGameOver = false;
    this.actions = [];
    this.pendingActions = [];
    this.lastActionTick = 0;
    this.waitNewWave = STAGE_MAIN_CONFIG.config.wait_new_wave;
    this._stepLevels = [[], [], []];
    this.map = new MapCore(this, {
      ...STAGE_MAIN_CONFIG.map,
      is_main_map: true,
      step_level: 1
    });
    this._addElement(this.map);
    this._syncStateFromMap();
  }

  _addElement(el) {
    const level = Number.isInteger(el.step_level) ? el.step_level : 1;
    const idx = level >= 0 && level <= 2 ? level : 1;
    this._stepLevels[idx].push(el);
  }

  default_upgrade_rule(oldLevel, oldValue) {
    return oldValue * 1.2;
  }

  getDefaultMonsterAttributes(idx) {
    const list = this.rules.monsters;
    return list[idx] || list[0];
  }

  getDefaultBuildingAttributes(type) {
    return this.rules.buildings[type] || this.rules.buildings.cannon;
  }

  queueAction(action) {
    if (!action || typeof action.t !== 'number') {
      throw new Error('Invalid action: missing tick');
    }
    this.pendingActions.push(action);
  }

  applyAction(action) {
    // 立刻应用 action（不会自动推进 tick）
    if (!action || typeof action.t !== 'number') {
      throw new Error('Invalid action: missing tick');
    }
    if (action.t < this.lastActionTick) {
      throw new Error('Tick must be monotonically increasing');
    }
    this.actions.push(action);
    switch (action.op) {
      case 'place':
        this._applyPlace(action);
        break;
      case 'upgrade':
        this._applyUpgrade(action);
        break;
      case 'sell':
        this._applySell(action);
        break;
      case 'setState':
        this._applySetState(action);
        break;
      default:
        throw new Error(`Unknown action: ${action.op}`);
    }
    this.lastActionTick = action.t;
  }

  _processActionsForTick(tick) {
    // 在指定 tick 执行所有排队的 action
    if (!this.pendingActions.length) return;
    const toApply = [];
    const remaining = [];
    for (let i = 0; i < this.pendingActions.length; i += 1) {
      const action = this.pendingActions[i];
      if (action.t === tick) {
        toApply.push(action);
      } else {
        remaining.push(action);
      }
    }
    this.pendingActions = remaining;
    for (let i = 0; i < toApply.length; i += 1) {
      this.applyAction(toApply[i]);
    }
  }

  _applyPlace(action) {
    const grid = this.map.getGrid(action.pos[0], action.pos[1]);
    if (!grid) throw new Error('Invalid grid position');
    if (grid.build_flag !== 1 || grid.building) throw new Error('Grid not buildable');
    if (grid.checkBlock()) throw new Error('Blocked');
    const attrs = this.getDefaultBuildingAttributes(action.entityType);
    const cost = attrs.cost || 0;
    if (this.state.money < cost) throw new Error('Not enough money');
    let entityId = action.entityId;
    if (!entityId) {
      entityId = `E${this.state.nextEntityId}`;
      this.state.nextEntityId += 1;
    } else {
      const num = parseInt(entityId.slice(1), 10);
      if (!Number.isNaN(num) && num >= this.state.nextEntityId) {
        this.state.nextEntityId = num + 1;
      }
    }
    const building = grid.addBuilding(action.entityType, entityId, false);
    building.entityId = entityId;
    this._syncEntities();
  }

  _applyUpgrade(action) {
    const building = this._findBuildingByEntity(action.entityId);
    if (!building) throw new Error('Entity not found');
    const cost = building.getUpgradeCost();
    if (this.state.money < cost) throw new Error('Not enough money');
    building.upgrade();
    this.state.money -= cost;
    building.money += cost;
    this._syncEntities();
  }

  _applySell(action) {
    const building = this._findBuildingByEntity(action.entityId);
    if (!building) throw new Error('Entity not found');
    const sellMoney = building.getSellMoney();
    building.remove();
    if (building.grid) {
      building.grid.build_flag = 1;
      building.grid.building = null;
    }
    this.map.checkHasWeapon();
    this.state.money += sellMoney;
    this._syncEntities();
  }

  _applySetState(action) {
    const patch = action.state || {};
    if (typeof patch.wave === 'number') this.state.wave = patch.wave;
    if (typeof patch.money === 'number') this.state.money = patch.money;
    if (typeof patch.missedMonsters === 'number') this.state.missedMonsters = patch.missedMonsters;
    if (typeof patch.life === 'number') this.state.life = patch.life;
    if (typeof patch.difficulty === 'number') this.state.difficulty = patch.difficulty;
  }

  _findBuildingByEntity(entityId) {
    return this.map.anyBuilding((b) => b.entityId === entityId);
  }

  _syncEntities() {
    const entities = {};
    const buildingOrder = [];
    this.map.buildings.forEach((b) => {
      if (!b.entityId) return;
      entities[b.entityId] = {
        id: b.entityId,
        type: b.type,
        level: b.level,
        cost: b.cost,
        damage: b.damage,
        speed: b.speed,
        range: b.range,
        maxRange: b.max_range || b.maxRange || b.range,
        pos: b.grid ? [b.grid.mx, b.grid.my] : null,
        life: b.life,
        shield: b.shield,
        killed: b.killed,
        isWeapon: b.is_weapon,
        upgradeRecords: b._upgrade_records || {},
        moneySpent: b.money,
        upgradeCost: b.getUpgradeCost(),
        sellMoney: b.getSellMoney(),
        fireWait: b._fire_wait
      };
      buildingOrder.push(b.entityId);
    });
    this.state.entities = entities;
    this.state.buildingOrder = buildingOrder;
  }

  _syncStateFromMap() {
    this.state.hasWeapon = !!this.map.has_weapon;
    this.state.buildingPower = this.map.buildings.filter((b) => b.is_weapon).length;
    this.state.monsters = this.map.monsters.map((m) => ({
      typeIndex: m.idx,
      life: m.life,
      damage: m.damage,
      money: m.money,
      shield: m.shield,
      life0: m.life0,
      cx: m.cx,
      cy: m.cy,
      speed: m.speed,
      r: m.r,
      color: m.color
    }));
    this._syncEntities();
  }

  _stageStep2() {
    const wave = this.state.wave;
    if ((wave === 0 && !this.map.has_weapon) || this.state.isGameOver) {
      return;
    }
    if (this.map.monsters.length === 0) {
      if (wave > 0 && this.waitNewWave === STAGE_MAIN_CONFIG.config.wait_new_wave - 1) {
        let reward = 0;
        if (wave % 10 === 0) reward = 10;
        else if (wave % 5 === 0) reward = 5;
        if (this.state.life + reward > 100) reward = 100 - this.state.life;
        if (reward > 0) this.state.life += reward;
      }
      if (this.waitNewWave > 0) {
        this.waitNewWave -= 1;
        return;
      }
      this.waitNewWave = STAGE_MAIN_CONFIG.config.wait_new_wave;
      this.state.wave += 1;
      const waveData = STAGE_MAIN_CONFIG.config.waves[this.state.wave] ||
        this.makeMonsters(Math.min(Math.floor(Math.pow(this.state.wave, 1.1)), STAGE_MAIN_CONFIG.config.max_monsters_per_wave));
      this._adjustDifficulty();
      this.map.addMonsters2(waveData);
      this.state.waveDamage = 0;
    }
  }

  _adjustDifficulty() {
    const waveDamage = this.state.waveDamage;
    const wave = this.state.wave;
    if (wave === 1) {
      return;
    }
    if (waveDamage === 0) {
      if (wave < 5) this.state.difficulty *= 1.05;
      else if (this.state.difficulty > 30) this.state.difficulty *= 1.1;
      else this.state.difficulty *= 1.2;
    } else if (waveDamage >= 50) {
      this.state.difficulty *= 0.6;
    } else if (waveDamage >= 30) {
      this.state.difficulty *= 0.7;
    } else if (waveDamage >= 20) {
      this.state.difficulty *= 0.8;
    } else if (waveDamage >= 10) {
      this.state.difficulty *= 0.9;
    } else if (wave >= 10) {
      this.state.difficulty *= 1.05;
    }
    if (this.state.difficulty < 1) this.state.difficulty = 1;
  }

  makeMonsters(n, range) {
    const a = [];
    let count = 0;
    const l = this.rules.monsters.length;
    const types = range || Array.from({ length: l }, (_, i) => i);
    while (count < n) {
      const d = n - count;
      const c = Math.min(Math.floor(this.random.next() * d) + 1, 3);
      const r = Math.floor(this.random.next() * l);
      a.push([c, types[r]]);
      count += c;
    }
    return a;
  }

  stepOneTick() {
    // 推进 1 个逻辑 tick：处理 action、怪物移动、结算波次
    this.state.tick += 1;
    if (this.state.life <= 0) {
      this.state.life = 0;
      this.state.isGameOver = true;
      return;
    }
    this._processActionsForTick(this.state.tick);
    for (let level = 0; level < this._stepLevels.length; level += 1) {
      const next = [];
      const bucket = this._stepLevels[level];
      while (bucket.length) {
        const obj = bucket.shift();
        if (obj.is_valid && !obj.is_paused && typeof obj.step === 'function') {
          obj.step();
        }
        if (obj.is_valid) {
          next.push(obj);
        }
      }
      this._stepLevels[level] = next;
    }
    this._stageStep2();
    this._syncStateFromMap();
  }

  advanceToTick(targetTick) {
    while (this.state.tick < targetTick) {
      this.stepOneTick();
    }
  }

  runWithActions(actions) {
    if (Array.isArray(actions)) {
      for (let i = 0; i < actions.length; i += 1) {
        const action = actions[i];
        this.advanceToTick(action.t);
        this.applyAction(action);
      }
    }
  }

  runToTick(targetTick) {
    this.advanceToTick(targetTick);
  }

  runTicks(count) {
    for (let i = 0; i < count; i += 1) {
      this.stepOneTick();
    }
  }

  finalize() {
    // 计算最终分数（用于排行榜验证）
    const endTick = this.state.tick;
    const scoring = calculateFinalScore(
      {
        wave: this.state.wave,
        endTick,
        missedMonsters: this.state.missedMonsters,
        money: this.state.money
      },
      this.rules
    );
    return {
      score: scoring.total,
      breakdown: scoring.breakdown,
      endTick
    };
  }

  getState() {
    return { ...this.state };
  }

  getFinalState() {
    // 返回最终可提交状态（含 score/breakdown）
    const finalResult = this.finalize();
    const baseState = this.getState();
    return {
      ...baseState,
      scoreRaw: baseState.score,
      score: finalResult.score,
      endTick: finalResult.endTick,
      breakdown: finalResult.breakdown
    };
  }
}

export default LegacyEngineCore;
