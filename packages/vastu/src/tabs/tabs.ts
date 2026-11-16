import { LitElement, css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { checkTokensLoaded, devWarn } from '../core/warn.js';

let nextId = 0;

/**
 * Tabs that switch between panels of related content, following the WAI-ARIA tabs pattern.
 *
 * @tag va-tabs
 * @summary Switches between panels of related content in the same place on the page.
 *
 * @slot tab - The tabs, as `<button slot="tab">` elements, in order.
 * @slot panel - The panels, as elements with `slot="panel"`, in the same order as the tabs.
 *
 * @csspart tablist - The row of tabs.
 * @csspart panels - The wrapper around the panels.
 *
 * @cssprop {<color>} --va-tabs-border - Colour of the line under the row of tabs.
 * @cssprop {<color>} --va-tabs-indicator-border - Colour of the selected tab's underline.
 * @cssprop {<color>} --va-tabs-fg - Text colour of tabs that aren't selected.
 *
 * @cssprop-applies --va-tabs-border tablist border-bottom-color
 * @cssprop-applies --va-tabs-indicator-border light([aria-selected="true"]) border-bottom-color
 * @cssprop-applies --va-tabs-fg light([aria-selected="false"]) color
 *
 * @keyboard-items [slot="tab"]
 * @keyboard items: ArrowRight | next | Moves to the next tab, wrapping round. Selects it unless `activation="manual"`.
 * @keyboard items: ArrowLeft | previous | Moves to the previous tab, wrapping round.
 * @keyboard items: Home | first | Moves to the first tab.
 * @keyboard items: End | last | Moves to the last tab.
 * @keyboard items: Enter | activates | Selects the focused tab (needed when `activation="manual"`).
 * @keyboard items: Tab | focus-next | Moves focus from the tabs into the selected panel.
 *
 * @a11y-role tablist
 * @a11y-name-from accessible-label
 * @replaces [role="tablist"]
 * @a11y-name The `accessible-label` attribute, such as "Account settings" (not shown).
 * @a11y-note Each tab gets `role="tab"`, `aria-selected` and `aria-controls`; each panel gets `role="tabpanel"` and `aria-labelledby`.
 * @a11y-note Only the selected tab is in the Tab order (roving tabindex); arrow keys move between tabs.
 *
 * @guidance-use To switch between a few views of related content in one place, such as sections of a settings page.
 * @guidance-avoid For navigation between pages, for steps in a sequence, or for more than about 6 tabs.
 * @guidance-instead Links for navigation; a stepper for sequences; a list or menu for many options.
 *
 * @fires {CustomEvent<{ index: number, tab: HTMLElement }>} va-select - When the user selects a different tab. `event.detail.index` is its index; `event.detail.tab` is the tab.
 * @event-trigger va-select | click-item 2
 */
export class VaTabs extends LitElement {
  static override properties: PropertyDeclarations = {
    selectedIndex: { type: Number, reflect: true, attribute: 'selected-index' },
    activation: { reflect: true },
    accessibleLabel: { attribute: 'accessible-label' },
  };

  /** The index of the selected tab, from 0. Kept within the tabs that exist. */
  declare selectedIndex: number;
  /** `automatic` selects a tab as soon as it gets focus; `manual` waits for Enter or Space. */
  declare activation: 'automatic' | 'manual';
  /** Accessible name of the row of tabs. */
  declare accessibleLabel: string;

  #id = `va-tabs-${nextId++}`;

  constructor() {
    super();
    this.selectedIndex = 0;
    this.activation = 'automatic';
    this.accessibleLabel = '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    checkTokensLoaded(this);
  }

  get #tabs(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(':scope > [slot="tab"]')];
  }

  get #panels(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(':scope > [slot="panel"]')];
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('selectedIndex') || changed.has('accessibleLabel')) this.#sync();
  }

  #sync = (): void => {
    const tabs = this.#tabs;
    const panels = this.#panels;
    if (tabs.length && tabs.length !== panels.length) {
      devWarn('va-tabs', `It has ${tabs.length} tabs but ${panels.length} panels.`, 'Give every <button slot="tab"> a matching element with slot="panel", in the same order.');
    }
    if (tabs.some((t) => t.localName !== 'button')) {
      devWarn('va-tabs', 'A tab is not a <button>, so it may not be keyboard accessible.', 'Use <button slot="tab">Label</button> for each tab.');
    }
    if (tabs.length && !this.accessibleLabel) {
      devWarn('va-tabs', 'The tabs have no accessible name.', 'Add accessible-label="…" that names the group (e.g. accessible-label="Account settings").');
    }
    const selected = Math.min(Math.max(this.selectedIndex, 0), Math.max(tabs.length - 1, 0));
    // Keep the property honest: selected-index="5" with three tabs selects, and reads, 2.
    if (tabs.length && selected !== this.selectedIndex) this.selectedIndex = selected;
    tabs.forEach((tab, i) => {
      tab.id ||= `${this.#id}-tab-${i}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(i === selected));
      tab.tabIndex = i === selected ? 0 : -1;
      if (tab.localName === 'button') (tab as HTMLButtonElement).type = 'button';
    });
    panels.forEach((panel, i) => {
      panel.id ||= `${this.#id}-panel-${i}`;
      panel.setAttribute('role', 'tabpanel');
      panel.hidden = i !== selected;
      if (!panel.hasAttribute('tabindex')) panel.tabIndex = 0;
      if (tabs[i]) {
        panel.setAttribute('aria-labelledby', tabs[i].id);
        tabs[i].setAttribute('aria-controls', panel.id);
      }
    });
  };

  #select(index: number, focus: boolean): void {
    const tabs = this.#tabs;
    if (!tabs.length) return;
    const next = (index + tabs.length) % tabs.length;
    if (focus) tabs[next].focus();
    if (next !== this.selectedIndex) {
      this.selectedIndex = next;
      this.dispatchEvent(new CustomEvent('va-select', { detail: { index: next, tab: tabs[next] }, bubbles: true, composed: true }));
    }
  }

  #focusTab(index: number): void {
    const tabs = this.#tabs;
    const next = (index + tabs.length) % tabs.length;
    if (this.activation === 'automatic') {
      this.#select(next, true);
    } else {
      tabs.forEach((t, i) => (t.tabIndex = i === next ? 0 : -1));
      tabs[next].focus();
    }
  }

  #onKeydown(event: KeyboardEvent): void {
    const tabs = this.#tabs;
    const current = tabs.indexOf(event.target as HTMLElement);
    if (current < 0) return;
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
    if (event.key in moves) {
      event.preventDefault();
      this.#focusTab(moves[event.key]);
    }
  }

  #onClick(event: MouseEvent): void {
    const tab = this.#tabs.find((t) => event.composedPath().includes(t));
    if (tab) this.#select(this.#tabs.indexOf(tab), true);
  }

  override render() {
    return html`
      <div part="tablist" class="tablist" role="tablist" aria-label=${this.accessibleLabel || nothing} @keydown=${this.#onKeydown} @click=${this.#onClick}>
        <slot name="tab" @slotchange=${this.#sync}></slot>
      </div>
      <div part="panels" class="panels">
        <slot name="panel" @slotchange=${this.#sync}></slot>
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      font-family: var(--va-font-family-ui);
      color: var(--va-color-text-default);
    }
    :host([hidden]) {
      display: none;
    }
    .tablist {
      display: flex;
      gap: var(--va-space-gap-md);
      overflow-x: auto;
      border-bottom: 1px solid var(--va-tabs-border, var(--va-color-border-subtle));
    }
    ::slotted([slot='tab']) {
      flex: none;
      min-height: var(--va-size-control-md);
      margin: 0 0 -1px;
      padding: 0 var(--va-space-inline-md);
      border: none;
      border-bottom: 2px solid transparent;
      background: none;
      color: var(--va-tabs-fg, var(--va-color-text-muted));
      font: inherit;
      font-size: var(--va-font-size-md);
      cursor: pointer;
    }
    ::slotted([slot='tab']:hover) {
      color: var(--va-color-text-default);
    }
    ::slotted([aria-selected='true']) {
      border-bottom-color: var(--va-tabs-indicator-border, var(--va-color-accent-default));
      color: var(--va-color-text-default);
      font-weight: var(--va-font-weight-medium);
    }
    ::slotted([slot='tab']:focus-visible) {
      outline: var(--va-size-focus-ring, 2px) solid var(--va-color-focus);
      outline-offset: -2px;
    }
    .panels {
      padding-top: var(--va-space-inline-lg);
    }
    ::slotted([slot='panel']:focus-visible) {
      outline: var(--va-size-focus-ring, 2px) solid var(--va-color-focus);
      outline-offset: 4px;
    }
    @media (forced-colors: active) {
      ::slotted([aria-selected='true']) {
        border-bottom-color: Highlight;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'va-tabs': VaTabs;
  }
}
