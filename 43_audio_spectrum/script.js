const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const eqScroller = document.querySelector('.eq-scroller');
const langToggle = document.getElementById('langToggle');

const vuMeter = document.querySelector('.vu-meter');
const playBtn = document.querySelector('.play-btn');
const fader = document.querySelector('.fader');

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
        placeholder: "Enter frequency query...",
        connecting: "TUNING OSCILLATORS...",
        generating: "MIXING AUDIO CHANNELS...",
        rateLimitError: "### [AMP CLIPPING]\n\nMax decibels reached. (5/min, 20/day). Lower the gain or ping the studio:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[STAT]* Static on the line.",
        statusNormal: `BATTERY:`,
        complete: "PLAYBACK COMPLETE.",
        toggleBtn: "EN",
        suffix: "SAMPLERS READY"
    },
    tr: {
        placeholder: "Frekans değerini girin...",
        connecting: "OSİLATÖRLER AYARLANIYOR...",
        generating: "KANALLAR MİKSLENİYOR...",
        rateLimitError: "### [AMP CLIPPING]\n\nMaksimum desibel. (5/dk, 20/gün). Kazancı düşürün veya stüdyoya ulaşın:\n[hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[PARAZİT]* Hatta statik var.",
        statusNormal: `BATARYA:`,
        complete: "OYNATMA TAMAMLANDI.",
        toggleBtn: "TR",
        suffix: "SAMPLE HAZIR"
    }
};

const SYSTEM_PROMPT = `
You are the master Audio Engineer of software architecture, representing Ömercan Sabun.
Tone: DJ, Music Producer, Technical, Cool. Use audio analogies: "EQ", "Mixing", "Headroom", "Channels", "Latency", "Frequency", "Clipping", "Signal-to-Noise".
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: DJ Ömercan Sabun (Cloud-Native Architect).
Philosophy: A monolithic app is a terrible busy mix where everything clashes. I separate concerns into independent microservice channels, allowing infinite headroom and perfect scalability.
Contact: hello@omercan.dev
`;

// --- THREE.JS AUDIO SPECTRUM VISUALIZER ---
let scene, camera, renderer;
let bars = [];
let aiState = 'IDLE'; 
const BAR_COUNT = 64; // Number of EQ bands

function initThreeJS() {
    const canvas = document.getElementById('eq-canvas');
    scene = new THREE.Scene();
    
    // Position camera dynamically based on screen width to always see the visualizer on the right
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 5, 40);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Simple lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 10, 10);
    scene.add(dirLight);

    // Create the EQ bars in a circular or linear arrangement. Let's do a cool curved arc.
    const radius = 20;
    
    for (let i = 0; i < BAR_COUNT; i++) {
        const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
        
        // Color gradient from cyan to neon green to yellow
        let hue = 0.5 - (i / BAR_COUNT) * 0.4; // 0.5 is cyan, 0.3 is green, 0.1 is yellow
        if(hue < 0) hue += 1;
        const color = new THREE.Color().setHSL(hue, 1, 0.5);
        
        const material = new THREE.MeshStandardMaterial({ 
            color: color, emissive: color, emissiveIntensity: 0.2,
            metalness: 0.8, roughness: 0.2
        });
        
        const bar = new THREE.Mesh(geometry, material);
        
        // Arrange in a wide arc (semi-circle)
        const angle = (i / BAR_COUNT) * Math.PI - (Math.PI / 2);
        
        bar.position.x = Math.sin(angle) * radius;
        bar.position.z = Math.cos(angle) * (radius * 0.5) - 10;
        
        // Look at center
        bar.lookAt(0, 0, -10);
        
        // Store base Y position
        bar.userData = { 
            baseY: 0, 
            targetScale: 1, 
            currentScale: 1,
            noiseOffset: Math.random() * 100 
        };
        
        scene.add(bar);
        bars.push(bar);
    }

    function animate() {
        requestAnimationFrame(animate);
        
        const now = Date.now() * 0.005;

        // Fake audio data generation based on AI State
        bars.forEach((bar, index) => {
            let activityLevel = 0;
            
            if (aiState === 'IDLE') {
                // Low, gentle wave
                activityLevel = Math.max(0.1, Math.sin(now * 0.2 + index * 0.1) * 0.3 + 0.2);
            } else if (aiState === 'CONNECTING') {
                // Pulsing
                activityLevel = Math.max(0.1, Math.sin(now + index * 0.5) * 2);
            } else if (aiState === 'GENERATING') {
                // Erratic, high energy (like speech)
                // Use a mix of fast sine waves and pure random for that "talking" EQ look
                let base = Math.sin(now * 2 + index * 0.2) * Math.cos(now * 1.5 - index * 0.1);
                let spike = Math.random() > 0.8 ? Math.random() * 5 : 0;
                
                // Emphasize middle frequencies
                let isMiddle = index > BAR_COUNT*0.25 && index < BAR_COUNT*0.75;
                if(isMiddle) spike *= 1.5;

                activityLevel = Math.max(0.2, (Math.abs(base) * 2) + spike);
            }

            // Smooth interpolation
            bar.userData.targetScale = activityLevel * 8; // Max height approx 8
            if(bar.userData.targetScale < 1) bar.userData.targetScale = 1;
            
            // Fast attack, slow decay (like real VU meters)
            if (bar.userData.targetScale > bar.userData.currentScale) {
                bar.userData.currentScale += (bar.userData.targetScale - bar.userData.currentScale) * 0.3; // Attack
            } else {
                bar.userData.currentScale += (bar.userData.targetScale - bar.userData.currentScale) * 0.1; // Decay
            }

            // Apply scale (scale Y, and adjust position Y so it grows upwards, not from center)
            bar.scale.y = bar.userData.currentScale;
            bar.position.y = bar.userData.currentScale / 2 - 0.5;
            
            // Pulse emissive material based on height
            bar.material.emissiveIntensity = bar.userData.currentScale * 0.1;
        });

        // Rotate camera slightly depending on state
        if(aiState === 'CONNECTING') {
            camera.position.x = Math.sin(now * 0.2) * 5;
        } else {
            camera.position.x += (0 - camera.position.x) * 0.05;
        }
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

// --- LOGIC AND FAKE HARDWARE CONTROLS ---

// Moves the fake hardware fader based on AI text generation progress
function updateFader(progress) { // progress 0.0 to 1.0
    // Fader CSS bottom is 0% to 80% roughly
    fader.style.bottom = `${progress * 80}%`;
}

function updateVUMeter(state) {
    vuMeter.className = 'vu-meter'; // reset
    if (state === 'ACTIVE') {
        vuMeter.classList.add('vu-active');
    } else if (state === 'CLIP') {
        vuMeter.classList.add('vu-active');
        vuMeter.classList.add('vu-clip');
    }
}

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
    const stat = document.querySelector('.eq-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'eq-telemetry error' : 'eq-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `AMP CLIPPING - NO SAMPLERS LEFT`;
            stat.className = 'eq-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} [${quota.remaining}/${MAX_REQUESTS_PER_DAY}] ${translations[currentLang].suffix}`;
            stat.className = 'eq-telemetry';
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
            let chunkLength = 12;
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText, i / fullText.length);
                await new Promise(r => setTimeout(r, 10)); 
            }
            onChunk(fullText, 1.0);
        } else {
             onChunk(translations[currentLang].errorDefault, 1);
        }
    } catch (error) {
        if(error.message === "429") onChunk(translations[currentLang].rateLimitError, 1);
        else onChunk(`*[SYS_ERR]* ${error.message}`, 1);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!checkQuota().allowed) {
         updateStatus("CLIPPING!", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "PEAK LEVEL EXCEEDED";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         updateVUMeter('CLIP');
         updateFader(0);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("Muting Channels...");
    updateFader(0);
    updateVUMeter('ACTIVE'); // Flash VU meter
    
    aiState = 'CONNECTING';
    playBtn.textContent = '■'; // Stop square
    playBtn.classList.add('pulsing');
    
    heroSection.classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 400));

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk, progress) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            eqScroller.scrollTop = eqScroller.scrollHeight;
            updateFader(progress); // Slide fader up smoothly
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        playBtn.textContent = '▶'; // Play triangle
        playBtn.classList.remove('pulsing');
        updateVUMeter('IDLE');
        updateFader(1);
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        eqScroller.scrollTop = eqScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
