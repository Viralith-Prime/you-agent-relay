// Guardian Service Worker
const CACHE_NAME = 'guardian-v1';
const GUARDIAN_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/main.css',
    '/css/themes.css',
    '/css/components.css',
    '/js/app.js',
    '/js/agents.js',
    '/js/device-manager.js',
    '/js/favorites.js',
    '/js/history.js',
    '/js/ui-controller.js',
    '/js/search.js',
    '/guardian/guardian-core.js',
    '/guardian/injection-methods.js',
    '/guardian/channels.js'
];

// AI Site patterns to intercept
const AI_SITES = [
    'chatgpt.com',
    'claude.ai',
    'gemini.google.com',
    'copilot.microsoft.com',
    'perplexity.ai',
    'meta.ai',
    'huggingface.co/chat',
    'phind.com',
    'poe.com',
    'you.com'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[Guardian SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Guardian SW] Caching app assets');
            return cache.addAll(GUARDIAN_ASSETS);
        }).then(() => {
            self.skipWaiting();
        })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[Guardian SW] Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Guardian SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Check if this is an AI site request
    const isAISite = AI_SITES.some(site => url.hostname.includes(site));
    
    if (isAISite) {
        // Handle AI site requests specially
        handleAISiteRequest(event);
    } else if (url.origin === self.location.origin) {
        // Handle app requests
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) {
                    return response;
                }
                
                return fetch(event.request).then((response) => {
                    // Cache successful responses
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    
                    return response;
                });
            }).catch(() => {
                // Offline fallback
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
        );
    }
});

// Handle AI site requests
function handleAISiteRequest(event) {
    // Don't actually intercept the request, but notify the app
    event.respondWith(
        fetch(event.request).then((response) => {
            // Notify all clients about AI site visit
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'AI_SITE_DETECTED',
                        url: event.request.url,
                        timestamp: Date.now()
                    });
                });
            });
            
            return response;
        })
    );
}

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
    console.log('[Guardian SW] Message received:', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'INJECT_PROMPT':
            handlePromptInjection(event.data);
            break;
            
        case 'SYNC_STATE':
            syncStateAcrossClients(event.data);
            break;
            
        case 'HEALTH_CHECK':
            event.ports[0].postMessage({
                type: 'HEALTH_RESPONSE',
                status: 'healthy',
                version: CACHE_NAME
            });
            break;
            
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
    }
});

// Handle prompt injection requests
async function handlePromptInjection(data) {
    const { prompt, targetUrl } = data;
    
    // Get all clients
    const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window'
    });
    
    // Find target AI site tabs
    const targetClients = clients.filter(client => 
        AI_SITES.some(site => client.url.includes(site))
    );
    
    // Send injection command to target tabs
    targetClients.forEach(client => {
        client.postMessage({
            type: 'EXECUTE_INJECTION',
            prompt: prompt,
            source: 'guardian-sw'
        });
    });
    
    // Also broadcast to all Guardian tabs
    const guardianClients = clients.filter(client => 
        client.url.includes(self.location.origin)
    );
    
    guardianClients.forEach(client => {
        client.postMessage({
            type: 'INJECTION_INITIATED',
            targetCount: targetClients.length,
            prompt: prompt
        });
    });
}

// Sync state across all clients
async function syncStateAcrossClients(data) {
    const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window'
    });
    
    clients.forEach(client => {
        if (client.id !== data.senderId) {
            client.postMessage({
                type: 'STATE_SYNC',
                state: data.state
            });
        }
    });
}

// Push notification support
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body || 'New AI prompt ready!',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            tag: 'guardian-notification',
            data: data,
            actions: [
                { action: 'open', title: 'Open Hub' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification('Guardian AI Hub', options)
        );
    }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Background sync for offline prompt saving
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-prompts') {
        event.waitUntil(syncPrompts());
    }
});

async function syncPrompts() {
    // Get stored offline prompts
    const cache = await caches.open('guardian-offline');
    const requests = await cache.keys();
    
    for (const request of requests) {
        if (request.url.includes('/api/prompts')) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                }
            } catch (error) {
                console.error('[Guardian SW] Sync failed:', error);
            }
        }
    }
}

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-updates') {
        event.waitUntil(checkForUpdates());
    }
});

async function checkForUpdates() {
    // Check for app updates
    const response = await fetch('/version.json');
    const data = await response.json();
    
    // Notify clients if update available
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'UPDATE_AVAILABLE',
            version: data.version
        });
    });
}

console.log('[Guardian SW] Service Worker loaded');
