/**
 * content.js — Pet2Companion Chrome Extension content script
 *
 * Injects a fullscreen transparent iframe that hosts the /pet-overlay page.
 * Mouse events are forwarded into the iframe via postMessage so the pet can
 * react without needing pointer-events on the iframe itself (which would block
 * clicks to the underlying page).
 *
 * Model URL syncing:
 *   When the user is on pet2companion.vercel.app, this script reads the saved
 *   model URL from localStorage and stores it in chrome.storage.local so it
 *   is available on all other sites (bypassing third-party storage restrictions).
 *
 * Hit-testing flow:
 *  1. iframe sends PET_BOUNDS → content script stores the pet rectangle.
 *  2. On each mousemove, if cursor is inside PET_BOUNDS → pointer-events: auto
 *     (the iframe handles the event), otherwise pointer-events: none.
 *  3. While dragging (DRAG_START…DRAG_END) pointer-events stays auto so the
 *     drag doesn't get interrupted.
 */

const PET_HOST = 'https://pet2companion.vercel.app';
const STORAGE_KEY = 'pet2companion_visible';
const MODEL_STORAGE_KEY = 'pet2companion_model_url';
const LS_MODEL_KEY = 'pet2companion:last-model-url';

let iframe = null;
let visible = false;
let petBounds = null;
let dragging = false;

// ── If we're on the pet app itself, sync the model URL to chrome.storage ───
if (location.hostname === 'pet2companion.vercel.app') {
  const syncModel = () => {
    const modelUrl = localStorage.getItem(LS_MODEL_KEY);
    if (modelUrl && modelUrl.startsWith('http')) {
      chrome.storage.local.set({ [MODEL_STORAGE_KEY]: modelUrl });
    }
  };
  // Sync on load and whenever storage changes (e.g. after pet generation)
  syncModel();
  window.addEventListener('storage', syncModel);
  window.addEventListener('pet2companion-model-ready', syncModel);
  // Don't inject the pet overlay on the app itself
  // (it already has its own floating pet)
}

// ── Read saved visibility from storage ─────────────────────────────────────
chrome.storage.local.get([STORAGE_KEY], (result) => {
  if (result[STORAGE_KEY] && location.hostname !== 'pet2companion.vercel.app') {
    showPet();
  }
});

// Guard against double-injection (executeScript can run the file twice)
if (window.__pet2companion_loaded) {
  // Already running — just re-register message listener and exit
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'GET_STATUS')  sendResponse({ visible });
    if (msg.type === 'TOGGLE_PET') { visible ? hidePet() : showPet(); sendResponse({ visible }); }
    return true;
  });
} else {
  window.__pet2companion_loaded = true;
}

// ── Extension popup messages ────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'TOGGLE_PET') {
    if (visible) {
      hidePet();
    } else {
      showPet();
    }
    // showPet is async; reply after a short wait so visible is updated
    setTimeout(() => sendResponse({ visible }), 200);
    return true;
  }
  if (msg.type === 'GET_STATUS') {
    sendResponse({ visible });
    return true;
  }
  return true;
});

// ── Build iframe URL with model param ──────────────────────────────────────
function buildOverlayUrl(modelUrl) {
  if (modelUrl) {
    return `${PET_HOST}/pet-overlay?model=${encodeURIComponent(modelUrl)}`;
  }
  return `${PET_HOST}/pet-overlay`;
}

// ── iframe lifecycle ────────────────────────────────────────────────────────
function showPet() {
  if (location.hostname === 'pet2companion.vercel.app') return;

  if (iframe) { iframe.style.display = 'block'; visible = true; return; }

  chrome.storage.local.get([MODEL_STORAGE_KEY], (result) => {
    const modelUrl = result[MODEL_STORAGE_KEY] || null;
    const overlayUrl = buildOverlayUrl(modelUrl);

    iframe = document.createElement('iframe');
    iframe.src = overlayUrl;
    iframe.allow = 'autoplay';
    Object.assign(iframe.style, {
      position:   'fixed',
      inset:      '0',
      width:      '100vw',
      height:     '100vh',
      border:     'none',
      background: 'transparent',
      zIndex:     '2147482647',
      pointerEvents: 'none',
      colorScheme: 'normal',
    });
    iframe.setAttribute('allowtransparency', 'true');
    document.documentElement.appendChild(iframe);

    visible = true;
    chrome.storage.local.set({ [STORAGE_KEY]: true });
  });
}

function hidePet() {
  if (iframe) iframe.style.display = 'none';
  visible = false;
  chrome.storage.local.set({ [STORAGE_KEY]: false });
}

// ── postMessage relay: iframe → content script ─────────────────────────────
window.addEventListener('message', (ev) => {
  if (!iframe || ev.source !== iframe.contentWindow) return;
  const d = ev.data;
  if (!d || typeof d !== 'object') return;

  if (d.type === 'PET_BOUNDS') {
    petBounds = { left: d.left, top: d.top, width: d.width, height: d.height };
  }
  if (d.type === 'DRAG_START') dragging = true;
  if (d.type === 'DRAG_END')   dragging = false;
});

// ── Mouse event forwarding: page → iframe ──────────────────────────────────
function inBounds(x, y) {
  if (!petBounds) return false;
  return (
    x >= petBounds.left &&
    x <= petBounds.left + petBounds.width &&
    y >= petBounds.top  &&
    y <= petBounds.top  + petBounds.height
  );
}

function toIframe(msg) {
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage(msg, PET_HOST);
  }
}

document.addEventListener('mousemove', (ev) => {
  if (!visible || !iframe) return;
  const x = ev.clientX;
  const y = ev.clientY;
  toIframe({ type: 'MOUSE_MOVE', x, y });
  iframe.style.pointerEvents = (dragging || inBounds(x, y)) ? 'auto' : 'none';
}, { passive: true, capture: true });

document.addEventListener('mousedown', (ev) => {
  if (!visible || !iframe) return;
  if (inBounds(ev.clientX, ev.clientY)) {
    toIframe({ type: 'MOUSE_DOWN', x: ev.clientX, y: ev.clientY });
  }
}, { capture: true });

document.addEventListener('mouseup', (ev) => {
  if (!visible || !iframe) return;
  if (dragging || inBounds(ev.clientX, ev.clientY)) {
    toIframe({ type: 'MOUSE_UP', x: ev.clientX, y: ev.clientY });
  }
}, { capture: true });
