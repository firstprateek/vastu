import { LitElement, html, css } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { timeAgo } from '../lib/time-ago.js';

/**
 * Poll widget: <poll-widget></poll-widget>.
 *
 * An embeddable poll. It works in two modes:
 *
 * - Local: without `requestAPI`, the poll shows `question` and `options` and counts votes in the browser.
 * - Remote: with `requestAPI`, the poll loads its question and results from a GET request to that URL,
 *   and casts votes with a PATCH request to `voteAPI` whose JSON body is `{ "id": <option id> }`.
 *   Both requests must return JSON in this shape:
 *
 *   {
 *     question: 'What is your favorite JS view library?',
 *     options: [
 *       { id: 1, text: 'Lit', votes: 500 },  // id: unique number or string
 *       ...
 *     ]
 *   }
 *
 * @property requestAPI {String} - URL to load the poll from. Attribute: requestapi.
 * @property voteAPI {String} - URL to cast votes to. Attribute: voteapi.
 * @property question {String} - The question (local mode, or until the API answers).
 * @property options {Array} - The options, as [{ id, text, votes? }] (local mode, or until the API answers).
 * @property width {Number} - Width in pixels; by default the poll fills its container.
 * @property height {Number} - Height in pixels; by default it fits its content.
 * @property updateFrequency {Number} - Minutes between reloads from requestAPI, default 60. Attribute: updatefrequency.
 * @property timeAgo {Boolean} - Show when the results were last updated, default true. Set the attribute to "false" to hide it. Attribute: timeago.
 *
 * @fires submit - When the user votes. event.detail.id is the chosen option's id.
 *
 * @cssproperty --poll-background-color - Background of the poll, default purple.
 * @cssproperty --poll-color - Text colour, default white.
 * @cssproperty --poll-font-size - Font size; the question is 1.5em, default 16px.
 * @cssproperty --poll-border-radius - Border radius of the poll, default 5px.
 * @cssproperty --poll-bar-border-radius - Border radius of the option bars, default 2px.
 * @cssproperty --poll-bar-color - Colour of the option bars, default cornflower blue.
 * @cssproperty --poll-vote-color - Colour of the vote counts, default white.
 */
export default class PollWidget extends LitElement {
  static styles = css`
    * {
      box-sizing: border-box;
    }

    :host {
      display: block;
      max-width: 100%;
      --background-color: var(--poll-background-color, purple);
      --color: var(--poll-color, white);
      --bar-color: var(--poll-bar-color, #6495ed);
      --vote-color: var(--poll-vote-color, white);
      --border-radius: var(--poll-border-radius, 5px);
      --bar-border-radius: var(--poll-bar-border-radius, 2px);
      --font-size: var(--poll-font-size, 16px);
    }

    .poll {
      max-width: 100%;
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      border-radius: var(--border-radius);
      background-color: var(--background-color);
      color: var(--color);
      font-size: var(--font-size);
    }

    h2 {
      margin: 0;
      padding: 10px 0 12px;
      font-size: 1.5em;
      line-height: 1.25;
    }

    ol {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .option {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 0;
      border: none;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
    }

    button.option {
      cursor: pointer;
    }

    button.option:hover .bar {
      filter: brightness(1.1);
    }

    button.option:focus-visible {
      outline: 2px solid var(--color);
      outline-offset: 2px;
      border-radius: var(--bar-border-radius);
    }

    .bar {
      flex: none;
      width: 100%;
      min-width: fit-content;
      padding: 6px 8px;
      border-radius: var(--bar-border-radius);
      background-color: var(--bar-color);
    }

    .chosen .bar {
      font-weight: 600;
    }

    .votes {
      flex: none;
      color: var(--vote-color);
      font-variant-numeric: tabular-nums;
    }

    .footer {
      min-height: 1.2em;
      margin-top: 8px;
      font-size: 0.8em;
      text-align: right;
      opacity: 0.85;
    }

    .footer:empty {
      min-height: 0;
      margin: 0;
    }
  `;

  static properties = {
    requestAPI: {},
    voteAPI: {},
    width: { type: Number },
    height: { type: Number },
    question: {},
    options: { type: Array },
    updateFrequency: { type: Number },
    timeAgo: { converter: { fromAttribute: (value) => value !== 'false' } },
    _showResults: { state: true },
    _chosenId: { state: true },
    _updateTime: { state: true },
    _error: { state: true },
  };

  constructor() {
    super();
    this.requestAPI = '';
    this.voteAPI = '';
    this.width = 0;
    this.height = 0;
    this.question = 'What is your favorite JS view library?';
    this.options = [
      { id: 1, text: 'Lit' },
      { id: 2, text: 'React' },
      { id: 3, text: 'Angular' },
    ];
    this.updateFrequency = 60;
    this.timeAgo = true;
    this._showResults = false;
    this._chosenId = undefined;
    this._updateTime = new Date();
    this._error = '';
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.requestAPI) {
      this.updatePollResults();
      this.setupPollUpdater();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.teardownPollUpdater();
  }

  updated(changedProperties) {
    if (this._showResults && (changedProperties.has('options') || changedProperties.has('_showResults'))) {
      this._animateBars();
    }
  }

  _animateBars() {
    const counts = this.options.map((option) => Number(option.votes) || 0);
    const largest = Math.max(...counts, 1);
    // The biggest bar takes 85% of the row, leaving room for the vote count.
    this.options.forEach((option, idx) => {
      const bar = this.renderRoot.querySelector(`[data-option-id="${CSS.escape(String(option.id))}"] .bar`);
      bar?.animate([{ width: `${(counts[idx] / largest) * 85}%` }], {
        duration: 400,
        easing: 'ease-out',
        fill: 'forwards',
      });
    });
  }

  render() {
    const dimensions = {
      width: this.width ? `${this.width}px` : 'auto',
      height: this.height ? `${this.height}px` : 'auto',
    };

    return html`
      <section class="poll" style=${styleMap(dimensions)} aria-labelledby="question">
        <h2 id="question">${this.question}</h2>
        <ol>
          ${this.options.map((option) => html`
            <li data-option-id=${option.id}>${this._optionTemplate(option)}</li>
          `)}
        </ol>
        <div class="footer" aria-live="polite">${this._footerTemplate()}</div>
      </section>
    `;
  }

  _optionTemplate(option) {
    const chosen = option.id === this._chosenId ? 'chosen' : '';
    if (this._showResults) {
      return html`
        <div class="option ${chosen}">
          <span class="bar">${option.text}</span>
          <span class="votes">${Number(option.votes) || 0}</span>
        </div>
      `;
    }
    return html`
      <button type="button" class="option" @click=${() => this.vote(option.id)}>
        <span class="bar">${option.text}</span>
      </button>
    `;
  }

  _footerTemplate() {
    if (this._error) {
      return this._error;
    }
    if (this.timeAgo && this._showResults) {
      return html`Updated ${timeAgo(this._updateTime)}`;
    }
    return '';
  }

  async vote(id) {
    if (this._showResults) {
      return;
    }

    this._chosenId = id;
    this._showResults = true;
    this.dispatchEvent(new CustomEvent('submit', { detail: { id }, bubbles: true, composed: true }));

    if (this.voteAPI) {
      await this.castVote(id);
    } else {
      this.options = this.options.map((option) =>
        option.id === id ? { ...option, votes: (Number(option.votes) || 0) + 1 } : option
      );
      this._updateTime = new Date();
    }
  }

  async updatePollResults() {
    try {
      const response = await fetch(this.requestAPI);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.updateView(await response.json());
    } catch (error) {
      this._error = 'Could not load the poll results.';
      console.warn('poll-widget: loading results failed', error);
    }
  }

  async castVote(id) {
    try {
      const response = await fetch(this.voteAPI, {
        method: 'PATCH',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.updateView(await response.json());
    } catch (error) {
      this._error = 'Your vote could not be sent.';
      console.warn('poll-widget: casting the vote failed', error);
    }
  }

  updateView(result) {
    this.question = result.question;
    this.options = result.options;
    this._updateTime = new Date();
    this._error = '';
  }

  setupPollUpdater() {
    if (!this._intervalTimer && this.updateFrequency > 0) {
      this._intervalTimer = setInterval(() => this.updatePollResults(), this.updateFrequency * 60 * 1000);
    }
  }

  teardownPollUpdater() {
    clearInterval(this._intervalTimer);
    this._intervalTimer = undefined;
  }
}

if (!customElements.get('poll-widget')) {
  customElements.define('poll-widget', PollWidget);
}
