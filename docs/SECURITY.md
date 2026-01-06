# SECURITY（防作弊与安全策略）

## 核心策略
- **确定性回放验证**：服务端调用 Node verifier 复算 score/level/endTick，客户端仅提交声明值。
- **Attempt 机制**：每局唯一 `attempt_id`，提交后标记为 used，防重复提交。
- **规则版本一致性**：提交携带 `rules_version`，不一致直接拒绝。
- **提交频率限制**：`AntiCheatService` 限制单位时间内提交次数。
- **可疑操作检测**：检测等间隔动作序列（`is_suspicious_pattern`）。
- **排行榜阈值**：未达到 Top100+margin 阈值的分数不进入排行榜，降低验证压力。

## 传输与鉴权
- 匿名 token（JWT）用于简单鉴权，token 存在 localStorage。
- CORS 仅允许本地开发地址（`http://localhost:8081`）。

## 已知限制
- 目前为本地开发模式，未引入 HTTPS 与强制 CSRF 防护。
- 防作弊主要依赖回放验证，无法阻止客户端 UI 篡改，但可阻止入榜。
- 若 verifier 不可用，提交会失败（需要保障 verifier 在线）。

## 推荐后续增强
- 引入 HTTPS 与服务端速率限制（IP + user_id）。
- 丰富异常动作检测（例如操作频率、资金曲线异常）。
- 报警与审计日志分级（用户、尝试、验证结果）。
