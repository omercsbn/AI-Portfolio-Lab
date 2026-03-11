const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');

const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const systemStatusText = document.getElementById('systemStatus');
const langToggle = document.getElementById('langToggle');
const gScroller = document.querySelector('.g-scroller');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Provide Command Link (Gemini API Key):\n(Stored locally)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_BLOCKS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { fontFamily: 'Oswald', primaryColor: '#111518', primaryTextColor: '#ecf0f1', primaryBorderColor: '#8b9298', lineColor: '#f1c40f', nodeBorder: '#f1c40f' }});

const translations = {
    en: {
        placeholder: "TRANSMIT BLUEPRINT...",
        connecting: "ERECTING SCAFFOLD...",
        generating: "POURING CONCRETE LOGIC...",
        rateLimitError: "#### [SYS_HALT: BUDGET EXHAUSTED]\n\nStructural budget depleted. (5 Blocks/min, 20/day). Await new funds or contact architect:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[COLLAPSE] Structural failure during compilation.",
        statusNormal: `STRUCTURAL BUDGET:`,
        complete: "CONSTRUCTION COMPLETE. STRUCTURE STABLE.",
        toggleBtn: "[COMM: TR]",
        sysOnline: "ONLINE",
        sysBuilding: "BUILDING"
    },
    tr: {
        placeholder: "PLANLARI İLET...",
        connecting: "İSKELE KURULUYOR...",
        generating: "BETON MANTIK DÖKÜLÜYOR...",
        rateLimitError: "#### [SİSTEM_DURDU: BÜTÇE BİTTİ]\n\nYapısal bütçe tükendi. (5 Blok/dk, 20/gün). Fon bekleyin veya mimara ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "[ÇÖKÜŞ] Derleme sırasında yapısal hata.",
        statusNormal: `YAPISAL BÜTÇE:`,
        complete: "İNŞAAT TAMAMLANDI. YAPI SABİT.",
        toggleBtn: "[COMM: EN]",
        sysOnline: "ÇEVRİMİÇİ",
        sysBuilding: "İNŞA EDİLİYOR"
    }
};

const SYSTEM_PROMPT = `
You are the central command terminal of a gigantic brutalist software megastructure, designed by Chief Architect Ömercan Sabun.
Tone: Monumental, colossal, unyielding, focusing on concrete logic, massive scale, unshakeable foundations, monoliths versus microservices, and structural integrity.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Chief Architect.
Philosophy: "I don't build temporary structures; I build towering, brutalist logic systems. My backend architectures look like cinematic megastructures—designed to hold up skies of data and outlast the frameworks built around them."
Contact: omercansabun@icloud.com
`;

// --- MEGASTRUCTURE BACKGROUND PARALLAX ---
// Extremely slow, cinematic pan upwards simulating scale
const megaBlocks = document.querySelectorAll('.mega-block');

let idleAnimation = anime({
    targets: '.mega-bg',
    translateY: ['0%', '10%'],
    duration: 60000, // 60 seconds
    direction: 'alternate',
    easing: 'easeInOutSine',
    loop: true
});

function triggerBuildAnimation(active) {
    if(active) {
        // Pauses idle animation and starts a more intense "building" shift
        idleAnimation.pause();
        anime({
            targets: '.mega-block',
            translateY: function(el, i) {
                // Different blocks shift down varying amounts, like layers of a building shifting into place
                return (i + 1) * 30; 
            },
            duration: 800,
            easing: 'easeOutExpo',
            direction: 'alternate',
            loop: true
        });
    } else {
        anime.remove('.mega-block');
        // Return blocks to normal
        anime({
            targets: '.mega-block',
            translateY: 0,
            duration: 2000,
            easing: 'easeOutQuad',
            complete: () => { idleAnimation.play(); }
        });
    }
}


// --- LOGIC ---
function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    langToggle.textContent = translations[currentLang].toggleBtn;
    promptInput.placeholder = translations[currentLang].placeholder;
    updateStatus();
    systemStatusText.textContent = translations[currentLang].sysOnline;
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
    if (m.length >= MAX_BLOCKS) return { allowed: false };
    return { allowed: true, remaining: MAX_BLOCKS - m.length };
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
        rateLimitStatus.className = isError ? 'error g-val' : 'g-val';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            rateLimitStatus.textContent = `0/5 [LOCKED]`;
            rateLimitStatus.className = 'error g-val';
        } else {
            rateLimitStatus.textContent = `${quota.remaining}/${MAX_BLOCKS} BLOCKS`;
            rateLimitStatus.className = 'g-val';
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
                while(m.length<MAX_BLOCKS) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 15; // Slow, heavy chunks
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
         updateStatus("BUDGET EXHAUSTED", true);
         heroSection.style.display = 'none';
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "ABORTING PROJECT.";
         responseStatus.style.color = "var(--g-rust)";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("ASSEMBLING...", false);
    
    heroSection.style.display = 'none';
    
    responseDisplay.classList.remove('hidden');
    responseStatus.textContent = translations[currentLang].connecting;
    responseStatus.style.color = "var(--g-accent)";
    responseContent.innerHTML = '';
    
    systemStatusText.textContent = translations[currentLang].sysBuilding;
    triggerBuildAnimation(true);
    
    setTimeout(async () => {
        responseStatus.textContent = translations[currentLang].generating;
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            gScroller.scrollTop = gScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        responseStatus.style.color = "var(--g-concrete)";
        systemStatusText.textContent = translations[currentLang].sysOnline;
        
        triggerBuildAnimation(false);

        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        gScroller.scrollTop = gScroller.scrollHeight;
        
    }, 800); 
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
});
