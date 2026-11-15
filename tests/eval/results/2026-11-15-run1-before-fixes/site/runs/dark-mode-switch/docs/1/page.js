// Switches the whole page between light and dark mode by setting
// data-va-mode on <html>, which Vastu's design tokens respond to.

const STORAGE_KEY = 'va-mode';
const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const toggle = document.getElementById('dark-theme-switch');

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
    // Storage unavailable (e.g. private mode): the choice lasts for this visit only.
  }
}

function applyMode(mode) {
  root.dataset.vaMode = mode;
  toggle.checked = mode === 'dark';
}

// Start from the saved choice, then any mode already set on <html>,
// then the system preference.
const initial =
  readSaved() ??
  (root.dataset.vaMode === 'dark' || root.dataset.vaMode === 'light'
    ? root.dataset.vaMode
    : systemDark.matches ? 'dark' : 'light');
applyMode(initial);

toggle.addEventListener('change', (event) => {
  const mode = event.target.checked ? 'dark' : 'light';
  applyMode(mode);
  save(mode);
});

// Follow system changes until the user makes their own choice.
systemDark.addEventListener('change', (event) => {
  if (readSaved() === null) applyMode(event.matches ? 'dark' : 'light');
});
