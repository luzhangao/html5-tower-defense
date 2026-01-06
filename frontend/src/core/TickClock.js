/**
 * TickClock - 固定Tick时钟系统
 *
 * 关键设计：
 * - tick推进受speed影响（加速会更快推进tick）
 * - 允许单帧处理多tick以追帧，避免卡顿
 * - 分数基于tick计时，速度只影响现实时间消耗
 * - 分数不受速度影响，因为分数基于endTick计算
 */
class TickClock {
  /**
   * 构造函数
   * @param {number} tickRate - 每秒tick数（默认24 tps）
   */
  constructor(tickRate = 24) {
    this.tickRate = tickRate;
    this.tickDuration = 1000 / tickRate;  // 每个tick的毫秒数（约42ms）
    this.currentTick = 0;
    this.accumulator = 0;
    this.gameSpeed = 1.0;  // 游戏速度倍率 (1x, 2x, 4x, 8x)
    this.isPaused = false;
  }

  /**
   * 更新tick时钟
   * @param {number} deltaTime - 自上一帧以来经过的毫秒数
   * @returns {Array<number>} 需要处理的tick列表
   */
  update(deltaTime) {
    if (this.isPaused) {
      return [];
    }

    deltaTime = Math.min(deltaTime, 100);
    this.accumulator += deltaTime * this.gameSpeed;

    const ticksToProcess = [];
    const maxTicksPerFrame = Math.max(1, Math.floor(this.gameSpeed));
    let ticksProcessed = 0;

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
  }

  /**
   * 设置游戏速度
   * @param {number} speed - 速度倍率 (1, 2, 4, 8)
   */
  setGameSpeed(speed) {
    if (![1, 2, 4, 8, 16, 32].includes(speed)) {
      console.warn(`Invalid game speed: ${speed}, using 1x instead`);
      this.gameSpeed = 1.0;
      return;
    }
    this.gameSpeed = speed;
  }

  /**
   * 获取当前游戏速度
   * @returns {number}
   */
  getGameSpeed() {
    return this.gameSpeed;
  }

  /**
   * 暂停/恢复
   * @param {boolean} paused
   */
  setPaused(paused) {
    this.isPaused = paused;
  }

  /**
   * 重置时钟
   */
  reset() {
    this.currentTick = 0;
    this.accumulator = 0;
    this.isPaused = false;
  }

  /**
   * 获取当前tick
   * @returns {number}
   */
  getCurrentTick() {
    return this.currentTick;
  }

  /**
   * 获取tick速率
   * @returns {number}
   */
  getTickRate() {
    return this.tickRate;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TickClock;
}
