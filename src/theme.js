const STORAGE_KEY = 'expenseMateTheme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function getSavedTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

export function initThemeToggle(buttonId = 'themeToggleBtn') {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  let current = getSavedTheme();
  applyTheme(current);
  btn.textContent = current === 'dark' ? 'Light Mode' : 'Dark Mode';

  btn.addEventListener('click', () => {
    current = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, current);
    applyTheme(current);
    btn.textContent = current === 'dark' ? 'Light Mode' : 'Dark Mode';
  });
}

// Auto-init if included after DOMContentLoaded
if (document.readyState !== 'loading') {
  const current = getSavedTheme();
  applyTheme(current);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const current = getSavedTheme();
    applyTheme(current);
  });
}