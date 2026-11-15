import { LitElement, html, css } from 'lit';

/**
 * HamburgerButton widget: <hamburger-btn></hamburger-btn>.
 *
 * A hamburger menu button whose three stripes turn into a cross when it is open.
 *
 * @property open {Boolean} - When true the stripes show as a cross. Toggled on every click. Reflected to the `open` attribute.
 * @property hidden {Boolean} - When true the button is not rendered. Reflected to the `hidden` attribute.
 * @property label {String} - Accessible name of the button, default "Toggle menu".
 *
 * @fires click - The native click event; `open` has already been toggled when it reaches your listener.
 *
 * @cssproperty --hamburger-stripe-color - Color of the stripes, default #58595B.
 */
export default class HamburgerButton extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }
    :host([hidden]) {
      display: none;
    }
    button {
      display: block;
      padding: 4px;
      background-color: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    button:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }
    span {
      display: block;
      background-color: var(--hamburger-stripe-color, #58595b);
      width: 35px;
      height: 5px;
      margin: 6px 0;
      border-radius: 4px;
      transition: 0.4s;
    }
    .open span:nth-child(1) {
      transform: rotate(-45deg) translate(-8px, 6px);
    }
    .open span:nth-child(2) {
      opacity: 0;
    }
    .open span:nth-child(3) {
      transform: rotate(45deg) translate(-9px, -8px);
    }
    @media (prefers-reduced-motion: reduce) {
      span {
        transition: none;
      }
    }
  `;

  static properties = {
    hidden: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    label: {},
  };

  constructor() {
    super();
    this.hidden = false;
    this.open = false;
    this.label = 'Toggle menu';
  }

  render() {
    if (this.hidden) {
      return html``;
    }

    return html`
      <button
        class=${this.open ? 'open' : ''}
        aria-label=${this.label}
        aria-expanded=${this.open ? 'true' : 'false'}
        @click=${this._toggle}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    `;
  }

  _toggle() {
    this.open = !this.open;
  }
}

if (!customElements.get('hamburger-btn')) {
  customElements.define('hamburger-btn', HamburgerButton);
}
