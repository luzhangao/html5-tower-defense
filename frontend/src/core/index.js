/**
 * 核心模块导出文件
 *
 * 将核心类暴露给全局作用域，以便原有代码可以使用
 */

import { RandomGenerator, initRandom, getRandom } from './RandomGenerator.js';
import TickClock from './TickClock.js';
import { EntityManager, EntityState } from './EntityManager.js';

// 导出到全局作用域（用于原有代码）
if (typeof window !== 'undefined') {
  window.RandomGenerator = RandomGenerator;
  window.initRandom = initRandom;
  window.getRandom = getRandom;
  window.TickClock = TickClock;
  window.EntityManager = EntityManager;
  window.EntityState = EntityState;

  // 创建全局TD_RANDOM的getter
  Object.defineProperty(window, 'TD_RANDOM', {
    get: function() {
      return getRandom();
    },
    configurable: true
  });
}

export {
  RandomGenerator,
  initRandom,
  getRandom,
  TickClock,
  EntityManager,
  EntityState
};
