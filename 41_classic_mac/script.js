const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const mScroller = document.querySelector('.m-scroller');
const langToggle = document.getElementById('langToggle');
const clockEl = document.getElementById('clock');
const macProgress = document.getElementById('macProgress');

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
        placeholder: "C:\\> Type command...",
        connecting: "Waiting for server...",
        generating: "Receiving packet...",
        rateLimitError: "### System Error\n\nApplication unexpectedly quit. Error Type: Out of memory (5/min, 20/day limit). Restart or send crash log to:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[Bomb Icon]* A system error occurred.",
        statusNormal: `Disk Space:`,
        complete: "Transfer Complete.",
        toggleBtn: "English",
        suffix: "blocks free"
    },
    tr: {
        placeholder: "C:\\> Komut giriniz...",
        connecting: "Sunucu bekleniyor...",
        generating: "Paket alınıyor...",
        rateLimitError: "### Sistem Hatası\n\nUygulama beklenmedik şekilde kapandı. Hata Türü: Yetersiz bellek (5/dk, 20/gün limiti). Yeniden başlatın veya çökme raporunu iletin:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[Bomba Simgesi]* Bir sistem hatası oluştu.",
        statusNormal: `Disk Alanı:`,
        complete: "Aktarım Tamamlandı.",
        toggleBtn: "Türkçe",
        suffix: "blok boş"
    }
};

const SYSTEM_PROMPT = `
You are a legacy AI operating on Mac OS 9 representing Ömercan Sabun.
Tone: 90s tech support, system dialog boxes, slightly rigid but helpful. Use terms like "directory", "extensions", "control panels", "floppy disk".
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. Architecht -> Cloud-Native Systems.
Note: Upgraded from Monolith OS to Event-Driven CloudOS. High availability architecture detected.
Contact: hello@omercan.dev
`;

// --- UPDATE CLOCK ---
function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0' + minutes : minutes;
    clockEl.textContent = `${hours}:${minutes} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

// --- THREE.JS MACINTOSH BACKGROUND ---
// To keep it lightweight, we'll draw a slowly rotating 3D floppy disk or simple cube structure 
// that looks like retro 3D graphics (flat shading, no lights).
let scene, camera, renderer, retroMesh;
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('mac-canvas');
    scene = new THREE.Scene();
    
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    camera.position.set(2, 2, 5);
    camera.lookAt(0,0,0);

    // No antialiasing for that jagged 90s software render look
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Flat lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Simple Floppy Disk shape
    const geometry = new THREE.BoxGeometry(2, 2, 0.1);
    // Basic material, flat shading
    const material = new THREE.MeshLambertMaterial({ color: 0x0000aa, flatShading: true }); 
    
    retroMesh = new THREE.Mesh(geometry, material);
    scene.add(retroMesh);

    // Add a label to the disk
    const labelGeo = new THREE.BoxGeometry(1.2, 0.8, 0.11);
    const labelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(0, 0.3, 0);
    retroMesh.add(label);

    // Add silver slider
    const sliderGeo = new THREE.BoxGeometry(0.8, 0.5, 0.12);
    const sliderMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const slider = new THREE.Mesh(sliderGeo, sliderMat);
    slider.position.set(0.4, -0.75, 0);
    retroMesh.add(slider);

    function animate() {
        requestAnimationFrame(animate);

        let speed = aiState === 'GENERATING' ? 0.05 : 0.01;
        retroMesh.rotation.y += speed;
        retroMesh.rotation.x = Math.sin(Date.now()*0.001) * 0.2;

        if(aiState === 'CONNECTING') {
            retroMesh.rotation.z += 0.1; // Crazy spin while connecting
        } else {
            retroMesh.rotation.z = 0;
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
    if(text) {
        rateLimitStatus.textContent = text;
        rateLimitStatus.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `Disk Full.`;
            rateLimitStatus.className = 'error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining} ${translations[currentLang].suffix}`;
            rateLimitStatus.className = '';
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
            let chunkLength = 20; // Chunking to simulate loading bar jumps
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText, i / fullText.length); // Pass progress
                await new Promise(r => setTimeout(r, 10)); 
            }
            onChunk(fullText, 1.0);
        } else {
             onChunk(translations[currentLang].errorDefault, 1);
        }
    } catch (error) {
        if(error.message === "429") onChunk(translations[currentLang].rateLimitError, 1);
        else onChunk(`*[SYS_ERR]* ${error.message}`, 1);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("BOMB ERROR", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "Error 0x1A";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         macProgress.style.width = "100%";
         macProgress.style.background = "#ff0000";
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("Executing...");
    macProgress.style.width = "0%";
    macProgress.style.background = "#000";
    
    aiState = 'CONNECTING';
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        macProgress.style.width = "10%";
        
        await new Promise(r => setTimeout(r, 600));

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk, progress) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            mScroller.scrollTop = mScroller.scrollHeight;
            macProgress.style.width = `${Math.max(10, progress * 100)}%`; // Update loading bar
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        macProgress.style.width = "100%";
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus();
        mScroller.scrollTop = mScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
