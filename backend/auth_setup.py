from fastapi_users.authentication import CookieTransport, OAuth2AuthorizeCallback, OAuth2Strategy, AuthenticationBackend
from fastapi_users.authentication import JWTStrategy
from fastapi_users.authentication import OAuthAccount
from fastapi_users.authentication import GoogleOAuth2
from fastapi import FastAPI, Depends
from users import User, UserManager, get_user_db, get_jwt_strategy
from fastapi_users import FastAPIUsers
from database import SessionLocal

SECRET = "SUPERSECRET"

fastapi_users = FastAPIUsers[
    User,
    str
](
    get_user_db,
    [
        AuthenticationBackend(
            name="jwt",
            transport=CookieTransport(cookie_name="auth", cookie_max_age=3600),
            get_strategy=get_jwt_strategy,
        ),
        GoogleOAuth2(
            client_id="GOOGLE_CLIENT_ID",
            client_secret="GOOGLE_CLIENT_SECRET",
            redirect_uri="http://localhost:8000/auth/google/callback"
        ),
    ],
    UserManager,
)

app = FastAPI()

app.include_router(
    fastapi_users.get_auth_router(get_jwt_strategy()),
    prefix="/auth/jwt",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(),
    prefix="/users",
    tags=["users"],
)
app.include_router(
    fastapi_users.get_oauth_router(
        GoogleOAuth2(
            client_id="GOOGLE_CLIENT_ID",
            client_secret="GOOGLE_CLIENT_SECRET",
            redirect_uri="http://localhost:8000/auth/google/callback"
        ),
        get_user_db,
        SECRET
    ),
    prefix="/auth/google",
    tags=["auth"],
)
