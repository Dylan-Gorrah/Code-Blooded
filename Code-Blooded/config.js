// config.js - Add this to .gitignore
const CONFIG = {
    SUPABASE_URL: 'GetYourOwn',
    SUPABASE_ANON_KEY: 'GetYourOwn'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}

