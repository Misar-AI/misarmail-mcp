---
name: audit-deliverability
description: Diagnose why MisarMail emails land in spam or bounce, and produce a prioritized fix list. Use for "emails going to spam", "not being delivered", "low open rate", "domain reputation", DMARC/SPF/DKIM, or blocklist questions.
---

# Audit deliverability

## Gather everything before concluding

Run all four — a partial picture produces the wrong recommendation:

| Tool | What it tells you |
|---|---|
| `get_deliverability_score` | Headline score 0–100 and grade, with contributing factors |
| `run_deliverability_audit` | Detailed findings across auth, reputation, content, blocklists |
| `check_dmarc` (per domain from `list_domains`) | Live SPF/DKIM/DMARC records and alignment failures |
| `get_warmup_status` | Whether volume is exceeding warm-up capacity |

Also call `list_contacts` with `status=bounced` and `status=complained` — a
dirty list depresses deliverability no matter how good the DNS is.

## Report

Group findings by impact (high / medium / low). Every item must name the
**specific** record, setting, or segment to change. "Improve your SPF record"
is not actionable; "add `include:_spf.misar.io` to the TXT record on
example.com, which currently reads `v=spf1 -all`" is.

## Common causes, in the order they actually occur

1. **Missing or misaligned DMARC/SPF/DKIM** — by far the most frequent. A
   `From:` domain that does not align with the signing domain fails
   authentication at Gmail and Outlook regardless of content.
2. **Sending above warm-up capacity** on a new domain or IP.
3. **List hygiene** — mailing bounced or long-unengaged addresses. See the
   `clean-contact-list` skill.
4. **Content signals** — link shorteners, image-only bodies, missing text part.

## Do not

- Recommend changes to a domain you have not called `check_dmarc` on.
- Report a score without saying what is dragging it down.
