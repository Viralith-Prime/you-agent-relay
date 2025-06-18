// Guardian System Core Module
export class GuardianSystem {
    constructor(appState) {
        this.state = appState;
        this.activeMethods = [];
        this.injectionStats = new Map();
        this.channels = new Map();
        this.isActive = false;
    }

    async init() {
        try {
            // Dynamic imports for Guardian modules
            const [
                { InjectionMethods },
                { CommunicationChannels }
            ] = await Promise.all([
                import('./injection-methods.js'),
                import('./channels.js')
            ]);
            
            this.injectionMethods = new InjectionMethods(this);
            this.communicationChannels = new CommunicationChannels(this);
            
            // Initialize components
            await this.injectionMethods.init();
            await this.communicationChannels.init();
            
            // Detect available methods based on platform
            this.detectAvailableMethods();
            
            // Register service worker
            await this.registerServiceWorker();
            
            // Initialize shared worker
            await this.initializeSharedWorker();
            
            console.log('✅ Guardian System initialized');
            
        } catch (error) {
            console.error('❌ Guardian initialization failed:', error);
        }
    }

    detectAvailableMethods() {
        const platform = this.state.platform;
        const browser = this.state.browser;
        const methods = [];
        
        // Platform and browser specific methods
        if (platform === 'ios' && browser === 'safari') {
            methods.push({
                id: 'ios-clipboard',
                name: '📋 iOS Smart Clipboard',
                description: 'Enhanced clipboard with haptic feedback',
                priority: 1,
                execute: (agent, prompt) => this.injectionMethods.iosClipboard(agent, prompt)
            });
            methods.push({
                id: 'ios-shortcuts',
                name: '⚡ Shortcuts Integration',
                description: 'Use Shortcuts app for injection',
                priority: 2,
                execute: (agent, prompt) => this.injectionMethods.iosShortcuts(agent, prompt)
            });
        }
        
        if (platform === 'android' && browser === 'chrome') {
            methods.push({
                id: 'android-intent',
                name: '🚀 Intent Injection',
                description: 'Deep app integration via intents',
                priority: 1,
                execute: (agent, prompt) => this.injectionMethods.androidIntent(agent, prompt)
            });
            methods.push({
                id: 'android-notification',
                name: '🔔 Notification Channel',
                description: 'Background prompt injection',
                priority: 2,
                execute: (agent, prompt) => this.injectionMethods.androidNotification(agent, prompt)
            });
        }
        
        // Universal injection methods (7 methods)
        methods.push({
            id: 'dom-inject',
            name: '🎯 DOM Injection',
            description: 'Direct DOM manipulation',
            priority: 3,
            execute: (agent, prompt) => this.injectionMethods.domInject(agent, prompt)
        });
        
        methods.push({
            id: 'react-fiber',
            name: '⚛️ React Fiber',
            description: 'React internal manipulation',
            priority: 4,
            execute: (agent, prompt) => this.injectionMethods.reactFiber(agent, prompt)
        });
        
        methods.push({
            id: 'clipboard-api',
            name: '📋 Clipboard API',
            description: 'Modern clipboard injection',
            priority: 5,
            execute: (agent, prompt) => this.injectionMethods.clipboardAPI(agent, prompt)
        });
        
        methods.push({
            id: 'event-sim',
            name: '🎭 Event Simulation',
            description: 'Simulate user input events',
            priority: 6,
            execute: (agent, prompt) => this.injectionMethods.eventSimulation(agent, prompt)
        });
        
        methods.push({
            id: 'exec-command',
            name: '⌨️ ExecCommand',
            description: 'Legacy command execution',
            priority: 7,
            execute: (agent, prompt) => this.injectionMethods.execCommand(agent, prompt)
        });
        
        methods.push({
            id: 'mutation-observer',
            name: '👁️ Mutation Observer',
            description: 'Watch for DOM changes',
            priority: 8,
            execute: (agent, prompt) => this.injectionMethods.mutationObserver(agent, prompt)
        });
        
        methods.push({
            id: 'framework-detect',
            name: '🔍 Framework Detection',
            description: 'Vue/Angular specific injection',
            priority: 9,
            execute: (agent, prompt) => this.injectionMethods.frameworkDetect(agent, prompt)
        });
        
        // Sort by priority
        methods.sort((a, b) => a.priority - b.priority);
        
        this.activeMethods = methods;
        console.log(`Guardian: ${methods.length} injection methods available`);
    }

    async launch(agent, prompt) {
        this.isActive = true;
        
        // Show Guardian status
        window.App.modules.ui.showGuardianStatus('🛡️ Guardian System Active - Initializing...', 'info');
        
        // Show method selector based on platform
        const selector = await this.showMethodSelector(agent);
        
        if (selector) {
            // User selected specific method
            await this.executeSelectedMethod(agent, prompt);
        } else {
            // Auto-launch with best method
            await this.autoLaunch(agent, prompt);
        }
    }

    async showMethodSelector(agent) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'device-method-modal';
            modal.innerHTML = `
                <div class="device-method-content">
                    <button class="modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
                    <div class="device-method-header">
                        <div class="device-method-icon">${agent.icon}</div>
                        <div class="device-method-title">
                            <h2>Launch ${agent.name}</h2>
                            <p>${this.state.platform} • ${this.state.browser}</p>
                        </div>
                    </div>
                    
                    <p>Select injection method:</p>
                    
                    ${this.activeMethods.map(method => `
                        <div class="method-option ${method.priority === 1 ? 'selected' : ''}"
                             onclick="GuardianSystem.selectMethod('${method.id}')"
                             data-method="${method.id}">
                            <div class="method-option-header">
                                <span class="method-option-title">${method.name}</span>
                                ${method.priority === 1 ? '<span class="method-option-badge">Recommended</span>' : ''}
                            </div>
                            <div class="method-option-desc">${method.description}</div>
                        </div>
                    `).join('')}
                    
                    <div class="device-method-actions">
                        <button class="btn btn-secondary" onclick="GuardianSystem.cancelLaunch()">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="GuardianSystem.executeLaunch()">
                            Launch Agent
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('modal-container').appendChild(modal);
            
            // Set default selection
            this.state.selectedMethod = this.activeMethods[0].id;
            
            // Store resolver for later use
            this.launchResolver = resolve;
        });
    }

    async autoLaunch(agent, prompt) {
        // Try each method in priority order
        const results = [];
        
        for (const method of this.activeMethods) {
            try {
                window.App.modules.ui.showGuardianStatus(
                    `🛡️ Attempting: ${method.name}`, 
                    'info'
                );
                
                const result = await method.execute(agent, prompt);
                results.push({ method: method.id, success: result });
                
                if (result) {
                    // Success!
                    this.trackInjection(agent.name, method.id, true);
                    window.App.modules.ui.showGuardianStatus(
                        `✅ Injected via ${method.name}`, 
                        'success'
                    );
                    break;
                }
            } catch (error) {
                console.error(`Guardian: ${method.name} failed:`, error);
                results.push({ method: method.id, success: false, error: error.message });
            }
        }
        
        // Open the agent URL regardless
        window.open(agent.url, '_blank');
        
        // Log results
        console.log('Guardian injection results:', results);
    }

    async executeSelectedMethod(agent, prompt) {
        const method = this.activeMethods.find(m => m.id === this.state.selectedMethod);
        if (!method) return;
        
        try {
            window.App.modules.ui.showGuardianStatus(
                `🛡️ Executing: ${method.name}`, 
                'info'
            );
            
            const result = await method.execute(agent, prompt);
            
            if (result) {
                this.trackInjection(agent.name, method.id, true);
                window.App.modules.ui.showGuardianStatus(
                    `✅ Injected via ${method.name}`, 
                    'success'
                );
            } else {
                window.App.modules.ui.showGuardianStatus(
                    `❌ ${method.name} failed`, 
                    'error'
                );
            }
        } catch (error) {
            window.App.modules.ui.showGuardianStatus(
                `❌ Error: ${error.message}`, 
                'error'
            );
        }
    }

    trackInjection(agentName, methodId, success) {
        if (!this.injectionStats.has(agentName)) {
            this.injectionStats.set(agentName, {
                attempts: 0,
                successes: 0,
                methods: new Map()
            });
        }
        
        const stats = this.injectionStats.get(agentName);
        stats.attempts++;
        
        if (success) {
            stats.successes++;
        }
        
        if (!stats.methods.has(methodId)) {
            stats.methods.set(methodId, { attempts: 0, successes: 0 });
        }
        
        const methodStats = stats.methods.get(methodId);
        methodStats.attempts++;
        if (success) methodStats.successes++;
        
        // Save to localStorage
        this.saveStats();
    }

    saveStats() {
        const statsObj = {};
        
        this.injectionStats.forEach((stats, agent) => {
            statsObj[agent] = {
                attempts: stats.attempts,
                successes: stats.successes,
                successRate: Math.round((stats.successes / stats.attempts) * 100),
                methods: {}
            };
            
            stats.methods.forEach((methodStats, methodId) => {
                statsObj[agent].methods[methodId] = {
                    attempts: methodStats.attempts,
                    successes: methodStats.successes,
                    successRate: Math.round((methodStats.successes / methodStats.attempts) * 100)
                };
            });
        });
        
        localStorage.setItem('guardian-stats', JSON.stringify(statsObj));
    }

    loadStats() {
        try {
            const saved = localStorage.getItem('guardian-stats');
            if (saved) {
                const statsObj = JSON.parse(saved);
                // Convert back to Map structure
                Object.entries(statsObj).forEach(([agent, stats]) => {
                    const agentStats = {
                        attempts: stats.attempts,
                        successes: stats.successes,
                        methods: new Map()
                    };
                    
                    Object.entries(stats.methods).forEach(([methodId, methodStats]) => {
                        agentStats.methods.set(methodId, methodStats);
                    });
                    
                    this.injectionStats.set(agent, agentStats);
                });
            }
        } catch (error) {
            console.error('Failed to load Guardian stats:', error);
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/guardian/guardian-sw.js');
                console.log('Guardian service worker registered:', registration.scope);
            } catch (error) {
                console.warn('Guardian service worker registration failed:', error);
            }
        }
    }

    async initializeSharedWorker() {
        if ('SharedWorker' in window) {
            try {
                this.sharedWorker = new SharedWorker('/guardian/guardian-worker.js');
                this.sharedWorker.port.start();
                
                this.sharedWorker.port.onmessage = (event) => {
                    this.handleWorkerMessage(event.data);
                };
                
                // Announce connection
                this.sharedWorker.port.postMessage({
                    type: 'CONNECT',
                    platform: this.state.platform,
                    browser: this.state.browser
                });
                
                console.log('Guardian shared worker initialized');
            } catch (error) {
                console.warn('Guardian shared worker initialization failed:', error);
            }
        }
    }

    handleWorkerMessage(message) {
        switch (message.type) {
            case 'INJECTION_SYNC':
                // Sync injection across tabs
                if (message.prompt) {
                    document.getElementById('universal-prompt').value = message.prompt;
                }
                break;
                
            case 'STATS_UPDATE':
                // Update stats from other tabs
                this.loadStats();
                break;
                
            default:
                console.log('Guardian worker message:', message);
        }
    }

    getStats() {
        return this.injectionStats;
    }

    reset() {
        this.injectionStats.clear();
        localStorage.removeItem('guardian-stats');
        window.App.modules.ui.showNotification('Guardian stats reset');
    }
}

// Static methods for onclick handlers
GuardianSystem.selectMethod = (methodId) => {
    window.App.modules.guardian.state.selectedMethod = methodId;
    
    // Update UI
    document.querySelectorAll('.method-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.method === methodId);
    });
};

GuardianSystem.cancelLaunch = () => {
    document.querySelector('.device-method-modal')?.remove();
    if (window.App.modules.guardian.launchResolver) {
        window.App.modules.guardian.launchResolver(false);
    }
};

GuardianSystem.executeLaunch = async () => {
    document.querySelector('.device-method-modal')?.remove();
    
    const guardian = window.App.modules.guardian;
    const agent = guardian.state.currentAgent;
    const prompt = document.getElementById('universal-prompt').value;
    
    await guardian.executeSelectedMethod(agent, prompt);
    
    if (guardian.launchResolver) {
        guardian.launchResolver(true);
    }
};

// Expose to window
window.GuardianSystem = GuardianSystem;
