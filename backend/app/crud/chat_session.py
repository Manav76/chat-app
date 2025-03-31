from sqlalchemy.orm import Session
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.schemas.chat import ChatSessionCreate, ChatMessageCreate
from typing import List
import uuid
from datetime import datetime

def create_chat_session(db: Session, session_data: ChatSessionCreate, user_id: str) -> ChatSession:
    """Create a new chat session."""
    db_session = ChatSession(
        id=str(uuid.uuid4()),
        title=session_data.title,
        user_id=user_id,
        created_at=datetime.utcnow()
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_chat_sessions(db: Session, user_id: str) -> List[ChatSession]:
    """Get all chat sessions for a user."""
    return db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc()).all()

def get_chat_session(db: Session, session_id: str, user_id: str) -> ChatSession:
    """Get a specific chat session."""
    return db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()

def update_chat_session(db: Session, session_id: str, title: str, user_id: str) -> ChatSession:
    """Update a chat session's title."""
    db_session = get_chat_session(db, session_id, user_id)
    if db_session:
        db_session.title = title
        db.commit()
        db.refresh(db_session)
    return db_session

def delete_chat_session(db: Session, session_id: str, user_id: str) -> bool:
    """Delete a chat session."""
    db_session = get_chat_session(db, session_id, user_id)
    if db_session:
        # Delete all messages in the session first
        db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
        # Then delete the session
        db.delete(db_session)
        db.commit()
        return True
    return False 