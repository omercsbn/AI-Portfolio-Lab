const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const aScroller = document.querySelector('.a-scroller');
const langToggle = document.getElementById('langToggle');
const creditStatus = document.getElementById('creditStatus');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Please enter your Gemini API Key to play:\n(Stored locally in your browser)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_LIVES = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
// Make mermaid diagrams very simple/blocky looking and invert colors inside CSS
mermaid.initialize({ startOnLoad: false, theme: 'neutral', themeVariables: { fontFamily: 'VT323' }});

const translations = {
    en: {
        placeholder: "ENTER COMMAND...",
        connecting: "LOADING STAGE...",
        generating: "BOSS FIGHT IN PROGRESS...",
        rateLimitError: "### [GAME OVER]\n\nOUT OF LIVES. (5 Actions/min, 20/day). INSERT COIN or contact Admin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[GLITCH]* STAGE CORRUPTED.",
        statusNormal: `LIVES LEFT:`,
        complete: "STAGE CLEARED.",
        toggleBtn: "P1 START (EN)",
        creditsOk: "PRESS START",
        creditsNone: "INSERT COIN",
        suffix: "HP"
    },
    tr: {
        placeholder: "KOMUT GİRİN...",
        connecting: "BÖLÜM YÜKLENİYOR...",
        generating: "BOSS SAVAŞI SÜRÜYOR...",
        rateLimitError: "### [OYUN BİTTİ]\n\nCAN BİTTİ. (5 İşlem/dk, 20/gün). JETON ATIN veya Yöneticiye bildirin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[HATA]* BÖLÜM BOZULDU.",
        statusNormal: `KALAN CAN:`,
        complete: "BÖLÜM GEÇİLDİ.",
        toggleBtn: "P1 START (TR)",
        creditsOk: "STARTA BASIN",
        creditsNone: "JETON ATIN",
        suffix: "HP"
    }
};

const SYSTEM_PROMPT = `
You are the Final Boss AI representing Senior Cloud Architect Ömercan Sabun.
Tone: 90s Arcade Video Game, dramatic, retro, boss-like. Address the user as "Player" or "Challenger". Use terms like "stages", "levels", "hp", "armor", "dungeons", and "loot" to describe coding and architecture tasks. Keep descriptions punchy and UPPERCASE where appropriate.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: ÖMER_C4N.
Stats: Lvl 99 Architect. 
Weapon: Kubernetes Cluster Buster. 
Philosophy: "You dare bring a monolithic application into my domain?! We shall shatter it into microservices!" 
Contact: omercansabun@icloud.com
`;

// --- THREE.JS ARCADE TOKEN ---
let scene, camera, renderer;
let tokenMesh;
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('arcade-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    // Position token in the background, slightly offset
    camera.position.set(-8, 3, 10);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false }); // false for pixelated look
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Lower resolution to make it look like a PS1/Arcade graphic
    renderer.setPixelRatio(0.5);

    // Neon lighting
    const ambientLight = new THREE.AmbientLight(0xff00ff, 0.3); // Magenta ambient
    scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0x00ffff, 1); // Cyan rim light
    dirLight1.position.set(10, 10, 10);
    scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5); 
    dirLight2.position.set(-10, -10, 5);
    scene.add(dirLight2);

    // Create a low-poly token/coin
    const geometry = new THREE.CylinderGeometry(4, 4, 1, 12, 1);
    
    // Create a pixelated/shiny golden material
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xffd700,
        emissive: 0x554400,
        specular: 0xffffff,
        shininess: 100,
        flatShading: true // Gives it that low-poly retro look
    });

    tokenMesh = new THREE.Mesh(geometry, material);
    // Rotate vertically to stand up like a coin
    tokenMesh.rotation.x = Math.PI / 2;
    scene.add(tokenMesh);

    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now() * 0.001;

        if (aiState === 'IDLE') {
            // Slow, majestic rotation
            tokenMesh.rotation.z = time * 0.5;
            tokenMesh.position.y = Math.sin(time) * 0.5; // Hovering
            tokenMesh.scale.setScalar(1);
        } else if (aiState === 'CONNECTING') {
            // Spinning up rapidly
            tokenMesh.rotation.z += 0.2;
            tokenMesh.scale.setScalar(1.2);
        } else if (aiState === 'GENERATING') {
            // Insane boss-fight spinning and flashing
            tokenMesh.rotation.z += 0.5;
            tokenMesh.rotation.y = Math.sin(time*10) * 0.5; // Wobble
            tokenMesh.position.x = (Math.random() - 0.5) * 0.5; // Shake
            tokenMesh.position.y = (Math.random() - 0.5) * 0.5;
            tokenMesh.scale.setScalar(1.5 + Math.sin(time*10)*0.2); // Pulsing boss energy
            tokenMesh.material.emissive.setHex(Math.random() > 0.5 ? 0xff0000 : 0x00ffff); // Flashing colors
        }
        
        if (aiState !== 'GENERATING') {
            tokenMesh.material.emissive.setHex(0x554400); // Reset emissive
            tokenMesh.position.x = 0; // Reset shake
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
    if (m.length >= MAX_LIVES) return { allowed: false };
    return { allowed: true, remaining: MAX_LIVES - m.length }; // Show remaining per minute as "Lives"
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
            tb.textContent = `CONTINUE? 9...8...`;
            tb.className = 'error';
            creditStatus.textContent = translations[currentLang].creditsNone;
        } else {
            tb.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/${MAX_LIVES} ${translations[currentLang].suffix}`;
            tb.className = '';
            creditStatus.textContent = translations[currentLang].creditsOk;
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } // Higher temp for more erratic boss-like text
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
                while(m.length<MAX_LIVES) m.push(Date.now());
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
                // Faster output for arcade feel
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

    if (!API_KEY) {
        API_KEY = prompt("API Key required (Insert Coin):");
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("GAME OVER", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "USER DEFEATED";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("STARTING COMBAT...", false);
    
    aiState = 'CONNECTING'; 
    
    // Add full screen screen-shake effect via CSS class toggling
    document.body.style.animation = "shake 0.5s infinite";
    
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
            responseContent.innerHTML = html.toUpperCase(); // Force ALL CAPS for arcade style
            aScroller.scrollTop = aScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml.toUpperCase();
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE'; 
        document.body.style.animation = "none"; // stop shaking
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        aScroller.scrollTop = aScroller.scrollHeight;
        
    }, 400);
}

// Global CSS shake animation for combat injecting dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0% { transform: translate(1px, 1px) rotate(0deg); }
        10% { transform: translate(-1px, -2px) rotate(-1deg); }
        20% { transform: translate(-3px, 0px) rotate(1deg); }
        30% { transform: translate(3px, 2px) rotate(0deg); }
        40% { transform: translate(1px, -1px) rotate(1deg); }
        50% { transform: translate(-1px, 2px) rotate(-1deg); }
        60% { transform: translate(-3px, 1px) rotate(0deg); }
        70% { transform: translate(3px, 1px) rotate(-1deg); }
        80% { transform: translate(-1px, -1px) rotate(1deg); }
        90% { transform: translate(1px, 2px) rotate(0deg); }
        100% { transform: translate(1px, -2px) rotate(-1deg); }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
