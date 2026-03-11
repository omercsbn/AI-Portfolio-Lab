const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const dScroller = document.querySelector('.d-scroller');
const langToggle = document.getElementById('langToggle');
const genCounter = document.getElementById('genCounter');
const popCounter = document.getElementById('popCounter');
const pulseIndicator = document.querySelector('.pulse-indicator');

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
mermaid.initialize({ startOnLoad: false, theme: 'default' });

const translations = {
    en: {
        placeholder: "Input parameters...",
        connecting: "SIMULATING_RULES...",
        generating: "OBSERVING_EMERGENCE...",
        rateLimitError: "### [CAPACITY_ERROR]\n\nCompute limits reached. (5/min, 20/day). Await refresh cycle or contact lab admin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[FAIL]* Invalid parameter syntax.",
        statusNormal: `SYSTEM_CAPACITY: OK `,
        complete: "ANALYSIS_COMPLETE",
        toggleBtn: "LOCALE:EN"
    },
    tr: {
        placeholder: "Parametreleri girin...",
        connecting: "KURALLAR_SİMÜLE_EDİLİYOR...",
        generating: "GELİŞİM_GÖZLEMLENİYOR...",
        rateLimitError: "### [KAPASİTE_HATASI]\n\nİşlem limitlerine ulaşıldı. (5/dk, 20/gün). Döngüyü bekleyin veya yöneticiye ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[HATA]* Geçersiz parametre sözdizimi.",
        statusNormal: `SİSTEM_KAPASİTESİ: OK `,
        complete: "ANALİZ_TAMAM",
        toggleBtn: "YEREL:TR"
    }
};

const SYSTEM_PROMPT = `
You are the R&D Intelligence for Ömercan Sabun.
Tone: Clinical, scientific, analytical. Speak as if observing a complex system (like cellular automata) but applying it to software engineering.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. Cloud-Native Architect @ Architecht.
Hypothesis: Complex, highly available software systems are emergent properties of very simple, isolated micro-rules (Event-Driven, single-responsibility services).
Contact: omercansabun@icloud.com
`;

// --- THREE.JS CONWAY'S GAME OF LIFE (3D) ---
let scene, camera, renderer, cellMesh;
let aiState = 'IDLE'; 
let time = 0;

const GRID_SIZE = 30; // 30x30 grid
let grid = new Array(GRID_SIZE * GRID_SIZE).fill(0);
let nextGrid = new Array(GRID_SIZE * GRID_SIZE).fill(0);
let generation = 0;
let lastTick = 0;

function initThreeJS() {
    const canvas = document.getElementById('life-canvas');
    scene = new THREE.Scene();
    
    // Isometric camera view
    const aspect = window.innerWidth / window.innerHeight;
    const d = 20;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(30, 30, 30);
    camera.lookAt(0,0,0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Deep blue lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    scene.add(light);
    
    // Ambient blue
    scene.add(new THREE.AmbientLight(0x0044cc, 1));

    // Instanced mesh for the cells
    const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    // Dark blueprint blue material
    const material = new THREE.MeshLambertMaterial({ color: 0x0044cc, transparent: true, opacity: 0.8 });
    
    cellMesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE * GRID_SIZE);
    scene.add(cellMesh);

    // Randomize initial grid
    randomizeGrid();

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 5;
    });

    function animate() {
        requestAnimationFrame(animate);
        time += 1;

        // Camera slowly orbits
        scene.rotation.y = time * 0.002;
        camera.position.x += (mouseX - camera.position.x) * 0.05;

        // Tick logic for Game of Life based on state
        let tickRate = aiState === 'GENERATING' ? 5 : (aiState === 'CONNECTING' ? 2 : 30); // Lower = faster updates
        
        if (time - lastTick > tickRate) {
            if(aiState === 'CONNECTING') {
                randomizeGrid(); // Randomize heavily while thinking
            } else {
                updateGrid(); // Normal cellular automata rules
            }
            lastTick = time;
        }

        // Render instances based on grid state
        const dummy = new THREE.Object3D();
        let i = 0;
        let pop = 0;
        
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let z = 0; z < GRID_SIZE; z++) {
                const px = x - GRID_SIZE/2;
                const pz = z - GRID_SIZE/2;
                
                let isAlive = grid[i];
                
                if (isAlive) pop++;

                // Animate height smoothly if it's appearing/disappearing
                // For simplicity, we'll just snap them in/out of scale, but give them a slight float
                let h = isAlive ? 1 : 0.01;
                let py = isAlive ? (Math.sin(time*0.05 + x + z)*0.5) : -5; // Dead cells hide below
                
                dummy.position.set(px, py, pz);
                dummy.scale.set(h, h, h);
                dummy.updateMatrix();
                
                cellMesh.setMatrixAt(i, dummy.matrix);
                i++;
            }
        }
        
        cellMesh.instanceMatrix.needsUpdate = true;
        
        // Update UI counters
        popCounter.textContent = `POP: ${String(pop).padStart(3, '0')}`;
        if(time % 30 === 0 && (aiState === 'GENERATING' || aiState === 'IDLE')) {
             genCounter.textContent = `GEN: ${String(generation).padStart(3, '0')}`;
        }

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

function randomizeGrid() {
    for (let i = 0; i < grid.length; i++) {
        grid[i] = Math.random() > 0.8 ? 1 : 0; // 20% alive
    }
    generation = 0;
}

function updateGrid() {
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let z = 0; z < GRID_SIZE; z++) {
            const idx = x * GRID_SIZE + z;
            const neighbors = countNeighbors(x, z);
            
            if (grid[idx] === 1) {
                // Any live cell with fewer than two live neighbours dies
                // Any live cell with more than three live neighbours dies
                if (neighbors < 2 || neighbors > 3) nextGrid[idx] = 0;
                else nextGrid[idx] = 1; // Survives
            } else {
                // Any dead cell with exactly three live neighbours becomes a live cell
                if (neighbors === 3) nextGrid[idx] = 1;
                else nextGrid[idx] = 0;
            }
        }
    }
    
    // Swap buffers
    let temp = grid;
    grid = nextGrid;
    nextGrid = temp;
    
    generation++;
}

function countNeighbors(x, z) {
    let sum = 0;
    for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
            let col = (x + i + GRID_SIZE) % GRID_SIZE;
            let row = (z + j + GRID_SIZE) % GRID_SIZE;
            sum += grid[col * GRID_SIZE + row];
        }
    }
    sum -= grid[x * GRID_SIZE + z]; // Don't count self
    return sum;
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
    const stat = document.querySelector('.d-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'd-telemetry error' : 'd-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `SYSTEM_CAPACITY: EXHAUSTED`;
            stat.className = 'd-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} [${quota.remaining}/${MAX_REQUESTS_PER_DAY}]`;
            stat.className = 'd-telemetry';
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
                await new Promise(r => setTimeout(r, 10)); // Flowing text
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
         updateStatus("BLOCK_PROTOCOL", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "FAIL";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("INJECTING PARAMETERS...");
    
    aiState = 'CONNECTING';
    pulseIndicator.classList.add('active');
    
    heroSection.classList.add('hidden');
    
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
            dScroller.scrollTop = dScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        pulseIndicator.classList.remove('active');
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus();
        dScroller.scrollTop = dScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
