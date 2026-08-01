---
name: run-email-campaign
description: Create, review, and send a bulk email campaign in MisarMail. Use when the user wants to email a list, newsletter, segment, or announcement to many recipients.
---

# Run an email campaign

A campaign sends real email to many people and cannot be recalled. Treat every
step as requiring confirmation.

## 1. Check capacity first

Call `get_warmup_status`. Sending above warm-up capacity on a young domain is
the fastest route to throttling or a blocklist. If the audience exceeds the
remaining daily capacity, say so and offer to split the send across days.

Call `get_deliverability_score` too — sending a large campaign from an account
already scoring poorly compounds the damage.

## 2. Build it

- `list_templates` / `render_template` to reuse existing design, or supply
  inline `html`.
- `create_campaign` creates a **draft**. It never sends.
- Confirm the audience with `get_campaign` and report the recipient count back
  to the user in plain numbers before going further.

## 3. Send

- `send_campaign` sends immediately.
- `send_campaign` with `scheduled_at` schedules it.

Get explicit confirmation of the recipient count and the subject line first.

## 4. Report

After sending, `get_analytics` with the campaign id. Useful reference points:
open 20–25%, click 2–5%, bounce under 2%, complaints under 0.1%. Flag anything
outside those ranges rather than reporting the number without context.

## Testing

Suggest an A/B test on the subject line when the audience is large enough —
see the `ab-test-campaign` skill. Below roughly 1,000 recipients per variant a
test will not produce a trustworthy winner; say so instead of running one.
