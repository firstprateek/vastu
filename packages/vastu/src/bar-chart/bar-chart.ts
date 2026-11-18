import { LitElement, css, html, type PropertyDeclarations, type PropertyValues } from 'lit';
import { cssom } from '../core/cssom.js';
import { checkTokensLoaded, devWarn } from '../core/warn.js';

/** A step of 1, 2 or 5 times a power of ten that splits `range` into about `count` parts. */
function niceStep(range: number, count: number): number {
  const raw = range / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const f = raw / power;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * power;
}

/**
 * A bar chart that compares values across a few categories. The data is plain markup, and the
 * bars animate when it changes, so it can follow live values.
 *
 * @tag va-bar-chart
 * @summary Compares a number across a few categories, one bar per category.
 *
 * @slot - The data, as `<data value="N">Category</data>` elements, in order. Change them and the bars animate to the new values.
 *
 * @csspart label - The chart's title.
 * @csspart plot - The area the bars are drawn in.
 * @csspart bar - Each bar.
 * @csspart axis - The value labels along the left edge.
 *
 * @cssprop {<color>} --va-bar-chart-bar-bg - Colour of the bars.
 * @cssprop {<length>} --va-bar-chart-bar-radius - Corner radius of the bars' outer end.
 * @cssprop {<length>} --va-bar-chart-size - Height of the plot area.
 *
 * @cssprop-applies --va-bar-chart-bar-bg bar background-color
 * @cssprop-applies --va-bar-chart-bar-radius bar border-top-left-radius
 * @cssprop-applies --va-bar-chart-size plot height
 *
 * @keyboard-items data
 * @keyboard items: ArrowRight | next | Moves to the next bar, wrapping round.
 * @keyboard items: ArrowLeft | previous | Moves to the previous bar, wrapping round.
 * @keyboard items: Home | first | Moves to the first bar.
 * @keyboard items: End | last | Moves to the last bar.
 *
 * @a11y-role figure
 * @a11y-name-from label
 * @a11y-name The `label`, which is the chart's visible title.
 * @a11y-note Each `<data>` element is in the Tab order once (roving tabindex) and is announced as "Category: value". Arrow keys move between bars.
 * @a11y-note The value axis is hidden from assistive technology, because every bar announces its own value.
 *
 * @guidance-use To compare one number across a few categories (up to about 12), such as visitors per day or sales per region.
 * @guidance-avoid For trends over many points in time, for parts of a whole, or when readers need to look up exact values.
 * @guidance-instead A line chart for trends; a table when exact values matter.
 */
export class VaBarChart extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    label: {},
    max: { type: Number },
    _revision: { state: true },
    _focused: { state: true },
  };

  /** The chart's title, shown above it. */
  declare label: string;
  /** The top of the value axis. 0 (the default) fits the axis to the data; set it to keep the scale steady while live values change. */
  declare max: number;

  declare private _revision: number;
  declare private _focused: number;
  #observer = new MutationObserver(() => this._revision++);

  constructor() {
    super();
    this.label = '';
    this.max = 0;
    this._revision = 0;
    this._focused = -1;
    this.addEventListener('keydown', this.#onKeydown);
    this.addEventListener('focusin', this.#onFocusin);
    this.addEventListener('focusout', () => (this._focused = -1));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    checkTokensLoaded(this);
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['value'] });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  get #items(): HTMLElement[] {
    return [...this.children] as HTMLElement[];
  }

  #valueOf(item: Element): number {
    const value = Number(item.getAttribute('value'));
    return Number.isFinite(value) ? value : 0;
  }

  get #format(): Intl.NumberFormat {
    return new Intl.NumberFormat(this.closest('[lang]')?.getAttribute('lang') || undefined);
  }

  override firstUpdated(): void {
    if (!this.label) devWarn('va-bar-chart', 'This chart has no label, so it has no title or accessible name.', 'Add label="…" that says what the bars show (e.g. label="Visitors per day").');
  }

  override updated(changed: PropertyValues): void {
    const items = this.#items;
    const slots = [...this.shadowRoot!.querySelectorAll<HTMLSlotElement>('slot')];
    items.forEach((item, i) => slots[i]?.assign(item));

    const format = this.#format;
    const current = Math.max(0, items.findIndex((i) => i.tabIndex === 0));
    items.forEach((item, i) => {
      item.tabIndex = i === current ? 0 : -1;
      item.setAttribute('role', 'img');
      item.setAttribute('aria-label', `${item.textContent?.trim()}: ${format.format(this.#valueOf(item))}`);
    });

    if (changed.has('_revision')) {
      if (items.some((i) => i.localName !== 'data')) {
        devWarn('va-bar-chart', 'A child is not a <data> element, so it is drawn as a bar with value 0.', 'Use <data value="N">Category</data> for each bar.');
      }
      for (const item of items.filter((i) => i.localName === 'data' && !Number.isFinite(Number(i.getAttribute('value') ?? 'x')))) {
        devWarn('va-bar-chart', `"${item.textContent?.trim()}" has value="${item.getAttribute('value') ?? ''}", which is not a number.`, 'Set value to a plain number, without units or separators (e.g. value="1200").');
      }
    }
  }

  #onFocusin = (event: FocusEvent): void => {
    const items = this.#items;
    const index = items.indexOf(event.target as HTMLElement);
    if (index < 0) return;
    items.forEach((item, i) => (item.tabIndex = i === index ? 0 : -1));
    this._focused = index;
  };

  #onKeydown = (event: KeyboardEvent): void => {
    const items = this.#items;
    const current = items.indexOf(event.target as HTMLElement);
    if (current < 0 || !items.length) return;
    const next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: items.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    items[(next + items.length) % items.length].focus();
  };

  override render() {
    const items = this.#items;
    const values = items.map((i) => this.#valueOf(i));
    const format = this.#format;

    // The axis always includes 0, so bars start from a baseline and their lengths compare honestly.
    let lo = Math.min(0, ...values);
    let hi = this.max > 0 ? this.max : Math.max(0, ...values);
    if (hi === lo) hi = lo + 1;
    const step = niceStep(hi - lo, 5);
    lo = Math.floor(lo / step) * step;
    if (!(this.max > 0)) hi = Math.ceil(hi / step) * step;
    const ticks: number[] = [];
    for (let t = lo; t <= hi + step / 1e6; t += step) ticks.push(Number(t.toPrecision(12)));
    const pos = (v: number) => ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * 100;

    return html`
      <div class="chart" role="figure" aria-labelledby="label">
        <div part="label" id="label" class="label">${this.label}</div>
        <div class="body">
          <div part="axis" class="axis" aria-hidden="true">
            ${ticks.map((t) => html`<span class="tick" ${cssom({ bottom: `${pos(t)}%` })}>${format.format(t)}</span>`)}
          </div>
          <div class="columns">
            <div part="plot" class="plot">
              ${ticks.map((t) => html`<span class=${t === 0 ? 'grid zero' : 'grid'} ${cssom({ bottom: `${pos(t)}%` })}></span>`)}
              ${values.map((v, i) => {
                const top = pos(Math.max(v, 0));
                const bottom = pos(Math.min(v, 0));
                return html`
                  <div class=${i === this._focused ? 'column focused' : 'column'}>
                    <span
                      part="bar"
                      class=${v < 0 ? 'bar negative' : 'bar'}
                      ${cssom({ bottom: `${bottom}%`, height: `${top - bottom}%` })}
                    ></span>
                    <span class="value" aria-hidden="true" ${cssom(v < 0 ? { top: `${100 - bottom}%` } : { bottom: `${top}%` })}>${format.format(v)}</span>
                  </div>
                `;
              })}
            </div>
            <div class="labels">${items.map(() => html`<div class="category"><slot></slot></div>`)}</div>
          </div>
        </div>
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      width: 100%;
      font-family: var(--va-font-family-ui);
      font-size: var(--va-font-size-sm);
      color: var(--va-color-text-default);
    }
    :host([hidden]) {
      display: none;
    }
    .label {
      margin-bottom: var(--va-space-gap-md);
      font-size: var(--va-font-size-md);
      font-weight: var(--va-font-weight-bold);
    }
    .body {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--va-space-gap-md);
    }
    .axis {
      position: relative;
      height: var(--va-bar-chart-size, 12rem);
      min-width: 2ch;
      color: var(--va-color-text-muted);
      font-variant-numeric: tabular-nums;
    }
    .tick {
      position: absolute;
      right: 0;
      transform: translateY(50%);
      line-height: 1;
      white-space: nowrap;
    }
    .columns {
      min-width: 0;
    }
    .plot {
      position: relative;
      display: flex;
      height: var(--va-bar-chart-size, 12rem);
    }
    .grid {
      position: absolute;
      left: 0;
      right: 0;
      border-top: 1px solid var(--va-color-border-subtle);
    }
    .grid.zero {
      border-top-color: var(--va-color-border-control);
    }
    .column {
      position: relative;
      flex: 1;
      min-width: 0;
    }
    .bar {
      position: absolute;
      left: 18%;
      right: 18%;
      border-radius: var(--va-bar-chart-bar-radius, 3px) var(--va-bar-chart-bar-radius, 3px) 0 0;
      background-color: var(--va-bar-chart-bar-bg, var(--va-color-accent-default));
      transition:
        height var(--va-motion-duration-slow) ease-out,
        bottom var(--va-motion-duration-slow) ease-out;
    }
    .bar.negative {
      border-radius: 0 0 var(--va-bar-chart-bar-radius, 3px) var(--va-bar-chart-bar-radius, 3px);
    }
    .column:hover .bar,
    .focused .bar {
      background-color: var(--va-bar-chart-bar-bg, var(--va-color-accent-hover));
      filter: brightness(1.1);
    }
    .value {
      position: absolute;
      left: 0;
      right: 0;
      padding: 2px 0;
      font-variant-numeric: tabular-nums;
      font-weight: var(--va-font-weight-medium);
      text-align: center;
      visibility: hidden;
    }
    .column:hover .value,
    .focused .value {
      visibility: visible;
    }
    .labels {
      display: flex;
      margin-top: var(--va-space-gap-sm);
    }
    .category {
      flex: 1;
      min-width: 0;
      text-align: center;
    }
    ::slotted(*) {
      display: block;
      overflow: hidden;
      padding: 2px;
      border-radius: var(--va-radius-control);
      color: var(--va-color-text-muted);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    ::slotted(:focus-visible) {
      outline: var(--va-size-focus-ring, 2px) solid var(--va-color-focus);
      outline-offset: 0;
      color: var(--va-color-text-default);
    }
    @media (prefers-reduced-motion: reduce) {
      .bar {
        transition: none;
      }
    }
    @media (forced-colors: active) {
      .bar {
        background-color: CanvasText;
        forced-color-adjust: none;
      }
      .grid {
        border-top-color: GrayText;
      }
      ::slotted(:focus-visible) {
        outline-color: Highlight;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'va-bar-chart': VaBarChart;
  }
}
