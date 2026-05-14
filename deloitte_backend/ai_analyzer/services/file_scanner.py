import os

# --- 1. The "Super Set" of Extensions ---
# Includes: Web, Python, Systems, Mobile, Configs
CODE_EXTENSIONS = {
    # Core Logic
    '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.kt', '.scala', 
    '.cpp', '.c', '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php', '.swift', 
    '.lua', '.pl', '.sh', '.bat',
    
    # Web & UI
    '.html', '.vue', '.svelte', '.css', '.scss',
    
    # Data/Config (Useful for context, remove if too noisy)
    '.json', '.yaml', '.yml', '.xml', '.toml', '.md', '.sql'
}

# --- 2. The "Universal" Ignore List ---
# Blocks junk from: Node, Python, Unity, Java, C#, Go, Ruby, etc.
IGNORE_DIRS = {
    # Version Control & IDEs
    '.git', '.svn', '.hg', '.vscode', '.idea', '.vs',
    
    # Python
    'venv', '.venv', 'env', '__pycache__', '.pytest_cache', '.mypy_cache', 
    'site-packages', 'eggs', '.tox',
    
    # Node.js / Web
    'node_modules', 'bower_components', '.npm', '.yarn', 'coverage', 
    '.next', '.nuxt', '.cache',
    
    # Unity / C# / .NET (CRITICAL for your Mario project)
    'Library', 'Temp', 'Obj', 'Build', 'Builds', 'Logs', 'UserSettings', 
    'bin', 'obj', 'artifacts',
    
    # Java / Kotlin / Android
    'target', 'build', '.gradle', 'gradle',
    
    # Go / PHP / Ruby
    'vendor', '.bundle',
    
    # General Dist/Output
    'dist', 'out', 'bundle', 'min', 'public' # 'public' is debatable, sometimes has code
}

MAX_TOTAL_CHARS = 120000  # ~90k tokens (Raised slightly)
MAX_FILE_SIZE = 50000     # 50KB limit per file (Skips minified/massive files)

def get_local_project_files(folder_path: str):
    code_files_map = {}
    total_chars = 0
    found, skipped = 0, 0

    if not os.path.isdir(folder_path):
        return None, 0, 0, "Invalid folder path"

    for dirpath, dirnames, filenames in os.walk(folder_path, topdown=True):
        # Filter directories in-place to prevent walking into them
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        
        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            
            if ext in CODE_EXTENSIONS:
                full_path = os.path.join(dirpath, filename)
                
                # OPTIMIZATION: Check file size stats before opening
                # This prevents reading a 10MB file just to discard it
                try:
                    file_size = os.path.getsize(full_path)
                    if file_size > MAX_FILE_SIZE:
                        skipped += 1
                        continue
                        
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()

                    # Safety Limit Check
                    if total_chars + len(content) > MAX_TOTAL_CHARS:
                        skipped += 1
                        continue
                    
                    if content.strip():
                        rel_path = os.path.relpath(full_path, folder_path)
                        code_files_map[rel_path] = content
                        total_chars += len(content)
                        found += 1
                        
                except Exception:
                    # Silently skip unreadable files (binary, locked, etc.)
                    skipped += 1
                    
    return code_files_map, found, skipped, None