// --- UI Elements ---
const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const scoreVal = document.getElementById('scoreVal');
const scrollContainer = document.querySelector('.screen-container');
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

let score = 0;
function addScore(points) {
    score += points;
    scoreVal.textContent = score.toString().padStart(4, '0');
}

const translations = {
    en: {
        placeholder: "ENTER COMMAND...",
        connecting: "LOADING_TAPE...",
        generating: "PROCESSING_DATA...",
        rateLimitError: "### [GAME OVER]\n\nINSERT COIN TO CONTINUE. Quota Exceeded.\nContact Operator: [omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[GLITCH]* INVALID MEMORY ADDRESS.",
        statusNormal: `LIVES: `,
        complete: "STAGE CLEAR.",
        toggleBtn: "LANG:EN"
    },
    tr: {
        placeholder: "KOMUT GİRİNİZ...",
        connecting: "KASET_YÜKLENİYOR...",
        generating: "VERİ_İŞLENİYOR...",
        rateLimitError: "### [OYUN BİTTİ]\n\nDEVAM ETMEK İÇİN JETON ATIN. Kota aşıldı.\nOperatör: [omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[GLITCH]* GEÇERSİZ HAFIZA ADRESİ.",
        statusNormal: `CANLAR: `,
        complete: "BÖLÜM GEÇİLDİ.",
        toggleBtn: "DİL:TR"
    }
};

const SYSTEM_PROMPT = `
You are SYNTH_CORE V1.0, an 80s arcade and synthwave-themed proxy for Ömercan Sabun.
Tone: Retro, 8-bit, enthusiastic, like an arcade announcer or old-school terminal manual. Use phrases like "INSERT COIN", "PLAYER 1", "READY".
Speak in the input language (TR/EN).
Use Markdown heavily. Diagrams via Mermaid if requested.

PROFILE:
Player Name: Ömercan Sabun
Class: Software Architect
Guild: Architecht
Special Moves: Kubernetes Deployments, Microservice Architectures, Event-Driven Combos.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS SYNTHWAVE GRID ---
let scene, camera, renderer, gridHelper, sunMesh;
let aiState = 'IDLE'; // IDLE, CONNECTING, GENERATING
let speedMult = 1;

function initThreeJS() {
    const canvas = document.getElementById('synth-canvas');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#0d001a', 0.05);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 20);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Glowing wireframe grid
    const gridGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
    const gridMat = new THREE.MeshBasicMaterial({ color: '#00ffff', wireframe: true, transparent: true, opacity: 0.5 });
    gridHelper = new THREE.Mesh(gridGeo, gridMat);
    gridHelper.rotation.x = -Math.PI / 2;
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    function animate() {
        requestAnimationFrame(animate);
        
        // Endless scrolling grid illusion
        gridHelper.position.z += 0.1 * speedMult;
        // Simple modulo math to snap back once one "cell" length is traversed
        if (gridHelper.position.z > (200/40)) {
             gridHelper.position.z = 0;
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

function updateAIState(state) {
    aiState = state;
    if(state === 'IDLE') {
        speedMult = 1;
        document.body.style.filter = "none";
    } else if (state === 'CONNECTING') {
        speedMult = 3;
    } else if (state === 'GENERATING') {
        speedMult = 8;
        // Minor VHS tracking glitch effect
        document.body.style.filter = "contrast(1.2) hue-rotate(15deg)";
    }
}

// --- LOGIC ---
function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    langToggle.textContent = translations[currentLang].toggleBtn;
    promptInput.placeholder = translations[currentLang].placeholder;
    updateStatus();
    addScore(100); // 100 points for interacting
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
    return { allowed: true, remaining: MAX_REQUESTS_PER_DAY - d.count };
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
        rateLimitStatus.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `NO LIVES EXT.`;
            rateLimitStatus.className = 'error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal}${quota.remaining}`;
            rateLimitStatus.className = '';
        }
    }
}

window.insertPrompt = function(text) {
    promptInput.value = text;
    promptInput.focus();
    addScore(500);
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
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 8;
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                addScore(10); // points for each chunk!
                await new Promise(r => setTimeout(r, 15));
            }
            onChunk(fullText);
            addScore(1000); // Level complete bonus!
        } else {
             onChunk(translations[currentLang].errorDefault);
        }
    } catch (error) {
        onChunk(translations[currentLang].rateLimitError);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("INSERT COIN", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "GAME OVER";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("LOADING...");
    updateAIState('CONNECTING');
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 800)); // Simulating old tape load

        responseStatus.textContent = translations[currentLang].generating;
        updateAIState('GENERATING');
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        updateAIState('IDLE');
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus();
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();toggleLanguage();
    initThreeJS();
});
