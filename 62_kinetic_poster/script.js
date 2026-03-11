const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const kScroller = document.querySelector('.k-scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Enter Gemini API Key (Req for Payload Injection):");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_CALLS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'neutral', themeVariables: { fontFamily: 'Inter', primaryColor: '#e0e0e0', primaryTextColor: '#1a1a1a', primaryBorderColor: '#1a1a1a', lineColor: '#ff003c' }});

const translations = {
    en: {
        placeholder: "INJECT YOUR QUERY...",
        connecting: "PARSING PAYLOAD...",
        generating: "FLUSHING CACHE. RESPONDING.",
        rateLimitError: "### [ERROR: RATE_LIMIT]\n\nPayloads rejected. (5 req/min, 20/day). Cool down system or ping architect:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[500] CORE DUMPED.",
        statusNormal: `REQ/M:`,
        complete: "[200] OK.",
        toggleBtn: "EN>TR",
        motionIdle: "MOTION: IDLE",
        motionActive: "MOTION: BURST",
    },
    tr: {
        placeholder: "SORGUNUZU ENJEKTE EDİN...",
        connecting: "VERİ PARÇALANIYOR...",
        generating: "ÖNBELLEK TEMİZLENİYOR. YANIT:",
        rateLimitError: "### [HATA: RATE_LIMIT]\n\nİstek reddedildi. (5 istek/dk, 20/gün). Sistemi soğutun veya mimara ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[500] ÇEKİRDEK ÇÖKTÜ.",
        statusNormal: `İSTEK/DK:`,
        complete: "[200] TAMAM.",
        toggleBtn: "TR>EN",
        motionIdle: "HAREKET: BEKLEME",
        motionActive: "HAREKET: PATLAMA",
    }
};

const SYSTEM_PROMPT = `
You are the hyper-aggressive, loud, performance-obsessed AI proxy of Software Architect Ömercan Sabun.
Tone: Brutalist, direct, high-energy, all-caps emphasis, very loud. Use terms like "PAYLOAD", "LATENCY", "BURST", "THROUGHPUT", "CACHE INVALIDATION".
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: ÖMERCAN SABUN / LEAD.ARCT. 
Philosophy: "IF YOUR APP MAKES THE USER WAIT, YOUR SYSTEM HAS FAILED. I build architectures that slam data directly into the DOM via Edge CDN and distributed caching layers. We don't do loading spinners here."
Contact: omercansabun@icloud.com
`;

// --- KINETIC TYPOGRAPHY ANIMATION (ANIME.JS) ---
const kineticBg = document.getElementById('kinetic-bg');
const bgPhrases = ["ARCHITECTURE", "SCALABILITY", "COMPUTE", "THROUGHPUT", "LATENCY", "KUBERNETES", "EDGE", "PAYLOAD"];
let bgLines = [];
let aiState = 'IDLE';

function initKinetic() {
    // Inject spans
    for(let i=0; i<8; i++) {
        const line = document.createElement('div');
        line.className = 'k-line';
        // Give each line a phrase, repeated to fill width
        const word = bgPhrases[i % bgPhrases.length];
        line.textContent = `${word} > ${word} > ${word} > ${word} > ${word} > ${word} > ${word}`;
        kineticBg.appendChild(line);
        bgLines.push(line);
    }
    animateKineticIdle();
}

let idleAnim, activeAnim;

function animateKineticIdle() {
    if(activeAnim) activeAnim.pause();
    
    // Reset opacities and colors
    anime({ targets: '.k-line', opacity: 0.05, color: '#1a1a1a', duration: 1000 });

    idleAnim = anime({
        targets: '.k-line',
        translateX: function(el, i) {
            // Alternate left and right moving infinite loops
            return i % 2 === 0 ? ['0%', '-50%'] : ['-50%', '0%'];
        },
        duration: 30000,
        easing: 'linear',
        direction: 'normal',
        loop: true
    });
}

function animateKineticBurst() {
    if(idleAnim) idleAnim.pause();

    // Flash colors and increase opacity
    anime({ targets: '.k-line', opacity: 0.15, duration: 200 });

    activeAnim = anime({
        targets: '.k-line',
        translateX: function(el, i) {
            return i % 2 === 0 ? ['-10%', '-40%'] : ['-40%', '-10%'];
        },
        color: ['#1a1a1a', '#ff003c', '#0000ff', '#1a1a1a'],
        duration: 800, // Very fast burst
        easing: 'linear',
        direction: 'alternate',
        loop: true,
        delay: anime.stagger(100) // Stagger lines for chaotic feel
    });
}

// --- LOGIC ---
function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    langToggle.textContent = translations[currentLang].toggleBtn;
    promptInput.placeholder = translations[currentLang].placeholder;
    document.getElementById('motionStatus').textContent = aiState === 'IDLE' ? translations[currentLang].motionIdle : translations[currentLang].motionActive;
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
    if (m.length >= MAX_CALLS) return { allowed: false };
    return { allowed: true, count: m.length };
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
        tb.innerHTML = text;
        tb.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            tb.innerHTML = `[ HALTED ]`;
            tb.className = 'error';
        } else {
            tb.innerHTML = `${translations[currentLang].statusNormal} ${quota.count}/${MAX_CALLS}`;
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
        generationConfig: { temperature: 0.9, maxOutputTokens: 8192 } // High temp for aggression
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
                while(m.length<MAX_CALLS) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 25; // Fast bursty output
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
        else onChunk(`${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!API_KEY) {
        API_KEY = prompt("API Key req:");
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("LIMIT", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "BLOCKING IO...";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("UPLOADING", false);
    
    aiState = 'CONNECTING'; 
    document.getElementById('motionStatus').textContent = translations[currentLang].motionActive;
    animateKineticBurst();
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 400)); 

        responseStatus.textContent = translations[currentLang].generating;
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html.toUpperCase();
            kScroller.scrollTop = kScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml.toUpperCase(); // Ensure brutalist style retains caps
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        aiState = 'IDLE'; 
        document.getElementById('motionStatus').textContent = translations[currentLang].motionIdle;
        animateKineticIdle();
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        kScroller.scrollTop = kScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initKinetic();
});
