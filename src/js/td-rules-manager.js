/*
 * RulesManager - versioned rules for deterministic validation.
 */

// _TD.a.push begin
_TD.a.push(function (TD) {
	var RULES_VERSION = "1.0.0";
	// 规则版本号必须和后端/验证器一致

	var RULES = {
		"1.0.0": {
			version: "1.0.0",
			tickRate: 24,
			buildings: {
				wall: {
					damage: 0,
					range: 0,
					speed: 0,
					bullet_speed: 0,
					life: 100,
					shield: 500,
					cost: 5
				},
				cannon: {
					damage: 12,
					range: 4,
					max_range: 8,
					speed: 2,
					bullet_speed: 6,
					life: 100,
					shield: 100,
					cost: 300,
					_upgrade_rule_damage: function (old_level, old_value) {
						return old_value * (old_level <= 10 ? 1.2 : 1.3);
					}
				},
				LMG: {
					damage: 5,
					range: 5,
					max_range: 10,
					speed: 3,
					bullet_speed: 6,
					life: 100,
					shield: 50,
					cost: 100
				},
				HMG: {
					damage: 30,
					range: 3,
					max_range: 5,
					speed: 3,
					bullet_speed: 5,
					life: 100,
					shield: 200,
					cost: 800,
					_upgrade_rule_damage: function (old_level, old_value) {
						return old_value * 1.3;
					}
				},
				laser_gun: {
					damage: 25,
					range: 6,
					max_range: 10,
					speed: 20,
					life: 100,
					shield: 100,
					cost: 2000
				}
			},
			monsters: [
				{
					name: "monster 1",
					desc: "weak monster",
					speed: 3,
					max_speed: 10,
					life: 50,
					damage: 1,
					shield: 0,
					money: 5
				},
				{
					name: "monster 2",
					desc: "normal monster",
					speed: 6,
					max_speed: 20,
					life: 50,
					damage: 2,
					shield: 1
				},
				{
					name: "monster speed",
					desc: "fast monster",
					speed: 12,
					max_speed: 30,
					life: 50,
					damage: 3,
					shield: 1
				},
				{
					name: "monster life",
					desc: "tank monster",
					speed: 5,
					max_speed: 10,
					life: 500,
					damage: 3,
					shield: 1
				},
				{
					name: "monster shield",
					desc: "shield monster",
					speed: 5,
					max_speed: 10,
					life: 50,
					damage: 3,
					shield: 20
				},
				{
					name: "monster damage",
					desc: "damage monster",
					speed: 7,
					max_speed: 14,
					life: 50,
					damage: 10,
					shield: 2
				},
				{
					name: "monster speed-life",
					desc: "fast tank",
					speed: 15,
					max_speed: 30,
					life: 100,
					damage: 3,
					shield: 3
				},
				{
					name: "monster speed-2",
					desc: "very fast",
					speed: 30,
					max_speed: 40,
					life: 30,
					damage: 4,
					shield: 1
				},
				{
					name: "monster shield-life",
					desc: "shield tank",
					speed: 3,
					max_speed: 10,
					life: 300,
					damage: 5,
					shield: 15
				}
			],
			scoring: {
				base_score_per_wave: 100,
				time_bonus_max: 10000,
				time_bonus_decay_per_tick: 0.1,
				miss_penalty_factor: 10,
				gold_balance_bonus_factor: 0.05
			}
		}
	};

	function RulesManager() {
		this.currentVersion = RULES_VERSION;
	}

	RulesManager.prototype.getRulesVersion = function () {
		return this.currentVersion;
	};

	RulesManager.prototype.getRules = function () {
		// 按版本返回固定规则，保证可复现
		return RULES[this.currentVersion];
	};

	RulesManager.prototype.getBuildings = function () {
		return this.getRules().buildings;
	};

	RulesManager.prototype.getMonsters = function () {
		return this.getRules().monsters;
	};

	RulesManager.prototype.getScoring = function () {
		return this.getRules().scoring;
	};

	TD.RulesManager = RulesManager;
	TD.rulesManager = new RulesManager();
	TD.RULES_VERSION = RULES_VERSION;
}); // _TD.a.push end
