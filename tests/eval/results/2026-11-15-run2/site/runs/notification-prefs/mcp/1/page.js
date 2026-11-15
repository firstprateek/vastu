const form = document.getElementById('notification-prefs');
const toast = document.getElementById('prefs-toast');

form?.addEventListener('submit', (event) => {
  event.preventDefault();

  const channels = new FormData(form).getAll('channels');
  const labels = { email: 'Email', sms: 'SMS', push: 'Push' };

  const message = channels.length
    ? `Preferences saved: ${channels.map((c) => labels[c] ?? c).join(', ')}.`
    : 'Preferences saved. You won’t receive notifications.';

  toast?.show(message, { variant: 'success' });
});
