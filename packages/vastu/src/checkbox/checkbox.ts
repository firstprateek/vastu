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
 * @slot help-text - Optional help text under the label. It becomes the checkbox's description.
 *
 * @csspart control - The square box.
 * @csspart label - The label text.
 * @csspart help-text - The help text.
 *
 * @cssprop {<color>} --va-checkbox-border - Border colour of the box when unchecked.
 * @cssprop {<color>} --va-checkbox-bg-checked - Fill and border colour when checked or indeterminate.
 * @cssprop {<color>} --va-checkbox-mark-fg - Colour of the tick or dash.
 * @cssprop {<length>} --va-checkbox-size - Width and height of the box.
 *
 * @cssprop-applies --va-checkbox-border control:unchecked border-top-color
 * @cssprop-applies --va-checkbox-bg-checked control:checked background-color
 * @cssprop-applies --va-checkbox-mark-fg control:checked color
 * @cssprop-applies --va-checkbox-size control width
 *
 * @keyboard Space | toggles | Checks or unchecks the box.
 * @keyboard Tab | focus-next | Moves focus to the next control.
 *
 * @a11y-role checkbox
 * @a11y-name-from text, accessible-label
 * @replaces input[type="checkbox"]
 * @a11y-name The slotted label text. Use `accessible-label` only when there is no visible label.
 * @a11y-note `indeterminate` is announced as "mixed", for a box that stands for a partly selected group.
 * @a11y-note Style states with `va-checkbox:state(checked)` and `:state(indeterminate)`; the `checked` attribute is the initial state only, as on a native checkbox.
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
    checked: { type: Boolean },
    indeterminate: { type: Boolean },
    value: {},
    accessibleLabel: { attribute: 'accessible-label' },
  };

  /** Whether the box is checked. The `checked` attribute sets the initial state, as on a native checkbox. */
  declare checked: boolean;
  /** Shows a dash for a partly selected group. Cleared when the user toggles the box. */
  declare indeterminate: boolean;
  /** Submitted with `name` while the box is checked. Defaults to `on`, as for a native checkbox. */
  declare value: string;
  /** Accessible name for a checkbox with no visible label, such as one selecting a table row. */
  declare accessibleLabel: string;

  #defaultChecked: boolean | undefined;

  constructor() {
    super();
    this.checked = false;
    this.indeterminate = false;
    this.value = 'on';
    this.accessibleLabel = '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // The default is the initial attribute, read once: moving the element must not change it.
    this.#defaultChecked ??= this.hasAttribute('checked');
    checkTokensLoaded(this);
  }

  override firstUpdated(): void {
    requestAnimationFrame(() => {
      const text = this.#labelText();
      if (!text && !this.accessibleLabel) {
        devWarn('va-checkbox', 'This checkbox has no accessible name.', 'Put label text inside it, or add accessible-label="…" when there is no room for one (e.g. accessible-label="Select row").');
      } else if (text && this.accessibleLabel && !this.accessibleLabel.toLowerCase().includes(text.toLowerCase())) {
        devWarn('va-checkbox', `accessible-label="${this.accessibleLabel}" replaces the visible label "${text}" for screen readers (WCAG 2.5.3).`, 'Remove accessible-label: the visible text is the name.');
      }
    });
  }

  /** The visible label: text not in the help-text slot. */
  #labelText(): string {
    return [...this.childNodes]
      .filter((n) => !(n instanceof Element && n.slot))
      .map((n) => n.textContent ?? '')
      .join('')
      .trim();
  }

  override updated(): void {
    this._setState('checked', this.checked);
    this._setState('indeterminate', this.indeterminate);
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
    this.checked = this.#defaultChecked ?? false;
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
      <label class="wrapper ${this._isDisabled ? 'disabled' : ''}">
        <span class="control-wrap">
        <input
          class="native"
          type="checkbox"
          .checked=${this.checked}
          .indeterminate=${this.indeterminate}
          ?disabled=${this._isDisabled}
          ?required=${this.required}
          aria-label=${this.accessibleLabel || nothing}
          aria-labelledby=${this.accessibleLabel ? nothing : 'label'}
          aria-describedby="help-text"
          @input=${this.#stopNative}
          @change=${this.#onChange}
        />
        <span part="control" class="box ${this.checked || this.indeterminate ? 'on' : ''}" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${mark}</svg>
        </span>
        </span>
        <span class="text">
          <span part="label" id="label" class="label"><slot></slot></span>
          <span part="help-text" id="help-text" class="help-text"><slot name="help-text"></slot></span>
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
      color: var(--va-checkbox-mark-fg, var(--va-color-text-on-accent));
    }
    .box svg {
      width: 100%;
      height: 100%;
    }
    .box.on {
      border-color: var(--va-checkbox-bg-checked, var(--va-color-accent-default));
      background-color: var(--va-checkbox-bg-checked, var(--va-color-accent-default));
    }
    .native:focus-visible + .box {
      outline: var(--va-size-focus-ring, 2px) solid var(--va-color-focus);
      outline-offset: 2px;
    }
    .wrapper.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .text {
      display: flex;
      flex-direction: column;
    }
    .help-text {
      color: var(--va-color-text-muted);
      font-size: var(--va-font-size-sm);
    }
    @media (forced-colors: active) {
      .box {
        border-color: ButtonText;
      }
      .box.on {
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
