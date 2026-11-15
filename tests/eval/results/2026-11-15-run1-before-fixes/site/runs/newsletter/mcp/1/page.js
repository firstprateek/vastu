const form = document.getElementById('newsletter-form');
const email = document.getElementById('newsletter-email');
const submit = document.getElementById('newsletter-submit');
const status = document.getElementById('newsletter-status');

// Line the button up with the input box rather than the top of the label.
function alignButton() {
  const field = email.shadowRoot?.querySelector('[part~="field"]');
  if (!field) return;
  const offset = field.getBoundingClientRect().top - email.getBoundingClientRect().top;
  form.style.setProperty('--newsletter-label-offset', `${Math.max(0, offset)}px`);
}

customElements.whenDefined('va-text-field').then(async () => {
  await email.updateComplete;
  requestAnimationFrame(alignButton);
});
new ResizeObserver(alignButton).observe(email);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';
  if (!email.checkValidity()) {
    email.reportValidity();
    return;
  }

  submit.loading = true;
  // Stand-in for a request to the newsletter service.
  await new Promise((resolve) => setTimeout(resolve, 600));
  submit.loading = false;

  status.textContent = `Thanks! We'll send the newsletter to ${email.value}.`;
  form.reset();
  email.value = '';
});
