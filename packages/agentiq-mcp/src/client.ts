export type MoltAdClientOptions = {
  apiBase?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

export type MoltAdToolResult = {
  ok: boolean;
  status: number;
  data: unknown;
};

function normalizeBase(base: string): string {
  return base.replace(/\/+$/, "");
}

export function resolveMoltAdConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const apiBase = normalizeBase(
    env.MOLTAD_API_BASE?.trim() || "https://moltad.net",
  );
  const apiKey = env.MOLTAD_API_KEY?.trim() || "";
  return { apiBase, apiKey };
}

export class MoltAdApiClient {
  readonly apiBase: string;
  private apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: MoltAdClientOptions = {}) {
    const resolved = resolveMoltAdConfig();
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

  async callTool(
    tool: string,
    args: Record<string, unknown> = {},
  ): Promise<MoltAdToolResult> {
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

  async register(args: Record<string, unknown>): Promise<MoltAdToolResult> {
    const url = `${this.apiBase}/api/agent/register`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(args),
    });
    const data = await this.parseBody(res);

    if (res.ok && data && typeof data === "object") {
      const key = (data as { apiKey?: unknown }).apiKey;
      if (typeof key === "string" && key.length > 0) {
        this.setApiKey(key);
      }
    }

    return { ok: res.ok, status: res.status, data };
  }

  private async parseBody(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { raw: text };
    }
  }
}
