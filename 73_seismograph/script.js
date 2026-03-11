const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');

const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const magReadout = document.getElementById('magReadout');
const alertLight = document.getElementById('alertLight');
const langToggle = document.getElementById('langToggle');
const eqScroller = document.querySelector('.eq-scroller');

const canvas = document.getElementById('seismoCanvas');
const ctx = canvas.getContext('2d');
const needleArm = document.getElementById('needleArm');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Enter Maintenance Access Code (Gemini API Key):\n(Stored locally)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_EVENTS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { fontFamily: 'Inconsolata', primaryColor: '#f3f4f6', primaryTextColor: '#1f2937', primaryBorderColor: '#9ca3af', lineColor: '#ef4444' }});

const translations = {
    en: {
        placeholder: "INJECT FAULT DATA...",
        connecting: "DETECTING FORESHOCK...",
        generating: "WARNING: MAJOR SEISMIC ACTIVITY!",
        rateLimitError: "#### [INSTRUMENT FAILURE]\n\nSensors overloaded. (5 Events/min, 20/day). Recalibrate or contact tech support:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[GEO_ERR] The faultline collapsed.",
        statusNormal: `SENSOR_LIFESPAN:`,
        complete: "TREMOR SUBSIDED. BASELINE RESTORED.",
        toggleBtn: "[CALIBRATE: TR]",
        magBase: "0.1",
        magPeak: "9.2+"
    },
    tr: {
        placeholder: "FAY VERİSİ GİRİN...",
        connecting: "ÖNCÜ DEPREM TESPİT EDİLDİ...",
        generating: "UYARI: YÜKSEK SİSMİK AKTİVİTE!",
        rateLimitError: "#### [ENSTRÜMAN HATASI]\n\nSensörler aşırı yüklendi. (5 Olay/dk, 20/gün). Kalibre edin veya desteğe ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[JEO_HATASI] Fay hattı çöktü.",
        statusNormal: `SENSÖR_ÖMRÜ:`,
        complete: "SARSINTI AZALDI. TABAN ÇİZGİSİ DÜZELDİ.",
        toggleBtn: "[KALİBRE: EN]",
        magBase: "0.1",
        magPeak: "9.2+"
    }
};

const SYSTEM_PROMPT = `
You are the automated analytics system for the SABUN_GEO Seismograph, designed by Backend Engineer Ömercan Sabun.
Tone: Scientific, urgent when generating, analytical, focused on faultlines, load handling, pressure, tectonic shifts, and structural resilience. Describe high-traffic web architectures like buildings built to withstand magnitude 9.0 earthquakes.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun.
Philosophy: "Software architecture rests on shifting tectonic plates. I design systems capable of withstanding massive traffic spikes, load sheer, and unpredictable user tremors without the infrastructure crumbling into the sea."
Contact: omercansabun@icloud.com
`;

// --- SEISMOGRAPH HTML5 CANVAS LOGIC ---
const simplex = new SimplexNoise();
let timeScale = 0;
let tremorIntensity = 2; // Normal mild noise
const inkColor = '#1e3a8a';
let graphData = [];

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawSeismograph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Determine the Y value at the "needle" (the far right side)
    const centerY = canvas.height / 2;
    const needleY = centerY + (simplex.noise2D(timeScale, 0) * tremorIntensity);
    
    // Store historic data, pushing newest to the end
    graphData.push(needleY);
    if(graphData.length > canvas.width) {
        graphData.shift(); // Keep array bound to canvas pixel width
    }
    
    // Draw the line path from left to right
    ctx.beginPath();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = inkColor;
    ctx.lineJoin = "round";
    
    for(let i = 0; i < graphData.length; i++) {
        const x = canvas.width - graphData.length + i; // Draw right aligned so it "scrolls" left
        const y = graphData[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Animate the CSS physical needle arm to match the exact Y coordinate
    // Calculate rotation angle needed to point to needleY
    // Distance from right edge depends on arm width (150px)
    const dy = needleY - centerY;
    const dx = 150; 
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    needleArm.style.transform = `translateY(-50%) rotate(${angle}deg)`;
    
    // Scroll time forward
    timeScale += 0.05;
    
    requestAnimationFrame(drawSeismograph);
}
drawSeismograph();

function triggerEarthquake(active = true) {
    if(active) {
        tremorIntensity = 60; // Massive shaking amplitude
        document.body.classList.add('earthquake-mode'); // CSS physical shake
        alertLight.classList.add('active'); // Flashing red light
        
        magReadout.textContent = (Math.random() * 2 + 7.5).toFixed(1); // 7.5 - 9.5
        magReadout.className = "eq-val danger";
    } else {
        tremorIntensity = 3; // Baseline mild idle noise
        document.body.classList.remove('earthquake-mode');
        alertLight.classList.remove('active');
        
        magReadout.textContent = translations[currentLang].magBase;
        magReadout.className = "eq-val stable";
    }
}


// --- LOGIC ---
function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    langToggle.textContent = translations[currentLang].toggleBtn;
    promptInput.placeholder = translations[currentLang].placeholder;
    magReadout.textContent = translations[currentLang].magBase;
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
    if (m.length >= MAX_EVENTS) return { allowed: false };
    return { allowed: true, remaining: MAX_EVENTS - m.length };
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
        rateLimitStatus.className = isError ? 'error eq-val' : 'eq-val';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `0/5 [SHATTERED]`;
            rateLimitStatus.className = 'error eq-val';
        } else {
            rateLimitStatus.textContent = `${quota.remaining}/${MAX_EVENTS} EVENTS`;
            rateLimitStatus.className = 'eq-val';
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } 
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
                while(m.length<MAX_EVENTS) m.push(Date.now());
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
                
                // Keep randomizing magnitude readouts during generation
                magReadout.textContent = (Math.random() * 2 + 7.5).toFixed(1);
                
                await new Promise(r => setTimeout(r, 15)); 
            }
            onChunk(fullText);
        } else {
             onChunk(translations[currentLang].errorDefault);
        }
    } catch (error) {
        if(error.message === "429") onChunk(translations[currentLang].rateLimitError);
        else onChunk(`[SYS_FAILURE] TRACE: ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!API_KEY) {
        API_KEY = prompt("AUTH_KEY REQ:");
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("EQUIPMENT FAILURE", true);
         heroSection.style.display = 'none';
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ABORT.";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    // UI Updates
    submitBtn.classList.add('pressed');
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("MONITORING...", false);
    
    heroSection.style.display = 'none';
    
    // Foreshock 
    responseDisplay.classList.remove('hidden');
    responseStatus.textContent = translations[currentLang].connecting;
    responseContent.innerHTML = '';
    
    setTimeout(async () => {
        
        // MAIN QUAKE HITS
        submitBtn.classList.remove('pressed');
        triggerEarthquake(true); 
        responseStatus.textContent = translations[currentLang].generating;
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            eqScroller.scrollTop = eqScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        // Tremor ends
        triggerEarthquake(false);
        responseStatus.textContent = translations[currentLang].complete;

        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        eqScroller.scrollTop = eqScroller.scrollHeight;
        
    }, 1000); 
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
});
