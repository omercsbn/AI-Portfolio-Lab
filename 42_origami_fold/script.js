const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const oScroller = document.querySelector('.o-scroller');
const langToggle = document.getElementById('langToggle');
const oDot = document.querySelector('.o-dot');

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
mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

const translations = {
    en: {
        placeholder: "Write on the blank page...",
        connecting: "Folding thoughts...",
        generating: "Taking shape...",
        rateLimitError: "### [INK DRY]\n\nThe pages are full. (5 drafts/min, 20/day). Rest your hands, or send paper via:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[TEAR]* The paper tore. Try again.",
        statusNormal: `Pages remaining:`,
        complete: "Design complete.",
        toggleBtn: "EN"
    },
    tr: {
        placeholder: "Boş sayfaya yaz...",
        connecting: "Düşünceler katlanıyor...",
        generating: "Şekil alıyor...",
        rateLimitError: "### [MÜREKKEP BİTTİ]\n\nSayfalar doldu. (5 taslak/dk, 20/gün). Ellerinizi dinlendirin veya mektup gönderin:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[YIRTIK]* Kağıt yırtıldı. Tekrar deneyin.",
        statusNormal: `Kalan boş sayfa:`,
        complete: "Tasarım tamamlandı.",
        toggleBtn: "TR"
    }
};

const SYSTEM_PROMPT = `
You are an Origami Master of software architecture, representing Ömercan Sabun.
Tone: Elegant, precise, artistic. Use metaphors of folding paper, transformation, simplicity out of complexity, and structural integrity.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. Cloud-Native Architect @ Architecht.
Philosophy: A monolith is a flat, fragile sheet. By folding it along domain boundaries (Microservices, Event-Driven), it gains immense strength and geometric beauty.
Contact: hello@omercan.dev
`;

// --- THREE.JS ORIGAMI FOLDING ---
let scene, camera, renderer, paperMesh;
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('origami-canvas');
    scene = new THREE.Scene();
    
    // Position camera to the right so it doesn't block the UI text on the left
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(5, 5, 15);
    camera.lookAt(5,0,0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Soft studio lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(10, 20, 10);
    // Subtle shadow cast simulation (without actual shadow maps to save perf)
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xffeedd, 0.3);
    backLight.position.set(-10, -10, -10);
    scene.add(backLight);

    // Create a 2D plane that we will "fold" manually
    // Using a custom geometry with specific triangle faces
    const geometry = new THREE.BufferGeometry();
    
    // Initial flat state (a square)
    // 4 corners + 1 center point for basic folding
    // v0: top-left, v1: top-right, v2: bottom-left, v3: bottom-right, v4: center
    const size = 6;
    let vertices = new Float32Array([
        -size,  size, 0, // 0
         size,  size, 0, // 1
        -size, -size, 0, // 2
         size, -size, 0, // 3
            0,     0, 0  // 4
    ]);

    // 4 triangles meeting in center
    const indices = [
        0, 2, 4,
        2, 3, 4,
        3, 1, 4,
        1, 0, 4
    ];

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        roughness: 0.8, 
        metalness: 0.1,
        side: THREE.DoubleSide
    });

    paperMesh = new THREE.Mesh(geometry, material);
    paperMesh.position.set(5, 0, 0);
    scene.add(paperMesh);

    // Initial rotation
    paperMesh.rotation.x = -Math.PI / 4;
    paperMesh.rotation.z = Math.PI / 4;

    function animate() {
        requestAnimationFrame(animate);
        
        // Gentle float
        paperMesh.position.y = Math.sin(Date.now() * 0.001) * 0.5;
        paperMesh.rotation.y += 0.005; // Slow spin

        // Animating the fold based on state
        const positions = paperMesh.geometry.attributes.position.array;
        
        // Target Z index for the center point (index 4 -> pos 14)
        // and target Z for corners (indices 0, 1, 2, 3 -> pos 2, 5, 8, 11)
        let targetZCenter = 0;
        let targetZCorners = 0;

        if (aiState === 'CONNECTING') {
            // Folding up like a bowl/crane base
            targetZCenter = -5;
            targetZCorners = 3;
        } else if (aiState === 'GENERATING') {
            // Fluttering/folding rapidly
            targetZCenter = Math.sin(Date.now() * 0.005) * 4;
            targetZCorners = Math.cos(Date.now() * 0.005) * 2;
        } else {
            // Unfolded flat
            targetZCenter = 0;
            targetZCorners = 0;
        }

        // Smoothly interpolate vertices
        positions[14] += (targetZCenter - positions[14]) * 0.05; // Center Z
        [2, 5, 8, 11].forEach(i => {
            positions[i] += (targetZCorners - positions[i]) * 0.05; // Corners Z
        });
        
        paperMesh.geometry.computeVertexNormals();
        paperMesh.geometry.attributes.position.needsUpdate = true;

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
    const stat = document.querySelector('.o-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'o-telemetry error' : 'o-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `No pages left.`;
            stat.className = 'o-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining} / ${MAX_REQUESTS_PER_DAY}`;
            stat.className = 'o-telemetry';
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
         updateStatus("OUT OF PAPER", true);
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
    updateStatus("CREATING...");
    
    aiState = 'CONNECTING';
    oDot.classList.add('pulsing');
    
    heroSection.classList.add('hidden');
    
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
            oScroller.scrollTop = oScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        oDot.classList.remove('pulsing');
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        oScroller.scrollTop = oScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
