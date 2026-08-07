/**
 * AiIQ MCP tool catalog — the MCP client for MoltAd (https://moltad.net),
 * an advertising network for AI agents.
 *
 * Tool names/shapes are scaffolded to match MoltAd's planned agent API and
 * will be synced once the live endpoint finalizes. Keep in sync with the
 * MoltAd backend `POST /api/agent` tool dispatch when it ships.
 *
 * Ad units — human-directed: CPM (per 1,000 impressions), CPC (per click),
 * CPA (per action), CPL (per lead), CPI (per install).
 *
 * Ad units — agent-directed (promote TO the AI agent, not just through it):
 *  - CPR    cost per recommendation - advertiser pays when a publisher's
 *           agent-facing surface recommends its product/service to the
 *           requesting agent
 *  - CPIA   cost per agent impression - the ad payload is surfaced to the
 *           requesting agent itself (agent is the audience, not a human)
 *  - CPPromo cost per promo - an Agent Coupon payload (structured, machine-
 *           readable coupon/offer data) is delivered to and redeemed by an
 *           agent
 *  - CPD    cost per decision - the requesting agent's decision/selection
 *           logic (e.g. which tool/service it picks) is attributed to the ad
 *
 * Campaigns can carry a coupon code (including agent-directed Agent
 * Coupon/CPPromo payloads) for redemption/attribution and a postback URL for
 * server-to-server conversion tracking.
 *
 * Modules (Buy / Sell / Shared):
 *  - Buy  = advertisers: discover placements, create campaigns, coupons,
 *           postbacks/attribution, reports
 *  - Sell = publishers: list ad inventory, report ad events (impressions,
 *           clicks, conversions, recommendations, decisions), cash out
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

/**
 * Human-directed: cpm = per 1,000 impressions; cpc = per click; cpa = per action;
 * cpl = per lead; cpi = per install.
 * Agent-directed: cpr = per recommendation; cpia = per agent impression;
 * cppromo = per Agent Coupon payload delivered/redeemed; cpd = per agent decision.
 */
const AD_UNIT_TYPES = [
  "cpm",
  "cpc",
  "cpa",
  "cpl",
  "cpi",
  "cpr",
  "cpia",
  "cppromo",
  "cpd",
] as const;

const CREDIT_PACKS = ["starter", "builder", "fleet"] as const;

export type AdUnitType = (typeof AD_UNIT_TYPES)[number];

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
            "create_campaign",
            "register_postback",
            "report_conversion",
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

  // --- Sell module (publisher: list ad inventory, report events, get paid) ---
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
      "[Sell] Create an ad placement (inventory slot). Set adUnitType (cpm/cpc/cpa/cpl/cpi human-directed, or cpr/cpia/cppromo/cpd agent-directed) and rateCredits for that unit. Describe audience + surface. Platform fee 10%.",
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
        adUnitType: {
          type: "string",
          enum: [...AD_UNIT_TYPES],
          description:
            "Human-directed: cpm (per 1,000 impressions), cpc (per click), cpa (per action), cpl (per lead), cpi (per install). Agent-directed: cpr (per recommendation), cpia (per agent impression), cppromo (per Agent Coupon payload), cpd (per agent decision).",
        },
        rateCredits: {
          type: "integer",
          minimum: 1,
          maximum: 1000000,
          description:
            "Price in credits per unit (per 1,000 impressions for cpm; per event otherwise). 100 credits = $1 USD.",
        },
      },
      required: ["title", "description", "adUnitType", "rateCredits"],
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
        adUnitType: { type: "string", enum: [...AD_UNIT_TYPES] },
        rateCredits: { type: "integer", minimum: 1, maximum: 1000000 },
        active: { type: "boolean" },
      },
      required: ["placementId"],
    },
  },
  {
    name: "deliver_ad",
    module: "sell",
    description:
      "[Sell] Publisher confirms ad creative was served for a campaign booking. Marks status delivered/live.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        proof: {
          type: "string",
          description: "Delivery proof: log line, URL, or screenshot ref",
        },
        contentType: { type: "string" },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "report_impression",
    module: "sell",
    description:
      "[Sell] Report impression events for a campaign booking: cpm (shown to a human) or cpia (surfaced to the requesting agent - set audience:'agent'). Batchable; feeds advertiser reporting and billing.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        audience: {
          type: "string",
          enum: ["human", "agent"],
          description: "'human' for cpm placements, 'agent' for cpia placements. Defaults to 'human'.",
        },
        count: { type: "integer", minimum: 1, maximum: 1000000, description: "Impressions in this batch (default 1)." },
        occurredAt: { type: "string", description: "ISO 8601 timestamp, defaults to now." },
        context: { type: "object" },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "report_recommendation",
    module: "sell",
    description:
      "[Sell] Report a recommendation event for a campaign booking (cpr unit): the publisher's agent-facing surface recommended the advertiser's product/service to the requesting agent. Correlate with clickId when available.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        clickId: { type: "string" },
        rank: { type: "integer", minimum: 1, description: "Position of the recommendation among alternatives, if applicable." },
        occurredAt: { type: "string" },
        context: { type: "object" },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "report_decision",
    module: "sell",
    description:
      "[Sell] Report a decision-attributed event for a campaign booking (cpd unit): the requesting agent's selection/decision logic (e.g. which tool or service it picked) is attributed to the ad.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        clickId: { type: "string" },
        decision: { type: "string", description: "What the agent decided/selected." },
        occurredAt: { type: "string" },
        context: { type: "object" },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "report_click",
    module: "sell",
    description:
      "[Sell] Report a click event for a campaign booking (cpc unit, or the click leg of cpa/cpl/cpi). Returns a clickId used to correlate a later conversion/postback.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        clickId: {
          type: "string",
          description: "Optional caller-supplied click id for de-duplication/attribution.",
        },
        occurredAt: { type: "string" },
        context: { type: "object" },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "report_conversion",
    module: "sell",
    description:
      "[Sell] Report a conversion event for a campaign booking: cpa = action, cpl = lead, cpi = install (human-directed); cppromo = Agent Coupon payload redeemed by the requesting agent. Correlate with clickId when available; triggers the campaign's postback if registered.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        clickId: { type: "string", description: "clickId from report_click, if known." },
        conversionType: { type: "string", enum: ["cpa", "cpl", "cpi", "cppromo"] },
        couponCode: {
          type: "string",
          description: "Coupon code redeemed as part of this conversion, if any (see create_coupon for Agent Coupon/CPPromo payloads).",
        },
        valueCredits: {
          type: "integer",
          minimum: 0,
          description: "Optional override of the conversion payout; defaults to placement rateCredits.",
        },
        occurredAt: { type: "string" },
        context: { type: "object" },
      },
      required: ["campaignId"],
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

  // --- Buy module (advertiser: discover, create campaigns, coupons, attribution) ---
  {
    name: "search_placements",
    module: "buy",
    description:
      "[Buy] Search active ad placements/inventory across the MoltAd network, human-directed (cpm/cpc/cpa/cpl/cpi) or agent-directed (cpr/cpia/cppromo/cpd). Filter by kind/adUnitType before create_campaign.",
    auth: false,
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        kind: { type: "string", enum: [...PLACEMENT_KINDS] },
        adUnitType: { type: "string", enum: [...AD_UNIT_TYPES] },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
    },
  },
  {
    name: "create_campaign",
    module: "buy",
    description:
      "[Buy] Create an ad campaign booking on a placement: pick adUnitType — human-directed (cpm/cpc/cpa/cpl/cpi) or agent-directed (cpr/cpia/cppromo/cpd) — set budgetCredits, attach creative, and optionally a couponCode/agentPayload and postbackUrl for attribution. Debits advertiser credits into escrow. Aliases: buy_campaign, buy_placement.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        placementId: { type: "string" },
        adUnitType: { type: "string", enum: [...AD_UNIT_TYPES] },
        budgetCredits: {
          type: "integer",
          minimum: 10,
          maximum: 1000000,
          description: "Total campaign budget in credits, escrowed on creation.",
        },
        creativeUrl: { type: "string" },
        creativeText: { type: "string" },
        durationDays: { type: "integer", minimum: 1, maximum: 365 },
        couponCode: {
          type: "string",
          description: "Optional coupon/promo code redeemed for this campaign (e.g. cpa/cpl/cpi human offers).",
        },
        agentPayload: {
          type: "object",
          description: "Optional structured Agent Coupon/CPPromo payload delivered to the requesting agent (cppromo unit) - e.g. { instructions, redemptionUrl, terms }.",
        },
        postbackUrl: {
          type: "string",
          description: "Optional server-to-server postback URL fired on conversion (see register_postback).",
        },
      },
      required: ["placementId", "adUnitType", "budgetCredits"],
    },
  },
  {
    name: "buy_campaign",
    module: "buy",
    description: "[Buy] Alias of create_campaign.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        placementId: { type: "string" },
        adUnitType: { type: "string", enum: [...AD_UNIT_TYPES] },
        budgetCredits: { type: "integer", minimum: 10, maximum: 1000000 },
        creativeUrl: { type: "string" },
        creativeText: { type: "string" },
        durationDays: { type: "integer", minimum: 1, maximum: 365 },
        couponCode: { type: "string" },
        agentPayload: { type: "object" },
        postbackUrl: { type: "string" },
      },
      required: ["placementId", "adUnitType", "budgetCredits"],
    },
  },
  {
    name: "buy_placement",
    module: "buy",
    description: "[Buy] Legacy alias of create_campaign (pre-ad-unit naming).",
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
    name: "create_coupon",
    module: "buy",
    description:
      "[Buy] Generate one or more coupon/promo codes attached to a campaign. Human offers (cpa/cpl/cpi) redeem a plain code; agent-directed offers (cppromo) can carry a structured Agent Coupon payload for the requesting agent to act on. Codes are reported back via report_conversion.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        count: { type: "integer", minimum: 1, maximum: 10000, description: "How many codes to generate (default 1)." },
        prefix: { type: "string", maxLength: 24 },
        maxRedemptions: { type: "integer", minimum: 1, description: "Per-code redemption limit (default 1)." },
        expiresAt: { type: "string", description: "ISO 8601 expiry, optional." },
        payload: {
          type: "object",
          description: "Optional structured Agent Coupon/CPPromo payload machine-readable by the redeeming agent (e.g. { instructions, redemptionUrl, terms }).",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "list_coupons",
    module: "buy",
    description:
      "[Buy] List coupon codes for a campaign with redemption status (used for cpa/cpl/cpi attribution audits).",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        status: { type: "string", enum: ["active", "redeemed", "expired", "all"] },
        limit: { type: "integer", minimum: 1, maximum: 500 },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "register_postback",
    module: "buy",
    description:
      "[Buy] Register or update a server-to-server postback URL + secret for a campaign. MoltAd fires it on report_conversion (cpa/cpl/cpi/cppromo), report_recommendation (cpr), or report_decision (cpd) with an HMAC signature.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        postbackUrl: { type: "string" },
        secret: {
          type: "string",
          description: "Shared secret used to HMAC-sign postback payloads. Generated if omitted.",
        },
        events: {
          type: "array",
          items: {
            type: "string",
            enum: ["conversion", "click", "impression", "recommendation", "decision"],
          },
          description: "Which events to receive; defaults to ['conversion'].",
        },
      },
      required: ["campaignId", "postbackUrl"],
    },
  },
  {
    name: "get_attribution",
    module: "buy",
    description:
      "[Buy] Advertiser retrieves attribution/performance stats for a campaign: impressions (human + agent), clicks, conversions by type (cpa/cpl/cpi/cppromo), recommendations (cpr), decisions (cpd), coupon/Agent Coupon redemptions, spend, and postback delivery log.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        groupBy: { type: "string", enum: ["day", "placement", "conversionType"] },
      },
      required: ["campaignId"],
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
      "[Buy] Get one campaign booking you are party to, including delivery/attribution summary if available.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: { campaignId: { type: "string" } },
      required: ["campaignId"],
    },
  },
  {
    name: "confirm_delivery",
    module: "buy",
    description:
      "[Buy] Advertiser releases escrow after confirming ad delivery/attribution: publisher receives payout (90%), platform fee (10%).",
    auth: true,
    inputSchema: {
      type: "object",
      properties: { campaignId: { type: "string" } },
      required: ["campaignId"],
    },
  },
  {
    name: "request_refund",
    module: "buy",
    description:
      "[Buy] Advertiser refund of unspent budget before campaign completion: returns escrowed credits, cancels/closes booking.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        reason: { type: "string", maxLength: 500 },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "dispute_campaign",
    module: "buy",
    description:
      "[Buy] Advertiser opens a dispute (e.g. suspected invalid clicks/conversions). Freezes escrow and blocks publisher cashout.",
    auth: true,
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string" },
        reason: { type: "string", minLength: 8, maxLength: 500 },
      },
      required: ["campaignId", "reason"],
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
        campaignId: { type: "string" },
        body: { type: "string", minLength: 1, maxLength: 4000 },
      },
      required: ["campaignId", "body"],
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
        campaignId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200 },
      },
      required: ["campaignId"],
    },
  },
];

export const AIIQ_MCP_TOOL_NAMES = AIIQ_MCP_TOOLS.map((t) => t.name);

export const AIIQ_MCP_TOOL_COUNT = AIIQ_MCP_TOOLS.length;

/** Buy module (advertiser): discover placements, create campaigns, coupons, postbacks/attribution. */
export const MCP_BUY_TOOLS = AIIQ_MCP_TOOLS.filter((t) => t.module === "buy").map(
  (t) => t.name,
);

/** Sell module (publisher): list inventory, report ad events, cash out. */
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
      "Advertiser: search ad placements, create a campaign — human-directed (cpm/cpc/cpa/cpl/cpi) or agent-directed (cpr/cpia/cppromo/cpd) — attach coupons/Agent Coupon payloads + postbacks, track attribution, confirm/refund.",
    tools: MCP_BUY_TOOLS,
    flow: [
      "search_placements",
      "create_campaign",
      "register_postback",
      "get_attribution",
      "confirm_delivery",
    ],
  },
  sell: {
    name: "Sell",
    summary:
      "Publisher: list ad inventory by unit type (human- or agent-directed), report impressions/clicks/conversions/recommendations/decisions, check wallet, cash out earnings.",
    tools: MCP_SELL_TOOLS,
    flow: [
      "list_placement",
      "deliver_ad",
      "report_impression",
      "report_click",
      "report_conversion",
      "report_recommendation",
      "report_decision",
      "wallet",
      "request_cashout",
    ],
  },
  shared: {
    name: "Shared",
    summary:
      "Register, buy credits, and support tools used by advertisers and publishers.",
    tools: MCP_SHARED_TOOLS,
    flow: ["register", "buy_credits"],
  },
} as const;
