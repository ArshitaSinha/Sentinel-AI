import os
import asyncio
import re
from typing import List, Tuple, Dict, Protocol, runtime_checkable, cast
from .gemini_client import GeminiClient
from .claude_client import ClaudeClient

@runtime_checkable
class TestCaseGenerator(Protocol):
    async def generate_test_cases(self, code_context: str) -> Tuple[List[Dict], float, float]:
        ...

class EnsembleOrchestrator:
    def __init__(self):
        self.use_gemini = os.getenv("USE_GEMINI", "true").lower() == "true"
        self.use_claude = os.getenv("USE_CLAUDE", "true").lower() == "true"
        self.clients = []

        if self.use_gemini:
            try: self.clients.append(("Gemini", GeminiClient()))
            except: pass
        if self.use_claude:
            try: self.clients.append(("Claude", ClaudeClient()))
            except: pass

    async def generate_all_test_cases(self, code_context: str):
        tasks = [client.generate_test_cases(code_context) for _, client in self.clients]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_tests = []
        total_time = 0.0
        cost_breakdown = {"gemini": 0.0, "claude": 0.0, "total": 0.0}
        models_used = []

        for (name, _), result in zip(self.clients, results):
            if isinstance(result, BaseException):
                continue
            
            tests, elapsed, cost = result
            for tc in tests:
                # APPLY THE NUCLEAR CLEANER
                tc["code"] = self._sanitize_playwright_code(tc["code"])
                tc["model_source"] = name
                tc["generated_by"] = f"Sentinel Ensemble ({name})"
                if "confidence_score" not in tc: tc["confidence_score"] = 0.85
                all_tests.append(tc)

            total_time = max(total_time, elapsed)
            key = name.lower()
            if key in cost_breakdown: cost_breakdown[key] += cost
            cost_breakdown["total"] += cost
            models_used.append(name)

        unique_tests, duplicates_count = self.deduplicate_tests(all_tests)
        ranked_tests = self.rank_by_priority(unique_tests)

        return ranked_tests, models_used, total_time, cost_breakdown, duplicates_count

    def _sanitize_playwright_code(self, code: str) -> str:
        """Fixes the context manager TypeError and re-aligns indentation."""
        # 1. Standard fixture fixes
        code = code.replace("(api_context)", "(playwright)")
        code = code.replace("(api_context: APIRequestContext)", "(playwright: Playwright)")

        # 2. Fix the 'with' hallucination and indentation
        # We find the with block and turn it into a direct assignment
        if "with playwright.request.new_context" in code:
            # Replace the 'with' line with direct variable assignment
            code = re.sub(
                r"with\s+playwright\.request\.new_context\((.*?)\)\s+as\s+api_context:",
                r"api_context = playwright.request.new_context(\1)",
                code
            )
            
            # 3. Indentation Fix: Shift lines starting with 'api_context.' 
            # or lines following the assignment back to the left.
            lines = code.split('\n')
            fixed_lines = []
            for line in lines:
                # If a line is double-indented (8 spaces), strip one level (4 spaces)
                if line.startswith("        ") and ("api_context." in line or "expect(" in line):
                    fixed_lines.append(line[4:])
                else:
                    fixed_lines.append(line)
            code = '\n'.join(fixed_lines)

        # 4. Final safety check: if api_context is used but not defined, add it
        if "api_context." in code and "new_context" not in code:
            insertion = "\n    api_context = playwright.request.new_context()\n"
            code = re.sub(r'(def test_.*?\):)', r'\1' + insertion, code)

        return code

    def deduplicate_tests(self, test_cases: List[Dict]):
        test_cases.sort(key=lambda x: x.get("confidence_score", 0), reverse=True)
        unique, seen, duplicates = [], set(), 0
        for tc in test_cases:
            name = tc.get("test_case_name", "").lower().strip()
            if any(self._similarity(name, s) > 0.80 for s in seen):
                duplicates += 1
            else:
                unique.append(tc)
                seen.add(name)
        return unique, duplicates

    def _similarity(self, s1, s2):
        w1, w2 = set(s1.split()), set(s2.split())
        return len(w1 & w2) / len(w1 | w2) if w1 or w2 else 0.0

    def rank_by_priority(self, test_cases):
        prio = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
        return sorted(test_cases, key=lambda x: (prio.get(x.get("priority", "Medium"), 2), -x.get("confidence_score", 0.5)))