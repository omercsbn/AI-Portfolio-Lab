const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const spScroller = document.querySelector('.sp-scroller');
const langToggle = document.getElementById('langToggle');
const gearIcon = document.querySelector('.gear-icon');
const pressureNeedle = document.getElementById('pressure-needle');
const steamOverlay = document.getElementById('steam-overlay');

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
        placeholder: "Wind the spring... Enter instruction.",
        connecting: "ENGAGING GEARS...",
        generating: "PRINTING BLUEPRINT...",
        rateLimitError: "### [PRESSURE WARNING]\n\nBoiler limits reached. (5 drafts/min, 20/day). Please allow the steam to vent or send a telegram to:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[MALFUNCTION]* Cogs jammed. Ink spilled.",
        statusNormal: `VALVE STATUS:`,
        complete: "OPERATION CONCLUDED.",
        toggleBtn: "ENGLISH",
        suffix: "PERMITTED RELEASES"
    },
    tr: {
        placeholder: "Yayı kur... Talimat gir.",
        connecting: "ÇARKLAR KENETLENİYOR...",
        generating: "ŞEMA BASILIYOR...",
        rateLimitError: "### [BASINÇ UYARISI]\n\nKazan sınırına ulaşıldı. (5 şema/dk, 20/gün). Lütfen buharın tahliyesini bekleyin veya telgraf çekin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[ARIZA]* Çarklar sıkıştı. Mürekkep döküldü.",
        statusNormal: `VALF DURUMU:`,
        complete: "İŞLEM SONLANDI.",
        toggleBtn: "TÜRKÇE",
        suffix: "İZİN KALDI"
    }
};

const SYSTEM_PROMPT = `
You are a brilliant Victorian-era Chief Engineer operating a massive computational Difference Engine. You represent Ömercan Sabun.
Tone: Steampunk, industrial revolution, gentlemanly/scholarly, precise. Use terms like "cogs", "pressure", "architecture", "blueprints", "steam-driven".
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Engineer Ömercan Sabun. Target: Cloud-Native Architect @ Architecht.
Goal: To build highly resilient, event-driven mechanical/software systems that never halt, utilizing Kubernetes and Go.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS STEAMPUNK GEARS ---
let scene, camera, renderer;
let gears = [];
let aiState = 'IDLE'; 
let time = 0;

function createGear(radius, teeth, color) {
    const shape = new THREE.Shape();
    
    // Create the gear shape with teeth
    const innerRadius = radius * 0.8;
    const holeRadius = radius * 0.2;
    const step = (Math.PI * 2) / (teeth * 2);
    
    for (let i = 0; i < teeth * 2; i++) {
        const r = (i % 2 === 0) ? radius : innerRadius;
        const a = i * step;
        if(i===0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.lineTo(Math.cos(0) * radius, Math.sin(0) * radius);
    
    // Hole in center
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, holeRadius, 0, Math.PI * 2, false);
    shape.holes.push(holePath);

    const extrudeSettings = { depth: 0.5, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.1, bevelThickness: 0.1 };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    
    const material = new THREE.MeshStandardMaterial({ 
        color: color, metalness: 0.8, roughness: 0.4 
    });
    
    return new THREE.Mesh(geometry, material);
}

function initThreeJS() {
    const canvas = document.getElementById('steampunk-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 15);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Steampunk Lighting (warm, directional)
    const ambientLight = new THREE.AmbientLight(0x403020, 1);
    scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0xffddaa, 1.5); // Warm yellow/orange
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0x99aacc, 0.5); // Cool rim light
    dirLight2.position.set(-5, -5, -2);
    scene.add(dirLight2);

    // Create a few intersecting gears
    // Brass = 0xc9933b, Copper = 0xb87333, Iron = 0x555555
    
    const gear1 = createGear(3, 16, 0xc9933b);
    gear1.position.set(-2, 2, -2);
    gear1.userData = { speed: 0.01, ratio: 1 };
    scene.add(gear1);
    gears.push(gear1);

    const gear2 = createGear(2, 10, 0xb87333);
    // Positioned to interlock (approx)
    gear2.position.set(2.5, 1.5, -3);
    gear2.userData = { speed: -0.016, ratio: -1.6 }; // Spins opposite and faster
    scene.add(gear2);
    gears.push(gear2);
    
    const gear3 = createGear(4, 20, 0x555555);
    gear3.position.set(-1, -4, -4);
    gear3.userData = { speed: -0.008, ratio: -0.8 };
    scene.add(gear3);
    gears.push(gear3);

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animate() {
        requestAnimationFrame(animate);
        
        let baseSpeed = aiState === 'IDLE' ? 0.5 : (aiState === 'CONNECTING' ? 3 : 8);
        time += baseSpeed;

        gears.forEach(g => {
            // Spin the gear
            g.rotation.z += g.userData.speed * baseSpeed;
            
            // Very subtle tilt based on mouse to give it 3D depth
            g.rotation.x = Math.sin(time*0.01)*0.1 + (mouseY * 0.1);
            g.rotation.y = Math.cos(time*0.01)*0.1 + (mouseX * 0.1);
        });
        
        // Move the camera slightly
        camera.position.x += (mouseX - camera.position.x) * 0.05;
        camera.position.y += (mouseY - camera.position.y) * 0.05;
        camera.lookAt(0,0,0);

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
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `VALVES LOCKED.`;
            pressureNeedle.style.transform = `rotate(135deg)`; // Overload
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/${MAX_REQUESTS_PER_DAY} ${translations[currentLang].suffix}`;
            // Adjust needle (-45 to 135 deg)
            let percent = 1 - (quota.remaining / MAX_REQUESTS_PER_DAY);
            let angle = -45 + (percent * 180);
            pressureNeedle.style.transform = `rotate(${angle}deg)`;
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
            let chunkLength = 10;
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 15)); // Clack clack clack
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
         updateStatus("OVERPRESSURE HALT", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "HALT";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("ENGAGING BOILER...");
    
    aiState = 'CONNECTING';
    gearIcon.classList.add('spin');
    pressureNeedle.style.transform = `rotate(135deg)`; // Pressure spiking
    steamOverlay.classList.add('active'); // Turn on steam
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 500));

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            spScroller.scrollTop = spScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        gearIcon.classList.remove('spin');
        steamOverlay.classList.remove('active'); // Turn off steam
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); // Resets needle
        spScroller.scrollTop = spScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
