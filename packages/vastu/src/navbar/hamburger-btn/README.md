# hamburger-btn

[![CI](https://github.com/firstprateek/hamburger-btn/actions/workflows/ci.yml/badge.svg)](https://github.com/firstprateek/hamburger-btn/actions/workflows/ci.yml)

A lightweight hamburger menu button, built as a web component with [Lit](https://lit.dev/).
Its three stripes turn into a cross when the button is open.

**[Live demo](https://firstprateek.github.io/hamburger-btn/)**

## Install

```bash
npm install hamburger-btn
```

## Usage

Import the package once (with a bundler such as Vite or webpack) to register the `<hamburger-btn>` element:

```js
import 'hamburger-btn';
```

Then use it in your HTML:

```html
<hamburger-btn></hamburger-btn>

<hamburger-btn open style="--hamburger-stripe-color: tomato"></hamburger-btn>
```

Listen for clicks to open and close your menu. `open` has already been toggled when your listener runs:

```js
const button = document.querySelector('hamburger-btn');
button.addEventListener('click', () => {
  menu.classList.toggle('visible', button.open);
});
```

## API

| Property / attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `open` | Boolean | `false` | Shows the cross when true. Toggled on every click and reflected to the attribute. |
| `hidden` | Boolean | `false` | Hides the button when true. |
| `label` | String | `"Toggle menu"` | Accessible name of the button. |

The inner `<button>` sets `aria-expanded` from `open`.

| CSS custom property | Default | Description |
| --- | --- | --- |
| `--hamburger-stripe-color` | `#58595B` | Colour of the stripes |

| Event | Description |
| --- | --- |
| `click` | The native click event, after `open` has been toggled. |

## Development

```bash
npm install
npm run dev     # demo page at http://localhost:3000
npm run build   # builds the demo into dist/
```

The demo lives in `demo/`. Pushing to `main` builds it and deploys it to GitHub Pages.

## License

ISC
