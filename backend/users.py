from fastapi_users import FastAPIUsers
from fastapi_users.authentication import JWTStrategy, AuthenticationBackend
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.manager import BaseUserManager, UserAlreadyExists
from fastapi_users.models import BaseUser, BaseOAuthAccount
from fastapi import Depends
from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.ext.declarative import DeclarativeMeta, declarative_base
from sqlalchemy.orm import Session
from typing import Optional
import uuid

Base: DeclarativeMeta = declarative_base()

class User(Base, BaseUser):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    role = Column(String, default="user")  # 'user' or 'admin'

class UserManager(BaseUserManager[User, str]):
    reset_password_token_secret = "SECRET"
    verification_token_secret = "SECRET"

    async def on_after_register(self, user: User, request=None):
        print(f"User {user.id} has registered.")

    async def create(self, user_create, safe: bool = False, request=None):
        try:
            return await super().create(user_create, safe, request)
        except UserAlreadyExists:
            raise Exception("User already exists")

# JWT strategy
SECRET = "SUPERSECRET"
def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600)

def get_user_db(session: Session = Depends(...)):
    yield SQLAlchemyUserDatabase(session, User)
