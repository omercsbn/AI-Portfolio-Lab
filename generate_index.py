import os
import glob

html_files = glob.glob('*/index.html')
html_files.sort()

index_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Portfolio Lab | 76 Concepts</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
        h1 { text-align: center; margin-bottom: 40px; background: linear-gradient(90deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; max-width: 1400px; margin: 0 auto; }
        .card { background: #1e293b; border-radius: 12px; padding: 20px; text-decoration: none; color: white; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; border: 1px solid #334155; }
        .card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-color: #38bdf8; }
        .concept-num { font-size: 0.9rem; color: #94a3b8; font-weight: bold; margin-bottom: 5px; }
        .concept-title { font-size: 1.25rem; font-weight: 600; text-transform: capitalize;}
        .footer { text-align: center; margin-top: 60px; color: #64748b; font-size: 0.9rem; }
    </style>
</head>
<body>
    <h1>AI Portfolio Lab - 76 Architectures</h1>
    <div class="grid">
"""

for file in html_files:
    folder = os.path.dirname(file)
    # folder names like "01_macos_terminal"
    parts = folder.split('_', 1)
    if len(parts) == 2:
        num = parts[0]
        title = parts[1].replace('_', ' ')
        
        index_html += f"""
        <a href="{folder}/index.html" class="card">
            <span class="concept-num">Concept {num}</span>
            <span class="concept-title">{title}</span>
        </a>
        """

index_html += """
    </div>
    <div class="footer">Built by Ömercan Sabun. All concepts run locally via UI abstraction and prompt injection.</div>
</body>
</html>
"""

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

print(f"Generated index.html with {len(html_files)} links.")
