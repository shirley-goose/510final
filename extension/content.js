/**
 * content.js — Pet2Companion Chrome Extension content script
 *
 * Injects a fullscreen transparent iframe that hosts the /pet-overlay page.
 * Mouse events are forwarded into the iframe via postMessage so the pet can
 * react without needing pointer-events on the iframe itself (which would block
 * clicks to the underlying page).
 *
 * Hit-testing flow:
 *  1. iframe sends PET_BOUNDS → content script stores the pet rectangle.
 *  2. On each mousemove, if cursor is inside PET_BOUNDS → pointer-events: auto
 *     (the iframe handles the event), otherwise pointer-events: none.
 *  3. While dragging (DRAG_START…DRAG_END) pointer-events stays auto so the
 *     drag doesn't get interrupted.
 */

const PET_HOST = 'https://pet2companion.vercel.app';
const OVERLAY_URL = `${PET_HOST}/pet-overlay`;
const STORAGE_KEY = 'pet2companion_visible';

let iframe = null;
let visible = false;
let petBounds = null; // { left, top, width, height } in iframe/viewport px
let dragging = false;

// ── Read saved visibility from storage ─────────────────────────────────────
chrome.storage.local.get([STORAGE_KEY], (result) => {
  if (result[STORAGE_KEY]) showPet();
});

// ── Extension popup messages ────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'TOGGLE_PET') {
    visible ? hidePet() : showPet();
    sendResponse({ visible });
  }
  if (msg.type === 'GET_STATUS') {
    sendResponse({ visible });
  }
  return true;
});

// ── iframe lifecycle ────────────────────────────────────────────────────────
function showPet() {
  if (iframe) { iframe.style.display = 'block'; visible = true; return; }

  iframe = document.createElement('iframe');
  iframe.src = OVERLAY_URL;
  iframe.allow = 'autoplay';
  Object.assign(iframe.style, {
    position:   'fixed',
    inset:      '0',
    width:      '100vw',
    height:     '100vh',
    border:     'none',
    background: 'transparent',
    zIndex:     '2147482647',
    pointerEvents: 'none', // default — only enabled over pet
    colorScheme: 'normal',
  });
  iframe.setAttribute('allowtransparency', 'true');
  document.documentElement.appendChild(iframe);

  visible = true;
  chrome.storage.local.set({ [STORAGE_KEY]: true });
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
  // Enable pointer-events only over pet (or while dragging)
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
