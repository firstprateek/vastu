const STORAGE_KEY = 'va-mode';
const root = document.documentElement;
const toggle = document.getElementById('dark-theme-switch');
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
    // Storage unavailable (e.g. private mode); the choice still applies for this visit.
  }
}

function applyMode(mode) {
  root.setAttribute('data-va-mode', mode);
  toggle.checked = mode === 'dark';
}

// Start from the saved choice, or else the user's system preference.
applyMode(readSaved() ?? (systemDark.matches ? 'dark' : 'light'));

toggle.addEventListener('change', (event) => {
  const mode = event.target.checked ? 'dark' : 'light';
  applyMode(mode);
  save(mode);
});

// Follow system changes until the user makes an explicit choice.
systemDark.addEventListener('change', (event) => {
  if (!readSaved()) applyMode(event.matches ? 'dark' : 'light');
});
