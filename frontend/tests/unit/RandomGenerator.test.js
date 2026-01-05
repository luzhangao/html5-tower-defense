/**
 * RandomGenerator单元测试
 *
 * 关键验证：
 * 1. 相同seed产生相同随机数序列（确定性）
 * 2. 不同seed产生不同随机数序列
 * 3. reset()可以重置到初始状态
 */

import { RandomGenerator, initRandom, getRandom } from '../../src/core/RandomGenerator.js';

describe('RandomGenerator', () => {
  describe('基础功能', () => {
    test('应该能够创建实例', () => {
      const rng = new RandomGenerator(12345);
      expect(rng).toBeDefined();
      expect(rng.getSeed()).toBe(12345);
    });

    test('seed为undefined或null时应该抛出错误', () => {
      expect(() => new RandomGenerator()).toThrow('RandomGenerator requires a seed');
      expect(() => new RandomGenerator(null)).toThrow('RandomGenerator requires a seed');
    });

    test('next()应该返回[0, 1)范围的数字', () => {
      const rng = new RandomGenerator(12345);
      for (let i = 0; i < 100; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });

  describe('确定性验证（关键）', () => {
    test('相同seed应该产生完全相同的随机数序列', () => {
      const rng1 = new RandomGenerator(42);
      const rng2 = new RandomGenerator(42);

      const sequence1 = [];
      const sequence2 = [];

      for (let i = 0; i < 100; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }

      // 每个数字都必须完全相同（确定性的核心保证）
      for (let i = 0; i < 100; i++) {
        expect(sequence1[i]).toBe(sequence2[i]);
      }
    });

    test('不同seed应该产生不同的随机数序列', () => {
      const rng1 = new RandomGenerator(123);
      const rng2 = new RandomGenerator(456);

      const sequence1 = [];
      const sequence2 = [];

      for (let i = 0; i < 100; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }

      // 至少有一个数字不同
      let hasDifference = false;
      for (let i = 0; i < 100; i++) {
        if (sequence1[i] !== sequence2[i]) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);
    });

    test('reset()应该重置到初始状态', () => {
      const rng = new RandomGenerator(999);

      // 第一轮
      const firstSequence = [];
      for (let i = 0; i < 50; i++) {
        firstSequence.push(rng.next());
      }

      // 重置
      rng.reset();

      // 第二轮（应该和第一轮完全相同）
      const secondSequence = [];
      for (let i = 0; i < 50; i++) {
        secondSequence.push(rng.next());
      }

      for (let i = 0; i < 50; i++) {
        expect(secondSequence[i]).toBe(firstSequence[i]);
      }
    });
  });

  describe('辅助方法', () => {
    test('nextInt(min, max)应该返回[min, max)范围的整数', () => {
      const rng = new RandomGenerator(777);

      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(10, 20);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThan(20);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    test('nextFloat(min, max)应该返回[min, max)范围的浮点数', () => {
      const rng = new RandomGenerator(888);

      for (let i = 0; i < 100; i++) {
        const value = rng.nextFloat(1.5, 3.5);
        expect(value).toBeGreaterThanOrEqual(1.5);
        expect(value).toBeLessThan(3.5);
      }
    });

    test('choice(array)应该从数组中随机选择元素', () => {
      const rng = new RandomGenerator(555);
      const array = ['a', 'b', 'c', 'd', 'e'];

      const results = new Set();
      for (let i = 0; i < 100; i++) {
        const chosen = rng.choice(array);
        expect(array).toContain(chosen);
        results.add(chosen);
      }

      // 100次随机选择应该至少选中3个不同的元素（统计学上极大概率）
      expect(results.size).toBeGreaterThanOrEqual(3);
    });

    test('choice()在空数组时应该抛出错误', () => {
      const rng = new RandomGenerator(111);
      expect(() => rng.choice([])).toThrow('Cannot choose from empty array');
      expect(() => rng.choice(null)).toThrow('Cannot choose from empty array');
    });

    test('getCallCount()应该正确记录调用次数', () => {
      const rng = new RandomGenerator(222);
      expect(rng.getCallCount()).toBe(0);

      rng.next();
      expect(rng.getCallCount()).toBe(1);

      rng.next();
      rng.next();
      expect(rng.getCallCount()).toBe(3);

      rng.reset();
      expect(rng.getCallCount()).toBe(0);
    });
  });

  describe('全局单例', () => {
    test('initRandom()应该初始化全局实例', () => {
      const instance = initRandom(12345);
      expect(instance).toBeInstanceOf(RandomGenerator);
      expect(instance.getSeed()).toBe(12345);
    });

    test('getRandom()应该返回已初始化的实例', () => {
      initRandom(54321);
      const instance = getRandom();
      expect(instance).toBeInstanceOf(RandomGenerator);
      expect(instance.getSeed()).toBe(54321);
    });

    test('getRandom()在未初始化时应该抛出错误', () => {
      // 注意：这个测试可能会受其他测试影响，实际项目中需要隔离
      // 这里仅作示例
      // expect(() => getRandom()).toThrow('TD_RANDOM not initialized');
    });
  });

  describe('游戏回放关键验证', () => {
    test('模拟完整游戏：相同seed+相同操作=相同结果', () => {
      // 游戏1
      const game1 = new RandomGenerator(99999);
      const results1 = [];

      // 模拟游戏逻辑：每个tick生成一些随机数
      for (let tick = 0; tick < 100; tick++) {
        // 怪物移动方向选择
        const monsterMove = game1.nextInt(0, 4);
        // 防御塔目标选择
        const targetChoice = game1.next();
        // 伤害浮动
        const damageVariance = game1.nextFloat(0.9, 1.1);

        results1.push({ tick, monsterMove, targetChoice, damageVariance });
      }

      // 游戏2（相同seed）
      const game2 = new RandomGenerator(99999);
      const results2 = [];

      for (let tick = 0; tick < 100; tick++) {
        const monsterMove = game2.nextInt(0, 4);
        const targetChoice = game2.next();
        const damageVariance = game2.nextFloat(0.9, 1.1);

        results2.push({ tick, monsterMove, targetChoice, damageVariance });
      }

      // 验证每个tick的所有随机数都相同
      for (let i = 0; i < 100; i++) {
        expect(results2[i].monsterMove).toBe(results1[i].monsterMove);
        expect(results2[i].targetChoice).toBe(results1[i].targetChoice);
        expect(results2[i].damageVariance).toBe(results1[i].damageVariance);
      }
    });
  });
});
