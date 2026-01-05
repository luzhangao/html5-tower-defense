/**
 * RandomGenerator - 确定性随机数生成器
 *
 * 使用seedrandom库确保相同的seed产生相同的随机数序列
 * 这是实现游戏回放的关键组件
 */

import seedrandom from 'seedrandom';

class RandomGenerator {
  constructor(seed) {
    if (seed === undefined || seed === null) {
      throw new Error('RandomGenerator requires a seed');
    }

    this.seed = seed;
    this.rng = seedrandom(seed.toString());
    this.callCount = 0;  // 用于调试，记录调用次数
  }

  /**
   * 生成[0, 1)范围的随机数
   * 等价于Math.random()
   */
  next() {
    this.callCount++;
    return this.rng();
  }

  /**
   * 生成[min, max)范围的随机整数
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * 生成[min, max)范围的随机浮点数
   */
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  /**
   * 从数组中随机选择一个元素
   */
  choice(array) {
    if (!array || array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    const index = this.nextInt(0, array.length);
    return array[index];
  }

  /**
   * 重置随机数生成器到初始状态
   */
  reset() {
    this.rng = seedrandom(this.seed.toString());
    this.callCount = 0;
  }

  /**
   * 获取当前调用次数（用于调试）
   */
  getCallCount() {
    return this.callCount;
  }

  /**
   * 获取seed
   */
  getSeed() {
    return this.seed;
  }
}

// 全局单例实例（将在游戏初始化时设置）
let TD_RANDOM = null;

/**
 * 初始化全局随机数生成器
 */
function initRandom(seed) {
  if (TD_RANDOM !== null) {
    console.warn('TD_RANDOM already initialized, resetting with new seed');
  }
  TD_RANDOM = new RandomGenerator(seed);
  return TD_RANDOM;
}

/**
 * 获取全局随机数生成器
 */
function getRandom() {
  if (TD_RANDOM === null) {
    throw new Error('TD_RANDOM not initialized. Call initRandom(seed) first.');
  }
  return TD_RANDOM;
}

/**
 * 开发环境禁用Math.random()
 * 防止意外使用非确定性随机数
 */
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const originalMathRandom = Math.random;
  Math.random = function() {
    console.error(
      'Math.random() is forbidden! Use TD_RANDOM.next() instead.\n' +
      'Stack trace:',
      new Error().stack
    );
    throw new Error('Math.random() is forbidden! Use TD_RANDOM.next() instead.');
  };

  // 保留原始函数的引用，以防某些库需要
  Math.random.original = originalMathRandom;
}

export { RandomGenerator, initRandom, getRandom, TD_RANDOM };
export default RandomGenerator;
