import { apiFetch, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

/** Campaign lifecycle: draft, schedule, send and inspect. */
export const campaignTools: ToolDefinition[] = [
  defineTool({
    name: "list_campaigns",
    category: "campaigns",
    description:
      "List email marketing campaigns with their status, audience size, and headline metrics. Filter by status to find drafts ready to send or campaigns still sending.",
    annotations: {
      title: "List campaigns",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["draft", "scheduled", "sending", "sent", "paused", "failed"],
          description: "Filter by campaign status",
        },
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 20, max 100)" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetch(
          ctx,
          `/campaigns${buildQuery({ page: args.page, limit: args.limit, status: args.status })}`,
        ),
      ),
  }),

  defineTool({
    name: "get_campaign",
    category: "campaigns",
    description:
      "Get full details for one campaign: content, audience segment, schedule, and delivery statistics (sent, opened, clicked, bounced, complained).",
    annotations: {
      title: "Get campaign",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["campaign_id"],
      properties: { campaign_id: { type: "string", description: "Campaign ID (UUID)" } },
    },
    handler: async (ctx, args) =>
      unwrap(await apiFetch(ctx, `/campaigns/${encodeURIComponent(String(args.campaign_id))}`)),
  }),

  defineTool({
    name: "create_campaign",
    category: "campaigns",
    description:
      "Create a new email marketing campaign as a draft. Creating never sends — call send_campaign separately once the content and audience are confirmed.",
    scopes: ["write"],
    annotations: {
      title: "Create campaign",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["name", "subject", "from_email"],
      properties: {
        name: { type: "string", description: "Internal campaign name (not shown to recipients)" },
        subject: { type: "string", description: "Subject line recipients will see" },
        from_email: { type: "string", description: "Verified sender address" },
        from_name: { type: "string", description: "Sender display name" },
        reply_to: { type: "string", description: "Reply-to address" },
        html: { type: "string", description: "HTML body content" },
        text: { type: "string", description: "Plain text body content" },
        template_id: { type: "string", description: "Use a saved template instead of inline HTML" },
        segment_id: { type: "string", description: "Audience segment to send to" },
        tags: { type: "array", items: { type: "string" }, description: "Contact tags to target" },
        scheduled_at: {
          type: "string",
          description: "ISO 8601 timestamp to schedule the send (omit to keep as draft)",
        },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/campaigns", { method: "POST", body: JSON.stringify(args) }),
  }),

  defineTool({
    name: "send_campaign",
    category: "campaigns",
    description:
      "Send a campaign now, or schedule it for a future time by passing scheduled_at. This delivers real email to real recipients and cannot be undone once sending starts — confirm the audience with get_campaign first.",
    scopes: ["send"],
    annotations: {
      title: "Send campaign",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["campaign_id"],
      properties: {
        campaign_id: { type: "string", description: "Campaign ID (UUID)" },
        scheduled_at: {
          type: "string",
          description: "ISO 8601 timestamp to schedule instead of sending immediately",
        },
      },
    },
    handler: async (ctx, args) => {
      const id = encodeURIComponent(String(args.campaign_id));
      if (args.scheduled_at) {
        return apiFetch(ctx, `/campaigns/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "scheduled", scheduled_at: args.scheduled_at }),
        });
      }
      return apiFetch(ctx, `/campaigns/${id}/send`, { method: "POST" });
    },
  }),
];
