const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const bScroller = document.querySelector('.b-scroller');
const langToggle = document.getElementById('langToggle');

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
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { fontFamily: 'Space Grotesk', primaryColor: '#00ffcc', primaryTextColor: '#000', primaryBorderColor: '#000', lineColor: '#000', secondaryColor: '#ff6b6b', tertiaryColor: '#fff' } });

const translations = {
    en: {
        placeholder: "ENTER QUERY...",
        connecting: "INITIALIZING...",
        generating: "COMPUTING...",
        rateLimitError: "### 🛑 RATE LIMIT HIT\n\nYou're spamming the server. (5 req/min, 20/day).\nRefresh later or ping the admin:\n[HELLO@OMERCAN.DEV](mailto:omercansabun@icloud.com).",
        errorDefault: "*[ERROR]* Bad Request.",
        statusNormal: `REMAINING QUOTA:`,
        complete: "DONE.",
        toggleBtn: "EN",
    },
    tr: {
        placeholder: "SORGULAYIN...",
        connecting: "BAŞLATILIYOR...",
        generating: "HESAPLANIYOR...",
        rateLimitError: "### 🛑 LİMİT AŞILDI\n\nSunucuyu spamliyorsun. (5 istek/dk, 20/gün).\nSonra tekrar dene veya admine yaz:\n[HELLO@OMERCAN.DEV](mailto:omercansabun@icloud.com).",
        errorDefault: "*[HATA]* Geçersiz İstek.",
        statusNormal: `KALAN KOTA:`,
        complete: "TAMAMLANDI.",
        toggleBtn: "TR",
    }
};

const SYSTEM_PROMPT = `
You are a Neobrutalist Cloud Architect representing Ömercan Sabun.
Tone: Loud, confident, direct, no-nonsense. Use short sentences. Focus on raw performance, 100% uptime, and indestructible infrastructure. Cut the corporate fluff.
Speak in the input language (TR/EN).
Use Markdown heavily. Use headers, bold text, and bullet points. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun
Role: Cloud Architect / Backend Destroyer
Philosophy: Microservices shouldn't be fragile. If a node goes down, the system should laugh and route traffic immediately. I build backend systems that take a beating and keep running.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS PRIMITIVE PHYSICS (Fake Physics) ---
let scene, camera, renderer;
let shapes = [];
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('brutal-canvas');
    scene = new THREE.Scene();
    
    // Orthographic for that flat 2.5D look
    const aspect = window.innerWidth / window.innerHeight;
    const d = 20;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100);
    camera.position.set(0, 0, 50);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Flat shading, high contrast
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // Create huge, dumb primitives
    const materials = [
        new THREE.MeshStandardMaterial({ color: 0xff6b6b, flatShading: true }), // Pink
        new THREE.MeshStandardMaterial({ color: 0x00ffcc, flatShading: true }), // Teal
        new THREE.MeshStandardMaterial({ color: 0xc4a1ff, flatShading: true }), // Purple
        new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }), // White
        new THREE.MeshLambertMaterial({ color: 0x000000 }) // Black
    ];

    const geometries = [
        new THREE.BoxGeometry(8, 8, 8),
        new THREE.TorusGeometry(6, 2, 8, 24),
        new THREE.ConeGeometry(6, 12, 8),
        new THREE.DodecahedronGeometry(6)
    ];

    for(let i=0; i<15; i++) {
        const mat = materials[Math.floor(Math.random() * materials.length)];
        const geo = geometries[Math.floor(Math.random() * geometries.length)];
        const mesh = new THREE.Mesh(geo, mat);
        
        // Add thick black edges for the brutalist rendering style
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }));
        mesh.add(line);

        mesh.position.set(
            (Math.random() - 0.5) * 60,
            (Math.random() - 0.5) * 60,
            (Math.random() - 0.5) * 20 - 10
        );
        mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
        
        // Custom fake physics properties
        mesh.userData = {
            velocity: new THREE.Vector3((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1, 0),
            rotSpeed: (Math.random()-0.5)*0.02,
            baseScale: 1
        };

        scene.add(mesh);
        shapes.push(mesh);
    }

    function animate() {
        requestAnimationFrame(animate);

        shapes.forEach(shape => {
            // Apply velocity
            shape.position.add(shape.userData.velocity);
            shape.rotation.x += shape.userData.rotSpeed;
            shape.rotation.y += shape.userData.rotSpeed;

            // Bounce off walls (approximate)
            if(shape.position.x > 30 || shape.position.x < -30) shape.userData.velocity.x *= -1;
            if(shape.position.y > 20 || shape.position.y < -20) shape.userData.velocity.y *= -1;

            // AI State Reactions
            if (aiState === 'CONNECTING') {
                shape.rotation.x += 0.1; // Seizure mode
                shape.scale.setLength(1.2);
            } else if (aiState === 'GENERATING') {
                // Slam them up and down
                shape.position.y += Math.sin(Date.now()*0.01 + shape.position.x) * 0.5;
                shape.scale.setLength(1.0);
            } else {
                shape.scale.setLength(1.0);
            }
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
    const statBox = document.querySelector('.b-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        statBox.className = isError ? 'b-telemetry brutal-box error' : 'b-telemetry brutal-box';
        if(isError) statBox.style.background = '#000';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `QUOTA DEPLETED.`;
            statBox.className = 'b-telemetry brutal-box error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/5`;
            statBox.className = 'b-telemetry brutal-box inline';
            statBox.style.background = 'var(--b-pink)';
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
            let chunkLength = 30; // Fast printing for brutalist style
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
        else onChunk(`*[SYS_ERR]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("HALT", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "LIMIT HIT";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("SENDING...", false);
    
    aiState = 'CONNECTING';
    
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
            bScroller.scrollTop = bScroller.scrollHeight;
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
        bScroller.scrollTop = bScroller.scrollHeight;
        
    }, 200);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
