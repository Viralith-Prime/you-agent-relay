// Guardian Communication Channels Module
export class CommunicationChannels {
    constructor(guardian) {
        this.guardian = guardian;
        this.channels = new Map();
        this.broadcastChannel = null;
        this.messageHandlers = new Map();
    }

    async init() {
        this.setupChannels();
        this.setupMessageHandlers();
        console.log('✅ Guardian Communication Channels initialized');
    }

    setupChannels() {
        // BroadcastChannel for cross-tab communication
        if ('BroadcastChannel' in window) {
            try {
                this.broadcastChannel = new BroadcastChannel('guardian-relay');
                this.broadcastChannel.onmessage = (event) => this.handleBroadcast(event);
                this.channels.set('broadcast', this.broadcastChannel);
            } catch (error) {
                console.warn('BroadcastChannel setup failed:', error);
            }
        }

        // LocalStorage events for cross-origin communication
        window.addEventListener('storage', (event) => this.handleStorageEvent(event));
        this.channels.set('storage', 'active');

        // PostMessage for iframe/window communication
        window.addEventListener('message', (event) => this.handlePostMessage(event));
        this.channels.set('postMessage', 'active');

        // Service Worker messaging
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.addEventListener('message', (event) => this.handleServiceWorkerMessage(event));
            this.channels.set('serviceWorker', 'active');
        }

        // SharedWorker messaging (handled in guardian-core)
        if (this.guardian.sharedWorker) {
            this.channels.set('sharedWorker', 'active');
        }

        // WebRTC DataChannel (for P2P between tabs)
        if ('RTCPeerConnection' in window) {
            this.setupWebRTC();
        }

        // Custom event system
        document.addEventListener('guardian-event', (event) => this.handleCustomEvent(event));
        this.channels.set('customEvent', 'active');
    }

    setupMessageHandlers() {
        // Register handlers for different message types
        this.messageHandlers.set('INJECT_PROMPT', this.handleInjectPrompt.bind(this));
        this.messageHandlers.set('SYNC_STATE', this.handleSyncState.bind(this));
        this.messageHandlers.set('INJECTION_RESULT', this.handleInjectionResult.bind(this));
        this.messageHandlers.set('HEALTH_CHECK', this.handleHealthCheck.bind(this));
    }

    // Channel: BroadcastChannel
    handleBroadcast(event) {
        console.log('Guardian Broadcast received:', event.data);
        this.processMessage(event.data, 'broadcast');
    }

    sendBroadcast(message) {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                ...message,
                timestamp: Date.now(),
                source: 'guardian'
            });
        }
    }

    // Channel: LocalStorage
    handleStorageEvent(event) {
        if (event.key === 'guardian-command') {
            try {
                const command = JSON.parse(event.newValue);
                this.processMessage(command, 'storage');
            } catch (error) {
                console.error('Failed to parse storage command:', error);
            }
        }
    }

    sendStorageMessage(message) {
        const key = `guardian-${message.type}-${Date.now()}`;
        localStorage.setItem(key, JSON.stringify(message));
        
        // Clean up after 5 seconds
        setTimeout(() => localStorage.removeItem(key), 5000);
    }

    // Channel: PostMessage
    handlePostMessage(event) {
        // Validate origin if needed
        const trustedOrigins = [
            'https://chatgpt.com',
            'https://claude.ai',
            'https://gemini.google.com',
            'https://copilot.microsoft.com',
            'https://perplexity.ai',
            'https://meta.ai',
            window.location.origin
        ];

        if (trustedOrigins.some(origin => event.origin.startsWith(origin))) {
            if (event.data && event.data.source === 'guardian') {
                this.processMessage(event.data, 'postMessage');
            }
        }
    }

    sendPostMessage(targetWindow, message, targetOrigin = '*') {
        if (targetWindow && targetWindow.postMessage) {
            targetWindow.postMessage({
                ...message,
                source: 'guardian',
                timestamp: Date.now()
            }, targetOrigin);
        }
    }

    // Channel: Service Worker
    handleServiceWorkerMessage(event) {
        console.log('Guardian Service Worker message:', event.data);
        this.processMessage(event.data, 'serviceWorker');
    }

    sendServiceWorkerMessage(message) {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                ...message,
                source: 'guardian'
            });
        }
    }

    // Channel: WebRTC DataChannel
    async setupWebRTC() {
        try {
            this.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            this.dataChannel = this.peerConnection.createDataChannel('guardian');
            this.dataChannel.onopen = () => {
                console.log('Guardian WebRTC channel opened');
                this.channels.set('webrtc', 'active');
            };

            this.dataChannel.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.processMessage(message, 'webrtc');
                } catch (error) {
                    console.error('Failed to parse WebRTC message:', error);
                }
            };
        } catch (error) {
            console.warn('WebRTC setup failed:', error);
        }
    }

    sendWebRTCMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(message));
        }
    }

    // Channel: Custom Events
    handleCustomEvent(event) {
        this.processMessage(event.detail, 'customEvent');
    }

    sendCustomEvent(message) {
        const event = new CustomEvent('guardian-event', {
            detail: message,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }

    // Unified message processor
    processMessage(message, channel) {
        if (!message || !message.type) return;

        console.log(`Guardian processing ${message.type} from ${channel}`);

        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(message, channel);
        } else {
            console.warn(`No handler for message type: ${message.type}`);
        }
    }

    // Message Handlers
    handleInjectPrompt(message, channel) {
        const { prompt, agent, targetUrl } = message;
        
        // Update UI if needed
        if (prompt) {
            document.getElementById('universal-prompt').value = prompt;
        }

        // Notify guardian core
        if (this.guardian.isActive) {
            window.App.modules.ui.showGuardianStatus(
                `📡 Received injection request via ${channel}`,
                'info'
            );
        }
    }

    handleSyncState(message, channel) {
        // Sync state across tabs/windows
        const { state } = message;
        
        if (state.prompt) {
            document.getElementById('universal-prompt').value = state.prompt;
        }

        if (state.favorites) {
            window.App.modules.favorites.state.favorites = state.favorites;
            window.App.modules.favorites.updateUI();
        }
    }

    handleInjectionResult(message, channel) {
        const { success, agent, method, error } = message;
        
        if (success) {
            this.guardian.trackInjection(agent, method, true);
            window.App.modules.ui.showGuardianStatus(
                `✅ Injection successful via ${method}`,
                'success'
            );
        } else {
            window.App.modules.ui.showGuardianStatus(
                `❌ Injection failed: ${error}`,
                'error'
            );
        }
    }

    handleHealthCheck(message, channel) {
        // Respond to health checks
        this.sendChannelMessage(channel, {
            type: 'HEALTH_RESPONSE',
            status: 'healthy',
            activeChannels: Array.from(this.channels.keys()),
            timestamp: Date.now()
        });
    }

    // Send message through specific channel
    sendChannelMessage(channel, message) {
        switch (channel) {
            case 'broadcast':
                this.sendBroadcast(message);
                break;
            case 'storage':
                this.sendStorageMessage(message);
                break;
            case 'serviceWorker':
                this.sendServiceWorkerMessage(message);
                break;
            case 'webrtc':
                this.sendWebRTCMessage(message);
                break;
            case 'customEvent':
                this.sendCustomEvent(message);
                break;
            default:
                console.warn(`Unknown channel: ${channel}`);
        }
    }

    // Broadcast to all channels
    broadcastToAll(message) {
        const enhancedMessage = {
            ...message,
            timestamp: Date.now(),
            source: 'guardian',
            origin: window.location.origin
        };

        // Send through all active channels
        this.channels.forEach((status, channel) => {
            if (status === 'active' || status instanceof BroadcastChannel) {
                this.sendChannelMessage(channel, enhancedMessage);
            }
        });
    }

    // Get active channel count
    getActiveChannelCount() {
        return this.channels.size;
    }

    // Get channel status
    getChannelStatus() {
        const status = {};
        this.channels.forEach((value, key) => {
            status[key] = value === 'active' || value instanceof BroadcastChannel;
        });
        return status;
    }

    // Cleanup
    destroy() {
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
        }

        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.channels.clear();
        this.messageHandlers.clear();
    }
}
