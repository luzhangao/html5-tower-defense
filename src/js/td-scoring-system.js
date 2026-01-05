/*
 * ScoringSystem - calculates final score from deterministic state.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	function ScoringSystem() {}

	ScoringSystem.calculateFinalScore = function (gameState, rules) {
		var scoring = rules.scoring;
		var base_score = gameState.wave * scoring.base_score_per_wave;
		var time_bonus = Math.max(
			0,
			scoring.time_bonus_max - gameState.endTick * scoring.time_bonus_decay_per_tick
		);
		var miss_penalty = gameState.missedMonsters * scoring.miss_penalty_factor;
		var gold_balance_bonus = Math.floor(gameState.money * scoring.gold_balance_bonus_factor);

		var total = base_score + time_bonus - miss_penalty + gold_balance_bonus;
		return {
			total: Math.max(0, Math.floor(total)),
			breakdown: {
				base_score: base_score,
				time_bonus: time_bonus,
				miss_penalty: miss_penalty,
				gold_balance_bonus: gold_balance_bonus
			}
		};
	};

	TD.ScoringSystem = ScoringSystem;
}); // _TD.a.push end
