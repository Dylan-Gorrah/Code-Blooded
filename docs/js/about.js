// About page interactions

class SubtleWaveAnimation {
    constructor() {
        this.canvas = document.getElementById('waveCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nameText = document.getElementById('nameText');
        this.subtitle = document.getElementById('subtitle');
        this.aboutSection = document.getElementById('aboutSection');
        this.waves = [];
        this.animationId = null;
        this.startTime = Date.now();
        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.createWaves();
        this.animate();

        setTimeout(() => { this.nameText.classList.add('visible'); }, 1500);
        setTimeout(() => { this.subtitle.classList.add('visible'); }, 2000);
        setTimeout(() => { this.aboutSection.classList.add('visible'); }, 2500);
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
    }

    createWaves() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.waves = [
            { x: width * 0.2, y: height * 0.4, frequency: 0.015, amplitude: 25, phase: 0 },
            { x: width * 0.8, y: height * 0.6, frequency: 0.018, amplitude: 30, phase: Math.PI/2 },
            { x: width * 0.5, y: height * 0.2, frequency: 0.012, amplitude: 20, phase: Math.PI },
        ];
    }

    animate() {
        const currentTime = Date.now();
        const elapsed = (currentTime - this.startTime) / 1000;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawMinimalInterference(elapsed);
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    drawMinimalInterference(time) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        for (let x = 0; x < width; x += 6) {
            for (let y = 0; y < height; y += 6) {
                let totalAmplitude = 0;
                this.waves.forEach(wave => {
                    const distance = Math.sqrt((x - wave.x) ** 2 + (y - wave.y) ** 2);
                    const waveValue = Math.sin(distance * wave.frequency - time * 1.5 + wave.phase) * wave.amplitude;
                    totalAmplitude += waveValue;
                });
                const interferenceStrength = Math.abs(totalAmplitude) / 150;
                if (interferenceStrength > 0.3) {
                    const alpha = interferenceStrength * 0.15;
                    this.ctx.fillStyle = `rgba(102, 126, 234, ${alpha})`;
                    const size = interferenceStrength * 1.5;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }
}

// Initialize shared cursor and page animations
document.addEventListener('DOMContentLoaded', () => {
    // The shared cursor script auto-initializes when included; ensure spotlight exists
    const spotlight = document.querySelector('.spotlight');
    if (!spotlight) {
        const s = document.createElement('div');
        s.className = 'spotlight';
        document.body.appendChild(s);
    }

    new SubtleWaveAnimation();
    checkAuthStatus();
});

async function checkAuthStatus() {
    try {
        const supabase = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
        const { data: { session } } = await supabase.auth.getSession();
        
        const profileLink = document.getElementById('profile-nav-link');
        if (profileLink) {
            if (session) {
                profileLink.style.display = 'block';
            } else {
                profileLink.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }
}


