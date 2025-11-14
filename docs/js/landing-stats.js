// js/landing-stats.js
class LandingStats {
    constructor() {
        this.stats = {
            developers: 0,
            projects: 0,
            stars: 0
        };
        this.init();
    }

    async init() {
        await this.loadLiveStats();
        this.animateStats();
    }

    async loadLiveStats() {
        try {
            // Get total users
            const { count: userCount, error: userError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // Get total posts
            const { count: postCount, error: postError } = await supabase
                .from('posts')
                .select('*', { count: 'exact', head: true });

            // Get total clout (stars)
            const { data: cloutData, error: cloutError } = await supabase
                .from('profiles')
                .select('clout_score');

            if (!userError && !postError && !cloutError) {
                this.stats.developers = userCount;
                this.stats.projects = postCount;
                this.stats.stars = cloutData.reduce((sum, user) => sum + (user.clout_score || 0), 0);
            }
        } catch (error) {
            console.error('Error loading live stats:', error);
        }
    }

    animateStats() {
        const stats = document.querySelectorAll('.stat-number');
        
        stats.forEach(stat => {
            const target = this.stats[stat.parentElement.classList[1]] || 0;
            this.animateValue(stat, 0, target, 2000);
        });
    }

    animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            element.textContent = value.toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
}