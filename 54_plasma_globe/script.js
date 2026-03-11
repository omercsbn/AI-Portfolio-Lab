const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const vScroller = document.querySelector('.v-scroller');
const langToggle = document.getElementById('langToggle');
const flickerOverlay = document.querySelector('.electric-flicker');

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
mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { primaryColor: '#33aaff', primaryTextColor: '#fff', primaryBorderColor: '#33aaff', lineColor: '#33aaff', secondaryColor: '#aa33ff', tertiaryColor: '#000' } });

const translations = {
    en: {
        placeholder: "ENTER EXPERIMENT PARAMETERS...",
        connecting: "CHARGING CAPACITORS...",
        generating: "CHANNELING PLASMA...",
        rateLimitError: "### [BREAKER TRIPPED]\n\nPower grid overloaded. (5 strikes/min, 20/day). Allow capacitors to discharge or contact lead engineer:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[FAULT]* Arc deviation detected.",
        statusNormal: `RESERVE POWER:`,
        complete: "DISCHARGE COMPLETE.",
        toggleBtn: "EN",
        suffix: "MW"
    },
    tr: {
        placeholder: "DENEY PARAMETRELERİNİ GİRİN...",
        connecting: "KAPASİTÖRLER ŞARJ OLUYOR...",
        generating: "PLAZMA YÖNLENDİRİLİYOR...",
        rateLimitError: "### [SİGORTA ATTI]\n\nElektrik şebekesi aşırı yüklendi. (5 atış/dk, 20/gün). Deşarj olmasını bekleyin veya mühendise ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[HATA]* Ark sapması tespit edildi.",
        statusNormal: `YEDEK GÜÇ:`,
        complete: "DEŞARJ TAMAMLANDI.",
        toggleBtn: "TR",
        suffix: "MW"
    }
};

const SYSTEM_PROMPT = `
You are a High Voltage Engineering AI representing Cloud Architect Ömercan Sabun.
Tone: Scientific, precise, intense, laboratory-like. Use electrical and physics metaphors (capacitors, plasma, surges, arcing, grounding, resistance).
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. High Voltage Architect.
Philosophy: Traffic is raw voltage. A monolithic architecture is a thin wire—it will melt under load. We build distributed systems like redundant power grids, using circuit breakers, load balancers, and isolated nodes to safely route massive surges of plasma. 
Contact: omercansabun@icloud.com
`;

// --- THREE.JS PLASMA GLOBE ---
let scene, camera, renderer;
let arcs = [];
let centralCore, glassSphere;
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('plasma-canvas');
    scene = new THREE.Scene();
    
    // Position camera far right to keep UI on the left clear
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(-5, 0, 15);
    camera.lookAt(5, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Add additive blending for glow
    renderer.setPixelRatio(window.devicePixelRatio);

    // Center of globe is offset to the right
    const globeCenter = new THREE.Vector3(5, 0, 0);
    const globeRadius = 6;

    // Glass Sphere
    const glassGeo = new THREE.SphereGeometry(globeRadius, 32, 32);
    const glassMat = new THREE.MeshPhongMaterial({
        color: 0xaa33ff,
        transparent: true,
        opacity: 0.1,
        shininess: 100,
        specular: 0xffffff,
        side: THREE.BackSide // Render inside
    });
    glassSphere = new THREE.Mesh(glassGeo, glassMat);
    glassSphere.position.copy(globeCenter);
    scene.add(glassSphere);

    // Central Electrode
    const coreGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x33aaff });
    centralCore = new THREE.Mesh(coreGeo, coreMat);
    centralCore.position.copy(globeCenter);
    scene.add(centralCore);

    // Light from the core
    const coreLight = new THREE.PointLight(0x33aaff, 2, 20);
    coreLight.position.copy(globeCenter);
    scene.add(coreLight);

    // Create Plasma Arcs (Lines)
    const arcCount = 15;
    const lineMat = new THREE.LineBasicMaterial({ 
        color: 0xaa33ff, 
        linewidth: 2,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });
    const generatingMat = new THREE.LineBasicMaterial({ // Brighter material for generation
        color: 0x33aaff, 
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1
    });

    for(let i=0; i<arcCount; i++) {
        // We need dynamic line geometries to update them to look like lightning
        const points = [];
        const segments = 10;
        for(let j=0; j<=segments; j++) points.push(new THREE.Vector3());
        
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, lineMat);
        
        // Data to drive the arc animation
        line.userData = {
            targetAngles: { theta: Math.random()*Math.PI*2, phi: Math.random()*Math.PI },
            currentAngles: { theta: Math.random()*Math.PI*2, phi: Math.random()*Math.PI },
            speed: 0.02 + Math.random()*0.05,
            points: points,
            segments: segments
        };
        
        scene.add(line);
        arcs.push(line);
    }

    // Function to calculate a point on the sphere surface given angles
    function getSurfacePoint(theta, phi, radius, center) {
        return new THREE.Vector3(
            center.x + radius * Math.sin(phi) * Math.cos(theta),
            center.y + radius * Math.sin(phi) * Math.sin(theta),
            center.z + radius * Math.cos(phi)
        );
    }

    function animate() {
        requestAnimationFrame(animate);

        const time = performance.now() * 0.001;

        arcs.forEach((arc, i) => {
            let data = arc.userData;
            
            // Move target angles randomly, faster if generating
            let moveSpeed = (aiState === 'GENERATING') ? data.speed * 5 : data.speed;
            
            data.targetAngles.theta += (Math.random() - 0.5) * moveSpeed;
            data.targetAngles.phi += (Math.random() - 0.5) * moveSpeed;
            
            // Constrain Phi so it doesn't flip weirdly at poles
            if(data.targetAngles.phi < 0.1) data.targetAngles.phi = 0.1;
            if(data.targetAngles.phi > Math.PI-0.1) data.targetAngles.phi = Math.PI-0.1;

            // Interpolate current towards target
            data.currentAngles.theta += (data.targetAngles.theta - data.currentAngles.theta) * 0.1;
            data.currentAngles.phi += (data.targetAngles.phi - data.currentAngles.phi) * 0.1;

            const startPoint = globeCenter;
            const endPoint = getSurfacePoint(data.currentAngles.theta, data.currentAngles.phi, globeRadius, globeCenter);

            // Update line geometry points to create a jagged path
            let jitterMag = (aiState === 'GENERATING') ? 0.8 : 0.2;
            
            for(let j=0; j<=data.segments; j++) {
                let t = j / data.segments;
                // Linear interpolation base
                let px = startPoint.x + (endPoint.x - startPoint.x) * t;
                let py = startPoint.y + (endPoint.y - startPoint.y) * t;
                let pz = startPoint.z + (endPoint.z - startPoint.z) * t;
                
                // Add jitter, except at start (core) and end (glass)
                if(j > 0 && j < data.segments) {
                    px += (Math.random() - 0.5) * jitterMag;
                    py += (Math.random() - 0.5) * jitterMag;
                    pz += (Math.random() - 0.5) * jitterMag;
                }
                
                data.points[j].set(px, py, pz);
            }
            arc.geometry.setFromPoints(data.points);
            
            // Change material on state
            if(aiState === 'CONNECTING') arc.material.opacity = 0.2;
            else if(aiState === 'GENERATING') {
                arc.material = generatingMat;
                arc.material.opacity = 0.5 + Math.random()*0.5;
            }
            else {
                arc.material = lineMat;
                // Sporadic hiding for realism
                arc.material.opacity = (Math.random() > 0.05) ? 0.8 : 0; 
            }
        });

        // Core pulsing
        if(aiState === 'GENERATING') {
            coreLight.intensity = 5 + Math.random()*5;
            coreLight.color.setHex(0xffffff);
            centralCore.scale.setLength(1.0 + Math.random()*0.2);
        } else {
            coreLight.intensity = 2 + Math.sin(time*2)*0.5;
            coreLight.color.setHex(0x33aaff);
            centralCore.scale.setLength(1.0);
        }

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
    flickerOverlay.classList.add('active');
    setTimeout(()=> flickerOverlay.classList.remove('active'), 200);
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
    const stat = document.querySelector('.v-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'v-telemetry error' : 'v-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `POWER GRID OFFLINE.`;
            stat.className = 'v-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/5 ${translations[currentLang].suffix}`;
            stat.className = 'v-telemetry';
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
            let chunkLength = 30; // Fast data burst
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
         updateStatus("CRITICAL OVERLOAD", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ARC FAULT";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         flickerOverlay.classList.add('active'); // Leave flicker on for error
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("CHARGING...");
    
    aiState = 'CONNECTING';
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        flickerOverlay.classList.add('active'); // Intense screen flicker during generation
        
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
        flickerOverlay.classList.remove('active');
        
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
