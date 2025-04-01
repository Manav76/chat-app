from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.api.auth_routes import get_current_user
from app.schemas.chat import (
    ChatSession, ChatSessionCreate, ChatMessage, 
    ChatMessageCreate, ChatSessionWithMessages, ChatRequest,
    ChatSessionResponse, ChatMessageResponse
)
from app.crud.chat_session import (
    create_chat_session, get_chat_sessions, get_chat_session,
    update_chat_session, delete_chat_session
)
from app.crud.chat_message import (
    create_chat_message, get_chat_messages, get_chat_message,
    delete_chat_message
)
from app.services.ai_service_factory import AIServiceFactory
from typing import List
import json
import logging
import asyncio
import uuid
from datetime import datetime
import os

router = APIRouter(prefix="/chat", tags=["chat"])

logger = logging.getLogger(__name__)

ai_service = AIServiceFactory.get_service()
generate_chat_response = ai_service["generate"]
stream_chat_response = ai_service["stream"]

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    session_data: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chat session."""
    return create_chat_session(db, session_data, str(current_user.id))

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all chat sessions for the current user."""
    return get_chat_sessions(db, str(current_user.id))

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific chat session."""
    session = get_chat_session(db, session_id, str(current_user.id))
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    return session

@router.put("/sessions/{session_id}", response_model=ChatSessionResponse)
async def update_session(
    session_id: str,
    session_data: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a chat session."""
    session = update_chat_session(db, session_id, session_data.title, str(current_user.id))
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    return session

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chat session."""
    success = delete_chat_session(db, session_id, str(current_user.id))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    return {"message": "Chat session deleted successfully"}

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all messages for a chat session."""
    session = get_chat_session(db, session_id, str(current_user.id))
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    return get_chat_messages(db, session_id)

@router.post("/send", response_model=ChatMessage)
async def send_message(
    chat_request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message and get a non-streaming response."""
    session_id = chat_request.session_id
    if not session_id:
        title = chat_request.message[:30] + "..." if len(chat_request.message) > 30 else chat_request.message
        session = create_chat_session(db, ChatSessionCreate(title=title), str(current_user.id))
        session_id = session.id
    else:
        session = get_chat_session(db, session_id, str(current_user.id))
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
    
    user_message = create_chat_message(
        db, 
        ChatMessageCreate(content=chat_request.message, role="user"),
        session_id
    )
    
    # Get all messages for context
    messages = get_chat_messages(db, session_id)
    openai_messages = [{"role": msg.role, "content": msg.content} for msg in messages]
    
    response_content = await generate_chat_response(openai_messages, stream=False)
    
    assistant_message = create_chat_message(
        db,
        ChatMessageCreate(content=response_content, role="assistant"),
        session_id
    )
    
    return assistant_message

@router.post("/stream")
async def stream_chat(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Stream a chat response."""
    message = request.get("message", "")
    session_id = request.get("session_id")
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is required"
        )
    if not session_id:
        title = message[:30] + "..." if len(message) > 30 else message
        session = create_chat_session(db, ChatSessionCreate(title=title), str(current_user.id))
        session_id = session.id
    else:
        session = get_chat_session(db, session_id, str(current_user.id))
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
    user_message = ChatMessageCreate(
        content=message,
        role="user"
    )
    
    user_message_db = create_chat_message(db, user_message, session_id)
    messages = get_chat_messages(db, session_id)
    ai_messages = []
    for msg in messages:
        role = msg.role
        if role not in ["user", "assistant", "system"]:
            role = "user" if role == "user" else "assistant"
        
        ai_messages.append({
            "role": role,
            "content": msg.content
        })
    message_id = str(uuid.uuid4())
    complete_response = []
    
    async def generate():
        nonlocal complete_response
        yield json.dumps({"type": "message_id", "message_id": message_id}) + "\n"
        response_text = ""
        async for chunk in stream_chat_response(ai_messages):
            yield chunk + "\n"
            try:
                chunk_data = json.loads(chunk)
                if chunk_data.get("type") == "content" and chunk_data.get("content"):
                    content = chunk_data["content"]
                    response_text += content
                    complete_response.append(content)
            except Exception as e:
                logger.error(f"Error parsing chunk: {e} - {chunk}")
        try:
            final_response = "".join(complete_response)
            logger.info(f"Saving assistant message with ID {message_id}, content length: {len(final_response)}")
            if not final_response:
                final_response = "I'm sorry, I couldn't generate a response. Please try again."
                logger.warning("Empty response from AI service, using fallback message")
            
            assistant_message = ChatMessageCreate(
                content=final_response,
                role="assistant"
            )
            create_chat_message(db, assistant_message, session_id, message_id)
        except Exception as e:
            logger.error(f"Error saving assistant message: {e}")
            yield json.dumps({"type": "error", "error": f"Error saving message: {str(e)}"}) + "\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream") 