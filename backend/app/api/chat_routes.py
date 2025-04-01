from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.api.auth_routes import get_current_user
from app.schemas.chat import (
    ChatSession, ChatSessionCreate, ChatMessage, 
    ChatMessageCreate, ChatSessionWithMessages, ChatRequest
)
from app.crud.chat_session import (
    create_chat_session, get_chat_sessions, get_chat_session,
    update_chat_session, delete_chat_session
)
from app.crud.chat_message import (
    create_chat_message, get_chat_messages, get_chat_message,
    delete_chat_message
)
from app.services.openai_service import generate_chat_response
from typing import List
import json
import logging

router = APIRouter(prefix="/chat", tags=["chat"])

logger = logging.getLogger(__name__)

@router.post("/sessions", response_model=ChatSession)
async def create_session(
    session_data: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chat session."""
    return create_chat_session(db, session_data, current_user.id)

@router.get("/sessions", response_model=List[ChatSession])
async def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all chat sessions for the current user."""
    return get_chat_sessions(db, current_user.id)

@router.get("/sessions/{session_id}", response_model=ChatSessionWithMessages)
async def get_session_with_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a chat session with all its messages."""
    session = get_chat_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Get messages for the session
    messages = get_chat_messages(db, session_id)
    
    # Create a response object with session and messages
    response = ChatSessionWithMessages(
        id=session.id,
        title=session.title,
        user_id=session.user_id,
        created_at=session.created_at,
        messages=messages
    )
    
    return response

@router.put("/sessions/{session_id}", response_model=ChatSession)
async def update_session(
    session_id: str,
    session_data: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a chat session's title."""
    updated_session = update_chat_session(db, session_id, session_data.title, current_user.id)
    if not updated_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    return updated_session

@router.delete("/sessions/{session_id}", response_model=dict)
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chat session."""
    success = delete_chat_session(db, session_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    return {"success": True}

@router.post("/send", response_model=ChatMessage)
async def send_message(
    chat_request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message and get a non-streaming response."""
    # Create or get session
    session_id = chat_request.session_id
    if not session_id:
        # Create a new session with the first few words as the title
        title = chat_request.message[:30] + "..." if len(chat_request.message) > 30 else chat_request.message
        session = create_chat_session(db, ChatSessionCreate(title=title), current_user.id)
        session_id = session.id
    else:
        # Verify the session belongs to the user
        session = get_chat_session(db, session_id, current_user.id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
    
    # Save user message
    user_message = create_chat_message(
        db, 
        ChatMessageCreate(content=chat_request.message, role="user"),
        session_id
    )
    
    # Get all messages for context
    messages = get_chat_messages(db, session_id)
    openai_messages = [{"role": msg.role, "content": msg.content} for msg in messages]
    
    # Generate response (non-streaming)
    response_content = await generate_chat_response(openai_messages, stream=False)
    
    # Save assistant message
    assistant_message = create_chat_message(
        db,
        ChatMessageCreate(content=response_content, role="assistant"),
        session_id
    )
    
    return assistant_message

@router.post("/stream")
async def stream_chat(
    chat_request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Stream a chat response."""
    try:
        logger.info(f"Stream request received from user {current_user.id} with message: {chat_request.message[:30]}...")
        
        # Get or create a session
        session_id = chat_request.session_id
        if not session_id:
            # Create a new session with the first few words as the title
            title = chat_request.message[:30] + "..." if len(chat_request.message) > 30 else chat_request.message
            session = create_chat_session(
                db, 
                ChatSessionCreate(title=title),
                current_user.id
            )
            session_id = session.id
            logger.info(f"Created new session {session_id} for user {current_user.id}")
        else:
            # Verify the session exists and belongs to the user
            session = get_chat_session(db, session_id, current_user.id)
            if not session:
                logger.warning(f"Session {session_id} not found for user {current_user.id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chat session not found"
                )
            logger.info(f"Using existing session {session_id} for user {current_user.id}")
        
        # Save user message
        user_message = create_chat_message(
            db, 
            ChatMessageCreate(content=chat_request.message, role="user"),
            session_id
        )
        logger.info(f"Saved user message {user_message.id} to session {session_id}")
        
        # Get all messages for context
        messages = get_chat_messages(db, session_id)
        openai_messages = [{"role": msg.role, "content": msg.content} for msg in messages]
        
        # Create a variable to accumulate the response
        full_response = ""
        
        async def response_generator():
            nonlocal full_response
            
            # Send initial response with session_id
            yield json.dumps({
                "type": "session_id",
                "session_id": session_id
            }) + "\n"
            
            try:
                # Stream the response
                logger.info(f"Starting OpenAI stream for session {session_id}")
                generator = await generate_chat_response(openai_messages, stream=True)
                
                async for content_chunk in generator:
                    full_response += content_chunk
                    yield json.dumps({
                        "type": "content",
                        "content": content_chunk
                    }) + "\n"
                
                # Save the complete response
                logger.info(f"Stream complete, saving assistant response for session {session_id}")
                assistant_message = create_chat_message(
                    db,
                    ChatMessageCreate(content=full_response, role="assistant"),
                    session_id
                )
                
                # Send the message ID as the final chunk
                yield json.dumps({
                    "type": "message_id",
                    "message_id": assistant_message.id
                }) + "\n"
                logger.info(f"Saved assistant message {assistant_message.id} to session {session_id}")
            except Exception as e:
                logger.error(f"Error in streaming response: {e}")
                yield json.dumps({
                    "type": "error",
                    "error": str(e)
                }) + "\n"
        
        return StreamingResponse(
            response_generator(),
            media_type="application/json"
        )
    except Exception as e:
        logger.error(f"Error in stream_chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        ) 