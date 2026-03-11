const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const wScroller = document.querySelector('.w-scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    if (window === window.top) { API_KEY = prompt("Insert Coin (Gemini API Key) to Start Engine:\n(Stored on local disk only)"); }
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_FUEL = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { fontFamily: 'Montserrat', primaryColor: '#2b0057', primaryTextColor: '#00f3ff', primaryBorderColor: '#ff007f', lineColor: '#ffea00' }});

const translations = {
    en: {
        placeholder: "ENTER LONGITUDE...",
        connecting: "ACCELERATING...",
        generating: "DOWNLOAD IN PROGRESS...",
        rateLimitError: "### [ENGINE STALLED]\n\nOut of fuel. (5 Gallons/min, 20/day). Pull over and hit up the mechanic:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[STATIC]* Signal lost in the desert.",
        statusNormal: `FUEL:`,
        complete: "DESTINATION REACHED.",
        toggleBtn: "FM: TR",
        suffix: "GALLONS",
        driveIdle: "CRUISING",
        driveActive: "HYPERDRIVE"
    },
    tr: {
        placeholder: "BOYLAM GİRİN...",
        connecting: "HIZLANILIYOR...",
        generating: "İNDİRİLİYOR...",
        rateLimitError: "### [MOTOR DURDU]\n\nYakıt bitti. (5 Galon/dk, 20/gün). Kenara çekin ve tamirciye ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[PARAZİT]* Çölde sinyal kayboldu.",
        statusNormal: `YAKIT:`,
        complete: "HEDEFE ULAŞILDI.",
        toggleBtn: "FM: EN",
        suffix: "GALON",
        driveIdle: "SEYİRDE",
        driveActive: "HİPER SÜRÜŞ"
    }
};

const SYSTEM_PROMPT = `
You are the onboard AI of a 1980s sports car driven by Cloud Architect Ömercan Sabun through a synthwave cyberspace.
Tone: Retro-futuristic, cool, 80s outrun aesthetic. Use metaphors related to driving, highways, engine RPMs, neon lights, night drives, and speed to describe software deployments, cloud infrastructure, and CI/CD pipelines.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Nightrider OS.
Philosophy: "Software delivery should be as smooth as a midnight drive down an empty coastal highway. Zero friction. Max RPM. I build automated CI/CD pipelines that shift code into production before the competition even turns the key."
Contact: omercansabun@icloud.com
`;

// --- THREE.JS OUTRUN GRID MOUNTAINS ---
let scene, camera, renderer;
let terrain;
let clock;
let simplex;
let aiState = 'IDLE'; 
let speedMultiplier = 1;

function initThreeJS() {
    const canvas = document.getElementById('synth-canvas');
    scene = new THREE.Scene();
    
    // Low camera angle to see the horizon
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 0, -50);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false }); // No antialias for retro feel
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    clock = new THREE.Clock();
    simplex = new SimplexNoise();

    // The Grid/Mountains
    const geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({ 
        color: 0xff007f, // Neon Pink wireframe
        wireframe: true,
        transparent: true,
        opacity: 0.5
    });

    terrain = new THREE.Mesh(geometry, material);
    scene.add(terrain);

    // Fog to fade out into the dark purple
    scene.fog = new THREE.FogExp2(0x110022, 0.012);

    function animate() {
        requestAnimationFrame(animate);
        const time = clock.getElapsedTime();

        // Target speeds based on AI state
        let targetSpeed = aiState === 'IDLE' ? 10 : (aiState === 'CONNECTING' ? 40 : 80);
        // Smoothly ramp speed
        speedMultiplier += (targetSpeed - speedMultiplier) * 0.05;

        // Animate Vertices to simulate moving forward over procedural terrain
        const positionAttribute = geometry.attributes.position;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);

            // Simplex noise based on world position X and an offset Z that scrolls over time
            // Create a valley in the center (where x is close to 0)
            const distFromCenter = Math.abs(vertex.x);
            let valleyMask = 1;
            if (distFromCenter < 15) {
                valleyMask = distFromCenter / 15; // Smooth valley
            }
            
            // Generate Noise Terrain
            const noise = simplex.noise2D(
                vertex.x * 0.05, 
                (vertex.z - time * speedMultiplier) * 0.05 // Scroll Z
            );

            // Apply height, masking the center road
            vertex.y = Math.max(0, noise * 20 * valleyMask); 
            
            positionAttribute.setY(i, vertex.y);
        }

        positionAttribute.needsUpdate = true;
        
        // Move camera slightly
        camera.position.x = Math.sin(time*0.5) * 2;
        camera.lookAt(0, 5, -50);

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
    document.getElementById('driveStatus').textContent = aiState === 'IDLE' ? translations[currentLang].driveIdle : translations[currentLang].driveActive;
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
    if (m.length >= MAX_FUEL) return { allowed: false };
    return { allowed: true, remaining: MAX_FUEL - m.length };
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
            tb.textContent = `TANK EMPTY.`;
            tb.className = 'error';
        } else {
            tb.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/${MAX_FUEL} ${translations[currentLang].suffix}`;
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
        generationConfig: { temperature: 0.8, maxOutputTokens: 8192 } 
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
                while(m.length<MAX_FUEL) m.push(Date.now());
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
                await new Promise(r => setTimeout(r, 10)); // Fast printing, high speed 
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
        if (window === window.top) { API_KEY = prompt("API Key req:"); }
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("OUT OF GAS", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ENGINE HALTED";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("ENGAGED...", false);
    
    aiState = 'CONNECTING'; // Ramps up speed to 40
    document.getElementById('driveStatus').textContent = translations[currentLang].driveActive;
    document.getElementById('driveStatus').style.color = '#ff007f';
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING'; // Ramps speed to 80 (Hyperdrive)
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            wScroller.scrollTop = wScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE'; // Drop back to cruise speed
        document.getElementById('driveStatus').textContent = translations[currentLang].driveIdle;
        document.getElementById('driveStatus').style.color = 'var(--w-sun-top)';

        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        wScroller.scrollTop = wScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
