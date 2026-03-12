from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.schemas import UserRegister, UserLogin
from app.models.models import Users
from app.core.security import hash_password, verify_password, create_access_token


router = APIRouter(prefix="/auth", tags=["auth"])


# register
@router.post("/register")
async def register(user: UserRegister, db: AsyncSession = Depends(get_db)) -> Any:

    # check if email already exists
    result = await db.execute(
        select(Users).where(Users.email == user.email)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # hash password
    hashed_password = hash_password(user.password)

    # create new user
    new_user = Users(
        email=user.email,
        password_hash=hashed_password,
        name=user.name,
        phone=user.phone
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id
    }


# user login
@router.post("/login")
async def login(user: UserLogin, db: AsyncSession = Depends(get_db)) -> Any:

    # find user by email
    result = await db.execute(
        select(Users).where(Users.email == user.email)
    )
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # verify password
    if not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # generate JWT token
    token = create_access_token({
        "user_id": db_user.id,
        "email": db_user.email
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": db_user.id
    }

