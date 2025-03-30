from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.utils.security import hash_password , verify_password

def create_user(db: Session, user_in: UserCreate):
    hashed_pw = hash_password(user_in.password)
    user = User(
        email=user_in.email,
        username=user_in.username,
        password_hash=hashed_pw,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db: Session , email: str , password: str):
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user