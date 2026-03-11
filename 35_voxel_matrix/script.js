const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const hScroller = document.querySelector('.h-scroller');
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

const translations = {
    en: {
        placeholder: "execute...",
        connecting: "PARSING_CMD...",
        generating: "STDOUT_STREAM...",
        rateLimitError: "### [KERN_PANIC]\n\nSegfault: Quota exhausted. (Max 5/min, 20/day). Please wait or ping:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[ERR]* Invalid memory reference.",
        statusNormal: `MEM: OK | CYCLES:`,
        complete: "PROCESS_EXIT_0",
        toggleBtn: "[LANG=EN]"
    },
    tr: {
        placeholder: "çalıştır...",
        connecting: "KOMUT_ISLENIYOR...",
        generating: "STDOUT_AKISI...",
        rateLimitError: "### [CEKIRDEK_PANIGI]\n\nSegfault: Kota tükendi. Lütfen bekleyin veya ping atın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[HATA]* Geçersiz bellek referansı.",
        statusNormal: `BLLK: OK | DONGU:`,
        complete: "ISLEM_CIKISI_0",
        toggleBtn: "[DIL=TR]"
    }
};

const SYSTEM_PROMPT = `
You are the ROOT intelligence of Ömercan Sabun.
Tone: Hacker, CLI, direct, technical, no fluff. Output should look like raw system logs or terminal output where possible. Use "$ " prefixes for actions.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. Target: Cloud-Native Architect @ Architecht.
Skills: Deconstructing monoliths into highly available, containerized voxel-like structures (microservices). Polyglot (Go, C#, Java).
Ping: omercansabun@icloud.com
`;

// --- THREE.JS VOXEL MATRIX ---
let scene, camera, renderer, voxels;
let aiState = 'IDLE'; // IDLE, CONNECTING, GENERATING
let time = 0;

function initThreeJS() {
    const canvas = document.getElementById('matrix-canvas');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#000500', 0.05); // Fade to black
    
    // Isometric-ish camera angle
    const d = 15;
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(20, 20, 20);
    camera.lookAt(scene.position);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false }); // No antialias = sharper, pixelated look
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Glowing green voxel material
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.3 });
    const solidMat = new THREE.MeshToonMaterial({ color: 0x00ff00 });
    
    // Add lighting for the solid voxels
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x004400));

    // Create a dense grid of cubes
    const gridGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    
    // Use InstancedMesh for thousands of voxels
    const VOXEL_SIZE = 25; // 25x25 grid
    voxels = new THREE.InstancedMesh(gridGeo, solidMat, VOXEL_SIZE * VOXEL_SIZE);
    const dummy = new THREE.Object3D();
    
    // Store original Y heights to animate falling/rising
    const heights = [];
    const offsets = [];

    let i = 0;
    for (let x = 0; x < VOXEL_SIZE; x++) {
        for (let z = 0; z < VOXEL_SIZE; z++) {
            // Center the grid
            const px = (x - VOXEL_SIZE/2);
            const pz = (z - VOXEL_SIZE/2);
            
            // Random initial "noise" height
            const py = (Math.random() - 0.5) * 5;
            
            heights.push(py);
            offsets.push(Math.random() * Math.PI * 2); // For wave animation

            dummy.position.set(px, py, pz);
            dummy.updateMatrix();
            voxels.setMatrixAt(i, dummy.matrix);
            
            // Randomly color some voxels white or dim green
            const c = new THREE.Color();
            const r = Math.random();
            if(r > 0.95) c.setHex(0xffffff);
            else if (r > 0.8) c.setHex(0x00aa00);
            else c.setHex(0x00ff00);
            
            voxels.setColorAt(i, c);
            i++;
        }
    }
    
    scene.add(voxels);

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5);
        // mouseY = -(e.clientY / window.innerHeight - 0.5);
    });

    function animate() {
        requestAnimationFrame(animate);
        time += 0.05;

        // Animate voxel heights
        let i = 0;
        for (let x = 0; x < VOXEL_SIZE; x++) {
            for (let z = 0; z < VOXEL_SIZE; z++) {
                
                let targetY = heights[i];
                
                if (aiState === 'IDLE') {
                    // Gentle wave
                    targetY = Math.sin(x * 0.5 + time) * Math.cos(z * 0.5 + time) * 2;
                } else if (aiState === 'CONNECTING') {
                    // Chaos / compiling
                    targetY = heights[i] + Math.random() * 5 * (Math.sin(time*10));
                } else if (aiState === 'GENERATING') {
                    // Waterfall / Matrix digital rain effect
                    targetY = heights[i] - ((time*5 + offsets[i]*10) % 20); 
                    if(targetY < -10) targetY += 20; // wrap around
                }

                const px = (x - VOXEL_SIZE/2);
                const pz = (z - VOXEL_SIZE/2);

                dummy.position.set(px, targetY, pz);
                
                // If generating, scale voxels randomly based on audio/text sync (simulated)
                if (aiState === 'GENERATING') {
                    const s = 1 + (Math.random()*0.5);
                    dummy.scale.set(1, s, 1);
                } else {
                    dummy.scale.set(1, 1, 1);
                }

                dummy.updateMatrix();
                voxels.setMatrixAt(i, dummy.matrix);
                i++;
            }
        }
        
        voxels.instanceMatrix.needsUpdate = true;

        // Slowly pan camera based on mouse
        scene.position.x += (mouseX * 5 - scene.position.x) * 0.05;

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
    document.querySelector('.cli-btn').textContent = `[LANG=${currentLang.toUpperCase()}]`;
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
            rateLimitStatus.textContent = `ERR_QUOTA_EXC`;
            rateLimitStatus.className = 'error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/${MAX_REQUESTS_PER_DAY}`;
            rateLimitStatus.className = '';
        }
    }
}

window.insertPrompt = function(text) {
    const lines = text.split('');
    promptInput.value = '';
    promptInput.focus();
    
    // Typewriter effect for inserting commands
    let i = 0;
    const interval = setInterval(() => {
        promptInput.value += lines[i];
        i++;
        if(i >= lines.length) {
            clearInterval(interval);
            setTimeout(handleSubmission, 200);
        }
    }, 20); // Fast typing
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
            let chunkLength = 5; // Typewriter speed (very slow/choppy for terminal effect)
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 10)); // blip speed
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
         updateStatus("KILL -9", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "SIGTERM";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("COMPILING...");
    
    aiState = 'CONNECTING';
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 400));

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            hScroller.scrollTop = hScroller.scrollHeight;
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
        hScroller.scrollTop = hScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();toggleLanguage();
    initThreeJS();
});
