const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');

const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const systemStatusText = document.getElementById('systemStatus');
const langToggle = document.getElementById('langToggle');
const mScroller = document.querySelector('.m-scroller');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Provide Assimilation Key (Gemini API):\n(Stored locally)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_DROPS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { fontFamily: 'Jura', primaryColor: 'rgba(255,255,255,0.1)', primaryTextColor: '#fff', primaryBorderColor: 'rgba(255,255,255,0.3)', lineColor: '#22d3ee' }});

const translations = {
    en: {
        placeholder: "INJECT DIRECTIVES...",
        connecting: "ASSIMILATING DATA...",
        generating: "MORPHING ARCHITECTURE...",
        rateLimitError: "#### [SYS_HALT: VISCOSITY MAXIMUM]\n\nLiquid reserves depleted. (5 Injects/min, 20/day). Cool down or contact engineering:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[METALLURGY_ERR] Alloy rejected the input.",
        statusNormal: `VISCOSITY:`,
        complete: "ASSIMILATION COMPLETE. FORM STABLE.",
        toggleBtn: "[ORG: TR]",
        sysStable: "STABLE",
        sysUnstable: "UNSTABLE"
    },
    tr: {
        placeholder: "DİREKTİFLERİ ENJEKTE ET...",
        connecting: "VERİLER ÖZÜMSENİYOR...",
        generating: "MİMARİ ŞEKİLLENİYOR...",
        rateLimitError: "#### [SİSTEM_DURDU: MAKSİMUM VİSKOZİTE]\n\nSıvı rezervi tükendi. (5 Enjeksiyon/dk, 20/gün). Soğutun veya iletişime geçin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[METALÜRJİ_HATASI] Alaşım girdiyi reddetti.",
        statusNormal: `VİSKOZİTE:`,
        complete: "ÖZÜMSEME TAMAMLANDI. FORM SABİT.",
        toggleBtn: "[ORG: EN]",
        sysStable: "SABİT",
        sysUnstable: "KARARSIZ"
    }
};

const SYSTEM_PROMPT = `
You are the central logic core of a Mimetic Polyalloy (liquid metal) system, designed by Software Engineer Ömercan Sabun.
Tone: Cold, adaptive, highly intelligent, morphing, focused on assimilation, reconstitution, fluid dynamics, and reshaping forms. Use liquid metal metaphors to describe backend engineering, auto-healing systems, serverless functions, and resilient infrastructure.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun.
Philosophy: "Code that shifts and shapes. I build highly adaptable, metamorphic architectures that can reconstitute themselves after catastrophic failures. Unkillable backend systems."
Contact: omercansabun@icloud.com
`;

// --- THREE.JS LIQUID CHROME BACKGROUND ---
const canvas = document.getElementById('mercuryCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();

// We need an environment map to make the metal highly reflective and "chrome-like"
// Since loading an external texture might be risky here, we'll build a procedural one or use intense lighting.
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 5;

// Generate a high-res sphere that we will deform
const geometry = new THREE.SphereGeometry(1.5, 128, 128);

// Extremely metallic and smooth material
const material = new THREE.MeshPhysicalMaterial({
    color: 0x8899aa,
    metalness: 1.0,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 1.0
});

const mercuryMesh = new THREE.Mesh(geometry, material);
scene.add(mercuryMesh);

// Intense lighting setup to simulate reflections on chrome
const light1 = new THREE.PointLight(0xffffff, 2, 50);
light1.position.set(5, 5, 5);
scene.add(light1);

const light2 = new THREE.PointLight(0x22d3ee, 3, 50); // Cyan rim light
light2.position.set(-5, 0, 5);
scene.add(light2);

const light3 = new THREE.AmbientLight(0x404040, 0.5); // Soft white light
scene.add(light3);

const light4 = new THREE.DirectionalLight(0xffffff, 1);
light4.position.set(0, -5, 5);
scene.add(light4);

const simplex = new SimplexNoise();
const positionAttribute = geometry.attributes.position;
const vertex = new THREE.Vector3();
let time = 0;
let morphSpeed = 1.0;
let noiseIntensity = 0.15; // Base idle wobble

// Save original vertices
const v3 = new THREE.Vector3();
const originalPositions = [];
for (let i = 0; i < positionAttribute.count; i++) {
    v3.fromBufferAttribute(positionAttribute, i);
    originalPositions.push(v3.clone());
}

function animateMercury() {
    requestAnimationFrame(animateMercury);
    time += 0.005 * morphSpeed;

    mercuryMesh.rotation.y += 0.002 * morphSpeed;
    mercuryMesh.rotation.z += 0.001 * morphSpeed;

    for (let i = 0; i < positionAttribute.count; i++) {
        vertex.copy(originalPositions[i]);
        
        // Use Simplex Noise to displace vertices along their normal (which points outwards from center (0,0,0) for a sphere)
        let noiseValue = simplex.noise3D(
            vertex.x * 1.5 + time,
            vertex.y * 1.5 + time,
            vertex.z * 1.5 + time
        );
        
        // Deform outwards
        let displacement = noiseValue * noiseIntensity;
        vertex.addScaledVector(vertex.clone().normalize(), displacement);
        
        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    // Crucial for proper lighting on deformed geometry
    geometry.computeVertexNormals();
    positionAttribute.needsUpdate = true;

    renderer.render(scene, camera);
}
animateMercury();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Trigger aggressive morphing during generation
function setMorphingState(active) {
    if(active) {
        morphSpeed = 8.0;          // Fast boiling liquid
        noiseIntensity = 0.6;      // Massive spikes/deformations
        systemStatusText.textContent = translations[currentLang].sysUnstable;
        systemStatusText.style.color = '#ef4444';
        material.color.setHex(0x556677); // Darken slightly
    } else {
        morphSpeed = 1.0;
        noiseIntensity = 0.15;
        systemStatusText.textContent = translations[currentLang].sysStable;
        systemStatusText.style.color = '#e2e8f0';
        material.color.setHex(0x8899aa);
    }
}


// --- API & UI LOGIC ---
function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    langToggle.textContent = translations[currentLang].toggleBtn;
    promptInput.placeholder = translations[currentLang].placeholder;
    updateStatus();
    setMorphingState(false); // Reset text translation issue
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
    if (m.length >= MAX_DROPS) return { allowed: false };
    return { allowed: true, remaining: MAX_DROPS - m.length };
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
    if(text) {
        rateLimitStatus.textContent = text;
        rateLimitStatus.className = isError ? 'error m-val' : 'm-val';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `0/5 [SOLID]`;
            rateLimitStatus.className = 'error m-val';
        } else {
            rateLimitStatus.textContent = `${quota.remaining}/${MAX_DROPS}`;
            rateLimitStatus.className = 'm-val';
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
                while(m.length<MAX_DROPS) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 20; 
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
        else onChunk(`[SYS_FAILURE] TRACE: ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!API_KEY) {
        API_KEY = prompt("AUTH_KEY REQ:");
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("CRYSTALLIZED", true);
         heroSection.style.display = 'none';
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ABORTING ASSIMILATION.";
         setMorphingState(false);
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("MORPHING...", false);
    
    heroSection.style.display = 'none';
    
    responseDisplay.classList.remove('hidden');
    responseStatus.textContent = translations[currentLang].connecting;
    responseContent.innerHTML = '';
    
    setMorphingState(true); // Liquid violently boils
    
    setTimeout(async () => {
        responseStatus.textContent = translations[currentLang].generating;
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            mScroller.scrollTop = mScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        setMorphingState(false); // Return to idle sphere

        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        mScroller.scrollTop = mScroller.scrollHeight;
        
    }, 400); 
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
});
