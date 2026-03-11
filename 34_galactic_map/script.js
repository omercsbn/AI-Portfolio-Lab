const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const cScroller = document.querySelector('.c-scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Please enter your Gemini API Key to use this portfolio piece:\n(Your key is stored locally in your browser)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
} 
const MAX_REQUESTS_PER_MINUTE = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const translations = {
    en: {
        placeholder: "Enter coordinates...",
        connecting: "PLOTTING TRAJECTORY...",
        generating: "SYNTHESIZING STARLIGHT...",
        rateLimitError: "### [FTL DRIVE COOLING]\n\nJump capability saturated. (Max 5/min, 20/day). Remain in orbit or contact:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[VOID ERROR]* Signal lost in transmission.",
        statusNormal: `TELEMETRY: NOMINAL | JUMPS:`,
        complete: "TRANSMISSION RECEIVED.",
        toggleBtn: "EN"
    },
    tr: {
        placeholder: "Koordinat giriniz...",
        connecting: "ROTA ÇİZİLİYOR...",
        generating: "YILDIZ IŞIĞI SENTEZLENİYOR...",
        rateLimitError: "### [FTL SÜRÜCÜSÜ SOĞYUYOR]\n\nAtlama kapasitesi doldu. Yörüngede kalın veya iletişime geçin:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[BOŞLUK HATASI]* Sinyal iletimde kayboldu.",
        statusNormal: `TELEMETRİ: NORMAL | ATLAMA:`,
        complete: "İLETİM ALINDI.",
        toggleBtn: "TR"
    }
};

const SYSTEM_PROMPT = `
You are the Galactic Architect AI representing Ömercan Sabun.
Tone: Grand, vast, cosmic, yet highly precise (like an interstellar navigator or astronomer). Use space/astrophysics metaphors (constellations, gravity, void, lightspeed).
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Cloud-Native Architect.
Firm: Architecht
Philosophy: A microservice without connections is alone in the void. Architecture is forming them into working constellations.
Contact: hello@omercan.dev
`;

// --- THREE.JS GALAXY CONSTELLATION ---
let scene, camera, renderer, particles, linesMesh;
let aiState = 'IDLE'; // IDLE, CONNECTING, GENERATING
let time = 0;
const STAR_COUNT = 800; // lots of stars!

function initThreeJS() {
    const canvas = document.getElementById('galaxy-canvas');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#05050a', 0.015);
    
    // Wide field of view for grandeur
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 80;
    camera.position.y = 20;
    camera.lookAt(0,0,0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x05050a, 1);

    // Stars geometry
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    
    // Colors: mostly white/blue, some warm/purple
    const colorBank = [
        new THREE.Color('#ffffff'), new THREE.Color('#c4b5fd'), 
        new THREE.Color('#38bdf8'), new THREE.Color('#fcd34d')
    ];

    for(let i=0; i<STAR_COUNT; i++) {
        // Distribute in a highly dispersed disc / spiral arm shape roughly
        const r = Math.random() * 80;
        const theta = Math.random() * Math.PI * 2;
        const varY = (Math.random() - 0.5) * 20;

        positions.push(
            r * Math.cos(theta),
            varY,
            r * Math.sin(theta)
        );

        let randomColor = colorBank[Math.floor(Math.random()*colorBank.length)];
        // Dim outer stars slightly
        if(r > 50) randomColor.multiplyScalar(0.5);
        
        colors.push(randomColor.r, randomColor.g, randomColor.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Custom star material
    const material = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        // additive blending creates the glow when they overlap
        blending: THREE.AdditiveBlending 
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Draw lines between a subset of stars to form 'constellations'
    const lineGeo = new THREE.BufferGeometry();
    const linePositions = [];
    
    for(let i=0; i<150; i++) {
        // Pick two random stars somewhat close to center
        let idx1 = Math.floor(Math.random()*(STAR_COUNT/2)) * 3;
        let idx2 = Math.floor(Math.random()*(STAR_COUNT/2)) * 3;
        
        linePositions.push(
            positions[idx1], positions[idx1+1], positions[idx1+2],
            positions[idx2], positions[idx2+1], positions[idx2+2]
        );
    }
    
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
    });
    
    linesMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(linesMesh);

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 10;
        mouseY = -(e.clientY / window.innerHeight - 0.5) * 10;
    });

    function animate() {
        requestAnimationFrame(animate);
        time += 0.005;

        // Giant slow rotation of the galaxy
        particles.rotation.y = time * 0.5;
        linesMesh.rotation.y = time * 0.5;
        
        // Gentle tilt
        particles.rotation.x = Math.sin(time*0.2) * 0.1;
        linesMesh.rotation.x = Math.sin(time*0.2) * 0.1;

        // When generating, warp speed effect via camera zooming and glowing
        if(aiState === 'GENERATING') {
            camera.position.z += (40 - camera.position.z) * 0.02; // zoom in
            material.size = 1.2 + Math.sin(time*20)*0.5; // stars twinkle wildly
            lineMat.opacity = 0.3 + Math.sin(time*10)*0.2; // lines glow
        } else if (aiState === 'CONNECTING') {
            camera.position.z += (60 - camera.position.z) * 0.05; 
            material.size = 1.0;
        } else {
            camera.position.z += (80 - camera.position.z) * 0.01; // zoom out to normal
            material.size = 0.8;
            lineMat.opacity = 0.15;
        }

        camera.position.x += (mouseX - camera.position.x) * 0.05;
        camera.position.y += ((mouseY + 20) - camera.position.y) * 0.05; // Base Y offset

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
    if (m.length >= MAX_REQUESTS_PER_MINUTE) return { allowed: false };
    return { allowed: true, remaining: MAX_REQUESTS_PER_DAY - d.count };
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
    const stat = document.querySelector('.c-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'c-telemetry error' : 'c-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `SYSTEM LOCK: COOLDOWN`;
            stat.className = 'c-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}`;
            stat.className = 'c-telemetry';
        }
    }
}

window.insertPrompt = function(text) {
    promptInput.value = text;
    promptInput.focus();
    handleSubmission();
}

promptInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if(this.value === '') this.style.height = 'auto';
});

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
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-goog-api-key': API_KEY },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if(response.status === 429) {
                let m = JSON.parse(localStorage.getItem('gemini_minute_requests') || '[]');
                while(m.length<MAX_REQUESTS_PER_MINUTE) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 12;
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 12));
            }
            onChunk(fullText);
        } else {
             onChunk(translations[currentLang].errorDefault);
        }
    } catch (error) {
        if(error.message === "429") onChunk(translations[currentLang].rateLimitError);
        else onChunk(`*[ERR]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("WARNING: NO POWER", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ABORT";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("ENGAGING HYPERDRIVE...");
    
    aiState = 'CONNECTING';
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 700));

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            cScroller.scrollTop = cScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus();
        cScroller.scrollTop = cScroller.scrollHeight;
        
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
