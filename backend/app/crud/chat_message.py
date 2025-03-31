from sqlalchemy.orm import Session
from app.models.chat_message import ChatMessage
from app.schemas.chat import ChatMessageCreate
from typing import List
import uuid
from datetime import datetime

def create_chat_message(db: Session, message_data: ChatMessageCreate, session_id: str) -> ChatMessage:
    """Create a new chat message."""
    db_message = ChatMessage(
        id=str(uuid.uuid4()),
        content=message_data.content,
        role=message_data.role,
        session_id=session_id,
        created_at=datetime.utcnow()
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_chat_messages(db: Session, session_id: str) -> List[ChatMessage]:
    """Get all messages for a chat session."""
    return db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()

def get_chat_message(db: Session, message_id: str) -> ChatMessage:
    """Get a specific chat message."""
    return db.query(ChatMessage).filter(ChatMessage.id == message_id).first()

def delete_chat_message(db: Session, message_id: str) -> bool:
    """Delete a chat message."""
    db_message = get_chat_message(db, message_id)
    if db_message:
        db.delete(db_message)
        db.commit()
        return True
    return False 