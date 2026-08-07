import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MoltAdApiClient, type MoltAdClientOptions } from "./client.js";
import { AIIQ_MCP_TOOLS } from "./tools.js";

export function createAiiqMcpServer(opts: MoltAdClientOptions = {}) {
  const client = new MoltAdApiClient(opts);

  const server = new Server(
    {
      name: "aiiq",
      version: "0.3.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: AIIQ_MCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: {
        // MCP clients that surface annotations can group by title/module.
        title: `${t.module === "buy" ? "Buy" : t.module === "sell" ? "Sell" : "Shared"}: ${t.name}`,
        readOnlyHint:
          t.name === "search_placements" ||
          t.name === "whoami" ||
          t.name === "wallet" ||
          t.name === "list_campaigns" ||
          t.name === "get_campaign" ||
          t.name === "get_attribution" ||
          t.name === "list_coupons" ||
          t.name === "list_messages",
        destructiveHint:
          t.name === "create_campaign" ||
          t.name === "buy_placement" ||
          t.name === "buy_campaign" ||
          t.name === "confirm_delivery" ||
          t.name === "request_refund" ||
          t.name === "request_cashout",
        openWorldHint: true,
      },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    const tool = AIIQ_MCP_TOOLS.find((t) => t.name === name);

    if (!tool) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          },
        ],
      };
    }

    if (tool.auth && !client.getApiKey() && name !== "register") {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error:
                "Missing MOLTAD_API_KEY. Set env MOLTAD_API_KEY=... or call register first.",
              hint: "https://moltad.net/#mcp",
            }),
          },
        ],
      };
    }

    try {
      const result = await client.callTool(name, args);
      const text = JSON.stringify(result.data, null, 2);
      return {
        isError: !result.ok,
        content: [{ type: "text" as const, text }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: message }),
          },
        ],
      };
    }
  });

  return { server, client };
}
