/*
 * Deterministic random generator for replay.
 * Uses a simple LCG to avoid external dependencies in legacy build.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	function RandomGenerator(seed) {
		if (seed === undefined || seed === null) {
			throw new Error("RandomGenerator requires a seed");
		}
		this.seed = seed >>> 0;
		this.state = this.seed;
		this.callCount = 0;
		this.callLog = [];  // 调用日志
		this.enableLogging = true;  // 是否启用日志记录
	}

	RandomGenerator.prototype.next = function () {
		// LCG: Numerical Recipes
		this.state = (this.state * 1664525 + 1013904223) >>> 0;
		this.callCount++;

		const value = this.state / 0x100000000;

		// 记录调用日志
		if (this.enableLogging) {
			const stack = new Error().stack;
			const caller = this._parseStack(stack);

			this.callLog.push({
				index: this.callCount,
				tick: (typeof TD !== 'undefined' && TD.current_tick) || 0,
				value: value.toFixed(8),
				caller: caller
			});
		}

		return value;
	};

	RandomGenerator.prototype._parseStack = function (stack) {
		// 解析堆栈，提取调用函数名和位置
		const lines = stack.split('\n');
		// 跳过Error和next()自身，取第3行（实际调用者）
		const callerLine = lines[3] || '';

		// 尝试匹配Chrome/Node格式: at functionName (file:line:col)
		let match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
		if (match) {
			return {
				function: match[1].trim(),
				file: match[2].split('/').pop(),
				line: match[3],
				col: match[4]
			};
		}

		// 尝试匹配匿名函数格式: at file:line:col
		match = callerLine.match(/at\s+(.+?):(\d+):(\d+)/);
		if (match) {
			return {
				function: '<anonymous>',
				file: match[1].split('/').pop(),
				line: match[2],
				col: match[3]
			};
		}

		return { raw: callerLine.trim() };
	};

	RandomGenerator.prototype.printCallLog = function (limit) {
		limit = limit || 100;
		console.log('=== RNG Call Log ===');
		const logs = limit ? this.callLog.slice(0, limit) : this.callLog;
		logs.forEach(function (log) {
			const caller = log.caller.function
				? log.caller.function + ' (' + log.caller.file + ':' + log.caller.line + ')'
				: log.caller.raw;
			console.log('#' + log.index + ' [tick=' + log.tick + '] ' + caller + ' => ' + log.value);
		});
		console.log('Total calls: ' + this.callCount);
	};

	RandomGenerator.prototype.getCallSummary = function () {
		// 统计每个调用位置的次数
		const summary = {};
		this.callLog.forEach(function (log) {
			const key = log.caller.function || log.caller.raw;
			summary[key] = (summary[key] || 0) + 1;
		});
		return summary;
	};

	RandomGenerator.prototype.getCallLog = function () {
		return this.callLog;
	};

	RandomGenerator.prototype.setLogging = function (enabled) {
		this.enableLogging = enabled;
	};

	RandomGenerator.prototype.nextInt = function (min, max) {
		return Math.floor(this.next() * (max - min)) + min;
	};

	RandomGenerator.prototype.nextFloat = function (min, max) {
		return this.next() * (max - min) + min;
	};

	RandomGenerator.prototype.choice = function (array) {
		if (!array || array.length === 0) {
			throw new Error("Cannot choose from empty array");
		}
		return array[this.nextInt(0, array.length)];
	};

	RandomGenerator.prototype.reset = function () {
		this.state = this.seed;
		this.callCount = 0;
		this.callLog = [];
	};

	RandomGenerator.prototype.getSeed = function () {
		return this.seed;
	};

	RandomGenerator.prototype.getCallCount = function () {
		return this.callCount;
	};

	TD.RandomGenerator = RandomGenerator;

	var tdRandom = null;

	TD.initRandom = function (seed) {
		tdRandom = new RandomGenerator(seed);
		window.TD_RANDOM = tdRandom;
		return tdRandom;
	};

	TD.getRandom = function () {
		if (!tdRandom) {
			throw new Error("TD_RANDOM not initialized. Call TD.initRandom(seed) first.");
		}
		return tdRandom;
	};

	if (typeof window !== "undefined") {
		window.TD_RANDOM = tdRandom;
	}
}); // _TD.a.push end
