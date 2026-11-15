const form = document.getElementById('newsletter-form');
const field = form.querySelector('va-text-field');
const status = document.getElementById('newsletter-status');

// Align the button with the input box: measure how far the field's box sits
// below the top of the component (i.e. the label's height plus its gap).
function alignButton() {
  const box = field.shadowRoot?.querySelector('[part~="field"]');
  if (!box) return;
  const offset = box.getBoundingClientRect().top - field.getBoundingClientRect().top;
  if (offset >= 0) form.style.setProperty('--newsletter-field-offset', `${offset}px`);
}

customElements.whenDefined('va-text-field').then(() => {
  requestAnimationFrame(alignButton);
  new ResizeObserver(alignButton).observe(field);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = field.value.trim();
  status.textContent = `Thanks! We'll send the newsletter to ${email}.`;
  form.reset();
});
