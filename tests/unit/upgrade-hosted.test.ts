/**
 * The upgrade tool may open a browser only for a local (stdio) install. On the
 * hosted HTTP server it must never launch a process on the server's own host
 * for a remote caller — it returns the link instead.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const execFileSync = vi.fn();
vi.mock("node:child_process", async (orig) => {
  const actual = await orig<typeof import("node:child_process")>();
  const fake = (...a: unknown[]) => execFileSync(...a);
  return { ...actual, default: { ...actual, execFileSync: fake }, execFileSync: fake };
});
vi.mock("../../src/lib/api-client.js", () => ({
  apiFetch: vi.fn().mockResolvedValue({
    plan: { name: "Free" },
    usage: [],
    upgrade: {
      plans: [{ slug: "pro", name: "Pro", recommended: true, url: "https://mail.misar.io/pricing?plan=pro" }],
      urls: { compare: "https://mail.misar.io/pricing" },
    },
  }),
}));

vi.mock("../../src/lib/upgrade.js", () => ({ renderUpgradeOffer: () => "" }));

import { upgradeTools } from "../../src/tools/upgrade.js";

const tool = upgradeTools.find((t) => t.name === "upgrade")!;

describe("upgrade open=true", () => {
  beforeEach(() => execFileSync.mockClear());

  it("never launches a browser on the hosted server; returns the link", async () => {
    const out = await tool.handler({ apiKey: "k", baseUrl: "https://x", source: "mcp_http" }, { open: true });
    expect(execFileSync).not.toHaveBeenCalled();
    expect(String(out)).toContain("Upgrade here: https://mail.misar.io/pricing?plan=pro");
  });

  it("opens the browser for a local stdio install", async () => {
    await tool.handler({ apiKey: "k", baseUrl: "https://x", source: "mcp_stdio" }, { open: true });
    expect(execFileSync).toHaveBeenCalled();
  });
});
