import { css } from 'lit';

/** The shared keyboard focus ring: visible only for keyboard focus, drawn outside the control. */
export const focusRing = css`
  :focus-visible {
    outline: var(--va-size-focus-ring, 2px) solid var(--va-color-focus, currentColor);
    outline-offset: 2px;
  }
  @media (forced-colors: active) {
    :focus-visible {
      outline-color: Highlight;
    }
  }
`;
