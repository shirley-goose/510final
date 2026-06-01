const btn        = document.getElementById('toggleBtn');
const statusEl   = document.getElementById('status');
const MODEL_KEY  = 'pet2companion_model_url';

function setBtn(visible) {
  btn.textContent = visible ? '🐾 Hide pet' : '🐾 Show pet';
  btn.className   = visible ? 'toggle-btn on' : 'toggle-btn off';
}

function setStatus(modelUrl) {
  if (modelUrl) {
    statusEl.innerHTML = `<span style="color:#027a48">✓ Pet synced</span>`;
  } else {
    statusEl.innerHTML = `⚠️ No pet synced yet.<br>
      <a href="https://pet2companion.vercel.app" target="_blank">Open Pet2Companion</a>
      and wait 3 seconds, then come back.`;
  }
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToTab(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch (_) {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await new Promise(r => setTimeout(r, 150));
    return await chrome.tabs.sendMessage(tabId, msg);
  }
}

// Init
(async () => {
  // Show model sync status
  chrome.storage.local.get([MODEL_KEY], (r) => setStatus(r[MODEL_KEY] || null));

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
