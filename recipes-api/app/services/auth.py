import logging
import secrets
import time
from collections.abc import Callable

import httpx
from authlib.integrations.starlette_client import OAuth
from diskcache import Cache
from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel, ValidationError
from starlette import status
from starlette.middleware.base import BaseHTTPMiddleware

from app.schemas.config import RecipesCognitoSettings

USER_SESSION_COOKIE = "user_session_id"

logger = logging.getLogger(__name__)


class SessionData(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: float


class SessionCache:
    def __init__(self, cache_dir: str):
        self.cache = Cache(cache_dir)

    def get(self, session_id: str) -> SessionData | None:
        session_data_str = self.cache.get(session_id)
        try:
            return (
                SessionData.model_validate_json(session_data_str)
                if session_data_str
                else None
            )
        except ValidationError:
            logger.error("Bad session data for session id %s", session_id)
            self.delete(session_id)
            return None

    def set(self, session_id: str, session_data: SessionData, expire: float):
        self.cache.set(session_id, session_data.model_dump_json(), expire=expire)

    def delete(self, session_id: str):
        self.cache.delete(session_id)


class BffAuth:
    def __init__(self, config: RecipesCognitoSettings, session_cache_dir: str):
        self.config = config
        self.oauth = OAuth()
        self.oauth.register(
            name="cognito",
            authority=config.authority,
            client_id=config.client_id,
            client_secret=config.client_secret,
            server_metadata_url=f"{config.authority}/.well-known/openid-configuration",
            client_kwargs={"scope": "openid"},
        )
        self.session_cache = SessionCache(cache_dir=session_cache_dir)

    async def login(self, request: Request):
        """
        Redirects the user to AWS Cognito's Hosted UI to begin the authentication flow.
        """
        return await self.oauth.cognito.authorize_redirect(
            request, self.config.redirect_uri
        )

    async def auth_callback(self, request: Request, response: Response):
        """
        Receives the code from Cognito, exchanges it for tokens, saves tokens to DiskCache,
        and drops an HttpOnly session cookie on the user's browser.
        """
        try:
            # Authlib exchanges the authorization code for the tokens
            token_response = await self.oauth.cognito.authorize_access_token(request)
        except Exception as e:
            logger.warning("Cognito authorization failed: %s", e)
            raise HTTPException(status_code=400, detail="Authentication failed")

        access_token = token_response.get("access_token")
        refresh_token = token_response.get("refresh_token")
        expires_in = token_response.get("expires_in", 3600)  # Cognito defaults to 3600s
        expires_at = time.time() + expires_in

        if not access_token:
            raise HTTPException(
                status_code=400, detail="Failed to retrieve access token"
            )

        # Generate a cryptographically secure random session ID
        session_id = secrets.token_urlsafe(32)

        # TODO keep the session alive for the duration of the refresh token (or even longer!), not the duration of the access token

        # Store tokens inside DiskCache with an explicit TTL matching the token's lifetime
        self.session_cache.set(
            session_id,
            SessionData(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at,
            ),
            expire=expires_in,
        )

        # Attach cookie to response (HttpOnly + Secure protects against XSS)
        response.set_cookie(
            key=USER_SESSION_COOKIE,
            value=session_id,
            httponly=True,
            secure=True,  # Ensure your local SPA/BFF uses HTTPS or localhost
            samesite="lax",  # Helps protect against CSRF attacks
            max_age=expires_in,
        )

        return {"status": "Successfully logged in. Session established."}

    async def _refresh_cognito_tokens(self, refresh_token: str) -> dict:
        """
        Makes a direct back-channel network call to AWS Cognito's OAuth2 token endpoint
        to exchange a refresh token for new access and ID tokens.
        """
        payload = {
            "grant_type": "refresh_token",
            "client_id": self.config.client_id,
            "refresh_token": refresh_token,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.config.authority}/oauth2/token", data=payload, headers=headers
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not refresh session token with provider",
            )

        return response.json()

    async def _middleware_dispatch(self, request: Request, call_next):
        has_bearer = request.headers.get("Authorization") is not None
        session_id = request.cookies.get(USER_SESSION_COOKIE)

        response_processor: Callable[[Response], None] | None = None

        logger.debug(
            f"Handling request has_bearer={has_bearer}, session_id={session_id}"
        )

        session_data = self.session_cache.get(session_id)

        if not has_bearer and session_data:
            try:
                # Trigger refresh if token is expired OR within a 5-minute (300 seconds) buffer window
                buffer_window = 300
                if time.time() > (session_data.expires_at - buffer_window):
                    # Request new tokens from AWS Cognito
                    new_tokens = await self._refresh_cognito_tokens(
                        session_data.refresh_token
                    )

                    access_token = new_tokens.get("access_token")
                    expires_in = new_tokens.get("expires_in", 3600)
                    expires_at = time.time() + expires_in

                    # Keep old refresh token if Cognito didn't issue a brand new rotating one
                    new_refresh_token = new_tokens.get(
                        "refresh_token", session_data.refresh_token
                    )

                    session_data = SessionData(
                        access_token=access_token,
                        refresh_token=new_refresh_token,
                        expires_at=expires_at,
                    )

                    # 1. Update DiskCache with new credentials
                    self.session_cache.set(
                        session_id,
                        session_data,
                        expire=expires_in,
                    )

                    # 2. Renew browser cookie validity window
                    response_processor = lambda r: r.set_cookie(
                        key=USER_SESSION_COOKIE,
                        value=session_id,
                        httponly=True,
                        secure=True,
                        samesite="lax",
                        max_age=expires_in,
                    )

            except Exception:
                raise HTTPException(status_code=401, detail="Session validation failed")

            if not session_data:
                raise HTTPException(status_code=401, detail="Authentication required")

            authorization_header = f"Bearer {session_data.access_token}"

            # Mutate the request to add Authorization header so we can use fastapi_cognito to auth requests
            request.scope["headers"].append(
                (b"authorization", authorization_header.encode())
            )

        response = await call_next(request)
        if response_processor:
            response_processor(response)
        return response


class BffMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: FastAPI, bff_auth: BffAuth) -> None:
        super().__init__(app)
        self.bff_auth = bff_auth

    async def dispatch(self, request: Request, call_next):
        # noinspection PyProtectedMember
        return await self.bff_auth._middleware_dispatch(request, call_next)
