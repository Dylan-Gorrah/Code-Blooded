// config.js - Add this to .gitignore
const CONFIG = {
     SUPABASE_URL: 'https://tkdlwrybhnhwvwxycrgx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrZGx3cnliaG5od3Z3eHljcmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzc3MzIsImV4cCI6MjA3ODcxMzczMn0.uMVcPmVgXuyUJjBRk9W6LJKIXWn5fowFBV4vBxG_jsw'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}

