import { execFileSync } from "node:child_process";
import { apiFetch } from "../lib/api-client.js";
import { defineTool, type ToolDefinition } from "../lib/types.js";
import { renderUpgradeOffer, type UpgradeOffer } from "../lib/upgrade.js";

/**
 * Plan visibility + self-serve upgrade.
 *
 * Deliberately callable at ANY time, not only after a limit is hit: showing a
 * user their remaining quota before they run out converts far better than an
 * error message after the fact, and it is genuinely useful rather than pushy.
 */

interface UsageRow {
  feature: string;
  feature_label: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  period: "month" | "total";
  resets_at: string | null;
}

interface PlanResponse {
  plan: { slug: string; name: string };
  usage: UsageRow[];
  upgrade: UpgradeOffer | null;
}

function openBrowser(url: string): void {
  try {
    if (process.platform === "darwin") execFileSync("open", [url], { stdio: "ignore" });
    else if (process.platform === "win32")
      execFileSync("cmd.exe", ["/c", "start", "", url], { stdio: "ignore" });
    else execFileSync("xdg-open", [url], { stdio: "ignore" });
  } catch {
    // Headless/SSH — the URL is printed in the card either way.
  }
}

/** ██████░░░░░░  50% */
function bar(used: number, limit: number): string {
  const cells = 16;
  const ratio = limit <= 0 ? 1 : Math.min(1, used / limit);
  const filled = Math.round(ratio * cells);
  return `${"█".repeat(filled)}${"░".repeat(cells - filled)} ${String(
    Math.round(ratio * 100),
  ).padStart(3)}%`;
}

function renderUsage(data: PlanResponse): string {
  const out: string[] = ["", `  MisarMail — ${data.plan.name} plan`, `  ${"─".repeat(58)}`, ""];

  if (data.usage.length === 0) {
    out.push("  No metered features on this plan.");
    out.push("");
    return out.join("\n");
  }

  const width = Math.max(...data.usage.map((u) => u.feature_label.length));
  for (const row of data.usage) {
    if (row.limit === null) {
      out.push(`  ${row.feature_label.padEnd(width)}   ${"─".repeat(16)}  Unlimited`);
      continue;
    }
    const scope = row.period === "month" ? "this month" : "total";
    out.push(
      `  ${row.feature_label.padEnd(width)}   ${bar(row.used, row.limit)}   ` +
        `${row.used.toLocaleString("en-US")} / ${row.limit.toLocaleString("en-US")} ${scope}`,
    );
  }
  out.push("");
  return out.join("\n");
}

/** Plan, quota and upgrade tools. */
export const upgradeTools: ToolDefinition[] = [
  defineTool({
    name: "upgrade",
    category: "account",
    description:
      "Show the current MisarMail plan, how much of each quota is left, and what upgrading unlocks. Call it any time — not only after hitting a limit. Set open=true to open the checkout page in the default browser.",
    annotations: {
      title: "Plan usage and upgrade",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        open: {
          type: "boolean",
          description: "Open the upgrade/checkout page in the default browser.",
        },
        plan: {
          type: "string",
          description:
            "Plan slug to open (e.g. 'pro', 'max'). Defaults to the recommended plan.",
        },
      },
    },
    handler: async (ctx, args) => {
      const data = (await apiFetch(ctx, "/plan")) as PlanResponse;

      const sections: string[] = [renderUsage(data)];

      if (data.upgrade) {
        sections.push(renderUpgradeOffer(data.upgrade));
      } else {
        sections.push(
          "  You're on the top plan — every quota above is at its maximum.\n" +
            "  Need more? Talk to us about Enterprise: https://mail.misar.io/contact\n",
        );
      }

      if (args.open === true) {
        const wanted = typeof args.plan === "string" ? args.plan : null;
        const chosen = wanted
          ? data.upgrade?.plans.find((p) => p.slug === wanted)
          : data.upgrade?.plans.find((p) => p.recommended);
        const url = chosen?.url ?? data.upgrade?.urls.compare;
        if (url) {
          openBrowser(url);
          sections.push(`  Opened ${url} in your browser.\n`);
        }
      }

      return sections.join("\n");
    },
  }),
];
