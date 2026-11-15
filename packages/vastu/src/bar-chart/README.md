# bar-chart

[![CI](https://github.com/firstprateek/bar-chart/actions/workflows/ci.yml/badge.svg)](https://github.com/firstprateek/bar-chart/actions/workflows/ci.yml)

A bar chart web component built with [Lit](https://lit.dev/) and [D3](https://d3js.org/).
It plots ordinal values on the x axis against numbers on the y axis.
Give it new data and the bars animate to it, so it can follow real-time values.

**[Live demo](https://firstprateek.github.io/bar-chart/)**

## Install

```bash
npm install @firstprateek/bar-chart
```

The D3 modules it needs are regular dependencies, so you don't need to add D3 to your page.

## Usage

Import the package once (with a bundler such as Vite or webpack) to register the `<bar-chart>` element:

```js
import '@firstprateek/bar-chart';
```

Pass the data as a JSON attribute or set the `data` property:

```html
<bar-chart
  width="500"
  height="400"
  max="20"
  data='[{"group":"A","value":10},{"group":"B","value":19},{"group":"C","value":8}]'>
</bar-chart>
```

```js
const chart = document.querySelector('bar-chart');
chart.data = [
  { group: 'A', value: 12 },
  { group: 'B', value: 7 },
];
```

To load data from a server, set `dataapi`. The response must be `{ "data": [...], "min"?: Number, "max"?: Number }`:

```html
<bar-chart dataapi="https://example.com/api/chart" autoupdate updatefrequency="30"></bar-chart>
```

## API

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `data` | `data` | Array | `[]` | `[{ group: String, value: Number }]` |
| `width` | `width` | Number | `460` | Width in pixels. In a narrower container the chart shrinks to fit, keeping its proportions. |
| `height` | `height` | Number | `400` | Height in pixels at full width |
| `min` | `min` | Number | `0` | Lowest value on the y axis |
| `max` | `max` | Number | largest value in `data` | Highest value on the y axis |
| `transitionDuration` | `transitionduration` | Number | `1000` | Milliseconds the bars take to animate |
| `dataAPI` | `dataapi` | String | `""` | URL to load data from |
| `autoUpdate` | `autoupdate` | Boolean | `false` | Reload from `dataapi` every `updateFrequency` seconds |
| `updateFrequency` | `updatefrequency` | Number | `60` | Seconds between reloads |
| `label` | `label` | String | `"Bar chart"` | Accessible name of the chart |

| Event | Description |
| --- | --- |
| `updated` | Fired after new data has been loaded from `dataapi`. `event.detail` is the response. |

| CSS custom property | Default | Description |
| --- | --- | --- |
| `--bar-chart-background-color` | `transparent` | Background of the chart |
| `--bar-chart-bar-color` | `#69B3A2` | Colour of the bars |
| `--bar-chart-axis-color` | `currentColor` | Colour of the axis lines |
| `--bar-chart-text-color` | `currentColor` | Colour of the axis labels |

## Upgrading from 1.0

- D3 is now bundled as dependencies. You can remove the `<script src="https://d3js.org/d3.v6.js">` tag.
- `max` now defaults to the largest value in `data`, as documented. 1.0 used a fixed 20.
- The CSS custom properties now take effect. In 1.0 the bar colour was hard-coded.

## Development

```bash
npm install
npm run dev     # demo page at http://localhost:3000
npm run build   # builds the demo into dist/
```

The demo lives in `demo/`. Pushing to `main` builds it and deploys it to GitHub Pages.

## License

ISC
