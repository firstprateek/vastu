const form = document.getElementById('notification-prefs');
const status = document.getElementById('prefs-status');

const names = { email: 'Email', sms: 'SMS', push: 'Push' };

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const channels = new FormData(form).getAll('channels');
  status.textContent = channels.length
    ? `Preferences saved. You'll be notified by ${channels.map((c) => names[c] ?? c).join(', ')}.`
    : 'Preferences saved. All notifications are off.';
});

form.addEventListener('change', () => {
  status.textContent = '';
});
