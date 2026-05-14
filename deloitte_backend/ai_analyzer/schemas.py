from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any
from datetime import datetime

# ==========================================
# 1. CORE ANALYSIS SCHEMAS
# ==========================================

class ProcessRequest(BaseModel):
    mode: Literal['local', 'github']
    action: Literal['summary', 'testcases']
    path: str

class InternalDependency(BaseModel):
    from_file: str
    to_file: str
    description: str

class FileBreakdown(BaseModel):
    filepath: str
    summary: str
    purpose: str

class ProjectAnalysis(BaseModel):
    project_summary: str
    project_purpose: str
    tech_stack: List[str]
    external_dependencies: List[str]
    internal_dependencies: List[InternalDependency]
    file_breakdown: List[FileBreakdown]

class TestCase(BaseModel):
    test_case_name: str
    description: str
    steps: str
    status: str = "New"
    date: str = ""
    poc: str = ""
    generated_by: str = "Sentinel AI"  
    confidence_score: float = 0.85  
    priority: str = "Medium"  
    category: str = "Functional"
    reasoning: Optional[str] = "Architectural logic match."
    code: Optional[str] = None
    
    # 👇 CRITICAL FOR BAR CHART
    complexity: str = "Medium" 

class TestCaseList(BaseModel):
    test_cases: List[TestCase]

class MultiModelTestResponse(BaseModel):
    test_cases: List[TestCase]
    total_generated: int
    unique_tests: int
    duplicates_removed: int
    models_used: List[str]
    metrics: Dict[str, Any]
    time_taken: float
    jira_export: Optional[dict] = None
    
    # 👇 CRITICAL FOR EXECUTIVE SUMMARY CARD
    gap_analysis: Optional[Dict[str, Any]] = None
    project_summary: Optional[str] = "Automated Project Scan" 

# ==========================================
# 2. AUTH SCHEMAS
# ==========================================

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True