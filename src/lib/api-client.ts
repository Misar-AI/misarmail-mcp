import type { McpContext } from "./context.js";
import { apiError } from "./errors.js";
import { noteUsage } from "./usage.js";

/** Serialise a params object into a query string, dropping undefined values. */
export function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

async function request<T>(
  ctx: McpContext,
  base: string,
  path: string,
  options: RequestInit,
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ctx.apiKey}`,
      "X-MCP-Source": ctx.source,
      ...options.headers,
    },
  });
  // Record remaining allowance before anything can throw, so a tool can append
  // the 80% warning to its successful output.
  noteUsage(res.headers);

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw apiError(res.status, body);
  return body as T;
}

/** Call a versioned route under `<baseUrl>` (i.e. `…/mail/v1/<path>`). */
export function apiFetch<T>(
  ctx: McpContext,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return request<T>(ctx, ctx.baseUrl, path, options);
}

/**
 * Call a route that lives OUTSIDE the versioned `/v1` namespace.
 *
 * Several MisarMail API groups (automations, domains, forms, marketplace,
 * integrations, inbox) are served at `api.misar.io/mail/<group>` — NOT under
 * `/mail/v1/<group>`. Stripping the trailing `/v1` is what makes those resolve.
 */
export function apiFetchRoot<T>(
  ctx: McpContext,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return request<T>(ctx, ctx.baseUrl.replace(/\/v1$/, ""), path, options);
}

/**
 * Unwrap the `{ success, data }` envelope used by MisarMail's internal routes.
 *
 * Tools should return the payload, not the envelope — an agent reading
 * `{"success":true,"data":{…}}` wastes a turn drilling into `.data`.
 */
export function unwrap<T>(body: unknown): T {
  if (typeof body === "object" && body !== null && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}
