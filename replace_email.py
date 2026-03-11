import os
import glob
import re

root_dir = r"f:\omer_portfolio\AI_Portfolio_Lab"

def replace_in_files(pattern, replacement):
    for filepath in glob.glob(os.path.join(root_dir, '**', '*.js'), recursive=True):
        if 'node_modules' in filepath: continue
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Super simple check if we used a placeholder email
        if 'hello@omercan.dev' in content:
            new_content = content.replace('hello@omercan.dev', 'omercansabun@icloud.com')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated email in {filepath}")

replace_in_files('hello@omercan.dev', 'omercansabun@icloud.com')
print("Email replacement complete.")
