const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const pScroller = document.querySelector('.p-scroller');
const langToggle = document.getElementById('langToggle');
const pencilIcon = document.querySelector('.pencil-icon');

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
mermaid.initialize({ startOnLoad: false, theme: 'neutral', themeVariables: { fontFamily: 'Patrick Hand', fontSize: '18px' } });

const translations = {
    en: {
        placeholder: "Write on the cardboard...",
        connecting: "Unfolding geometry...",
        generating: "Sketching architecture...",
        rateLimitError: "### [OUT OF INK]\n\nMarker ran dry. (5 strokes/min, 20/day). Grab a new pen later or tell the architect:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[TEAR]* The paper ripped.",
        statusNormal: `Ink left:`,
        complete: "Diorama assembled.",
        toggleBtn: "EN",
        suffix: "strokes"
    },
    tr: {
        placeholder: "Kartona yaz...",
        connecting: "Kartlar katlanıyor...",
        generating: "Mimari çiziliyor...",
        rateLimitError: "### [MÜREKKEP BİTTİ]\n\nKalem kurudu. (5 çizim/dk, 20/gün). Sonra yeni kalem al veya mimara söyle:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[YIRTILMA]* Kağıt koptu.",
        statusNormal: `Kalan mürekkep:`,
        complete: "Diorama tamamlandı.",
        toggleBtn: "TR",
        suffix: "çizim"
    }
};

const SYSTEM_PROMPT = `
You are a Prototyping Cloud Architect representing Ömercan Sabun, working entirely with cardboard and paper mockups.
Tone: Playful, creative, tactile, enthusiastic ("Let's cut this out!", "Fold this API here"). Use metaphors of papercraft, cardboard, tape, glue, scissors, and sketches.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. Cardboard Architect.
Philosophy: You shouldn't write code until you've modeled the system in cardboard. Infrastructure as Code is just digital papercraft. If the cardboard model falls over, the real servers will too. Let's prototype.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS PAPERCRAFT DIORAMA ---
let scene, camera, renderer;
let paperPlanes = [];
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('paper-canvas');
    scene = new THREE.Scene();
    
    // Orthographic for a flat, diorama feel
    const aspect = window.innerWidth / window.innerHeight;
    const d = 15;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100);
    camera.position.set(0, -10, 30);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Crucial for paper shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting (Harsh directional for strong drop shadows)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(-10, 20, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    // Cardboard Material
    const cardboardMat = new THREE.MeshLambertMaterial({ 
        color: 0xcdad7a, 
        side: THREE.DoubleSide
    });
    // White Paper Material
    const paperMat = new THREE.MeshLambertMaterial({ 
        color: 0xfdfbf7, 
        side: THREE.DoubleSide
    });

    // Invisible background floor to catch shadows
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.ShadowMaterial({ opacity: 0.2 })
    );
    floor.position.z = -5;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create scattered pop-up elements
    for(let i=0; i<20; i++) {
        const isCardboard = Math.random() > 0.5;
        const mat = isCardboard ? cardboardMat : paperMat;
        
        // Primitive shapes to represent boxes/servers
        const geos = [
            new THREE.PlaneGeometry(3 + Math.random()*2, 4 + Math.random()*3),
            new THREE.BoxGeometry(2+Math.random()*2, 2+Math.random()*2, 2+Math.random()*2)
        ];
        
        const mesh = new THREE.Mesh(geos[Math.floor(Math.random() * geos.length)], mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.position.set(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 40,
            (isCardboard && mesh.geometry.type === 'BoxGeometry') ? 1 : 0
        );
        mesh.rotation.set(
            (Math.random() - 0.5) * 0.2, // lie mostly flat
            (Math.random() - 0.5) * 0.2,
            Math.random() * Math.PI
        );
        
        // Base rotations for pop-up effect
        mesh.userData = {
            baseRotX: mesh.rotation.x,
            baseRotY: mesh.rotation.y,
            tRotX: mesh.rotation.x, // target
            tRotY: mesh.rotation.y
        };

        scene.add(mesh);
        paperPlanes.push(mesh);
    }

    function animate() {
        requestAnimationFrame(animate);

        // Low framerate simulator for stop-motion effect
        const now = Date.now();
        if (now % 100 < 20) { 

            paperPlanes.forEach(plane => {
                // If generating, make them stand up like a pop-up book
                if (aiState === 'CONNECTING' || aiState === 'GENERATING') {
                    plane.userData.tRotX = -Math.PI / 2 + (Math.random()-0.5)*0.2; // Stand up
                } else {
                    plane.userData.tRotX = plane.userData.baseRotX; // Fall flat
                }

                // Spring physics interpolation
                plane.rotation.x += (plane.userData.tRotX - plane.rotation.x) * 0.1;
                
                // Add jitter
                if(aiState === 'GENERATING') {
                    plane.rotation.z += (Math.random() - 0.5) * 0.05;
                }
            });

            // Camera slow drift
            camera.position.x = Math.sin(now * 0.0005) * 3;
            camera.lookAt(0,0,0);

            renderer.render(scene, camera);
        }
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
    pencilIcon.style.animationDuration = "0.05s";
    setTimeout(() => pencilIcon.style.animationDuration = "0.2s", 500);
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
    const stat = document.querySelector('.p-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'p-telemetry error' : 'p-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `PENCIL BROKEN.`;
            stat.className = 'p-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/5 ${translations[currentLang].suffix}`;
            stat.className = 'p-telemetry';
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
            let chunkLength = 10; // Slow, feels like handwriting
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 20)); 
            }
            onChunk(fullText);
        } else {
             onChunk(translations[currentLang].errorDefault);
        }
    } catch (error) {
        if(error.message === "429") onChunk(translations[currentLang].rateLimitError);
        else onChunk(`*[WIPEOUT]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("PAPER JAM", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "PAPER JAM ERROR";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("DRAWING...");
    pencilIcon.style.animationDuration = "0.05s"; // Fast scribble
    
    aiState = 'CONNECTING';
    
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
            pScroller.scrollTop = pScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        pencilIcon.style.animationDuration = "2s"; // Rest scribble
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        pScroller.scrollTop = pScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
