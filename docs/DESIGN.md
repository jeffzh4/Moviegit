# MovieGit — Design Doc

**Status:** Living document, updated as the visual system evolves
**Last updated:** 2026-08-02

---

## 1. Design premise

The entire visual and interaction language is borrowed from one source: a GitHub user profile and repository page. This isn't a moodboard choice — it's the product's core bet, stated in the PRD, that a developer-shaped vocabulary (commits, streaks, blame, diffs) can represent film-watching more legibly than a traditional review-site UI. If the interface doesn't read as "GitHub, but films" at a glance, the metaphor has failed regardless of how correct the underlying data is.

That constrains the design system more than a green-field product would tolerate, and that's intentional. Every screen is evaluated against one question: *would this look out of place on github.com?*

## 2. Visual system

### 2.1 Palette

Dark by default, matching GitHub's own dark theme rather than inventing a competing dark palette:

```
--bg-canvas / --bg-primary / --bg-secondary / --bg-tertiary / --bg-overlay
--border / --border-muted
--text-primary / --text-secondary / --text-tertiary
--accent-green / --accent-blue / --accent-purple / --accent-orange
--trend-up / --trend-dn
--c0..c4  (contribution graph green scale — GitHub's own 5-step ramp)
```

Light mode exists (`[data-theme="light"]` on `<html>`) and mirrors GitHub's light theme rather than being a naive color inversion — every token above gets a distinct light-mode value, not a CSS `filter: invert()`. It respects `prefers-color-scheme` on first load and remembers an explicit user choice in `localStorage` after that.

### 2.2 Typography

Monospace throughout, no exceptions — headings, body copy, and data all share one typeface. GitHub itself is not monospace-everywhere (it uses a sans-serif UI font and reserves monospace for code); MovieGit deliberately goes further than its own reference, because the product's central claim is that watching a film *is* a technical act, and a sans-serif UI would undercut that claim visually even while the rest of the page argues for it.

### 2.3 Iconography

All icons are an inline SVG `<symbol>` sprite (`<svg><defs><symbol id="i-NAME">`), used via `<svg class="ic"><use href="#i-NAME"/></svg>`. This wasn't the original approach — v1.1 through v1.4 used the Tabler Icons webfont from a CDN. That CDN began 404ing at some point in that window, and because a missing icon font fails silently (empty glyph, not a visible error), every icon in the product — including the four header buttons — was rendering blank for an unknown period before it was diagnosed. The fix wasn't a different CDN; it was removing the CDN dependency entirely. The sprite is self-contained, versioned with the rest of the file, and physically cannot 404. This is documented as a standing rule in `CLAUDE.md`: never reintroduce the webfont.

### 2.4 Motion

Micro-interactions only — hover states, tab-underline transitions, a fade on toast notifications. Nothing decorative. `prefers-reduced-motion` is respected throughout. The one deliberately playful animation is the contribution-graph tooltip and the milestone markers (gold dots at the 50th/100th/250th/500th film) — treated as data annotations, not flourishes.

## 3. The metaphor, mapped explicitly

| GitHub concept | MovieGit equivalent | Design decision this drove |
|---|---|---|
| A commit | A logged film | Deterministic 7-char hash (FNV-1a of title+year) shown next to every film, everywhere — diary rows, terminal output, CLI output. It has to be the *same* hash in all three places or the metaphor breaks; this is enforced by sharing one hash function across the browser and CLI (`cli/src/domain.js`), not just styling it consistently. |
| Contribution graph | 52-week watch heatmap | Reused GitHub's exact 5-level green ramp and week/day grid layout rather than a generic calendar heatmap library, specifically so it reads as *the* contribution graph on sight. |
| Commit log | Diary / `mg log` | Diary is the friendly, poster-thumbnail version; `mg log` is the literal terminal-formatted version (`[hash] [date] [title (year)] [★★★] — Director`). Both exist because a portfolio visitor wants the friendly one and a developer visitor wants to see the literal one exists. |
| Starred repositories | Canon shelf | Canon films are films liked on Letterboxd or manually tagged, displayed as a pinned-item grid — deliberately mirroring GitHub's pinned-repositories block on a profile, including the tier view (S/A/B/C) as an alternate "sort by significance" layout. |
| Repo language bar | Sidebar genre bar | Added in the most recent design pass specifically because the prior version (five separate stacked bars, one per genre) was a generic stats-page pattern, not a GitHub one. GitHub's actual language indicator is a single continuous segmented strip with all languages touching. That's now reproduced exactly (`.lang-bar`), with the per-genre rows kept underneath for the name/%/avg detail the strip alone can't carry. |
| `git blame` | `mg blame <film>` | The one command with no close analogue elsewhere in the product — it's the design's clearest bet, because it requires the underlying data (TMDB consensus rating, per-genre averages, director trust) to actually support a "why," not just a display of one number. |
| `git diff` | `mg diff <year1> <year2>` | Structured as an actual diff — additions/deletions framing for a taste comparison across two years — rather than a generic "compare" UI pattern. |
| Repo nav tabs | Overview / Diary / Stats / Canon | Underline-on-active with an orange border, no pill fill — GitHub's own repo-nav treatment, adopted after an earlier version used a filled-pill active state that read as generic dashboard chrome rather than GitHub chrome specifically. |

## 4. Interaction principles

- **No modal-first flows.** Settings, About, and the `mg` terminal are all overlays/drawers, not full-page navigations, because GitHub's own settings and command-palette patterns are lightweight overlays, not page transitions.
- **The terminal is a real terminal, not a chat window.** Command history (↑/↓), quoted-argument parsing, and a monospace prompt (`mg@username:~$`) are all present because a fake-looking terminal would undercut the product's central claim faster than any visual mismatch would.
- **Every icon-only button carries a tooltip.** This was a direct fix, not a stylistic default: the four header buttons (terminal, share, settings, theme) had no textual affordance at all before hover tooltips were added, and during the period the icon sprite was broken (§2.3), they were rendering as unlabeled empty squares — the worst possible combination. Tooltips are now non-negotiable on any icon-only control.
- **Never fabricate data for visual consistency.** Recorded here because it's a design decision as much as a product one: a request to smooth out the contribution graph's clustering by spreading out watch dates was declined (see [PRD §8](PRD.md#8-out-of-scope-requests-considered-and-declined)). The graph's clustering is a legitimate artifact of how Letterboxd's films-grid scrape assigns dates to newly-synced films (see [Architecture §4](ARCHITECTURE.md#4-the-rss-dead-end-and-what-replaced-it)), and the design response to an inaccurate-looking graph is to fix the data pipeline, not to fake the display.

## 5. Responsive behavior

Three breakpoints, chosen around where the two-column (sidebar + content) layout actually breaks rather than at conventional device-width boundaries:

- **900px** — sidebar narrows to 200px, metric cards go 2×2, stats panels collapse to a single column.
- **768px** — sidebar becomes a horizontal strip (avatar + stat tiles only, genre detail dropped), nav wraps below the header, and the contribution graph gets horizontal scroll rather than being crushed.
- **480px** — tighter spacing throughout, canon grid drops to 2 columns.

Mobile is a first-class target, not an afterthought pass: the product's primary use case (a portfolio link shared and opened on a phone) makes this non-optional rather than nice-to-have.

## 6. Accessibility

- Every icon-only interactive element has an `aria-label` in addition to its tooltip.
- Focus rings are visible (`:focus-visible`) on every interactive control, added explicitly during the most recent design pass rather than relying on browser defaults, which are inconsistent across the icon-button and nav-tab custom components.
- Color is never the sole signal — the contribution graph's intensity levels, the star ratings, and the taste-divergence colors (green/red for "you rated this higher/lower than consensus") are always paired with a number or label.
- `prefers-reduced-motion` and `prefers-color-scheme` are both read and respected on load, not just exposed as manual toggles.

## 7. What was deliberately not pursued

- **A settings-driven full theming system** (custom accent colors, layout density options) — rejected as scope creep against the "faithful to one specific reference" premise in §1. The point is that it looks like GitHub, not that it's configurable.
- **Animated page transitions between tabs** — GitHub's own tab navigation is instant, no transition; matching that meant explicitly *not* adding one here even though it would have been easy to add.
- **A custom font** — monospace system fonts were chosen over a licensed/webfont monospace specifically to keep the zero-dependency, zero-build-step constraint intact (see [Architecture §1](ARCHITECTURE.md#1-the-single-file-constraint)) — one more surface area removed from "things that can 404."
