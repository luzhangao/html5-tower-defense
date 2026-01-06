/*
 * SpeedController - cycles game speed multipliers.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	function SpeedController(tickClock) {
		this.tickClock = tickClock;
		this.speeds = [1, 2, 4, 8, 16, 32];
		this.currentSpeedIndex = 0;
	}

	SpeedController.prototype.setSpeed = function (speed) {
		var idx = this.speeds.indexOf(speed);
		if (idx === -1) {
			idx = 0;
		}
		this.currentSpeedIndex = idx;
		this.tickClock.setGameSpeed(this.speeds[this.currentSpeedIndex]);
		if (typeof window !== "undefined" && window.CoreRunner && window.CoreRunner.setSpeed) {
			window.CoreRunner.setSpeed(this.speeds[this.currentSpeedIndex]);
		}
	};

	SpeedController.prototype.cycleSpeed = function () {
		this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speeds.length;
		this.tickClock.setGameSpeed(this.speeds[this.currentSpeedIndex]);
		if (typeof window !== "undefined" && window.CoreRunner && window.CoreRunner.setSpeed) {
			window.CoreRunner.setSpeed(this.speeds[this.currentSpeedIndex]);
		}
		return this.getSpeed();
	};

	SpeedController.prototype.getSpeed = function () {
		return this.speeds[this.currentSpeedIndex];
	};

	TD.SpeedController = SpeedController;
}); // _TD.a.push end
