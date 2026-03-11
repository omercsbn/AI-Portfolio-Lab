const input = document.getElementById('cmd-input');
const output = document.getElementById('output');
const terminal = document.getElementById('terminal');

// Auto focus on input when clicking anywhere
document.addEventListener('click', () => input.focus());

// Command Dictionary
const commands = {
    'help': `Available commands:
  about    - Display architect profile
  projects - List databanks and repositories
  skills   - Show technical proficiencies
  contact  - Establish secure uplink
  clear    - Clear terminal output`,
    
    'about': `[ IDENTITY VERIFIED ]
Name: Ömercan Sabun
Role: System Architect
Focus: Cloud-Native Infrastructure, High-Performance Microservices, AI Orchestration.
Bio: Over 8 years of abstracting chaos into clean, resilient backend logic. I build the engines that don't break.`,
    
    'projects': `[ DEPLOYED SYSTEMS ]
1. DevAssist AI     // Kubernetes-native LLM orchestrator.
2. Fusion Banking   // Core banking ledger written in Go and Kafka.
3. AutoFinance RAG  // Document retrieval system built on .NET 8.
Type 'contact' to inquire about these systems.`,
    
    'skills': `[ CORE COMPETENCIES ]
Orchestration : Kubernetes, Docker, Terraform
Languages     : Go, Python, Rust, C#
Data/Mes      : Kafka, Redis, PostgreSQL, Elasticsearch
Architecture  : Event-Driven, DDD, Microservices`,
    
    'contact': `[ INITIATING SECURE HANDSHAKE ]
Email: <a href="mailto:hello@omercan.dev">hello@omercan.dev</a>
Status: ACCEPTING CONTRACTS.`,
};

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const cmd = this.value.trim().toLowerCase();
        
        // Echo command
        appendLine(`<span class="prompt">guest@omercan.dev:~$</span> ${this.value}`);
        
        if (cmd === '') {
            // Do nothing
        } else if (cmd === 'clear') {
            output.innerHTML = '';
        } else if (commands[cmd]) {
            appendLine(commands[cmd], 'success');
        } else {
            appendLine(`bash: ${cmd}: command not found. Type 'help'.`, 'error');
        }
        
        this.value = '';
        terminal.scrollTop = terminal.scrollHeight;
    }
});

function appendLine(text, className = '') {
    const div = document.createElement('div');
    div.className = `line ${className}`;
    div.innerHTML = text; // using innerHTML to allow links
    output.appendChild(div);
}
