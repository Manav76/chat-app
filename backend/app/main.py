from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from app.database import create_db_and_tables, get_db
from app.models.user import User
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.api import user_routes, auth_routes, chat_routes
from app.services.auth import SECRET_KEY
from app.migrations.update_schema import run_migrations
import uvicorn
import os
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Chat API",
    description="Production-ready Chat API",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware, allowed_hosts=["yourdomain.com", "localhost"]
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s")
    return response

@app.on_event("startup")
def on_startup():
    logger.info("Starting application")
    
    # Check if SECRET_KEY is properly set
    if not SECRET_KEY:
        logger.error("SECRET_KEY is not set in environment variables!")
    else:
        logger.info(f"SECRET_KEY is set: {SECRET_KEY[:5]}...")
    
    # Create tables and run migrations
    create_db_and_tables()
    try:
        run_migrations()
    except Exception as e:
        logger.error(f"Error running migrations: {e}")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Chat API"}

app.include_router(user_routes.router)
app.include_router(auth_routes.router)
app.include_router(chat_routes.router)

# Example endpoint to test database
@app.get("/users/")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 