import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import http_exception_handler as default_http_handler
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.core.errors import validation_exception_handler, http_exception_handler
from app.routers import auth, uploads, transactions, analytics, budgets


def create_app() -> FastAPI:
    app = FastAPI(
        title="WealthWise API",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request ID middleware
    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        request.state.request_id = str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response

    # Exception handlers
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)

    # Health
    @app.get("/health", tags=["system"])
    def health():
        return {"status": "ok"}

    # Routers
    prefix = "/api/v1"
    app.include_router(auth.router, prefix=prefix)
    app.include_router(uploads.router, prefix=prefix)
    app.include_router(transactions.router, prefix=prefix)
    app.include_router(analytics.router, prefix=prefix)
    app.include_router(budgets.router, prefix=prefix)

    return app


app = create_app()
