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
    description:
      "List signup forms on the account with their embed status and conversion counts. " +
      "\n\n" +
      "Use it to find a form id before get_form or get_form_submissions, and to compare how " +
      "forms are performing against each other. It returns the forms themselves, not the " +
      "people who filled them in — that is get_form_submissions. " +
      "\n\n" +
      "Reads only; no form is created, published, or unpublished. Requires an API key. A " +
      "form that exists is not necessarily embedded anywhere, so a zero conversion count " +
      "may mean it was never installed rather than that it converts badly. ",
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
    description:
      "Get one signup form in full: its fields, its embed code, and where it redirects " +
      "after submission. " +
      "\n\n" +
      "Use it when you need the embed snippet to install the form, or need to know which " +
      "fields it collects before interpreting submissions. For the submitted data itself, " +
      "use get_form_submissions; for the list of forms, list_forms. " +
      "\n\n" +
      "Reads only; the form is not modified and no submission is created. Requires an API " +
      "key. The embed code is meant to be pasted into a site, so returning it does not " +
      "publish anything by itself. ",
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
      "List the submissions a signup form has received, including the values entered in " +
      "each field. " +
      "\n\n" +
      "Use it to see who signed up and what they told you. This returns PERSONAL DATA — " +
      "email addresses and whatever else the form collects — so handle it accordingly and " +
      "do not paste it into shared transcripts. For the form's own definition, use " +
      "get_form. " +
      "\n\n" +
      "Reads only; submissions are not deleted, and nobody is subscribed or emailed as a " +
      "result. Requires an API key. No submissions is a normal answer, not an error. ",
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
      "Browse the MisarMail marketplace for ready-made email and automation templates. " +
      "\n\n" +
      "Use it to find a starting point instead of authoring from scratch. This is browse " +
      "only: it installs nothing, and no template is added to the account by listing it. " +
      "Inspect a candidate with get_marketplace_item before adopting it. " +
      "\n\n" +
      "Reads only. Requires an API key. Listings are third-party authored, so quality " +
      "varies. For templates the account already owns, use list_templates instead — these " +
      "two return different things. ",
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
    description:
      "Get one marketplace listing in full, with its preview, author, and installation " +
      "instructions. " +
      "\n\n" +
      "Use it after list_marketplace_items to inspect a template before adopting it — this " +
      "is the read step, and it does NOT install anything into the account or create a " +
      "template. Nothing changes until you act on the instructions it returns. " +
      "\n\n" +
      "Reads only. Requires an API key. Marketplace items are authored by third parties, so " +
      "review the preview before recommending one; the listing describes what the author " +
      "claims, not something MisarMail has verified. ",
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
