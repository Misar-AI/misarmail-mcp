/**
 * Execution context for a MisarMail MCP tool call.
 *
 * The same tool implementations run under two transports:
 *   - stdio  (npm `@misarmail/mcp`) — credentials come from the environment or
 *            ~/.misarmail/config.json, resolved once at process start.
 *   - http   (`api.misar.io/mail/mcp`) — credentials arrive per request on the
 *            Authorization header and MUST NOT be cached in module state.
 *
 * Passing the context explicitly (rather than reading process.env inside
 * apiFetch) is what makes a single tool registry safe to share between them:
 * a Next.js route serves many users from one process, so any module-level
 * credential would leak across requests.
 */
export interface McpContext {
  /** Raw MisarMail API key (`msk_…`), without the `Bearer ` prefix. */
  apiKey: string;
  /** Versioned API base, e.g. `https://api.misar.io/mail/v1`. */
  baseUrl: string;
  /** Reported to the API as `X-MCP-Source` for per-transport analytics. */
  source: "mcp_stdio" | "mcp_http";
}

export const DEFAULT_BASE_URL = "https://api.misar.io/mail/v1";

/** Build a context for an HTTP request that has already been authenticated. */
export function httpContext(apiKey: string, baseUrl?: string): McpContext {
  return {
    apiKey,
    baseUrl: (baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
    source: "mcp_http",
  };
}
