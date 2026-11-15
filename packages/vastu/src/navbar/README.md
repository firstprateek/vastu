# minimal-navbar

[![CI](https://github.com/firstprateek/minimal-navbar/actions/workflows/ci.yml/badge.svg)](https://github.com/firstprateek/minimal-navbar/actions/workflows/ci.yml)

A simple, responsive navigation bar, built as a web component with [Lit](https://lit.dev/).

- **Responsive:** at or below a `breakpoint` width you choose, the links move into a slide-out menu behind a hamburger button.
- **Themeable:** colours, height and fonts come from CSS custom properties (listed below).
- **Lightweight:** one small component plus Lit.

**[Live demo](https://firstprateek.github.io/minimal-navbar/)**

## Install

```bash
npm install minimal-navbar
```

> Version 1.0.0 on npm is missing its entry file, so `import 'minimal-navbar'` fails with it.
> Until 1.0.1 is published, install from GitHub instead: `npm install github:firstprateek/minimal-navbar`.

## Usage

Import the package once (with a bundler such as Vite or webpack) to register the `<minimal-navbar>` element:

```js
import 'minimal-navbar';
```

Put your brand link in the `brand` slot and your navigation links in the `link` slot:

```html
<minimal-navbar breakpoint="600">
  <a slot="brand" href="/">Acme</a>
  <a slot="link" href="/">Home</a>
  <a slot="link" href="/work">Work</a>
  <a slot="link" href="/contact">Contact</a>
</minimal-navbar>
```

The navbar marks the link you pick as active and fires `activeLinkChanged`:

```js
document.querySelector('minimal-navbar').addEventListener('activeLinkChanged', (event) => {
  console.log(event.detail.active); // "work"
});
```

## API

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `breakpoint` | `breakpoint` | Number | `500` | Viewport width in pixels at or below which the mobile layout is used. |
| `brandPlacement` | `brandplacement` | String | `"left"` | `"left"` or `"right"`: which side the brand and menu button sit on. |

| Slot | Description |
| --- | --- |
| `brand` | A link to the home page or brand of the site |
| `link` | Navigation links |

| Event | Description |
| --- | --- |
| `activeLinkChanged` | Fired when a link is picked. `event.detail.active` is the link's text in lower case. |

In the mobile layout, Escape closes the open menu.

| CSS custom property | Default | Description |
| --- | --- | --- |
| `--navbar-height` | `75px` | Height of the navbar |
| `--navbar-shadow` | `0 1px 2px rgb(0 0 0 / 50%)` | Box shadow of the navbar |
| `--navbar-font-size` | `16px` | Font size |
| `--navbar-font-family` | `"Exo 2", sans-serif` | Font family |
| `--navbar-bg-color` | `#FFFFFF` | Background of the bar |
| `--navbar-menu-color` | `#FFFFFF` | Background of the links and the mobile menu |
| `--navbar-link-color` | `#58595B` | Colour of the links |
| `--navbar-link-active-color` | `#333333` | Colour of links with the `nav-link--active` class |
| `--navbar-highlight-color` | `#E65446` | Colour of the brand and of the active link's underline |
| `--hamburger-stripe-color` | `#58595B` | Colour of the menu button's stripes |

## Development

```bash
npm install
npm run dev     # demo page at http://localhost:3000
npm run build   # builds the demo into dist/
```

The demo lives in `demo/`. Pushing to `main` builds it and deploys it to GitHub Pages.

## License

ISC
