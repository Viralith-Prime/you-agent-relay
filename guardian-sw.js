// Guardian Service Worker - Intercepts and enhances AI site requests
// Version: 1.0.0

const CACHE_NAME = 'guardian-cache-v1';
const GUARDIAN_ASSETS = [
    '/',
    '/index.html',
    '/guardian-orchestrator.js',
    '/guardian-control.html'
];

// Install event - cache essential files
self.addEventListener('install', event => {
    console.log('[Guardian SW] Installing service worker');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Guardian SW] Caching guardian assets');
            return cache.addAll(GUARDIAN_ASSETS);
        }).then(() => {
            self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[Guardian SW] Activating service worker');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
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

// Site health tracking
const siteHealth = new Map();
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const AI_SITES = [
    'chatgpt.com',
    'claude.ai',
    'gemini.google.com',
    'you.com',
    'perplexity.ai',
    'phind.com',
    'huggingface.co',
    'copilot.microsoft.com',
    'meta.ai'
];

// Fetch event - intercept and enhance requests
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Check if this is an AI site request
    if (isAISiteRequest(url)) {
        event.respondWith(handleAISiteRequest(event.request));
        return;
    }
    
    // Check if this is a guardian asset request
    if (isGuardianAsset(url)) {
        event.respondWith(handleGuardianAsset(event.request));
        return;
    }
    
    // For navigation requests to our domain, try network first, then cache
    if (event.request.mode === 'navigate' && url.origin === self.location.origin) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }
    
    // Default - pass through
    event.respondWith(fetch(event.request));
});

// Check if request is for an AI site
function isAISiteRequest(url) {
    return AI_SITES.some(site => url.hostname.includes(site));
}

// Check if request is for guardian assets
function isGuardianAsset(url) {
    return url.origin === self.location.origin && 
           (url.pathname.includes('guardian') || GUARDIAN_ASSETS.includes(url.pathname));
}

// Handle AI site requests with enhancements
async function handleAISiteRequest(request) {
    const url = new URL(request.url);
    const site = AI_SITES.find(s => url.hostname.includes(s));
    
    console.log(`[Guardian SW] Intercepting request to ${site}`);
    
    // Check site health
    const health = await checkSiteHealth(url.origin);
    
    if (health.status === 'down') {
        console.log(`[Guardian SW] ${site} appears to be down`);
        return createErrorResponse(site, health);
    }
    
    // Add performance headers
    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.set('X-Guardian-Enhanced', '1');
    modifiedHeaders.set('X-Guardian-Health', health.status);
    
    // Create modified request
    const modifiedRequest = new Request(request, {
        headers: modifiedHeaders
    });
    
    try {
        // Fetch with timeout
        const response = await fetchWithTimeout(modifiedRequest, 30000);
        
        // If response is HTML, try to inject guardian script
        if (response.headers.get('content-type')?.includes('text/html')) {
            return injectGuardianScript(response, site);
        }
        
        return response;
    } catch (error) {
        console.error(`[Guardian SW] Error fetching ${site}:`, error);
        return createErrorResponse(site, { status: 'error', error: error.message });
    }
}

// Fetch with timeout
function fetchWithTimeout(request, timeout = 30000) {
    return Promise.race([
        fetch(request),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

// Check site health
async function checkSiteHealth(origin) {
    // Check cache first
    const cached = siteHealth.get(origin);
    if (cached && Date.now() - cached.timestamp < HEALTH_CHECK_INTERVAL) {
        return cached;
    }
    
    const startTime = Date.now();
    
    try {
        // Try to fetch favicon as health check
        const response = await fetchWithTimeout(
            new Request(origin + '/favicon.ico', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache'
            }), 
            5000
        );
        
        const loadTime = Date.now() - startTime;
        const status = loadTime < 1000 ? 'healthy' : loadTime < 3000 ? 'degraded' : 'slow';
        
        const health = {
            status,
            loadTime,
            timestamp: Date.now()
        };
        
        siteHealth.set(origin, health);
        return health;
    } catch (error) {
        const health = {
            status: 'down',
            error: error.message,
            timestamp: Date.now()
        };
        
        siteHealth.set(origin, health);
        return health;
    }
}

// Inject Guardian script into HTML responses
async function injectGuardianScript(response, site) {
    try {
        const html = await response.text();
        
        // Check if guardian is already injected
        if (html.includes('GuardianOrchestrator')) {
            return new Response(html, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });
        }
        
        // Inject guardian script before </body>
        const injectionScript = `
            <!-- Guardian Auto-Injection -->
            <script>
                console.log('[Guardian] Auto-injecting Guardian Orchestrator via Service Worker');
                if (!window.GuardianOrchestrator) {
                    const script = document.createElement('script');
                    script.src = '${self.location.origin}/guardian-orchestrator.js';
                    script.onload = function() {
                        console.log('[Guardian] Orchestrator loaded successfully');
                        // Auto-inject saved prompt if available
                        const prompt = localStorage.getItem('guardian-prompt');
                        if (prompt && window.GuardianOrchestrator) {
                            setTimeout(() => {
                                window.GuardianOrchestrator.injectPrompt(prompt, '${site}');
                            }, 2000);
                        }
                    };
                    document.head.appendChild(script);
                }
            </script>
        `;
        
        const modifiedHtml = html.replace('</body>', injectionScript + '</body>');
        
        return new Response(modifiedHtml, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
        });
    } catch (error) {
        console.error('[Guardian SW] Failed to inject script:', error);
        return response;
    }
}

// Create error response for down sites
function createErrorResponse(site, health) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${site} - Guardian Protection</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #0a0a0a;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    max-width: 600px;
                    text-align: center;
                }
                .icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                h1 {
                    font-size: 32px;
                    margin-bottom: 16px;
                }
                p {
                    font-size: 18px;
                    color: #aaa;
                    margin-bottom: 32px;
                    line-height: 1.6;
                }
                .alternatives {
                    background: #1a1a1a;
                    border-radius: 12px;
                    padding: 24px;
                    margin-bottom: 24px;
                }
                .alternatives h2 {
                    font-size: 20px;
                    margin-bottom: 16px;
                }
                .alt-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 12px;
                    margin-top: 16px;
                }
                .alt-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    text-decoration: none;
                    display: block;
                    transition: transform 0.2s;
                }
                .alt-btn:hover {
                    transform: translateY(-2px);
                }
                .actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                .btn {
                    background: #2a2a2a;
                    color: white;
                    border: 1px solid #444;
                    padding: 12px 24px;
                    border-radius: 8px;
                    text-decoration: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn:hover {
                    background: #333;
                    border-color: #667eea;
                }
                .status {
                    background: #1a1a1a;
                    border-radius: 8px;
                    padding: 16px;
                    margin-top: 24px;
                    font-family: monospace;
                    font-size: 14px;
                    color: #888;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">🛡️</div>
                <h1>${site} is Currently Unavailable</h1>
                <p>Guardian Protection detected that ${site} is not responding properly. 
                   Don't worry - your prompt is saved and we have alternatives ready!</p>
                
                <div class="alternatives">
                    <h2>Try These Alternatives:</h2>
                    <div class="alt-grid">
                        ${getAlternatives(site).map(alt => `
                            <a href="${alt.url}" class="alt-btn">${alt.icon} ${alt.name}</a>
                        `).join('')}
                    </div>
                </div>
                
                <div class="actions">
                    <button class="btn" onclick="location.reload()">🔄 Try Again</button>
                    <a href="${self.location.origin}" class="btn">🏠 Back to Hub</a>
                </div>
                
                <div class="status">
                    Status: ${health.status}<br>
                    ${health.error ? `Error: ${health.error}<br>` : ''}
                    Checked: ${new Date().toLocaleTimeString()}
                </div>
            </div>
            
            <script>
                // Auto-retry after 10 seconds
                setTimeout(() => {
                    console.log('Auto-retrying...');
                    location.reload();
                }, 10000);
                
                // Copy saved prompt on alternative click
                document.querySelectorAll('.alt-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const prompt = localStorage.getItem('guardian-prompt');
                        if (prompt) {
                            navigator.clipboard.writeText(prompt);
                        }
                    });
                });
            </script>
        </body>
        </html>
    `;
    
    return new Response(html, {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Guardian-Protection': 'active'
        }
    });
}

// Get alternatives for a site
function getAlternatives(site) {
    const alternatives = {
        'chatgpt.com': [
            { name: 'Claude', icon: '🧠', url: 'https://claude.ai' },
            { name: 'Gemini', icon: '✨', url: 'https://gemini.google.com' },
            { name: 'Copilot', icon: '🎯', url: 'https://copilot.microsoft.com' }
        ],
        'claude.ai': [
            { name: 'ChatGPT', icon: '🤖', url: 'https://chatgpt.com' },
            { name: 'Gemini', icon: '✨', url: 'https://gemini.google.com' },
            { name: 'You.com', icon: '🔬', url: 'https://you.com' }
        ],
        'you.com': [
            { name: 'Perplexity', icon: '🔍', url: 'https://perplexity.ai' },
            { name: 'Phind', icon: '👨‍💻', url: 'https://phind.com' },
            { name: 'ChatGPT', icon: '🤖', url: 'https://chatgpt.com' }
        ],
        'gemini.google.com': [
            { name: 'ChatGPT', icon: '🤖', url: 'https://chatgpt.com' },
            { name: 'Claude', icon: '🧠', url: 'https://claude.ai' },
            { name: 'Perplexity', icon: '🔍', url: 'https://perplexity.ai' }
        ]
    };
    
    return alternatives[site] || [
        { name: 'ChatGPT', icon: '🤖', url: 'https://chatgpt.com' },
        { name: 'Claude', icon: '🧠', url: 'https://claude.ai' },
        { name: 'Perplexity', icon: '🔍', url: 'https://perplexity.ai' }
    ];
}

// Handle guardian asset requests
async function handleGuardianAsset(request) {
    // Try cache first
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }
    
    // Fetch from network
    try {
        const response = await fetch(request);
        
        // Cache successful responses
        if (response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('[Guardian SW] Failed to fetch guardian asset:', error);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return createOfflinePage();
        }
        
        throw error;
    }
}

// Create offline page
function createOfflinePage() {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Guardian - Offline</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #f5f5f5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    max-width: 400px;
                    text-align: center;
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                .icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                h1 {
                    font-size: 24px;
                    margin-bottom: 16px;
                }
                p {
                    color: #666;
                    margin-bottom: 24px;
                }
                .btn {
                    background: #1976d2;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .btn:hover {
                    background: #1565c0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">📡</div>
                <h1>You're Offline</h1>
                <p>Guardian Hub requires an internet connection to launch AI agents.</p>
                <button class="btn" onclick="location.reload()">Try Again</button>
            </div>
        </body>
        </html>
    `;
    
    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    });
}

// Message handling
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'ENHANCE_SITE') {
        console.log('[Guardian SW] Received enhance site request:', event.data);
        
        // Store enhancement request for next fetch
        const enhancements = {
            url: event.data.url,
            prompt: event.data.prompt,
            timestamp: Date.now()
        };
        
        // In real implementation, this would be used to enhance the next request
        console.log('[Guardian SW] Enhancement stored:', enhancements);
    }
});

// Periodic health checks
setInterval(() => {
    console.log('[Guardian SW] Running periodic health checks');
    
    AI_SITES.forEach(site => {
        checkSiteHealth(`https://${site}`).then(health => {
            if (health.status !== 'healthy') {
                console.log(`[Guardian SW] ${site} health: ${health.status}`);
            }
        });
    });
}, 300000); // Every 5 minutes

console.log('[Guardian SW] Service Worker loaded successfully');
