// Every browser test already fails on a CSP or Trusted Types violation (tests/fixtures.ts).
// These tests prove the policy is actually in force, so a passing suite means something.
import { expect, test } from '../fixtures.js';

test('the harness is served with the strict CSP', async ({ page }) => {
  const response = await page.goto('/');
  const csp = response!.headers()['content-security-policy'];
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("style-src 'self'");
  expect(csp).toContain("require-trusted-types-for 'script'");
});

test.describe('Trusted Types', () => {
  test.use({ expectedErrors: [/TrustedHTML|Trusted|CSP violation: require-trusted-types-for/] });
  test('are enforced: a raw innerHTML assignment is blocked', async ({ page, open }) => {
    await open('c=button');
    const blocked = await page.evaluate(() => {
      try {
        document.querySelector('#stage')!.innerHTML = '<b>raw</b>';
        return false;
      } catch {
        return true;
      }
    });
    expect(blocked).toBe(true);
  });
});
