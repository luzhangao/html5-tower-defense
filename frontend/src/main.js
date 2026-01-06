/**
 * HTML5 Tower Defense - 主入口文件
 */

import TickClock from './core/TickClock';
import { BrowserRunner, DebugRenderer } from './core-engine';

// 全局游戏对象
const TD = {
  version: '2.0.0',
  tickClock: null,
  coreRunner: null,
  coreDebug: null,
  lastFrameTime: 0,
  isRunning: false,

  /**
   * 初始化游戏
   */
  init() {
    console.log(`HTML5 Tower Defense v${this.version}`);
    console.log('初始化游戏引擎...');

    // 初始化Tick时钟（24 tps）
    this.tickClock = new TickClock(24);
    this.coreRunner = new BrowserRunner({ seed: Date.now(), rulesVersion: '1.0.0', tickRate: 24 });
    this.coreDebug = new DebugRenderer({ runner: this.coreRunner });

    // TODO: 初始化其他系统
    // - RandomGenerator
    // - EntityManager
    // - ActionDispatcher
    // - Recorder
    // - RulesManager

    console.log('游戏引擎初始化完成');
  },

  /**
   * 启动游戏循环
   */
  start() {
    if (this.isRunning) {
      console.warn('游戏已经在运行中');
      return;
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
    if (this.coreRunner) {
      this.coreRunner.start();
    }
    if (this.coreDebug) {
      this.coreDebug.start();
    }

    console.log('游戏循环已启动');
  },

  /**
   * 游戏主循环
   * @param {number} currentTime - 当前时间戳（毫秒）
   */
  gameLoop(currentTime) {
    if (!this.isRunning) return;

    // 计算deltaTime
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // 逻辑更新（固定tick）
    // speed=1x: 每帧处理最多1个tick
    // speed=8x: 每帧处理最多8个tick（快进）
    const ticks = this.tickClock.update(deltaTime);
    for (const tick of ticks) {
      this.updateGameLogic(tick);
    }

    // 渲染（可变帧率）
    this.render();

    // 请求下一帧
    requestAnimationFrame((t) => this.gameLoop(t));
  },

  /**
   * 更新游戏逻辑
   * @param {number} tick - 当前tick
   */
  updateGameLogic(tick) {
    // TODO: 实现游戏逻辑更新
    // - 怪物移动
    // - 建筑攻击
    // - 子弹飞行
    // - 碰撞检测
    // - 等等

    // 调试输出（每100个tick输出一次）
    if (tick % 100 === 0) {
      console.log(`Tick ${tick}, Speed: ${this.tickClock.getGameSpeed()}x`);
    }
  },

  /**
   * 渲染
   */
  render() {
    // TODO: 实现渲染逻辑
  },

  /**
   * 停止游戏循环
   */
  stop() {
    this.isRunning = false;
    if (this.coreRunner) {
      this.coreRunner.stop();
    }
    if (this.coreDebug) {
      this.coreDebug.stop();
    }
    console.log('游戏循环已停止');
  },

  /**
   * 暂停/恢复游戏
   */
  togglePause() {
    const paused = !this.tickClock.isPaused;
    this.tickClock.setPaused(paused);
    console.log(paused ? '游戏已暂停' : '游戏已恢复');
  },

  /**
   * 设置游戏速度
   * @param {number} speed - 速度倍率 (1, 2, 4, 8)
   */
  setGameSpeed(speed) {
    this.tickClock.setGameSpeed(speed);
    console.log(`游戏速度设置为 ${speed}x`);
  }
};

// 暴露到全局（开发阶段）
if (typeof window !== 'undefined') {
  window.TD = TD;
  window.CoreRunner = {
    placeLMG() {
      if (TD.coreRunner) {
        TD.coreRunner.queueAction({ t: TD.coreRunner.engine.state.tick + 1, op: 'place', entityType: 'LMG' });
      }
    },
    upgrade(id) {
      if (TD.coreRunner) {
        TD.coreRunner.queueAction({ t: TD.coreRunner.engine.state.tick + 1, op: 'upgrade', entityId: id });
      }
    },
    sell(id) {
      if (TD.coreRunner) {
        TD.coreRunner.queueAction({ t: TD.coreRunner.engine.state.tick + 1, op: 'sell', entityId: id });
      }
    },
    getState() {
      return TD.coreRunner ? TD.coreRunner.engine.getFinalState() : null;
    }
  };
}

// 自动初始化（可选）
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    TD.init();
  });
} else if (typeof window !== 'undefined') {
  TD.init();
}

export default TD;
