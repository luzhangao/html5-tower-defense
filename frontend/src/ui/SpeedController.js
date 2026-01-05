/**
 * SpeedController - cycles game speed multipliers.
 */
class SpeedController {
  constructor(tickClock) {
    this.tickClock = tickClock;
    this.speeds = [1, 2, 4, 8];
    this.currentSpeedIndex = 0;
  }

  setSpeed(speed) {
    const idx = this.speeds.indexOf(speed);
    this.currentSpeedIndex = idx === -1 ? 0 : idx;
    this.tickClock.setGameSpeed(this.speeds[this.currentSpeedIndex]);
  }

  cycleSpeed() {
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speeds.length;
    this.tickClock.setGameSpeed(this.speeds[this.currentSpeedIndex]);
    return this.getSpeed();
  }

  getSpeed() {
    return this.speeds[this.currentSpeedIndex];
  }
}

export { SpeedController };
export default SpeedController;
