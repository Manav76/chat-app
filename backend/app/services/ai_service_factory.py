import os
import logging
import json
from typing import Dict, Any, Callable

# Import services
from app.services.openai_service import generate_chat_response as openai_generate
from app.services.openai_service import stream_chat_response as openai_stream
from app.services.gemini_service import generate_chat_response as gemini_generate
from app.services.gemini_service import stream_chat_response as gemini_stream

logger = logging.getLogger(__name__)

# Check API keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Default to Gemini if both are available
DEFAULT_SERVICE = "gemini" if GEMINI_API_KEY else "openai"

class AIServiceFactory:
    """Factory class to get the appropriate AI service based on availability and preference."""
    
    @staticmethod
    def get_service(service_name: str = None) -> Dict[str, Callable]:
        """
        Get the appropriate AI service functions.
        
        Args:
            service_name: The name of the service to use ('openai' or 'gemini')
                          If None, will use the available service with preference for Gemini
        
        Returns:
            Dictionary with 'generate' and 'stream' functions
        """
        # If no service specified, use the default
        if not service_name:
            service_name = DEFAULT_SERVICE
        
        if service_name == "openai" and not OPENAI_API_KEY:
            logger.warning("OpenAI API key not available, falling back to Gemini")
            service_name = "gemini" if GEMINI_API_KEY else None
        elif service_name == "gemini" and not GEMINI_API_KEY:
            logger.warning("Gemini API key not available, falling back to OpenAI")
            service_name = "openai" if OPENAI_API_KEY else None
        
        if service_name == "openai":
            logger.info("Using OpenAI service")
            return {
                "generate": openai_generate,
                "stream": openai_stream
            }
        elif service_name == "gemini":
            logger.info("Using Gemini service")
            async def gemini_generate_with_fallback(*args, **kwargs):
                try:
                    result = await gemini_generate(*args, **kwargs)
                    if result.startswith("Error:") and OPENAI_API_KEY:
                        logger.warning("Gemini API error, falling back to OpenAI")
                        return await openai_generate(*args, **kwargs)
                    return result
                except Exception as e:
                    logger.error(f"Error with Gemini API: {e}")
                    if OPENAI_API_KEY:
                        logger.warning("Falling back to OpenAI due to Gemini error")
                        return await openai_generate(*args, **kwargs)
                    raise
            
            async def gemini_stream_with_fallback(*args, **kwargs):
                try:
                    # Try with Gemini first
                    first_chunk = True
                    error_occurred = False
                    
                    logger.info("Starting Gemini streaming")
                    async for chunk in gemini_stream(*args, **kwargs):
                        # Check if the first chunk indicates an error
                        if first_chunk:
                            first_chunk = False
                            try:
                                chunk_data = json.loads(chunk)
                                if chunk_data.get("type") == "error" and OPENAI_API_KEY:
                                    logger.warning(f"Gemini streaming error: {chunk_data.get('error')}, falling back to OpenAI")
                                    error_occurred = True
                                    break
                            except Exception as e:
                                logger.error(f"Error parsing first chunk: {e}")
                        
                        yield chunk
                    
                    # If an error occurred, fall back to OpenAI
                    if error_occurred and OPENAI_API_KEY:
                        logger.info("Falling back to OpenAI streaming")
                        async for chunk in openai_stream(*args, **kwargs):
                            yield chunk
                            
                except Exception as e:
                    logger.error(f"Error with Gemini streaming API: {e}")
                    if OPENAI_API_KEY:
                        logger.warning("Falling back to OpenAI streaming due to Gemini error")
                        async for chunk in openai_stream(*args, **kwargs):
                            yield chunk
                    else:
                        yield json.dumps({"type": "error", "error": str(e)})
            
            return {
                "generate": gemini_generate_with_fallback if OPENAI_API_KEY else gemini_generate,
                "stream": gemini_stream_with_fallback if OPENAI_API_KEY else gemini_stream
            }
        else:
            # No service available
            logger.error("No AI service available - both OpenAI and Gemini API keys are missing")
            raise ValueError("No AI service available - please configure API keys") 