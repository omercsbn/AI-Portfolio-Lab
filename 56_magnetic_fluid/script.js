const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const fScroller = document.querySelector('.f-scroller');
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
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { fontFamily: 'Jura', primaryColor: '#cbd5e1', primaryTextColor: '#000', primaryBorderColor: '#000', lineColor: '#000' } });

const translations = {
    en: {
        placeholder: "INDUCE MAGNETIC FIELD...",
        connecting: "POLARIZING SYSTEM...",
        generating: "ALIGNING DIPOLES...",
        rateLimitError: "### [FLUX SATURATION]\n\nMagnetic field overloaded. (5 excitations/min, 20/day). Decrease field strength or contact engineer:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[DECOHERENCE]* Field collapsed.",
        statusNormal: `FLUX CAPACITY:`,
        complete: "SYSTEM EQUILIBRIUM.",
        toggleBtn: "EN.POLE",
        suffix: "Wb"
    },
    tr: {
        placeholder: "MANYETİK ALANI UYAR...",
        connecting: "SİSTEM POLARİZE EDİLİYOR...",
        generating: "DİPOLLER HİZALANIYOR...",
        rateLimitError: "### [AKI DOYGUNLUĞU]\n\nManyetik alan aşırı yüklendi. (5 uyarma/dk, 20/gün). Alan gücünü azaltın veya mühendise ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[DEKOHERANS]* Alan çöktü.",
        statusNormal: `AKI KAPASİTESİ:`,
        complete: "SİSTEM DENGEDE.",
        toggleBtn: "TR.KUTUP",
        suffix: "Wb"
    }
};

const SYSTEM_PROMPT = `
You are a Fluid Architecture AI representing Cloud Architect Ömercan Sabun.
Tone: Clinical, scientific, adaptive, structural. Use metaphors of magnetism, polarity, fluid dynamics, cohesion, alignment, spikes, and resting states.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. 
Philosophy: The best systems are liquid until acted upon by force. When a traffic spike hits, my architectures react like ferrofluid near a magnet: they instantly structure themselves, scale up into sharp functional partitions, handle the load, and return to a cost-efficient resting state.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS FERROFLUID SIMULATION ---
let scene, camera, renderer;
let sphereMesh;
let simplex;
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('fluid-canvas');
    scene = new THREE.Scene();
    
    // Position camera far right so the fluid sits in the right-hand blank space
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(-6, 0, 15);
    camera.lookAt(4, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    simplex = new SimplexNoise();

    // High fidelity lighting for metallic reflections
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(10, 20, 10);
    scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0x3182ce, 1); // Blue tint from below
    dirLight2.position.set(-10, -20, -10);
    scene.add(dirLight2);

    // Environment map approximation
    const envTexture = new THREE.CubeTextureLoader()
        .setPath('https://threejs.org/examples/textures/cube/Bridge2/') // Fallback public texture for reflections
        .load(['posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg']);
    // If the image fails to load it just won't reflect perfectly, which is fine

    // Material: Extremely shiny black metallic
    const material = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 1.0,
        roughness: 0.15,
        envMap: envTexture,
        envMapIntensity: 1.0,
        flatShading: false
    });

    // Base Sphere - needs high segment count for smooth deformation
    const geometry = new THREE.SphereGeometry(4, 128, 128);
    // Store original positions for deformation math
    geometry.userData.originalVertices = [];
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        geometry.userData.originalVertices.push(
            new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i))
        );
    }

    sphereMesh = new THREE.Mesh(geometry, material);
    sphereMesh.position.set(4, 0, 0); // Offset to right
    scene.add(sphereMesh);

    function animate() {
        requestAnimationFrame(animate);

        const time = performance.now() * 0.001;
        const positions = sphereMesh.geometry.attributes.position;
        const normals = sphereMesh.geometry.attributes.normal;
        const origVertices = sphereMesh.geometry.userData.originalVertices;

        // Deformation logic based on state
        let noiseScale = 0.5;
        let spikeIntensity = 0;
        let speed = time;

        if (aiState === 'IDLE') {
            noiseScale = 0.5; // low frequency blobs
            spikeIntensity = 0.2; // slight wobble
            speed = time * 0.5;
        } else if (aiState === 'CONNECTING') {
            noiseScale = 1.0; 
            spikeIntensity = 0.8; 
            speed = time * 2.0;
        } else if (aiState === 'GENERATING') {
            noiseScale = 2.5; // High frequency spikes (ferrofluid)
            spikeIntensity = 2.0; // Massive spikes
            speed = time * 1.5;
            // Also subtly pulse the ball larger
            sphereMesh.scale.setScalar(1.0 + Math.sin(time*10)*0.05);
        }

        if(aiState !== 'GENERATING') {
            sphereMesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
        }

        // Apply simplex noise to vertices along their normals
        for (let i = 0; i < origVertices.length; i++) {
            const v = origVertices[i];
            const n = new THREE.Vector3(normals.getX(i), normals.getY(i), normals.getZ(i)).normalize();
            
            // Generate 3D noise value
            // We use absolute value of noise to create sharp outwards spikes like real ferrofluid
            let noiseValue = Math.abs(simplex.noise3D(v.x * noiseScale + speed, v.y * noiseScale, v.z * noiseScale));
            
            // Ease out the very low values so it stays round where there are no spikes
            noiseValue = Math.pow(noiseValue, 3);
            
            // Calculate new position
            const displacement = noiseValue * spikeIntensity;
            const newPos = v.clone().add(n.multiplyScalar(displacement));
            
            positions.setXYZ(i, newPos.x, newPos.y, newPos.z);
        }

        positions.needsUpdate = true;
        // Recompute normals for proper lighting on the deformed surface
        sphereMesh.geometry.computeVertexNormals();

        // Slow overall rotation
        sphereMesh.rotation.y = time * 0.1;
        sphereMesh.rotation.z = time * 0.05;

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
    const stat = document.querySelector('.f-telemetry');
    const tb = document.getElementById('rateLimitStatus');
    if(text) {
        tb.textContent = text;
        tb.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            tb.textContent = `FIELD COLLAPSE.`;
            tb.className = 'error';
        } else {
            tb.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/5 ${translations[currentLang].suffix}`;
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
            let chunkLength = 25; 
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

    if (!checkQuota().allowed) {
         updateStatus("MAGNETIC FAILURE", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "CRITICAL ERROR";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("INDUCING...", false);
    
    aiState = 'CONNECTING'; // Starts to wobble intensely
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING'; // Full sharp spikes
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            fScroller.scrollTop = fScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE'; // Returns to smooth blob
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        fScroller.scrollTop = fScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
