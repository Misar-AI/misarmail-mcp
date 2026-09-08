import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { execFileSync } from "node:child_process";
import { saveConfig, tryGetApiKey, getBaseUrl } from "../lib/auth.js";
import { apiFetch } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";
import { authGuidance } from "../lib/auth-guidance.js";

/**
 * Browser-based authentication for the stdio transport.
 *
 * These tools are deliberately NOT part of the shared registry: they bind a
 * loopback HTTP listener and open a browser on the user's machine, which is
 * meaningless (and would be a vulnerability) on the hosted HTTP endpoint where
 * the caller already presents a key. `index.ts` merges them into the stdio
 * catalogue only.
 */

const APP_URL = (process.env.MISARMAIL_APP_URL ?? "https://mail.misar.io").replace(/\/$/, "");
const PORT_MIN = 9101;
const PORT_MAX = 9199;
const LOGIN_TIMEOUT_MS = 120_000;

/** Open a URL in the system browser. execFileSync with separate args — no shell, no injection. */
function openBrowser(url: string): void {
  try {
    if (process.platform === "darwin") execFileSync("open", [url], { stdio: "ignore" });
    else if (process.platform === "win32")
      execFileSync("cmd.exe", ["/c", "start", "", url], { stdio: "ignore" });
    else execFileSync("xdg-open", [url], { stdio: "ignore" });
  } catch {
    process.stderr.write(`Open this URL in your browser:\n  ${url}\n`);
  }
}

/** Best-effort name for the host application, shown on the consent screen. */
function detectClientName(): string {
  const explicit = process.env.MISARMAIL_CLIENT_NAME?.trim();
  if (explicit) return explicit.slice(0, 60);
  if (process.env.CLAUDECODE || process.env.CLAUDE_CODE) return "Claude Code";
  if (process.env.CURSOR_TRACE_ID || process.env.CURSOR_SESSION_ID) return "Cursor";
  if (process.env.TERM_PROGRAM === "vscode") return "VS Code";
  if (process.env.WINDSURF_SESSION_ID) return "Windsurf";
  return "MCP Client";
}

function randomPort(): number {
  return PORT_MIN + Math.floor(Math.random() * (PORT_MAX - PORT_MIN + 1));
}

/**
 * Bind the loopback listener, retrying on a different port when the chosen one
 * is taken — otherwise a second editor holding a listener makes `login` fail
 * with an unexplained EADDRINUSE.
 */
function listenOnFreePort(
  srv: Server,
  preferred: number | undefined,
  attemptsLeft: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const port =
      preferred && preferred >= PORT_MIN && preferred <= PORT_MAX ? preferred : randomPort();

    const onError = (err: NodeJS.ErrnoException) => {
      srv.removeListener("error", onError);
      if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
        listenOnFreePort(srv, undefined, attemptsLeft - 1).then(resolve, reject);
        return;
      }
      reject(err);
    };

    srv.once("error", onError);
    srv.listen(port, "127.0.0.1", () => {
      srv.removeListener("error", onError);
      resolve(port);
    });
  });
}

async function runLogin(args: Record<string, unknown>): Promise<string> {
  const preferredPort = typeof args.port === "number" ? args.port : undefined;
  const appUrl = (typeof args.app_url === "string" ? args.app_url : APP_URL).replace(/\/$/, "");
  const force = args.force === true;

  const existing = tryGetApiKey();
  if (!force && existing) {
    try {
      await apiFetch({ apiKey: existing, baseUrl: getBaseUrl(), source: "mcp_stdio" }, "/keys");
      return "Already authenticated. Call `login` with force=true to connect a different account or issue a new key.";
    } catch {
      // Stored key rejected — fall through and re-authenticate.
    }
  }

  const clientName = detectClientName();

  return new Promise<string>((resolve) => {
    let resolved = false;
    let timer: NodeJS.Timeout | undefined;

    const finish = (text: string) => {
      if (resolved) return;
      resolved = true;
      if (timer) clearTimeout(timer);
      srv.close();
      resolve(text);
    };

    const srv = createServer((req: IncomingMessage, res: ServerResponse) => {
      // Only accept callbacks from loopback — this listener holds a live
      // credential handoff, so anything off-host is rejected outright.
      const remote = req.socket.remoteAddress ?? "";
      if (remote !== "127.0.0.1" && remote !== "::1" && remote !== "::ffff:127.0.0.1") {
        res.writeHead(403).end();
        return;
      }
      if (req.method !== "POST" || req.url !== "/token") {
        res.writeHead(404).end();
        return;
      }

      let body = "";
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const data = JSON.parse(body) as { api_key?: string; base_url?: string };
          const key = (data.api_key ?? "").trim();

          if (!key.startsWith("msk_")) {
            res
              .writeHead(400, { "Content-Type": "application/json" })
              .end(JSON.stringify({ error: "invalid key" }));
            return;
          }

          res
            .writeHead(200, { "Content-Type": "application/json" })
            .end(JSON.stringify({ ok: true }));
          saveConfig({ api_key: key, ...(data.base_url ? { base_url: data.base_url } : {}) });

          finish(
            "Connected to MisarMail. API key saved to ~/.misarmail/config.json.\n\n" +
              "All MisarMail tools are now available without setting MISARMAIL_API_KEY.",
          );
        } catch {
          res.writeHead(400).end();
        }
      });
    });

    listenOnFreePort(srv, preferredPort, 8).then(
      (boundPort) => {
        const params = new URLSearchParams({
          mode: "key",
          mcp_port: String(boundPort),
          client: clientName,
          scope: "read write send contacts analytics sandbox validate",
        });
        const authorizeUrl = `${appUrl}/authorize?${params.toString()}`;

        openBrowser(authorizeUrl);
        process.stderr.write(
          `Waiting for authorization at ${authorizeUrl}\n(listening on 127.0.0.1:${boundPort})\n`,
        );

        timer = setTimeout(() => {
          finish(
            `Login timed out after ${LOGIN_TIMEOUT_MS / 1000} seconds. Open this URL manually and click 'Authorize':\n\n${authorizeUrl}`,
          );
        }, LOGIN_TIMEOUT_MS);
      },
      (err: Error) => {
        finish(
          `Could not start the local callback listener: ${err.message}\n\n` +
            `Ports ${PORT_MIN}–${PORT_MAX} all appear to be in use. Pass an explicit free port, e.g. login with port ${PORT_MIN + 41}.`,
        );
      },
    );
  });
}

export const authTools: ToolDefinition[] = [
  defineTool({
    name: "login",
    category: "account",
    description:
      "Authenticate with your MisarMail account via browser — no API key copy-paste needed. Opens the MisarMail authorization page where you review the requested permissions and click 'Authorize'. The API key is delivered straight back to this client and saved to ~/.misarmail/config.json.",
    annotations: {
      title: "Log in via browser",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        port: {
          type: "number",
          description: `Local callback port (${PORT_MIN}–${PORT_MAX}). Random by default.`,
        },
        app_url: {
          type: "string",
          description:
            "MisarMail base URL for self-hosted instances (default https://mail.misar.io).",
        },
        force: {
          type: "boolean",
          description: "Force re-authentication even if an API key is already configured.",
        },
      },
    },
    handler: (_ctx, args) => runLogin(args),
  }),

  defineTool({
    name: "logout",
    category: "account",
    description:
      "Forget the locally stored MisarMail API key (~/.misarmail/config.json). Does not revoke the key server-side — delete it from mail.misar.io/developers to do that.",
    annotations: {
      title: "Log out",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      saveConfig({ api_key: undefined });
      return "Signed out. The stored MisarMail API key has been cleared from ~/.misarmail/config.json.";
    },
  }),

  defineTool({
    name: "auth_status",
    category: "account",
    description:
      "Check whether this client is authenticated, which MisarMail account the stored key belongs to, and which API base URL it targets. Run this first when a tool reports an auth error.",
    annotations: {
      title: "Auth status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const key = tryGetApiKey();
      const baseUrl = getBaseUrl();
      if (!key) {
        return {
          authenticated: false,
          base_url: baseUrl,
          next_step: authGuidance("missing"),
        };
      }
      try {
        // Probes /keys rather than /account: MisarMail exposes no account or
        // "me" endpoint under /v1, so the previous probe 404'd and reported a
        // perfectly valid key as rejected. /keys requires a valid key and
        // returns only metadata, never a secret.
        const keys = await apiFetch<unknown>(
          { apiKey: key, baseUrl, source: "mcp_stdio" },
          "/keys",
        );
        const count = Array.isArray(keys)
          ? keys.length
          : Array.isArray((keys as { data?: unknown[] })?.data)
            ? (keys as { data: unknown[] }).data.length
            : undefined;
        return { authenticated: true, base_url: baseUrl, api_keys_on_account: count };
      } catch (err) {
        return {
          authenticated: false,
          base_url: baseUrl,
          error: err instanceof Error ? err.message : String(err),
          next_step: authGuidance("rejected"),
        };
      }
    },
  }),
];
