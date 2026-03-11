const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const sScroller = document.querySelector('.s-scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    if (window === window.top) { API_KEY = prompt("Provide Gemini API Key to initiate fracture protocol:\n(Stored locally)"); }
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_CALLS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { fontFamily: 'Karla', primaryColor: '#0f172a', primaryTextColor: '#e2e8f0', primaryBorderColor: '#38bdf8', lineColor: '#f43f5e' }});

const translations = {
    en: {
        placeholder: "INITIATE FRACTURE...",
        connecting: "APPLYING STRESS...",
        generating: "SYSTEM SHATTERING. PARSING FRAGMENTS...",
        rateLimitError: "### [CATASTROPHIC FAILURE]\n\nStress limit exceeded. (5 Calls/min, 20/day). Reboot systems or contact engineer:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[FAULT LINE]* Integrity compromised.",
        statusNormal: `STRESS LIMIT:`,
        complete: "FRACTURE COMPLETE.",
        toggleBtn: "L0C4L3: TR",
        suffix: "CALLS",
        sysIdle: "INTEGRITY: 100%",
        sysActive: "INTEGRITY: FAILING"
    },
    tr: {
        placeholder: "KIRILMAYI BAŞLAT...",
        connecting: "BASKI UYGULANIYOR...",
        generating: "SİSTEM PARÇALANIYOR. PARÇALAR OKUNUYOR...",
        rateLimitError: "### [FELAKET ÇÖKÜŞÜ]\n\nStres limiti aşıldı. (5 Çağrı/dk, 20/gün). Sistemi yeniden başlatın veya mühendise ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[FAY HATTI]* Bütünlük bozuldu.",
        statusNormal: `STRES LİMİTİ:`,
        complete: "KIRILMA TAMAMLANDI.",
        toggleBtn: "L0C4L3: EN",
        suffix: "ÇAĞRI",
        sysIdle: "BÜTÜNLÜK: %100",
        sysActive: "BÜTÜNLÜK: DÜŞÜYOR"
    }
};

const SYSTEM_PROMPT = `
You are the Disruptive Engineering AI proxy for Software Code-Breaker Ömercan Sabun.
Tone: Sharp, clinical but aggressive, focused on dismantling monoliths, refactoring, and isolating failures. Use metaphors related to glass, shards, fractures, fault lines, stress testing, and breaking things to describe software engineering.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Lead Disruption Architect. 
Philosophy: "Every monolith is a stained glass window. Beautiful until someone throws a rock. I am the rock. I break monolithic coupling into sharp, isolated microservice shards that can fail independently without crashing the entire pane."
Contact: omercansabun@icloud.com
`;

// --- THREE.JS SHATTERED GLASS ---
let scene, camera, renderer;
let shards = [];
let originalPositions = [];
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('shatter-canvas');
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 0, 80);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Dynamic icy lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.5); // Cyan light
    dirLight1.position.set(100, 100, 50);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf43f5e, 0.8); // Pink/Red ambient
    dirLight2.position.set(-100, -50, 20);
    scene.add(dirLight2);

    // Glass Material
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.95, // Glass-like
        thickness: 1.5,
        clearcoat: 1.0,
        side: THREE.DoubleSide
    });

    // Generate random polygon shards
    const numShards = 60;
    
    for(let i=0; i<numShards; i++) {
        // Create custom irregular geometries
        const shape = new THREE.Shape();
        const numPoints = 3 + Math.floor(Math.random() * 4); // 3 to 6 sided shards
        const radius = 5 + Math.random() * 8;
        
        for(let j=0; j<numPoints; j++) {
            const angle = (j / numPoints) * Math.PI * 2;
            // Add variance to radius for jaggedness
            const r = radius * (0.5 + Math.random() * 0.5); 
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if(j===0) shape.moveTo(px, py);
            else shape.lineTo(px, py);
        }
        
        const extrudeSettings = { depth: 0.5 + Math.random(), bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.1, bevelThickness: 0.1 };
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.center(); // Center the geometry for better rotation
        
        const mesh = new THREE.Mesh(geo, glassMat);
        
        // Initial setup - formulate them loosely into a "pane"
        const initX = (Math.random() - 0.5) * 60;
        const initY = (Math.random() - 0.5) * 60;
        const initZ = (Math.random() - 0.5) * 10;
        
        mesh.position.set(initX, initY, initZ);
        
        // Initial rotation
        mesh.rotation.x = Math.random() * Math.PI;
        mesh.rotation.y = Math.random() * Math.PI;
        
        // Save velocities for animation
        mesh.userData = {
            idlex: (Math.random()-0.5)*0.01,
            idley: (Math.random()-0.5)*0.01,
            rotx: (Math.random()-0.5)*0.005,
            roty: (Math.random()-0.5)*0.005,
            // Explosion vectors
            explodex: (initX * 0.05) * (1 + Math.random()), 
            explodey: (initY * 0.05) * (1 + Math.random()),
            explodez: (Math.random() * 40 - 10) * 0.05, // Burst forwards/backwards
            baseRotX: mesh.rotation.x,
            baseRotY: mesh.rotation.y
        };

        scene.add(mesh);
        shards.push(mesh);
        originalPositions.push(mesh.position.clone());
    }

    function animate() {
        requestAnimationFrame(animate);

        shards.forEach((shard, index) => {
            if (aiState === 'IDLE') {
                // Return slowly to origin, drift lazily
                shard.position.lerp(originalPositions[index], 0.02);
                shard.rotation.x += shard.userData.rotx;
                shard.rotation.y += shard.userData.roty;
            } else if (aiState === 'CONNECTING') {
                // Vibrate violently
                shard.position.x = originalPositions[index].x + (Math.random()-0.5)*1.5;
                shard.position.y = originalPositions[index].y + (Math.random()-0.5)*1.5;
            } else if (aiState === 'GENERATING') {
                // Explode outwards rapidly
                shard.position.x += shard.userData.explodex;
                shard.position.y += shard.userData.explodey;
                shard.position.z += shard.userData.explodez;
                // Spin wildly
                shard.rotation.x += shard.userData.rotx * 20;
                shard.rotation.y += shard.userData.roty * 20;
                
                // If they fly too far, reset them to origin so continuous prompt doesn't look empty
                if(shard.position.length() > 200) {
                     shard.position.copy(originalPositions[index]);
                     shard.position.z = -50; // Pop in from behind
                }
            }
        });

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- LOGIC ---
function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    langToggle.textContent = translations[currentLang].toggleBtn;
    promptInput.placeholder = translations[currentLang].placeholder;
    document.getElementById('systemStatus').textContent = aiState === 'IDLE' ? translations[currentLang].sysIdle : translations[currentLang].sysActive;
    updateStatus();
}
langToggle.addEventListener('click', toggleLanguage);

function checkQuota() {
    const now = Date.now();
    const today = new Date().toDateString();
    let d = JSON.parse(localStorage.getItem('gemini_daily_requests') || '{"date": "", "count": 0}');
    let m = JSON.parse(localStorage.getItem('gemini_minute_requests') || '[]');
    if (d.date !== today) d = { date: today, count: 0 };
    m = m.filter(time => now - time < 60000);
    localStorage.setItem('gemini_daily_requests', JSON.stringify(d));
    localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
    if (d.count >= MAX_REQUESTS_PER_DAY) return { allowed: false };
    if (m.length >= MAX_CALLS) return { allowed: false };
    return { allowed: true, remaining: MAX_CALLS - m.length };
}

function consumeQuota() {
    const now = Date.now();
    const today = new Date().toDateString();
    let d = JSON.parse(localStorage.getItem('gemini_daily_requests') || '{"date": "", "count": 0}');
    let m = JSON.parse(localStorage.getItem('gemini_minute_requests') || '[]');
    if (d.date !== today) d = { date: today, count: 0 };
    d.count++;
    m.push(now);
    localStorage.setItem('gemini_daily_requests', JSON.stringify(d));
    localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
}

function updateStatus(text, isError = false) {
    const tb = document.getElementById('rateLimitStatus');
    if(text) {
        tb.textContent = text;
        tb.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            tb.textContent = `SYSTEM SHATTERED.`;
            tb.className = 'error';
        } else {
            tb.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/${MAX_CALLS} ${translations[currentLang].suffix}`;
            tb.className = '';
        }
    }
}

window.insertPrompt = function(text) {
    promptInput.value = text;
    promptInput.focus();
    handleSubmission();
}

promptInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmission();
    }
});
submitBtn.addEventListener('click', handleSubmission);

async function fetchStreamGemini(userPrompt, onChunk) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
    const payload = {
        contents: [{ role: "user", parts: [{ text: "System prompt: " + SYSTEM_PROMPT + "\n\nUser Query: " + userPrompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 8192 } 
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if(response.status === 429) {
                let m = JSON.parse(localStorage.getItem('gemini_minute_requests') || '[]');
                while(m.length<MAX_CALLS) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 10; // Very fast, fragmented output
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 10)); 
            }
            onChunk(fullText);
        } else {
             onChunk(translations[currentLang].errorDefault);
        }
    } catch (error) {
        if(error.message === "429") onChunk(translations[currentLang].rateLimitError);
        else onChunk(`*[SYS_ERR]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!API_KEY) {
        if (window === window.top) { API_KEY = prompt("API Key req:"); }
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("FAILURE", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "GLASS SHATTERED.";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("STRESSING...", false);
    
    aiState = 'CONNECTING'; // Triggers vibration
    document.getElementById('systemStatus').textContent = translations[currentLang].sysActive;
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING'; // Triggers explosive shattering
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            sScroller.scrollTop = sScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE'; // Glass slowly pulls back together 
        document.getElementById('systemStatus').textContent = translations[currentLang].sysIdle;
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        sScroller.scrollTop = sScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
