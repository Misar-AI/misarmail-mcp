import { apiFetch, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const abTestTools: ToolDefinition[] = [
  defineTool({
    name: "list_ab_tests",
    category: "ab-testing",
    description:
      "List A/B tests with per-variant results and whether a winner has been selected yet.",
    annotations: {
      title: "List A/B tests",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["campaign", "subject"],
          description:
            "Filter by test source: 'campaign' for campaign A/B tests (subject/content/send_time/from_name variants on a campaign), 'subject' for standalone subject-line tests",
        },
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 20)" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetch(
          ctx,
          `/ab-tests${buildQuery({ page: args.page, limit: args.limit, type: args.type })}`,
        ),
      ),
  }),

  defineTool({
    name: "create_ab_test",
    category: "ab-testing",
    description:
      "Create one A/B test variant on a campaign. The real API stores a single variant per call, so build a test by calling this once per variant (e.g. twice for a plain A/B split) using the same campaign_id and distinct `variant` labels. Each variant gets send_percent of the audience; auto_select_winner (with winner_wait_hours) can pick and send the winner automatically, or use select_ab_test_winner to do it manually.",
    scopes: ["write"],
    annotations: {
      title: "Create A/B test",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["campaign_id", "variant"],
      properties: {
        campaign_id: { type: "string", description: "Campaign to test (UUID)" },
        variant: { type: "string", description: "Variant label, e.g. 'A' or 'B' (max 5 chars)" },
        test_type: {
          type: "string",
          enum: ["content", "subject", "send_time", "from_name", "preheader"],
          description: "What this variant differs on (default: content)",
        },
        subject: { type: "string", description: "Subject line for subject tests" },
        preheader: { type: "string", description: "Preheader text for preheader tests" },
        body_html: { type: "string", description: "Body HTML for content tests" },
        from_name: { type: "string", description: "Sender name for from_name tests" },
        send_percent: {
          type: "number",
          description: "Percent of the audience that receives this variant (1-99, default 50)",
        },
        send_time_a: { type: "string", description: "ISO timestamp for this variant's send_time slot A" },
        send_time_b: { type: "string", description: "ISO timestamp for this variant's send_time slot B" },
        auto_select_winner: {
          type: "boolean",
          description: "Automatically select and send the winner after winner_wait_hours (default false)",
        },
        winner_wait_hours: {
          type: "number",
          description: "Hours to wait before auto-selecting a winner (1-168, default 4)",
        },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/ab-tests", {
        method: "POST",
        body: JSON.stringify({
          campaign_id: args.campaign_id,
          variant: args.variant,
          test_type: args.test_type,
          subject: args.subject,
          preheader: args.preheader,
          body_html: args.body_html,
          from_name: args.from_name,
          send_percent: args.send_percent,
          send_time_a: args.send_time_a,
          send_time_b: args.send_time_b,
          auto_select_winner: args.auto_select_winner,
          winner_wait_hours: args.winner_wait_hours,
        }),
      }),
  }),

  defineTool({
    name: "select_ab_test_winner",
    category: "ab-testing",
    description:
      "Select the winning variant and send it to the remaining audience. This triggers a real send to everyone who was held back — it cannot be undone.",
    scopes: ["send", "write"],
    annotations: {
      title: "Select A/B winner",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["test_id", "winner_variant"],
      properties: {
        test_id: { type: "string", description: "A/B test ID" },
        winner_variant: { type: "string", description: "Label of the winning variant, e.g. B" },
        metric: {
          type: "string",
          enum: ["opens", "clicks", "revenue", "conversions"],
          description: "Metric the decision was based on (default opens)",
        },
      },
    },
    handler: (ctx, args) => {
      const { test_id, ...body } = args;
      return apiFetch(ctx, `/ab-tests/${encodeURIComponent(String(test_id))}/winner`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
  }),
];
