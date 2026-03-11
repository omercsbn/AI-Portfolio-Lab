const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const uScroller = document.querySelector('.u-scroller');
const langToggle = document.getElementById('langToggle');
const blipContainer = document.getElementById('blipContainer');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Enter Clearance Cipher (Gemini API Key):\n(Stored locally)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_PINGS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { fontFamily: 'Fira Mono', primaryColor: '#001f11', primaryTextColor: '#e0ffe0', primaryBorderColor: '#008f11', lineColor: '#00ff41' }});

const translations = {
    en: {
        placeholder: "ENTER COORDINATES...",
        connecting: "TRANSMITTING PING...",
        generating: "RECEIVING ECHO...",
        rateLimitError: "#### [CRITICAL: BATTERY DEPLETED]\n\nSonar offline. (5 Pings/min, 20/day). Surface the vessel or contact command:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[SONAR_ERR] Signal lost in the depths.",
        statusNormal: `BATTERY:`,
        complete: "ECHO RESOLVED.",
        toggleBtn: "[TR ]",
        suffix: "PINGS",
    },
    tr: {
        placeholder: "KOORDİNAT GİRİN...",
        connecting: "PING GÖNDERİLİYOR...",
        generating: "YANKI ALINIYOR...",
        rateLimitError: "#### [KRİTİK: BATARYA TÜKENDİ]\n\nSonar çevrimdışı. (5 Ping/dk, 20/gün). Yüzeye çıkın veya komutla iletişime geçin:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[SONAR_HATA] Derinliklerde sinyal kayboldu.",
        statusNormal: `BATARYA:`,
        complete: "YANKI ÇÖZÜMLENDİ.",
        toggleBtn: "[EN ]",
        suffix: "PING",
    }
};

const SYSTEM_PROMPT = `
You are the onboard Sonar AI for Deep Sea Software Architect Ömercan Sabun.
Tone: Submarine commander, tactical, focused on depth, pressure, navigation, pings, and mapping the unseen. Use sonar and oceanic metaphors to describe backend engineering, networking, and data flows.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Submarine Architect.
Philosophy: "Frontends are the surface ripples. I operate in the high-pressure zones below the waterline. I build the redundant, deep-sea data pipelines that silently power the entire fleet above without ever cracking under load."
Contact: omercansabun@icloud.com
`;

// --- SONAR BLIPS LOGIC ---
let pingInterval;

function startSonar() {
    // Generate cosmetic blips on the radar that fade based on the 4s sweep
    pingInterval = setInterval(() => {
        createBlip();
    }, 1500); // Random pacing
}

function createBlip() {
    const blip = document.createElement('div');
    blip.className = 'blip';
    
    // Position randomly within the 800x800 radar circle
    const angle = Math.random() * Math.PI * 2;
    // Radius max 400 (half of 800)
    const radius = Math.random() * 380;
    
    const x = window.innerWidth / 2 + Math.cos(angle) * radius;
    const y = window.innerHeight / 2 + Math.sin(angle) * radius;
    
    blip.style.left = `${x}px`;
    blip.style.top = `${y}px`;
    
    blipContainer.appendChild(blip);
    
    // Remove after the 4s CSS animation completes
    setTimeout(() => {
        if(blip.parentNode) blip.remove();
    }, 4000);
}

// Intense ping during generation
function fireIntensePing() {
    const sweep = document.querySelector('.sonar-sweep');
    sweep.style.animationDuration = '1s'; // Accelerate radar speed heavily
    
    let fastPing = setInterval(createBlip, 200); // Massive target acquisition
    return () => {
        clearInterval(fastPing);
        sweep.style.animationDuration = '4s'; // Return to normal scanning
    };
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
    if (m.length >= MAX_PINGS) return { allowed: false };
    return { allowed: true, remaining: MAX_PINGS - m.length };
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
            rateLimitStatus.textContent = `0 ${translations[currentLang].suffix} [CRITICAL]`;
            rateLimitStatus.className = 'error';
        } else {
            rateLimitStatus.textContent = `${quota.remaining}/${MAX_PINGS} ${translations[currentLang].suffix}`;
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

async function fetchStreamGemini(userPrompt, onChunk) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
    const payload = {
        contents: [{ role: "user", parts: [{ text: "System prompt: " + SYSTEM_PROMPT + "\n\nUser Query: " + userPrompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 8192 } 
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
                while(m.length<MAX_PINGS) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 15; // Moderate scan speed
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
         updateStatus("DEPLETED", true);
         heroSection.style.display = 'none';
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ABORT.";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("PINGING...", false);
    
    heroSection.style.display = 'none';
    
    const stopIntense = fireIntensePing(); // Speed up the radar
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 800)); // Sonar delay

        responseStatus.textContent = translations[currentLang].generating;
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            uScroller.scrollTop = uScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        
        stopIntense(); // Return radar to normal speed
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        uScroller.scrollTop = uScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    startSonar();
});
