// Device Manager Module - Platform Detection and Features
export class DeviceManager {
    constructor(appState) {
        this.state = appState;
        this.features = {
            clipboard: false,
            share: false,
            serviceWorker: false,
            broadcastChannel: false,
            webRTC: false,
            notifications: false,
            pwa: false
        };
    }

    async init() {
        this.detectPlatform();
        this.detectBrowser();
        this.detectFeatures();
        this.applyPlatformClasses();
        this.showPlatformFeatures();
        this.initPlatformSpecificFeatures();
        
        // Check for first visit
        if (!localStorage.getItem('hasVisited')) {
            setTimeout(() => this.showOnboardingTour(), 1000);
        }
        
        console.log(`✅ Device Manager initialized: ${this.state.platform} / ${this.state.browser}`);
    }

    detectPlatform() {
        const ua = navigator.userAgent;
        const platform = navigator.platform;
        
        if (/iPhone|iPad|iPod/.test(ua) && !window.MSStream) {
            this.state.platform = 'ios';
        } else if (/Android/.test(ua)) {
            this.state.platform = 'android';
        } else if (/Win/.test(platform)) {
            this.state.platform = 'windows';
        } else if (/Mac/.test(platform)) {
            this.state.platform = 'mac';
        } else if (/Linux/.test(platform)) {
            this.state.platform = 'linux';
        } else {
            this.state.platform = 'unknown';
        }
    }

    detectBrowser() {
        const ua = navigator.userAgent;
        
        if (/Chrome/.test(ua) && !/Edg/.test(ua)) {
            this.state.browser = 'chrome';
        } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
            this.state.browser = 'safari';
        } else if (/Firefox/.test(ua)) {
            this.state.browser = 'firefox';
        } else if (/Edg/.test(ua)) {
            this.state.browser = 'edge';
        } else {
            this.state.browser = 'other';
        }
    }

    detectFeatures() {
        this.features.clipboard = 'clipboard' in navigator;
        this.features.share = 'share' in navigator;
        this.features.serviceWorker = 'serviceWorker' in navigator;
        this.features.broadcastChannel = 'BroadcastChannel' in window;
        this.features.webRTC = 'RTCPeerConnection' in window;
        this.features.notifications = 'Notification' in window;
        this.features.pwa = 'BeforeInstallPromptEvent' in window;
    }

    applyPlatformClasses() {
        document.body.classList.add(`platform-${this.state.platform}`);
        document.body.classList.add(`browser-${this.state.browser}`);
    }

    showPlatformFeatures() {
        const container = document.getElementById('platform-features');
        if (!container) return;
        
        container.innerHTML = this.getPlatformHTML();
    }

    getPlatformHTML() {
        const platformKey = `${this.state.platform}_${this.state.browser}`;
        const features = {
            'ios_safari': `
                <div class="feature-card ios-feature animate-in">
                    <div class="platform-badge">iOS Safari</div>
                    <h3>📱 iOS Safari Exclusive Features</h3>
                    <p>Enhanced features designed specifically for iPhone/iPad Safari users:</p>
                    <div class="action-buttons">
                        <button onclick="DeviceManager.iOSSafariBookmarklet()" class="platform-btn primary-action">
                            <span class="btn-icon">🔖</span>
                            <span class="btn-text">
                                <span class="btn-title">Safari Bookmarklet</span>
                                <span class="btn-subtitle">One-tap injection</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.createIOSShortcut()" class="platform-btn">
                            <span class="btn-icon">⚡</span>
                            <span class="btn-text">
                                <span class="btn-title">Create Siri Shortcut</span>
                                <span class="btn-subtitle">Voice activation</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.iOSShareSheet()" class="platform-btn">
                            <span class="btn-icon">📤</span>
                            <span class="btn-text">
                                <span class="btn-title">Share Sheet Setup</span>
                                <span class="btn-subtitle">Share to AI apps</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.installPWA()" class="platform-btn">
                            <span class="btn-icon">📲</span>
                            <span class="btn-text">
                                <span class="btn-title">Add to Home Screen</span>
                                <span class="btn-subtitle">App-like experience</span>
                            </span>
                        </button>
                    </div>
                    <div class="feature-tip">
                        <span class="tip-icon">💡</span>
                        <span>Tip: Safari bookmarklet works best for prompt injection!</span>
                    </div>
                </div>
            `,
            
            'android_chrome': `
                <div class="feature-card android-feature animate-in">
                    <div class="platform-badge">Android Chrome</div>
                    <h3>🤖 Android Chrome Power Features</h3>
                    <p>Advanced features exclusive to Chrome on Android devices:</p>
                    <div class="action-buttons">
                        <button onclick="DeviceManager.androidChromeShortcut()" class="platform-btn primary-action">
                            <span class="btn-icon">⚡</span>
                            <span class="btn-text">
                                <span class="btn-title">Chrome Quick Action</span>
                                <span class="btn-subtitle">Address bar shortcut</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.installPWA()" class="platform-btn">
                            <span class="btn-icon">📲</span>
                            <span class="btn-text">
                                <span class="btn-title">Install App</span>
                                <span class="btn-subtitle">Works offline</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.androidShareTarget()" class="platform-btn">
                            <span class="btn-icon">🎯</span>
                            <span class="btn-text">
                                <span class="btn-title">Share Target</span>
                                <span class="btn-subtitle">Receive shared text</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.enableNotifications()" class="platform-btn">
                            <span class="btn-icon">🔔</span>
                            <span class="btn-text">
                                <span class="btn-title">Push Notifications</span>
                                <span class="btn-subtitle">Background updates</span>
                            </span>
                        </button>
                    </div>
                    <div class="feature-tip">
                        <span class="tip-icon">⚡</span>
                        <span>Chrome shortcuts provide instant access from anywhere!</span>
                    </div>
                </div>
            `,
            
            'windows_edge': `
                <div class="feature-card windows-feature animate-in">
                    <div class="platform-badge">Windows Edge</div>
                    <h3>💻 Windows Edge Integration</h3>
                    <p>Native Windows features exclusive to Microsoft Edge:</p>
                    <div class="action-buttons">
                        <button onclick="DeviceManager.edgeSidePanel()" class="platform-btn primary-action">
                            <span class="btn-icon">📱</span>
                            <span class="btn-text">
                                <span class="btn-title">Edge Sidebar</span>
                                <span class="btn-subtitle">Pin AI Hub to sidebar</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.windowsProtocolHandler()" class="platform-btn">
                            <span class="btn-icon">🔗</span>
                            <span class="btn-text">
                                <span class="btn-title">Protocol Handler</span>
                                <span class="btn-subtitle">aihub:// links</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.edgeCollections()" class="platform-btn">
                            <span class="btn-icon">📑</span>
                            <span class="btn-text">
                                <span class="btn-title">Edge Collections</span>
                                <span class="btn-subtitle">Organize prompts</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.setupKeyboardShortcuts()" class="platform-btn">
                            <span class="btn-icon">⌨️</span>
                            <span class="btn-text">
                                <span class="btn-title">Keyboard Shortcuts</span>
                                <span class="btn-subtitle">Ctrl+K to search</span>
                            </span>
                        </button>
                    </div>
                    <div class="feature-tip">
                        <span class="tip-icon">🚀</span>
                        <span>Edge Sidebar provides instant access from any webpage!</span>
                    </div>
                </div>
            `,
            
            'mac_safari': `
                <div class="feature-card mac-feature animate-in">
                    <div class="platform-badge">macOS Safari</div>
                    <h3>🍎 macOS Safari Enhanced Features</h3>
                    <p>Mac-exclusive features optimized for Safari:</p>
                    <div class="action-buttons">
                        <button onclick="DeviceManager.safariWebExtension()" class="platform-btn primary-action">
                            <span class="btn-icon">🦁</span>
                            <span class="btn-text">
                                <span class="btn-title">Safari Extension</span>
                                <span class="btn-subtitle">Native integration</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.macQuickAction()" class="platform-btn">
                            <span class="btn-icon">🚀</span>
                            <span class="btn-text">
                                <span class="btn-title">Quick Actions</span>
                                <span class="btn-subtitle">Services menu</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.macHandoff()" class="platform-btn">
                            <span class="btn-icon">🔄</span>
                            <span class="btn-text">
                                <span class="btn-title">Handoff</span>
                                <span class="btn-subtitle">Continue on iPhone/iPad</span>
                            </span>
                        </button>
                        <button onclick="DeviceManager.setupKeyboardShortcuts()" class="platform-btn">
                            <span class="btn-icon">⌨️</span>
                            <span class="btn-text">
                                <span class="btn-title">Keyboard Shortcuts</span>
                                <span class="btn-subtitle">⌘K to search</span>
                            </span>
                        </button>
                    </div>
                    <div class="feature-tip">
                        <span class="tip-icon">⌘</span>
                        <span>Safari extension provides seamless integration!</span>
                    </div>
                </div>
            `
        };
        
        return features[platformKey] || this.getDefaultPlatformHTML();
    }

    getDefaultPlatformHTML() {
        return `
            <div class="feature-card default-feature animate-in">
                <h3>🌐 Platform Features</h3>
                <p>Using ${this.state.browser} browser on ${this.state.platform}</p>
                <p>Some features are optimized for specific browser+platform combinations.</p>
                <button onclick="DeviceManager.installPWA()" class="platform-btn">
                    Install Web App
                </button>
            </div>
        `;
    }

    initPlatformSpecificFeatures() {
        const platform = this.state.platform;
        const browser = this.state.browser;
        
        // iOS specific
        if (platform === 'ios') {
            // Prevent zoom on input focus
            document.querySelectorAll('input, textarea').forEach(el => {
                el.addEventListener('touchstart', () => {
                    el.style.fontSize = '16px';
                });
            });
            
            // Add haptic feedback for buttons
            if ('vibrate' in navigator) {
                document.querySelectorAll('button').forEach(btn => {
                    btn.addEventListener('touchstart', () => navigator.vibrate(10));
                });
            }
        }
        
        // Android specific
        if (platform === 'android') {
            // Enable pull-to-refresh
            let startY = 0;
            document.addEventListener('touchstart', e => {
                startY = e.touches[0].pageY;
            });
            
            document.addEventListener('touchmove', e => {
                const y = e.touches[0].pageY;
                if (document.scrollingElement.scrollTop === 0 && y > startY + 50) {
                    // Pull to refresh logic
                }
            });
        }
        
        // Register service worker
        if (this.features.serviceWorker) {
            navigator.serviceWorker.register('/guardian/guardian-sw.js').catch(err => {
                console.warn('Service worker registration failed:', err);
            });
        }
    }

    // Platform Feature Methods (exposed as static for onclick handlers)
    static iOSSafariBookmarklet() {
        const dm = window.App.modules.device;
        dm.trackFeature('ios_safari_bookmarklet');
        
        const modal = dm.createModal({
            title: '🔖 Safari Bookmarklet for iOS',
            content: `
                <p>This bookmarklet works perfectly on iPhone/iPad Safari!</p>
                <ol>
                    <li>Copy this code:
                        <textarea class="code-textarea" readonly>javascript:(function(){const p=localStorage.getItem('relay-prompt');if(p){const t=document.querySelector('textarea,input[type="text"],[contenteditable="true"]');if(t){t.value=p;t.textContent=p;t.dispatchEvent(new Event('input',{bubbles:true}));alert('✅ Prompt injected!');}}else{alert('No saved prompt found');}})();</textarea>
                    </li>
                    <li>Tap Share ⬆️ → Add Bookmark → Save</li>
                    <li>Edit the bookmark → Replace URL with the code</li>
                    <li>On any AI site, tap the bookmark to inject!</li>
                </ol>
                <button class="btn btn-primary" onclick="DeviceManager.copyBookmarkletCode(this)">
                    Copy Code
                </button>
            `
        });
        
        document.getElementById('modal-container').appendChild(modal);
    }

    static copyBookmarkletCode(button) {
        const textarea = button.parentElement.querySelector('textarea');
        navigator.clipboard.writeText(textarea.value).then(() => {
            window.App.modules.ui.showNotification('Code copied!');
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = 'Copy Code';
            }, 2000);
        });
    }

    static createIOSShortcut() {
        const dm = window.App.modules.device;
        dm.trackFeature('ios_shortcut_guide');
        
        const modal = dm.createModal({
            title: '⚡ Create Siri Shortcut',
            content: `
                <p>Launch AI agents with your voice!</p>
                <ol>
                    <li>Open the <strong>Shortcuts</strong> app</li>
                    <li>Tap <strong>+</strong> to create new shortcut</li>
                    <li>Add <strong>"Text"</strong> action with your saved prompt</li>
                    <li>Add <strong>"Copy to Clipboard"</strong> action</li>
                    <li>Add <strong>"Open URL"</strong> for each AI site</li>
                    <li>Name it <strong>"Launch AI"</strong></li>
                    <li>Say "Hey Siri, Launch AI"!</li>
                </ol>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">
                    Got it!
                </button>
            `
        });
        
        document.getElementById('modal-container').appendChild(modal);
    }

    static iOSShareSheet() {
        const dm = window.App.modules.device;
        dm.trackFeature('ios_share_sheet');
        
        if (navigator.share) {
            const prompt = document.getElementById('universal-prompt').value;
            navigator.share({
                title: 'AI Prompt',
                text: prompt || 'Check out AI Agent Hub!',
                url: window.location.href
            });
        }
    }

    static installPWA() {
        const dm = window.App.modules.device;
        
        if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            window.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    dm.trackFeature('pwa_installed');
                    window.App.modules.ui.showNotification('🎉 App installed successfully!');
                }
            });
        } else {
            dm.showInstallInstructions();
        }
    }

    createModal(options) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
                <h3>${options.title}</h3>
                ${options.content}
            </div>
        `;
        return modal;
    }

    showInstallInstructions() {
        const instructions = {
            'ios': {
                steps: [
                    'Tap the Share button ⬆️',
                    'Scroll down and tap "Add to Home Screen"',
                    'Name it "AI Hub" and tap "Add"'
                ]
            },
            'android': {
                steps: [
                    'Tap the menu button ⋮',
                    'Select "Add to Home screen"',
                    'Confirm installation'
                ]
            },
            'windows': {
                steps: [
                    'Click the install icon in the address bar',
                    'Or go to browser menu → Install AI Hub',
                    'Click "Install" in the popup'
                ]
            },
            'mac': {
                steps: [
                    'Click the install icon in the address bar',
                    'Or use Share → Add to Dock',
                    'Confirm installation'
                ]
            }
        };
        
        const guide = instructions[this.state.platform] || instructions['windows'];
        const modal = this.createModal({
            title: 'Install AI Hub',
            content: `
                <ol>
                    ${guide.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">
                    Got it!
                </button>
            `
        });
        
        document.getElementById('modal-container').appendChild(modal);
    }

    trackFeature(feature, details = {}) {
        const tracking = JSON.parse(localStorage.getItem('feature_tracking') || '{}');
        if (!tracking[feature]) {
            tracking[feature] = {
                first_used: new Date().toISOString(),
                platform: this.state.platform,
                browser: this.state.browser,
                count: 0
            };
        }
        tracking[feature].count++;
        tracking[feature].last_used = new Date().toISOString();
        localStorage.setItem('feature_tracking', JSON.stringify(tracking));
    }

    showOnboardingTour() {
        const tour = document.createElement('div');
        tour.className = 'modal-overlay';
        tour.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="DeviceManager.closeOnboarding()">×</button>
                <h2>👋 Welcome to AI Agent Hub!</h2>
                <p>Your universal gateway to all FREE AI assistants.</p>
                <p>We've detected you're using <strong>${this.state.browser} on ${this.state.platform}</strong>!</p>
                <p>We have exclusive features just for your setup.</p>
                <button class="btn btn-primary" onclick="DeviceManager.closeOnboarding()">
                    Get Started →
                </button>
            </div>
        `;
        document.body.appendChild(tour);
        
        this.trackFeature('onboarding_started');
    }

    static closeOnboarding() {
        document.querySelector('.modal-overlay')?.remove();
        localStorage.setItem('hasVisited', 'true');
    }
}

// Expose static methods to window for onclick handlers
window.DeviceManager = DeviceManager;
