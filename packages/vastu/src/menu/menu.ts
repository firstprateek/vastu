import { LitElement, css, html, type PropertyDeclarations, type PropertyValues } from 'lit';
import { focusRing } from '../core/focus-ring.js';
import { checkTokensLoaded, devWarn } from '../core/warn.js';

/**
 * A button that opens a menu of actions, following the WAI-ARIA menu button pattern.
 *
 * @tag va-menu
 * @summary Opens a short list of actions from a button, such as Edit, Duplicate and Delete.
 *
 * @slot - The menu items, as `<button value="…">` elements.
 *
 * @csspart trigger - The button that opens the menu.
 * @csspart menu - The popup list.
 *
 * @cssprop {<color>} --va-menu-bg - Background colour of the menu.
 * @cssprop {<length>} --va-menu-radius - Corner radius of the menu.
 * @cssprop {<color>} --va-menu-item-hover - Background colour of the focused or hovered item.
 *
 * @cssprop-applies --va-menu-bg menu:open background-color
 * @cssprop-applies --va-menu-radius menu:open border-top-left-radius
 * @cssprop-applies --va-menu-item-hover light([role="menuitem"]):focus background-color
 *
 * @keyboard-items [role="menuitem"]
 * @keyboard Enter | opens | Opens the menu and focuses the first item.
 * @keyboard Space | opens | Opens the menu and focuses the first item.
 * @keyboard ArrowDown | opens | Opens the menu and focuses the first item.
 * @keyboard open: ArrowDown | next | Moves to the next item, wrapping round.
 * @keyboard open: ArrowUp | previous | Moves to the previous item, wrapping round.
 * @keyboard open: Home | first | Moves to the first item.
 * @keyboard open: End | last | Moves to the last item.
 * @keyboard open: Enter | selects | Chooses the focused item and closes the menu.
 * @keyboard open: Escape | closes | Closes the menu and returns focus to the button.
 *
 * @a11y-role menu
 * @a11y-name-from label
 * @replaces [role="menu"]
 * @a11y-name The `label`, which is also the button's text.
 * @a11y-note The button has `aria-haspopup="menu"` and `aria-expanded`. Items get `role="menuitem"`.
 * @a11y-note Typing a letter moves to the next item that starts with it.
 *
 * @guidance-use For a few actions on one thing, when there isn't room to show them as buttons.
 * @guidance-avoid For navigation, for choosing a value in a form, or for one or two actions.
 * @guidance-instead Links for navigation; a select or radio group for form values; plain buttons for one or two actions.
 *
 * @fires va-select - When the user chooses an item. `event.detail.value` is the item's `value`; `event.detail.item` is the item.
 * @event-trigger va-select | press Enter | open
 */
export class VaMenu extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    label: {},
    variant: { reflect: true },
    placement: { reflect: true },
  };

  /** Whether the menu is open. */
  declare open: boolean;
  /** The button's text, and the menu's accessible name. */
  declare label: string;
  /** The button's look, as for `va-button`. */
  declare variant: 'secondary' | 'ghost';
  /** Which edge of the button the menu lines up with. */
  declare placement: 'bottom-start' | 'bottom-end';

  #focusLast = false;

  constructor() {
    super();
    this.open = false;
    this.label = '';
    this.variant = 'secondary';
    this.placement = 'bottom-start';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    checkTokensLoaded(this);
    window.addEventListener('resize', this.#position);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.#position);
  }

  get #items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(':scope > button, :scope > [role="menuitem"]')].filter((i) => !i.hasAttribute('disabled'));
  }

  get #menu(): HTMLElement | null {
    return this.shadowRoot?.querySelector('[part="menu"]') ?? null;
  }

  get #trigger(): HTMLElement | null {
    return this.shadowRoot?.querySelector('[part="trigger"]') ?? null;
  }

  override firstUpdated(): void {
    if (!this.label) devWarn('va-menu', 'This menu has no label, so its button is empty.', 'Add label="…" that names the actions (e.g. label="Actions").');
  }

  override updated(changed: PropertyValues): void {
    if (!changed.has('open')) return;
    const menu = this.#menu;
    if (!menu) return;
    if (this.open && !menu.matches(':popover-open')) {
      menu.showPopover();
      this.#position();
      const items = this.#items;
      items[this.#focusLast ? items.length - 1 : 0]?.focus();
      this.#focusLast = false;
    } else if (!this.open && menu.matches(':popover-open')) {
      menu.hidePopover();
    }
  }

  #syncItems = (): void => {
    for (const item of this.querySelectorAll<HTMLElement>(':scope > button')) {
      item.setAttribute('role', 'menuitem');
      item.tabIndex = -1;
      (item as HTMLButtonElement).type = 'button';
    }
    if ([...this.children].some((c) => c.localName !== 'button' && c.getAttribute('role') !== 'menuitem')) {
      devWarn('va-menu', 'A menu item is not a <button>.', 'Use <button value="…">Label</button> for each item.');
    }
  };

  /** Places the menu under the button, flipping above it near the bottom of the window. */
  #position = (): void => {
    const menu = this.#menu;
    const trigger = this.#trigger;
    if (!menu || !trigger || !this.open) return;
    const t = trigger.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const gap = 4;
    const below = t.bottom + gap + m.height <= window.innerHeight || t.top < m.height + gap;
    const top = below ? t.bottom + gap : t.top - gap - m.height;
    let left = this.placement === 'bottom-end' ? t.right - m.width : t.left;
    left = Math.max(8, Math.min(left, window.innerWidth - m.width - 8));
    // CSSOM writes, not a style attribute, so a strict CSP allows them.
    menu.style.top = `${Math.round(top)}px`;
    menu.style.left = `${Math.round(left)}px`;
  };

  #onToggle(event: ToggleEvent): void {
    // The popover closes itself on Escape or an outside click: keep `open` in step and return focus.
    if (event.newState === 'closed' && this.open) {
      this.open = false;
      if (this.matches(':focus-within') || document.activeElement === document.body) this.#trigger?.focus();
    }
  }

  #onTriggerKeydown(event: KeyboardEvent): void {
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      this.#focusLast = event.key === 'ArrowUp';
      this.open = true;
    }
  }

  #onTriggerClick(): void {
    this.open = !this.open;
  }

  #onMenuKeydown(event: KeyboardEvent): void {
    const items = this.#items;
    const current = items.indexOf(event.target as HTMLElement);
    const go = (i: number) => items[(i + items.length) % items.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        go(current + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        go(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        go(0);
        break;
      case 'End':
        event.preventDefault();
        go(items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        this.open = false;
        this.#trigger?.focus();
        break;
      case 'Tab':
        this.open = false;
        break;
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          // Typeahead: the next item whose text starts with the typed letter.
          const k = event.key.toLowerCase();
          const order = [...items.slice(current + 1), ...items.slice(0, current + 1)];
          order.find((i) => i.textContent?.trim().toLowerCase().startsWith(k))?.focus();
        }
    }
  }

  #onMenuClick(event: MouseEvent): void {
    const item = this.#items.find((i) => event.composedPath().includes(i));
    if (!item) return;
    this.dispatchEvent(
      new CustomEvent('va-select', {
        detail: { value: (item as HTMLButtonElement).value ?? item.textContent?.trim(), item },
        bubbles: true,
        composed: true,
      })
    );
    this.open = false;
    this.#trigger?.focus();
  }

  override render() {
    return html`
      <button
        part="trigger"
        class="trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded=${this.open ? 'true' : 'false'}
        aria-controls="menu"
        @click=${this.#onTriggerClick}
        @keydown=${this.#onTriggerKeydown}
      >
        ${this.label}
        <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 6l4 4 4-4" /></svg>
      </button>
      <div
        part="menu"
        id="menu"
        class="menu"
        role="menu"
        aria-label=${this.label}
        popover="auto"
        @toggle=${this.#onToggle}
        @keydown=${this.#onMenuKeydown}
        @click=${this.#onMenuClick}
      >
        <slot @slotchange=${this.#syncItems}></slot>
      </div>
    `;
  }

  static override styles = [
    focusRing,
    css`
      :host {
        display: inline-block;
        vertical-align: middle;
        font-family: var(--va-font-family-ui);
      }
      :host([hidden]) {
        display: none;
      }
      .trigger {
        display: inline-flex;
        align-items: center;
        gap: var(--va-space-gap-md);
        min-height: var(--va-size-control-md);
        margin: 0;
        padding: 0 var(--va-space-inline-md) 0 var(--va-space-inline-lg);
        border: 1px solid var(--va-color-border-control);
        border-radius: var(--va-radius-control);
        background: transparent;
        color: var(--va-color-text-default);
        font: inherit;
        font-size: var(--va-font-size-md);
        font-weight: var(--va-font-weight-medium);
        cursor: pointer;
      }
      :host([variant='ghost']) .trigger {
        border-color: transparent;
        color: var(--va-color-accent-default);
      }
      .trigger:hover {
        background: var(--va-color-surface-subtle);
      }
      .trigger svg {
        width: 1rem;
        height: 1rem;
        transition: transform var(--va-motion-duration-fast) ease-out;
      }
      :host([open]) .trigger svg {
        transform: rotate(180deg);
      }
      .menu {
        position: fixed;
        inset: auto;
        margin: 0;
        min-width: 10rem;
        max-width: calc(100vw - 16px);
        padding: var(--va-space-gap-sm);
        border: 1px solid var(--va-color-border-subtle);
        border-radius: var(--va-menu-radius, var(--va-radius-surface));
        background-color: var(--va-menu-bg, var(--va-color-surface-default));
        color: var(--va-color-text-default);
        box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
      }
      .menu:popover-open {
        display: flex;
        flex-direction: column;
      }
      ::slotted(button) {
        display: block;
        width: 100%;
        min-height: var(--va-size-control-sm);
        margin: 0;
        padding: 0 var(--va-space-inline-md);
        border: none;
        border-radius: var(--va-radius-control);
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: var(--va-font-size-md);
        text-align: left;
        cursor: pointer;
      }
      ::slotted(button:hover),
      ::slotted(button:focus) {
        background-color: var(--va-menu-item-hover, var(--va-color-surface-subtle));
        outline: none;
      }
      ::slotted(button:focus-visible) {
        outline: var(--va-size-focus-ring, 2px) solid var(--va-color-focus);
        outline-offset: -2px;
      }
      @media (prefers-reduced-motion: reduce) {
        .trigger svg {
          transition: none;
        }
      }
      @media (forced-colors: active) {
        .menu {
          border: 1px solid CanvasText;
        }
        ::slotted(button:focus) {
          background-color: Highlight;
          color: HighlightText;
          forced-color-adjust: none;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'va-menu': VaMenu;
  }
}
