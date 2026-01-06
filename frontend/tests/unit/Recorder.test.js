const Recorder = require('../../src/systems/Recorder').default;

describe('Recorder', () => {
  test('records actions with per-tick limit', () => {
    const recorder = new Recorder();
    recorder.init(1, '1.0.0');
    recorder.record({ t: 1, op: 'place' });
    recorder.record({ t: 1, op: 'upgrade' });
    expect(() => recorder.record({ t: 1, op: 'sell' })).toThrow('Too many actions in single tick');
  });

  test('finalize and export', () => {
    const recorder = new Recorder();
    recorder.init(42, '1.0.0');
    recorder.record({ t: 2, op: 'place' });
    recorder.finalize({ score: 100, wave: 3, endTick: 50, missedMonsters: 0, money: 10 });
    const out = recorder.export();
    expect(out.seed).toBe(42);
    expect(out.rulesVersion).toBe('1.0.0');
    expect(out.actions).toHaveLength(1);
    expect(out.result.score).toBe(100);
  });
});
