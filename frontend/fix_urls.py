import os
import glob
import re

files_to_check = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)

for filepath in files_to_check:
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'http://localhost:8000' in content:
        # We will use import.meta.env.VITE_API_URL or fallback
        # Let's replace 'http://localhost:8000' with (import.meta.env.VITE_API_URL || 'http://localhost:8000')
        # We have to be careful about quotes
        content = re.sub(r"'http://localhost:8000/([^']+)'", r"`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/\1`", content)
        content = re.sub(r'"http://localhost:8000/([^"]+)"', r"`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/\1`", content)
        content = re.sub(r'`http://localhost:8000/([^`]+)`', r"`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/\1`", content)
        content = re.sub(r"'http://localhost:8000'", r"(import.meta.env.VITE_API_URL || 'http://localhost:8000')", content)
        
        with open(filepath, 'w') as f:
            f.write(content)

print("URL replacement complete")
