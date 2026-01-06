/*
 * Core sync - mirror CoreEngine state into legacy renderer.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	function CoreMonsterView(cfg) {
		this.is_valid = true;
		this.is_visiable = true;
		this.is_paused = true;
		this.step_level = cfg.step_level || 1;
		this.render_level = cfg.render_level || 3;
		this.cx = cfg.cx;
		this.cy = cfg.cy;
		this.r = cfg.r || 4;
		this.color = cfg.color || "#c33";
		this.life = cfg.life;
		this.life0 = cfg.life0 || cfg.life;
	}

	CoreMonsterView.prototype.step = function () {
		// render-only
	};

	CoreMonsterView.prototype.del = function () {
		this.is_valid = false;
	};

	CoreMonsterView.prototype.render = function () {
		var ctx = TD.ctx;
		ctx.fillStyle = this.color;
		ctx.strokeStyle = "#000";
		ctx.lineWidth = _TD.retina;
		ctx.beginPath();
		ctx.arc(this.cx, this.cy, this.r, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		if (TD.show_monster_life && this.life0 > 0) {
			var w = 20 * _TD.retina;
			var h = 3 * _TD.retina;
			var x = this.cx - w / 2;
			var y = this.cy - this.r - 6 * _TD.retina;
			var ratio = Math.max(0, this.life) / this.life0;
			ctx.fillStyle = "#c00";
			ctx.fillRect(x, y, w, h);
			ctx.fillStyle = "#0c0";
			ctx.fillRect(x, y, w * ratio, h);
		}
	};

	function CoreBulletView(cfg) {
		this.is_valid = true;
		this.is_visiable = true;
		this.is_paused = true;
		this.step_level = cfg.step_level || 1;
		this.render_level = cfg.render_level || 6;
		this.cx = cfg.cx;
		this.cy = cfg.cy;
		this.r = cfg.r || 2;
		this.color = cfg.color || "#000";
	}

	CoreBulletView.prototype.step = function () {
		// render-only
	};

	CoreBulletView.prototype.del = function () {
		this.is_valid = false;
	};

	CoreBulletView.prototype.render = function () {
		var ctx = TD.ctx;
		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.arc(this.cx, this.cy, this.r, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.fill();
	};

	function CoreLaserView(cfg) {
		this.is_valid = true;
		this.is_visiable = true;
		this.is_paused = true;
		this.step_level = cfg.step_level || 1;
		this.render_level = cfg.render_level || 6;
		this.x1 = cfg.x1;
		this.y1 = cfg.y1;
		this.x2 = cfg.x2;
		this.y2 = cfg.y2;
		this.color = cfg.color || "#f33";
		this.width = cfg.width || (2 * _TD.retina);
	}

	CoreLaserView.prototype.step = function () {
		// render-only
	};

	CoreLaserView.prototype.del = function () {
		this.is_valid = false;
	};

	CoreLaserView.prototype.render = function () {
		var ctx = TD.ctx;
		ctx.strokeStyle = this.color;
		ctx.lineWidth = this.width;
		ctx.beginPath();
		ctx.moveTo(this.x1, this.y1);
		ctx.lineTo(this.x2, this.y2);
		ctx.stroke();
	};
	function CoreSync() {
		this.buildingsById = {};
	}

	CoreSync.prototype._getRunner = function () {
		if (typeof window === "undefined" || !window.CoreRunner || !window.CoreRunner.getRunner) {
			return null;
		}
		return window.CoreRunner.getRunner();
	};

	CoreSync.prototype._syncGlobals = function (state, scene) {
		// 将 core 状态同步到 legacy 全局变量
		TD.money = state.money || 0;
		TD.life = state.life || 0;
		TD.score = state.score || 0;
		TD.wave = state.wave || 0;
		TD.difficulty = state.difficulty || 1;
		TD.wave_damage = state.waveDamage || 0;
		TD.missed_monsters = state.missedMonsters || 0;
		if (TD.wave > (TD.max_wave || 0)) {
			TD.max_wave = TD.wave;
			if (typeof TD.saveProgress === "function") {
				TD.saveProgress();
			}
		}
		if (scene) {
			scene.wave = TD.wave;
		}
	};

	CoreSync.prototype._syncBuildings = function (state, scene) {
		// core -> legacy：同步建筑列表与选中状态
		var map = scene && scene.map;
		if (!map) return;
		var entities = state.entities || {};
		var seen = {};
		var buildingList = [];

		for (var id in entities) {
			if (!Object.prototype.hasOwnProperty.call(entities, id)) continue;
			var data = entities[id];
			if (!data || !data.pos) continue;
			seen[id] = true;
			var view = this.buildingsById[id];
			if (!view || !view.is_valid) {
				var grid = map.getGrid(data.pos[0], data.pos[1]);
				if (!grid) continue;
				view = grid.addBuilding(data.type, id);
				this.buildingsById[id] = view;
			}
			view.entityId = id;
			view.type = data.type;
			view.level = data.level || 0;
			view.damage = data.damage;
			view.speed = data.speed;
			view.range = data.range;
			view.max_range = data.maxRange || data.range;
			view.life = data.life;
			view.shield = data.shield;
			view.killed = data.killed || 0;
			view.is_weapon = data.isWeapon;
			view._upgrade_records = data.upgradeRecords || {};
			view.money = data.moneySpent || view.money;
			view._fire_wait = data.fireWait || view._fire_wait;
			view._fire_wait2 = view._fire_wait;
			view.range_px = view.range * TD.grid_size;
			buildingList.push(view);
		}

		for (var oldId in this.buildingsById) {
			if (!Object.prototype.hasOwnProperty.call(this.buildingsById, oldId)) continue;
			if (seen[oldId]) continue;
			var oldView = this.buildingsById[oldId];
			if (oldView) {
				if (map.selected_building === oldView) {
					map.selected_building = null;
				}
				oldView.remove();
			}
			delete this.buildingsById[oldId];
		}

		map.buildings = buildingList;
		map.checkHasWeapon();

		if (map.selected_building && !this.buildingsById[map.selected_building.entityId]) {
			map.selected_building = null;
		}
		if (!map.selected_building && scene.panel) {
			scene.panel.btn_upgrade.hide();
			scene.panel.btn_sell.hide();
		}
	};

	CoreSync.prototype._syncMonsters = function (state, scene) {
		// core -> legacy：同步怪物可视化对象
		var map = scene && scene.map;
		if (!map) return;
		if (map.monsters && map.monsters.length) {
			for (var i = 0; i < map.monsters.length; i++) {
				map.monsters[i].is_valid = false;
			}
		}
		map.monsters = [];
		var list = state.monsters || [];
		for (var j = 0; j < list.length; j++) {
			var m = list[j];
			var view = new CoreMonsterView({
				cx: m.cx,
				cy: m.cy,
				r: m.r,
				color: m.color,
				life: m.life,
				life0: m.life0,
				step_level: map.step_level || 1,
				render_level: (map.render_level || 2) + 2
			});
			map.monsters.push(view);
			scene.addElement(view, view.step_level, view.render_level);
		}
	};

	CoreSync.prototype._syncBullets = function (runner, scene) {
		// core -> legacy：同步子弹与激光效果
		var map = scene && scene.map;
		if (!map) return;
		if (map.bullets && map.bullets.length) {
			for (var i = 0; i < map.bullets.length; i++) {
				map.bullets[i].is_valid = false;
			}
		}
		map.bullets = [];
		var coreMap = runner.engine && runner.engine.map;
		if (!coreMap || !coreMap.bullets) return;
		for (var j = 0; j < coreMap.bullets.length; j++) {
			var bullet = coreMap.bullets[j];
			if (!bullet || !bullet.is_valid) continue;
			var view = new CoreBulletView({
				cx: bullet.cx,
				cy: bullet.cy,
				r: bullet.r || 2,
				color: bullet.color || "#000",
				step_level: map.step_level || 1,
				render_level: 6
			});
			map.bullets.push(view);
			scene.addElement(view, view.step_level, view.render_level);
		}

		if (coreMap.buildings) {
			for (var k = 0; k < coreMap.buildings.length; k++) {
				var building = coreMap.buildings[k];
				if (!building || !building.is_valid || building.type !== "laser_gun") continue;
				if (!building.target || !building.target.is_valid) continue;
				var laserView = new CoreLaserView({
					x1: building.cx,
					y1: building.cy,
					x2: building.target.cx,
					y2: building.target.cy,
					color: "#f33",
					step_level: map.step_level || 1,
					render_level: 6
				});
				map.bullets.push(laserView);
				scene.addElement(laserView, laserView.step_level, laserView.render_level);
			}
		}
	};

	CoreSync.prototype.sync = function () {
		// 每帧渲染前执行一次状态镜像
		var runner = this._getRunner();
		if (!runner || !runner.engine) return;
		var scene = TD.stage && TD.stage.current_act && TD.stage.current_act.current_scene;
		if (!scene) return;
		var state = runner.engine.getState ? runner.engine.getState() : runner.engine.state;
		if (!state) return;
		this._syncGlobals(state, scene);
		this._syncBuildings(state, scene);
		this._syncMonsters(state, scene);
		this._syncBullets(runner, scene);
		if (state.isGameOver && !scene.is_gameover) {
			scene.gameover();
		}
	};

	TD.CoreSync = CoreSync;
	TD.coreSync = new CoreSync();

}); // _TD.a.push end
