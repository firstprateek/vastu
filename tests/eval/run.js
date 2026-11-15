// Vastu agent eval: can an agent build correct pages with Vastu?
//
// Each task is run in two setups:
//   docs  the agent gets llms-full.txt (the full reference) in its system prompt;
//   mcp   the agent gets the vastu-mcp tools instead (find/get components, tokens, validate).
// Two kinds of agent:
//   claude-code (default)  Claude Code itself, headless (claude -p), in an empty folder with only
//                          Read/Write/Edit (+ the vastu MCP server); uses the claude CLI's sign-in.
//                          It writes page.html, page.css and page.js.
//   api                    the Claude API's tool runner with a write_page tool (and the MCP tools
//                          through an in-memory MCP client); needs an API credential.
// Each page is then scored in Chromium on:
//   renders  no console errors, page errors or CSP violations under a strict CSP
//   lint     vastu-lint reports no errors
//   axe      no WCAG 2.2 AA violations
//   tokens   no hard-coded colours or unknown Vastu tokens
//   task     the task's own Playwright checks pass
//
// Usage:
//   node tests/eval/run.js --dry-run               score each task's reference answer (no API calls)
//   node tests/eval/run.js [--agent claude-code|api] [--setups docs,mcp] [--tasks id,id]
//                          [--model claude-opus-5-5] [--effort high] [--repeat 1] [--concurrency 2]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { build } from 'vite';
import { lint } from '@firstprateek/vastu-lint';
import { createServer as createMcpServer } from '@firstprateek/vastu-mcp';
import { tasks } from './tasks.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    agent: { type: 'string', default: 'claude-code' },
    setups: { type: 'string', default: 'docs,mcp' },
    tasks: { type: 'string', default: '' },
    model: { type: 'string', default: 'claude-opus-5-5' },
    effort: { type: 'string', default: 'high' },
    repeat: { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '2' },
    out: { type: 'string', default: '' },
  },
});

// USD per million tokens, for the cost estimate in the report.
const PRICES = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; require-trusted-types-for 'script'; trusted-types lit-html";

const setups = args['dry-run'] ? ['reference'] : args.setups.split(',');
const selected = args.tasks ? tasks.filter((t) => args.tasks.split(',').includes(t.id)) : tasks;
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.resolve(args.out || path.join(here, 'results', args['dry-run'] ? 'dry-run' : stamp));
const siteDir = path.join(outDir, 'site');

// ---------------------------------------------------------------------------------------------
// The page every task is built into: Vastu tokens and every component, under a strict CSP.

async function buildAssets() {
  const assets = path.join(siteDir, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  await build({
    configFile: false,
    logLevel: 'warn',
    build: {
      outDir: assets,
      emptyOutDir: false,
      lib: { entry: path.join(root, 'packages/vastu/dist/prod/all.js'), formats: ['es'], fileName: () => 'vastu.js' },
    },
  });
  fs.copyFileSync(path.join(root, 'packages/tokens/dist/vastu.css'), path.join(assets, 'vastu.css'));
  fs.writeFileSync(
    path.join(assets, 'base.css'),
    'body { margin: 0; background: var(--va-color-surface-default); color: var(--va-color-text-default); font-family: var(--va-font-family-ui); }\nmain { padding: 24px; }\n'
  );
}

function pageHtml(task, files) {
  return `<!doctype html>
<html lang="en" data-va-brand="vastu">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${task.id}</title>
    <link rel="stylesheet" href="/assets/vastu.css">
    <link rel="stylesheet" href="/assets/base.css">
    ${files.css ? '<link rel="stylesheet" href="page.css">' : ''}
    <script type="module" src="/assets/vastu.js"></script>
    ${files.js ? '<script type="module" src="page.js"></script>' : ''}
  </head>
  <body>
    <main>
${files.html}
    </main>
  </body>
</html>
`;
}

function writePage(dir, task, files) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pageHtml(task, files));
  if (files.css) fs.writeFileSync(path.join(dir, 'page.css'), files.css);
  if (files.js) fs.writeFileSync(path.join(dir, 'page.js'), files.js);
  fs.writeFileSync(path.join(dir, 'files.json'), JSON.stringify(files, null, 2));
}

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(dir, url);
    if (!file.startsWith(dir)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Content-Security-Policy': CSP });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ---------------------------------------------------------------------------------------------
// The agent.

const BASE_INSTRUCTIONS = `You are building one page of a web app with Vastu, a design system of web components (custom elements named va-…).

Write the page with the write_page tool:
- html: the content of <main> only (no <html>, <head> or <body>).
- css (optional): a stylesheet the page loads.
- js (optional): an ES module the page loads, for behaviour the components don't provide themselves.

The page already loads Vastu's design tokens and every Vastu component; don't load anything else.
The page runs under a strict Content Security Policy: inline <script>, <style>, style="…" and on…= handlers are blocked.
You can call write_page again to replace the page. Stop when the page is complete and correct.`;

function systemPrompt(setup) {
  if (setup === 'docs') {
    const reference = fs.readFileSync(path.join(root, 'apps/docs/dist/llms-full.txt'), 'utf8');
    return [
      { type: 'text', text: BASE_INSTRUCTIONS },
      { type: 'text', text: `Here is the Vastu reference:\n\n${reference}`, cache_control: { type: 'ephemeral' } },
    ];
  }
  return [{ type: 'text', text: `${BASE_INSTRUCTIONS}\n\nUse the vastu tools to find components, read their APIs and tokens, and check your markup.`, cache_control: { type: 'ephemeral' } }];
}

async function mcpTools() {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createMcpServer().connect(serverSide);
  const client = new Client({ name: 'vastu-eval', version: '0' });
  await client.connect(clientSide);
  const { tools } = await client.listTools();
  const calls = [];
  const runnable = tools.map((t) =>
    betaTool({
      name: t.name,
      description: t.description,
      inputSchema: { ...t.inputSchema, type: 'object' },
      run: async (input) => {
        calls.push(t.name);
        const result = await client.callTool({ name: t.name, arguments: input });
        return result.content.map((c) => c.text).join('\n');
      },
    })
  );
  return { runnable, calls, close: () => client.close() };
}

async function runAgent(client, task, setup) {
  let files = null;
  const writeTool = betaTool({
    name: 'write_page',
    description: 'Writes the page: the content of <main>, plus an optional stylesheet and ES module. Replaces any earlier version.',
    inputSchema: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'The content of <main>.' },
        css: { type: 'string', description: 'Optional stylesheet.' },
        js: { type: 'string', description: 'Optional ES module.' },
      },
      required: ['html'],
      additionalProperties: false,
    },
    run: async (input) => {
      files = input;
      return 'Saved.';
    },
  });

  const mcp = setup === 'mcp' ? await mcpTools() : null;
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 };
  let stopReason = null;
  const started = Date.now();
  try {
    const runner = client.beta.messages.toolRunner({
      model: args.model,
      max_tokens: 16000,
      output_config: { effort: args.effort },
      // Opt into server-side fallback, so a safety decline re-runs on another model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: systemPrompt(setup),
      tools: [writeTool, ...(mcp?.runnable ?? [])],
      messages: [{ role: 'user', content: task.prompt }],
      max_iterations: 20,
    });
    for await (const message of runner) {
      usage.turns++;
      usage.input += message.usage.input_tokens ?? 0;
      usage.output += message.usage.output_tokens ?? 0;
      usage.cacheRead += message.usage.cache_read_input_tokens ?? 0;
      usage.cacheWrite += message.usage.cache_creation_input_tokens ?? 0;
      stopReason = message.stop_reason;
    }
  } finally {
    await mcp?.close();
  }
  const price = PRICES[args.model];
  const cost = price
    ? (usage.input * price.input + usage.output * price.output + usage.cacheRead * price.cacheRead + usage.cacheWrite * price.cacheWrite) / 1e6
    : null;
  return { files, usage, cost, stopReason, seconds: (Date.now() - started) / 1000, toolCalls: mcp?.calls ?? [] };
}

// ---------------------------------------------------------------------------------------------
// Claude Code, headless. Runs in an empty folder outside any project and loads project settings
// only, so the owner's own CLAUDE.md, hooks, plugins and MCP servers don't reach the agent.

const CLAUDE_CODE_INSTRUCTIONS = `You are building one page of a web app with Vastu, a design system of web components (custom elements named va-…).

Write the page as files in the current folder:
- page.html: the content of <main> only (no <html>, <head> or <body>).
- page.css (optional): a stylesheet the page loads.
- page.js (optional): an ES module the page loads, for behaviour the components don't provide themselves.

The page already loads Vastu's design tokens and every Vastu component; don't load anything else.
The page runs under a strict Content Security Policy: inline <script>, <style>, style="…" and on…= handlers are blocked.
Stop when the page is complete and correct.`;

function runClaudeCode(task, setup) {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), `vastu-eval-${task.id}-${setup}-`));
  const cli = ['-p', task.prompt, '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project', '--no-session-persistence',
    '--model', args.model, '--effort', args.effort, '--permission-mode', 'acceptEdits', '--tools', 'Read,Write,Edit', '--strict-mcp-config'];
  if (setup === 'mcp') {
    const config = `${workdir}-mcp.json`;
    fs.writeFileSync(config, JSON.stringify({ mcpServers: { vastu: { command: process.execPath, args: [path.join(root, 'packages/mcp/bin/vastu-mcp.js')] } } }));
    cli.push('--mcp-config', config, '--allowedTools', 'mcp__vastu__*');
    cli.push('--append-system-prompt', `${CLAUDE_CODE_INSTRUCTIONS}\n\nUse the vastu MCP tools to find components, read their APIs and tokens, and check your markup.`);
  } else {
    const reference = fs.readFileSync(path.join(root, 'apps/docs/dist/llms-full.txt'), 'utf8');
    cli.push('--append-system-prompt', `${CLAUDE_CODE_INSTRUCTIONS}\n\nHere is the Vastu reference:\n\n${reference}`);
  }
  const started = Date.now();
  return new Promise((resolve) => {
    // Auto-memory is a built-in feature that would add memory instructions and could write files
    // into the owner's ~/.claude; turn it off so the agent sees only the eval's instructions.
    const env = { ...process.env, CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' };
    const child = spawn('claude', cli, { cwd: workdir, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const toolCalls = [];
    let result = null;
    let buffer = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), 15 * 60 * 1000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        try {
          const event = JSON.parse(line);
          if (event.type === 'assistant') {
            for (const b of event.message?.content ?? []) if (b.type === 'tool_use') toolCalls.push(b.name.replace(/^mcp__vastu__/, ''));
          }
          if (event.type === 'result') result = event;
        } catch {
          // Not a JSON line: ignore.
        }
      }
    });
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', () => {
      clearTimeout(timer);
      const read = (f) => (fs.existsSync(path.join(workdir, f)) ? fs.readFileSync(path.join(workdir, f), 'utf8') : undefined);
      const html = read('page.html');
      const u = result?.usage ?? {};
      resolve({
        files: html ? { html, css: read('page.css'), js: read('page.js') } : null,
        usage: { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, turns: result?.num_turns ?? 0 },
        // What the run would cost at API prices; on a subscription it uses plan limits instead.
        cost: result?.total_cost_usd ?? null,
        stopReason: result?.subtype ?? null,
        seconds: (Date.now() - started) / 1000,
        toolCalls,
        error: result?.is_error ? String(result.result).slice(0, 300) : !result ? `claude exited without a result. ${stderr.slice(0, 300)}` : undefined,
      });
    });
  });
}


// ---------------------------------------------------------------------------------------------
// Scoring.

async function score(browser, baseUrl, task, dir, files) {
  const checks = { renders: false, lint: false, axe: false, tokens: false, task: false };
  const notes = {};
  if (!files) return { checks, notes: { error: 'The agent never wrote the page.' } };

  const html = pageHtml(task, files);
  const lintResult = lint(html);
  checks.lint = lintResult.errorCount === 0;
  notes.lint = lintResult.problems.map((p) => `${p.severity} ${p.rule}: ${p.message}`);

  const cssLint = files.css ? lint(`<style>${files.css}</style>`).problems.filter((p) => ['raw-color', 'unknown-token'].includes(p.rule)) : [];
  const htmlColours = lintResult.problems.filter((p) => ['raw-color', 'unknown-token'].includes(p.rule));
  checks.tokens = cssLint.length === 0 && htmlColours.length === 0;
  notes.tokens = [...htmlColours, ...cssLint].map((p) => p.message);

  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console error: ${m.text()}`));
  await page.addInitScript(() =>
    document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP violation: ${e.violatedDirective}`))
  );
  try {
    await page.goto(`${baseUrl}/${path.relative(siteDir, dir)}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    checks.axe = axe.violations.length === 0;
    notes.axe = axe.violations.map((v) => `${v.id}: ${v.help}`);
    await page.screenshot({ path: path.join(dir, 'screenshot.png'), fullPage: true });
    try {
      await task.check(page);
      checks.task = true;
    } catch (e) {
      notes.task = e.message.split('\n').slice(0, 4).join(' ');
    }
  } finally {
    checks.renders = errors.length === 0;
    notes.renders = errors;
    await context.close();
  }
  return { checks, notes };
}

// ---------------------------------------------------------------------------------------------

async function pool(items, size, fn) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
}

function report(runs) {
  const CHECKS = ['renders', 'lint', 'axe', 'tokens', 'task'];
  const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '–');
  const lines = [`# Vastu agent eval`, ``, `- Date: ${new Date().toISOString().slice(0, 10)}`];
  if (!args['dry-run']) lines.push(`- Agent: ${args.agent === 'api' ? 'Claude API tool runner' : 'Claude Code, headless'}; model \`${args.model}\`, effort \`${args.effort}\`; ${args.repeat} run(s) per task and setup`);
  else lines.push('- Dry run: each task\'s reference answer, no agent');
  lines.push('', '## Pass rates', '', `| Setup | Runs | All checks | ${CHECKS.join(' | ')} | Avg cost | Avg turns |`, `| --- | --- | --- | ${CHECKS.map(() => '---').join(' | ')} | --- | --- |`);
  for (const setup of setups) {
    const rs = runs.filter((r) => r.setup === setup);
    const all = rs.filter((r) => CHECKS.every((c) => r.checks[c])).length;
    const cost = rs.reduce((s, r) => s + (r.cost ?? 0), 0) / (rs.length || 1);
    const turns = rs.reduce((s, r) => s + (r.usage?.turns ?? 0), 0) / (rs.length || 1);
    lines.push(`| ${setup} | ${rs.length} | **${pct(all, rs.length)}** | ${CHECKS.map((c) => pct(rs.filter((r) => r.checks[c]).length, rs.length)).join(' | ')} | ${args['dry-run'] ? '–' : `$${cost.toFixed(3)}`} | ${args['dry-run'] ? '–' : turns.toFixed(1)} |`);
  }
  lines.push('', '## Per task', '', `| Task | ${setups.join(' | ')} |`, `| --- | ${setups.map(() => '---').join(' | ')} |`);
  for (const task of selected) {
    const cells = setups.map((setup) => {
      const rs = runs.filter((r) => r.task === task.id && r.setup === setup);
      return rs.map((r) => (CHECKS.every((c) => r.checks[c]) ? 'pass' : `fail (${CHECKS.filter((c) => !r.checks[c]).join(', ')})`)).join('; ');
    });
    lines.push(`| ${task.id} | ${cells.join(' | ')} |`);
  }
  lines.push('', '## Failures', '');
  for (const r of runs.filter((r) => !CHECKS.every((c) => r.checks[c]))) {
    lines.push(`### ${r.task} (${r.setup}, run ${r.run})`, '');
    for (const c of CHECKS.filter((c) => !r.checks[c])) {
      const note = r.notes[c];
      lines.push(`- **${c}**: ${Array.isArray(note) ? note.join('; ') || 'failed' : note ?? r.notes.error ?? 'failed'}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  await buildAssets();
  const server = await serve(siteDir);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const client = args['dry-run'] || args.agent !== 'api' ? null : new Anthropic();

  const jobs = [];
  for (const task of selected) for (const setup of setups) for (let run = 1; run <= Number(args.repeat); run++) jobs.push({ task, setup, run });

  const runs = await pool(jobs, Number(args.concurrency), async ({ task, setup, run }) => {
    const dir = path.join(siteDir, 'runs', task.id, setup, String(run));
    let agent = { files: task.reference, usage: null, cost: null };
    if (!args['dry-run']) {
      try {
        agent = args.agent === 'api' ? await runAgent(client, task, setup) : await runClaudeCode(task, setup);
      } catch (error) {
        agent = { files: null, usage: null, cost: null, error: `${error.name}: ${error.message}` };
      }
    }
    if (agent.files) writePage(dir, task, agent.files);
    const result = await score(browser, baseUrl, task, dir, agent.files);
    const record = { task: task.id, setup, run, ...result, usage: agent.usage, cost: agent.cost, stopReason: agent.stopReason, seconds: agent.seconds, toolCalls: agent.toolCalls, error: agent.error };
    const ok = Object.values(result.checks).every(Boolean);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${task.id.padEnd(20)} ${setup.padEnd(9)} #${run}${agent.cost != null ? `  $${agent.cost.toFixed(3)}` : ''}${ok ? '' : `  (${Object.entries(result.checks).filter(([, v]) => !v).map(([k]) => k).join(', ')})`}${agent.error ? `  ${agent.error}` : ''}`);
    return record;
  });

  await browser.close();
  server.close();
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ agent: args.agent, model: args.model, effort: args.effort, setups, runs }, null, 2));
  fs.writeFileSync(path.join(outDir, 'report.md'), report(runs));
  const total = runs.reduce((s, r) => s + (r.cost ?? 0), 0);
  console.log(`\nReport: ${path.relative(root, path.join(outDir, 'report.md'))}${args['dry-run'] ? '' : `  (total cost about $${total.toFixed(2)})`}`);
}

await main();
