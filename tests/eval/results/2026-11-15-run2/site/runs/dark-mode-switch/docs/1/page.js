const STORAGE_KEY = 'va-theme-mode';
const root = document.documentElement;
const toggle = document.getElementById('dark-theme-switch');
const status = document.getElementById('theme-status');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function readSaved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch {
    return null;
  }
}

function save(mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* Storage unavailable: the choice still applies for this visit. */
  }
}

function applyMode(mode) {
  root.setAttribute('data-va-mode', mode);
  toggle.checked = mode === 'dark';
}

// Start from the saved choice, else the page's existing mode, else the system setting.
const current = root.getAttribute('data-va-mode');
const initial =
  readSaved() ??
  (current === 'dark' || current === 'light' ? current : systemDark.matches ? 'dark' : 'light');
applyMode(initial);

toggle.addEventListener('change', (event) => {
  const mode = event.target.checked ? 'dark' : 'light';
  applyMode(mode);
  save(mode);
  status.textContent = mode === 'dark' ? 'Dark theme on.' : 'Dark theme off.';
});

// Until the user makes a choice, follow changes to the system setting.
systemDark.addEventListener('change', (event) => {
  if (readSaved() === null) applyMode(event.matches ? 'dark' : 'light');
});
