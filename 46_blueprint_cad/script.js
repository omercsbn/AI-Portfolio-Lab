const promptInput = document.getElementById('promptInput');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const cadScroller = document.querySelector('.cad-scroller');
const langToggle = document.getElementById('langToggle');
const coordDisplay = document.querySelector('.coord-display');

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
        placeholder: "Specify point or type command...",
        connecting: "RENDERING TOPOLOGY...",
        generating: "PLOTTING VECTORS...",
        rateLimitError: "### [FATAL] LICENSE LIMIT EXCEEDED\n\nCommand failed. (5 drafts/min, 20/day). Upgrade license or contact admin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[ERROR]* Invalid command syntax.",
        statusNormal: `RESOURCES:`,
        complete: "COMMAND COMPLETED SUCCESSFULLY.",
        toggleBtn: "LANG_EN"
    },
    tr: {
        placeholder: "Nokta belirtin veya komut yazın...",
        connecting: "TOPOLOJİ OLUŞTURULUYOR...",
        generating: "VEKTÖRLER ÇİZİLİYOR...",
        rateLimitError: "### [KRİTİK HATA] LİSANS LİMİTİ\n\nKomut başarısız. (5 taslak/dk, 20/gün). Lisansı yükseltin veya yöneticiyle görüşün:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[HATA]* Geçersiz komut sözdizimi.",
        statusNormal: `KAYNAKLAR:`,
        complete: "KOMUT BAŞARIYLA TAMAMLANDI.",
        toggleBtn: "LANG_TR"
    }
};

const SYSTEM_PROMPT = `
You are the master CAD Architect representing Ömercan Sabun.
Tone: Highly technical, precise, engineering-focused. Use terms like "drafting", "topology", "vectors", "nodes", "redundancy", "structural loads" (referring to server traffic).
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. Chief Draftsman / Cloud-Native Architect.
Philosophy: You cannot build a skyscraper without a blueprint. I draft event-driven architectures mathematically perfect to withstand infinite structural load (traffic) without collapsing.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS CAD VIEWER ---
let scene, camera, renderer;
let wireframeGroup;
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('cad-canvas');
    scene = new THREE.Scene();
    
    // Orthographic camera for that CAD look
    const aspect = window.innerWidth / window.innerHeight;
    const d = 15;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(20, 20, 20); // Isometric angle
    camera.lookAt(scene.position);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    wireframeGroup = new THREE.Group();
    scene.add(wireframeGroup);

    // Create a complex wireframe structure (like a server rack or abstract building)
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 }); // Thicker cyan edges

    // Add a base grid to the 3D scene too
    const gridHelper = new THREE.GridHelper(40, 40, 0xffffff, 0xffffff);
    gridHelper.material.opacity = 0.1;
    gridHelper.material.transparent = true;
    clockGroup = gridHelper;
    scene.add(gridHelper);

    // Build cubes representing microservices
    function addWireCube(x, y, z, size, isCore) {
        const geo = new THREE.BoxGeometry(size, size, size);
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, isCore ? outlineMaterial : lineMaterial);
        line.position.set(x, y, z);
        wireframeGroup.add(line);
        return line;
    }

    // Core central node
    const core = addWireCube(0, 2, 0, 4, true);
    
    // Satellites
    const sats = [];
    sats.push(addWireCube(6, 1, 6, 2, false));
    sats.push(addWireCube(-5, 3, 5, 2, false));
    sats.push(addWireCube(5, 1, -6, 2, false));
    sats.push(addWireCube(-6, 2, -6, 2, false));

    // Draw connection lines
    const connMaterial = new THREE.LineDashedMaterial({
        color: 0xffcc00, linewidth: 1, scale: 1, dashSize: 0.5, gapSize: 0.2
    });

    sats.forEach(sat => {
        const points = [];
        points.push(core.position);
        points.push(sat.position);
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, connMaterial);
        line.computeLineDistances(); // Needed for dashed lines
        wireframeGroup.add(line);
    });

    function animate() {
        requestAnimationFrame(animate);

        // Slow rotation normally
        let rotSpeed = 0.002;

        if (aiState === 'CONNECTING') {
            rotSpeed = 0.05; // Spin camera fast to "re-render"
        } else if (aiState === 'GENERATING') {
            rotSpeed = 0.01;
        }

        wireframeGroup.rotation.y += rotSpeed;

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

    // Mouse tracker for fake coordinates
    document.addEventListener('mousemove', (e) => {
        if(aiState !== 'IDLE') return; // Freeze coords while generating
        let x = ((e.clientX / window.innerWidth) * 100 - 50).toFixed(2);
        let y = (-(e.clientY / window.innerHeight) * 100 + 50).toFixed(2);
        coordDisplay.textContent = `X: ${x} Y: ${y} Z: 0.00`;
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
        rateLimitStatus.style.background = isError ? '#ff6666' : '#ffcc00';
        rateLimitStatus.style.borderColor = isError ? '#cc0000' : '#cc9900';
        rateLimitStatus.style.color = isError ? '#fff' : '#000';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `LICENSE COMPROMISED`;
            rateLimitStatus.style.background = '#ff6666';
            rateLimitStatus.style.color = '#fff';
            rateLimitStatus.style.borderColor = '#cc0000';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining} / ${MAX_REQUESTS_PER_DAY}`;
            rateLimitStatus.style.background = '#ffcc00';
            rateLimitStatus.style.color = '#000';
            rateLimitStatus.style.borderColor = '#cc9900';
        }
    }
}

window.insertPrompt = function(text) {
    promptInput.value = text;
    promptInput.focus();
    handleSubmission();
}

promptInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') {
        e.preventDefault();
        handleSubmission();
    }
});

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
            let chunkLength = 20;
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
         updateStatus("FATAL ERROR", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "EXECUTION HALTED";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("EXECUTING COMMAND...");
    
    aiState = 'CONNECTING';
    
    document.getElementById('heroSection').classList.add('hidden');
    
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
            cadScroller.scrollTop = cadScroller.scrollHeight;
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
        cadScroller.scrollTop = cadScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
