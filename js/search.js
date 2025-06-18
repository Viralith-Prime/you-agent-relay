// Search Manager Module
export class SearchManager {
    constructor(appState) {
        this.state = appState;
        this.searchInput = null;
        this.clearButton = null;
        this.debounceTimeout = null;
    }

    async init() {
        this.searchInput = document.getElementById('agent-search-bar');
        this.clearButton = document.getElementById('agent-search-clear');
        
        if (this.searchInput) {
            this.setupEventListeners();
        }
        
        console.log('✅ Search Manager initialized');
    }

    setupEventListeners() {
        // Use input event for real-time search
        this.searchInput.addEventListener('input', this.handleSearch.bind(this));
        
        // Handle enter key
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.executeSearch();
            }
        });
        
        // Handle escape key
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clear();
            }
        });
    }

    handleSearch(event) {
        clearTimeout(this.debounceTimeout);
        
        const query = event.target.value.trim();
        this.state.searchQuery = query;
        
        // Show/hide clear button
        if (this.clearButton) {
            this.clearButton.style.display = query ? 'flex' : 'none';
        }
        
        // Debounce search execution
        this.debounceTimeout = setTimeout(() => {
            this.executeSearch();
        }, 300);
    }

    executeSearch() {
        // Render agents with current search query
        window.App.modules.agents.render();
        
        // Track search usage
        if (this.state.searchQuery) {
            this.trackSearch(this.state.searchQuery);
        }
    }

    clear() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.state.searchQuery = '';
        }
        
        if (this.clearButton) {
            this.clearButton.style.display = 'none';
        }
        
        this.executeSearch();
        this.searchInput?.focus();
    }

    trackSearch(query) {
        const searches = JSON.parse(localStorage.getItem('search-history') || '[]');
        
        // Add to history (limit to last 20 searches)
        searches.unshift({
            query: query,
            timestamp: Date.now()
        });
        
        if (searches.length > 20) {
            searches.length = 20;
        }
        
        localStorage.setItem('search-history', JSON.stringify(searches));
    }

    getRecentSearches() {
        const searches = JSON.parse(localStorage.getItem('search-history') || '[]');
        
        // Get unique recent searches
        const uniqueSearches = [];
        const seen = new Set();
        
        for (const search of searches) {
            if (!seen.has(search.query)) {
                seen.add(search.query);
                uniqueSearches.push(search);
                if (uniqueSearches.length >= 5) break;
            }
        }
        
        return uniqueSearches;
    }

    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
}

// Expose clear method to window for onclick handler
window.Search = {
    clear: () => window.App.modules.search?.clear()
};
