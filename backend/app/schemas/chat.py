from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class ChatMessageBase(BaseModel):
    role: str
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id: str
    session_id: str
    timestamp: datetime
    
    class Config:
        orm_mode = True

class ChatSessionBase(BaseModel):
    title: str

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSessionResponse(ChatSessionBase):
    id: str
    user_id: str
    created_at: datetime
    is_deleted: bool
    
    class Config:
        orm_mode = True

class ChatSessionWithMessages(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []
    
    class Config:
        orm_mode = True 