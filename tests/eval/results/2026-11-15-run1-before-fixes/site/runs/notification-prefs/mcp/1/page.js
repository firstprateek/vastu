const form = document.getElementById('prefs-form');
const status = document.getElementById('prefs-status');

const LABELS = { email: 'Email', sms: 'SMS', push: 'Push' };

form.addEventListener('submit', (event) => {
  // No backend on this page: read the submitted values and confirm in place.
  // To post to a server, remove preventDefault() and set the form's action.
  event.preventDefault();

  const channels = new FormData(form).getAll('channels');
  status.textContent = channels.length
    ? `Saved. You'll get notifications by ${channels.map((c) => LABELS[c] ?? c).join(', ')}.`
    : "Saved. You won't get any notifications.";
});

// Clear the confirmation once the user changes something again.
form.addEventListener('change', () => {
  status.textContent = '';
});
