import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DEFAULT_BASE_URL, type McpContext } from "./context.js";

/**
 * stdio-transport credential storage.
 *
 * HTTP transport never touches this file — see `httpContext()`. Keeping the
 * filesystem read confined to this module is what lets the package be imported
 * into a Next.js route without pulling `node:fs` behaviour into the request path.
 */

const CONFIG_DIR = join(homedir(), ".misarmail");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

interface MisarConfig {
  api_key?: string;
  base_url?: string;
}

function loadConfig(): MisarConfig {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as MisarConfig;
  } catch {
    return {};
  }
}

/**
 * Merge-write the config.
 *
 * Merging (rather than replacing) matters: `login` writes only api_key, and a
 * plain overwrite silently discarded a previously configured base_url, pointing
 * self-hosted installs back at the public API. Pass `undefined` for a field to
 * drop it — that is how `logout` clears the key.
 */
export function saveConfig(config: MisarConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const merged: MisarConfig = { ...loadConfig(), ...config };
  for (const key of Object.keys(merged) as (keyof MisarConfig)[]) {
    if (merged[key] === undefined) delete merged[key];
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), { mode: 0o600 });
}

export function getBaseUrl(): string {
  const envUrl = (process.env.MISARMAIL_BASE_URL ?? "").trim();
  if (envUrl) return envUrl.replace(/\/$/, "");
  const cfg = loadConfig();
  if (cfg.base_url) return cfg.base_url.replace(/\/$/, "");
  return DEFAULT_BASE_URL;
}

export function tryGetApiKey(): string | null {
  const envKey = process.env.MISARMAIL_API_KEY?.trim();
  if (envKey) return envKey;
  return loadConfig().api_key ?? null;
}

/**
 * Resolve the stdio context lazily, at call time — never at import time.
 *
 * Smithery (and every other directory that scans a server) starts the process
 * with no credentials and immediately calls `tools/list`. An import-time
 * `process.exit(1)` on a missing key is exactly why the tool list went stale:
 * the scanner sees a dead process instead of the catalogue. Discovery must
 * always succeed; only `tools/call` may demand a key.
 */
export function stdioContext(): McpContext {
  const apiKey = tryGetApiKey();
  if (!apiKey) {
    throw new Error(
      "Not authenticated. Set the MISARMAIL_API_KEY environment variable, or run the " +
        "`login` tool to connect your MisarMail account via browser. " +
        "Create a key at https://mail.misar.io/developers",
    );
  }
  return { apiKey, baseUrl: getBaseUrl(), source: "mcp_stdio" };
}
