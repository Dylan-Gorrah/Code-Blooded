// js/profile.js
class ProfilePage {
    constructor() {
        this.currentUser = null;
        this.profileData = null;
        this.badgeService = new BadgeService();
        this.cloutService = new CloutService();
        this.currentTab = 'projects';
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadProfileData();
        this.setupEventListeners();
        this.setupEditProfileModal();
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

    updateTechStackUI() {
        const container = document.getElementById('tech-stack-tags');
        if (!container || !this.profileData.tech_stack) return;

        container.innerHTML = this.profileData.tech_stack.map(tech => 
            `<span class="tech-tag">${tech}</span>`
        ).join('');
    }

    updateAvailabilityUI() {
        const container = document.getElementById('availability-status');
        if (!container) return;

        container.innerHTML = `
            <div class="status-item">
                <div class="status-indicator ${this.profileData.available_for_hire ? 'status-available' : 'status-unavailable'}"></div>
                <span>${this.profileData.available_for_hire ? 'Available for hire' : 'Not available for hire'}</span>
            </div>
            <div class="status-item">
                <div class="status-indicator ${this.profileData.looking_to_collaborate ? 'status-available' : 'status-unavailable'}"></div>
                <span>${this.profileData.looking_to_collaborate ? 'Open to collaborations' : 'Not open to collaborations'}</span>
            </div>
        `;
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Edit profile button
        document.getElementById('edit-profile-btn').addEventListener('click', () => {
            this.openEditProfileModal();
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

    async loadTabContent(tabName) {
        const containers = {
            projects: 'user-posts-container',
            ideas: 'user-ideas-container',
            achievements: 'badges-container'
        };

        const containerId = containers[tabName];
        if (!containerId) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div class="loading-state"><div class="loader-spinner"></div><p>Loading...</p></div>';

        try {
            switch (tabName) {
                case 'projects':
                    await this.loadUserProjects(container);
                    break;
                case 'ideas':
                    await this.loadUserIdeas(container);
                    break;
                case 'achievements':
                    await this.loadUserBadges(container);
                    break;
                case 'comments':
                    await this.loadUserComments(container);
                    break;
                case 'saved':
                    await this.loadUserSaved(container);
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tabName}:`, error);
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Unable to load content</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    async loadUserProjects(container) {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', this.currentUser.id)
            .eq('type', 'project')
            .order('created_at', { ascending: false });

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

    async loadUserIdeas(container) {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', this.currentUser.id)
            .eq('type', 'idea')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!posts || posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No ideas yet</h3>
                    <p>Share your first idea to inspire others!</p>
                    <button class="cta-button" onclick="window.location.href='dashboard.html'">Share Idea</button>
                </div>
            `;
            return;
        }

        container.innerHTML = posts.map(post => this.createPostCard(post)).join('');
    }

    async loadUserBadges(container) {
        const badgesWithStatus = await this.badgeService.getAllBadgesWithUserStatus(this.currentUser.id);

        if (!badgesWithStatus.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No badges yet</h3>
                    <p>Start engaging with the community to earn badges!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = badgesWithStatus.map(badge => `
            <div class="badge-item ${badge.unlocked ? '' : 'locked'}" 
                 data-badge-id="${badge.id}"
                 data-badge-tier="${badge.tier}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-tier tier-${badge.tier}">${badge.tier}</div>
                ${!badge.unlocked && badge.hidden ? `
                    <div class="badge-description" style="display: none;">${badge.description}</div>
                ` : `
                    <div class="badge-description">${badge.description}</div>
                `}
            </div>
        `).join('');

        // Add click listeners to show hidden badge descriptions
        container.querySelectorAll('.badge-item.locked').forEach(item => {
            item.addEventListener('click', () => {
                const description = item.querySelector('.badge-description');
                if (description.style.display === 'none') {
                    description.style.display = 'block';
                } else {
                    description.style.display = 'none';
                }
            });
        });
    }

    async loadUserComments(container) {
        // Implementation for loading user comments
        container.innerHTML = `
            <div class="empty-state">
                <h3>Comments coming soon</h3>
                <p>This feature will be available in the next update.</p>
            </div>
        `;
    }

    async loadUserSaved(container) {
        // Implementation for loading saved items
        container.innerHTML = `
            <div class="empty-state">
                <h3>Saved items coming soon</h3>
                <p>This feature will be available in the next update.</p>
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