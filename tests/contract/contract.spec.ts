// Contract tests, generated from custom-elements.json. For every component, every documented
// attribute, property, event, slot, part, CSS custom property and keyboard row gets a test that
// checks the code does what the manifest says. The reverse check fails on public API that the
// manifest doesn't describe. Adding a component needs no changes here.
import { components, componentDir, expect, mount, test } from '../fixtures.js';

/** A value to set for a declared type, different from the default, plus what the property should read back. */
function sample(typeText: string, defaultValue?: string): { attr: string | null; prop: unknown } {
  const t = typeText.trim();
  if (t === 'boolean') return { attr: '', prop: true };
  if (t === 'number') return { attr: '7', prop: 7 };
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

for (const c of components) {
  const tag: string = c.tagName;

  test.describe(`${tag} contract`, () => {
    test.beforeEach(async ({ page, open }) => {
      // Reduced motion turns transitions off, so computed styles are final values.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(`c=${componentDir(tag)}`);
    });

    for (const attr of c.attributes ?? []) {
      test(`attribute ${attr.name} sets property ${attr.fieldName}`, async ({ page }) => {
        const { attr: value, prop } = sample(attr.type.text, attr.default);
        await mount(page, tag);
        const got = await page.evaluate(
          async ({ name, value, field }) => {
            const el = document.querySelector('#subject') as any;
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
        await mount(page, tag);
        const got = await page.evaluate(
          async ({ field, prop, name }) => {
            const el = document.querySelector('#subject') as any;
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
      test(`event ${event.name} fires on ${event['x-trigger']}`, async ({ page }) => {
        await mount(page, tag);
        await page.evaluate((name) => {
          const el = document.querySelector('#subject') as any;
          (window as any).__fired = 0;
          el.addEventListener(name, () => (window as any).__fired++);
        }, event.name);
        const [how, key] = event['x-trigger'].split(/\s+/);
        if (how === 'click') await page.locator('#subject').click();
        else if (how === 'press') {
          await page.locator('#subject').focus();
          await page.keyboard.press(key);
        } else throw new Error(`Unknown trigger "${event['x-trigger']}"`);
        expect(await page.evaluate(() => (window as any).__fired)).toBe(1);
      });
    }

    for (const slot of c.slots ?? []) {
      const label = slot.name ? `slot "${slot.name}"` : 'default slot';
      test(`${label} renders its content`, async ({ page }) => {
        const assigned = await page.evaluate(async ({ tag, name }) => {
          // Build the element with its content before connecting it, as markup would.
          const el = document.createElement(tag) as any;
          const child = document.createElement('span');
          child.textContent = 'slotted';
          if (name) {
            child.slot = name;
            el.textContent = 'Contract';
          }
          el.append(child);
          el.id = 'subject';
          document.querySelector('#stage')!.replaceChildren(el);
          await el.updateComplete;
          const slotEl = el.shadowRoot.querySelector(name ? `slot[name="${name}"]` : 'slot:not([name])');
          return !!slotEl && slotEl.assignedNodes().includes(child);
        }, { tag, name: slot.name });
        expect(assigned).toBe(true);
      });
    }

    for (const part of c.cssParts ?? []) {
      test(`part ${part.name} exists`, async ({ page }) => {
        await mount(page, tag);
        const count = await page.evaluate(
          (name) => (document.querySelector('#subject') as any).shadowRoot.querySelectorAll(`[part~="${name}"]`).length,
          part.name
        );
        expect(count).toBeGreaterThan(0);
      });
    }

    for (const prop of c.cssProperties ?? []) {
      const { part, state, property } = prop['x-applies'];
      const syntax = prop.syntax ?? prop.type?.text;
      test(`CSS property ${prop.name} sets ${property} of part ${part}${state ? ` on ${state}` : ''}`, async ({ page }) => {
        const sentinel = SENTINEL[syntax];
        if (!sentinel) throw new Error(`No sentinel for CSS syntax ${syntax} of ${prop.name}`);
        await mount(page, tag);
        await page.locator('#subject').evaluate((el, { name, value }) => el.style.setProperty(name, value), {
          name: prop.name,
          value: sentinel.set,
        });
        if (state === 'hover') await page.locator('#subject').hover();
        const got = await page.locator('#subject').evaluate(
          (el, { part, property }) => getComputedStyle(el.shadowRoot!.querySelector(`[part~="${part}"]`)!).getPropertyValue(property),
          { part, property }
        );
        expect(got).toBe(sentinel.computed);
      });
    }

    for (const row of c['x-keyboard'] ?? []) {
      test(`keyboard ${row.key}: ${row.action}`, async ({ page, browserName }) => {
        test.skip(
          row.key === 'Tab' && browserName === 'webkit' && process.platform === 'darwin',
          "macOS WebKit only tabs to buttons when the system's keyboard-navigation setting is on; CI runs WebKit on Linux."
        );
        await mount(page, tag);
        await page.evaluate(() => {
          const before = document.createElement('button');
          before.id = 'before';
          before.textContent = 'before';
          const after = document.createElement('button');
          after.id = 'after';
          after.textContent = 'after';
          const subject = document.querySelector('#subject')!;
          subject.before(before);
          subject.after(after);
          (window as any).__clicks = 0;
          subject.addEventListener('click', () => (window as any).__clicks++);
        });
        if (row.key === 'Tab') {
          await page.locator('#before').focus();
          await page.keyboard.press('Tab');
        } else {
          await page.locator('#subject').focus();
        }
        await expect(page.locator('#subject')).toBeFocused();
        const key = row.key === 'Space' ? ' ' : row.key;
        await page.keyboard.press(key === ' ' ? 'Space' : key);
        if (row.action === 'activates') {
          expect(await page.evaluate(() => (window as any).__clicks)).toBe(1);
        } else if (row.action === 'focus-next') {
          await expect(page.locator('#after')).toBeFocused();
        } else {
          throw new Error(`No contract check for keyboard action "${row.action}" yet; add one in tests/contract/contract.spec.ts.`);
        }
      });
    }

    test('has no public API the manifest leaves out', async ({ page }) => {
      await mount(page, tag);
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
      // Lit lifecycle overrides are framework plumbing, not component API.
      const LIFECYCLE = new Set(['render', 'connectedCallback', 'disconnectedCallback', 'firstUpdated', 'updated', 'willUpdate', 'shouldUpdate', 'update', 'attributeChangedCallback', 'createRenderRoot']);
      const undocumented = [
        ...actual.reactive.filter((p) => !documentedFields.has(p)).map((p) => `property ${p}`),
        ...actual.observed.filter((a) => !documentedAttrs.has(a)).map((a) => `attribute ${a}`),
        ...actual.own
          .filter((m) => !LIFECYCLE.has(m.name) && !actual.reactive.includes(m.name))
          .filter((m) => (m.kind === 'method' ? !documentedMethods.has(m.name) : !documentedFields.has(m.name)))
          .map((m) => `${m.kind} ${m.name}`),
      ];
      expect(undocumented, `Document these in ${tag}'s JSDoc, mark them @internal, or make them private (#).`).toEqual([]);
    });
  });
}
