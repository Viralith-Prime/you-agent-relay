// AI Agent Relay - Content Script
console.log('AI Agent Relay Extension loaded');

// Site-specific selectors for chat inputs
const CHAT_SELECTORS = {
  'chatgpt.com': 'textarea[placeholder*="Message"]',
  'chat.openai.com': 'textarea[placeholder*="Send a message"]',
  'claude.ai': 'div[contenteditable="true"]',
  'gemini.google.com': 'textarea[placeholder*="Enter a prompt"]',
  'you.com': 'textarea[placeholder*="Ask"], textarea[placeholder*="Type"]',
  'perplexity.ai': 'textarea[placeholder*="Ask"]',
  'copilot.microsoft.com': 'textarea[placeholder*="Ask me anything"]'
};

// Get the appropriate selector for current site
function getChatSelector() {
  const hostname = window.location.hostname;
  for (const [site, selector] of Object.entries(CHAT_SELECTORS)) {
    if (hostname.includes(site.split('.')[0])) {
      return selector;
    }
  }
  return null;
}

// Create floating inject button
function createInjectButton() {
  const button = document.createElement('div');
  button.id = 'relay-inject-button';
  button.innerHTML = `
    <div class="relay-button-content">
      <span class="relay-icon">📝</span>
      <span class="relay-text">Inject Saved Prompt</span>
    </div>
  `;
  
  button.addEventListener('click', injectPrompt);
  document.body.appendChild(button);
}

// Inject the saved prompt
async function injectPrompt() {
  const selector = getChatSelector();
  if (!selector) {
    showNotification('Chat input not found on this page', 'error');
    return;
  }
  
  // Get saved prompt from extension storage
  chrome.storage.local.get(['relayPrompt'], (result) => {
    if (!result.relayPrompt) {
      showNotification('No saved prompt found. Save one on your relay dashboard first!', 'warning');
      return;
    }
    
    const chatInput = document.querySelector(selector);
    if (!chatInput) {
      showNotification('Chat input not found', 'error');
      return;
    }
    
    // Handle different input types
    if (chatInput.tagName === 'TEXTAREA' || chatInput.tagName === 'INPUT') {
      chatInput.value = result.relayPrompt;
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      chatInput.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (chatInput.contentEditable === 'true') {
      // For contenteditable divs (like Claude)
      chatInput.textContent = result.relayPrompt;
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Trigger any React/Vue events
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
      });
      chatInput.dispatchEvent(inputEvent);
    }
    
    // Focus the input
    chatInput.focus();
    
    showNotification('Prompt injected! Press Enter to send.', 'success');
  });
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `relay-notification relay-notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('relay-notification-fade');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updatePrompt') {
    chrome.storage.local.set({ relayPrompt: request.prompt });
    showNotification('Prompt updated!', 'success');
  }
});

// Initialize when page is loaded
function initialize() {
  // Wait a bit for dynamic content to load
  setTimeout(() => {
    const selector = getChatSelector();
    if (selector) {
      createInjectButton();
    }
  }, 1000);
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Also run when navigating in single-page apps
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(initialize, 1000);
  }
}).observe(document, { subtree: true, childList: true });
