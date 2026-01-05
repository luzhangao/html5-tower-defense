/**
 * TickClock单元测试
 */
const TickClock = require('../../src/core/TickClock');

describe('TickClock', () => {
  let tickClock;

  beforeEach(() => {
    tickClock = new TickClock(24); // 24 tps
  });

  describe('初始化', () => {
    test('应该正确初始化', () => {
      expect(tickClock.tickRate).toBe(24);
      expect(tickClock.tickDuration).toBeCloseTo(1000 / 24, 2);
      expect(tickClock.currentTick).toBe(0);
      expect(tickClock.accumulator).toBe(0);
      expect(tickClock.gameSpeed).toBe(1.0);
      expect(tickClock.isPaused).toBe(false);
    });
  });

  describe('tick推进', () => {
    test('1x速度：每帧应该处理最多1个tick', () => {
      tickClock.setGameSpeed(1);

      // 第一帧：deltaTime = 42ms（刚好一个tick）
      let ticks = tickClock.update(42);
      expect(ticks).toEqual([1]);
      expect(tickClock.currentTick).toBe(1);

      // 第二帧：deltaTime = 42ms
      ticks = tickClock.update(42);
      expect(ticks).toEqual([2]);
      expect(tickClock.currentTick).toBe(2);
    });

    test('2x速度：每帧应该处理最多2个tick', () => {
      tickClock.setGameSpeed(2);

      // deltaTime = 84ms（两个tick的时间）
      const ticks = tickClock.update(84);
      expect(ticks).toEqual([1, 2]);
      expect(tickClock.currentTick).toBe(2);
    });

    test('8x速度：每帧应该处理最多8个tick', () => {
      tickClock.setGameSpeed(8);

      // deltaTime = 336ms（8个tick的时间）
      const ticks = tickClock.update(336);
      expect(ticks).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(tickClock.currentTick).toBe(8);
    });

    test('tick推进只由真实时间决定（不受速度影响）', () => {
      // 测试：相同的真实时间下，不同速度产生相同的tick累积
      const clock1x = new TickClock(24);
      const clock8x = new TickClock(24);

      clock1x.setGameSpeed(1);
      clock8x.setGameSpeed(8);

      // 模拟10秒真实时间（每帧16.67ms，60fps）
      let totalTicks1x = 0;
      let totalTicks8x = 0;

      for (let i = 0; i < 600; i++) {  // 10秒 * 60fps
        const ticks1x = clock1x.update(16.67);
        const ticks8x = clock8x.update(16.67);
        totalTicks1x += ticks1x.length;
        totalTicks8x += ticks8x.length;
      }

      // 关键验证：两者最终tick数应该相同（约240个tick，10秒 * 24tps）
      expect(Math.abs(totalTicks1x - totalTicks8x)).toBeLessThan(5);
      expect(totalTicks1x).toBeGreaterThan(230);
      expect(totalTicks1x).toBeLessThan(250);
    });

    test('速度只影响每帧处理的tick数量，不影响tick累积速度', () => {
      // 1x速度：每帧最多处理1个tick，可能需要多帧才能处理完
      tickClock.setGameSpeed(1);

      // deltaTime = 168ms（4个tick的时间）
      // 但1x速度每帧只处理1个tick
      let ticks = tickClock.update(168);
      expect(ticks).toEqual([1]);  // 只处理了1个tick
      expect(tickClock.accumulator).toBeCloseTo(126, 0);  // 还剩3个tick的时间

      // 下一帧可以继续处理
      ticks = tickClock.update(0);  // 不增加时间
      expect(ticks).toEqual([2]);
      expect(tickClock.accumulator).toBeCloseTo(84, 0);
    });

    test('deltaTime不足一个tick时不应该推进', () => {
      const ticks = tickClock.update(20);  // 小于42ms
      expect(ticks).toEqual([]);
      expect(tickClock.currentTick).toBe(0);
      expect(tickClock.accumulator).toBe(20);
    });

    test('累积的deltaTime应该正确处理', () => {
      // 第一帧：20ms（不足一个tick）
      let ticks = tickClock.update(20);
      expect(ticks).toEqual([]);
      expect(tickClock.accumulator).toBe(20);

      // 第二帧：再加25ms，总共45ms（超过一个tick）
      ticks = tickClock.update(25);
      expect(ticks).toEqual([1]);
      expect(tickClock.accumulator).toBeCloseTo(3, 0);  // 45 - 42 ≈ 3
    });
  });

  describe('暂停/恢复', () => {
    test('暂停时不应该推进tick', () => {
      tickClock.setPaused(true);
      const ticks = tickClock.update(100);
      expect(ticks).toEqual([]);
      expect(tickClock.currentTick).toBe(0);
    });

    test('恢复后应该继续推进tick', () => {
      tickClock.setPaused(true);
      tickClock.update(100);

      tickClock.setPaused(false);
      const ticks = tickClock.update(50);
      expect(ticks.length).toBeGreaterThan(0);
    });
  });

  describe('重置', () => {
    test('应该重置所有状态', () => {
      tickClock.update(100);
      tickClock.setGameSpeed(4);
      tickClock.setPaused(true);

      tickClock.reset();

      expect(tickClock.currentTick).toBe(0);
      expect(tickClock.accumulator).toBe(0);
      expect(tickClock.isPaused).toBe(false);
      expect(tickClock.gameSpeed).toBe(4); // gameSpeed不重置
    });
  });

  describe('速度设置', () => {
    test('应该接受有效的速度值', () => {
      [1, 2, 4, 8].forEach(speed => {
        tickClock.setGameSpeed(speed);
        expect(tickClock.getGameSpeed()).toBe(speed);
      });
    });

    test('应该拒绝无效的速度值', () => {
      tickClock.setGameSpeed(3);
      expect(tickClock.getGameSpeed()).toBe(1.0);

      tickClock.setGameSpeed(10);
      expect(tickClock.getGameSpeed()).toBe(1.0);
    });
  });

  describe('Getter方法', () => {
    test('应该返回正确的值', () => {
      tickClock.update(50);

      expect(tickClock.getCurrentTick()).toBeGreaterThan(0);
      expect(tickClock.getTickRate()).toBe(24);
      expect(tickClock.getGameSpeed()).toBe(1.0);
    });
  });
});
