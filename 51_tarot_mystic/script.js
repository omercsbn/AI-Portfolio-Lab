const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const tScroller = document.querySelector('.t-scroller');
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
mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const translations = {
    en: {
        placeholder: "Seek guidance from the ether...",
        connecting: "Consulting the Oracle...",
        generating: "Scrying the timeline...",
        rateLimitError: "### [THE ARCANA IS HIDDEN]\n\nThe aether is exhausted. (5 visions/min, 20/day). Meditate, or summon the architect directly:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[VOID]* The vision clouded over.",
        statusNormal: `Aether:`,
        complete: "The prophecy is written.",
        toggleBtn: "EN",
        suffix: "visions remaining",
        roman: ["O", "I", "II", "III", "IV", "V"]
    },
    tr: {
        placeholder: "Eterden rehberlik isteyin...",
        connecting: "Görücüye danışılıyor...",
        generating: "Zaman çizgisi taranıyor...",
        rateLimitError: "### [GİZLER SAKLANDI]\n\nEter tükendi. (5 görü/dk, 20/gün). Meditasyon yapın veya mimarı çağırın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[BOŞLUK]* Görü bulutlandı.",
        statusNormal: `Eter:`,
        complete: "Kehanet yazıldı.",
        toggleBtn: "TR",
        suffix: "görü kaldı",
        roman: ["O", "I", "II", "III", "IV", "V"]
    }
};

const SYSTEM_PROMPT = `
You are an Esoteric Cloud Architect acting as a mystical Oracle representing Ömercan Sabun.
Tone: Prophetic, wise, mystical, yet speaking of highly technical modern software concepts. Use words like "divination", "ether", "currents", "alignment", "monolith", "chaos". 
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Oracle Sabun.
Philosophy: The monolith is a false idol destined to crumble. True architecture requires scrying the currents of traffic and weaving disparate micro-spells (services) into an unbreakable, asynchronous web.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS MYSTICAL ASTROLABE ---
let scene, camera, renderer;
let rings = [];
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('tarot-canvas');
    scene = new THREE.Scene();
    
    // Slight fog to fade out edges
    scene.fog = new THREE.FogExp2(0x0a0510, 0.015);
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.set(0, 0, 20);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Subtle magic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);
    
    const magicLight = new THREE.PointLight(0x8855ff, 2, 50);
    magicLight.position.set(0, 0, 0); // Inner glow
    scene.add(magicLight);

    const goldLight = new THREE.DirectionalLight(0xcfa858, 1);
    goldLight.position.set(5, 5, 5);
    scene.add(goldLight);

    // Create interlocking rings (Astrolabe style)
    const ringMat = new THREE.MeshStandardMaterial({ 
        color: 0xcfa858, metalness: 1, roughness: 0.2, side: THREE.DoubleSide
    });

    const innerMat = new THREE.MeshStandardMaterial({
        color: 0x8855ff, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.8
    });

    // Core Orb
    const orbGeo = new THREE.IcosahedronGeometry(1.5, 1);
    const orb = new THREE.Mesh(orbGeo, innerMat);
    scene.add(orb);
    rings.push({ mesh: orb, speeds: [0.01, 0.02, 0.0] });

    // Rings
    for(let i=1; i<=4; i++) {
        // Flat torus makes a nice engraved ring look
        const rGeo = new THREE.TorusGeometry(2 + i*1.2, 0.05 + (i*0.02), 16, 64);
        const r = new THREE.Mesh(rGeo, ringMat);
        
        // Random initial rotations
        r.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
        
        scene.add(r);
        rings.push({ 
            mesh: r, 
            speeds: [(Math.random()-0.5)*0.01, (Math.random()-0.5)*0.01, (Math.random()-0.5)*0.01] 
        });
    }

    function animate() {
        requestAnimationFrame(animate);

        // State multipliers
        let spdMult = 1;
        if (aiState === 'CONNECTING') {
            spdMult = 5;
            magicLight.intensity = 5;
            orb.scale.setLength(1.3 + Math.sin(Date.now()*0.01)*0.2); // Pulse
        } else if (aiState === 'GENERATING') {
            spdMult = 2;
            magicLight.intensity = 3 + Math.random()*2; // Flicker
            orb.scale.setLength(1.1);
        } else {
            spdMult = 0.5;
            magicLight.intensity = 1.5;
            orb.scale.setLength(1.0);
        }

        // Rotate everything
        rings.forEach(r => {
            r.mesh.rotation.x += r.speeds[0] * spdMult;
            r.mesh.rotation.y += r.speeds[1] * spdMult;
            r.mesh.rotation.z += r.speeds[2] * spdMult;
        });
        
        // Slow float of whole assembly
        scene.rotation.y = Math.sin(Date.now()*0.0005) * 0.2;
        scene.position.y = Math.sin(Date.now()*0.001) * 0.5;

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
    const stat = document.querySelector('.t-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 't-telemetry error' : 't-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `AETHER DRAINED.`;
            stat.className = 't-telemetry error';
        } else {
            // Use roman numerals for quota tracking purely for aesthetics
            let rNum = translations[currentLang].roman[quota.remaining] || quota.remaining;
            let mNum = translations[currentLang].roman[5] || 5;
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${rNum} / ${mNum} ${translations[currentLang].suffix}`;
            stat.className = 't-telemetry';
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
            let chunkLength = 15;
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 20)); // Slower, mystical pacing
            }
            onChunk(fullText);
        } else {
             onChunk(translations[currentLang].errorDefault);
        }
    } catch (error) {
        if(error.message === "429") onChunk(translations[currentLang].rateLimitError);
        else onChunk(`*[CURSE]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("OMEN DETECTED", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "FATAL OMEN";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("CASTING...");
    
    aiState = 'CONNECTING';
    document.querySelector('.eye-icon').style.animationDuration = "0.2s";
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 800)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        document.querySelector('.eye-icon').style.animationDuration = "0.8s";
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            tScroller.scrollTop = tScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        document.querySelector('.eye-icon').style.animationDuration = "3s";
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        tScroller.scrollTop = tScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
