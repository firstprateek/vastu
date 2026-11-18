import '../index.js';

const log = document.querySelector('#log');
for (const button of document.querySelectorAll('hamburger-btn')) {
  button.addEventListener('click', () => {
    log.textContent = `click → open = ${button.open}`;
  });
}
