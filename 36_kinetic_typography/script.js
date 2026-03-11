const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const kScroll = document.querySelector('.k-content-area');
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
mermaid.initialize({ startOnLoad: false, theme: 'default' });

const translations = {
    en: {
        placeholder: "ENTER DIRECTIVE",
        connecting: "PARSING...",
        generating: "EXECUTING...",
        rateLimitError: "### [DENIED]\n\nQUOTA EXCEEDED. (5/MIN, 20/DAY). HALL: [hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[FAIL]* UNPROCESSABLE INPUT.",
        statusNormal: `SYSTEM STATUS: OK | CYCLES:`,
        complete: "DONE.",
        toggleBtn: "EN"
    },
    tr: {
        placeholder: "DİREKTİF GİRİNİZ",
        connecting: "ÇÖZÜMLENİYOR...",
        generating: "YÜRÜTÜLÜYOR...",
        rateLimitError: "### [REDDEDİLDİ]\n\nKOTA AŞILDI. (5/DK, 20/GÜN). İLETİŞİM: [hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[HATA]* İŞLENEMEYEN GİRDİ.",
        statusNormal: `SİSTEM DURUMU: OK | DÖNGÜ:`,
        complete: "DEŞARJ.",
        toggleBtn: "TR"
    }
};

const SYSTEM_PROMPT = `
You are TYPE_CORE, a brutalist intelligence proxy for Ömercan Sabun.
Tone: Loud, declarative, highly technical, uncompromising. Short sentences. High impact.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun.
Role: Cloud-Native Architect @ Architecht.
Beliefs: Software is concrete. Microservices are the rebar holding it together. Stop building monoliths; they crack. Use Go, Kubernetes, Event-Driven patterns.
Contact: hello@omercan.dev
`;

// --- THREE.JS KINETIC WORDS ---
// NOTE: We need a font for Three.js. We usually load a JSON font.
// Since we don't have a local JSON font, we will use a fallback strategy: floating simple geometric shapes 
// that look like physical blocks tumbling if font loading fails, or attempt to load a standard threejs font via CDN.

let scene, camera, renderer;
let wordMeshes = [];
let aiState = 'IDLE'; // IDLE, CONNECTING, GENERATING
let time = 0;

function initThreeJS() {
    const canvas = document.getElementById('type-canvas');
    scene = new THREE.Scene();
    
    // Orthographic for that flat poster feel
    const aspect = window.innerWidth / window.innerHeight;
    const d = 30;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(0, 0, 50);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040, 2)); // Soft white light

    // Load Font
    const loader = new THREE.FontLoader();
    // Using a common three.js font from CDN
    loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/helvetiker_bold.typeface.json', function (font) {
        
        const words = ['ARCHITECTURE', 'SYSTEM', 'NODE', 'BUILD', 'SCALE', 'DATA', 'CORE'];
        const material = new THREE.MeshToonMaterial({ color: 0x111111 }); // dark grey

        words.forEach((text, i) => {
            const geometry = new THREE.TextGeometry(text, {
                font: font,
                size: 5,
                height: 1.5,
                curveSegments: 2,
                bevelEnabled: false
            });
            
            geometry.center();

            const mesh = new THREE.Mesh(geometry, material);
            
            // Random scatter
            mesh.position.set(
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 20
            );
            
            mesh.userData = {
                vRotX: (Math.random() - 0.5) * 0.02,
                vRotY: (Math.random() - 0.5) * 0.02,
                vRotZ: (Math.random() - 0.5) * 0.01,
                vPosX: (Math.random() - 0.5) * 0.1,
                vPosY: (Math.random() - 0.5) * 0.1,
                baseY: mesh.position.y,
                baseX: mesh.position.x
            };

            wordMeshes.push(mesh);
            scene.add(mesh);
        });

    }, undefined, function() {
        console.error("Failed to load 3D font.");
    });


    function animate() {
        requestAnimationFrame(animate);
        time += 0.05;

        // Animate floating words
        wordMeshes.forEach(mesh => {
            let speed = aiState === 'GENERATING' ? 5 : (aiState === 'CONNECTING' ? 2 : 1);
            
            mesh.rotation.x += mesh.userData.vRotX * speed;
            mesh.rotation.y += mesh.userData.vRotY * speed;
            mesh.rotation.z += mesh.userData.vRotZ * speed;
            
            mesh.position.y += Math.sin(time + mesh.position.x) * 0.02 * speed;
            
            // If connecting, clump them together briefly
            if(aiState === 'CONNECTING') {
                mesh.position.x += (0 - mesh.position.x) * 0.05;
                mesh.position.y += (0 - mesh.position.y) * 0.05;
            } else if (aiState === 'GENERATING') {
                // Scatter wildly, snap to random rotations
                if(Math.random() > 0.95) {
                    mesh.rotation.x = Math.PI * 0.5 * Math.floor(Math.random()*4);
                }
            } else {
                // Return to base slowly
                mesh.position.x += (mesh.userData.baseX - mesh.position.x) * 0.01;
            }

        });

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
        rateLimitStatus.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `SYSTEM HALTED`;
            rateLimitStatus.className = 'error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${MAX_REQUESTS_PER_DAY - quota.remaining}/${MAX_REQUESTS_PER_DAY}`;
            rateLimitStatus.className = '';
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
            let chunkLength = 12;
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
        else onChunk(`*[SYS_ERR]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("BLOCK", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "STOP";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("SENDING...");
    
    aiState = 'CONNECTING';
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 300)); // Fast

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            kScroll.scrollTop = kScroll.scrollHeight;
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
        kScroll.scrollTop = kScroll.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
