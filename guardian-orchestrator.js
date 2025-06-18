// Guardian Orchestrator - Multi-Channel Injection System
// This file is loaded by the bookmarklet into AI sites
(function() {
    'use strict';
    
    // Prevent multiple injections
    if (window.GuardianOrchestrator) {
        console.log('Guardian Orchestrator already loaded');
        window.GuardianOrchestrator.injectPrompt(
            localStorage.getItem('guardian-prompt') || '',
            window.location.hostname
        );
        return;
    }

    class GuardianOrchestrator {
        constructor() {
            this.channels = new Map();
            this.injectionMethods = new Map();
            this.setupChannels();
            this.registerInjectionMethods();
            this.showActiveIndicator();
        }
        
        setupChannels() {
            // Channel 1: BroadcastChannel for same-origin communication
            try {
                this.broadcastChannel = new BroadcastChannel('guardian-relay');
                this.broadcastChannel.onmessage = (e) => this.handleMessage(e.data);
                console.log('Guardian: BroadcastChannel established');
            } catch (e) {
                console.log('Guardian: BroadcastChannel not supported');
            }
            
            // Channel 2: localStorage polling for cross-tab communication
            this.startLocalStoragePolling();
            
            // Channel 3: SharedWorker for persistent connection
            if (typeof SharedWorker !== 'undefined') {
                try {
                    this.sharedWorker = new SharedWorker(window.location.origin + '/guardian-worker.js');
                    this.sharedWorker.port.onmessage = (e) => this.handleMessage(e.data);
                    this.sharedWorker.port.start();
                    console.log('Guardian: SharedWorker connected');
                } catch (e) {
                    console.log('Guardian: SharedWorker failed:', e);
                }
            }
            
            // Channel 4: WebRTC for P2P between windows
            this.setupWebRTC();
            
            // Channel 5: PostMessage listener
            window.addEventListener('message', (e) => {
                if (e.data && e.data.source === 'guardian') {
                    this.handleMessage(e.data);
                }
            });
        }
        
        startLocalStoragePolling() {
            let lastCommand = localStorage.getItem('guardian-command-id');
            setInterval(() => {
                const currentCommand = localStorage.getItem('guardian-command-id');
                if (currentCommand !== lastCommand) {
                    lastCommand = currentCommand;
                    try {
                        const command = JSON.parse(localStorage.getItem('guardian-command'));
                        this.handleMessage(command);
                    } catch (e) {
                        console.error('Guardian: Failed to parse command', e);
                    }
                }
                
                // Also check for injection commands
                const injectId = localStorage.getItem('guardian-inject-id');
                if (injectId !== this.lastInjectId) {
                    this.lastInjectId = injectId;
                    try {
                        const cmd = JSON.parse(localStorage.getItem('guardian-inject-command'));
                        if (cmd && cmd.type === 'INJECT') {
                            this.injectPrompt(cmd.prompt, window.location.hostname);
                        }
                    } catch (e) {}
                }
            }, 100);
        }
        
        setupWebRTC() {
            // Check for WebRTC offer in localStorage
            const checkOffer = setInterval(() => {
                const offer = localStorage.getItem('guardian-webrtc-offer');
                if (offer && !this.peerConnection) {
                    this.establishWebRTC(JSON.parse(offer));
                    clearInterval(checkOffer);
                }
            }, 1000);
        }
        
        async establishWebRTC(offer) {
            try {
                this.peerConnection = new RTCPeerConnection({
                    iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
                });
                
                this.peerConnection.ondatachannel = (e) => {
                    const channel = e.channel;
                    channel.onmessage = (e) => {
                        this.handleMessage(JSON.parse(e.data));
                    };
                };
                
                await this.peerConnection.setRemoteDescription(offer);
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);
                
                localStorage.setItem('guardian-webrtc-answer', JSON.stringify(answer));
                console.log('Guardian: WebRTC connection established');
            } catch (e) {
                console.error('Guardian: WebRTC failed', e);
            }
        }
        
        registerInjectionMethods() {
            // Method 1: Direct DOM manipulation
            this.injectionMethods.set('dom', {
                name: 'DOM Injection',
                test: () => true,
                inject: (prompt) => {
                    const selectors = [
                        'textarea[data-id]',
                        'textarea#prompt-textarea',
                        'textarea[placeholder*="Message"]',
                        'textarea[placeholder*="Ask"]',
                        'textarea[placeholder*="Type"]',
                        'textarea[placeholder*="Enter"]',
                        'textarea',
                        'input[type="text"]',
                        '[contenteditable="true"]',
                        '.ProseMirror',
                        '.ql-editor',
                        '.DraftEditor-root',
                        'div[role="textbox"]'
                    ];
                    
                    for (const selector of selectors) {
                        const elements = document.querySelectorAll(selector);
                        for (const element of elements) {
                            if (this.isVisible(element)) {
                                return this.injectIntoElement(element, prompt);
                            }
                        }
                    }
                    return false;
                }
            });
            
            // Method 2: Clipboard injection
            this.injectionMethods.set('clipboard', {
                name: 'Clipboard Bridge',
                test: () => navigator.clipboard !== undefined,
                inject: async (prompt) => {
                    try {
                        await navigator.clipboard.writeText(prompt);
                        
                        // Find active element
                        const active = document.activeElement;
                        if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.contentEditable === 'true')) {
                            // Try paste command
                            document.execCommand('paste');
                            
                            // Also try dispatching paste event
                            const pasteEvent = new ClipboardEvent('paste', {
                                clipboardData: new DataTransfer(),
                                bubbles: true,
                                cancelable: true
                            });
                            active.dispatchEvent(pasteEvent);
                        }
                        
                        return true;
                    } catch (e) {
                        return false;
                    }
                }
            });
            
            // Method 3: React fiber manipulation
            this.injectionMethods.set('react', {
                name: 'React Injection',
                test: () => {
                    return document.querySelector('[data-reactroot]') || 
                           document.querySelector('._reactRootContainer') ||
                           Object.keys(document.body).some(key => key.startsWith('__reactContainer'));
                },
                inject: (prompt) => {
                    const elements = document.querySelectorAll('textarea, [contenteditable="true"], input[type="text"]');
                    
                    for (const element of elements) {
                        if (!this.isVisible(element)) continue;
                        
                        // Find React fiber
                        const reactKey = Object.keys(element).find(key => 
                            key.startsWith('__reactInternalInstance') || 
                            key.startsWith('__reactFiber') ||
                            key.startsWith('__reactEventHandlers')
                        );
                        
                        if (reactKey) {
                            const fiber = element[reactKey];
                            
                            // Try to update through React
                            if (fiber && fiber.memoizedProps) {
                                const onChange = fiber.memoizedProps.onChange || 
                                              fiber.memoizedProps.onInput ||
                                              (fiber.stateNode && fiber.stateNode.props && fiber.stateNode.props.onChange);
                                
                                if (onChange) {
                                    const event = {
                                        target: { value: prompt },
                                        currentTarget: { value: prompt },
                                        preventDefault: () => {},
                                        stopPropagation: () => {},
                                        nativeEvent: new Event('input')
                                    };
                                    onChange(event);
                                }
                            }
                            
                            // Also update DOM directly
                            if (element.value !== undefined) {
                                element.value = prompt;
                            } else if (element.textContent !== undefined) {
                                element.textContent = prompt;
                            }
                            
                            // Trigger React events
                            this.triggerReactChange(element);
                            
                            return true;
                        }
                    }
                    
                    return false;
                }
            });
            
            // Method 4: Input event simulation
            this.injectionMethods.set('events', {
                name: 'Event Simulation',
                test: () => true,
                inject: async (prompt) => {
                    const element = this.findInputElement();
                    if (!element) return false;
                    
                    element.focus();
                    element.click();
                    
                    // Clear existing content
                    element.value = '';
                    element.textContent = '';
                    
                    // Type each character with realistic timing
                    for (let i = 0; i < prompt.length; i++) {
                        const char = prompt[i];
                        
                        // Dispatch all keyboard events
                        const keydownEvent = new KeyboardEvent('keydown', {
                            key: char,
                            code: 'Key' + char.toUpperCase(),
                            charCode: char.charCodeAt(0),
                            keyCode: char.charCodeAt(0),
                            which: char.charCodeAt(0),
                            bubbles: true,
                            cancelable: true
                        });
                        
                        const keypressEvent = new KeyboardEvent('keypress', {
                            key: char,
                            charCode: char.charCodeAt(0),
                            keyCode: char.charCodeAt(0),
                            which: char.charCodeAt(0),
                            bubbles: true,
                            cancelable: true
                        });
                        
                        const inputEvent = new InputEvent('input', {
                            data: char,
                            inputType: 'insertText',
                            bubbles: true,
                            cancelable: true
                        });
                        
                        element.dispatchEvent(keydownEvent);
                        element.dispatchEvent(keypressEvent);
                        
                        // Update value
                        if (element.value !== undefined) {
                            element.value += char;
                        } else if (element.textContent !== undefined) {
                            element.textContent += char;
                        }
                        
                        element.dispatchEvent(inputEvent);
                        
                        // Add realistic delay
                        await new Promise(r => setTimeout(r, Math.random() * 50 + 25));
                    }
                    
                    // Final events
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                    
                    return true;
                }
            });
            
            // Method 5: ExecCommand
            this.injectionMethods.set('execCommand', {
                name: 'ExecCommand',
                test: () => document.execCommand !== undefined,
                inject: (prompt) => {
                    const element = this.findInputElement();
                    if (!element) return false;
                    
                    element.focus();
                    
                    // Select all content
                    if (element.select) {
                        element.select();
                    } else if (element.setSelectionRange) {
                        element.setSelectionRange(0, element.value.length);
                    } else if (window.getSelection) {
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(element);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    
                    // Insert text
                    document.execCommand('insertText', false, prompt);
                    
                    return true;
                }
            });
            
            // Method 6: Framework-specific (Vue, Angular, etc)
            this.injectionMethods.set('frameworks', {
                name: 'Framework Detection',
                test: () => true,
                inject: (prompt) => {
                    const element = this.findInputElement();
                    if (!element) return false;
                    
                    // Vue.js
                    if (element.__vue__ || element._vnode) {
                        const vueInstance = element.__vue__ || element._vnode.componentInstance;
                        if (vueInstance) {
                            vueInstance.$emit('input', prompt);
                            if (vueInstance.$data) {
                                Object.keys(vueInstance.$data).forEach(key => {
                                    if (typeof vueInstance.$data[key] === 'string') {
                                        vueInstance.$data[key] = prompt;
                                    }
                                });
                            }
                            return true;
                        }
                    }
                    
                    // Angular
                    if (element.ng || window.ng) {
                        try {
                            const ngElement = window.ng.probe(element);
                            if (ngElement) {
                                ngElement.componentInstance.value = prompt;
                                ngElement.injector.get('$rootScope').$apply();
                                return true;
                            }
                        } catch (e) {}
                    }
                    
                    return false;
                }
            });
        }
        
        findInputElement() {
            const selectors = [
                'textarea:not([readonly]):not([disabled])',
                'input[type="text"]:not([readonly]):not([disabled])',
                '[contenteditable="true"]',
                '[role="textbox"]',
                '.input-area',
                '.message-input'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (this.isVisible(element) && this.isInteractable(element)) {
                        return element;
                    }
                }
            }
            
            return null;
        }
        
        isVisible(element) {
            if (!element) return false;
            
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            
            return rect.width > 0 && 
                   rect.height > 0 && 
                   style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0';
        }
        
        isInteractable(element) {
            if (!element) return false;
            
            return !element.disabled && 
                   !element.readOnly && 
                   element.getAttribute('aria-disabled') !== 'true';
        }
        
        injectIntoElement(element, prompt) {
            // Store original value
            const originalValue = element.value || element.textContent;
            
            try {
                // Method 1: Direct value assignment
                if ('value' in element) {
                    element.value = prompt;
                } else if ('textContent' in element) {
                    element.textContent = prompt;
                } else if ('innerText' in element) {
                    element.innerText = prompt;
                }
                
                // Method 2: For contenteditable
                if (element.contentEditable === 'true') {
                    element.innerHTML = prompt.replace(/\n/g, '<br>');
                    
                    // Move cursor to end
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                
                // Trigger all possible events
                this.triggerAllEvents(element);
                
                // Check if value stuck
                setTimeout(() => {
                    const currentValue = element.value || element.textContent;
                    if (currentValue === originalValue && currentValue !== prompt) {
                        console.log('Guardian: Injection may have failed, trying alternative methods');
                        this.forceInject(element, prompt);
                    }
                }, 100);
                
                return true;
            } catch (e) {
                console.error('Guardian: Injection error', e);
                return false;
            }
        }
        
        forceInject(element, prompt) {
            // Nuclear option: Replace element
            const newElement = element.cloneNode(true);
            if ('value' in newElement) {
                newElement.value = prompt;
            } else {
                newElement.textContent = prompt;
            }
            element.parentNode.replaceChild(newElement, element);
            this.triggerAllEvents(newElement);
        }
        
        triggerAllEvents(element) {
            const events = [
                'input',
                'change',
                'keyup',
                'keydown',
                'keypress',
                'blur',
                'focus',
                'paste',
                'textInput',
                'compositionend'
            ];
            
            events.forEach(eventType => {
                try {
                    const event = new Event(eventType, {
                        bubbles: true,
                        cancelable: true,
                        composed: true
                    });
                    element.dispatchEvent(event);
                } catch (e) {}
            });
            
            // Special handling for React
            this.triggerReactChange(element);
            
            // Special handling for input events
            try {
                const inputEvent = new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertText',
                    data: element.value || element.textContent
                });
                element.dispatchEvent(inputEvent);
            } catch (e) {}
        }
        
        triggerReactChange(element) {
            // React 16+ change tracking
            if (element._valueTracker) {
                element._valueTracker.setValue('');
            }
            
            // Trigger React synthetic event
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set || Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;
            
            if (nativeInputValueSetter && element.value !== undefined) {
                nativeInputValueSetter.call(element, element.value);
            }
            
            // Dispatch events that React listens to
            ['input', 'change'].forEach(eventType => {
                const event = new Event(eventType, { bubbles: true });
                element.dispatchEvent(event);
            });
        }
        
        async injectPrompt(prompt, targetSite) {
            console.log(`Guardian: Attempting to inject prompt into ${targetSite}`);
            this.updateIndicator('Injecting...', 'processing');
            
            // Try all injection methods
            const results = [];
            
            for (const [id, method] of this.injectionMethods) {
                if (method.test()) {
                    console.log(`Guardian: Trying ${method.name}...`);
                    try {
                        const success = await method.inject(prompt);
                        results.push({ method: method.name, success });
                        
                        if (success) {
                            console.log(`Guardian: Success with ${method.name}!`);
                            this.reportSuccess(method.name, targetSite);
                            this.updateIndicator('Injected!', 'success');
                            
                            // Send success notification
                            this.sendMessage({
                                type: 'INJECTION_SUCCESS',
                                method: method.name,
                                site: targetSite
                            });
                            
                            return true;
                        }
                    } catch (e) {
                        console.error(`Guardian: ${method.name} failed:`, e);
                        results.push({ method: method.name, success: false, error: e.message });
                    }
                }
            }
            
            console.log('Guardian: All injection methods failed', results);
            this.updateIndicator('Failed', 'error');
            
            // Send failure notification
            this.sendMessage({
                type: 'INJECTION_FAILED',
                site: targetSite,
                results: results
            });
            
            return false;
        }
        
        reportSuccess(method, site) {
            // Track successful methods
            const stats = JSON.parse(localStorage.getItem('guardian-stats') || '{}');
            if (!stats[site]) stats[site] = {};
            if (!stats[site][method]) stats[site][method] = 0;
            stats[site][method]++;
            localStorage.setItem('guardian-stats', JSON.stringify(stats));
        }
        
        handleMessage(message) {
            if (!message || !message.type) return;
            
            switch (message.type) {
                case 'INJECT_PROMPT':
                    this.injectPrompt(message.prompt, window.location.hostname);
                    break;
                    
                case 'HEALTH_CHECK':
                    this.performHealthCheck();
                    break;
                    
                case 'EXTRACT_CONTENT':
                    this.extractContent();
                    break;
                    
                case 'GET_STATS':
                    this.sendStats();
                    break;
            }
        }
        
        performHealthCheck() {
            const health = {
                timestamp: Date.now(),
                url: window.location.href,
                hostname: window.location.hostname,
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit,
                    usagePercent: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(2)
                } : null,
                timing: performance.timing ? {
                    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                    domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
                } : null,
                guardian: {
                    channelsActive: this.getActiveChannels(),
                    methodsAvailable: Array.from(this.injectionMethods.keys())
                }
            };
            
            this.sendMessage({ type: 'HEALTH_REPORT', data: health });
        }
        
        getActiveChannels() {
            const channels = [];
            if (this.broadcastChannel) channels.push('broadcast');
            if (this.sharedWorker) channels.push('sharedworker');
            if (this.peerConnection) channels.push('webrtc');
            channels.push('localstorage', 'postmessage');
            return channels;
        }
        
        extractContent() {
            const content = {
                timestamp: Date.now(),
                url: window.location.href,
                prompts: [],
                responses: []
            };
            
            // Try to extract chat content
            const messageSelectors = [
                '.message', '.chat-message', '.conversation-turn',
                '[data-message]', '[role="article"]', '.prose'
            ];
            
            messageSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    const text = el.textContent.trim();
                    if (text) {
                        content.responses.push(text);
                    }
                });
            });
            
            this.sendMessage({ type: 'CONTENT_EXTRACTED', data: content });
        }
        
        sendStats() {
            const stats = JSON.parse(localStorage.getItem('guardian-stats') || '{}');
            this.sendMessage({ type: 'STATS_REPORT', data: stats });
        }
        
        sendMessage(message) {
            // Send through all available channels
            if (this.broadcastChannel) {
                try {
                    this.broadcastChannel.postMessage(message);
                } catch (e) {}
            }
            
            if (this.sharedWorker) {
                try {
                    this.sharedWorker.port.postMessage(message);
                } catch (e) {}
            }
            
            if (this.peerConnection && this.dataChannel && this.dataChannel.readyState === 'open') {
                try {
                    this.dataChannel.send(JSON.stringify(message));
                } catch (e) {}
            }
            
            // LocalStorage fallback
            localStorage.setItem('guardian-response', JSON.stringify(message));
            localStorage.setItem('guardian-response-id', Date.now().toString());
            
            // PostMessage to opener
            if (window.opener) {
                window.opener.postMessage({ ...message, source: 'guardian' }, '*');
            }
        }
        
        showActiveIndicator() {
            // Create visual indicator
            const indicator = document.createElement('div');
            indicator.id = 'guardian-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                z-index: 2147483647;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                cursor: pointer;
                transition: all 0.3s ease;
                animation: guardianPulse 2s infinite;
            `;
            indicator.textContent = '🛡️ Guardian Active';
            
            // Add animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes guardianPulse {
                    0%, 100% { 
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% { 
                        opacity: 0.8;
                        transform: scale(0.95);
                    }
                }
                
                #guardian-indicator:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
                }
                
                #guardian-indicator.processing {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    animation: guardianProcessing 1s infinite;
                }
                
                #guardian-indicator.success {
                    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                }
                
                #guardian-indicator.error {
                    background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
                }
                
                @keyframes guardianProcessing {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
            
            // Add click handler
            indicator.addEventListener('click', () => {
                const prompt = localStorage.getItem('guardian-prompt');
                if (prompt) {
                    this.injectPrompt(prompt, window.location.hostname);
                } else {
                    alert('No prompt found. Please save a prompt in the AI Hub first.');
                }
            });
            
            document.body.appendChild(indicator);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (indicator.className === '') {
                    indicator.style.opacity = '0.5';
                    indicator.style.transform = 'translateX(80%)';
                }
            }, 5000);
            
            // Remove after 30 seconds unless actively used
            setTimeout(() => {
                if (indicator.className === '') {
                    indicator.remove();
                }
            }, 30000);
        }
        
        updateIndicator(text, status = '') {
            const indicator = document.getElementById('guardian-indicator');
            if (indicator) {
                indicator.textContent = '🛡️ ' + text;
                indicator.className = status;
                
                // Reset auto-hide for activity
                indicator.style.opacity = '1';
                indicator.style.transform = 'translateX(0)';
            }
        }
    }

    // Initialize and expose globally
    window.GuardianOrchestrator = new GuardianOrchestrator();
    
    // Auto-inject if prompt exists
    const savedPrompt = localStorage.getItem('guardian-prompt');
    if (savedPrompt) {
        setTimeout(() => {
            window.GuardianOrchestrator.injectPrompt(savedPrompt, window.location.hostname);
        }, 1000);
    }
})();
