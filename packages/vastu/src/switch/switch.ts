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
 * @slot description - Optional help text under the label.
 *
 * @csspart control - The switch's track (a native button with `role="switch"`).
 * @csspart thumb - The round thumb.
 * @csspart label - The label text.
 *
 * @cssprop {<color>} --va-switch-track - Track colour when off.
 * @cssprop {<color>} --va-switch-track-on - Track colour when on.
 * @cssprop {<color>} --va-switch-thumb - Thumb colour.
 *
 * @cssprop-applies --va-switch-track control:unchecked background-color
 * @cssprop-applies --va-switch-track-on control:checked background-color
 * @cssprop-applies --va-switch-thumb thumb background-color
 *
 * @keyboard Space | toggles | Turns the switch on or off.
 * @keyboard Enter | toggles | Turns the switch on or off.
 * @keyboard Tab | focus-next | Moves focus to the next control.
 *
 * @a11y-role switch
 * @a11y-name-from text, label
 * @replaces [role="switch"]
 * @a11y-name The slotted label text, or the `label` attribute when there is no visible label.
 * @a11y-note The state is announced as on or off, not checked or unchecked.
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
    checked: { type: Boolean, reflect: true },
    value: {},
    label: {},
  };

  /** Whether the switch is on. */
  declare checked: boolean;
  /** Submitted with `name` while the switch is on. Defaults to `on`, as for a native checkbox. */
  declare value: string;
  /** Accessible name, when there is no visible label text. */
  declare label: string;

  #defaultChecked = false;

  constructor() {
    super();
    this.checked = false;
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
        devWarn('va-switch', 'This switch has no accessible name.', 'Put label text inside it, or add label="…" (e.g. label="Dark theme").');
      }
    });
  }

  override updated(): void {
    this._internals.setFormValue(this.checked ? this.value : null);
    this._internals.setValidity(
      this.required && !this.checked ? { valueMissing: true } : {},
      this.required && !this.checked ? 'Turn this on to continue.' : '',
      this.shadowRoot?.querySelector('button') ?? undefined
    );
  }

  /** @internal */
  override formResetCallback(): void {
    this.checked = this.#defaultChecked;
  }

  #toggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this._emit('input');
    this._emit('change');
  }

  override render() {
    return html`
      <button
        part="control"
        class="control"
        type="button"
        role="switch"
        aria-checked=${this.checked ? 'true' : 'false'}
        aria-labelledby=${this.label ? nothing : 'label'}
        aria-label=${this.label || nothing}
        aria-describedby="description"
        ?disabled=${this.disabled}
        @click=${this.#toggle}
      >
        <span part="thumb" class="thumb"></span>
      </button>
      <span class="text">
        <span part="label" id="label" class="label" @click=${this.#toggle}><slot></slot></span>
        <span id="description" class="description"><slot name="description"></slot></span>
      </span>
    `;
  }

  static override styles = [
    focusRing,
    css`
      :host {
        --_track: var(--va-switch-track, var(--va-color-border-control));
        --_track-on: var(--va-switch-track-on, var(--va-color-accent-default));
        --_thumb: var(--va-switch-thumb, var(--va-color-surface-default));
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
      :host([checked]) .control {
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
      :host([checked]) .thumb {
        transform: translateX(1.25rem);
      }
      .control:disabled,
      :host([disabled]) .label {
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
      .description {
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
        :host([checked]) .control {
          background-color: Highlight;
        }
        .thumb {
          background-color: ButtonText;
        }
        :host([checked]) .thumb {
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
