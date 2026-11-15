const STORAGE_KEY = 'settings';
const toaster = document.getElementById('toaster');

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* Storage unavailable: the setting still applies for this visit. */
  }
}

const stored = load();

// Switches: restore saved state, then apply and save each change straight away.
for (const toggle of document.querySelectorAll('va-switch[data-setting]')) {
  const key = toggle.dataset.setting;
  if (typeof stored[key] === 'boolean') toggle.checked = stored[key];

  toggle.addEventListener('change', (event) => {
    const on = event.target.checked;
    stored[key] = on;
    save(stored);
    toaster.show(`${toggle.dataset.label} turned ${on ? 'on' : 'off'}`);
  });
}

// Profile form: restore saved values; validate and save on submit.
const form = document.getElementById('profile-form');
const fields = form.querySelectorAll('va-text-field[name]');
const profile = stored.profile ?? {};

for (const field of fields) {
  if (typeof profile[field.name] === 'string') field.value = profile[field.name];
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const invalid = [...fields].filter((field) => !field.checkValidity());
  if (invalid.length) {
    invalid[0].reportValidity();
    return;
  }
  stored.profile = Object.fromEntries([...fields].map((field) => [field.name, field.value]));
  save(stored);
  toaster.show('Profile saved');
});
