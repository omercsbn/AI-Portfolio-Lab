const blob = document.querySelector('.cursor-blob');
const layer1 = document.querySelector('.layer-1');
const layer2 = document.querySelector('.layer-2');
const layer3 = document.querySelector('.layer-3');

// Cursor Follower
document.addEventListener('mousemove', (e) => {
    // Move Blob
    blob.style.left = e.clientX + 'px';
    blob.style.top = e.clientY + 'px';

    // Parallax effect on Kinetic Text based on mouse position
    const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
    const y = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1

    if(window.innerWidth > 768) {
        layer1.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
        layer2.style.transform = `translate(${x * -30}px, ${y * -30}px)`;
        layer3.style.transform = `translate(${x * 40}px, ${y * 40}px)`;
    }
});

// Expand blob on interactive elements
const interactives = document.querySelectorAll('a, .bio-card');
interactives.forEach(el => {
    el.addEventListener('mouseenter', () => {
        blob.style.width = '600px';
        blob.style.height = '600px';
        blob.style.background = 'radial-gradient(circle, rgba(0,255,204,0.8) 0%, rgba(0,255,204,0) 70%)';
    });
    el.addEventListener('mouseleave', () => {
        blob.style.width = '400px';
        blob.style.height = '400px';
        blob.style.background = 'radial-gradient(circle, rgba(255,51,102,0.8) 0%, rgba(255,51,102,0) 70%)';
    });
});
