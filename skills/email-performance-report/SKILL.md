---
name: email-performance-report
description: Produce a MisarMail performance report — opens, clicks, deliverability, revenue attribution. Use for "how are my emails doing", weekly/monthly reports, or campaign performance analysis.
---

# Email performance report

## Gather

- `get_analytics` — sends, delivers, opens, clicks, bounces, complaints
- `list_campaigns` with `status=sent` — per-campaign comparison
- `get_deliverability_score` — reputation context for the numbers
- `get_revenue_attribution` — revenue attributed to email
- `get_monetization_stats` — newsletter subscription revenue
- `generate_report` — `campaign_performance`, `engagement_funnel`,
  `cohort_analysis`, or `send_time_heatmap`

## Interpret, do not just report

Every metric needs a reference point:

| Metric | Healthy | Read as |
|---|---|---|
| Open rate | 20–25% | Subject line + sender reputation |
| Click rate | 2–5% | Content relevance and offer |
| Bounce rate | under 2% | List quality; above 5% is urgent |
| Complaint rate | under 0.1% | Consent and expectation-setting |

Apple Mail Privacy Protection inflates open rates by auto-fetching images.
Treat open rate as directional and lean on clicks for anything that matters.

## Structure

Headline metrics; best and worst campaign each with a one-line reason;
deliverability status; revenue; then the single highest-impact action for the
next period.

Keep it under 400 words. If a figure was unavailable, say so — never estimate
a number and present it as measured.
