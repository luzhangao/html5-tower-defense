const { RandomGenerator } = require('../../src/core/RandomGenerator');

describe('RandomGenerator', () => {
  test('produces deterministic sequence for same seed', () => {
    const a = new RandomGenerator(12345);
    const b = new RandomGenerator(12345);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  test('nextInt stays within bounds', () => {
    const rng = new RandomGenerator(7);
    const value = rng.nextInt(1, 3);
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThan(3);
  });
});
