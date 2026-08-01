---
name: clean-contact-list
description: Audit and clean a MisarMail contact list — bounced, complained, and unengaged contacts. Use for list hygiene, re-engagement, suppression, or "why is my open rate falling".
---

# Clean a contact list

## Assess

- `list_contacts` with `status=bounced` and `status=complained` — these must
  never be mailed again. Continuing to send to them is what turns a reputation
  problem into a blocklisting.
- `get_contact_score` with no `contact_id` returns the lowest-engagement
  contacts.
- `get_analytics` for the open-rate trend over time.

Report what share of the list each category represents. Percentages, not raw
counts alone — "412 bounced" means nothing without the list size.

## Recommend, then ask

Propose which segments to suppress and which to try re-engaging first. A
re-engagement campaign to genuinely unengaged contacts is usually worth one
attempt before suppression; contacts who complained are not.

**Never call `update_contact` to unsubscribe anyone without explicit
per-segment approval.** Unsubscribing is effectively irreversible from the
user's perspective and they may be reacting to a number they misread.

## Importing

When importing, `import_contacts` handles up to 5,000 per call and updates
rather than duplicates existing addresses. Before a large import, confirm the
contacts opted in — mailing a purchased or scraped list breaches CAN-SPAM and
GDPR and will damage the sending domain for every other campaign.

Spot-check a sample with `validate_email` first and report the rejected rows.
