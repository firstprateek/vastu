import { css, html, nothing, svg, type PropertyDeclarations } from 'lit';
import { FormControl } from '../core/form-control.js';
import { checkTokensLoaded, devWarn } from '../core/warn.js';

/**
 * A checkbox for a choice that is submitted with a form.
 *
 * @tag va-checkbox
 * @summary Lets the user choose an option, or agree to something, as part of a form.
 *
 * @slot - The visible label. Clicking it toggles the checkbox.
 * @slot description - Optional help text under the label.
 *
 * @csspart control - The square box.
 * @csspart label - The label text.
 *
 * @cssprop {<color>} --va-checkbox-border - Border colour of the box.
 * @cssprop {<color>} --va-checkbox-checked - Fill colour when checked or indeterminate.
 * @cssprop {<color>} --va-checkbox-mark - Colour of the tick or dash.
 * @cssprop {<length>} --va-checkbox-size - Width and height of the box.
 *
 * @cssprop-applies --va-checkbox-border control:unchecked border-top-color
 * @cssprop-applies --va-checkbox-checked control:checked background-color
 * @cssprop-applies --va-checkbox-mark control:checked color
 * @cssprop-applies --va-checkbox-size control width
 *
 * @keyboard Space | toggles | Checks or unchecks the box.
 * @keyboard Tab | focus-next | Moves focus to the next control.
 *
 * @a11y-role checkbox
 * @a11y-name-from text, label
 * @replaces input[type="checkbox"]
 * @a11y-name The slotted label text, or the `label` attribute when there is no visible label.
 * @a11y-note `indeterminate` is announced as "mixed", for a box that stands for a partly selected group.
 *
 * @guidance-use For an option submitted with a form, for agreeing to terms, or to select items in a list.
 * @guidance-avoid For a setting that should apply immediately.
 * @guidance-instead `va-switch` for settings that take effect immediately.
 *
 * @fires change - When the user checks or unchecks the box. Read `event.target.checked`.
 * @fires input - When the user checks or unchecks the box, just before `change`.
 * @event-trigger change | click
 * @event-trigger input | click
 */
export class VaCheckbox extends FormControl {
  static override shadowRootOptions: ShadowRootInit = { ...FormControl.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    checked: { type: Boolean, reflect: true },
    indeterminate: { type: Boolean, reflect: true },
    value: {},
    label: {},
  };

  /** Whether the box is checked. */
  declare checked: boolean;
  /** Shows a dash for a partly selected group. Cleared when the user toggles the box. */
  declare indeterminate: boolean;
  /** Submitted with `name` while the box is checked. Defaults to `on`, as for a native checkbox. */
  declare value: string;
  /** Accessible name, when there is no visible label text. */
  declare label: string;

  #defaultChecked = false;

  constructor() {
    super();
    this.checked = false;
    this.indeterminate = false;
    this.value = 'on';
    this.label = '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultChecked = this.hasAttribute('checked');
    checkTokensLoaded(this);
  }

  override firstUpdated(): void {
    requestAnimationFrame(() => {
      if (!this.textContent?.trim() && !this.label) {
        devWarn('va-checkbox', 'This checkbox has no accessible name.', 'Put label text inside it, or add label="…" (e.g. label="Select row").');
      }
    });
  }

  override updated(): void {
    this._internals.setFormValue(this.checked ? this.value : null);
    const missing = this.required && !this.checked;
    this._internals.setValidity(
      missing ? { valueMissing: true } : {},
      missing ? 'Check this box to continue.' : '',
      this.shadowRoot?.querySelector('input') ?? undefined
    );
  }

  /** @internal */
  override formResetCallback(): void {
    this.checked = this.#defaultChecked;
  }

  // The inner checkbox's native input event crosses the shadow root; the host fires its own instead.
  #stopNative(event: Event): void {
    event.stopPropagation();
  }

  #onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.checked = input.checked;
    this.indeterminate = false;
    this._emit('input');
    this._emit('change');
  }

  override render() {
    const mark = this.indeterminate
      ? svg`<path d="M4 8h8" />`
      : this.checked
        ? svg`<path d="M3.5 8.5l3 3 6-7" />`
        : nothing;
    return html`
      <label class="wrapper">
        <span class="control-wrap">
        <input
          class="native"
          type="checkbox"
          .checked=${this.checked}
          .indeterminate=${this.indeterminate}
          ?disabled=${this.disabled}
          ?required=${this.required}
          aria-label=${this.label || nothing}
          aria-describedby="description"
          @input=${this.#stopNative}
          @change=${this.#onChange}
        />
        <span part="control" class="box" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${mark}</svg>
        </span>
        </span>
        <span class="text">
          <span part="label" class="label"><slot></slot></span>
          <span id="description" class="description"><slot name="description"></slot></span>
        </span>
      </label>
    `;
  }

  static override styles = css`
    :host {
      --_size: var(--va-checkbox-size, 1.125rem);
      display: inline-flex;
      font-family: var(--va-font-family-ui);
      font-size: var(--va-font-size-md);
      color: var(--va-color-text-default);
      vertical-align: middle;
    }
    :host([hidden]) {
      display: none;
    }
    .wrapper {
      display: inline-flex;
      align-items: flex-start;
      gap: var(--va-space-inline-sm);
      cursor: pointer;
      /* Keeps the whole row at least 24px high for the WCAG 2.2 target size. */
      min-height: 1.5rem;
      padding-block: 0.1875rem;
      box-sizing: border-box;
    }
    .control-wrap {
      position: relative;
      flex: none;
      display: inline-flex;
    }
    /* The real checkbox covers the visible box, invisibly, so pointers and automation hit it directly. */
    .native {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      opacity: 0;
      cursor: inherit;
      z-index: 1;
    }
    .box {
      flex: none;
      box-sizing: border-box;
      display: grid;
      place-items: center;
      width: var(--_size);
      height: var(--_size);
      margin-top: 0.1rem;
      border: 1.5px solid var(--va-checkbox-border, var(--va-color-border-control));
      border-radius: var(--va-radius-control);
      background-color: var(--va-color-surface-default);
      color: var(--va-checkbox-mark, var(--va-color-text-on-accent));
    }
    .box svg {
      width: 100%;
      height: 100%;
    }
    :host([checked]) .box,
    :host([indeterminate]) .box {
      border-color: var(--va-checkbox-checked, var(--va-color-accent-default));
      background-color: var(--va-checkbox-checked, var(--va-color-accent-default));
    }
    .native:focus-visible + .box {
      outline: var(--va-size-focus-ring, 2px) solid var(--va-color-focus);
      outline-offset: 2px;
    }
    :host([disabled]) .wrapper {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .text {
      display: flex;
      flex-direction: column;
    }
    .description {
      color: var(--va-color-text-muted);
      font-size: var(--va-font-size-sm);
    }
    @media (forced-colors: active) {
      .box {
        border-color: ButtonText;
      }
      :host([checked]) .box,
      :host([indeterminate]) .box {
        background-color: Highlight;
        color: HighlightText;
        forced-color-adjust: none;
      }
      .native:focus-visible + .box {
        outline-color: Highlight;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'va-checkbox': VaCheckbox;
  }
}
