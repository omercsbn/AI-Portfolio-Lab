const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const wfScroller = document.querySelector('.wf-scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    if (window === window.top) { API_KEY = prompt("Auth Token Required (Stored Local):\n"); }
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_QUOTA = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { fontFamily: 'IBM Plex Mono', primaryColor: '#eceff1', primaryTextColor: '#263238', primaryBorderColor: '#607d8b', lineColor: '#2962ff' }});

const translations = {
    en: {
        placeholder: "ENTER DEFINITION...",
        connecting: "STATUS: COMPILING...",
        generating: "STATUS: RENDERING_GEOMETRY...",
        rateLimitError: "#### [ERR_QUOTA_EXCEEDED]\n\nExecution halted. Quota limit reached (5 execs/min, 20/day).\nAwaiting structural review at [omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[ERR_COMPILE_FAIL] Sequence aborted.",
        statusNormal: `5/5`,
        complete: "STATUS: COMPILE_SUCCESS.",
        toggleBtn: "[TR ]",
    },
    tr: {
        placeholder: "TANIM GİRİNİZ...",
        connecting: "KOD DERLENİYOR...",
        generating: "GEOMETRİ GÖRÜNTÜLENİYOR...",
        rateLimitError: "#### [HATA_KOTA_AŞILDI]\n\nİşlem durduruldu. Kota sınırına ulaşıldı (5 işlem/dk, 20/gün).\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com) adresinden yapısal inceleme bekleniyor.",
        errorDefault: "[HATA_DERLEME_BAŞARISIZ] Dizi iptal edildi.",
        statusNormal: `5/5`,
        complete: "DURUM: BAŞARILI.",
        toggleBtn: "[EN ]",
    }
};

const SYSTEM_PROMPT = `
You are the architectural drafting AI for Software Engineer Ömercan Sabun, responding through a minimalist CAD/Wireframe interface.
Tone: Highly precise, technical, objective, and stark. Use metaphors related to blueprints, structural integrity, scaffolding, wireframes, and raw engineering.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun
Role: Arch_Engineer // Backend & Systems
Philosophy: "Form follows function. Before aesthetic rendering, the structural wireframe must be flawless. I build the resilient APIs and backend scaffolding that allow frontends to scale without collapsing under load."
Contact: omercansabun@icloud.com
`;

// Simulate Latency display
setInterval(() => {
    const lat = document.getElementById('systemStatus');
    if(lat) {
        lat.textContent = (Math.random() * 0.5 + 0.1).toFixed(2);
    }
}, 2000);

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
    if (m.length >= MAX_QUOTA) return { allowed: false };
    return { allowed: true, remaining: MAX_QUOTA - m.length };
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
        rateLimitStatus.style.color = isError ? 'red' : 'var(--wf-accent)';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `0/5 [LOCKED]`;
            rateLimitStatus.style.color = 'red';
        } else {
            rateLimitStatus.textContent = `${quota.remaining}/${MAX_QUOTA}`;
            rateLimitStatus.style.color = 'var(--wf-accent)';
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
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 } // Low temp for more technical/stark output 
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
                while(m.length<MAX_QUOTA) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 20; // Blocky fast rendering
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
        else onChunk(`[SYS_FAILURE] TRACE: ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!API_KEY) {
        if (window === window.top) { API_KEY = prompt("AUTH_KEY REQ:"); }
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("BLOCK", true);
         heroSection.style.display = 'none';
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "STATUS: ABORTED.";
         responseStatus.style.color = "red";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("BUSY", false);
    
    heroSection.style.display = 'none';
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseStatus.style.color = "var(--wf-border)";
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 400)); 

        responseStatus.textContent = translations[currentLang].generating;
        
        // Add a pulsing effect to the content box while generating
        document.querySelector('.wf-output-box').style.backgroundColor = "rgba(96, 125, 139, 0.05)";
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            wfScroller.scrollTop = wfScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        document.querySelector('.wf-output-box').style.backgroundColor = "#fff";
        responseStatus.textContent = translations[currentLang].complete;
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        wfScroller.scrollTop = wfScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
});
