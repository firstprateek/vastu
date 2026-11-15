import { LitElement, type PropertyDeclarations } from 'lit';

/**
 * Base class for Vastu form controls. It joins the control to its `<form>` through
 * ElementInternals, so the control submits, resets, disables and validates like a native one.
 * Subclasses call `setFormValue()` and `setValidity()`; everything else is handled here.
 */
export class FormControl extends LitElement {
  /** @internal */
  static formAssociated = true;

  static override properties: PropertyDeclarations = {
    name: {},
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
  };

  /** Submitted with the form as `name=value`. */
  declare name: string;
  /** Disables the control. It can't be focused, changed or submitted. */
  declare disabled: boolean;
  /** The control must have a value before its form can be submitted. */
  declare required: boolean;

  /** @internal */
  protected readonly _internals: ElementInternals;

  constructor() {
    super();
    this.name = '';
    this.disabled = false;
    this.required = false;
    this._internals = this.attachInternals();
  }

  /** The form this control belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this._internals.form;
  }

  /** The control's validity state, as on native controls. */
  get validity(): ValidityState {
    return this._internals.validity;
  }

  /** The message the browser shows when the control is invalid, or an empty string. */
  get validationMessage(): string {
    return this._internals.validationMessage;
  }

  /** Returns true if the control is valid; otherwise fires `invalid` and returns false. */
  checkValidity(): boolean {
    return this._internals.checkValidity();
  }

  /** Like `checkValidity()`, but also shows the browser's message to the user. */
  reportValidity(): boolean {
    return this._internals.reportValidity();
  }

  /** @internal Called by the browser when a `<fieldset disabled>` around the control changes. */
  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled;
  }

  /** @internal Called by the browser when the form resets. Subclasses restore their default. */
  formResetCallback(): void {}

  /** Fires a bubbling event on the host, as a native control would. */
  protected _emit(type: 'input' | 'change'): void {
    this.dispatchEvent(new Event(type, { bubbles: true, composed: type === 'input' }));
  }
}
