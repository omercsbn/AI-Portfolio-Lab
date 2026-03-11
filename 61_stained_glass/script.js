const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const cScroller = document.querySelector('.c-scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Provide Gemini API Key to invoke the Architect:\n(Stored securely in your browser)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_SPARKS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { fontFamily: 'Crimson Pro', primaryColor: '#050508', primaryTextColor: '#e6e0d4', primaryBorderColor: '#d4af37', lineColor: '#cc1133' }});

const translations = {
    en: {
        placeholder: "Speak your query into the void...",
        connecting: "CHANNELLING LIGHT...",
        generating: "WEAVING THE TAPESTRY...",
        rateLimitError: "### [THE LIGHT FADES]\n\nThe divine sparks are exhausted for now. (5 Invocations/min, 20/day). Meditate, or contact the master architect:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[HERESY]* The connection was severed.",
        statusNormal: `DIVINE SPARKS:`,
        complete: "THE ORACLE HAS SPOKEN.",
        toggleBtn: "LINGUA.EN",
        suffix: "LUX",
        lightSteady: "LUX: STEADY",
        lightBlinding: "LUX: BLINDING"
    },
    tr: {
        placeholder: "Sorunuzu boşluğa fısıldayın...",
        connecting: "IŞIK KANALLANIYOR...",
        generating: "DUVAR HALISI DOKUNUYOR...",
        rateLimitError: "### [IŞIK SÖNÜYOR]\n\nİlahi kıvılcımlar şimdilik tükendi. (5 Çağrı/dk, 20/gün). Meditasyon yapın veya baş mimara ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[KAFİRLİK]* Bağlantı koptu.",
        statusNormal: `KUTSALLIK:`,
        complete: "KAHİN KONUŞTU.",
        toggleBtn: "LINGUA.TR",
        suffix: "LUX",
        lightSteady: "IŞIK: SABİT",
        lightBlinding: "IŞIK: KÖR EDİCİ"
    }
};

const SYSTEM_PROMPT = `
You are the Grand Architect AI representing Cloud Engineer Ömercan Sabun.
Tone: Gothic, solemn, majestic, slightly archaic, ecclesiastical. Use metaphors of cathedrals, stained glass, master masons, keystones, sacred geometry, and illumination to describe modern cloud architecture and software engineering.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, The Master Builder. 
Philosophy: "A database is the crypt of knowledge; it must be vault-like and eternal. The APIs are the flying buttresses, distributing the weight of the traffic so the grand cathedral of the application may reach the heavens without collapsing."
Contact: omercansabun@icloud.com
`;

// --- THREE.JS STAINED GLASS WINDOW ---
let scene, camera, renderer;
let windowMesh, internalLight;
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('glass-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    // Position the camera so we look up at the window
    camera.position.set(0, -5, 25);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Dim ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    // Dynamic light that shines *through* the window
    internalLight = new THREE.PointLight(0xd4af37, 2, 50); // Gold
    internalLight.position.set(0, 0, -2); // Behind the window
    scene.add(internalLight);

    // Create a complex "Rose Window" geometry
    windowMesh = new THREE.Group();

    // 1. The outer stone frame
    const frameGeo = new THREE.TorusGeometry(10, 0.5, 16, 64);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9, metalness: 0.1 });
    const frame = new THREE.Mesh(frameGeo, stoneMat);
    windowMesh.add(frame);

    // 2. The glass panes (a massive subdivided plane or circle)
    const glassGeo = new THREE.CircleGeometry(9.5, 32);
    // Use MeshPhysicalMaterial for refraction/glass effects
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xcc1133, // Base ruby
        metalness: 0.1,
        roughness: 0.3,
        transmission: 0.9, // Glass-like
        thickness: 0.5,
        clearcoat: 1.0,
        side: THREE.DoubleSide
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.z = -0.1;
    // We can save the glass to change its color later
    windowMesh.userData.glassRef = glass;
    windowMesh.add(glass);

    // 3. The inner lead/stone tracery (creating the pattern)
    // To keep performance high and looking complex, we'll draw several intersecting toruses
    for(let i=0; i<6; i++) {
        const traceryGeo = new THREE.TorusGeometry(3, 0.1, 8, 32);
        const tracery = new THREE.Mesh(traceryGeo, stoneMat);
        tracery.position.x = Math.cos((i/6)*Math.PI*2) * 5;
        tracery.position.y = Math.sin((i/6)*Math.PI*2) * 5;
        windowMesh.add(tracery);
    }
    
    // Core center piece
    const coreGeo = new THREE.CylinderGeometry(2, 2, 0.3, 16);
    const core = new THREE.Mesh(coreGeo, stoneMat);
    core.rotation.x = Math.PI/2;
    windowMesh.add(core);

    scene.add(windowMesh);

    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now() * 0.001;

        if (aiState === 'IDLE') {
            windowMesh.rotation.z = time * 0.05; // Extremely slow ecclesiastical rotation
            internalLight.intensity = 1.0 + Math.sin(time)*0.2; // Subtle glowing like candles
            internalLight.color.setHex(0xd4af37); // Gold
            windowMesh.userData.glassRef.material.color.lerp(new THREE.Color(0xcc1133), 0.05); // Ruby
        } else if (aiState === 'CONNECTING') {
            windowMesh.rotation.z += 0.02;
            internalLight.intensity = 3.0; // Bright flash
            internalLight.color.setHex(0xffffff); // Pure white
        } else if (aiState === 'GENERATING') {
            windowMesh.rotation.z += 0.01;
            // Intense throbbing light
            internalLight.intensity = 3.0 + Math.sin(time*5)*1.5; 
            // Shift light and glass color to holy sapphire
            internalLight.color.lerp(new THREE.Color(0x0f52ba), 0.1);
            windowMesh.userData.glassRef.material.color.lerp(new THREE.Color(0x0f52ba), 0.1);
        }

        // Slight drift to the camera to make it feel alive
        camera.position.x = Math.sin(time * 0.2) * 2;
        camera.lookAt(0, 0, 0);

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
    document.getElementById('lightStatus').textContent = aiState === 'IDLE' ? translations[currentLang].lightSteady : translations[currentLang].lightBlinding;
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
    if (m.length >= MAX_SPARKS) return { allowed: false };
    return { allowed: true, remaining: MAX_SPARKS - m.length };
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
        tb.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            tb.textContent = `DARKNESS FALLS.`;
            tb.className = 'error';
        } else {
            tb.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/${MAX_SPARKS} ${translations[currentLang].suffix}`;
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
        generationConfig: { temperature: 0.6, maxOutputTokens: 8192 } 
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
                while(m.length<MAX_SPARKS) m.push(Date.now());
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
        else onChunk(`*[HERESY]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!API_KEY) {
        API_KEY = prompt("API Key required for access:");
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("DOORS SEALED", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "THE ORACLE IS SILENT";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("PRAYING...", false);
    
    aiState = 'CONNECTING'; 
    document.getElementById('lightStatus').textContent = translations[currentLang].lightBlinding;
    
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
        
        // Final "imprint" to paper effect
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE'; 
        document.getElementById('lightStatus').textContent = translations[currentLang].lightSteady;
        
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
