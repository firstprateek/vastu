// Adds Vastu fields to each component in custom-elements.json:
//   x-keyboard   [{ key, action, description }]   from @keyboard Key | action | description
//   x-a11y       { role, name, notes[] }          from @a11y-role, @a11y-name, @a11y-note
//   x-guidance   { use, avoid, instead }          from @guidance-use, @guidance-avoid, @guidance-instead
//   events[].x-trigger      "click" | "press Key"           from @event-trigger event | how
//   cssProperties[].x-applies { part, state?, property } from @cssprop-applies --var part[:hover] property
//   x-examples   [{ title, description, path, code }] from src/<component>/examples/*.html
// It also fails the build when a component lacks a summary, keyboard table, a11y role or guidance,
// so a component can't ship with an incomplete description.
import fs from 'node:fs';
import path from 'node:path';

const KEYBOARD_ACTIONS = new Set(['activates', 'focus-next', 'focus-previous', 'closes', 'opens', 'next', 'previous', 'first', 'last', 'toggles']);

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
          const [key, action, description] = text.split('|').map((s) => s.trim());
          if (!KEYBOARD_ACTIONS.has(action)) {
            throw new Error(`${node.name.text}: @keyboard ${key} has unknown action "${action}". Use one of: ${[...KEYBOARD_ACTIONS].join(', ')}.`);
          }
          x.keyboard.push({ key, action, description });
        } else if (name === 'a11y-role') x.a11y.role = text;
        else if (name === 'a11y-name') x.a11y.name = text;
        else if (name === 'a11y-note') x.a11y.notes.push(text);
        else if (name === 'guidance-use') x.guidance.use = text;
        else if (name === 'guidance-avoid') x.guidance.avoid = text;
        else if (name === 'guidance-instead') x.guidance.instead = text;
        else if (name === 'event-trigger') {
          // "event | click" or "event | press Key": how a contract test makes the event fire.
          const [event, how] = text.split('|').map((s) => s.trim());
          x.triggers[event] = how;
        } else if (name === 'cssprop-applies') {
          // "--var part property", or "--var part:hover property" for a value that only shows on hover.
          const [variable, target, property] = text.split(/\s+/);
          const [part, state] = target.split(':');
          x.applies[variable] = state ? { part, state, property } : { part, property };
        }
      }
      extras.set(node.name.text, x);
    },
    packageLinkPhase({ customElementsManifest }) {
      for (const mod of customElementsManifest.modules) {
        for (const decl of mod.declarations ?? []) {
          if (!decl.customElement) continue;
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
          decl['x-a11y'] = x.a11y;
          decl['x-guidance'] = x.guidance;
          for (const prop of decl.cssProperties ?? []) {
            if (!x.applies[prop.name]) throw new Error(`${where}: ${prop.name} has no @cssprop-applies line, so it can't be contract-tested.`);
            prop['x-applies'] = x.applies[prop.name];
          }
          for (const event of decl.events ?? []) {
            if (!x.triggers[event.name]) throw new Error(`${where}: event ${event.name} has no @event-trigger line, so it can't be contract-tested.`);
            event['x-trigger'] = x.triggers[event.name];
          }
          // Public API only: drop private (#), protected and static framework plumbing (styles, properties…).
          decl.members = (decl.members ?? []).filter((m) => !m.name.startsWith('#') && !m.static && m.privacy !== 'private' && m.privacy !== 'protected');

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
        }
      }
    },
  };
}
