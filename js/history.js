// History Manager Module
export class HistoryManager {
    constructor(appState) {
        this.state = appState;
        this.storageKey = 'prompt-history';
        this.maxItems = 50;
    }

    async init() {
        this.state.promptHistory = this.getAll();
        console.log('✅ History Manager initialized');
    }

    getAll() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state.promptHistory));
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }

    add(prompt, agentName) {
        if (!prompt.trim()) return;
        
        const newEntry = {
            id: Date.now(),
            prompt: prompt,
            agent: agentName || 'Not launched',
            timestamp: new Date().toISOString(),
            uses: 1
        };
        
        // Check if prompt already exists
        const existingIndex = this.state.promptHistory.findIndex(h => h.prompt === prompt);
        
        if (existingIndex !== -1) {
            // Update existing entry
            const existing = this.state.promptHistory[existingIndex];
            existing.uses++;
            existing.timestamp = new Date().toISOString();
            existing.agent = agentName || existing.agent;
            
            // Move to top
            this.state.promptHistory.splice(existingIndex, 1);
            this.state.promptHistory.unshift(existing);
        } else {
            // Add new entry
            this.state.promptHistory.unshift(newEntry);
        }
        
        // Limit history size
        if (this.state.promptHistory.length > this.maxItems) {
            this.state.promptHistory.length = this.maxItems;
        }
        
        this.save();
        this.render();
    }

    delete(id) {
        const index = this.state.promptHistory.findIndex(h => h.id === id);
        if (index > -1) {
            this.state.promptHistory.splice(index, 1);
            this.save();
            this.render();
            window.App.modules.ui.showNotification('🗑️ Removed from history');
        }
    }

    use(id) {
        const item = this.state.promptHistory.find(h => h.id === id);
        if (item) {
            document.getElementById('universal-prompt').value = item.prompt;
            window.App.savePrompt();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            window.App.modules.ui.showNotification('📜 Prompt loaded from history!');
        }
    }

    clear() {
        if (confirm('Are you sure you want to clear all prompt history?')) {
            this.state.promptHistory = [];
            this.save();
            this.render();
            window.App.modules.ui.showNotification('🗑️ History cleared');
        }
    }

    filter() {
        const searchTerm = document.getElementById('history-search')?.value || '';
        this.render(searchTerm);
    }

    render(filter = '') {
        const container = document.getElementById('history-container');
        if (!container) return;
        
        let history = this.state.promptHistory;
        
        // Apply filter
        if (filter) {
            const query = filter.toLowerCase();
            history = history.filter(h => 
                h.prompt.toLowerCase().includes(query) ||
                h.agent.toLowerCase().includes(query)
            );
        }
        
        if (history.length === 0) {
            container.innerHTML = `
                <div class="history-empty">
                    ${filter ? 'No prompts match your search.' : 'No prompt history yet. Start by saving a prompt!'}
                </div>
            `;
            return;
        }
        
        container.innerHTML = history.map(item => {
            const date = new Date(item.timestamp);
            const timeAgo = this.getTimeAgo(date);
            const truncatedPrompt = item.prompt.length > 150 
                ? item.prompt.substring(0, 150) + '...' 
                : item.prompt;
            
            return `
                <div class="history-item">
                    <div class="history-prompt">${this.escapeHtml(truncatedPrompt)}</div>
                    <div class="history-meta">
                        <div>
                            <span>🤖 ${item.agent}</span> • 
                            <span>🕒 ${timeAgo}</span> • 
                            <span>🔄 Used ${item.uses}x</span>
                        </div>
                        <div class="history-actions">
                            <button class="history-btn" onclick="History.use(${item.id})">
                                Use
                            </button>
                            <button class="history-btn" onclick="History.delete(${item.id})">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 }
        ];
        
        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return count === 1 
                    ? `1 ${interval.label} ago` 
                    : `${count} ${interval.label}s ago`;
            }
        }
        
        return 'Just now';
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    exportHistory() {
        const data = {
            history: this.state.promptHistory,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-hub-history-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        window.App.modules.ui.showNotification('📥 History exported');
    }

    importHistory(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.history && Array.isArray(data.history)) {
                    // Merge with existing history
                    const existingIds = new Set(this.state.promptHistory.map(h => h.id));
                    const newItems = data.history.filter(h => !existingIds.has(h.id));
                    
                    this.state.promptHistory = [...newItems, ...this.state.promptHistory];
                    
                    // Sort by timestamp
                    this.state.promptHistory.sort((a, b) => 
                        new Date(b.timestamp) - new Date(a.timestamp)
                    );
                    
                    // Limit size
                    if (this.state.promptHistory.length > this.maxItems) {
                        this.state.promptHistory.length = this.maxItems;
                    }
                    
                    this.save();
                    this.render();
                    window.App.modules.ui.showNotification('📤 History imported successfully');
                }
            } catch (error) {
                window.App.modules.ui.showNotification('❌ Failed to import history', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Expose methods to window for onclick handlers
window.History = {
    use: (id) => window.App.modules.history.use(id),
    delete: (id) => window.App.modules.history.delete(id),
    filter: () => window.App.modules.history.filter()
};
