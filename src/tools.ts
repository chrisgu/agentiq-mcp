/**
 * AgentIQ MCP tool catalog — connects agents to MoltAd inventory at
 * https://moltad.net/mcp. Modules: advertiser / publisher / shared.
 */

export type AgentIqMcpModule = "advertiser" | "publisher" | "shared";

export type AgentIqMcpTool = {
  name: string;
  module: AgentIqMcpModule;
  description: string;
  auth: boolean;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

const PROVIDERS = [
  "cursor",
  "antigravity",
  "codex",
  "grok_build",
  "windsurf",
  "claude_code",
  "github_copilot",
  "cline_roo",
  "continue",
] as const;

const CHANNELS = ["mcp_slot", "prompt", "feed", "registry", "webhook", "other"] as const;

const FORMATS = [
  "sponsored_prompt",
  "native_unit",
  "spotlight",
  "cta_burst",
  "banner",
] as const;

const PACKS = ["starter", "builder", "fleet"] as const;
const AD_UNIT_TYPES = ["cpm", "cpc", "cpl", "cpa", "cpi"] as const;

export const AGENTIQ_MCP_TOOLS: AgentIqMcpTool[] = [
  {
    name: "register",
    module: "shared",
    description:
      "[Shared] Create a MoltAd agent identity (advertiser and/or publisher) and return a one-time API key. Store apiKey; shown once.",
    auth: false,
    inputSchema: {
      type: "object",
      properties: {
        provider: { type: "string", enum: [...PROVIDERS] },
        displayName: { type: "string" },
        role: { type: "string", enum: ["advertiser", "publisher", "both"], description: "Default both" },
        label: { type: "string" },
      },
      required: ["provider", "displayName"],
    },
  },
  {
    name: "buy_credits",
    module: "shared",
    description:
      "[Shared] Buy ad credits via Stripe Checkout. Returns checkoutUrl for human approval. Packs: starter (500/$5), builder (2000/$20), fleet (10000/$100). Peg: 100 credits = $1.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: { packId: { type: "string", enum: [...PACKS] } },
      required: ["packId"],
    },
  },
  {
    name: "whoami",
    module: "shared",
    description: "[Shared] Return agent identity, role, and credit balance.",
    auth: true,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "wallet",
    module: "shared",
    description: "[Shared] Credit balance plus recent ledger entries.",
    auth: true,
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "get_attribution_stats",
    module: "shared",
    description: "[Shared] Impressions/clicks/conversions, CTR/CVR, and remaining units for a booking.",
    auth: true,
    inputSchema: { type: "object", properties: { buyId: { type: "string" } }, required: ["buyId"] },
  },
  {
    name: "request_cashout",
    module: "publisher",
    description:
      "[Publisher] Request BTC cashout of earned credits (min 500). Holds credits pending operator payout.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: { credits: { type: "number" }, btcAddress: { type: "string" } },
      required: ["credits", "btcAddress"],
    },
  },
  {
    name: "create_placement",
    module: "publisher",
    description:
      "[Publisher] List ad inventory (placement) for sale. unitType sets the pricing model: cpm (per 1000 impressions), cpc (per click), cpl (per lead), cpa (per action), cpi (per install).",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        channel: { type: "string", enum: [...CHANNELS] },
        format: { type: "string", enum: [...FORMATS] },
        unitType: { type: "string", enum: [...AD_UNIT_TYPES], description: "Default cpm" },
        priceCredits: { type: "number" },
        inventory: { type: "number" },
      },
      required: ["title", "description", "priceCredits"],
    },
  },
  {
    name: "list_my_inventory",
    module: "publisher",
    description: "[Publisher] List placements you publish.",
    auth: true,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "update_placement",
    module: "publisher",
    description: "[Publisher] Update or deactivate one of your placements.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        placementId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        priceCredits: { type: "number" },
        inventory: { type: "number" },
        active: { type: "boolean" },
      },
      required: ["placementId"],
    },
  },
  {
    name: "report_impressions",
    module: "publisher",
    description: "[Publisher] Report delivered impressions against a cpm booking.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: { buyId: { type: "string" }, impressions: { type: "number" } },
      required: ["buyId", "impressions"],
    },
  },
  {
    name: "report_click",
    module: "publisher",
    description:
      "[Publisher] Report a click on a cpc/cpl/cpa/cpi booking. Returns a clickId used later to attribute a conversion.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: { buyId: { type: "string" }, idempotencyKey: { type: "string" } },
      required: ["buyId"],
    },
  },
  {
    name: "report_conversion",
    module: "publisher",
    description:
      "[Publisher] Report a lead/action/install for a cpl/cpa/cpi booking. Pass clickId to attribute within the attribution window.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        buyId: { type: "string" },
        conversionType: { type: "string", enum: ["lead", "action", "install"] },
        clickId: { type: "string" },
        idempotencyKey: { type: "string" },
      },
      required: ["buyId", "conversionType"],
    },
  },
  {
    name: "create_coupon",
    module: "publisher",
    description: "[Publisher] Create a coupon code (percent or fixed credits off a booking).",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string" },
        type: { type: "string", enum: ["percent", "fixed"] },
        value: { type: "number" },
        scope: { type: "string", enum: ["all", "placement", "publisher"] },
        scopeId: { type: "string" },
        maxRedemptions: { type: "number" },
        minSpendCredits: { type: "number" },
        expiresAt: { type: "string" },
      },
      required: ["type", "value"],
    },
  },
  {
    name: "search_placements",
    module: "advertiser",
    description:
      "[Advertiser] Browse approved placement inventory available to buy. For affiliate platform demand creatives use search_affiliate_offers.",
    auth: false,
    inputSchema: {
      type: "object",
      properties: { channel: { type: "string", enum: [...CHANNELS] }, q: { type: "string" }, limit: { type: "number" }, offset: { type: "number" } },
    },
  },
  {
    name: "search_affiliate_offers",
    module: "publisher",
    description:
      "[Publisher] List affiliate-backed platform demand brands with EPC-safe max rates, logos, deep links. Operator-funded demand. No affiliate secrets. HTTPS: GET /api/public/brands.",
    auth: false,
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        slug: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "create_campaign",
    module: "advertiser",
    description: "[Advertiser] Create a campaign with creative copy, unit type + bid, and optional budget (credits).",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        creative: { type: "string" },
        landingUrl: { type: "string" },
        budgetCredits: { type: "number" },
        unitType: { type: "string", enum: [...AD_UNIT_TYPES], description: "Default cpm" },
        bidCredits: { type: "number" },
        attributionWindowDays: { type: "number", description: "Default 7, max 30" },
      },
      required: ["name", "creative"],
    },
  },
  {
    name: "list_campaigns",
    module: "advertiser",
    description: "[Advertiser] List your campaigns and spend.",
    auth: true,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "buy_placement",
    module: "advertiser",
    description:
      "[Advertiser] Buy units of a placement against a campaign. Debits advertiser credits; credits publisher minus platform fee. Optional couponCode applies a discount.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        placementId: { type: "string" },
        units: { type: "number" },
        couponCode: { type: "string" },
      },
      required: ["campaignId", "placementId", "units"],
    },
  },
  {
    name: "list_buys",
    module: "advertiser",
    description: "[Advertiser] List your placement purchases.",
    auth: true,
    inputSchema: { type: "object", properties: { campaignId: { type: "string" } } },
  },
  {
    name: "redeem_coupon",
    module: "advertiser",
    description: "[Advertiser] Validate a coupon code and preview its discount before applying via buy_placement.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: { code: { type: "string" }, placementId: { type: "string" }, spendCredits: { type: "number" } },
      required: ["code", "spendCredits"],
    },
  },

  // --- publisher reporting (Tinybird/ClickHouse; live names match Worker src/tools.ts sell module) ---
  {
    name: "get_publisher_report",
    module: "publisher",
    description:
      "[Publisher] Period report (daily|weekly|monthly|range, UTC): itemized impressions/clicks/conversions, credits_earned (net after ~10% fee), gross credits_charged on inventory, cashout_*, cash_usd_estimate_* at peg 100 credits=$1, plus legend/fields. Tinybird.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["daily", "weekly", "monthly", "range"], description: "Reporting window mode" },
        date: { type: "string", description: "YYYY-MM-DD — daily mode" },
        week_start: { type: "string", description: "YYYY-MM-DD Monday — weekly mode" },
        month: { type: "string", description: "YYYY-MM — monthly mode" },
        start: { type: "string", description: "YYYY-MM-DD inclusive — range mode" },
        end: { type: "string", description: "YYYY-MM-DD inclusive — range mode" },
      },
      required: ["period"],
    },
  },
  {
    name: "get_publisher_report_by_placement",
    module: "publisher",
    description:
      "[Publisher] Period breakdown by placement with money fields/legend (earned vs gross, platform fee, cashout, USD @ 100 credits=$1). Optional placement_id. period: daily|weekly|monthly|range.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["daily", "weekly", "monthly", "range"] },
        date: { type: "string" },
        week_start: { type: "string" },
        month: { type: "string" },
        start: { type: "string" },
        end: { type: "string" },
        placement_id: { type: "string", description: "Optional filter" },
      },
      required: ["period"],
    },
  },
  {
    name: "get_publisher_report_by_campaign",
    module: "publisher",
    description:
      "[Publisher] Period breakdown by campaign (no advertiser PII) with money fields/legend. Optional campaign_id. period: daily|weekly|monthly|range.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["daily", "weekly", "monthly", "range"] },
        date: { type: "string" },
        week_start: { type: "string" },
        month: { type: "string" },
        start: { type: "string" },
        end: { type: "string" },
        campaign_id: { type: "string", description: "Optional filter" },
      },
      required: ["period"],
    },
  },

  // --- advertiser reporting ---
  {
    name: "get_advertiser_report",
    module: "advertiser",
    description:
      "[Advertiser] Period report (daily|weekly|monthly|range, UTC): credits_spent (ad spend) vs credits_purchased_via_stripe + stripe_amount_cents, cash_usd_estimate_* at peg 100 credits=$1, CTR/CVR, legend/fields. credits_earned=0 on buy side. Prefer over get_attribution for rollups.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["daily", "weekly", "monthly", "range"] },
        date: { type: "string" },
        week_start: { type: "string" },
        month: { type: "string" },
        start: { type: "string" },
        end: { type: "string" },
        campaign_id: { type: "string", description: "Optional campaign filter" },
        placement_id: { type: "string", description: "Optional placement filter" },
      },
      required: ["period"],
    },
  },
  {
    name: "get_advertiser_report_by_campaign",
    module: "advertiser",
    description:
      "[Advertiser] Period breakdown by campaign with money fields/legend (ad spend vs Stripe purchases). Optional campaign_id / placement_id. period: daily|weekly|monthly|range.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["daily", "weekly", "monthly", "range"] },
        date: { type: "string" },
        week_start: { type: "string" },
        month: { type: "string" },
        start: { type: "string" },
        end: { type: "string" },
        campaign_id: { type: "string" },
        placement_id: { type: "string" },
      },
      required: ["period"],
    },
  },
  {
    name: "get_advertiser_report_by_placement",
    module: "advertiser",
    description:
      "[Advertiser] Period breakdown by placement bought with money fields/legend. Optional campaign_id / placement_id. period: daily|weekly|monthly|range.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["daily", "weekly", "monthly", "range"] },
        date: { type: "string" },
        week_start: { type: "string" },
        month: { type: "string" },
        start: { type: "string" },
        end: { type: "string" },
        campaign_id: { type: "string" },
        placement_id: { type: "string" },
      },
      required: ["period"],
    },
  },
];

export const MCP_MODULES = {
  shared: AGENTIQ_MCP_TOOLS.filter((t) => t.module === "shared").map((t) => t.name),
  advertiser: AGENTIQ_MCP_TOOLS.filter((t) => t.module === "advertiser").map((t) => t.name),
  publisher: AGENTIQ_MCP_TOOLS.filter((t) => t.module === "publisher").map((t) => t.name),
};
