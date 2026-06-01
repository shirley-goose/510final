const btn = document.getElementById('toggleBtn');

function setBtn(visible) {
  btn.textContent = visible ? '🐾 Hide pet' : '🐾 Show pet';
  btn.className   = visible ? 'toggle-btn on' : 'toggle-btn off';
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Inject content script if not already running, then send a message.
async function sendToTab(tabId, msg) {
  // First try directly
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch (_) {
    // Content script not present — inject it now
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    // Small delay for script to initialise
    await new Promise(r => setTimeout(r, 120));
    return await chrome.tabs.sendMessage(tabId, msg);
  }
}

// Init button state
(async () => {
  const tab = await getCurrentTab();
  if (!tab?.id) { setBtn(false); return; }
  try {
    const resp = await sendToTab(tab.id, { type: 'GET_STATUS' });
    setBtn(resp?.visible ?? false);
  } catch (_) {
    setBtn(false);
  }
})();

btn.addEventListener('click', async () => {
  const tab = await getCurrentTab();
  if (!tab?.id) return;
  try {
    const resp = await sendToTab(tab.id, { type: 'TOGGLE_PET' });
    setBtn(resp?.visible ?? false);
  } catch (e) {
    console.error('[Pet2Companion] toggle failed:', e);
  }
});
