import { apiFetchRoot, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const inboxTools: ToolDefinition[] = [
  defineTool({
    name: "list_inbox_conversations",
    category: "email",
    description:
      "List unified-inbox conversations (threads) with their status and detected intent. Use this for triage; use list_emails for individual messages in a folder.",
    annotations: {
      title: "List conversations",
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
          enum: ["open", "pending", "closed"],
          description: "Filter by conversation status",
        },
        intent: {
          type: "string",
          description: "Filter by detected intent, e.g. interested, unsubscribe, question",
        },
        channel: { type: "string", description: "Filter by channel, e.g. email" },
        q: { type: "string", description: "Free-text search across the thread" },
        limit: { type: "number", description: "Results to return (default 20)" },
        offset: { type: "number", description: "Offset for pagination" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetchRoot(
          ctx,
          `/inbox/conversations${buildQuery({
            status: args.status,
            intent: args.intent,
            channel: args.channel,
            q: args.q,
            limit: args.limit,
            offset: args.offset,
          })}`,
        ),
      ),
  }),

  defineTool({
    name: "get_inbox_conversation_messages",
    category: "email",
    description: "Get every message in one inbox conversation, oldest first, with sender and timestamps.",
    annotations: {
      title: "Conversation messages",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["conversation_id"],
      properties: {
        conversation_id: { type: "string", description: "Conversation ID (UUID)" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetchRoot(
          ctx,
          `/inbox/conversations/${encodeURIComponent(String(args.conversation_id))}/messages`,
        ),
      ),
  }),

  defineTool({
    name: "categorize_inbox_emails",
    category: "email",
    description:
      "Run AI categorisation over a batch of inbox emails to label intent and priority. Consumes AI credits — pass only the emails you actually need triaged.",
    scopes: ["write"],
    annotations: {
      title: "Categorize inbox",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["email_ids"],
      properties: {
        email_ids: {
          type: "array",
          items: { type: "string" },
          description: "Email IDs to categorise (max 50 per call)",
        },
      },
    },
    handler: (ctx, args) =>
      apiFetchRoot(ctx, "/inbox/categorize", {
        method: "POST",
        body: JSON.stringify({ emailIds: args.email_ids }),
      }),
  }),
];
