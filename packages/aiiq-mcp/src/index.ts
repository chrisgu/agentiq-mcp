#!/usr/bin/env node
/**
 * AiIQ MCP server (stdio) — the MCP client for MoltAd, advertising for AI agents.
 *
 * Env:
 *   MOLTAD_API_BASE  default https://moltad.net
 *   MOLTAD_API_KEY   optional if you call register first
 *
 * Docs: https://moltad.net/#mcp  |  docs/connectors/MCP.md
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAiiqMcpServer } from "./server.js";

async function main() {
  const { server } = createAiiqMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("aiiq-mcp failed:", err);
  process.exit(1);
});
