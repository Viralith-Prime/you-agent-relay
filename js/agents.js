// Agent Manager Module
export class AgentManager {
    constructor(appState) {
        this.state = appState;
        this.agents = this.loadAgentData();
    }

    async init() {
        // Future: Could load agents from external source
        console.log('✅ Agent Manager initialized');
    }

    loadAgentData() {
        return {
            mainstream: [
                {
                    name: "ChatGPT",
                    provider: "OpenAI",
                    url: "https://chatgpt.com",
                    icon: "🤖",
                    description: "GPT-4o free tier, no login required",
                    features: ["General chat", "Code generation", "Creative writing"],
                    limitations: ["Usage limits on GPT-4o", "No plugins in free tier"],
                    type: "mainstream",
                    bestFor: ["general", "coding", "creative"],
                    loginRequired: "No",
                    dailyLimit: "Unknown"
                },
                {
                    name: "Gemini", 
                    provider: "Google",
                    url: "https://gemini.google.com",
                    icon: "✨",
                    description: "Google's latest AI, free with Google account",
                    features: ["Web search integration", "Image understanding", "Long context"],
                    limitations: ["Requires Google account", "Some features Pro-only"],
                    type: "mainstream",
                    bestFor: ["general", "research"],
                    loginRequired: "Yes",
                    dailyLimit: "Unknown"
                },
                {
                    name: "Claude",
                    provider: "Anthropic",
                    url: "https://claude.ai",
                    icon: "🧠",
                    description: "100k token context window, privacy-focused",
                    features: ["Large documents", "Code analysis", "Research"],
                    limitations: ["Daily message limit", "Email signup required"],
                    type: "mainstream",
                    bestFor: ["research", "creative", "general"],
                    loginRequired: "Yes",
                    dailyLimit: "50 messages/day"
                },
                {
                    name: "Copilot",
                    provider: "Microsoft", 
                    url: "https://copilot.microsoft.com",
                    icon: "🎯",
                    description: "GPT-4 Turbo via Microsoft, completely free",
                    features: ["Web browsing", "Image generation", "No signup"],
                    limitations: ["Bing integration", "Microsoft branding"],
                    type: "mainstream",
                    bestFor: ["general", "creative"],
                    loginRequired: "No",
                    dailyLimit: "Unknown"
                },
                {
                    name: "Perplexity",
                    provider: "Perplexity AI",
                    url: "https://www.perplexity.ai",
                    icon: "🔍",
                    description: "AI-powered search with citations",
                    features: ["Real-time web search", "Source citations", "Follow-up questions"],
                    limitations: ["5 Pro searches/day", "Limited file uploads"],
                    type: "mainstream",
                    bestFor: ["research", "general"],
                    loginRequired: "No",
                    dailyLimit: "Unknown"
                },
                {
                    name: "Meta AI",
                    provider: "Meta",
                    url: "https://www.meta.ai",
                    icon: "📘",
                    description: "Meta's Llama-based assistant",
                    features: ["Image generation", "Social integration", "No account needed"],
                    limitations: ["US only", "Less capable than GPT-4"],
                    type: "mainstream",
                    bestFor: ["creative", "general"],
                    loginRequired: "No",
                    dailyLimit: "Unknown"
                }
            ],
            specialized: [
                {
                    name: "HuggingChat",
                    provider: "Hugging Face",
                    url: "https://huggingface.co/chat",
                    icon: "🤗",
                    description: "Open source models including Llama, Mistral",
                    features: ["Multiple models", "Open source", "No tracking"],
                    limitations: ["Less polished UI", "Variable performance"],
                    type: "specialized",
                    bestFor: ["research", "general"],
                    loginRequired: "No",
                    dailyLimit: "Unknown"
                },
                {
                    name: "Phind",
                    provider: "Phind",
                    url: "https://www.phind.com",
                    icon: "👨‍💻",
                    description: "Developer-focused AI search",
                    features: ["Code examples", "Technical docs", "VS Code extension"],
                    limitations: ["Developer-focused only", "Limited general chat"],
                    type: "specialized",
                    bestFor: ["coding"],
                    loginRequired: "No",
                    dailyLimit: "Unknown"
                },
                {
                    name: "Poe",
                    provider: "Quora",
                    url: "https://poe.com",
                    icon: "💬",
                    description: "Access multiple AI models in one place",
                    features: ["Multiple models", "Custom bots", "Mobile app"],
                    limitations: ["Daily message limits", "Account required"],
                    type: "specialized",
                    bestFor: ["general", "creative"],
                    loginRequired: "Yes",
                    dailyLimit: "Variable by model"
                }
            ],
            custom: [
                {
                    name: "You.com Research",
                    provider: "You.com",
                    url: "https://you.com/search?q=&fromSearchBar=true&tbm=youchat&chatMode=research",
                    icon: "🔬",
                    description: "Advanced academic research assistant providing paper summaries, source citations, and fact-checking",
                    features: ["Academic research", "Paper summarization", "Source citations", "Fact checking"],
                    limitations: ["You.com account optional", "Web UI only"],
                    type: "custom",
                    bestFor: ["research"],
                    loginRequired: "No",
                    dailyLimit: "Unknown"
                },
                {
                    name: "You.com Code",
                    provider: "You.com",
                    url: "https://you.com/search?q=&fromSearchBar=true&tbm=youchat&chatMode=code",
                    icon: "💻",
                    description: "Coding-focused AI assistant for programming help, debugging, and explanations",
                    features: ["Programming help", "Debugging", "Code explanations", "Multi-language support"],
                    limitations: ["You.com account optional", "Web UI only"],
                    type: "custom",
                    bestFor: ["coding"],
                    loginRequired: "No",
                    dailyLimit: "Unknown"
                },
                {
                    name: "You.com Creative",
                    provider: "You.com",
                    url: "https://you.com/search?q=&fromSearchBar=true&tbm=youchat&chatMode=creative",
                    icon: "✍️",
                    description: "Creative writing and editing assistant for brainstorming, drafting, and refining",
                    features: ["Writing assistance", "Editing", "Story ideas", "Content improvement"],
                    limitations: ["You.com account optional", "Web UI only"],
                    type: "custom",
                    bestFor: ["creative"],
                    loginRequired: "No",
                    dailyLimit: "Unknown"
                },
                {
                    name: "You.com",
                    provider: "You.com",
                    url: "https://you.com/search?q=&fromSearchBar=true&tbm=youchat",
                    icon: "🧠",
                    description: "General-purpose AI chat with web search integration",
                    features: ["Smart routing", "Web search", "General chat", "Source citations"],
                    limitations: ["You.com account optional"],
                    type: "premade",
                    bestFor: ["general"],
                    loginRequired: "No",
                    dailyLimit: "Unknown"
                }
            ]
        };
    }

    getAll() {
        return [
            ...this.agents.mainstream,
            ...this.agents.specialized,
            ...this.agents.custom
        ];
    }

    getByName(name) {
        return this.getAll().find(agent => agent.name === name);
    }

    getByCategory(category) {
        if (category === 'all') return this.getAll();
        if (category === 'favorites') {
            return this.getAll().filter(agent => 
                this.state.favorites.includes(agent.name)
            );
        }
        return this.getAll().filter(agent => 
            agent.bestFor && agent.bestFor.includes(category)
        );
    }

    getFiltered() {
        let agents = this.getByCategory(this.state.currentCategory);
        
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            agents = agents.filter(agent => {
                const searchableText = [
                    agent.name,
                    agent.provider,
                    agent.description,
                    ...(agent.features || [])
                ].join(' ').toLowerCase();
                return searchableText.includes(query);
            });
        }
        
        return agents;
    }

    createAgentCard(agent) {
        const isFavorite = this.state.favorites.includes(agent.name);
        const card = document.createElement('div');
        card.className = 'agent-card';
        card.innerHTML = `
            <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" 
                    onclick="App.modules.favorites.toggle('${agent.name}')" 
                    aria-label="Toggle favorite">
                ${isFavorite ? '⭐' : '☆'}
            </button>
            <span class="agent-type type-${agent.type}">
                ${agent.type ? agent.type.toUpperCase() : ''}
            </span>
            <h3>
                ${agent.icon} ${agent.name}
            </h3>
            <p>${agent.description}</p>
            <div style="margin-bottom: 8px;">
                <strong>Provider:</strong> ${agent.provider}
            </div>
            <div>
                <strong>Features:</strong> ${agent.features.join(", ")}
            </div>
            <div>
                <strong>Limitations:</strong> ${agent.limitations.join(", ")}
            </div>
            <div class="url-display" tabindex="0" aria-label="Agent URL">
                ${agent.url}
            </div>
            <button class="btn btn-primary launch-btn" 
                    onclick="App.launchAgent('${agent.name}')" 
                    aria-label="Launch ${agent.name}">
                🚀 Launch Agent
            </button>
        `;
        return card;
    }

    render() {
        const grid = document.getElementById('agent-grid');
        const emptyMsg = document.getElementById('agent-search-empty');
        
        if (!grid) return;
        
        const agents = this.getFiltered();
        
        emptyMsg.style.display = agents.length === 0 ? 'block' : 'none';
        grid.innerHTML = '';
        
        agents.forEach(agent => {
            const card = this.createAgentCard(agent);
            grid.appendChild(card);
        });
    }
}

