// js/edit-profile.js
class EditProfilePage {
    constructor() {
        this.currentUser = null;
        this.profileData = null;
        this.selectedTags = [];
        this.MAX_TAGS = 15;
        this.badgeService = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadProfileData();
        this.setupTechStack();
        this.setupFormListeners();
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
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error) throw error;
            
            this.profileData = profile;
            this.populateForm();
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showNotification('Failed to load profile data', 'error');
        }
    }

    populateForm() {
        if (!this.profileData) return;

        // Username (locked)
        document.getElementById('username-display').textContent = `@${this.profileData.username}`;

        // Basic info
        document.getElementById('display-name').value = this.profileData.display_name || '';
        document.getElementById('bio').value = this.profileData.bio || '';
        document.getElementById('title').value = this.profileData.title || '';
        document.getElementById('location').value = this.profileData.location || '';

        // Update bio counter
        document.getElementById('bio-count').textContent = (this.profileData.bio || '').length;

        // Tech stack
        this.selectedTags = this.profileData.tech_stack || [];
        this.renderTags();

        // Specialty
        document.getElementById('specialty').value = this.profileData.specialty || '';

        // Links
        document.getElementById('website').value = this.profileData.website || '';
        document.getElementById('github').value = this.profileData.github_url || '';
        document.getElementById('twitter').value = this.profileData.twitter_url || '';

        // Availability
        document.getElementById('available-hire').checked = this.profileData.available_for_hire || false;
        document.getElementById('open-collab').checked = this.profileData.looking_to_collaborate || false;
    }

    setupFormListeners() {
        // Bio character counter
        const bioInput = document.getElementById('bio');
        bioInput.addEventListener('input', () => {
            document.getElementById('bio-count').textContent = bioInput.value.length;
        });

        // Form submission
        const form = document.getElementById('edit-profile-form');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    setupTechStack() {
        const techSearch = document.getElementById('tech-search');
        const suggestionsList = document.getElementById('suggestions-list');

        // Comprehensive tech list (same as profile.js)
        this.techList = [
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
        ].sort();

        // Search input
        techSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (this.selectedTags.length >= this.MAX_TAGS) {
                suggestionsList.innerHTML = '<div class="suggestion-item no-results">Maximum 15 tags reached</div>';
                suggestionsList.classList.add('show');
                return;
            }

            if (query.length < 1) {
                suggestionsList.classList.remove('show');
                return;
            }

            const filtered = this.techList.filter(tech => 
                tech.toLowerCase().includes(query) &&
                !this.selectedTags.includes(tech)
            ).slice(0, 10);

            if (filtered.length > 0) {
                suggestionsList.innerHTML = filtered.map(tech => 
                    `<div class="suggestion-item" data-tech="${tech}">${tech}</div>`
                ).join('');
                suggestionsList.classList.add('show');
            } else {
                suggestionsList.innerHTML = '<div class="suggestion-item no-results">No matching technologies found</div>';
                suggestionsList.classList.add('show');
            }
        });

        // Click suggestion
        suggestionsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-item') && !e.target.classList.contains('no-results')) {
                const tech = e.target.dataset.tech;
                this.addTag(tech);
                techSearch.value = '';
                suggestionsList.classList.remove('show');
            }
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!techSearch.contains(e.target) && !suggestionsList.contains(e.target)) {
                suggestionsList.classList.remove('show');
            }
        });

        // Enter key to add tag
        techSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = techSearch.value.trim();
                const matchedTech = this.techList.find(tech => 
                    tech.toLowerCase() === value.toLowerCase()
                );
                
                if (matchedTech && !this.selectedTags.includes(matchedTech) && this.selectedTags.length < this.MAX_TAGS) {
                    this.addTag(matchedTech);
                    techSearch.value = '';
                    suggestionsList.classList.remove('show');
                }
            }
        });
    }

    addTag(tech) {
        if (this.selectedTags.length >= this.MAX_TAGS) {
            this.showNotification(`Maximum ${this.MAX_TAGS} tags allowed`, 'warning');
            return;
        }

        if (!this.selectedTags.includes(tech)) {
            this.selectedTags.push(tech);
            this.renderTags();
        }
    }

    removeTag(tech) {
        this.selectedTags = this.selectedTags.filter(t => t !== tech);
        this.renderTags();
    }

    renderTags() {
        const container = document.getElementById('selected-tags');
        const counter = document.getElementById('tag-counter');

        if (this.selectedTags.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); font-size: 13px; padding: 8px;">No technologies added yet</div>';
        } else {
            container.innerHTML = this.selectedTags.map(tech => `
                <div class="tech-tag-edit">
                    ${tech}
                    <button type="button" onclick="editProfile.removeTag('${tech}')">×</button>
                </div>
            `).join('');
        }

        counter.textContent = `${this.selectedTags.length}/${this.MAX_TAGS} tags`;
        counter.classList.toggle('limit-reached', this.selectedTags.length >= this.MAX_TAGS);
    }

    async handleSubmit(e) {
        e.preventDefault();

        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.textContent;
        
        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            const updateData = {
                display_name: document.getElementById('display-name').value.trim() || null,
                bio: document.getElementById('bio').value.trim() || null,
                title: document.getElementById('title').value.trim() || null,
                location: document.getElementById('location').value.trim() || null,
                tech_stack: this.selectedTags,
                specialty: document.getElementById('specialty').value || null,
                website: document.getElementById('website').value.trim() || null,
                github_url: document.getElementById('github').value.trim() || null,
                twitter_url: document.getElementById('twitter').value.trim() || null,
                available_for_hire: document.getElementById('available-hire').checked,
                looking_to_collaborate: document.getElementById('open-collab').checked,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', this.currentUser.id);

            if (error) throw error;

            // Check for badges (if badge service is loaded)
            if (typeof BadgeService !== 'undefined') {
                const badgeService = new BadgeService();
                await badgeService.checkAndAwardBadges(
                    this.currentUser.id,
                    'profile_updated',
                    { profileData: updateData }
                );
            }

            this.showNotification('Profile updated successfully!', 'success');
            
            // Redirect back to profile after short delay
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1000);

        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification(error.message || 'Failed to update profile', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification (you can enhance this)
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize
const editProfile = new EditProfilePage();

// Add CSS animations
const style = document.createElement('style');
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
