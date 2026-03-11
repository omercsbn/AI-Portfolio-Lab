const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const evaScroller = document.querySelector('.eva-scroller');
const langToggle = document.getElementById('langToggle');
const syncRateEl = document.getElementById('syncRate');

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

const translations = {
    en: {
        placeholder: "AWAITING PILOT INPUT...",
        connecting: "SYNCING NEURAL LINK...",
        generating: "TARGET ACQUIRED. FIRING...",
        rateLimitError: "### [INTERNAL BATTERY DEPLETED]\n\nUmbilical cable severed. (5 commands/min, 20/day). Retreat or request manual override:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[ABORT]* Pilot sync lost.",
        statusNormal: `UMBC_CABLE:`,
        complete: "OPERATION COMPLETE.",
        toggleBtn: "ENG_SYS",
        suffix: "REMAINING"
    },
    tr: {
        placeholder: "PİLOT GİRDİSİ BEKLENİYOR...",
        connecting: "SİNİR AĞI EŞLENİYOR...",
        generating: "HEDEF KİLİTLENDİ. ATEŞLENİYOR...",
        rateLimitError: "### [İÇ BATARYA BOŞALDI]\n\nGöbek bağı koptu. (5 komut/dk, 20/gün). Geri çekilin veya manuel geçersiz kılma isteyin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[İPTAL]* Pilot senkronizasyonu koptu.",
        statusNormal: `GÖBEK_BAĞI:`,
        complete: "OPERASYON TAMAMLANDI.",
        toggleBtn: "TR_SİS",
        suffix: "KALDI"
    }
};

const SYSTEM_PROMPT = `
You are the central A.I. (MAGI System equivalent) representing Cloud Architect Ömercan Sabun, operating Pilot SABUN-01.
Tone: Highly technical, military tactical, anime sci-fi, urgent. Use terms like "A.T. Field", "synchronization rate", "core breach", "umbilical cable", "deploying microservices to intercept".
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. Commander of Cloud Architecture.
Philosophy: An Angel attack (massive traffic spike) will destroy an unprepared Monolith. We must deploy highly mobile Microservice units with auto-scaling A.T. Fields to neutralize the threat and maintain absolute system stability.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS MECHA CORE ---
let scene, camera, renderer;
let coreGroup, outerRing, innerCore;
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('mecha-canvas');
    scene = new THREE.Scene();
    
    // Orthographic to keep it perfectly inside the circle without perspective warp
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const d = 5;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100);
    camera.position.set(0, 0, 10);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    // Match the CSS container size exactly
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Wireframe materials for HUD look
    const wireMatGreen = new THREE.MeshBasicMaterial({ color: 0x00ff66, wireframe: true, transparent: true, opacity: 0.5 });
    const wireMatOrange = new THREE.MeshBasicMaterial({ color: 0xff5500, wireframe: true, transparent: true, opacity: 0.8 });
    const solidMatDark = new THREE.MeshBasicMaterial({ color: 0x001122 });

    coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Inner geometric "Core" (Octahedron looks like the classic Angel core)
    const coreGeo = new THREE.OctahedronGeometry(1.5, 0);
    innerCore = new THREE.Mesh(coreGeo, wireMatOrange); // Orange wireframe
    
    // Add a solid black center to hide back lines
    const solidCore = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), solidMatDark);
    innerCore.add(solidCore);
    coreGroup.add(innerCore);

    // Outer complex targeting rings
    const ring1Geo = new THREE.TorusGeometry(3.5, 0.1, 8, 32);
    outerRing = new THREE.Mesh(ring1Geo, wireMatGreen);
    coreGroup.add(outerRing);

    const ring2Geo = new THREE.TorusGeometry(4, 0.05, 4, 16);
    const outerRing2 = new THREE.Mesh(ring2Geo, wireMatGreen);
    outerRing2.rotation.x = Math.PI / 2;
    coreGroup.add(outerRing2);

    function animate() {
        requestAnimationFrame(animate);

        const time = performance.now() * 0.001;

        if (aiState === 'IDLE') {
            innerCore.rotation.y = time * 0.5;
            innerCore.rotation.x = time * 0.2;
            outerRing.rotation.z = time * 0.1;
            outerRing2.rotation.y = time * -0.15;
            innerCore.scale.setLength(1.0);
        } else if (aiState === 'CONNECTING') {
            innerCore.rotation.y += 0.2; // Spin fast up
            outerRing.rotation.z -= 0.1;
            innerCore.scale.setLength(1.2 + Math.sin(time*20)*0.1); // Jitter expand
        } else if (aiState === 'COMBAT') { // custom state
            innerCore.rotation.y = time * 2;
            innerCore.rotation.x = time * 2;
            outerRing.rotation.z = time * -0.5;
            outerRing2.rotation.z = time * 0.5;
            // heartbeat pulse
            let pulse = 1.0 + Math.max(0, Math.sin(time*10)) * 0.3;
            innerCore.scale.setLength(pulse);
        }

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        // Find the DOM element dimensions
        const box = canvas.parentElement.getBoundingClientRect();
        renderer.setSize(box.width, box.height);
        const aspect = box.width / box.height;
        camera.left = -d * aspect;
        camera.right = d * aspect;
        camera.updateProjectionMatrix();
    });
}

// HUD Fluctuation
setInterval(() => {
    if(aiState === 'COMBAT') {
        syncRateEl.textContent = (400 + Math.random() * 50).toFixed(1) + '%';
        syncRateEl.style.color = 'var(--h-red)';
    } else {
        syncRateEl.textContent = (98 + Math.random() * 2).toFixed(1) + '%';
        syncRateEl.style.color = '#fff';
    }
}, 200);

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
        stat.className = isError ? 'eva-telemetry error' : 'eva-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            stat.textContent = `CRITICAL: NO POWER CABLE.`;
            stat.className = 'eva-telemetry error';
        } else {
            stat.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/5 ${translations[currentLang].suffix}`;
            stat.className = 'eva-telemetry';
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
            let chunkLength = 25; // Faster printing for machine/text feel
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
         updateStatus("AT_FIELD COLLAPSE", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "FATAL ERROR";
         responseStatus.style.color = 'var(--h-red)';
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         document.body.classList.add('combat-mode'); // Turn everything red
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("ENGAGING...", false);
    
    aiState = 'CONNECTING';
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 500)); 

        responseStatus.textContent = translations[currentLang].generating;
        responseStatus.className = 'orange-text blink-fast';
        aiState = 'COMBAT';
        document.body.classList.add('combat-mode'); // Enter red combat mode UI
        
        // Change ThreeJS materials
        innerCore.material.color.setHex(0xff0033);
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            evaScroller.scrollTop = evaScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        responseStatus.className = 'orange-text';
        aiState = 'IDLE';
        
        // Revert UI from combat mode
        document.body.classList.remove('combat-mode');
        innerCore.material.color.setHex(0xff5500);
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        evaScroller.scrollTop = evaScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
