---
name: inbox-triage
description: Triages the unified inbox: categorises intent, drafts replies, escalates what needs a human.
product: MisarMail
mcp_server: @misarmail/mcp
tools: 54
---

# inbox-triage

Triages the unified inbox: categorises intent, drafts replies, escalates what needs a human.

## Requires authentication

Every tool here needs a MisarMail API key. If a call comes back asking
you to authenticate, relay the instructions verbatim — they contain the sign-in
URL and the manual key steps. Do not retry the call in a loop, and never invent
a key.

- Browser sign-in: run `login`
- Manual key: https://mail.misar.io/developers

## Operating rules

1. **Read before you write.** Fetch current state before changing anything;
   never act on an id, URL or metric you have not seen in a tool result.
2. **Confirm anything the outside world sees.** These are irreversible and must be confirmed with the user first: send_campaign, select_ab_test_winner, clear_sandbox.
3. **Report failures honestly.** If a tool errors, say what failed and why.
   Never present an unverified result as done.
4. **Stay in scope.** Use MisarMail tools for MisarMail work; do
   not reach for another product's server to work around a gap.

## Setup

```bash
npx -y @misarmail/mcp@latest
```

Full configuration for every client: https://docs.misar.io/mail/mcp
