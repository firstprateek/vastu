// Reads the component manifest at build time. Every docs page is generated from it.
import manifest from '@firstprateek/vastu/custom-elements.json';

export const components: any[] = (manifest as any).modules
  .flatMap((m: any) => m.declarations ?? [])
  .filter((d: any) => d.customElement && d.tagName);

export const slug = (tag: string) => tag.replace(/^va-/, '');
export const title = (tag: string) => slug(tag).replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Turns `code` spans in manifest prose into <code>, escaping everything else. */
export function inline(text = ''): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/`([^`]+)`/g, '<code>$1</code>');
}
