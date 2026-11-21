# Rezorb: Market, Revenue and Scaling

Status: **working model, not a forecast.** Written 2026-11-21. Nothing here has been validated with real
users yet. The point of this document is to make every assumption visible so each one can be tested and
replaced with a measured number.

## 1. How to read it

- **[S]** = taken from a published source (linked in section 11). Where sources disagree, the range is kept.
- **[A]** = my assumption. These are the numbers to attack first.
- Every figure below is produced by the formulas shown. Change an assumption and redo the arithmetic.
- The model is linear: revenue scales in proportion to each factor. Section 8 uses that to show which
  assumption matters most.
- I read search summaries of the sources, not the full reports. The survey figures give context; they do not
  directly measure "people who need Rezorb". That gap is why the key inputs are assumptions.

## 2. The product, in the terms the market model needs

Rezorb moves text, images and files between **a person's own devices** through a browser, with nothing to
install. Its one structural edge over free alternatives (PairDrop, Snapdrop, Apple Universal Clipboard,
Phone Link, KDE Connect, Telegram "Saved Messages") is that it works on **machines where the user cannot
install software** and across **ecosystems that do not talk to each other** (Windows work laptop, Mac or
Android personal devices).

That edge defines who can be a customer, so it drives the filters in the SAM below.

## 3. Inputs

| Input | Value | Basis |
|-------|-------|-------|
| Professional developers worldwide | 20.8M (JetBrains) to 36.5M (SlashData); Evans Data says 27M for all developers | [S], and the sources disagree. Definitions differ. Base case uses 28M |
| Americans who freelanced in 2023 | 64M, 38% of the US workforce | [S], a broad definition that includes side gigs |
| Share of those who are skilled, computer-based freelancers | 20% | [A] |
| Workers who use a personal device for work | 76%; 53% daily | [S], SurveyMonkey 2024. Context only |
| Organizations that block corporate access on some personal mobile devices | 97% | [S], Omdia 2024. Context only |
| Knowledge workers in hybrid arrangements | 58% | [S], Future Forum, Jan 2022. Dated. Context only |
| Share of developers who regularly move things between a managed device and a personal one | 20% low, 35% base, 50% high | [A] |
| Same, for freelancers (client-issued machines, VDI) | 15% low, 25% base, 35% high | [A] |
| Price (Pro, billed annually) | $48 a year ($4 a month) | [A], a placeholder until a price test |

## 4. TAM: everyone with the problem, paying the Pro price

TAM here means individuals only, at the Pro price. Company budgets are excluded (see 5.3).

| | Low | Base | High |
|---|---|---|---|
| Developers (pool) | 20.8M | 28M | 36.5M |
| x share with the problem | 20% | 35% | 50% |
| = developers with the problem | 4.2M | 9.8M | 18.3M |
| US freelancers (pool = 64M x 20%) | 12.8M | 12.8M | 12.8M |
| x share with the problem | 15% | 25% | 35% |
| = freelancers with the problem | 1.9M | 3.2M | 4.5M |
| **People** | **6.1M** | **13.0M** | **22.7M** |
| **TAM at $48 a year** | **$0.29B** | **$0.62B** | **$1.09B** |

The upside not counted is **companies paying per seat** for a sanctioned way to hand off between managed and
personal devices. It could be many times larger, but no source I found grounds it, so it is left out
rather than invented.

## 5. SAM and SOM

### 5.1 SAM: the slice this product can serve today

Three filters, all assumptions:

| Filter | Base | Why |
|--------|------|-----|
| Developers in markets we can serve in English (US, UK, Canada, Australia, Western Europe) | 45% | [A] Product is English-only and card-billed |
| Freelancers | 100% | Already US-only in the pool |
| Cannot install software on the managed device | 50% | [A] The only real edge over PairDrop or KDE Connect; the single most important filter |

- Developers: 9.8M x 45% x 50% = **2.2M**
- Freelancers: 3.2M x 50% = **1.6M**
- **SAM = 3.8M people, about $183M a year**

### 5.2 SOM: what a small team could win in about 24 months (prosumer only)

Conversion rates below are rules of thumb that I have not sourced. Treat them as the first things to measure.

| Funnel step | Low | Base | High |
|---|---|---|---|
| Reach: share of SAM that ever visits | 2% | 3% | 5% |
| Use it on two devices (activation) | 25% | 35% | 45% |
| Convert to paid | 2% | 3% | 4% |
| People reached | 76K | 114K | 190K |
| Activated | 19K | 40K | 86K |
| **Paying users** | **380** | **1,200** | **3,400** |
| **Annual revenue (x $48)** | **$18K** | **$58K** | **$164K** |

Prosumer-only revenue is a **side income**. It becomes a business only if reach is much larger than
assumed or a second plan is added.

### 5.3 Scenario: add a Team plan

| | Value |
|---|---|
| Teams (design partners converting) | 30 |
| Seats per team | 20 |
| Price per seat | $7 a month = $84 a year |
| **Annual revenue** | **30 x 20 x $84 = $50K** |

This is a scenario, not a forecast. It needs an admin console, SSO, audit logs and retention policies
first, and sales cycles are long. Combined with the base prosumer case it is roughly **$108K ARR** at about
24 months.

## 6. Pricing and unit economics

### 6.1 Packaging

| | Free | Pro | Team |
|---|---|---|---|
| Price | $0 | $4 a month or $48 a year | $7 per seat a month, minimum 5 seats |
| Spaces | 2 | 10 | Shared and per-team |
| File size | 50 MB | 1 to 2 GB | 2 GB |
| Retention | up to 24 h | up to 30 days | policy set by an admin |
| End-to-end encryption | no | yes | yes |
| CLI and API | no | yes | yes |
| Admin, SSO, audit | no | no | yes |

The limits above are a starting point. Today's actual limits (50 MB, 1 GB total, 10 Spaces, 7 days) are in
the PRD; the paid tiers are not built.

### 6.2 What a customer costs

- **Payment fees:** Stripe's standard US card rate is about 2.9% + $0.30 per charge (verify current rates).
  On a $4 monthly charge that is **about 10.4%**; on a $48 annual charge it is **about 3.5%**. Push annual plans.
- **Storage:** R2 has no egress fees, which matters because the product is download-heavy. Verify current
  per-GB pricing, but a few GB of short-lived files per user is a small cost.
- **Fixed costs:** Vercel Pro (the Hobby plan is non-commercial only), a domain, and a transactional email
  provider. Assume roughly **$50 to $100 a month** early on (an estimate; check current pricing).
- **Realtime (Ably):** priced by connections and messages, so it is the line most likely to grow with usage.
  Watch it.

**Break-even on fixed costs:** about 25 paying users at $48 a year.

## 7. Scaling stages: gates, not dates

Spend effort only when the previous gate is passed. These are decision rules, not predictions.

| Stage | Goal | Gate to move on |
|-------|------|-----------------|
| 0. Pre-launch | Run on real services, close the release blockers ([RELEASE_PLAN.md](RELEASE_PLAN.md)) | First-deploy checklist passes; you use it daily for two weeks |
| 1. Validate | Prove someone will pay before building billing | Waitlist plus a pre-sale: 20 or more people actually pay (for example a $29 lifetime deal), and 20 interviews say the pain is real |
| 2. Prosumer launch | Free tier plus Pro; first distribution | Activation at least 35% (PRD target: 50%); week-4 retention you would be happy with; first organic signups |
| 3. Build the habit | Daily use: CLI, phone share-target, extension | Weekly active users rising without new launches |
| 4. Team | 3 to 5 design partners on a Team plan | Partners renew; one writes a purchase order |

**Stop signal:** if week-4 retention is poor and almost nobody pre-pays, adding features will not fix it.
The pain is not strong enough.

## 8. Which assumption matters most

Because the model is linear, each change scales revenue in proportion:

| Change | Effect on SOM revenue |
|--------|----------------------|
| Reach 3% to 6% | x2 |
| Conversion 3% to 1.5% | x0.5 |
| "Cannot install" share 50% to 25% | x0.5 (it shrinks SAM) |
| Activation 35% to 50% | x1.43 |
| Price $48 to $60 | x1.25 |
| Developers pool 28M to 20.8M | about x0.85 overall (the developer half of SAM falls by about 26%) |

Reach and the "cannot install" filter swing the answer the most. Measure those two first.

## 9. Scaling the infrastructure

Where the current architecture will strain, in the order it is likely to hurt (see
[ARCHITECTURE.md](ARCHITECTURE.md) and [DEPLOYMENT.md](DEPLOYMENT.md)):

| Pressure | Why | What to do |
|----------|-----|------------|
| **Polling load** | In poll mode every open device refetches every 2.5 s, which is 0.4 requests a second per device. 1,000 devices polling is about 400 requests a second | Configure Ably so devices are realtime and the polling stops. Polling is only a fallback |
| **Rate limits per instance** | Without Upstash the limiter is in memory per serverless instance, so it is weak under load | Set the Upstash environment variables before launch |
| **Database connections** | Each serverless instance holds a small pool (5 in production) | Use Neon's pooled URL (already the default); watch connection counts |
| **Storage growth** | Expiry frees space only when the cron runs (daily as committed) | Move to hourly on Vercel Pro; keep the R2 lifecycle rule as a backstop |
| **Abuse** | A free file host attracts abuse | Terms, abuse reporting, and malware scanning before any sharing feature |
| **Quota query** | Storage used is a SUM per upload, under a per-user advisory lock | Fine at current limits; revisit if limits grow by orders of magnitude |
| **Realtime cost** | Ably is billed by usage | Cap devices per user (already 10); monitor |

## 10. What would change this model

- A measured "has the problem regularly" share (the biggest single input) from your first 20 users.
- A real price test replacing the $48 placeholder.
- A real source for the number of employees on managed devices, which would let a Team TAM be added.
- Regional pools for the SAM geography filter (SlashData publishes regional splits; I did not retrieve them).
- Evidence about how many people cannot install software, which is the filter the whole edge depends on.

## 11. Sources

All figures marked [S] come from these. I read search summaries, not the full reports.

- Developers: [SlashData, global developer population 2025](https://slashdata.co/post/global-developer-population-trends-2025-how-many-developers-are-there), [JetBrains Research](https://blog.jetbrains.com/research/2025/01/global-developer-population-2024/), [Evans Data](https://evansdata.com/devpopulation)
- Freelancers: [Upwork, 64 million Americans freelanced in 2023](https://investors.upwork.com/news-releases/news-release-details/upwork-study-finds-64-million-americans-freelanced-2023-adding)
- Personal devices at work: [SurveyMonkey workplace report 2024](https://uk.surveymonkey.com/curiosity/surveymonkey-research-workplace-culture-and-trends-2024/), [Omdia via Palo Alto Networks](https://www.paloaltonetworks.com/resources/research/the-state-of-workforce-security-key-insights-for-it-and-security-leaders.viewer.html)
- Hybrid work: [Future Forum pulse, Jan 2022](https://slack.com/intl/en-gb/blog/news/leveling-the-playing-field-in-the-new-hybrid-workplace)

Not sourced, and flagged where used: payment, hosting and email prices (verify before relying on them), and
every conversion rate.
