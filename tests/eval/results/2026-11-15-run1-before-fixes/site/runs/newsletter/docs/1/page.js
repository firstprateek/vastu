const form = document.getElementById('newsletter-form');
const email = form.querySelector('va-text-field');
const status = document.getElementById('newsletter-status');

// Line the Subscribe button up with the input box inside the text field,
// so it sits beside the field rather than beside its label or help text.
function alignButton() {
  const field = email.shadowRoot?.querySelector('[part~="field"]');
  if (!field) return;
  const offset = field.getBoundingClientRect().top - email.getBoundingClientRect().top;
  form.style.setProperty('--newsletter-field-offset', `${offset}px`);
  form.style.setProperty('--newsletter-field-height', `${field.offsetHeight}px`);
}

customElements.whenDefined('va-text-field').then(() => {
  requestAnimationFrame(alignButton);
  new ResizeObserver(alignButton).observe(email);
});

// The submit event only fires once the required email field is valid.
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const address = email.value.trim();
  status.textContent = `Thanks! We'll send the newsletter to ${address}.`;
  form.reset();
});
