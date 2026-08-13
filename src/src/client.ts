export type AgentIqClientOptions = {
  apiBase?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

export type AgentIqToolResult = {
  ok: boolean;
  status: number;
  data: unknown;
};

function normalizeBase(base: string): string {
  return base.replace(/\/+$/, "");
}

export function resolveAgentIqConfig(env: Record<string, string | undefined> = process.env) {
  const apiBase = normalizeBase(env.AGENTIQ_API_BASE?.trim() || "https://moltad.net");
  const apiKey = env.AGENTIQ_API_KEY?.trim() || "";
  return { apiBase, apiKey };
}

/** Talks to MoltAd's agent API (https://moltad.net/api/agent) on behalf of AgentIQ MCP tools. */
export class AgentIqApiClient {
  readonly apiBase: string;
  private apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: AgentIqClientOptions = {}) {
    const resolved = resolveAgentIqConfig();
    this.apiBase = normalizeBase(opts.apiBase || resolved.apiBase);
    this.apiKey = (opts.apiKey ?? resolved.apiKey).trim();
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  setApiKey(key: string) {
    this.apiKey = key.trim();
  }

  getApiKey(): string {
    return this.apiKey;
  }

  async callTool(tool: string, args: Record<string, unknown> = {}): Promise<AgentIqToolResult> {
    if (tool === "register") {
      return this.register(args);
    }

    const url = `${this.apiBase}/api/agent`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const res = await this.fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ tool, arguments: args }),
    });

    const data = await this.parseBody(res);
    return { ok: res.ok, status: res.status, data };
  }

  async register(args: Record<string, unknown>): Promise<AgentIqToolResult> {
    const url = `${this.apiBase}/api/agent/register`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(args),
    });
    const data = await this.parseBody(res);
    if (res.ok && data && typeof data === "object" && "apiKey" in data) {
      const key = String((data as { apiKey: string }).apiKey || "");
      if (key) this.setApiKey(key);
    }
    return { ok: res.ok, status: res.status, data };
  }

  private async parseBody(res: Response): Promise<unknown> {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return { error: "non_json", body: text.slice(0, 500) };
    }
  }
}
