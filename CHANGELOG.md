# Changelog

All notable changes to MovieGit are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are the day each change actually landed on `main`, taken from commit history rather than reconstructed after the fact.

For the reasoning behind the larger changes — not just what changed but why — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), which documents several of these in full post-mortem detail.

---

## Unreleased (engineering hardening + PM-portfolio pass, on `main`)

**2026-07-27 → 2026-08-02**

A six-commit refactor pass, each independently reviewed and verified live before merging, addressing duplication between the browser dashboard and the CLI that had already caused one real bug (see below) — followed by a documentation and product-facing pass.

- **Extracted `cli/src/domain.js`** as the single canonical implementation of logic that had been written twice: films-grid parsing, TMDB field extraction, rating math, film lookup, and the `blame`/`merge`/`wrapped` formulas. The CLI imports it directly; the dashboard inlines it via a new dev-time sync script (`scripts/sync-domain.py`), with a CI-enforced drift check (`scripts/check-domain-sync.py`) so the two copies can't silently diverge again.
- **Fixed the bug the refactor was named for**: `cherry-pick`'s film-matching had quietly regressed to a narrower 2-tier match than `blame`'s canonical 3-tier match, so an ambiguous query could resolve to a different film depending on which command you ran.
- **Caught and fixed a packaging defect before it shipped**: the domain module was initially placed outside the CLI's npm package root, which would have broken `npm install -g moviegit` for every user. Relocated inside the package, verified via `npm pack --dry-run` in CI.
- Consolidated average-rating math, film-matching, HTML-escaping, `localStorage` JSON access, commit hashing, longest-streak calculation, "time ago" formatting, and star-glyph rendering — each of which had been reimplemented at 2–7 separate call sites across the two surfaces.
- **GitHub-esque polish**: replaced the sidebar's five separate per-genre bars with a single continuous segmented strip, matching GitHub's own repo-language-bar pattern exactly.
- **Added full product/engineering documentation** — PRD, design doc, architecture doc, roadmap, known issues, future features, and this changelog, all cross-referenced (see `docs/`).
- **Added `docs/CASE_STUDY.md`** — a full post-mortem of the RSS sync bug's four debugging attempts, three of which were real, correctly-fixed bugs that weren't the actual root cause.
- **Settings panel now validates a custom username before committing to it** — fetches the account's films grid before saving, shows a CLI-`mg login`-style confirmation on success, and an honestly-worded (non-blocking) warning if the account can't be verified.
- **Added a shareable report card** (`?report=YYYY`) — a standalone, linkable year-in-review view, reachable via a new share button on the Overview tab's Year in Film panel. Also fixed a pre-existing bug this surfaced: the `.modal` class had no background styling of its own.
- **Live CI badge + accessibility CI check** (`.github/workflows/a11y.yml`, axe-core, WCAG 2 A/AA). First run reported 71 color-contrast violations; root cause was mostly a scan-timing artifact (axe snapshotting mid `fadeIn`), not a real defect — corrected with `--load-delay`, which reduced it to 3 genuine violations (`--text-tertiary` at 3.97:1 against `--bg-tertiary`). Both fixed (`--text-tertiary` now `#858d98` dark / `#616b78` light, 0 violations verified); the job now runs with `--exit` (blocking). Getting the CI job itself to run cleanly on the GitHub-hosted runner took a further four fixes — a Chrome/chromedriver version mismatch, an environment variable that wasn't crossing step boundaries, a genuine transparent-text race in a since-added loading skeleton, and two more real contrast failures (`.af-stars` and `#badge-diary`) that only surfaced in light theme, which this machine's local headless default never exercised.
- **Repository presentation pass**: added a description, homepage link, and topics to the GitHub repository itself (previously blank, so the repo carried no context in search or on the profile page), and replaced the placeholder favicon used as both `og:image` and Twitter card image with a purpose-built social preview graphic (`docs/assets/social-preview.png`) rendered from the dashboard's own theme tokens rather than a generic template. GitHub's own repo-level social preview (Settings → General → Social preview, distinct from the live site's OG tags) has no API and still needs a manual upload of the same PNG.

## v1.5 — 2026-07-22

- **`mg` CLI** — a real, installable command line (`npm install -g moviegit`), zero dependencies, Node 18+. Read commands need no authentication; `mg commit` logs films to Letterboxd from your shell using your own session cookie, never a password. Commit hashes match the dashboard exactly.
- **Settings panel** — a visitor can point the dashboard at their own Letterboxd username and TMDB key at runtime, without forking the source. Shipped alongside a same-day fix for a real bug where a custom username was incorrectly seeded with the maintainer's own watch history, and a second fix for the same bug's mirror image on the reset-to-default path.
- **Icons moved to inline SVG** — the Tabler icon webfont CDN had started returning 404s, silently blanking every icon in the UI, including the four header buttons. Replaced with a self-contained sprite; the dashboard now has zero external dependencies.
- **CI added** — GitHub Actions running syntax checks on the dashboard and the CLI, plus an `npm pack --dry-run` check, on every push and PR.
- `.gitignore` cleanup for generated tooling output (`graphify-out/`, `.claude/`), with a same-day fix to restore pre-existing entries an overly-broad first pass had accidentally dropped.

## v1.4 — 2026-07-21 to 2026-07-22

- **`mg` terminal** — a real command line in a bottom drawer (`` ` `` or the header terminal button), 28 git-style commands: `status` `log` `commit` `pull` `fetch` `push` `show` `grep` `diff` `shortlog` `contributors` `streak` `tag` `branch` `checkout` `stash` `revert` `blame` `remote` `reflog` `clone` `merge` `cherry-pick` `rebase` `wrapped` `bisect` `gc` `config`.
- `mg blame` traces *why* a rating happened (TMDB divergence, genre averages, director trust); `mg merge <user>` scores taste compatibility against another account; `mg bisect` locates the film after which your ratings shifted most.
- **Poster fix** — removed an enrichment cap that left films past #80 permanently unposted, added a 24-hour negative cache for films TMDB doesn't have (rather than re-querying every load), and upgraded stored posters to a higher resolution with a one-time migration.
- **GitHub-esque polish** — header button tooltips, underline tab navigation, visible focus rings, `prefers-reduced-motion` support.

## v1.3 — 2026-07-21

- **Live sync that actually works.** Root-caused and fixed the RSS dead end (full account in [docs/ARCHITECTURE.md §4](docs/ARCHITECTURE.md#4-the-rss-dead-end-and-what-replaced-it)): Letterboxd's RSS feed only publishes diary entries, and this account logs by rating + marking watched, never diarying — the feed was structurally empty of film data, not misconfigured. Replaced RSS with a scrape of the profile films grid, which lists every watched film with its rating regardless of diary status. Fixed a related enrichment race that could drop freshly-synced films.
  - *(This fix followed three earlier attempts — 2026-06-01, 2026-06-02, and 2026-06-13 — that treated the symptom as an XML-parsing or CORS-proxy problem. Each incrementally improved feed reliability without being able to fix the actual issue, since there was nothing in the feed to parse correctly. Preserved in git history as a real example of a debugging process, not edited out.)*

## v1.2 — 2026-05-29

- `?user=<handle>` guest view for read-only public sharing, `?tab=` deep-linking, contribution-graph tooltips showing film titles per day, milestone markers at the 50th/100th/250th/500th film, a rewritten Taste DNA panel (prose personality profile instead of a stats dump), a Web Share API button, and a visible TMDB-enrichment progress bar.

## v1.1 — 2026-05-27

- Initial public release. Contribution graph, `mg log` terminal-style diary view, director-completion percentage (lazy TMDB person-API lookups, cached), a taste-drift panel (year-over-year diff), mobile responsiveness, live avatar pulled from Letterboxd, and keyboard shortcuts (`1`–`4` for tabs, `/` for diary search).
- Also shipped in this release, as the dashboard's original foundation: the 52-week heatmap, metric cards (avg rating, watch time, films this month, rewatches), rating distribution, recent-activity feed, the 15-panel stats view, the canon shelf (grid + tier views), the about modal, light/dark theming, TMDB enrichment, and CSV-based history seeding.
