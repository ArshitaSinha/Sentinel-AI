import os
from anthropic import AsyncAnthropic
import json
import time

class ClaudeClient:
    def __init__(self):
        self.api_key = os.environ.get("CLAUDE_API_KEY")
        if not self.api_key:
            print("⚠️ CLAUDE_API_KEY missing, Claude will be disabled")
            self.client = None
        else:
            self.client = AsyncAnthropic(api_key=self.api_key)
        
        self.model_name = "claude-3-5-sonnet-20241022"
        self.cost_per_1k_tokens = 0.003
        
    async def generate_test_cases(self, code_context: str):
        if not self.client: return [], 0, 0
        
        start_time = time.time()
        prompt = f"""Generate SECURITY & EDGE CASE tests.
Codebase:
{code_context}

Return ONLY valid JSON with test_cases array. Each object needs:
- test_case_name
- description
- steps
- priority
- category: Security
- status: ""
- date: ""
- poc: ""
"""
        try:
            message = await self.client.messages.create(
                model=self.model_name,
                max_tokens=4096,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = ""
            for block in message.content:
                if block.type == "text": response_text += block.text
            
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(response_text)
            test_cases = result.get('test_cases', [])
            
            for tc in test_cases:
                tc['generated_by'] = 'Claude (Security)'
                tc['confidence_score'] = 0.92
                tc['category'] = 'Security'
            
            elapsed = time.time() - start_time
            cost = len(code_context) / 1000 * self.cost_per_1k_tokens
            print(f"✅ Claude: {len(test_cases)} tests in {elapsed:.2f}s")
            return test_cases, elapsed, cost
            
        except Exception as e:
            print(f"❌ Claude error: {e}")
            return [], 0, 0
