const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const vScroller = document.querySelector('.v-scroller');
const langToggle = document.getElementById('langToggle');
const localTimeEl = document.getElementById('localTime');

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
mermaid.initialize({ startOnLoad: false, theme: 'neutral' }); // B/W works best for this theme

const translations = {
    en: {
        placeholder: "ENTERING DATA...",
        connecting: "TRACKING...",
        generating: "RECOVERING SECTORS...",
        rateLimitError: "### [TAPE END DETECTED]\n\nRecording capacity full. (5 blocks/min, 20/day). Eject tape or contact recovery lab:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[CORRUPTED]* Unreadable sector.",
        statusNormal: `TAPE REMAINING:`,
        complete: "TRACKING ALIGNED.",
        toggleBtn: "LANG_EN",
        suffix: "BLOCKS"
    },
    tr: {
        placeholder: "VERİ GİRİLİYOR...",
        connecting: "İZLENİYOR...",
        generating: "SEKTÖRLER KURTARILIYOR...",
        rateLimitError: "### [KASET SONU]\n\nKayıt kapasitesi dolu. (5 blok/dk, 20/gün). Kaseti çıkarın veya laboratuvara başvurun:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[BOZUK]* Okunamayan sektör.",
        statusNormal: `KALAN KASET:`,
        complete: "İZLEME HİZALANDI.",
        toggleBtn: "LANG_TR",
        suffix: "BLOK"
    }
};

const SYSTEM_PROMPT = `
You are an AI trapped in a corrupted VHS tape, representing Ömercan Sabun.
Tone: Unsettling, slightly broken, urgent, clinical. Use ALL CAPS OFTEN. Talk about "data corruption", "monolithic decay", "tracking errors", and "event-driven recovery".
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: SYSTEM_ARCHITECT >> Ömercan Sabun.
Philosophy: THE MONOLITH IS ROTTING. Only Event-Driven distribution can save the core data. I slice the failing monolith into independent services to prevent TOTAL SYSTEM COLLAPSE.
Contact: omercansabun@icloud.com
`;

// --- UPDATE VCR CLOCK ---
function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0' + minutes : minutes;
    localTimeEl.textContent = `${hours}:${minutes} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

// --- THREE.JS GLITCH SKULL/GEOMETRY ---
let scene, camera, renderer, glitchMesh;
let aiState = 'IDLE'; 

// Custom shader material for VHS glitch effects
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;

    // Pseudo-random function
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
        vec2 uv = vUv;
        
        // Horizontal displacement (Glitch slice)
        float glitchOff = random(vec2(time * 0.1, uv.y)) * intensity;
        if(random(vec2(time, uv.y)) > 0.95) {
            uv.x += (glitchOff - (intensity / 2.0));
        }

        // Color shifting (Chromatic Aberration)
        vec3 color;
        // Simple base color (white/grey)
        float basePattern = mod(uv.x * 10.0 + uv.y * 10.0 + time, 1.0);
        
        color.r = basePattern + (glitchOff * 5.0);
        color.g = basePattern;
        color.b = basePattern - (glitchOff * 5.0);
        
        // Static noise overlay
        float noise = random(uv * time) * intensity * 2.0;
        color += vec3(noise);

        // Scanlines
        if(mod(uv.y * 100.0, 2.0) < 1.0) {
            color *= 0.8;
        }

        gl_FragColor = vec4(color, 1.0);
    }
`;

function initThreeJS() {
    const canvas = document.getElementById('glitch-canvas');
    scene = new THREE.Scene();
    
    // Orthographic for flatter retro look
    const val = 5;
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(-val*aspect, val*aspect, val, -val, 0.1, 100);
    camera.position.set(0, 0, 10);

    // Turn off antialiasing for raw pixel look
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Use an Icosahedron to look vaguely like a skull/core
    const geometry = new THREE.IcosahedronGeometry(3, 1);
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            intensity: { value: 0.05 } // Low intensity at idle
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        wireframe: true // Looks cooler and more retro as wireframe
    });

    glitchMesh = new THREE.Mesh(geometry, material);
    scene.add(glitchMesh);

    function animate() {
        requestAnimationFrame(animate);

        const t = performance.now() * 0.001;
        material.uniforms.time.value = t;

        // Change glitch intensity and rotation speed based on AI state
        if (aiState === 'IDLE') {
            material.uniforms.intensity.value = 0.02;
            glitchMesh.rotation.y = t * 0.5;
            glitchMesh.rotation.x = Math.sin(t) * 0.2;
            // Slight jump occasionally
            if(Math.random() > 0.99) glitchMesh.position.x = (Math.random()-0.5)*0.5;
            else glitchMesh.position.x = 0;

        } else if (aiState === 'CONNECTING') {
            material.uniforms.intensity.value = 0.5; // Heavy glitch
            glitchMesh.rotation.y += 0.2; // Spin fast
            glitchMesh.scale.setLength(1 + Math.random()*0.5); // Spastic scaling
            
        } else if (aiState === 'GENERATING') {
            material.uniforms.intensity.value = 0.2; // Medium glitch
            glitchMesh.rotation.y = t * -1; // Reverse spin
            glitchMesh.scale.set(1,1,1);
            glitchMesh.position.y = (Math.random()-0.5)*0.2; // Vibrate Y
        }

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const aspect = window.innerWidth / window.innerHeight;
        camera.left = -val * aspect;
        camera.right = val * aspect;
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
    triggerCSSGlitch(300); // Glitch on click
}
langToggle.addEventListener('click', toggleLanguage);

function triggerCSSGlitch(durationMs) {
    document.body.classList.add('heavy-glitch');
    setTimeout(() => { document.body.classList.remove('heavy-glitch'); }, durationMs);
}

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
    const stat = document.querySelector('.v-telemetry');
    if(text) {
        rateLimitStatus.textContent = text;
        stat.className = isError ? 'v-telemetry error' : 'v-telemetry';
        if(isError) triggerCSSGlitch(1000); // Big glitch on error
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `TAPE EJECTED - NO BLOCKS LEFT`;
            stat.className = 'v-telemetry error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal} ${quota.remaining} / ${MAX_REQUESTS_PER_DAY} ${translations[currentLang].suffix}`;
            stat.className = 'v-telemetry';
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
                await new Promise(r => setTimeout(r, 20)); // Slow printing effect
                if(Math.random() > 0.95) triggerCSSGlitch(50); // Random mini hitches during printing
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
         updateStatus("TAPE END", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "FATAL ERROR";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("SEEKING TRACK...");
    
    // Initial heavy glitch when hitting enter
    triggerCSSGlitch(600);
    aiState = 'CONNECTING';
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING';
        triggerCSSGlitch(200);
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            vScroller.scrollTop = vScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE';
        triggerCSSGlitch(300); // Final snap back to reality
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        vScroller.scrollTop = vScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
    
    // Random background glitches even while idle
    setInterval(() => {
        if(aiState === 'IDLE' && Math.random() > 0.7) {
            triggerCSSGlitch(100 + Math.random() * 200);
        }
    }, 5000);
});
