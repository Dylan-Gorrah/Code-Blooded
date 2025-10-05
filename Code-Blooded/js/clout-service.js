// js/clout-service.js
class CloutService {
    constructor() {
        this.actionWeights = {
            // Receiving clout (higher value)
            post_star_received: 10,
            comment_like_received: 5,
            post_featured: 50,
            post_trending: 25,
            
            // Giving clout (lower value)
            post_rated: 2,
            comment_liked: 1,
            comment_posted: 3,
            post_created: 15
        };
        
        this.dailyLimits = {
            post_rated: 5,
            comment_liked: 20,
            comment_posted: 10
        };

        this.tiers = {
            novice: { min: 0, max: 500 },
            contributor: { min: 501, max: 2000 },
            influencer: { min: 2001, max: 10000 },
            legend: { min: 10001, max: Infinity }
        };
    }

    async awardClout(userId, actionType, targetUserId = null, targetPostId = null, targetCommentId = null) {
        try {
            // Check daily limits for giving actions
            if (this.dailyLimits[actionType]) {
                const todaysActions = await this.getTodaysActionCount(userId, actionType);
                if (todaysActions >= this.dailyLimits[actionType]) {
                    console.log(`Daily limit reached for ${actionType}`);
                    return 0;
                }
            }

            // Anti-gaming: Check for suspicious patterns
            if (await this.detectCloutGaming(userId, actionType)) {
                console.log('Clout gaming detected - action blocked');
                return 0;
            }

            const baseClout = this.actionWeights[actionType] || 0;
            const multiplier = await this.calculateCloutMultiplier(userId);
            const finalClout = Math.round(baseClout * multiplier);

            // Log transaction
            await this.logCloutTransaction(
                userId, 
                actionType, 
                finalClout, 
                targetUserId, 
                targetPostId, 
                targetCommentId
            );

            // Update user's clout score
            await this.updateUserClout(userId, finalClout);

            // Update daily activity
            await this.updateDailyActivity(userId, actionType);

            console.log(`Awarded ${finalClout} clout to user ${userId} for ${actionType}`);
            return finalClout;

        } catch (error) {
            console.error('Error awarding clout:', error);
            return 0;
        }
    }

    async calculateCloutMultiplier(userId) {
        let multiplier = 1.0;
        
        // Consistency bonus (7-day streak)
        const streak = await this.getActivityStreak(userId);
        if (streak >= 7) multiplier += 0.1;
        
        // Community helper bonus (based on helpful comments)
        const helperScore = await this.getHelperScore(userId);
        if (helperScore > 10) multiplier += 0.05;
        
        // Expertise bonus (posts in verified tech stacks)
        const expertiseBonus = await this.getExpertiseBonus(userId);
        multiplier += expertiseBonus;
        
        return Math.min(multiplier, 1.5); // Cap at 50% bonus
    }

    async getActivityStreak(userId) {
        const { data, error } = await supabase
            .from('user_daily_activity')
            .select('activity_date')
            .eq('user_id', userId)
            .order('activity_date', { ascending: false })
            .limit(7);

        if (error || !data.length) return 0;

        let streak = 0;
        let currentDate = new Date();
        
        for (let i = 0; i < data.length; i++) {
            const activityDate = new Date(data[i].activity_date);
            const diffTime = currentDate - activityDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === i) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    async getHelperScore(userId) {
        const { data, error } = await supabase
            .from('comments')
            .select('like_count')
            .eq('user_id', userId);

        if (error) return 0;
        return data.reduce((acc, comment) => acc + (comment.like_count || 0), 0);
    }

    async getExpertiseBonus(userId) {
        // Placeholder: Could be based on verified tech stack or domain expertise
        // For now, return 0 - can be enhanced later
        return 0;
    }

    async getTodaysActionCount(userId, actionType) {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('clout_transactions')
            .select('id')
            .eq('user_id', userId)
            .eq('action_type', actionType)
            .gte('created_at', today + 'T00:00:00')
            .lt('created_at', today + 'T23:59:59');

        if (error) return 0;
        return data.length;
    }

    async logCloutTransaction(userId, actionType, cloutAmount, targetUserId, targetPostId, targetCommentId) {
        const { error } = await supabase
            .from('clout_transactions')
            .insert([{
                user_id: userId,
                action_type: actionType,
                clout_amount: cloutAmount,
                target_user_id: targetUserId,
                target_post_id: targetPostId,
                target_comment_id: targetCommentId
            }]);

        if (error) throw error;
    }

    async updateUserClout(userId, cloutAmount) {
        // Get current clout
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('clout_score')
            .eq('id', userId)
            .single();

        if (error) throw error;

        const newClout = (profile.clout_score || 0) + cloutAmount;
        const newTier = this.calculateTier(newClout);

        await supabase
            .from('profiles')
            .update({ 
                clout_score: newClout,
                clout_tier: newTier,
                last_activity_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', userId);
    }

    calculateTier(cloutScore) {
        if (cloutScore >= this.tiers.legend.min) return 'legend';
        if (cloutScore >= this.tiers.influencer.min) return 'influencer';
        if (cloutScore >= this.tiers.contributor.min) return 'contributor';
        return 'novice';
    }

    async updateDailyActivity(userId, actionType) {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('user_daily_activity')
            .select('*')
            .eq('user_id', userId)
            .eq('activity_date', today)
            .single();

        if (error || !data) {
            // Create new activity record
            await supabase
                .from('user_daily_activity')
                .insert([{
                    user_id: userId,
                    activity_date: today,
                    actions_count: 1
                }]);
        } else {
            // Update existing record
            await supabase
                .from('user_daily_activity')
                .update({ actions_count: data.actions_count + 1 })
                .eq('user_id', userId)
                .eq('activity_date', today);
        }
    }

    async detectCloutGaming(userId, actionType) {
        // Rate limiting: Check if user is performing actions too quickly
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data: recentActions, error } = await supabase
            .from('clout_transactions')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', fiveMinutesAgo)
            .order('created_at', { ascending: false });

        if (error) return false;

        // If more than 10 actions in 5 minutes, likely gaming
        if (recentActions.length > 10) {
            console.log('Rate limiting triggered for user:', userId);
            return true;
        }

        // Check for reciprocal voting patterns (simplified)
        if (actionType === 'post_rated' || actionType === 'comment_liked') {
            const reciprocalPattern = await this.checkReciprocalPattern(userId, actionType);
            if (reciprocalPattern) return true;
        }

        return false;
    }

    async checkReciprocalPattern(userId, actionType) {
        // Simplified reciprocal pattern detection
        // In a real implementation, this would be more sophisticated
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const { data: recentReciprocalActions, error } = await supabase
            .from('clout_transactions')
            .select('target_user_id, created_at')
            .eq('user_id', userId)
            .eq('action_type', actionType)
            .gte('created_at', oneHourAgo);

        if (error) return false;

        // If same user received multiple actions in short time, might be reciprocal
        const userActionCounts = {};
        recentReciprocalActions.forEach(action => {
            if (action.target_user_id) {
                userActionCounts[action.target_user_id] = (userActionCounts[action.target_user_id] || 0) + 1;
            }
        });

        // If any user received more than 3 actions in an hour, flag it
        return Object.values(userActionCounts).some(count => count > 3);
    }

    // Weekly clout decay (to be called by a scheduled function)
    async applyWeeklyDecay() {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, clout_score');

        if (error) throw error;

        for (const profile of profiles) {
            const decayedClout = Math.floor(profile.clout_score * 0.95); // 5% decay
            await supabase
                .from('profiles')
                .update({ clout_score: decayedClout })
                .eq('id', profile.id);
        }
    }

    // Get user's clout statistics
    async getUserCloutStats(userId) {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('clout_score, clout_tier, last_activity_date')
            .eq('id', userId)
            .single();

        if (error) throw error;

        const { data: transactions } = await supabase
            .from('clout_transactions')
            .select('action_type, clout_amount, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        return {
            score: profile.clout_score || 0,
            tier: profile.clout_tier || 'novice',
            lastActivity: profile.last_activity_date,
            recentTransactions: transactions || [],
            streak: await this.getActivityStreak(userId)
        };
    }
}