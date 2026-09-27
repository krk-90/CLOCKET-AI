import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.routes.RAG import router as rag_router
from app.routes.auth import router as auth_router
from app.routes.chat import router as chat_router
from app.routes.health import router as health_router
from app.routes.repositories import router as repositories_router
from app.routes.analysis import router as analysis_router

limiter = Limiter(key_func=get_remote_address, default_limits=["15/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


fastapi_app = FastAPI(title="Clocket AI", lifespan=lifespan)
FRONTEND_DIR = Path(__file__).resolve().parent / "frontend"
FRONTEND_DIST_DIR = FRONTEND_DIR / "dist"
INDEX_FILE = FRONTEND_DIST_DIR / "index.html"


def _allowed_origins() -> list[str]:
    raw_origins = os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173",
    )
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["http://localhost:5173"]


allowed_origins = _allowed_origins()
allow_all_origins = "*" in allowed_origins
fastapi_app.state.limiter = limiter
fastapi_app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else allowed_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)
fastapi_app.add_middleware(SlowAPIMiddleware)


@fastapi_app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    started_at = time.perf_counter()

    response = await call_next(request)

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{time.perf_counter() - started_at:.4f}"
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer-when-downgrade")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()",
    )
    return response


if FRONTEND_DIST_DIR.exists():
    fastapi_app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST_DIR / "assets"),
        name="frontend-assets",
    )


def custom_openapi():
    if fastapi_app.openapi_schema:
        return fastapi_app.openapi_schema

    schema = get_openapi(
        title=fastapi_app.title,
        version="1.0.0",
        routes=fastapi_app.routes,
    )
    upload_schema = schema.get("components", {}).get("schemas", {}).get(
        "Body_upload_documents_rag_upload_post"
    )
    if upload_schema:
        upload_schema["properties"]["files"]["items"]["format"] = "binary"

    fastapi_app.openapi_schema = schema
    return schema


fastapi_app.openapi = custom_openapi

@fastapi_app.get("/", include_in_schema=False)
def frontend_index():
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    return {
        "service": "personal-assistant",
        "message": "Build the React frontend with `npm run build` in app/frontend.",
        "docs": "/docs",
    }


fastapi_app.include_router(auth_router)
fastapi_app.include_router(health_router)
fastapi_app.include_router(rag_router)
fastapi_app.include_router(chat_router)
fastapi_app.include_router(repositories_router)
fastapi_app.include_router(analysis_router)


@fastapi_app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    """Catch-all route: serve the React SPA index.html for any unmatched path."""
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    return {
        "service": "personal-assistant",
        "message": "Build the React frontend with `npm run build` in app/frontend.",
        "docs": "/docs",
    }
