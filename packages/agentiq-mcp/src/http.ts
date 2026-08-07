/**
 * Remote Streamable HTTP MCP handler (Cloudflare Workers / any Fetch runtime).
 *
 * Auth: Authorization: Bearer ...  OR  ?api_key= / ?key=
 * Env for stdio still uses MOLTAD_API_KEY; remote clients pass the key per request.
 *
 * This handler ships in the public AgentIQ package for reference/self-hosting;
 * the live endpoint is served by the private MoltAd backend at
 * https://moltad.net/mcp.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createAgentIqMcpServer } from "./server.js";
import { MCP_MODULES } from "./tools.js";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, Mcp-Session-Id, Last-Event-ID, MCP-Protocol-Version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

export function extractMcpApiKey(request: Request): string {
  const auth = request.headers.get("Authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (m?.[1]) return m[1].trim();

  const url = new URL(request.url);
  const fromQuery =
    url.searchParams.get("api_key") ||
    url.searchParams.get("key") ||
    url.searchParams.get("apiKey") ||
    "";
  return fromQuery.trim();
}

export type HandleAgentIqMcpHttpOptions = {
  apiBase?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  /** When true, browser GET /mcp returns a discovery JSON blob instead of MCP stream. */
  discoveryOnBrowserGet?: boolean;
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Plain GET/HEAD (curl, browsers, smoke) -> discovery JSON. SSE clients send text/event-stream. */
function shouldServeDiscovery(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const accept = (request.headers.get("Accept") || "").toLowerCase();
  if (accept.includes("text/event-stream")) return false;
  return true;
}

/** Ensure Streamable HTTP Accept negotiation succeeds for simple clients/smoke tests. */
function withMcpAccept(request: Request): Request {
  const accept = (request.headers.get("Accept") || "").toLowerCase();
  if (
    accept.includes("application/json") &&
    accept.includes("text/event-stream")
  ) {
    return request;
  }
  const headers = new Headers(request.headers);
  headers.set("Accept", "application/json, text/event-stream");
  return new Request(request, { headers });
}

export function buildMcpDiscovery(siteUrl = "https://moltad.net") {
  return {
    name: "agentiq",
    version: "0.3.0",
    transport: "streamable-http",
    url: `${siteUrl.replace(/\/+$/, "")}/mcp`,
    auth: {
      header: "Authorization: Bearer <key>",
      query: "?api_key=<key>",
      envStdio: "MOLTAD_API_KEY",
    },
    modules: MCP_MODULES,
    docs: `${siteUrl.replace(/\/+$/, "")}/#mcp`,
    docsUrl:
      "https://github.com/chrisgu/agentiq-mcp/blob/main/docs/connectors/MCP.md",
    stdioPackage: "@agentiq/mcp",
  };
}

/**
 * Handle one Streamable HTTP MCP request (stateless, JSON responses preferred).
 */
export async function handleAgentIqMcpHttpRequest(
  request: Request,
  opts: HandleAgentIqMcpHttpOptions = {},
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const apiBase = (opts.apiBase || "https://moltad.net").replace(/\/+$/, "");

  if (opts.discoveryOnBrowserGet !== false && shouldServeDiscovery(request)) {
    const body = JSON.stringify(buildMcpDiscovery(apiBase), null, 2);
    if (request.method === "HEAD") {
      return withCors(
        new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...CORS_HEADERS,
          },
        }),
      );
    }
    return withCors(
      new Response(body, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...CORS_HEADERS,
        },
      }),
    );
  }

  const apiKey = (opts.apiKey ?? extractMcpApiKey(request)).trim();

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const { server } = createAgentIqMcpServer({
    apiBase,
    apiKey,
    fetchImpl: opts.fetchImpl,
  });
  await server.connect(transport);

  try {
    const response = await transport.handleRequest(withMcpAccept(request));
    return withCors(response);
  } finally {
    await server.close().catch(() => undefined);
  }
}
