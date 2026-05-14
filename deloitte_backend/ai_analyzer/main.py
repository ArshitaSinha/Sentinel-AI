import sys
import os
import shutil
import time
import subprocess
import traceback
import json
import re
import base64
import csv
import io
import asyncio
import tempfile

if sys.platform.startswith("win"):
    # This fixes the "RuntimeError: Event loop is closed" on Windows
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from pathlib import Path
from typing import List, Optional, Dict, Any

from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm 
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# --- Local Imports ---
from .services.database import engine, get_db, Base
from .services.db_models import User
from .services.auth import get_password_hash, verify_password, create_access_token
from .services.llm_chains import generate_tests_chain
from .services.jira_exporter import JiraExporter
from .services.file_processor import FileProcessor
from .services.github_loader import get_github_project_files


load_dotenv()

# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sentinel AI Backend", version="3.3.0")

# --- CORS (Allow All for Demo) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---
class UserCreate(BaseModel):
    email: str
    password: str

class TestRunRequest(BaseModel):
    code: str

class JiraCredentials(BaseModel):
    url: str
    email: str
    api_token: str
    project_key: str

class JiraExportRequest(BaseModel):
    test_cases: List[Dict[str, Any]]
    credentials: JiraCredentials
    project_summary: Optional[str] = None

class CSVExportRequest(BaseModel):
    test_cases: List[Dict[str, Any]]

# --- AUTH ENDPOINTS ---
@app.post("/api/auth/register", tags=["Auth"])
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    return {"message": "Identity created"}

@app.post("/api/auth/login", tags=["Auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": create_access_token(data={"sub": user.email}), "token_type": "bearer"}

# --- 🚀 CORE ENDPOINT ---
@app.post("/api/generate-tests")
async def generate_tests_endpoint(request: Request):
    """
    Smart Endpoint: Handles both JSON (Local Path) and Multipart (File Upload).
    Returns a Stream of JSON Lines.
    """
    code_map = {}
    content_type = request.headers.get("content-type", "")

    try:
        # A. HANDLE FILE UPLOAD (Multipart)
        if "multipart/form-data" in content_type:
            form = await request.form()
            file = form.get("file")
            
            # TYPE CHECK FIX: Ensure 'file' is actually an UploadFile object
            if not file or isinstance(file, str): 
                raise HTTPException(400, "No file uploaded")
            
            # Now Pylance knows 'file' has .filename and .file
            os.makedirs("temp_uploads", exist_ok=True)
            temp_path = f"temp_uploads/{file.filename}"
            
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Process Zip
            code_map = FileProcessor().process_local_path(temp_path)

        # B. HANDLE LOCAL PATH / GITHUB (JSON)
        else:
            data = await request.json()
            path = data.get("path")
            mode = data.get("mode", "local")
            
            if not path:
                raise HTTPException(400, "Path required")
            
            if mode == "github":
                # Call the real function we just fixed
                # It returns a tuple: (map, count, error_count, error_msg)
                files_map, count, err_count, err_msg = get_github_project_files(path)
                
                if err_msg:
                    # If the loader returned an error (like Invalid URL), show it
                    raise HTTPException(status_code=400, detail=err_msg)
                
                code_map = files_map
            else:
                code_map = FileProcessor().process_local_path(path)

        if not code_map:
            raise HTTPException(400, "No valid source code found in target.")

        # START STREAMING
        return StreamingResponse(
            stream_json_generator(code_map),
            media_type="application/x-ndjson"
        )

    except Exception as e:
        print(f"Error in generate-tests: {e}")
        async def error_gen():
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"
        return StreamingResponse(error_gen(), media_type="application/x-ndjson")

async def stream_json_generator(code_map):
    """Helper to ensure valid JSON lines are sent for the Waterfall UI.

    Wrap the generation in a try/except so any internal exception is returned
    as a JSON error line instead of abruptly terminating the connection
    which leads to chunked-encoding errors on the client side.
    """
    try:
        async for chunk in generate_tests_chain(code_map):
            try:
                yield json.dumps(chunk) + "\n"
            except Exception:
                # If serializing a chunk fails, send a safe error message and continue
                yield json.dumps({"type": "error", "message": "Chunk serialization error"}) + "\n"
    except Exception as e:
        # Send a final error message so clients get a valid JSON line
        try:
            yield json.dumps({"type": "error", "message": f"Server stream error: {str(e)}"}) + "\n"
        except Exception:
            # Best-effort: nothing else to do
            return

# --- EXECUTION & EXPORT ENDPOINTS ---

@app.post("/api/run-test")
async def run_test_endpoint(req: TestRunRequest):
    """Runs a single test code block safely using System Temp (avoids reload loops)."""
    
    evidence = Path("evidence.png") 
    if evidence.exists(): evidence.unlink()
    
    # Clean the code string
    cleaned_code = re.sub(r'```python|```', '', req.code).strip()
    
    # Create a temp file in the SYSTEM temp folder (outside project)
    # delete=False is required on Windows so the subprocess can open it
    with tempfile.NamedTemporaryFile(mode="w+", suffix=".py", delete=False, encoding="utf-8") as tmp_file:
        tmp_file.write(cleaned_code)
        tmp_path = tmp_file.name  # Get the absolute path
        
    try:
        # Get absolute path to your project root (where main.py is)
        project_root = str(Path(__file__).resolve().parent)

        proc = subprocess.run(
            [sys.executable, "-m", "pytest", tmp_path, "-v", "--tb=short"],
            capture_output=True, text=True, timeout=30,
            # CRITICAL: We must tell Python where to find your 'services' module
            # since the test file is now in a different folder (Temp)
            env={**os.environ, "PYTHONPATH": project_root}
        )
        
        img_b64 = None
        if evidence.exists():
            with open(evidence, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode('utf-8')
            evidence.unlink()

        status = "✅ PASSED" if proc.returncode == 0 else "❌ FAILED"
        logs = f"{status}\n{'-'*20}\n{proc.stdout}\n{proc.stderr}"
        
        return {
            "success": proc.returncode == 0, 
            "logs": logs,
            "image": img_b64 
        }

    except Exception as e:
        return {"success": False, "logs": f"SYSTEM ERROR: {e}", "image": None}
        
    finally:
        # Manually clean up the temp file after execution
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except:
                pass

    

@app.post("/api/export/jira")
async def export_jira_endpoint(req: JiraExportRequest):
    try:
        exp = JiraExporter(
            req.credentials.url, 
            req.credentials.email, 
            req.credentials.api_token, 
            req.credentials.project_key
        )
        return exp.create_test_cases(req.test_cases, req.project_summary)
    except Exception as e:
        raise HTTPException(500, detail=f"Jira Export Failed: {str(e)}")

@app.post("/api/export/csv")
async def export_csv_endpoint(req: CSVExportRequest):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Description", "Steps", "Complexity", "Code"])
    
    for i, tc in enumerate(req.test_cases, 1):
        writer.writerow([
            f"TC-{i:03d}",
            tc.get("test_case_name", "Untitled"),
            tc.get("description", ""),
            tc.get("steps", ""),
            tc.get("complexity", "Medium"),
            tc.get("code", "")[:100] + "..." 
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sentinel_tests.csv"}
    )

if __name__ == "__main__":
    import uvicorn
    if os.path.exists("temp_uploads"):
        shutil.rmtree("temp_uploads")
    
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)