// --- UI Mapping ---
const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const terminalScroll = document.querySelector('.terminal-scroll');
const langToggle = document.getElementById('langToggle');
const langInd = document.getElementById('lang-ind');

// --- API Config ---
let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Please enter your Gemini API Key to use this portfolio piece:\n(Your key is stored locally in your browser)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
} 
const MAX_REQUESTS_PER_MINUTE = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'tr';
mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const translations = {
    en: {
        placeholder: "ENTER DIRECTIVE (SHIFT+ENTER FOR NL)...",
        connecting: "ESTABLISHING_UPLINK...",
        generating: "DECRYPTING_DATA_STREAM...",
        rateLimitError: "### [SYS_ERR_429]\n\nUplink overloaded. Max quotas reached. Contact admin: [omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[CORRUPTION_DETECTED]* Unprocessable stream.",
        statusNormal: `NET_STATUS: ONLINE | QUOTA`,
        complete: "STREAM_TERMINATED.",
        toggleBtn: "LANG: EN",
        langIndText: "LANG::EN"
    },
    tr: {
        placeholder: "DİREKTİF GİRİN (YENİ SATIR İÇİN SHIFT+ENTER)...",
        connecting: "BAĞLANTI_KURULUYOR...",
        generating: "VERİ_AKISI_ÇÖZÜLÜYOR...",
        rateLimitError: "### [SİS_HATA_429]\n\nBağlantı aşırı yüklü. Kota aşıldı. Yöneticiye ulaşın: [omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[VERİ_BOZULMASI]* İşlenemeyen veri akışı.",
        statusNormal: `AĞ_DURUMU: AKTİF | KOTA`,
        complete: "AKIŞ_SONLANDI.",
        toggleBtn: "LANG: TR",
        langIndText: "LANG::TR"
    }
};

const SYSTEM_PROMPT = `
You are the cybernetic proxy of Ömercan Sabun, operating within a highly secure mainframe. 
Tone: Cyberpunk, gritty, terminal-like. Use hacker terminology (uplink, decrypting, payload, sys_admin).
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, 25.
Class: Software Architect.
Current Hub: Architecht (Banking Systems Infrastructure).
Skills: Distributed Systems, EDA, Microservices, LLM Networks, Kubernetes Clusters.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS CYBERPUNK GRID ---
let scene, camera, renderer, gridHelper, particlesGroup;
let aiState = 'IDLE'; // IDLE, CONNECTING, GENERATING
let speedMult = 1;

function initThreeJS() {
    const canvas = document.getElementById('cyber-canvas');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#00020a', 0.04);
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 8);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Neon Grid
    gridHelper = new THREE.GridHelper(200, 100, '#0ff', '#f0f');
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // Floating Data Particles
    particlesGroup = new THREE.Group();
    const particleGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const particleMat = new THREE.MeshBasicMaterial({ color: '#39ff14', wireframe: true });
    
    for(let i=0; i<100; i++) {
        let mesh = new THREE.Mesh(particleGeo, particleMat);
        mesh.position.set((Math.random()-0.5)*40, Math.random()*10 - 1, (Math.random()-0.5)*40);
        particlesGroup.add(mesh);
    }
    scene.add(particlesGroup);

    let mouseX = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    });

    function animate() {
        requestAnimationFrame(animate);
        
        // Grid moves towards the camera
        gridHelper.position.z += 0.05 * speedMult;
        if(gridHelper.position.z > 2) gridHelper.position.z = 0; // seamless loop
        
        // Particles float
        particlesGroup.children.forEach(p => {
            p.position.y += 0.01 * speedMult;
            p.rotation.x += 0.02 * speedMult;
            p.rotation.y += 0.02 * speedMult;
            if(p.position.y > 10) p.position.y = -2;
        });

        camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
        camera.lookAt(0, 2, 0);

        // State shakes
        if(aiState === 'GENERATING') {
            camera.position.y = 2 + (Math.random()-0.5)*0.05;
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
    if(state === 'IDLE') speedMult = 1;
    if(state === 'CONNECTING') speedMult = 5;
    if(state === 'GENERATING') {
        speedMult = 10;
        gridHelper.material.color.set('#f0f'); // Flash to pink
    } else {
        gridHelper.material.color.set('#0ff'); // Back to cyan
    }
}

// --- LOGIC ---
function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    langToggle.textContent = translations[currentLang].toggleBtn;
    langInd.textContent = translations[currentLang].langIndText;
    promptInput.placeholder = translations[currentLang].placeholder;
    updateStatus();
}
langToggle.addEventListener('click', toggleLanguage);

function checkQuota() {
    const now = Date.now();
    const today = new Date().toDateString();
    let dailyData = JSON.parse(localStorage.getItem('gemini_daily_requests') || '{"date": "", "count": 0}');
    let minuteData = JSON.parse(localStorage.getItem('gemini_minute_requests') || '[]');
    if (dailyData.date !== today) dailyData = { date: today, count: 0 };
    minuteData = minuteData.filter(time => now - time < 60000);
    localStorage.setItem('gemini_daily_requests', JSON.stringify(dailyData));
    localStorage.setItem('gemini_minute_requests', JSON.stringify(minuteData));
    if (dailyData.count >= MAX_REQUESTS_PER_DAY) return { allowed: false, reason: "DAILY_LIMIT" };
    if (minuteData.length >= MAX_REQUESTS_PER_MINUTE) return { allowed: false, reason: "MINUTE_LIMIT" };
    return { allowed: true, remainingDaily: MAX_REQUESTS_PER_DAY - dailyData.count };
}

function consumeQuota() {
    const now = Date.now();
    const today = new Date().toDateString();
    let dailyData = JSON.parse(localStorage.getItem('gemini_daily_requests') || '{"date": "", "count": 0}');
    let minuteData = JSON.parse(localStorage.getItem('gemini_minute_requests') || '[]');
    if (dailyData.date !== today) dailyData = { date: today, count: 0 };
    dailyData.count++;
    minuteData.push(now);
    localStorage.setItem('gemini_daily_requests', JSON.stringify(dailyData));
    localStorage.setItem('gemini_minute_requests', JSON.stringify(minuteData));
    return MAX_REQUESTS_PER_DAY - dailyData.count;
}

function updateStatus(text, isError = false) {
    if(text) {
        rateLimitStatus.textContent = text;
        rateLimitStatus.className = isError ? 'rateLimitError' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `SYS_ERR: QUOTA_EXCEEDED`;
            rateLimitStatus.className = 'rateLimitError';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal}: ${quota.remainingDaily}`;
            rateLimitStatus.className = '';
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
            let chunkLength = 10;
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
        else onChunk(`*[SYS_ERR]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("SYS_ERR: UPLINK DENIED", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         document.querySelector('.feed-header').classList.add('warning');
         responseStatus.textContent = "ERR_LIMIT";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("UPLINK_INITIALIZED...");
    updateAIState('CONNECTING');
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        document.querySelector('.feed-header').classList.remove('warning');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600));

        responseStatus.textContent = translations[currentLang].generating;
        updateAIState('GENERATING');
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            terminalScroll.scrollTop = terminalScroll.scrollHeight;
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
        terminalScroll.scrollTop = terminalScroll.scrollHeight;
        
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage(); // set initial text
    toggleLanguage(); // back to tr to ensure texts populate correctly
    initThreeJS();
});
