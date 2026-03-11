const input = document.getElementById('cmd');
const output = document.querySelector('.output');

const commands = {
    'help': '\nAvailable commands:\n  whoami    - Display profile\n  skills    - List tech stack\n  projects  - Show recent works\n  contact   - Get email address\n  clear     - Clear terminal',
    'whoami': '\n> Ömercan Sabun\n> Senior Software Architect focusing on scalable microservices.\n> Turning coffee into resilient cloud-native systems.',
    'skills': '\n> Architecture: DDD, Saga, Event-Driven\n> Backend: C#, Python, Go, Java\n> Cloud: Kubernetes, AWS, Docker',
    'projects': '\n> [1] DevAssist AI: NLP-powered DevOps orchestrator.\n> [2] Fusion Banking: Fault-tolerant fintech backend.\n> [3] AutoFinance: RAG-based conversational AI.',
    'contact': '\n> Email: hello@omercan.dev\n> Protocol: SMTP Ready',
};

input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const cmd = this.value.trim().toLowerCase();
        
        // Print command
        const cmdLog = document.createElement('p');
        cmdLog.innerHTML = `<span class="prompt">omercan@arch:~$</span> ${this.value}`;
        output.appendChild(cmdLog);

        // Process command
        if (cmd === 'clear') {
            output.innerHTML = '';
        } else if (commands[cmd]) {
            const res = document.createElement('pre');
            res.textContent = commands[cmd];
            output.appendChild(res);
        } else if (cmd) {
            const err = document.createElement('p');
            err.textContent = `Command not found: ${cmd}. Type 'help' for a list of commands.`;
            output.appendChild(err);
        }

        this.value = '';
        output.scrollTop = output.scrollHeight;
    }
});
