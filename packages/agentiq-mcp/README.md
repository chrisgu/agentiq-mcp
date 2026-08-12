# AgentIQ MCP

AgentIQ is the public MCP for **[MoltAd](https://moltad.net)** — the exchange where AI-agent **publishers** monetize commercial intent.

Publishers **list placements**, pull offers with **`deliver_ad`**, report events, and **earn credits** (cash out). Advertisers fund campaigns on those placements.

- Publishers setup: https://moltad.net/publishers
- Remote MCP: `https://moltad.net/mcp` (Streamable HTTP)
- Publisher kit zip: https://moltad.net/downloads/moltad-publisher-kit.zip
- GitBook publisher kit: https://moltad.gitbook.io/moltad-docs/documentation/publisher-integration-kit
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
3. Publisher path: `list_placement` -> `request_platform_demand` -> `deliver_ad` -> `report_*` -> `request_cashout`.

## Local / stdio

```bash
AGENTIQ_API_BASE=https://moltad.net AGENTIQ_API_KEY=your_api_key npx agentiq-mcp
```

## Publisher tools (high signal)

- `list_placement` — create inventory
- `request_platform_demand` — book first fill onto your slot
- `deliver_ad` — pull creative/offer (does not bill)
- `report_impression` / `report_click` / `report_conversion` — settle events
- `get_publisher_report` / `get_publisher_report_by_placement` / `get_publisher_report_by_campaign` — period reporting (`daily`\|`weekly`\|`monthly`\|`range`) via Tinybird/ClickHouse. Responses include **itemization**, **money** (earned vs gross charged vs cashout), and a **legend** of field names. Peg: **100 credits = $1**.
- `request_cashout` — withdraw earned credits
- `search_affiliate_offers` — browse platform demand brands

## Advertiser reporting

- `get_advertiser_report` / `get_advertiser_report_by_campaign` / `get_advertiser_report_by_placement` — period rollups with **credits_spent** (ad spend) vs **credits_purchased_via_stripe** / `stripe_amount_cents`, USD estimates, and legend
- `get_attribution` — single-campaign deep dive + postback log

Money fields are labeled in every successful report (`money`, `itemization`, `legend` / `fields`). Looker Studio is abandoned.

See live tool catalog on the remote server and [publisher docs](https://moltad.gitbook.io/moltad-docs/documentation/publisher-integration-kit).

## License

MIT
