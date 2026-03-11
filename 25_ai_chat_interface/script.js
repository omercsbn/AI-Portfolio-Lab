const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');

// Simulated AI Responses
const responses = {
    'projects': `<p>Here are the key systems currently active in my databanks:</p>
                 <br>
                 <p><strong>DevAssist AI</strong>: An LLM orchestrator built on Kubernetes. It automates DevOps tasks using a Python backend.</p>
                 <p><strong>Fusion Banking</strong>: A high-frequency core ledger. Built with Go and Kafka to ensure zero data loss under extreme loads.</p>
                 <p><strong>AutoFinance</strong>: A Document Retrieval system utilizing RAG (Retrieval-Augmented Generation) on .NET 8 and MSSQL.</p>`,
    
    'tech': `<p>My architect has trained me on the following stack:</p>
             <p><strong>Core Languages:</strong> Go, Rust, Python, C#.</p>
             <p><strong>Infrastructure:</strong> Kubernetes, Docker, AWS, Terraform.</p>
             <p><strong>Messaging/Data:</strong> Kafka, PostgreSQL, Redis.</p>
             <p><strong>Architecture Philosophy:</strong> Domain-Driven Design, Event-Driven Architecture, CQRS.</p>`,
             
    'contact': `<p>I am authorizing a direct uplink to the architect.</p>
                <p>You can transmit a message here: <br><br>
                <a href="mailto:hello@omercan.dev" style="color:#10a37f; text-decoration:none; border:1px solid #10a37f; padding:10px 15px; border-radius:4px; display:inline-block;">Launch Mail Client (hello@omercan.dev)</a></p>`,
                
    'default': `<p>I process technical structures and cloud-native logic. I can elaborate on projects, tech stack, or provide contact coordinates. What is your query?</p>`
};

function processInput() {
    const text = userInput.value.trim();
    if(text === '') return;
    
    // Add User Message
    addMessage(text, 'user-msg', 'GU');
    userInput.value = '';
    
    // Determine AI Response
    let reply = responses['default'];
    let lowerText = text.toLowerCase();
    if(lowerText.includes('project') || lowerText.includes('work')) reply = responses['projects'];
    else if(lowerText.includes('stack') || lowerText.includes('tech') || lowerText.includes('skill')) reply = responses['tech'];
    else if(lowerText.includes('contact') || lowerText.includes('email') || lowerText.includes('hire')) reply = responses['contact'];
    
    // Simulate thinking delay
    setTimeout(() => {
        addMessage(reply, 'ai-msg', 'OS');
    }, 600);
}

function askQuestion(q) {
    userInput.value = q;
    processInput();
}

function addMessage(htmlContent, msgType, avatarText) {
    const div = document.createElement('div');
    div.className = `message ${msgType}`;
    div.innerHTML = `
        <div class="msg-avatar">${avatarText}</div>
        <div class="msg-bubble">${htmlContent}</div>
    `;
    
    // Only append quick chips on ai responses if it's the default response (optional touch)
    
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

userInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') processInput();
});
