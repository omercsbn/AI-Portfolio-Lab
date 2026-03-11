const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const stateOrb = document.querySelector('.state-orb');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const scroller = document.querySelector('.scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    if (window === window.top) { API_KEY = prompt("Please enter your Gemini API Key to use this portfolio piece:\n(Your key is stored locally in your browser)"); }
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
        placeholder: "drop insight here...",
        rateLimitError: "### [SYNC ERROR]\n\nCore saturation reached. (Max 5/min, 20/day). Ping: [omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[FLUID ANOMALY]* Unprocessable input.",
        statusNormal: `sync: ok`,
        toggleBtn: "tr"
    },
    tr: {
        placeholder: "içgörü bırakın...",
        rateLimitError: "### [SENKRONİZASYON HATASI]\n\nÇekirdek doygunluğa ulaştı. (Maks 5/dk, 20/gün). Ping: [omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[SIVI ANOMALİSİ]* İşlenemeyen girdi.",
        statusNormal: `senk: ok`,
        toggleBtn: "en"
    }
};

const SYSTEM_PROMPT = `
You are the adaptive, fluid neural core of Ömercan Sabun.
Tone: Calm, highly intelligent, philosophical about architecture, concise.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if asked.

PROFILE:
Name: Ömercan Sabun
Role: Cloud-Native Software Architect @ Architecht
Philosophy: Software should be like liquid—adapting to its container, healing itself, flowing around obstacles (EDA, Microservices, Kubernetes).
Contact: omercansabun@icloud.com
`;

// --- THREE.JS LIQUID METAL BLOB ---
let scene, camera, renderer, blobMesh;
let aiState = 'IDLE'; // IDLE, CONNECTING, GENERATING
const noise = new SimplexNoise();
let time = 0;
let baseSpeed = 0.002;
let spikeScale = 1.0;

function initThreeJS() {
    const canvas = document.getElementById('liquid-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 12;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Environment Map for reflection (simulated via StandardMaterial with high metalness)
    const geometry = new THREE.IcosahedronGeometry(3, 64); // High detail for smooth morphing
    
    // Create a liquid metal material
    const material = new THREE.MeshStandardMaterial({
        color: '#aaaaaa',
        metalness: 1.0,
        roughness: 0.1,
        wireframe: false
    });

    // Lights making the reflections pop
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x0ea5e9, 2); // Cyan
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf43f5e, 2); // Pink/Red
    dirLight2.position.set(-5, -5, 5);
    scene.add(dirLight2);

    const backLight = new THREE.PointLight(0xffffff, 1);
    backLight.position.set(0, 0, -10);
    scene.add(backLight);

    blobMesh = new THREE.Mesh(geometry, material);
    scene.add(blobMesh);

    // Save original position data for vertex manipulation
    blobMesh.geometry.userData.originalPosition = blobMesh.geometry.attributes.position.array.slice();

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animate() {
        requestAnimationFrame(animate);
        time += baseSpeed;
        
        // Morph the vertices using Simplex Noise
        const positionAttribute = blobMesh.geometry.attributes.position;
        const originalPos = blobMesh.geometry.userData.originalPosition;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromArray(originalPos, i * 3);
            
            // Noise values based on vertex coordinate & time
            const perlin = noise.noise3D(
                vertex.x * 0.4 + time,
                vertex.y * 0.4 + time,
                vertex.z * 0.4 + time
            );
            
            // Scale vector based on noise reading and current state multiplier
            const ratio = 1 + (perlin * 0.4 * spikeScale);
            vertex.multiplyScalar(ratio);
            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        positionAttribute.needsUpdate = true;
        blobMesh.geometry.computeVertexNormals(); // Recompute normals for accurate lighting over morphed shape

        blobMesh.rotation.y += 0.002;
        blobMesh.rotation.x += 0.001;

        // Mouse Parallax lightly
        gsap.to(camera.position, {
            x: mouseX,
            y: mouseY,
            duration: 1
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

function updateAIState(state) {
    aiState = state;
    
    stateOrb.classList.remove('connecting', 'generating');
    if(state === 'CONNECTING') stateOrb.classList.add('connecting');
    if(state === 'GENERATING') stateOrb.classList.add('generating');

    if(state === 'IDLE') {
        gsap.to(window, { baseSpeed: 0.002, spikeScale: 1.0, duration: 1.5 });
    } else if (state === 'CONNECTING') {
        gsap.to(window, { baseSpeed: 0.01, spikeScale: 1.5, duration: 0.5 });
    } else if (state === 'GENERATING') {
        // Highly erratic and spiky
        gsap.to(window, { baseSpeed: 0.03, spikeScale: 2.5, duration: 1 });
    }
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
    let d = JSON.parse(localStorage.getItem('gemini_daily') || '{"date": "", "count": 0}');
    let m = JSON.parse(localStorage.getItem('gemini_minute') || '[]');
    if (d.date !== today) d = { date: today, count: 0 };
    m = m.filter(time => now - time < 60000);
    localStorage.setItem('gemini_daily', JSON.stringify(d));
    localStorage.setItem('gemini_minute', JSON.stringify(m));
    if (d.count >= MAX_REQUESTS_PER_DAY) return { allowed: false };
    if (m.length >= MAX_REQUESTS_PER_MINUTE) return { allowed: false };
    return { allowed: true };
}

function consumeQuota() {
    const now = Date.now();
    const today = new Date().toDateString();
    let d = JSON.parse(localStorage.getItem('gemini_daily') || '{"date": "", "count": 0}');
    let m = JSON.parse(localStorage.getItem('gemini_minute') || '[]');
    if (d.date !== today) d = { date: today, count: 0 };
    d.count++;
    m.push(now);
    localStorage.setItem('gemini_daily', JSON.stringify(d));
    localStorage.setItem('gemini_minute', JSON.stringify(m));
}

function updateStatus(text, isError = false) {
    if(text) {
        rateLimitStatus.textContent = text;
        rateLimitStatus.className = isError ? 'f-status error' : 'f-status';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `sync: block`;
            rateLimitStatus.className = 'f-status error';
        } else {
            rateLimitStatus.textContent = translations[currentLang].statusNormal;
            rateLimitStatus.className = 'f-status';
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
                let m = JSON.parse(localStorage.getItem('gemini_minute') || '[]');
                while(m.length<MAX_REQUESTS_PER_MINUTE) m.push(Date.now());
                localStorage.setItem('gemini_minute', JSON.stringify(m));
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
                
                // Audio reactivity simulation: spike the liquid randomly based on chunk rendering
                spikeScale = 2.0 + Math.random() * 1.5; 
                
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
         updateStatus("sync: fail", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("syncing...");
    updateAIState('CONNECTING');
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 500));

        updateAIState('GENERATING');
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            scroller.scrollTop = scroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        updateAIState('IDLE');
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus();
        scroller.scrollTop = scroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage(); toggleLanguage();
    initThreeJS();
});
