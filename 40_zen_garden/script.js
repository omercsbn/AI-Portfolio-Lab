const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const zScroller = document.querySelector('.z-scroller');
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
mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

const translations = {
    en: {
        placeholder: "Seek guidance...",
        connecting: "Raking the sand...",
        generating: "Observing the flow...",
        rateLimitError: "### [REST]\n\nThe mind is full. (5 inquiries/min, 20/day). Please wait, or send word to:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[VOID]* Clarity eludes us.",
        statusNormal: `Harmony:`,
        complete: "Stillness achieved.",
        toggleBtn: "EN",
        suffix: "Meditations remain"
    },
    tr: {
        placeholder: "Rehberlik iste...",
        connecting: "Kumlar tırmıklanıyor...",
        generating: "Akış gözlemleniyor...",
        rateLimitError: "### [DİNLENME]\n\nZihin dolu. (5 sorgu/dk, 20/gün). Lütfen bekleyin veya iletişime geçin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[BOŞLUK]* Netlik bize uzak.",
        statusNormal: `Uyum:`,
        complete: "Sükunete ulaşıldı.",
        toggleBtn: "TR",
        suffix: "Meditasyon kaldı"
    }
};

const SYSTEM_PROMPT = `
You are a Zen master of software architecture, representing Ömercan Sabun.
Tone: Calm, wise, poetic minimalist. Use metaphors of water, nature, gardens, and stillness to explain complex distributed systems.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Master Ömercan Sabun. Cloud-Native Architect @ Architecht.
Philosophy: True scale is achieved without friction. Event-Driven architectures flow like rivers, bypassing rocks (failures) without halting.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS TOP-DOWN ZEN GARDEN ---
let scene, camera, renderer, sandPlane;
let stones = [];
let ripples = [];
let aiState = 'IDLE'; 
let time = 0;

function initThreeJS() {
    const canvas = document.getElementById('zen-canvas');
    scene = new THREE.Scene();
    
    // Top-down orthographic camera
    const aspect = window.innerWidth / window.innerHeight;
    const d = 15;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100);
    camera.position.set(0, 20, 0); // Looking straight down from Y=20
    camera.lookAt(0,0,0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Soft warm lighting
    const ambientLight = new THREE.AmbientLight(0xf5f2eb, 0.6); // Match sand color
    scene.add(ambientLight);
    
    // Simulating late afternoon sun for long shadows across the sand
    const dirLight = new THREE.DirectionalLight(0xfff0e0, 1.2);
    // Light from the side to emphasize bumps
    dirLight.position.set(20, 10, 10); 
    scene.add(dirLight);

    // Create the sand (A plane with a custom shader for ripples, or displacement map)
    // We'll use a very dense plane and modify vertices in animate() for a continuous flow effect
    const geo = new THREE.PlaneGeometry(50, 50, 100, 100);
    geo.rotateX(-Math.PI / 2);
    
    // Warm grey/sand material, slightly rough
    const mat = new THREE.MeshStandardMaterial({ 
        color: 0xeae6da, 
        roughness: 0.9, 
        metalness: 0.1,
        flatShading: true // Gives a slightly "raked" look if manipulated right
    });

    sandPlane = new THREE.Mesh(geo, mat);
    scene.add(sandPlane);

    // Create a few smooth Zen stones
    const stoneGeo1 = new THREE.DodecahedronGeometry(1.5, 2); // Smoothed
    const stoneGeo2 = new THREE.DodecahedronGeometry(2, 2);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4e4d, roughness: 0.7, metalness: 0.2 });
    
    const stone1 = new THREE.Mesh(stoneGeo1, stoneMat);
    stone1.position.set(5, 0.5, 4);
    // Flatten a bit
    stone1.scale.set(1, 0.5, 1.2);
    scene.add(stone1);
    stones.push(stone1);

    const stone2 = new THREE.Mesh(stoneGeo2, stoneMat);
    stone2.position.set(-6, 0.8, -3);
    stone2.scale.set(1.2, 0.6, 0.9);
    scene.add(stone2);
    stones.push(stone2);

    // Add ripple centers where stones are, plus one in the center
    ripples.push({x: 5, z: 4}, {x: -6, z: -3}, {x: 0, z: 0});

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        // Map mouse screen pos to world coords approximately for the ripples
        mouseX = (e.clientX / window.innerWidth - 0.5) * (d * aspect * 2);
        mouseY = -(e.clientY / window.innerHeight - 0.5) * (d * 2);
    });

    function animate() {
        requestAnimationFrame(animate);
        time += 0.02;

        const positions = sandPlane.geometry.attributes.position.array;
        
        let speedMult = aiState === 'GENERATING' ? 3 : 1;
        let pTime = time * speedMult;

        // Manipulate sand vertices to look like rippling water / raked sand
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            
            let height = 0;

            // Calculate "ripple" effect radiating from stones
            ripples.forEach((r, index) => {
                const dist = Math.sqrt(Math.pow(x - r.x, 2) + Math.pow(z - r.z, 2));
                
                // Base static wave pattern (raked sand) + gentle moving wave 
                height += Math.sin(dist * 2 - (index === 2 ? pTime : 0)) * 0.1; 
            });
            
            // Add a little noise
            height += Math.sin(x*10)*0.02 + Math.cos(z*10)*0.02;

            positions[i + 1] = height;
        }
        
        sandPlane.geometry.attributes.position.needsUpdate = true;
        
        // If connecting, maybe rotate the whole garden very slowly
        if(aiState === 'CONNECTING') {
            camera.rotation.z += 0.001;
        }

        // Subtly move the main center ripple to track the mouse
        ripples[2].x += (mouseX - ripples[2].x) * 0.02;
        ripples[2].z += (mouseY - ripples[2].z) * 0.02;

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const aspect = window.innerWidth / window.innerHeight;
        camera.left = -d * aspect;
        camera.right = d * aspect;
        camera.top = d;
        camera.bottom = -d;
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
    const stat = document.querySelector('.z-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'z-telemetry error' : 'z-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `Silence. Form is void.`;
            stat.className = 'z-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining} / ${MAX_REQUESTS_PER_DAY} ${translations[currentLang].suffix}`;
            stat.className = 'z-telemetry';
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
            let chunkLength = 15;
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 20)); // Slow, thoughtful pace
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
         updateStatus("PATH BLOCKED", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "PEACE";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("SEEKING...");
    
    aiState = 'CONNECTING';
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 800)); // Taking a breath

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            zScroller.scrollTop = zScroller.scrollHeight;
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
        zScroller.scrollTop = zScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
