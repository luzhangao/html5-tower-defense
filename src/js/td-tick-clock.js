/*
 * TickClock - fixed tick clock for deterministic logic updates.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	function TickClock(tickRate) {
		this.tickRate = tickRate || 24;
		this.tickDuration = 1000 / this.tickRate;
		this.currentTick = 0;
		this.accumulator = 0;
		this.gameSpeed = 1;
		this.isPaused = false;
	}

	TickClock.prototype.update = function (deltaTime) {
		if (this.isPaused) return [];
		deltaTime = Math.min(deltaTime, 100);
		this.accumulator += deltaTime;

		var ticksToProcess = [];
		var maxTicksPerFrame = Math.max(1, Math.floor(this.gameSpeed));
		var ticksProcessed = 0;

		while (this.accumulator >= this.tickDuration && ticksProcessed < maxTicksPerFrame) {
			this.currentTick++;
			ticksToProcess.push(this.currentTick);
			this.accumulator -= this.tickDuration;
			ticksProcessed++;
		}

		if (this.accumulator > this.tickDuration * 5) {
			this.accumulator = 0;
		}

		return ticksToProcess;
	};

	TickClock.prototype.setGameSpeed = function (speed) {
		if (speed !== 1 && speed !== 2 && speed !== 4 && speed !== 8) {
			speed = 1;
		}
		this.gameSpeed = speed;
	};

	TickClock.prototype.getGameSpeed = function () {
		return this.gameSpeed;
	};

	TickClock.prototype.setPaused = function (paused) {
		this.isPaused = paused;
	};

	TickClock.prototype.reset = function () {
		this.currentTick = 0;
		this.accumulator = 0;
		this.isPaused = false;
	};

	TickClock.prototype.getCurrentTick = function () {
		return this.currentTick;
	};

	TickClock.prototype.getTickRate = function () {
		return this.tickRate;
	};

	TD.TickClock = TickClock;
}); // _TD.a.push end
