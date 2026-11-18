import { Directive, directive, PartType, type ElementPart, type PartInfo } from 'lit/directive.js';

/**
 * Sets inline styles through the CSSOM (element.style), never through a style attribute, so a
 * strict Content Security Policy allows them. Lit's styleMap writes a style attribute on the first
 * render, which `style-src 'self'` blocks. Use it in an element position: <span ${cssom({ … })}>.
 */
class CssomDirective extends Directive {
  #previous = new Set<string>();

  constructor(part: PartInfo) {
    super(part);
    if (part.type !== PartType.ELEMENT) throw new Error('cssom() goes in an element position: <div ${cssom({…})}>.');
  }

  render(styles: Record<string, string>) {
    void styles;
    return undefined;
  }

  override update(part: ElementPart, [styles]: [Record<string, string>]) {
    const style = (part.element as HTMLElement).style;
    for (const name of this.#previous) if (!(name in styles)) style.removeProperty(name);
    for (const [name, value] of Object.entries(styles)) style.setProperty(name, value);
    this.#previous = new Set(Object.keys(styles));
    return undefined;
  }
}

export const cssom = directive(CssomDirective);
