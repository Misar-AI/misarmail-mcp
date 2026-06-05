<div align="center">
  <img src="https://mail.misar.io/logo-light.png" alt="MisarMail" width="180" />
  <h1>MisarMail MCP Server</h1>
  <p>Full email marketing platform accessible via Model Context Protocol</p>

  [![npm version](https://img.shields.io/npm/v/misarmail-mcp-server?label=npm&color=cb3837)](https://npmjs.com/package/misarmail-mcp-server)
  [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
  [![Tools: 32](https://img.shields.io/badge/tools-32-brightgreen)](README.md#tools-reference)
  [![Skills: 11](https://img.shields.io/badge/skills-11-purple)](README.md#skills)
</div>

---

## What is MisarMail MCP?

**MisarMail MCP** exposes the full [MisarMail](https://mail.misar.io) email marketing platform as a set of Model Context Protocol tools — making it directly callable from any MCP-compatible AI client.

| Capability | Details |
|---|---|
| **Tools** | 32 tools across email, campaigns, contacts, templates, automations, analytics, and more |
| **Skills** | 11 pre-built skills for common workflows |
| **Prompts** | 5 guided prompts |
| **Transport** | HTTP (Streamable HTTP) |
| **Auth** | OAuth 2.0 (PKCE) + API Key |
| **Server URL** | `https://mail.misar.io/api/mcp` |

With MisarMail MCP, your AI assistant can send emails, manage contacts, create and launch campaigns, run A/B tests, check deliverability health, generate AI subject lines, send WhatsApp messages, and produce revenue analytics — all through natural language.

---

## Quick Start

Pick your AI client and add MisarMail in under 60 seconds.

### Claude Desktop / Claude Code

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "misarmail": {
      "url": "https://mail.misar.io/api/mcp",
      "transport": "http"
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json` or Cursor → Settings → MCP):

```json
{
  "mcpServers": {
    "misarmail": {
      "url": "https://mail.misar.io/api/mcp",
      "transport": "http"
    }
  }
}
```

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your workspace, or to your user settings:

```json
{
  "servers": {
    "misarmail": {
      "url": "https://mail.misar.io/api/mcp",
      "type": "http"
    }
  }
}
```

### Cline

Add to your Cline MCP configuration:

```json
{
  "mcpServers": {
    "misarmail": {
      "url": "https://mail.misar.io/api/mcp",
      "transport": "http"
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP settings:

```json
{
  "mcpServers": {
    "misarmail": {
      "url": "https://mail.misar.io/api/mcp",
      "transport": "http"
    }
  }
}
```

### Docker (self-hosted proxy)

Run a local MCP proxy container that forwards to `mail.misar.io/api/mcp`:

```bash
docker run -p 3000:3000 ghcr.io/mrgulshanyadav/misarmail-mcp
```

Then point your client to `http://localhost:3000`.

### npm

Run the MCP server directly without Docker:

```bash
npx misarmail-mcp-server
```

---

## Authentication

MisarMail MCP supports two authentication methods:

### OAuth 2.0 (Recommended)

OAuth 2.0 with PKCE is handled automatically by clients like Claude Desktop — you will be redirected to `mail.misar.io` to authorize and the token is managed for you. No manual setup required.

### API Key

For programmatic access or clients that do not support OAuth:

1. Generate an API key at [mail.misar.io/developers](https://mail.misar.io/developers)
2. Pass it as a Bearer token in the `Authorization` header:

```
Authorization: Bearer msk_your_api_key_here
```

API keys start with `msk_`.

---

## Tools Reference

32 tools organized by category:

| Category | Tool | Description |
|---|---|---|
| **Email** | `email.list` | List emails from inbox, sent, archive, or any folder |
| **Email** | `email.read` | Read a specific email by ID |
| **Email** | `email.send` | Send a transactional or marketing email |
| **Email** | `email.reply` | Reply to an existing email thread |
| **Email** | `email.archive` | Archive an email |
| **Campaigns** | `campaign.list` | List email marketing campaigns |
| **Campaigns** | `campaign.get` | Get details of a specific campaign |
| **Campaigns** | `campaign.create` | Create a new email marketing campaign |
| **Campaigns** | `campaign.send` | Send or schedule a campaign |
| **Contacts** | `contact.list` | List contacts from your contact lists |
| **Contacts** | `contact.add` | Add a new contact |
| **Contacts** | `contact.update` | Update an existing contact |
| **Contacts** | `contact.score` | Get contact engagement score, tier, and churn risk |
| **Templates** | `template.create` | Create a reusable email template |
| **Analytics** | `analytics.get` | Get campaign and deliverability analytics |
| **Warmup** | `warmup.get` | Get IP warmup status and progress |
| **Deliverability** | `account.score` | Get deliverability score (0–100) and grade (A–F) |
| **Deliverability** | `dmarc.check` | Check domain DMARC/SPF/DKIM health |
| **Deliverability** | `deliverability.audit` | Run full deliverability audit with recommendations |
| **API Keys** | `key.list` | List API keys for the account |
| **Automation** | `automation.list` | List automation workflows |
| **Automation** | `automation.create` | Create automation workflow |
| **A/B Testing** | `abtest.create` | Create A/B test variant for a campaign |
| **A/B Testing** | `abtest.winner` | Select A/B test winner |
| **AI** | `ai.subject_lines` | Generate AI subject line suggestions with predicted scores |
| **Landing Pages** | `landing_page.create` | Create a landing page with block-based content |
| **Inbound** | `inbound.configure` | Configure inbound email domain |
| **Multi-Channel** | `channel.whatsapp_send` | Send WhatsApp message via Business API |
| **Multi-Channel** | `channel.push_send` | Send web push notification |
| **Revenue** | `revenue.attribution` | Get ecommerce revenue attribution by campaign |
| **Revenue** | `monetization.stats` | Get newsletter monetization stats (MRR, tips, sponsors) |
| **Reports** | `report.generate` | Generate advanced analytics reports (cohorts, heatmaps, funnels) |

---

## Skills

11 pre-built skills that package tools + instructions into guided workflows:

| Skill | Description |
|---|---|
| **Send Transactional Email** | Send password resets, order confirmations, and notifications with confirmation before sending |
| **Manage Email Inbox** | Read, search, reply to, and organize emails across all folders |
| **Create & Send Email Campaign** | Full campaign lifecycle from draft creation to scheduling and analytics |
| **Manage Contacts** | Add, update, search, tag, and manage subscription status for contacts |
| **Check Email Deliverability & Warmup** | Monitor deliverability score, IP warmup progress, bounce and complaint rates |
| **Create Email Template** | Build reusable HTML templates with merge tag personalization |
| **Build Email Automation** | Create automated workflows — welcome series, cart recovery, re-engagement |
| **Optimize Deliverability** | Run full audits, check DMARC/SPF/DKIM, and get AI recommendations |
| **AI Email Content Assistant** | Generate subject lines with predicted scores, create A/B tests, optimize send times |
| **Multi-Channel Messaging** | Send across email, WhatsApp, and web push from one interface |
| **Revenue & Analytics** | Track ecommerce revenue attribution, monetization stats, and advanced reports |

---

## Example Prompts

Once connected, you can say things like:

- "Send a password reset email to user@example.com from hello@myapp.com"
- "Show me the last 10 unread emails in my inbox"
- "Create a welcome campaign for new signups and schedule it for Monday 9am"
- "What's my deliverability score and how can I improve it?"
- "Generate 5 subject line ideas for our Black Friday sale with urgency tone"
- "Add john@example.com to my contacts with tags newsletter and vip"
- "Check DMARC and SPF for example.com"
- "Send a WhatsApp message to +1234567890"
- "Which campaign generated the most revenue last month?"
- "Run a full deliverability audit and show recommendations"

---

## Distribution

MisarMail MCP is available on all major registries:

| Platform | Link |
|---|---|
| **npm** | [npmjs.com/package/misarmail-mcp-server](https://npmjs.com/package/misarmail-mcp-server) |
| **Smithery** | [smithery.ai/server/misarmail/misarmail](https://smithery.ai/server/misarmail/misarmail) |
| **mcp.so** | [mcp.so/server/misarmail](https://mcp.so/server/misarmail) |
| **mcpservers.org** | [mcpservers.org/server/misarmail](https://mcpservers.org/server/misarmail) |
| **mcpserver.dev** | [mcpserver.dev/server/misarmail](https://mcpserver.dev/server/misarmail) |
| **awesome-mcp-servers** | Listed under Email & Marketing category |
| **Glama** | [glama.ai/mcp/servers/misarmail](https://glama.ai/mcp/servers/misarmail) |
| **Cursor Directory** | Listed under Productivity & Email |
| **Docker Hub** | `ghcr.io/mrgulshanyadav/misarmail-mcp` |

---

## Links

- **Website**: [mail.misar.io](https://mail.misar.io)
- **Documentation**: [mail.misar.io/docs](https://mail.misar.io/docs)
- **npm**: [npmjs.com/package/misarmail-mcp-server](https://npmjs.com/package/misarmail-mcp-server)
- **Smithery**: [smithery.ai/server/misarmail/misarmail](https://smithery.ai/server/misarmail/misarmail)
- **Author**: [Misar AI](https://misar.io)

---

## License

MIT — see [LICENSE](LICENSE)
