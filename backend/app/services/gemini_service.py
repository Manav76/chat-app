import os
import logging
import json
import asyncio
import aiohttp
from typing import List, Dict, AsyncGenerator, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
logger.info(f"Gemini API Key set: {GEMINI_API_KEY[:5]}..." if GEMINI_API_KEY else "Gemini API Key not set!")

# Gemini API endpoint - using the correct model and version
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

async def generate_chat_response(messages: List[Dict[str, str]], stream: bool = False) -> str:
    """
    Generate a response using Google's Gemini API.
    
    Args:
        messages: List of message objects with role and content
        stream: Whether to stream the response
        
    Returns:
        The generated response text
    """
    if not GEMINI_API_KEY:
        logger.error("Gemini API key is not set")
        return "Error: Gemini API key is not configured."
    
    gemini_contents = []
    current_role = None
    current_parts = []
    
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        
        # If role changes, add the previous content
        if current_role and current_role != role:
            gemini_contents.append({
                "role": current_role,
                "parts": current_parts
            })
            current_parts = []
        
        current_role = role
        current_parts.append({"text": msg["content"]})
    
    if current_role and current_parts:
        gemini_contents.append({
            "role": current_role,
            "parts": current_parts
        })
    
    # If no messages, create a default user message
    if not gemini_contents:
        gemini_contents = [{
            "parts": [{"text": "Hello"}]
        }]
    

    try:
        url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": gemini_contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 1000,
                "topP": 0.95,
                "topK": 40
            }
        }
        
        logger.info(f"Sending request to Gemini API: {url}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                json=payload
            ) as response:
                response_text = await response.text()
                
                if response.status != 200:
                    logger.error(f"Gemini API error: {response.status} - {response_text}")
                    return f"Error: Gemini API error: {response.status}"
                
                try:
                    response_data = json.loads(response_text)
                    try:
                        return response_data["candidates"][0]["content"]["parts"][0]["text"]
                    except (KeyError, IndexError) as e:
                        logger.error(f"Error extracting response from Gemini: {e}")
                        logger.error(f"Response data: {response_data}")
                        return "Error: Could not extract response from Gemini API"
                except json.JSONDecodeError as e:
                    logger.error(f"Error parsing JSON from Gemini: {e}")
                    logger.error(f"Raw response: {response_text}")
                    return f"Error: Invalid JSON response from Gemini API: {str(e)}"
                
    except Exception as e:
        logger.error(f"Error generating response from Gemini: {e}")
        return f"Sorry, I encountered an error: {str(e)}"

async def stream_chat_response(messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
    """
    Stream a response from Google's Gemini API.
    
    Args:
        messages: List of message objects with role and content
        
    Yields:
        Chunks of the generated response
    """
    if not GEMINI_API_KEY:
        logger.error("Gemini API key is not set")
        yield json.dumps({"type": "error", "error": "Gemini API key is not configured."})
        return
    gemini_contents = []
    current_role = None
    current_parts = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        if current_role and current_role != role:
            gemini_contents.append({
                "role": current_role,
                "parts": current_parts
            })
            current_parts = []
        
        current_role = role
        current_parts.append({"text": msg["content"]})
    if current_role and current_parts:
        gemini_contents.append({
            "role": current_role,
            "parts": current_parts
        })
    
    # If no messages, create a default user message
    if not gemini_contents:
        gemini_contents = [{
            "parts": [{"text": "Hello"}]
        }]

    # Gemini doesn't support true streaming like OpenAI, so we'll simulate it
    # by getting the full response and then streaming it character by character
    try:
        url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": gemini_contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 1000,
                "topP": 0.95,
                "topK": 40
            }
        }
        
        logger.info(f"Sending streaming request to Gemini API: {url}")
        logger.info(f"Request payload: {json.dumps(payload)}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                json=payload
            ) as response:
                response_text = await response.text()
                
                if response.status != 200:
                    logger.error(f"Gemini API error: {response.status} - {response_text}")
                    yield json.dumps({"type": "error", "error": f"Gemini API error: {response.status} - {response_text[:100]}"})
                    return
                
                try:
                    response_data = json.loads(response_text)
                    
                    # Extract the response text from Gemini's response format
                    try:
                        full_response = response_data["candidates"][0]["content"]["parts"][0]["text"]
                        
                        logger.info(f"Got response from Gemini, length: {len(full_response)}")
                        
                        # Stream the response character by character
                        for char in full_response:
                            yield json.dumps({"type": "content", "content": char})
                            # Small delay to simulate streaming
                            await asyncio.sleep(0.01)
                            
                    except (KeyError, IndexError) as e:
                        logger.error(f"Error extracting response from Gemini: {e}")
                        logger.error(f"Response data: {response_data}")
                        yield json.dumps({"type": "error", "error": "Could not extract response from Gemini API"})
                except json.JSONDecodeError as e:
                    logger.error(f"Error parsing JSON from Gemini: {e}")
                    logger.error(f"Raw response: {response_text}")
                    yield json.dumps({"type": "error", "error": f"Invalid JSON response from Gemini API: {str(e)}"})
                    
    except Exception as e:
        logger.error(f"Error streaming response from Gemini: {e}")
        yield json.dumps({"type": "error", "error": str(e)}) 