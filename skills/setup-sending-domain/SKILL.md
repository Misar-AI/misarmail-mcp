---
name: setup-sending-domain
description: Add and verify a custom sending domain in MisarMail, including SPF, DKIM, DMARC, and inbound routing. Use for "send from my own domain", DNS setup, domain verification, or inbound email.
---

# Set up a sending domain

## 1. Add it

`add_domain` returns the DNS records to publish. Give the user the exact record
type, host, and value — a paraphrase produces a broken record.

## 2. Wait, then verify

`verify_domain` re-checks DNS. Propagation takes minutes to 48 hours, so a
failure right after publishing is expected rather than an error. Say that
instead of letting the user think something is wrong.

`check_dmarc` shows what is actually resolving publicly, which is the fastest
way to spot a record pasted into the wrong host (a very common mistake:
`_dmarc.example.com` published as `_dmarc.example.com.example.com`).

## 3. Warm up before volume

`get_warmup_status` — a new domain has no reputation. Ramping gradually is what
separates a domain that lands in the inbox from one that lands in spam
permanently. Do not let a user send a large first campaign from a brand-new
domain without flagging the risk.

## DMARC policy

Start at `p=none` (monitor only), then move to `quarantine` and finally
`reject` once `check_dmarc` shows SPF and DKIM aligned and passing. Jumping
straight to `p=reject` before alignment is confirmed silently blackholes
legitimate mail.

## Inbound

`configure_inbound_domain` routes replies into the unified inbox and returns
the MX record to publish. Use a subdomain (`reply.example.com`) so it cannot
interfere with the organisation's primary mail.
