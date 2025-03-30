import uvicorn
import os
import multiprocessing
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Get the number of workers based on CPU cores
workers = multiprocessing.cpu_count() * 2 + 1

if __name__ == "__main__":
    logger.info(f"Starting production server with {workers} workers")
    # Use Uvicorn with production settings
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        workers=workers,
        log_level="info",
        reload=False,  # Disable reload in production
        access_log=True,
        proxy_headers=True  # Trust proxy headers (important behind load balancers)
    ) 