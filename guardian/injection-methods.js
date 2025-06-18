// Guardian Injection Methods Module
export class InjectionMethods {
    constructor(guardian) {
        this.guardian = guardian;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    async init() {
        console.log('✅ Guardian Injection Methods initialized');
    }

    // iOS Safari specific method
    async iosClipboard(agent, prompt) {
        if (!prompt) return false;
        
        try {
            // Haptic feedback
            if ('vibrate' in navigator) {
                navigator.vibrate(10);
            }
            
            // Copy to clipboard
            await navigator.clipboard.writeText(prompt);
            
            // iOS specific: Also try to use share sheet as backup
            if (navigator.share) {
                setTimeout(() => {
                    navigator.share({
                        text: prompt,
                        url: agent.url
                    }).catch(() => {});
                }, 500);
            }
            
            // Open agent
            window.open(agent.url, '_blank');
            
            return true;
        } catch (error) {
            console.error('iOS clipboard injection failed:', error);
            return false;
        }
    }

    // iOS Shortcuts integration
    async iosShortcuts(agent, prompt) {
        try {
            // Create shortcuts URL scheme
            const shortcutUrl = `shortcuts://run-shortcut?name=AI%20Inject&input=${encodeURIComponent(prompt)}`;
            window.location = shortcutUrl;
            
            // Open agent after delay
            setTimeout(() => {
                window.open(agent.url, '_blank');
            }, 1000);
            
            return true;
        } catch (error) {
            console.error('iOS shortcuts injection failed:', error);
            return false;
        }
    }

    // Android Chrome intent
    async androidIntent(agent, prompt) {
        try {
            const intentUrl = `intent://${new URL(agent.url).hostname}/#Intent;` +
                `scheme=https;` +
                `package=com.android.chrome;` +
                `S.prompt=${encodeURIComponent(prompt)};` +
                `end`;
            
            window.location = intentUrl;
            return true;
        } catch (error) {
            console.error('Android intent injection failed:', error);
            return false;
        }
    }

    // Android notification channel
    async androidNotification(agent, prompt) {
        try {
            if (!('Notification' in window)) return false;
            
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return false;
            
            // Store prompt for background access
            localStorage.setItem('guardian-notification-prompt', prompt);
            
            new Notification('AI Prompt Ready', {
                body: 'Tap to inject into ' + agent.name,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-72.png',
                tag: 'ai-injection',
                data: { url: agent.url, prompt: prompt }
            });
            
            // Also open the site
            window.open(agent.url, '_blank');
            
            return true;
        } catch (error) {
            console.error('Android notification injection failed:', error);
            return false;
        }
    }

    // Universal Method 1: DOM Injection
    async domInject(agent, prompt) {
        if (!prompt) return false;
        
        // Store prompt for injection
        localStorage.setItem('guardian-inject-prompt', prompt);
        localStorage.setItem('guardian-inject-site', agent.url);
        
        // Open agent in new tab
        const agentWindow = window.open(agent.url, '_blank');
        
        // Try to inject via postMessage after delay
        setTimeout(() => {
            try {
                agentWindow.postMessage({
                    type: 'GUARDIAN_INJECT',
                    prompt: prompt,
                    source: 'guardian-dom'
                }, agent.url);
            } catch (e) {
                console.warn('PostMessage failed:', e);
            }
        }, 3000);
        
        return true;
    }

    // Universal Method 2: React Fiber Manipulation
    async reactFiber(agent, prompt) {
        // This method requires the Guardian extension/bookmarklet on the target page
        localStorage.setItem('guardian-react-prompt', prompt);
        
        // Signal to extension/bookmarklet
        window.postMessage({
            type: 'GUARDIAN_REACT_INJECT',
            prompt: prompt,
            agent: agent.name
        }, '*');
        
        window.open(agent.url, '_blank');
        return true;
    }

    // Universal Method 3: Clipboard API
    async clipboardAPI(agent, prompt) {
        if (!prompt) return false;
        
        try {
            // Modern clipboard API
            await navigator.clipboard.writeText(prompt);
            
            // Also try to use clipboard events
            const clipboardEvent = new ClipboardEvent('copy', {
                clipboardData: new DataTransfer(),
                dataType: 'text/plain',
                data: prompt
            });
            
            document.dispatchEvent(clipboardEvent);
            
            window.open(agent.url, '_blank');
            return true;
        } catch (error) {
            console.error('Clipboard API injection failed:', error);
            return false;
        }
    }

    // Universal Method 4: Event Simulation
    async eventSimulation(agent, prompt) {
        // Store prompt for event-based injection
        sessionStorage.setItem('guardian-event-prompt', prompt);
        
        // Create custom event
        const event = new CustomEvent('guardian-inject', {
            detail: { prompt: prompt, agent: agent.name }
        });
        
        document.dispatchEvent(event);
        window.open(agent.url, '_blank');
        
        return true;
    }

    // Universal Method 5: ExecCommand (Legacy)
    async execCommand(agent, prompt) {
        if (!prompt) return false;
        
        try {
            // Create temporary textarea
            const textarea = document.createElement('textarea');
            textarea.value = prompt;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            
            // Select and copy
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            // Store in multiple places
            localStorage.setItem('guardian-exec-prompt', prompt);
            
            window.open(agent.url, '_blank');
            return true;
        } catch (error) {
            console.error('ExecCommand injection failed:', error);
            return false;
        }
    }

    // Universal Method 6: Mutation Observer
    async mutationObserver(agent, prompt) {
        // This sets up a system for the extension/bookmarklet to use
        const config = {
            prompt: prompt,
            agent: agent.name,
            url: agent.url,
            timestamp: Date.now()
        };
        
        localStorage.setItem('guardian-mutation-config', JSON.stringify(config));
        
        window.open(agent.url, '_blank');
        return true;
    }

    // Universal Method 7: Framework Detection
    async frameworkDetect(agent, prompt) {
        // Store framework-specific injection data
        const frameworkData = {
            prompt: prompt,
            agent: agent.name,
            vue: { key: '__vue_inject__', data: prompt },
            angular: { key: '__ng_inject__', data: prompt },
            react: { key: '__react_inject__', data: prompt }
        };
        
        localStorage.setItem('guardian-framework-data', JSON.stringify(frameworkData));
        
        window.open(agent.url, '_blank');
        return true;
    }

    // Helper method to retry injections
    async retryWithDelay(method, agent, prompt, attempt = 1) {
        try {
            const result = await method.call(this, agent, prompt);
            if (result) return true;
            
            if (attempt < this.retryAttempts) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.retryWithDelay(method, agent, prompt, attempt + 1);
            }
            
            return false;
        } catch (error) {
            console.error(`Injection attempt ${attempt} failed:`, error);
            
            if (attempt < this.retryAttempts) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.retryWithDelay(method, agent, prompt, attempt + 1);
            }
            
            return false;
        }
    }
}
