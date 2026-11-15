import { LitElement, html, css } from 'lit';

/**
 * Toggle switch: <theme-switch></theme-switch>.
 *
 * An on/off switch built on a native checkbox, so it works with the keyboard and screen readers.
 * Handy as a light/dark theme switch, but it is a general-purpose toggle.
 *
 * @property checked {Boolean} - Whether the switch is on. Reflected to the `checked` attribute.
 * @property disabled {Boolean} - Disables the switch. Reflected to the `disabled` attribute.
 * @property label {String} - Accessible name of the switch, default "Toggle".
 *
 * @fires change - When the user flips the switch. `event.detail.checked` holds the new state.
 *
 * @cssproperty --switch-track-color - Colour of the track, default #F2F0EE.
 * @cssproperty --switch-thumb-color - Colour of the round thumb, default #58595B.
 * @cssproperty --switch-focus-color - Colour of the keyboard focus ring, default #2563EB.
 *
 * @csspart track - The track.
 * @csspart thumb - The round thumb.
 */
export default class ThemeSwitch extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      vertical-align: middle;
      /* --background-color and --link-color are the 1.0 names, kept as fallbacks */
      --_track: var(--switch-track-color, var(--background-color, #f2f0ee));
      --_thumb: var(--switch-thumb-color, var(--link-color, #58595b));
    }

    * {
      box-sizing: border-box;
    }

    .checkbox {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: 0;
      opacity: 0;
    }

    .track {
      display: block;
      position: relative;
      width: 50px;
      height: 26px;
      border-radius: 50px;
      background-color: var(--_track);
      box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
      cursor: pointer;
    }

    .thumb {
      position: absolute;
      top: 0;
      left: 0;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background-color: var(--_thumb);
      transition: transform 0.2s linear;
    }

    .checkbox:checked + .track .thumb {
      transform: translateX(24px);
    }

    .checkbox:focus-visible + .track {
      outline: 2px solid var(--switch-focus-color, #2563eb);
      outline-offset: 2px;
    }

    .checkbox:disabled + .track {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (prefers-reduced-motion: reduce) {
      .thumb {
        transition: none;
      }
    }
  `;

  static properties = {
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: {},
  };

  constructor() {
    super();
    this.checked = false;
    this.disabled = false;
    this.label = 'Toggle';
  }

  render() {
    return html`
      <input
        type="checkbox"
        role="switch"
        class="checkbox"
        id="checkbox"
        aria-label=${this.label}
        .checked=${this.checked}
        ?disabled=${this.disabled}
        @change=${this._onChange}
      />
      <label for="checkbox" class="track" part="track">
        <span class="thumb" part="thumb"></span>
      </label>
    `;
  }

  _onChange(e) {
    this.checked = e.target.checked;
    // The native change event does not cross the shadow root, so re-dispatch one that does.
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { checked: this.checked },
        bubbles: true,
        composed: true,
      })
    );
  }
}

if (!customElements.get('theme-switch')) {
  customElements.define('theme-switch', ThemeSwitch);
}
