import os

# 1. ADD EXTENSIONS YOU WANT ME TO READ
allowed_extensions = {'.py', '.js', '.ts', '.html', '.css', '.json', '.md'}

# 2. FOLDERS TO IGNORE
ignore_dirs = {'.git', 'venv', 'node_modules', '__pycache__', 'dist', 'build'}

def generate_context():
    output = []
    # Add the tree structure first
    output.append("--- PROJECT STRUCTURE ---")
    for root, dirs, files in os.walk("."):
        # Filter ignored directories
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        level = root.replace(".", "").count(os.sep)
        indent = " " * 4 * (level)
        output.append(f"{indent}{os.path.basename(root)}/")
        subindent = " " * 4 * (level + 1)
        for f in files:
            output.append(f"{subindent}{f}")

    # Add file contents
    output.append("\n--- FILE CONTENTS ---")
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if os.path.splitext(file)[1] in allowed_extensions:
                file_path = os.path.join(root, file)
                output.append(f"\n=== FILE: {file_path} ===")
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        output.append(f.read())
                except Exception as e:
                    output.append(f"Error reading file: {e}")
    
    # Save to a file you can copy
    with open("full_project_context.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output))
    print("✅ Done! Open 'full_project_context.txt' and copy-paste it to the chat.")

if __name__ == "__main__":
    generate_context()