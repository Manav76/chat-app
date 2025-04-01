import os
import logging
import json
import asyncio
import aiohttp
from typing import List, Dict, AsyncGenerator, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
logger.info(f"OpenAI API Key set: {OPENAI_API_KEY[:5]}..." if OPENAI_API_KEY else "OpenAI API Key not set!")

async def generate_chat_response(messages: List[Dict[str, str]], stream: bool = False) -> str:
    """
    Generate a response using OpenAI's API.
    
    Args:
        messages: List of message objects with role and content
        stream: Whether to stream the response
        
    Returns:
        The generated response text
    """
    if not OPENAI_API_KEY:
        logger.error("OpenAI API key is not set")
        return "Error: OpenAI API key is not configured."
    
    # For development/testing, use a simulated response
    USE_SIMULATION = False # Set to False to use the actual OpenAI API
    
    if USE_SIMULATION:
        # Simulated response for testing
        prompt = messages[-1]['content'] if messages else "No message provided"
        return f"This is a simulated non-streaming response to: '{prompt}'"
    
    # Real OpenAI API call
    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
        
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"OpenAI API error: {response.status} - {error_text}")
                    return f"Error: OpenAI API error: {response.status}"
                
                response_data = await response.json()
                return response_data['choices'][0]['message']['content']
                
    except Exception as e:
        logger.error(f"Error generating response from OpenAI: {e}")
        return f"Sorry, I encountered an error: {str(e)}"

async def stream_chat_response(messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
    """
    Stream a response from OpenAI's API using direct HTTP requests.
    
    Args:
        messages: List of message objects with role and content
        
    Yields:
        Chunks of the generated response
    """
    if not OPENAI_API_KEY:
        logger.error("OpenAI API key is not set")
        yield json.dumps({"type": "error", "error": "OpenAI API key is not configured."})
        return

    # For development/testing, use a simulated response
    USE_SIMULATION = False # Set to False to use the actual OpenAI API

    if USE_SIMULATION:
        prompt = messages[-1]['content'] if messages else "No message provided"
        response_text = f"I'm an AI assistant. You asked: '{prompt}'. This is a simulated response to help with testing the streaming functionality."
        
        for char in response_text:
            yield json.dumps({"type": "content", "content": char})
            await asyncio.sleep(0.01)
        return
    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
        
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1000,
            "stream": True
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"OpenAI API error: {response.status} - {error_text}")
                    yield json.dumps({"type": "error", "error": f"OpenAI API error: {response.status}"})
                    return
                
                # Process the streaming response
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line.startswith('data: ') and not line.startswith('data: [DONE]'):
                        data = line[6:]  
                        try:
                            json_data = json.loads(data)
                            if 'choices' in json_data and len(json_data['choices']) > 0:
                                delta = json_data['choices'][0].get('delta', {})
                                content = delta.get('content')
                                if content:
                                    yield json.dumps({"type": "content", "content": content})
                        except json.JSONDecodeError as e:
                            logger.error(f"Error parsing JSON from OpenAI: {e} - {line}")
                    elif line.startswith('data: [DONE]'):
                        break
                    
    except Exception as e:
        logger.error(f"Error streaming response from OpenAI: {e}")
        yield json.dumps({"type": "error", "error": str(e)}) 