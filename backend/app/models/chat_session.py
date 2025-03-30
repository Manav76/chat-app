from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    is_deleted = Column(Boolean, default=False) #to soft_delete the sessions
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan") 