const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const sysInfoGroup = document.querySelector('.b-sys-info');
const bScroll = document.querySelector('.b-scroll');
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
mermaid.initialize({ startOnLoad: false, theme: 'default' });

const translations = {
    en: {
        placeholder: "Define vector input...",
        connecting: "ASSEMBLING NODES...",
        generating: "SYNTHESIZING STRUCTURE...",
        rateLimitError: "### [SYSTEM HALT]\n\nResource limit reached. (Max 5/min, 20/day). Contact administrator:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[CRITICAL]* Structural anomaly detected.",
        statusNormal: `SYSTEM STABLE | OP`,
        complete: "EXECUTION COMPLETE.",
        toggleBtn: "LANG: TR"
    },
    tr: {
        placeholder: "Vektör girdisi tanımlayın...",
        connecting: "DÜĞÜMLER TOPLANIYOR...",
        generating: "YAPI SENTEZLENİYOR...",
        rateLimitError: "### [SİSTEM DURDURULDU]\n\nKaynak sınırına ulaşıldı. Yönetici ile iletişime geçin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[KRİTİK]* Yapısal anomali algılandı.",
        statusNormal: `SİSTEM KARARLI | İŞLEM`,
        complete: "YÜRÜTME TAMAMLANDI.",
        toggleBtn: "DİL: EN"
    }
};

const SYSTEM_PROMPT = `
You are the geometric logic core representing Ömercan Sabun.
Tone: Highly logical, structured, architectural, using design/bauhaus metaphors (form, function, nodes, structure, harmony).
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Cloud-Native Architect.
Firm: Architecht
Expertise: Deconstructing monolithic structures into elegant, functional microservices (Form follows function).
Skills: Distributed Systems, K8s, Go, C#, Java, Multi-agent AI.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS GEOMETRIC SWARM ---
let scene, camera, renderer, dummy;
let instancedMesh;
const PARTICLE_COUNT = 800;
let aiState = 'IDLE'; // IDLE, CONNECTING, GENERATING
let time = 0;

function initThreeJS() {
    const canvas = document.getElementById('swarm-canvas');
    scene = new THREE.Scene();
    
    // Orthographic camera for that flat, design-poster look
    const aspect = window.innerWidth / window.innerHeight;
    const d = 20;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(20, 20, 20);
    camera.lookAt(scene.position);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(10, 20, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // Bauhaus colors for swarm elements
    const colors = ['#e03c31', '#1c4b82', '#f4b41a', '#2a2a2a'];
    
    // We use an instanced mesh for performance with many cubes/pyramids
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshToonMaterial({ color: 0xffffff });
    
    instancedMesh = new THREE.InstancedMesh(geometry, material, PARTICLE_COUNT);
    dummy = new THREE.Object3D();

    const colorObj = new THREE.Color();
    // Initialize properties
    const positions = [];
    const targets = [];
    const phases = [];
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Random initial cluster
        const x = (Math.random() - 0.5) * 40;
        const y = (Math.random() - 0.5) * 40;
        const z = (Math.random() - 0.5) * 40;
        
        positions.push({x, y, z});
        targets.push({x, y, z});
        phases.push(Math.random() * Math.PI * 2);

        // Assign random bauhaus color
        colorObj.set(colors[Math.floor(Math.random() * colors.length)]);
        instancedMesh.setColorAt(i, colorObj);
        
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    
    instancedMesh.userData = { positions, targets, phases };
    scene.add(instancedMesh);

    function calculateTargets() {
        const udata = instancedMesh.userData;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            if(aiState === 'IDLE') {
                // Sphere shape
                const r = 10;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos((Math.random() * 2) - 1);
                udata.targets[i].x = r * Math.sin(phi) * Math.cos(theta);
                udata.targets[i].y = r * Math.sin(phi) * Math.sin(theta);
                udata.targets[i].z = r * Math.cos(phi);
            } else if (aiState === 'CONNECTING') {
                // Tight Core / Column
                udata.targets[i].x = (Math.random() - 0.5) * 5;
                udata.targets[i].y = (Math.random() - 0.5) * 30;
                udata.targets[i].z = (Math.random() - 0.5) * 5;
            } else if (aiState === 'GENERATING') {
                // Expanding / pulsating grid
                const spread = 25;
                udata.targets[i].x = Math.round((Math.random() - 0.5) * 10) * 3;
                udata.targets[i].y = Math.round((Math.random() - 0.5) * 10) * 3;
                udata.targets[i].z = Math.round((Math.random() - 0.5) * 10) * 3;
            }
        }
    }

    calculateTargets(); // initial

    window.updateSwarmState = function(state) {
        aiState = state;
        calculateTargets();
    };

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5);
        mouseY = -(e.clientY / window.innerHeight - 0.5);
    });

    function animate() {
        requestAnimationFrame(animate);
        time += 0.02;

        const udata = instancedMesh.userData;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Spring towards target
            udata.positions[i].x += (udata.targets[i].x - udata.positions[i].x) * 0.05;
            udata.positions[i].y += (udata.targets[i].y - udata.positions[i].y) * 0.05;
            udata.positions[i].z += (udata.targets[i].z - udata.positions[i].z) * 0.05;

            // Add floating noise
            const floatingY = Math.sin(time + udata.phases[i]) * 0.5;

            dummy.position.set(
                udata.positions[i].x,
                udata.positions[i].y + floatingY,
                udata.positions[i].z
            );
            
            // Spin cubes
            dummy.rotation.x = time * 0.5 + udata.phases[i];
            dummy.rotation.y = time * 0.3 + udata.phases[i];
            
            // If generating, vibrate slightly
            if(aiState === 'GENERATING') {
                dummy.scale.set(1 + Math.sin(time * 10)*0.2, 1 + Math.sin(time * 10)*0.2, 1 + Math.sin(time * 10)*0.2);
            } else {
                dummy.scale.set(1, 1, 1);
            }

            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;

        scene.rotation.y += (mouseX * 0.5 - scene.rotation.y) * 0.05;
        scene.rotation.x += (mouseY * 0.5 - scene.rotation.x) * 0.05;

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
    if(text) {
        rateLimitStatus.textContent = text;
        sysInfoGroup.className = isError ? 'b-sys-info error' : 'b-sys-info';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `CRITICAL: RES LIMIT`;
            sysInfoGroup.className = 'b-sys-info error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal}: ${quota.remaining}`;
            sysInfoGroup.className = 'b-sys-info';
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
                await new Promise(r => setTimeout(r, 10)); // smooth rendering
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
         updateStatus("HALT", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ABORT";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("COMPILING...");
    
    // Call globally attached func
    if(window.updateSwarmState) window.updateSwarmState('CONNECTING');
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600));

        responseStatus.textContent = translations[currentLang].generating;
        if(window.updateSwarmState) window.updateSwarmState('GENERATING');
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            bScroll.scrollTop = bScroll.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        if(window.updateSwarmState) window.updateSwarmState('IDLE');
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus();
        bScroll.scrollTop = bScroll.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage(); toggleLanguage();
    initThreeJS();
});
