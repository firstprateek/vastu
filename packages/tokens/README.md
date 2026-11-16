# @firstprateek/vastu-tokens

Design tokens for [Vastu](https://firstprateek.github.io/vastu/), in the W3C Design Tokens (DTCG 2025.10)
format, built into CSS custom properties, JSON and TypeScript.

Two brands, each with light, dark and high-contrast modes:

| Brand | Look | File |
| --- | --- | --- |
| `vastu` (default) | Sandstone and indigo, Inter | `@firstprateek/vastu-tokens/vastu.css` |
| `lekha` | Paper and teal, Source Serif headings | `@firstprateek/vastu-tokens/lekha.css` |

```js
import '@firstprateek/vastu-tokens/vastu.css';
```

```css
.card {
  background: var(--va-color-surface-subtle);
  border: 1px solid var(--va-color-border-subtle);
  padding: var(--va-space-inline-lg);
}
```

A brand applies to the whole page, or to elements with `data-va-brand="…"`. A mode is chosen with
`data-va-mode="light|dark|high-contrast"`, or follows the user's system. Every text and UI colour pair is
checked against its WCAG 2.2 contrast minimum in every brand and mode.

- `tokens.json`: every token's CSS variable, type and use.
- `vastu.json`, `lekha.json`: values per mode.
- `import { tokens, brands, modes } from '@firstprateek/vastu-tokens'`, with a `TokenVar` type of every
  variable name.

## License

ISC
