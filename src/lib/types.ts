import type { McpContext } from "./context.js";

/**
 * A JSON Schema object describing a tool's arguments.
 *
 * Deliberately structural rather than importing the MCP SDK's `Tool` type: the
 * registry is consumed by both the SDK-based stdio server and the hand-rolled
 * JSON-RPC HTTP route, and the HTTP route must not carry an SDK dependency into
 * the Next.js bundle.
 */
export interface JsonSchema {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/**
 * Behavioural hints surfaced to clients and directories.
 *
 * Smithery, Claude Desktop, and VS Code all read these to decide whether a tool
 * needs confirmation before running, so every tool declares them explicitly
 * rather than relying on the SDK defaults.
 */
export interface ToolAnnotations {
  title?: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

/** Scopes an API key must carry for a tool to run. Empty = any valid key. */
export type ToolScope = "read" | "write" | "send" | "send:transactional" | "contacts";

/** A tool's wire metadata plus the handler that runs it. */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: ToolAnnotations;
  /** Grouping used by the README, docs, and directory listings. */
  category: ToolCategory;
  /** Any ONE of these scopes authorises the call. Omit for read-only tools. */
  scopes?: ToolScope[];
  handler: (ctx: McpContext, args: Record<string, unknown>) => Promise<unknown>;
}

/** Grouping used to organise the catalogue in docs and listings. */
export type ToolCategory =
  | "email"
  | "campaigns"
  | "contacts"
  | "templates"
  | "automations"
  | "ab-testing"
  | "analytics"
  | "deliverability"
  | "domains"
  | "forms"
  | "marketplace"
  | "integrations"
  | "ai"
  | "account"
  | "sandbox";

/** Convenience builder so every tool file stays declarative. */
export function defineTool(def: ToolDefinition): ToolDefinition {
  return def;
}
