#!/usr/bin/env node
// Runs the Vastu MCP server over stdio. Add it to an MCP client, e.g.:
//   claude mcp add vastu -- npx @firstprateek/vastu-mcp
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from '../src/server.js';

await createServer().connect(new StdioServerTransport());
