# 文档索引与运行说明

## 文档索引
- `docs/SPEC.md`：规则与数据规范
- `docs/ARCHITECTURE.md`：系统架构与数据流
- `docs/SECURITY.md`：防作弊与安全策略
- `docs/AI_USAGE.md`：AI 使用过程记录

## 快速启动（本地）
### 依赖
- Node.js 24.x、Python 3.12、Poetry 2.2（见 `.tool-versions`）

### 安装
```bash
npm install
cd frontend && npm install
poetry install
```

### 构建 Core Engine
```bash
npx webpack --config webpack.config.core-browser.js
npx webpack --config webpack.config.core-verifier.js
```

### 启动服务
```bash
# 验证器（Node）
node backend/verifier/verify-core.js

# 后端 API
poetry run uvicorn backend.app.main:app --reload --port 8000

# 前端静态服务（legacy UI + core runner）
cd src && python -m http.server 8081
```

### 打开页面
- http://localhost:8081/td.html

## 测试
```bash
cd frontend && npm test
poetry run pytest backend/tests
```

## Docker Compose
```bash
docker compose up --build
```

服务端口：
- 前端：`http://localhost:8081/td.html`
- 后端：`http://localhost:8000`
- 验证器：`http://localhost:3001/health`

## 环境变量
- `TD_DB_PATH`：SQLite 数据库路径（默认 `backend/app/database/td.db`）
- `TD_JWT_SECRET`：匿名身份签名密钥（默认 `dev-secret`）
- `VERIFIER_URL`：后端调用验证器地址（默认 `http://localhost:3001`）
- `PORT`：验证器端口（默认 `3001`）
