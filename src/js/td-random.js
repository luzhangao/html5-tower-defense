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
	}

	RandomGenerator.prototype.next = function () {
		// LCG: Numerical Recipes
		this.state = (this.state * 1664525 + 1013904223) >>> 0;
		this.callCount++;
		return this.state / 0x100000000;
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
