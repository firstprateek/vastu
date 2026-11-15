/** Defines a custom element once. A second definition of the same tag is a no-op, not an error. */
export function define(tag: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
}
