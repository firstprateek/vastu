const form = document.getElementById('sign-in-form');
const password = document.getElementById('password');

// The error came from the last sign-in attempt; clear it once the user
// starts typing a new password.
password?.addEventListener('input', () => {
  if (password.error) password.error = '';
});

// No backend on this page: keep the form from navigating away on submit.
form?.addEventListener('submit', (event) => {
  event.preventDefault();
});
