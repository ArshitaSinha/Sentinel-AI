import os
import zipfile
import shutil
import io

class FileProcessor:
    def __init__(self):
        # We filter for these to avoid reading images, binaries, or random system files
        self.allowed_extensions = {
            '.py', '.js', '.jsx', '.ts', '.tsx', 
            '.html', '.css', '.json', '.md', 
            '.java', '.cpp', '.c', '.h', '.go', '.rs'
        }

    def process_local_path(self, path: str) -> dict:
        """
        Smart function that detects if 'path' is a Folder or a ZIP file
        and returns a dictionary of {filename: content}.
        """
        code_map = {}

        # 1. Handle ZIP File (Used by Upload Mode)
        if path.endswith(".zip") and os.path.isfile(path):
            return self._read_zip_from_disk(path)

        # 2. Handle Directory (Used by Local Path Mode)
        if os.path.isdir(path):
            return self._read_directory(path)

        print(f"⚠️ Warning: Path not found or unsupported: {path}")
        return {}

    def _read_directory(self, path: str) -> dict:
        code_map = {}
        for root, _, files in os.walk(path):
            # Skip hidden folders like .git, __pycache__, node_modules
            if any(part.startswith('.') or part == 'node_modules' for part in root.split(os.sep)):
                continue

            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in self.allowed_extensions:
                    full_path = os.path.join(root, file)
                    try:
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                            # Store relative path so the AI understands structure
                            relative_path = os.path.relpath(full_path, path)
                            code_map[relative_path] = f.read()
                    except Exception as e:
                        print(f"Skipping {file}: {e}")
        return code_map

    def _read_zip_from_disk(self, zip_path: str) -> dict:
        code_map = {}
        try:
            with zipfile.ZipFile(zip_path, 'r') as z:
                for file_info in z.infolist():
                    if file_info.is_dir() or file_info.filename.startswith('__MACOSX'):
                        continue
                    
                    ext = os.path.splitext(file_info.filename)[1].lower()
                    if ext in self.allowed_extensions:
                        try:
                            with z.open(file_info.filename) as f:
                                code_map[file_info.filename] = f.read().decode('utf-8', errors='ignore')
                        except Exception:
                            continue
        except zipfile.BadZipFile:
            print("Error: Invalid ZIP file")
            
        return code_map