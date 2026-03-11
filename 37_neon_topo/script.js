const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const sScroller = document.querySelector('.s-scroller');
const langToggle = document.getElementById('langToggle');

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
        placeholder: "Enter coordinates for the next jump...",
        connecting: "TUNING FREQUENCY...",
        generating: "DOWNLOADING FROM THE GRID...",
        rateLimitError: "### [ENGINE OVERHEAT]\n\nMax RPM reached. (5/min, 20/day). Let the engine cool down or contact:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[GLITCH]* Signal lost in the noise.",
        statusNormal: `DRIVE STATUS: OPTIMAL JUMPS:`,
        complete: "TRANSMISSION COMPLETE.",
        toggleBtn: "EN"
    },
    tr: {
        placeholder: "Sıradaki atlama için koordinatları girin...",
        connecting: "FREKANS AYARLANIYOR...",
        generating: "AĞDAN İNDİRİLİYOR...",
        rateLimitError: "### [MOTOR AŞIRI ISINDI]\n\nMaksimum RPM'e ulaşıldı. Lütfen motoru soğumaya bırakın veya ping atın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[HATA]* Sinyal gürültüde kayboldu.",
        statusNormal: `SÜRÜCÜ DURUMU: OPTİMAL KALAN:`,
        complete: "İLETİM TAMAMLANDI.",
        toggleBtn: "TR"
    }
};

const SYSTEM_PROMPT = `
You are the Synthwave AI representing Ömercan Sabun.
Tone: Retro-futuristic, cool, confident, 80s sci-fi aesthetic (think Tron, Blade Runner, Outrun).
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. Target: Cloud-Native Architect @ Architecht.
Vibe: Cruising the digital highway. Building event-driven architectures that scale infinitely into the neon horizon. 
Contact: omercansabun@icloud.com
`;

// --- THREE.JS NEON WIREFRAME TOPOGRAPHY ---
let scene, camera, renderer, terrainMesh;
let aiState = 'IDLE'; 
let time = 0;
const simplex = new SimplexNoise();

function initThreeJS() {
    const canvas = document.getElementById('synth-canvas');
    scene = new THREE.Scene();
    
    // Deep purple fog to melt into the background
    scene.fog = new THREE.FogExp2(0x0b021a, 0.02);
    
    // Low camera angle looking down the highway
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 3, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Create a large plane for the terrain
    const geometry = new THREE.PlaneGeometry(100, 100, 40, 40); // 40x40 segments
    
    // Rotate to lay flat
    geometry.rotateX(-Math.PI / 2);

    // Use a wireframe material with bright magenta color
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xff00ff, 
        wireframe: true,
        transparent: true,
        opacity: 0.6
    });

    terrainMesh = new THREE.Mesh(geometry, material);
    scene.add(terrainMesh);
    
    // Add a glowing grid line down the center (the "highway")
    const hwGeo = new THREE.BufferGeometry();
    const hwPoints = [];
    for(let i=-50; i<50; i+=2) hwPoints.push(0, 0, i);
    hwGeo.setAttribute('position', new THREE.Float32BufferAttribute(hwPoints, 3));
    const hwMat = new THREE.PointsMaterial({color: 0x00ffff, size: 0.5, sizeAttenuation: true});
    const highway = new THREE.Points(hwGeo, hwMat);
    scene.add(highway);

    let mouseX = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
    });

    function animate() {
        requestAnimationFrame(animate);
        
        let speed = aiState === 'GENERATING' ? 0.05 : (aiState === 'CONNECTING' ? 0.1 : 0.01);
        time -= speed; // Move time backwards to make terrain scroll forwards

        // Animate the vertices based on Simplex Noise to create rolling hills
        const positions = terrainMesh.geometry.attributes.position.array;
        
        let multiplier = aiState === 'GENERATING' ? 8 : 4; // Taller mountains when generating

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            
            // Create a flat path down the middle (highway)
            let distanceToCenter = Math.abs(x);
            let heightFactor = distanceToCenter < 10 ? 0 : (distanceToCenter - 10) / 10;
            if(heightFactor > 1) heightFactor = 1;

            // Generate noise based on x and z+time (to scroll)
            const noise = simplex.noise2D(x * 0.1, (z + (time*20)) * 0.1);
            
            // Apply height, keeping the center flat
            positions[i + 1] = noise * multiplier * heightFactor;
        }
        
        terrainMesh.geometry.attributes.position.needsUpdate = true;
        
        // Gentle camera sway
        camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
        camera.lookAt(0, 5, -20);
        
        // Flash colors if generating
        if(aiState === 'GENERATING') {
             material.color.setHSL((time*-0.1)%1, 1, 0.5); // cycle hue rapidly
        } else {
             material.color.setHex(0xff00ff); // solid magenta
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
    const stat = document.querySelector('.s-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 's-telemetry error' : 's-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `SYSTEM LOCK: COOLDOWN`;
            stat.className = 's-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}`;
            stat.className = 's-telemetry';
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
         updateStatus("WARNING: NO POWER", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ABORT";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("ENGAGING HYPERDRIVE...");
    
    aiState = 'CONNECTING';
    
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
            sScroller.scrollTop = sScroller.scrollHeight;
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
        sScroller.scrollTop = sScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
