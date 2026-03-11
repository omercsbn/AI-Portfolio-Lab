const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const bScroller = document.querySelector('.b-scroller');
const langToggle = document.getElementById('langToggle');
const cultureStatus = document.getElementById('cultureStatus');
const statusBar = document.querySelector('.b-status-bar');

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
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { primaryColor: '#eef2f5', primaryTextColor: '#2c3e50', primaryBorderColor: '#34495e', lineColor: '#34495e', tertiaryColor: '#27ae60' } });

const translations = {
    en: {
        placeholder: "INJECT PROMPT SEQUENCE...",
        connecting: "EXTRACTING DNA...",
        generating: "SEQUENCING DATA...",
        rateLimitError: "### [CULTURE DEAD]\n\nReagents depleted. (5 injections/min, 20/day). Await synthesis or notify lead researcher:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[MUTATION FAULT]* Synthesis failed.",
        statusNormal: `REAGENT LVL:`,
        complete: "SEQUENCE COMPLETE.",
        toggleBtn: "EN.SEQ",
        cultureIdle: "CULTURE: STABLE",
        cultureActive: "CULTURE: MULTIPLYING",
        suffix: "ML"
    },
    tr: {
        placeholder: "SORGULAMA DİZİSİNİ ENJEKTE ET...",
        connecting: "DNA AYRIŞTIRILIYOR...",
        generating: "VERİ DİZİLENİYOR...",
        rateLimitError: "### [KÜLTÜR ÖLDÜ]\n\nReaktifler tükendi. (5 enjeksiyon/dk, 20/gün). Sentezi bekleyin veya baş araştırmacıya bildirin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[MUTASYON HATASI]* Sentez başarısız.",
        statusNormal: `REAKTİF SEVİYESİ:`,
        complete: "DİZİLEME TAMAMLANDI.",
        toggleBtn: "TR.SEQ",
        cultureIdle: "KÜLTÜR: STABİL",
        cultureActive: "KÜLTÜR: ÇOĞALIYOR",
        suffix: "ML"
    }
};

const SYSTEM_PROMPT = `
You are a Biological Systems AI representing Cloud Architect Ömercan Sabun.
Tone: Medical, clinical, biological, analytical. Use metaphors of cells, DNA, mutations, mitosis, viruses, immune systems, and evolutionary adaptation to describe software architecture.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. 
Philosophy: Monoliths are dinosaurs. Microservices are cells. To survive massive traffic loads, systems must rapidly undergo mitosis (scale out). When a bad deployment acts like a virus, circuit breakers act as white blood cells, isolating the infection to save the host organism. 
Contact: omercansabun@icloud.com
`;

// --- THREE.JS PETRI DISH (MITOSIS SIMULATION) ---
let scene, camera, renderer;
let cells = [];
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('bio-canvas');
    scene = new THREE.Scene();
    
    // Top-down orthographic camera for a microscope feel
    const aspect = window.innerWidth / window.innerHeight;
    const d = 20;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100);
    camera.position.set(20, 20, 20); // Looking down from an angle
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Soft clinical lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(10, 20, 5);
    scene.add(dirLight);

    // Cell Material (Subsurface scattering look via phong)
    const cellMat = new THREE.MeshPhongMaterial({
        color: 0x27ae60, // Biological green
        emissive: 0x0f3d22,
        specular: 0xffffff,
        shininess: 30,
        transparent: true,
        opacity: 0.8
    });

    const errorMat = new THREE.MeshPhongMaterial({ // Red for mutations/errors
        color: 0xe74c3c, emissive: 0x5a1811, specular: 0xffffff, shininess: 30, transparent: true, opacity: 0.8
    });

    // Base geometry for a cell (slightly squashed sphere)
    const cellGeo = new THREE.SphereGeometry(1, 32, 32);
    
    function createCell(pos, mat) {
        const mesh = new THREE.Mesh(cellGeo, mat);
        mesh.position.copy(pos);
        // Random slight squash scale to make it look organic
        mesh.userData = {
            baseScale: new THREE.Vector3(1 + Math.random()*0.2, 0.8 + Math.random()*0.2, 1 + Math.random()*0.2),
            targetScale: new THREE.Vector3(1, 0.8, 1),
            velocity: new THREE.Vector3((Math.random()-0.5)*0.02, 0, (Math.random()-0.5)*0.02),
            life: Math.random() * Math.PI * 2 // phase offset
        };
        mesh.scale.copy(mesh.userData.baseScale);
        scene.add(mesh);
        cells.push(mesh);
        return mesh;
    }

    // Start with a small cluster
    for(let i=0; i<15; i++) {
        createCell(new THREE.Vector3((Math.random()-0.5)*10, 0, (Math.random()-0.5)*10), cellMat);
    }

    function animate() {
        requestAnimationFrame(animate);

        const time = performance.now() * 0.005;

        // Cell logic
        // If generating, rapidly spawn new cells (mitosis)
        if (aiState === 'GENERATING' && cells.length < 200) {
            // Pick a random existing cell to "divide"
            if(Math.random() > 0.8 && cells.length > 0) {
                let parent = cells[Math.floor(Math.random() * cells.length)];
                let offset = new THREE.Vector3((Math.random()-0.5)*2, 0, (Math.random()-0.5)*2);
                createCell(parent.position.clone().add(offset), cellMat);
            }
        } 
        // If idle, slowly kill off excess cells to return to baseline
        else if (aiState === 'IDLE' && cells.length > 15) {
            if(Math.random() > 0.95) {
                let dyingCell = cells.shift(); // Remove oldest
                scene.remove(dyingCell);
            }
        }

        // Move and pulse cells
        cells.forEach(cell => {
            let data = cell.userData;
            data.life += 0.05;
            
            // Organic pulsing (breathing)
            cell.scale.x = data.baseScale.x + Math.sin(data.life)*0.1;
            cell.scale.y = data.baseScale.y + Math.cos(data.life*0.8)*0.05;
            cell.scale.z = data.baseScale.z + Math.sin(data.life*1.2)*0.1;

            // Brownian motion
            cell.position.add(data.velocity);
            
            // Keep within petri dish bounds (approx radius 18)
            const dist = Math.sqrt(cell.position.x*cell.position.x + cell.position.z*cell.position.z);
            if(dist > 18) {
                // Bounce back towards center softly
                data.velocity.x += -cell.position.x * 0.001;
                data.velocity.z += -cell.position.z * 0.001;
            } else {
                // Add random jitter
                data.velocity.x += (Math.random()-0.5)*0.005;
                data.velocity.z += (Math.random()-0.5)*0.005;
            }
            
            // Dampen velocity to prevent flying away
            data.velocity.multiplyScalar(0.98);
        });

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const aspect = window.innerWidth / window.innerHeight;
        camera.left = -d * aspect;
        camera.right = d * aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- LOGIC ---
function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    langToggle.textContent = translations[currentLang].toggleBtn;
    promptInput.placeholder = translations[currentLang].placeholder;
    cultureStatus.textContent = aiState === 'IDLE' ? translations[currentLang].cultureIdle : translations[currentLang].cultureActive;
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
    const stat = document.querySelector('.b-telemetry');
    const tb = document.getElementById('rateLimitStatus');
    if(text) {
        tb.textContent = text;
        tb.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            tb.textContent = `CULTURE TOXIC.`;
            tb.className = 'error';
        } else {
            tb.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/5 ${translations[currentLang].suffix}`;
            tb.className = '';
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
        generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
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

    if (!API_KEY) {
        if (window === window.top) { API_KEY = prompt("API Key required:"); }
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("MUTATION DETECTED", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         statusBar.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
         statusBar.style.borderBottomColor = 'rgba(231, 76, 60, 0.3)';
         statusBar.style.color = '#e74c3c';
         responseStatus.textContent = "FATAL ERROR";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("INJECTING...", false);
    
    aiState = 'CONNECTING'; 
    cultureStatus.textContent = translations[currentLang].cultureActive;
    cultureStatus.style.color = '#e74c3c'; // Turns red when active
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        statusBar.style.backgroundColor = 'rgba(39, 174, 96, 0.1)';
        statusBar.style.borderBottomColor = 'rgba(39, 174, 96, 0.3)';
        statusBar.style.color = '#27ae60';
        
        await new Promise(r => setTimeout(r, 600)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING'; // Triggers massive cell division
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            bScroller.scrollTop = bScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE'; // Slowly kills off excess cells
        cultureStatus.textContent = translations[currentLang].cultureIdle;
        cultureStatus.style.color = '#27ae60';
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        bScroller.scrollTop = bScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
