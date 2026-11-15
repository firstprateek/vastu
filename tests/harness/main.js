// Test harness. Serves one example per page, built and served under a strict CSP with Trusted Types.
//   ?c=button&e=1-variants   render that example
//   ?c=button                an empty stage with the component defined (for generated tests)
//   &mode=dark               data-va-mode on <html>; &brand=lekha (default)
import '../../packages/tokens/dist/lekha.css';
import './harness.css';

const components = import.meta.glob('../../packages/vastu/dist/dev/*/index.js', { eager: true });
const examples = import.meta.glob('../../packages/vastu/src/*/examples/*.html', { query: '?raw', import: 'default', eager: true });

// Fixtures are trusted test content; components themselves never need a policy other than Lit's.
const policy = window.trustedTypes?.createPolicy('vastu-harness', { createHTML: (s) => s }) ?? { createHTML: (s) => s };

const params = new URLSearchParams(location.search);
const root = document.documentElement;
root.dataset.vaBrand = params.get('brand') ?? 'lekha';
if (params.get('mode')) root.dataset.vaMode = params.get('mode');

const stage = document.querySelector('#stage');
const c = params.get('c');
const e = params.get('e');
if (c && e) {
  const key = Object.keys(examples).find((k) => k.endsWith(`/${c}/examples/${e}.html`));
  if (!key) throw new Error(`No example ${c}/${e}`);
  stage.innerHTML = policy.createHTML(examples[key].replace(/^<!--[\s\S]*?-->\s*/, ''));
} else if (!c) {
  const links = Object.keys(examples).map((k) => {
    const [, comp, file] = k.match(/\/([^/]+)\/examples\/([^/]+)\.html$/);
    return `<li><a href="?c=${comp}&e=${file}">${comp} / ${file}</a></li>`;
  });
  stage.innerHTML = policy.createHTML(`<ul>${links.join('')}</ul>`);
}

const elements = [...stage.querySelectorAll('*')].filter((el) => el.localName.startsWith('va-'));
await Promise.all(elements.map((el) => el.updateComplete));
window.__vastuComponents = Object.keys(components).map((k) => k.match(/dev\/([^/]+)\/index\.js$/)[1]);
document.body.dataset.ready = 'true';
