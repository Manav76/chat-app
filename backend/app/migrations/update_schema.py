from sqlalchemy import create_engine, text
from app.database import DATABASE_URL
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """Run database migrations to update schema."""
    engine = create_engine(DATABASE_URL)
    conn = engine.connect()
    
    try:
        # Check if chat_messages table exists
        result = conn.execute(text("SHOW TABLES LIKE 'chat_messages'"))
        if not result.fetchone():
            logger.warning("chat_messages table does not exist yet, skipping migration")
            return
        
        # Check if created_on column exists in chat_messages
        result = conn.execute(text("SHOW COLUMNS FROM chat_messages LIKE 'created_on'"))
        created_on_exists = result.fetchone() is not None
        
        # Check if created_at column exists in chat_messages
        result = conn.execute(text("SHOW COLUMNS FROM chat_messages LIKE 'created_at'"))
        created_at_exists = result.fetchone() is not None
        
        # Standardize on created_at
        if created_on_exists and not created_at_exists:
            # Rename created_on to created_at
            logger.info("Renaming 'created_on' to 'created_at' in chat_messages table")
            conn.execute(text("ALTER TABLE chat_messages CHANGE COLUMN created_on created_at DATETIME"))
            conn.commit()
            logger.info("Column renamed successfully")
        elif created_on_exists and created_at_exists:
            # Both columns exist, drop created_on
            logger.info("Both created_on and created_at exist, dropping created_on")
            conn.execute(text("ALTER TABLE chat_messages DROP COLUMN created_on"))
            conn.commit()
            logger.info("Column dropped successfully")
        elif not created_at_exists:
            # Neither column exists, add created_at
            logger.info("Adding 'created_at' column to chat_messages table")
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"))
            conn.commit()
            logger.info("Column added successfully")
        else:
            logger.info("created_at column already exists in chat_messages table")
        
        logger.info("Database schema update completed successfully")
    except Exception as e:
        logger.error(f"Error updating database schema: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migrations() 