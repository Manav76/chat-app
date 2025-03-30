from sqlalchemy import Column, String, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(50), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=func.now())
    
    # Relationship
    session = relationship("ChatSession", back_populates="messages") 