// Arrow-key navigation between buttons in the toolbar (WAI-ARIA toolbar pattern).
for (const toolbar of document.querySelectorAll('.format-toolbar')) {
  toolbar.addEventListener('keydown', (event) => {
    const buttons = [...toolbar.querySelectorAll('va-button:not([disabled])')];
    const current = buttons.indexOf(event.target.closest('va-button'));
    if (current === -1) return;

    let next;
    switch (event.key) {
      case 'ArrowRight': next = (current + 1) % buttons.length; break;
      case 'ArrowLeft': next = (current - 1 + buttons.length) % buttons.length; break;
      case 'Home': next = 0; break;
      case 'End': next = buttons.length - 1; break;
      default: return;
    }
    event.preventDefault();
    buttons[next].focus();
  });
}
