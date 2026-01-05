# AI_USAGE

记录本阶段（阶段1：前端核心引擎重构）使用 AI 辅助的过程与结果，便于复现与验收。

## 阶段目标
- 完成阶段1全部步骤（1.1~1.8）：固定 tick、随机数种子、实体ID、Action、Recorder、规则版本化、计分系统。
- 保持旧版引擎可运行，并对接新增系统。

## 关键步骤记录
### 步骤1.3 随机数种子化
- Prompt: “继续替换所有 Math.random()，集成 seedrandom。”
- 操作: 替换 `src/js/*.js` 中 Math.random 为 `TD_RANDOM.next()`，修正 ESLint 禁止规则。
- 验收: 全项目 `rg "Math.random"` 无结果（排除 RandomGenerator 自身）。
- 修正: 将 ESLint 规则从 `no-restricted-globals` 改为 `no-restricted-properties`，确保真正拦截 `Math.random()`.

### 步骤1.2 固定 Tick 主循环
- Prompt: “完成固定 tick 主循环，逻辑与渲染分离。”
- 操作: `src/js/td.js` 改用 `requestAnimationFrame` + TickClock；移除动态 step_time。
- 验收: 逻辑更新基于 tick 推进，渲染独立执行。
- 修正: 发现怪物移动变慢后调整 TickClock 追帧策略（见下文“变更修正”）。

### 步骤1.4/1.5/1.6 实体ID + Action + Recorder
- Prompt: “完成 EntityManager、ActionDispatcher、Recorder 并接入建造/升级/出售。”
- 操作:
  - 新增 `EntityManager`、`ActionDispatcher`、`Recorder`（legacy 与 frontend 版本）。
  - `Grid.onClick`、`Building.tryToUpgrade/tryToSell` 全部走 ActionDispatcher。
  - Recorder 记录成功操作，并限制单 tick 最多 2 次操作。
- 验收: 放置/升级/出售可用，非法操作被拦截；Recorder 有记录。
- 修正: Replay 时补充校验 `place` 必须带 `entityId`。

### 步骤1.7 规则版本化
- Prompt: “把建筑/怪物参数迁移到 RulesManager。”
- 操作: 新增 `RulesManager`，`td-cfg-buildings.js` 与 `td-cfg-monsters.js` 改为从规则读取。
- 验收: 规则值一致，原行为不变。

### 步骤1.8 分数计算系统
- Prompt: “实现 ScoringSystem 并在游戏结束计算分数。”
- 操作: `ScoringSystem.calculateFinalScore` + `td-stage.js` gameover 时计算并写回 `TD.score`。
- 验收: 游戏结束出现分数更新与记录。

## 变更修正（速度与 Tick 追帧）
- 问题: 固定 tick 后怪物移动变慢（tick 频率降低且单帧只处理 1 tick）。
- 修正: TickClock 更新为 “按真实时间推进 + 每帧最多处理 N tick（gameSpeed）+ 限制 deltaTime/积压丢弃”。
- 验收: 速度恢复正常，gameSpeed 继续生效。

## 产出文件（本阶段新增/修改）
- 新增系统: `src/js/td-random.js`, `src/js/td-tick-clock.js`, `src/js/td-entity-manager.js`, `src/js/td-action-dispatcher.js`, `src/js/td-recorder.js`, `src/js/td-rules-manager.js`, `src/js/td-scoring-system.js`
- Legacy 接入: `src/js/td.js`, `src/js/td-obj-grid.js`, `src/js/td-obj-building.js`, `src/js/td-stage.js`, `src/js/td-cfg-buildings.js`, `src/js/td-cfg-monsters.js`
- Frontend 对应模块: `frontend/src/core/EntityManager.js`, `frontend/src/systems/ActionSystem.js`, `frontend/src/systems/Recorder.js`, `frontend/src/systems/RulesManager.js`, `frontend/src/systems/ScoringSystem.js`
- 文档更新: `docs/PLAN.md`

## 未覆盖内容
- 阶段3~7（网络/排行榜、后端、测试、文档、部署）尚未开始。

## 阶段2 工作记录
### 步骤2.1 游戏速度控制
- Prompt: “继续 step2，增加游戏倍速控制。”
- 操作: 新增 `SpeedController`，加入面板按钮与快捷键（F），绑定 TickClock 的 gameSpeed。
- 验收: 面板显示 Speed，点击或按 F 切换 1x/2x/4x/8x。

### 步骤2.2 音效系统
- Prompt: “为防御塔增加攻击音效。”
- 操作: 新增 `AudioSystem`，在 `Building.fire()` 中触发播放；添加音效文件占位路径。
- 验收: 开火时触发对应音效播放（浏览器可能因自动播放策略而延迟）。

### 步骤2.3 关卡进度
- Prompt: “增加关卡进度并持久化最高关卡。”
- 操作: 记录 `max_wave` 到 localStorage，面板显示 Max Wave。
- 验收: 重新载入后最高关卡保持不变并显示。

## 阶段3 工作记录
### 步骤3.1/3.2 API 与匿名身份
- Prompt: “继续 step3，新增 APIClient 与 AuthManager。”
- 操作: 实现 APIClient（start/submit/leaderboard）与 AuthManager（匿名身份、token 持久化）。
- 验收: 本地生成 token/user_id，API 调用携带 Authorization。

### 步骤3.3 排行榜 UI
- Prompt: “添加排行榜 UI（Top100 + 我的排名 + 刷新）。”
- 操作: 新增 DOM 面板与 LeaderboardUI，支持打开、刷新、展示列表与我的排名。
- 验收: 点击 Leaderboard 打开面板，刷新后列表更新。

### 步骤3.4 排行榜模式集成
- Prompt: “集成排行榜模式（start/submit）。”
- 操作: 增加 Leaderboard 模式按钮，开局请求 seed，结束自动提交并显示状态。
- 验收: 开局状态提示“Attempt ready”，结束后显示提交结果。
