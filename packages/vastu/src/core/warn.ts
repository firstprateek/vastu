import { DEV_MODE } from './dev-mode.js';

const shown = new Set<string>();

/**
 * Logs a development-only warning written for people and agents alike:
 * what is wrong, then the exact fix. Each message is shown once per page.
 * Stripped from production builds.
 */
export function devWarn(tag: string, problem: string, fix: string): void {
  if (!DEV_MODE) return;
  const message = `<${tag}>: ${problem} Fix: ${fix} (https://firstprateek.github.io/vastu/components/${tag.replace(/^va-/, '')}/)`;
  if (shown.has(message)) return;
  shown.add(message);
  console.warn(message);
}

/**
 * Warns once per page if no Vastu brand stylesheet is loaded. Waits for the page's load event,
 * so a stylesheet that is still downloading doesn't cause a false warning.
 */
export function checkTokensLoaded(host: HTMLElement): void {
  if (!DEV_MODE) return;
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => checkTokensLoaded(host), { once: true });
    return;
  }
  if (!host.isConnected) return;
  const value = getComputedStyle(host).getPropertyValue('--va-color-accent-default');
  if (!value.trim()) {
    devWarn(
      host.localName,
      'No Vastu tokens are loaded, so it is unstyled.',
      'import "@firstprateek/vastu-tokens/lekha.css" (or add it as a <link rel="stylesheet">) once per page.'
    );
  }
}
