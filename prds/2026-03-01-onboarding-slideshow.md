# PRD: First-Time User Onboarding Slideshow

**Date:** 2026-03-01
**Author:** Product Manager Agent
**Status:** Draft
**Task ID:** 12

## Problem Statement

When a new user creates a GreekWheel account and logs in for the first time, they land on an empty P&L Dashboard with no data, no trades, no positions, and no context about what to do next. The dashboard shows $0 across all metrics, empty charts, and a blank alerts widget. There is no guidance on what GreekWheel is, what its key features are, how the pages relate to each other, or what the user should do first.

This is a significant first-impression problem. GreekWheel is a multi-page application with 8 primary navigation sections (Dashboard, Trades, Positions, Wheels, Deposits, Scanner, Help, Billing) and several interconnected workflows (the wheel cycle spans trades, assignments, positions, and covered calls). A user unfamiliar with either the wheel strategy or the app's structure will not know where to start. The Help Center and User Guide exist but are buried behind a navigation link -- and a new user does not know they need help until they are already confused.

Industry data shows that 68% of fintech app users abandon during or shortly after onboarding. For GreekWheel specifically, a user who does not understand the connection between deposits, trades, positions, and wheels is unlikely to enter their first trade -- and without trades, they will never see the value of the dashboard, analytics, or scanner. The onboarding slideshow bridges the gap between account creation and the first meaningful action.

## Goals

- Orient new users on GreekWheel's core features and navigation within 60 seconds of first login
- Show the slideshow automatically on first visit after account creation; allow users to skip or dismiss at any time
- Cover all major features and pages at a high level without overwhelming the user
- Provide a clear call-to-action at the end that drives the user toward their first meaningful action (recording a deposit or creating a trade)
- Persist the "completed onboarding" state so the slideshow does not re-appear on subsequent visits

## Non-Goals

- Interactive product tour with element highlighting and tooltips (that is a separate, more complex feature)
- Video tutorials or animated demos within the slideshow
- Per-feature contextual tooltips on each page (future enhancement)
- Onboarding checklist or progress tracker that persists after the slideshow
- A/B testing of different onboarding flows
- Onboarding for the upgrade/Pro conversion funnel (that is a billing concern)

## Research Findings

### Competitive Analysis

**Robinhood:** Uses a multi-slide welcome modal with illustrations on first login. Covers account funding, stock/options basics, and portfolio tracking. Each slide has a single concept, large illustration, short heading, and 1-2 sentences of copy. Progress dots at the bottom. Skip button always visible.

**Tastytrade:** Shows a brief welcome overlay with links to tutorial videos. Does not use a step-by-step slideshow. Relies heavily on video content for education.

**OptionWheelTracker.app:** No onboarding slideshow. Users are dropped directly into the dashboard. Relies on in-app documentation and blog posts for education.

**Webull:** Full-screen slideshow overlay on first launch covering account types, charting tools, and order entry. 5 slides with illustrations. Progress bar at bottom. "Get Started" CTA on final slide.

**Zoho Books (fintech SaaS):** Welcomes users with a custom modal and confetti animation. Later triggers a 7-step walkthrough with simple copy. Uses embedded onboarding elements including promotional cards, embedded videos, and visual directions.

**Key takeaway:** The modal slideshow pattern (Robinhood, Webull) is the standard for fintech apps. It is lightweight, does not require complex tooltip positioning, and works well on both desktop and mobile. GreekWheel should follow this proven pattern.

### Best Practices from Research

1. **Keep it short:** 5-7 slides maximum. Each slide should communicate one concept in under 15 seconds of reading time. The entire slideshow should complete in under 60 seconds.

2. **Always allow skip/dismiss:** Users who are experienced or impatient should never be forced through the slideshow. A visible "Skip" button on every slide is mandatory.

3. **Use visual hierarchy:** Large heading, short body text (1-2 sentences max), and an illustration or icon per slide. No walls of text.

4. **End with a CTA:** The final slide should direct users toward their first action -- not just "Close" but "Record Your First Deposit" or "Create Your First Trade."

5. **Progressive disclosure:** The slideshow introduces features at a high level. Detailed help is available in the User Guide and FAQ. Do not try to teach everything in the slideshow.

6. **Mobile-first design:** The slideshow must work on mobile screens. Use responsive layouts and avoid wide content that requires horizontal scrolling.

7. **Persist completion state server-side:** For signed-in users, store the onboarding completion flag in the database (not localStorage) so it works across devices.

### Existing System Context

**Current user flow after registration:**
1. User submits registration form at `/register`
2. Redirected to `/login?registered=true` with success message
3. User logs in
4. Redirected to `/dashboard` (the `loginAction` calls `router.push('/dashboard')`)
5. User sees an empty dashboard with all-zero metrics

**Post-login redirect location:** The login action in `app/(auth)/login/page.tsx` always redirects to `/dashboard`. This is the natural place to trigger the onboarding slideshow.

**User model:** The `User` model in `prisma/schema.prisma` currently has no field for tracking onboarding completion. A new field would need to be added (e.g., `onboardingCompletedAt DateTime?`).

**Existing modal/dialog components:**
- `components/ui/dialog.tsx` -- Full-featured dialog with focus trap, ESC handling, backdrop click, configurable max-width. Accessible with ARIA attributes.
- `components/ui/modal.tsx` -- Similar to Dialog with size variants (sm/md/lg/xl).

Both could serve as the base for the slideshow container, though a slideshow needs additional navigation (prev/next/dots) and slide transition logic. The `Dialog` component with `maxWidth="2xl"` or `"3xl"` would be a good starting point.

**Design system components available:**
- `Button` with variants (primary, outline) and sizes
- `Badge` for labels
- `Card` with `CardHeader`, `CardContent`
- `Alert` for informational messages
- Lucide icons (`lucide-react`) used throughout the app

**Navigation structure (from `layout.tsx` and `mobile-nav.tsx`):**
The app has 8 primary nav items: Dashboard, Trades, Positions, Wheels, Deposits, Scanner, Help, Billing.

**Relevant pages and their purposes:**
| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/dashboard` | P&L metrics, charts, alerts, SPY benchmark comparison |
| Trades | `/trades` | List/manage options trades; create new trades |
| Positions | `/positions` | View assigned stock positions |
| Wheels | `/wheels` | Track complete wheel strategy cycles |
| Deposits | `/deposits` | Record cash deposits/withdrawals for benchmarking |
| Scanner | `/scanner` | Watchlist + multi-phase options opportunity scanner |
| Expirations | `/expirations` | Calendar view of upcoming option expirations |
| Help | `/help` | FAQ, glossary, user guide |
| Billing | `/billing` | Subscription management |

## Proposed Solutions

### Option A: Full-Screen Modal Slideshow (Custom Built)

**Description:** Build a custom slideshow component that renders as a full-screen modal overlay on the dashboard page. It contains 6-7 slides, each with an icon/illustration, heading, body text, and navigation controls (prev/next/skip/dots). The slideshow is triggered when the user's `onboardingCompletedAt` field is null. On completion or skip, the field is set and the slideshow never appears again.

**Pros:**
- Full control over design, animations, and content
- No external dependencies
- Can leverage existing `Dialog` component as the container shell
- Consistent with the app's existing design language (Tailwind, design system components)
- Can be server-side rendered with the dashboard page for fast initial paint

**Cons:**
- Requires building slide navigation, progress indicators, and transition logic from scratch
- More engineering time than using a library
- Must handle responsive design, keyboard navigation, and accessibility manually

**Effort:** Medium
**Dependencies:** New `onboardingCompletedAt` field on User model (schema migration). New server action to mark onboarding complete. New slideshow component.

### Option B: Library-Based Product Tour (e.g., React Joyride, Reactour)

**Description:** Use an existing React product tour library (React Joyride or Reactour) to create a guided walkthrough that highlights actual UI elements on the dashboard page. The tour would point to the navigation items, metric cards, and alerts widget with tooltip-style popups explaining each element.

**Pros:**
- Contextual -- users see the actual UI elements being explained, not static illustrations
- Libraries handle positioning, scrolling, highlighting, and responsive behavior
- Well-tested accessibility support in mature libraries

**Cons:**
- Requires the dashboard to have rendered content to highlight -- but a new user's dashboard is empty, making most elements meaningless to point at (zero metrics, empty charts)
- External dependency adds bundle size and maintenance burden
- Tour tooltip styling may clash with the existing design system
- Product tours that step through empty/irrelevant UI feel mechanical and unhelpful
- Cannot easily show features on other pages (Trades, Scanner) without multi-page tour complexity

**Effort:** Medium
**Dependencies:** Third-party library (react-joyride or @reactour/tour). Same schema migration as Option A.

### Option C: Onboarding Slideshow + Post-Slideshow Checklist

**Description:** Same as Option A (full-screen modal slideshow), plus: after the slideshow completes, show a persistent onboarding checklist card on the dashboard that guides the user through their first actions (Record a deposit, Create your first trade, View your wheel, etc.). The checklist persists across sessions until all items are completed or the user dismisses it.

**Pros:**
- Best user experience -- the slideshow provides orientation, and the checklist provides ongoing guidance
- Checklist reinforces the slideshow content and drives the user toward their "aha moment"
- Common SaaS pattern (Slack, Notion, Linear) proven to increase activation rates
- Checklist items can be auto-detected from existing data (has deposits? has trades? has positions?)

**Cons:**
- Significantly more implementation effort than a slideshow alone
- Requires additional database fields or a separate onboarding progress model
- Checklist component must integrate with multiple data sources (deposits, trades, positions)
- Risk of over-engineering for the initial release -- the slideshow alone may be sufficient to orient users

**Effort:** Large
**Dependencies:** Everything from Option A, plus: new onboarding progress tracking (multiple fields or a separate model), new checklist component, integration with deposit/trade/position queries.

## Recommendation

**Option A (Full-Screen Modal Slideshow, Custom Built)** is the right choice for the initial release. It directly solves the first-impression problem with a proven UX pattern, requires no external dependencies, and can be built using existing design system components (Dialog, Button, Badge). The empty-dashboard problem makes Option B (library-based tour) a poor fit since there is nothing meaningful to highlight.

Option C (slideshow + checklist) is the ideal end state but adds significant scope. The checklist can be built as a follow-up feature after Option A validates the concept. Shipping the slideshow first gives us a foundation to iterate on.

## Proposed Slide Content

The slideshow should contain **6 slides** covering the user's journey through the app:

### Slide 1: Welcome
- **Heading:** "Welcome to GreekWheel"
- **Body:** "Your personal tracker for the options wheel strategy. Let us show you around -- this will take less than a minute."
- **Visual:** GreekWheel logo / theta symbol

### Slide 2: The Wheel Strategy
- **Heading:** "Track Your Wheel Rotations"
- **Body:** "The wheel strategy cycles through three steps: sell a cash-secured PUT, get assigned stock, then sell covered CALLs. GreekWheel tracks every step automatically."
- **Visual:** Simple 3-step cycle diagram (PUT > Stock > CALL > repeat)

### Slide 3: Record Your Capital
- **Heading:** "Start With Your Deposits"
- **Body:** "Record your cash deposits so GreekWheel can calculate your returns and compare your performance against buying SPY."
- **Visual:** Icon representing the Deposits page
- **Key page:** Deposits (`/deposits`)

### Slide 4: Enter Trades & Manage Positions
- **Heading:** "Log Your Trades"
- **Body:** "Create trades as you sell PUTs and CALLs. When a PUT gets assigned, mark it -- GreekWheel creates your stock position and calculates your cost basis automatically."
- **Visual:** Icons representing Trades and Positions
- **Key pages:** Trades (`/trades`), Positions (`/positions`)

### Slide 5: Dashboard & Analytics
- **Heading:** "Track Your Performance"
- **Body:** "Your dashboard shows P&L, premium collected, win rate, and how you compare to SPY. The Scanner helps you find new wheel opportunities."
- **Visual:** Chart/analytics icon
- **Key pages:** Dashboard (`/dashboard`), Scanner (`/scanner`)

### Slide 6: Get Started (CTA)
- **Heading:** "You're Ready to Roll"
- **Body:** "Start by recording a deposit, or jump right in and create your first trade. You can always find help in the Help Center."
- **Visual:** Checkmark / success icon
- **CTA buttons:** "Record a Deposit" (primary, links to `/deposits`) | "Create a Trade" (outline, links to `/trades/new`) | "Explore on My Own" (text/skip, dismisses)

## User Stories

- As a new user, I want to see a brief overview of GreekWheel's features when I first log in so that I understand what the app does and where things are.
- As a new user, I want to skip the onboarding slideshow at any time so that I am not forced to sit through it if I already understand the app.
- As a returning user, I want the onboarding slideshow to not appear again after I have seen it so that my normal workflow is not interrupted.
- As a user on a mobile device, I want the onboarding slideshow to be readable and navigable on my phone so that I can onboard from any device.

## Acceptance Criteria

- [ ] When a user logs in for the first time after creating an account (i.e., `onboardingCompletedAt` is null), a full-screen modal slideshow appears on the dashboard page.
- [ ] The slideshow contains exactly 6 slides as specified in the "Proposed Slide Content" section above.
- [ ] Each slide displays a heading, body text, and a visual element (icon or illustration).
- [ ] The slideshow has navigation controls: "Next" button, "Back" button (hidden on first slide), progress dots showing current position, and a "Skip" link visible on every slide.
- [ ] The final slide (Slide 6) displays two primary CTA buttons ("Record a Deposit" linking to `/deposits`, "Create a Trade" linking to `/trades/new`) and a dismissive "Explore on My Own" option.
- [ ] Clicking "Skip" on any slide, clicking "Explore on My Own" on the final slide, or clicking any CTA button marks onboarding as completed and closes the slideshow.
- [ ] Once onboarding is marked completed, the slideshow never appears again for that user, even across different devices or browsers.
- [ ] The `onboardingCompletedAt` field is set to the current timestamp when the user completes or skips the slideshow.
- [ ] The slideshow is responsive and displays correctly on mobile screens (down to 320px width).
- [ ] The slideshow is accessible: keyboard navigable (Tab, Enter, Escape to dismiss), proper ARIA labels, focus trapped within the modal.
- [ ] The slideshow renders over the dashboard content with a backdrop overlay, consistent with the existing `Dialog` component pattern.
- [ ] The slideshow does not appear when the user is not authenticated or has already completed onboarding.

## UX Considerations

**Trigger point:** The slideshow should appear immediately when the dashboard page loads for a first-time user. It should not require the user to click anything to see it.

**Layout:** Each slide should use a centered layout within the modal:
```
[Skip]                                    [X close]
              [Icon / Visual]
           [Heading - large, bold]
      [Body text - 1-2 sentences, gray]
              [Progress dots]
     [Back]                   [Next]
```

On the final slide, the navigation area changes to:
```
     [Record a Deposit]  [Create a Trade]
           [Explore on My Own]
```

**Modal sizing:** Use `max-w-lg` on desktop for a focused, not-too-wide presentation. On mobile, the modal should fill the screen with appropriate padding.

**Transitions:** Slides should transition with a subtle horizontal slide or fade animation. Nothing flashy -- this is a professional trading tool, not a consumer app.

**Progress dots:** 6 small dots at the bottom, with the current slide's dot filled/highlighted. Users can click dots to jump to a specific slide.

**Skip behavior:** "Skip" should appear as a text link in the upper-left or upper-right corner on every slide. It should immediately close the slideshow and mark onboarding as complete. No confirmation dialog.

**Keyboard navigation:** Left/Right arrow keys should navigate between slides. Escape should close/skip the slideshow.

**Color and styling:** Follow the existing design system. Use `primary-500` for active/accent elements, `neutral-700` for body text, `neutral-900` for headings. The visual icons can use Lucide icons already imported in the project.

**Icons per slide (Lucide suggestions):**
- Slide 1: Theta symbol (custom, matching the logo)
- Slide 2: `Repeat` or `RefreshCcw` (cycle)
- Slide 3: `Wallet` or `DollarSign` (deposits)
- Slide 4: `FileText` + `Package` or `TrendingUp` (trades & positions)
- Slide 5: `BarChart3` or `LineChart` (dashboard/analytics)
- Slide 6: `CheckCircle2` or `Rocket` (get started)

## Data Model Changes

**Add to the User model in `prisma/schema.prisma`:**

```prisma
model User {
  // ... existing fields ...
  onboardingCompletedAt DateTime?  // null = not completed, timestamp = completed
}
```

This is a single nullable DateTime field. When null, the slideshow should be shown. When set, it should not. Using a timestamp rather than a boolean provides useful analytics data (when users complete onboarding).

**Migration:** A simple `ALTER TABLE User ADD COLUMN onboardingCompletedAt TIMESTAMP NULL` migration. No data backfill needed -- existing users will have null, but since they are not new, the slideshow trigger should also check account age or use a cutoff date (e.g., only show for users created after the feature ships). Alternatively, backfill all existing users with `NOW()` to skip onboarding for them.

**Recommendation for existing users:** Backfill all existing users' `onboardingCompletedAt` with the migration timestamp. This ensures only genuinely new users see the slideshow. Existing users already know the app.

## Open Questions

- **Should the slideshow be re-triggerable?** For example, should there be a "Replay intro tour" option in the Help page or user settings? This would require additional UI but could be useful for users who skipped too quickly. -- Needs product decision.
- **Should we A/B test the final CTA?** The two options ("Record a Deposit" vs "Create a Trade") represent different first actions. We could track which CTA users click to understand the preferred entry point. -- Future optimization, not needed for v1.
- **Should the slideshow show on the landing page (/) for logged-out users?** The landing page already has a "How it works" section that covers similar ground. Showing the slideshow only to authenticated users on the dashboard seems sufficient. -- Needs confirmation from team lead.
- **What about the existing "Getting Started" section on the Help page?** The Help page at `/help` already has a "Getting Started" section with 3 steps. Should this be updated to reference the onboarding slideshow, or should they remain independent? -- Minor, can be addressed later.

## References

- [7 User Onboarding Best Practices for 2026 - Formbricks](https://formbricks.com/blog/user-onboarding-best-practices)
- [Onboarding UX Patterns and Best Practices in SaaS - Userpilot](https://userpilot.medium.com/onboarding-ux-patterns-and-best-practices-in-saas-c46bcc7d562f)
- [Fintech Onboarding: 13 Best Practices - Userpilot](https://userpilot.com/blog/fintech-onboarding/)
- [5 Real-World Fintech Onboarding Examples - Appcues](https://www.appcues.com/blog/fintech-onboarding-examples)
- [Top 8 React Product Tour Libraries - Chameleon](https://www.chameleon.io/blog/react-product-tour)
- [5 Best React Product Tour Libraries for Onboarding UX - Whatfix](https://whatfix.com/blog/react-onboarding-tour/)
- [Onboarding UX Best Practices for SaaS - Userpilot](https://userpilot.com/blog/onboarding-ux-best-practices/)
- [SaaS Onboarding UX Best Practices - Code Theorem](https://codetheorem.co/blogs/saas-onboarding-ux/)
- [Best SaaS Onboarding Examples and Practices - Candu](https://www.candu.ai/blog/best-saas-onboarding-examples-checklist-practices-for-2025)
- [NextStepjs - Lightweight React Onboarding Library](https://nextstepjs.com/react)
