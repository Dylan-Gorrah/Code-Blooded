class PulsingSpotlightCursor {
    constructor() {
        this.spotlight = document.querySelector('.spotlight');
        
        // Remove dot and ring elements if they exist
        const dot = document.querySelector('[data-cursor-dot]');
        const ring = document.querySelector('[data-cursor-ring]');
        if (dot) dot.remove();
        if (ring) ring.remove();
        
        this.mouse = { x: 0, y: 0 };
        this.cursorPos = { x: 0, y: 0 };
        this.spotlightPos = { x: 0, y: 0 };
        
        // Magnetic properties
        this.magnetStrength = 25;
        this.magnetRadius = 80;
        this.followSpeed = 0.12;
        this.spotlightDelay = 0.08;
        
        // Pulse properties
        this.idleTimeout = null;
        this.isPulsing = false;
        this.pulseAnimation = null;
        
        // State
        this.isVisible = false;
        this.attractedElement = null;
        this.isOnScreen = false;
        
        this.init();
    }

    init() {
        if (!this.spotlight) {
            console.error('Spotlight element not found');
            return;
        }

        console.log('Initializing pulsing spotlight cursor...');
        
        // Set initial positions off-screen
        this.mouse.x = -100;
        this.mouse.y = -100;
        this.cursorPos.x = -100;
        this.cursorPos.y = -100;
        this.spotlightPos.x = -100;
        this.spotlightPos.y = -100;
        
        this.createCursorDot();
        this.updateCursorPositions();
        
        // Event listeners
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', () => this.onMouseDown());
        document.addEventListener('mouseenter', () => this.onMouseEnter());
        document.addEventListener('mouseleave', () => this.onMouseLeave());
        
        // Touch events - hide cursor
        document.addEventListener('touchstart', () => this.onTouchStart());
        document.addEventListener('touchmove', () => this.onTouchStart());
        
        // Start animation loop
        this.animate();
        
        // Initially hidden
        this.hideCursor();
    }

    createCursorDot() {
        // Create a cursor dot inside the spotlight
        this.cursorDot = document.createElement('div');
        this.cursorDot.style.cssText = `
            position: fixed;
            width: 8px;
            height: 8px;
            background: #c30b4e;
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 10px rgba(195, 11, 78, 0.5);
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(this.cursorDot);
    }

    onMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        
        // Update cursor position immediately with magnetic attraction
        const targetPos = this.calculateMagneticAttraction();
        this.cursorPos.x = targetPos.x;
        this.cursorPos.y = targetPos.y;
        
        this.isOnScreen = true;
        
        if (!this.isVisible) {
            this.showCursor();
        }
        
        // Reset idle timer
        this.resetIdleTimer();
    }

    onMouseDown() {
        // Add click ripple effect
        this.addRippleEffect(this.mouse.x, this.mouse.y);
        
        // Reset idle timer on interaction
        this.resetIdleTimer();
    }

    onMouseEnter() {
        this.isOnScreen = true;
        this.showCursor();
        this.resetIdleTimer();
    }

    onMouseLeave() {
        this.isOnScreen = false;
        this.hideCursor();
        this.stopPulsing();
    }

    onTouchStart() {
        this.isOnScreen = false;
        this.hideCursor();
        this.stopPulsing();
    }

    resetIdleTimer() {
        // Clear existing timer
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
        }
        
        // Stop pulsing when moving
        this.stopPulsing();
        
        // Set new timer for 4 seconds
        this.idleTimeout = setTimeout(() => {
            if (this.isOnScreen && this.isVisible) {
                this.startPulsing();
            }
        }, 4000);
    }

    startPulsing() {
        if (this.isPulsing) return;
        
        this.isPulsing = true;
        console.log('Starting cursor pulse...');
        
        // Add pulsing animation to both cursor dot and spotlight
        this.cursorDot.style.animation = 'cursorPulse 2s ease-in-out infinite';
        this.spotlight.style.animation = 'spotlightPulse 2s ease-in-out infinite';
        
        // Add CSS animations if not already added
        if (!document.querySelector('#pulse-animations')) {
            const style = document.createElement('style');
            style.id = 'pulse-animations';
            style.textContent = `
                @keyframes cursorPulse {
                    0%, 100% {
                        transform: translate(-50%, -50%) scale(1);
                        box-shadow: 0 0 15px rgba(195, 11, 78, 0.6);
                        opacity: 1;
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.8);
                        box-shadow: 0 0 30px rgba(195, 11, 78, 1), 0 0 60px rgba(195, 11, 78, 0.4);
                        opacity: 0.7;
                    }
                }
                
                @keyframes spotlightPulse {
                    0%, 100% {
                        opacity: 1;
                        filter: brightness(1);
                    }
                    50% {
                        opacity: 0.4;
                        filter: brightness(0.6);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    stopPulsing() {
        if (!this.isPulsing) return;
        
        this.isPulsing = false;
        console.log('Stopping cursor pulse...');
        
        // Remove pulsing animations
        this.cursorDot.style.animation = '';
        this.spotlight.style.animation = '';
        
        // Reset transforms
        this.cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
        this.spotlight.style.opacity = '1';
    }

    showCursor() {
        if (!this.isVisible && this.isOnScreen) {
            this.cursorDot.style.opacity = '1';
            this.spotlight.classList.add('visible');
            this.isVisible = true;
            this.resetIdleTimer();
        }
    }

    hideCursor() {
        if (this.isVisible) {
            this.cursorDot.style.opacity = '0';
            this.spotlight.classList.remove('visible');
            this.isVisible = false;
            
            // Clear idle timer
            if (this.idleTimeout) {
                clearTimeout(this.idleTimeout);
                this.idleTimeout = null;
            }
            
            // Reset any attracted elements
            if (this.attractedElement) {
                this.attractedElement.style.transform = '';
                this.attractedElement.style.filter = '';
                this.attractedElement.style.transition = '';
                this.attractedElement = null;
            }
        }
    }

    findClickableElements() {
        const selectors = 'button, a, [onclick], input[type="submit"], input[type="button"], .clickable, .cta-button, .auth-button, .nav-link';
        return document.querySelectorAll(selectors);
    }

    calculateMagneticAttraction() {
        if (!this.isOnScreen) return { x: 0, y: 0 };
        
        const elements = this.findClickableElements();
        let closestElement = null;
        let minDistance = Infinity;
        let targetPos = { x: this.mouse.x, y: this.mouse.y };

        elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(this.mouse.x - centerX, 2) + 
                Math.pow(this.mouse.y - centerY, 2)
            );

            if (distance < this.magnetRadius && distance < minDistance) {
                minDistance = distance;
                closestElement = element;
                
                // Calculate attraction strength (stronger when closer)
                const attraction = (this.magnetRadius - distance) / this.magnetRadius;
                
                // Move target position towards element center
                targetPos.x = this.mouse.x + (centerX - this.mouse.x) * attraction * 0.3;
                targetPos.y = this.mouse.y + (centerY - this.mouse.y) * attraction * 0.3;
            }
        });

        // Add visual feedback for attraction
        if (closestElement !== this.attractedElement) {
            if (this.attractedElement) {
                this.attractedElement.style.transform = '';
                this.attractedElement.style.filter = '';
                this.attractedElement.style.transition = '';
            }
            
            if (closestElement) {
                closestElement.style.transform = 'scale(1.05)';
                closestElement.style.filter = 'brightness(1.2)';
                closestElement.style.transition = 'all 0.2s ease';
            }
            
            this.attractedElement = closestElement;
        }

        return targetPos;
    }

    addRippleEffect(x, y) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 20px;
            height: 20px;
            background: rgba(195, 11, 78, 0.3);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 9998;
            animation: ripple 0.6s ease-out forwards;
        `;
        
        document.body.appendChild(ripple);
        
        // Add ripple animation if not already added
        if (!document.querySelector('#ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: translate(-50%, -50%) scale(10);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => ripple.remove(), 600);
    }

    updateCursorPositions() {
        // Only update if cursor should be visible
        if (!this.isOnScreen) {
            this.cursorPos.x = -100;
            this.cursorPos.y = -100;
            this.spotlightPos.x = -100;
            this.spotlightPos.y = -100;
        }
        
        // Cursor dot position (immediate)
        this.cursorDot.style.left = this.cursorPos.x + 'px';
        this.cursorDot.style.top = this.cursorPos.y + 'px';
        
        // Spotlight follows with delay
        this.spotlight.style.background = 
            `radial-gradient(circle at ${this.spotlightPos.x}px ${this.spotlightPos.y}px, transparent 100px, rgba(0, 0, 0, 0.9) 200px)`;
    }

    animate() {
        if (this.isOnScreen) {
            // Spotlight follows cursor with delay
            this.spotlightPos.x += (this.cursorPos.x - this.spotlightPos.x) * this.spotlightDelay;
            this.spotlightPos.y += (this.cursorPos.y - this.spotlightPos.y) * this.spotlightDelay;
        }
        
        this.updateCursorPositions();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize pulsing spotlight cursor
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PulsingSpotlightCursor();
    });
} else {
    new PulsingSpotlightCursor();
}