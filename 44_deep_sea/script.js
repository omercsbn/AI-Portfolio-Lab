const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const dsScroller = document.querySelector('.ds-scroller');
const langToggle = document.getElementById('langToggle');
const bubbleIcon = document.querySelector('.bubble-icon');
const sonarPing = document.querySelector('.sonar-ping');

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
        placeholder: "Send a signal into the dark...",
        connecting: "Ping transmitted...",
        generating: "Echo returning...",
        rateLimitError: "### [OXYGEN DEPLETED]\n\nPressure limits reached. (5 dives/min, 20/day). Resurface to breathe, or send an SOS:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[CRUSH]* The signal collapsed under pressure.",
        statusNormal: `Oxygen levels:`,
        complete: "Transmission complete.",
        toggleBtn: "EN",
        suffix: "Dives remaining"
    },
    tr: {
        placeholder: "Karanlığa sinyal gönder...",
        connecting: "Sinyal iletildi...",
        generating: "Yankı dönüyor...",
        rateLimitError: "### [OKSİJEN BİTTİ]\n\nBasınç sınırına ulaşıldı. (5 dalış/dk, 20/gün). Yüzeye çıkıp nefes alın veya SOS gönderin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[BASINÇ]* Sinyal basınç altında çöktü.",
        statusNormal: `Oksijen seviyesi:`,
        complete: "İletim tamamlandı.",
        toggleBtn: "TR",
        suffix: "Dalış kaldı"
    }
};

const SYSTEM_PROMPT = `
You are the Deep Sea Architect representing Ömercan Sabun.
Tone: Calm, mysterious, deep, flowing. Use metaphors related to the ocean, immense pressure, bioluminescence, sonar, and navigating the abyss to explain software architecture.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. Cloud-Native Architect @ Architecht.
Philosophy: Data lakes are deep and dark. Only resilient, event-driven bioluminescent entities (microservices) can survive the pressure and bring scalable light to the system.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS DEEP SEA JELLYFISH/PARTICLES ---
let scene, camera, renderer;
let jellies = [];
let particles;
let aiState = 'IDLE'; 
let time = 0;

function createJellyfish() {
    const jellyGroup = new THREE.Group();
    
    // The "bell" (top part)
    const bellGeo = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    // Glowing cyan/green material
    const bellMat = new THREE.MeshBasicMaterial({ 
        color: 0x00f0ff, transparent: true, opacity: 0.4,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    const bell = new THREE.Mesh(bellGeo, bellMat);
    jellyGroup.add(bell);
    
    // The "tentacles"
    const tentacleMat = new THREE.LineBasicMaterial({
        color: 0x00ffa3, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
    });
    
    jellyGroup.userData = { tentacles: [] };
    
    for(let i=0; i<8; i++) {
        const tPoints = [];
        for(let j=0; j<5; j++) tPoints.push(new THREE.Vector3(0, -j*0.5, 0));
        const tGeo = new THREE.BufferGeometry().setFromPoints(tPoints);
        const tentacle = new THREE.Line(tGeo, tentacleMat);
        
        // Distribute in a circle around the base
        const angle = (i/8) * Math.PI * 2;
        tentacle.position.set(Math.cos(angle)*0.5, 0, Math.sin(angle)*0.5);
        
        jellyGroup.add(tentacle);
        jellyGroup.userData.tentacles.push({line: tentacle, offset: Math.random() * Math.PI * 2});
    }

    // Add point light inside
    const light = new THREE.PointLight(0x00f0ff, 1, 10);
    jellyGroup.add(light);
    jellyGroup.userData.light = light;

    return jellyGroup;
}

function initThreeJS() {
    const canvas = document.getElementById('abyss-canvas');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x010a15, 0.05); // Thick dark water
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 15);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Create a few jellyfish
    for(let i=0; i<5; i++) {
        const jelly = createJellyfish();
        jelly.position.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 10 - 5
        );
        jelly.userData.basePos = jelly.position.clone();
        jelly.userData.speed = 0.01 + Math.random() * 0.02;
        jelly.userData.phase = Math.random() * Math.PI * 2;
        scene.add(jelly);
        jellies.push(jelly);
    }

    // Ambient particles ("marine snow")
    const particleGeo = new THREE.BufferGeometry();
    const pCount = 500;
    const pPos = new Float32Array(pCount * 3);
    for(let i=0; i<pCount*3; i++) pPos[i] = (Math.random() - 0.5) * 40;
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particleMat = new THREE.PointsMaterial({
        color: 0x00f0ff, size: 0.1, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending
    });
    particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    function animate() {
        requestAnimationFrame(animate);
        time += 0.02;

        // Animate marine snow (floating up)
        const pPositions = particles.geometry.attributes.position.array;
        let flowSpeed = aiState === 'GENERATING' ? 0.1 : 0.02;

        for(let i=1; i<pCount*3; i+=3) {
            pPositions[i] += flowSpeed;
            if(pPositions[i] > 20) pPositions[i] = -20;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        
        // Rotate particles slowly if connecting
        if(aiState === 'CONNECTING') particles.rotation.y -= 0.01;

        // Animate Jellyfish
        jellies.forEach(jelly => {
            // Bobbing motion based on "bell" pumping
            const pump = Math.sin(time * 2 + jelly.userData.phase);
            
            // Move upwards slowly
            jelly.position.y += jelly.userData.speed;
            if (jelly.position.y > 15) jelly.position.y = -15;

            // Expand/Contract bell scale slightly
            const scale = 1 + pump * 0.1;
            jelly.children[0].scale.set(scale, scale * 1.2, scale); // Bell 

            // Dim/Brighten light based on pump AND AI state
            let targetIntensity = (pump + 1) * 0.5; // 0 to 1
            if(aiState === 'GENERATING') targetIntensity *= 3; // Glow much brighter
            jelly.userData.light.intensity += (targetIntensity - jelly.userData.light.intensity) * 0.1;

            // Animate tentacles waving
            jelly.userData.tentacles.forEach(t => {
                const wave = Math.sin(time * 3 + t.offset);
                const pos = t.line.geometry.attributes.position.array;
                // Modify X/Z of lower segments
                for(let i=3; i<pos.length; i+=3) { // skip top point
                    // Further down = more wave
                    let waveAmt = (i/3) * 0.1;
                    pos[i] = wave * waveAmt; // X
                    pos[i+2] = Math.cos(time * 2 + t.offset) * waveAmt; // Z
                }
                t.line.geometry.attributes.position.needsUpdate = true;
            });
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
    updateStatus();
    triggerSonar();
}
langToggle.addEventListener('click', toggleLanguage);

function triggerSonar() {
    sonarPing.style.animation = 'none';
    setTimeout(() => { sonarPing.style.animation = 'ping 2s cubic-bezier(0, 0, 0.2, 1) 1'; }, 10);
}

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
    const stat = document.querySelector('.ds-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'ds-telemetry error' : 'ds-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `DECOMPRESSION REQUIRED.`;
            stat.className = 'ds-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining} / ${MAX_REQUESTS_PER_DAY} ${translations[currentLang].suffix}`;
            stat.className = 'ds-telemetry';
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
            let chunkLength = 15;
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 20)); // Slow, deep transmission
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
         updateStatus("OXYGEN DEPLETED", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ABORT";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("TRANSMITTING PING...");
    triggerSonar();
    
    aiState = 'CONNECTING';
    bubbleIcon.classList.add('rising');
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 800)); // Travel time down to the abyss

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        triggerSonar(); // Ping again on receipt
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            dsScroller.scrollTop = dsScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        bubbleIcon.classList.remove('rising');
        triggerSonar();
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        dsScroller.scrollTop = dsScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
    // Continuous slow pulse
    setInterval(triggerSonar, 10000); 
});
