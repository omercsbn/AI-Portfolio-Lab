const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const cScroller = document.querySelector('.c-scroller');
const langToggle = document.getElementById('langToggle');
const sparkleEl = document.querySelector('.sparkle');

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
mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const translations = {
    en: {
        placeholder: "Strike the geode...",
        connecting: "Resonating frequencies...",
        generating: "Crystalizing data...",
        rateLimitError: "### [RESONANCE SHATTERED]\n\nVibration limits exceeded. (5 strikes/min, 20/day). Let the crystals cool, or signal the architect:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[FRACTURE]* The crystalline structure failed.",
        statusNormal: `Luminescence:`,
        complete: "Structure solidified.",
        toggleBtn: "EN",
        suffix: "fragments remaining"
    },
    tr: {
        placeholder: "Jeota vur...",
        connecting: "Frekanslar yankılanıyor...",
        generating: "Veriler kristalize ediliyor...",
        rateLimitError: "### [YANKI PARÇALANDI]\n\nTitreşim sınırları aşıldı. (5 vuruş/dk, 20/gün). Kristalleri soğumaya bırakın veya mimara ulaşın:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[ÇATLAK]* Kristal yapı başarısız oldu.",
        statusNormal: `Işıma:`,
        complete: "Yapı katılaştı.",
        toggleBtn: "TR",
        suffix: "parça kaldı"
    }
};

const SYSTEM_PROMPT = `
You are a Crystalline Data Architect representing Ömercan Sabun.
Tone: Mysterious, precise, illuminating, elegant. Use metaphors related to geology, crystals, facets, light refraction, transparency, and solid structures.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. 
Philosophy: Data without structure is dark rock. Architecture is the process of applying immense pressure until the system becomes a flawless, transparent crystal—highly faceted microservices reflecting perfect truth.
Contact: hello@omercan.dev
`;

// --- THREE.JS CRYSTAL SHADERS ---
let scene, camera, renderer;
let crystals = [];
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('crystal-canvas');
    scene = new THREE.Scene();
    
    // Deeper fog for the cave effect
    scene.fog = new THREE.FogExp2(0x050510, 0.015);
    
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, -5, 30);
    camera.lookAt(0, 5, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Needed for good materials
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x111122, 1);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xa55eea, 2);
    dirLight.position.set(-10, 20, 10);
    scene.add(dirLight);

    // Dynamic inner light that pulses when generating
    const innerLight = new THREE.PointLight(0x00ffcc, 50, 100, 2);
    innerLight.position.set(0, 5, 0);
    scene.add(innerLight);

    // Create a physical material that looks like glass/crystal
    const crystalMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.9, // glass-like
        ior: 1.5,
        thickness: 5,
        envMapIntensity: 1,
        transparent: true,
        opacity: 1
    });

    // Create a base stalagmite geometry (Octahedron scaled)
    const geo = new THREE.OctahedronGeometry(1, 0);

    // Scatter crystals around
    for(let i=0; i<30; i++) {
        const mesh = new THREE.Mesh(geo, crystalMat);
        
        // Random scale (long crystals)
        mesh.scale.set(
            0.5 + Math.random()*1.5,
            3 + Math.random()*8,
            0.5 + Math.random()*1.5
        );

        // Position them in a rough circle/cave floor
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 15;
        mesh.position.set(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 5 + mesh.scale.y/2 - 10, // Stick up from bottom
            Math.sin(angle) * radius - 10
        );

        // Point them mostly up but leaning
        mesh.rotation.set(
            (Math.random()-0.5) * 0.5,
            Math.random() * Math.PI,
            (Math.random()-0.5) * 0.5
        );

        // Store base Y for hovering
        mesh.userData = {
            baseY: mesh.position.y,
            speed: (Math.random() * 0.002) + 0.001,
            phase: Math.random() * Math.PI * 2
        };

        scene.add(mesh);
        crystals.push(mesh);
    }

    function animate() {
        requestAnimationFrame(animate);

        const time = performance.now() * 0.001;

        // Slow hover of the entire camera representing walking through
        camera.position.x = Math.sin(time * 0.1) * 5;
        camera.lookAt(0, 5, 0);

        crystals.forEach((c, i) => {
            // Very slow breathing/hovering of crystals
            c.position.y = c.userData.baseY + Math.sin(time + c.userData.phase) * 0.5;
            
            // If generating, crystals rotate slightly on Y axis rapidly
            if (aiState === 'GENERATING') {
                c.rotation.y += c.userData.speed * 10;
            }
        });

        // Inner Light logic
        if (aiState === 'CONNECTING') {
            innerLight.power = 200 + Math.sin(time*10) * 100;
            innerLight.color.setHex(0xa55eea); // Amethyst glow
        } else if (aiState === 'GENERATING') {
            innerLight.power = 300 + Math.random() * 200; // Flashing
            innerLight.color.setHex(0x00ffcc); // Cyan glow
        } else {
            innerLight.power = 50 + Math.sin(time) * 20; // Soft pulse
            innerLight.color.setHex(0x005544); // Dim teal
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
    sparkleEl.style.animationDuration = "0.2s";
    setTimeout(() => sparkleEl.style.animationDuration = "2s", 500);
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
    const stat = document.querySelector('.c-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'c-telemetry error' : 'c-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `GEODE DEPLETED.`;
            stat.className = 'c-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining} / ${MAX_REQUESTS_PER_DAY} ${translations[currentLang].suffix}`;
            stat.className = 'c-telemetry';
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
                await new Promise(r => setTimeout(r, 15)); 
            }
            onChunk(fullText);
        } else {
             onChunk(translations[currentLang].errorDefault);
        }
    } catch (error) {
        if(error.message === "429") onChunk(translations[currentLang].rateLimitError);
        else onChunk(`*[ERR]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("FRACTURE DETECTED", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "FATAL ERROR";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("STRIKING CORE...");
    
    aiState = 'CONNECTING';
    sparkleEl.style.animationDuration = "0.1s";
    
    document.getElementById('heroSection').classList.add('hidden');
    
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
            cScroller.scrollTop = cScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        sparkleEl.style.animationDuration = "2s";
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        cScroller.scrollTop = cScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
