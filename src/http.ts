import {
  dispatch,
  listTools,
  MissingScopeError,
  UnknownToolError,
  type ScopeChecker,
} from "./registry.js";
import { listPrompts, getPrompt } from "./prompts.js";
import { listResources, readResource } from "./resources.js";
import { httpContext } from "./lib/context.js";
import { formatError } from "./lib/errors.js";
import { SERVER_PROTOCOL_VERSION } from "./protocol.js";

/**
 * Transport-agnostic Streamable HTTP (JSON-RPC 2.0) handler for MisarMail MCP.
 *
 * Auth, rate limiting, and plan gating are injected rather than implemented
 * here: those depend on the MisarMail database and belong in the product repo.
 * What lives here is exactly the protocol behaviour that must stay identical to
 * the stdio server — the catalogue, the prompts, and the dispatch semantics.
 *
 * Deliberately built on Web `Request`/`Response` (not Next types) so the package
 * carries no framework dependency.
 */

export interface AuthenticatedCaller {
  userId: string;
  /**
   * The host's own scope predicate for the presented key.
   *
   * Passing a predicate rather than a scope list keeps MCP authorisation
   * byte-identical to the REST API's, wildcards and privileged-scope exclusions
   * included. Omit to skip per-tool scope checks entirely.
   */
  hasAnyScope?: ScopeChecker;
}

export interface HttpHandlerOptions {
  /** Resolve an Authorization header to a caller, or null when invalid. */
  authenticate: (authHeader: string | null) => Promise<AuthenticatedCaller | null>;
  /** Optional plan gate. Return a message to reject, or null to allow. */
  checkPlan?: (caller: AuthenticatedCaller) => Promise<string | null>;
  /** API base the tools call, e.g. `https://mail.misar.io/api/v1` for in-process calls. */
  baseUrl: string;
  serverName?: string;
  serverVersion?: string;
  /** Called with unexpected errors so the host can log them. */
  onError?: (toolName: string, error: unknown) => void;
}

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

type Id = string | number | null;

const JSON_HEADERS = { "Content-Type": "application/json" };

function ok(id: Id, result: unknown, headers: Record<string, string>) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    headers: { ...JSON_HEADERS, ...headers },
  });
}

function fail(id: Id, code: number, message: string, init: ResponseInit = {}) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status: init.status ?? 200,
    headers: { ...JSON_HEADERS, ...(init.headers as Record<string, string>) },
  });
}

function toolResult(data: unknown, isError = false) {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
    isError,
  };
}

export function createHttpHandler(options: HttpHandlerOptions) {
  const {
    authenticate,
    checkPlan,
    baseUrl,
    serverName = "misarmail",
    serverVersion = "3.0.0",
    onError,
  } = options;

  return async function handle(request: Request): Promise<Response> {
    let body: JsonRpcRequest;
    try {
      body = (await request.json()) as JsonRpcRequest;
    } catch {
      return fail(null, -32700, "Parse error: invalid JSON");
    }

    const id: Id = body.id ?? null;
    const method = body.method;
    const headers = {
      "Mcp-Session-Id": request.headers.get("Mcp-Session-Id") ?? crypto.randomUUID(),
    };

    // ── Unauthenticated discovery ────────────────────────────────────────────
    // Registries and directories scan with no credentials. Gating discovery is
    // precisely what froze the published tool list at a stale snapshot, so
    // initialize/tools/prompts/resources listing must always answer.
    switch (method) {
      case "initialize":
        return ok(
          id,
          {
            protocolVersion: SERVER_PROTOCOL_VERSION,
            capabilities: { tools: {}, prompts: {}, resources: {} },
            serverInfo: { name: serverName, version: serverVersion },
          },
          headers,
        );
      case "notifications/initialized":
        return new Response(null, { status: 202, headers });
      case "ping":
        return ok(id, {}, headers);
      case "tools/list":
        return ok(id, { tools: listTools() }, headers);
      case "prompts/list":
        return ok(id, { prompts: listPrompts() }, headers);
      case "prompts/get": {
        const p = (body.params ?? {}) as { name?: string; arguments?: Record<string, string> };
        const prompt = getPrompt(p.name ?? "", p.arguments ?? {});
        if (!prompt) return fail(id, -32602, `Prompt not found: ${p.name}`);
        return ok(id, prompt, headers);
      }
      case "resources/list":
        return ok(id, { resources: listResources() }, headers);
    }

    // ── Everything below requires a valid key ────────────────────────────────
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("apiKey");
    const authHeader = queryKey ? `Bearer ${queryKey}` : request.headers.get("authorization");
    const caller = await authenticate(authHeader);

    if (!caller) {
      // RFC 9728: WWW-Authenticate lets OAuth-capable clients discover how to
      // authenticate instead of treating this as a hard failure.
      return fail(null, -32001, "Unauthorized: provide Authorization: Bearer msk_<key>", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Bearer realm="MisarMail"',
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "WWW-Authenticate",
        },
      });
    }

    if (checkPlan) {
      const rejection = await checkPlan(caller);
      if (rejection) return fail(id, -32003, rejection);
    }

    const ctx = httpContext(queryKey ?? (authHeader ?? "").replace(/^Bearer\s+/i, ""), baseUrl);

    switch (method) {
      case "resources/read": {
        const p = (body.params ?? {}) as { uri?: string };
        try {
          const result = await readResource(p.uri ?? "", ctx);
          if (!result) return fail(id, -32602, `Resource not found: ${p.uri}`);
          return ok(id, result, headers);
        } catch (err) {
          return fail(id, -32603, `Failed to read resource: ${formatError(err)}`);
        }
      }

      case "tools/call": {
        const p = (body.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
        if (!p.name) return fail(id, -32602, "Invalid params: missing tool name");

        try {
          const data = await dispatch(p.name, p.arguments ?? {}, ctx, caller.hasAnyScope ?? null);
          return ok(id, toolResult(data), headers);
        } catch (err) {
          if (err instanceof UnknownToolError) return fail(id, -32602, err.message);
          if (err instanceof MissingScopeError) return fail(id, -32002, err.message);
          onError?.(p.name, err);
          // A failing API call is a tool-level error, not a protocol error: the
          // agent should see the message and adapt rather than lose the session.
          return ok(id, toolResult(`Error: ${formatError(err)}`, true), headers);
        }
      }

      default:
        return fail(id, -32601, `Method not found: ${method}`);
    }
  };
}

/** CORS preflight response for browser-based MCP clients. */
export function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
      "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
    },
  });
}
