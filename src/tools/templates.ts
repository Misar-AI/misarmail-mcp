import { apiFetch, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

export const templateTools: ToolDefinition[] = [
  defineTool({
    name: "list_templates",
    category: "templates",
    description:
      "List saved email templates with their variable placeholders, so you can pick one for a campaign or transactional send.",
    annotations: {
      title: "List templates",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["transactional", "marketing", "automation"],
          description: "Filter by template type",
        },
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 20)" },
      },
    },
    handler: async (ctx, args) =>
      unwrap(
        await apiFetch(
          ctx,
          `/templates${buildQuery({ page: args.page, limit: args.limit, type: args.type })}`,
        ),
      ),
  }),

  defineTool({
    name: "create_template",
    category: "templates",
    description:
      "Create a reusable email template. Use {{variable}} placeholders for personalisation — they are substituted at send time and previewable via render_template.",
    scopes: ["write"],
    annotations: {
      title: "Create template",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["name", "subject", "html"],
      properties: {
        name: { type: "string", description: "Template name" },
        subject: { type: "string", description: "Default subject line (supports {{variables}})" },
        html: { type: "string", description: "HTML body (supports {{variables}})" },
        text: { type: "string", description: "Plain text fallback body" },
        type: {
          type: "string",
          enum: ["transactional", "marketing", "automation"],
          description: "Template type (default: marketing)",
        },
        variables: {
          type: "array",
          items: { type: "string" },
          description: "Declared variable names used in the template",
        },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/templates", { method: "POST", body: JSON.stringify(args) }),
  }),

  defineTool({
    name: "render_template",
    category: "templates",
    description:
      "Render a template with sample variables and return the resulting HTML and subject. Use this to preview personalisation before sending anything.",
    annotations: {
      title: "Render template",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["template_id"],
      properties: {
        template_id: { type: "string", description: "Template ID to render" },
        variables: {
          type: "object",
          description: "Variable values to substitute, e.g. { \"first_name\": \"Ada\" }",
        },
      },
    },
    handler: (ctx, args) =>
      apiFetch(ctx, "/templates/render", {
        method: "POST",
        body: JSON.stringify({ template_id: args.template_id, variables: args.variables ?? {} }),
      }),
  }),
];
