import { describe, it, expect, vi } from "vitest";
import {
  ALL_TOOLS,
  LEGACY_ALIASES,
  dispatch,
  listTools,
  resolveTool,
  MissingScopeError,
  UnknownToolError,
} from "../../src/registry.js";
import { listPrompts, getPrompt, PROMPTS } from "../../src/prompts.js";
import { listResources } from "../../src/resources.js";
import { httpContext } from "../../src/lib/context.js";

const ctx = httpContext("msk_test", "https://example.invalid/v1");

describe("tool catalogue", () => {
  it("exposes every tool with a unique snake_case name", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("carries a description and explicit annotations on every tool", () => {
    for (const tool of ALL_TOOLS) {
      // Directories rank on description quality; a bare name gets a listing buried.
      expect(tool.description.length).toBeGreaterThan(40);
      expect(tool.annotations).toMatchObject({
        readOnlyHint: expect.any(Boolean),
        destructiveHint: expect.any(Boolean),
        idempotentHint: expect.any(Boolean),
        openWorldHint: expect.any(Boolean),
      });
    }
  });

  it("declares an object inputSchema whose required fields all exist", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.inputSchema.type).toBe("object");
      for (const required of tool.inputSchema.required ?? []) {
        expect(Object.keys(tool.inputSchema.properties ?? {})).toContain(required);
      }
    }
  });

  it("requires a write-ish scope on every non-read-only tool", () => {
    for (const tool of ALL_TOOLS) {
      if (!tool.annotations.readOnlyHint && tool.name !== "get_email") {
        expect(tool.scopes?.length, `${tool.name} has no scopes`).toBeGreaterThan(0);
      }
    }
  });
});

describe("legacy dotted aliases", () => {
  it("resolves every alias to a real tool", () => {
    for (const [legacy, canonical] of Object.entries(LEGACY_ALIASES)) {
      expect(resolveTool(legacy), `alias ${legacy}`).toBeDefined();
      expect(resolveTool(legacy)!.name).toBe(canonical);
    }
  });

  it("keeps aliases out of the advertised catalogue", () => {
    // Advertising both spellings would show duplicate tools in every directory.
    const advertised = new Set(listTools().map((t) => t.name));
    for (const legacy of Object.keys(LEGACY_ALIASES)) {
      expect(advertised.has(legacy)).toBe(false);
    }
  });

  it("covers every tool name the pre-consolidation HTTP endpoint served", () => {
    // Snapshot of the 31 dotted names live on api.misar.io/mail/mcp before the
    // rename, minus the two channel.* stubs that only ever returned errors.
    const shipped = [
      "email.list", "email.read", "email.send", "email.reply", "email.archive",
      "campaign.list", "campaign.get", "campaign.create", "campaign.send",
      "contact.list", "contact.add", "contact.update", "contact.score",
      "template.create", "analytics.get", "warmup.get", "account.score",
      "key.list", "automation.list", "automation.create", "abtest.create",
      "abtest.winner", "ai.subject_lines", "landing_page.create",
      "inbound.configure", "dmarc.check", "revenue.attribution",
      "monetization.stats", "deliverability.audit", "report.generate",
    ];
    for (const name of shipped) expect(resolveTool(name), name).toBeDefined();
  });
});

describe("dispatch", () => {
  it("rejects an unknown tool", async () => {
    await expect(dispatch("nope", {}, ctx)).rejects.toBeInstanceOf(UnknownToolError);
  });

  it("enforces scopes when the caller's scopes are known", async () => {
    await expect(dispatch("send_email", {}, ctx, (req) => req.includes("read"))).rejects.toBeInstanceOf(
      MissingScopeError,
    );
  });

  it("skips the scope check when scopes are unknown (stdio)", async () => {
    // stdio cannot see key scopes; the API enforces them server-side instead.
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }),
    );
    await expect(dispatch("send_email", { subject: "hi" }, ctx, null)).resolves.toBeDefined();
    fetchMock.mockRestore();
  });

  it("routes a legacy dotted name to the canonical handler", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );
    await dispatch("campaign.list", {}, ctx, () => true);
    expect(fetchMock.mock.calls[0]![0]).toContain("/campaigns");
    fetchMock.mockRestore();
  });

  it("surfaces the API's own error message", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Domain not verified" }), { status: 422 }),
    );
    await expect(dispatch("list_campaigns", {}, ctx, () => true)).rejects.toThrow(
      "Domain not verified",
    );
    fetchMock.mockRestore();
  });
});

describe("prompts and resources", () => {
  it("lists every prompt with its arguments", () => {
    expect(listPrompts()).toHaveLength(PROMPTS.length);
  });

  it("only references tool names that exist in the catalogue", () => {
    // A prompt naming a tool that was renamed sends the agent chasing nothing.
    const known = new Set(ALL_TOOLS.map((t) => t.name));
    for (const prompt of PROMPTS) {
      const body = prompt.build({});
      for (const match of body.matchAll(/\b([a-z][a-z0-9_]{4,})\b(?= tool| with| for|,|\.|\n)/g)) {
        const word = match[1]!;
        if (word.includes("_") && !known.has(word)) {
          expect(known.has(word), `prompt "${prompt.name}" references unknown tool ${word}`).toBe(
            true,
          );
        }
      }
    }
  });

  it("builds a prompt body for every prompt with no arguments supplied", () => {
    for (const prompt of PROMPTS) {
      expect(getPrompt(prompt.name)!.messages[0]!.content.text.length).toBeGreaterThan(50);
    }
  });

  it("returns null for an unknown prompt", () => {
    expect(getPrompt("nope")).toBeNull();
  });

  it("exposes resources with misarmail:// URIs", () => {
    for (const resource of listResources()) {
      expect(resource.uri).toMatch(/^misarmail:\/\//);
      expect(resource.mimeType).toBe("application/json");
    }
  });
});

describe("stdio error clarity", () => {
  it("reports an unknown tool as unknown, not as an auth failure", async () => {
    // The stdio entry point resolves the tool BEFORE reading credentials.
    // Passing stdioContext() as a call argument evaluated it first, so an
    // unauthenticated user who mistyped a tool name was told to fix their API
    // key rather than their typo.
    await expect(dispatch("__typo__", {}, ctx)).rejects.toBeInstanceOf(UnknownToolError);
    expect(resolveTool("__typo__")).toBeUndefined();
    expect(resolveTool("list_campaigns")).toBeDefined();
  });
});
