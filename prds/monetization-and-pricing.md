# Monetization & Pricing Strategy - Product Requirements Document

**dispatched_by: mayor**

## Executive Summary

This PRD defines the monetization strategy for GreekWheel, transitioning from a fully free product to a freemium model. The free tier allows users to track up to 20 trades (lifetime), providing enough value to learn the wheel strategy and validate GreekWheel as their tool of choice. Paid users get unlimited trades and access to the full feature set. This document covers the free tier design, payment provider analysis, implementation plan, and required marketing changes.

**Document Version:** 1.0
**Last Updated:** 2026-02-14
**Status:** Draft

---

## Table of Contents

1. [Background & Problem Statement](#background--problem-statement)
2. [Free Tier Design](#free-tier-design)
3. [Paid Tier Design](#paid-tier-design)
4. [Payment Provider Analysis](#payment-provider-analysis)
5. [Technical Implementation](#technical-implementation)
6. [Marketing & Homepage Changes](#marketing--homepage-changes)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Success Metrics](#success-metrics)

---

## Background & Problem Statement

### Why Monetize Now

GreekWheel is a niche, high-value tool for options wheel traders. The core product is functional: trade tracking, wheel rotation management, benchmark comparisons, and Greek calculations. We've validated that the product solves a real problem for the r/optionswheel community. Now we need sustainable revenue to fund continued development, server costs, and market data APIs.

### The Core Tension

**Too restrictive** = users never experience enough value to pay.
**Too generous** = users never need to pay.

The wheel strategy is inherently slow—most traders make 2-8 trades per month. A user who sells a cash-secured PUT, gets assigned, sells a covered CALL, and gets called away has completed one full rotation with 4 trade entries. The free tier needs to let users complete at least a few full rotations before hitting the wall.

### Why 20 Trades

| Trades | Wheel Rotations | Timeline (est.) | Verdict |
|--------|----------------|-----------------|---------|
| 5 | ~1 partial | 2-4 weeks | Too restrictive—can't complete a full cycle |
| 10 | ~1-2 | 1-2 months | Borderline—power users hit wall too fast |
| **20** | **~3-5** | **2-4 months** | **Sweet spot—enough to validate, not enough to never pay** |
| 50 | ~8-12 | 6-12 months | Too generous—most casual traders never hit it |
| Unlimited | ∞ | Forever | No monetization path |

**20 trades means:**
- A new trader can track 3-5 full wheel rotations
- Enough data accumulates for the benchmark comparison to be meaningful
- Users experience the full product value (positions, wheels, P&L tracking)
- Active traders hit the limit within 2-4 months, creating natural conversion pressure
- The limit is easy to understand and communicate

### What Counts as a Trade

A "trade" is any record created via the `createTrade` server action. This includes:
- Selling a cash-secured PUT (SELL_TO_OPEN)
- Buying back an option early (BUY_TO_CLOSE, which creates a new trade record for the closing side)
- Selling a covered CALL (SELL_TO_OPEN)
- Rolling an option (creates a new trade)

Positions, wheels, benchmarks, and deposits do **not** count against the trade limit. These are derived from trades and should remain unlimited to avoid confusing the value proposition.

**Deleted trades do not restore the count.** This prevents gaming the limit by deleting old trades to make room. The counter tracks lifetime trades created, not current active trades.

---

## Free Tier Design

### What Free Users Get

| Feature | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Trade tracking | 20 trades (lifetime) | Unlimited |
| Positions & assignments | Unlimited | Unlimited |
| Wheel rotation tracking | Unlimited | Unlimited |
| Cash deposits & benchmarks | Unlimited | Unlimited |
| Dashboard & P&L | Full access | Full access |
| Greek calculations | Full access | Full access |
| Trade history & export | Full access | Full access |
| User guide & help | Full access | Full access |

The free tier is deliberately generous on everything except the core input action (creating trades). This ensures:
1. Users experience the full product quality before paying
2. The limit is simple to understand ("you've used 17 of 20 free trades")
3. Read-only features (dashboard, analytics, benchmarks) remain fully functional even after hitting the limit

### Trade Limit UX

**Progressive warnings:**

| Trades Used | UX Treatment |
|------------|--------------|
| 1-14 | No indication of limit. Full experience. |
| 15 | Subtle banner: "You've used 15 of 20 free trades." |
| 18 | Warning on trade form: "2 trades remaining. Upgrade for unlimited tracking." |
| 19 | Prominent banner: "1 trade remaining. After this, you'll need to upgrade." |
| 20 | Trade form disabled. Full-screen upgrade prompt with clear value prop. |
| 20+ (paid) | No limit indicators. Clean experience. |

**After hitting the limit:**
- Users can still view all existing trades, positions, wheels, and analytics
- Users can still update trade statuses (mark as expired, assigned, closed)
- Users can still record deposits and manage benchmarks
- Users **cannot** create new trades via `createTrade`
- The "New Trade" button shows an upgrade prompt instead

### Trade Counter Implementation

The trade counter is based on a simple count query, not a stored field. This avoids synchronization issues:

```
tradeCount = SELECT COUNT(*) FROM Trade WHERE userId = ?
```

This counts all trades ever created by the user, regardless of status (OPEN, CLOSED, EXPIRED, ASSIGNED) or whether they've been deleted. Since `deleteTrade` only allows deleting OPEN trades and we want to prevent gaming, we have two options:

**Option A (Simpler):** Count existing trades in the database. Deleted trades don't count. Accept that some users may game this by deleting and re-creating trades. At 20 trades, the gaming surface is small and not worth over-engineering.

**Option B (Stricter):** Add a `lifetimeTradeCount` integer field to the User model. Increment on every `createTrade` call. Never decrement. This is un-gameable but requires a schema migration.

**Recommendation:** Start with Option A. If abuse is detected, migrate to Option B. The difference only matters for users actively trying to game the system, which is unlikely given the niche audience.

---

## Paid Tier Design

### Pricing

**Single paid tier: $8/month or $72/year ($6/month)**

Justification:
- Options traders are a high-income niche. $8/month is a rounding error compared to the capital they deploy.
- Comparable tools (OptionStrat, OptionAlpha) charge $20-50/month. Our pricing is deliberately lower to capture the "it's so cheap, why not" tier.
- Annual pricing at 25% discount encourages commitment and reduces churn.
- No tiered pricing complexity. One free tier, one paid tier. Simple.

### What Paid Users Get

Everything in free, plus:
- **Unlimited trades** — the only gated feature
- **"Pro" badge** — small visual indicator in the app (optional, low priority)
- **Priority support** — faster response times (when we have support infrastructure)

We intentionally keep the paid tier simple. No feature gates beyond trade count. This avoids the complexity of managing feature flags across the application and keeps the upgrade decision simple: "Do you want to keep tracking trades? Pay $8/month."

### Future Paid Features (Not in Scope)

These are ideas for future upsells, **not part of this PRD**:
- Advanced analytics (Sharpe ratio, risk metrics)
- Brokerage API integrations (auto-import trades)
- Multi-account support
- Tax reporting / CSV exports
- Alert notifications (option expiring, price target hit)

---

## Payment Provider Analysis

### Candidates

We evaluated four payment providers for GreekWheel's subscription model:

#### 1. Stripe

| Criteria | Assessment |
|----------|-----------|
| **Pricing** | 2.9% + $0.30 per transaction. No monthly fees. |
| **Subscription support** | Best-in-class. Stripe Billing handles recurring payments, prorations, plan changes, cancellations, and dunning (failed payment retry) out of the box. |
| **Next.js integration** | Excellent. Official `@stripe/stripe-js` and `stripe` Node.js SDK. Well-documented patterns for App Router server actions. Stripe Checkout provides a hosted payment page (no PCI scope). |
| **Webhook support** | Robust. Sends events for subscription lifecycle (created, updated, canceled, payment failed). Easy to verify signatures. |
| **Free tier handling** | No cost until users pay. No charge for free-tier users. |
| **Developer experience** | Industry-leading documentation. Test mode with test cards. Stripe CLI for local webhook testing. |
| **Risk** | None. Stripe is the default choice for SaaS billing. |

#### 2. Lemon Squeezy

| Criteria | Assessment |
|----------|-----------|
| **Pricing** | 5% + $0.50 per transaction. Significantly more expensive than Stripe. |
| **Subscription support** | Good. Handles recurring billing, but less mature than Stripe. |
| **Next.js integration** | Decent. Official SDK exists. Fewer community examples. |
| **Webhook support** | Basic. Covers core events but fewer lifecycle hooks than Stripe. |
| **Free tier handling** | No cost for free users. |
| **Developer experience** | Good docs but smaller ecosystem. Fewer Stack Overflow answers and blog posts. |
| **Key advantage** | Acts as Merchant of Record — handles sales tax, VAT, and compliance. This is valuable if we sell internationally and don't want to deal with tax collection ourselves. |
| **Risk** | Higher fees eat into revenue on a low-price product. At $8/month, Lemon Squeezy takes ~$0.90 vs Stripe's ~$0.53. |

#### 3. Paddle

| Criteria | Assessment |
|----------|-----------|
| **Pricing** | 5% + $0.50 per transaction (similar to Lemon Squeezy). |
| **Subscription support** | Strong. Mature platform with good subscription management. |
| **Next.js integration** | Paddle.js overlay checkout. Works but less native than Stripe. |
| **Webhook support** | Good. Comprehensive event system. |
| **Free tier handling** | No cost for free users. |
| **Developer experience** | Decent. Documentation is adequate but not as polished as Stripe. |
| **Key advantage** | Merchant of Record (like Lemon Squeezy). Handles global tax compliance. |
| **Risk** | Higher fees. Less community support. Approval process can be slow for new merchants. |

#### 4. RevenueCat

| Criteria | Assessment |
|----------|-----------|
| **Pricing** | Free up to $2,500/month in tracked revenue, then 1% of revenue. Underlying payment processor fees (Stripe/Apple/Google) still apply. |
| **Subscription support** | Excellent — specifically built for subscription management. |
| **Next.js integration** | Primarily mobile-focused (iOS/Android). Web SDK exists but is secondary. |
| **Webhook support** | Good. Cross-platform subscription state management. |
| **Free tier handling** | Free tier of RevenueCat itself covers our early stage. |
| **Developer experience** | Best-in-class for mobile. Web support is newer and less documented. |
| **Key advantage** | If we ever build a mobile app, RevenueCat unifies subscription state across platforms. |
| **Risk** | Overkill for a web-only product. Adds an abstraction layer over Stripe that we don't need yet. |

### Recommendation: Stripe

**Stripe is the clear winner for our current needs.**

| Factor | Stripe | Lemon Squeezy | Paddle | RevenueCat |
|--------|--------|---------------|--------|------------|
| Transaction cost ($8/mo) | $0.53 | $0.90 | $0.90 | $0.53 + 1%* |
| Annual cost ($72/yr) | $2.39 | $4.10 | $4.10 | $2.39 + 1%* |
| Next.js integration | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ |
| Documentation | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★☆ |
| Subscription mgmt | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★★★ |
| Tax compliance | Manual** | Included | Included | Manual** |

*RevenueCat free under $2,500/mo, then 1% on top of Stripe fees.
**Stripe Tax exists as an add-on ($0.50/transaction) if needed later.

**Why not Lemon Squeezy/Paddle for tax compliance?**
GreekWheel is a US-focused niche product (r/optionswheel is predominantly US traders). US sales tax for digital products is manageable, and most states don't tax SaaS subscriptions under certain thresholds. The Merchant of Record advantage isn't worth the ~70% higher per-transaction cost at this stage. If we expand internationally, we can add Stripe Tax or migrate later.

**Why not RevenueCat?**
We're web-only. RevenueCat adds complexity without benefit. If we build a mobile app someday, we can add RevenueCat as a layer on top of Stripe without changing our backend.

---

## Technical Implementation

### Database Schema Changes

**Add subscription fields to User model:**

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified DateTime?
  image         String?
  password      String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Subscription fields (new)
  subscriptionTier   String    @default("free")  // "free" | "pro"
  stripeCustomerId   String?   @unique
  stripeSubscriptionId String?
  subscriptionStatus String?   // "active" | "past_due" | "canceled" | "trialing"
  subscriptionEndsAt DateTime? // When current billing period ends (for grace period)

  // ... existing relations
}
```

**New indexes:**
```prisma
@@index([stripeCustomerId])
@@index([subscriptionTier])
```

### Trade Limit Enforcement

**Modify `createTrade` in `lib/actions/trades.ts`:**

The check happens at the top of the function, after authentication but before validation:

```typescript
export async function createTrade(input: CreateTradeInput): Promise<ActionResult<{ id: string }>> {
  try {
    const validated = CreateTradeSchema.parse(input)

    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    // --- NEW: Check trade limit for free users ---
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    })

    if (user?.subscriptionTier !== 'pro') {
      const tradeCount = await prisma.trade.count({
        where: { userId },
      })

      if (tradeCount >= FREE_TRADE_LIMIT) {
        return {
          success: false,
          error: 'FREE_TIER_LIMIT_REACHED',
        }
      }
    }
    // --- END trade limit check ---

    // ... rest of existing createTrade logic unchanged
  }
}
```

**Constants:**
```typescript
// lib/constants.ts
export const FREE_TRADE_LIMIT = 20
```

**Trade count query helper:**
```typescript
// lib/actions/subscription.ts
export async function getTradeUsage(userId: string): Promise<{
  used: number
  limit: number
  isAtLimit: boolean
  isPro: boolean
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  })

  const isPro = user?.subscriptionTier === 'pro'
  const tradeCount = await prisma.trade.count({ where: { userId } })

  return {
    used: tradeCount,
    limit: isPro ? Infinity : FREE_TRADE_LIMIT,
    isAtLimit: !isPro && tradeCount >= FREE_TRADE_LIMIT,
    isPro,
  }
}
```

### Stripe Integration

**New files:**

```
lib/stripe.ts              — Stripe client initialization
lib/actions/billing.ts     — Server actions for subscription management
app/api/webhooks/stripe/route.ts — Stripe webhook handler
app/pricing/page.tsx       — Pricing page
app/billing/page.tsx       — Billing management page
```

**Stripe client (`lib/stripe.ts`):**
```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export const PLANS = {
  monthly: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID!,
    amount: 800, // $8.00 in cents
    interval: 'month' as const,
  },
  annual: {
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID!,
    amount: 7200, // $72.00 in cents
    interval: 'year' as const,
  },
}
```

**Billing actions (`lib/actions/billing.ts`):**
```typescript
// Create Stripe Checkout session for new subscribers
export async function createCheckoutSession(plan: 'monthly' | 'annual'): Promise<ActionResult<{ url: string }>>

// Create Stripe Customer Portal session for managing subscription
export async function createPortalSession(): Promise<ActionResult<{ url: string }>>

// Get current subscription status
export async function getSubscriptionStatus(): Promise<ActionResult<SubscriptionStatus>>
```

**Webhook handler (`app/api/webhooks/stripe/route.ts`):**

Handles these Stripe events:
- `checkout.session.completed` — User subscribed. Update User model with `subscriptionTier: "pro"`, `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus: "active"`.
- `invoice.payment_succeeded` — Recurring payment went through. Extend `subscriptionEndsAt`.
- `invoice.payment_failed` — Payment failed. Set `subscriptionStatus: "past_due"`. User keeps access for grace period.
- `customer.subscription.updated` — Plan changed or status updated. Sync `subscriptionStatus`.
- `customer.subscription.deleted` — Subscription canceled. Set `subscriptionTier: "free"`, clear subscription fields.

**Grace period on cancellation:**
When a user cancels, they retain "pro" access until `subscriptionEndsAt` (end of current billing period). After that date, `subscriptionTier` reverts to "free". This is handled by checking `subscriptionEndsAt` in the trade limit logic:

```typescript
const isPro = user.subscriptionTier === 'pro' ||
  (user.subscriptionStatus === 'canceled' &&
   user.subscriptionEndsAt &&
   user.subscriptionEndsAt > new Date())
```

### Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_ANNUAL_PRICE_ID=price_...
```

---

## Marketing & Homepage Changes

### Current Homepage Messaging

The current homepage (`app/page.tsx`) says:
- "Free to start"
- "No credit card required"
- "Start Tracking Free"
- "Start Your First Rotation"
- "Start Tracking Your Greeks"

This messaging is accurate for the freemium model and **mostly doesn't need to change**. The key adjustments:

### Required Changes

#### 1. Add Pricing Section to Homepage

Insert a new section between the "Features Deep Dive" and "Social Proof" sections:

```
PRICING SECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Simple, honest pricing.

FREE                          PRO — $8/month
━━━━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━━━━━
✓ 20 trades                   ✓ Unlimited trades
✓ Full dashboard              ✓ Everything in Free
✓ Greek calculations          ✓ Priority support
✓ Wheel tracking
✓ Benchmark comparisons
✓ Cash deposit tracking

[Get Started Free]            [Start Pro — $8/mo]
                              or $72/year (save 25%)

No credit card required to start.
```

#### 2. Update Hero Social Proof Line

**Current:**
```
✓ Free to start
✓ No credit card required
✓ Built for r/optionswheel
```

**Updated:**
```
✓ 20 trades free — no credit card
✓ Unlimited trades for $8/month
✓ Built for r/optionswheel
```

This is more honest about the free tier limits while still leading with "free."

#### 3. Update Footer Pricing Link

**Current:** Footer "Pricing" link goes to `/dashboard` (placeholder).
**Updated:** Link to `/pricing` page (or anchor to the pricing section on homepage).

#### 4. Add Pricing Page (`app/pricing/page.tsx`)

A dedicated pricing page with:
- Side-by-side Free vs Pro comparison
- FAQ section addressing common objections:
  - "What counts as a trade?" — Every option opened or closed.
  - "What happens to my data if I cancel?" — Everything stays. You just can't add new trades.
  - "Can I try Pro before paying?" — The free tier IS the trial. Use all 20 trades first.
  - "What if I need more than 20 trades but can't afford Pro?" — Reach out. We'll work something out.
- Annual vs monthly toggle
- Stripe Checkout integration

#### 5. Update CTA Button Text (Minor)

**Current final CTA:** "Start Tracking Free"
**Updated:** "Start Tracking Free" (no change — this is still accurate)

The existing CTA copy works well with the freemium model. Users start free, experience the product, and convert naturally when they hit the limit.

### What NOT to Change

- **Don't add "limited" language to the hero.** The hero should sell the dream, not the constraint.
- **Don't gate any feature descriptions.** All features listed on the homepage are available to free users.
- **Don't add a comparison table to the hero section.** Keep it clean. The pricing section handles details.
- **Don't remove "No credit card required."** This is still true and reduces signup friction.

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Goal:** Database schema, trade limit enforcement, and basic upgrade prompt.

**Convoy 1A: Schema & Migration**
- [ ] Add subscription fields to User model in `prisma/schema.prisma`
- [ ] Generate and run Prisma migration
- [ ] Add `FREE_TRADE_LIMIT` constant to `lib/constants.ts`
- [ ] Create `lib/actions/subscription.ts` with `getTradeUsage()`
- [ ] Write tests for trade count query

**Convoy 1B: Trade Limit Enforcement**
- [ ] Modify `createTrade` in `lib/actions/trades.ts` to check trade limit
- [ ] Return specific `FREE_TIER_LIMIT_REACHED` error code
- [ ] Handle limit error in trade form UI (show upgrade prompt instead of generic error)
- [ ] Add trade usage indicator to trade form (e.g., "17/20 trades used")
- [ ] Write tests for limit enforcement (free user at limit, pro user unlimited)

**Convoy 1C: Basic Upgrade Prompt**
- [ ] Create upgrade prompt component shown when limit is reached
- [ ] Add trade usage banner component (shown at 15+ trades)
- [ ] Wire up usage indicators on the trade creation page
- [ ] Test progressive warning UX

**Deliverables:**
- Free tier limit enforced server-side
- Users see trade count and warnings
- Upgrade prompt shown at limit (links to pricing page placeholder)

### Phase 2: Stripe Integration (Week 2)

**Goal:** Full payment flow with Stripe Checkout and webhook handling.

**Convoy 2A: Stripe Setup**
- [ ] Create Stripe account and configure products/prices (monthly + annual)
- [ ] Set up `lib/stripe.ts` with Stripe client
- [ ] Add environment variables to `.env` and deployment config
- [ ] Create `lib/actions/billing.ts` with checkout and portal session actions

**Convoy 2B: Webhook Handler**
- [ ] Create `app/api/webhooks/stripe/route.ts`
- [ ] Handle `checkout.session.completed` — activate subscription
- [ ] Handle `invoice.payment_succeeded` — extend billing period
- [ ] Handle `invoice.payment_failed` — set past_due status
- [ ] Handle `customer.subscription.deleted` — revert to free tier
- [ ] Add webhook signature verification
- [ ] Write integration tests for each webhook event

**Convoy 2C: Billing Management**
- [ ] Create `app/billing/page.tsx` — shows current plan, usage, manage link
- [ ] Integrate Stripe Customer Portal for plan changes and cancellation
- [ ] Add billing link to user settings / navigation
- [ ] Handle grace period logic (access until `subscriptionEndsAt`)
- [ ] Test full subscription lifecycle (subscribe → use → cancel → revert)

**Deliverables:**
- Users can subscribe via Stripe Checkout
- Webhook processes subscription events
- Users can manage billing via Stripe Portal
- Full lifecycle tested

### Phase 3: Pricing & Marketing (Week 3)

**Goal:** Pricing page, homepage updates, and polished upgrade flow.

**Convoy 3A: Pricing Page**
- [ ] Create `app/pricing/page.tsx` with Free vs Pro comparison
- [ ] Add monthly/annual toggle
- [ ] Wire up "Start Pro" button to Stripe Checkout
- [ ] Add FAQ section
- [ ] Responsive design and polish

**Convoy 3B: Homepage Updates**
- [ ] Add pricing section to `app/page.tsx` (between Features and Social Proof)
- [ ] Update hero social proof text
- [ ] Update footer pricing link to `/pricing`
- [ ] Test that existing CTAs still work correctly

**Convoy 3C: Upgrade Flow Polish**
- [ ] Refine upgrade prompt design (shown when trade limit reached)
- [ ] Add upgrade CTA in navigation/header for free users
- [ ] Create success page after checkout completion
- [ ] Add confetti or celebration on successful upgrade (lightweight)
- [ ] Email notification on subscription activation (optional)

**Deliverables:**
- Pricing page live
- Homepage updated with pricing section
- Polished upgrade flow from limit → checkout → activated

### Phase 4: Testing & Launch (Week 4)

**Goal:** QA, edge case handling, and production launch.

**Convoy 4A: Edge Cases & Hardening**
- [ ] Test: User at exactly 20 trades cannot create trade 21
- [ ] Test: Pro user downgrades — existing trades preserved, can't create new ones
- [ ] Test: Payment fails — grace period works correctly
- [ ] Test: User deletes account — Stripe subscription canceled
- [ ] Test: Webhook replay / idempotency
- [ ] Test: Concurrent trade creation near limit (race condition prevention)

**Convoy 4B: Monitoring & Analytics**
- [ ] Add analytics events: `trade_limit_reached`, `upgrade_prompt_shown`, `checkout_started`, `subscription_activated`
- [ ] Set up Stripe revenue dashboard
- [ ] Configure alerts for failed webhooks
- [ ] Monitor conversion funnel (limit reached → pricing page → checkout → activated)

**Convoy 4C: Launch**
- [ ] Deploy schema migration to production
- [ ] Enable Stripe in production mode
- [ ] Verify webhooks are firing in production
- [ ] Announce pricing on homepage
- [ ] Existing users are grandfathered as free tier (all current trades count toward their 20)
- [ ] Monitor for issues during first 48 hours

**Deliverables:**
- All edge cases handled
- Analytics tracking live
- Production launch complete

---

## Success Metrics

### Conversion Metrics

1. **Free-to-Paid Conversion Rate**
   - Target: 5-10% of users who hit the trade limit convert to paid within 30 days
   - Measure: `paid_users / users_at_limit`

2. **Time to Conversion**
   - Target: Median 7 days from hitting limit to subscribing
   - Measure: `subscription_date - limit_reached_date`

3. **Annual vs Monthly Split**
   - Target: 30% of subscribers choose annual plan
   - Measure: `annual_subs / total_subs`

### Revenue Metrics

1. **Monthly Recurring Revenue (MRR)**
   - Month 1 target: $100 (12-15 paying users)
   - Month 3 target: $500
   - Month 6 target: $1,500
   - Measure: Stripe dashboard

2. **Average Revenue Per User (ARPU)**
   - Target: $7.50/month (blended monthly + annual)
   - Measure: `MRR / paying_users`

3. **Churn Rate**
   - Target: < 8% monthly churn
   - Measure: `canceled_subs / active_subs` per month

### Product Metrics

1. **Trade Limit Awareness**
   - Target: 90% of users at 15+ trades have seen the usage indicator
   - Measure: Analytics event tracking

2. **Upgrade Prompt Click-Through**
   - Target: 25% of users who see the limit prompt click through to pricing
   - Measure: `pricing_page_views_from_prompt / prompt_shown`

3. **Post-Upgrade Retention**
   - Target: 80% of paid users log a trade within 7 days of subscribing
   - Measure: `active_paid_users / total_paid_users`

### Health Metrics

1. **Free Tier Satisfaction**
   - Target: < 2% of free users report the limit as "unfair" in feedback
   - Measure: Support tickets, feedback surveys

2. **Payment Success Rate**
   - Target: > 98% of checkout sessions complete successfully
   - Measure: Stripe checkout completion rate

3. **Webhook Reliability**
   - Target: 100% of Stripe webhooks processed successfully
   - Measure: Webhook failure alerts

---

## Appendices

### Appendix A: Existing User Handling

When we launch the free tier, all existing users start as free. Their existing trades count toward the 20-trade limit.

**Scenarios:**

| User's Current Trades | Impact |
|----------------------|--------|
| 0-14 trades | No immediate impact. They won't see any limit UI. |
| 15-19 trades | They'll see the usage indicator. Can still create some trades. |
| 20+ trades | They're already over the limit. Cannot create new trades. Must upgrade to continue. |

**For users already over 20 trades:** This is a forced conversion moment. The messaging should be empathetic:

> "Thanks for being an early GreekWheel user! You've tracked [X] trades with us. As we introduce our pricing model, your existing data is safe and always accessible. To continue tracking new trades, upgrade to Pro for $8/month."

We should consider a **launch discount** (e.g., 50% off first 3 months) for existing users who are over the limit, as a goodwill gesture.

### Appendix B: Race Condition Handling

When a free user is at 19 trades and submits two trade forms simultaneously:

```typescript
// In createTrade, the count check and insert should be atomic
// Option 1: Use a transaction with a SELECT ... FOR UPDATE
// Option 2: Use a database-level constraint
// Option 3: Accept the rare edge case (user gets 21 trades)

// Recommendation: Option 3 for now. The cost of a user getting
// 21 trades is negligible. If it becomes a problem, add a
// transaction-level lock in Phase 4.
```

### Appendix C: Stripe Product Configuration

**Products to create in Stripe Dashboard:**

1. **Product:** "GreekWheel Pro"
   - Description: "Unlimited options trade tracking for the wheel strategy"

2. **Prices:**
   - Monthly: $8.00/month, recurring
   - Annual: $72.00/year, recurring ($6.00/month effective)

3. **Customer Portal settings:**
   - Allow plan switching (monthly ↔ annual)
   - Allow cancellation
   - Show invoices
   - Proration on plan changes

4. **Checkout settings:**
   - Collect email (pre-fill from session)
   - Allow promotion codes (for launch discounts)
   - Success URL: `/billing?success=true`
   - Cancel URL: `/pricing`

### Appendix D: FAQ for Implementation

**Q: What if a user subscribes, creates 50 trades, then cancels?**
A: They keep all 50 trades. They can view everything. They just can't create trade #51. If they re-subscribe later, they pick up where they left off.

**Q: Should we offer a free trial of Pro?**
A: No. The free tier IS the trial. 20 trades is generous enough to evaluate the product. A separate "trial" adds confusion and implementation complexity.

**Q: What about refunds?**
A: Handle via Stripe. Standard policy: refund within 7 days of first subscription, no questions asked. After that, cancel at end of billing period (no partial refunds). Keep it simple.

**Q: Should we show pricing before or after signup?**
A: Both. Pricing section on the homepage (before signup) for transparency. Upgrade prompts in-app (after signup) for conversion. Never hide the price.

**Q: What if Stripe is down?**
A: Trade limit enforcement is database-only and doesn't depend on Stripe. Users can always use the app. They just can't subscribe until Stripe recovers. Webhook processing should retry automatically (Stripe retries for up to 72 hours).

**Q: Do we need to handle Sales Tax?**
A: Not initially. Most US states exempt SaaS under certain revenue thresholds. Monitor revenue and add Stripe Tax when we approach thresholds (varies by state, typically $100k+/year). International expansion would require re-evaluating this.

---

## Questions for Product Review

1. **Should we grandfather existing heavy users?** Give users with 20+ trades a free 3-month Pro subscription?
2. **Should the trade counter be visible on the dashboard?** Or only near the trade creation form?
3. **Do we want a "team" tier later?** (Multiple users sharing a single subscription for a trading group)
4. **Should we accept crypto payments?** (Niche audience overlap with crypto traders)
5. **Email drip campaign for users approaching the limit?** (At 15 trades, 18 trades, 20 trades)
6. **Referral program?** ("Give a friend 5 extra free trades, get 1 month free")
7. **Should we offer a lifetime deal?** (One-time $200 payment for permanent Pro access — common in indie SaaS)

---

**Document Status:** DRAFT - Ready for Mayor Review
**Next Steps:** Convoy assignments and sprint planning
**Estimated Timeline:** 4 weeks for full implementation
**Priority:** HIGH - Revenue generation enables continued product development
**Dependencies:** Stripe account setup, existing User model, `createTrade` action

**Polecats Needed:**
- Backend: 2 polecats (schema migration, trade limit, Stripe webhooks, billing actions)
- Frontend: 2 polecats (pricing page, upgrade prompts, billing management, homepage updates)
- QA: 1 polecat (lifecycle testing, edge cases, production verification)
- Total: 5 polecats for 4-week implementation

---

*End of PRD*
