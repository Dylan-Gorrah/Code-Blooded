// Supabase configuration - loaded from config.js
const SUPABASE_URL = window.CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.CONFIG.SUPABASE_ANON_KEY;

// Initialize Supabase client (single shared instance)
const supabase = window.supabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
if (!window.supabaseClient) {
    window.supabaseClient = supabase;
}

class AuthHandler {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Check for existing session
        this.checkSession();
        
        // Set up form event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        console.log('Setting up auth event listeners...');
        console.log('Login form found:', !!loginForm);
        console.log('Register form found:', !!registerForm);

        if (loginForm) {
            // Remove any existing listeners by cloning (prevents duplicates)
            loginForm.onsubmit = null;
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleLogin(e);
                return false;
            }, { once: false, capture: true });
            console.log('Login form event listener added');
        }

        if (registerForm) {
            // Remove any existing listeners
            registerForm.onsubmit = null;
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleRegister(e);
                return false;
            }, { once: false, capture: true });
            console.log('Register form event listener added');
            
            // Username validation on input
            const usernameInput = document.getElementById('register-username');
            if (usernameInput) {
                usernameInput.addEventListener('input', (e) => this.validateUsername(e.target.value));
            }
        }
    }

    async checkSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) throw error;
            
            if (session) {
                this.currentUser = session.user;
                this.redirectToDashboard();
            }
        } catch (error) {
            console.error('Error checking session:', error);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const form = e.target;
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const button = form.querySelector('.auth-button');
        const buttonText = button.querySelector('.button-text');
        const buttonLoader = button.querySelector('.button-loader');

        // Show loading state
        buttonText.style.display = 'none';
        buttonLoader.style.display = 'block';
        button.disabled = true;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Login successful
            this.currentUser = data.user;
            this.showSuccess('Login successful! Redirecting...');

            // Ensure session is persisted before redirect to avoid bouncing
            try {
                let attempts = 0;
                while (attempts < 20) { // up to ~2s
                    const { data: s } = await supabase.auth.getSession();
                    if (s && s.session) break;
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }
            } catch (_) {}

            this.redirectToDashboard();

        } catch (error) {
            console.error('Login error:', error);
            const msg = (error && error.message) ? error.message : 'Login failed';
            if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('confirm')) {
                this.showError('Please confirm your email first. We sent you a confirmation link.');
            } else {
                this.showError(msg);
            }
            // Reset button state on error
            buttonText.style.display = 'block';
            buttonLoader.style.display = 'none';
            button.disabled = false;
        }
    }

    redirectToDashboard() {
        // Use replace instead of href to prevent back button issues
        window.location.replace('dashboard.html');
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const githubUrl = document.getElementById('register-github').value;
        const button = form.querySelector('.auth-button');
        const buttonText = button.querySelector('.button-text');
        const buttonLoader = button.querySelector('.button-loader');

        // Validate username
        if (!await this.isUsernameAvailable(username)) {
            this.showError('Username is already taken');
            return;
        }

        // Show loading state
        buttonText.style.display = 'none';
        buttonLoader.style.display = 'block';
        button.disabled = true;

        try {
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username,
                        github_url: githubUrl
                    }
                }
            });

            if (authError) throw authError;

            // Profile creation is handled by a DB trigger after signup.
            // We skip client-side inserts to avoid RLS issues before session is active.
            // Any initial clout awards should occur after login or via backend functions.

            this.showSuccess('Register successful, confirm via email.');
            setTimeout(() => {
                this.switchForm('login');
            }, 3000);

        } catch (error) {
            this.showError(error.message);
        } finally {
            // Reset button state
            buttonText.style.display = 'block';
            buttonLoader.style.display = 'none';
            button.disabled = false;
        }
    }

    async isUsernameAvailable(username) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username)
                .single();

            if (error) {
                // Gracefully handle 404/406 or any transient errors
                return true;
            }
            return !data; // If no data, username is available
        } catch (err) {
            // Treat unexpected errors as non-blocking for UX
            return true;
        }
    }

    async validateUsername(username) {
        const feedbackElement = document.querySelector('#register-username + .auth-label + .input-feedback');
        
        if (username.length < 3) {
            this.setInputFeedback(feedbackElement, 'Username must be at least 3 characters', 'error');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.setInputFeedback(feedbackElement, 'Username can only contain letters, numbers, and underscores', 'error');
            return false;
        }

        if (await this.isUsernameAvailable(username)) {
            this.setInputFeedback(feedbackElement, 'Username is available', 'success');
            return true;
        } else {
            this.setInputFeedback(feedbackElement, 'Username is already taken', 'error');
            return false;
        }
    }

    setInputFeedback(element, message, type) {
        if (!element) return;
        
        element.textContent = message;
        element.style.color = type === 'error' ? 'var(--error-color)' : 'var(--success-color)';
    }

    showError(message) {
        // Create or update error message element
        let errorElement = document.querySelector('.auth-error-message');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'auth-error-message';
            document.querySelector('.auth-container').prepend(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.color = 'var(--error-color)';
        errorElement.style.padding = '12px';
        errorElement.style.marginBottom = '20px';
        errorElement.style.background = 'rgba(255, 71, 87, 0.1)';
        errorElement.style.border = '1px solid var(--error-color)';
        errorElement.style.borderRadius = '8px';
        errorElement.style.textAlign = 'center';

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorElement) {
                errorElement.remove();
            }
        }, 5000);
    }

    showSuccess(message) {
        // Create or update success message element
        let successElement = document.querySelector('.auth-success-message');
        
        if (!successElement) {
            successElement = document.createElement('div');
            successElement.className = 'auth-success-message';
            document.querySelector('.auth-container').prepend(successElement);
        }
        
        successElement.textContent = message;
        successElement.style.color = 'var(--success-color)';
        successElement.style.padding = '12px';
        successElement.style.marginBottom = '20px';
        successElement.style.background = 'rgba(46, 213, 115, 0.1)';
        successElement.style.border = '1px solid var(--success-color)';
        successElement.style.borderRadius = '8px';
        successElement.style.textAlign = 'center';

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (successElement) {
                successElement.remove();
            }
        }, 5000);
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
}

// Initialize auth handler when DOM is loaded (only if not already initialized by landing.js)
// Landing page handles its own initialization
if (!window.authHandlerInitialized) {
    document.addEventListener('DOMContentLoaded', () => {
        new AuthHandler();
    });
}