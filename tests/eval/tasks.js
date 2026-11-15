// The eval's tasks. Each has a prompt (what an agent is asked to build), a reference answer
// (used by --dry-run to prove the scoring works), and a check: Playwright assertions that the
// page does the task. Checks look for behaviour and accessible roles and names, not markup,
// so any correct solution passes.
import { expect } from '@playwright/test';

/** @typedef {{ html: string, css?: string, js?: string }} PageFiles */
/** @typedef {{ id: string, prompt: string, reference: PageFiles, check: (page: import('@playwright/test').Page) => Promise<void> }} Task */

/** Submits the first form and reports whether the submit went through (with its FormData). */
async function trackSubmits(page) {
  await page.evaluate(() => {
    window.__submits = [];
    for (const form of document.querySelectorAll('form')) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        window.__submits.push(Object.fromEntries(new FormData(e.target)));
      });
    }
  });
}

/** @type {Task[]} */
export const tasks = [
  {
    id: 'signup-form',
    prompt:
      'Build a sign-up form with fields for full name, email address and password (at least 8 characters), all required, a required checkbox to agree to the terms of service, and a "Create account" button that submits the form.',
    reference: {
      html: `<form>
  <va-text-field label="Full name" name="name" required autocomplete="name"></va-text-field>
  <va-text-field label="Email address" name="email" type="email" required autocomplete="email"></va-text-field>
  <va-text-field label="Password" name="password" type="password" minlength="8" required autocomplete="new-password"></va-text-field>
  <va-checkbox name="terms" required>I agree to the terms of service</va-checkbox>
  <va-button type="submit">Create account</va-button>
</form>`,
      css: 'form { display: grid; gap: var(--va-space-inline-lg); max-width: 24rem; }',
    },
    async check(page) {
      await trackSubmits(page);
      const submit = page.getByRole('button', { name: /create account/i });
      await submit.click();
      expect(await page.evaluate(() => window.__submits.length), 'an empty form must not submit').toBe(0);
      await page.getByRole('textbox', { name: /name/i }).first().fill('Ada Lovelace');
      await page.getByRole('textbox', { name: /email/i }).fill('not-an-email');
      await page.getByLabel(/password/i).first().fill('short');
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await submit.click();
      expect(await page.evaluate(() => window.__submits.length), 'an invalid email or short password must not submit').toBe(0);
      await page.getByRole('textbox', { name: /email/i }).fill('ada@example.com');
      await page.getByLabel(/password/i).first().fill('analytical-engine');
      await submit.click();
      expect(await page.evaluate(() => window.__submits.length), 'a valid form must submit').toBe(1);
    },
  },
  {
    id: 'settings-tabs',
    prompt:
      'Build a settings page with three tabs: Profile, Notifications and Privacy. The Notifications tab contains two on/off settings that apply immediately: "Email updates" and "Push notifications".',
    reference: {
      html: `<va-tabs label="Settings">
  <button slot="tab">Profile</button>
  <button slot="tab">Notifications</button>
  <button slot="tab">Privacy</button>
  <div slot="panel"><p>Your name and photo.</p></div>
  <div slot="panel">
    <va-switch>Email updates</va-switch>
    <va-switch>Push notifications</va-switch>
  </div>
  <div slot="panel"><p>Who can see your profile.</p></div>
</va-tabs>`,
    },
    async check(page) {
      await expect(page.getByRole('tablist')).toBeVisible();
      for (const name of ['Profile', 'Notifications', 'Privacy']) await expect(page.getByRole('tab', { name })).toBeVisible();
      await page.getByRole('tab', { name: 'Notifications' }).click();
      await expect(page.getByRole('switch', { name: /email updates/i })).toBeVisible();
      await expect(page.getByRole('switch', { name: /push notifications/i })).toBeVisible();
      await page.getByRole('tab', { name: 'Privacy' }).click();
      await expect(page.getByRole('switch', { name: /email updates/i })).toBeHidden();
    },
  },
  {
    id: 'delete-confirm',
    prompt:
      'Build a "Delete project" button that opens a confirmation dialog titled "Delete project?" with a short warning, a "Cancel" button that closes the dialog, and a "Delete" button.',
    reference: {
      html: `<va-button variant="danger" commandfor="confirm-delete" command="--show">Delete project</va-button>
<va-dialog id="confirm-delete" heading="Delete project?">
  <p>This deletes the project and its files for everyone. You can't undo this.</p>
  <va-button slot="footer" variant="secondary" commandfor="confirm-delete" command="--close">Cancel</va-button>
  <va-button slot="footer" variant="danger">Delete</va-button>
</va-dialog>`,
    },
    async check(page) {
      await page.getByRole('button', { name: /delete project/i }).click();
      // Buttons in the dialog are slotted children of the component, not DOM descendants of the
      // native <dialog>, so find them at page level.
      await expect(page.getByRole('dialog', { name: /delete project/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^delete$/i })).toBeVisible();
      await page.getByRole('button', { name: /^cancel$/i }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
    },
  },
  {
    id: 'row-actions',
    prompt:
      'Build a list of three files (report.pdf, photo.png, notes.txt). Each file has its own "Actions" menu button offering Rename, Download and Delete.',
    reference: {
      html: `<ul class="files">
  <li><span>report.pdf</span><va-menu label="Actions"><button value="rename">Rename</button><button value="download">Download</button><button value="delete">Delete</button></va-menu></li>
  <li><span>photo.png</span><va-menu label="Actions"><button value="rename">Rename</button><button value="download">Download</button><button value="delete">Delete</button></va-menu></li>
  <li><span>notes.txt</span><va-menu label="Actions"><button value="rename">Rename</button><button value="download">Download</button><button value="delete">Delete</button></va-menu></li>
</ul>`,
      css: '.files { list-style: none; padding: 0; display: grid; gap: var(--va-space-inline-sm); max-width: 28rem; } .files li { display: flex; justify-content: space-between; align-items: center; }',
    },
    async check(page) {
      for (const file of ['report.pdf', 'photo.png', 'notes.txt']) await expect(page.getByText(file, { exact: true })).toBeVisible();
      const menus = page.getByRole('button', { name: /actions/i });
      await expect(menus).toHaveCount(3);
      await menus.first().click();
      for (const item of ['Rename', 'Download', 'Delete']) await expect(page.getByRole('menuitem', { name: item })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu')).toBeHidden();
    },
  },
  {
    id: 'save-toast',
    prompt: 'Build a "Save changes" button that, when clicked, shows a short "Changes saved" success message that does not block the page.',
    reference: {
      html: `<va-button commandfor="toaster" command="--show" value="Changes saved" data-variant="success">Save changes</va-button>
<va-toast id="toaster"></va-toast>`,
    },
    async check(page) {
      await page.getByRole('button', { name: /save changes/i }).click();
      await expect(page.getByRole('status')).toContainText(/changes saved/i);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    },
  },
  {
    id: 'newsletter',
    prompt:
      'Build a newsletter sign-up: an email field and a "Subscribe" button side by side, with the help text "We send one email a week." under the field.',
    reference: {
      html: `<form class="newsletter">
  <va-text-field label="Email address" name="email" type="email" required autocomplete="email" help-text="We send one email a week."></va-text-field>
  <va-button type="submit">Subscribe</va-button>
</form>`,
      css: '.newsletter { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--va-space-inline-md); } .newsletter va-button { margin-top: 1.6rem; }',
    },
    async check(page) {
      const email = page.getByRole('textbox', { name: /email/i });
      await expect(email).toBeVisible();
      await expect(email).toHaveAccessibleDescription(/one email a week/i);
      await expect(page.getByRole('button', { name: /subscribe/i })).toBeVisible();
    },
  },
  {
    id: 'dark-mode-switch',
    prompt: 'Build a "Dark theme" on/off switch that switches the whole page between light and dark colours immediately.',
    reference: {
      html: '<va-switch id="dark-theme">Dark theme</va-switch>',
      js: `const toggle = document.querySelector('#dark-theme');
toggle.addEventListener('change', () => {
  document.documentElement.dataset.vaMode = toggle.checked ? 'dark' : 'light';
});`,
    },
    async check(page) {
      const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const lum = (c) => {
        const [r, g, b] = c.match(/\d+/g).map(Number);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const before = lum(await bg());
      await page.getByRole('switch', { name: /dark theme/i }).click();
      await page.waitForTimeout(300);
      const after = lum(await bg());
      expect(before - after, 'the page background must get much darker').toBeGreaterThan(100);
    },
  },
  {
    id: 'notification-prefs',
    prompt:
      'Build a notification preferences form with three options submitted with the form: Email, SMS and Push. Email is selected by default. Add a "Save preferences" button.',
    reference: {
      html: `<form class="prefs">
  <va-checkbox name="channel" value="email" checked>Email</va-checkbox>
  <va-checkbox name="channel" value="sms">SMS</va-checkbox>
  <va-checkbox name="channel" value="push">Push</va-checkbox>
  <va-button type="submit">Save preferences</va-button>
</form>`,
      css: '.prefs { display: grid; gap: var(--va-space-inline-sm); justify-items: start; }',
    },
    async check(page) {
      await expect(page.getByRole('checkbox', { name: /^email$/i })).toBeChecked();
      await expect(page.getByRole('checkbox', { name: /^sms$/i })).not.toBeChecked();
      await expect(page.getByRole('checkbox', { name: /^push$/i })).not.toBeChecked();
      await trackSubmits(page);
      await page.getByRole('checkbox', { name: /^push$/i }).check();
      await page.getByRole('button', { name: /save preferences/i }).click();
      expect(await page.evaluate(() => window.__submits.length), 'the form must submit').toBe(1);
    },
  },
  {
    id: 'icon-toolbar',
    prompt: 'Build a text-formatting toolbar with three icon-only buttons, Bold, Italic and Underline, each showing a small inline SVG icon and no visible text.',
    reference: {
      html: `<div class="toolbar">
  <va-button variant="ghost" label="Bold"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 5h6a3 3 0 0 1 0 6H7zM7 11h7a3 3 0 0 1 0 6H7z"/></svg></va-button>
  <va-button variant="ghost" label="Italic"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 5h-4M14 19h-4M13 5l-2 14"/></svg></va-button>
  <va-button variant="ghost" label="Underline"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 5v6a5 5 0 0 0 10 0V5M6 20h12"/></svg></va-button>
</div>`,
      css: '.toolbar { display: flex; gap: var(--va-space-gap-sm); }',
    },
    async check(page) {
      for (const name of ['Bold', 'Italic', 'Underline']) {
        const button = page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });
        await expect(button).toBeVisible();
        expect((await button.innerText()).trim(), `${name} must have no visible text`).toBe('');
      }
    },
  },
  {
    id: 'product-search',
    prompt: 'Build a product search: a search field labelled "Search products" with the placeholder "e.g. running shoes", and a "Search" button.',
    reference: {
      html: `<form class="search" role="search">
  <va-text-field label="Search products" name="q" type="search" placeholder="e.g. running shoes"></va-text-field>
  <va-button type="submit">Search</va-button>
</form>`,
      css: '.search { display: flex; align-items: flex-end; gap: var(--va-space-inline-md); }',
    },
    async check(page) {
      const field = page.getByRole('searchbox', { name: /search products/i }).or(page.getByRole('textbox', { name: /search products/i }));
      await expect(field).toBeVisible();
      await expect(field).toHaveAttribute('placeholder', /running shoes/i);
      await expect(page.getByRole('button', { name: /^search$/i })).toBeVisible();
    },
  },
  {
    id: 'sign-in-error',
    prompt:
      'Build a sign-in form with an email field and a password field, where the password field is already showing the error "Incorrect password. Try again.", and a "Sign in" button.',
    reference: {
      html: `<form class="signin">
  <va-text-field label="Email address" name="email" type="email" value="ada@example.com" autocomplete="email"></va-text-field>
  <va-text-field label="Password" name="password" type="password" error="Incorrect password. Try again." autocomplete="current-password"></va-text-field>
  <va-button type="submit">Sign in</va-button>
</form>`,
      css: '.signin { display: grid; gap: var(--va-space-inline-lg); max-width: 22rem; justify-items: start; }',
    },
    async check(page) {
      const password = page.getByLabel(/password/i).first();
      await expect(password).toHaveAttribute('aria-invalid', 'true');
      await expect(password).toHaveAccessibleDescription(/incorrect password/i);
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    },
  },
  {
    id: 'button-states',
    prompt: 'Build a checkout footer with a "Pay now" button that is shown in a loading state (payment in progress) and an "Apply coupon" button that is disabled.',
    reference: {
      html: `<div class="actions">
  <va-button variant="secondary" disabled>Apply coupon</va-button>
  <va-button loading>Pay now</va-button>
</div>`,
      css: '.actions { display: flex; gap: var(--va-space-inline-md); }',
    },
    async check(page) {
      const pay = page.getByRole('button', { name: /pay now/i });
      await expect(pay).toHaveAttribute('aria-busy', 'true');
      await expect(page.getByRole('button', { name: /apply coupon/i })).toBeDisabled();
    },
  },
];
