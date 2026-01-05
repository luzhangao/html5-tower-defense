/*
 * Copyright (c) 2011.
 *
 * Author: oldj <oldj.wu@gmail.com>
 * Blog: http://oldj.net/
 *
 */

var _TD = {
	a: [],
	retina: window.devicePixelRatio || 1,
	init: function (td_board, is_debug) {
		delete this.init; // 一旦初始化运行，即删除这个入口引用，防止初始化方法被再次调用

		var i, TD = {
			version: "0.1.17", // 版本命名规范参考：http://semver.org/
			is_debug: !!is_debug,
			is_paused: true,
			width: 16, // 横向多少个格子
			height: 16, // 纵向多少个格子
			show_monster_life: true, // 是否显示怪物的生命值
			fps: 0,
			exp_fps: 24, // 期望的 fps
			exp_fps_half: 12,
			exp_fps_quarter: 6,
			exp_fps_eighth: 4,
			stage_data: {},
			defaultSettings: function () {
				return {
					step_time: 36, // 每一次 step 循环之间相隔多少毫秒
					grid_size: 32 * _TD.retina, // px
					padding: 10 * _TD.retina, // px
					global_speed: 0.1 // 全局速度系数
				};
			},

			/**
			 * 初始化
			 * @param ob_board
			 */
			init: function (ob_board/*, ob_info*/) {
				this.obj_board = TD.lang.$e(ob_board);
				this.canvas = this.obj_board.getElementsByTagName("canvas")[0];
				//this.obj_info = TD.lang.$e(ob_info);
				if (!this.canvas.getContext) return; // 不支持 canvas
				this.ctx = this.canvas.getContext("2d");
				this.monster_type_count = TD.getDefaultMonsterAttributes(); // 一共有多少种怪物
				this.tickClock = new TD.TickClock(TD.rulesManager.getRules().tickRate);
				this.iframe = 0; // 当前逻辑tick
				this.lastFrameTime = 0;
				this._fps_last_time = 0;
				this._fps_frames = 0;
				this.fps = 0;
				this.is_running = false;
				this.seed = 0;
				this.rulesVersion = TD.rulesManager.getRulesVersion();
				this.missed_monsters = 0;
				this.max_wave = 0;
				this.game_mode = "normal";
				this.use_server_seed = false;
				this.attempt_id = null;
				this.apiBaseUrl = "http://localhost:8000";

				this.authManager = new TD.AuthManager();
				this.apiClient = new TD.APIClient({
					baseUrl: this.apiBaseUrl,
					authManager: this.authManager
				});
				this._authPromise = this.authManager.ensureIdentity(this.apiClient);
				this.leaderboardUI = new TD.LeaderboardUI({ apiClient: this.apiClient });
				this.leaderboardUI.init();
				this.setupDomControls();

				this.startNormalGame();
			},

			/**
			 * 开始游戏，或重新开始游戏
			 */
			start: function () {
				if (this._raf_id) {
					cancelAnimationFrame(this._raf_id);
				}
				TD.log("Start!");
				var _this = this;

				this.mode = "normal"; // mode 分为 normail（普通模式）及 build（建造模式）两种
				this.eventManager.clear(); // 清除事件管理器中监听的事件
				this.lang.mix(this, this.defaultSettings());
				this.exp_fps = this.tickClock.getTickRate();
				this.exp_fps_half = Math.floor(this.exp_fps / 2);
				this.exp_fps_quarter = Math.floor(this.exp_fps / 4);
				this.exp_fps_eighth = Math.floor(this.exp_fps / 8);
				this.iframe = 0;
				this.missed_monsters = 0;
				if (!this.use_server_seed) {
					this.seed = (new Date()).getTime();
				}
				TD.initRandom(this.seed);
				this.entityManager = new TD.EntityManager();
				this.actionDispatcher = new TD.ActionDispatcher(this);
				this.recorder = new TD.Recorder();
				this.recorder.init(this.seed, this.rulesVersion);
				this.speedController = new TD.SpeedController(this.tickClock);
				this.speedController.setSpeed(1);
				this.audioSystem = new TD.AudioSystem();
				this.audioSystem.preload();
				this.loadProgress();
				this.stage = new TD.Stage("stage-main", TD.getDefaultStageData("stage_main"));

				this.canvas.setAttribute("width", this.stage.width);
				this.canvas.setAttribute("height", this.stage.height);
				this.canvas.style.width = (this.stage.width / _TD.retina) + "px";
				this.canvas.style.height = (this.stage.height / _TD.retina) + "px";

				this.canvas.onmousemove = function (e) {
					var xy = _this.getEventXY.call(_this, e);
					_this.hover(xy[0], xy[1]);
				};
				this.canvas.onclick = function (e) {
					var xy = _this.getEventXY.call(_this, e);
					_this.click(xy[0], xy[1]);
				};
				if (this._speedKeyHandler) {
					document.removeEventListener("keydown", this._speedKeyHandler);
				}
				this._speedKeyHandler = function (e) {
					if (e.key === "f" || e.key === "F") {
						_this.speedController.cycleSpeed();
						_this.updateSpeedUI();
					}
				};
				document.addEventListener("keydown", this._speedKeyHandler);

				this.is_paused = false;
				this.stage.start();
				this.tickClock.reset();
				this.tickClock.setGameSpeed(1);
				this.updateSpeedUI();
				this.lastFrameTime = performance.now();
				this._fps_last_time = this.lastFrameTime;
				this._fps_frames = 0;
				this.is_running = true;
				this._raf_id = requestAnimationFrame(function (t) {
					_this.step(t);
				});

				return this;
			},

			/**
			 * 作弊方法
			 * @param cheat_code
			 *
			 * 用例：
			 * 1、增加 100 万金钱：javascript:_TD.cheat="money+";void(0);
			 * 2、难度增倍：javascript:_TD.cheat="difficulty+";void(0);
			 * 3、难度减半：javascript:_TD.cheat="difficulty-";void(0);
			 * 4、生命值恢复：javascript:_TD.cheat="life+";void(0);
			 * 5、生命值降为最低：javascript:_TD.cheat="life-";void(0);
			 */
			checkCheat: function (cheat_code) {
				switch (cheat_code) {
					case "money+":
						this.money += 1000000;
						this.log("cheat success!");
						break;
					case "life+":
						this.life = 100;
						this.log("cheat success!");
						break;
					case "life-":
						this.life = 1;
						this.log("cheat success!");
						break;
					case "difficulty+":
						this.difficulty *= 2;
						this.log("cheat success! difficulty = " + this.difficulty);
						break;
					case "difficulty-":
						this.difficulty /= 2;
						this.log("cheat success! difficulty = " + this.difficulty);
						break;
				}
			},

			/**
			 * 主循环方法
			 */
			step: function () {

				if (this.is_debug && _TD && _TD.cheat) {
					// 检查作弊代码
					this.checkCheat(_TD.cheat);
					_TD.cheat = "";
				}

				if (!this.is_running) return;

				var currentTime = arguments[0] || performance.now();
				var deltaTime = currentTime - this.lastFrameTime;
				this.lastFrameTime = currentTime;
				var speedMultiplier = this.speedController ? this.speedController.getSpeed() : 1;

				if (this.is_paused) {
					this._raf_id = requestAnimationFrame(this.step.bind(this));
					return;
				}

				var ticks = this.tickClock.update(deltaTime * speedMultiplier);
				for (var i = 0; i < ticks.length; i++) {
					this.iframe = ticks[i];
					if (this.iframe % 2400 == 0) TD.gc(); // 每隔一段时间自动回收垃圾
					this.stage.step();
				}

				this.stage.render();

				this._fps_frames++;
				if (currentTime - this._fps_last_time >= 1000) {
					this.fps = Math.round((this._fps_frames * 1000) / (currentTime - this._fps_last_time));
					this._fps_last_time = currentTime;
					this._fps_frames = 0;
				}

				this._raf_id = requestAnimationFrame(this.step.bind(this));
			},

			/**
			 * 取得事件相对于 canvas 左上角的坐标
			 * @param e
			 */
			getEventXY: function (e) {
				var wra = TD.lang.$e("wrapper"),
					x = e.clientX - wra.offsetLeft - this.canvas.offsetLeft + Math.max(document.documentElement.scrollLeft, document.body.scrollLeft),
					y = e.clientY - wra.offsetTop - this.canvas.offsetTop + Math.max(document.documentElement.scrollTop, document.body.scrollTop);

				return [x * _TD.retina, y * _TD.retina];
			},

			/**
			 * 鼠标移到指定位置事件
			 * @param x
			 * @param y
			 */
			hover: function (x, y) {
				this.eventManager.hover(x, y);
			},

			/**
			 * 点击事件
			 * @param x
			 * @param y
			 */
			click: function (x, y) {
				this.eventManager.click(x, y);
			},

			/**
			 * 是否将 canvas 中的鼠标指针变为手的形状
			 * @param v {Boolean}
			 */
			mouseHand: function (v) {
				this.canvas.style.cursor = v ? "pointer" : "default";
			},

			/**
			 * 显示调试信息，只在 is_debug 为 true 的情况下有效
			 * @param txt
			 */
			log: function (txt) {
				this.is_debug && window.console && console.log && console.log(txt);
			},

			/**
			 * 回收内存
			 * 注意：CollectGarbage 只在 IE 下有效
			 */
			gc: function () {
				if (window.CollectGarbage) {
					CollectGarbage();
					setTimeout(CollectGarbage, 1);
				}
			},

			getCurrentTick: function () {
				return this.tickClock.getCurrentTick();
			},

			updateSpeedUI: function () {
				var panel = this.stage && this.stage.current_act && this.stage.current_act.current_scene && this.stage.current_act.current_scene.panel;
				if (panel && panel.btn_speed) {
					panel.btn_speed.text = "Speed: " + this.speedController.getSpeed() + "x";
				}
			},

			setupDomControls: function () {
				var btnNormal = TD.lang.$e("td-btn-normal");
				var btnLeaderboard = TD.lang.$e("td-btn-leaderboard");
				var submitStatus = TD.lang.$e("td-submit-status");

				if (btnNormal) {
					btnNormal.onclick = this.startNormalGame.bind(this);
				}
				if (btnLeaderboard) {
					btnLeaderboard.onclick = this.startLeaderboardGame.bind(this);
				}
				this.submitStatusEl = submitStatus;
			},

			startNormalGame: function () {
				this.game_mode = "normal";
				this.use_server_seed = false;
				this.attempt_id = null;
				this.start();
				if (this.submitStatusEl) this.submitStatusEl.textContent = "";
			},

			startLeaderboardGame: function () {
				this.game_mode = "leaderboard";
				if (this.submitStatusEl) this.submitStatusEl.textContent = "Requesting seed...";
				var onReady = function () {
					this.apiClient.startGame(this.rulesVersion).then(function (res) {
						this.attempt_id = res.attempt_id;
						this.seed = res.seed;
						this.use_server_seed = true;
						this.start();
						if (this.submitStatusEl) this.submitStatusEl.textContent = "Attempt ready";
					}.bind(this)).catch(function (err) {
						if (this.submitStatusEl) this.submitStatusEl.textContent = err.message || "Start failed";
					}.bind(this));
				}.bind(this);

				if (this._authPromise) {
					this._authPromise.then(onReady).catch(function (err) {
						if (this.submitStatusEl) this.submitStatusEl.textContent = err.message || "Auth failed";
					}.bind(this));
				} else {
					onReady();
				}
			},

			submitScore: function () {
				if (!this.attempt_id || !this.recorder || !this.recorder.result) return;
				var payload = {
					attempt_id: this.attempt_id,
					rules_version: this.rulesVersion,
					score_claim: this.recorder.result.score,
					level_claim: this.recorder.result.wave,
					actions: this.recorder.actions
				};

				if (this.submitStatusEl) this.submitStatusEl.textContent = "Submitting...";
				var submit = function () {
					this.apiClient.submitScore(payload).then(function (res) {
						this.last_submit_result = res;
						if (this.submitStatusEl) {
							this.submitStatusEl.textContent = res.success ? "Submitted" : ("Rejected: " + res.reason);
						}
						if (this.leaderboardUI) {
							this.leaderboardUI.refresh();
						}
					}.bind(this)).catch(function (err) {
						if (this.submitStatusEl) this.submitStatusEl.textContent = err.message || "Submit failed";
					}.bind(this));
				}.bind(this);

				if (this._authPromise) {
					this._authPromise.then(submit).catch(function (err) {
						if (this.submitStatusEl) this.submitStatusEl.textContent = err.message || "Auth failed";
					}.bind(this));
				} else {
					submit();
				}
			},

			loadProgress: function () {
				try {
					var v = window.localStorage && window.localStorage.getItem("td_max_wave");
					var parsed = parseInt(v, 10);
					this.max_wave = isNaN(parsed) ? 0 : parsed;
				} catch (error) {
					this.max_wave = 0;
				}
			},

			saveProgress: function () {
				try {
					if (window.localStorage) {
						window.localStorage.setItem("td_max_wave", this.max_wave);
					}
				} catch (error) {
					// ignore storage errors
				}
			}
		};

		for (i = 0; this.a[i]; i++) {
			// 依次执行添加到列表中的函数
			this.a[i](TD);
		}
		delete this.a;

		TD.init(td_board);
	}
};
