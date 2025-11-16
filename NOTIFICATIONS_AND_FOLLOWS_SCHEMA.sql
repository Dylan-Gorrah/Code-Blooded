-- ============================================
-- NOTIFICATIONS AND FOLLOWS SCHEMA
-- Add these tables to your Supabase database
-- ============================================

-- ============================================
-- 1. FOLLOWS TABLE
-- Track who follows whom
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Indexes for performance
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================
-- 2. NOTIFICATIONS TABLE
-- Store user notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'new_post', 'new_follower', 'comment', 'badge_earned', 'mention'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500), -- URL to navigate to
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- Extra data like post_id, user_id, etc.
);

-- Indexes for performance
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- 3. POST SUBSCRIPTIONS TABLE
-- Track who wants notifications for new posts from specific users
-- ============================================
CREATE TABLE IF NOT EXISTS post_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subscriber_id, author_id),
    CHECK (subscriber_id != author_id)
);

-- Indexes
CREATE INDEX idx_post_subs_subscriber ON post_subscriptions(subscriber_id);
CREATE INDEX idx_post_subs_author ON post_subscriptions(author_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_subscriptions ENABLE ROW LEVEL SECURITY;

-- FOLLOWS POLICIES
-- Anyone can view follows
CREATE POLICY "Follows are viewable by everyone"
    ON follows FOR SELECT
    USING (true);

-- Users can follow others
CREATE POLICY "Users can follow others"
    ON follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
    ON follows FOR DELETE
    USING (auth.uid() = follower_id);

-- NOTIFICATIONS POLICIES
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- System can create notifications (via service role or trigger)
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Users can mark their notifications as read
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- POST SUBSCRIPTIONS POLICIES
-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
    ON post_subscriptions FOR SELECT
    USING (auth.uid() = subscriber_id);

-- Users can subscribe to others
CREATE POLICY "Users can subscribe to posts"
    ON post_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = subscriber_id);

-- Users can unsubscribe
CREATE POLICY "Users can unsubscribe"
    ON post_subscriptions FOR DELETE
    USING (auth.uid() = subscriber_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment following_count for follower
        UPDATE profiles 
        SET following_count = following_count + 1 
        WHERE id = NEW.follower_id;
        
        -- Increment follower_count for followed user
        UPDATE profiles 
        SET follower_count = follower_count + 1 
        WHERE id = NEW.following_id;
        
        -- Create notification for followed user
        INSERT INTO notifications (user_id, type, title, message, link, metadata)
        VALUES (
            NEW.following_id,
            'new_follower',
            'New Follower',
            (SELECT username FROM profiles WHERE id = NEW.follower_id) || ' started following you',
            '/u/' || (SELECT username FROM profiles WHERE id = NEW.follower_id),
            jsonb_build_object('follower_id', NEW.follower_id)
        );
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement following_count for follower
        UPDATE profiles 
        SET following_count = GREATEST(following_count - 1, 0)
        WHERE id = OLD.follower_id;
        
        -- Decrement follower_count for followed user
        UPDATE profiles 
        SET follower_count = GREATEST(follower_count - 1, 0)
        WHERE id = OLD.following_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for follow/unfollow
CREATE TRIGGER on_follow_change
    AFTER INSERT OR DELETE ON follows
    FOR EACH ROW
    EXECUTE FUNCTION update_follower_counts();

-- Function to notify subscribers when user posts
CREATE OR REPLACE FUNCTION notify_post_subscribers()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notifications for all subscribers
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    SELECT 
        ps.subscriber_id,
        'new_post',
        'New Post',
        (SELECT username FROM profiles WHERE id = NEW.user_id) || ' published: ' || NEW.title,
        '/post/' || NEW.id,
        jsonb_build_object('post_id', NEW.id, 'author_id', NEW.user_id)
    FROM post_subscriptions ps
    WHERE ps.author_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new posts
CREATE TRIGGER on_new_post
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION notify_post_subscribers();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View for getting follower details
CREATE OR REPLACE VIEW follower_details AS
SELECT 
    f.id,
    f.follower_id,
    f.following_id,
    f.created_at,
    p.username as follower_username,
    p.display_name as follower_display_name,
    p.avatar_url as follower_avatar,
    p.clout_score as follower_clout
FROM follows f
JOIN profiles p ON f.follower_id = p.id;

-- View for getting following details
CREATE OR REPLACE VIEW following_details AS
SELECT 
    f.id,
    f.follower_id,
    f.following_id,
    f.created_at,
    p.username as following_username,
    p.display_name as following_display_name,
    p.avatar_url as following_avatar,
    p.clout_score as following_clout
FROM follows f
JOIN profiles p ON f.following_id = p.id;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('follows', 'notifications', 'post_subscriptions');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('follows', 'notifications', 'post_subscriptions');
