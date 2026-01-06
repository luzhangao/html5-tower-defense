# ARCHITECTURE（系统架构）

## 总体结构
```
Browser (Legacy UI + Core Runner)
  ├─ Core Engine (frontend/src/core-engine/*)
  ├─ Legacy Renderer/UI (src/js/*)
  └─ CoreSync (src/js/td-core-sync.js)

Backend (FastAPI)
  ├─ API: /api/auth /api/game /api/leaderboard
  ├─ GameService + AntiCheatService
  └─ SQLite (users/attempts/submissions/leaderboard)

Verifier (Node)
  └─ /api/verify-core -> core-engine-bundle.js
```

## 前端
- **Core Engine**：纯逻辑、确定性、可回放（`frontend/src/core-engine/*`）。
- **Legacy UI/Renderer**：读 Core 状态渲染与交互（`src/js/*`）。
- **CoreSync**：将 Core state 映射回 legacy 渲染对象与 TD 全局（`src/js/td-core-sync.js`）。

## 后端
- **认证**：匿名 token + user_id（`backend/app/api/auth.py`）。
- **游戏流程**：start 产生 attempt + seed，submit 校验与入榜（`backend/app/services/game_service.py`）。
- **验证器代理**：`ReplayValidator` 调用 Node 验证器（`backend/app/services/validator.py`）。

## 验证器
- Express 服务（`backend/verifier/verify-core.js`），加载 `core-engine-bundle.js`。
- `webpack.config.core-verifier.js` 构建 bundle。

## 数据流（排行榜模式）
1. **Start**：前端请求 `/api/game/start` -> 获得 `attempt_id` + `seed`。
2. **Play**：动作记录为 `actions[]`（Recorder）。
3. **Submit**：前端提交 `/api/game/submit`，带 `actions` 与最终 score/level/endTick。
4. **Verify**：后端调用 verifier，复算 core state。
5. **Leaderboard**：验证通过则更新 leaderboard 表。
