/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 * Last Update: 2011/1/10 5:22:52
 */


// _TD.a.push begin
_TD.a.push(function (TD) {

	/**
	 * 舞台类
	 * @param id {String} 舞台ID
	 * @param cfg {Object} 配置
	 */
	TD.Stage = function (id, cfg) {
		this.id = id || ("stage-" + TD.lang.rndStr());
		this.cfg = cfg || {};
		this.width = this.cfg.width || 640;
		this.height = this.cfg.height || 540;

		/**
		 * mode 有以下状态：
		 *         "normal": 普通状态
		 *         "build": 建造模式
		 */
		this.mode = "normal";

		/*
		 * state 有以下几种状态：
		 * 0: 等待中
		 * 1: 运行中
		 * 2: 暂停
		 * 3: 已结束
		 */
		this.state = 0;
		this.acts = [];
		this.current_act = null;
		this._step2 = TD.lang.nullFunc;

		this._init();
	};

	TD.Stage.prototype = {
		_init: function () {
			if (typeof this.cfg.init == "function") {
				this.cfg.init.call(this);
			}
			if (typeof this.cfg.step2 == "function") {
				this._step2 = this.cfg.step2;
			}
		},
		start: function () {
			this.state = 1;
			TD.lang.each(this.acts, function (obj) {
				obj.start();
			});
		},
		pause: function () {
			this.state = 2;
		},
		gameover: function () {
			//this.pause();
			this.current_act.gameover();
		},
		/**
		 * 清除本 stage 所有物品
		 */
		clear: function () {
			this.state = 3;
			TD.lang.each(this.acts, function (obj) {
				obj.clear();
			});
//		delete this;
		},
		/**
		 * 主循环函数
		 */
		step: function () {
			if (this.state != 1 || !this.current_act) return;
			TD.eventManager.step();
			this.current_act.step();

			this._step2();
		},
		/**
		 * 绘制函数
		 */
		render: function () {
			if (this.state == 0 || this.state == 3 || !this.current_act) return;
			this.current_act.render();
		},
		addAct: function (act) {
			this.acts.push(act);
		},
		addElement: function (el, step_level, render_level) {
			if (this.current_act)
				this.current_act.addElement(el, step_level, render_level);
		}
	};

}); // _TD.a.push end


// _TD.a.push begin
_TD.a.push(function (TD) {

	TD.Act = function (stage, id) {
		this.stage = stage;
		this.id = id || ("act-" + TD.lang.rndStr());

		/*
		 * state 有以下几种状态：
		 * 0: 等待中
		 * 1: 运行中
		 * 2: 暂停
		 * 3: 已结束
		 */
		this.state = 0;
		this.scenes = [];
		this.end_queue = []; // 本 act 结束后要执行的队列，添加时请保证里面全是函数
		this.current_scene = null;

		this._init();
	};

	TD.Act.prototype = {
		_init: function () {
			this.stage.addAct(this);
		},
		/*
		 * 开始当前 act
		 */
		start: function () {
			if (this.stage.current_act && this.stage.current_act.state != 3) {
				// queue...
				this.state = 0;
				this.stage.current_act.queue(this.start);
				return;
			}
			// start
			this.state = 1;
			this.stage.current_act = this;
			TD.lang.each(this.scenes, function (obj) {
				obj.start();
			});
		},
		pause: function () {
			this.state = 2;
		},
		end: function () {
			this.state = 3;
			var f;
			while (f = this.end_queue.shift()) {
				f();
			}
			this.stage.current_act = null;
		},
		queue: function (f) {
			this.end_queue.push(f);
		},
		clear: function () {
			this.state = 3;
			TD.lang.each(this.scenes, function (obj) {
				obj.clear();
			});
//		delete this;
		},
		step: function () {
			if (this.state != 1 || !this.current_scene) return;
			this.current_scene.step();
		},
		render: function () {
			if (this.state == 0 || this.state == 3 || !this.current_scene) return;
			this.current_scene.render();
		},
		addScene: function (scene) {
			this.scenes.push(scene);
		},
		addElement: function (el, step_level, render_level) {
			if (this.current_scene)
				this.current_scene.addElement(el, step_level, render_level);
		},
		gameover: function () {
			//this.is_paused = true;
			//this.is_gameover = true;
			this.current_scene.gameover();
		}
	};

}); // _TD.a.push end


// _TD.a.push begin
_TD.a.push(function (TD) {

	TD.Scene = function (act, id) {
		this.act = act;
		this.stage = act.stage;
		this.is_gameover = false;
		this.id = id || ("scene-" + TD.lang.rndStr());
		/*
		 * state 有以下几种状态：
		 * 0: 等待中
		 * 1: 运行中
		 * 2: 暂停
		 * 3: 已结束
		 */
		this.state = 0;
		this.end_queue = []; // 本 scene 结束后要执行的队列，添加时请保证里面全是函数
		this._step_elements = [
			// step 共分为 3 层
			[],
			// 0
			[],
			// 1 默认
			[] // 2
		];
		this._render_elements = [ // 渲染共分为 10 层
			[], // 0 背景 1 背景图片
			[], // 1 背景 2
			[], // 2 背景 3 地图、格子
			[], // 3 地面 1 一般建筑
			[], // 4 地面 2 人物、NPC等
			[], // 5 地面 3
			[], // 6 天空 1 子弹等
			[], // 7 天空 2 主地图外边的遮罩，panel
			[], // 8 天空 3
			[] // 9 系统特殊操作，如选中高亮，提示、文字遮盖等
		];

		this._init();
	};

	TD.Scene.prototype = {
		_init: function () {
			this.act.addScene(this);
			this.wave = 0; // 第几波
		},
		start: function () {
			if (this.act.current_scene &&
				this.act.current_scene != this &&
				this.act.current_scene.state != 3) {
				// queue...
				this.state = 0;
				this.act.current_scene.queue(this.start);
				return;
			}
			// start
			this.state = 1;
			this.act.current_scene = this;
		},
		pause: function () {
			this.state = 2;
		},
		end: function () {
			this.state = 3;
			var f;
			while (f = this.end_queue.shift()) {
				f();
			}
			this.clear();
			this.act.current_scene = null;
		},
		/**
		 * 清空场景
		 */
			clear: function () {
				// 清空本 scene 中引用的所有对象以回收内存
				for (var i = 0; i < this._step_elements.length; i++) {
					var stepList = this._step_elements[i] || [];
					for (var j = 0; j < stepList.length; j++) {
						var el = stepList[j];
						if (!el) continue;
						if (typeof el.del === "function") {
							el.del();
						} else if (typeof el.remove === "function") {
							el.remove();
						}
					}
				}
				for (var k = 0; k < this._render_elements.length; k++) {
					var renderList = this._render_elements[k] || [];
					for (var m = 0; m < renderList.length; m++) {
						var rEl = renderList[m];
						if (!rEl) continue;
						if (typeof rEl.del === "function") {
							rEl.del();
						} else if (typeof rEl.remove === "function") {
							rEl.remove();
						}
					}
				}
				// 重新初始化容器，避免后续 addElement 访问到空引用
				this._step_elements = [[], [], []];
				this._render_elements = [
					[], [], [], [], [], [], [], [], [], []
				];
			},
		queue: function (f) {
			this.end_queue.push(f);
		},
		gameover: function () {
			if (this.is_gameover) return;
			this.pause();
			this.is_gameover = true;

				if (TD.ScoringSystem && TD.rulesManager) {
					var coreState = null;
					if (TD.core_mode && typeof window !== "undefined" && window.CoreRunner && window.CoreRunner.getState) {
						coreState = window.CoreRunner.getState();
					}
					var endTick = coreState ? coreState.endTick : TD.getCurrentTick();
					var finalState = {
						wave: coreState ? coreState.wave : this.wave,
						endTick: endTick,
						missedMonsters: coreState ? coreState.missedMonsters : (TD.missed_monsters || 0),
						money: coreState ? coreState.money : (TD.money || 0)
					};
					var scoringResult = coreState && coreState.breakdown
						? { total: coreState.score, breakdown: coreState.breakdown }
						: TD.ScoringSystem.calculateFinalScore(finalState, TD.rulesManager.getRules());
					this.wave = finalState.wave;
					TD.missed_monsters = finalState.missedMonsters;
					TD.money = finalState.money;
					TD.score = scoringResult.total;
					TD.score_breakdown = scoringResult.breakdown;
					if (TD.is_debug && window.console && console.log) {
						console.log("[score] finalState", finalState);
						console.log("[score] breakdown", scoringResult.breakdown);
						console.log("[score] total", scoringResult.total);
					}
				if (TD.recorder) {
					TD.recorder.finalize({
						score: TD.score,
						wave: this.wave,
						endTick: endTick,
						missedMonsters: finalState.missedMonsters,
						money: finalState.money
					});
				}
			}

			if (TD.game_mode === "leaderboard") {
				TD.submitScore();
			}
		},
		step: function () {
			if (this.state != 1) return;
			if (TD.life <= 0) {
				TD.life = 0;
				this.gameover();
			}

			var i, a;
			for (i = 0; i < 3; i++) {
				a = [];
				var level_elements = this._step_elements[i];
				TD.lang.shift(level_elements, function (obj) {
					if (obj.is_valid) {
						if (!obj.is_paused)
							obj.step();
						a.push(obj);
					} else {
						setTimeout(function () {
							obj = null;
						}, 500); // 一会儿之后将这个对象彻底删除以收回内存
					}
				});
				this._step_elements[i] = a;
			}
		},
		render: function () {
			if (this.state == 0 || this.state == 3) return;
			var i, a,
				ctx = TD.ctx;

			ctx.clearRect(0, 0, this.stage.width, this.stage.height);

			for (i = 0; i < 10; i++) {
				a = [];
				var level_elements = this._render_elements[i];
				TD.lang.shift(level_elements, function (obj) {
					if (obj.is_valid) {
						if (obj.is_visiable)
							obj.render();
						a.push(obj);
					}
				});
				this._render_elements[i] = a;
			}

			if (this.is_gameover) {
				this.panel.gameover_obj.show();
			}
		},
		addElement: function (el, step_level, render_level) {
			//TD.log([step_level, render_level]);
			step_level = step_level || el.step_level || 1;
			render_level = render_level || el.render_level;
			this._step_elements[step_level].push(el);
			this._render_elements[render_level].push(el);
			el.scene = this;
			el.step_level = step_level;
			el.render_level = render_level;
		}
	};

}); // _TD.a.push end
