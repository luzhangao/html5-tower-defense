const WAVE_CONFIG = {
  waitNewWaveTicks: 72,
  difficulty: 1.0,
  maxMonstersPerWave: 100,
  waves: [
    [],
    [[1, 0]],
    [[1, 0], [1, 1]],
    [[2, 0], [1, 1]],
    [[2, 0], [1, 1]],
    [[3, 0], [2, 1]],
    [[4, 0], [2, 1]],
    [[5, 0], [3, 1], [1, 2]],
    [[6, 0], [4, 1], [1, 2]],
    [[7, 0], [3, 1], [2, 2]],
    [[8, 0], [4, 1], [3, 2]]
  ]
};

function makeMonsters(count, monsterTypeCount, random) {
  const list = [];
  let generated = 0;
  const maxBatch = 3;
  while (generated < count) {
    const remaining = count - generated;
    const batch = Math.min(Math.floor(random.next() * remaining) + 1, maxBatch);
    const monsterType = Math.floor(random.next() * monsterTypeCount);
    list.push([batch, monsterType]);
    generated += batch;
  }
  return list;
}

function getWaveData(wave, monsterTypeCount, random) {
  const predefined = WAVE_CONFIG.waves[wave];
  if (predefined && predefined.length) {
    return predefined.map((pair) => [pair[0], pair[1]]);
  }
  const count = Math.min(Math.floor(Math.pow(wave, 1.1)), WAVE_CONFIG.maxMonstersPerWave);
  return makeMonsters(count, monsterTypeCount, random);
}

export { WAVE_CONFIG, getWaveData };
