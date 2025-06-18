// Guardian SharedWorker - Persistent connection between all guardian tabs
// Enables cross-tab communication even across different origins

let connections = new Map();
let guardianState = {
    prompt: '',
    targetSite: '',
    activeChannels: new Set(),
    injectionStats: new Map(),
    connectedPorts: 0
};

// SharedWorker connect event
self.addEventListener('connect', function(event) {
    const port = event.ports[0];
    const connectionId = Date.now() + '_' + Math.random();
    
    console.log('[Guardian Worker] New connection established:', connectionId);
    
    // Store connection
    connections.set(connectionId, {
        port: port,
        connected: new Date().toISOString(),
        lastActivity: Date.now()
    });
    
    guardianState.connectedPorts = connections.size;
    
    // Set up message handler for this port
    port.addEventListener('message', function(event) {
        handleMessage(event.data, port, connectionId);
    });
    
    // Start the port
    port.start();
    
    // Send welcome message with current state
    port.postMessage({
        type: 'WORKER_CONNECTED',
        connectionId: connectionId,
        state: getSerializableState()
    });
    
    // Notify all other connections
    broadcastToOthers({
        type: 'NEW_CONNECTION',
        connectionId: connectionId,
        totalConnections: connections.size
    }, connectionId);
});

// Handle messages from connected ports
function handleMessage(message, senderPort, senderId) {
    if (!message || !message.type) return;
    
    console.log('[Guardian Worker] Received message:', message.type, 'from', senderId);
    
    // Update last activity
    const connection = connections.get(senderId);
    if (connection) {
        connection.lastActivity = Date.now();
    }
    
    switch (message.type) {
        case 'UPDATE_PROMPT':
            guardianState.prompt = message.prompt;
            guardianState.targetSite = message.targetSite || '';
            
            // Broadcast to all connections
            broadcast({
                type: 'PROMPT_UPDATED',
                prompt: message.prompt,
                targetSite: guardianState.targetSite,
                timestamp: Date.now()
            });
            break;
            
        case 'INJECT_COMMAND':
            // Relay injection command to all tabs
            broadcast({
                type: 'INJECT_PROMPT',
                prompt: message.prompt || guardianState.prompt,
                targetSite: message.targetSite,
                method: message.method,
                timestamp: Date.now()
            });
            break;
            
        case 'INJECTION_RESULT':
            // Track injection results
            const site = message.site || 'unknown';
            if (!guardianState.injectionStats.has(site)) {
                guardianState.injectionStats.set(site, {
                    attempts: 0,
                    successes: 0,
                    failures: 0,
                    methods: new Map()
                });
            }
            
            const stats = guardianState.injectionStats.get(site);
            stats.attempts++;
            
            if (message.success) {
                stats.successes++;
                
                // Track successful methods
                const methodStats = stats.methods.get(message.method) || { successes: 0, failures: 0 };
                methodStats.successes++;
                stats.methods.set(message.method, methodStats);
            } else {
                stats.failures++;
                
                // Track failed methods
                if (message.failedMethods) {
                    message.failedMethods.forEach(method => {
                        const methodStats = stats.methods.get(method) || { successes: 0, failures: 0 };
                        methodStats.failures++;
                        stats.methods.set(method, methodStats);
                    });
                }
            }
            
            // Broadcast updated stats
            broadcast({
                type: 'STATS_UPDATED',
                stats: getSerializableStats(),
                timestamp: Date.now()
            });
            break;
            
        case 'CHANNEL_STATUS':
            // Update channel status
            if (message.channel && message.active !== undefined) {
                if (message.active) {
                    guardianState.activeChannels.add(message.channel);
                } else {
                    guardianState.activeChannels.delete(message.channel);
                }
                
                // Broadcast channel update
                broadcast({
                    type: 'CHANNELS_UPDATED',
                    activeChannels: Array.from(guardianState.activeChannels),
                    timestamp: Date.now()
                });
            }
            break;
            
        case 'GET_STATE':
            // Send current state to requesting connection
            senderPort.postMessage({
                type: 'STATE_RESPONSE',
                state: getSerializableState(),
                timestamp: Date.now()
            });
            break;
            
        case 'BROADCAST':
            // Allow connections to broadcast custom messages
            broadcast({
                ...message.data,
                _source: senderId,
                _broadcast: true
            });
            break;
            
        case 'HEALTH_CHECK':
            // Respond with worker health
            senderPort.postMessage({
                type: 'HEALTH_RESPONSE',
                healthy: true,
                connections: connections.size,
                uptime: process.uptime ? process.uptime() : 'N/A',
                memory: getMemoryUsage(),
                timestamp: Date.now()
            });
            break;
            
        case 'CLEANUP':
            // Clean up inactive connections
            cleanupConnections();
            break;
            
        case 'DISCONNECT':
            // Handle explicit disconnection
            connections.delete(senderId);
            guardianState.connectedPorts = connections.size;
            
            // Notify others
            broadcastToOthers({
                type: 'CONNECTION_CLOSED',
                connectionId: senderId,
                totalConnections: connections.size
            }, senderId);
            break;
            
        case 'SYNC_REQUEST':
            // Sync request from a new tab/window
            handleSyncRequest(message, senderPort, senderId);
            break;
            
        case 'RELAY_TO_SITE':
            // Relay message to specific site tabs
            relayToSite(message.targetSite, message.data);
            break;
    }
}

// Broadcast message to all connected ports
function broadcast(message) {
    connections.forEach((connection, id) => {
        try {
            connection.port.postMessage(message);
        } catch (error) {
            console.error('[Guardian Worker] Failed to send to', id, error);
            // Remove dead connections
            connections.delete(id);
        }
    });
    
    guardianState.connectedPorts = connections.size;
}

// Broadcast to all except sender
function broadcastToOthers(message, excludeId) {
    connections.forEach((connection, id) => {
        if (id !== excludeId) {
            try {
                connection.port.postMessage(message);
            } catch (error) {
                console.error('[Guardian Worker] Failed to send to', id, error);
                connections.delete(id);
            }
        }
    });
}

// Relay message to tabs on specific site
function relayToSite(targetSite, data) {
    connections.forEach((connection, id) => {
        try {
            // Each connection should identify its site
            connection.port.postMessage({
                type: 'SITE_RELAY',
                targetSite: targetSite,
                data: data,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('[Guardian Worker] Failed to relay to', id, error);
            connections.delete(id);
        }
    });
}

// Handle sync requests
function handleSyncRequest(message, senderPort, senderId) {
    const syncData = {
        type: 'SYNC_RESPONSE',
        prompt: guardianState.prompt,
        targetSite: guardianState.targetSite,
        activeChannels: Array.from(guardianState.activeChannels),
        stats: getSerializableStats(),
        connections: connections.size,
        timestamp: Date.now()
    };
    
    // Send sync data to requester
    senderPort.postMessage(syncData);
    
    // If this is a site requesting sync, notify control panels
    if (message.fromSite) {
        broadcastToOthers({
            type: 'SITE_CONNECTED',
            site: message.fromSite,
            connectionId: senderId,
            timestamp: Date.now()
        }, senderId);
    }
}

// Get serializable state
function getSerializableState() {
    return {
        prompt: guardianState.prompt,
        targetSite: guardianState.targetSite,
        activeChannels: Array.from(guardianState.activeChannels),
        connectedPorts: guardianState.connectedPorts,
        stats: getSerializableStats()
    };
}

// Get serializable stats
function getSerializableStats() {
    const stats = {};
    
    guardianState.injectionStats.forEach((siteStats, site) => {
        stats[site] = {
            attempts: siteStats.attempts,
            successes: siteStats.successes,
            failures: siteStats.failures,
            successRate: siteStats.attempts > 0 
                ? Math.round((siteStats.successes / siteStats.attempts) * 100) 
                : 0,
            methods: {}
        };
        
        siteStats.methods.forEach((methodStats, method) => {
            stats[site].methods[method] = {
                successes: methodStats.successes,
                failures: methodStats.failures,
                successRate: (methodStats.successes + methodStats.failures) > 0
                    ? Math.round((methodStats.successes / (methodStats.successes + methodStats.failures)) * 100)
                    : 0
            };
        });
    });
    
    return stats;
}

// Get memory usage if available
function getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
        return {
            usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
            jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        };
    }
    return null;
}

// Clean up inactive connections
function cleanupConnections() {
    const now = Date.now();
    const timeout = 300000; // 5 minutes
    const toRemove = [];
    
    connections.forEach((connection, id) => {
        if (now - connection.lastActivity > timeout) {
            toRemove.push(id);
        }
    });
    
    toRemove.forEach(id => {
        console.log('[Guardian Worker] Removing inactive connection:', id);
        connections.delete(id);
    });
    
    if (toRemove.length > 0) {
        guardianState.connectedPorts = connections.size;
        
        // Notify remaining connections
        broadcast({
            type: 'CONNECTIONS_CLEANED',
            removed: toRemove.length,
            remaining: connections.size,
            timestamp: Date.now()
        });
    }
}

// Periodic cleanup
setInterval(() => {
    cleanupConnections();
}, 60000); // Every minute

// Handle errors
self.addEventListener('error', function(event) {
    console.error('[Guardian Worker] Error:', event.error);
    
    // Notify all connections about error
    broadcast({
        type: 'WORKER_ERROR',
        error: event.error.message,
        timestamp: Date.now()
    });
});

// Log worker start
console.log('[Guardian Worker] SharedWorker started successfully');

// Worker state persistence (if available in some environments)
if (typeof self.skipWaiting === 'function') {
    self.skipWaiting();
}

// Example usage from main app or orchestrator:
/*
// Connect to SharedWorker
const worker = new SharedWorker('/guardian-worker.js');

// Handle messages
worker.port.onmessage = function(event) {
    console.log('Received from worker:', event.data);
};

// Start the port
worker.port.start();

// Send messages
worker.port.postMessage({
    type: 'UPDATE_PROMPT',
    prompt: 'My prompt text',
    targetSite: 'chatgpt.com'
});

// Request injection
worker.port.postMessage({
    type: 'INJECT_COMMAND',
    targetSite: 'claude.ai',
    method: 'dom'
});

// Get current state
worker.port.postMessage({
    type: 'GET_STATE'
});

// Broadcast to all tabs
worker.port.postMessage({
    type: 'BROADCAST',
    data: {
        type: 'CUSTOM_EVENT',
        message: 'Hello all tabs!'
    }
});
*/
