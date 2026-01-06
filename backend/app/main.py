import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database.connection import init_db
from backend.app.api.auth import router as auth_router
from backend.app.api.game import router as game_router
from backend.app.api.leaderboard import router as leaderboard_router

logger = logging.getLogger("td_api")
logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 应用启动时初始化数据库
    init_db()
    yield

app = FastAPI(title="Tower Defense API", lifespan=lifespan)

@app.exception_handler(Exception)
# 统一异常处理，避免泄露堆栈
async def handle_exceptions(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"success": False, "reason": "Server error"})

def _get_cors_origins():
    # 从环境变量读取允许的前端域名
    raw = os.getenv("TD_CORS_ORIGINS")
    if not raw:
        return ["http://localhost:8081", "http://127.0.0.1:8081"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(game_router)
app.include_router(leaderboard_router)


@app.get("/health")
# 健康检查
def health():
    return {"status": "ok"}
