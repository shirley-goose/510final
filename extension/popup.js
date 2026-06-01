const btn = document.getElementById('toggleBtn');

function updateBtn(visible) {
  if (visible) {
    btn.textContent = '🐾 Hide pet';
    btn.className = 'toggle-btn on';
  } else {
    btn.textContent = '🐾 Show pet';
    btn.className = 'toggle-btn off';
  }
}

// Get current status when popup opens
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (resp) => {
  updateBtn(resp?.visible ?? false);
});

btn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'TOGGLE_PET' }, (resp) => {
    updateBtn(resp?.visible ?? false);
  });
});
