import { LitElement, css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { focusRing } from '../core/focus-ring.js';
import { checkTokensLoaded, devWarn } from '../core/warn.js';

/**
 * A site's main navigation bar: a brand link and links to pages. On narrow screens the links fold
 * behind a Menu button, following the WAI-ARIA disclosure navigation pattern.
 *
 * @tag va-navbar
 * @summary Shows a site's brand and main links in a bar that folds behind a Menu button on narrow screens.
 *
 * @slot - The links, as `<a href="…">` elements. Mark the current page's link with `aria-current="page"`.
 * @slot brand - The site's name or logo, as an `<a href="…">` to the home page.
 *
 * @csspart bar - The bar, which is the `<nav>` element.
 * @csspart toggle - The Menu button shown on narrow screens.
 * @csspart links - The wrapper around the links. On narrow screens it is the panel that opens.
 *
 * @cssprop {<color>} --va-navbar-bg - Background colour of the bar and of the open panel.
 * @cssprop {<color>} --va-navbar-border - Colour of the line under the bar.
 * @cssprop {<length>} --va-navbar-size - Minimum height of the bar.
 * @cssprop {<color>} --va-navbar-link-fg - Text colour of the links.
 * @cssprop {<color>} --va-navbar-indicator-border - Colour of the line that marks the current page's link.
 *
 * @cssprop-applies --va-navbar-bg bar background-color
 * @cssprop-applies --va-navbar-border bar border-bottom-color
 * @cssprop-applies --va-navbar-size bar min-height
 * @cssprop-applies --va-navbar-link-fg light(a:not([slot]):not([aria-current])) color
 * @cssprop-applies --va-navbar-indicator-border light([aria-current="page"]) border-bottom-color
 *
 * @keyboard open: Escape | closes | Closes the open panel of links and returns focus to the Menu button.
 *
 * @a11y-role navigation
 * @a11y-name-from accessible-label
 * @a11y-name The `accessible-label` attribute, such as "Main" (not shown). Needed when a page has more than one navigation landmark.
 * @a11y-note The bar is a `<nav>` landmark. The links keep their own names; mark the current page with `aria-current="page"`.
 * @a11y-note On narrow screens the Menu button has a visible label, `aria-expanded` and `aria-controls`. Escape, a click outside or moving focus away closes the panel.
 *
 * @guidance-use For a site's or app's main navigation: a brand link and up to about seven links to pages.
 * @guidance-avoid For actions that do something on the page, for switching views in one place, or for deep hierarchies of pages.
 * @guidance-instead `va-menu` for actions; `va-tabs` for views in one place; nested lists in a sidebar for deep navigation.
 */
export class VaNavbar extends LitElement {
  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    collapseBelow: { type: Number, attribute: 'collapse-below' },
    toggleLabel: { attribute: 'toggle-label' },
    accessibleLabel: { attribute: 'accessible-label' },
    _collapsed: { state: true },
  };

  /** Whether the panel of links is open. It only shows while the navbar is folded. */
  declare open: boolean;
  /** Width in pixels below which the links fold behind the Menu button. It is the navbar's own width, not the window's. */
  declare collapseBelow: number;
  /** Visible text of the Menu button. */
  declare toggleLabel: string;
  /** Accessible name of the navigation landmark. */
  declare accessibleLabel: string;

  declare private _collapsed: boolean;

  #internals: ElementInternals;
  #width = 0;
  #resize = new ResizeObserver(([entry]) => {
    this.#width = entry.contentRect.width;
    this.#measure();
  });

  constructor() {
    super();
    this.open = false;
    this.collapseBelow = 600;
    this.toggleLabel = 'Menu';
    this.accessibleLabel = '';
    this._collapsed = false;
    this.#internals = this.attachInternals();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    checkTokensLoaded(this);
    this.#resize.observe(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#resize.disconnect();
    this.#listen(false);
  }

  override firstUpdated(): void {
    // Measure before the first paint, so a phone never sees the wide layout flash.
    this.#width = this.getBoundingClientRect().width;
    this.#measure();
  }

  override willUpdate(changed: PropertyValues): void {
    if (changed.has('collapseBelow')) this.#measure();
    // Unfolding closes the panel, so it isn't open next time the navbar folds.
    if (changed.has('_collapsed') && !this._collapsed && changed.get('_collapsed') === true) this.open = false;
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('open')) this.#listen(this.open);
    if (changed.has('_collapsed')) {
      try {
        if (this._collapsed) this.#internals.states.add('collapsed');
        else this.#internals.states.delete('collapsed');
      } catch {
        // Browsers without CustomStateSet: the state is only for authors' styling.
      }
    }
  }

  #measure(): void {
    if (this.#width) this._collapsed = this.#width < this.collapseBelow;
  }

  #listen(on: boolean): void {
    if (on) {
      document.addEventListener('keydown', this.#onDocumentKeydown);
      document.addEventListener('pointerdown', this.#onDocumentPointerdown);
    } else {
      document.removeEventListener('keydown', this.#onDocumentKeydown);
      document.removeEventListener('pointerdown', this.#onDocumentPointerdown);
    }
  }

  get #toggle(): HTMLButtonElement | null {
    return this.shadowRoot?.querySelector('[part="toggle"]') ?? null;
  }

  #onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.open) return;
    const hadFocus = this.matches(':focus-within');
    this.open = false;
    if (hadFocus && this._collapsed) this.#toggle?.focus();
  };

  #onDocumentPointerdown = (event: PointerEvent): void => {
    if (!event.composedPath().includes(this)) this.open = false;
  };

  #onFocusout(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (this._collapsed && this.open && next && !this.contains(next) && !this.shadowRoot!.contains(next)) this.open = false;
  }

  #onLinksClick(event: MouseEvent): void {
    // Following a link closes the panel, so it isn't left open over the page that loads.
    if (this._collapsed && event.composedPath().some((n) => (n as Element).localName === 'a')) this.open = false;
  }

  #onSlotchange = (): void => {
    for (const link of this.querySelectorAll(':scope > a:not([href])')) {
      devWarn('va-navbar', `The link "${link.textContent?.trim()}" has no href, so it can't be reached with the keyboard.`, 'Give every link an href (e.g. <a href="/work">Work</a>).');
    }
    if ([...this.children].some((c) => !c.slot && c.localName !== 'a')) {
      devWarn('va-navbar', 'Something other than a link is in the navbar.', 'Put only <a href="…"> elements in va-navbar; use va-menu or va-button for actions.');
    }
  };

  override render() {
    const folded = this._collapsed;
    return html`
      <nav part="bar" class=${folded ? 'bar collapsed' : 'bar'} aria-label=${this.accessibleLabel || nothing} @focusout=${this.#onFocusout}>
        <div class="brand"><slot name="brand"></slot></div>
        <button
          part="toggle"
          class="toggle"
          type="button"
          ?hidden=${!folded}
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-controls="links"
          @click=${() => (this.open = !this.open)}
        >
          <span class="icon" aria-hidden="true"><span></span><span></span><span></span></span>
          ${this.toggleLabel}
        </button>
        <div part="links" id="links" class=${this.open ? 'links open' : 'links'} @click=${this.#onLinksClick}>
          <slot @slotchange=${this.#onSlotchange}></slot>
        </div>
      </nav>
    `;
  }

  static override styles = [
    focusRing,
    css`
      :host {
        display: block;
        box-sizing: border-box;
        width: 100%;
        position: relative;
        z-index: 1;
        font-family: var(--va-font-family-ui);
        font-size: var(--va-font-size-md);
      }
      :host([hidden]) {
        display: none;
      }
      .bar {
        position: relative;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: var(--va-space-inline-lg);
        min-height: var(--va-navbar-size, 3.5rem);
        padding: 0 var(--va-space-inline-lg);
        border-bottom: 1px solid var(--va-navbar-border, var(--va-color-border-subtle));
        background-color: var(--va-navbar-bg, var(--va-color-surface-default));
        color: var(--va-color-text-default);
      }
      .brand {
        flex: none;
        margin-inline-end: auto;
      }
      ::slotted([slot='brand']) {
        color: inherit;
        font-size: var(--va-font-size-lg);
        font-weight: var(--va-font-weight-bold);
        text-decoration: none;
      }
      .links {
        display: flex;
        align-items: stretch;
        align-self: stretch;
        gap: var(--va-space-gap-sm);
      }
      slot:not([name])::slotted(a) {
        display: flex;
        align-items: center;
        padding: 0 var(--va-space-inline-sm);
        border-top: 2px solid transparent;
        border-bottom: 2px solid transparent;
        color: var(--va-navbar-link-fg, var(--va-color-text-muted));
        font-weight: var(--va-font-weight-medium);
        text-decoration: none;
      }
      slot:not([name])::slotted(a:hover) {
        color: var(--va-color-text-default);
      }
      slot:not([name])::slotted([aria-current='page']) {
        border-bottom-color: var(--va-navbar-indicator-border, var(--va-color-accent-default));
        color: var(--va-color-text-default);
      }
      ::slotted(a:focus-visible) {
        outline: var(--va-size-focus-ring, 2px) solid var(--va-color-focus);
        outline-offset: -2px;
        border-radius: var(--va-radius-control);
      }

      /* Folded: brand and Menu button in the bar, the links in a panel under it. */
      .toggle {
        display: inline-flex;
        align-items: center;
        gap: var(--va-space-gap-md);
        min-height: var(--va-size-control-md);
        margin: 0 calc(-1 * var(--va-space-inline-sm));
        padding: 0 var(--va-space-inline-sm);
        border: none;
        border-radius: var(--va-radius-control);
        background: transparent;
        color: inherit;
        font: inherit;
        font-weight: var(--va-font-weight-medium);
        cursor: pointer;
      }
      .toggle[hidden] {
        display: none;
      }
      .toggle:hover {
        background: var(--va-color-surface-subtle);
      }
      .icon {
        position: relative;
        width: 1.125rem;
        height: 0.875rem;
      }
      .icon span {
        position: absolute;
        left: 0;
        width: 100%;
        height: 2px;
        border-radius: 1px;
        background: currentColor;
        transition:
          transform var(--va-motion-duration-fast) ease-out,
          opacity var(--va-motion-duration-fast) ease-out;
      }
      .icon span:nth-child(1) {
        top: 0;
      }
      .icon span:nth-child(2) {
        top: calc(50% - 1px);
      }
      .icon span:nth-child(3) {
        bottom: 0;
      }
      [aria-expanded='true'] .icon span:nth-child(1) {
        transform: translateY(0.375rem) rotate(45deg);
      }
      [aria-expanded='true'] .icon span:nth-child(2) {
        opacity: 0;
      }
      [aria-expanded='true'] .icon span:nth-child(3) {
        transform: translateY(-0.375rem) rotate(-45deg);
      }
      .collapsed .links {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        display: none;
        flex-direction: column;
        gap: 0;
        padding: var(--va-space-gap-sm) 0;
        border-bottom: 1px solid var(--va-navbar-border, var(--va-color-border-subtle));
        background-color: var(--va-navbar-bg, var(--va-color-surface-default));
        box-shadow: 0 12px 24px rgb(0 0 0 / 0.12);
      }
      .collapsed .links.open {
        display: flex;
        animation: va-navbar-open var(--va-motion-duration-fast) ease-out;
      }
      .collapsed slot:not([name])::slotted(a) {
        min-height: var(--va-size-control-lg);
        padding: 0 var(--va-space-inline-lg);
        border-top: none;
        border-bottom: none;
        border-inline-start: 3px solid transparent;
      }
      .collapsed slot:not([name])::slotted([aria-current='page']) {
        border-inline-start-color: var(--va-navbar-indicator-border, var(--va-color-accent-default));
      }
      @keyframes va-navbar-open {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .icon span {
          transition: none;
        }
        .collapsed .links.open {
          animation: none;
        }
      }
      @media (forced-colors: active) {
        .bar,
        .collapsed .links {
          border-bottom-color: CanvasText;
        }
        slot:not([name])::slotted([aria-current='page']) {
          border-color: Highlight;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'va-navbar': VaNavbar;
  }
}
