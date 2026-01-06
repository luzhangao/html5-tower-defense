/*
 * Recorder - records deterministic actions and final results.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	function Recorder() {
		this.seed = null;
		this.rulesVersion = null;
		this.actions = [];
		this.result = null;
		this._actionsPerTick = {};
	}

	Recorder.prototype.init = function (seed, rulesVersion) {
		// 每局开始时重置记录器
		this.seed = seed;
		this.rulesVersion = rulesVersion;
		this.actions = [];
		this.result = null;
		this._actionsPerTick = {};
	};

	Recorder.prototype.record = function (action) {
		// 只记录合法 action（每 tick 最多 2 个）
		var tick = action.t;
		var count = this._actionsPerTick[tick] || 0;
		if (count >= 2) {
			throw new Error("Too many actions in single tick");
		}
		this._actionsPerTick[tick] = count + 1;
		this.actions.push(action);
	};

	Recorder.prototype.getActionCount = function (tick) {
		return this._actionsPerTick[tick] || 0;
	};

	Recorder.prototype.finalize = function (finalState) {
		// 游戏结束时写入最终状态（用于提交/验证）
		this.result = {
			score: finalState.score,
			wave: finalState.wave,
			endTick: finalState.endTick,
			missedMonsters: finalState.missedMonsters,
			money: finalState.money
		};
	};

	Recorder.prototype.export = function () {
		// 导出给后端验证的完整回放数据
		return {
			seed: this.seed,
			rulesVersion: this.rulesVersion,
			actions: this.actions,
			result: this.result
		};
	};

	TD.Recorder = Recorder;
}); // _TD.a.push end
