// Get current saved prompt
chrome.storage.local.get(['relayPrompt'], (result) => {
  const display = document.getElementById('prompt-display');
  if (result.relayPrompt) {
    display.textContent = result.relayPrompt;
    display.classList.remove('no-prompt');
  }
});

// Inject button
document.getElementById('inject-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: 'inject' });
  
  document.getElementById('status').textContent = '✓ Attempting to inject prompt...';
  setTimeout(() => {
    window.close();
  }, 1000);
});

// Dashboard button
document.getElementById('dashboard-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://viralith-prime.github.io/you-agent-relay/' });
});
