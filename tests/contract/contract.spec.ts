// Contract tests, generated from custom-elements.json. For every component, every documented
// attribute, property, event, slot, part, CSS custom property and keyboard row gets a test that
// checks the code does what the manifest says. The reverse check fails on public API that the
// manifest doesn't describe. Adding a component needs no changes here.
//
// Tests run against the first instance of the component in its first example, so composite
// components (tabs, menus) have real content.
import type { Page } from '@playwright/test';
import { components, componentDir, exampleName, expect, test } from '../fixtures.js';

/** A value to set for a declared type, different from the default, plus what the property should read back. */
function sample(typeText: string, defaultValue?: string): { attr: string | null; prop: unknown } {
  const t = typeText.trim();
  if (t === 'boolean') return { attr: '', prop: true };
  if (t === 'number') return { attr: defaultValue === '1' ? '2' : '1', prop: defaultValue === '1' ? 2 : 1 };
  if (t === 'string') return { attr: 'contract-sample', prop: 'contract-sample' };
  const literals = [...t.matchAll(/'([^']*)'/g)].map((m) => m[1]);
  if (literals.length && t.replace(/'[^']*'|\|/g, '').trim() === '') {
    const pick = literals.find((l) => `'${l}'` !== defaultValue) ?? literals[0];
    return { attr: pick, prop: pick };
  }
  throw new Error(`Contract tests can't sample the type "${t}". Use boolean, number, string or a union of string literals.`);
}

const SENTINEL: Record<string, { set: string; computed: string }> = {
  '<color>': { set: 'rgb(1, 2, 3)', computed: 'rgb(1, 2, 3)' },
  '<length>': { set: '37px', computed: '37px' },
};

/** Index, among the host's items, of the item that has focus (looking through shadow roots). */
async function focusedItemIndex(page: Page, selector: string): Promise<number> {
  return page.locator('#subject').evaluate((host, selector) => {
    const items = [...host.querySelectorAll(selector)];
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return items.findIndex((item) => item === active || item.contains(active));
  }, selector);
}

async function openSubject(page: Page): Promise<void> {
  await page.locator('#subject').evaluate(async (el: any) => {
    if (typeof el.show === 'function') el.show();
    else el.open = true;
    await el.updateComplete;
  });
  await page.waitForTimeout(50);
}

for (const c of components) {
  const tag: string = c.tagName;
  const fixture = exampleName(c['x-examples'][0]);
  const items: string | undefined = c['x-keyboard-items'];

  test.describe(`${tag} contract`, () => {
    test.beforeEach(async ({ page, open }) => {
      // Reduced motion turns transitions off, so computed styles are final values.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(`c=${componentDir(tag)}&e=${fixture}`);
      await page.evaluate((tag) => {
        document.querySelector(tag)!.id = 'subject';
      }, tag);
    });

    for (const attr of c.attributes ?? []) {
      test(`attribute ${attr.name} sets property ${attr.fieldName}`, async ({ page }) => {
        const { attr: value, prop } = sample(attr.type.text, attr.default);
        const got = await page.locator('#subject').evaluate(
          async (el: any, { name, value, field }) => {
            el.setAttribute(name, value);
            await el.updateComplete;
            return el[field];
          },
          { name: attr.name, value, field: attr.fieldName }
        );
        expect(got).toEqual(prop);
      });
    }

    for (const member of (c.members ?? []).filter((m: any) => m.kind === 'field' && m.reflects)) {
      const attr = c.attributes.find((a: any) => a.fieldName === member.name);
      test(`property ${member.name} reflects to attribute ${attr.name}`, async ({ page }) => {
        const { attr: expected, prop } = sample(member.type.text, member.default);
        const got = await page.locator('#subject').evaluate(
          async (el: any, { field, prop, name }) => {
            el[field] = prop;
            await el.updateComplete;
            return el.getAttribute(name);
          },
          { field: member.name, prop, name: attr.name }
        );
        expect(got).toBe(expected);
      });
    }

    for (const event of c.events ?? []) {
      const { how, setup } = event['x-trigger'];
      test(`event ${event.name} fires on ${how}${setup ? ` (when ${setup})` : ''}`, async ({ page }) => {
        if (setup === 'open') await openSubject(page);
        await page.locator('#subject').evaluate((el, name) => {
          (window as any).__fired = 0;
          el.addEventListener(name, () => (window as any).__fired++);
        }, event.name);
        const [verb, arg] = how.split(/\s+/);
        if (verb === 'click') {
          await page.locator('#subject').click();
        } else if (verb === 'press') {
          if (setup !== 'open') await page.locator('#subject').focus();
          await page.keyboard.press(arg);
        } else if (verb === 'commit') {
          // Edit, then leave the field: what makes a text input fire change.
          await page.locator('#subject').focus();
          await page.keyboard.type('a');
          await page.keyboard.press('Tab');
        } else if (verb === 'click-item') {
          await page.locator('#subject').locator(items!).nth(Number(arg) - 1).click();
        } else if (verb === 'call') {
          await page.locator('#subject').evaluate((el: any, method) => el[method](), arg);
        } else {
          throw new Error(`Unknown trigger "${how}" for ${event.name}`);
        }
        await expect.poll(() => page.evaluate(() => (window as any).__fired)).toBe(1);
      });
    }

    // Slot tests build deliberately incomplete elements (a tab with no panel), so warnings are expected.
    test.describe('slots', () => {
    test.use({ expectedWarnings: [/^<va-/] });
    for (const slot of c.slots ?? []) {
      const label = slot.name ? `slot "${slot.name}"` : 'default slot';
      test(`${label} renders its content`, async ({ page }) => {
        const hasLabel = (c.attributes ?? []).some((a: any) => a.name === 'label');
        const assigned = await page.evaluate(
          async ({ tag, name, hasLabel }) => {
            // Build a fresh element with its content before connecting it, as markup would.
            const el = document.createElement(tag) as any;
            if (hasLabel) el.setAttribute('label', 'Contract');
            const child = document.createElement('span');
            child.textContent = 'slotted';
            if (name) {
              child.slot = name;
              el.append('Contract');
            }
            el.append(child);
            document.querySelector('#stage')!.append(el);
            await el.updateComplete;
            const slotEl = el.shadowRoot.querySelector(name ? `slot[name="${name}"]` : 'slot:not([name])');
            return !!slotEl && slotEl.assignedNodes({ flatten: true }).includes(child);
          },
          { tag, name: slot.name, hasLabel }
        );
        expect(assigned).toBe(true);
      });
    }
    });

    for (const part of c.cssParts ?? []) {
      test(`part ${part.name} exists`, async ({ page }) => {
        const count = await page.locator('#subject').evaluate(
          (el, name) => el.shadowRoot!.querySelectorAll(`[part~="${name}"]`).length,
          part.name
        );
        expect(count).toBeGreaterThan(0);
      });
    }

    for (const prop of c.cssProperties ?? []) {
      const { part, light, state, property } = prop['x-applies'];
      const syntax = prop.syntax ?? prop.type?.text;
      const target = light ? `slotted ${light}` : `part ${part}`;
      test(`CSS property ${prop.name} sets ${property} of ${target}${state ? ` on ${state}` : ''}`, async ({ page }) => {
        const sentinel = SENTINEL[syntax];
        if (!sentinel) throw new Error(`No sentinel for CSS syntax ${syntax} of ${prop.name}`);
        if (state === 'open') await openSubject(page);
        if (state === 'invalid') {
          await page.locator('#subject').evaluate(async (el: any) => {
            el.error = 'Contract error';
            await el.updateComplete;
          });
        }
        if (state === 'checked' || state === 'unchecked') {
          await page.locator('#subject').evaluate(async (el: any, checked) => {
            el.checked = checked;
            el.indeterminate = false;
            await el.updateComplete;
          }, state === 'checked');
        }
        await page.locator('#subject').evaluate((el, { name, value }) => el.style.setProperty(name, value), {
          name: prop.name,
          value: sentinel.set,
        });
        if (state === 'hover') {
          const box = await page.locator('#subject').evaluate((el, part) => {
            const target = el.shadowRoot!.querySelector(`[part~="${part}"]`)!;
            target.scrollIntoView();
            const r = target.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          }, part);
          await page.mouse.move(box.x, box.y);
        }
        const got = await page.locator('#subject').evaluate(
          (el, { part, light, property }) => {
            const node = light ? el.querySelector(light) : el.shadowRoot!.querySelector(`[part~="${part}"]`);
            return getComputedStyle(node!).getPropertyValue(property);
          },
          { part, light, property }
        );
        expect(got).toBe(sentinel.computed);
      });
    }

    for (const row of c['x-keyboard'] ?? []) {
      const where = row.context === 'host' ? '' : ` (${row.context})`;
      test(`keyboard${where} ${row.key}: ${row.action}`, async ({ page, browserName }) => {
        test.skip(
          row.key.includes('Tab') && browserName === 'webkit' && process.platform === 'darwin',
          "macOS WebKit only tabs to buttons when the system's keyboard-navigation setting is on; CI runs WebKit on Linux."
        );
        await page.locator('#subject').evaluate((subject) => {
          const before = Object.assign(document.createElement('button'), { id: 'before', textContent: 'before' });
          const after = Object.assign(document.createElement('button'), { id: 'after', textContent: 'after' });
          subject.before(before);
          subject.after(after);
          (window as any).__clicks = 0;
          (window as any).__selects = 0;
          subject.addEventListener('click', () => (window as any).__clicks++);
          subject.addEventListener('va-select', () => (window as any).__selects++);
        });

        // Put focus where the row says the key is pressed.
        if (row.context === 'open') {
          await openSubject(page);
          if (items) await page.locator('#subject').locator(items).first().focus();
        } else if (row.context === 'items') {
          const start = await page.locator('#subject').evaluate((host, sel) => {
            const i = [...host.querySelectorAll<HTMLElement>(sel)].findIndex((el) => el.tabIndex === 0);
            return i < 0 ? 0 : i;
          }, items!);
          await page.locator('#subject').locator(items!).nth(start).focus();
        } else if (row.key.includes('Tab')) {
          await page.locator('#before').focus();
          await page.keyboard.press('Tab');
        } else {
          await page.locator('#subject').focus();
        }

        const before = items ? await focusedItemIndex(page, items) : -1;
        const count = items ? await page.locator('#subject').locator(items).count() : 0;
        const state = await page.locator('#subject').evaluate((el: any) => ({ checked: el.checked, open: el.open }));
        const focusedBefore = await page.evaluate(() => document.activeElement?.id || document.activeElement?.localName);

        await page.keyboard.press(row.key);
        await page.waitForTimeout(30);

        switch (row.action) {
          case 'activates':
            expect(await page.evaluate(() => (window as any).__clicks)).toBe(1);
            break;
          case 'toggles':
            expect(await page.locator('#subject').evaluate((el: any) => el.checked)).toBe(!state.checked);
            break;
          case 'opens':
            expect(state.open).toBe(false);
            expect(await page.locator('#subject').evaluate((el: any) => el.open)).toBe(true);
            break;
          case 'closes':
            expect(await page.locator('#subject').evaluate((el: any) => el.open)).toBe(false);
            break;
          case 'selects':
            expect(await page.evaluate(() => (window as any).__selects)).toBe(1);
            break;
          case 'focus-next': {
            const focusedAfter = await page.evaluate(() => document.activeElement?.id || document.activeElement?.localName);
            expect(focusedAfter).not.toBe(focusedBefore);
            if (row.context === 'host') await expect(page.locator('#after')).toBeFocused();
            break;
          }
          case 'next':
            expect(await focusedItemIndex(page, items!)).toBe((before + 1) % count);
            break;
          case 'previous':
            expect(await focusedItemIndex(page, items!)).toBe((before - 1 + count) % count);
            break;
          case 'first':
            expect(await focusedItemIndex(page, items!)).toBe(0);
            break;
          case 'last':
            expect(await focusedItemIndex(page, items!)).toBe(count - 1);
            break;
          default:
            throw new Error(`No contract check for keyboard action "${row.action}"; add one in tests/contract/contract.spec.ts.`);
        }
      });
    }

    test('has no public API the manifest leaves out', async ({ page }) => {
      // The analyzer lists every public member, so "documented" means listed *with a description*.
      const described = (x: any) => !!x.description?.trim();
      const documentedFields = new Set((c.members ?? []).filter((m: any) => m.kind === 'field' && described(m)).map((m: any) => m.name));
      const documentedMethods = new Set((c.members ?? []).filter((m: any) => m.kind === 'method' && described(m)).map((m: any) => m.name));
      const documentedAttrs = new Set((c.attributes ?? []).filter(described).map((a: any) => a.name));
      const actual = await page.evaluate((tag) => {
        const ctor = customElements.get(tag) as any;
        const reactive = [...ctor.elementProperties.entries()].filter(([, o]: any) => !o.state).map(([k]: any) => String(k));
        // Own prototype members of the component class and any Vastu base class, stopping at
        // LitElement (found by the createRenderRoot it defines; production builds rename classes).
        const own: { name: string; kind: string }[] = [];
        for (let proto = ctor.prototype; proto && !Object.hasOwn(proto, 'createRenderRoot'); proto = Object.getPrototypeOf(proto)) {
          for (const [name, d] of Object.entries(Object.getOwnPropertyDescriptors(proto))) {
            if (name === 'constructor' || name.startsWith('_')) continue;
            own.push({ name, kind: typeof (d as PropertyDescriptor).value === 'function' ? 'method' : 'field' });
          }
        }
        return { reactive, observed: [...ctor.observedAttributes], own };
      }, tag);
      // Lit lifecycle and form-associated callbacks are framework plumbing, not component API.
      const PLUMBING = new Set([
        'render', 'connectedCallback', 'disconnectedCallback', 'firstUpdated', 'updated', 'willUpdate', 'shouldUpdate', 'update',
        'attributeChangedCallback', 'createRenderRoot', 'formDisabledCallback', 'formResetCallback', 'formStateRestoreCallback', 'formAssociatedCallback',
      ]);
      const undocumented = [
        ...actual.reactive.filter((p) => !documentedFields.has(p)).map((p) => `property ${p}`),
        ...actual.observed.filter((a) => !documentedAttrs.has(a)).map((a) => `attribute ${a}`),
        ...actual.own
          .filter((m) => !PLUMBING.has(m.name) && !actual.reactive.includes(m.name))
          .filter((m) => (m.kind === 'method' ? !documentedMethods.has(m.name) : !documentedFields.has(m.name)))
          .map((m) => `${m.kind} ${m.name}`),
      ];
      expect(undocumented, `Document these in ${tag}'s JSDoc, mark them @internal, or make them private (#).`).toEqual([]);
    });
  });
}
