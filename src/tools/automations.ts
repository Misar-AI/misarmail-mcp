import { apiFetch, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

/**
 * Automation tools target the VERSIONED routes.
 *
 * `/api/automations` authenticates with a Supabase session only, so every call
 * from an MCP client returned "Unauthorized" — verified against production.
 * `/api/v1/automations` accepts API keys and is the only path that works here.
 */
export const automationTools: ToolDefinition[] = [
  defineTool({
    name: "list_automations",
    category: "automations",
    description:
      "List automation workflows (welcome series, re-engagement, drip sequences) with their trigger type and active state.",
    annotations: {
      title: "List automations",
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
          enum: ["active", "paused", "draft"],
          description: "Filter by automation status",
        },
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 20)" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetch(
          ctx,
          `/automations${buildQuery({ page: args.page, limit: args.limit, status: args.status })}`,
        ),
      ),
  }),

  defineTool({
    name: "get_automation",
    category: "automations",
    description:
      "Get one automation workflow in full: trigger, every step with its delay, and per-step completion stats.",
    annotations: {
      title: "Get automation",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["automation_id"],
      properties: { automation_id: { type: "string", description: "Automation ID (UUID)" } },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetch(ctx, `/automations/${encodeURIComponent(String(args.automation_id))}`),
      ),
  }),

  defineTool({
    name: "create_automation",
    category: "automations",
    description:
      "Create an automation workflow from a trigger, saved as a paused draft. The API's create endpoint only accepts a name and trigger — it has no fields for workflow steps or starting active; configure the step sequence in the MisarMail dashboard's visual builder, and use toggle_automation to activate once reviewed.",
    scopes: ["write"],
    annotations: {
      title: "Create automation",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["name", "trigger"],
      properties: {
        name: { type: "string", description: "Automation name" },
        trigger: {
          type: "string",
          enum: ["contact_created", "tag_added", "campaign_opened", "link_clicked", "date_based"],
          description: "Event that starts the workflow",
        },
        trigger_config: {
          type: "object",
          description: "Trigger parameters, e.g. { \"tag\": \"trial\" } for tag_added",
        },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/automations", {
        method: "POST",
        body: JSON.stringify({
          name: args.name,
          trigger_type: args.trigger,
          trigger_config: args.trigger_config,
        }),
      }),
  }),

  defineTool({
    name: "toggle_automation",
    category: "automations",
    description:
      "Activate or pause an automation. Activating starts enrolling contacts and sending on the configured schedule.",
    scopes: ["write"],
    annotations: {
      title: "Toggle automation",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["automation_id", "active"],
      properties: {
        automation_id: { type: "string", description: "Automation ID (UUID)" },
        active: { type: "boolean", description: "true to activate, false to pause" },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, `/automations/${encodeURIComponent(String(args.automation_id))}`, {
        method: "PATCH",
        body: JSON.stringify({ active: args.active }),
      }),
  }),
];
