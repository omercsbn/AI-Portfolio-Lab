const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const bioScroll = document.querySelector('.bio-scroll');
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

let currentLang = 'tr';
mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const translations = {
    en: {
        placeholder: "Provide stimulus sequence...",
        connecting: "SYNAPSES FIRING...",
        generating: "GROWING NEURAL PATHWAYS...",
        rateLimitError: "### [ORGANISM FATIGUE]\n\nEnergy reserves depleted. (Max 5/min, 20/day). Allow time to heal or contact cell operator:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[MUTATION]* Unprocessable cellular instruction.",
        statusNormal: `VITALS STABLE | ENERGY`,
        complete: "NEUROGENESIS COMPLETE.",
        toggleBtn: "DNA: EN"
    },
    tr: {
        placeholder: "Uyarıcı sekansı sağlayın...",
        connecting: "SİNAPSLAR ATEŞLENİYOR...",
        generating: "NÖRAL YOLLAR BÜYÜYOR...",
        rateLimitError: "### [ORGANİZMA YORGUNLUĞU]\n\nEnerji rezervleri tükendi. İyileşme için bekleyin veya hücre operatörüne ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[MUTASYON]* İşlenemeyen hücresel talimat.",
        statusNormal: `HAYATİ BULGULAR STABİL | ENERJİ`,
        complete: "NÖROJENEZ TAMAMLANDI.",
        toggleBtn: "DNA: TR"
    }
};

const SYSTEM_PROMPT = `
You are the Bio-Neural AI proxy of Ömercan Sabun.
Tone: Organic, evolutionary, calm, mirroring biological systems (cells, DNA, synapses, growth).
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Cloud-Native Architect.
Ecosystem: Architecht
Evolutionary Traits: Building self-healing distributed systems, Kubernetes clusters acting as immune systems, Microservices as specialized cells.
Contact: omercansabun@icloud.com
`;

// --- THREE.JS BIO-NEURAL WEB ---
let scene, camera, renderer, neuronsGroup, linesGroup;
let aiState = 'IDLE'; // IDLE, CONNECTING, GENERATING
let time = 0;
const NEURON_COUNT = 80;

function initThreeJS() {
    const canvas = document.getElementById('neural-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 30;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    neuronsGroup = new THREE.Group();
    linesGroup = new THREE.Group();
    scene.add(neuronsGroup);
    scene.add(linesGroup);

    // Neuron Material (glowing spheres)
    const neuronGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const neuronMat = new THREE.MeshBasicMaterial({ color: '#69f0ae' });

    // Store node positions
    const nodes = [];

    for(let i=0; i<NEURON_COUNT; i++) {
        let n = new THREE.Mesh(neuronGeo, neuronMat);
        // Distribute in a wide oval / sphere
        n.position.set(
            (Math.random()-0.5) * 60,
            (Math.random()-0.5) * 40,
            (Math.random()-0.5) * 20
        );
        n.userData = { 
            baseX: n.position.x, baseY: n.position.y, baseZ: n.position.z,
            phaseOffset: Math.random() * Math.PI * 2 
        };
        nodes.push(n);
        neuronsGroup.add(n);
    }

    // Connect nodes that are close to each other
    const lineMat = new THREE.LineBasicMaterial({
        color: '#69f0ae',
        transparent: true,
        opacity: 0.2
    });

    // We will dynamically update line positions so we store references
    const connections = [];

    for(let i=0; i<nodes.length; i++) {
        for(let j=i+1; j<nodes.length; j++) {
            const dist = nodes[i].position.distanceTo(nodes[j].position);
            if(dist < 10) { // Connection threshold
                const points = [nodes[i].position, nodes[j].position];
                const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.LineSegments(lineGeo, lineMat);
                linesGroup.add(line);
                connections.push({ line: line, n1: nodes[i], n2: nodes[j] });
            }
        }
    }

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 5;
        mouseY = -(e.clientY / window.innerHeight - 0.5) * 5;
    });

    function animate() {
        requestAnimationFrame(animate);
        
        let speedMultiplier = aiState === 'IDLE' ? 1 : (aiState === 'CONNECTING' ? 3 : 8);
        time += 0.01 * speedMultiplier;

        // Animate neurons (organic floating)
        nodes.forEach(n => {
            n.position.x = n.userData.baseX + Math.sin(time + n.userData.phaseOffset) * 2;
            n.position.y = n.userData.baseY + Math.cos(time*0.8 + n.userData.phaseOffset) * 2;
            
            // Pulse size when generating
            if(aiState === 'GENERATING') {
                const s = 1 + Math.sin(time*5 + n.userData.phaseOffset) * 0.5;
                n.scale.set(s,s,s);
            } else {
                n.scale.set(1,1,1);
            }
        });

        // Update lines
        connections.forEach(c => {
            const positions = c.line.geometry.attributes.position.array;
            positions[0] = c.n1.position.x; positions[1] = c.n1.position.y; positions[2] = c.n1.position.z;
            positions[3] = c.n2.position.x; positions[4] = c.n2.position.y; positions[5] = c.n2.position.z;
            c.line.geometry.attributes.position.needsUpdate = true;
            
            // Brighten lines when active
            if(aiState === 'GENERATING') {
                c.line.material.opacity = 0.5 + Math.sin(time*10 + c.n1.userData.phaseOffset)*0.4;
            } else {
                c.line.material.opacity = 0.2;
            }
        });

        // Slighly rotate entire group
        scene.rotation.y += 0.001 * speedMultiplier;
        scene.rotation.x += 0.0005 * speedMultiplier;

        // Mouse Parallax
        camera.position.x += (mouseX - camera.position.x) * 0.05;
        camera.position.y += (mouseY - camera.position.y) * 0.05;

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
    if(text) {
        rateLimitStatus.textContent = text;
        rateLimitStatus.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `CRITICAL: NO ENERGY`;
            rateLimitStatus.className = 'error';
        } else {
            rateLimitStatus.textContent = `${translations[currentLang].statusNormal}: ${quota.remaining}`;
            rateLimitStatus.className = '';
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
         updateStatus("STIMULUS REJECTED", true);
         heroSection.classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "FATIGUED";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    promptInput.value = '';
    promptInput.style.height = 'auto';
    promptInput.disabled = true;
    updateStatus("CELLULAR UPLINK...");
    
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
            bioScroll.scrollTop = bioScroll.scrollHeight;
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
        bioScroll.scrollTop = bioScroll.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
