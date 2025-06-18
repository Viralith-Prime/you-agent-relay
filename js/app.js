// Main Application Module
import { AgentManager } from './agents.js';
import { DeviceManager } from './device-manager.js';
import { FavoritesManager } from './favorites.js';
import { HistoryManager } from './history.js';
import { UIController } from './ui-controller.js';
import { SearchManager } from './search.js';
import { GuardianSystem } from '../guardian/guardian-core.js';

// Global App State
const AppState = {
    currentCategory: 'all',
    searchQuery: '',
    platform: null,
    browser: null,
    currentAgent: null,
    selectedMethod: null,
    favorites: [],
    promptHistory: [],
    isGuardianActive: false
};

// Make AppState globally accessible
window.AppState = AppState;

// Main Application Controller
class App {
    constructor() {
        this.state = AppState;
        this.modules = {};
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            // Initialize UI first
            this.modules.ui = new UIController(this.state);
            await this.modules.ui.init();
            
            // Initialize core modules
            this.modules.agents = new AgentManager(this.state);
            this.modules.device = new DeviceManager(this.state);
            this.modules.favorites = new FavoritesManager(this.state);
            this.modules.history = new HistoryManager(this.state);
            this.modules.search = new SearchManager(this.state);
            
            // Initialize Guardian System
            this.modules.guardian = new GuardianSystem(this.state);
            
            // Initialize all modules
            await Promise.all([
                this.modules.agents.init(),
                this.modules.device.init(),
                this.modules.favorites.init(),
                this.modules.history.init(),
                this.modules.search.init(),
                this.modules.guardian.init()
            ]);
            
            // Load saved data
            this.loadSavedData();
            
            // Render initial UI
            this.render();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Mark as initialized
            this.initialized = true;
            
            console.log('✅ AI Agent Hub initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.modules.ui.showNotification('Failed to initialize app', 'error');
        }
    }

    loadSavedData() {
        // Load saved prompt
        const savedPrompt = localStorage.getItem('relay-prompt');
        if (savedPrompt) {
            document.getElementById('universal-prompt').value = savedPrompt;
            document.getElementById('saved-indicator').style.display = 'block';
        }
        
        // Load favorites
        this.state.favorites = this.modules.favorites.getAll();
        
        // Load history
        this.state.promptHistory = this.modules.history.getAll();
    }

    render() {
        // Render agents
        this.modules.agents.render();
        
        // Render history
        this.modules.history.render();
        
        // Update favorites UI
        this.modules.favorites.updateUI();
        
        // Render comparison table
        this.renderComparisonTable();
    }

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const isMac = this.state.platform === 'mac';
            const modKey = isMac ? e.metaKey : e.ctrlKey;
            
            if (modKey) {
                switch(e.key) {
                    case 'k':
                        e.preventDefault();
                        document.getElementById('agent-search-bar')?.focus();
                        break;
                    case 's':
                        e.preventDefault();
                        this.savePrompt();
                        break;
                    case 'c':
                        e.preventDefault();
                        this.copyPrompt();
                        break;
                    case '/':
                        e.preventDefault();
                        document.getElementById('universal-prompt')?.focus();
                        break;
                }
            }
        });
        
        // Search input
        const searchInput = document.getElementById('agent-search-bar');
        if (searchInput) {
            searchInput.addEventListener('input', this.modules.search.handleSearch.bind(this.modules.search));
        }
        
        // Prevent accidental navigation
        window.addEventListener('beforeunload', (e) => {
            const prompt = document.getElementById('universal-prompt')?.value;
            if (prompt && prompt !== localStorage.getItem('relay-prompt')) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
        
        // Handle PWA install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window.deferredPrompt = e;
        });
    }

    // Prompt Management
    savePrompt() {
        const prompt = document.getElementById('universal-prompt').value;
        localStorage.setItem('relay-prompt', prompt);
        localStorage.setItem('relay-timestamp', Date.now());
        
        const indicator = document.getElementById('saved-indicator');
        if (indicator) {
            indicator.style.display = prompt ? 'block' : 'none';
        }
        
        if (prompt.trim()) {
            this.modules.history.add(prompt, null);
        }
        
        this.modules.ui.showNotification('✓ Prompt saved! Ready for relay to agents.');
    }

    copyPrompt() {
        const prompt = document.getElementById('universal-prompt').value;
        
        if (!prompt) {
            this.modules.ui.showNotification('⚠️ No prompt to copy', 'warning');
            return;
        }
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(prompt).then(() => {
                this.modules.ui.showNotification('📋 Copied! Paste in the agent chat.');
            }).catch(() => {
                this.fallbackCopyTextToClipboard(prompt);
            });
        } else {
            this.fallbackCopyTextToClipboard(prompt);
        }
    }

    fallbackCopyTextToClipboard(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
            document.execCommand('copy');
            this.modules.ui.showNotification('📋 Copied! Paste in the agent chat.');
        } catch (err) {
            this.modules.ui.showNotification('⚠️ Copy failed. Please copy manually.', 'error');
        }
        
        document.body.removeChild(textarea);
    }

    clearPrompt() {
        document.getElementById('universal-prompt').value = '';
        localStorage.removeItem('relay-prompt');
        document.getElementById('saved-indicator').style.display = 'none';
        this.modules.ui.showNotification('🗑️ Prompt cleared');
    }

    // Category Management
    showCategory(category) {
        this.state.currentCategory = category;
        
        // Update UI
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`tab-${category}`)?.classList.add('active');
        
        // Re-render
        this.modules.agents.render();
        this.renderComparisonTable();
    }

    // Comparison Table
    toggleComparison() {
        const content = document.getElementById('comparison-content');
        const toggle = document.getElementById('comparison-toggle');
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        
        if (expanded) {
            content.style.display = 'none';
            toggle.setAttribute('aria-expanded', 'false');
            content.setAttribute('aria-hidden', 'true');
            toggle.textContent = 'Show Quick Comparison';
        } else {
            content.style.display = '';
            toggle.setAttribute('aria-expanded', 'true');
            content.setAttribute('aria-hidden', 'false');
            toggle.textContent = 'Hide Quick Comparison';
            this.renderComparisonTable();
        }
    }

    renderComparisonTable() {
        const tbody = document.getElementById('comparison-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        let agents = this.modules.agents.getFiltered();
        
        agents.forEach(agent => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${agent.icon} ${agent.name}</td>
                <td>${agent.bestFor ? agent.bestFor.map(cat => 
                    cat.charAt(0).toUpperCase() + cat.slice(1)
                ).join(', ') : ''}</td>
                <td>${agent.loginRequired || 'No'}</td>
                <td>${agent.dailyLimit || 'Unknown'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Agent Launch (connects to Guardian)
    async launchAgent(agentName) {
        const agent = this.modules.agents.getByName(agentName);
        if (!agent) return;
        
        const prompt = document.getElementById('universal-prompt').value;
        
        // Save to history if there's a prompt
        if (prompt.trim()) {
            this.savePrompt();
            this.modules.history.add(prompt, agentName);
        }
        
        // Set current agent
        this.state.currentAgent = agent;
        
        // Launch with Guardian
        await this.modules.guardian.launch(agent, prompt);
    }
}

// Create and expose app instance
const app = new App();
window.App = app;

// Expose public methods to window for onclick handlers
window.App.savePrompt = () => app.savePrompt();
window.App.copyPrompt = () => app.copyPrompt();
window.App.clearPrompt = () => app.clearPrompt();
window.App.showCategory = (cat) => app.showCategory(cat);
window.App.toggleComparison = () => app.toggleComparison();
window.App.launchAgent = (name) => app.launchAgent(name);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Export for module usage
export { app, AppState };
