import { LitElement, css, html, nothing } from 'lit';
import { focusRing } from '../core/focus-ring.js';
import { checkTokensLoaded, devWarn } from '../core/warn.js';

/**
 * A button that starts an action or submits a form.
 *
 * @tag va-button
 * @summary Starts an action, or submits or resets the form it is in.
 *
 * @slot - The button's text. This is its accessible name unless `label` is set.
 * @slot start - An icon before the text. Mark decorative icons `aria-hidden="true"`.
 * @slot end - An icon after the text.
 *
 * @csspart control - The native button inside.
 * @csspart label - The wrapper around the text.
 *
 * @cssprop {<color>} --va-button-bg - Background colour.
 * @cssprop {<color>} --va-button-bg-hover - Background colour on hover.
 * @cssprop {<color>} --va-button-fg - Text and icon colour.
 * @cssprop {<color>} --va-button-border - Border colour.
 * @cssprop {<length>} --va-button-radius - Corner radius.
 * @cssprop {<length>} --va-button-height - Minimum height.
 * @cssprop {<length>} --va-button-padding-inline - Space before and after the text.
 * @cssprop {<length>} --va-button-font-size - Text size.
 *
 * @cssprop-applies --va-button-bg control background-color
 * @cssprop-applies --va-button-bg-hover control:hover background-color
 * @cssprop-applies --va-button-fg control color
 * @cssprop-applies --va-button-border control border-top-color
 * @cssprop-applies --va-button-radius control border-top-left-radius
 * @cssprop-applies --va-button-height control min-height
 * @cssprop-applies --va-button-padding-inline control padding-left
 * @cssprop-applies --va-button-font-size control font-size
 *
 * @keyboard Enter | activates | Activates the button.
 * @keyboard Space | activates | Activates the button.
 * @keyboard Tab | focus-next | Moves focus to the next control. A disabled button is skipped.
 *
 * @a11y-role button
 * @a11y-name The slotted text, or the `label` attribute. A button with only an icon must have `label`.
 * @a11y-note `loading` keeps the button focusable, sets `aria-disabled` and `aria-busy`, and adds "Loading" to its name.
 *
 * @guidance-use For an action on the current page (Save, Delete, Open dialog) or to submit a form.
 * @guidance-avoid For navigation to another page or URL.
 * @guidance-instead A link (`<a href>`) for navigation.
 *
 * @fires click - The native click event. Not fired while `disabled` or `loading`.
 * @event-trigger click | click
 */
export class VaButton extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  /** @internal */
  static formAssociated = true;

  static override properties = {
    variant: { reflect: true },
    size: { reflect: true },
    type: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
    name: {},
    value: {},
    label: {},
  };

  /** Visual emphasis. Use one `primary` button per view. */
  declare variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Height and text size. Every size meets the 24px WCAG 2.2 target size. */
  declare size: 'sm' | 'md' | 'lg';
  /**
   * What the button does in a form. Defaults to `button`, unlike the native `<button>`,
   * so a button never submits a form by accident. Set `type="submit"` to submit.
   */
  declare type: 'button' | 'submit' | 'reset';
  /** Disables the button. It cannot be focused or activated. */
  declare disabled: boolean;
  /** Shows a spinner and blocks activation, but keeps the button focusable. */
  declare loading: boolean;
  /** Submitted with the form as `name=value` when this button submits it. */
  declare name: string;
  /** Submitted with `name` when this button submits the form. */
  declare value: string;
  /** Accessible name. Required when the button has no text, such as an icon-only button. */
  declare label: string;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.variant = 'primary';
    this.size = 'md';
    this.type = 'button';
    this.disabled = false;
    this.loading = false;
    this.name = '';
    this.value = '';
    this.label = '';
    this.#internals = this.attachInternals();
    this.addEventListener('click', this.#onClick);
  }

  /** The form this button belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    checkTokensLoaded(this);
  }

  #onClick = (event: MouseEvent): void => {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const form = this.#internals.form;
    if (!form) return;
    if (this.type === 'submit') {
      // requestSubmit() needs a real submit button as the submitter, so name=value is sent.
      const submitter = document.createElement('button');
      submitter.type = 'submit';
      submitter.hidden = true;
      if (this.name) {
        submitter.name = this.name;
        submitter.value = this.value;
      }
      form.append(submitter);
      form.requestSubmit(submitter);
      submitter.remove();
    } else if (this.type === 'reset') {
      form.reset();
    }
  };

  #onSlotChange = (): void => {
    const text = this.textContent?.trim() ?? '';
    if (!text && !this.label) {
      devWarn(
        'va-button',
        'This button has no accessible name: it has no text and no label.',
        'Put text inside it, or add label="…" that says what it does (e.g. label="Close").'
      );
    }
  };

  override render() {
    return html`
      <button
        part="control"
        class="control"
        type="button"
        ?disabled=${this.disabled}
        aria-disabled=${this.loading ? 'true' : nothing}
        aria-busy=${this.loading ? 'true' : nothing}
        aria-label=${this.label ? (this.loading ? `${this.label}, loading` : this.label) : nothing}
      >
        <slot name="start"></slot>
        <span part="label" class="label"><slot @slotchange=${this.#onSlotChange}></slot></span>
        ${this.loading
          ? html`<span class="spinner" aria-hidden="true"></span><span class="visually-hidden">, loading</span>`
          : nothing}
        <slot name="end"></slot>
      </button>
    `;
  }

  static override styles = [
    focusRing,
    css`
      :host {
        --_bg: var(--va-button-bg, var(--va-color-accent-default));
        --_bg-hover: var(--va-button-bg-hover, var(--va-color-accent-hover));
        --_fg: var(--va-button-fg, var(--va-color-text-on-accent));
        --_border: var(--va-button-border, transparent);
        --_height: var(--va-button-height, var(--va-size-control-md));
        --_padding: var(--va-button-padding-inline, var(--va-space-inline-lg));
        --_font-size: var(--va-button-font-size, var(--va-font-size-md));
        display: inline-block;
        vertical-align: middle;
      }
      :host([hidden]) {
        display: none;
      }
      :host([variant='secondary']) {
        --_bg: var(--va-button-bg, transparent);
        --_bg-hover: var(--va-button-bg-hover, var(--va-color-surface-subtle));
        --_fg: var(--va-button-fg, var(--va-color-text-default));
        --_border: var(--va-button-border, var(--va-color-border-control));
      }
      :host([variant='ghost']) {
        --_bg: var(--va-button-bg, transparent);
        --_bg-hover: var(--va-button-bg-hover, var(--va-color-surface-subtle));
        --_fg: var(--va-button-fg, var(--va-color-accent-default));
      }
      :host([variant='danger']) {
        --_bg: var(--va-button-bg, var(--va-color-danger-default));
        --_bg-hover: var(--va-button-bg-hover, var(--va-color-danger-hover));
        --_fg: var(--va-button-fg, var(--va-color-text-on-danger));
      }
      :host([size='sm']) {
        --_height: var(--va-button-height, var(--va-size-control-sm));
        --_padding: var(--va-button-padding-inline, var(--va-space-inline-md));
        --_font-size: var(--va-button-font-size, var(--va-font-size-sm));
      }
      :host([size='lg']) {
        --_height: var(--va-button-height, var(--va-size-control-lg));
        --_font-size: var(--va-button-font-size, var(--va-font-size-lg));
      }

      .control {
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--va-space-gap-md);
        width: 100%;
        min-height: var(--_height);
        margin: 0;
        padding: 0 var(--_padding);
        border: 1px solid var(--_border);
        border-radius: var(--va-button-radius, var(--va-radius-control));
        background-color: var(--_bg);
        color: var(--_fg);
        font-family: var(--va-font-family-ui);
        font-size: var(--_font-size);
        font-weight: var(--va-font-weight-medium);
        line-height: 1.2;
        cursor: pointer;
        transition: background-color var(--va-motion-duration-fast) ease-out;
        -webkit-tap-highlight-color: transparent;
      }
      .control:hover:not(:disabled):not([aria-disabled='true']) {
        background-color: var(--_bg-hover);
      }
      .control:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .control[aria-disabled='true'] {
        cursor: progress;
      }

      ::slotted(svg),
      ::slotted([slot='start']),
      ::slotted([slot='end']) {
        flex: none;
        width: 1.25em;
        height: 1.25em;
      }

      .spinner {
        flex: none;
        width: 1em;
        height: 1em;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(1turn);
        }
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
        .control {
          transition: none;
        }
        .spinner {
          animation-duration: 2.4s;
        }
      }

      @media (forced-colors: active) {
        .control {
          border-color: ButtonText;
        }
        :host(:not([variant])) .control,
        :host([variant='primary']) .control,
        :host([variant='danger']) .control {
          background-color: ButtonText;
          color: ButtonFace;
          forced-color-adjust: none;
        }
        .control:disabled {
          border-color: GrayText;
          color: GrayText;
        }
      }
    `,
  ];
}

// Union types are written inline on the properties so the manifest, and agents reading it, see the values.
export type ButtonVariant = VaButton['variant'];
export type ButtonSize = VaButton['size'];
export type ButtonType = VaButton['type'];

declare global {
  interface HTMLElementTagNameMap {
    'va-button': VaButton;
  }
}
