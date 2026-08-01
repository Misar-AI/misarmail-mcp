import { apiFetch, apiFetchRoot, unwrap } from "./lib/api-client.js";
import type { McpContext } from "./lib/context.js";

/**
 * MCP resources — read-only context an agent can pull in without spending a
 * tool call, and which clients can attach to a conversation directly.
 *
 * Kept deliberately small and stable: resources are fetched eagerly by some
 * clients, so anything expensive or paginated belongs in a tool instead.
 */

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read: (ctx: McpContext) => Promise<unknown>;
}

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

export function listResources() {
  return RESOURCES.map(({ uri, name, description, mimeType }) => ({
    uri,
    name,
    description,
    mimeType,
  }));
}

export async function readResource(uri: string, ctx: McpContext) {
  const resource = BY_URI.get(uri);
  if (!resource) return null;
  const data = await resource.read(ctx);
  return {
    contents: [
      { uri, mimeType: resource.mimeType, text: JSON.stringify(data, null, 2) },
    ],
  };
}
