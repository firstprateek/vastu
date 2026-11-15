# poll-widget

[![Open the live demo](https://img.shields.io/badge/Live_demo-Open_%E2%86%92-b93a2f?style=for-the-badge)](https://firstprateek.github.io/poll-widget/)

[![CI](https://github.com/firstprateek/poll-widget/actions/workflows/ci.yml/badge.svg)](https://github.com/firstprateek/poll-widget/actions/workflows/ci.yml)

An embeddable, themeable poll, built as a web component with [Lit](https://lit.dev/).
Pick an option and the bars animate to show the results.

### [▶ Try the live demo](https://firstprateek.github.io/poll-widget/)

## Install

```bash
npm install @firstprateek/poll-widget
```

## Usage

Import the package once (with a bundler such as Vite or webpack) to register the `<poll-widget>` element:

```js
import '@firstprateek/poll-widget';
```

The poll works in two modes.

**Local mode.** Without `requestapi`, the poll shows the `question` and `options` you give it and counts votes in the browser:

```html
<poll-widget
  question="Tabs or spaces?"
  options='[{"id":1,"text":"Tabs"},{"id":2,"text":"Spaces","votes":3}]'>
</poll-widget>
```

**API mode.** With `requestapi`, the poll loads its question and results from your server and sends votes back to it:

```html
<poll-widget
  requestapi="https://example.com/api/poll"
  voteapi="https://example.com/api/poll">
</poll-widget>
```

- `GET requestapi` returns the poll.
- `PATCH voteapi` with the JSON body `{ "id": <option id> }` records a vote and returns the updated poll.

Both responses use this shape:

```json
{
  "question": "What is your favorite JS view library?",
  "options": [
    { "id": 1, "text": "Lit", "votes": 500 },
    { "id": 2, "text": "React", "votes": 1000 }
  ]
}
```

[`server-example/`](server-example/) is a small Express server that implements this API:

```bash
cd server-example
npm install
npm start   # http://localhost:4000/posts
```

## API

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `requestAPI` | `requestapi` | String | `""` | URL to load the poll from. Empty means local mode. |
| `voteAPI` | `voteapi` | String | `""` | URL to send votes to. Empty means votes are counted locally. |
| `question` | `question` | String | a sample question | The question, until the API answers. |
| `options` | `options` | Array | three sample options | `[{ id, text, votes? }]`, until the API answers. |
| `width` | `width` | Number | fills its container | Width in pixels |
| `height` | `height` | Number | fits its content | Height in pixels |
| `updateFrequency` | `updatefrequency` | Number | `60` | Minutes between reloads from `requestapi` |
| `timeAgo` | `timeago` | Boolean | `true` | Shows when the results were last updated. Set the attribute to `"false"` to hide it. |

| Event | Description |
| --- | --- |
| `submit` | Fired when the user votes. `event.detail.id` is the chosen option's id. |

| CSS custom property | Default | Description |
| --- | --- | --- |
| `--poll-background-color` | `purple` | Background of the poll |
| `--poll-color` | `white` | Text colour |
| `--poll-font-size` | `16px` | Font size; the question is 1.5em |
| `--poll-border-radius` | `5px` | Border radius of the poll |
| `--poll-bar-border-radius` | `2px` | Border radius of the option bars |
| `--poll-bar-color` | `#6495ED` | Colour of the option bars |
| `--poll-vote-color` | `white` | Colour of the vote counts |

## Development

```bash
npm install
npm run dev     # demo page at http://localhost:3000
npm run build   # builds the demo into dist/
```

The demo lives in `demo/`. GitHub Pages has no backend, so the demo answers the poll's API calls in the browser.
Pushing to `main` builds it and deploys it to GitHub Pages.

## License

ISC
