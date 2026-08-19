/**
 * Reusable prompt templates exposed over MCP `prompts/list` / `prompts/get`.
 *
 * Prompts are discovery surface: clients render them as slash-commands, and
 * directories index them. They must therefore be listable WITHOUT credentials,
 * and every tool name referenced in the body must be a canonical snake_case
 * name — the pre-consolidation prompts mixed `send_email` with `automation.list`
 * and sent agents chasing tools that the catalogue no longer advertised.
 */

/** One argument a prompt accepts. */
export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

/** A prompt template: its metadata plus the builder that renders it. */
export interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
  build: (args: Record<string, string>) => string;
}

/** Every prompt this server exposes. */
export const PROMPTS: PromptDefinition[] = [
  {
    name: "compose_email",
    description: "Draft a professional email and send it via MisarMail after confirmation.",
    arguments: [
      { name: "purpose", description: "Purpose (welcome, follow-up, announcement…)", required: true },
      { name: "tone", description: "professional | friendly | formal | playful", required: false },
      { name: "recipient_name", description: "Name of the recipient", required: false },
    ],
    build: (a) =>
      `Draft a ${a.tone || "professional"} email for: ${a.purpose || "general communication"}` +
      `${a.recipient_name ? `, addressed to ${a.recipient_name}` : ""}.\n\n` +
      "Steps:\n" +
      "1. Call list_domains to confirm which verified sender addresses are available.\n" +
      "2. Show me the draft (subject + body) and wait for my explicit confirmation.\n" +
      "3. Only after I confirm, call send_email with the chosen verified sender.",
  },
  {
    name: "campaign_performance_report",
    description: "Analyse campaign performance and produce prioritized improvements.",
    arguments: [{ name: "period", description: "today | 7d | 30d | 90d", required: false }],
    build: (a) =>
      `Call get_analytics for the ${a.period || "30d"} period, then summarise open rate, ` +
      "click rate, bounce rate, and complaint rate.\n\n" +
      "For each metric, compare against email-industry benchmarks (open 20–25%, click 2–5%, " +
      "bounce <2%, complaints <0.1%) and flag anything outside the healthy range. " +
      "Finish with three concrete changes ranked by expected impact.",
  },
  {
    name: "contact_import_guide",
    description: "Import and organise contacts safely, with consent and hygiene checks.",
    arguments: [{ name: "source", description: "CSV, CRM, spreadsheet…", required: false }],
    build: (a) =>
      `Guide me through importing contacts${a.source ? ` from ${a.source}` : ""} into MisarMail.\n\n` +
      "Before importing, confirm with me that these contacts opted in — sending to a purchased or " +
      "scraped list will damage sender reputation and breaches CAN-SPAM/GDPR.\n\n" +
      "Then: use validate_email to spot-check a sample for syntax and disposable domains, " +
      "call import_contacts in batches of at most 5000, and report which rows were rejected and why.",
  },
  {
    name: "automation_builder_guide",
    description: "Design and build an email automation workflow step by step.",
    arguments: [
      { name: "goal", description: "welcome series, re-engagement, onboarding…", required: false },
    ],
    build: (a) =>
      `Help me build an email automation${a.goal ? ` for: ${a.goal}` : ""}.\n\n` +
      "1. Call list_automations so we do not duplicate an existing workflow.\n" +
      "2. Propose a trigger and an ordered set of steps with delays, and explain each choice.\n" +
      "3. After I approve the design, call create_automation with active=false.\n" +
      "4. Show me the created workflow with get_automation, and only call toggle_automation " +
      "once I confirm it is correct.",
  },
  {
    name: "deliverability_improvement_plan",
    description: "Diagnose deliverability and produce a prioritized weekly action plan.",
    arguments: [],
    build: () =>
      "Diagnose my email deliverability:\n\n" +
      "1. Call get_deliverability_score for the headline score and grade.\n" +
      "2. Call run_deliverability_audit for detailed findings.\n" +
      "3. Call check_dmarc for each domain returned by list_domains.\n" +
      "4. Call get_warmup_status to check whether I am sending above warm-up capacity.\n\n" +
      "Then produce a plan grouped by impact (high/medium/low), where every item names the " +
      "specific DNS record, setting, or list action to change — no generic advice.",
  },
  {
    name: "ab_test_plan",
    description: "Design a statistically meaningful A/B test for a campaign.",
    arguments: [
      { name: "campaign_id", description: "Campaign to test", required: false },
      { name: "hypothesis", description: "What you believe will improve results", required: false },
    ],
    build: (a) =>
      `Design an A/B test${a.campaign_id ? ` for campaign ${a.campaign_id}` : ""}.\n` +
      `${a.hypothesis ? `Hypothesis: ${a.hypothesis}\n` : ""}\n` +
      "1. Call get_campaign (or list_campaigns) to check the audience size.\n" +
      "2. Tell me whether that audience is large enough to detect a meaningful difference — " +
      "if a 20% sample yields under ~1,000 recipients per variant, say so plainly and " +
      "recommend testing on a larger list instead.\n" +
      "3. Use generate_subject_lines for variant copy when testing subjects.\n" +
      "4. Call create_ab_test only after I approve the variants.\n" +
      "5. Do NOT call select_ab_test_winner until results are in — it sends to the whole remainder.",
  },
  {
    name: "list_hygiene_audit",
    description: "Find and clean the contacts that are hurting sender reputation.",
    arguments: [],
    build: () =>
      "Audit my contact list health:\n\n" +
      "1. Call list_contacts with status=bounced and status=complained.\n" +
      "2. Call get_contact_score with no contact_id to surface the lowest-engagement contacts.\n" +
      "3. Report what share of the list is unengaged, bounced, or complained.\n\n" +
      "Recommend which segments to suppress and which to try a re-engagement campaign on first. " +
      "Do not call update_contact to unsubscribe anyone without my explicit per-segment approval.",
  },
  {
    name: "weekly_email_report",
    description: "Produce a stakeholder-ready weekly email performance summary.",
    arguments: [{ name: "period", description: "today | 7d | 30d | 90d", required: false }],
    build: (a) =>
      `Produce a weekly email report for the ${a.period || "7d"} period.\n\n` +
      "Gather: get_analytics, list_campaigns (status=sent), get_deliverability_score, " +
      "and get_revenue_attribution.\n\n" +
      "Format as: headline metrics, best and worst performing campaign with a one-line reason, " +
      "deliverability status, revenue attributed to email, and the single most important action " +
      "for next week. Keep it under 400 words and state clearly if any data was unavailable.",
  },
];

const BY_NAME = new Map(PROMPTS.map((p) => [p.name, p]));

/** One prompt as advertised by `prompts/list`. */
export interface PromptSummary {
  /** Prompt id to pass to {@link getPrompt}. */
  name: string;
  /** What the prompt is for. */
  description: string;
  /** Arguments it accepts, and which are required. */
  arguments: Array<{ name: string; description: string; required?: boolean }>;
}

/** A rendered prompt, as returned by `prompts/get`. */
export interface RenderedPrompt {
  /** What the prompt is for. */
  description: string;
  /** The messages to seed the conversation with. */
  messages: Array<{ role: "user"; content: { type: "text"; text: string } }>;
  /**
   * The SDK's result union is an open record, so this has to stay indexable to
   * remain assignable to it — naming the type is what JSR needs, not sealing it.
   */
  [key: string]: unknown;
}

/** Every prompt this server exposes, as `prompts/list` returns them. */
export function listPrompts(): PromptSummary[] {
  return PROMPTS.map(({ name, description, arguments: args }) => ({
    name,
    description,
    arguments: args,
  }));
}

/** Render one prompt by name, or null when no such prompt exists. */
export function getPrompt(name: string, args: Record<string, string> = {}): RenderedPrompt | null {
  const prompt = BY_NAME.get(name);
  if (!prompt) return null;
  return {
    description: prompt.description,
    messages: [{ role: "user" as const, content: { type: "text" as const, text: prompt.build(args) } }],
  };
}
