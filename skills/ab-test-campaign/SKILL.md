---
name: ab-test-campaign
description: Design and run an A/B test on a MisarMail campaign — subject line, content, sender name, or send time. Use for "A/B test", "split test", "which subject works better", or testing email variants.
---

# A/B test a campaign

## Check the audience is big enough — first

Call `get_campaign` (or `list_campaigns`) for the recipient count.

With the default 20% sample split across two variants, an audience of 10,000
gives ~1,000 per variant. Below that, normal variance swamps the effect and the
"winner" is noise. **Say so plainly and recommend against testing** rather than
running a test that produces a confident-looking but meaningless result.

## Design

`create_ab_test` takes `campaign_id`, a `type`, and 2–5 `variants`:

| Type | Varies | Notes |
|---|---|---|
| `subject` | Subject line | Highest signal, easiest to interpret |
| `content` | Body HTML | Test one change, not a redesign |
| `from_name` | Sender name | Often larger effect than expected |
| `send_time` | Delivery time | Needs a longer measurement window |

For subject tests, `generate_subject_lines` produces candidates. Test variants
that differ in *approach* (question vs. statement, specific vs. curiosity), not
in wording trivia — two near-identical subjects cannot produce a real winner.

Set `winner_metric` to match the goal: `open_rate` for subject tests,
`click_rate` or `conversion_rate` for content.

## Selecting the winner

`select_ab_test_winner` **sends the winning variant to the entire remaining
audience**. It is irreversible. Do not call it until results are in, and never
without explicit confirmation.

Let the sample run at least 4 hours — opens arrive over hours, and an early
reading systematically favours whichever variant reached the more active
segment first.
