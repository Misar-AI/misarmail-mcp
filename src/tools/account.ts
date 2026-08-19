import { apiFetch, apiFetchRoot, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

/** Account, AI, integration, and sandbox tools — the operational surface. */
export const accountTools: ToolDefinition[] = [
  defineTool({
    name: "list_api_keys",
    category: "account",
    description:
      "List the API keys on the account with their scopes and when each was last used. " +
      "\n\n" +
      "Use it to audit access — to spot keys that are unused, over-scoped, or forgotten. It " +
      "lists key METADATA only: the secret values are not returned by this or any other " +
      "tool, so a key that has been lost must be rotated rather than recovered. " +
      "\n\n" +
      "Reads only; no key is created, revoked, or rotated. Requires an API key. Scope and " +
      "last-used data is security-relevant, so treat the listing as sensitive even though " +
      "it contains no secrets. ",
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
    description:
      "List every third-party integration connected to the account, with its sync status " +
      "and when it last ran. " +
      "\n\n" +
      "Start here when a question involves external data — it tells you which integrations " +
      "exist and whether they are actually syncing. For one integration's configuration and " +
      "scopes, follow up with get_integration; to turn one on or off, use " +
      "toggle_integration. " +
      "\n\n" +
      "Reads only; nothing is connected, disconnected, or re-synced. Requires an API key. " +
      "An integration listed as connected can still be failing to sync, so check the status " +
      "rather than assuming. An empty list means nothing is connected yet, which is not an " +
      "error. ",
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
    description:
      "Get one integration in full: its configuration, the scopes it was granted, and the " +
      "result of its last sync. " +
      "\n\n" +
      "Use it to diagnose an integration that list_integrations shows as unhealthy, or to " +
      "check which scopes were granted before relying on a capability. Covers a single " +
      "integration — list_integrations gives the overview. " +
      "\n\n" +
      "Reads only; it does not re-run a sync or change any setting. Requires an API key. " +
      "The response describes what the integration is permitted to do, which is not the " +
      "same as what it has successfully done — read the last sync result for that. ",
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
      "Turn one third-party integration on or off. " +
      "\n\n" +
      "This changes live behaviour: DISABLING stops all syncing through that integration, " +
      "so data quietly stops flowing until it is re-enabled. It does not disconnect the " +
      "integration or revoke its credentials — the connection and its scopes survive, which " +
      "is why re-enabling picks up where it left off. " +
      "\n\n" +
      "Safe to repeat: setting an integration to the state it is already in changes " +
      "nothing. Requires an API key. Call list_integrations first so you know the current " +
      "state rather than toggling blind. ",
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
      "Delete every email captured in the sandbox. " +
      "\n\n" +
      "The sandbox holds messages intercepted during testing so they are never delivered to " +
      "real recipients. This DELETES ALL of them and cannot be undone — but it touches only " +
      "intercepted test mail, never sent campaigns, real inbox messages, contacts, or " +
      "templates. " +
      "\n\n" +
      "Takes no parameters and offers no filter: it is all or nothing. Requires an API key. " +
      "Clearing an already-empty sandbox is harmless. Read anything you still need from the " +
      "sandbox before calling this. ",
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
