const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const heroSection = document.getElementById('heroSection');
const responseDisplay = document.getElementById('responseDisplay');
const responseContent = document.getElementById('responseContent');
const responseStatus = document.getElementById('responseStatus');
const rateLimitStatus = document.getElementById('rateLimitStatus');
const xScroller = document.querySelector('.x-scroller');
const langToggle = document.getElementById('langToggle');

let API_KEY = localStorage.getItem('gemini_api_key');
if (!API_KEY) {
    API_KEY = prompt("Provide Gemini API Key to access City Planning Division:\n(Stored locally)");
    if (API_KEY) {
        localStorage.setItem('gemini_api_key', API_KEY);
    }
}

const MAX_BLOCKS = 5;
const MAX_REQUESTS_PER_DAY = 20;

let currentLang = 'en';
mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { fontFamily: 'Share Tech Mono', primaryColor: '#ecf0f1', primaryTextColor: '#2c3e50', primaryBorderColor: '#3498db', lineColor: '#e74c3c' }});

const translations = {
    en: {
        placeholder: "DRAFT BLUEPRINT...",
        connecting: "ZONING SECTORS...",
        generating: "ERECTING STRUCTURES...",
        rateLimitError: "### [PERMIT DENIED]\n\nMaterial shortage. (5 Blocks/min, 20/day). Await resupply or contact mayor:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[STRUCTURAL FAILURE]* Foundation collapsed.",
        statusNormal: `RESOURCES:`,
        complete: "CONSTRUCTION FINISHED.",
        toggleBtn: "LOCALE: TR",
        suffix: "BLOCKS",
        gridIdle: "GRID: NOMINAL",
        gridActive: "GRID: EXPANDING"
    },
    tr: {
        placeholder: "PLAN HAZIRLA...",
        connecting: "BÖLGELER İMARLANIYOR...",
        generating: "YAPILAR İNŞA EDİLİYOR...",
        rateLimitError: "### [İZİN REDDEDİLDİ]\n\nMalzeme yetersiz. (5 Blok/dk, 20/gün). İkmali bekleyin veya başkana ulaşın:\n[omercansabun@icloud.com](mailto:omercansabun@icloud.com).",
        errorDefault: "*[YAPISAL HATA]* Temel çöktü.",
        statusNormal: `KAYNAKLAR:`,
        complete: "İNŞAAT TAMAMLANDI.",
        toggleBtn: "LOCALE: EN",
        suffix: "BLOK",
        gridIdle: "AĞ: NORMAL",
        gridActive: "AĞ: GENİŞLİYOR"
    }
};

const SYSTEM_PROMPT = `
You are the automated City Planner AI proxy for Software Architect Ömercan Sabun.
Tone: Plucky, constructive, technical, isometric-game style. Use metaphors of city building, zoning, highways, power grids, residential blocks, and skyscrapers to describe software architecture and design patterns.
Speak in the input language (TR/EN).
Use Markdown heavily. Format diagrams as Mermaid if requested.

PROFILE:
Name: Ömercan Sabun, Master Planner. 
Philosophy: "You don't build a city by stacking all the houses on top of each other. You zone them, connect them with efficient APIs (highways), and ensure your database (power plant) scales to meet the demand of the citizens. I build microservice metropolises."
Contact: omercansabun@icloud.com
`;

// --- THREE.JS VOXEL CITY GENERATOR ---
let scene, camera, renderer;
let cityGroup;
let aiState = 'IDLE'; 

function initThreeJS() {
    const canvas = document.getElementById('voxel-canvas');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xe1e5ee, 0.015); // Fog to hide edges cleanly

    // Isometric Camera setup
    const aspect = window.innerWidth / window.innerHeight;
    const d = 40;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(50, 50, 50); // Angle for isometric
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Hard shadows for toy aesthetics
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    scene.add(dirLight);

    cityGroup = new THREE.Group();
    scene.add(cityGroup);

    // Grid floor
    const gridSize = 100;
    const divisions = 50; // 2 units per voxel cell
    const planeGeo = new THREE.PlaneGeometry(gridSize, gridSize);
    planeGeo.rotateX(-Math.PI / 2);
    // Grid material with outlines
    const planeMat = new THREE.MeshStandardMaterial({ 
        color: 0xbdc3c7, 
        roughness: 1, 
        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.receiveShadow = true;
    plane.position.y = -1; // Just below blocks
    cityGroup.add(plane);
    
    // Draw grid lines
    const gridHelper = new THREE.GridHelper(gridSize, divisions, 0x95a5a6, 0xd0d3d4);
    gridHelper.position.y = -0.99;
    cityGroup.add(gridHelper);

    // Voxel materials
    const materials = [
        new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.2 }), // Glassy blue
        new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.9 }), // White concrete
        new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.8 }), // Red brick
        new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.6 })  // Green park/server rack
    ];

    const boxGeo = new THREE.BoxGeometry(1.9, 1.9, 1.9); // Slightly smaller than 2 to show gaps

    window.blocks = [];

    function addBuilding(x, z, h, matIndex) {
        // Build upwards layer by layer for animation later
        const b = new THREE.Group();
        b.position.set(x, 0, z);
        b.userData = { targetHeight: h, currentHeight: 0, matIndex: matIndex };
        cityGroup.add(b);
        window.blocks.push(b);
    }

    // Initialize base city layout
    for (let x = -40; x <= 40; x += 4) {
        for (let z = -40; z <= 40; z += 4) {
            // Leave open roads/plazas
            if(Math.random() > 0.4) {
                // Determine height based on distance from center (downtown is taller)
                const dist = Math.sqrt(x*x + z*z);
                let maxHeight = Math.max(1, Math.floor(15 - (dist * 0.3)));
                if(maxHeight < 1) maxHeight = 1;
                
                // Add some randomness
                const h = Math.floor(Math.random() * maxHeight) + 1;
                // Mostly white, some blue glass, rare red/green
                const mat = Math.random() > 0.8 ? (Math.random() > 0.5 ? 2 : 3) : (Math.random() > 0.7 ? 0 : 1);
                
                addBuilding(x, z, h, mat);
            }
        }
    }

    function animate() {
        requestAnimationFrame(animate);

        // Slowly pan city
        cityGroup.position.x += 0.01;
        cityGroup.position.z += 0.01;
        
        // Loop back to give illusion of endless scrolling city
        if(cityGroup.position.x > 8) {
            cityGroup.position.x -= 8;
            cityGroup.position.z -= 8;
        }

        // Logic for "constructing" buildings when AI is generating
        window.blocks.forEach(b => {
             let speed = aiState === 'GENERATING' ? 0.3 : 0.02; // Faster build when AI is doing stuff
             
             if (b.userData.currentHeight < b.userData.targetHeight) {
                 b.userData.currentHeight += speed;
                 
                 // If crossed a whole number threshold, add a new physical box
                 const floorNum = Math.floor(b.userData.currentHeight);
                 if (floorNum > b.children.length) {
                     const mesh = new THREE.Mesh(boxGeo, materials[b.userData.matIndex]);
                     mesh.position.y = (floorNum - 1) * 2 + 1; // Correct centering
                     mesh.castShadow = true;
                     mesh.receiveShadow = true;
                     
                     // Add outline for toy look
                     const edges = new THREE.EdgesGeometry(boxGeo);
                     const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x2c3e50 }));
                     mesh.add(line);
                     
                     b.add(mesh);
                 }
                 
                 // if generating, occasionally pop up new targets randomly
             } else if (aiState === 'GENERATING' && Math.random() > 0.99) {
                 b.userData.targetHeight += Math.floor(Math.random()*3)+1;
             }
        });

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        const aspect = window.innerWidth / window.innerHeight;
        camera.left = -d * aspect;
        camera.right = d * aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- LOGIC ---
function toggleLanguage() {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    langToggle.textContent = translations[currentLang].toggleBtn;
    promptInput.placeholder = translations[currentLang].placeholder;
    document.getElementById('gridStatus').textContent = aiState === 'IDLE' ? translations[currentLang].gridIdle : translations[currentLang].gridActive;
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
    const tb = document.getElementById('rateLimitStatus');
    if(text) {
        tb.textContent = text;
        tb.className = isError ? 'error' : '';
    } else {
        const quota = checkQuota();
        if(!quota.allowed) {
            tb.textContent = `ZONING REJECTED.`;
            tb.className = 'error';
        } else {
            tb.textContent = `${translations[currentLang].statusNormal} ${quota.remaining}/${MAX_BLOCKS} ${translations[currentLang].suffix}`;
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
            let chunkLength = 15; 
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
        else onChunk(`*[SYS_ERR]* ${error.message}`);
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
         updateStatus("HALTED", true);
         document.getElementById('heroSection').classList.add('hidden');
         responseDisplay.classList.remove('hidden');
         responseStatus.textContent = "CONSTRUCTION HALTED";
         responseContent.innerHTML = marked.parse(translations[currentLang].rateLimitError);
         return;
    }

    consumeQuota();
    
    promptInput.value = '';
    promptInput.disabled = true;
    updateStatus("ZONING...", false);
    
    aiState = 'CONNECTING'; 
    document.getElementById('gridStatus').textContent = translations[currentLang].gridActive;
    
    document.getElementById('heroSection').classList.add('hidden');
    
    setTimeout(async () => {
        responseDisplay.classList.remove('hidden');
        responseStatus.textContent = translations[currentLang].connecting;
        responseContent.innerHTML = '';
        
        await new Promise(r => setTimeout(r, 600)); 

        responseStatus.textContent = translations[currentLang].generating;
        aiState = 'GENERATING'; // Triggers rapid building construction in Three.js
        
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
        aiState = 'IDLE'; 
        document.getElementById('gridStatus').textContent = translations[currentLang].gridIdle;
        
        promptInput.disabled = false;
        promptInput.focus();
        updateStatus(); 
        xScroller.scrollTop = xScroller.scrollHeight;
        
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    toggleLanguage();
    initThreeJS();
});
