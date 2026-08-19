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
      "List automation workflows on the account — welcome series, re-engagement, drip " +
      "sequences — with their status and enrolment counts. " +
      "\n\n" +
      "Use it to see what is running before adding another workflow that might overlap, and " +
      "to find an automation id for get_automation or toggle_automation. Listing does not " +
      "reveal the individual steps; get_automation does that. " +
      "\n\n" +
      "Reads only; nothing is activated, paused, or enrolled. Requires an API key. An " +
      "automation may exist while inactive, so read the status rather than assuming a " +
      "listed workflow is sending. ",
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
      "Get one automation workflow in full: its trigger, every step with its settings, and " +
      "current enrolment counts. " +
      "\n\n" +
      "Use it to understand exactly what an automation will do to contacts before " +
      "activating it — the step list is where sends, waits and branches become visible. For " +
      "the list of automations, use list_automations; to start or pause one, " +
      "toggle_automation. " +
      "\n\n" +
      "Reads only; reading a workflow does not enrol anyone or trigger a step. Requires an " +
      "API key. An automation can be defined but inactive, so check its state rather than " +
      "assuming it is running. ",
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
      "Create an automation workflow from a trigger and an ordered list of steps. Created paused by default — call toggle_automation to activate once the steps are reviewed.",
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
        steps: {
          type: "array",
          description: "Ordered workflow steps",
          items: {
            type: "object",
            required: ["type"],
            properties: {
              type: {
                type: "string",
                enum: ["send_email", "wait", "add_tag", "remove_tag", "condition"],
                description: "Step action",
              },
              delay_hours: { type: "number", description: "Hours to wait before this step" },
              template_id: { type: "string", description: "Template for send_email steps" },
              subject: { type: "string", description: "Subject for send_email steps" },
              tag: { type: "string", description: "Tag for add_tag / remove_tag steps" },
            },
          },
        },
        active: { type: "boolean", description: "Start active immediately (default false)" },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/automations", { method: "POST", body: JSON.stringify(args) }),
  }),

  defineTool({
    name: "toggle_automation",
    category: "automations",
    description:
      "Activate or pause one automation workflow. " +
      "\n\n" +
      "This is consequential in one direction: ACTIVATING starts enrolling contacts, which " +
      "means real emails begin going out on the workflow's schedule without further " +
      "confirmation. Pausing stops new enrolments. Read the workflow with get_automation " +
      "first so you know what activating will actually send. " +
      "\n\n" +
      "Contacts already part-way through a paused workflow are held rather than dropped, so " +
      "pausing is not a cancellation. Safe to repeat. Requires an API key. ",
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
