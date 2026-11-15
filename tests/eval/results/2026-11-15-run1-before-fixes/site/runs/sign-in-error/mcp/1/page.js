// Clear the server-side "Incorrect password" error once the user starts
// typing a new password, so the stale message doesn't linger.
const password = document.getElementById('password');

password?.addEventListener('input', () => {
  if (password.error) password.error = '';
}, { once: true });
