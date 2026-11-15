import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { FormControl } from '../core/form-control.js';
import { checkTokensLoaded, devWarn } from '../core/warn.js';

/**
 * A single-line text input with a visible label, help text and error message.
 *
 * @tag va-text-field
 * @summary Collects a short piece of text, such as a name, an email address or a search term.
 *
 * @slot start - An icon or prefix inside the field, before the text.
 * @slot end - An icon or suffix inside the field, after the text.
 *
 * @csspart label - The visible label.
 * @csspart field - The box around the input and its icons.
 * @csspart input - The native input.
 * @csspart help - The help text.
 * @csspart error - The error message.
 *
 * @cssprop {<color>} --va-text-field-bg - Background colour of the field.
 * @cssprop {<color>} --va-text-field-border - Border colour of the field.
 * @cssprop {<color>} --va-text-field-border-invalid - Border colour while the field shows an error.
 * @cssprop {<length>} --va-text-field-radius - Corner radius of the field.
 * @cssprop {<length>} --va-text-field-height - Minimum height of the field.
 *
 * @cssprop-applies --va-text-field-bg field background-color
 * @cssprop-applies --va-text-field-border field border-top-color
 * @cssprop-applies --va-text-field-border-invalid field:invalid border-top-color
 * @cssprop-applies --va-text-field-radius field border-top-left-radius
 * @cssprop-applies --va-text-field-height field min-height
 *
 * @keyboard Tab | focus-next | Moves focus to the next control.
 *
 * @a11y-role textbox
 * @a11y-name The `label` attribute, shown above the field. Every text field needs one.
 * @a11y-note Help text and the error message are linked with `aria-describedby`; the error also sets `aria-invalid`.
 * @a11y-note Errors appear after the user leaves the field or submits the form, not while they type.
 *
 * @guidance-use For short, free-form text: names, email addresses, search terms, codes.
 * @guidance-avoid For long text, or for picking from a fixed set of options.
 * @guidance-instead A textarea for long text; a select or radio group for fixed options.
 *
 * @fires input - The native input event, on every keystroke. Read `event.target.value`.
 * @fires change - When the user commits a change, by leaving the field or pressing Enter.
 * @event-trigger input | press a
 * @event-trigger change | commit
 */
export class VaTextField extends FormControl {
  static override shadowRootOptions: ShadowRootInit = { ...FormControl.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    label: {},
    type: {},
    value: {},
    placeholder: {},
    helpText: { attribute: 'help-text' },
    error: {},
    readonly: { type: Boolean, reflect: true },
    minLength: { type: Number, attribute: 'minlength' },
    maxLength: { type: Number, attribute: 'maxlength' },
    pattern: {},
    autocomplete: {},
    _showError: { state: true },
  };

  /** The visible label above the field. Required: it is also the field's accessible name. */
  declare label: string;
  /** The kind of text. Sets the keyboard on phones and the built-in validation. */
  declare type: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
  /** The current text. */
  declare value: string;
  /** Example text shown while the field is empty. Never a substitute for `label`. */
  declare placeholder: string;
  /** Help text under the field, such as the expected format. */
  declare helpText: string;
  /** A custom error message. While set, the field is invalid and shows it. */
  declare error: string;
  /** The text can be selected and submitted, but not changed. */
  declare readonly: boolean;
  /** The minimum number of characters. */
  declare minLength: number;
  /** The maximum number of characters. */
  declare maxLength: number;
  /** A regular expression the whole value must match. */
  declare pattern: string;
  /** A hint for the browser's autofill, such as `email` or `name`. */
  declare autocomplete: string;

  declare private _showError: boolean;
  #defaultValue = '';

  constructor() {
    super();
    this.label = '';
    this.type = 'text';
    this.value = '';
    this.placeholder = '';
    this.helpText = '';
    this.error = '';
    this.readonly = false;
    this.pattern = '';
    this.autocomplete = '';
    this._showError = false;
    // Fired on the host when the form's submit is blocked: show the error from then on.
    this.addEventListener('invalid', () => (this._showError = true));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultValue = this.getAttribute('value') ?? '';
    checkTokensLoaded(this);
  }

  override firstUpdated(): void {
    if (!this.label) {
      devWarn('va-text-field', 'This text field has no label.', 'Add label="…" that says what to type (e.g. label="Email address"). A placeholder is not a label.');
    }
  }

  get #input(): HTMLInputElement | null {
    return this.shadowRoot?.querySelector('input') ?? null;
  }

  override updated(changed: PropertyValues): void {
    const input = this.#input;
    if (!input) return;
    if (changed.has('error') && this.error) this._showError = true;
    this._internals.setFormValue(this.value);
    input.setCustomValidity(this.error);
    this._internals.setValidity(input.validity, input.validationMessage, input);
  }

  /** @internal */
  override formResetCallback(): void {
    this.value = this.#defaultValue;
    this._showError = false;
  }

  /** Selects all the text in the field. */
  select(): void {
    this.#input?.select();
  }

  #onInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
  }

  #onChange(): void {
    this._emit('change');
  }

  #onBlur(): void {
    this._showError = true;
    this.requestUpdate();
  }

  override render() {
    const input = this.#input;
    const invalid = this._showError && !!(this.error || (input && !input.validity.valid));
    const message = this.error || (invalid ? input?.validationMessage : '');
    const describedBy = [this.helpText ? 'help' : '', invalid ? 'error' : ''].filter(Boolean).join(' ');
    return html`
      <label part="label" class="label" for="input">${this.label}${this.required ? html`<span class="required" aria-hidden="true"> *</span>` : nothing}</label>
      <div part="field" class="field ${invalid ? 'invalid' : ''}">
        <slot name="start"></slot>
        <input
          part="input"
          id="input"
          .value=${this.value}
          type=${this.type}
          placeholder=${this.placeholder || nothing}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          minlength=${this.minLength ?? nothing}
          maxlength=${this.maxLength ?? nothing}
          pattern=${this.pattern || nothing}
          autocomplete=${(this.autocomplete || nothing) as never}
          aria-invalid=${invalid ? 'true' : nothing}
          aria-describedby=${describedBy || nothing}
          @input=${this.#onInput}
          @change=${this.#onChange}
          @blur=${this.#onBlur}
        />
        <slot name="end"></slot>
      </div>
      <div part="help" id="help" class="help" ?hidden=${!this.helpText}>${this.helpText}</div>
      <div part="error" id="error" class="error" ?hidden=${!invalid}>${message}</div>
    `;
  }

  static override styles = css`
    :host {
      --_border: var(--va-text-field-border, var(--va-color-border-control));
      display: inline-flex;
      flex-direction: column;
      gap: var(--va-space-gap-sm);
      min-width: 12rem;
      font-family: var(--va-font-family-ui);
      font-size: var(--va-font-size-md);
      color: var(--va-color-text-default);
      vertical-align: top;
    }
    :host([hidden]) {
      display: none;
    }
    .label {
      font-weight: var(--va-font-weight-medium);
      font-size: var(--va-font-size-sm);
    }
    .required {
      color: var(--va-color-danger-default);
    }
    .field {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: var(--va-space-gap-md);
      min-height: var(--va-text-field-height, var(--va-size-control-md));
      padding: 0 var(--va-space-inline-md);
      border: 1px solid var(--_border);
      border-radius: var(--va-text-field-radius, var(--va-radius-control));
      background-color: var(--va-text-field-bg, var(--va-color-surface-default));
    }
    .field:focus-within {
      outline: var(--va-size-focus-ring, 2px) solid var(--va-color-focus);
      outline-offset: 1px;
    }
    .field.invalid {
      border-color: var(--va-text-field-border-invalid, var(--va-color-danger-default));
    }
    input {
      flex: 1;
      min-width: 0;
      margin: 0;
      padding: 0.5rem 0;
      border: none;
      outline: none;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    input::placeholder {
      color: var(--va-color-text-muted);
    }
    ::slotted([slot='start']),
    ::slotted([slot='end']) {
      flex: none;
      color: var(--va-color-text-muted);
    }
    :host([disabled]) {
      opacity: 0.5;
    }
    :host([readonly]) .field {
      background-color: var(--va-color-surface-subtle);
    }
    .help {
      color: var(--va-color-text-muted);
      font-size: var(--va-font-size-sm);
    }
    .error {
      color: var(--va-color-danger-default);
      font-size: var(--va-font-size-sm);
    }
    .help[hidden],
    .error[hidden] {
      display: none;
    }
    @media (forced-colors: active) {
      .field {
        border-color: FieldText;
      }
      .field.invalid {
        border-width: 2px;
      }
      .field:focus-within {
        outline-color: Highlight;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'va-text-field': VaTextField;
  }
}
