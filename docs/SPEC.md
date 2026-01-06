# SPEC（规则与数据规范）

## 游戏模式
- **单机模式**：本地游玩，不提交分数。
- **排行榜模式**：开局请求 `attempt_id + seed`，结束提交 actions 与结果，后端验证后入榜。

## Tick 与时间
- 固定 Tick：`24 tps`（`frontend/src/core-engine/Rules.js`）。
- `gameSpeed` 仅影响每帧处理的 tick 数，不改变 tick 计时基础。
- Action 的 `t` 必须单调递增。

## 随机数
- 所有随机逻辑使用种子化 RNG（`RandomGenerator`），seed 来自后端 start 接口。
- 目标：同 seed + 同 actions => 同结果。

## 关卡配置（默认）
- 地图：16x16，入口 `[0,0]`，出口 `[15,15]`（`frontend/src/core-engine/LegacyEngineCore.js`）。
- 初始资源：`money = 500`，`life = 100`。
- 波次间隔：`waitNewWaveTicks = 72`（`frontend/src/core-engine/Waves.js`）。

## Action 格式
```json
{ "t": 120, "op": "place", "entityType": "cannon", "pos": [3, 5], "entityId": "E12" }
{ "t": 450, "op": "upgrade", "entityId": "E12" }
{ "t": 680, "op": "sell", "entityId": "E12" }
```

约束：
- `t` 单调递增。
- 单 tick 最多 2 次操作（`src/js/td-recorder.js`）。

## 规则版本
- 当前规则版本：`1.0.0`（`frontend/src/core-engine/Rules.js`）。
- 建筑/怪物参数与计分规则均由规则版本决定。

## 计分公式
来源：`frontend/src/core-engine/Scoring.js`
```
base_score = wave * base_score_per_wave
time_bonus = max(0, time_bonus_max - endTick * time_bonus_decay_per_tick)
miss_penalty = missedMonsters * miss_penalty_factor
gold_balance_bonus = floor(money * gold_balance_bonus_factor)
total = max(0, floor(base_score + time_bonus - miss_penalty + gold_balance_bonus))
```
默认参数（`Rules.js`）：`base_score_per_wave=100`，`time_bonus_max=10000`，`time_bonus_decay_per_tick=0.1`，`miss_penalty_factor=10`，`gold_balance_bonus_factor=0.05`。

## 提交载荷（排行榜模式）
```json
{
  "attempt_id": "...",
  "rules_version": "1.0.0",
  "score_claim": 8814,
  "level_claim": 12,
  "end_tick": 19984,
  "money": 1073,
  "actions": [ ... ]
}
```
