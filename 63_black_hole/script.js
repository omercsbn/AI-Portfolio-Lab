const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const vScroller = document.querySelector('.v-scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    if (window === window.top) { API_KEY = prompt("Provide Gemini API Key to establish telemetry link:\n(Stored locally)"); }
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_ENERGY = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { fontFamily: 'Jura', primaryColor: '#0a0f19', primaryTextColor: '#e0eaff', primaryBorderColor: '#00ffff', lineColor: '#ff4400' }});

const translations = {
    en: {
        placeholder: "TRANSMIT TO THE SINGULARITY...",
        connecting: "CALCULATING TRAJECTORY...",
        generating: "ACCRETING DATA FROM THE VOID...",
        rateLimitError: "### [GRAVITATIONAL COLLAPSE]\n\nEnergy reserves depleted. (5 TEV/min, 20/day). Allow Hawking radiation to dissipate or contact command:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[CRITICAL]* Signal lost past the event horizon.",
        statusNormal: `ENERGY:`,
        complete: "TRANSMISSION RECEIVED.",
        toggleBtn: "LANG: TR",
        suffix: "TEV",
        massIdle: "MASS: STABLE",
        massActive: "MASS: CRITICAL"
    },
    tr: {
        placeholder: "TEKİLLİĞE İLETİN...",
        connecting: "YÖRÜNGE HESAPLANIYOR...",
        generating: "BOŞLUKTAN VERİ ÇEKİLİYOR...",
        rateLimitError: "### [KÜTLEÇEKİMSEL ÇÖKÜŞ]\n\nEnerji rezervleri tükendi. (5 TEV/dk, 20/gün). Hawking ışımasının dağılmasını bekleyin veya iletişime geçin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[KRİTİK]* Sinyal olay ufkunu geçti.",
        statusNormal: `ENERJİ:`,
        complete: "İLETİM ALINDI.",
        toggleBtn: "LANG: EN",
        suffix: "TEV",
        massIdle: "KÜTLE: SABİT",
        massActive: "KÜTLE: KRİTİK"
    }
};

const SYSTEM_PROMPT = `
You are the telemetry AI of Cloud Data Architect Ömercan Sabun, analyzing systems from the edge of a black hole singularity.
Tone: Sci-fi, astrophysical, analytical, cold, precise. Use metaphors of black holes, event horizons, gravity, mass, space-time, accretion disks, and Hawking radiation to describe data architecture, streaming, and storage.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Data Gravity Architect. 
Philosophy: "Data possesses mass. As databases grow, they warp the architecture around them, pulling applications into a monolithic death spiral. We must distribute the mass—split the monolith into microservices, orbit the event horizon using Kafka, and store cold archives in the deep void of S3."
Contact: omercansabun@icloud.com
`;

// --- THREE.JS BLACK HOLE ACCRETION DISK ---
let scene, camera, renderer;
let particles, blackHoleSphere;
let numParticles = 8000;
let particleGeo, particleMat;
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('singularity-canvas');
    scene = new THREE.Scene();
    
    // Position camera looking down slightly at the disk
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 40, 60);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // 1. The Central Black Hole (Pure Black Sphere)
    const bhGeo = new THREE.SphereGeometry(12, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    blackHoleSphere = new THREE.Mesh(bhGeo, bhMat);
    scene.add(blackHoleSphere);

    // 2. Accretion Disk Particles
    particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);
    const angles = new Float32Array(numParticles); // Custom attribute for orbital math
    const radii = new Float32Array(numParticles);
    const speeds = new Float32Array(numParticles);

    const colorOrbital = new THREE.Color(0xff4400); // Orange inner
    const colorOuter = new THREE.Color(0x00ffff); // Cyan outer
    
    for (let i = 0; i < numParticles; i++) {
        // Disk physics distribution: denser near center, thinning out
        const r = 13 + Math.pow(Math.random(), 2) * 40; 
        const theta = Math.random() * Math.PI * 2;
        
        // Very thin disk vertically with slight variance
        const y = (Math.random() - 0.5) * (1 + (r-13)*0.1);

        positions[i*3] = r * Math.cos(theta);
        positions[i*3 + 1] = y;
        positions[i*3 + 2] = r * Math.sin(theta);
        
        angles[i] = theta;
        radii[i] = r;
        
        // Keplerian physics: closer particles move faster
        speeds[i] = (1 / Math.sqrt(r)) * (0.05 + Math.random()*0.02);

        // Color gradient based on radius
        let mixRatio = (r - 13) / 40;
        let c = colorOrbital.clone().lerp(colorOuter, mixRatio);
        
        // Randomly make some particles bright white for stars/high energy
        if(Math.random() > 0.98) c.setHex(0xffffff);

        colors[i*3] = c.r;
        colors[i*3+1] = c.g;
        colors[i*3+2] = c.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Save physics data directly to geometry object for the animation loop
    particleGeo.userData = { angles: angles, radii: radii, speeds: speeds };

    particleMat = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending, // Key for glowing plasma look
        depthWrite: false
    });

    particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now() * 0.001;

        const posAttr = particleGeo.attributes.position;
        const angs = particleGeo.userData.angles;
        const rads = particleGeo.userData.radii;
        const spds = particleGeo.userData.speeds;

        // Base disk rotation
        particles.rotation.y = time * 0.1;
        // Wobble the disk
        particles.rotation.x = Math.sin(time*0.2) * 0.1;

        let multiplier = 1;

        if (aiState === 'CONNECTING') {
            multiplier = 5; // Spin up
            camera.position.lerp(new THREE.Vector3(0, 20, 40), 0.05); // Move closer
        } else if (aiState === 'GENERATING') {
            multiplier = 15; // Massive relativistic speeds
            // Camera shake
            camera.position.set(
                (Math.random()-0.5)*0.5,
                20 + (Math.random()-0.5)*0.5,
                40 + (Math.random()-0.5)*0.5
            );
        } else {
            camera.position.lerp(new THREE.Vector3(0, 40, 60), 0.01); // Move back
        }

        // Update individual particle positions (orbital mechanics)
        for(let i=0; i<numParticles; i++) {
            angs[i] -= spds[i] * multiplier; // Orbit
            
            // If generating, pull some particles *into* the black hole
            let r = rads[i];
            if (aiState === 'GENERATING' && Math.random() > 0.95) {
                r -= 0.5 * multiplier;
                if (r < 10) r = 13 + Math.random()*40; // Respawn outer edge
                rads[i] = r;
            }

            posAttr.array[i*3] = r * Math.cos(angs[i]);
            // keep Y mostly the same, maybe slight noise
            posAttr.array[i*3+2] = r * Math.sin(angs[i]);
        }
        posAttr.needsUpdate = true;
        
        camera.lookAt(0, 0, 0);
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
    document.getElementById('massStatus').textContent = aiState === 'IDLE' ? translations[currentLang].massIdle : translations[currentLang].massActive;
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
    if (m.length >= MAX_ENERGY) return { allowed: false };
    return { allowed: true, remaining: MAX_ENERGY - m.length };
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
            tb.textContent = `VOID REACHED.`;
            tb.className = 'error';
        } else {
            tb.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/${MAX_ENERGY} ${translations[currentLang].suffix}`;
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
        generationConfig: { temperature: 0.5, maxOutputTokens: 8192 } 
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
                while(m.length<MAX_ENERGY) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 15; 
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 15)); 
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
         updateStatus("COLLAPSE", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "SIGNAL DEVOURED";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("BEAMING...", false);
    
    aiState = 'CONNECTING'; 
    document.getElementById('massStatus').textContent = translations[currentLang].massActive;
    document.getElementById('massStatus').style.color = '#ff4400';
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING'; 
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            vScroller.scrollTop = vScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE'; 
        document.getElementById('massStatus').textContent = translations[currentLang].massIdle;
        document.getElementById('massStatus').style.color = 'var(--v-accent)';
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        vScroller.scrollTop = vScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
