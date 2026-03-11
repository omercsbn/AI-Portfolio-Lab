const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const eScroller = document.querySelector('.e-scroller');
const langToggle = document.getElementById('langToggle');
const haloRing = document.querySelector('.halo-ring');

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
mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

const translations = {
    en: {
        placeholder: "Whisper into the cloud...",
        connecting: "Gathering thoughts...",
        generating: "Condensing ideas...",
        rateLimitError: "### [ATMOSPHERE THIN]\n\nAltitude limit reached. (5 breaths/min, 20/day). Descend to rest, or send a flare to:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[FADE]* The thought dissipated.",
        statusNormal: `Atmosphere:`,
        complete: "Transmission settled.",
        toggleBtn: "EN",
        suffix: "breaths remaining"
    },
    tr: {
        placeholder: "Bulutlara fısılda...",
        connecting: "Düşünceler toplanıyor...",
        generating: "Fikirler yoğunlaşıyor...",
        rateLimitError: "### [HAVA SEYRELDİ]\n\nİrtifa sınırına ulaşıldı. (5 nefes/dk, 20/gün). Dinlenmek için alçalın veya işaret fişeği gönderin:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[KAYIP]* Düşünce dağıldı.",
        statusNormal: `Atmosfer:`,
        complete: "İletim tamamlandı.",
        toggleBtn: "TR",
        suffix: "nefes kaldı"
    }
};

const SYSTEM_PROMPT = `
You are an Ethereal Cloud-Native Architect representing Ömercan Sabun.
Tone: Soft, enlightened, transcendent, calm. Use metaphors of the sky, clouds, floating, weightlessness, ascension, and boundless horizons to explain serverless and cloud architecture.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. 
Philosophy: Hardware is heavy and binds you to the earth. Cloud-native architecture is light. It scales like vapor, spreading across availability zones with effortless grace.
Contact: hello@omercan.dev
`;

// --- THREE.JS VOLUMETRIC CLOUDS ---
let scene, camera, renderer;
let cloudParticles = [];
let aiState = 'IDLE'; 
let flashLight;

function initThreeJS() {
    const canvas = document.getElementById('cloud-canvas');
    scene = new THREE.Scene();
    
    // Add fog to blend clouds into background
    scene.fog = new THREE.FogExp2(0xa1c4fd, 0.002);
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 0, 1);
    camera.rotation.set(1.16, -0.12, 0.27);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Dynamic Lighting
    let ambient = new THREE.AmbientLight(0x555555);
    scene.add(ambient);
    
    let directionalLight = new THREE.DirectionalLight(0xffeedd, 1);
    directionalLight.position.set(0, 0, 1);
    scene.add(directionalLight);

    // Pinkish/Blue light for that sunset/sunrise ethereal glow
    let pinkLight = new THREE.PointLight(0xff9a9e, 50, 450 , 1.7);
    pinkLight.position.set(200, 300, 100);
    scene.add(pinkLight);
    
    let blueLight = new THREE.PointLight(0xa1c4fd, 50, 450 , 1.7);
    blueLight.position.set(-200, -300, -100);
    scene.add(blueLight);

    // Flash light simulating AI processing (like lightning but soft)
    flashLight = new THREE.PointLight(0xffffff, 0, 300, 1.7);
    flashLight.position.set(0, 0, 50);
    scene.add(flashLight);

    // Load cloud texture
    // Create a procedural cloud canvas texture if you don't use external images
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 128; cloudCanvas.height = 128;
    const ctx = cloudCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(64,64,0, 64,64,64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,128,128);
    const texture = new THREE.CanvasTexture(cloudCanvas);

    const cloudMaterial = new THREE.MeshLambertMaterial({
        map: texture,
        transparent: true,
        opacity: 0.5,
        depthWrite: false, // Prevents weird z-sorting transparency issues
        blending: THREE.AdditiveBlending // Makes overlapping clouds glow
    });

    // Create cloud particles
    const cloudGeo = new THREE.PlaneGeometry(500, 500);
    for(let p=0; p<40; p++) {
        const cloud = new THREE.Mesh(cloudGeo, cloudMaterial);
        cloud.position.set(
            Math.random()*800 -400,
            500,
            Math.random()*500 - 450
        );
        cloud.rotation.x = 1.16;
        cloud.rotation.y = -0.12;
        cloud.rotation.z = Math.random()*360;
        cloud.material.opacity = 0.4;
        
        // Random drift speed
        cloud.userData = { speed: Math.random() * 0.002 + 0.001 };
        
        scene.add(cloud);
        cloudParticles.push(cloud);
    }

    function animate() {
        requestAnimationFrame(animate);

        // Slowly drift clouds
        cloudParticles.forEach(p => {
            p.rotation.z -= p.userData.speed;
        });

        // AI Generation Effect - Soft pulses of light inside the clouds
        if (aiState === 'GENERATING') {
            if(Math.random() > 0.90) {
                flashLight.power = 50 + Math.random() * 100;
                flashLight.position.set(
                    Math.random() * 400 - 200,
                    300 + Math.random() * 200,
                    100
                );
            } else {
                // Fade out softly
                flashLight.power -= flashLight.power * 0.1;
            }
        } else if (aiState === 'CONNECTING') {
            // Steady build up
            flashLight.power = 20 + Math.sin(Date.now()*0.005) * 20;
            flashLight.position.set(0, 300, 100);
        } else {
            flashLight.power -= flashLight.power * 0.1;
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
    const stat = document.querySelector('.e-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'e-telemetry error' : 'e-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `ATMOSPHERE TOO THIN.`;
            stat.className = 'e-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining} / ${MAX_REQUESTS_PER_DAY} ${translations[currentLang].suffix}`;
            stat.className = 'e-telemetry';
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
                await new Promise(r => setTimeout(r, 15)); 
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
         updateStatus("ALTITUDE HIGH", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "LOSS OF SIGNAL";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("ASCENDING...");
    
    aiState = 'CONNECTING';
    haloRing.classList.add('spinning');
    
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
            eScroller.scrollTop = eScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        haloRing.classList.remove('spinning');
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        eScroller.scrollTop = eScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
