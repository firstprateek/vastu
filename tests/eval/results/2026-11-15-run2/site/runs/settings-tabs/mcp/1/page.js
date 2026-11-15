const toaster = document.getElementById('toaster');

function notify(message, variant = 'info') {
  toaster?.show?.(message, { variant });
}

// Switches apply immediately: save the new state as soon as it changes.
const switchLabels = {
  'email-updates': 'Email updates',
  'push-notifications': 'Push notifications',
  'public-profile': 'Public profile',
  'usage-data': 'Share usage data',
};

for (const [id, label] of Object.entries(switchLabels)) {
  const control = document.getElementById(id);
  if (!control) continue;

  const stored = localStorage.getItem(`setting:${id}`);
  if (stored !== null) control.checked = stored === 'true';

  control.addEventListener('change', (event) => {
    const on = event.target.checked;
    localStorage.setItem(`setting:${id}`, String(on));
    notify(`${label} turned ${on ? 'on' : 'off'}`);
  });
}

// Profile form: the browser validates the fields before submit fires.
const form = document.getElementById('profile-form');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  notify('Profile saved', 'success');
});
