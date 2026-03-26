# PRD: Change Logo Main Color to Red

**Date:** 2026-03-05
**Author:** Product Manager Agent
**Status:** Draft
**Task ID:** 1

## Problem Statement

The GreekWheel logo and primary brand color are currently green (#43D984), established during the initial branding phase. The user wants to change the main logo color to red to create a different visual identity.

Today, the "logo" consists of two elements: (1) a circular badge with the Greek letter Theta on a green background, and (2) the wordmark "GreekWheel" where "Greek" is styled in the primary green color. These elements appear in two locations -- the landing page navbar (`app/page.tsx`) and the landing page footer -- both using Tailwind's `primary-500` and `primary-600` color classes. The authenticated app header in `app/layout.tsx` uses a plain text wordmark without the Theta badge or color accent.

The green primary color is deeply embedded in the design system. It is defined in three places: the Tailwind config (`tailwind.config.ts`, lines 12-23), CSS custom properties (`app/design-system.css`, lines 16-26), and is referenced via `primary-*` utility classes across virtually every component and page. Changing the logo color has implications ranging from a surgical logo-only change to a full brand-wide color overhaul.

## Goals

- Change the main logo color from green to red
- Maintain visual coherence between the logo and the rest of the UI
- Preserve accessibility (WCAG contrast ratios) for any changed elements

## Non-Goals

- Redesigning the logo shape, typography, or layout
- Adding a new SVG or image-based logo (the current text+badge approach remains)
- Changing semantic colors (success/error/warning/info indicators)
- Dark mode implementation

## Research Findings

### Competitive Analysis

Trading platforms use a variety of primary brand colors. Red is common in finance and conveys energy, urgency, and market awareness:

- **Robinhood**: Green primary (growth, money) -- but their original palette was more varied
- **Interactive Brokers**: Red primary -- conveys authority and market seriousness
- **Charles Schwab**: Blue primary with red accents
- **tastytrade**: Purple/magenta -- differentiation play
- **OptionStrat**: Blue primary

Red is a bold choice for a trading app. While green traditionally signals "profit" in US markets, red communicates power, confidence, and stands out from the many green-themed fintech apps. The key risk is that red also means "loss" in US trading conventions, which could create a negative subconscious association for US-based traders.

### Best Practices

- **Color psychology in finance**: Red conveys confidence, energy, and urgency. In Asian markets, red signifies prosperity and good fortune, which is a positive association.
- **Accessibility**: Red text on white requires careful shade selection to meet WCAG AA (4.5:1 contrast for normal text). Darker reds (e.g., #DC2626, #B91C1C) meet this threshold while bright reds (#EF4444) may not for smaller text.
- **Design system consistency**: If the logo uses red but the rest of the UI stays green, there must be a clear visual rationale (e.g., logo is an accent, not the primary action color).

### Existing System Context

The color system is centralized and well-structured:

1. **Tailwind config** (`tailwind.config.ts`): Defines `primary` as a 50-900 green scale based on #43D984
2. **CSS custom properties** (`app/design-system.css`): Mirrors the Tailwind scale with HSL values in `--color-primary-*` variables
3. **Usage**: `primary-*` classes are used extensively across the entire app for buttons, badges, accents, borders, backgrounds, text highlights, and the logo itself

The logo specifically uses:
- `bg-primary-500` for the Theta circle background
- `text-primary-600` for the "Greek" text in the wordmark
- These appear in `app/page.tsx` (lines 26-31) and the footer (line 640-644)

## Proposed Solutions

### Option A: Logo-Only Color Change (Surgical)

**Description:** Change only the logo elements (Theta badge and "Greek" wordmark accent) to red, keeping the entire primary green design system untouched. This means replacing the `primary-500`/`primary-600` classes on the logo elements with explicit red color values (e.g., `bg-red-600`, `text-red-700`) or a new `logo` color token.

**Pros:**
- Minimal code changes (4-6 lines across 2 files)
- Zero risk to existing UI -- no buttons, cards, or other components affected
- Fast to implement and easy to revert
- Creates a distinctive logo that stands apart from the UI chrome

**Cons:**
- Logo color will visually clash with the green-dominant UI unless carefully balanced
- May look inconsistent -- why is the logo red but everything else green?
- Does not address the broader brand identity question

**Effort:** Small
**Dependencies:** None

### Option B: Full Primary Color Migration to Red

**Description:** Replace the entire primary green palette with a red palette across the design system. Update `tailwind.config.ts` (primary scale), `app/design-system.css` (CSS custom properties), and all semantic mappings. The entire app -- buttons, badges, accents, the logo, everything -- becomes red-themed.

**Pros:**
- Complete visual coherence -- logo and UI share the same color language
- Single source of truth: change the palette definition, everything updates
- Bold, distinctive brand identity that stands out from green-dominated fintech

**Cons:**
- Large blast radius -- every component using `primary-*` classes changes appearance
- Red buttons and accents may conflict with the `error` semantic color (also red, #EF4444), creating confusion about what is an error vs. a normal action
- "Success" color (`--color-success`) currently aliases to primary, which would need to be decoupled
- Requires careful QA across all pages to ensure nothing looks broken
- Red as a dominant UI color can feel aggressive or alarming in a financial context

**Effort:** Medium
**Dependencies:** Need to decouple `--color-success` from `--color-primary` in CSS custom properties. Need to select a red shade that does not conflict with the existing `error` color (#EF4444).

### Option C: Dual-Color Brand System (Red Logo + Green UI)

**Description:** Introduce a dedicated `brand` color token (red) separate from the `primary` action color (green). The logo, hero sections, and brand-specific elements use the red `brand` token, while interactive elements (buttons, links, form accents) continue using the green `primary` token. This is the approach used by companies like YouTube (red brand, but blue interactive elements from Google's material design).

**Pros:**
- Clean separation of brand identity from UI interaction patterns
- Logo gets the desired red color without disrupting functional UI
- Scalable pattern -- can evolve brand and UI colors independently
- Avoids the red/error confusion problem entirely
- Professional approach used by major design systems

**Cons:**
- More architectural work: new color token, new Tailwind extension, new CSS variables
- Developers need to learn when to use `brand-*` vs `primary-*`
- Slightly more complex design system to maintain
- May feel over-engineered for a single logo color change

**Effort:** Medium
**Dependencies:** New `brand` color scale in Tailwind config and CSS custom properties. Documentation update for when to use `brand` vs `primary`.

## Recommendation

**Option A (Logo-Only)** is recommended if the goal is simply to make the logo red with minimal disruption. It can be done in under an hour and carries near-zero risk.

**Option C (Dual-Color Brand System)** is recommended if this is the beginning of a broader brand evolution. It is the most architecturally sound approach and prevents future conflicts between brand color and UI semantics.

**Option B (Full Migration)** is the riskiest and is only recommended if the user wants the entire application to be red-themed, not just the logo. If chosen, the error/success color conflicts must be resolved first.

## User Stories

- As a user, I want the GreekWheel logo to be red so that it matches my desired brand identity
- As a user, I want the app to remain visually coherent after the logo color change
- As a user, I want interactive elements (buttons, links) to remain clearly distinguishable from error states

## Acceptance Criteria

- [ ] The Theta badge circle in the logo displays in red
- [ ] The "Greek" text in the wordmark displays in red
- [ ] The logo color is consistent between the navbar and footer on the landing page
- [ ] All text using the new red color meets WCAG AA contrast ratio (4.5:1) against its background
- [ ] No existing UI elements are unintentionally affected (for Options A and C)
- [ ] The authenticated app header wordmark is updated to match (if applicable)

## UX Considerations

- The Theta badge background should use a medium-dark red (e.g., red-600 or red-700) to maintain contrast with the white Theta letter
- The "Greek" wordmark text should use a dark enough red to be readable against white (red-600 minimum)
- If Option B is chosen, primary action buttons must be visually distinct from error states -- consider using a different shade or adding an outline treatment for errors
- The landing page hero section and CTA buttons currently use primary-500/600 -- if only the logo changes (Option A), these remain green, which is fine since green CTAs have strong conversion associations

## Data Model Changes

None. This is a purely visual/CSS change.

## Open Questions

- Does the user want only the logo to be red, or the entire app theme? (This determines Option A vs B vs C)
- What specific shade of red is preferred? (e.g., bright red #EF4444, medium red #DC2626, dark red #B91C1C, or a custom hex)
- Should the authenticated app header wordmark ("GreekWheel" in `app/layout.tsx`) also get the red treatment, or just the landing page?

## References

- Current logo implementation: `app/page.tsx` lines 24-31 (navbar), lines 639-644 (footer)
- Primary color definition: `tailwind.config.ts` lines 12-23
- CSS custom properties: `app/design-system.css` lines 11-26
- Branding PRD: `prds/branding-and-naming.md`
- Existing color palette: Primary green #43D984, Accent brown #59332A
