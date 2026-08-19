import { apiFetch, apiFetchRoot, buildQuery, unwrap } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";

/** Sending-domain registration and DNS verification. */
export const domainTools: ToolDefinition[] = [
  defineTool({
    name: "list_domains",
    category: "domains",
    description:
      "List sending domains with verification status and their DKIM/SPF/DMARC records. Check here first when a send fails with an unverified-sender error.",
    annotations: {
      title: "List domains",
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
        await apiFetchRoot(ctx, `/domains${buildQuery({ page: args.page, limit: args.limit })}`),
      ),
  }),

  defineTool({
    name: "add_domain",
    category: "domains",
    description:
      "Add a sending domain and return the DNS records to publish. The domain cannot send until those records are live and verify_domain succeeds.",
    scopes: ["write"],
    annotations: {
      title: "Add domain",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["domain"],
      properties: { domain: { type: "string", description: "Domain to add, e.g. example.com" } },
    },
    handler: (ctx, args) =>
      apiFetchRoot(ctx, "/domains", {
        method: "POST",
        body: JSON.stringify({ domain: args.domain }),
      }),
  }),

  defineTool({
    name: "verify_domain",
    category: "domains",
    description:
      "Re-check a domain's DNS records and mark it verified if they resolve. Safe to retry — DNS propagation can take up to 48 hours.",
    scopes: ["write"],
    annotations: {
      title: "Verify domain",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      required: ["domain_id"],
      properties: { domain_id: { type: "string", description: "Domain ID returned by add_domain" } },
    },
    handler: (ctx, args) =>
      apiFetchRoot(ctx, `/domains/${encodeURIComponent(String(args.domain_id))}/verify`, {
        method: "POST",
      }),
  }),

  defineTool({
    name: "configure_inbound_domain",
    category: "domains",
    description:
      "Configure inbound email routing for a subdomain so replies land in the MisarMail unified inbox. Returns the MX record to publish.",
    scopes: ["write"],
    annotations: {
      title: "Configure inbound",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: "object",
      required: ["domain", "subdomain"],
      properties: {
        domain: { type: "string", description: "Root domain, e.g. example.com" },
        subdomain: { type: "string", description: "Inbound subdomain label, e.g. reply" },
        webhook_url: {
          type: "string",
          description: "Optional HTTPS URL to POST inbound messages to",
        },
      },
    },
    handler: async (ctx, args) => {
      const result = await apiFetch(ctx, "/inbound", {
        method: "POST",
        body: JSON.stringify(args),
      });
      return {
        ...(result as Record<string, unknown>),
        mx_record: `${String(args.subdomain)}.${String(args.domain)}`,
      };
    },
  }),
];
