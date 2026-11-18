import '../index.js';

const log = document.querySelector('#log');
const width = document.querySelector('#width');

for (const navbar of document.querySelectorAll('minimal-navbar')) {
  navbar.addEventListener('activeLinkChanged', (event) => {
    log.textContent = `activeLinkChanged → ${JSON.stringify(event.detail)}`;
  });
}

// Keep the demo links from jumping the page.
document.addEventListener('click', (event) => {
  const link = event.target.closest('minimal-navbar a');
  if (link) event.preventDefault();
});

const showWidth = () => { width.textContent = `${window.innerWidth}px`; };
showWidth();
window.addEventListener('resize', showWidth);

const navbar = document.querySelector('minimal-navbar');
document.querySelector('#theme').addEventListener('click', () => {
  navbar.classList.toggle('dark');
});
