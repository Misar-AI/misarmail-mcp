import { apiFetch, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

/** Contacts, lists and segments. */
export const contactTools: ToolDefinition[] = [
  defineTool({
    name: "list_contacts",
    category: "contacts",
    description:
      "List contacts with their subscription status and engagement metrics. Filter by status to find unsubscribed or bounced addresses that should be excluded from sends.",
    annotations: {
      title: "List contacts",
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
          enum: ["subscribed", "unsubscribed", "bounced", "complained"],
          description: "Filter by subscription status",
        },
        search: { type: "string", description: "Search across email, name, and company" },
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 20, max 100)" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetch(
          ctx,
          `/contacts${buildQuery({
            page: args.page,
            limit: args.limit,
            status: args.status,
            search: args.search,
          })}`,
        ),
      ),
  }),

  defineTool({
    name: "create_contact",
    category: "contacts",
    description:
      "Add a single contact. Adding a contact records consent to email them — only add addresses that opted in, or the send will damage sender reputation and may breach CAN-SPAM/GDPR.",
    scopes: ["contacts", "write"],
    annotations: {
      title: "Create contact",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", description: "Contact email address" },
        first_name: { type: "string", description: "First name (max 100 chars)" },
        last_name: { type: "string", description: "Last name (max 100 chars)" },
        phone: { type: "string", description: "Phone number (max 50 chars)" },
        company: { type: "string", description: "Company name (max 150 chars)" },
        job_title: { type: "string", description: "Job title (max 100 chars)" },
        tags: { type: "array", items: { type: "string" }, description: "Segmentation tags" },
        source: { type: "string", description: "Where this contact came from (max 100 chars)" },
        custom_fields: { type: "object", description: "Custom key-value attributes" },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/contacts", { method: "POST", body: JSON.stringify(args) }),
  }),

  defineTool({
    name: "update_contact",
    category: "contacts",
    description:
      "Update an existing contact by email address, including changing subscription status. Setting status to unsubscribed immediately excludes them from every future campaign.",
    scopes: ["contacts", "write"],
    annotations: {
      title: "Update contact",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", description: "Email address identifying the contact" },
        first_name: { type: "string", description: "First name" },
        last_name: { type: "string", description: "Last name" },
        phone: { type: "string", description: "Phone number" },
        company: { type: "string", description: "Company name" },
        job_title: { type: "string", description: "Job title" },
        status: {
          type: "string",
          enum: ["subscribed", "unsubscribed", "bounced", "complained"],
          description: "New subscription status",
        },
        tags: { type: "array", items: { type: "string" }, description: "Replace segmentation tags" },
        custom_fields: { type: "object", description: "Custom key-value attributes to merge" },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/contacts", {
        method: "PATCH",
        body: JSON.stringify({ ...args, email: String(args.email).toLowerCase() }),
      }),
  }),

  defineTool({
    name: "import_contacts",
    category: "contacts",
    description:
      "Bulk-import up to 5,000 contacts in one call. Existing addresses are updated rather than duplicated. Returns per-row results so you can see which rows were rejected and why.",
    scopes: ["contacts", "write"],
    annotations: {
      title: "Import contacts",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["contacts"],
      properties: {
        contacts: {
          type: "array",
          description: "Contacts to import (max 5000)",
          items: {
            type: "object",
            required: ["email"],
            properties: {
              email: { type: "string" },
              first_name: { type: "string" },
              last_name: { type: "string" },
              company: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
            },
          },
        },
        update_existing: {
          type: "boolean",
          description: "Update contacts that already exist (default true)",
        },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/contacts/import", { method: "POST", body: JSON.stringify(args) }),
  }),

  defineTool({
    name: "get_contact_score",
    category: "contacts",
    description:
      "Get engagement score, engagement tier, and churn risk for one contact — or the lowest-engagement contacts across the list when contact_id is omitted. Use before a re-engagement campaign.",
    annotations: {
      title: "Contact engagement score",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        contact_id: {
          type: "string",
          description: "Contact ID to score (omit to return the lowest-engagement contacts)",
        },
      },
    },
    handler: async (ctx, args) => {
      const qs = buildQuery(
        args.contact_id ? { id: args.contact_id, limit: 1 } : { limit: 25, sort: "engagement_asc" },
      );
      return unwrap(await apiFetch(ctx, `/contacts${qs}`));
    },
  }),
];
