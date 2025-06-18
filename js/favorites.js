// Favorites Manager Module
export class FavoritesManager {
    constructor(appState) {
        this.state = appState;
        this.storageKey = 'favorite-agents';
    }

    async init() {
        this.state.favorites = this.getAll();
        console.log('✅ Favorites Manager initialized');
    }

    getAll() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load favorites:', error);
            return [];
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state.favorites));
        } catch (error) {
            console.error('Failed to save favorites:', error);
        }
    }

    toggle(agentName) {
        const index = this.state.favorites.indexOf(agentName);
        
        if (index > -1) {
            this.state.favorites.splice(index, 1);
            window.App.modules.ui.showNotification('⭐ Removed from favorites');
        } else {
            this.state.favorites.push(agentName);
            window.App.modules.ui.showNotification('⭐ Added to favorites!');
        }
        
        this.save();
        this.updateUI();
        
        // Re-render agents if we're viewing favorites
        if (this.state.currentCategory === 'favorites') {
            window.App.modules.agents.render();
        }
    }

    isFavorite(agentName) {
        return this.state.favorites.includes(agentName);
    }

    updateUI() {
        const favTab = document.getElementById('tab-favorites');
        if (favTab) {
            const count = this.state.favorites.length;
            favTab.textContent = count > 0 ? `Favorites (${count})` : 'Favorites';
        }
    }

    exportFavorites() {
        const data = {
            favorites: this.state.favorites,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-hub-favorites-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        window.App.modules.ui.showNotification('📥 Favorites exported');
    }

    importFavorites(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.favorites && Array.isArray(data.favorites)) {
                    this.state.favorites = [...new Set([...this.state.favorites, ...data.favorites])];
                    this.save();
                    this.updateUI();
                    window.App.modules.agents.render();
                    window.App.modules.ui.showNotification('📤 Favorites imported successfully');
                }
            } catch (error) {
                window.App.modules.ui.showNotification('❌ Failed to import favorites', 'error');
            }
        };
        reader.readAsText(file);
    }
}
