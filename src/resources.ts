import { apiFetch, apiFetchRoot, unwrap } from "./lib/api-client.js";
import type { McpContext } from "./lib/context.js";

/**
 * MCP resources — read-only context an agent can pull in without spending a
 * tool call, and which clients can attach to a conversation directly.
 *
 * Kept deliberately small and stable: resources are fetched eagerly by some
 * clients, so anything expensive or paginated belongs in a tool instead.
 */

/** A readable resource: its metadata plus the reader that fetches it. */
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read: (ctx: McpContext) => Promise<unknown>;
}

/** Every resource this server exposes. */
export const RESOURCES: ResourceDefinition[] = [
  {
    uri: "misarmail://account/domains",
    name: "Verified sending domains",
    description:
      "Your sending domains with verification state and DNS records. Read this before composing any send — an unverified sender is the most common send failure.",
    mimeType: "application/json",
    read: async (ctx) => unwrap(await apiFetchRoot(ctx, "/domains")),
  },
  {
    uri: "misarmail://account/deliverability",
    name: "Deliverability score",
    description: "Current account deliverability score (0–100), grade, and contributing factors.",
    mimeType: "application/json",
    read: async (ctx) => unwrap(await apiFetch(ctx, "/deliverability/score")),
  },
  {
    uri: "misarmail://account/warmup",
    name: "Warm-up capacity",
    description:
      "IP/domain warm-up stage and remaining send capacity for today — the ceiling a bulk send must stay under.",
    mimeType: "application/json",
    read: async (ctx) => unwrap(await apiFetch(ctx, "/warmup")),
  },
  {
    uri: "misarmail://templates",
    name: "Email templates",
    description: "Saved templates with their declared variables, for reuse in campaigns and sends.",
    mimeType: "application/json",
    read: async (ctx) => unwrap(await apiFetch(ctx, "/templates?limit=50")),
  },
];

const BY_URI = new Map(RESOURCES.map((r) => [r.uri, r]));

/** One resource as advertised by `resources/list`. */
export interface ResourceSummary {
  /** URI to pass to {@link readResource}. */
  uri: string;
  /** Human-readable name. */
  name: string;
  /** What the resource contains. */
  description: string;
  /** MIME type of the contents. */
  mimeType: string;
}

/** The contents of one resource, as returned by `resources/read`. */
export interface ResourceReadResult {
  /** One block per resource; text blocks carry JSON. */
  contents: Array<{ uri: string; mimeType: string; text: string }>;
  /**
   * The SDK's result union is an open record, so this has to stay indexable to
   * remain assignable to it — naming the type is what JSR needs, not sealing it.
   */
  [key: string]: unknown;
}

/** Every resource this server exposes, as `resources/list` returns them. */
export function listResources(): ResourceSummary[] {
  return RESOURCES.map(({ uri, name, description, mimeType }) => ({
    uri,
    name,
    description,
    mimeType,
  }));
}

/** Read one resource by URI, or null when no such resource exists. */
export async function readResource(uri: string, ctx: McpContext): Promise<ResourceReadResult | null> {
  const resource = BY_URI.get(uri);
  if (!resource) return null;
  const data = await resource.read(ctx);
  return {
    contents: [
      { uri, mimeType: resource.mimeType, text: JSON.stringify(data, null, 2) },
    ],
  };
}
