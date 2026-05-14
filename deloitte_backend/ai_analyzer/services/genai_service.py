# deloitte backend/ai_analyzer/services/genai_service.py
import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# --- STAGE 1: ASSESSMENT PROMPT ---
async def analyze_risks(code_content: str):
    prompt = f"""
    Analyze the following code for Quality Assurance.
    Return ONLY a JSON object with this exact structure (no markdown):
    {{
        "summary": "Brief 1-sentence summary of what the code does",
        "complexity_score": 5,
        "complexity_explanation": "Why it is complex",
        "risks": [
            {{"id": "R1", "severity": "High", "description": "Explanation of risk"}}
        ]
    }}

    CODE TO ANALYZE:
    {code_content}
    """
    
    response = client.models.generate_content(
        model="gemini-1.5-flash-001",  # <--- FIX: Added -001
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    return json.loads(response.text)

# --- STAGE 2: TEST GENERATION PROMPT ---
async def generate_tests(code_content: str):
    prompt = f"""
    You are a Senior SDET. Generate comprehensive Playwright (Python/Pytest) test cases for this code.
    
    CRITICAL INSTRUCTIONS:
    1. Focus on edge cases and high-risk areas.
    2. Return ONLY the raw Python code. Do not wrap in markdown or JSON.
    3. Include necessary imports (pytest, playwright).

    CODE TO TEST:
    {code_content}
    """
    
    response = client.models.generate_content(
        model="gemini-1.5-flash-001", # <--- FIX: Added -001
        contents=prompt
    )
    
    # Clean up markdown if Gemini adds it
    clean_text = response.text.replace("```python", "").replace("```", "").strip()
    return {"test_cases": clean_text}