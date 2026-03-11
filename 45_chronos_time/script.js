const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const cScroller = document.querySelector('.c-scroller');
const langToggle = document.getElementById('langToggle');
const localTimeEl = document.getElementById('localTime');
const pendulumEl = document.querySelector('.pendulum');

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
        placeholder: "Query the timeline...",
        connecting: "Winding mainspring...",
        generating: "Synchronizing timelines...",
        rateLimitError: "### [MAINSPRING SNAPPED]\n\nTension exceeds limits. (5 queries/min, 20/day). Let the cogs rest, or dispatch an urgent missive to:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[DESYNC]* The timeline became corrupted.",
        statusNormal: `Mainspring tension:`,
        complete: "Synchronization complete.",
        toggleBtn: "EN",
        suffix: "uses remaining"
    },
    tr: {
        placeholder: "Zaman çizelgesine sor...",
        connecting: "Zemberek kuruluyor...",
        generating: "Zamanlar senkronize ediliyor...",
        rateLimitError: "### [ZEMBEREK KOPTU]\n\nGerilim sınırları aşıldı. (5 sorgu/dk, 20/gün). Çarkları dinlendirin veya acil mesaj gönderin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[DESENKRONİZASYON]* Zaman çizgisi bozuldu.",
        statusNormal: `Zemberek gerilimi:`,
        complete: "Senkronizasyon tamamlandı.",
        toggleBtn: "TR",
        suffix: "kullanım kaldı"
    }
};

const SYSTEM_PROMPT = `
You are the Grand Chronometrist representing Ömercan Sabun.
Tone: Elegant, highly precise, clockmaker metaphors. Use terms like "synchronization", "latency", "async", "cogs", "mainspring", "event-sourcing", "temporal".
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. Cloud-Native Architect.
Philosophy: Event-driven architecture is like a masterfully tuned watch. Asynchronous messages are the gears that keep the distributed system in perfect, non-blocking rhythm. 
Contact: omercansabun@icloud.com
`;

// Helper: Convert int to Roman numeral
function toRoman(num) {
    const lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
    let roman = '', i;
    for ( i in lookup ) {
        while ( num >= lookup[i] ) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}

// Update local time
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();
    let s = now.getSeconds();
    
    // convert hours to 12 format then roman
    h = h % 12;
    if(h === 0) h = 12;
    let romanHour = toRoman(h);
    
    // pad minutes and seconds
    m = m < 10 ? '0'+m : m;
    s = s < 10 ? '0'+s : s;

    localTimeEl.textContent = `${romanHour} : ${m} : ${s}`;
}
setInterval(updateClock, 1000);
updateClock();

// --- THREE.JS EXPLODED WATCH MECHANISM ---
let scene, camera, renderer;
let clockGroup;
let gears = [];
let aiState = 'IDLE'; 

function createGear(radius, teeth, color) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); // Need to define outer and inner structure
    // Let's make an easier pseudo-gear using a Cylinder and ring
    
    const group = new THREE.Group();
    
    // Gear body (thin cylinder)
    const bodyGeo = new THREE.CylinderGeometry(radius*0.8, radius*0.8, 0.1, 32);
    // Gear teeth (larger cylinder, fewer segments)
    const teethGeo = new THREE.CylinderGeometry(radius, radius, 0.1, teeth);
    // Inner hole
    const holeGeo = new THREE.CylinderGeometry(radius*0.2, radius*0.2, 0.15, 16);
    
    const material = new THREE.MeshStandardMaterial({ 
        color: color, metalness: 0.9, roughness: 0.4
    });
    
    const body = new THREE.Mesh(bodyGeo, material);
    const outer = new THREE.Mesh(teethGeo, material);
    
    group.add(body);
    group.add(outer);
    
    // Cut out spokes (fake it by adding black/dark boxes or using a transparent map, simpler to just add spokes)
    for(let i=0; i<4; i++) {
        const spokeGeo = new THREE.BoxGeometry(radius*1.6, 0.11, radius*0.1);
        const spoke = new THREE.Mesh(spokeGeo, material);
        spoke.rotation.y = (Math.PI / 4) * i;
        group.add(spoke);
    }
    
    group.rotation.x = Math.PI / 2; // Face forward
    return group;
}

function initThreeJS() {
    const canvas = document.getElementById('clock-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 30);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Dynamic dramatic lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    
    const spotLight = new THREE.SpotLight(0xffdf80, 2);
    spotLight.position.set(15, 20, 20);
    spotLight.angle = Math.PI/4;
    spotLight.penumbra = 0.5;
    scene.add(spotLight);
    
    const blueLight = new THREE.DirectionalLight(0x0055ff, 0.5);
    blueLight.position.set(-15, -10, 10);
    scene.add(blueLight);

    clockGroup = new THREE.Group();
    scene.add(clockGroup);

    // Construct Exploded View
    // Z-spacing creates the "exploded" look
    
    // Back Plate (Dark brass)
    const plateGeo = new THREE.CylinderGeometry(12, 12, 0.2, 64);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x221a00, metalness: 0.8, roughness: 0.6 });
    const backPlate = new THREE.Mesh(plateGeo, plateMat);
    backPlate.rotation.x = Math.PI / 2;
    backPlate.position.z = -5;
    clockGroup.add(backPlate);

    // Large main gear
    const g1 = createGear(5, 48, 0xd4af37); // Gold
    g1.position.set(-2, 2, -2);
    g1.userData = { speed: -0.005 };
    clockGroup.add(g1);
    gears.push(g1);

    // Medium secondary gear interacting
    const g2 = createGear(3, 24, 0xb87333); // Copper
    g2.position.set(3, 1, 0);
    g2.userData = { speed: 0.01 };
    clockGroup.add(g2);
    gears.push(g2);

    // Small fast gear
    const g3 = createGear(1.5, 12, 0xd4af37);
    g3.position.set(2, -3, 2);
    g3.userData = { speed: -0.03 };
    clockGroup.add(g3);
    gears.push(g3);

    // Clock Hands floating way in front
    const minuteHandGeo = new THREE.BoxGeometry(0.2, 8, 0.1);
    const handMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.2 });
    const minuteHand = new THREE.Mesh(minuteHandGeo, handMat);
    minuteHand.position.set(0, 3, 5);
    minuteHand.geometry.translate(0, 3.5, 0); // pivot offset
    minuteHand.userData = { speed: -0.001 };
    clockGroup.add(minuteHand);
    gears.push(minuteHand);

    function animate() {
        requestAnimationFrame(animate);

        // General slow rotation of the whole watch depending on mouse/idle
        clockGroup.rotation.y = Math.sin(Date.now()*0.0005) * 0.2;
        clockGroup.rotation.x = Math.cos(Date.now()*0.0007) * 0.1;

        // Speed multiplier based on state
        let timeWarp = 1;
        if (aiState === 'CONNECTING') {
            timeWarp = -5; // Hands rewind rapidly
        } else if (aiState === 'GENERATING') {
            timeWarp = 15; // Fast forward
        }

        // Rotate individual gears
        gears.forEach(g => {
            // Because they are rotated Math.PI/2 on X, their Z is the visual face rotation
            if(g.geometry.type === 'BoxGeometry') {
                 // The hand rotates on Z
                 g.rotation.z += g.userData.speed * timeWarp;
            } else {
                 g.rotation.y += g.userData.speed * timeWarp;
            }
        });

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
    const stat = document.querySelector('.c-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'c-telemetry error' : 'c-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `MECHANISM BROKEN.`;
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
            let chunkLength = 10; // slightly faster stream delivery
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 12)); 
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
         updateStatus("TENSION OVERLOAD", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "FATAL ERROR";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("ENGAGING GEARS...");
    
    aiState = 'CONNECTING';
    
    heroSection.classList.add('hidden');
    pendulumEl.classList.remove('swinging');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600));

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        pendulumEl.classList.add('swinging'); // Pendulum swings frantically
        
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
        pendulumEl.classList.remove('swinging');
        
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
