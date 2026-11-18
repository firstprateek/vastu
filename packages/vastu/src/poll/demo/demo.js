// GitHub Pages has no backend, so this demo answers the poll's API calls in the
// browser. server-example/ has the same API as a small Express server.
const poll = {
  question: 'Which do you reach for first when a page is slow?',
  options: [
    { id: 'perf', text: 'Performance panel', votes: 412 },
    { id: 'network', text: 'Network panel', votes: 538 },
    { id: 'lighthouse', text: 'Lighthouse', votes: 227 },
    { id: 'console', text: 'console.time()', votes: 96 },
  ],
};

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(input, location.href);
  if (!url.pathname.endsWith('/demo-api/poll')) return realFetch(input, init);

  await new Promise((resolve) => setTimeout(resolve, 300));
  if (init.method === 'PATCH') {
    const { id } = JSON.parse(init.body);
    const option = poll.options.find((o) => String(o.id) === String(id));
    if (option) option.votes += 1;
  }
  return new Response(JSON.stringify(poll), { headers: { 'Content-Type': 'application/json' } });
};

await import('../index.js');

const log = document.querySelector('#log');
for (const widget of document.querySelectorAll('poll-widget')) {
  widget.addEventListener('submit', (event) => {
    log.textContent = `submit → ${JSON.stringify(event.detail)}`;
  });
}

document.querySelector('#reset').addEventListener('click', () => location.reload());
