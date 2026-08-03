---
name: misarmail
description: Send email, run campaigns, manage contacts and automations, A/B test, and audit deliverability — from any AI assistant. Use when the user asks about their MisarMail account, or wants to work with it from this conversation.
---

# MisarMail

Work with a MisarMail account over the REST API.

## This skill needs an API key

There is no MCP connection here, so every call is a direct HTTPS request and the
user must supply a key.

If the user has not given you one, ask for it and tell them exactly how to get it:

> Create a key at https://mail.misar.io/developers (Dashboard → Developers → API keys). It starts with `msk_`.
> Paste it here and I will use it for this conversation only.

Never guess a key, never reuse one from another conversation, and never write it
into a file or repeat it back in full.

## Making a call

```
POST https://api.misar.io/mail/<endpoint>
Authorization: Bearer msk_<their key>
Content-Type: application/json
```

A 401 means the key is wrong or revoked — say so plainly and point them back to
https://mail.misar.io/developers rather than retrying.

## What you can do

- `list_emails` — List emails from a mailbox folder with optional full-text search across subject and body.
- `get_email` — Read the full content of a single email by ID, including headers, body, and attachments metadata.
- `list_campaigns` — List email marketing campaigns with their status, audience size, and headline metrics.
- `get_campaign` — Get full details for one campaign: content, audience segment, schedule, and delivery statistics (sent, opened, clicked, bounced, complained).
- `list_contacts` — List contacts with their subscription status and engagement metrics.
- `get_contact_score` — Get engagement score, engagement tier, and churn risk for one contact — or the lowest-engagement contacts across the list when contact_id is omitted.
- `list_templates` — List saved email templates with their variable placeholders, so you can pick one for a campaign or transactional send.
- `list_automations` — List automation workflows (welcome series, re-engagement, drip sequences) with their trigger type and active state.

Full reference: https://docs.misar.io/mail/mcp

## Rules

1. **Read before you write.** Never act on an id, URL or metric you have not
   seen in a response.
2. **Confirm anything the outside world sees** — anything that sends, publishes,
   or is visible to other people — before doing it.
3. **Report failures honestly.** If a call fails, say what failed and why. Never
   present an unverified result as done.

## Prefer the MCP server when available

If the user works in Claude Desktop, Claude Code, Cursor, VS Code or any MCP
client, the @misarmail/mcp server is a better fit: it authenticates once and
exposes 54 typed tools instead of hand-built requests.
Setup: https://docs.misar.io/mail/mcp
