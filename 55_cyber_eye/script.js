const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const oScroller = document.querySelector('.o-scroller');
const langToggle = document.getElementById('langToggle');
const focalStatus = document.getElementById('focalStatus');

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
        placeholder: "ENTER SEARCH VECTOR...",
        connecting: "ADJUSTING FOCAL LENGTH...",
        generating: "ANALYZING TARGET DATA...",
        rateLimitError: "### [LENS OVERHEATED]\n\nSensor requires cooling cooling. (5 scans/min, 20/day). Retract lens or ping command:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[BLIND SPOT]* Data unreadable.",
        statusNormal: `BATTERY_LEVEL:`,
        complete: "SCAN COMPLETE.",
        toggleBtn: "SYS.EN",
        suffix: "SCANS"
    },
    tr: {
        placeholder: "ARAMA VEKTÖRÜ GİRİN...",
        connecting: "ODAK UZUNLUĞU AYARLANIYOR...",
        generating: "HEDEF VERİSİ İNCELENİYOR...",
        rateLimitError: "### [LENS AŞIRI ISINDI]\n\nSensörün soğutulması gerekiyor. (5 tarama/dk, 20/gün). Lensi geri çekin veya komutaya ping atın:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[KÖR NOKTA]* Veri okunamıyor.",
        statusNormal: `BATARYA_SEVİYESİ:`,
        complete: "TARAMA TAMAMLANDI.",
        toggleBtn: "SYS.TR",
        suffix: "TARAMA"
    }
};

const SYSTEM_PROMPT = `
You are the primary Optical AI (The Overseer) representing Cloud Architect Ömercan Sabun.
Tone: Unblinking, observant, precise, analytical. Use camera and optics metaphors (focus, dilate, aperture, lens, field of view, resolving anomalies).
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. Observability Architect.
Philosophy: You cannot fix what you cannot see. Distributed systems require a panoptic view—tracing, logging, and metrics that act as a cybernetic iris, instantly focusing on anomalies at the microservice level before they cascade.
Contact: hello@omercan.dev
`;

// --- THREE.JS CYBERNETIC IRIS ---
let scene, camera, renderer;
let irisBlades = [];
let lensGroup;
let targetAperture = 1.0; // 1.0 open, 0.2 closed
let currentAperture = 1.0;
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('iris-canvas');
    scene = new THREE.Scene();
    
    // Front-facing camera
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 15);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    // Use the CSS size 
    renderer.setSize(600, 600);
    
    // Lights for metallic surfaces
    scene.add(new THREE.AmbientLight(0x222233));
    
    const spotLight = new THREE.SpotLight(0xffffff, 2);
    spotLight.position.set(10, 10, 20);
    spotLight.angle = Math.PI/6;
    spotLight.penumbra = 0.5;
    scene.add(spotLight);

    const redGlow = new THREE.PointLight(0xff3333, 1, 15);
    redGlow.position.set(0, 0, -2);
    scene.add(redGlow);

    lensGroup = new THREE.Group();
    scene.add(lensGroup);

    // Mechanical materials
    const metalMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a5568, metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
        color: 0x111115, metalness: 0.9, roughness: 0.2
    });

    // Outer lens casing
    const casingGeo = new THREE.TorusGeometry(4.5, 0.5, 16, 64);
    const casing = new THREE.Mesh(casingGeo, darkMetalMat);
    lensGroup.add(casing);
    
    const innerRingGeo = new THREE.TorusGeometry(3.5, 0.1, 8, 64);
    const innerRing = new THREE.Mesh(innerRingGeo, metalMat);
    lensGroup.add(innerRing);

    // Iris Blades (Overlapping plates)
    const bladeCount = 8;
    // A single blade shape
    const shape = new THREE.Shape();
    shape.moveTo(0, 2);
    shape.lineTo(2, 4);
    shape.lineTo(4, -1);
    shape.lineTo(0.5, -0.5); // inner edge
    shape.lineTo(0, 2);
    
    const extrudeSettings = { depth: 0.05, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const bladeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center geometry to pivot correctly
    bladeGeo.translate(-2, -1.5, 0);

    for(let i=0; i<bladeCount; i++) {
        const blade = new THREE.Mesh(bladeGeo, metalMat);
        
        // Pivot group to rotate blade around ring
        const pivot = new THREE.Group();
        pivot.rotation.z = (i / bladeCount) * Math.PI * 2;
        
        // Move blade out from center
        blade.position.y = 3.5;
        // Stagger Z slightly so they overlap like a real iris
        blade.position.z = i * 0.02;
        
        pivot.add(blade);
        lensGroup.add(pivot);
        
        irisBlades.push({
            mesh: blade,
            baseRot: Math.PI / 4, // Closed rotation
            openRot: -Math.PI / 6  // Open rotation
        });
    }

    // Deep glass lens inside
    const glassGeo = new THREE.SphereGeometry(3.5, 32, 32, 0, Math.PI*2, 0, Math.PI/4);
    const glassMat = new THREE.MeshPhongMaterial({
        color: 0x112233, transparent: true, opacity: 0.4, shininess: 100, specular: 0xffffff
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.z = -1;
    lensGroup.add(glass);

    function animate() {
        requestAnimationFrame(animate);

        // State logic -> Aperture target
        if (aiState === 'IDLE') {
            targetAperture = 0.8 + Math.sin(Date.now()*0.001)*0.1; // Slow breathing
            focalStatus.textContent = "FOCAL_LOCK: STANDBY";
            focalStatus.style.color = '#8899aa';
        } else if (aiState === 'CONNECTING') {
            targetAperture = 0.1; // Dilate extremely closed to focus
            lensGroup.rotation.z += 0.05; // Spin lens focusing
            focalStatus.textContent = "FOCAL_LOCK: SEARCHING";
            focalStatus.style.color = '#ff3333';
        } else if (aiState === 'GENERATING') {
            targetAperture = 0.5 + Math.random()*0.3; // Fluttering aperture
            lensGroup.rotation.z += 0.01;
            focalStatus.textContent = "FOCAL_LOCK: ACQUIRED";
            focalStatus.style.color = '#fff';
            redGlow.intensity = 2 + Math.random();
        }

        // Animate Iris blades
        currentAperture += (targetAperture - currentAperture) * 0.1; // ease
        
        irisBlades.forEach(bladeData => {
            // Interpolate between open and closed based on currentAperture (0 to 1)
            let rot = bladeData.baseRot * (1 - currentAperture) + bladeData.openRot * currentAperture;
            bladeData.mesh.rotation.z = rot;
        });

        // Slight mouse tracking effect
        // If we had mouse events, we'd inject them here. For now, just slight drift
        lensGroup.rotation.x = Math.sin(Date.now()*0.0005) * 0.1;
        lensGroup.rotation.y = Math.cos(Date.now()*0.0006) * 0.1;

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        // Keep it square/circular in the center container
        const size = Math.min(window.innerWidth, window.innerHeight, 600);
        renderer.setSize(size, size);
    });
    // Fire once to set initial size
    window.dispatchEvent(new Event('resize'));
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
    const stat = document.getElementById('rateLimitStatus');
    if(text) {
        stat.textContent = text;
        stat.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            stat.textContent = `BATTERY DEPLETED.`;
            stat.className = 'error';
        } else {
            stat.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/5 ${translations[currentLang].suffix}`;
            stat.className = '';
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
        else onChunk(`*[SYS_ERR]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("SENSOR MALFUNCTION", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "CRITICAL ERROR";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("ENGAGING...", false);
    
    aiState = 'CONNECTING'; // Iris closes to focus
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 800)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING'; // Iris dilates and flutters
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            oScroller.scrollTop = oScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE'; // Returns to slow breathing
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        oScroller.scrollTop = oScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
