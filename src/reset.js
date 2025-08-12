export function initReset(buttonId = 'resetBtn') {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener('click', () => {
    // Clear all site localStorage data
    try {
      localStorage.clear();
    } catch (_) {}
    // Hard reload to boot fresh state
    location.reload();
  });
}

if (document.readyState !== 'loading') {
  const btn = document.getElementById('resetBtn');
  if (btn) initReset('resetBtn');
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('resetBtn');
    if (btn) initReset('resetBtn');
  });
}