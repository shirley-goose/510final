// background.js — service worker for Pet2Companion extension
// Relays toggle commands from popup to the active tab's content script.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'TOGGLE_PET') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PET' }, (resp) => {
        sendResponse(resp ?? { visible: false });
      });
    });
    return true; // keep channel open for async sendResponse
  }

  if (msg.type === 'GET_STATUS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return sendResponse({ visible: false });
      chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' }, (resp) => {
        sendResponse(resp ?? { visible: false });
      });
    });
    return true;
  }
});
