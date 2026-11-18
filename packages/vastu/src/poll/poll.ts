import { LitElement, css, html, type PropertyDeclarations, type PropertyValues } from 'lit';
import { cssom } from '../core/cssom.js';
import { focusRing } from '../core/focus-ring.js';
import { checkTokensLoaded, devWarn } from '../core/warn.js';

/**
 * A one-question poll. The user votes with one click, and the poll shows the results.
 *
 * @tag va-poll
 * @summary A poll: asks one question with a few answers. Visitors vote with one click and see everyone's results.
 *
 * @slot - The answers, as `<button value="…" data-votes="N">` elements. `data-votes` is the number of votes so far.
 * @slot help-text - Optional text under the poll, such as when it closes. Overrides the `help-text` attribute.
 *
 * @csspart label - The question.
 * @csspart option - The row around each answer.
 * @csspart bar - The bar behind each answer that shows its share of the votes.
 * @csspart result - The share of the votes, shown after voting.
 * @csspart help-text - The help text and the vote count.
 *
 * @cssprop {<color>} --va-poll-border - Border colour of each answer's row.
 * @cssprop {<length>} --va-poll-radius - Corner radius of each answer's row.
 * @cssprop {<color>} --va-poll-bar-bg - Colour of the result bars.
 *
 * @cssprop-applies --va-poll-border option border-top-color
 * @cssprop-applies --va-poll-radius option border-top-left-radius
 * @cssprop-applies --va-poll-bar-bg bar background-color
 *
 * @keyboard-items button
 * @keyboard items: Enter | activates | Votes for the focused answer.
 * @keyboard items: Space | activates | Votes for the focused answer.
 *
 * @a11y-role group
 * @a11y-name-from label
 * @a11y-name The `label`, which is the question shown above the answers.
 * @a11y-note After a vote the answers stay focusable but get `aria-disabled="true"`, and each is followed by its share of the votes. A polite live region announces that the vote was counted.
 *
 * @guidance-use For a quick, one-click opinion poll on a page, with two to six answers.
 * @guidance-avoid For choices that are submitted with a form, for surveys with several questions, or where users need to review their answer before sending it.
 * @guidance-instead A radio group in a form, with a submit `va-button`.
 *
 * @fires {CustomEvent<{ value: string, item: HTMLElement }>} va-select - When the user votes. `event.detail.value` is the answer's `value`, or its text when it has none; `event.detail.item` is the answer. Send the vote to your server here.
 * @event-trigger va-select | click-item 2
 */
export class VaPoll extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    label: {},
    value: {},
    showResults: { type: Boolean, reflect: true, attribute: 'show-results' },
    helpText: { attribute: 'help-text' },
    _revision: { state: true },
  };

  /** The question, shown above the answers. */
  declare label: string;
  /** The value of the answer the user voted for, or an empty string before a vote. Setting it shows the results with that answer marked, for a user who has already voted. */
  declare value: string;
  /** Shows the results without a vote, such as for a closed poll. */
  declare showResults: boolean;
  /** Text under the poll, such as when it closes. */
  declare helpText: string;

  declare private _revision: number;
  #announcement = '';
  #observer = new MutationObserver(() => this._revision++);

  constructor() {
    super();
    this.label = '';
    this.value = '';
    this.showResults = false;
    this.helpText = '';
    this._revision = 0;
    this.addEventListener('click', this.#onClick);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    checkTokensLoaded(this);
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-votes', 'value', 'slot'] });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  get #items(): HTMLElement[] {
    return [...this.children].filter((c): c is HTMLElement => !c.slot) as HTMLElement[];
  }

  get #showing(): boolean {
    return this.showResults || this.value !== '';
  }

  #valueOf(item: HTMLElement): string {
    return (item as HTMLButtonElement).value || item.textContent?.trim() || '';
  }

  #votesOf(item: HTMLElement): number {
    const votes = Number(item.dataset.votes ?? 0);
    return Number.isFinite(votes) && votes > 0 ? votes : 0;
  }

  override firstUpdated(): void {
    if (!this.label) devWarn('va-poll', 'This poll has no label, so its question is missing.', 'Add label="…" with the question (e.g. label="Tabs or spaces?").');
  }

  override updated(changed: PropertyValues): void {
    const items = this.#items;
    const slots = [...this.shadowRoot!.querySelectorAll<HTMLSlotElement>('slot:not([name])')];
    items.forEach((item, i) => slots[i]?.assign(item));
    this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="help-text"]')!.assign(...this.querySelectorAll(':scope > [slot="help-text"]'));

    const showing = this.#showing;
    for (const item of items) {
      if (item.localName === 'button') (item as HTMLButtonElement).type = 'button';
      if (showing) item.setAttribute('aria-disabled', 'true');
      else item.removeAttribute('aria-disabled');
      if (item.dataset.votes !== undefined && !(Number(item.dataset.votes) >= 0)) {
        devWarn('va-poll', `data-votes="${item.dataset.votes}" on "${item.textContent?.trim()}" is not a number of votes.`, 'Set data-votes to a whole number of 0 or more (e.g. data-votes="12").');
      }
    }
    if (changed.has('_revision') && items.some((c) => c.localName !== 'button')) {
      devWarn('va-poll', 'An answer is not a <button>, so it may not be keyboard accessible.', 'Use <button value="…" data-votes="N">Answer</button> for each answer.');
    }
  }

  #onClick = (event: MouseEvent): void => {
    const item = this.#items.find((i) => event.composedPath().includes(i));
    if (!item || this.#showing) return;
    // Count the vote here, so the results include it before the server answers.
    item.dataset.votes = String(this.#votesOf(item) + 1);
    this.value = this.#valueOf(item);
    const total = this.#items.reduce((sum, i) => sum + this.#votesOf(i), 0);
    this.#announcement = `Vote counted. ${total} ${total === 1 ? 'vote' : 'votes'} in total.`;
    this.dispatchEvent(new CustomEvent('va-select', { detail: { value: this.value, item }, bubbles: true, composed: true }));
  };

  override render() {
    const items = this.#items;
    const showing = this.#showing;
    const total = items.reduce((sum, i) => sum + this.#votesOf(i), 0);
    return html`
      <div class=${showing ? 'poll showing' : 'poll'} role="group" aria-labelledby="label">
        <div part="label" id="label" class="label">${this.label}</div>
        <ul class="options" role="list">
          ${items.map((item) => {
            const votes = this.#votesOf(item);
            const share = total ? Math.round((votes / total) * 100) : 0;
            const chosen = showing && this.value !== '' && this.#valueOf(item) === this.value;
            return html`
              <li part="option" class=${chosen ? 'option chosen' : 'option'}>
                <span part="bar" class="bar" ${cssom({ width: showing ? `${share}%` : '0%' })}></span>
                <slot></slot>
                <span part="result" class="result" ?hidden=${!showing}>
                  ${chosen ? html`<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8.5l3 3 7-7" /></svg>` : ''}
                  ${share}%<span class="visually-hidden">, ${votes} ${votes === 1 ? 'vote' : 'votes'}${chosen ? ', your vote' : ''}</span>
                </span>
              </li>
            `;
          })}
        </ul>
        <div part="help-text" class="footer">
          <span ?hidden=${!showing}>${total} ${total === 1 ? 'vote' : 'votes'}</span>
          <slot name="help-text">${this.helpText}</slot>
        </div>
        <div class="visually-hidden" role="status">${this.#announcement}</div>
      </div>
    `;
  }

  static override styles = [
    focusRing,
    css`
      :host {
        display: block;
        box-sizing: border-box;
        width: 100%;
        max-width: 32rem;
        font-family: var(--va-font-family-ui);
        font-size: var(--va-font-size-md);
        color: var(--va-color-text-default);
      }
      :host([hidden]) {
        display: none;
      }
      .label {
        margin-bottom: var(--va-space-gap-md);
        font-size: var(--va-font-size-lg);
        font-weight: var(--va-font-weight-bold);
        line-height: 1.3;
      }
      .options {
        display: flex;
        flex-direction: column;
        gap: var(--va-space-gap-sm);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .option {
        position: relative;
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        overflow: hidden;
        border: 1px solid var(--va-poll-border, var(--va-color-border-control));
        border-radius: var(--va-poll-radius, var(--va-radius-control));
        background: var(--va-color-surface-default);
      }
      .poll:not(.showing) .option:hover {
        background: var(--va-color-surface-subtle);
      }
      .bar {
        position: absolute;
        inset: 0 auto 0 0;
        background-color: var(--va-poll-bar-bg, color-mix(in srgb, var(--va-color-accent-default) 16%, transparent));
        transition: width var(--va-motion-duration-slow) ease-out;
      }
      .chosen .bar {
        background-color: var(--va-poll-bar-bg, color-mix(in srgb, var(--va-color-accent-default) 28%, transparent));
      }
      slot:not([name]) {
        display: contents;
      }
      ::slotted(button) {
        position: relative;
        box-sizing: border-box;
        width: 100%;
        min-height: var(--va-size-control-lg);
        margin: 0;
        padding: var(--va-space-gap-sm) var(--va-space-inline-md);
        border: none;
        border-radius: var(--va-poll-radius, var(--va-radius-control));
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
      }
      ::slotted(button:focus-visible) {
        outline: var(--va-size-focus-ring, 2px) solid var(--va-color-focus);
        outline-offset: -2px;
      }
      ::slotted([aria-disabled='true']) {
        cursor: default;
      }
      .chosen ::slotted(button) {
        font-weight: var(--va-font-weight-bold);
      }
      .result {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: var(--va-space-gap-sm);
        padding-inline-end: var(--va-space-inline-md);
        font-variant-numeric: tabular-nums;
        font-weight: var(--va-font-weight-medium);
        pointer-events: none;
      }
      .result[hidden] {
        display: none;
      }
      .result svg {
        width: 1rem;
        height: 1rem;
        color: var(--va-color-accent-default);
      }
      .footer {
        display: flex;
        flex-wrap: wrap;
        gap: 0 var(--va-space-gap-md);
        margin-top: var(--va-space-gap-md);
        color: var(--va-color-text-muted);
        font-size: var(--va-font-size-sm);
      }
      .footer [hidden] {
        display: none;
      }
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
      @media (prefers-reduced-motion: reduce) {
        .bar {
          transition: none;
        }
      }
      @media (forced-colors: active) {
        .option {
          border-color: CanvasText;
        }
        .bar {
          background-color: Highlight;
          opacity: 0.35;
          forced-color-adjust: none;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'va-poll': VaPoll;
  }
}
