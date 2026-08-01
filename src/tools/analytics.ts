import { apiFetch, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

/** Resolve a `period` shorthand to an ISO start date. */
function periodStart(period: unknown): string {
  const days: Record<string, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };
  const n = days[String(period ?? "30d")] ?? 30;
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
}

export const analyticsTools: ToolDefinition[] = [
  defineTool({
    name: "get_analytics",
    category: "analytics",
    description:
      "Get delivery and engagement analytics — sent, delivered, opened, clicked, bounced, and complained — for the account or one campaign, grouped by day/week/month.",
    annotations: {
      title: "Get analytics",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Limit to one campaign (omit for account-wide)" },
        start_date: { type: "string", description: "Start date, ISO 8601 (e.g. 2026-01-01)" },
        end_date: { type: "string", description: "End date, ISO 8601" },
        period: {
          type: "string",
          enum: ["today", "7d", "30d", "90d"],
          description: "Shorthand window used when start_date is omitted (default 30d)",
        },
        group_by: {
          type: "string",
          enum: ["day", "week", "month"],
          description: "Time bucket for the series (default day)",
        },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetch(
          ctx,
          `/analytics${buildQuery({
            campaignId: args.campaign_id,
            startDate: args.start_date ?? periodStart(args.period),
            endDate: args.end_date,
            groupBy: args.group_by ?? "day",
          })}`,
        ),
      ),
  }),

  defineTool({
    name: "generate_report",
    category: "analytics",
    description:
      "Generate a structured analytics report over a date range. Report types: campaign_performance, engagement_funnel, cohort_analysis, and send_time_heatmap (best hour/day to send).",
    annotations: {
      title: "Generate report",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["report_type"],
      properties: {
        report_type: {
          type: "string",
          enum: [
            "campaign_performance",
            "engagement_funnel",
            "cohort_analysis",
            "send_time_heatmap",
          ],
          description: "Type of report to generate",
        },
        date_from: { type: "string", description: "Start date, ISO 8601 (default: 30 days ago)" },
        date_to: { type: "string", description: "End date, ISO 8601 (default: today)" },
      },
    },
    handler: async (ctx, args) => {
      const dateFrom = (args.date_from as string) || periodStart("30d");
      const dateTo = (args.date_to as string) || new Date().toISOString().split("T")[0]!;
      const summary = unwrap(
        await apiFetch(ctx, `/analytics${buildQuery({ startDate: dateFrom, endDate: dateTo })}`),
      );
      return { report_type: args.report_type, date_from: dateFrom, date_to: dateTo, summary };
    },
  }),

  defineTool({
    name: "get_revenue_attribution",
    category: "analytics",
    description:
      "Attribute ecommerce revenue to email — revenue per campaign, per contact, and average order value from tracked conversions.",
    annotations: {
      title: "Revenue attribution",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "7d", "30d", "90d"],
          description: "Time window (default 30d)",
        },
        campaign_id: { type: "string", description: "Limit to one campaign" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetch(
          ctx,
          `/revenue/attribution${buildQuery({
            period: args.period ?? "30d",
            campaign_id: args.campaign_id,
          })}`,
        ),
      ),
  }),

  defineTool({
    name: "get_monetization_stats",
    category: "analytics",
    description:
      "Get newsletter monetization stats: paid subscribers, MRR, churn, and sponsorship revenue for the period.",
    annotations: {
      title: "Monetization stats",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "7d", "30d", "90d"],
          description: "Time window (default 30d)",
        },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetch(ctx, `/monetization/stats${buildQuery({ period: args.period ?? "30d" })}`),
      ),
  }),
];
