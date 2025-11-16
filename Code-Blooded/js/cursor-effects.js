class SimpleCursor {
    constructor() {
        this.mouse = { x: 0, y: 0 };
        this.circlePos = { x: 0, y: 0 };
        
        // Circle follows with slight delay
        this.followSpeed = 0.15;
        
        // State
        this.isVisible = false;
        this.isOnScreen = false;
        
        this.init();
    }

    init() {
        console.log('Initializing simple cursor...');
        
        // Set initial positions off-screen
        this.mouse.x = -100;
        this.mouse.y = -100;
        this.circlePos.x = -100;
        this.circlePos.y = -100;
        
        this.createCursorElements();
        
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

    createCursorElements() {
        // Create cursor dot
        this.cursorDot = document.createElement('div');
        this.cursorDot.className = 'cursor-dot';
        document.body.appendChild(this.cursorDot);
        
        // Create following circle
        this.cursorCircle = document.createElement('div');
        this.cursorCircle.className = 'cursor-circle';
        document.body.appendChild(this.cursorCircle);
    }

    onMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        
        this.isOnScreen = true;
        
        if (!this.isVisible) {
            this.showCursor();
        }
    }

    onMouseDown() {
        // Add ripple effect
        this.addRippleEffect(this.mouse.x, this.mouse.y);
    }

    onMouseEnter() {
        this.isOnScreen = true;
        this.showCursor();
    }

    onMouseLeave() {
        this.isOnScreen = false;
        this.hideCursor();
    }

    onTouchStart() {
        this.isOnScreen = false;
        this.hideCursor();
    }

    showCursor() {
        if (!this.isVisible && this.isOnScreen) {
            this.cursorDot.style.opacity = '1';
            this.cursorCircle.style.opacity = '1';
            this.isVisible = true;
        }
    }

    hideCursor() {
        if (this.isVisible) {
            this.cursorDot.style.opacity = '0';
            this.cursorCircle.style.opacity = '0';
            this.isVisible = false;
        }
    }

    addRippleEffect(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'cursor-ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.transform = 'translate(-50%, -50%)';
        
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    updateCursorPositions() {
        // Dot follows mouse instantly (responsive)
        this.cursorDot.style.left = this.mouse.x + 'px';
        this.cursorDot.style.top = this.mouse.y + 'px';
        
        // Circle follows with smooth delay
        this.circlePos.x += (this.mouse.x - this.circlePos.x) * this.followSpeed;
        this.circlePos.y += (this.mouse.y - this.circlePos.y) * this.followSpeed;
        
        this.cursorCircle.style.left = this.circlePos.x + 'px';
        this.cursorCircle.style.top = this.circlePos.y + 'px';
    }

    animate() {
        this.updateCursorPositions();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize simple cursor
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SimpleCursor();
    });
} else {
    new SimpleCursor();
}