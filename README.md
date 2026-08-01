# MisarMail MCP Server

> Send email, run campaigns, manage contacts and automations, A/B test, and audit deliverability — from any AI assistant.

[![npm](https://img.shields.io/npm/v/@misarmail/mcp)](https://www.npmjs.com/package/@misarmail/mcp)
[![smithery](https://img.shields.io/badge/smithery-misar%2Fmisarmail--mcp-blue)](https://smithery.ai/server/misar/misarmail-mcp)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

**54 tools · 8 prompts · 4 resources · 8 agent skills**

Works with Claude (Desktop, Code, and web), Cursor, VS Code, Windsurf, Cline,
Zed, Gemini CLI, ChatGPT, and any other MCP-compatible client — over stdio or
Streamable HTTP.

---

## Install

### Smithery (recommended)

```bash
npx -y @smithery/cli install misar/misarmail-mcp --client claude
```

### Claude Code

```bash
claude mcp add misarmail -- npx -y @misarmail/mcp@latest
```

### Manual (any client)

```json
{
  "mcpServers": {
    "misarmail": {
      "command": "npx",
      "args": ["-y", "@misarmail/mcp@latest"],
      "env": { "MISARMAIL_API_KEY": "msk_your_key_here" }
    }
  }
}
```

Ready-made configs for every client live in [`connectors/`](./connectors).

### Remote (no install)

```json
{
  "mcpServers": {
    "misarmail": {
      "type": "streamable-http",
      "url": "https://api.misar.io/mail/mcp",
      "headers": { "Authorization": "Bearer msk_your_key_here" }
    }
  }
}
```

---

## Authentication

Two options — no copy-paste needed for the first:

1. **Browser login.** Start the server with no key and run the `login` tool.
   It opens the MisarMail consent screen, you review the requested
   permissions, and the key is delivered straight back and saved to
   `~/.misarmail/config.json`.
2. **API key.** Create one at https://mail.misar.io/developers and set `MISARMAIL_API_KEY`.

Self-hosted instances: set `MISARMAIL_BASE_URL`.

---

## Tools

| Tool | Description |
| --- | --- |
| `send_email` | Send a transactional email from a verified MisarMail account. |
| `list_emails` | List emails from a mailbox folder with optional full-text search across subject and body. |
| `get_email` | Read the full content of a single email by ID, including headers, body, and attachments metadata. |
| `reply_to_email` | Reply to an existing email thread. |
| `archive_email` | Move an email to the archive folder. |
| `validate_email` | Validate an email address before sending: syntax, MX records, disposable-domain and role-account detection. |
| `list_campaigns` | List email marketing campaigns with their status, audience size, and headline metrics. |
| `get_campaign` | Get full details for one campaign: content, audience segment, schedule, and delivery statistics (sent, opened, clicked, bounced, complained).. |
| `create_campaign` | Create a new email marketing campaign as a draft. |
| `send_campaign` | Send a campaign now, or schedule it for a future time by passing scheduled_at. |
| `list_contacts` | List contacts with their subscription status and engagement metrics. |
| `create_contact` | Add a single contact. |
| `update_contact` | Update an existing contact by email address, including changing subscription status. |
| `import_contacts` | Bulk-import up to 5,000 contacts in one call. |
| `get_contact_score` | Get engagement score, engagement tier, and churn risk for one contact — or the lowest-engagement contacts across the list when contact_id is omitted. |
| `list_templates` | List saved email templates with their variable placeholders, so you can pick one for a campaign or transactional send.. |
| `create_template` | Create a reusable email template. |
| `render_template` | Render a template with sample variables and return the resulting HTML and subject. |
| `list_automations` | List automation workflows (welcome series, re-engagement, drip sequences) with their trigger type and active state.. |
| `get_automation` | Get one automation workflow in full: trigger, every step with its delay, and per-step completion stats.. |
| `create_automation` | Create an automation workflow from a trigger and an ordered list of steps. |
| `toggle_automation` | Activate or pause an automation. |
| `list_ab_tests` | List A/B tests with per-variant results and whether a winner has been selected yet.. |
| `create_ab_test` | Create an A/B test on a campaign with two or more variants. |
| `select_ab_test_winner` | Select the winning variant and send it to the remaining audience. |
| `get_analytics` | Get delivery and engagement analytics — sent, delivered, opened, clicked, bounced, and complained — for the account or one campaign, grouped by day/week/month.. |
| `generate_report` | Generate a structured analytics report over a date range. |
| `get_revenue_attribution` | Attribute ecommerce revenue to email — revenue per campaign, per contact, and average order value from tracked conversions.. |
| `get_monetization_stats` | Get newsletter monetization stats: paid subscribers, MRR, churn, and sponsorship revenue for the period.. |
| `get_deliverability_score` | Get the account deliverability score (0–100) and letter grade (A–F) with the factors dragging it down. |
| `run_deliverability_audit` | Run a full deliverability audit across authentication (SPF/DKIM/DMARC), domain reputation, list hygiene, content signals, and blocklist status. |
| `get_warmup_status` | Get IP/domain warm-up progress and today's remaining send capacity. |
| `check_dmarc` | Check live SPF, DKIM, and DMARC DNS records for a domain and report alignment problems with the exact record to publish. |
| `list_domains` | List sending domains with verification status and their DKIM/SPF/DMARC records. |
| `add_domain` | Add a sending domain and return the DNS records to publish. |
| `verify_domain` | Re-check a domain's DNS records and mark it verified if they resolve. |
| `configure_inbound_domain` | Configure inbound email routing for a subdomain so replies land in the MisarMail unified inbox. |
| `list_forms` | List signup forms with their embed status and conversion counts.. |
| `get_form` | Get one signup form including its fields, embed code, and redirect behaviour.. |
| `get_form_submissions` | List submissions for a signup form, including the submitted field values and timestamps.. |
| `create_landing_page` | Create a hosted landing page with an email capture form. |
| `list_marketplace_items` | Browse the MisarMail template marketplace for ready-made email and automation templates.. |
| `get_marketplace_item` | Get one marketplace listing with its full preview, author, and install count.. |
| `list_inbox_conversations` | List unified-inbox conversations (threads) with their status and detected intent. |
| `get_inbox_conversation_messages` | Get every message in one inbox conversation, oldest first, with sender and timestamps.. |
| `categorize_inbox_emails` | Run AI categorisation over a batch of inbox emails to label intent and priority. |
| `list_api_keys` | List API keys on the account with their scopes and last-used time. |
| `generate_subject_lines` | Generate AI subject-line variants for a campaign topic, optionally tuned to a tone and audience. |
| `list_integrations` | List connected third-party integrations and their sync status.. |
| `get_integration` | Get one integration's configuration, scopes, and last sync result.. |
| `toggle_integration` | Enable or disable an integration. |
| `list_sandbox_sends` | List emails captured by sandbox mode. |
| `clear_sandbox` | Delete every captured sandbox email. |
| `upgrade` | Show the current MisarMail plan, how much of each quota is left, and what upgrading unlocks. |

## Prompts

Reusable workflows your client exposes as slash-commands.

| Prompt | Description |
| --- | --- |
| `compose_email` | Draft a professional email and send it via MisarMail after confirmation. |
| `campaign_performance_report` | Analyse campaign performance and produce prioritized improvements. |
| `contact_import_guide` | Import and organise contacts safely, with consent and hygiene checks. |
| `automation_builder_guide` | Design and build an email automation workflow step by step. |
| `deliverability_improvement_plan` | Diagnose deliverability and produce a prioritized weekly action plan. |
| `ab_test_plan` | Design a statistically meaningful A/B test for a campaign. |
| `list_hygiene_audit` | Find and clean the contacts that are hurting sender reputation. |
| `weekly_email_report` | Produce a stakeholder-ready weekly email performance summary. |

## Resources

Read-only context an agent can attach without spending a tool call.

| URI | Description |
| --- | --- |
| `misarmail://account/domains` | Your sending domains with verification state and DNS records. |
| `misarmail://account/deliverability` | Current account deliverability score (0–100), grade, and contributing factors.. |
| `misarmail://account/warmup` | IP/domain warm-up stage and remaining send capacity for today — the ceiling a bulk send must stay under.. |
| `misarmail://templates` | Saved templates with their declared variables, for reuse in campaigns and sends.. |

## Agent skills

Bundled in [`skills/`](./skills) — guidance an agent loads when a task matches.

| Skill | Use when |
| --- | --- |
| `ab-test-campaign` | Design and run an A/B test on a MisarMail campaign — subject line, content, sender name, or send time. Use for "A/B test", "split test", "which subject works better", or testing email variants. |
| `audit-deliverability` | Diagnose why MisarMail emails land in spam or bounce, and produce a prioritized fix list. Use for "emails going to spam", "not being delivered", "low open rate", "domain reputation", DMARC/SPF/DKIM, or blocklist questions. |
| `build-email-automation` | Design and build a MisarMail automation workflow — welcome series, drip sequence, re-engagement, or onboarding. Use for "automate", "drip", "welcome series", "sequence", or trigger-based email. |
| `clean-contact-list` | Audit and clean a MisarMail contact list — bounced, complained, and unengaged contacts. Use for list hygiene, re-engagement, suppression, or "why is my open rate falling". |
| `email-performance-report` | Produce a MisarMail performance report — opens, clicks, deliverability, revenue attribution. Use for "how are my emails doing", weekly/monthly reports, or campaign performance analysis. |
| `run-email-campaign` | Create, review, and send a bulk email campaign in MisarMail. Use when the user wants to email a list, newsletter, segment, or announcement to many recipients. |
| `send-transactional-email` | Send a one-off or transactional email through MisarMail. Use when the user asks to send, draft-and-send, or reply to an email — including receipts, notifications, welcome messages, and personal outreach. |
| `setup-sending-domain` | Add and verify a custom sending domain in MisarMail, including SPF, DKIM, DMARC, and inbound routing. Use for "send from my own domain", DNS setup, domain verification, or inbound email. |

---

## Safety

Destructive and irreversible actions are annotated (`destructiveHint`) so
clients can prompt before running them. The skills instruct agents to confirm
before anything that sends mail, publishes content, or is otherwise visible to
other people.

Discovery (`initialize`, `tools/list`, `prompts/list`, `resources/list`)
never requires credentials, so registries can index the server without one.
Every action does.

---

## Links

- Website — https://www.misarmail.com
- App — https://mail.misar.io
- Documentation — https://docs.misar.io/mail/mcp
- Smithery — https://smithery.ai/server/misar/misarmail-mcp
- npm — https://www.npmjs.com/package/@misarmail/mcp
- Source — https://github.com/mrgulshanyadav/misarmail-mcp

MIT © [Misar AI](https://misar.io)
