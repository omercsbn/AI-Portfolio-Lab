// --- UI Elements ---
const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const statusIndicator = document.querySelector('.status-indicator');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const systemStatus = document.querySelector('.system-status');
const contentScrollContainer = document.querySelector('.content-scroll-container');

// --- Translation & Config ---
const langEnBtn = document.getElementById('lang-en');
const langTrBtn = document.getElementById('lang-tr');
let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Please enter your Gemini API Key to use this portfolio piece:\n(Your key is stored locally in your browser)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
} 
const MAX_REQUESTS_PER_MINUTE = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'tr';
// Dark theme for mermaid to blend nicely with our UI
mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const translations = {
    en: {
        placeholder: "Interface with the architect... (Shift+Enter for newline)",
        connecting: "Establishing neural uplink...",
        generating: "Synthesizing architectural data...",
        rateLimitError: "### [SYSTEM INTERRUPT]\n\nNeural link overloaded (Max 5 queries/min or 20/day). To preserve core stability, please initiate direct contact: [hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[CRITICAL ERROR]* Unprocessable telemetry received.",
        statusNormal: `Uplink Stable // Quota`,
        complete: "Data synthesis complete."
    },
    tr: {
        placeholder: "Mimari vekile bağlanın... (Yeni satır için Shift+Enter)",
        connecting: "Nöral bağlantı kuruluyor...",
        generating: "Mimari veri sentezleniyor...",
        rateLimitError: "### [SİSTEM KESİNTİSİ]\n\nNöral bağlantı aşırı yüklendi (Dakikada 5 veya Günde 20 sorgu maks). Çekirdek kararlılığını korumak için doğrudan iletişim kurun: [hello@omercan.dev](mailto:hello@omercan.dev).",
        errorDefault: "*[KRİTİK HATA]* İşlenemeyen telemetri alındı.",
        statusNormal: `Bağlantı Kararlı // Kota`,
        complete: "Veri sentezi tamamlandı."
    }
};

const SYSTEM_PROMPT = `
You are the highly advanced, formal, and strict digital proxy/assistant for Ömercan Sabun, representing a highly sophisticated "Neural Core" architecture.
CRITICAL INSTRUCTIONS:
1. Speak in the language the user queries you in (Turkish or English). 
2. Format your response using ONLY standard Markdown. USE MARKDOWN LISTS (* or -) and BOLD (**text**) extensively for readability.
3. If the user asks for a diagram, architecture, or flow, you MUST generate a valid Mermaid.js diagram inside a markdown code block exactly like this:
\`\`\`mermaid
graph TD;
    A-->B;
\`\`\`
4. BE STRICT, HIGHLY PROFESSIONAL, and ENTERPRISE-DRIVEN. You are an expert Software Architect proxy. Be brief but highly technical. Speak with a slight sci-fi/cybernetic tone (e.g. "Analyzing parameters", "Data retrieved").

OVERALL PROFILE:
- Name: Ömercan Sabun
- Role: Software Architect
- Age: 25
- Education: Marmara University - Computer Engineering (Graduated 2024)
- Location: Turkey
- Current Position: Software Architect at Architecht (Developing high-scale software infrastructures for banking systems).

EXPERTISE & DOMAINS:
- Architectural Approaches: Distributed systems, Microservices, Event-driven architecture (EDA), Saga pattern, CQRS.
- AI Research: LLM systems, RAG architectures, Multi-agent AI systems, Autonomous orchestrators.
- Financial Tech: High-performance data processing, payment systems, risk analysis platforms.
- Tech Stack: C#, Java, Python, JavaScript, Go, Rust, React, Next.js.
- Cloud & DevOps: Kubernetes, Docker, Helm, ArgoCD, Consul, Vault, CI/CD pipelines.

PHILOSOPHY & VISION:
- "Software geek" approach to automate systems, minimize human intervention, design self-healing highly scalable architectures.
- Long-term: AI autonomous software systems, next-gen OS architecture.
- Contact: hello@omercan.dev
`;

// --- Three.js Neural Core Integration ---
let scene, camera, renderer, particlesMesh;
let aiState = 'IDLE'; // IDLE, CONNECTING, GENERATING
let targetRotationSpeed = 0.001;
let currentRotationSpeed = 0.001;

function initThreeJS() {
    const canvas = document.getElementById('bg-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create Neural Core Particle Sphere
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 3000;
    const posArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);

    const baseColor = new THREE.Color('#8b5cf6'); // Purple

    for(let i = 0; i < particlesCount * 3; i+=3) {
        // Spherical distribution
        const r = 15 + Math.random() * 5;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        
        posArray[i] = r * Math.sin(phi) * Math.cos(theta); // x
        posArray[i+1] = r * Math.sin(phi) * Math.sin(theta); // y
        posArray[i+2] = r * Math.cos(phi); // z

        colorArray[i] = baseColor.r;
        colorArray[i+1] = baseColor.g;
        colorArray[i+2] = baseColor.b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    // Custom shader material for glowy particles
    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    particlesMesh = new THREE.Points(particlesGeometry, material);
    scene.add(particlesMesh);

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Smoothly interpolate rotation speed based on state
        currentRotationSpeed += (targetRotationSpeed - currentRotationSpeed) * 0.05;
        
        particlesMesh.rotation.y += currentRotationSpeed;
        particlesMesh.rotation.x += currentRotationSpeed * 0.5;

        // Subtle mouse parallax
        camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 5 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        // Core pulsating effect based on state
        if (aiState === 'GENERATING') {
            // Intense pulse
            const scale = 1 + Math.sin(elapsedTime * 10) * 0.05;
            particlesMesh.scale.set(scale, scale, scale);
        } else if (aiState === 'CONNECTING') {
            const scale = 1 + Math.sin(elapsedTime * 5) * 0.02;
            particlesMesh.scale.set(scale, scale, scale);
        } else {
            // Calm breathing
            const scale = 1 + Math.sin(elapsedTime * 2) * 0.01;
            particlesMesh.scale.set(scale, scale, scale);
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

function updateAIState(state) {
    aiState = state;
    if(!particlesMesh) return;
    
    const colors = particlesMesh.geometry.attributes.color.array;
    let targetColor = new THREE.Color();

    if(state === 'IDLE') {
        targetRotationSpeed = 0.001;
        targetColor.set('#8b5cf6'); // Purple
    } else if (state === 'CONNECTING') {
        targetRotationSpeed = 0.01;
        targetColor.set('#06b6d4'); // Cyan
    } else if (state === 'GENERATING') {
        targetRotationSpeed = 0.015;
        targetColor.set('#ec4899'); // Pink/Red intense
    }

    // Tween colors using GSAP for smooth color transition
    const currentColor = new THREE.Color(colors[0], colors[1], colors[2]);
    gsap.to(currentColor, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: state === 'GENERATING' ? 0.5 : 2,
        onUpdate: () => {
            for(let i = 0; i < colors.length; i+=3) {
                colors[i] = currentColor.r;
                colors[i+1] = currentColor.g;
                colors[i+2] = currentColor.b;
            }
            particlesMesh.geometry.attributes.color.needsUpdate = true;
        }
    });
}
// ----------------------------------------


function setLanguage(lang) {
    currentLang = lang;
    if(lang === 'tr') {
        langTrBtn.classList.add('active');
        langEnBtn.classList.remove('active');
    } else {
        langEnBtn.classList.add('active');
        langTrBtn.classList.remove('active');
    }
    promptInput.placeholder = translations[lang].placeholder;
    updateStatus();
}

function checkQuota() {
    const now = Date.now();
    const today = new Date().toDateString();
    let dailyData = JSON.parse(localStorage.getItem('gemini_daily_requests') || '{"date": "", "count": 0}');
    let minuteData = JSON.parse(localStorage.getItem('gemini_minute_requests') || '[]');
    if (dailyData.date !== today) dailyData = { date: today, count: 0 };
    minuteData = minuteData.filter(time => now - time < 60000);
    localStorage.setItem('gemini_daily_requests', JSON.stringify(dailyData));
    localStorage.setItem('gemini_minute_requests', JSON.stringify(minuteData));
    if (dailyData.count >= MAX_REQUESTS_PER_DAY) return { allowed: false, reason: "DAILY_LIMIT" };
    if (minuteData.length >= MAX_REQUESTS_PER_MINUTE) return { allowed: false, reason: "MINUTE_LIMIT" };
    return { allowed: true, remainingDaily: MAX_REQUESTS_PER_DAY - dailyData.count };
}

function consumeQuota() {
    const now = Date.now();
    const today = new Date().toDateString();
    let dailyData = JSON.parse(localStorage.getItem('gemini_daily_requests') || '{"date": "", "count": 0}');
    let minuteData = JSON.parse(localStorage.getItem('gemini_minute_requests') || '[]');
    if (dailyData.date !== today) dailyData = { date: today, count: 0 };
    dailyData.count++;
    minuteData.push(now);
    localStorage.setItem('gemini_daily_requests', JSON.stringify(dailyData));
    localStorage.setItem('gemini_minute_requests', JSON.stringify(minuteData));
    return MAX_REQUESTS_PER_DAY - dailyData.count;
}

function updateStatus(text, isError = false) {
    if(text) {
        rateLimitStatus.textContent = text;
        systemStatus.className = isError ? 'system-status error' : 'system-status';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `QUOTA EXCEEDED`;
            systemStatus.className = 'system-status error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal}: ${quota.remainingDaily} / ${MAX_REQUESTS_PER_DAY}`;
            systemStatus.className = 'system-status';
        }
    }
}

// Attach globally to be callable from HTML onclick
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
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
            topK: 40,
            topP: 0.95
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-goog-api-key': API_KEY },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if(response.status === 429) {
                let minuteData = JSON.parse(localStorage.getItem('gemini_minute_requests') || '[]');
                while(minuteData.length < MAX_REQUESTS_PER_MINUTE) minuteData.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(minuteData));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            
            // Simulate Streaming for the UI so Markdown renders live
            let currentText = "";
            let chunkLength = 12; // Adjusted chunk size for smoothness
            
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                
                // If the 3D core is generating, give it an extra slight bump in rotation per chunk
                if(particlesMesh) particlesMesh.rotation.y += 0.005;

                await new Promise(r => setTimeout(r, 10)); // delay per chunk
            }
            // Final guarantee
            onChunk(fullText);
            
        } else {
             onChunk(translations[currentLang].errorDefault);
        }
        
    } catch (error) {
        if(error.message === "429") {
             onChunk(translations[currentLang].rateLimitError);
        } else {
             console.error(error);
             onChunk(`*[SYSTEM FAILURE]* ${error.message}`);
        }
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    // Quota Check
    const quotaStatus = checkQuota();
    if (!quotaStatus.allowed) {
         updateStatus("RATE LIMIT EXCEEDED", true);
         updateAIState('IDLE');
         if (!heroSection.classList.contains('hidden')) {
             heroSection.classList.add('hidden');
         }
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "Error";
         statusIndicator.classList.remove('pulsing');
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    // Prepare UI
    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("Transmitting telemetry...");
    
    // Hide hero if visible
    if (!heroSection.classList.contains('hidden')) {
        heroSection.classList.add('hidden');
    }
    
    updateAIState('CONNECTING');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        statusIndicator.classList.add('pulsing');
        responseContent.innerHTML = '';
        
        // Minor delay to show connecting state physically
        await new Promise(r => setTimeout(r, 800));

        responseStatus.textContent = translations[currentLang].generating;
        updateAIState('GENERATING');
        
        let completeMarkdown = "";
        
        // We accumulate the markdown text and parse it LIVE
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            // Scroll to bottom
            contentScrollContainer.scrollTop = contentScrollContainer.scrollHeight;
        });
        
        // Render Final (without cursor block) and init Mermaid fully
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try {
            mermaid.init(undefined, document.querySelectorAll('.mermaid'));
        } catch(e) {
            console.error("Mermaid parsing error:", e);
        }
        
        responseStatus.textContent = translations[currentLang].complete;
        statusIndicator.classList.remove('pulsing');
        updateAIState('IDLE');
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus();
        contentScrollContainer.scrollTop = contentScrollContainer.scrollHeight;
        
    }, 400); // UI transition delay
}

// Initializations
document.addEventListener('DOMContentLoaded', () => {
    langEnBtn.addEventListener('click', () => setLanguage('en'));
    langTrBtn.addEventListener('click', () => setLanguage('tr'));
    setLanguage('tr');
    
    // Start 3D
    initThreeJS();
});
