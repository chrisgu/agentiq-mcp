import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { AgentIqApiClient, type AgentIqClientOptions } from "./client.js";
import { AGENTIQ_MCP_TOOLS } from "./tools.js";

export function createAgentIqMcpServer(opts: AgentIqClientOptions = {}) {
  const client = new AgentIqApiClient(opts);

  const server = new Server(
    { name: "agentiq-mcp", version: "1.0.0", title: "AgentIQ MCP for MoltAd" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: AGENTIQ_MCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: {
        title: `${t.module[0].toUpperCase()}${t.module.slice(1)}: ${t.name}`,
        readOnlyHint:
          t.name === "search_placements" ||
          t.name === "search_affiliate_offers" ||
          t.name === "whoami" ||
          t.name === "wallet" ||
          t.name === "list_campaigns" ||
          t.name === "list_buys" ||
          t.name === "list_my_inventory" ||
          t.name === "get_attribution_stats",
        destructiveHint: t.name === "buy_placement" || t.name === "request_cashout",
        openWorldHint: true,
      },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    const tool = AGENTIQ_MCP_TOOLS.find((t) => t.name === name);

    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      };
    }

    if (tool.auth && !client.getApiKey() && name !== "register") {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "Missing AGENTIQ_API_KEY. Set env AGENTIQ_API_KEY=... or call register first.",
              hint: "https://moltad.net/#mcp",
            }),
          },
        ],
      };
    }

    try {
      const result = await client.callTool(name, args);
      return {
        isError: !result.ok,
        content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }] };
    }
  });

  return { server, client };
}
