# HTML5 Tower Defense - Frontend

## 环境要求

- Node.js 24.12.0
- npm

## 安装步骤

1. 确保已经安装了版本管理工具（如asdf），并加载了环境：
```bash
source ~/.zshrc
```

2. 验证Node.js版本：
```bash
node --version  # 应该显示 v24.12.0
npm --version
```

3. 安装依赖：
```bash
cd frontend
npm install
```

## 开发命令

```bash
# 开发模式（带热重载）
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test

# 测试（监听模式）
npm run test:watch

# 代码检查
npm run lint
```

## 项目结构

```
frontend/
├── src/
│   ├── core/           # 核心引擎
│   │   ├── TickClock.js
│   │   ├── RandomGenerator.js
│   │   └── EntityManager.js
│   ├── systems/        # 游戏系统
│   │   ├── ActionSystem.js
│   │   ├── Recorder.js
│   │   ├── RulesManager.js
│   │   └── ScoringSystem.js
│   ├── ui/            # UI组件
│   ├── network/       # 网络通信
│   └── main.js        # 入口文件
├── public/            # 静态资源
│   └── assets/
│       └── sounds/
├── tests/             # 测试文件
│   ├── unit/
│   └── integration/
└── dist/              # 构建输出
```

## 重要说明

### ESLint规则

项目已配置ESLint规则禁用 `Math.random()`，必须使用 `TD_RANDOM.next()` 以确保游戏的确定性和可回放性。

### 游戏倍速

游戏速度倍率（1x/2x/4x/8x）只影响每帧处理的tick数量，不影响tick的推进速度。相同的游戏策略会产生相同的endTick和分数。
