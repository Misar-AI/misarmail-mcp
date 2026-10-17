import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SERVER_VERSION } from "../../src/version.js";

describe("SERVER_VERSION", () => {
  it("matches package.json, so initialize reports the published version", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "packages/mail-mcp-server/package.json"), "utf8")) as { version: string };
    expect(SERVER_VERSION).toBe(pkg.version);
  });
});
