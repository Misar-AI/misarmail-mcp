import { apiFetch, apiFetchRoot, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

/**
 * Audience-growth surfaces: signup forms, landing pages, and the template
 * marketplace. Grouped together because they all feed the contact list rather
 * than the send pipeline.
 */
export const growthTools: ToolDefinition[] = [
  defineTool({
    name: "list_forms",
    category: "forms",
    description: "List signup forms with their embed status and conversion counts.",
    annotations: {
      title: "List forms",
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
          enum: ["active", "inactive"],
          description: "Filter by form status",
        },
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 20)" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetchRoot(
          ctx,
          `/forms${buildQuery({ page: args.page, limit: args.limit, status: args.status })}`,
        ),
      ),
  }),

  defineTool({
    name: "get_form",
    category: "forms",
    description: "Get one signup form including its fields, embed code, and redirect behaviour.",
    annotations: {
      title: "Get form",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["form_id"],
      properties: { form_id: { type: "string", description: "Form ID (UUID)" } },
    },
    handler: async (ctx, args) =>
      unwrap(await apiFetchRoot(ctx, `/forms/${encodeURIComponent(String(args.form_id))}`)),
  }),

  defineTool({
    name: "get_form_submissions",
    category: "forms",
    description:
      "List submissions for a signup form, including the submitted field values and timestamps.",
    annotations: {
      title: "Form submissions",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["form_id"],
      properties: {
        form_id: { type: "string", description: "Form ID (UUID)" },
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 20)" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetchRoot(
          ctx,
          `/forms/${encodeURIComponent(String(args.form_id))}/submissions${buildQuery({
            page: args.page,
            limit: args.limit,
          })}`,
        ),
      ),
  }),

  defineTool({
    name: "create_landing_page",
    category: "forms",
    description:
      "Create a hosted landing page with an email capture form. Returns the public URL; subscribers flow straight into your contact list.",
    scopes: ["write"],
    annotations: {
      title: "Create landing page",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["name", "headline"],
      properties: {
        name: { type: "string", description: "Internal page name" },
        headline: { type: "string", description: "Headline shown to visitors" },
        subheadline: { type: "string", description: "Supporting line under the headline" },
        cta_text: { type: "string", description: "Call-to-action button text" },
        slug: { type: "string", description: "URL slug (auto-generated when omitted)" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags applied to contacts who sign up here",
        },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/landing-pages", { method: "POST", body: JSON.stringify(args) }),
  }),

  defineTool({
    name: "list_marketplace_items",
    category: "marketplace",
    description:
      "Browse the MisarMail template marketplace for ready-made email and automation templates.",
    annotations: {
      title: "Browse marketplace",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category, e.g. newsletter, ecommerce" },
        search: { type: "string", description: "Search marketplace listings" },
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 20)" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetchRoot(
          ctx,
          `/marketplace${buildQuery({
            category: args.category,
            search: args.search,
            page: args.page,
            limit: args.limit,
          })}`,
        ),
      ),
  }),

  defineTool({
    name: "get_marketplace_item",
    category: "marketplace",
    description: "Get one marketplace listing with its full preview, author, and install count.",
    annotations: {
      title: "Get marketplace item",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["item_id"],
      properties: { item_id: { type: "string", description: "Marketplace item ID" } },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetchRoot(ctx, `/marketplace/${encodeURIComponent(String(args.item_id))}`),
      ),
  }),
];
