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
          enum: ["subject", "content", "send_time", "from_name"],
          description: "Filter by what is being tested",
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
      "Create an A/B test on a campaign with two or more variants. A sample percentage is sent first; the winner goes to the remainder once selected.",
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
      required: ["campaign_id", "type", "variants"],
      properties: {
        campaign_id: { type: "string", description: "Campaign to test" },
        type: {
          type: "string",
          enum: ["subject", "content", "send_time", "from_name"],
          description: "What to test",
        },
        variants: {
          type: "array",
          description: "Test variants (2–5)",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Variant label, e.g. A / B" },
              subject: { type: "string", description: "Subject line for subject tests" },
              html: { type: "string", description: "Body content for content tests" },
              from_name: { type: "string", description: "Sender name for from_name tests" },
              send_at: { type: "string", description: "ISO timestamp for send_time tests" },
            },
          },
        },
        sample_percentage: {
          type: "number",
          description: "Percent of the audience used for the test (default 20)",
        },
        winner_metric: {
          type: "string",
          enum: ["open_rate", "click_rate", "conversion_rate"],
          description: "Metric used to pick the winner (default open_rate)",
        },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/ab-tests", { method: "POST", body: JSON.stringify(args) }),
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
          enum: ["open_rate", "click_rate", "conversion_rate"],
          description: "Metric the decision was based on (default open_rate)",
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
