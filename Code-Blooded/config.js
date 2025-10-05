// config.js - Add this to .gitignore
const CONFIG = {
    SUPABASE_URL: 'https://bkbeobpoipfgfqcezoya.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmVvYnBvaXBmZ2ZxY2V6b3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzY2MDIsImV4cCI6MjA3NDY1MjYwMn0._f9jAZtSOkSeKyF9i-Wv0Qn1OLosWqKJwKzaLPd6V3g'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
