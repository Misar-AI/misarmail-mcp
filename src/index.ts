#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ALL_TOOLS, dispatch, listTools, resolveTool, UnknownToolError } from "./registry.js";
import { authTools } from "./tools/auth.js";
import { listPrompts, getPrompt } from "./prompts.js";
import { listResources, readResource } from "./resources.js";
import { stdioContext } from "./lib/auth.js";
import { formatError } from "./lib/errors.js";

/**
 * Tools that exist only on stdio: they touch the local machine (browser,
 * loopback listener, ~/.misarmail/config.json) and have no meaning on the
 * hosted HTTP endpoint, where the caller already presents a key.
 */
const STDIO_ONLY_TOOLS = authTools;
const STDIO_ONLY_BY_NAME = new Map(STDIO_ONLY_TOOLS.map((t) => [t.name, t]));

/** Placeholder context for tools that run before authentication exists. */
const UNAUTHENTICATED_CTX = { apiKey: "", baseUrl: "", source: "mcp_stdio" } as const;

function toWireTool(t: (typeof ALL_TOOLS)[number]) {
  return {
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    annotations: t.annotations,
  };
}

import { SERVER_NAME, SERVER_VERSION } from "./version.js";
export { SERVER_NAME, SERVER_VERSION };

function buildServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {}, prompts: {}, resources: {} } },
  );

  // Discovery handlers never touch credentials — see the note in lib/auth.ts.
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...listTools(), ...STDIO_ONLY_TOOLS.map(toWireTool)],
  }));
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: listPrompts() }));
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: listResources(),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const result = getPrompt(request.params.name, request.params.arguments ?? {});
    if (!result) throw new Error(`Prompt not found: ${request.params.name}`);
    return result;
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const result = await readResource(request.params.uri, stdioContext());
    if (!result) throw new Error(`Resource not found: ${request.params.uri}`);
    return result;
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      // Auth tools run BEFORE any credential exists, so they must not go
      // through stdioContext() — that is exactly the call that throws when the
      // user has not logged in yet.
      const local = STDIO_ONLY_BY_NAME.get(name);
      if (local) {
        const data = await local.handler(UNAUTHENTICATED_CTX, args as Record<string, unknown>);
        return {
          content: [
            {
              type: "text" as const,
              text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      // Resolve the tool BEFORE the credentials. Evaluating stdioContext() as a
      // call argument meant an unauthenticated user who mistyped a tool name got
      // "Not authenticated" — sending them to fix their key instead of their typo.
      if (!resolveTool(name)) throw new UnknownToolError(name);

      const data = await dispatch(name, args as Record<string, unknown>, stdioContext());
      return {
        content: [
          {
            type: "text" as const,
            text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }],
        isError: true,
      };
    }
  });

  return server;
}

/** Entry point used by Smithery's sandbox scanner, which imports rather than execs. */
export function createSandboxServer(): Server {
  return buildServer();
}

async function main() {
  const server = buildServer();
  await server.connect(new StdioServerTransport());
}

/**
 * Auto-start only on a direct run.
 *
 * Smithery's scanner imports this module to enumerate tools; firing main() on
 * import would attach a stdio transport to a process it does not own. Matching
 * argv[1] keeps `npx @misarmail/mcp` working while staying inert on import.
 */
const argv1 = process.argv[1] ?? "";
if (
  argv1.endsWith("index.ts") ||
  argv1.endsWith("index.js") ||
  argv1.endsWith("misarmail-mcp")
) {
  main().catch((err) => {
    console.error("MCP server error:", formatError(err));
    process.exit(1);
  });
}

export { ALL_TOOLS, LEGACY_ALIASES, dispatch, listTools, resolveTool } from "./registry.js";
export { PROMPTS, listPrompts, getPrompt } from "./prompts.js";
export { RESOURCES, listResources, readResource } from "./resources.js";
export { httpContext, type McpContext } from "./lib/context.js";
export { createHttpHandler } from "./http.js";
