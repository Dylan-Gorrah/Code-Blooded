// js/profile.js
class ProfilePage {
    constructor() {
        this.currentUser = null;
        this.profileData = null;
        this.badgeService = new BadgeService();
        this.cloutService = new CloutService();
        this.currentTab = 'projects';
        this.projectSort = 'recent';
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadProfileData();
        this.setupEventListeners();
        this.setupEditProfileModal();
        await this.loadFeaturedProject();
        await this.loadTabContent(this.currentTab);
    }

    async checkAuth() {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            window.location.href = 'index.html';
            return;
        }
        
        this.currentUser = session.user;
    }

    async loadProfileData() {
        try {
            // Load profile data
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error) throw error;
            this.profileData = profile;

            this.updateProfileUI();
            await this.updateProfileStats();

        } catch (error) {
            console.error('Error loading profile data:', error);
        }
    }

    updateProfileUI() {
        if (!this.profileData) return;

        // Basic info
        document.getElementById('profile-display-name').textContent = 
            this.profileData.display_name || this.profileData.username;
        document.getElementById('profile-username').textContent = 
            `@${this.profileData.username}`;
        document.getElementById('profile-u-username').textContent = 
            `u/${this.profileData.username}`;
        
        // Setup copy profile link
        this.setupCopyProfileLink();
        document.getElementById('profile-title').textContent = 
            this.profileData.title || 'Code Newbie';
        document.getElementById('profile-bio').textContent = 
            this.profileData.bio || 'No bio yet.';
        document.getElementById('profile-location').textContent = 
            this.profileData.location || 'Location not set';
        
        // Format join date
        const joinDate = new Date(this.profileData.join_date);
        document.getElementById('profile-join-date').textContent = 
            `Joined ${joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

        // Social stats
        document.getElementById('follower-count').textContent = 
            this.formatNumber(this.profileData.follower_count);
        document.getElementById('following-count').textContent = 
            this.formatNumber(this.profileData.following_count);

        // GitHub link
        const githubLink = document.getElementById('github-link');
        if (this.profileData.github_url) {
            githubLink.href = this.profileData.github_url;
            githubLink.style.display = 'block';
        } else {
            githubLink.style.display = 'none';
        }

        // Tech stack
        this.updateTechStackUI();
        
        // Availability
        this.updateAvailabilityUI();
        
        // Role chips
        this.updateRoleChips();
        
        // Badge strip
        this.loadBadgeStrip();
        
        // Compact social row
        this.updateSocialRow();
    }

    async updateProfileStats() {
        try {
            // Get project count
            const { count: projectCount, error: projectError } = await supabase
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', this.currentUser.id)
                .eq('type', 'project');

            // Get idea count
            const { count: ideaCount, error: ideaError } = await supabase
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', this.currentUser.id)
                .eq('type', 'idea');

            // Get total stars (sum of post clout)
            const { data: posts, error: postsError } = await supabase
                .from('posts')
                .select('clout')
                .eq('user_id', this.currentUser.id);

            // Get badge count
            const userBadges = await this.badgeService.getUserBadges(this.currentUser.id);

            // Update UI
            document.getElementById('project-count').textContent = projectCount || 0;
            document.getElementById('projects-count').textContent = projectCount || 0;
            document.getElementById('total-stars').textContent = 
                this.formatNumber(posts?.reduce((sum, post) => sum + (post.clout || 0), 0) || 0);
            document.getElementById('clout-score').textContent = 
                this.formatNumber(this.profileData.clout_score || 0);
            document.getElementById('streak-count').textContent = this.profileData.streak || 0;
            document.getElementById('badge-count').textContent = 
                `${userBadges.length}/${this.badgeService.badges.length}`;

            // Global rank would require more complex query
            document.getElementById('global-rank').textContent = '#--';

        } catch (error) {
            console.error('Error updating profile stats:', error);
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Project filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setProjectFilter(filter);
            });
        });

        // Followers/Following stats
        document.getElementById('followers-stat')?.addEventListener('click', () => {
            this.openConnectionsModal('followers');
        });

        document.getElementById('following-stat')?.addEventListener('click', () => {
            this.openConnectionsModal('following');
        });

        // Connections modal close
        document.getElementById('connections-modal-close')?.addEventListener('click', () => {
            this.closeConnectionsModal();
        });

        document.getElementById('connections-modal-overlay')?.addEventListener('click', () => {
            this.closeConnectionsModal();
        });
    }

    async switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update active pane
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });

        this.currentTab = tabName;
        await this.loadTabContent(tabName);
    }

    async loadUserProjects(container) {
        let query = supabase
            .from('posts')
            .select('*')
            .eq('user_id', this.currentUser.id)
            .eq('type', 'project');
        
        // Apply sorting based on filter
        if (this.projectSort === 'popular') {
            query = query.order('clout', { ascending: false });
        } else if (this.projectSort === 'featured') {
            query = query.order('clout', { ascending: false }).limit(1);
        } else {
            query = query.order('created_at', { ascending: false });
        }
        
        const { data: posts, error } = await query;

        if (error) throw error;

        if (!posts || posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No projects yet</h3>
                    <p>Share your first project to get started!</p>
                    <button class="cta-button" onclick="window.location.href='dashboard.html'">Create Project</button>
                </div>
            `;
            return;
        }

        container.innerHTML = posts.map(post => this.createPostCard(post)).join('');
    }

    async loadUserSaved(container) {
        // Implementation for loading saved items
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔖</div>
                <h3>No saved items yet</h3>
                <p>You haven't saved anything yet. Star someone's project from the feed to save it here and come back to it later!</p>
                <a href="dashboard.html" class="cta-button">Browse Projects</a>
            </div>
        `;
    }

    createPostCard(post) {
        const timeAgo = this.getTimeAgo(post.created_at);
        const tags = post.tags ? (Array.isArray(post.tags) ? post.tags : post.tags.split(',')) : [];
        
        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-vote">
                    <div class="star-rating">
                        ${[5,4,3,2,1].map(n => `
                            <span class="star-btn ${post.clout >= n ? 'active' : ''}">★</span>
                        `).join('')}
                    </div>
                    <div class="clout-count">${post.clout || 0}</div>
                </div>
                <div class="post-content">
                    <div class="post-header">
                        <div class="post-avatar">${this.profileData.username?.charAt(0).toUpperCase() || 'U'}</div>
                        <div class="post-meta">
                            <span class="post-username">${this.profileData.display_name || this.profileData.username}</span>
                            <span class="post-time">${timeAgo}</span>
                        </div>
                        <span class="post-type-badge badge-${post.type}">${post.type}</span>
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
                </div>
            </div>
        `;
    }

    setupEditProfileModal() {
        const modal = document.getElementById('edit-profile-modal');
        const openBtn = document.getElementById('edit-profile-btn');
        const closeBtn = document.getElementById('edit-modal-close');
        const overlay = document.getElementById('edit-modal-overlay');
        const cancelBtn = document.getElementById('cancel-edit-btn');
        const form = document.getElementById('edit-profile-form');

        // Open modal
        openBtn.addEventListener('click', () => this.openEditProfileModal());

        // Close modal
        [closeBtn, overlay, cancelBtn].forEach(element => {
            element.addEventListener('click', () => this.closeEditProfileModal());
        });

        // Form submission
        form.addEventListener('submit', (e) => this.handleProfileUpdate(e));

        // Bio character count
        const bioInput = document.getElementById('edit-bio');
        const charCount = document.getElementById('bio-char-count');
        bioInput.addEventListener('input', () => {
            charCount.textContent = bioInput.value.length;
        });

        // Tech stack input
        this.setupTechStackInput();
    }

    openEditProfileModal() {
        this.populateEditForm();
        document.getElementById('edit-profile-modal').classList.add('show');
    }

    closeEditProfileModal() {
        document.getElementById('edit-profile-modal').classList.remove('show');
    }

    populateEditForm() {
        if (!this.profileData) return;

        document.getElementById('edit-display-name').value = 
            this.profileData.display_name || this.profileData.username;
        document.getElementById('edit-bio').value = this.profileData.bio || '';
        document.getElementById('bio-char-count').textContent = 
            document.getElementById('edit-bio').value.length;
        document.getElementById('edit-location').value = this.profileData.location || '';
        document.getElementById('edit-website').value = this.profileData.website || '';
        document.getElementById('edit-github').value = this.profileData.github_url || '';
        document.getElementById('edit-twitter').value = this.profileData.twitter_url || '';
        document.getElementById('edit-specialty').value = this.profileData.specialty || 'full-stack';
        document.getElementById('edit-available-hire').checked = this.profileData.available_for_hire || false;
        document.getElementById('edit-looking-collaborate').checked = this.profileData.looking_to_collaborate || false;

        // Populate tech stack
        this.populateTechStackInput();
    }

    setupTechStackInput() {
        const techInput = document.getElementById('tech-input');
        const suggestions = document.getElementById('tech-suggestions');
        const selectedTags = document.getElementById('selected-tech-tags');

        // Comprehensive tech stack list (150+ technologies)
        const commonTech = [
            // Programming Languages
            'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'C', 'PHP', 'Ruby', 'Go', 
            'Rust', 'Swift', 'Kotlin', 'Scala', 'R', 'Dart', 'Elixir', 'Haskell', 'Perl', 'Lua',
            'Objective-C', 'Shell', 'PowerShell', 'Assembly', 'COBOL', 'Fortran', 'Julia', 'Groovy',
            
            // Frontend Frameworks & Libraries
            'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js', 'Gatsby', 'Remix',
            'Solid.js', 'Preact', 'Alpine.js', 'Ember.js', 'Backbone.js', 'jQuery', 'Lit',
            
            // Backend Frameworks
            'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Spring', 
            'Laravel', 'Ruby on Rails', 'ASP.NET', 'ASP.NET Core', 'Nest.js', 'Koa', 'Hapi',
            'Fastify', 'Phoenix', 'Gin', 'Echo', 'Fiber', 'Actix', 'Rocket',
            
            // Mobile Development
            'React Native', 'Flutter', 'Ionic', 'Xamarin', 'SwiftUI', 'Jetpack Compose',
            'Cordova', 'Capacitor', 'NativeScript',
            
            // Databases
            'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'MariaDB', 'Oracle',
            'Microsoft SQL Server', 'Cassandra', 'DynamoDB', 'CouchDB', 'Neo4j', 'Elasticsearch',
            'Supabase', 'Firebase', 'PlanetScale', 'Cockroach DB', 'TimescaleDB',
            
            // Cloud & DevOps
            'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI',
            'GitHub Actions', 'CircleCI', 'Travis CI', 'Terraform', 'Ansible', 'Chef', 'Puppet',
            'Vagrant', 'Heroku', 'Vercel', 'Netlify', 'DigitalOcean', 'Linode', 'Railway',
            
            // AI & Machine Learning
            'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'OpenCV', 'Pandas', 'NumPy',
            'Machine Learning', 'Deep Learning', 'AI', 'NLP', 'Computer Vision', 'Hugging Face',
            'LangChain', 'OpenAI', 'Stable Diffusion',
            
            // Web Technologies
            'HTML', 'CSS', 'Sass', 'SCSS', 'Less', 'Tailwind CSS', 'Bootstrap', 'Material-UI',
            'Chakra UI', 'Ant Design', 'Styled Components', 'Emotion', 'shadcn/ui',
            
            // Testing
            'Jest', 'Mocha', 'Chai', 'Cypress', 'Selenium', 'Playwright', 'Puppeteer',
            'Testing Library', 'Vitest', 'Jasmine', 'Karma', 'JUnit', 'PyTest',
            
            // State Management
            'Redux', 'MobX', 'Zustand', 'Recoil', 'Jotai', 'XState', 'Vuex', 'Pinia',
            
            // Build Tools & Bundlers
            'Webpack', 'Vite', 'Rollup', 'Parcel', 'esbuild', 'Turbopack', 'Babel', 'SWC',
            
            // Version Control & Collaboration
            'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Mercurial',
            
            // CMS & E-commerce
            'WordPress', 'Drupal', 'Strapi', 'Contentful', 'Sanity', 'Shopify', 'WooCommerce',
            'Magento', 'PrestaShop',
            
            // Game Development
            'Unity', 'Unreal Engine', 'Godot', 'GameMaker', 'Phaser', 'Three.js', 'Babylon.js',
            
            // Blockchain & Web3
            'Blockchain', 'Web3', 'Ethereum', 'Solidity', 'Smart Contracts', 'Hardhat', 'Truffle',
            'Ethers.js', 'Web3.js', 'IPFS', 'Polygon', 'Solana',
            
            // Other Tools & Technologies
            'GraphQL', 'REST API', 'gRPC', 'WebSockets', 'Socket.io', 'RabbitMQ', 'Kafka',
            'Nginx', 'Apache', 'Linux', 'Ubuntu', 'Debian', 'CentOS', 'Arch Linux',
            'VS Code', 'IntelliJ IDEA', 'PyCharm', 'WebStorm', 'Vim', 'Emacs',
            'Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator', 'Blender'
        ].sort(); // Sort alphabetically for easier browsing

        const MAX_TAGS = 15;

        techInput.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            const selectedTech = this.getSelectedTech();
            
            // Check if max tags reached
            if (selectedTech.length >= MAX_TAGS) {
                suggestions.innerHTML = `<div class="tech-limit-warning">Maximum ${MAX_TAGS} tags reached</div>`;
                suggestions.style.display = 'block';
                return;
            }
            
            if (value.length < 1) {
                suggestions.style.display = 'none';
                return;
            }

            const filtered = commonTech.filter(tech => 
                tech.toLowerCase().includes(value) &&
                !selectedTech.includes(tech)
            ).slice(0, 10); // Show max 10 suggestions

            if (filtered.length > 0) {
                suggestions.innerHTML = filtered.map(tech => 
                    `<div class="tech-suggestion" data-tech="${tech}">${tech}</div>`
                ).join('');
                suggestions.style.display = 'block';
            } else {
                suggestions.innerHTML = '<div class="tech-no-results">No matching technologies found</div>';
                suggestions.style.display = 'block';
            }
        });

        suggestions.addEventListener('click', (e) => {
            if (e.target.classList.contains('tech-suggestion')) {
                this.addTechTag(e.target.dataset.tech);
                techInput.value = '';
                suggestions.style.display = 'none';
            }
        });

        techInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = techInput.value.trim();
                const selectedTech = this.getSelectedTech();
                
                // Check if max tags reached
                if (selectedTech.length >= MAX_TAGS) {
                    this.showNotification(`Maximum ${MAX_TAGS} tags allowed`, 'warning');
                    return;
                }
                
                // Only allow from predefined list
                const matchedTech = commonTech.find(tech => 
                    tech.toLowerCase() === value.toLowerCase()
                );
                
                if (matchedTech && !selectedTech.includes(matchedTech)) {
                    this.addTechTag(matchedTech);
                    techInput.value = '';
                    suggestions.style.display = 'none';
                } else if (value) {
                    this.showNotification('Please select from the available technologies', 'info');
                }
            } else if (e.key === 'Backspace' && techInput.value === '') {
                const tags = this.getSelectedTech();
                if (tags.length > 0) {
                    this.removeTechTag(tags[tags.length - 1]);
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!techInput.contains(e.target) && !suggestions.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });
        
        // Show count indicator
        this.updateTagCount();
    }

    getSelectedTech() {
        const tagsContainer = document.getElementById('selected-tech-tags');
        return Array.from(tagsContainer.querySelectorAll('.tech-tag-input'))
            .map(tag => tag.dataset.tech);
    }

    addTechTag(tech) {
        const tagsContainer = document.getElementById('selected-tech-tags');
        const tagElement = document.createElement('span');
        tagElement.className = 'tech-tag-input';
        tagElement.dataset.tech = tech;
        tagElement.innerHTML = `
            ${tech}
            <button type="button" class="remove-tag">×</button>
        `;

        tagElement.querySelector('.remove-tag').addEventListener('click', () => {
            this.removeTechTag(tech);
        });

        tagsContainer.appendChild(tagElement);
        this.updateTagCount();
    }

    removeTechTag(tech) {
        const tagsContainer = document.getElementById('selected-tech-tags');
        const tagElement = tagsContainer.querySelector(`[data-tech="${tech}"]`);
        if (tagElement) {
            tagElement.remove();
        }
        this.updateTagCount();
    }

    updateTagCount() {
        // Optional: Add visual indicator of tag count (can be styled in CSS)
        const count = this.getSelectedTech().length;
        const MAX_TAGS = 15;
        // Could add a counter element in the HTML if desired
        // For now, this is just a placeholder for future enhancement
    }

    populateTechStackInput() {
        const tagsContainer = document.getElementById('selected-tech-tags');
        tagsContainer.innerHTML = '';

        if (this.profileData.tech_stack) {
            this.profileData.tech_stack.forEach(tech => {
                this.addTechTag(tech);
            });
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();

        const form = e.target;
        const submitBtn = form.querySelector('.auth-button');
        const originalText = submitBtn.innerHTML;

        try {
            // Show loading
            submitBtn.innerHTML = '<div class="loader-spinner"></div>';
            submitBtn.disabled = true;

            const updateData = {
                display_name: document.getElementById('edit-display-name').value.trim(),
                bio: document.getElementById('edit-bio').value.trim(),
                location: document.getElementById('edit-location').value.trim(),
                website: document.getElementById('edit-website').value.trim(),
                github_url: document.getElementById('edit-github').value.trim(),
                twitter_url: document.getElementById('edit-twitter').value.trim(),
                specialty: document.getElementById('edit-specialty').value,
                available_for_hire: document.getElementById('edit-available-hire').checked,
                looking_to_collaborate: document.getElementById('edit-looking-collaborate').checked,
                tech_stack: this.getSelectedTech(),
                updated_at: new Date().toISOString()
            };

            // Remove empty strings
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === '') {
                    updateData[key] = null;
                }
            });

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', this.currentUser.id);

            if (error) throw error;

            // Check for profile completion badge
            await this.badgeService.checkAndAwardBadges(
                this.currentUser.id, 
                'profile_updated',
                { profileData: updateData }
            );

            // Reload profile data
            await this.loadProfileData();
            this.closeEditProfileModal();

            this.showNotification('Profile updated successfully!', 'success');

        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification(error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // New Profile Enhancement Methods
    setupCopyProfileLink() {
        const copyBtn = document.getElementById('copy-profile-link');
        if (!copyBtn) return;
        
        copyBtn.addEventListener('click', async () => {
            const profileUrl = `${window.location.origin}/u/${this.profileData.username}`;
            
            try {
                await navigator.clipboard.writeText(profileUrl);
                this.showToast('Profile link copied!', 'success');
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = profileUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showToast('Profile link copied!', 'success');
            }
        });
    }

    updateRoleChips() {
        const container = document.getElementById('profile-chips');
        if (!container) return;
        
        const chips = [];
        
        // Add specialty chip
        if (this.profileData.specialty) {
            const specialtyMap = {
                'full-stack': 'Full-Stack',
                'frontend': 'Frontend',
                'backend': 'Backend',
                'mobile': 'Mobile',
                'ai-ml': 'AI/ML',
                'devops': 'DevOps',
                'data-science': 'Data Science',
                'game-dev': 'Game Dev'
            };
            chips.push(`<span class="profile-chip chip-specialty">${specialtyMap[this.profileData.specialty] || this.profileData.specialty}</span>`);
        }
        
        // Add availability chips
        if (this.profileData.available_for_hire) {
            chips.push('<span class="profile-chip chip-hire">Available for hire</span>');
        }
        
        if (this.profileData.looking_to_collaborate) {
            chips.push('<span class="profile-chip chip-collab">Open to collab</span>');
        }
        
        container.innerHTML = chips.join('');
    }

    async loadBadgeStrip() {
        const container = document.getElementById('profile-badge-strip');
        if (!container) return;
        
        try {
            const badgesWithStatus = await this.badgeService.getAllBadgesWithUserStatus(this.currentUser.id);
            const unlockedBadges = badgesWithStatus.filter(b => b.unlocked);
            
            // Sort by tier importance
            const tierOrder = { legendary: 5, platinum: 4, gold: 3, silver: 2, bronze: 1 };
            unlockedBadges.sort((a, b) => (tierOrder[b.tier] || 0) - (tierOrder[a.tier] || 0));
            
            // Take top 3
            const topBadges = unlockedBadges.slice(0, 3);
            
            if (topBadges.length === 0) {
                container.style.display = 'none';
                return;
            }
            
            container.innerHTML = topBadges.map(badge => `
                <div class="badge-preview tier-${badge.tier}" title="${badge.name}">
                    ${badge.icon}
                    <div class="badge-tooltip">${badge.name} (${badge.tier})</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading badge strip:', error);
        }
    }

    updateSocialRow() {
        const container = document.getElementById('profile-social-row');
        if (!container) return;
        
        const links = [];
        
        if (this.profileData.website) {
            links.push(`
                <a href="${this.profileData.website}" target="_blank" class="social-icon-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    Website
                </a>
            `);
        }
        
        if (this.profileData.github_url) {
            links.push(`
                <a href="${this.profileData.github_url}" target="_blank" class="social-icon-link">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    GitHub
                </a>
            `);
        }
        
        if (this.profileData.twitter_url) {
            links.push(`
                <a href="${this.profileData.twitter_url}" target="_blank" class="social-icon-link">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                    </svg>
                    Twitter
                </a>
            `);
        }
        
        container.innerHTML = links.join('');
        if (links.length === 0) {
            container.style.display = 'none';
        }
    }

    async loadFeaturedProject() {
        const container = document.getElementById('featured-project-container');
        if (!container) return;
        
        try {
            const { data: posts, error } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('type', 'project')
                .order('clout', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (!posts || posts.length === 0) {
                container.style.display = 'none';
                return;
            }
            
            const project = posts[0];
            const tags = project.tags ? (Array.isArray(project.tags) ? project.tags : project.tags.split(',')) : [];
            
            container.innerHTML = `
                <div class="featured-project-card">
                    <div class="featured-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        Featured Project
                    </div>
                    <div class="featured-project-content">
                        <div class="featured-project-main">
                            <h3 class="featured-project-title">${this.escapeHtml(project.title)}</h3>
                            <p class="featured-project-description">${this.escapeHtml(project.description)}</p>
                            ${tags.length > 0 ? `
                                <div class="featured-project-tags">
                                    ${tags.map(tag => `<span class="post-tag">${this.escapeHtml(tag.trim())}</span>`).join('')}
                                </div>
                            ` : ''}
                            <div class="featured-project-meta">
                                <span class="featured-project-clout">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                    ${project.clout || 0} clout
                                </span>
                                ${project.github_url ? `
                                    <a href="${project.github_url}" target="_blank" style="color: var(--text-secondary); text-decoration: none;">
                                        View on GitHub →
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading featured project:', error);
            container.style.display = 'none';
        }
    }

    setProjectFilter(filter) {
        this.projectSort = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Reload projects with new filter
        const container = document.getElementById('user-posts-container');
        if (container) {
            this.loadUserProjects(container);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // Connections Modal Methods
    async openConnectionsModal(type) {
        const modal = document.getElementById('connections-modal');
        const title = document.getElementById('connections-modal-title');
        const list = document.getElementById('connections-list');
        
        title.textContent = type === 'followers' ? 'Followers' : 'Following';
        list.innerHTML = '<div class="loading-state"><div class="loader-spinner"></div><p>Loading...</p></div>';
        
        modal.classList.add('show');
        
        try {
            let data, error;
            
            if (type === 'followers') {
                // Get followers
                const result = await supabase
                    .from('follows')
                    .select(`
                        follower_id,
                        profiles!follows_follower_id_fkey (
                            id,
                            username,
                            display_name,
                            clout_score
                        )
                    `)
                    .eq('following_id', this.currentUser.id);
                
                data = result.data;
                error = result.error;
            } else {
                // Get following
                const result = await supabase
                    .from('follows')
                    .select(`
                        following_id,
                        profiles!follows_following_id_fkey (
                            id,
                            username,
                            display_name,
                            clout_score
                        )
                    `)
                    .eq('follower_id', this.currentUser.id);
                
                data = result.data;
                error = result.error;
            }
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                list.innerHTML = `
                    <div class="empty-state">
                        <h3>No ${type} yet</h3>
                        <p>${type === 'followers' ? 'No one is following you yet.' : 'You are not following anyone yet.'}</p>
                    </div>
                `;
                return;
            }
            
            list.innerHTML = data.map(item => {
                const profile = type === 'followers' ? item.profiles : item.profiles;
                if (!profile) return '';
                
                const initial = (profile.display_name || profile.username).charAt(0).toUpperCase();
                
                return `
                    <div class="connection-item" data-user-id="${profile.id}">
                        <div class="connection-avatar">${initial}</div>
                        <div class="connection-info">
                            <div class="connection-name">${profile.display_name || profile.username}</div>
                            <div class="connection-username">@${profile.username}</div>
                            <div class="connection-clout">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                </svg>
                                ${this.formatNumber(profile.clout_score || 0)} clout
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error(`Error loading ${type}:`, error);
            list.innerHTML = `
                <div class="empty-state">
                    <h3>Error loading ${type}</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    closeConnectionsModal() {
        document.getElementById('connections-modal').classList.remove('show');
    }

    // Achievements Timeline Methods
    async loadAchievementsTimeline() {
        try {
            // Get user badges with unlock dates
            const { data: userBadges, error } = await supabase
                .from('user_badges')
                .select(`
                    unlocked_at,
                    badges (
                        id,
                        name,
                        description,
                        icon,
                        tier
                    )
                `)
                .eq('user_id', this.currentUser.id)
                .order('unlocked_at', { ascending: false });
            
            if (error) throw error;
            
            if (!userBadges || userBadges.length === 0) {
                return;
            }
            
            // Create timeline HTML
            const timelineHTML = `
                <div class="achievements-timeline">
                    <div class="timeline-header">🏆 Achievement Timeline</div>
                    ${userBadges.map(item => {
                        const badge = item.badges;
                        const date = new Date(item.unlocked_at);
                        const dateStr = date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                        });
                        
                        return `
                            <div class="timeline-item">
                                <div class="timeline-icon tier-${badge.tier}">
                                    ${badge.icon}
                                </div>
                                <div class="timeline-content">
                                    <div class="timeline-badge-name">${badge.name}</div>
                                    <div class="timeline-badge-tier tier-${badge.tier}">${badge.tier}</div>
                                    <div class="timeline-badge-description">${badge.description}</div>
                                    <div class="timeline-date">${dateStr}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            // Insert timeline after badges grid
            const badgesContainer = document.getElementById('badges-container');
            if (badgesContainer && badgesContainer.parentNode) {
                const existingTimeline = badgesContainer.parentNode.querySelector('.achievements-timeline');
                if (existingTimeline) {
                    existingTimeline.remove();
                }
                badgesContainer.insertAdjacentHTML('afterend', timelineHTML);
            }
            
        } catch (error) {
            console.error('Error loading achievements timeline:', error);
        }
    }

    // Utility methods
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
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

    showNotification(message, type = 'info') {
        // Use the same notification system from dashboard
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Fallback simple notification
            alert(message);
        }
    }
}

// Initialize profile page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProfilePage();
});