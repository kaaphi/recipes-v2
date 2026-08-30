import os
import time

from fastapi import APIRouter, FastAPI, Request

from app.services.auth import USER_SESSION_COOKIE, BffAuth

FASTAPI_ENV = os.getenv("FASTAPI_ENV", "production")

dev_router = APIRouter(prefix="/dev", tags=["dev-only"])

bff_auth: BffAuth


def conditionally_add_dev_routes(app: FastAPI, bff_auth_instance: BffAuth):
    if FASTAPI_ENV == "development":
        global bff_auth
        bff_auth = bff_auth_instance
        app.include_router(dev_router)


def modify_session_data(request: Request):
    session_data = bff_auth.session_cache.get(request.cookies.get(USER_SESSION_COOKIE))
    if session_data:
        try:
            yield session_data
        finally:
            bff_auth.session_cache.set(
                request.cookies.get(USER_SESSION_COOKIE), session_data
            )
    else:
        return


@dev_router.put("/expireAccessToken")
def expire_access_token(request: Request):
    for session_data in modify_session_data(request):
        session_data.access_token_expires_at = time.time() - 30


@dev_router.put("/invalidateRefreshToken")
def invalidate_refresh_token(request: Request):
    for session_data in modify_session_data(request):
        session_data.refresh_token = "BadTokenForTesting"
