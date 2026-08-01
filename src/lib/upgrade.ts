/**
 * Renders a plan-limit rejection as a CLI upgrade card.
 *
 * IMPORTANT: this file contains NO plan names, prices, benefits or URLs. All of
 * that arrives inside the server's `upgrade` payload, so pricing and marketing
 * copy can change server-side and every already-installed MCP client picks it
 * up on the next blocked call — no npm republish, no marketplace re-submission.
 * Keep it that way: this module formats, it never authors.
 *
 * The payload contract is shared with MisarBlog
 * (MisarBlog/src/lib/plan/upgrade-offer.ts), so both products render alike.
 */

export interface UpgradePlanOption {
  slug: string;
  name: string;
  price: string;
  price_note: string | null;
  recommended: boolean;
  current: boolean;
  unlocks: string | null;
  benefits: string[];
  url: string;
}

export interface UpgradeOffer {
  product_name: string;
  reason: "quota_exhausted" | "feature_locked" | "overage_capped" | "credits_exhausted";
  feature: string;
  feature_label: string;
  headline: string;
  usage: {
    used: number | null;
    limit: number | null;
    remaining: number | null;
    period: "month" | "total" | null;
    resets_at: string | null;
  } | null;
  current_plan: { slug: string; name: string };
  recommended_plan: string | null;
  plans: UpgradePlanOption[];
  overage?: { available: boolean; enabled: boolean; hint: string; url: string } | null;
  topup?: {
    balance_credits: number;
    required_credits: number;
    options: { amount_dollars: number; label: string; url: string }[];
  } | null;
  urls: { pricing: string; billing: string; docs: string; compare: string };
  cta: string;
}

/** Extract the offer from an arbitrary API error body, if present. */
export function extractUpgradeOffer(body: unknown): UpgradeOffer | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (b.code !== "plan_limit_exceeded") return null;
  const offer = b.upgrade;
  if (typeof offer !== "object" || offer === null) return null;
  const o = offer as Partial<UpgradeOffer>;
  // Minimal shape check — never render a half-populated card.
  if (typeof o.headline !== "string" || !Array.isArray(o.plans)) return null;
  return offer as UpgradeOffer;
}

// ── Formatting helpers ───────────────────────────────────────────────────────

const WIDTH = 62;

const rule = (char = "─") => char.repeat(WIDTH);

/** A 20-cell usage bar: ████████████░░░░░░░░  80% */
function usageBar(used: number, limit: number): string {
  const cells = 20;
  const ratio = limit <= 0 ? 1 : Math.min(1, used / limit);
  const filled = Math.round(ratio * cells);
  return `${"█".repeat(filled)}${"░".repeat(cells - filled)}  ${Math.round(ratio * 100)}%`;
}

function humanDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const days = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
  return days === 0 ? `${date} (today)` : `${date} (in ${days} day${days === 1 ? "" : "s"})`;
}

const field = (label: string, value: string) => `  ${label.padEnd(10)}${value}`;

// ── Renderer ─────────────────────────────────────────────────────────────────

export function renderUpgradeOffer(offer: UpgradeOffer): string {
  const out: string[] = [];

  const banner =
    offer.reason === "credits_exhausted"
      ? "Out of credits"
      : offer.reason === "feature_locked"
        ? "This feature needs a higher plan"
        : offer.reason === "overage_capped"
          ? "Limit reached and overage cap hit"
          : "You've hit your plan limit";

  // `⚠` renders double-width in most terminals, so the visible cost of the
  // prefix is 6 columns, not 5 — pad against that or the box closes crooked.
  const bannerLine = `  ⚠  ${banner}`.padEnd(WIDTH - 1);

  out.push("");
  out.push(`╭${rule()}╮`);
  out.push(`│${bannerLine}│`);
  out.push(`╰${rule()}╯`);
  out.push("");
  out.push(`  ${offer.headline}`);
  out.push("");

  out.push(field("Feature", offer.feature_label));
  if (offer.usage && offer.usage.limit !== null && offer.usage.used !== null) {
    const period = offer.usage.period === "month" ? " this month" : "";
    out.push(
      field(
        "Usage",
        `${offer.usage.used.toLocaleString("en-US")} / ${offer.usage.limit.toLocaleString("en-US")}${period}`,
      ),
    );
    out.push(field("", usageBar(offer.usage.used, offer.usage.limit)));
  }
  if (offer.topup) {
    out.push(field("Balance", `${offer.topup.balance_credits} credits`));
    out.push(field("Required", `${offer.topup.required_credits} credits`));
  }
  if (offer.usage?.resets_at) out.push(field("Resets", humanDate(offer.usage.resets_at)));
  out.push(field("Plan", offer.current_plan.name));
  out.push("");

  if (offer.plans.length > 0) {
    out.push(`  ${rule("┄")}`);
    out.push("");
    out.push("  Upgrade to keep going — and unlock a lot more:");
    out.push("");

    for (const plan of offer.plans) {
      const badge = plan.recommended ? "   ★ RECOMMENDED" : "";
      out.push(`  ▸ ${plan.name} — ${plan.price}${badge}`);
      if (plan.price_note) out.push(`    ${plan.price_note}`);
      if (plan.unlocks) out.push(`    ✔ Fixes this: ${plan.unlocks}`);
      for (const benefit of plan.benefits.slice(0, 6)) out.push(`      · ${benefit}`);
      if (plan.benefits.length > 6) {
        out.push(`      · …and ${plan.benefits.length - 6} more`);
      }
      out.push(`    → ${plan.url}`);
      out.push("");
    }
  }

  // Pay-as-you-go is often the cheaper answer — surfacing it builds trust and
  // still monetises the call.
  if (offer.overage?.available) {
    out.push(`  ${rule("┄")}`);
    out.push("");
    out.push(`  ${offer.overage.hint}`);
    out.push(`  → ${offer.overage.url}`);
    out.push("");
  }

  if (offer.topup) {
    out.push(`  ${rule("┄")}`);
    out.push("");
    out.push("  Top up your wallet to keep going:");
    out.push("");
    for (const option of offer.topup.options) {
      out.push(`  ▸ ${option.label}`);
      out.push(`    → ${option.url}`);
    }
    out.push("");
  }

  out.push(`  ${rule("┄")}`);
  out.push("");
  out.push(`  ${offer.cta}`);
  out.push(`  Compare plans  → ${offer.urls.compare}`);
  out.push(`  Manage billing → ${offer.urls.billing}`);
  out.push(`  Limits & docs  → ${offer.urls.docs}`);
  out.push("");
  out.push("  Tip: run the `upgrade` tool any time to see your plan and what's left,");
  out.push("  or `upgrade open=true` to jump straight to checkout.");
  out.push("");

  return out.join("\n");
}

/** Compact one-liner for logs / nested contexts. */
export function summarizeOffer(offer: UpgradeOffer): string {
  return `${offer.headline} ${offer.cta} ${offer.urls.pricing}`;
}
