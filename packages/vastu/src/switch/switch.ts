import { css, html, nothing, type PropertyDeclarations } from 'lit';
import { FormControl } from '../core/form-control.js';
import { focusRing } from '../core/focus-ring.js';
import { checkTokensLoaded, devWarn } from '../core/warn.js';

/**
 * An on/off switch for a setting that takes effect immediately.
 *
 * @tag va-switch
 * @summary Turns a setting on or off, with immediate effect.
 *
 * @slot - The visible label. Clicking it flips the switch.
 * @slot help-text - Optional help text under the label. It becomes the switch's description.
 *
 * @csspart control - The switch's track (a native button with `role="switch"`).
 * @csspart thumb - The round thumb.
 * @csspart label - The label text.
 * @csspart help-text - The help text.
 *
 * @cssprop {<color>} --va-switch-track-bg - Track colour when off.
 * @cssprop {<color>} --va-switch-track-bg-checked - Track colour when on.
 * @cssprop {<color>} --va-switch-thumb-bg - Thumb colour.
 *
 * @cssprop-applies --va-switch-track-bg control:unchecked background-color
 * @cssprop-applies --va-switch-track-bg-checked control:checked background-color
 * @cssprop-applies --va-switch-thumb-bg thumb background-color
 *
 * @keyboard Space | toggles | Turns the switch on or off.
 * @keyboard Enter | toggles | Turns the switch on or off.
 * @keyboard Tab | focus-next | Moves focus to the next control.
 *
 * @a11y-role switch
 * @a11y-name-from text, accessible-label
 * @replaces [role="switch"]
 * @a11y-name The slotted label text. Use `accessible-label` only when there is no visible label.
 * @a11y-note The state is announced as on or off, not checked or unchecked.
 * @a11y-note Style the on state with `va-switch:state(checked)`; the `checked` attribute is the initial state only, as on a native checkbox.
 *
 * @guidance-use For a setting that applies as soon as it changes, such as "Dark theme" or "Email notifications".
 * @guidance-avoid For a choice that is only applied when a form is submitted, or for agreeing to terms.
 * @guidance-instead `va-checkbox` for choices submitted with a form.
 *
 * @fires change - When the user flips the switch. Read `event.target.checked`.
 * @fires input - When the user flips the switch, just before `change`.
 * @event-trigger change | click
 * @event-trigger input | click
 */
export class VaSwitch extends FormControl {
  static override shadowRootOptions: ShadowRootInit = { ...FormControl.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    checked: { type: Boolean },
    value: {},
    accessibleLabel: { attribute: 'accessible-label' },
  };

  /** Whether the switch is on. */
  declare checked: boolean;
  /** Submitted with `name` while the switch is on. Defaults to `on`, as for a native checkbox. */
  declare value: string;
  /** Accessible name for a switch with no visible label. */
  declare accessibleLabel: string;

  #defaultChecked: boolean | undefined;

  constructor() {
    super();
    this.checked = false;
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
        devWarn('va-switch', 'This switch has no accessible name.', 'Put label text inside it (e.g. Dark theme), or add accessible-label="…" when there is no room for one.');
      } else if (text && this.accessibleLabel && !this.accessibleLabel.toLowerCase().includes(text.toLowerCase())) {
        devWarn('va-switch', `accessible-label="${this.accessibleLabel}" replaces the visible label "${text}" for screen readers (WCAG 2.5.3).`, 'Remove accessible-label: the visible text is the name.');
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
    this._internals.setFormValue(this.checked ? this.value : null);
    this._internals.setValidity(
      this.required && !this.checked ? { valueMissing: true } : {},
      this.required && !this.checked ? 'Turn this on to continue.' : '',
      this.shadowRoot?.querySelector('button') ?? undefined
    );
  }

  /** @internal */
  override formResetCallback(): void {
    this.checked = this.#defaultChecked ?? false;
  }

  #toggle(): void {
    if (this._isDisabled) return;
    this.checked = !this.checked;
    this._emit('input');
    this._emit('change');
  }

  override render() {
    return html`
      <button
        part="control"
        class="control ${this.checked ? 'on' : ''}"
        type="button"
        role="switch"
        aria-checked=${this.checked ? 'true' : 'false'}
        aria-labelledby=${this.accessibleLabel ? nothing : 'label'}
        aria-label=${this.accessibleLabel || nothing}
        aria-describedby="help-text"
        ?disabled=${this._isDisabled}
        @click=${this.#toggle}
      >
        <span part="thumb" class="thumb"></span>
      </button>
      <span class="text">
        <span part="label" id="label" class="label ${this._isDisabled ? 'disabled' : ''}" @click=${this.#toggle}><slot></slot></span>
        <span part="help-text" id="help-text" class="help-text"><slot name="help-text"></slot></span>
      </span>
    `;
  }

  static override styles = [
    focusRing,
    css`
      :host {
        --_track: var(--va-switch-track-bg, var(--va-color-border-control));
        --_track-on: var(--va-switch-track-bg-checked, var(--va-color-accent-default));
        --_thumb: var(--va-switch-thumb-bg, var(--va-color-surface-default));
        display: inline-flex;
        align-items: flex-start;
        gap: var(--va-space-inline-sm);
        font-family: var(--va-font-family-ui);
        font-size: var(--va-font-size-md);
        color: var(--va-color-text-default);
        vertical-align: middle;
      }
      :host([hidden]) {
        display: none;
      }
      .control {
        flex: none;
        position: relative;
        width: 2.75rem;
        height: 1.5rem;
        margin: 0;
        padding: 0;
        border: 1px solid transparent;
        border-radius: var(--va-radius-round);
        background-color: var(--_track);
        cursor: pointer;
        transition: background-color var(--va-motion-duration-fast) ease-out;
      }
      .control.on {
        background-color: var(--_track-on);
      }
      .thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: calc(1.5rem - 6px);
        height: calc(1.5rem - 6px);
        border-radius: 50%;
        background-color: var(--_thumb);
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
        transition: transform var(--va-motion-duration-fast) ease-out;
      }
      .control.on .thumb {
        transform: translateX(1.25rem);
      }
      .control:disabled,
      .label.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .text {
        display: flex;
        flex-direction: column;
        padding-top: 0.1rem;
      }
      .label {
        cursor: pointer;
        user-select: none;
      }
      .help-text {
        color: var(--va-color-text-muted);
        font-size: var(--va-font-size-sm);
      }
      @media (prefers-reduced-motion: reduce) {
        .control,
        .thumb {
          transition: none;
        }
      }
      @media (forced-colors: active) {
        .control {
          border-color: ButtonText;
        }
        .control.on {
          background-color: Highlight;
        }
        .thumb {
          background-color: ButtonText;
        }
        .control.on .thumb {
          background-color: HighlightText;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'va-switch': VaSwitch;
  }
}
