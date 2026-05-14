from typing import List, Dict, Any
import re

class GapAnalyzer:
    def __init__(self):
        self.risk_patterns = {
            "authentication": ["login", "token", "jwt", "password", "authorize", "permission"],
            "data_integrity": ["delete", "update", "transaction", "commit", "drop", "write"],
            "external_deps": ["request", "httpx", "aiohttp", "stripe", "s3", "boto3"],
            "complex_logic": ["if", "elif", "match", "try", "except", "while"]
        }

    def analyze_gaps(self, test_cases: List[Any], code_context: str) -> Dict:
        """
        Performs a semantic gap analysis by mapping code 'risk zones' 
        to the generated test suite coverage.
        """
        suggestions = []
        
        # 1. Extract Test Metadata
        test_names = []
        test_codes = []
        for tc in test_cases:
            name = getattr(tc, 'test_case_name', tc.get('test_case_name', '') if isinstance(tc, dict) else '')
            code = getattr(tc, 'code', tc.get('code', '') if isinstance(tc, dict) else '')
            test_names.append(name.lower())
            test_codes.append(code.lower())

        # 2. Risk Zone Detection (Scanning Code for Vulnerable Patterns)
        detected_risks = []
        code_lowered = code_context.lower()
        
        for risk_cat, keywords in self.risk_patterns.items():
            if any(k in code_lowered for k in keywords):
                detected_risks.append(risk_cat)

        # 3. Gap Cross-Referencing
        # Logic: If 'Delete' exists in code but no test mentions 'delete' or 'cleanup'
        if "data_integrity" in detected_risks:
            if not any(re.search(r'delete|cleanup|remove', t) for t in test_names):
                suggestions.append("🚨 HIGH RISK: Destructive operations (DELETE/UPDATE) found in code but lack specific validation tests.")

        if "authentication" in detected_risks:
            if not any("security" in t or "auth" in t or "login" in t for t in test_names):
                suggestions.append("🔐 SECURITY GAP: Authentication logic detected. No high-confidence security scenarios were generated.")

        if "external_deps" in detected_risks:
            if "mock" not in "".join(test_codes):
                suggestions.append("🌐 INTEGRATION GAP: Code uses external APIs/Services, but tests lack proper mocking/stubbing logic.")

        # 4. Complexity vs. Test Volume
        # If the code is massive (high number of 'if' statements) but we only have 3 tests
        logic_density = code_lowered.count("if ") + code_lowered.count("elif ")
        if logic_density > 10 and len(test_cases) < 5:
            suggestions.append(f"📉 COVERAGE GAP: Code has high branching complexity ({logic_density} branches), but the test suite is too lean.")

        # 5. Generic Error Handling Check
        if "try:" in code_lowered and "error" not in "".join(test_names):
            suggestions.append("⚠️ STABILITY GAP: Exception handling blocks found in code, but no 'Negative Tests' or Error scenarios detected.")

        # Calculate a legit Coverage Score
        # (Risks covered / Total Risks detected)
        total_risks = len(detected_risks) if detected_risks else 1
        gaps_found = len(suggestions)
        coverage_score = max(0, 100 - (gaps_found * 15))

        return {
            "suggestions": suggestions if suggestions else ["✅ Test suite successfully mapped to all detected code risk zones."],
            "coverage_score": round(coverage_score, 1),
            "detected_risks": detected_risks,
            "risk_index": "High" if gaps_found > 3 else "Medium" if gaps_found > 0 else "Low"
        }