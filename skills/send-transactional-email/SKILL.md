---
name: send-transactional-email
description: Send a one-off or transactional email through MisarMail. Use when the user asks to send, draft-and-send, or reply to an email — including receipts, notifications, welcome messages, and personal outreach.
---

# Send a transactional email

## Before sending

1. **Resolve a verified sender.** Call `list_domains`. `from.email` must belong
   to a verified domain — an unverified sender is the single most common send
   failure, and the API rejects it outright.
2. **Validate unfamiliar recipients.** Call `validate_email` for addresses the
   user typed by hand. Bounces damage sender reputation far more than the one
   email is worth.
3. **Show the draft and wait.** Present subject and body, and get explicit
   confirmation. Sending is irreversible.

## Sending

Call `send_email` with `from`, `to`, `subject`, and `html` (plus `text` as a
fallback — some clients and filters penalise HTML-only mail).

Pass `idempotency_key` whenever a retry is plausible: without it a network
timeout that actually succeeded will deliver the message twice.

## Testing without delivering

If the user is iterating on wording or a template, suggest sandbox mode: sends
are captured instead of delivered, and `list_sandbox_sends` shows exactly what
would have gone out. `clear_sandbox` resets it.

## Do not

- Send to a list you assembled from `list_contacts` — that is a campaign. Use
  `create_campaign` + `send_campaign`, which applies unsubscribe handling and
  rate limiting that `send_email` does not.
- Invent a sender address. If no verified domain exists, say so and point the
  user at `add_domain`.
