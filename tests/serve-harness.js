// Builds the test harness and serves it, in one process, so Playwright can stop it cleanly.
import { build, preview } from 'vite';

const configFile = new URL('./vite.config.js', import.meta.url).pathname;
await build({ configFile, logLevel: 'warn' });
const server = await preview({ configFile });
server.printUrls();
