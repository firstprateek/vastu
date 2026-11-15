import '../index.js';

const chart = document.querySelector('#chart');
const log = document.querySelector('#log');

const datasets = {
  sales: [
    { group: 'Mon', value: 12 },
    { group: 'Tue', value: 19 },
    { group: 'Wed', value: 8 },
    { group: 'Thu', value: 15 },
    { group: 'Fri', value: 17 },
  ],
  weekend: [
    { group: 'Mon', value: 4 },
    { group: 'Tue', value: 6 },
    { group: 'Fri', value: 11 },
    { group: 'Sat', value: 18 },
  ],
};

chart.data = datasets.sales;

let timer;
const stopStream = () => {
  clearInterval(timer);
  timer = undefined;
  chart.transitionDuration = 1000;
  streamButton.textContent = 'Live stream';
};

document.querySelector('#sales').addEventListener('click', () => {
  stopStream();
  chart.data = datasets.sales;
  log.textContent = 'data = 5 weekdays';
});

document.querySelector('#weekend').addEventListener('click', () => {
  stopStream();
  chart.data = datasets.weekend;
  log.textContent = 'data = 4 groups: Wed and Thu leave, Sat enters';
});

const streamButton = document.querySelector('#stream');
streamButton.addEventListener('click', () => {
  if (timer) {
    stopStream();
    return;
  }
  chart.transitionDuration = 400;
  streamButton.textContent = 'Stop stream';
  const groups = ['A', 'B', 'C', 'D', 'E', 'F'];
  let tick = 0;
  const next = () => {
    tick += 1;
    chart.data = groups.map((group, i) => ({
      group,
      value: Math.round(10 + 8 * Math.sin(tick / 3 + i) + Math.random() * 2),
    }));
    log.textContent = `tick ${tick}: ${chart.data.map((d) => d.value).join(', ')}`;
  };
  next();
  timer = setInterval(next, 500);
});
