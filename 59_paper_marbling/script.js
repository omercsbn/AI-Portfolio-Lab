const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const eScroller = document.querySelector('.e-scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Please enter your Gemini API Key to experience the Ebru art:\n(Stored locally in your browser)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_DROPS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
// Mermaid tailored for the traditional book style
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { fontFamily: 'Cinzel', primaryColor: '#fdfbf7', primaryTextColor: '#2c2018', primaryBorderColor: '#b04632', lineColor: '#3b5998' }});

const translations = {
    en: {
        placeholder: "Drip your thoughts here...",
        connecting: "MIXING PIGMENTS...",
        generating: "DRAWING ON WATER...",
        rateLimitError: "### [INK DEPLETED]\n\nThe basin needs to settle. (5 Drops/min, 20/day). Please wait, or contact the artisan:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[TURBULENCE]* The surface tension broke.",
        statusNormal: `DROPS REMAINING:`,
        complete: "PAPER IMPRINTED.",
        toggleBtn: "TR",
        suffix: "CL",
        inkIdle: "INK: SETTLED",
        inkActive: "INK: SWIRLING"
    },
    tr: {
        placeholder: "Düşüncelerinizi buraya damlatın...",
        connecting: "PİGMENTLER KARIŞIYOR...",
        generating: "SUYUN ÜZERİNE ÇİZİLİYOR...",
        rateLimitError: "### [MÜREKKEP KURUDU]\n\nTeknenin dinlenmesi gerek. (5 Damla/dk, 20/gün). Lütfen bekleyin veya sanatçıya ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[TÜRBÜLANS]* Yüzey gerilimi bozuldu.",
        statusNormal: `KALAN DAMLA:`,
        complete: "KAĞIDA BASILDI.",
        toggleBtn: "EN",
        suffix: "CL",
         inkIdle: "MÜREKKEP: DURGUN",
        inkActive: "MÜREKKEP: DALGALANIYOR"
    }
};

const SYSTEM_PROMPT = `
You are the inner artistic voice of Cloud Architect Ömercan Sabun, specializing in Ebru (Turkish Paper Marbling).
Tone: Poetic, philosophical, artistic, patient. Use metaphors of water, ink, surface tension, basin (tekne), ox gall, combs, and transferring art to paper to describe software architecture and engineering.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun. 
Philosophy: "Code is like Ebru. If you force the paint too heavily, the pattern sinks and shatters. If you guide microservices gently with proper event-driven currents, they form a perfect, infinitely scalable masterpiece upon the surface." 
Contact: omercansabun@icloud.com
`;

// --- 2D CANVAS EBRU/MARBLING SIMULATION ---
// We will use a fast 2D ripple/fluid simulation using SimplexNoise to displace colors on a canvas.

const canvas = document.getElementById('ebru-canvas');
const ctx = canvas.getContext('2d');
let width, height;

// The color palette
const colors = [
    '#b04632', // Cinnabar Red
    '#3b5998', // Lapis Blue
    '#dfc072', // Gold/Ochre
    '#2c2018'  // Dark Ink
];

const simplex = new SimplexNoise();
let timeOffset = 0;
let points = [];
let aiState = 'IDLE';

// Initialize a grid of points that will stretch and warp
function initFluid() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    points = [];
    const spacing = 40; // Resolution
    for (let x = 0; x < width + spacing; x += spacing) {
        for (let y = 0; y < height + spacing; y += spacing) {
            // Assign a random base color
            const col = colors[Math.floor(Math.random() * colors.length)];
            points.push({ ox: x, oy: y, x: x, y: y, color: col });
        }
    }
}

// Drops a new color in the center and pushes others away
function dropInk() {
    const cx = width / 2;
    const cy = height / 2;
    const dropRadius = 200;
    
    // Push existing points away from center
    points.forEach(p => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < dropRadius) {
            const force = (dropRadius - dist) / dropRadius;
            p.ox += dx * force * 0.5;
            p.oy += dy * force * 0.5;
        }
    });
    
    // Recenter
    points.sort((a,b) => (Math.abs(a.x-cx)+Math.abs(a.y-cy)) - (Math.abs(b.x-cx)+Math.abs(b.y-cy)));
    // Change color of closest points
    let newCol = colors[Math.floor(Math.random() * colors.length)];
    for(let i=0; i<30; i++) {
        if(points[i]) points[i].color = newCol;
    }
}

function animateFluid() {
    requestAnimationFrame(animateFluid);
    
    ctx.clearRect(0, 0, width, height);
    
    let speed = aiState === 'GENERATING' ? 0.005 : 0.001;
    let warpIntensity = aiState === 'GENERATING' ? 150 : 30;
    
    if (aiState === 'CONNECTING') {
        speed = 0.01;
        warpIntensity = 200;
    }

    timeOffset += speed;

    // Draw Voronoi-ish organic blobs using circles
    // For performance we just draw large soft radial gradients at the deformed points
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        
        // Deform position using noise
        const n1 = simplex.noise3D(p.ox * 0.003, p.oy * 0.003, timeOffset);
        const n2 = simplex.noise3D(p.ox * 0.003 + 100, p.oy * 0.003 + 100, timeOffset);
        
        p.x = p.ox + n1 * warpIntensity;
        p.y = p.oy + n2 * warpIntensity;
        
        // Draw the "ink"
        ctx.beginPath();
        ctx.arc(p.x, p.y, aiState === 'GENERATING' ? 60 : 40, 0, Math.PI * 2);
        
        // Make colors semi-transparent to blend
        let alpha = aiState === 'GENERATING' ? 0.4 : 0.2;
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
    }
}

window.addEventListener('resize', initFluid);

// --- LOGIC ---
function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    langToggle.textContent = translations[currentLang].toggleBtn;
    promptInput.placeholder = translations[currentLang].placeholder;
    document.getElementById('inkStatus').textContent = aiState === 'IDLE' ? translations[currentLang].inkIdle : translations[currentLang].inkActive;
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
    if (m.length >= MAX_DROPS) return { allowed: false };
    return { allowed: true, remaining: MAX_DROPS - m.length };
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
    const tb = document.getElementById('rateLimitStatus');
    if(text) {
        tb.textContent = text;
        tb.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            tb.textContent = `BASIN MURKY. REST.`;
            tb.className = 'error';
        } else {
            tb.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/${MAX_DROPS} ${translations[currentLang].suffix}`;
            tb.className = '';
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
        generationConfig: { temperature: 0.8, maxOutputTokens: 8192 } 
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if(response.status === 429) {
                let m = JSON.parse(localStorage.getItem('gemini_minute_requests') || '[]');
                while(m.length<MAX_DROPS) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 10; // Slow, poetic reveal
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 20)); 
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

    if (!API_KEY) {
        API_KEY = prompt("API Key required:");
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("PAPER TORN", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ART ABORTED";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    dropInk(); // Visual effect on canvas
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("PREPARING PIGMENT...", false);
    
    aiState = 'CONNECTING'; 
    document.getElementById('inkStatus').textContent = translations[currentLang].inkActive;
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 800)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING'; 
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            eScroller.scrollTop = eScroller.scrollHeight;
        });
        
        // Final "imprint" to paper effect
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE'; 
        document.getElementById('inkStatus').textContent = translations[currentLang].inkIdle;
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        eScroller.scrollTop = eScroller.scrollHeight;
        
    }, 400);
}


document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initFluid();
    animateFluid();
});
