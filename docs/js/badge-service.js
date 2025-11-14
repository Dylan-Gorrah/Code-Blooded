// js/badge-service.js
class BadgeService {
    constructor() {
        this.badges = [];
        this.userBadges = new Set();
        this.init();
    }

    async init() {
        await this.loadAllBadges();
        await this.loadUserBadges();
    }

    async loadAllBadges() {
        try {
            const { data, error } = await supabase
                .from('badges')
                .select('*')
                .order('tier', { ascending: false });

            if (error) throw error;
            this.badges = data || [];
        } catch (error) {
            console.error('Error loading badges:', error);
        }
    }

    async loadUserBadges() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_badges')
                .select('badge_id')
                .eq('user_id', user.id);

            if (error) throw error;
            this.userBadges = new Set(data.map(item => item.badge_id));
        } catch (error) {
            console.error('Error loading user badges:', error);
        }
    }

    async checkAndAwardBadges(userId, actionType, metadata = {}) {
        const badgesToCheck = this.badges.filter(badge => 
            !this.userBadges.has(badge.id) && 
            this.shouldCheckBadge(badge, actionType)
        );

        const awardedBadges = [];

        for (const badge of badgesToCheck) {
            const shouldAward = await this.evaluateBadgeRequirement(badge, userId, metadata);
            if (shouldAward) {
                await this.awardBadge(userId, badge.id);
                this.userBadges.add(badge.id);
                awardedBadges.push(badge);
                
                // Show notification for new badge
                this.showBadgeNotification(badge);
            }
        }

        return awardedBadges;
    }

    shouldCheckBadge(badge, actionType) {
        const requirementMap = {
            // Profile actions
            'complete_profile': ['profile_updated'],
            'upload_avatar': ['avatar_uploaded'],
            
            // Project actions
            'first_project': ['post_created'],
            'project_100_stars': ['post_star_received', 'post_updated'],
            'five_github_projects': ['post_created'],
            'ten_technologies': ['post_created', 'profile_updated'],
            
            // Community actions
            'fifty_comment_likes': ['comment_like_received'],
            'hundred_ratings': ['post_rated'],
            'ten_ideas': ['post_created'],
            'twenty_five_threads': ['comment_posted'],
            
            // Clout actions
            'thousand_clout': ['clout_earned'],
            'five_thousand_clout': ['clout_earned'],
            'ten_thousand_clout': ['clout_earned'],
            'top_ten_rank': ['clout_earned', 'profile_updated'],
            
            // Consistency actions
            'seven_day_streak': ['daily_activity'],
            'thirty_day_streak': ['daily_activity'],
            'year_streak': ['daily_activity'],
            
            // Specialty actions
            'five_frontend': ['post_created'],
            'five_backend': ['post_created'],
            'three_ai_projects': ['post_created'],
            'three_mobile': ['post_created'],
            
            // Social actions
            'ten_followers': ['follow_received'],
            'fifty_followers': ['follow_received'],
            'two_hundred_followers': ['follow_received'],
            
            // Fun actions (triggered by specific conditions)
            'night_owl': ['post_created', 'comment_posted'],
            'early_bird': ['post_created', 'comment_posted'],
            'weekend_warrior': ['post_created'],
            
            // Secret badges
            'first_hundred': ['user_created'],
            'ten_perfect_scores': ['post_rated_received'],
            'eight_categories': ['post_created']
        };

        const relevantActions = requirementMap[badge.requirement] || [];
        return relevantActions.includes(actionType);
    }

    async evaluateBadgeRequirement(badge, userId, metadata) {
        try {
            switch (badge.requirement) {
                case 'complete_profile':
                    return await this.checkCompleteProfile(userId);
                
                case 'upload_avatar':
                    return await this.checkAvatarUploaded(userId);
                
                case 'first_project':
                    return await this.checkFirstProject(userId);
                
                case 'project_100_stars':
                    return await this.checkProject100Stars(userId);
                
                case 'five_github_projects':
                    return await this.checkFiveGithubProjects(userId);
                
                case 'ten_technologies':
                    return await this.checkTenTechnologies(userId);
                
                case 'fifty_comment_likes':
                    return await this.checkFiftyCommentLikes(userId);
                
                case 'hundred_ratings':
                    return await this.checkHundredRatings(userId);
                
                case 'ten_ideas':
                    return await this.checkTenIdeas(userId);
                
                case 'twenty_five_threads':
                    return await this.checkTwentyFiveThreads(userId);
                
                case 'thousand_clout':
                    return await this.checkThousandClout(userId);
                
                case 'five_thousand_clout':
                    return await this.checkFiveThousandClout(userId);
                
                case 'ten_thousand_clout':
                    return await this.checkTenThousandClout(userId);
                
                case 'top_ten_rank':
                    return await this.checkTopTenRank(userId);
                
                case 'seven_day_streak':
                    return await this.checkSevenDayStreak(userId);
                
                case 'thirty_day_streak':
                    return await this.checkThirtyDayStreak(userId);
                
                case 'year_streak':
                    return await this.checkYearStreak(userId);
                
                case 'five_frontend':
                    return await this.checkFiveFrontend(userId);
                
                case 'five_backend':
                    return await this.checkFiveBackend(userId);
                
                case 'three_ai_projects':
                    return await this.checkThreeAIProjects(userId);
                
                case 'three_mobile':
                    return await this.checkThreeMobile(userId);
                
                case 'ten_followers':
                    return await this.checkTenFollowers(userId);
                
                case 'fifty_followers':
                    return await this.checkFiftyFollowers(userId);
                
                case 'two_hundred_followers':
                    return await this.checkTwoHundredFollowers(userId);
                
                case 'night_owl':
                    return await this.checkNightOwl(metadata);
                
                case 'early_bird':
                    return await this.checkEarlyBird(metadata);
                
                case 'weekend_warrior':
                    return await this.checkWeekendWarrior(userId);
                
                case 'first_hundred':
                    return await this.checkFirstHundred(userId);
                
                case 'ten_perfect_scores':
                    return await this.checkTenPerfectScores(userId);
                
                case 'eight_categories':
                    return await this.checkEightCategories(userId);
                
                default:
                    return false;
            }
        } catch (error) {
            console.error(`Error evaluating badge ${badge.name}:`, error);
            return false;
        }
    }

    // Badge requirement check implementations
    async checkCompleteProfile(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('bio, location, website')
            .eq('id', userId)
            .single();

        return profile && profile.bio && profile.location && profile.website;
    }

    async checkAvatarUploaded(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', userId)
            .single();

        return profile && profile.avatar_url;
    }

    async checkFirstProject(userId) {
        const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'project');

        return !error && count > 0;
    }

    async checkProject100Stars(userId) {
        const { data: posts } = await supabase
            .from('posts')
            .select('clout')
            .eq('user_id', userId);

        return posts && posts.some(post => post.clout >= 100);
    }

    async checkFiveGithubProjects(userId) {
        const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'project')
            .not('github_url', 'is', null);

        return !error && count >= 5;
    }

    async checkTenTechnologies(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tech_stack')
            .eq('id', userId)
            .single();

        return profile && profile.tech_stack && profile.tech_stack.length >= 10;
    }

    async checkFiftyCommentLikes(userId) {
        const { data: comments } = await supabase
            .from('comments')
            .select('like_count')
            .eq('user_id', userId);

        const totalLikes = comments?.reduce((sum, comment) => sum + (comment.like_count || 0), 0) || 0;
        return totalLikes >= 50;
    }

    async checkHundredRatings(userId) {
        const { count, error } = await supabase
            .from('clout_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('action_type', 'post_rated');

        return !error && count >= 100;
    }

    async checkTenIdeas(userId) {
        const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'idea');

        return !error && count >= 10;
    }

    async checkTwentyFiveThreads(userId) {
        const { count, error } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        return !error && count >= 25;
    }

    async checkThousandClout(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('clout_score')
            .eq('id', userId)
            .single();

        return profile && profile.clout_score >= 1000;
    }

    async checkFiveThousandClout(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('clout_score')
            .eq('id', userId)
            .single();

        return profile && profile.clout_score >= 5000;
    }

    async checkTenThousandClout(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('clout_score')
            .eq('id', userId)
            .single();

        return profile && profile.clout_score >= 10000;
    }

    async checkTopTenRank(userId) {
        // This would require a more complex query to get global ranking
        // For now, return false - can be implemented later
        return false;
    }

    async checkSevenDayStreak(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('streak')
            .eq('id', userId)
            .single();

        return profile && profile.streak >= 7;
    }

    async checkThirtyDayStreak(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('streak')
            .eq('id', userId)
            .single();

        return profile && profile.streak >= 30;
    }

    async checkYearStreak(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('streak')
            .eq('id', userId)
            .single();

        return profile && profile.streak >= 365;
    }

    async checkFiveFrontend(userId) {
        const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .contains('tags', ['frontend', 'react', 'vue', 'angular', 'javascript']);

        return !error && count >= 5;
    }

    async checkFiveBackend(userId) {
        const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .contains('tags', ['backend', 'node', 'python', 'java', 'php']);

        return !error && count >= 5;
    }

    async checkThreeAIProjects(userId) {
        const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .contains('tags', ['ai', 'machine-learning', 'neural-network', 'tensorflow', 'pytorch']);

        return !error && count >= 3;
    }

    async checkThreeMobile(userId) {
        const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .contains('tags', ['mobile', 'react-native', 'flutter', 'ios', 'android']);

        return !error && count >= 3;
    }

    async checkTenFollowers(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('follower_count')
            .eq('id', userId)
            .single();

        return profile && profile.follower_count >= 10;
    }

    async checkFiftyFollowers(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('follower_count')
            .eq('id', userId)
            .single();

        return profile && profile.follower_count >= 50;
    }

    async checkTwoHundredFollowers(userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('follower_count')
            .eq('id', userId)
            .single();

        return profile && profile.follower_count >= 200;
    }

    async checkNightOwl(metadata) {
        const hour = new Date().getHours();
        return hour >= 0 && hour < 5; // 12AM - 5AM
    }

    async checkEarlyBird(metadata) {
        const hour = new Date().getHours();
        return hour >= 5 && hour < 8; // 5AM - 8AM
    }

    async checkWeekendWarrior(userId) {
        const { data: posts } = await supabase
            .from('posts')
            .select('created_at')
            .eq('user_id', userId);

        if (!posts) return false;

        const weekendPosts = posts.filter(post => {
            const day = new Date(post.created_at).getDay();
            return day === 0 || day === 6; // Saturday or Sunday
        });

        return weekendPosts.length >= 5;
    }

    async checkFirstHundred(userId) {
        // This would require checking if user is in first 100 users
        // For now, return false - can be implemented with user join date
        return false;
    }

    async checkTenPerfectScores(userId) {
        const { data: posts } = await supabase
            .from('posts')
            .select('clout')
            .eq('user_id', userId);

        return posts && posts.filter(post => post.clout === 5).length >= 10;
    }

    async checkEightCategories(userId) {
        const { data: posts } = await supabase
            .from('posts')
            .select('tags')
            .eq('user_id', userId);

        if (!posts) return false;

        const categories = new Set();
        posts.forEach(post => {
            if (post.tags) {
                post.tags.forEach(tag => categories.add(tag));
            }
        });

        return categories.size >= 8;
    }

    async awardBadge(userId, badgeId) {
        try {
            const { error } = await supabase
                .from('user_badges')
                .insert([{
                    user_id: userId,
                    badge_id: badgeId
                }]);

            if (error) throw error;

            console.log(`Badge awarded: ${badgeId} to user: ${userId}`);
            return true;
        } catch (error) {
            console.error('Error awarding badge:', error);
            return false;
        }
    }

    showBadgeNotification(badge) {
        const notification = document.createElement('div');
        notification.className = 'badge-notification';
        notification.innerHTML = `
            <div class="badge-notification-content">
                <div class="badge-notification-icon">${badge.icon}</div>
                <div class="badge-notification-text">
                    <div class="badge-notification-title">Achievement Unlocked!</div>
                    <div class="badge-notification-name">${badge.name}</div>
                    <div class="badge-notification-desc">${badge.description}</div>
                </div>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 24px;
            background: var(--secondary-bg);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 3000;
            animation: slideInRight 0.5s ease, slideOutRight 0.5s ease 4.5s;
            max-width: 320px;
        `;

        document.body.appendChild(notification);

        // Add animation styles if not present
        if (!document.querySelector('#badge-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'badge-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
                .badge-notification-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .badge-notification-icon {
                    font-size: 32px;
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                }
                .badge-notification-text {
                    flex: 1;
                }
                .badge-notification-title {
                    font-size: 12px;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 2px;
                }
                .badge-notification-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 2px;
                }
                .badge-notification-desc {
                    font-size: 12px;
                    color: var(--text-secondary);
                }
            `;
            document.head.appendChild(style);
        }

        // Remove after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    async getUserBadges(userId) {
        try {
            const { data, error } = await supabase
                .from('user_badges')
                .select(`
                    badge:badges (*)
                `)
                .eq('user_id', userId)
                .order('unlocked_at', { ascending: false });

            if (error) throw error;
            return data.map(item => item.badge) || [];
        } catch (error) {
            console.error('Error getting user badges:', error);
            return [];
        }
    }

    async getAllBadgesWithUserStatus(userId) {
        const userBadges = await this.getUserBadges(userId);
        const userBadgeIds = new Set(userBadges.map(badge => badge.id));

        return this.badges.map(badge => ({
            ...badge,
            unlocked: userBadgeIds.has(badge.id),
            unlockedAt: userBadges.find(ub => ub.id === badge.id)?.unlocked_at
        }));
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadgeService;
}