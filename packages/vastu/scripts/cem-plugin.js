// Adds Vastu fields to each component in custom-elements.json:
//   x-keyboard   [{ key, action, description }]   from @keyboard Key | action | description
//   x-a11y       { role, name, nameFrom[], notes[] } from @a11y-role, @a11y-name, @a11y-name-from, @a11y-note
//   x-replaces   "css selector"                    from @replaces (native elements to use this instead of)
//   x-commands   [{ name, description }]           from @command --name | description
//   x-guidance   { use, avoid, instead }          from @guidance-use, @guidance-avoid, @guidance-instead
//   events[].x-trigger      "click" | "press Key"           from @event-trigger event | how
//   cssProperties[].x-applies { part, state?, property } from @cssprop-applies --var part[:hover] property
//   x-examples   [{ title, description, path, code }] from src/<component>/examples/*.html
// It also fails the build when a component lacks a summary, keyboard table, a11y role or guidance,
// so a component can't ship with an incomplete description.
import fs from 'node:fs';
import path from 'node:path';

// What a key does, in words a contract test can check (tests/contract/contract.spec.ts).
const KEYBOARD_ACTIONS = new Set(['activates', 'toggles', 'focus-next', 'opens', 'closes', 'next', 'previous', 'first', 'last', 'selects']);
// Where focus is when the key is pressed: on the host (default), on an item, or inside the open element.
const KEYBOARD_CONTEXTS = new Set(['host', 'items', 'open']);

function tagText(tag) {
  const c = tag.comment;
  if (!c) return '';
  return (typeof c === 'string' ? c : c.map((p) => p.text).join('')).trim();
}

export function vastuManifestPlugin() {
  const extras = new Map(); // class name -> parsed tags

  return {
    name: 'vastu',
    analyzePhase({ ts, node }) {
      if (node.kind !== ts.SyntaxKind.ClassDeclaration || !node.name) return;
      const tags = (node.jsDoc ?? []).flatMap((doc) => doc.tags ?? []);
      const x = { keyboard: [], a11y: { notes: [] }, guidance: {}, applies: {}, triggers: {} };
      for (const tag of tags) {
        const name = tag.tagName.text;
        const text = tagText(tag);
        if (name === 'keyboard') {
          // "[context:] Key | action | description", e.g. "items: ArrowRight | next | Moves to the next tab."
          const [head, action, description] = text.split('|').map((s) => s.trim());
          const m = head.match(/^(?:(\w+):\s*)?(.+)$/);
          const context = m[1] ?? 'host';
          const key = m[2];
          if (!KEYBOARD_ACTIONS.has(action)) {
            throw new Error(`${node.name.text}: @keyboard ${key} has unknown action "${action}". Use one of: ${[...KEYBOARD_ACTIONS].join(', ')}.`);
          }
          if (!KEYBOARD_CONTEXTS.has(context)) {
            throw new Error(`${node.name.text}: @keyboard ${key} has unknown context "${context}". Use one of: ${[...KEYBOARD_CONTEXTS].join(', ')}.`);
          }
          x.keyboard.push({ context, key, action, description });
        } else if (name === 'keyboard-items') {
          // CSS selector, relative to the host, for the items that arrow keys move between.
          x.items = text;
        } else if (name === 'a11y-role') x.a11y.role = text;
        else if (name === 'a11y-name') x.a11y.name = text;
        // Machine-readable: where the accessible name may come from ("text" = slotted text, or attribute names).
        else if (name === 'a11y-name-from') x.a11y.nameFrom = text.split(',').map((t) => t.trim());
        // Native elements this component should be used instead of, as CSS selectors (for vastu-lint).
        else if (name === 'replaces') x.replaces = text;
        // Commands the element accepts from a commandfor/command button: "--name | description".
        else if (name === 'command') {
          const [command, description] = text.split('|').map((t) => t.trim());
          (x.commands ??= []).push({ name: command, description });
        }
        else if (name === 'a11y-note') x.a11y.notes.push(text);
        else if (name === 'guidance-use') x.guidance.use = text;
        else if (name === 'guidance-avoid') x.guidance.avoid = text;
        else if (name === 'guidance-instead') x.guidance.instead = text;
        else if (name === 'event-trigger') {
          // "event | how [| open]": how a contract test makes the event fire ("click", "press Key",
          // "call method"), and "open" if the element must be open first.
          const [event, how, setup] = text.split('|').map((s) => s.trim());
          x.triggers[event] = setup ? { how, setup } : { how };
        } else if (name === 'cssprop-applies') {
          // "--var part property"; "--var part:state property" for a value that only shows in a state
          // (hover, checked, unchecked, invalid, open); "--var light(selector) property" for a slotted element.
          const m = text.match(/^(\S+)\s+(light\(.*\)(?::[a-z]+)?|\S+)\s+(\S+)$/);
          if (!m) throw new Error(`${node.name.text}: can't read "@cssprop-applies ${text}". Use: --var part[:state] property, or --var light(selector) property.`);
          const [, variable, target, property] = m;
          if (target.startsWith('light(')) {
            // light(selector) or light(selector):focus, for slotted elements styled through ::slotted().
            const lm = target.match(/^light\((.*)\)(?::([a-z]+))?$/);
            x.applies[variable] = lm[2] ? { light: lm[1], state: lm[2], property } : { light: lm[1], property };
          } else {
            const [part, state] = target.split(':');
            x.applies[variable] = state ? { part, state, property } : { part, property };
          }
        }
      }
      extras.set(node.name.text, x);
    },
    packageLinkPhase({ customElementsManifest }) {
      // File listing order differs between macOS and Linux; sort so the manifest is deterministic.
      customElementsManifest.modules.sort((a, b) => a.path.localeCompare(b.path));
      for (const mod of customElementsManifest.modules) {
        for (const decl of mod.declarations ?? []) {
          if (!decl.customElement || !decl.tagName) continue; // base classes have no tag
          const x = extras.get(decl.name);
          const where = `${decl.tagName} (${mod.path})`;
          const missing = [];
          if (!decl.summary) missing.push('@summary');
          if (!x?.keyboard.length) missing.push('@keyboard');
          if (!x?.a11y.role) missing.push('@a11y-role');
          if (!x?.a11y.name) missing.push('@a11y-name');
          if (!x?.guidance.use || !x?.guidance.avoid) missing.push('@guidance-use/@guidance-avoid');
          if (missing.length) throw new Error(`${where} is missing ${missing.join(', ')} in its JSDoc.`);

          decl['x-keyboard'] = x.keyboard;
          if (x.items) decl['x-keyboard-items'] = x.items;
          if (x.keyboard.some((k) => k.context === 'items' || ['next', 'previous', 'first', 'last', 'selects'].includes(k.action)) && !x.items) {
            throw new Error(`${where} has item navigation keys but no @keyboard-items selector.`);
          }
          decl['x-a11y'] = x.a11y;
          decl['x-guidance'] = x.guidance;
          if (x.replaces) decl['x-replaces'] = x.replaces;
          if (x.commands) decl['x-commands'] = x.commands;
          for (const source of x.a11y.nameFrom ?? []) {
            if (source !== 'text' && !(decl.attributes ?? []).some((attr) => attr.name === source)) {
              throw new Error(`${where}: @a11y-name-from names "${source}", which is not an attribute.`);
            }
          }
          for (const prop of decl.cssProperties ?? []) {
            if (!x.applies[prop.name]) throw new Error(`${where}: ${prop.name} has no @cssprop-applies line, so it can't be contract-tested.`);
            prop['x-applies'] = x.applies[prop.name];
          }
          // FormControl's generic _emit(type) helper makes the analyzer guess an event named "type".
          // Components document their real events with @fires, so drop the guessed one.
          decl.events = (decl.events ?? []).filter((e) => e.inheritedFrom?.name !== 'FormControl');
          for (const event of decl.events) {
            if (!x.triggers[event.name]) throw new Error(`${where}: event ${event.name} has no @event-trigger line, so it can't be contract-tested.`);
            event['x-trigger'] = x.triggers[event.name];
          }
          decl.attributes = (decl.attributes ?? []).filter((a) => !a.name.startsWith('_') && !a.fieldName?.startsWith('_'));
          // Public API only: drop private (#, _), protected, @internal and static framework plumbing.
          decl.members = (decl.members ?? []).filter(
            (m) => !m.name.startsWith('#') && !m.name.startsWith('_') && !m.static && m.privacy !== 'private' && m.privacy !== 'protected' && !/@internal/.test(m.description ?? '')
          );

          const dir = path.join(path.dirname(mod.path), 'examples');
          decl['x-examples'] = fs.existsSync(dir)
            ? fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort().map((f) => {
                const raw = fs.readFileSync(path.join(dir, f), 'utf8');
                const meta = raw.match(/^<!--([\s\S]*?)-->/);
                const field = (k) => meta?.[1].match(new RegExp(`${k}:\\s*([\\s\\S]*?)(?=\\n\\s*\\w+:|$)`))?.[1].replace(/\s+/g, ' ').trim() ?? '';
                return { title: field('title'), description: field('description'), path: path.join(dir, f), code: raw.replace(/^<!--[\s\S]*?-->\n?/, '').trim() };
              })
            : [];
          if (!decl['x-examples'].length) throw new Error(`${where} has no examples in ${dir}.`);
          // Examples are what people and agents copy, so they must work under a strict CSP.
          for (const ex of decl['x-examples']) {
            if (/\sstyle=|<script|<style|\son[a-z]+=/i.test(ex.code)) {
              throw new Error(`${ex.path} uses an inline style, script or on…= handler. Examples must work under a strict CSP.`);
            }
          }
        }
      }
    },
  };
}
