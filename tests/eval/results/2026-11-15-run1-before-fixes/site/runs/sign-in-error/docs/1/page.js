// Clear the server-side "Incorrect password" error once the user edits the password.
const password = document.getElementById('password');

password?.addEventListener('input', () => {
  if (password.hasAttribute('error')) password.removeAttribute('error');
});
