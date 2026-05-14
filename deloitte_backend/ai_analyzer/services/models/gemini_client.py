import os
import json
import time
import re
import asyncio
from typing import List, Dict, Any, cast
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

class GeminiClient:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in .env file")
        
        self.client = genai.Client(api_key=self.api_key)
        self.model_name = "gemini-2.5-flash" 
        self.cost_per_1M_input = 0.30
        self.cost_per_1M_output = 2.50
        
    def _repair_truncated_json(self, json_str: str) -> Dict[str, Any]:
        """Self-healing logic for AI responses that cut off mid-sentence."""
        json_str = json_str.strip()
        if not json_str: return {"test_cases": []}
        
        # Close open quotes
        if json_str.count('"') % 2 != 0: json_str += '"'
        
        # Balance braces and brackets
        stack = []
        for char in json_str:
            if char == '{': stack.append('}')
            elif char == '[': stack.append(']')
            elif char == '}' and stack and stack[-1] == '}': stack.pop()
            elif char == ']' and stack and stack[-1] == ']': stack.pop()
        
        repair_suffix = "".join(reversed(stack))
        try:
            return json.loads(json_str + repair_suffix)
        except:
            # Fallback: slice to the last valid object
            last_obj = json_str.rfind('},')
            if last_obj != -1:
                try: return json.loads(json_str[:last_obj] + '}]}')
                except: pass
            return {"test_cases": []}

    async def generate_test_cases(self, code_context: str):
        if not code_context.strip(): return [], 0.0, 0.0
        start_time = time.time()
        
        prompt = f"""You are a Principal QA Automation Architect. Return STRICT JSON.
### CODE_STRUCTURE_RULES:
- Start 'code' blocks with: `import pytest`, `import uuid`, `import time`.
- Use `str(uuid.uuid4())` for IDs. NEVER use `playwright.uuid4()`.
- Use `int(time.time())` for timestamps. NEVER use `playwright.timestamp()`.
- API Context: Use `base_url="http://127.0.0.1:8000"`.

CODEBASE:
{code_context[:50000]} 

### OUTPUT SCHEMA:
{{
  "test_cases": [
    {{
      "test_case_name": "Scenario",
      "description": "Short desc",
      "steps": "1. Step\\n2. Step",
      "priority": "High",
      "category": "Functional",
      "confidence_score": 0.95,
      "reasoning": "Reasoning",
      "code": "import pytest\\nimport uuid\\nimport time\\ndef test_x(playwright):..."
    }}
  ],
  "project_summary": "Overview",
  "tech_stack": ["Stack"]
}}
"""
        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=8192, 
                    response_mime_type="application/json"
                )
            )
            
            raw_text = response.text.strip() if response.text else ""
            if "{" in raw_text:
                raw_text = raw_text[raw_text.find("{"):raw_text.rfind("}")+1]
            if not raw_text: return [], 0.0, 0.0
            
            try:
                result = json.loads(raw_text)
            except json.JSONDecodeError:
                result = self._repair_truncated_json(raw_text)

            test_cases_raw = result.get('test_cases', []) if isinstance(result, dict) else result
            final_test_cases: List[Dict[str, Any]] = []
            
            for item in test_cases_raw:
                if not isinstance(item, dict): continue
                tc = cast(Dict[str, Any], item)
                
                # --- AUTO-CORRECTION LAYER ---
                code = str(tc.get('code', ''))
                code = code.replace("playwright.uuid4()", "str(uuid.uuid4())")
                code = code.replace("playwright.timestamp()", "int(time.time())")
                
                # Prepend missing imports
                needed_imports = []
                if "import uuid" not in code: needed_imports.append("import uuid")
                if "import pytest" not in code: needed_imports.append("import pytest")
                if "import time" not in code: needed_imports.append("import time")
                if needed_imports:
                    code = "\n".join(needed_imports) + "\n" + code

                tc['code'] = re.sub(r'```python|```', '', code).strip()
                tc['model_source'] = "Gemini 2.5"
                tc['generated_by'] = f'Sentinel Agent ({self.model_name})'
                if 'reasoning' not in tc: tc['reasoning'] = "Validated via logic density."
                
                final_test_cases.append(tc)

            elapsed = time.time() - start_time
            
            # Robust Cost Tracking
            usage = response.usage_metadata
            it = getattr(usage, 'prompt_token_count', 0) or 0
            ot = getattr(usage, 'candidates_token_count', 0) or 0
            cost = ((it / 1_000_000) * self.cost_per_1M_input) + ((ot / 1_000_000) * self.cost_per_1M_output)
            
            return final_test_cases, elapsed, cost
            
        except Exception as e:
            if "429" in str(e):
                await asyncio.sleep(10)
                return await self.generate_test_cases(code_context)
            print(f"❌ Gemini Error: {str(e)}")
            return [], 0.0, 0.0