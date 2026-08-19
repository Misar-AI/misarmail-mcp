/**
 * The MisarMail tool catalogue.
 *
 * Every tool the server exposes is registered here once and dispatched by name,
 * so both transports advertise and run exactly the same set.
 *
 * @module
 */
import type { McpContext } from "./lib/context.js";
import { takeUsageFooter } from "./lib/usage.js";
import type { ToolDefinition, ToolScope } from "./lib/types.js";

import { emailTools } from "./tools/email.js";
import { campaignTools } from "./tools/campaigns.js";
import { contactTools } from "./tools/contacts.js";
import { templateTools } from "./tools/templates.js";
import { automationTools } from "./tools/automations.js";
import { abTestTools } from "./tools/ab-tests.js";
import { analyticsTools } from "./tools/analytics.js";
import { deliverabilityTools } from "./tools/deliverability.js";
import { domainTools } from "./tools/domains.js";
import { growthTools } from "./tools/growth.js";
import { inboxTools } from "./tools/inbox.js";
import { accountTools } from "./tools/account.js";
import { upgradeTools } from "./tools/upgrade.js";

/**
 * The single source of truth for MisarMail's MCP surface.
 *
 * Both transports — the stdio binary (`@misarmail/mcp`) and the Streamable HTTP
 * route at `api.misar.io/mail/mcp` — build their catalogue from this array.
 * Before consolidation the two shipped disjoint tool sets under different naming
 * conventions (`send_email` vs `email.send`), so a fix in one never reached the
 * other and directories scanned whichever happened to be reachable.
 */
export const ALL_TOOLS: ToolDefinition[] = [
  ...emailTools,
  ...campaignTools,
  ...contactTools,
  ...templateTools,
  ...automationTools,
  ...abTestTools,
  ...analyticsTools,
  ...deliverabilityTools,
  ...domainTools,
  ...growthTools,
  ...inboxTools,
  ...accountTools,
  ...upgradeTools,
];

const BY_NAME = new Map(ALL_TOOLS.map((t) => [t.name, t]));

/**
 * Dotted tool names served by the HTTP endpoint before the snake_case
 * consolidation.
 *
 * Accepted by `dispatch` but deliberately absent from `listTools()`: any client
 * pinned to an old name keeps working, while directories and new clients only
 * ever see one canonical catalogue. Remove after the deprecation window.
 */
export const LEGACY_ALIASES: Record<string, string> = {
  "email.list": "list_emails",
  "email.read": "get_email",
  "email.send": "send_email",
  "email.reply": "reply_to_email",
  "email.archive": "archive_email",
  "campaign.list": "list_campaigns",
  "campaign.get": "get_campaign",
  "campaign.create": "create_campaign",
  "campaign.send": "send_campaign",
  "contact.list": "list_contacts",
  "contact.add": "create_contact",
  "contact.update": "update_contact",
  "contact.score": "get_contact_score",
  "template.create": "create_template",
  "analytics.get": "get_analytics",
  "warmup.get": "get_warmup_status",
  "account.score": "get_deliverability_score",
  "key.list": "list_api_keys",
  "automation.list": "list_automations",
  "automation.create": "create_automation",
  "abtest.create": "create_ab_test",
  "abtest.winner": "select_ab_test_winner",
  "ai.subject_lines": "generate_subject_lines",
  "landing_page.create": "create_landing_page",
  "inbound.configure": "configure_inbound_domain",
  "dmarc.check": "check_dmarc",
  "revenue.attribution": "get_revenue_attribution",
  "monetization.stats": "get_monetization_stats",
  "deliverability.audit": "run_deliverability_audit",
  "report.generate": "generate_report",
};

/** Look up a tool by name, following legacy aliases. */
export function resolveTool(name: string): ToolDefinition | undefined {
  return BY_NAME.get(name) ?? BY_NAME.get(LEGACY_ALIASES[name] ?? "");
}

/** The advertised catalogue, in MCP `tools/list` wire shape. */
export interface ToolSummary {
  /** Tool id to pass to `tools/call`. */
  name: string;
  /** What the tool does, when to use it, and what it changes. */
  description: string;
  /** JSON Schema for the tool's arguments. */
  inputSchema: ToolDefinition["inputSchema"];
  /** Behavioural hints: readOnly, destructive, idempotent, openWorld. */
  annotations?: ToolDefinition["annotations"];
}

/** The advertised catalogue, in MCP `tools/list` wire shape. */
export function listTools(): ToolSummary[] {
  return ALL_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    annotations: t.annotations,
  }));
}

/** Thrown when `tools/call` names a tool that does not exist. */
export class UnknownToolError extends Error {
  constructor(name: string) {
    super(`Unknown tool: ${name}`);
    this.name = "UnknownToolError";
  }
}

/** Thrown when the caller's key lacks a scope the tool requires. */
export class MissingScopeError extends Error {
  constructor(readonly required: ToolScope[]) {
    super(`API key requires one of these scopes for this tool: ${required.join(", ")}`);
    this.name = "MissingScopeError";
  }
}

/**
 * Decides whether the caller may run a tool requiring any of `required`.
 *
 * A predicate rather than a scope array on purpose: MisarMail's own
 * `hasAnyScope` implements a full-access wildcard that also excludes a set of
 * privileged scopes, and re-deriving that here would silently diverge from the
 * REST API's authorisation. The host passes its real checker instead.
 */
export type ScopeChecker = (required: ToolScope[]) => boolean;

/**
 * Run a tool by name.
 *
 * `checkScopes` is the host's authorisation predicate; pass `null` to skip the
 * check — the stdio transport cannot see key scopes, and the API enforces them
 * server-side on every call anyway.
 */
export async function dispatch(
  name: string,
  args: Record<string, unknown>,
  ctx: McpContext,
  checkScopes: ScopeChecker | null = null,
): Promise<unknown> {
  const tool = resolveTool(name);
  if (!tool) throw new UnknownToolError(name);

  if (checkScopes && tool.scopes?.length && !checkScopes(tool.scopes)) {
    throw new MissingScopeError(tool.scopes);
  }

  const result = await tool.handler(ctx, args);

  // Pre-emptive usage warning, appended centrally so every tool benefits
  // without each one having to remember. Only fires once the caller crosses 80%
  // of a metered allowance; below that `takeUsageFooter()` returns null and the
  // result is passed through untouched.
  //
  // `upgrade` is exempt: it already renders the full quota table, so a footer
  // would just repeat what the user is looking at.
  if (tool.name !== "upgrade") {
    const footer = takeUsageFooter();
    if (footer) {
      if (typeof result === "string") return `${result}${footer}`;
      // Structured results keep their shape; the warning rides alongside so
      // clients that render JSON still surface it.
      if (result && typeof result === "object" && !Array.isArray(result)) {
        return { ...(result as Record<string, unknown>), usage_notice: footer.trim() };
      }
    }
  }

  return result;
}

export { type ToolDefinition, type ToolScope } from "./lib/types.js";
