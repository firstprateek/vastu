// vastu-mcp, tested through a real MCP client over an in-memory transport.
import { beforeAll, describe, expect, test } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, findComponent } from '../src/server.js';

let client;
const call = async (name, args = {}) => {
  const result = await client.callTool({ name, arguments: args });
  return { ...result, data: (() => { try { return JSON.parse(result.content[0].text); } catch { return result.content[0].text; } })() };
};

beforeAll(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: 'test', version: '0' });
  await client.connect(clientSide);
});

test('lists the five tools', async () => {
  const { tools } = await client.listTools();
  expect(tools.map((t) => t.name).sort()).toEqual(['find_component', 'get_component', 'get_tokens', 'list_components', 'validate_markup']);
  for (const t of tools) expect(t.description.length).toBeGreaterThan(40);
});

test('list_components returns setup and every component', async () => {
  const { data } = await call('list_components');
  expect(data.setup.install).toContain('@firstprateek/vastu');
  expect(data.components.map((c) => c.tag)).toEqual(expect.arrayContaining(['va-button', 'va-dialog', 'va-text-field', 'va-toast']));
});

describe('find_component', () => {
  const top = (intent) => findComponent(intent)[0]?.tag;
  test.each([
    ['a yes/no setting that applies immediately', 'va-switch'],
    ['ask the user to confirm before deleting', 'va-dialog'],
    ['let users type their email address', 'va-text-field'],
    ['show that changes were saved', 'va-toast'],
    ['a dropdown of actions for a row', 'va-menu'],
    ['agree to the terms of service', 'va-checkbox'],
    ['switch between sections of settings', 'va-tabs'],
    ['submit the form', 'va-button'],
  ])('%s → %s', (intent, tag) => {
    expect(top(intent)).toBe(tag);
  });

  test('answers with reasons and guidance through MCP', async () => {
    const { data } = await call('find_component', { intent: 'confirm before deleting' });
    expect(data[0]).toMatchObject({ tag: 'va-dialog' });
    expect(data[0].why).toMatch(/confirm/);
    expect(data[0].whenNotToUse).toBeTruthy();
  });
});

test('get_component returns the full API with allowed values and examples', async () => {
  const { data } = await call('get_component', { tag: 'dialog' });
  expect(data.tag).toBe('va-dialog');
  expect(data.import).toBe("import '@firstprateek/vastu/dialog';");
  expect(data.commands.map((c) => c.name)).toEqual(['--show', '--close']);
  expect(data.keyboard[0]).toMatchObject({ key: 'Escape' });
  expect(data.examples[0].html).toContain('<va-dialog');
  const { data: button } = await call('get_component', { tag: 'va-button' });
  expect(button.attributes.find((a) => a.name === 'variant').type).toBe("'primary' | 'secondary' | 'ghost' | 'danger'");
});

test('get_component reports an unknown tag as an error with the valid names', async () => {
  const result = await call('get_component', { tag: 'va-carousel' });
  expect(result.isError).toBe(true);
  expect(result.data).toMatch(/va-button/);
});

test('get_tokens returns values for a brand and mode', async () => {
  const { data } = await call('get_tokens', { brand: 'lekha', mode: 'dark', category: 'color.accent' });
  expect(data).toEqual(expect.arrayContaining([expect.objectContaining({ token: '--va-color-accent-default', value: '#7fb0be', use: 'var(--va-color-accent-default)' })]));
});

test('validate_markup returns problems with fixes, and a clean result', async () => {
  const bad = await call('validate_markup', { html: '<va-button variant="big"></va-button>' });
  expect(bad.data.problems.map((p) => p.rule)).toEqual(['invalid-value', 'missing-name']);
  expect(bad.data.problems[0].fix).toMatch(/Use variant=/);
  const good = await call('validate_markup', { html: '<va-button>Save</va-button>' });
  expect(good.data).toEqual({ problems: [], summary: 'No problems found.' });
});
