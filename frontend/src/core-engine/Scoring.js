function calculateFinalScore(gameState, rules) {
  const scoring = rules.scoring;
  const base_score = gameState.wave * scoring.base_score_per_wave;
  const time_bonus = Math.max(
    0,
    scoring.time_bonus_max - gameState.endTick * scoring.time_bonus_decay_per_tick
  );
  const miss_penalty = gameState.missedMonsters * scoring.miss_penalty_factor;
  const gold_balance_bonus = Math.floor(gameState.money * scoring.gold_balance_bonus_factor);

  const total = base_score + time_bonus - miss_penalty + gold_balance_bonus;
  return {
    total: Math.max(0, Math.floor(total)),
    breakdown: { base_score, time_bonus, miss_penalty, gold_balance_bonus }
  };
}

export { calculateFinalScore };
