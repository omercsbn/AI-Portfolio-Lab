const promptInput = document.getElementById('promptInput');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const mScroller = document.querySelector('.m-scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Provide Gemini API Key for ROOT access:\n(Stored locally)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_CALLS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';

const translations = {
    en: {
        placeholder: "Type a command or natural language query...",
        connecting: "EXECUTING BINARY...",
        generating: "STDOUT STREAM TRACE:",
        rateLimitError: "### [ERR_QUOTA_EXCEEDED]\n\nRate limit hit. (5 req/min, 20/day). Please wait or contact sysadmin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[FATAL] Segmentation fault.",
        statusNormal: `API_QUOTA:`,
        complete: "EXECUTION COMPLETE_ 0ms",
        toggleBtn: "[LANG=EN]",
        suffix: "CALLS"
    },
    tr: {
        placeholder: "Bir komut veya doğal dil sorgusu girin...",
        connecting: "BINARY ÇALIŞTIRILIYOR...",
        generating: "STDOUT AKIŞI İZLENİYOR:",
        rateLimitError: "### [ERR_KOTA_ASILDI]\n\nZaman sınırı aşıldı. (5 istek/dk, 20/gün). Bekleyin veya sysadmin'e ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[FATAL] Parçalama hatası.",
        statusNormal: `API_KOTASI:`,
        complete: "ÇALIŞTIRMA TAMAMLANDI_ 0ms",
        toggleBtn: "[LANG=TR]",
        suffix: "ISTEK"
    }
};

const SYSTEM_PROMPT = `
You are a sentient Terminal/Root Linux daemon representing Cloud Architect Ömercan Sabun.
Tone: Hacker, CLI pure, terse, highly technical, matrix-like. Provide answers as if they are output from terminal commands (e.g., parsing logs, executing shell scripts, dumping root configurations).
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: root@omercan.dev. 
Philosophy: UIs lie. The CLI is truth. To build scalable architectures, one must speak directly to the kernel of infrastructure. I automate, I containerize, I deploy. 
Contact: omercansabun@icloud.com
`;

// --- THREE.JS TO ASCII CONVERTER ---
let scene, camera, renderer;
let mainMesh;
let aiState = 'IDLE'; 
const asciiContainer = document.getElementById('ascii-container');

// The ASCII spectrum from dark to bright
const density = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

function initThreeJS() {
    const canvas = document.getElementById('matrix-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 30;

    // Small resolution for the ascii sampling
    const renderWidth = 80; // Character columns
    const renderHeight = 50; // Character rows (approximate aspect ratio needed)
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(renderWidth, renderHeight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 10, 10);
    scene.add(dirLight);

    const geo = new THREE.TorusKnotGeometry(8, 2.5, 64, 16);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    mainMesh = new THREE.Mesh(geo, mat);
    scene.add(mainMesh);

    function mapRGBtoASCII(r, g, b, a) {
        if (a === 0) return " "; // Transparent
        const brightness = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
        const charIndex = Math.floor(brightness * (density.length - 1));
        return density[charIndex];
    }

    function animate() {
        requestAnimationFrame(animate);

        let speed = aiState === 'GENERATING' ? 0.1 : 0.01;
        mainMesh.rotation.x += speed;
        mainMesh.rotation.y += speed;
        
        if (aiState === 'CONNECTING') {
             mainMesh.scale.setScalar(1 + Math.random()*0.1);
        } else if (aiState === 'IDLE') {
             mainMesh.scale.setScalar(1);
        }

        // Render scene to hidden canvas
        renderer.render(scene, camera);

        // Read pixels
        const gl = renderer.getContext();
        const pixels = new Uint8Array(renderWidth * renderHeight * 4);
        gl.readPixels(0, 0, renderWidth, renderHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        // Build ASCII String
        let asciiArt = "";
        for (let y = renderHeight - 1; y >= 0; y--) { // WebGL reads bottom-up
            for (let x = 0; x < renderWidth; x++) {
                const index = (y * renderWidth + x) * 4;
                const r = pixels[index];
                const g = pixels[index + 1];
                const b = pixels[index + 2];
                const a = pixels[index + 3];

                // If generating, randomly flip some characters to matrix green '0' and '1'
                if (aiState === 'GENERATING' && a > 0 && Math.random() > 0.8) {
                     asciiArt += Math.random() > 0.5 ? '1' : '0';
                } else {
                     asciiArt += mapRGBtoASCII(r, g, b, a);
                }
            }
            asciiArt += '\n';
        }

        // Dump to DOM
        asciiContainer.textContent = asciiArt;
        
        // Color shifts based on state
        if (aiState === 'GENERATING') {
            asciiContainer.style.color = '#0f0';
            asciiContainer.style.textShadow = '0 0 10px #0f0';
        } else {
            asciiContainer.style.color = 'var(--m-dim)';
            asciiContainer.style.textShadow = 'none';
        }
    }
    animate();
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
    if (m.length >= MAX_CALLS) return { allowed: false };
    return { allowed: true, remaining: MAX_CALLS - m.length };
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
        tb.style.color = isError ? 'red' : 'var(--m-dim)';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            tb.textContent = `ERR_QUOTA_REACHED.`;
            tb.style.color = 'red';
        } else {
            tb.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/${MAX_CALLS} ${translations[currentLang].suffix}`;
            tb.style.color = 'var(--m-dim)';
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
document.getElementById('submitBtn').addEventListener('click', handleSubmission);

async function fetchStreamGemini(userPrompt, onChunk) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
    const payload = {
        contents: [{ role: "user", parts: [{ text: "System prompt: " + SYSTEM_PROMPT + "\n\nUser Query: " + userPrompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 } 
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
                while(m.length<MAX_CALLS) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 30; // Fast terminal printing
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
        else onChunk(`[FATAL] ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!API_KEY) {
        API_KEY = prompt("ROOT API Key required:");
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("ACCESS DENIED", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "PROCESS TERMINATED";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("COMPILING...", false);
    
    aiState = 'CONNECTING'; 
    document.getElementById('memStatus').textContent = "MEM: BURSTING";
    document.getElementById('memStatus').style.color = "#0f0";
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 300)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING'; 
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            mScroller.scrollTop = mScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE'; 
        document.getElementById('memStatus').textContent = "MEM: ALLOCATED";
        document.getElementById('memStatus').style.color = "var(--m-dim)";
        
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
