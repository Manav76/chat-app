import openai
import os
from typing import List, Dict, Any, Union, AsyncGenerator
from dotenv import load_dotenv
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Set OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")
logger.info(f"OpenAI API Key set: {openai.api_key[:5]}..." if openai.api_key else "OpenAI API Key not set!")

# Configure OpenAI client
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=openai.api_key)

async def generate_chat_response(messages: List[Dict[str, str]], stream: bool = True) -> Union[AsyncGenerator[str, None], str]:
    """
    Generate a response from OpenAI's chat model.
    
    Args:
        messages: List of message objects with role and content
        stream: Whether to stream the response
        
    Returns:
        If stream=True: AsyncGenerator yielding response chunks
        If stream=False: Complete response as string
    """
    try:
        if not openai.api_key:
            error_msg = "OpenAI API key is not set"
            logger.error(error_msg)
            if stream:
                async def error_generator():
                    yield error_msg
                return error_generator()
            else:
                return error_msg
        
        logger.info(f"Generating response for messages: {messages[:1]}...")
        
        if stream:
            async def content_generator():
                try:
                    # Use the new client API
                    stream_response = await client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=messages,
                        stream=True,
                        temperature=0.7,
                        max_tokens=1000
                    )
                    
                    # Stream the response
                    async for chunk in stream_response:
                        if chunk.choices and len(chunk.choices) > 0:
                            delta = chunk.choices[0].delta
                            content = delta.content
                            if content is not None:  # Check for None explicitly
                                yield content
                except Exception as e:
                    logger.error(f"Error in streaming response: {e}")
                    yield f"Error: {str(e)}"
            
            return content_generator()
        else:
            # Use the new client API for non-streaming
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            return response.choices[0].message.content
            
    except Exception as e:
        logger.error(f"Error generating OpenAI response: {e}")
        if stream:
            async def error_generator():
                yield f"Error: {str(e)}"
            return error_generator()
        else:
            return f"Error: {str(e)}" 