import base64
import logging
import secrets
import time
from collections.abc import Callable
from urllib.parse import urlencode

import httpx
from authlib.integrations.base_client import OAuthError
from authlib.integrations.starlette_client import OAuth, StarletteOAuth2App
from diskcache import Cache
from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel, ValidationError
from starlette.authentication import AuthenticationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, RedirectResponse

from app.schemas.config import RecipesCognitoSettings

USER_SESSION_COOKIE = "user_session_id"
SESSION_COOKIE_MAX_AGE = 14 * 24 * 60 * 60  # 14 days
SESSION_CACHE_EXPIRY_BUFFER_SECONDS = 30

logger = logging.getLogger(__name__)


class SessionData(BaseModel):
    access_token: str
    refresh_token: str
    access_token_expires_at: float
    """Access token expiration datetime"""
    session_expires_at: float
    """Session expiration datetime"""

    def needs_refresh(self) -> bool:
        """
        Refresh session_expires_at if current expiry time is less than half the SESSION_COOKIE_MAX_AGE
        :return: True of the session_expires_at was updated, False otherwise
        """
        if self.session_expires_at < (time.time() + (SESSION_COOKIE_MAX_AGE / 2)):
            self.session_expires_at = time.time() + SESSION_COOKIE_MAX_AGE
            return True
        else:
            return False


class SessionCache:
    def __init__(self, cache_dir: str):
        self.cache = Cache(cache_dir)

    def get(self, session_id: str) -> SessionData | None:
        return self._get_or_pop_session_data(session_id, pop=False)

    def set(self, session_id: str, session_data: SessionData):
        """
        Set the session data for a session_id
        :param session_id: the session id
        :param session_data: the session data
        """
        # we add a buffer to the expiry to account for minor expiry differences between the cookie in the browser and the cache
        expire = (
            session_data.session_expires_at - time.time()
        ) + SESSION_CACHE_EXPIRY_BUFFER_SECONDS
        if expire < 0:
            logger.error("Session is already expired: %s", session_id)
        else:
            self.cache.set(session_id, session_data.model_dump_json(), expire=expire)

    def delete(self, session_id: str) -> SessionData | None:
        return self._get_or_pop_session_data(session_id, pop=True)

    def _get_or_pop_session_data(
        self, session_id: str, pop: bool = False
    ) -> SessionData | None:
        session_data_str = (
            self.cache.pop(session_id) if pop else self.cache.get(session_id)
        )
        try:
            return (
                SessionData.model_validate_json(session_data_str)
                if session_data_str
                else None
            )
        except ValidationError:
            logger.error("Bad session data for session id %s", session_id)
            if not pop:
                self.cache.delete(session_id)
            return None


class BffAuth:
    def __init__(self, config: RecipesCognitoSettings, session_cache_dir: str):
        self.config = config
        oauth = OAuth()
        oauth.register(
            name="cognito",
            authority=config.authority,
            client_id=config.client_id,
            client_secret=config.client_secret,
            server_metadata_url=f"{config.authority}/.well-known/openid-configuration",
            client_kwargs={"scope": "openid"},
        )

        self.cognito: StarletteOAuth2App = oauth.cognito

        self.session_cache = SessionCache(cache_dir=session_cache_dir)

    async def login(self, request: Request) -> Response:
        """
        Redirects the user to AWS Cognito's Hosted UI to begin the authentication flow.
        """
        return await self.cognito.authorize_redirect(request, self.config.redirect_uri)

    async def logout(
        self,
        request: Request,
        logout_cognito: bool = False,
        logout_redirect_uri: str | None = None,
    ) -> Response:
        """
        Logs out the user
        :param request: the request
        :param logout_cognito: whether to also logout cognito
        :param logout_redirect_uri: a redirect URI
        :return: the response
        """
        self.session_cache.delete(request.cookies.get(USER_SESSION_COOKIE))
        if logout_cognito:
            if not logout_redirect_uri:
                raise ValueError(
                    "logout_redirect_uri must be specified when logout_cognito is true!"
                )
            response = await self._cognito_logout_redirect(logout_redirect_uri)
        elif logout_redirect_uri:
            response = RedirectResponse(url=logout_redirect_uri)
        else:
            response = JSONResponse({"status": "logout success"})

        response.delete_cookie(USER_SESSION_COOKIE)
        return response

    async def _cognito_logout_redirect(self, logout_redirect_uri: str):
        """
        Create a cognito-compliant redirect for logout. We can't use the authlib logout_redirect() because cognito
        is not fully OIDC compliant and needs different params for logout.
        :param logout_redirect_uri: the redirect URI for logout
        :return: a RedirectResponse to the cognito logout URI
        """
        metadata = await self.cognito.load_server_metadata()
        end_session_endpoint = metadata.get("end_session_endpoint")

        if not end_session_endpoint:
            raise RuntimeError('Missing "end_session_endpoint" in metadata')

        client_id = self.cognito.client_id

        query_params = {"client_id": client_id, "logout_uri": logout_redirect_uri}

        cognito_logout_url = f"{end_session_endpoint}?{urlencode(query_params)}"

        return RedirectResponse(url=cognito_logout_url)

    async def auth_callback(self, request: Request, response: Response):
        """
        Receives the code from Cognito, exchanges it for tokens, saves tokens to DiskCache,
        and drops an HttpOnly session cookie on the user's browser.
        """
        try:
            # Authlib exchanges the authorization code for the tokens
            token_response = await self.cognito.authorize_access_token(request)
        except OAuthError as e:
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

        self.session_cache.set(
            session_id,
            SessionData(
                access_token=access_token,
                refresh_token=refresh_token,
                access_token_expires_at=expires_at,
                session_expires_at=time.time() + SESSION_COOKIE_MAX_AGE,
            ),
        )

        response = RedirectResponse("/")

        # Attach cookie to response (HttpOnly + Secure protects against XSS)
        response.set_cookie(
            key=USER_SESSION_COOKIE,
            value=session_id,
            httponly=True,
            secure=True,  # Ensure your local SPA/BFF uses HTTPS or localhost
            samesite="lax",  # Helps protect against CSRF attacks
            max_age=SESSION_COOKIE_MAX_AGE,
        )

        return response

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

        raw_credentials = f"{self.config.client_id}:{self.config.client_secret}"
        encoded_credentials = base64.b64encode(raw_credentials.encode("utf-8")).decode(
            "utf-8"
        )
        headers = {"Authorization": f"Basic {encoded_credentials}"}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://{self.config.domain}/oauth2/token",
                data=payload,
                headers=headers,
            )

        if response.is_client_error:
            logger.error(
                f"Client error refreshing access token: {response.status_code} {response.json()}"
            )
            raise HTTPException(
                status_code=401,
                detail=f"Failed to refresh access token: {response.json()}",
            )
        elif not response.is_success:
            logger.error(
                f"Server error refreshing access token: {response.status_code} {response.text}"
            )
            raise AuthenticationError(
                f"Could not refresh session token with provider: {response.text}",
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
            update_session_cookie: bool = False
            try:
                # Trigger refresh if token is expired OR within a 5-minute (300 seconds) buffer window
                buffer_window = 300
                if time.time() > (session_data.access_token_expires_at - buffer_window):
                    logger.info("Refreshing access token for session %s", session_id)
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
                        access_token_expires_at=expires_at,
                        session_expires_at=time.time() + SESSION_COOKIE_MAX_AGE,
                    )
                    update_session_cookie = True
                elif session_data.needs_refresh():
                    update_session_cookie = True

            except HTTPException as e:
                raise HTTPException(
                    status_code=e.status_code,
                    detail=f"Session validation failed: {e.detail}",
                )

            if not session_data:
                raise HTTPException(status_code=401, detail="Authentication required")

            if update_session_cookie:
                # 1. Update DiskCache with updated session data
                self.session_cache.set(session_id, session_data)

                # 2. Renew browser cookie validity window
                response_processor = lambda r: r.set_cookie(
                    key=USER_SESSION_COOKIE,
                    value=session_id,
                    httponly=True,
                    secure=True,
                    samesite="lax",
                    max_age=session_data.session_expires_at - time.time(),
                )

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
        try:
            # noinspection PyProtectedMember
            return await self.bff_auth._middleware_dispatch(request, call_next)
        except HTTPException as e:
            return JSONResponse({"message": e.detail}, status_code=e.status_code)
