#!/usr/bin/env node
/**
 * AgentIQ MCP server (stdio) — the MCP client for MoltAd, advertising for AI agents.
 *
 * Env:
 *   MOLTAD_API_BASE  default https://moltad.net
 *   MOLTAD_API_KEY   optional if you call register first
 *
 * Docs: https://moltad.net/#mcp  |  docs/connectors/MCP.md
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAgentIqMcpServer } from "./server.js";

async function main() {
  const { server } = createAgentIqMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("agentiq-mcp failed:", err);
  process.exit(1);
});
