# switch

[![CI](https://github.com/firstprateek/switch/actions/workflows/ci.yml/badge.svg)](https://github.com/firstprateek/switch/actions/workflows/ci.yml)

An accessible on/off switch, built as a web component with [Lit](https://lit.dev/).
It wraps a native checkbox with `role="switch"`, so it works with the keyboard and screen readers.
It's handy as a light/dark theme switch, which is why the element is called `<theme-switch>`.

**[Live demo](https://firstprateek.github.io/switch/)**

## Install

The package isn't on npm yet. Install it from GitHub:

```bash
npm install github:firstprateek/switch
```

## Usage

Import the package once (with a bundler such as Vite or webpack) to register the `<theme-switch>` element:

```js
import '@firstprateek/switch';

document.querySelector('theme-switch').addEventListener('change', (event) => {
  document.documentElement.dataset.theme = event.detail.checked ? 'dark' : 'light';
});
```

```html
<theme-switch label="Dark theme"></theme-switch>
<theme-switch label="Notifications" checked></theme-switch>
<theme-switch label="Unavailable" disabled></theme-switch>
```

## API

| Property / attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `checked` | Boolean | `false` | Whether the switch is on. Reflected to the attribute. |
| `disabled` | Boolean | `false` | Disables the switch. |
| `label` | String | `"Toggle"` | Accessible name of the switch. |

| Event | Description |
| --- | --- |
| `change` | Fired when the user flips the switch. `event.detail.checked` holds the new state. |

| CSS custom property | Default | Description |
| --- | --- | --- |
| `--switch-track-color` | `#F2F0EE` | Colour of the track |
| `--switch-thumb-color` | `#58595B` | Colour of the round thumb |
| `--switch-focus-color` | `#2563EB` | Colour of the keyboard focus ring |

The track and thumb are also exposed as the CSS parts `track` and `thumb`.
The 1.0 variable names `--background-color` and `--link-color` still work as fallbacks.

## Development

```bash
npm install
npm run dev     # demo page at http://localhost:3000
npm run build   # builds the demo into dist/
```

The demo lives in `demo/`. Pushing to `main` builds it and deploys it to GitHub Pages.

## License

ISC
