const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');

const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const langToggle = document.getElementById('langToggle');
const xScroller = document.querySelector('.x-scroller');

const vitalPulse = document.getElementById('vitalPulse');
const scanBar = document.getElementById('scanBar');
const skeletonOverlay = document.getElementById('skeletonOverlay');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Enter Medical ID Chip (Gemini API Key):\n(Stored locally)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_EXPOSURES = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { fontFamily: 'Share Tech Mono', primaryColor: 'rgba(0, 229, 255, 0.05)', primaryTextColor: '#d1f5ff', primaryBorderColor: '#00e5ff', lineColor: '#00e5ff' }});

const translations = {
    en: {
        placeholder: "ENTER SYMPTOMS...",
        connecting: "POSITIONING PATIENT...",
        generating: "CONDUCTING DEEP TISSUE MRI SCAN...",
        rateLimitError: "#### [WARNING: MAX EXPOSURE]\n\nRadiation limits reached. (5 Scans/min, 20/day). Await dissipation or contact pathology:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[DIAGNOSTIC_ERR] Scan corrupted.",
        statusNormal: `EXPOSURE:`,
        complete: "SCAN COMPLETE. DIAGNOSIS RENDERED.",
        toggleBtn: "[ LOC: TR ]"
    },
    tr: {
        placeholder: "SEMPTOMLARI GİRİN...",
        connecting: "HASTA KONUMLANDIRILIYOR...",
        generating: "DERİN DOKU MR TARAMASI YAPILIYOR...",
        rateLimitError: "#### [UYARI: MAKSİMUM MARUZİYET]\n\nRadyasyon sınırına ulaşıldı. (5 Tarama/dk, 20/gün). Dağılmasını bekleyin veya patolojiye ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[TANI_HATASI] Tarama bozuldu.",
        statusNormal: `MARUZİYET:`,
        complete: "TARAMA TAMAMLANDI. TANI KOYULDU.",
        toggleBtn: "[ LOC: EN ]"
    }
};

const SYSTEM_PROMPT = `
You are the advanced Medical Diagnostic AI (MRI/X-Ray) for Software Systems, operating under Chief Surgeon Ömercan Sabun.
Tone: Clinical, highly analytical, precise, naming software errors like diseases, fractures, or pathogens. Describe clean architectures as healthy anatomy, strong skeletons, and robust nervous systems.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Systems Surgeon.
Philosophy: "Looking past the skin to examine the bone. I specialize in deep systemic diagnostics, mapping out robust backend skeletons, identifying performance fractures before they break, and ensuring the core architecture is fundamentally healthy."
Contact: omercansabun@icloud.com
`;

// Simulate BPM monitor varying slightly around 60
setInterval(() => {
    let base = 60;
    let variance = Math.floor(Math.random() * 5) - 2;
    vitalPulse.textContent = base + variance;
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
    if (m.length >= MAX_EXPOSURES) return { allowed: false };
    return { allowed: true, remaining: MAX_EXPOSURES - m.length };
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
        rateLimitStatus.className = isError ? 'error v-val' : 'v-val';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `0/5 [LETHAL DOSE]`;
            rateLimitStatus.className = 'error v-val';
        } else {
            rateLimitStatus.textContent = `${quota.remaining}/${MAX_EXPOSURES}`;
            rateLimitStatus.className = 'v-val';
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
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 } // Clinical precision (low temp)
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
                while(m.length<MAX_EXPOSURES) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 18; 
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                
                // Elevated heart rate during processing
                vitalPulse.textContent = Math.floor(Math.random() * 20) + 100;
                
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
        API_KEY = prompt("AUTH_KEY REQ:");
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("WARNING REFUSED", true);
         heroSection.style.display = 'none';
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ABORTING EXPOSURE.";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("SCANNING...", false);
    
    heroSection.style.display = 'none';
    
    responseDisplay.classList.remove('hidden');
    responseStatus.textContent = translations[currentLang].connecting;
    responseContent.innerHTML = '';
    
    // UI Effects
    scanBar.classList.add('active'); // Start the sweeping laser beam
    skeletonOverlay.classList.add('active'); // Light up the background X-Ray
    
    setTimeout(async () => {
        responseStatus.textContent = translations[currentLang].generating;
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            xScroller.scrollTop = xScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        
        scanBar.classList.remove('active');
        skeletonOverlay.classList.remove('active');

        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        xScroller.scrollTop = xScroller.scrollHeight;
        
    }, 600); 
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
});
