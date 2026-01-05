# HTML5 塔防游戏重构实施计划

## 项目概述

这是一个基于原生JavaScript + Canvas的塔防游戏的全面重构项目。目标是添加排行榜功能和完善的防作弊机制，同时将后端从Python2迁移到Python3。

## 整体架构

### 前后端分离架构

```
前端 (Browser)                    后端 (Python3 + FastAPI)
├── 游戏引擎 (原生JS)              ├── API服务
├── Action记录系统                 ├── 回放验证器 (调用Node.js)
├── 排行榜UI                       ├── 数据库 (SQLite3)
└── 网络客户端                     └── 防作弊系统
```

### 游戏模式

1. **单机模式**：允许作弊，不计入榜单
2. **排行榜模式**：防作弊，验证后入榜

## 核心技术要点

### 1. 固定Tick系统（逻辑与渲染分离）

**当前问题**：
- `src/js/td.js:130-167` 使用`setTimeout`和动态`step_time`
- `iframe`作为帧计数器，不是确定性的tick
- 逻辑与渲染耦合

**重构方案**：
```javascript
// 固定tick时钟，24 tps (ticks per second)
class TickClock {
  constructor(tickRate = 24) {
    this.tickRate = tickRate;
    this.tickDuration = 1000 / tickRate;  // 每个tick约42ms
    this.currentTick = 0;
    this.accumulator = 0;
    this.gameSpeed = 1.0;  // 游戏速度倍率(1x, 2x, 4x, 8x)
  }

  update(deltaTime) {
    // 关键：tick的推进只由真实时间决定（不乘speed）
    this.accumulator += deltaTime;  // 注意：这里不乘gameSpeed

    const ticksToProcess = [];
    // gameSpeed控制每帧最多处理多少tick（快进效果）
    const maxTicksPerFrame = Math.ceil(this.gameSpeed);
    let ticksProcessed = 0;

    while (this.accumulator >= this.tickDuration && ticksProcessed < maxTicksPerFrame) {
      this.currentTick++;
      ticksToProcess.push(this.currentTick);
      this.accumulator -= this.tickDuration;
      ticksProcessed++;
    }
    return ticksToProcess;
  }

  setGameSpeed(speed) {
    this.gameSpeed = speed;  // 1, 2, 4, 8
  }
}

// 主循环改用requestAnimationFrame
function gameLoop(currentTime) {
  const deltaTime = currentTime - lastFrameTime;
  lastFrameTime = currentTime;

  // 逻辑更新（固定tick）
  // speed=1x: 每帧处理最多1个tick
  // speed=8x: 每帧处理最多8个tick（快进）
  const ticks = tickClock.update(deltaTime);
  for (const tick of ticks) {
    updateGameLogic(tick);  // 处理怪物移动、建筑攻击等
  }

  // 渲染（可变帧率）
  render();

  requestAnimationFrame(gameLoop);
}
```

**关键说明**：
- tick的推进只由真实时间决定，不受速度倍率影响
- gameSpeed只控制"每帧最多处理多少tick"
- 例如：
  - 1x速度：每帧最多处理1个tick，游戏正常速度
  - 8x速度：每帧最多处理8个tick，游戏快进8倍
- 相同的游戏策略会产生相同的endTick（因为tick推进由真实时间决定）
- 分数不受速度影响，因为分数基于endTick计算

**改动文件**：
- `src/js/td.js` - 重写step()方法

### 2. 随机数种子化

**问题位置**（12处Math.random）：
1. `src/js/td-walk.js:141` - 路径选择
2. `src/js/td-cfg-monsters.js:182,185` - 怪物波次生成
3. `src/js/td-obj-monster.js:25,31,39,186` - 怪物属性和重新寻路
4. `src/js/td-obj-building.js:200` - 建筑目标选择
5. `src/js/td-lang.js:135,147-149,180` - 工具函数

**解决方案**：
```bash
# 安装seedrandom库
npm install seedrandom
```

```javascript
// 创建全局随机数生成器
import seedrandom from 'seedrandom';

class RandomGenerator {
  constructor(seed) {
    this.seed = seed;
    this.rng = seedrandom(seed.toString());
  }
  next() {
    return this.rng();
  }
}

// 全局实例
let TD_RANDOM = null;
function initRandom(seed) {
  TD_RANDOM = new RandomGenerator(seed);
}

// 开发环境禁用Math.random
if (process.env.NODE_ENV !== 'production') {
  Math.random = function() {
    throw new Error('Math.random() is forbidden! Use TD_RANDOM.next() instead.');
  };
}
```

**改动策略**：
- 逐个文件替换所有`Math.random()`为`TD_RANDOM.next()`
- 添加ESLint规则禁用Math.random

### 3. Action系统

**Action格式**：
```javascript
// 建造
{ t: 120, op: "place", entityType: "cannon", pos: [3, 5], entityId: "E12" }

// 升级
{ t: 450, op: "upgrade", entityId: "E12" }

// 出售
{ t: 680, op: "sell", entityId: "E12" }
```

**ActionDispatcher**（统一入口）：
```javascript
class ActionDispatcher {
  dispatch(action, isReplay = false) {
    // 1. 验证tick单调递增
    if (action.t < this.lastActionTick) {
      throw new Error('Tick must be monotonically increasing');
    }

    // 2. 操作特定验证
    switch (action.op) {
      case 'place':
        this.validatePlace(action);  // 检查金币、位置、阻塞
        break;
      case 'upgrade':
        this.validateUpgrade(action);  // 检查entityId、金币
        break;
      case 'sell':
        this.validateSell(action);  // 检查entityId
        break;
    }

    // 3. 执行操作（扣钱、修改状态）
    const result = this.execute(action, isReplay);

    // 4. 记录到Recorder（只记录成功的操作）
    if (!isReplay) {
      this.recorder.record({...action, ...result});
    }

    return result;
  }
}
```

**改动文件**：
- `src/js/td-obj-grid.js` - 建造逻辑改为ActionDispatcher
- `src/js/td-obj-building.js` - upgrade/sell改为ActionDispatcher

### 4. 实体ID管理

**EntityManager**：
```javascript
const EntityState = {
  NON_EXISTENT: 'NON_EXISTENT',
  ACTIVE: 'ACTIVE',
  REMOVED: 'REMOVED'
};

class EntityManager {
  constructor() {
    this.entities = new Map();
    this.nextEntityId = 1;
  }

  create(type, gridPos, data) {
    const entityId = `E${this.nextEntityId++}`;
    this.entities.set(entityId, {
      id: entityId,
      state: EntityState.ACTIVE,
      type, gridPos, data,
      createdAtTick: currentTick
    });
    return entityId;
  }

  remove(entityId) {
    const entity = this.entities.get(entityId);
    entity.state = EntityState.REMOVED;
    entity.removedAtTick = currentTick;
  }
}
```

**改动文件**：
- `src/js/td-obj-building.js` - 添加entityId属性

### 5. 游戏记录器

**Recorder**：
```javascript
class Recorder {
  constructor() {
    this.seed = null;
    this.rulesVersion = null;
    this.actions = [];  // 按事件序列存储
    this.result = null;
  }

  init(seed, rulesVersion) {
    this.seed = seed;
    this.rulesVersion = rulesVersion;
    this.actions = [];
  }

  record(action) {
    // 检查同一tick最多2个操作
    const actionsInCurrentTick = this.actions.filter(a => a.t === action.t);
    if (actionsInCurrentTick.length >= 2) {
      throw new Error('Too many actions in single tick');
    }
    this.actions.push(action);
  }

  finalize(finalState) {
    this.result = {
      score: finalState.score,
      wave: finalState.wave,
      endTick: currentTick,
      missedMonsters: finalState.missedMonsters,
      money: finalState.money
    };
  }

  export() {
    return {
      seed: this.seed,
      rulesVersion: this.rulesVersion,
      actions: this.actions,
      result: this.result
    };
  }
}
```

### 6. 规则版本化

**RulesManager**：
```javascript
const RULES_VERSION = "1.0.0";

const RULES = {
  "1.0.0": {
    version: "1.0.0",
    tickRate: 24,

    buildings: {
      // 从td-cfg-buildings.js复制所有参数
      wall: { damage: 0, range: 0, cost: 5, ... },
      cannon: { damage: 12, range: 4, cost: 300, ... },
      // ...
    },

    monsters: [
      // 从td-cfg-monsters.js复制所有参数
      { idx: 0, speed: 3, life: 50, damage: 1, ... },
      // ...
    ],

    scoring: {
      base_score_per_wave: 100,
      time_bonus_max: 10000,           // 最大时间奖励
      time_bonus_decay_per_tick: 0.1,  // 每tick衰减0.1分
      miss_penalty_factor: 10,         // 每漏一个怪扣10分
      gold_balance_bonus_factor: 0.05  // 金币 × 5%
    }
  }
};
```

**改动文件**：
- `src/js/td-cfg-buildings.js` - 改为从RulesManager读取
- `src/js/td-cfg-monsters.js` - 改为从RulesManager读取

### 7. 分数计算系统

**ScoringSystem**（关键：时间越短分数越高）：
```javascript
class ScoringSystem {
  static calculateFinalScore(gameState, rules) {
    const {wave, endTick, missedMonsters, money} = gameState;
    const {scoring} = rules;

    // 基础分数
    const base_score = wave * scoring.base_score_per_wave;

    // 时间奖励（时间越短，分数越高）
    // time_bonus从最大值开始，随tick增加而递减
    const time_bonus = Math.max(
      0,
      scoring.time_bonus_max - endTick * scoring.time_bonus_decay_per_tick
    );

    // 漏怪惩罚
    const miss_penalty = missedMonsters * scoring.miss_penalty_factor;

    // 金币余额奖励
    const gold_balance_bonus = Math.floor(
      money * scoring.gold_balance_bonus_factor
    );

    const total = base_score + time_bonus - miss_penalty + gold_balance_bonus;

    return {
      total: Math.max(0, Math.floor(total)),
      breakdown: { base_score, time_bonus, miss_penalty, gold_balance_bonus }
    };
  }
}
```

**重要说明**：
- `time_bonus = max(0, 10000 - endTick * 0.1)`
- endTick越小（游戏时间越短），time_bonus越大，总分越高
- 游戏速度倍率（1x/2x/4x/8x）不影响分数，因为相同策略产生相同的endTick

### 8. 游戏速度控制器

```javascript
class SpeedController {
  constructor(gameEngine) {
    this.speeds = [1, 2, 4, 8];
    this.currentSpeedIndex = 0;
  }

  setSpeed(speedMultiplier) {
    // 速度倍率影响accumulator累积速度
    // 让游戏"看起来更快"，但endTick生成逻辑不变
    gameEngine.tickClock.renderSpeedMultiplier = speedMultiplier;
  }

  cycleSpeed() {
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % 4;
    this.setSpeed(this.speeds[this.currentSpeedIndex]);
  }
}
```

**UI集成**：
- 添加速度控制按钮（显示当前倍速）
- 快捷键切换速度

### 9. 音效系统

```javascript
class AudioSystem {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.poolSize = 3;  // 音效对象池
  }

  async preload() {
    const soundFiles = {
      cannon_fire: './assets/sounds/cannon.mp3',
      lmg_fire: './assets/sounds/lmg.mp3',
      hmg_fire: './assets/sounds/hmg.mp3',
      laser_fire: './assets/sounds/laser.mp3'
    };

    for (const [key, path] of Object.entries(soundFiles)) {
      const pool = [];
      for (let i = 0; i < this.poolSize; i++) {
        const audio = new Audio(path);
        audio.volume = 0.3;
        pool.push(audio);
      }
      this.sounds[key] = pool;
    }
  }

  play(soundName) {
    if (!this.enabled) return;
    const pool = this.sounds[soundName];
    const sound = pool.find(s => s.paused || s.ended);
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }
}
```

**集成位置**：
- `src/js/td-obj-building.js` 的`fire()`方法中调用`audioSystem.play(soundName)`

## 后端架构

### 技术栈

- **语言版本**：Python 3.14.2, Node.js 24.12.0（从`.tool-versions`读取）
- **框架**：FastAPI
- **数据库**：SQLite3 + SQLAlchemy
- **验证器**：Node.js（复用前端游戏引擎）
- **测试**：pytest

### 项目结构

```
backend/
├── app/
│   ├── main.py                  # FastAPI应用入口
│   ├── config.py
│   ├── models/                  # SQLAlchemy模型
│   │   ├── user.py
│   │   ├── attempt.py
│   │   ├── submission.py
│   │   └── leaderboard.py
│   ├── api/                     # API路由
│   │   ├── auth.py              # 匿名身份认证
│   │   ├── game.py              # 游戏相关
│   │   └── leaderboard.py
│   ├── services/                # 业务逻辑
│   │   ├── auth_service.py
│   │   ├── game_service.py
│   │   ├── validator.py         # 调用Node.js验证
│   │   └── anticheat.py         # 防作弊
│   └── database/
│       └── connection.py
├── verifier/                    # Node.js验证服务
│   ├── verify.js                # 验证脚本
│   ├── engine-bundle.js         # 打包的前端引擎
│   └── package.json
├── tests/                       # pytest测试
└── requirements.txt
```

### 数据库设计

**users表**：
```sql
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,        -- UUID
    token_hash TEXT NOT NULL,         -- JWT token哈希
    created_at DATETIME NOT NULL,
    last_active DATETIME
);
```

**attempts表**（游戏尝试记录）：
```sql
CREATE TABLE attempts (
    attempt_id TEXT PRIMARY KEY,      -- 随机生成
    user_id TEXT NOT NULL,
    seed INTEGER NOT NULL,            -- 随机种子
    rules_version TEXT NOT NULL,      -- 规则版本号
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,     -- 过期时间（60分钟）
    used BOOLEAN DEFAULT FALSE,       -- 是否已使用
    used_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE INDEX idx_attempts_user ON attempts(user_id);
CREATE INDEX idx_attempts_expires ON attempts(expires_at);
```

**submissions表**（成绩提交记录）：
```sql
CREATE TABLE submissions (
    submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score_claim INTEGER NOT NULL,     -- 客户端声明分数
    score_actual INTEGER,              -- 服务端验证分数
    level_claim INTEGER NOT NULL,
    level_actual INTEGER,
    actions TEXT NOT NULL,             -- JSON格式的actions数组
    validation_result TEXT,            -- 验证结果（JSON）
    submitted_at DATETIME NOT NULL,
    validated_at DATETIME,
    FOREIGN KEY (attempt_id) REFERENCES attempts(attempt_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE INDEX idx_submissions_user ON submissions(user_id);
```

**leaderboard表**（排行榜）：
```sql
CREATE TABLE leaderboard (
    entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,     -- 每个用户只保留最高分
    score INTEGER NOT NULL,
    level INTEGER NOT NULL,
    money INTEGER,
    end_tick INTEGER,
    actions TEXT NOT NULL,            -- 回放数据
    rules_version TEXT NOT NULL,
    submitted_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE INDEX idx_leaderboard_score ON leaderboard(score DESC);
```

### API接口设计

#### 1. 匿名身份认证

**POST /api/auth/anonymous**
```json
// Request: {}

// Response:
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. 开始游戏

**POST /api/game/start**
```json
// Request:
{
  "rules_version": "1.0.0"
}

// Response:
{
  "attempt_id": "abc123def456",
  "seed": 1234567890,
  "rules_version": "1.0.0",
  "expires_at": "2026-01-04T15:30:00Z"
}
```

#### 3. 提交成绩

**POST /api/game/submit**
```json
// Request:
{
  "attempt_id": "abc123def456",
  "rules_version": "1.0.0",
  "score_claim": 15320,
  "level_claim": 15,
  "actions": [
    { "t": 120, "op": "place", "entityType": "cannon", "pos": [3, 5], "entityId": "E1" },
    { "t": 450, "op": "upgrade", "entityId": "E1" },
    // ...
  ]
}

// Response (成功入榜):
{
  "success": true,
  "score": 15320,
  "entered_leaderboard": true,
  "rank": 42,
  "breakdown": {
    "base_score": 1500,
    "time_bonus": 8200,
    "miss_penalty": 20,
    "gold_balance_bonus": 5640
  }
}

// Response (未入榜):
{
  "success": true,
  "score": 2500,
  "entered_leaderboard": false,
  "threshold": 5000,
  "reason": "Score below threshold"
}

// Response (验证失败):
{
  "success": false,
  "reason": "Invalid action at tick 450: Entity ID does not exist",
  "entered_leaderboard": false
}
```

#### 4. 获取排行榜

**GET /api/leaderboard?limit=100**
```json
// Response:
{
  "entries": [
    {
      "rank": 1,
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "score": 25000,
      "level": 20,
      "submitted_at": "2026-01-04T12:00:00Z"
    },
    // ...
  ],
  "total": 150
}
```

#### 5. 获取我的排名

**GET /api/leaderboard/me**
```json
// Response:
{
  "rank": 42,
  "score": 15320,
  "level": 15,
  "submitted_at": "2026-01-04T12:30:00Z"
}
```

### 回放验证流程

**关键设计**：后端通过HTTP API调用独立的Node.js验证服务，复用前端游戏引擎代码

**架构方案**：
```
后端 (Python + FastAPI)              验证器 (Node.js + Express)
Docker Container: backend             Docker Container: verifier
├── 接收成绩提交                      ├── 提供验证API
├── 调用验证API   ─────HTTP───────>  ├── 复用前端引擎
└── 更新排行榜                        └── 返回验证结果

Docker Network: td-network
```

**backend/app/services/validator.py**（Python端，通过HTTP调用）：
```python
import httpx
import json
from typing import Dict, Any

class ReplayValidator:
    def __init__(self, verifier_url: str = None):
        # 从环境变量读取验证器URL
        # 生产环境: http://verifier:3000
        # 开发环境: http://localhost:3000
        self.verifier_url = verifier_url or os.getenv(
            'VERIFIER_URL',
            'http://verifier:3000'
        )

    async def validate(
        self,
        seed: int,
        rules_version: str,
        actions: list,
        claimed_score: int,
        claimed_level: int
    ) -> 'ValidationResult':
        """通过HTTP API调用Node.js验证服务"""
        payload = {
            'seed': seed,
            'rulesVersion': rules_version,
            'actions': actions,
            'claimedScore': claimed_score,
            'claimedLevel': claimed_level
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f'{self.verifier_url}/api/verify',
                    json=payload
                )

                if response.status_code != 200:
                    return ValidationResult(
                        valid=False,
                        error=f'Verifier error: {response.text}'
                    )

                result = response.json()
                return ValidationResult(
                    valid=result.get('valid', False),
                    score=result.get('score'),
                    level=result.get('level'),
                    breakdown=result.get('breakdown'),
                    error=result.get('error')
                )

        except httpx.TimeoutException:
            return ValidationResult(
                valid=False,
                error='Verification timeout (game too long)'
            )
        except Exception as e:
            return ValidationResult(
                valid=False,
                error=f'Verification error: {str(e)}'
            )

class ValidationResult:
    def __init__(self, valid, score=None, level=None, breakdown=None, error=None):
        self.valid = valid
        self.score = score
        self.level = level
        self.breakdown = breakdown or {}
        self.error = error
```

**verifier/server.js**（Node.js验证服务，Express API）：
```javascript
const express = require('express');
const GameEngine = require('./engine-bundle.js');

const app = express();
app.use(express.json({ limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 验证API
app.post('/api/verify', (req, res) => {
  try {
    const { seed, rulesVersion, actions, claimedScore, claimedLevel } = req.body;

    // 参数验证
    if (!seed || !rulesVersion || !actions) {
      return res.status(400).json({
        valid: false,
        error: 'Missing required parameters'
      });
    }

    // 执行回放验证
    const result = verifyReplay({
      seed,
      rulesVersion,
      actions,
      claimedScore,
      claimedLevel
    });

    res.json(result);

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      valid: false,
      error: `Verification error: ${error.message}`
    });
  }
});

function verifyReplay(input) {
  const { seed, rulesVersion, actions } = input;

  // 初始化无头引擎
  const engine = new GameEngine({
    seed,
    rulesVersion,
    headless: true  // 不渲染
  });

  // 回放所有actions
  for (const action of actions) {
    // 推进到指定tick
    while (engine.currentTick < action.t) {
      engine.tick();
      if (engine.currentTick > 100000) {
        return { valid: false, error: 'Game too long (>100000 ticks)' };
      }
    }

    // 执行action
    try {
      engine.actionDispatcher.dispatch(action, true);
    } catch (error) {
      return {
        valid: false,
        error: `Invalid action at tick ${action.t}: ${error.message}`
      };
    }
  }

  // 运行到游戏结束
  while (!engine.isGameOver() && engine.currentTick < 100000) {
    engine.tick();
  }

  // 计算分数
  const finalState = engine.getFinalState();
  const scoringResult = engine.calculateScore(finalState);

  return {
    valid: true,
    score: scoringResult.total,
    level: finalState.wave,
    breakdown: scoringResult.breakdown
  };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Verifier service running on port ${PORT}`);
});
```

**verifier/package.json**：
```json
{
  "name": "td-verifier-service",
  "version": "1.0.0",
  "description": "Tower Defense replay verification service",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "seedrandom": "^3.0.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

**构建engine-bundle.js**：
```javascript
// webpack.config.verifier.js
module.exports = {
  entry: './frontend/src/core/Engine.js',
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'backend/verifier'),
    filename: 'engine-bundle.js',
    library: { type: 'commonjs2' }
  },
  mode: 'production'
};
```

### 防作弊机制

**backend/app/services/anticheat.py**：
```python
class AntiCheatService:
    RATE_LIMIT_WINDOW = 300  # 5分钟
    MAX_SUBMISSIONS_PER_WINDOW = 10
    TOP_THRESHOLD_MARGIN = 20  # Top100 + 20

    @staticmethod
    def check_rate_limit(user_id, db):
        """检查提交频率限制"""
        cutoff_time = datetime.utcnow() - timedelta(seconds=300)
        recent_count = db.query(Submission).filter(
            Submission.user_id == user_id,
            Submission.submitted_at > cutoff_time
        ).count()

        if recent_count >= 10:
            raise RateLimitError('Too many submissions. Please wait.')

    @staticmethod
    def get_entry_threshold(db):
        """获取入榜门槛（Top100 + margin）"""
        entries = db.query(LeaderboardEntry).order_by(
            LeaderboardEntry.score.desc()
        ).limit(120).all()

        if len(entries) < 120:
            return 0

        return entries[119].score  # Top100的第120名分数

    @staticmethod
    def is_suspicious_pattern(actions):
        """检测可疑的操作模式"""
        if len(actions) == 0:
            return True

        # 检查操作间隔是否过于规律（机器人特征）
        intervals = []
        for i in range(1, len(actions)):
            intervals.append(actions[i]['t'] - actions[i-1]['t'])

        if len(set(intervals)) == 1 and len(intervals) > 10:
            return True  # 所有间隔完全相同

        return False
```

## 实施步骤（优先级排序）

### 阶段1：前端核心引擎重构（最高优先级）

#### 步骤1.1：搭建前端项目结构
- [ ] 创建`frontend/`目录和子目录结构
- [ ] 初始化package.json
- [ ] 安装依赖：`npm install seedrandom`
- [ ] 配置webpack/rollup用于打包

**涉及文件**：
- 新建：`frontend/package.json`
- 新建：`frontend/webpack.config.js`

#### 步骤1.2：实现固定Tick时钟系统
- [ ] 创建`TickClock`类
- [ ] 重构`src/js/td.js`主循环
  - 将`setTimeout`改为`requestAnimationFrame`
  - 引入固定tick机制
  - 替换`iframe`为`currentTick`

**涉及文件**：
- 新建：`frontend/src/core/TickClock.js`
- 修改：`src/js/td.js` (第130-167行)

#### 步骤1.3：集成seedrandom并替换所有Math.random
- [ ] 创建`RandomGenerator`封装
- [ ] 在游戏初始化时调用`initRandom(seed)`
- [ ] 逐个文件替换Math.random()：
  - `src/js/td-walk.js:141`
  - `src/js/td-cfg-monsters.js:182,185`
  - `src/js/td-obj-monster.js:25,31,39,186`
  - `src/js/td-obj-building.js:200`
  - `src/js/td-lang.js:135,147-149,180`
- [ ] 添加ESLint规则禁用Math.random

**涉及文件**：
- 新建：`frontend/src/core/RandomGenerator.js`
- 修改：`src/js/td-walk.js`
- 修改：`src/js/td-cfg-monsters.js`
- 修改：`src/js/td-obj-monster.js`
- 修改：`src/js/td-obj-building.js`
- 修改：`src/js/td-lang.js`

#### 步骤1.4：实现实体ID管理系统
- [ ] 创建`EntityManager`类
- [ ] 修改`Building`类添加`entityId`属性
- [ ] 集成到建造/升级/出售流程

**涉及文件**：
- 新建：`frontend/src/core/EntityManager.js`
- 修改：`src/js/td-obj-building.js`

#### 步骤1.5：实现Action系统
- [ ] 定义Action接口
- [ ] 创建`ActionDispatcher`类
- [ ] 实现验证逻辑（金币、位置、entityId等）
- [ ] 重构`Grid.onClick`为ActionDispatcher
- [ ] 重构`Building.upgrade/sell`为ActionDispatcher

**涉及文件**：
- 新建：`frontend/src/systems/ActionSystem.js`
- 修改：`src/js/td-obj-grid.js`
- 修改：`src/js/td-obj-building.js`

#### 步骤1.6：实现Recorder
- [ ] 创建`Recorder`类
- [ ] 在ActionDispatcher中集成记录
- [ ] 实现`export()`方法用于提交

**涉及文件**：
- 新建：`frontend/src/systems/Recorder.js`

#### 步骤1.7：规则版本化
- [ ] 创建`RulesManager`
- [ ] 从现有配置文件提取所有参数
- [ ] 版本化所有影响游戏逻辑的数值
- [ ] 修改配置文件改为从RulesManager读取

**涉及文件**：
- 新建：`frontend/src/systems/RulesManager.js`
- 修改：`src/js/td-cfg-buildings.js`
- 修改：`src/js/td-cfg-monsters.js`

#### 步骤1.8：实现分数计算系统
- [ ] 创建`ScoringSystem`类
- [ ] 实现分数公式（base + time_bonus - miss_penalty + gold_bonus）
- [ ] 确保time_bonus随endTick递减（时间越短分数越高）

**涉及文件**：
- 新建：`frontend/src/systems/ScoringSystem.js`
- 修改：`src/js/td-stage.js` (集成分数计算)

### 阶段2：新增游戏功能

#### 步骤2.1：游戏速度控制器
- [ ] 创建`SpeedController`类
- [ ] 添加UI按钮和快捷键
- [ ] 集成到`TickClock.renderSpeedMultiplier`

**涉及文件**：
- 新建：`frontend/src/ui/SpeedController.js`
- 修改：`build/td.html` (添加按钮)
- 修改：`src/css/c.css` (样式)

#### 步骤2.2：音效系统
- [ ] 创建`AudioSystem`类
- [ ] 准备音效文件（cannon, lmg, hmg, laser）
- [ ] 在`Building.fire()`中集成音效

**涉及文件**：
- 新建：`frontend/src/systems/AudioSystem.js`
- 新建：`public/assets/sounds/*.mp3`
- 修改：`src/js/td-obj-building.js`

#### 步骤2.3：关卡进度系统
- [ ] 在UI中显示当前关卡
- [ ] 持久化保存最高关卡（localStorage）

**涉及文件**：
- 修改：`src/js/td-stage.js`
- 修改：`build/td.html`

### 阶段3：网络和排行榜

#### 步骤3.1：API客户端
- [ ] 创建`APIClient`类
- [ ] 实现所有API方法

**涉及文件**：
- 新建：`frontend/src/network/APIClient.js`

#### 步骤3.2：匿名身份管理
- [ ] 创建`AuthManager`类
- [ ] 实现token持久化（localStorage）

**涉及文件**：
- 新建：`frontend/src/network/AuthManager.js`

#### 步骤3.3：排行榜UI
- [ ] 创建排行榜界面
- [ ] 显示Top 100
- [ ] 显示我的排名
- [ ] 刷新功能

**涉及文件**：
- 新建：`frontend/src/ui/LeaderboardUI.js`
- 修改：`build/td.html`
- 修改：`src/css/c.css`

#### 步骤3.4：集成排行榜模式
- [ ] 游戏开始前调用`/api/game/start`获取seed
- [ ] 游戏结束后提交到`/api/game/submit`
- [ ] 显示验证结果

**涉及文件**：
- 修改：`src/js/td-stage.js`
- 修改：`src/js/td.js`

### 阶段4：后端开发

#### 步骤4.1：搭建后端项目
- [ ] 创建`backend/`目录结构
- [ ] 创建`requirements.txt`
- [ ] 初始化FastAPI应用
- [ ] 配置SQLite数据库

**涉及文件**：
- 新建：`backend/app/main.py`
- 新建：`backend/requirements.txt`
- 新建：`backend/app/database/connection.py`

#### 步骤4.2：数据库模型
- [ ] 创建User模型
- [ ] 创建Attempt模型
- [ ] 创建Submission模型
- [ ] 创建LeaderboardEntry模型
- [ ] 运行数据库迁移

**涉及文件**：
- 新建：`backend/app/models/user.py`
- 新建：`backend/app/models/attempt.py`
- 新建：`backend/app/models/submission.py`
- 新建：`backend/app/models/leaderboard.py`

#### 步骤4.3：身份认证服务
- [ ] 实现匿名用户创建
- [ ] 实现JWT token签发
- [ ] 实现token验证中间件

**涉及文件**：
- 新建：`backend/app/services/auth_service.py`
- 新建：`backend/app/api/auth.py`

#### 步骤4.4：游戏服务
- [ ] 实现`start_game`（发放attemptId和seed）
- [ ] 实现`submit_score`（验证和入榜）
- [ ] 实现防作弊检查

**涉及文件**：
- 新建：`backend/app/services/game_service.py`
- 新建：`backend/app/services/anticheat.py`
- 新建：`backend/app/api/game.py`

#### 步骤4.5：Node.js验证器
- [ ] 创建`verifier/`目录
- [ ] 使用webpack打包前端引擎为Node.js模块
- [ ] 实现`verify.js`脚本
- [ ] 实现Python调用Node.js的接口

**涉及文件**：
- 新建：`backend/verifier/verify.js`
- 新建：`backend/verifier/package.json`
- 新建：`webpack.config.verifier.js`
- 新建：`backend/app/services/validator.py`

#### 步骤4.6：排行榜服务
- [ ] 实现查询排行榜
- [ ] 实现查询我的排名
- [ ] 实现Top100+20门槛机制

**涉及文件**：
- 新建：`backend/app/api/leaderboard.py`

### 阶段5：测试

#### 步骤5.1：前端测试
- [ ] 配置Jest
- [ ] 编写TickClock测试
- [ ] 编写RandomGenerator测试（验证相同seed产生相同序列）
- [ ] 编写ActionDispatcher测试
- [ ] 编写Recorder测试

**涉及文件**：
- 新建：`frontend/tests/unit/TickClock.test.js`
- 新建：`frontend/tests/unit/RandomGenerator.test.js`
- 新建：`frontend/tests/unit/ActionSystem.test.js`
- 新建：`frontend/tests/unit/Recorder.test.js`

#### 步骤5.2：后端测试
- [ ] 配置pytest
- [ ] 编写API测试（auth, game, leaderboard）
- [ ] 编写验证器测试
- [ ] 编写防作弊测试

**涉及文件**：
- 新建：`backend/tests/test_api/test_auth.py`
- 新建：`backend/tests/test_api/test_game.py`
- 新建：`backend/tests/test_api/test_leaderboard.py`
- 新建：`backend/tests/test_services/test_validator.py`
- 新建：`backend/tests/test_services/test_anticheat.py`

#### 步骤5.3：集成测试
- [ ] 完整的游戏流程测试（开始→玩→提交→验证→入榜）
- [ ] 验证相同seed产生相同结果
- [ ] 验证作弊检测

**涉及文件**：
- 新建：`frontend/tests/integration/game-flow.test.js`
- 新建：`backend/tests/integration/test_game_flow.py`

### 阶段6：文档编写

#### 步骤6.1：用户文档
- [ ] 编写README.md（运行说明）
- [ ] 编写游戏规则说明

**涉及文件**：
- 新建：`docs/README.md`

#### 步骤6.2：技术文档
- [ ] 编写SPEC.md（游戏规则和需求）
- [ ] 编写ARCHITECTURE.md（架构设计）
- [ ] 编写SECURITY.md（防作弊策略）

**涉及文件**：
- 新建：`docs/SPEC.md`
- 新建：`docs/ARCHITECTURE.md`
- 新建：`docs/SECURITY.md`

#### 步骤6.3：AI使用文档（重点）
- [ ] 记录每个关键步骤的Prompt
- [ ] 记录验收标准
- [ ] 记录修正过程

**涉及文件**：
- 新建：`docs/AI_USAGE.md`

### 阶段7：部署

#### 步骤7.1：Docker化
- [ ] 编写前端Dockerfile
- [ ] 编写后端Dockerfile
- [ ] 编写docker-compose.yml

**涉及文件**：
- 新建：`frontend/Dockerfile`
- 新建：`backend/Dockerfile`
- 新建：`docker-compose.yml`

#### 步骤7.2：部署测试
- [ ] 本地docker-compose测试
- [ ] 验证前后端通信
- [ ] 验证数据持久化

## 关键文件清单

### 需要重构的现有文件（优先级排序）

1. **src/js/td.js** (130-167行) - 主循环，需要改为requestAnimationFrame + TickClock
2. **src/js/td-obj-monster.js** (25,31,39,186行) - 4处Math.random，需要改为seedrandom
3. **src/js/td-obj-building.js** (200行) - Math.random + 建筑逻辑，需要集成entityId和Action
4. **src/js/td-obj-grid.js** - 建造逻辑，需要改为ActionDispatcher
5. **src/js/td-walk.js** (141行) - Math.random，需要改为seedrandom
6. **src/js/td-cfg-buildings.js** - 建筑配置，需要版本化
7. **src/js/td-cfg-monsters.js** (182,185行) - 怪物配置 + Math.random，需要版本化
8. **src/js/td-lang.js** (135,147-149,180行) - 工具函数，4处Math.random
9. **src/js/td-stage.js** - 关卡逻辑，需要集成分数计算
10. **build/td.html** - 入口HTML，需要添加UI元素（速度控制、排行榜）

### 需要新建的核心文件

**前端核心**：
- `frontend/src/core/TickClock.js`
- `frontend/src/core/RandomGenerator.js`
- `frontend/src/core/EntityManager.js`
- `frontend/src/systems/ActionSystem.js`
- `frontend/src/systems/Recorder.js`
- `frontend/src/systems/RulesManager.js`
- `frontend/src/systems/ScoringSystem.js`

**前端功能**：
- `frontend/src/ui/SpeedController.js`
- `frontend/src/systems/AudioSystem.js`
- `frontend/src/network/APIClient.js`
- `frontend/src/network/AuthManager.js`
- `frontend/src/ui/LeaderboardUI.js`

**后端核心**：
- `backend/app/main.py`
- `backend/app/services/validator.py`
- `backend/app/services/game_service.py`
- `backend/app/services/anticheat.py`
- `backend/verifier/verify.js`

## 风险与注意事项

### 1. 逻辑tick与渲染分离的复杂性
- **风险**：现有代码中逻辑与渲染高度耦合，分离可能引入bug
- **缓解**：逐步重构，先保持功能不变，再添加新功能

### 2. 随机数替换的完整性
- **风险**：遗漏某处Math.random导致不可复现
- **缓解**：使用ESLint规则强制检查，编写测试验证相同seed产生相同结果

### 3. 回放验证的性能
- **风险**：Node.js验证耗时过长
- **缓解**：设置60秒超时，只验证Top100+20分数

### 4. 防作弊的局限性
- **风险**：客户端仍可能通过修改代码绕过验证
- **缓解**：
  - 服务端复算才是最终裁判
  - 限流和异常模式检测
  - 文档中明确说明局限性（SECURITY.md）

### 5. 游戏速度倍率的理解
- **风险**：可能误解为"倍速影响分数"
- **澄清**：
  - 速度倍率只影响物理时间流逝速度
  - 相同的游戏策略产生相同的endTick
  - 分数基于endTick计算，所以倍速不影响分数

## 验收标准

### 前端
- [ ] 相同seed + 相同rulesVersion + 相同actions = 相同结果（100%确定性）
- [ ] 游戏可以1x/2x/4x/8x倍速运行，分数不变
- [ ] 所有玩家操作通过ActionDispatcher验证
- [ ] Recorder正确记录所有成功操作
- [ ] 音效正常播放
- [ ] Jest测试通过率100%

### 后端
- [ ] 成功复现前端游戏结果（误差0）
- [ ] 防作弊机制有效（限流、门槛、异常检测）
- [ ] API响应时间 < 100ms（除验证接口）
- [ ] 验证接口响应时间 < 10s
- [ ] pytest测试通过率100%

### 集成
- [ ] 完整流程可运行（开始→玩→提交→验证→入榜）
- [ ] docker-compose一键部署成功
- [ ] 文档完整（README, SPEC, ARCHITECTURE, SECURITY, AI_USAGE）

## 时间估算（仅供参考）

- 阶段1（前端核心）：核心工作量
- 阶段2（新功能）：中等工作量
- 阶段3（网络）：中等工作量
- 阶段4（后端）：核心工作量
- 阶段5（测试）：重要工作量
- 阶段6（文档）：必要工作量
- 阶段7（部署）：轻量工作量

## 下一步行动

按照阶段1开始实施，一次处理一个任务，每个任务完成后验证功能正确性。
