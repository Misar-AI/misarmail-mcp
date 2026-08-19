import { apiFetch, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

const recipient = {
  type: "object",
  required: ["email"],
  properties: {
    email: { type: "string", description: "Recipient email address" },
    name: { type: "string", description: "Recipient display name" },
  },
} as const;

export const emailTools: ToolDefinition[] = [
  defineTool({
    name: "send_email",
    category: "email",
    description:
      "Send a transactional email from a verified MisarMail account. `from.email` must match an email account you have already verified — use list_domains to check which sender domains are available. Returns the message ID and queue status.",
    scopes: ["send", "send:transactional"],
    annotations: {
      title: "Send email",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["from", "to", "subject"],
      properties: {
        from: {
          type: "object",
          required: ["email"],
          description: "Sender address (must match a verified MisarMail account)",
          properties: {
            email: { type: "string", description: "Sender email address" },
            name: { type: "string", description: "Sender display name shown to recipients" },
          },
        },
        to: { type: "array", description: "Recipient list (1–100 addresses)", items: recipient },
        cc: { type: "array", description: "CC recipients (max 50)", items: recipient },
        bcc: {
          type: "array",
          description: "BCC recipients (max 50, hidden from other recipients)",
          items: recipient,
        },
        reply_to: {
          type: "object",
          description: "Reply-to address",
          properties: { email: { type: "string" }, name: { type: "string" } },
        },
        subject: { type: "string", description: "Email subject (max 998 chars)" },
        html: { type: "string", description: "HTML body (max 500KB, recommended)" },
        text: { type: "string", description: "Plain text body (max 500KB, fallback for HTML)" },
        alias_id: { type: "string", description: "Route via a specific alias SMTP pool" },
        idempotency_key: {
          type: "string",
          description: "Unique key to prevent duplicate sends (max 128 chars)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for tracking (max 10, each max 64 chars)",
        },
        metadata: {
          type: "object",
          description: "Custom metadata key-value pairs (max 20 pairs)",
        },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/send", { method: "POST", body: JSON.stringify(args) }),
  }),

  defineTool({
    name: "list_emails",
    category: "email",
    description:
      "List emails from a mailbox folder with optional full-text search across subject and body. Use this for reading the unified inbox; use list_campaigns for marketing sends.",
    annotations: {
      title: "List emails",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        folder: {
          type: "string",
          enum: ["inbox", "sent", "drafts", "archive", "spam", "trash", "starred"],
          description: "Folder to list (default: inbox)",
        },
        limit: { type: "number", description: "Number of emails to return (default 20, max 50)" },
        search: { type: "string", description: "Search query across subject and body" },
      },
    },
    handler: async (ctx, args) => {
      const qs = buildQuery({
        folder: (args.folder as string) || "inbox",
        limit: Math.min(Number(args.limit) || 20, 50),
        search: args.search,
      });
      return unwrap(await apiFetch(ctx, `/emails${qs}`));
    },
  }),

  defineTool({
    name: "get_email",
    category: "email",
    description:
      "Read the full content of a single email by ID, including headers, body, and attachments metadata. Side effect: marks the email as read.",
    annotations: {
      title: "Read email",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string", description: "Email ID (UUID)" } },
    },
    handler: async (ctx, args) =>
      unwrap(await apiFetch(ctx, `/emails/${encodeURIComponent(String(args.id))}`)),
  }),

  defineTool({
    name: "reply_to_email",
    category: "email",
    description:
      "Reply to an existing email thread. The sender address and threading headers are derived from the original message, so only the body is required.",
    scopes: ["send", "send:transactional"],
    annotations: {
      title: "Reply to email",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["email_id"],
      properties: {
        email_id: { type: "string", description: "ID of the email to reply to" },
        html: { type: "string", description: "HTML reply body" },
        text: { type: "string", description: "Plain text reply body" },
      },
    },
    handler: async (ctx, args) => {
      const original = unwrap<{
        subject?: string;
        from_email?: string;
        email_accounts?: { email?: string } | { email?: string }[];
      }>(await apiFetch(ctx, `/emails/${encodeURIComponent(String(args.email_id))}`));

      const accountRel = Array.isArray(original.email_accounts)
        ? original.email_accounts[0]
        : original.email_accounts;
      const fromEmail = accountRel?.email;
      if (!fromEmail) {
        throw new Error(
          "Could not resolve a sender account for this thread — the original email is not linked to a verified account.",
        );
      }

      return apiFetch(ctx, "/send", {
        method: "POST",
        body: JSON.stringify({
          from: { email: fromEmail },
          to: [{ email: original.from_email }],
          subject: original.subject?.startsWith("Re:")
            ? original.subject
            : `Re: ${original.subject ?? ""}`,
          html: args.html,
          text: args.text,
          in_reply_to: args.email_id,
        }),
      });
    },
  }),

  defineTool({
    name: "archive_email",
    category: "email",
    description:
      "Move one email out of the inbox and into the archive. " +
      "\n\n" +
      "Use it to clear handled mail from the working inbox. This is REVERSIBLE and " +
      "non-destructive: the message is not deleted, its content is unchanged, and it can be " +
      "found again through the archive. It does not mark the message read, reply to it, or " +
      "notify the sender. " +
      "\n\n" +
      "Safe to repeat — archiving an already-archived email changes nothing. Requires an " +
      "API key. Affects exactly one message per call. ",
    scopes: ["write"],
    annotations: {
      title: "Archive email",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string", description: "Email ID to archive" } },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, `/emails/${encodeURIComponent(String(args.id))}`, {
        method: "PATCH",
        body: JSON.stringify({ folder: "archive" }),
      }),
  }),

  defineTool({
    name: "validate_email",
    category: "email",
    description:
      "Validate an email address before sending: syntax, MX records, disposable-domain and role-account detection. Use this to protect sender reputation on imported lists.",
    annotations: {
      title: "Validate address",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["email"],
      properties: { email: { type: "string", description: "Email address to validate" } },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/validate", { method: "POST", body: JSON.stringify(args) }),
  }),
];
