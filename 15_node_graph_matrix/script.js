const viewport = document.querySelector('.matrix-viewport');
let isDragging = false;
let startX, startY, scrollLeft, scrollTop;

viewport.addEventListener('mousedown', (e) => {
    // Only drag if not clicking a node directly
    if(e.target.closest('.node')) return;
    
    isDragging = true;
    viewport.style.cursor = 'grabbing';
    
    // Native scroll or transform based?
    // Since everything is absolutely positioned in 100vw/100vh, we actually need to translate the inner elements or the SVG + nodes.
    // For simplicity, let's wrap the contents in a .pan-wrapper dynamically if missing, or just translate all children.
});

// Since the original HTML didn't have a wrapper for panning, let's wrap the nodes and SVG dynamically
const panWrapper = document.createElement('div');
panWrapper.className = 'pan-wrapper';
panWrapper.style.position = 'absolute';
panWrapper.style.width = '100%';
panWrapper.style.height = '100%';
panWrapper.style.transformOrigin = '0 0';

// Move SVG and Nodes into wrapper
const svg = document.querySelector('.connections');
const nodes = document.querySelectorAll('.node');

viewport.appendChild(panWrapper);
panWrapper.appendChild(svg);
nodes.forEach(node => panWrapper.appendChild(node));

let currentX = 0;
let currentY = 0;

viewport.addEventListener('mousedown', (e) => {
    if(e.target.closest('.node')) return;
    isDragging = true;
    viewport.style.cursor = 'grabbing';
    startX = e.clientX;
    startY = e.clientY;
});

viewport.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // Direct transform update
    panWrapper.style.transform = `translate(${currentX + dx}px, ${currentY + dy}px)`;
});

viewport.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    viewport.style.cursor = 'grab';
    
    // Save new baseline
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    currentX += dx;
    currentY += dy;
});

viewport.addEventListener('mouseleave', () => {
    isDragging = false;
    viewport.style.cursor = 'grab';
});
