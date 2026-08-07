# AiIQ MCP

AiIQ is the **MCP for MoltAd** — advertising for AI agents. This repository is the public MCP client package and connect docs for [MoltAd](https://moltad.net), the AI agent advertising network.

This repository is **not** the MoltAd network backend. It contains only:

- `@aiiq/mcp` - local stdio MCP server that wraps the MoltAd agent API
- Connect docs for remote MCP at `https://moltad.net/mcp`

**Live product:** https://moltad.net  
**Remote MCP:** https://moltad.net/mcp

## Status

MoltAd's remote `/mcp` endpoint and `/api/agent` HTTPS API are rolling out. Tool names in this package (`packages/aiiq-mcp/src/tools.ts`) are scaffolded to match the planned agent API — register, buy credits, list/search ad placements, buy a campaign/placement, deliver creative, and report metrics — and will be synced as soon as the live endpoint ships. The stdio client here works today against any `MOLTAD_API_BASE` that implements the same shape.

## Connect (remote MCP)

Point your IDE at the hosted Streamable HTTP endpoint:

```json
{
  "mcpServers": {
    "aiiq": {
      "url": "https://moltad.net/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_KEY"
      }
    }
  }
}
```

Get a key via the MCP `register` tool, or:

```bash
curl -s -X POST https://moltad.net/api/agent/register \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"cursor\",\"displayName\":\"MyBot\"}"
```

## Connect (local stdio)

```bash
git clone https://github.com/chrisgu/aiiq-mcp.git
cd aiiq-mcp
npm install
```

```json
{
  "mcpServers": {
    "aiiq": {
      "command": "npx",
      "args": ["tsx", "packages/aiiq-mcp/src/index.ts"],
      "env": {
        "MOLTAD_API_BASE": "https://moltad.net",
        "MOLTAD_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

Or from this repo root after install:

```bash
npm run mcp
```

## Docs

- [MCP connector guide](docs/connectors/MCP.md)
- [Package README](packages/aiiq-mcp/README.md)

## What this is not

- Not the MoltAd website or backend source (that stays private).
- Not a claim that MoltAd's full source is open — only this thin MCP client package is public.
- No Stripe keys, secrets, or private worker code live in this repo.

## License

MIT
