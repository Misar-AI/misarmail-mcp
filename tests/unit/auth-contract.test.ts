/**
 * The authentication contract every Misar MCP server must satisfy.
 *
 * Three rules, and all three have been violated in production before:
 *
 *  1. Discovery NEVER requires credentials. The old server called
 *     process.exit(1) on a missing key, so registry scanners saw a dead
 *     process instead of the catalogue — which is why the Smithery listing sat
 *     frozen at a stale 16-tool snapshot for months.
 *  2. Execution ALWAYS requires credentials. tools/call must refuse without a
 *     valid key, with the RFC 9728 challenge attached.
 *  3. The refusal must be ACTIONABLE. An MCP client relays this text straight
 *     to the model and on to the user, so it is the whole authentication UX.
 *     "Not configured" (the blog server's old message) is a dead end.
 *
 * Keep this file in sync with the same suite in blog-mcp-server, and copy it
 * into every new product server — see docs/Guidelines/MCP_SERVER_PROTOCOL.md.
 */
import { describe, it, expect } from "vitest";
import { createHttpHandler } from "../../src/http.js";
import { listTools } from "../../src/registry.js";
import { authGuidance, AUTH_URLS, ENV_KEY, KEY_PREFIX, CONFIG_PATH } from "../../src/lib/auth-guidance.js";

const VALID = "Bearer msk_good";

const handler = createHttpHandler({
  baseUrl: "https://example.invalid/v1",
  authenticate: async (h) => (h === VALID ? { userId: "u1", scopes: ["read", "write"] } : null),
});

function post(body: unknown, headers: Record<string, string> = {}) {
  return handler(
    new Request("https://api.misar.io/mail/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

const INIT = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } },
};

describe("rule 1 — discovery never requires credentials", () => {
  it.each(["initialize", "tools/list", "prompts/list", "resources/list"])(
    "%s answers unauthenticated",
    async (method) => {
      const res = await post({ jsonrpc: "2.0", id: 1, method, params: method === "initialize" ? INIT.params : {} });
      expect(res.status).toBe(200);
    },
  );

  it("advertises the full catalogue to an unauthenticated scanner", async () => {
    const res = await post({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    const body = await res.json();
    // A scanner that sees fewer tools than the registry holds is the stale
    // listing failure all over again.
    expect(body.result.tools).toHaveLength(listTools().length);
  });
});

describe("rule 2 — execution always requires credentials", () => {
  it("refuses tools/call without a key", async () => {
    const res = await post({
      jsonrpc: "2.0", id: 2, method: "tools/call",
      params: { name: "list_campaigns", arguments: {} },
    });
    expect(res.status).toBe(401);
  });

  it("attaches the RFC 9728 challenge so OAuth clients can recover", async () => {
    const res = await post({
      jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_campaigns", arguments: {} },
    });
    expect(res.headers.get("WWW-Authenticate")).toContain("Bearer");
  });

  it("accepts tools/call with a valid key", async () => {
    const res = await post(
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_campaigns", arguments: {} } },
      { authorization: VALID },
    );
    expect(res.status).toBe(200);
  });

  it("refuses resources/read without a key", async () => {
    const res = await post({
      jsonrpc: "2.0", id: 3, method: "resources/read",
      params: { uri: "misarmail://account/domains" },
    });
    expect(res.status).toBe(401);
  });
});

describe("rule 3 — the refusal is actionable", () => {
  it("tells the user every way to authenticate", async () => {
    const res = await post({
      jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_campaigns", arguments: {} },
    });
    const message = (await res.json()).error.message as string;

    // Browser path.
    expect(message).toContain(AUTH_URLS.authorize);
    expect(message).toContain("login");
    // Manual path — a real dashboard URL, not "generate a key somewhere".
    expect(message).toContain(AUTH_URLS.apiKeys);
    expect(message).toContain(KEY_PREFIX);
    // Where the key actually goes, for local AND cloud setups.
    expect(message).toContain(ENV_KEY);
    expect(message).toContain(CONFIG_PATH);
    expect(message).toContain("env");
    // Somewhere to read more.
    expect(message).toContain(AUTH_URLS.docs);
  });

  it("distinguishes a missing key from a rejected one", () => {
    // Telling someone whose key was revoked to create their first key wastes
    // their time and hides the real problem.
    expect(authGuidance("missing")).toContain("Not authenticated");
    expect(authGuidance("rejected")).toContain("rejected");
    expect(authGuidance("rejected")).toContain(AUTH_URLS.apiKeys);
  });

  it("never leaks a credential into the guidance", () => {
    for (const reason of ["missing", "rejected"] as const) {
      const text = authGuidance(reason);
      // Placeholders only — a real key must never be echoed back.
      expect(text).not.toMatch(/msk_[A-Za-z0-9]{12,}/);
    }
  });
});
