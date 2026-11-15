import { LitElement, css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { focusRing } from '../core/focus-ring.js';
import { checkTokensLoaded, devWarn } from '../core/warn.js';

/** Why a dialog is closing, in the `va-close` event's `detail.reason`. */
export type DialogCloseReason = 'escape' | 'close-button' | 'command' | 'method';

/**
 * A modal dialog built on the native `<dialog>`: it sits in the top layer, makes the page behind it
 * inert, keeps focus inside, closes with Escape and returns focus to where it came from.
 *
 * @tag va-dialog
 * @summary Asks the user to confirm, decide or enter something before going back to the page.
 *
 * @slot - The dialog's content.
 * @slot footer - Actions, such as Cancel and Confirm buttons. Put the primary action last.
 *
 * @csspart dialog - The native dialog element.
 * @csspart header - The row with the heading and the close button.
 * @csspart heading - The heading.
 * @csspart close - The close button.
 * @csspart body - The wrapper around the content.
 * @csspart footer - The wrapper around the actions.
 *
 * @cssprop {<color>} --va-dialog-bg - Background colour.
 * @cssprop {<length>} --va-dialog-width - Maximum width.
 * @cssprop {<length>} --va-dialog-radius - Corner radius.
 *
 * @cssprop-applies --va-dialog-bg dialog:open background-color
 * @cssprop-applies --va-dialog-width dialog:open max-width
 * @cssprop-applies --va-dialog-radius dialog:open border-top-left-radius
 *
 * @keyboard open: Escape | closes | Closes the dialog and returns focus to the element that opened it.
 *
 * @a11y-role dialog
 * @a11y-name The `heading`, or `label` when there is no visible heading.
 * @a11y-note The page behind is inert while the dialog is open, so focus and screen readers stay inside it.
 * @a11y-note On open, focus goes to the first element with `autofocus`, else the first focusable control in the content, else the close button.
 *
 * @guidance-use For a decision the user must make before going on, such as confirming a deletion, or a short focused task.
 * @guidance-avoid For information that doesn't need a response, or for long, multi-step flows.
 * @guidance-instead `va-toast` for confirmations that need no response; a full page for long flows.
 *
 * @fires va-open - After the dialog opens.
 * @fires va-close - Before the dialog closes. Cancel it with `preventDefault()` to keep the dialog open. `event.detail.reason` is `escape`, `close-button`, `command` or `method`.
 * @event-trigger va-open | call show
 * @event-trigger va-close | press Escape | open
 */
export class VaDialog extends LitElement {
  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    heading: {},
    label: {},
    dismissible: { type: Boolean, reflect: true },
  };

  /** Whether the dialog is open. Prefer `show()` and `close()`, or `command="--show"` on a `va-button`. */
  declare open: boolean;
  /** The visible heading. It is also the dialog's accessible name. */
  declare heading: string;
  /** Accessible name, when there is no visible heading. */
  declare label: string;
  /** Shows a close button in the header. Escape always closes the dialog. */
  declare dismissible: boolean;

  #returnFocus: HTMLElement | null = null;

  constructor() {
    super();
    this.open = false;
    this.heading = '';
    this.label = '';
    this.dismissible = true;
    this.addEventListener('command', this.#onCommand as EventListener);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    checkTokensLoaded(this);
  }

  get #dialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  /** Opens the dialog as a modal. */
  show(): void {
    this.open = true;
  }

  /** Closes the dialog, unless a `va-close` listener cancels it. */
  close(): void {
    this.#requestClose('method');
  }

  #requestClose(reason: DialogCloseReason): void {
    if (!this.open) return;
    const event = new CustomEvent('va-close', { detail: { reason }, bubbles: true, composed: true, cancelable: true });
    if (!this.dispatchEvent(event)) return;
    this.open = false;
  }

  #onCommand = (event: Event & { command?: string; source?: Element | null }): void => {
    if (event.command === '--show' || event.command === 'show-modal') {
      // Safari doesn't focus a button on click, so remember the button that sent the command.
      if (event.source instanceof HTMLElement) this.#returnFocus = event.source;
      this.show();
    }
    else if (event.command === '--close' || event.command === 'close') this.#requestClose('command');
  };

  override async updated(changed: PropertyValues): Promise<void> {
    if (!changed.has('open')) return;
    const dialog = this.#dialog;
    if (!dialog) return;
    if (this.open && !dialog.open) {
      if (!this.#returnFocus) {
        let active = document.activeElement as HTMLElement | null;
        while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement as HTMLElement;
        this.#returnFocus = active;
      }
      if (!this.heading && !this.label) {
        devWarn('va-dialog', 'This dialog has no accessible name.', 'Add heading="…" (shown) or label="…" (not shown) that says what the dialog is for.');
      }
      dialog.showModal();
      this.#focusInitial();
      this.dispatchEvent(new Event('va-open', { bubbles: true, composed: true }));
    } else if (!this.open && dialog.open) {
      dialog.close();
      this.#returnFocus?.focus();
      this.#returnFocus = null;
    }
  }

  #focusInitial(): void {
    const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), va-button, va-text-field, va-checkbox, va-switch';
    const auto = this.querySelector<HTMLElement>('[autofocus]');
    const first = [...this.querySelectorAll<HTMLElement>(focusable)].find((el) => el.slot !== 'footer' && !el.hasAttribute('disabled'));
    const target = auto ?? first ?? this.shadowRoot?.querySelector<HTMLElement>('.close') ?? this.#dialog;
    target?.focus();
  }

  #onCancel(event: Event): void {
    // Escape: route through va-close so listeners can keep the dialog open.
    event.preventDefault();
    this.#requestClose('escape');
  }

  #onNativeClose(): void {
    // The browser closed the dialog itself (a repeated Escape, for example): keep `open` in step.
    if (this.open) this.open = false;
  }

  override render() {
    return html`
      <dialog
        part="dialog"
        aria-labelledby=${this.heading ? 'heading' : nothing}
        aria-label=${!this.heading && this.label ? this.label : nothing}
        @cancel=${this.#onCancel}
        @close=${this.#onNativeClose}
      >
        <div part="header" class="header">
          ${this.heading ? html`<h2 part="heading" id="heading" class="heading">${this.heading}</h2>` : html`<span part="heading" class="heading"></span>`}
          ${this.dismissible
            ? html`<button part="close" class="close" type="button" aria-label="Close" @click=${() => this.#requestClose('close-button')}>
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>`
            : nothing}
        </div>
        <div part="body" class="body"><slot></slot></div>
        <div part="footer" class="footer"><slot name="footer"></slot></div>
      </dialog>
    `;
  }

  static override styles = [
    focusRing,
    css`
      :host {
        display: contents;
      }
      dialog {
        box-sizing: border-box;
        width: calc(100% - 2rem);
        max-width: var(--va-dialog-width, 32rem);
        max-height: calc(100% - 2rem);
        padding: 0;
        border: 1px solid var(--va-color-border-subtle);
        border-radius: var(--va-dialog-radius, var(--va-radius-surface));
        background-color: var(--va-dialog-bg, var(--va-color-surface-default));
        color: var(--va-color-text-default);
        font-family: var(--va-font-family-ui);
        box-shadow: 0 12px 40px rgb(0 0 0 / 0.25);
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.45);
      }
      .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--va-space-inline-md);
        padding: var(--va-space-inline-lg) var(--va-space-inline-lg) 0;
      }
      .heading {
        margin: 0;
        font-family: var(--va-font-family-reading);
        font-size: 1.25rem;
        font-weight: var(--va-font-weight-bold);
        line-height: 1.3;
      }
      .close {
        flex: none;
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        margin: -0.25rem -0.5rem 0 0;
        padding: 0;
        border: none;
        border-radius: var(--va-radius-control);
        background: transparent;
        color: var(--va-color-text-muted);
        cursor: pointer;
      }
      .close:hover {
        background: var(--va-color-surface-subtle);
        color: var(--va-color-text-default);
      }
      .close svg {
        width: 1.25rem;
        height: 1.25rem;
      }
      .body {
        padding: var(--va-space-inline-md) var(--va-space-inline-lg);
        line-height: 1.5;
      }
      .footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--va-space-gap-md);
        padding: 0 var(--va-space-inline-lg) var(--va-space-inline-lg);
      }
      @media (forced-colors: active) {
        dialog {
          border: 2px solid CanvasText;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'va-dialog': VaDialog;
  }
}
