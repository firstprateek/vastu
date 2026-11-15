const form = document.getElementById('newsletter-form');
const email = document.getElementById('newsletter-email');
const submit = document.getElementById('newsletter-submit');
const status = document.getElementById('newsletter-status');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';

  if (!email.checkValidity()) {
    email.error = email.value.trim()
      ? 'Enter a valid email address, like ada@example.com.'
      : 'Enter your email address.';
    return;
  }

  email.error = '';
  submit.loading = true;

  try {
    // Replace with the real request to your newsletter service.
    await new Promise((resolve) => setTimeout(resolve, 600));
    status.textContent = `Thanks! We'll send the newsletter to ${email.value.trim()}.`;
    form.reset();
    email.value = '';
  } catch {
    email.error = "Couldn't subscribe you. Please try again.";
  } finally {
    submit.loading = false;
  }
});

// Clear a custom error as soon as the user edits the address.
email.addEventListener('input', () => {
  if (email.error) email.error = '';
});
