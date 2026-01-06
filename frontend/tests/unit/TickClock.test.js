const TickClock = require('../../src/core/TickClock');

describe('TickClock', () => {
  test('advances ticks based on deltaTime and tickRate', () => {
    const clock = new TickClock(10); // 100ms per tick
    expect(clock.update(50)).toHaveLength(0);
    const ticks = clock.update(60);
    expect(ticks).toEqual([1]);
    expect(clock.getCurrentTick()).toBe(1);
  });

  test('honors gameSpeed and max ticks per frame', () => {
    const clock = new TickClock(10);
    clock.setGameSpeed(2);
    const ticks = clock.update(100);
    expect(ticks).toEqual([1, 2]);
    expect(clock.getCurrentTick()).toBe(2);
  });

  test('pauses and resumes', () => {
    const clock = new TickClock(10);
    clock.setPaused(true);
    expect(clock.update(200)).toHaveLength(0);
    clock.setPaused(false);
    expect(clock.update(100)).toEqual([1]);
  });
});
