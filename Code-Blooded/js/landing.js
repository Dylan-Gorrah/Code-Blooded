class LandingPage {
    constructor() {
        this.authHandler = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.animateTrendingStats();
        this.checkAuthStatus();
        
        // Initialize auth handler after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.authHandler = new AuthHandler();
            window.authHandler = this.authHandler; // Make it globally available
            window.authHandlerInitialized = true; // Prevent duplicate initialization
        }, 100);
    }

    async checkAuthStatus() {
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

    setupEventListeners() {
        // CTA button to show register form
        const ctaButton = document.getElementById('cta-button');
        if (ctaButton) {
            console.log('CTA button found, adding event listener');
            ctaButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('CTA button clicked');
                this.switchToRegister();
            });
        } else {
            console.error('CTA button not found!');
        }

        // Form switch links
        const switchLinks = document.querySelectorAll('.switch-link');
        switchLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const formType = e.target.getAttribute('data-form');
                console.log('Switching to form:', formType);
                this.switchForm(formType);
            });
        });
    }

    switchToRegister() {
        this.switchForm('register');
        
        // Scroll to auth section if on mobile
        if (window.innerWidth < 968) {
            document.querySelector('.auth-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }
    }

    switchForm(formType) {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (formType === 'register') {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        } else {
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
        }
    }

    animateTrendingStats() {
        const stats = document.querySelectorAll('.stat-number');
        
        stats.forEach(stat => {
            const target = parseInt(stat.textContent.replace(/,/g, ''));
            const duration = 2000;
            const step = target / (duration / 16); // 60fps
            let current = 0;
            
            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                stat.textContent = Math.floor(current).toLocaleString();
            }, 16);
        });
    }
}

// Initialize landing page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LandingPage();
});