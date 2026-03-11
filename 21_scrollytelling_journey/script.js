document.addEventListener('DOMContentLoaded', () => {
    const path = document.getElementById('draw-path');
    const pathLength = path.getTotalLength();

    // Setup initial dash array and offset
    path.style.strokeDasharray = pathLength + ' ' + pathLength;
    path.style.strokeDashoffset = pathLength;

    // Intersection Observer for Story Blocks fading in
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.story-block').forEach(block => observer.observe(block));

    // Scroll event linked to SVG Path drawing
    window.addEventListener('scroll', () => {
        // Calculate scroll percentage
        let scrollPercent = (document.body.scrollTop + document.documentElement.scrollTop) / (document.documentElement.scrollHeight - document.documentElement.clientHeight);
        
        // Ensure bounds
        scrollPercent = Math.max(0, Math.min(1, scrollPercent));

        // Calculate draw length
        const drawLength = pathLength * scrollPercent;
        
        // Draw path in reverse to make it look like it's growing down
        path.style.strokeDashoffset = pathLength - drawLength;
    });
});
