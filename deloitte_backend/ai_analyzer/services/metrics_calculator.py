import time

class MetricsCalculator:
    def __init__(self, hourly_rate=75, tests_per_hour=3):
        self.qa_hourly_rate = hourly_rate
        self.avg_tests_per_hour = tests_per_hour
        # Gemini 2.0 Flash is very cheap: $0.10 per 1M tokens
        self.cost_per_1m_input = 0.10
        self.cost_per_1m_output = 0.40

    def calculate_roi(self, num_tests: int, cost_breakdown: dict, time_taken_seconds: float):
        # 1. Traditional Manual Calculation
        traditional_hours = num_tests / self.avg_tests_per_hour
        traditional_cost = traditional_hours * self.qa_hourly_rate
        
        # 2. AI Calculation
        ai_hours = time_taken_seconds / 3600
        ai_cost = cost_breakdown.get("total", 0.001) # Default tiny cost
        
        # 3. Savings
        time_saved_hours = max(0, traditional_hours - ai_hours)
        cost_saved = max(0, traditional_cost - ai_cost)
        
        # 4. Efficiency (How much faster is the AI?)
        # Logic: (Time Saved / Traditional Time) * 100
        efficiency_gain = 0
        if traditional_hours > 0:
            efficiency_gain = (time_saved_hours / traditional_hours) * 100
            
        return {
            "savings": {
                "time_saved_hours": round(time_saved_hours, 1),
                "cost_saved": round(cost_saved, 2),
                "efficiency_gain_percentage": round(efficiency_gain, 1)
            },
            "raw": {
                "ai_cost": round(ai_cost, 4),
                "traditional_cost": round(traditional_cost, 2)
            }
        }