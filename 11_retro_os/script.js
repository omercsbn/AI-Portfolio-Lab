function openWindow(id) {
    document.getElementById('win-' + id).classList.remove('hidden');
    // Bring to front
    document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
    document.getElementById('win-' + id).style.zIndex = 100;
}

function closeWindow(id) {
    document.getElementById('win-' + id).classList.add('hidden');
}

// Clock
setInterval(() => {
    const d = new Date();
    document.getElementById('clock').innerText = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}, 1000);

// Basic Dragging Logic
let draggedWin = null;
let offsetX = 0; let offsetY = 0;

document.querySelectorAll('.title-bar').forEach(tb => {
    tb.addEventListener('mousedown', (e) => {
        draggedWin = e.target.closest('.window');
        offsetX = e.clientX - draggedWin.getBoundingClientRect().left;
        offsetY = e.clientY - draggedWin.getBoundingClientRect().top;
        document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
        draggedWin.style.zIndex = 100;
    });
});

document.addEventListener('mousemove', (e) => {
    if (draggedWin) {
        draggedWin.style.left = (e.clientX - offsetX) + 'px';
        draggedWin.style.top = (e.clientY - offsetY) + 'px';
    }
});

document.addEventListener('mouseup', () => { draggedWin = null; });
