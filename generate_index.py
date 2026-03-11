import os
import glob
import json

html_files = glob.glob('*/index.html')
html_files.sort()

concepts = []
for file in html_files:
    folder = os.path.dirname(file)
    parts = folder.split('_', 1)
    if len(parts) == 2:
        num = parts[0]
        title = parts[1].replace('_', ' ').title()
        concepts.append({'num': num, 'title': title, 'url': f"{folder}/index.html"})

concepts_json = json.dumps(concepts)

index_html = f"""<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SABUN_AI /// VIRTUALIZATION LAB</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <style>
        :root {{
            --bg: #030613;
            --panel: rgba(10, 20, 35, 0.75);
            --border: #1e3a5f;
            --accent: #00f0ff;
            --accent-glow: rgba(0, 240, 255, 0.4);
            --text: #e0f2fe;
            --font-ui: 'Orbitron', sans-serif;
            --font-body: 'Rajdhani', sans-serif;
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background: var(--bg); color: var(--text);
            font-family: var(--font-body);
            overflow-x: hidden;
            perspective: 2000px;
        }}
        #bg-canvas {{ position: fixed; top: 0; left: 0; z-index: -1; pointer-events: none; }}
        
        .header {{
            padding: 30px 50px; display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid var(--border);
            background: linear-gradient(180deg, rgba(3,6,19,0.95) 0%, transparent 100%);
            position: sticky; top: 0; z-index: 100;
            backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        }}
        .brand h1 {{ font-family: var(--font-ui); font-size: 2.5rem; color: #fff; text-shadow: 0 0 15px var(--accent); letter-spacing: 2px; text-transform: uppercase; }}
        .header-actions {{ display: flex; gap: 20px; align-items: center; }}
        .lang-btn {{
            background: rgba(0, 240, 255, 0.1); border: 1px solid var(--accent); color: var(--accent);
            font-family: var(--font-ui); font-size: 0.9rem; font-weight: bold; padding: 8px 16px; cursor: pointer;
            transition: 0.2s; border-radius: 4px; box-shadow: inset 0 0 10px rgba(0,240,255,0.2); letter-spacing: 2px;
        }}
        .lang-btn:hover {{ background: var(--accent); color: var(--bg); box-shadow: 0 0 20px var(--accent);}}

        .hero {{ padding: 60px 50px 30px; text-align: center; max-width: 900px; margin: 0 auto; }}
        .hero p {{ font-size: 1.4rem; line-height: 1.6; color: #cbd5e1; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }}

        .dashboard {{ padding: 0 50px 50px; max-width: 1500px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; }}
        
        /* Grid and Cards */
        .grid {{
            display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 30px;
            transform-style: preserve-3d; margin-top: 20px;
        }}
        .card {{
            background: var(--panel); border: 1px solid var(--border);
            border-radius: 12px; padding: 30px; cursor: pointer;
            transform-style: preserve-3d;
            transition: border-color 0.4s, box-shadow 0.4s, transform 0.1s ease-out;
            position: relative; overflow: hidden;
            display: flex; flex-direction: column; justify-content: flex-end;
            height: 220px; text-decoration: none;
            box-shadow: 0 10px 30px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.5);
            backdrop-filter: blur(5px);
        }}
        
        /* Sci-fi scanner line inside card */
        .card::before {{
            content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
            background: radial-gradient(circle at center, var(--accent-glow) 0%, transparent 60%);
            opacity: 0; transition: opacity 0.4s; pointer-events: none; z-index: 1;
            transform: translateZ(-10px); mix-blend-mode: screen;
        }}
        .card:hover {{ border-color: var(--accent); box-shadow: 0 15px 40px rgba(0,240,255,0.2), inset 0 0 15px rgba(0,240,255,0.1); }}
        .card:hover::before {{ opacity: 1; }}

        /* Iframe preview pattern inside card */
        .card-preview {{
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            opacity: 0.1; transition: 0.5s; z-index: 0; pointer-events: none;
            background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.1) 2px, rgba(0,240,255,0.1) 4px);
            border-radius: 12px;
        }}
        .card:hover .card-preview {{ opacity: 0.3; }}

        /* Small UI elements indicating enterprise data */
        .data-bars {{
            position: absolute; top: 20px; right: 20px;
            display: flex; gap: 4px; z-index: 10;
        }}
        .bar {{ width: 4px; background: var(--border); transition: 0.3s; }}
        .card:hover .bar {{ background: var(--accent); }}
        .card:hover .bar:nth-child(1) {{ height: 15px; animation: pulse 1s infinite alternate; }}
        .card:hover .bar:nth-child(2) {{ height: 25px; animation: pulse 1s 0.2s infinite alternate; }}
        .card:hover .bar:nth-child(3) {{ height: 10px; animation: pulse 1s 0.4s infinite alternate; }}

        @keyframes pulse {{ 0% {{ opacity: 0.4; }} 100% {{ opacity: 1; box-shadow: 0 0 5px var(--accent); }} }}

        .card-content {{ position: relative; z-index: 10; transform: translateZ(40px); pointer-events: none; }}
        .concept-num {{ font-family: var(--font-ui); color: var(--accent); font-size: 1rem; letter-spacing: 3px; display: block; margin-bottom: 8px; text-shadow: 0 0 5px rgba(0,240,255,0.5); }}
        .concept-title {{ font-family: var(--font-body); color: #fff; font-size: 1.8rem; font-weight: 700; text-shadow: 0 4px 10px rgba(0,0,0,0.9); line-height: 1.1; }}

        /* Pagination */
        .pagination {{ display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 40px; }}
        .page-btn {{
            background: rgba(10, 20, 35, 0.8); border: 1px solid var(--border); color: #fff;
            width: 50px; height: 50px; font-family: var(--font-ui); font-size: 1.2rem;
            cursor: pointer; transition: 0.2s; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);backdrop-filter: blur(5px);
        }}
        .page-btn.active {{ background: rgba(0,240,255,0.15); border-color: var(--accent); color: var(--accent); box-shadow: 0 0 20px rgba(0,240,255,0.2); }}
        .page-btn:hover:not(:disabled) {{ border-color: var(--accent); background: rgba(0,240,255,0.05); color: var(--accent); transform: translateY(-2px); }}
        .page-btn:disabled {{ opacity: 0.3; cursor: not-allowed; }}
        .page-info {{ font-family: var(--font-ui); color: var(--accent); font-size: 1rem; letter-spacing: 2px; margin: 0 20px; text-shadow: 0 0 5px rgba(0,240,255,0.3); }}

        /* Enter Animation Overlay */
        .enter-overlay {{
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: #000; z-index: 9999;
            opacity: 0; pointer-events: none; transition: opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1);
            display: flex; justify-content: center; align-items: center;
        }}
        .enter-overlay.active {{ opacity: 1; pointer-events: all; }}
        .enter-text {{
            font-family: var(--font-ui); font-size: 4rem; color: var(--accent);
            text-shadow: 0 0 30px var(--accent); letter-spacing: 15px;
            transform: scale(0.8) translateZ(0); transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
        }}
        .enter-overlay.active .enter-text {{ transform: scale(1.1) translateZ(50px); }}

        @media(max-width: 768px) {{
            .header {{ flex-direction: column; gap: 20px; padding: 20px; }}
            .brand h1 {{ font-size: 1.8rem; text-align: center; }}
            .hero {{ padding: 30px 20px; }}
            .hero p {{ font-size: 1.1rem; }}
            .card {{ height: 180px; padding: 20px; }}
            .concept-title {{ font-size: 1.4rem; }}
            .enter-text {{ font-size: 2rem; letter-spacing: 5px; }}
            .dashboard {{ padding: 0 20px 50px; }}
        }}
    </style>
</head>
<body>

    <div class="enter-overlay" id="enterOverlay">
        <div class="enter-text" id="enterText">INITIALIZING...</div>
    </div>

    <canvas id="bg-canvas"></canvas>

    <header class="header">
        <div class="brand">
            <h1 id="mainTitle">AI PORTFOLIO LAB</h1>
        </div>
        <div class="header-actions">
            <button class="lang-btn" id="langBtn">EN / TR</button>
        </div>
    </header>

    <div class="hero">
        <p id="heroDesc">
            Yeni Nesil Kullanıcı Arabirimi ve Gemini API üzerinden gerçek zamanlı Yapay Zeka üretimini entegre eden {len(html_files)} farklı, son derece yaratıcı ve etkileşimli 3D web konsepti koleksiyonu. Kurumsal sanallaştırma ortamına hoş geldiniz. <br><br>
            <span style="font-size:1rem; color:#64748b; font-family: 'Orbitron', monospace; letter-spacing: 1px;">SYS_NOTE: Statik ortam. Modellerle etkileşim için yerel Gemini API anahtarı gereklidir.</span>
        </p>
    </div>

    <main class="dashboard">
        <div class="grid" id="conceptGrid"></div>
        <div class="pagination" id="pagination"></div>
    </main>

    <script>
        const concepts = {concepts_json};
        
        const i18n = {{
            tr: {{
                title: "AI PORTFOLİO LABORATUVARI",
                desc: "Yeni Nesil Kullanıcı Arabirimi ve Gemini API üzerinden gerçek zamanlı Yapay Zeka üretimini entegre eden {len(html_files)} farklı, son derece yaratıcı ve etkileşimli 3D web konsepti koleksiyonu. Kurumsal sanallaştırma ortamına hoş geldiniz. <br><br><span style='font-size:1rem; color:#64748b; font-family: var(--font-ui); letter-spacing: 1px;'>SYS_NOTE: Statik ortam. Modellerle etkileşim için yerel Gemini API anahtarı gereklidir.</span>",
                concept: "KONSEPT",
                page: "SEKTÖR",
                init: "BAĞLANTI KURULUYOR..."
            }},
            en: {{
                title: "AI PORTFOLIO LABORATORY",
                desc: "A collection of {len(html_files)} distinct, highly creative, and interactive 3D web concepts integrating Next-Gen UI and real-time AI generation via the Gemini API. Welcome to the enterprise virtualization space.<br><br><span style='font-size:1rem; color:#64748b; font-family: var(--font-ui); letter-spacing: 1px;'>SYS_NOTE: Hosted statically. Local Gemini API key required for full model interactions.</span>",
                concept: "CONCEPT",
                page: "SECTOR",
                init: "ESTABLISHING UPLINK..."
            }}
        }};

        let currentLang = 'tr';
        // Check local storage for layout preference, default turkey
        if(localStorage.getItem('ai_lab_lang')) {{
            currentLang = localStorage.getItem('ai_lab_lang');
        }}

        let currentPage = 1;
        const itemsPerPage = 12;

        const grid = document.getElementById('conceptGrid');
        const pagination = document.getElementById('pagination');
        const mainTitle = document.getElementById('mainTitle');
        const heroDesc = document.getElementById('heroDesc');
        const overlay = document.getElementById('enterOverlay');
        const overlayText = document.getElementById('enterText');
        
        function changeLang() {{
            currentLang = currentLang === 'tr' ? 'en' : 'tr';
            localStorage.setItem('ai_lab_lang', currentLang);
            updateUI();
        }}
        document.getElementById('langBtn').addEventListener('click', changeLang);

        function updateUI() {{
            mainTitle.textContent = i18n[currentLang].title;
            heroDesc.innerHTML = i18n[currentLang].desc;
            renderGrid();
            renderPagination();
        }}

        function renderGrid() {{
            grid.innerHTML = '';
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageItems = concepts.slice(start, end);

            pageItems.forEach(item => {{
                const el = document.createElement('a');
                el.className = 'card';
                el.href = item.url;
                
                // 3D tilt effect on hover
                el.addEventListener('mousemove', (e) => {{
                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateX = ((y - centerY) / centerY) * -12;
                    const rotateY = ((x - centerX) / centerX) * 12;
                    
                    // Update light position
                    el.style.setProperty('--mouseX', x + 'px');
                    el.style.setProperty('--mouseY', y + 'px');
                    
                    el.style.transform = `perspective(1000px) rotateX(${{rotateX}}deg) rotateY(${{rotateY}}deg) scale3d(1.05, 1.05, 1.05)`;
                }});
                
                el.addEventListener('mouseleave', () => {{
                    el.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                }});

                // Intercept click for entering animation
                el.addEventListener('click', (e) => {{
                    e.preventDefault();
                    overlayText.textContent = i18n[currentLang].init;
                    overlay.classList.add('active');
                    
                    // Zoom the clicked card dramatically into the screen
                    el.style.transition = 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s';
                    el.style.transform = 'perspective(1000px) translateZ(800px) scale(1.5)';
                    el.style.opacity = '0';
                    el.style.zIndex = '999';
                    
                    setTimeout(() => {{
                        window.location.href = item.url;
                    }}, 800);
                }});

                el.innerHTML = `
                    <div class="card-preview"></div>
                    <div class="data-bars">
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                    </div>
                    <div class="card-content">
                        <span class="concept-num">${{i18n[currentLang].concept}} ${{item.num}}</span>
                        <span class="concept-title">${{item.title}}</span>
                    </div>
                `;
                grid.appendChild(el);
            }});
        }}

        function renderPagination() {{
            pagination.innerHTML = '';
            const totalPages = Math.ceil(concepts.length / itemsPerPage);
            
            const prevBtn = document.createElement('button');
            prevBtn.className = 'page-btn';
            prevBtn.innerHTML = '&#9664;';
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => {{ currentPage--; renderGrid(); renderPagination(); window.scrollTo({{top: 0, behavior: 'smooth'}}); }};
            pagination.appendChild(prevBtn);

            const info = document.createElement('span');
            info.className = 'page-info';
            info.textContent = `[ ${{i18n[currentLang].page}} ${{String(currentPage).padStart(2, '0')}} / ${{String(totalPages).padStart(2, '0')}} ]`;
            pagination.appendChild(info);

            const nextBtn = document.createElement('button');
            nextBtn.className = 'page-btn';
            nextBtn.innerHTML = '&#9654;';
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.onclick = () => {{ currentPage++; renderGrid(); renderPagination(); window.scrollTo({{top: 0, behavior: 'smooth'}}); }};
            pagination.appendChild(nextBtn);
        }}

        // Initialization
        updateUI();

        // --- Three.js Background Virtualization Matrix ---
        const canvas = document.getElementById('bg-canvas');
        const renderer = new THREE.WebGLRenderer({{ canvas, alpha: true, antialias: true }});
        renderer.setSize(window.innerWidth, window.innerHeight);
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x030613, 20, 150);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 40;
        camera.position.y = 8;
        camera.lookAt(0, 0, 0);

        // Create an enterprise glowing grid floor
        const gridHelper = new THREE.GridHelper(400, 100, 0x00f0ff, 0x1e3a5f);
        gridHelper.position.y = -10;
        scene.add(gridHelper);

        // Floating data nodes connected by lines
        const particlesCount = 300;
        const geometry = new THREE.BufferGeometry();
        const posArray = new Float32Array(particlesCount * 3);
        const vyArray = new Float32Array(particlesCount);
        
        for(let i = 0; i < particlesCount; i++) {{
            posArray[i*3] = (Math.random() - 0.5) * 200; // x
            posArray[i*3+1] = (Math.random() - 0.5) * 60 + 10; // y
            posArray[i*3+2] = (Math.random() - 0.5) * 150; // z
            vyArray[i] = Math.random() * 0.05 + 0.02; // speed
        }}
        
        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const material = new THREE.PointsMaterial({{ size: 0.8, color: 0x00f0ff, transparent: true, opacity: 0.8 }});
        const particlesMesh = new THREE.Points(geometry, material);
        scene.add(particlesMesh);

        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;
        
        document.addEventListener('mousemove', (e) => {{
            mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        }});

        function animate() {{
            requestAnimationFrame(animate);
            
            // Move particles up
            const positions = particlesMesh.geometry.attributes.position.array;
            for(let i=0; i<particlesCount; i++) {{
                positions[i*3+1] += vyArray[i];
                if(positions[i*3+1] > 50) {{
                    positions[i*3+1] = -20;
                }}
            }}
            particlesMesh.geometry.attributes.position.needsUpdate = true;
            
            // Subtle parallax with mouse
            targetX = mouseX * 15;
            targetY = -mouseY * 5 + 8;
            
            camera.position.x += (targetX - camera.position.x) * 0.02;
            camera.position.y += (targetY - camera.position.y) * 0.02;
            camera.lookAt(0,0,0);
            
            renderer.render(scene, camera);
        }}
        animate();

        window.addEventListener('resize', () => {{
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }});
        
        // Hide overlay on load (for back navigation)
        window.addEventListener('pageshow', () => {{
            overlay.classList.remove('active');
            overlayText.textContent = "INITIALIZING...";
            
            // Reset transforms if they got stuck
            document.querySelectorAll('.card').forEach(el => {{
                el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
                el.style.opacity = '1';
                el.style.zIndex = '1';
            }});
        }});
    </script>
</body>
</html>"""

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

print(f"Generated enterprise virtualization index.html with {len(html_files)} links.")
