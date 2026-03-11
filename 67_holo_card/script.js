const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const cardContainer = document.getElementById('cardContainer');
const holoCard = document.getElementById('holoCard');
const holoFoil = document.getElementById('holoFoil');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    if (window === window.top) { API_KEY = prompt("Provide Gemini API Key to activate card:\n(Stored securely)"); }
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_MANA = 5;
const MAX_REQUESTS_PER_DAY = 20;

mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { fontFamily: 'Exo 2', primaryColor: '#21262d', primaryTextColor: '#c9d1d9', primaryBorderColor: '#00f0ff', lineColor: '#ffd700' }});

// Currently single language (EN) to fit card aesthetic compactly.

const SYSTEM_PROMPT = `
You are the AI representation of "Ömercan Sabun, Full Stack Summoner", acting as an interactive trading card.
Tone: RPG/CCG style. Use terms like Mana, Cast, Summon, Buff, Nerf, Hit Points, and Armor to describe software architecture concepts.
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun
Type: Web Architect Class
Ability: "When deploying a containerized application, instantly grant +100 to Auto-Scaling and immune to DDoS status conditions."
Contact: omercansabun@icloud.com
`;

// --- 3D MOUSE TRACKING / HOLO EFFECT ---
let aiState = 'IDLE';

cardContainer.addEventListener('mousemove', (e) => {
    if(window.innerWidth <= 768) return; // Disable on mobile

    const rect = cardContainer.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element.
    const y = e.clientY - rect.top;  // y position within the element.

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const deltaX = x - centerX;
    const deltaY = y - centerY;

    // Calculate rotation (max rotation 20 degrees)
    const rotateX = (deltaY / centerY) * -15; 
    const rotateY = (deltaX / centerX) * 15;

    // Apply tilt
    holoCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    // Calculate foil gradient position base on mouse
    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;
    
    // Animate the shiny holographic foil overlay based on lighting angle
    holoFoil.style.backgroundPosition = `${percentX}% ${percentY}%`;
    holoFoil.style.opacity = Math.max(0, 1 - Math.abs(deltaX/centerX) * 0.5 - Math.abs(deltaY/centerY) * 0.5);
    
    // Add glare effects based on state
    if(aiState === 'GENERATING') {
        holoCard.style.boxShadow = `
            ${-rotateY}px ${rotateX}px 50px rgba(0, 240, 255, 0.6),
            inset 0 0 30px rgba(255, 215, 0, 0.4)
        `;
    } else {
        holoCard.style.boxShadow = `
            ${-rotateY * 0.5}px ${rotateX * 0.5}px 30px rgba(0,0,0,0.8),
            inset 0 0 20px rgba(0, 240, 255, 0.2)
        `;
    }
});

cardContainer.addEventListener('mouseleave', () => {
    // Return to flat state
    holoCard.style.transform = `rotateX(0deg) rotateY(0deg)`;
    holoFoil.style.opacity = 0;
    holoCard.style.boxShadow = `0 0 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(0, 240, 255, 0.2)`;
});

// --- LOGIC ---
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
    if (m.length >= MAX_MANA) return { allowed: false };
    return { allowed: true, remaining: MAX_MANA - m.length };
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
            rateLimitStatus.textContent = `MANA DEPLETED.`;
            rateLimitStatus.className = 'error';
        } else {
            rateLimitStatus.textContent = `MANA: ${quota.remaining}/${MAX_MANA}`;
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
                while(m.length<MAX_MANA) m.push(Date.now());
                localStorage.setItem('gemini_minute_requests', JSON.stringify(m));
                throw new Error("429");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            const fullText = data.candidates[0].content.parts[0].text;
            let currentText = "";
            let chunkLength = 12; 
            for(let i = 0; i < fullText.length; i += chunkLength) {
                currentText += fullText.substring(i, i + chunkLength);
                onChunk(currentText);
                await new Promise(r => setTimeout(r, 15)); 
            }
            onChunk(fullText);
        } else {
             onChunk("*[SIZZLE]* Spell failed.");
        }
    } catch (error) {
        if(error.message === "429") onChunk("### [OUT OF MANA]\n\nCooldown required. Resetting spells. (5 summons/min).");
        else onChunk(`*[ERROR]* ${error.message}`);
    }
}

async function handleSubmission() {
    const query = promptInput.value.trim();
    if(!query) return;

    if (!API_KEY) {
        if (window === window.top) { API_KEY = prompt("API Key req to cast spell:"); }
        if(!API_KEY) return;
        localStorage.setItem('gemini_api_key', API_KEY);
    }

    if (!checkQuota().allowed) {
         updateStatus("OUT OF MANA", true);
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "COOLDOWN...";
         responseContent.innerHTML = marked.parse("### [OUT OF MANA]\n\nCooldown required. Resetting spells. (5 summons/min). Contact the Grandmaster:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).");
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("CASTING...", false);
    
    aiState = 'CONNECTING'; 
    holoCard.style.borderColor = '#ff0055'; // Shift to battle color
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = "CHANNELING SPELL...";
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 400)); 

        responseStatus.textContent = "SUMMONING ENTITY...";
        aiState = 'GENERATING'; 
        
        let completeMarkdown = "";
        
        await fetchStreamGemini(query, (markdownChunk) => {
            completeMarkdown = markdownChunk;
            let html = marked.parse(markdownChunk + "█");
            html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid" style="opacity: 0.3;">$1</div>');
            responseContent.innerHTML = html;
            responseContent.scrollTop = responseContent.scrollHeight;
        });
        
        let finalHtml = marked.parse(completeMarkdown);
        finalHtml = finalHtml.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<div class="mermaid">$1</div>');
        responseContent.innerHTML = finalHtml;
        
        try { mermaid.init(undefined, document.querySelectorAll('.mermaid')); } catch(e) {}
        
        responseStatus.textContent = "SPELL RESOLVED.";
        aiState = 'IDLE'; 
        holoCard.style.borderColor = '#58a6ff'; // Resume normal defense color
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        responseContent.scrollTop = responseContent.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    updateStatus();
});
