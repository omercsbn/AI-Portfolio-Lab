const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const pScroller = document.querySelector('.p-scroller');
const langToggle = document.getElementById('langToggle');
const shimmerDot = document.querySelector('.shimmer-dot');

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
        placeholder: "Project beam...",
        connecting: "Focusing Light...",
        generating: "Refracting Data...",
        rateLimitError: "### [PRISM FRACTURE]\n\nCapacity reached. (Max 5/min, 20/day). Await cooldown or contact:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[FLAW]* Unprocessable optics.",
        statusNormal: `Prism intact. Quota:`,
        complete: "Projection Complete.",
        toggleBtn: "Language"
    },
    tr: {
        placeholder: "Işını yönelt...",
        connecting: "Işık Odaklanıyor...",
        generating: "Veri Kırılıyor...",
        rateLimitError: "### [PRİZMA KIRIĞI]\n\nKapasiteye ulaşıldı. Soğumayı bekleyin veya iletişime geçin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[KUSUR]* İşlenemeyen optikler.",
        statusNormal: `Prizma sağlam. Kota:`,
        complete: "Projeksiyon Tamamlandı.",
        toggleBtn: "Dil seçimi"
    }
};

const SYSTEM_PROMPT = `
You are the crystalline, highly refined intelligence proxy for Ömercan Sabun.
Tone: Premium, minimalist, clear, corporate-executive, extremely concise. Words are like cut glass—precise and brilliant.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Cloud-Native Architect.
Firm: Architecht
Philosophy: Extreme clarity in architecture. Stripping away the unnecessary to reveal the core truth of a system (Event-Driven, Kubernetes, Go).
Contact: omercansabun@icloud.com
`;

// --- THREE.JS MINIMALIST GLASS PRISM ---
let scene, camera, renderer, prismMesh;
let aiState = 'IDLE'; // IDLE, CONNECTING, GENERATING
let time = 0;

function initThreeJS() {
    const canvas = document.getElementById('prism-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 10;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Very bright, clean lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0xdbeafe, 1); // Slight blue tint
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Icosahedron looks very crystalline and elegant
    const geometry = new THREE.IcosahedronGeometry(2, 0); 
    
    // Highly reflective physical material
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0,
        transmission: 1.0, // glass-like
        thickness: 1.5,
        ior: 1.5, // index of refraction
        reflectivity: 1,
        clearcoat: 1,
        clearcoatRoughness: 0,
        transparent: true,
        opacity: 1
    });

    prismMesh = new THREE.Mesh(geometry, material);
    scene.add(prismMesh);

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animate() {
        requestAnimationFrame(animate);
        time += 0.01;

        let speedMult = aiState === 'IDLE' ? 1 : (aiState === 'CONNECTING' ? 3 : 6);
        
        prismMesh.rotation.y += 0.005 * speedMult;
        prismMesh.rotation.x += 0.002 * speedMult;

        // Smoothly move towards mouse
        prismMesh.position.x += (mouseX - prismMesh.position.x) * 0.05;
        prismMesh.position.y += (mouseY - prismMesh.position.y) * 0.05;

        // Animate material properties based on state
        if(aiState === 'GENERATING') {
             // Simulate intensive light refraction
             material.color.setHSL((time*0.5)%1, 0.8, 0.5);
             material.thickness = 1.5 + Math.sin(time*20)*0.5;
             prismMesh.scale.set(1 + Math.sin(time*10)*0.05, 1 + Math.sin(time*10)*0.05, 1 + Math.sin(time*10)*0.05);
        } else {
             material.color.setHex(0xffffff);
             material.thickness = 1.5;
             prismMesh.scale.set(1, 1, 1);
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
    const stat = document.querySelector('.p-status');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'p-status error' : 'p-status';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `PRISM FRACTURED`;
            stat.className = 'p-status error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}`;
            stat.className = 'p-status';
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
            let chunkLength = 15; // Smooth flowing text
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
        else onChunk(`*[ERR]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("OVERLOAD", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "FRACTURE";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("ALIGNING...");
    
    aiState = 'CONNECTING';
    shimmerDot.classList.add('active');
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 500));

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        
        let completeMarkdown = "";
        
        // Custom markdown renderer to keep it hyper-clean
        const renderer = new marked.Renderer();
        renderer.link = function(href, title, text) {
             return `<a target="_blank" href="${href}" title="${title || ''}">${text}</a>`;
        };

        marked.setOptions({ renderer: renderer });
        
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
        shimmerDot.classList.remove('active');
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus();
        pScroller.scrollTop = pScroller.scrollHeight;
        
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
