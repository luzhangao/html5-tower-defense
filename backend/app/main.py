import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database.connection import init_db
from backend.app.api.auth import router as auth_router
from backend.app.api.game import router as game_router
from backend.app.api.leaderboard import router as leaderboard_router

app = FastAPI(title="Tower Defense API")
logger = logging.getLogger("td_api")
logging.basicConfig(level=logging.INFO)

@app.exception_handler(Exception)
async def handle_exceptions(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"success": False, "reason": "Server error"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://127.0.0.1:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(auth_router)
app.include_router(game_router)
app.include_router(leaderboard_router)


@app.get("/health")
def health():
    return {"status": "ok"}
