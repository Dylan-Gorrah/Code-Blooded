// Dashboard functionality
const supabase = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.posts = [];
        this.rooms = [];
        this.currentFilter = 'recent';
        this.currentSort = 'newest';
        this.currentView = 'feed';
        this.cloutService = new CloutService();
        this.init();
    }

    async init() {
        // Check authentication
        await this.checkAuth();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadPosts();
        await this.loadTopUsers();
        await this.loadUserStats();
    }

    async checkAuth() {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            window.location.href = 'index.html';
            return;
        }
        
        this.currentUser = session.user;
        this.updateUserUI();
    }

    updateUserUI() {
        const email = this.currentUser.email || 'User';
        const initial = email.charAt(0).toUpperCase();
        
        // Update avatars
        document.querySelectorAll('.avatar, .avatar-large').forEach(el => {
            el.textContent = initial;
        });
        
        // Update dropdown
        document.getElementById('dropdown-username').textContent = email.split('@')[0];
        document.getElementById('dropdown-email').textContent = email;
    }

    setupEventListeners() {
        // Profile dropdown
        const profileBtn = document.getElementById('profile-btn');
        const profileMenu = document.getElementById('profile-menu');
        
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('show');
        });
        
        document.addEventListener('click', () => {
            profileMenu.classList.remove('show');
        });
        
        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Create post modal
        const createBtn = document.getElementById('create-btn');
        const modal = document.getElementById('create-modal');
        const modalOverlay = document.getElementById('modal-overlay');
        const modalClose = document.getElementById('modal-close');
        
        createBtn.addEventListener('click', () => modal.classList.add('show'));
        modalOverlay.addEventListener('click', () => modal.classList.remove('show'));
        modalClose.addEventListener('click', () => modal.classList.remove('show'));
        
        // Create room modal
        const createRoomBtn = document.getElementById('create-room-btn');
        const roomModal = document.getElementById('create-room-modal');
        const roomModalOverlay = document.getElementById('room-modal-overlay');
        const roomModalClose = document.getElementById('room-modal-close');
        
        createRoomBtn.addEventListener('click', () => {
            roomModal.classList.add('show');
            this.generateShareableCode(); // Generate initial code
        });
        roomModalOverlay.addEventListener('click', () => roomModal.classList.remove('show'));
        roomModalClose.addEventListener('click', () => roomModal.classList.remove('show'));
        
        // Post type selector
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('post-type').value = btn.dataset.type;
            });
        });
        
        // Room type toggle
        document.querySelectorAll('input[name="room-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.toggleRoomType(e.target.value));
        });
        
        // Regenerate code
        document.getElementById('regenerate-code').addEventListener('click', () => this.generateShareableCode());
        
        // Room name character counter
        document.getElementById('room-name').addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.getElementById('room-name-count').textContent = count;
        });
        
        // Create form submission
        document.getElementById('create-form').addEventListener('submit', (e) => this.handleCreatePost(e));
        
        // Room form submission
        document.getElementById('create-room-form').addEventListener('submit', (e) => this.handleCreateRoom(e));
        
        // Feed filters
        document.querySelectorAll('.feed-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentFilter = tab.dataset.filter;
                this.loadPosts();
            });
        });
        
        // Sort
        document.querySelector('.feed-sort').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.loadPosts();
        });
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) {
                    this.switchView(view);
                }
            });
        });
    }

    toggleRoomType(type) {
        const shareableCodeGroup = document.getElementById('shareable-code-group');
        if (type === 'private') {
            shareableCodeGroup.style.display = 'block';
            this.generateShareableCode();
        } else {
            shareableCodeGroup.style.display = 'none';
            document.getElementById('shareable-code').value = '';
        }
    }

    generateShareableCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('shareable-code').value = code;
        return code;
    }

    async logout() {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    }

    async loadPosts() {
        const container = document.getElementById('posts-container');
        container.innerHTML = '<div class="loading-state"><div class="loader-spinner"></div><p>Loading projects...</p></div>';
        
        try {
            // Build query
            let query = supabase
                .from('posts')
                .select(`
                    *,
                    profiles (username, email)
                `)
                .order('created_at', { ascending: false });
            
            // Apply filters (you can expand this based on your needs)
            if (this.currentFilter === 'trending') {
                query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
                query = query.order('clout', { ascending: false });
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            this.posts = data || [];
            this.renderPosts();
            
        } catch (error) {
            console.error('Error loading posts:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Unable to load posts</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    renderPosts() {
        const container = document.getElementById('posts-container');
        
        if (this.posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No posts yet</h3>
                    <p>Be the first to share your project!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.posts.map(post => this.createPostCard(post)).join('');
        
        // Add event listeners to post actions
        this.setupPostListeners();
    }

    createPostCard(post) {
        const username = post.profiles?.username || post.profiles?.email?.split('@')[0] || 'Anonymous';
        const initial = username.charAt(0).toUpperCase();
        const timeAgo = this.getTimeAgo(post.created_at);
        const tags = post.tags ? (Array.isArray(post.tags) ? post.tags : post.tags.split(',')) : [];
        const clout = post.clout || 0;
        
        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-vote">
                    <div class="star-rating">
                        ${[5,4,3,2,1].map(n => `
                            <button class="star-btn ${post.user_rating >= n ? 'active' : ''}" data-rating="${n}">★</button>
                        `).join('')}
                    </div>
                    <div class="clout-count">${clout}</div>
                </div>
                <div class="post-content">
                    <div class="post-header">
                        <div class="post-avatar">${initial}</div>
                        <div class="post-meta">
                            <a href="#" class="post-username">${username}</a>
                            <span class="post-time">${timeAgo}</span>
                        </div>
                        <span class="post-type-badge badge-${post.type || 'project'}">${post.type || 'project'}</span>
                    </div>
                    <h3 class="post-title">${this.escapeHtml(post.title)}</h3>
                    <p class="post-description">${this.escapeHtml(post.description)}</p>
                    ${tags.length > 0 ? `
                        <div class="post-tags">
                            ${tags.map(tag => `<span class="post-tag">${this.escapeHtml(tag.trim())}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${post.github_url ? `
                        <a href="${post.github_url}" target="_blank" class="github-link">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                            </svg>
                            View on GitHub
                        </a>
                    ` : ''}
                    <div class="post-footer">
                        <button class="post-action comment-btn" data-action="comment">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.28C3.51156 15.0423 3 13.5743 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            ${post.comment_count || 0} Comments
                        </button>
                        <button class="post-action share-btn" data-action="share">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Share
                        </button>
                        <button class="post-action save-btn" data-action="save">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M5 5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21L12 17.5L5 21V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Save
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupPostListeners() {
        // Star rating
        document.querySelectorAll('.star-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const postCard = e.target.closest('.post-card');
                const postId = postCard.dataset.postId;
                const rating = parseInt(e.target.dataset.rating);
                await this.ratePost(postId, rating, postCard);
            });
        });
        
        // Post actions
        document.querySelectorAll('.post-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                const postCard = e.currentTarget.closest('.post-card');
                const postId = postCard.dataset.postId;
                this.handlePostAction(action, postId);
            });
        });
    }

    async ratePost(postId, rating, postCard) {
        try {
            // Get current post
            const { data: post, error: fetchError } = await supabase
                .from('posts')
                .select('clout, ratings')
                .eq('id', postId)
                .single();
            
            if (fetchError) throw fetchError;
            
            // Calculate new clout (simple average for now)
            const ratings = post.ratings || {};
            ratings[this.currentUser.id] = rating;
            const totalRating = Object.values(ratings).reduce((a, b) => a + b, 0);
            const avgRating = Math.round(totalRating / Object.keys(ratings).length);
            
            // Update post
            const { error: updateError } = await supabase
                .from('posts')
                .update({ 
                    clout: avgRating,
                    ratings: ratings
                })
                .eq('id', postId);
            
            if (updateError) throw updateError;
            
            // Award clout for rating
            await this.cloutService.awardClout(this.currentUser.id, 'post_rated', null, postId);
            
            // Update UI
            const starBtns = postCard.querySelectorAll('.star-btn');
            starBtns.forEach(btn => {
                const btnRating = parseInt(btn.dataset.rating);
                btn.classList.toggle('active', btnRating <= rating);
            });
            
            postCard.querySelector('.clout-count').textContent = avgRating;
            
        } catch (error) {
            console.error('Error rating post:', error);
            this.showNotification('Failed to rate post', 'error');
        }
    }

    async handlePostAction(action, postId) {
        if (action === 'comment') {
            await this.toggleComments(postId);
        } else if (action === 'share') {
            this.sharePost(postId);
        } else if (action === 'save') {
            this.showNotification('Save feature coming soon!', 'info');
        }
    }

    async toggleComments(postId) {
        const postCard = document.querySelector(`[data-post-id="${postId}"]`);
        const commentsSection = postCard.querySelector('.comments-section');
        const toggleBtn = postCard.querySelector('.comment-btn');
        
        if (!commentsSection) {
            // First time opening - create comments section
            await this.createCommentsSection(postId, postCard);
        } else {
            // Toggle existing section
            const container = commentsSection.querySelector('.comments-container');
            container.classList.toggle('show');
            toggleBtn.classList.toggle('expanded');
        }
    }

    async createCommentsSection(postId, postCard) {
        const commentsSection = document.createElement('div');
        commentsSection.className = 'comments-section';
        commentsSection.innerHTML = `
            <div class="comments-container show">
                <form class="comment-form" data-post-id="${postId}">
                    <textarea 
                        class="comment-input" 
                        placeholder="Add a comment..." 
                        rows="1"
                        required
                    ></textarea>
                    <button type="submit" class="comment-submit">Post</button>
                </form>
                <div class="comments-list">
                    <div class="comments-loading">
                        <div class="loader-spinner"></div>
                    </div>
                </div>
            </div>
        `;
        
        postCard.querySelector('.post-content').appendChild(commentsSection);
        
        // Set up form submission
        const form = commentsSection.querySelector('.comment-form');
        form.addEventListener('submit', (e) => this.handleCommentSubmit(e));
        
        // Auto-resize textarea
        const textarea = form.querySelector('.comment-input');
        textarea.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        });
        
        // Mark toggle as expanded
        postCard.querySelector('.comment-btn').classList.add('expanded');
        
        // Load comments
        await this.loadComments(postId);
    }

    async loadComments(postId) {
        try {
            const { data, error } = await supabase
                .from('comments')
                .select(`
                    *,
                    profiles (username, email)
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            const postCard = document.querySelector(`[data-post-id="${postId}"]`);
            const commentsList = postCard.querySelector('.comments-list');
            
            if (!data || data.length === 0) {
                commentsList.innerHTML = '<div class="comments-empty">No comments yet. Be the first to comment!</div>';
                return;
            }
            
            commentsList.innerHTML = data.map(comment => this.createCommentHTML(comment)).join('');
            
            // Add delete listeners
            commentsList.querySelectorAll('.delete-comment-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const commentId = e.currentTarget.dataset.commentId;
                    this.deleteComment(commentId, postId);
                });
            });
            
            // Add like listeners
            commentsList.querySelectorAll('.like-comment-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const commentId = e.currentTarget.dataset.commentId;
                    await this.likeComment(commentId, postId, e.currentTarget);
                });
            });
            
        } catch (error) {
            console.error('Error loading comments:', error);
            const postCard = document.querySelector(`[data-post-id="${postId}"]`);
            const commentsList = postCard.querySelector('.comments-list');
            commentsList.innerHTML = '<div class="comments-empty">Failed to load comments</div>';
        }
    }

    createCommentHTML(comment) {
        const username = comment.profiles?.username || comment.profiles?.email?.split('@')[0] || 'Anonymous';
        const initial = username.charAt(0).toUpperCase();
        const timeAgo = this.getTimeAgo(comment.created_at);
        const isOwnComment = comment.user_id === this.currentUser.id;
        
        return `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-avatar">${initial}</div>
                <div class="comment-content-wrapper">
                    <div class="comment-header">
                        <span class="comment-author">${this.escapeHtml(username)}</span>
                        ${isOwnComment ? '<span class="comment-author-badge">You</span>' : ''}
                        <span class="comment-time">${timeAgo}</span>
                    </div>
                    <p class="comment-text">${this.escapeHtml(comment.content)}</p>
                    <div class="comment-actions">
                        ${!isOwnComment ? `
                            <button class="comment-action-btn like like-comment-btn" data-comment-id="${comment.id}">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M7 13C7 12.4477 7.44772 12 8 12H16C16.5523 12 17 12.4477 17 13V20C17 20.5523 16.5523 21 16 21H8C7.44772 21 7 20.5523 7 20V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M12 2C10.5 2 9.5 3 9.5 4.5C9.5 6 12 8 12 8C12 8 14.5 6 14.5 4.5C14.5 3 13.5 2 12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                Like
                            </button>
                        ` : ''}
                        ${isOwnComment ? `
                            <button class="comment-action-btn delete delete-comment-btn" data-comment-id="${comment.id}">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async handleCommentSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const postId = form.dataset.postId;
        const textarea = form.querySelector('.comment-input');
        const submitBtn = form.querySelector('.comment-submit');
        const content = textarea.value.trim();
        
        if (!content) return;
        
        // Disable form
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
        
        try {
            const { error } = await supabase
                .from('comments')
                .insert([{
                    post_id: postId,
                    user_id: this.currentUser.id,
                    content: content
                }]);
            
            if (error) throw error;
            
            // Award clout for commenting
            await this.cloutService.awardClout(this.currentUser.id, 'comment_posted', null, postId);
            
            // Reset form
            textarea.value = '';
            textarea.style.height = 'auto';
            
            // Reload comments
            await this.loadComments(postId);
            
            // Update comment count in UI
            const postCard = document.querySelector(`[data-post-id="${postId}"]`);
            const commentBtn = postCard.querySelector('.comment-btn');
            const countMatch = commentBtn.textContent.match(/\d+/);
            const currentCount = countMatch ? parseInt(countMatch[0]) : 0;
            commentBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.28C3.51156 15.0423 3 13.5743 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${currentCount + 1} Comments
            `;
            
            this.showNotification('Comment posted!', 'success');
            
        } catch (error) {
            console.error('Error posting comment:', error);
            this.showNotification('Failed to post comment', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post';
        }
    }

    async likeComment(commentId, postId, button) {
        try {
            // Get comment to find the author
            const { data: comment, error: fetchError } = await supabase
                .from('comments')
                .select('user_id')
                .eq('id', commentId)
                .single();
            
            if (fetchError) throw fetchError;
            
            // Award clout to comment author for receiving a like
            await this.cloutService.awardClout(comment.user_id, 'comment_like_received', this.currentUser.id, postId, commentId);
            
            // Award clout to current user for liking
            await this.cloutService.awardClout(this.currentUser.id, 'comment_liked', comment.user_id, postId, commentId);
            
            // Update button state
            button.textContent = 'Liked';
            button.disabled = true;
            button.style.opacity = '0.6';
            
            this.showNotification('Comment liked!', 'success');
            
        } catch (error) {
            console.error('Error liking comment:', error);
            this.showNotification('Failed to like comment', 'error');
        }
    }

    async deleteComment(commentId, postId) {
        if (!confirm('Delete this comment?')) return;
        
        try {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);
            
            if (error) throw error;
            
            // Reload comments
            await this.loadComments(postId);
            
            // Update comment count
            const postCard = document.querySelector(`[data-post-id="${postId}"]`);
            const commentBtn = postCard.querySelector('.comment-btn');
            const countMatch = commentBtn.textContent.match(/\d+/);
            const currentCount = countMatch ? parseInt(countMatch[0]) : 0;
            commentBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.28C3.51156 15.0423 3 13.5743 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${Math.max(currentCount - 1, 0)} Comments
            `;
            
            this.showNotification('Comment deleted', 'success');
            
        } catch (error) {
            console.error('Error deleting comment:', error);
            this.showNotification('Failed to delete comment', 'error');
        }
    }

    sharePost(postId) {
        const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Check out this project on CodeBlooded',
                url: url
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url);
            this.showNotification('Link copied to clipboard!', 'success');
        }
    }

    async handleCreatePost(e) {
        e.preventDefault();
        
        const form = e.target;
        const button = form.querySelector('.auth-button');
        const buttonText = button.querySelector('.button-text');
        const buttonLoader = button.querySelector('.button-loader');
        
        // Show loading
        buttonText.style.display = 'none';
        buttonLoader.style.display = 'block';
        button.disabled = true;
        
        try {
            const postData = {
                user_id: this.currentUser.id,
                type: document.getElementById('post-type').value,
                title: document.getElementById('post-title').value,
                description: document.getElementById('post-description').value,
                github_url: document.getElementById('post-github').value || null,
                tags: document.getElementById('post-tags').value.split(',').map(t => t.trim()).filter(t => t),
                clout: 0,
                ratings: {},
                created_at: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('posts')
                .insert([postData]);
            
            if (error) throw error;
            
            // Award clout for creating post
            await this.cloutService.awardClout(this.currentUser.id, 'post_created');
            
            // Success
            this.showNotification('Post created successfully!', 'success');
            document.getElementById('create-modal').classList.remove('show');
            form.reset();
            
            // Reload posts
            await this.loadPosts();
            
        } catch (error) {
            console.error('Error creating post:', error);
            this.showNotification(error.message, 'error');
        } finally {
            buttonText.style.display = 'block';
            buttonLoader.style.display = 'none';
            button.disabled = false;
        }
    }

    async handleCreateRoom(e) {
        e.preventDefault();
        
        const form = e.target;
        const button = form.querySelector('.auth-button');
        const buttonText = button.querySelector('.button-text');
        const buttonLoader = button.querySelector('.button-loader');
        
        // Show loading
        buttonText.style.display = 'none';
        buttonLoader.style.display = 'block';
        button.disabled = true;
        
        try {
            const roomData = {
                name: document.getElementById('room-name').value,
                description: document.getElementById('room-description').value || null,
                type: document.querySelector('input[name="room-type"]:checked').value,
                tags: document.getElementById('room-tags').value.split(',').map(t => t.trim()).filter(t => t),
                allow_invites: document.getElementById('allow-invites').checked,
                require_approval: document.getElementById('require-approval').checked,
                enable_voting: document.getElementById('enable-voting').checked,
                created_by: this.currentUser.id,
                member_count: 1
            };
            
            // Add shareable code for private rooms
            if (roomData.type === 'private') {
                roomData.shareable_code = document.getElementById('shareable-code').value;
            }
            
            const { data: room, error } = await supabase
                .from('rooms')
                .insert([roomData])
                .select()
                .single();
                
            if (error) throw error;
            
            // Add creator as room member with owner role
            const { error: memberError } = await supabase
                .from('room_members')
                .insert([{
                    room_id: room.id,
                    user_id: this.currentUser.id,
                    role: 'owner'
                }]);
                
            if (memberError) throw memberError;
            
            // Success
            this.showNotification('Room created successfully!', 'success');
            document.getElementById('create-room-modal').classList.remove('show');
            form.reset();
            this.generateShareableCode(); // Reset code
            
            // Reload rooms if we're on the rooms view
            if (this.currentView === 'rooms') {
                await this.loadRooms();
            }
            
        } catch (error) {
            console.error('Error creating room:', error);
            this.showNotification(error.message, 'error');
        } finally {
            buttonText.style.display = 'block';
            buttonLoader.style.display = 'none';
            button.disabled = false;
        }
    }

    async loadRooms() {
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select(`
                    *,
                    room_members!inner(user_id),
                    profiles!rooms_created_by_fkey(username)
                `)
                .eq('room_members.user_id', this.currentUser.id)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            this.renderRooms(data || []);
            
        } catch (error) {
            console.error('Error loading rooms:', error);
            this.showNotification('Failed to load rooms', 'error');
        }
    }

    renderRooms(rooms) {
        const container = document.getElementById('posts-container');
        
        if (rooms.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No rooms yet</h3>
                    <p>Create your first room to start collaborating!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = rooms.map(room => this.createRoomCard(room)).join('');
        
        // Add event listeners for join buttons
        this.setupRoomListeners();
    }

    createRoomCard(room) {
        const username = room.profiles?.username || 'Anonymous';
        const timeAgo = this.getTimeAgo(room.created_at);
        const tags = room.tags || [];
        const isPublic = room.type === 'public';
        const isMember = room.room_members && room.room_members.length > 0;
        
        return `
            <div class="room-card" data-room-id="${room.id}">
                <div class="room-header">
                    <div>
                        <h3 class="room-title">${this.escapeHtml(room.name)}</h3>
                        <span class="room-type-badge badge-${room.type}">${room.type}</span>
                    </div>
                    <div class="room-meta">
                        <span class="room-members">👥 ${room.member_count || 1}</span>
                        <span>Created by ${username}</span>
                        <span>${timeAgo}</span>
                    </div>
                </div>
                ${room.description ? `<p class="room-description">${this.escapeHtml(room.description)}</p>` : ''}
                ${tags.length > 0 ? `
                    <div class="room-tags">
                        ${tags.map(tag => `<span class="room-tag">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
                <button class="join-room-btn ${isMember ? 'joined' : ''}" data-room-id="${room.id}">
                    ${isMember ? 'Joined' : 'Join Room'}
                </button>
            </div>
        `;
    }

    setupRoomListeners() {
        document.querySelectorAll('.join-room-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const roomId = e.currentTarget.dataset.roomId;
                const isJoined = e.currentTarget.classList.contains('joined');
                
                if (isJoined) {
                    // Enter room logic
                    this.enterRoom(roomId);
                } else {
                    // Join room logic
                    await this.joinRoom(roomId, e.currentTarget);
                }
            });
        });
    }

    async joinRoom(roomId, button) {
        try {
            const { error } = await supabase
                .from('room_members')
                .insert([{
                    room_id: roomId,
                    user_id: this.currentUser.id,
                    role: 'member'
                }]);
                
            if (error) throw error;
            
            // Update member count
            const { error: updateError } = await supabase.rpc('increment_member_count', {
                room_id: roomId
            });
            
            if (updateError) throw updateError;
            
            button.textContent = 'Joined';
            button.classList.add('joined');
            this.showNotification('Successfully joined room!', 'success');
            
        } catch (error) {
            console.error('Error joining room:', error);
            this.showNotification('Failed to join room', 'error');
        }
    }

    enterRoom(roomId) {
        // This would navigate to the room page
        this.showNotification('Entering room...', 'info');
        // window.location.href = `room.html?id=${roomId}`;
    }

    async loadTopUsers() {
        try {
            // This is a placeholder - you'll need to aggregate data properly
            const { data, error } = await supabase
                .from('profiles')
                .select('username, email')
                .limit(5);
            
            if (error) throw error;
            
            const container = document.querySelector('.top-users-list');
            container.innerHTML = (data || []).map((user, index) => {
                const username = user.username || user.email?.split('@')[0] || 'User';
                const initial = username.charAt(0).toUpperCase();
                return `
                    <a href="#" class="top-user-item">
                        <span class="user-rank">#${index + 1}</span>
                        <div class="top-user-avatar">${initial}</div>
                        <div class="top-user-info">
                            <div class="top-user-name">${username}</div>
                            <div class="top-user-clout">${Math.floor(Math.random() * 1000)} clout</div>
                        </div>
                    </a>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error loading top users:', error);
        }
    }

    async loadUserStats() {
        try {
            // Get user's posts
            const { data: posts, error: postsError } = await supabase
                .from('posts')
                .select('clout')
                .eq('user_id', this.currentUser.id);
            
            if (postsError) throw postsError;
            
            const totalClout = (posts || []).reduce((sum, post) => sum + (post.clout || 0), 0);
            const projectCount = (posts || []).length;
            
            // Get user's clout tier
            const cloutTier = this.cloutService.getCloutTier(totalClout);
            
            // Update UI
            document.getElementById('user-clout').textContent = totalClout;
            document.getElementById('user-projects').textContent = projectCount;
            
            // Update clout tier display if element exists
            const tierElement = document.getElementById('user-tier');
            if (tierElement) {
                tierElement.textContent = cloutTier;
                tierElement.className = `tier-badge tier-${cloutTier.toLowerCase()}`;
            }
            
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }

    switchView(view) {
        console.log('Switching to view:', view);
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        this.currentView = view;
        
        if (view === 'feed' || view === 'my-projects') {
            this.loadPosts();
        } else if (view === 'rooms') {
            this.loadRooms();
        } else {
            // Handle other views
            const container = document.getElementById('posts-container');
            container.innerHTML = `
                <div class="empty-state">
                    <h3>${view.charAt(0).toUpperCase() + view.slice(1)} View</h3>
                    <p>This feature is coming soon!</p>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notif = document.createElement('div');
        notif.className = `notification notification-${type}`;
        notif.textContent = message;
        notif.style.cssText = `
            position: fixed;
            top: 80px;
            right: 24px;
            padding: 16px 24px;
            background: ${type === 'error' ? 'var(--error-color)' : type === 'success' ? 'var(--success-color)' : '#667eea'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 3000;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notif);
        
        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
        
        // Add animations if not already present
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return past.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});