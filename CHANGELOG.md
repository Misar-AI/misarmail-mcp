# Changelog

All notable changes to the MisarMail MCP Server are documented here.

## [2.0.0] - 2026-03-21

### Added — 15 New Tools (17 → 32 total)

**Automation**
- `automation.list` — List automation workflows with status filtering
- `automation.create` — Create automation workflow with trigger configuration

**A/B Testing**
- `abtest.create` — Create A/B test variant for a campaign (subject, body, send %)
- `abtest.winner` — Select the winning A/B test variant by metric

**AI Content**
- `ai.subject_lines` — Generate AI-powered subject line suggestions with predicted open rate scores

**Contact Intelligence**
- `contact.score` — Get contact engagement score, tier (hot/warm/neutral/cold), and churn risk

**Landing Pages**
- `landing_page.create` — Create a landing page with block-based content (hero, text, CTA, form, etc.)

**Inbound Email**
- `inbound.configure` — Configure inbound email processing domain with webhook delivery

**Deliverability**
- `dmarc.check` — Check domain DMARC/SPF/DKIM/MX health with 0-100 score
- `deliverability.audit` — Run full deliverability audit with actionable recommendations

**Multi-Channel**
- `channel.whatsapp_send` — Send WhatsApp message via Business API (template or free-form)
- `channel.push_send` — Send web push notification to browser subscribers

**Revenue & Analytics**
- `revenue.attribution` — Get ecommerce revenue attribution by campaign
- `monetization.stats` — Get newsletter monetization statistics (MRR, tips, sponsors)
- `report.generate` — Generate advanced analytics reports (cohorts, heatmaps, funnels)

### Added — 5 New Skills

- `build_automation` — Guide for building email automation workflows
- `optimize_deliverability` — Deliverability audit and optimization workflow
- `ai_content_assistant` — AI subject line generation with A/B testing
- `multi_channel_messaging` — Cross-channel messaging (email + WhatsApp + push)
- `revenue_analytics` — Revenue attribution, monetization stats, and advanced reports

### Added — 2 New Prompts

- `automation_builder_guide` — Step-by-step automation workflow creation guide
- `deliverability_improvement_plan` — Analyze score and create improvement roadmap

### Changed

- Updated MCP server version from 1.0.0 to 2.0.0
- Updated server description to reflect expanded capabilities
- Added 10 new tags: ai, deliverability, dmarc, ab-testing, whatsapp, push-notifications, analytics, landing-pages, monetization, ecommerce
- Added 5 new usage examples in smithery.yaml

### Platform Features (backing the new tools)

These platform features were built to support the new MCP tools:

| Feature | Migration | Tables Added |
|---------|-----------|-------------|
| Email Validation | 064 | validation_credits, validation_logs |
| Visual Automation Builder | 065 | flow_data column on automation_workflows |
| A/B Testing Expansion | 066 | subject_line_tests, automation_ab_results, send_time_experiments |
| Inbound Email Processing | 067 | inbound_domains, inbound_emails |
| Dedicated IP Management | 068 | dedicated_ips, ip_reputation_log, ip_warmup_schedule |
| DMARC Monitoring | 069 | monitored_domains, dmarc_reports, dns_check_history |
| Contact Scoring Engine | 070 | scoring_rules, score_events |
| Landing Page Builder | 071 | landing_pages, page_visits |
| Newsletter Monetization | 072 | newsletter_tiers, newsletter_subscriptions, sponsor_placements, tips, revenue_ledger |
| WhatsApp/Push Channels | 073 | channel_configs, whatsapp_messages, push_subscriptions, push_notifications |
| Ecommerce Attribution | 074 | purchase_events, tracking_events, revenue_attribution_daily |
| AI Deliverability Manager | 075 | deliverability_scores, deliverability_audits, blacklist_checks |
| Advanced Analytics | 076 | saved_reports, send_time_performance, engagement_funnels |
| Template Marketplace | 077 | template_reviews, template_purchases, template_submissions |
| Referral Program | 078 | referral_milestones, referral_milestone_claims, referral_rewards |
| Plan Limits for Features | 079 | 17 new columns on subscription_plans |
| Overage Billing | 080 | overage_usage, overage_rates, overage_alerts |
| Trial Flow Fix | 081 | Fixed provision_free_plan() |

### Pricing & Billing

- 4-tier pricing: Free / Pro ($24.99/mo) / Max ($99.99/mo) / Enterprise (custom)
- Stripe Products and Prices created and wired
- 14-day Pro trial with card upfront (Stripe-managed)
- Overage billing (opt-in, default OFF) with spend limits
- Usage-based pricing for overages

---

## [1.0.0] - 2026-02-21

### Initial Release

- 17 MCP tools: email (5), campaigns (4), contacts (3), templates (1), analytics (2), account (2)
- OAuth 2.0 + API key authentication
- 6 skills: send email, manage inbox, run campaigns, manage contacts, check deliverability, create templates
- 3 prompts: compose email, campaign report, contact import guide
- Published to Smithery.ai and MCP Registry
- Streamable HTTP transport (MCP 2025-03-26)
