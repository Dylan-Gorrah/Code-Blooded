# CodeBlooded - Project Context

## What Is This?

CodeBlooded is a developer community platform - think Reddit + LinkedIn + GitHub had a baby. It's where developers share their side projects, earn reputation (called "clout"), unlock achievements, and connect with other devs without corporate BS.

**The vibe:** Your code speaks. Your projects shine. Simple as that.

---

## What I See (Tech Overview)

### Frontend

- **Pure HTML/CSS/JavaScript** (no frameworks - keeping it simple)
- **Supabase** for backend (database + auth)
- **Custom cursor effects** (breathing animation, smooth movement)
- **Glass morphism dark UI** - built for 2am coding sessions
- **Responsive design** - works everywhere

### Database (Supabase)

Your database has 10 tables:

1. **profiles** - user info, clout scores, badges
2. **posts** - projects and ideas
3. **comments** - threaded discussions
4. **post_ratings** - star ratings (1-5)
5. **rooms** - collaborative spaces (like subreddits)
6. **room_members** - who's in which room
7. **badges** - 25+ achievements to unlock
8. **user_badges** - what users have unlocked
9. **clout_transactions** - tracks reputation changes
10. **user_daily_activity** - tracks streaks and engagement

### Key Features

**Working:**

- ✅ User authentication (email/password)
- ✅ Profile creation with auto-trigger
- ✅ Post creation (projects/ideas)
- ✅ Room creation (public/private with shareable codes)
- ✅ Comment system with nested replies
- ✅ Star rating system (1-5 stars)
- ✅ Clout system with anti-gaming protection
- ✅ Badge/achievement system (25+ badges)
- ✅ Activity streak tracking
- ✅ Glass morphism UI with custom cursors
- ✅ GitHub Pages deployment ready

**Partially Implemented:**

- ⚠️ Leaderboard (UI exists, needs backend logic)
- ⚠️ Notifications (counter exists, no real-time updates)
- ⚠️ Search functionality (UI exists, not connected)
- ⚠️ Following system (schema exists, no UI)
- ⚠️ Saved posts (UI exists, not functional)
- ⚠️ Profile editing (modal exists, backend works)

**Not Started:**

- ❌ Real-time updates (no websockets/realtime subscriptions)
- ❌ Image uploads (avatars, project screenshots)
- ❌ Direct messaging
- ❌ Email notifications
- ❌ OAuth (GitHub/Google login)

---

## Architecture

```
Code-Blooded/
├── Code-Blooded/          # Source files (development)
│   ├── index.html         # Landing page with auth
│   ├── dashboard.html     # Main feed
│   ├── profile.html       # User profile
│   ├── about.html         # About page
│   ├── config.js          # Supabase credentials (gitignored)
│   ├── css/               # Stylesheets
│   └── js/                # JavaScript modules
│       ├── auth-handler.js
│       ├── dashboard.js
│       ├── profile.js
│       ├── clout-service.js
│       ├── badge-service.js
│       └── cursor-effects.js
│
├── docs/                  # GitHub Pages deployment copy
│   └── (mirrors Code-Blooded/)
│
├── README.md              # User-facing documentation
├── SUPABASE_SETUP.md      # Complete database setup guide
└── BADGES_SEED_DATA.sql   # Badge definitions
```

---

## Important Considerations

### Security

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ `config.js` in `.gitignore` (never commit API keys)
- ✅ Only uses `anon` key (public-safe)
- ⚠️ No rate limiting beyond Supabase defaults
- ⚠️ No content moderation or spam protection

### Clout System (Smart Features)

The reputation system has anti-gaming protection:

- **Daily limits** on actions (can't spam ratings)
- **Rate limiting** (max 10 actions per 5 minutes)
- **Reciprocal pattern detection** (catches fake engagement)
- **Multipliers** for consistency (7-day streak = +10% clout)
- **Weekly decay** (5% per week - keeps things fresh)

### Badge System

- 25+ badges across Bronze → Legendary tiers
- Categories: Profile, Projects, Community, Clout, Streaks, Social, Fun
- Some are **secret** (hidden requirements)
- Auto-unlocks with popup notifications

### Performance

- ✅ Database indexes on common queries
- ✅ Minimal JavaScript (no heavy frameworks)
- ⚠️ No lazy loading for posts (could be slow with 100+ posts)
- ⚠️ No caching (every page load hits database)

### Deployment

- Ready for **GitHub Pages** (static hosting)
- Instructions in README
- Requires Supabase project setup
- Free tier works fine for MVP

---

## MVP Status - What's Left?

### Core Features (Must-Have for MVP)

**Authentication ✅**

- Login/Register works
- Email verification supported
- Profile auto-creation works

**Posts ✅**

- Create projects/ideas ✅
- View feed ✅
- Rate posts ✅
- Comment on posts ✅
- Filter by recent/trending ✅

**Rooms ✅**

- Create rooms (public/private) ✅
- Shareable codes ✅
- Room settings ✅

**Profile ✅**

- View profile ✅
- Display stats ✅
- Show badges ✅

**Clout System ✅**

- Award points ✅
- Track tiers (Novice → Legend) ✅
- Anti-gaming protection ✅

### Missing for MVP (Blockers)

1. **Room Feed** ❌

   - Can create rooms but can't view posts inside them
   - No room detail page
   - No room feed/timeline
   - **Priority: HIGH**

2. **Leaderboard** ❌

   - UI exists but not functional
   - Need to query top users by clout
   - **Priority: MEDIUM**

3. **Search** ❌

   - Search bar exists but does nothing
   - Need to search posts/users/tags
   - **Priority: MEDIUM**

4. **Notifications** ❌

   - Counter shows "3" but it's hardcoded
   - No real notification system
   - **Priority: LOW (can ship without)**

5. **Profile Editing** ⚠️

   - Modal exists but save functionality incomplete
   - Need to update profile data
   - **Priority: MEDIUM**

6. **Following System** ❌
   - Database ready but no UI
   - Follow/unfollow buttons missing
   - **Priority: LOW**

---

## What Can Be Improved?

### Quick Wins (Easy to Add)

1. **Complete Room Viewing**

   - Add room detail page
   - Show posts in specific rooms
   - Member list display

2. **Implement Search**

   - Basic text search on posts/users
   - Tag filtering
   - Already has UI, just needs backend

3. **Fix Profile Editing**

   - Connect save button to Supabase update
   - Add avatar upload placeholder
   - Tech stack selector

4. **Leaderboard Query**

   - Simple query: top 50 users by clout
   - Display with tier badges
   - Update weekly

5. **Saved Posts**
   - Create `saved_posts` table
   - Toggle save button
   - Show in profile tab

### Medium Improvements

1. **Real-time Updates**

   - Use Supabase Realtime for new posts
   - Live comment updates
   - Online status indicators

2. **Image Uploads**

   - Supabase Storage for avatars
   - Project screenshots
   - Image previews in posts

3. **Better Notifications**

   - Create `notifications` table
   - Comment replies, likes, follows
   - Mark as read functionality

4. **Enhanced Feed**

   - Infinite scroll
   - Lazy loading
   - Better filters (by tag, language, etc.)

5. **Social Features**
   - Follow users
   - Following feed
   - User mentions (@username)

### Polish (Nice to Have)

1. **Better Analytics**

   - View count tracking (already in schema!)
   - Popular posts this week
   - Trending tags

2. **Email Digests**

   - Weekly summary
   - New followers notification
   - Trending in your tech stack

3. **OAuth Login**

   - Login with GitHub
   - Auto-import repos
   - Sync profile data

4. **Content Moderation**

   - Report button
   - Admin dashboard
   - Spam detection

5. **Mobile App**
   - Already responsive
   - Could wrap as PWA
   - Native feel with better touch

---

## Current Bugs/Issues

1. **Comment count not updating** - Shows "0 Comments" even after posting
2. **Rating doesn't persist** - Stars reset on page refresh
3. **Modal scroll lock** - Background scrolls when modal open
4. **No error messages** - Failed actions don't show user feedback
5. **Hardcoded stats** - Landing page shows fake numbers (1,024 devs, etc.)

---

## Deployment Checklist

Before going live:

- [ ] Set up Supabase project
- [ ] Run all SQL scripts
- [ ] Add badges seed data
- [ ] Create `config.js` with real credentials
- [ ] Test auth flow end-to-end
- [ ] Update landing page stats (remove hardcoded)
- [ ] Add real content (not just test data)
- [ ] Set up redirect URLs in Supabase auth
- [ ] Test on mobile devices
- [ ] Add analytics (optional)

---

## Tech Decisions (Why Things Are This Way)

**Why no framework?**

- Keep it simple, fast, and lightweight
- No build process
- Easy to understand for contributors
- Static hosting friendly

**Why Supabase?**

- Backend-as-a-service (no server needed)
- Built-in auth
- Real-time capabilities
- PostgreSQL (real database, not Firebase's quirks)
- Generous free tier

**Why glass morphism?**

- Looks modern
- Dev-friendly aesthetic
- Works great in dark mode
- Differentiates from competition

**Why clout instead of upvotes?**

- More meaningful than simple karma
- Encourages quality over quantity
- Anti-gaming measures built in
- Gamification feels rewarding

---

## Summary

**You have:** A solid MVP foundation with 70% of core features working

**You need:** Room viewing, search, and leaderboard to call it "complete"

**You could add:** Real-time updates, images, better notifications, social features

**Priority order:**

1. Fix room viewing (HIGH - core feature)
2. Implement search (MEDIUM - users expect it)
3. Build leaderboard (MEDIUM - motivates users)
4. Complete profile editing (MEDIUM - personalization)
5. Everything else (LOW - nice to have)

**Time estimate:**

- MVP completion: 2-3 days of focused work
- Polished product: 1-2 weeks
- Production-ready: 3-4 weeks with testing

**The project is impressive.** Clean code, thoughtful features, solid architecture. Just needs the last 30% to ship! 🚀

---

Built with ❤️ by Dylan Gorrah
