import { apiFetch, apiFetchRoot, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

/** Account, AI, integration, and sandbox tools — the operational surface. */
export const accountTools: ToolDefinition[] = [
  defineTool({
    name: "list_api_keys",
    category: "account",
    description:
      "List API keys on the account with their scopes and last-used time. Key secrets are never returned — only metadata.",
    annotations: {
      title: "List API keys",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => unwrap(await apiFetch(ctx, "/keys")),
  }),

  defineTool({
    name: "generate_subject_lines",
    category: "ai",
    description:
      "Generate AI subject-line variants for a campaign topic, optionally tuned to a tone and audience. Good input for create_ab_test.",
    scopes: ["write"],
    annotations: {
      title: "Generate subject lines",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["topic"],
      properties: {
        topic: { type: "string", description: "What the email is about" },
        tone: {
          type: "string",
          enum: ["professional", "friendly", "urgent", "playful", "formal"],
          description: "Desired tone (default professional)",
        },
        audience: { type: "string", description: "Who the email is for" },
        count: { type: "number", description: "How many variants to generate (default 5, max 10)" },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/ai/subject-lines", { method: "POST", body: JSON.stringify(args) }),
  }),

  defineTool({
    name: "list_integrations",
    category: "integrations",
    description: "List connected third-party integrations and their sync status.",
    annotations: {
      title: "List integrations",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 20)" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetchRoot(
          ctx,
          `/integrations${buildQuery({ page: args.page, limit: args.limit })}`,
        ),
      ),
  }),

  defineTool({
    name: "get_integration",
    category: "integrations",
    description: "Get one integration's configuration, scopes, and last sync result.",
    annotations: {
      title: "Get integration",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["integration_id"],
      properties: { integration_id: { type: "string", description: "Integration ID" } },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetchRoot(ctx, `/integrations/${encodeURIComponent(String(args.integration_id))}`),
      ),
  }),

  defineTool({
    name: "toggle_integration",
    category: "integrations",
    description:
      "Enable or disable an integration. Disabling stops all syncing but preserves the stored credentials.",
    scopes: ["write"],
    annotations: {
      title: "Toggle integration",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["integration_id", "enabled"],
      properties: {
        integration_id: { type: "string", description: "Integration ID" },
        enabled: { type: "boolean", description: "true to enable, false to disable" },
      },
    },
    handler: (ctx, args) =>
      apiFetchRoot(ctx, `/integrations/${encodeURIComponent(String(args.integration_id))}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: args.enabled }),
      }),
  }),

  defineTool({
    name: "list_sandbox_sends",
    category: "sandbox",
    description:
      "List emails captured by sandbox mode. Sandbox intercepts sends instead of delivering them — use it to verify templates and automations without emailing anyone.",
    annotations: {
      title: "List sandbox sends",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => unwrap(await apiFetch(ctx, "/sandbox")),
  }),

  defineTool({
    name: "clear_sandbox",
    category: "sandbox",
    description:
      "Delete every captured sandbox email. Affects only intercepted test messages, never real sent mail.",
    scopes: ["write"],
    annotations: {
      title: "Clear sandbox",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: {} },
    handler: (ctx) => apiFetch(ctx, "/sandbox", { method: "DELETE" }),
  }),
];
