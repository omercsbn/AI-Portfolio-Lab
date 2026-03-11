const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const scrollArea = document.querySelector('.q-scroll-area');
const langToggle = document.getElementById('langToggle');
const statusBar = document.querySelector('.q-status-bar');

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
mermaid.initialize({ startOnLoad: false, theme: 'default' }); // Light mode mermaid

const translations = {
    en: {
        placeholder: "Inject parameter sequence... (Shift+Enter for multi-line)",
        connecting: "INITIALIZING QUANTUM ROUTING...",
        generating: "PROCESSING DATA STREAM...",
        rateLimitError: "### [NODE DEGRADED]\n\nBandwidth exceeded. (Max 5 queries/min or 20/day). To increase processing allocation, contact: [omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[CORRUPTION DETECTED]* Packet loss in stream.",
        statusNormal: `NODE_READY // Q_AVAILABLE`,
        complete: "STREAM COMPLETE",
        toggleBtn: "TR"
    },
    tr: {
        placeholder: "Parametre dizisi enjekte et... (Çoklu satır için Shift+Enter)",
        connecting: "KUANTUM YÖNLENDİRMESİ BAŞLATILIYOR...",
        generating: "VERİ AKIŞI İŞLENİYOR...",
        rateLimitError: "### [DÜĞÜM PERFORMANS DÜŞÜŞÜ]\n\nBant genişliği aşıldı. Tahsisatı artırmak için iletişim:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[BOZULMA TESPİT EDİLDİ]* Akışta paket kaybı.",
        statusNormal: `DÜĞÜM_HAZIR // Q_KOTA`,
        complete: "AKIŞ TAMAMLANDI",
        toggleBtn: "EN"
    }
};

const SYSTEM_PROMPT = `
You are the advanced quantum-data proxy of Ömercan Sabun.
Tone: Highly efficient, analytical, fast, clinical, corporate-modern.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if asked.

PROFILE:
Name: Ömercan Sabun
Role: Cloud-Native Software Architect
Current: Architecht (Banking Systems)
Systems: High-scale, Distributed, CQRS, Saga Pattern.
Tech: C#, Java, Go, React, Kubernetes.
`;

// --- THREE.JS QUANTUM TUNNEL ---
let scene, camera, renderer, tunnelGeometry, tunnelMaterial, tunnelMesh;
let particlesGroup;
let aiState = 'IDLE'; // IDLE, CONNECTING, GENERATING
let tunnelSpeed = 1;

function initThreeJS() {
    const canvas = document.getElementById('tunnel-canvas');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#f8fafc', 0.02); // matches body bg #f8fafc
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: false, antialias: true });
    renderer.setClearColor('#f8fafc');
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Cylinder Tunnel Geo
    tunnelGeometry = new THREE.CylinderGeometry(15, 15, 200, 16, 40, true);
    
    // Create Wireframe Material that looks like a high tech grid
    tunnelMaterial = new THREE.MeshBasicMaterial({ 
        color: '#2563eb', // blue
        wireframe: true,
        transparent: true,
        opacity: 0.2
    });

    tunnelMesh = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
    tunnelMesh.rotation.x = Math.PI / 2;
    scene.add(tunnelMesh);

    // Speed Lines (Particles inside tunnel)
    particlesGroup = new THREE.Group();
    const pGeo = new THREE.BoxGeometry(0.1, 0.1, 5);
    const pMat = new THREE.MeshBasicMaterial({ color: '#0ea5e9' }); // cyan
    for(let i=0; i<150; i++) {
        let p = new THREE.Mesh(pGeo, pMat);
        let angle = Math.random() * Math.PI * 2;
        let radius = 5 + Math.random() * 9;
        p.position.set(radius * Math.cos(angle), radius * Math.sin(angle), (Math.random()-0.5)*200);
        particlesGroup.add(p);
    }
    scene.add(particlesGroup);

    // Mouse movement to look around slightly inside tunnel
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animate() {
        requestAnimationFrame(animate);
        
        // Move through tunnel
        // The cylinder doesn't move, we literally move the texture or rotate it for effect
        tunnelMesh.rotation.y += 0.001 * tunnelSpeed;
        
        // Move particles towards camera for speed effect
        particlesGroup.children.forEach(p => {
            p.position.z += 1 * tunnelSpeed;
            if(p.position.z > 50) p.position.z = -150; // loop back
        });

        // Camera gentle sway based on mouse
        gsap.to(camera.position, {
            x: mouseX * 3,
            y: mouseY * 3,
            duration: 0.5
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

function updateAIState(state) {
    aiState = state;
    if(state === 'IDLE') {
        gsap.to(window, { tunnelSpeed: 1, duration: 1 });
        tunnelMaterial.color.set('#2563eb');
    } else if (state === 'CONNECTING') {
        gsap.to(window, { tunnelSpeed: 3, duration: 0.5 });
        tunnelMaterial.color.set('#0ea5e9');
    } else if (state === 'GENERATING') {
        gsap.to(window, { tunnelSpeed: 8, duration: 2 });
        tunnelMaterial.color.set('#8b5cf6'); // shifts to purple data stream
    }
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
        rateLimitStatus.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `SYS_ERR: THRESHOLD EXCEEDED`;
            rateLimitStatus.className = 'error';
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
            let chunkLength = 12;
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 10)); // extremely fast processing effect
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
         updateStatus("ROUTING DENIED", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         statusBar.classList.add('error');
         responseStatus.textContent = "THROTTLED";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("ROUTING SEQUENCE...");
    updateAIState('CONNECTING');
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        statusBar.classList.remove('error');
        statusBar.classList.remove('complete');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 400));

        responseStatus.textContent = translations[currentLang].generating;
        updateAIState('GENERATING');
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            scrollArea.scrollTop = scrollArea.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        statusBar.classList.add('complete');
        updateAIState('IDLE');
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus();
        scrollArea.scrollTop = scrollArea.scrollHeight;
        
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();toggleLanguage(); // set initial text correctly
    initThreeJS();
});
