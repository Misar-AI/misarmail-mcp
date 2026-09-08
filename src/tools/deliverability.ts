import { apiFetch, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const deliverabilityTools: ToolDefinition[] = [
  defineTool({
    name: "get_deliverability_score",
    category: "deliverability",
    description:
      "Get the account deliverability score (0–100) and letter grade (A–F) with the factors dragging it down. Start here when asked why emails are landing in spam.",
    annotations: {
      title: "Deliverability score",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => unwrap(await apiFetch(ctx, "/deliverability/score")),
  }),

  defineTool({
    name: "run_deliverability_audit",
    category: "deliverability",
    description:
      "Run a full deliverability audit across authentication (SPF/DKIM/DMARC), domain reputation, list hygiene, content signals, and blocklist status. Returns prioritized findings.",
    annotations: {
      title: "Deliverability audit",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => unwrap(await apiFetch(ctx, "/deliverability/audit")),
  }),

  defineTool({
    name: "get_warmup_status",
    category: "deliverability",
    description:
      "Get IP/domain warm-up progress and today's remaining send capacity. Exceeding warm-up capacity on a new domain is the fastest way to get throttled or blocklisted.",
    annotations: {
      title: "Warm-up status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => unwrap(await apiFetch(ctx, "/warmup")),
  }),

  defineTool({
    name: "check_dmarc",
    category: "deliverability",
    description:
      "Check live SPF, DKIM, and DMARC DNS records for a domain and report alignment problems with the exact record to publish. Works for any domain, not only your own.",
    annotations: {
      title: "Check DMARC/SPF/DKIM",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["domain"],
      properties: { domain: { type: "string", description: "Domain to check, e.g. example.com" } },
    },
    handler: async (ctx, args) =>
      unwrap(await apiFetch(ctx, `/dmarc/check${buildQuery({ domain: args.domain })}`)),
  }),
];
