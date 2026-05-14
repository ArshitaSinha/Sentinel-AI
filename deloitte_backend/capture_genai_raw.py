import os
from dotenv import load_dotenv
load_dotenv()
from google import genai
from google.genai import types

# Try env var first, then fall back to reading .env directly
API_KEY = os.getenv('GEMINI_API_KEY')
if not API_KEY:
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as fh:
            for line in fh:
                if line.strip().startswith('GEMINI_API_KEY='):
                    API_KEY = line.strip().split('=',1)[1]
                    break
# Fallback to absolute known path
if not API_KEY:
    abs_path = r"C:\Users\arshi\Downloads\Sentinel-AI-main\Sentinel-AI-main\deloitte_backend\.env"
    if os.path.exists(abs_path):
        with open(abs_path, 'r', encoding='utf-8') as fh:
            for line in fh:
                if line.strip().startswith('GEMINI_API_KEY='):
                    API_KEY = line.strip().split('=',1)[1]
                    break
if not API_KEY:
    print('GEMINI_API_KEY not set')
    raise SystemExit(1)

client = genai.Client(api_key=API_KEY)

ANALYSIS_TEMPLATE = '''Analyze this code architecture briefly.\nFILE: sample.py\ndef add(a,b):\n    return a+b\n\nOUTPUT JSON ONLY:\n{\n  "project_summary": "2-3 sentences explaining what this project does technically.",\n  "gap_analysis": "3 bullet points listing critical missing security or logic checks."\n}\n'''

TEST_GEN_TEMPLATE = '''Based on the code provided:\nFILE: sample.py\ndef add(a,b):\n    return a+b\n\nGenerate 2 Pytest cases. OUTPUT JSON ONLY:\n{\n  "test_cases": [\n    {\n      "test_case_name": "Test Add",\n      "code": "def test_add():..."\n    }\n  ]\n}\n'''

print('Calling GenAI for analysis...')
resp = client.models.generate_content(model='gemini-2.5-flash', contents=ANALYSIS_TEMPLATE, config=types.GenerateContentConfig(response_mime_type='text/plain'))
raw_analysis = getattr(resp, 'text', '') or ''
with open('ai_analyzer/analysis_response_raw.txt', 'w', encoding='utf-8') as fh:
    fh.write(raw_analysis)
print('Wrote ai_analyzer/analysis_response_raw.txt')

print('Calling GenAI for tests...')
resp2 = client.models.generate_content(model='gemini-2.5-flash', contents=TEST_GEN_TEMPLATE, config=types.GenerateContentConfig(response_mime_type='text/plain'))
raw_tests = getattr(resp2, 'text', '') or ''
with open('ai_analyzer/test_response_raw.txt', 'w', encoding='utf-8') as fh:
    fh.write(raw_tests)
print('Wrote ai_analyzer/test_response_raw.txt')
