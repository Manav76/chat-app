from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


class ChatMessageBase(BaseModel):
    content: str
    role: str = "user"  # Default role is user

class ChatSessionBase(BaseModel):
    title: str


class ChatMessageCreate(ChatMessageBase):
    pass

class ChatSessionCreate(ChatSessionBase):
    pass


class ChatMessageResponse(ChatMessageBase):
    id: str
    session_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        orm_mode = True

class ChatSessionResponse(ChatSessionBase):
    id: str
    user_id: str
    created_at: datetime
    
    class Config:
        orm_mode = True


class ChatSessionWithMessages(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatMessage(ChatMessageResponse):
    pass

class ChatSession(ChatSessionResponse):
    pass 