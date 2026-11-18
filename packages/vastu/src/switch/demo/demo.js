import '../index.js';

const themeSwitch = document.querySelector('#theme');
const log = document.querySelector('#log');

themeSwitch.addEventListener('change', (event) => {
  document.documentElement.dataset.theme = event.detail.checked ? 'dark' : 'light';
  log.textContent = `change → ${JSON.stringify(event.detail)}`;
});
