import requests
import os
import logging
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- FIX 1: Safe Import with Defaults ---
# This ensures the code runs even if file_scanner.py is missing or paths are wrong
try:
    from .file_scanner import CODE_EXTENSIONS, IGNORE_DIRS
except ImportError:
    # Fallback defaults
    CODE_EXTENSIONS = {
        '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.h', 
        '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.html', '.css', 
        '.sql', '.json', '.yaml', '.yml', '.md', '.sh', '.bat'
    }
    IGNORE_DIRS = {
        'node_modules', 'venv', '.git', '__pycache__', 'dist', 'build', 
        '.idea', '.vscode', 'target', 'bin', 'obj'
    }

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_github_project_files(repo_url: str):
    token = os.environ.get("GITHUB_TOKEN")
    
    # Base headers
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    # 1. Check Token
    if token:
        headers["Authorization"] = f"token {token}"
        masked_token = token[:4] + "..." + token[-4:]
        logger.info(f"🔑 GitHub Token loaded: {masked_token}")
    else:
        logger.warning("⚠️ NO GITHUB TOKEN FOUND! Limited to 60 reqs/hr.")

    try:
        # Parse URL
        path_parts = urlparse(repo_url).path.strip('/').split('/')
        if len(path_parts) < 2: 
            return None, 0, 0, "Invalid GitHub URL. Use: https://github.com/owner/repo"
        
        owner, repo = path_parts[0], path_parts[1]
        logger.info(f"📡 Connecting to GitHub: {owner}/{repo}...")

        # 2. Get Repo Metadata
        api_base = f"https://api.github.com/repos/{owner}/{repo}"
        repo_res = requests.get(api_base, headers=headers)
        
        if repo_res.status_code == 401:
            return None, 0, 0, "❌ 401 Unauthorized: Check your GITHUB_TOKEN."
        if repo_res.status_code == 404:
            return None, 0, 0, "❌ 404 Not Found: Repo doesn't exist or Private (Token needed)."
        repo_res.raise_for_status()
        
        repo_data = repo_res.json()
        branch = repo_data.get('default_branch', 'main')

        # 3. Get Recursive Tree
        tree_url = f"{api_base}/git/trees/{branch}?recursive=1"
        tree_res = requests.get(tree_url, headers=headers)
        tree_res.raise_for_status()
        tree_data = tree_res.json().get('tree', [])
        
        logger.info(f"📂 Tree received. {len(tree_data)} items found.")

    except Exception as e:
        return None, 0, 0, f"GitHub connection failed: {str(e)}"

    # 4. Filter Files
    code_files_map = {}
    files_to_fetch = []
    
    for item in tree_data:
        # We only want blobs (files), not trees (folders)
        if item['type'] == 'blob':
            path = item['path']
            ext = os.path.splitext(path)[1]
            
            # Check Extension
            if ext in CODE_EXTENSIONS:
                # Check Ignore Dirs
                if not any(d in path.split('/') for d in IGNORE_DIRS):
                    # --- FIX 2: Use API Blob URL ---
                    # The 'url' field in the tree is the API link to the blob.
                    # This is safer than constructing raw.githubusercontent strings.
                    files_to_fetch.append((path, item['url']))

    if not files_to_fetch:
        return None, 0, 0, "No code files found in this repository."

    logger.info(f"🚀 Fetching {len(files_to_fetch)} files concurrently...")

    # 5. Concurrent Fetching
    def fetch(path, url):
        try:
            # --- FIX 3: Request Raw Content ---
            # We must use specific headers to get the RAW content from the blob URL
            fetch_headers = headers.copy()
            fetch_headers['Accept'] = 'application/vnd.github.v3.raw'
            
            res = requests.get(url, headers=fetch_headers, timeout=10)
            
            if res.status_code == 200:
                # --- FIX 4: Safe Decoding ---
                # 'ignore' prevents crashing on emoji or weird binary characters
                return path, res.content.decode('utf-8', errors='ignore')
            else:
                logger.warning(f"Failed to fetch {path}: {res.status_code}")
                return path, None
        except Exception as e:
            logger.error(f"Error fetching {path}: {e}")
            return path, None

    # Run Fetcher
    with ThreadPoolExecutor(max_workers=10) as ex:
        futures = [ex.submit(fetch, p, u) for p, u in files_to_fetch]
        for f in as_completed(futures):
            p, content = f.result()
            if content: 
                code_files_map[p] = content

    logger.info(f"✅ Loaded {len(code_files_map)} files successfully.")
    
    # Returns: Map, Count, ErrorCount (0 for now), ErrorMessage (None)
    return code_files_map, len(code_files_map), 0, None