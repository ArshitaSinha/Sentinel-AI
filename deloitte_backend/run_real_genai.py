import asyncio
import json
import sys
import os

# Ensure ai_analyzer package is importable
sys.path.insert(0, os.path.abspath('ai_analyzer'))

from ai_analyzer.services import llm_chains

async def run_real():
    # Use the real client (llm_chains.client initialized from env)
    code_map = {"sample.py": "def add(a,b):\n    return a+b\n"}
    out = []
    async for chunk in llm_chains.generate_tests_chain(code_map):
        out.append(chunk)
        print(json.dumps(chunk, ensure_ascii=False))

    # Save full stream
    with open('gen_tests_real.ndjson', 'w', encoding='utf-8') as fh:
        for item in out:
            fh.write(json.dumps(item, ensure_ascii=False) + '\n')

if __name__ == '__main__':
    asyncio.run(run_real())
