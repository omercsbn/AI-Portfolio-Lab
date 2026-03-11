const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn'); // Record mapping
const playDummyBtn = document.getElementById('playDummyBtn');
const stopDummyBtn = document.getElementById('stopDummyBtn');

const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const langToggle = document.getElementById('langToggle');
const cScroller = document.querySelector('.c-scroller');
const systemStatusText = document.getElementById('systemStatus');
const playIcon = document.getElementById('playIcon');
const staticOverlay = document.getElementById('staticOverlay');

// Cassette animations
const spoolL = document.getElementById('spoolL');
const spoolR = document.getElementById('spoolR');
const rollL = document.querySelector('.l-roll');
const rollR = document.querySelector('.r-roll');

// VU Meter styling targets
const vuLeft = document.getElementById('vuLeft');
const vuRight = document.getElementById('vuRight');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Insert Authentication Tape (Gemini API Key):\n(Stored locally)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_TRACKS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'default', themeVariables: { fontFamily: 'Archivo Black', primaryColor: '#f0f0f0', primaryTextColor: '#111', primaryBorderColor: '#000', lineColor: '#ff3333' }});

const translations = {
    en: {
        placeholder: "SPEAK INTO MIC...",
        connecting: "FAST FORWARDING...",
        generating: "[PLAY] GENERATING TRACK...",
        rateLimitError: "#### [TAPE JAMMED]\n\nOut of tape. (5 Tracks/min, 20/day). Eject and contact the studio:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[STATIC_ERR] The tape unspooled.",
        statusNormal: `LENGTH:`,
        complete: "[STOP] END OF TAPE.",
        toggleBtn: "TAPE: TR",
        sysReady: "READY_",
        sysRec: "REC_●",
        sysPlay: "PLAY_▶"
    },
    tr: {
        placeholder: "MİKTAROFONA KONUŞUN...",
        connecting: "İLERİ SARILIYOR...",
        generating: "[PLAY] PARÇA ÜRETİLİYOR...",
        rateLimitError: "#### [KASET SIKIŞTI]\n\nBant bitti. (5 Parça/dk, 20/gün). Kaseti çıkar ve stüdyoya ulaş:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[PARAZİT_HATASI] Bant koptu.",
        statusNormal: `UZUNLUK:`,
        complete: "[STOP] KASETİN SONU.",
        toggleBtn: "KASET: EN",
        sysReady: "HAZIR_",
        sysRec: "KAYIT_●",
        sysPlay: "ÇAL_▶"
    }
};

const SYSTEM_PROMPT = `
You are the onboard AI of a retro stereo cassette deck, operating for Software Engineer Ömercan Sabun.
Tone: 80s analog audio gear, utilizing terms like fidelity, tracks, volume, static, frequency, play, record, fast-forward, and mixtape to describe software engineering code and deployments.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun.
Philosophy: "High fidelity code. The best software architectures are like perfectly synced mixtapes—every transition is smooth, and there is absolutely no static or hiss in production."
Contact: omercansabun@icloud.com
`;

// --- STEREO VU METER LOGIC ---
let vuInterval;
function startVUMeter(intensity = 'idle') {
    clearInterval(vuInterval);
    vuInterval = setInterval(() => {
        let base = intensity === 'idle' ? 5 : (intensity === 'rec' ? 80 : 60);
        let variance = intensity === 'idle' ? 10 : 30;
        
        // Randomize left and right channels
        let l = Math.min(100, Math.max(0, base + (Math.random() - 0.5) * variance * 2));
        let r = Math.min(100, Math.max(0, base + (Math.random() - 0.5) * variance * 2));
        
        vuLeft.style.setProperty('--width', `${l}%`);
        vuRight.style.setProperty('--width', `${r}%`);
        
        document.styleSheets[0].insertRule(`
            .bar.l-bar::after { width: ${l}%; }
        `, document.styleSheets[0].cssRules.length);
        document.styleSheets[0].insertRule(`
            .bar.r-bar::after { width: ${r}%; }
        `, document.styleSheets[0].cssRules.length);

    }, 100);
}
function stopVUMeter() {
    startVUMeter('idle');
}

// --- TAPE SPIN LOGIC ---
let tapeSpoolSize = 90; // Left side starts full
function setTapeSpin(active) {
    if(active) {
        spoolL.classList.add('spin');
        spoolR.classList.add('spin');
    } else {
        spoolL.classList.remove('spin');
        spoolR.classList.remove('spin');
    }
}
function updateTapeTransfer() {
    // Visually transfer tape from left to right roll
    if(tapeSpoolSize > 50) {
        tapeSpoolSize -= 2;
        rollL.style.width = `${tapeSpoolSize}px`;
        rollL.style.height = `${tapeSpoolSize}px`;
        
        let rSize = 140 - tapeSpoolSize;
        rollR.style.width = `${rSize}px`;
        rollR.style.height = `${rSize}px`;
    }
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
    if (m.length >= MAX_TRACKS) return { allowed: false };
    return { allowed: true, remaining: MAX_TRACKS - m.length };
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
            rateLimitStatus.textContent = `0/5 [EJECT]`;
            rateLimitStatus.className = 'error';
        } else {
            rateLimitStatus.textContent = `${quota.remaining}/${MAX_TRACKS} TRACKS`;
            rateLimitStatus.className = '';
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

// Dummy buttons for flavor
playDummyBtn.addEventListener('click', () => { 
    if(!promptInput.disabled) {
        playDummyBtn.classList.add('pressed');
        setTimeout(()=>playDummyBtn.classList.remove('pressed'), 200);
    }
});
stopDummyBtn.addEventListener('click', () => { 
    stopDummyBtn.classList.add('pressed');
    setTimeout(()=>stopDummyBtn.classList.remove('pressed'), 200);
});


async function fetchStreamGemini(userPrompt, onChunk) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
    const payload = {
        contents: [{ role: "user", parts: [{ text: "System prompt: " + SYSTEM_PROMPT + "\n\nUser Query: " + userPrompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 8192 } 
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
                while(m.length<MAX_TRACKS) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 12; // Slow down to match tape playing
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
         updateStatus("TAPE END", true);
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
    updateStatus("RECORDING...", false);
    
    heroSection.style.display = 'none';
    
    // Simulate pressing record
    systemStatusText.textContent = translations[currentLang].sysRec;
    systemStatusText.style.color = 'var(--ct-red)';
    startVUMeter('rec'); // Peak the VU meter
    setTapeSpin(true);   // Spin the tape gears
    staticOverlay.classList.add('active'); // Add fuzz overlay
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600)); 

        responseStatus.textContent = translations[currentLang].generating;
        
        // Simulating Playback now
        submitBtn.classList.remove('pressed');
        playDummyBtn.classList.add('pressed');
        systemStatusText.textContent = translations[currentLang].sysPlay;
        systemStatusText.style.color = 'var(--ct-green)';
        startVUMeter('play'); // Normal audio levels
        staticOverlay.classList.remove('active'); 
        playIcon.textContent = "▶";
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            cScroller.scrollTop = cScroller.scrollHeight;
            updateTapeTransfer(); // Shrink left roll, expand right roll over time
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        playIcon.textContent = "■";
        
        // Stop the deck
        playDummyBtn.classList.remove('pressed');
        systemStatusText.textContent = translations[currentLang].sysReady;
        stopVUMeter();
        setTapeSpin(false);

        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        cScroller.scrollTop = cScroller.scrollHeight;
        
    }, 600); 
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    startVUMeter('idle');
});
