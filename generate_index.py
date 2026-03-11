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
total_len = str(len(html_files))

index_html = """<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ömercan Sabun | AI Portfolio Lab</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;700;800&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <style>
        :root {
            --bg-base: #020617;
            --primary: #38bdf8;
            --primary-glow: rgba(56, 189, 248, 0.5);
            --secondary: #818cf8;
            --surface: rgba(15, 23, 42, 0.6);
            --surface-hover: rgba(30, 41, 59, 0.8);
            --border: rgba(51, 65, 85, 0.5);
            --border-hover: rgba(56, 189, 248, 0.5);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --font-display: 'Outfit', sans-serif;
            --font-body: 'Inter', sans-serif;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            background-color: var(--bg-base);
            color: var(--text-main);
            font-family: var(--font-body);
            overflow-x: hidden;
            min-height: 100vh;
        }

        #canvas-bg {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: -1; pointer-events: none;
        }

        /* Header / Hero */
        .hero-section {
            padding: 80px 5% 40px;
            max-width: 1200px; margin: 0 auto;
            text-align: center; position: relative; z-index: 10;
        }

        .badge {
            display: inline-block; padding: 6px 12px;
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid var(--primary-glow); color: var(--primary);
            border-radius: 20px; font-size: 0.85rem; font-weight: 600;
            letter-spacing: 1px; margin-bottom: 24px; backdrop-filter: blur(4px);
        }

        .hero-title {
            font-family: var(--font-display);
            font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 800;
            line-height: 1.1; margin-bottom: 24px;
            background: linear-gradient(135deg, #fff 0%, #cbd5e1 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            letter-spacing: -1px;
        }

        .hero-title span {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .hero-desc {
            font-size: 1.15rem; color: var(--text-muted);
            line-height: 1.6; max-width: 700px; margin: 0 auto 40px;
        }

        .lang-toggle {
            background: var(--surface); border: 1px solid var(--border);
            color: var(--text-main); padding: 8px 16px; border-radius: 8px;
            font-family: var(--font-body); font-weight: 500; cursor: pointer;
            backdrop-filter: blur(10px); transition: all 0.3s ease;
        }
        .lang-toggle:hover { border-color: var(--primary); box-shadow: 0 0 15px var(--primary-glow); }

        /* Main Grid */
        .dashboard { padding: 0 5% 80px; max-width: 1400px; margin: 0 auto; position: relative; z-index: 10; }

        .grid-container {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 24px; perspective: 1000px;
        }

        /* Card Design */
        .card {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 16px; height: 260px; padding: 24px;
            display: flex; flex-direction: column; justify-content: flex-end;
            position: relative; overflow: hidden; text-decoration: none;
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 0.3s, box-shadow 0.3s;
            transform-style: preserve-3d;
        }

        .card:hover {
            transform: translateY(-8px) scale(1.02); border-color: var(--border-hover);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(56, 189, 248, 0.15);
        }

        /* Iframe Preview Container */
        .preview-container {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 0; opacity: 0; transition: opacity 0.5s ease;
            background: #000; pointer-events: none; border-radius: 16px; overflow: hidden;
        }
        .card:hover .preview-container { opacity: 0.4; }
        .preview-iframe {
            width: 140%; height: 140%; border: none;
            transform: scale(0.714); transform-origin: top left;
            pointer-events: none;
        }

        /* Card Content Layer */
        .card-content {
            position: relative; z-index: 10; transform: translateZ(30px);
            background: linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.9) 100%);
            padding: 20px; margin: -24px; margin-top: auto;
            border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; pointer-events: none;
        }

        .concept-num {
            font-size: 0.85rem; font-weight: 600; color: var(--primary);
            text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; display: block;
        }

        .concept-title {
            font-family: var(--font-display); font-size: 1.5rem; font-weight: 700;
            color: var(--text-main); line-height: 1.2;
        }

        /* Top right tech decoration */
        .card-deco { position: absolute; top: 20px; right: 20px; display: flex; gap: 4px; z-index: 10; }
        .deco-dot { width: 6px; height: 6px; background: var(--text-muted); border-radius: 50%; transition: 0.3s; }
        .card:hover .deco-dot { background: var(--primary); }
        .card:hover .deco-dot:nth-child(1) { animation: blink 1s infinite alternate; }
        .card:hover .deco-dot:nth-child(2) { animation: blink 1s 0.3s infinite alternate; }
        .card:hover .deco-dot:nth-child(3) { animation: blink 1s 0.6s infinite alternate; }

        @keyframes blink { 0% { opacity: 0.3; } 100% { opacity: 1; box-shadow: 0 0 8px var(--primary); } }

        /* Pagination */
        .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 60px; }
        .page-btn {
            width: 44px; height: 44px; border-radius: 50%;
            background: var(--surface); border: 1px solid var(--border);
            color: var(--text-main); font-size: 1.1rem;
            display: flex; justify-content: center; align-items: center;
            cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px);
        }
        .page-btn:hover:not(:disabled) { background: rgba(56, 189, 248, 0.1); border-color: var(--primary); color: var(--primary); transform: scale(1.1); }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .page-info { font-family: var(--font-display); font-size: 1.1rem; font-weight: 500; color: var(--text-muted); min-width: 100px; text-align: center; }

        /* Enter Animation Overlay */
        .page-transition {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: var(--bg-base); z-index: 9999;
            display: flex; justify-content: center; align-items: center;
            opacity: 0; pointer-events: none; transition: opacity 0.5s ease;
        }
        .page-transition.active { opacity: 1; pointer-events: all; }
        .loader-ring {
            width: 60px; height: 60px; border: 3px solid rgba(56, 189, 248, 0.2);
            border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite;
        }

        @keyframes spin { 100% { transform: rotate(360deg); } }

        @media (max-width: 768px) {
            .hero-title { font-size: 2.2rem; }
            .grid-container { grid-template-columns: 1fr; }
            .card { height: 200px; }
        }
    </style>
</head>
<body>

    <div class="page-transition" id="pageTransition">
        <div class="loader-ring"></div>
    </div>

    <!-- 3D WebGL Background -->
    <canvas id="canvas-bg"></canvas>

    <section class="hero-section">
        <div class="badge" id="envBadge">ENVIRONMENT: VIRTUALIZATION LAB</div>
        <h1 class="hero-title" id="mainTitle">AI Portfolio <span>Laboratory</span></h1>
        <p class="hero-desc" id="heroDesc">
            A comprehensive showcase of [[LEN]] distinct, highly creative 3D web concepts building next-gen interactions with real-time AI generation via the Gemini API.
        </p>
        <button class="lang-toggle" id="langBtn">Language: EN / TR</button>
    </section>

    <main class="dashboard">
        <div class="grid-container" id="gridContainer"></div>
        <div class="pagination" id="pagination"></div>
    </main>

    <script>
        const concepts = [[CONCEPTS]];
        
        const i18n = {
            tr: {
                badge: "ORTAM: SANALLAŞTIRMA LABORATUVARI",
                title: "Yapay Zeka Portfolyo <span>Laboratuvarı</span>",
                desc: "Yeni nesil arayüzler ve Gemini API ile gerçek zamanlı yapay zeka entegrasyonu sunan, özenle hazırlanmış [[LEN]] farklı, etkileşimli ve 3D web konsepti vitrini. (Statik sürümdür, yerel API anahtarı gerektirir).",
                concept: "KONSEPT",
                langToggle: "Dil: EN / TR"
            },
            en: {
                badge: "ENVIRONMENT: VIRTUALIZATION LAB",
                title: "AI Portfolio <span>Laboratory</span>",
                desc: "A comprehensive showcase of [[LEN]] distinct, highly creative 3D web concepts building next-gen interactions with real-time AI generation via the Gemini API. (Hosted statically, requires local API key).",
                concept: "CONCEPT",
                langToggle: "Language: EN / TR"
            }
        };

        let currentLang = localStorage.getItem('site_lang') || 'tr';
        let currentPage = 1;
        const itemsPerPage = 12;

        const gridContainer = document.getElementById('gridContainer');
        const pagination = document.getElementById('pagination');
        
        document.getElementById('langBtn').addEventListener('click', () => {
            currentLang = currentLang === 'tr' ? 'en' : 'tr';
            localStorage.setItem('site_lang', currentLang);
            updateUIText();
            renderGrid();
        });

        function updateUIText() {
            const t = i18n[currentLang];
            document.getElementById('envBadge').textContent = t.badge;
            document.getElementById('mainTitle').innerHTML = t.title;
            document.getElementById('heroDesc').innerHTML = t.desc;
            document.getElementById('langBtn').textContent = t.langToggle;
        }

        function renderGrid() {
            gridContainer.innerHTML = '';
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageItems = concepts.slice(start, end);

            pageItems.forEach((item, index) => {
                const card = document.createElement('a');
                card.className = 'card';
                card.href = item.url;
                
                card.style.animation = `fadeUp 0.5s ease forwards ${index * 0.05}s`;
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                
                card.innerHTML = `
                    <div class="preview-container" id="preview-${item.num}"></div>
                    <div class="card-deco">
                        <div class="deco-dot"></div><div class="deco-dot"></div><div class="deco-dot"></div>
                    </div>
                    <div class="card-content">
                        <span class="concept-num">${i18n[currentLang].concept} ${item.num}</span>
                        <h2 class="concept-title">${item.title}</h2>
                    </div>
                `;

                let iframeLoaded = false;
                card.addEventListener('mouseenter', () => {
                    if(!iframeLoaded) {
                        const container = card.querySelector(`#preview-${item.num}`);
                        const iframe = document.createElement('iframe');
                        iframe.className = 'preview-iframe';
                        iframe.src = item.url;
                        iframe.tabIndex = -1;
                        container.appendChild(iframe);
                        iframeLoaded = true;
                    }
                });

                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateX = ((y - centerY) / centerY) * -5;
                    const rotateY = ((x - centerX) / centerX) * 5;
                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
                });

                card.addEventListener('mouseleave', () => {
                    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
                });

                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.getElementById('pageTransition').classList.add('active');
                    setTimeout(() => {
                        window.location.href = item.url;
                    }, 500);
                });

                gridContainer.appendChild(card);
            });
            
            if(!document.getElementById('keyframes-fadeup')) {
                const style = document.createElement('style');
                style.id = 'keyframes-fadeup';
                style.innerHTML = `@keyframes fadeUp { to { opacity: 1; transform: translateY(0) scale(1.0); } }`;
                document.head.appendChild(style);
            }

            renderPagination();
        }

        function renderPagination() {
            pagination.innerHTML = '';
            const totalPages = Math.ceil(concepts.length / itemsPerPage);
            
            const prevBtn = document.createElement('button');
            prevBtn.className = 'page-btn';
            prevBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => { currentPage--; renderGrid(); window.scrollTo({top: 0, behavior: 'smooth'}); };
            pagination.appendChild(prevBtn);

            const info = document.createElement('div');
            info.className = 'page-info';
            info.textContent = `${currentPage} / ${totalPages}`;
            pagination.appendChild(info);

            const nextBtn = document.createElement('button');
            nextBtn.className = 'page-btn';
            nextBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.onclick = () => { currentPage++; renderGrid(); window.scrollTo({top: 0, behavior: 'smooth'}); };
            pagination.appendChild(nextBtn);
        }

        updateUIText();
        renderGrid();

        window.addEventListener('pageshow', () => {
            document.getElementById('pageTransition').classList.remove('active');
        });

        // --- Three.js Enterprise Background ---
        const canvas = document.getElementById('canvas-bg');
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x020617, 0.003);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;

        const particlesCount = 1000;
        const positions = new Float32Array(particlesCount * 3);
        const velocities = new Float32Array(particlesCount);

        for(let i = 0; i < particlesCount; i++) {
            positions[i*3] = (Math.random() - 0.5) * 100;
            positions[i*3+1] = (Math.random() - 0.5) * 100;
            positions[i*3+2] = (Math.random() - 0.5) * 100;
            velocities[i] = Math.random() * 0.02 + 0.01;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            size: 0.8,
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        let mouseX = 0; let mouseY = 0;
        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;

        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX - windowHalfX) * 0.05;
            mouseY = (e.clientY - windowHalfY) * 0.05;
        });

        function animate() {
            requestAnimationFrame(animate);
            const posAttr = particles.geometry.attributes.position;
            const arr = posAttr.array;
            for(let i = 0; i < particlesCount; i++) {
                arr[i*3+1] += velocities[i];
                if(arr[i*3+1] > 50) { arr[i*3+1] = -50; }
            }
            posAttr.needsUpdate = true;
            
            particles.rotation.y += 0.001;
            particles.rotation.x += 0.0005;

            camera.position.x += (mouseX - camera.position.x) * 0.05;
            camera.position.y += (-mouseY - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>"""

index_html = index_html.replace("[[CONCEPTS]]", concepts_json).replace("[[LEN]]", total_len)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

print("Updated global index with enterprise UI and iframe previews on hover.")
