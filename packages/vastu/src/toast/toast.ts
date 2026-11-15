import { LitElement, css, html, nothing, type PropertyDeclarations } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { focusRing } from '../core/focus-ring.js';
import { checkTokensLoaded } from '../core/warn.js';

/** How a toast looks and how urgently it is announced. */
export type ToastVariant = 'info' | 'success' | 'error';
/** Why a toast closed, in the `va-close` event's `detail.reason`. */
export type ToastCloseReason = 'timeout' | 'dismiss' | 'escape' | 'method';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
  remaining: number;
  started: number;
  timer?: ReturnType<typeof setTimeout>;
}

let nextId = 1;

/**
 * A region for short, non-blocking status messages ("toasts"). Place one per page and call `show()`,
 * or point a `va-button` at it with `command="--show"`; the button's `value` is the message.
 *
 * @tag va-toast
 * @summary Shows short status messages, such as "Changes saved", without interrupting the user.
 *
 * @csspart region - The fixed area the toasts appear in.
 * @csspart toast - Each message.
 * @csspart dismiss - Each message's dismiss button.
 *
 * @cssprop {<color>} --va-toast-bg - Background colour of a message.
 * @cssprop {<color>} --va-toast-fg - Text colour of a message.
 * @cssprop {<length>} --va-toast-radius - Corner radius of a message.
 *
 * @cssprop-applies --va-toast-bg toast:open background-color
 * @cssprop-applies --va-toast-fg toast:open color
 * @cssprop-applies --va-toast-radius toast:open border-top-left-radius
 *
 * @keyboard-items [part~="dismiss"]
 * @keyboard open: Escape | closes | Dismisses the message that has focus.
 *
 * @a11y-role status
 * @a11y-name The `label` attribute, "Notifications" by default.
 * @a11y-note Info and success messages are announced politely; errors use `role="alert"` and are announced at once.
 * @a11y-note Messages pause their timer while hovered or focused, and errors stay until dismissed (WCAG 2.2.1).
 *
 * @guidance-use To confirm that something happened, such as "Changes saved" or "Link copied", or to report a background failure.
 * @guidance-avoid For anything the user must act on or read in full, or for form validation errors.
 * @guidance-instead `va-dialog` for decisions; `va-text-field`'s `error` for field errors.
 *
 * @fires va-close - When a message closes. `event.detail.reason` is `timeout`, `dismiss`, `escape` or `method`.
 * @event-trigger va-close | press Escape | open
 */
export class VaToast extends LitElement {
  static override properties: PropertyDeclarations = {
    duration: { type: Number },
    label: {},
    _toasts: { state: true },
  };

  /** Milliseconds before an info or success message closes by itself. Errors stay until dismissed. */
  declare duration: number;
  /** Accessible name of the region. */
  declare label: string;

  declare private _toasts: Toast[];

  constructor() {
    super();
    this.duration = 5000;
    this.label = 'Notifications';
    this._toasts = [];
    this.addEventListener('command', this.#onCommand as EventListener);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    checkTokensLoaded(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const t of this._toasts) clearTimeout(t.timer);
  }

  /** True while at least one message is showing. */
  get open(): boolean {
    return this._toasts.length > 0;
  }

  /** Shows a message and returns its id. `variant` defaults to `info`; errors stay until dismissed. */
  show(message: string, options: { variant?: ToastVariant; duration?: number } = {}): number {
    const variant = options.variant ?? 'info';
    const duration = variant === 'error' ? 0 : (options.duration ?? this.duration);
    const toast: Toast = { id: nextId++, message, variant, duration, remaining: duration, started: 0 };
    this._toasts = [...this._toasts, toast];
    this.#start(toast);
    return toast.id;
  }

  /** Closes one message by id, or every message when no id is given. */
  dismiss(id?: number): void {
    for (const t of [...this._toasts]) if (id === undefined || t.id === id) this.#close(t, 'method');
  }

  #onCommand = (event: Event & { command?: string; source?: Element | null }): void => {
    if (event.command !== '--show') return;
    const source = event.source as (Element & { value?: string }) | null;
    const message = source?.value || source?.textContent?.trim() || '';
    const variant = (source?.getAttribute('data-variant') as ToastVariant | null) ?? undefined;
    if (message) this.show(message, { variant });
  };

  #start(toast: Toast): void {
    if (!toast.remaining) return;
    toast.started = Date.now();
    toast.timer = setTimeout(() => this.#close(toast, 'timeout'), toast.remaining);
  }

  #pause(toast: Toast): void {
    if (!toast.timer) return;
    clearTimeout(toast.timer);
    toast.timer = undefined;
    toast.remaining = Math.max(1000, toast.remaining - (Date.now() - toast.started));
  }

  #resume(toast: Toast, item: HTMLElement): void {
    // Stay paused while the pointer or focus is still on the message.
    if (item.matches(':hover') || item.matches(':focus-within')) return;
    if (!toast.timer) this.#start(toast);
  }

  #close(toast: Toast, reason: ToastCloseReason): void {
    if (!this._toasts.includes(toast)) return;
    clearTimeout(toast.timer);
    const hadFocus = !!this.shadowRoot?.activeElement;
    this._toasts = this._toasts.filter((t) => t !== toast);
    this.dispatchEvent(new CustomEvent('va-close', { detail: { id: toast.id, reason }, bubbles: true, composed: true }));
    if (hadFocus) {
      // Don't strand focus: move it to the next message, or let it go back to the page.
      this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLElement>('.dismiss')?.focus());
    }
  }

  override render() {
    return html`
      <section part="region" class="region" aria-label=${this.label}>
        <ol class="list" role="status" aria-live="polite">
          ${repeat(
            this._toasts,
            (t) => t.id,
            (t) => html`
              <li
                part="toast"
                class="toast ${t.variant}"
                role=${t.variant === 'error' ? 'alert' : nothing}
                @mouseenter=${() => this.#pause(t)}
                @mouseleave=${(e: Event) => this.#resume(t, e.currentTarget as HTMLElement)}
                @focusin=${() => this.#pause(t)}
                @focusout=${(e: Event) => this.#resume(t, e.currentTarget as HTMLElement)}
                @keydown=${(e: KeyboardEvent) => e.key === 'Escape' && this.#close(t, 'escape')}
              >
                <span class="message">${t.message}</span>
                <button part="dismiss" class="dismiss" type="button" aria-label="Dismiss" @click=${() => this.#close(t, 'dismiss')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </li>
            `
          )}
        </ol>
      </section>
    `;
  }

  static override styles = [
    focusRing,
    css`
      :host {
        position: fixed;
        inset: auto 16px 16px auto;
        z-index: 1000;
        font-family: var(--va-font-family-ui);
      }
      .list {
        display: flex;
        flex-direction: column;
        gap: var(--va-space-gap-md);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .toast {
        display: flex;
        align-items: center;
        gap: var(--va-space-inline-sm);
        min-width: 16rem;
        max-width: min(24rem, calc(100vw - 32px));
        padding: var(--va-space-inline-sm) var(--va-space-inline-sm) var(--va-space-inline-sm) var(--va-space-inline-md);
        border-radius: var(--va-toast-radius, var(--va-radius-surface));
        background-color: var(--va-toast-bg, var(--va-color-text-default));
        color: var(--va-toast-fg, var(--va-color-surface-default));
        box-shadow: 0 8px 24px rgb(0 0 0 / 0.2);
        font-size: var(--va-font-size-md);
      }
      .toast.success {
        border-left: 4px solid var(--va-color-accent-default);
      }
      .toast.error {
        background-color: var(--va-toast-bg, var(--va-color-danger-default));
        color: var(--va-toast-fg, var(--va-color-text-on-danger));
      }
      .message {
        flex: 1;
      }
      .dismiss {
        flex: none;
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        border: none;
        border-radius: var(--va-radius-control);
        background: transparent;
        color: inherit;
        cursor: pointer;
      }
      .dismiss svg {
        width: 1.125rem;
        height: 1.125rem;
      }
      @media (max-width: 480px) {
        :host {
          inset: auto 16px 16px 16px;
        }
        .toast {
          min-width: 0;
          max-width: none;
        }
      }
      @media (forced-colors: active) {
        .toast {
          border: 2px solid CanvasText;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'va-toast': VaToast;
  }
}
