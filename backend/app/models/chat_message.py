from sqlalchemy import Column, String, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow) 

    @property
    def created_on(self):
        return self.created_at
    
    # Relationship
    session = relationship("ChatSession", back_populates="messages") 