---
name: build-email-automation
description: Design and build a MisarMail automation workflow — welcome series, drip sequence, re-engagement, or onboarding. Use for "automate", "drip", "welcome series", "sequence", or trigger-based email.
---

# Build an email automation

## 1. Check what already exists

`list_automations` first. Two automations on the same trigger will both fire,
and the contact receives duplicate mail — a failure users usually discover from
a complaint rather than from the dashboard.

## 2. Design before building

Choose a trigger: `contact_created`, `tag_added`, `campaign_opened`,
`link_clicked`, or `date_based`. Then lay out the steps with explicit delays
and explain each choice to the user.

Practical guidance worth stating:
- First email within an hour of the trigger; the rest spaced 2–4 days.
- Keep a welcome series to 3–5 emails. Longer sequences bleed unsubscribes.
- Include an exit condition (a tag applied on conversion) so a converted
  contact stops receiving the sequence.

## 3. Build it inactive

`create_automation` with `active: false`. Show the result via `get_automation`
and let the user read the steps back before anything can fire.

Only call `toggle_automation` with `active: true` after explicit confirmation.
Activating starts enrolling live contacts immediately.

## Templates

`list_templates` and `create_template` — use `{{variable}}` placeholders and
preview substitution with `render_template` before wiring a template into a
step. An automation that ships `Hi {{first_name}}` to contacts with no first
name is a visible, embarrassing failure.
