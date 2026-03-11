const room = document.getElementById('room');
let isDragging = false;
let startX = 0;
let currentRotationY = 0;

document.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    // Calculate new rotation based on mouse drag distance
    const rotationOffset = dx * 0.5; // Sensitivity
    
    // Apply rotation. Keep Z translation to stay inside the room.
    room.style.transform = `translateZ(-300px) rotateY(${currentRotationY + rotationOffset}deg)`;
});

document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.clientX - startX;
    currentRotationY += dx * 0.5;
});

document.addEventListener('mouseleave', () => {
    isDragging = false;
});

// Auto rotate slowly if not dragging
setInterval(() => {
    if(!isDragging) {
        currentRotationY += 0.1;
        room.style.transform = `translateZ(-300px) rotateY(${currentRotationY}deg)`;
    }
}, 30);
