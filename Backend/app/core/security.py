from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt

SECRET_KEY = "super-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _clean_password(password: str) -> bytes:
    # bcrypt only accepts 72 bytes
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return pwd_context.hash(_clean_password(password))


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_clean_password(password), hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)