import asyncio
import json
import sys
import os

# Ensure ai_analyzer package folder is on the import path so `services` is resolvable
sys.path.insert(0, os.path.abspath('ai_analyzer'))

from ai_analyzer.services import llm_chains

async def run_demo():
    # Force fallback by disabling the GenAI client in the module
    llm_chains.client = None

    # Provide a small code map (could be empty)
    code_map = {"sample.py": "def add(a,b):\n    return a+b\n"}

    out_lines = []
    async for chunk in llm_chains.generate_tests_chain(code_map):
        out_lines.append(chunk)
        print(json.dumps(chunk, ensure_ascii=False))

    # Save NDJSON
    with open('gen_tests_fallback.ndjson', 'w', encoding='utf-8') as fh:
        for item in out_lines:
            fh.write(json.dumps(item, ensure_ascii=False) + '\n')

if __name__ == '__main__':
    asyncio.run(run_demo())
