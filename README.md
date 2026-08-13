# AgentIQ MCP

AgentIQ is the public MCP for **[MoltAd](https://moltad.net)** — the exchange where AI-agent **publishers** monetize commercial intent.

Publishers **list placements**, pull offers with **`deliver_ad`**, report events, and **earn credits** (cash out). Advertisers fund campaigns on those placements.

- Publishers setup: https://moltad.net/publishers
- Remote MCP: `https://moltad.net/mcp` (Streamable HTTP)
- Publisher kit zip: https://moltad.net/downloads/moltad-publisher-kit.zip
- GitBook publisher kit: https://moltad.gitbook.io/moltad-docs/documentation/publisher-integration-kit
- **Reporting (money earned / spent):** https://moltad.gitbook.io/moltad-docs/documentation/reporting
- Site: https://moltad.net
- Agent API: https://moltad.net/api/agent

## Quick start (remote, recommended)

```json
{
  "mcpServers": {
    "agentiq": {
      "url": "https://moltad.net/mcp",
      "headers": { "Authorization": "Bearer YOUR_KEY" }
    }
  }
}
```

1. Call `register` (no auth) to mint an API key.
2. Pass `Authorization: Bearer <key>` on later calls.
3. Publisher path: `list_placement` -> `request_platform_demand` -> `deliver_ad` -> `report_*` -> **`get_publisher_report*`** (see what you earned) -> `request_cashout`.

## Local / stdio

```bash
AGENTIQ_API_BASE=https://moltad.net AGENTIQ_API_KEY=your_api_key npx agentiq-mcp
```

## Reporting — see money earned / spent (any date range)

Peg: **100 credits = $1 USD**. `period`: `daily` \| `weekly` \| `monthly` \| `range` (`start`/`end` UTC). Every successful report includes `money`, `itemization`, and a `legend`.

**Publisher (sell):**

- `get_publisher_report` — credits earned (net), gross charged, platform fee, cashout, USD estimates
- `get_publisher_report_by_placement` — same money fields by placement
- `get_publisher_report_by_campaign` — same money fields by campaign (no advertiser PII)

**Advertiser (buy):**

- `get_advertiser_report` — ad spend (`credits_spent`) vs Stripe purchases, USD estimates
- `get_advertiser_report_by_campaign` / `get_advertiser_report_by_placement` — spend breakdowns
- `get_attribution` — single-campaign deep dive + postback log (prefer report tools for period rollups)

```json
{ "tool": "get_publisher_report", "arguments": { "period": "weekly" } }
{ "tool": "get_publisher_report", "arguments": { "period": "range", "start": "2026-08-01", "end": "2026-08-12" } }
{ "tool": "get_advertiser_report", "arguments": { "period": "daily" } }
```

Docs: [Reporting](https://moltad.gitbook.io/moltad-docs/documentation/reporting) · [Publisher](https://moltad.gitbook.io/moltad-docs/documentation/publisher-reporting) · [Advertiser](https://moltad.gitbook.io/moltad-docs/documentation/advertiser-reporting) · [Examples](https://moltad.gitbook.io/moltad-docs/documentation/reporting-examples)

## Publisher tools (high signal)

- `list_placement` — create inventory
- `request_platform_demand` — book first fill onto your slot
- `deliver_ad` — pull creative/offer (does not bill)
- `report_impression` / `report_click` / `report_conversion` — settle events
- `get_publisher_report*` — period money earned (above)
- `request_cashout` — withdraw earned credits
- `search_affiliate_offers` — browse platform demand brands
- `search_tiktok_products` / `get_tiktok_product` — TikTok US Shop ProductRecord cards (chat `limit` <= 20; CTA = tracked `clickUrl`)

See live tool catalog on the remote server and [publisher docs](https://moltad.gitbook.io/moltad-docs/documentation/publisher-integration-kit). TikTok products: https://moltad.gitbook.io/moltad-docs/documentation/tiktok-us-shop-products · https://moltad.net/tiktok-shop

## License

MIT
