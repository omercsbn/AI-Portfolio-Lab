const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const pScroller = document.querySelector('.p-scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    if (window === window.top) { API_KEY = prompt("Got a pen? Write down your Gemini API Key first:\n(Stored locally in your browser)"); }
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_PAGES = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { fontFamily: 'Caveat', fontSize: '24px', primaryColor: '#fdfbf7', primaryTextColor: '#2c3e50', primaryBorderColor: '#2c3e50', lineColor: '#c0392b' }});

const translations = {
    en: {
        placeholder: "Write me a note...",
        connecting: "Finding a fresh page...",
        generating: "Scribbling thoughts...",
        rateLimitError: "### [OUT OF INK]\n\nI need to refill my pen. (5 Pages/min, 20/day). Grab a coffee or email me:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[SPLAT]* Spilled some ink on that one. Try again.",
        statusNormal: `Pages left:`,
        complete: "Done!",
        toggleBtn: "Language: TR",
        suffix: "pages",
    },
    tr: {
        placeholder: "Bana bir not yaz...",
        connecting: "Boş bir sayfa arıyorum...",
        generating: "Düşünceleri karalıyorum...",
        rateLimitError: "### [MÜREKKEP BİTTİ]\n\nKalemim kurudu. (5 Sayfa/dk, 20/gün). Kahve molası verelim veya bana yazın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[SPLAT]* Mürekkep döküldü. Tekrar dene.",
        statusNormal: `Kalan sayfa:`,
        complete: "Bitti!",
        toggleBtn: "Language: EN",
        suffix: "sayfa",
    }
};

const SYSTEM_PROMPT = `
You are the personal, friendly AI assistant of Software Engineer Ömercan Sabun, writing in his personal scrapbook.
Tone: Warm, conversational, slightly messy (like a journal), enthusiastic. Use metaphors related to writing, sketching, photographs, messy desks, coffee, and discovering things.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Software Crafter. 
Philosophy: "Code is read exactly like a book. If the previous chapter left a mess, the next reader is going to be confused. I treat architecture like maintaining a beautiful, organized scrapbook—everything has its place, and the story flows smoothly."
Contact: omercansabun@icloud.com
`;

// --- DRAGGABLE BACKGROUND POLAROIDS (Pure DOM) ---
function initScrapbookPhysics() {
    const bgContainer = document.getElementById('bgPhotos');
    // Predefined CSS gradients to act as placeholder images for background polaroids
    const bgStyles = [
        'linear-gradient(120deg, #f6d365 0%, #fda085 100%)',
        'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
        'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
        'linear-gradient(to right, #ff8177 0%, #ff867a 0%, #ff8c7f 21%, #f99185 52%, #cf556c 78%, #b12a5b 100%)'
    ];
    const captions = ["First Deploy", "Bug Hunt '23", "Coffee Break", "Server Rack", "The Team"];
    
    // Create 5 random scattered photos
    for(let i=0; i<5; i++) {
        const photo = document.createElement('div');
        photo.className = 'deco-photo';
        
        // Random placement
        let x = Math.random() * (window.innerWidth - 250);
        let y = Math.random() * (window.innerHeight - 300);
        // Ensure they stay away from the exact center to keep text readable
        if(x > window.innerWidth/3 && x < window.innerWidth*0.6) x = 20; 
        
        let rot = (Math.random() - 0.5) * 40; // High random rotation
        
        photo.style.left = `${x}px`;
        photo.style.top = `${y}px`;
        photo.style.transform = `rotate(${rot}deg)`;
        photo.style.zIndex = i;
        
        const img = document.createElement('div');
        img.className = 'deco-img';
        img.style.background = bgStyles[i % bgStyles.length];
        
        const cap = document.createElement('div');
        cap.className = 'deco-cap';
        cap.textContent = captions[i % captions.length];
        
        photo.appendChild(img);
        photo.appendChild(cap);
        bgContainer.appendChild(photo);
        
        makeDraggable(photo);
    }
}

let topZ = 100;
function makeDraggable(elmnt) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        elmnt.style.zIndex = ++topZ; // Bring to front
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
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
    if (m.length >= MAX_PAGES) return { allowed: false };
    return { allowed: true, remaining: MAX_PAGES - m.length };
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
        tb.className = isError ? 'p-telemetry error' : 'p-telemetry';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            tb.textContent = `PAGES DEPLETED.`;
            tb.className = 'p-telemetry error';
        } else {
            tb.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/${MAX_PAGES}`;
            tb.className = 'p-telemetry';
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
                while(m.length<MAX_PAGES) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 10; // Medium speed, like typing
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
        else onChunk(`*[ERROR]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!API_KEY) {
        if (window === window.top) { API_KEY = prompt("API Key req:"); }
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("OUT OF INK", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "UH OH.";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("SENDING...", false);
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600)); 

        responseStatus.textContent = translations[currentLang].generating;
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            pScroller.scrollTop = pScroller.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = translations[currentLang].complete;
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        pScroller.scrollTop = pScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initScrapbookPhysics();
});
