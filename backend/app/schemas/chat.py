from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ChatMessageBase(BaseModel):
    content: str
    role: str  # 'user' or 'assistant'
    

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: str
    session_id: str
    created_at: datetime  # Use created_at consistently
    
    class Config:
        orm_mode = True

class ChatSessionBase(BaseModel):
    title: str

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSession(ChatSessionBase):
    id: str
    user_id: str
    created_at: datetime
    
    class Config:
        orm_mode = True

class ChatSessionWithMessages(ChatSession):
    messages: List[ChatMessage] = []
    
    class Config:
        orm_mode = True

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None 