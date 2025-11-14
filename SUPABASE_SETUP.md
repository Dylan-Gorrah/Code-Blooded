# Supabase Setup Guide for CodeBlooded 🩸

This guide will walk you through setting up your Supabase database from scratch. Follow each step carefully.

---

## 📋 Table of Contents

1. [Create Supabase Project](#step-1-create-supabase-project)
2. [Get Your API Keys](#step-2-get-your-api-keys)
3. [Create Database Tables](#step-3-create-database-tables)
4. [Set Up Row Level Security (RLS)](#step-4-set-up-row-level-security-rls)
5. [Create Database Functions](#step-5-create-database-functions)
6. [Enable Email Auth](#step-6-enable-email-authentication)
7. [Update Your Config File](#step-7-update-your-config-file)
8. [Test Your Setup](#step-8-test-your-setup)

---

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"** if you already have an account
3. Click **"New Project"** button
4. Fill in the details:
   - **Name**: `CodeBlooded` (or whatever you want)
   - **Database Password**: Create a strong password (SAVE THIS - you'll need it!)
   - **Region**: Choose the closest region to you
   - **Pricing Plan**: Free tier is fine for development
5. Click **"Create new project"**
6. Wait 2-3 minutes for your project to be created

---

## Step 2: Get Your API Keys

1. Once your project is ready, you'll be on the **Dashboard**
2. Click on the **⚙️ Settings** icon (bottom left sidebar)
3. Click **"API"** in the settings menu
4. You'll see two important values:
   - **Project URL** - Copy this (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public key** - Copy this (long string starting with `eyJ...`)
5. **Keep these open** - you'll need them in Step 7

---

## Step 3: Create Database Tables

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy and paste the **ENTIRE** SQL script below into the editor
4. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)

### 📝 Complete Database Schema

```sql
-- ============================================
-- CODEBLOODED DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    location TEXT,
    website TEXT,
    github_url TEXT,
    title TEXT DEFAULT 'Code Newbie',
    tech_stack TEXT[] DEFAULT ARRAY[]::TEXT[],
    clout_score INTEGER DEFAULT 0,
    clout_tier TEXT DEFAULT 'novice' CHECK (clout_tier IN ('novice', 'contributor', 'influencer', 'legend')),
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'away')),
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('project', 'idea')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    github_url TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    clout INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. POST RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS post_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- ============================================
-- 5. ROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private')),
    shareable_code TEXT UNIQUE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    member_count INTEGER DEFAULT 0,
    allow_invites BOOLEAN DEFAULT true,
    require_approval BOOLEAN DEFAULT false,
    enable_voting BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. ROOM MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- ============================================
-- 7. BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'legendary')),
    requirement TEXT NOT NULL,
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'secret')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. USER BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- ============================================
-- 9. CLOUT TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS clout_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    clout_amount INTEGER NOT NULL,
    target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    target_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    target_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 10. USER DAILY ACTIVITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_daily_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    actions_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_ratings_post_id ON post_ratings(post_id);
CREATE INDEX IF NOT EXISTS idx_post_ratings_user_id ON post_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clout_transactions_user_id ON clout_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_clout_transactions_created_at ON clout_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_daily_activity_user_id ON user_daily_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_activity_date ON user_daily_activity(activity_date DESC);

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

5. You should see **"Success. No rows returned"** - this is good!
6. Verify tables were created:
   - Click **"Table Editor"** in the left sidebar
   - You should see all 10 tables listed

---

## Step 4: Set Up Row Level Security (RLS)

RLS ensures users can only access their own data and public data. We'll set this up for each table.

1. Go back to **"SQL Editor"**
2. Click **"New query"**
3. Copy and paste the **ENTIRE** RLS script below
4. Click **"Run"**

### 🔒 Row Level Security Policies

```sql
-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE clout_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_activity ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================
-- Anyone can read profiles
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- POSTS POLICIES
-- ============================================
-- Anyone can read posts
CREATE POLICY "Posts are viewable by everyone"
    ON posts FOR SELECT
    USING (true);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
    ON posts FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
    ON posts FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
    ON posts FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- COMMENTS POLICIES
-- ============================================
-- Anyone can read comments
CREATE POLICY "Comments are viewable by everyone"
    ON comments FOR SELECT
    USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
    ON comments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
    ON comments FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
    ON comments FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POST RATINGS POLICIES
-- ============================================
-- Anyone can read ratings
CREATE POLICY "Ratings are viewable by everyone"
    ON post_ratings FOR SELECT
    USING (true);

-- Authenticated users can create ratings
CREATE POLICY "Authenticated users can create ratings"
    ON post_ratings FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings"
    ON post_ratings FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings"
    ON post_ratings FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- ROOMS POLICIES
-- ============================================
-- Anyone can read public rooms
CREATE POLICY "Public rooms are viewable by everyone"
    ON rooms FOR SELECT
    USING (type = 'public' OR created_by = auth.uid());

-- Authenticated users can create rooms
CREATE POLICY "Authenticated users can create rooms"
    ON rooms FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Room creators can update their rooms
CREATE POLICY "Room creators can update rooms"
    ON rooms FOR UPDATE
    USING (auth.uid() = created_by);

-- Room creators can delete their rooms
CREATE POLICY "Room creators can delete rooms"
    ON rooms FOR DELETE
    USING (auth.uid() = created_by);

-- ============================================
-- ROOM MEMBERS POLICIES
-- ============================================
-- Users can see members of rooms they're in
CREATE POLICY "Users can view room members"
    ON room_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM room_members rm
            WHERE rm.room_id = room_members.room_id
            AND rm.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM rooms r
            WHERE r.id = room_members.room_id
            AND r.type = 'public'
        )
    );

-- Authenticated users can join rooms
CREATE POLICY "Authenticated users can join rooms"
    ON room_members FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Users can leave rooms
CREATE POLICY "Users can leave rooms"
    ON room_members FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- BADGES POLICIES
-- ============================================
-- Anyone can read badges
CREATE POLICY "Badges are viewable by everyone"
    ON badges FOR SELECT
    USING (true);

-- ============================================
-- USER BADGES POLICIES
-- ============================================
-- Anyone can read user badges
CREATE POLICY "User badges are viewable by everyone"
    ON user_badges FOR SELECT
    USING (true);

-- System can insert user badges (via service role)
CREATE POLICY "System can insert user badges"
    ON user_badges FOR INSERT
    WITH CHECK (true);

-- ============================================
-- CLOUT TRANSACTIONS POLICIES
-- ============================================
-- Users can read their own transactions
CREATE POLICY "Users can view own transactions"
    ON clout_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert transactions (via service role)
CREATE POLICY "System can insert transactions"
    ON clout_transactions FOR INSERT
    WITH CHECK (true);

-- ============================================
-- USER DAILY ACTIVITY POLICIES
-- ============================================
-- Users can read their own activity
CREATE POLICY "Users can view own activity"
    ON user_daily_activity FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert/update activity (via service role)
CREATE POLICY "System can manage activity"
    ON user_daily_activity FOR ALL
    WITH CHECK (true);
```

5. You should see **"Success. No rows returned"** again

---

## Step 5: Create Database Functions

We need a function to automatically create a profile when a user signs up.

1. In **"SQL Editor"**, click **"New query"**
2. Copy and paste this function:

```sql
-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function when new user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

3. Click **"Run"**

---

## Step 5.5: Add Badges Seed Data (Optional but Recommended)

This populates your badges table with all available badges that users can earn.

1. In **"SQL Editor"**, click **"New query"**
2. Open the file `BADGES_SEED_DATA.sql` from your project
3. Copy the entire contents and paste into the SQL editor
4. Click **"Run"**
5. You should see a count of badges inserted (should be around 25-30 badges)

---

## Step 6: Enable Email Authentication

1. Click **⚙️ Settings** (bottom left)
2. Click **"Authentication"** in the settings menu
3. Scroll down to **"Email Auth"**
4. Make sure **"Enable Email Signup"** is **ON** (toggle should be green)
5. Scroll down to **"Email Templates"** (optional - customize if you want)
6. Scroll down to **"Redirect URLs"**
   - Add your local URL: `http://localhost:5500` (or whatever port you use)
   - Add your production URL if you have one
7. **Save changes** if you made any

---

## Step 7: Update Your Config File

1. Open your project in your code editor
2. Open the file: `Code-Blooded/config.js`
3. Replace the placeholder values with your actual Supabase credentials:

```javascript
// config.js - Add this to .gitignore
const CONFIG = {
    SUPABASE_URL: 'YOUR_PROJECT_URL_HERE',  // Paste your Project URL from Step 2
    SUPABASE_ANON_KEY: 'YOUR_ANON_KEY_HERE'  // Paste your anon public key from Step 2
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
```

**Example:**
```javascript
const CONFIG = {
    SUPABASE_URL: 
    SUPABASE_ANON_KEY: 
};
```

4. **Save the file**

---

## Step 8: Test Your Setup

### Test 1: Check Tables
1. Go to **"Table Editor"** in Supabase
2. Click on **"profiles"** table
3. It should be empty (no rows yet) - this is normal!

### Test 2: Test Registration
1. Open your app in a browser
2. Try to **register a new account**
3. Check your email for the verification email (if email confirmation is enabled)
4. After registering, go back to Supabase **"Table Editor"** → **"profiles"**
5. You should see a new row with your user data!

### Test 3: Test Login
1. Try to **log in** with the account you just created
2. You should be redirected to the dashboard
3. If it works, **SUCCESS!** 🎉

### Test 4: Check Console for Errors
1. Open browser **Developer Tools** (F12)
2. Go to **"Console"** tab
3. Look for any red errors
4. If you see errors about tables not found, go back and re-run the SQL scripts

---

## 🐛 Troubleshooting

### Problem: "Table doesn't exist" error
**Solution:** Go back to Step 3 and re-run the table creation SQL script

### Problem: "Permission denied" error
**Solution:** Go back to Step 4 and re-run the RLS policies SQL script

### Problem: Login doesn't work / redirects back
**Solution:** 
1. Check that your `config.js` has the correct URL and key
2. Make sure there are no extra spaces or quotes in the config
3. Check browser console for specific error messages

### Problem: Profile not created on signup
**Solution:** Go back to Step 5 and re-run the trigger function

### Problem: Can't see other users' posts
**Solution:** Check RLS policies in Step 4 - make sure the SELECT policies allow public reading

---

## ✅ Checklist

Before you finish, make sure:

- [ ] All 10 tables are created (check Table Editor)
- [ ] RLS is enabled on all tables
- [ ] Config.js has your real Supabase URL and key
- [ ] You can register a new account
- [ ] You can log in
- [ ] Profile is created automatically when you register
- [ ] No errors in browser console

---

## 🎉 You're Done!

Your Supabase database is now fully set up! You can start using CodeBlooded.

**Next Steps:**
- Try creating a post
- Try creating a room
- Check your profile
- Explore the dashboard

---

## 📝 Notes

- **Never commit your `config.js` file** to public repositories - it contains your API keys!
- Add `config.js` to your `.gitignore` file
- The free tier of Supabase is perfect for development
- You can always upgrade later if you need more resources

---

**Need Help?** Check the Supabase docs: [https://supabase.com/docs](https://supabase.com/docs)

