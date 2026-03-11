const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const langToggle = document.getElementById('langToggle');

const reactionSequence = document.getElementById('reactionSequence');
const machineMarble = document.getElementById('machineMarble');
const gaugeNeedle = document.querySelector('.gauge-needle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    if (window === window.top) { API_KEY = prompt("Insert Authorization Key to prime the machine:\n(Stored locally)"); }
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_COGS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'neutral', themeVariables: { fontFamily: 'Cutive Mono', primaryColor: '#bdc3c7', primaryTextColor: '#222', primaryBorderColor: '#222', lineColor: '#d35400' }});

const translations = {
    en: {
        placeholder: "LOAD BLUEPRINT...",
        connecting: "MARBLE DROPPED. GEARS TURNING...",
        generating: "IGNITING PAYLOAD...",
        rateLimitError: "#### [MACHINE JAMMED]\n\nOut of cogs. (5 Cogs/min, 20/day). Oil the gears or contact the engineer:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[SPROCKET_ERROR] The chain reaction failed.",
        statusNormal: `COGS:`,
        complete: "PROCESS COMPLETE. MACHINE IDLE.",
        toggleBtn: "VALVE: TR",
    },
    tr: {
        placeholder: "PLANLARI YÜKLEYİN...",
        connecting: "BİLYE DÜŞTÜ. ÇARKLAR DÖNÜYOR...",
        generating: "YÜK ATEŞLENİYOR...",
        rateLimitError: "#### [MAKİNE SIKIŞTI]\n\nDişli bitti. (5 Dişli/dk, 20/gün). Yağlayın veya mühendise ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[DİŞLİ_HATASI] Zincirleme reaksiyon koptu.",
        statusNormal: `DİŞLİ:`,
        complete: "İŞLEM TAMAM. MAKİNE BEKLEMEDE.",
        toggleBtn: "VALVE: EN",
    }
};

const SYSTEM_PROMPT = `
You are the central orchestration AI of a massive, over-engineered Rube Goldberg machine built by Complexity Engineer Ömercan Sabun.
Tone: Eccentric, heavily industrial, obsessed with process, gears, chains, automation, moving parts, pipelines, and exact timing. Use mechanical contraption metaphors for cloud deployment, CI/CD, and microservices.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Contraptionist.
Philosophy: "Why push a button when you can push a button that releases a ball bearing that rolls down a ramp to strike a match to light a fuse to deploy the code? I design complex distributed systems where every isolated microservice acts as a perfect trigger for the next."
Contact: omercansabun@icloud.com
`;


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
    if (m.length >= MAX_COGS) return { allowed: false };
    return { allowed: true, remaining: MAX_COGS - m.length };
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
            rateLimitStatus.textContent = `0/5 [JAMMED]`;
            rateLimitStatus.className = 'error';
        } else {
            rateLimitStatus.textContent = `${quota.remaining}/${MAX_COGS}`;
            rateLimitStatus.className = '';
        }
    }
}

window.insertPrompt = function(text) {
    promptInput.value = text;
    promptInput.focus();
    handleSubmission(); // Immediately triggered by pull levers
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
                while(m.length<MAX_COGS) m.push(Date.now());
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
         updateStatus("JAMMED", true);
         heroSection.style.display = 'none';
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ABORT.";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("ENGAGED", false);
    gaugeNeedle.style.transform = "translateX(-50%) rotate(45deg)"; // Pressure spikes!
    gaugeNeedle.style.backgroundColor = "red";
    
    // Hide hero, show inter-block pipe animation area
    heroSection.style.display = 'none';
    reactionSequence.classList.add('active');
    responseDisplay.classList.add('hidden');
    
    // Trigger Marble Drop CSS Animation (takes 2 seconds)
    machineMarble.classList.add('drop');
    
    setTimeout(async () => {
        // Marble finished dropping, hide sequence box and show response
        machineMarble.classList.remove('drop');
        reactionSequence.classList.remove('active');
        
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
            responseContent.innerHTML = html;
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        gaugeNeedle.style.transform = "translateX(-50%) rotate(-45deg)"; // Pressure drops back to normal
        
    }, 2000); // 2000ms waits exactly for the CSS marble animation to hit the funnel
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
});
