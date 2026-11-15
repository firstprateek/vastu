const root = document.documentElement;
const darkSwitch = document.getElementById('dark-theme-switch');

// Start from the mode already set on the page, or else the user's system preference.
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const currentMode = root.getAttribute('data-va-mode');
darkSwitch.checked = currentMode ? currentMode === 'dark' : systemDark.matches;

// Until the user picks a theme, keep the switch in step with the system setting.
systemDark.addEventListener('change', (event) => {
  if (!root.hasAttribute('data-va-mode')) darkSwitch.checked = event.matches;
});

darkSwitch.addEventListener('change', (event) => {
  root.setAttribute('data-va-mode', event.target.checked ? 'dark' : 'light');
});
