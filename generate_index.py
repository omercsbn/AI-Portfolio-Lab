import os

target_dir = r"f:\omer_portfolio\AI_Portfolio_Lab"

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ömercan Sabun | AI Portfolio Concepts</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }
        h1 { text-align: center; color: #38bdf8; font-size: 2.5rem; margin-bottom: 10px; }
        p.subtitle { text-align: center; color: #94a3b8; font-size: 1.1rem; margin-bottom: 40px; max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.6;}
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; max-width: 1200px; margin: 0 auto; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; text-decoration: none; color: #e2e8f0; transition: 0.2s; display: flex; align-items: center; }
        .card:hover { transform: translateY(-3px); border-color: #38bdf8; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); background: #2dd4bf; color: #0f172a; font-weight: bold;}
        .card span { font-size: 1.2rem; font-weight: 500; }
        .card .num { font-size: 0.9rem; opacity: 0.7; margin-right: 15px; font-variant-numeric: tabular-nums; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;}
        .card:hover .num { color: #0f172a; border-color: #0f172a; opacity: 1;}
    </style>
</head>
<body>
    <h1>AI Portfolio Laboratory</h1>
    <p class="subtitle">A collection of 56 distinct, highly creative, and interactive 3D web concepts integrating Next-Gen UI and real-time AI generation via the Gemini API. 
    <br><br><b>Note:</b> Since this is hosted statically, you will be prompted to enter your own Gemini API key locally to interact with the models.</p>
    
    <div class="grid">
"""

dirs = [d for d in os.listdir(target_dir) if os.path.isdir(os.path.join(target_dir, d)) and d[0].isdigit()]
dirs.sort()

for d in dirs:
    parts = d.split('_', 1)
    num = parts[0]
    name = parts[1].replace('_', ' ').title() if len(parts) > 1 else d
    html_content += f'        <a href="./{d}/index.html" class="card"><span class="num">{num}</span><span>{name}</span></a>\n'

html_content += """    </div>
</body>
</html>
"""

with open(os.path.join(target_dir, "index.html"), "w", encoding='utf-8') as f:
    f.write(html_content)

print("Generated index.html with links to all concepts.")
