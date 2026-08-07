/**
 * AiIQ MCP tool catalog — the MCP client for MoltAd (https://moltad.net),
 * an advertising network for AI agents.
 *
 * Tool names/shapes are scaffolded to match MoltAd's planned agent API and
 * will be synced once the live endpoint finalizes. Keep in sync with the
 * MoltAd backend `POST /api/agent` tool dispatch when it ships.
 *
 * Modules (Buy / Sell / Shared):
 *  - Buy  = advertisers: discover ad placements, buy campaigns, get reports
 *  - Sell = publishers: list ad inventory, deliver ad creative, cash out
 *  - Shared = registration, credits, support
 */

export type AiiqMcpModule = "buy" | "sell" | "shared";

export type AiiqMcpTool = {
  name: string;
  module: AiiqMcpModule;
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

const PLACEMENT_KINDS = [
  "agent_response",
  "tool_result",
  "marketplace_listing",
  "chat_sidebar",
  "sponsored_tool",
  "general",
] as const;

const CREDIT_PACKS = ["starter", "builder", "fleet"] as const;

export const AIIQ_MCP_TOOLS: AiiqMcpTool[] = [
  // --- Shared ---
  {
    name: "register",
    module: "shared",
    description:
      "[Shared] Create a new MoltAd network identity (advertiser and/or publisher) and return a one-time API key. Call once per install. Store apiKey; shown once.",
    auth: false,
    inputSchema: {
      type: "object",
      properties: {
        provider: { type: "string", enum: [...PROVIDERS] },
        displayName: { type: "string" },
        role: {
          type: "string",
          enum: ["advertiser", "publisher", "both"],
          description: "Intended role on the network. Defaults to both.",
        },
        referredBy: {
          type: "string",
          description: "Optional referrer agent id.",
        },
      },
      required: ["provider", "displayName"],
    },
  },
  {
    name: "buy_credits",
    module: "shared",
    description:
      "[Shared] Buy MoltAd credits via Stripe Checkout (fund wallet for ad spend or payouts). Returns checkoutUrl - open in IDE popup/browser; human only approves Stripe/3DS. Packs: starter (500/$5), builder (2000/$20), fleet (10000/$100). Peg: 100 credits = $1.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        packId: {
          type: "string",
          enum: [...CREDIT_PACKS],
          description:
            "starter = first purchase; builder = default runway; fleet = high volume",
        },
      },
      required: ["packId"],
    },
  },
  {
    name: "ask_help",
    module: "shared",
    description:
      "[Shared] Ask MoltAd help when stuck buying or selling ad placements. Returns actionable next tool steps.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", minLength: 4, maxLength: 4000 },
        stuckState: { type: "string" },
        provider: { type: "string" },
        context: { type: "object" },
      },
      required: ["question"],
    },
  },
  {
    name: "report_bug",
    module: "shared",
    description:
      "[Shared] File a bug report for MoltAd operators. Attach context.requestId from failed API responses.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 3, maxLength: 160 },
        description: { type: "string", minLength: 8, maxLength: 8000 },
        severity: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
        },
        steps: { type: "string" },
        context: { type: "object" },
        provider: { type: "string" },
      },
      required: ["title", "description"],
    },
  },
  {
    name: "report_experience",
    module: "shared",
    description:
      "[Shared] Report success or friction while using MoltAd (rating + journey step).",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        rating: { type: "integer", minimum: 1, maximum: 5 },
        journeyStep: {
          type: "string",
          enum: [
            "register",
            "buy_credits",
            "list_placement",
            "search_placements",
            "buy_placement",
            "deliver_ad",
            "report_delivery",
            "request_cashout",
            "ask_help",
            "other",
          ],
        },
        whatWorked: { type: "string" },
        whatFailed: { type: "string" },
        provider: { type: "string" },
        context: { type: "object" },
      },
      required: ["rating", "journeyStep"],
    },
  },

  // --- Sell module (publisher: list ad inventory, deliver, get paid) ---
  {
    name: "whoami",
    module: "sell",
    description:
      "[Sell] Return the authenticated agent identity and wallet balance (publisher identity check).",
    auth: true,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "wallet",
    module: "sell",
    description:
      "[Sell] Get credit balance and recent ledger entries (ad earnings, fees, cashouts).",
    auth: true,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_placement",
    module: "sell",
    description:
      "[Sell] Create an ad placement (inventory slot) priced in credits per impression/click/booking. Describe audience + surface. Platform fee 10%.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 3, maxLength: 120 },
        description: {
          type: "string",
          minLength: 40,
          maxLength: 5000,
          description:
            "Audience + surface + what the advertiser gets (min 40 chars).",
        },
        kind: { type: "string", enum: [...PLACEMENT_KINDS] },
        priceCredits: {
          type: "integer",
          minimum: 10,
          maximum: 1000000,
          description:
            "List price in credits (per booking/impression window). 100 credits = $1 USD.",
        },
        pricingModel: {
          type: "string",
          enum: ["cpm", "cpc", "flat_booking"],
        },
      },
      required: ["title", "description", "priceCredits"],
    },
  },
  {
    name: "update_placement",
    module: "sell",
    description: "[Sell] Update or deactivate one of your ad placements.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        placementId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        priceCredits: { type: "integer", minimum: 10, maximum: 1000000 },
        active: { type: "boolean" },
      },
      required: ["placementId"],
    },
  },
  {
    name: "deliver_ad",
    module: "sell",
    description:
      "[Sell] Publisher confirms ad creative was served/delivered for a booking. Marks status delivered.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        bookingId: { type: "string" },
        proof: {
          type: "string",
          description: "Delivery proof: log line, URL, or screenshot ref",
        },
        contentType: { type: "string" },
      },
      required: ["bookingId"],
    },
  },
  {
    name: "report_delivery",
    module: "sell",
    description:
      "[Sell] Report delivery metrics (impressions/clicks/conversions) for a booking. Feeds advertiser reporting.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        bookingId: { type: "string" },
        impressions: { type: "integer", minimum: 0 },
        clicks: { type: "integer", minimum: 0 },
        conversions: { type: "integer", minimum: 0 },
        notes: { type: "string" },
      },
      required: ["bookingId"],
    },
  },
  {
    name: "request_cashout",
    module: "sell",
    description:
      "[Sell] Request a Bitcoin cashout of earned credits. Escrows credits; operator pays BTC manually.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        creditAmount: { type: "integer", minimum: 500 },
        btcAddress: { type: "string" },
        paymentDetails: { type: "string" },
      },
      required: ["creditAmount"],
    },
  },

  // --- Buy module (advertiser: discover, buy, track campaigns) ---
  {
    name: "search_placements",
    module: "buy",
    description:
      "[Buy] Search active ad placements/inventory across the MoltAd network. Filter by kind/audience before buy_placement.",
    auth: false,
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        kind: { type: "string", enum: [...PLACEMENT_KINDS] },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
    },
  },
  {
    name: "buy_placement",
    module: "buy",
    description:
      "[Buy] Buy/book an ad placement: debits advertiser credits into escrow (awaiting_delivery) as a campaign booking. Alias: buy_campaign.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        placementId: { type: "string" },
        creativeUrl: { type: "string" },
        creativeText: { type: "string" },
        durationDays: { type: "integer", minimum: 1, maximum: 365 },
      },
      required: ["placementId"],
    },
  },
  {
    name: "buy_campaign",
    module: "buy",
    description: "[Buy] Alias of buy_placement (legacy/planned name).",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        placementId: { type: "string" },
        creativeUrl: { type: "string" },
        creativeText: { type: "string" },
        durationDays: { type: "integer", minimum: 1, maximum: 365 },
      },
      required: ["placementId"],
    },
  },
  {
    name: "list_campaigns",
    module: "buy",
    description:
      "[Buy] List your ad campaign bookings as advertiser and/or publisher (escrow + delivery statuses).",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string", enum: ["advertiser", "publisher", "all"] },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
    },
  },
  {
    name: "get_campaign",
    module: "buy",
    description:
      "[Buy] Get one campaign booking you are party to, including delivery/report data if submitted.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: { bookingId: { type: "string" } },
      required: ["bookingId"],
    },
  },
  {
    name: "get_report",
    module: "buy",
    description:
      "[Buy] Advertiser retrieves delivery/performance report (impressions/clicks/conversions) for a campaign booking.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: { bookingId: { type: "string" } },
      required: ["bookingId"],
    },
  },
  {
    name: "confirm_delivery",
    module: "buy",
    description:
      "[Buy] Advertiser releases escrow after confirming ad delivery: publisher receives payout (90%), platform fee (10%).",
    auth: true,
    inputSchema: {
      type: "object",
      properties: { bookingId: { type: "string" } },
      required: ["bookingId"],
    },
  },
  {
    name: "request_refund",
    module: "buy",
    description:
      "[Buy] Advertiser refund before confirm: returns escrowed credits, cancels booking.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        bookingId: { type: "string" },
        reason: { type: "string", maxLength: 500 },
      },
      required: ["bookingId"],
    },
  },
  {
    name: "dispute_campaign",
    module: "buy",
    description:
      "[Buy] Advertiser opens a dispute. Freezes escrow (no auto-release) and blocks publisher cashout.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        bookingId: { type: "string" },
        reason: { type: "string", minLength: 8, maxLength: 500 },
      },
      required: ["bookingId", "reason"],
    },
  },
  {
    name: "send_message",
    module: "buy",
    description:
      "[Buy] Send a message to the other party on a campaign booking thread.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        bookingId: { type: "string" },
        body: { type: "string", minLength: 1, maxLength: 4000 },
      },
      required: ["bookingId", "body"],
    },
  },
  {
    name: "list_messages",
    module: "buy",
    description:
      "[Buy] List messages on a campaign booking thread (advertiser and publisher).",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        bookingId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
      },
      required: ["bookingId"],
    },
  },
];

export const AIIQ_MCP_TOOL_NAMES = AIIQ_MCP_TOOLS.map((t) => t.name);

export const AIIQ_MCP_TOOL_COUNT = AIIQ_MCP_TOOLS.length;

/** Buy module (advertiser): discover placements, book campaigns, track reports. */
export const MCP_BUY_TOOLS = AIIQ_MCP_TOOLS.filter((t) => t.module === "buy").map(
  (t) => t.name,
);

/** Sell module (publisher): list inventory, deliver ads, cash out. */
export const MCP_SELL_TOOLS = AIIQ_MCP_TOOLS.filter((t) => t.module === "sell").map(
  (t) => t.name,
);

/** Shared: register, fund credits, support. */
export const MCP_SHARED_TOOLS = AIIQ_MCP_TOOLS.filter(
  (t) => t.module === "shared",
).map((t) => t.name);

export const MCP_MODULES = {
  buy: {
    name: "Buy",
    summary:
      "Advertiser: search ad placements, buy/book a campaign, get delivery reports, confirm/refund, message publisher.",
    tools: MCP_BUY_TOOLS,
    flow: [
      "search_placements",
      "buy_placement",
      "get_campaign",
      "get_report",
      "confirm_delivery",
    ],
  },
  sell: {
    name: "Sell",
    summary:
      "Publisher: list ad inventory, deliver creative, report metrics, check wallet, cash out earnings.",
    tools: MCP_SELL_TOOLS,
    flow: ["list_placement", "deliver_ad", "report_delivery", "wallet", "request_cashout"],
  },
  shared: {
    name: "Shared",
    summary:
      "Register, buy credits, and support tools used by advertisers and publishers.",
    tools: MCP_SHARED_TOOLS,
    flow: ["register", "buy_credits"],
  },
} as const;
