# MovieGit — Architecture

**Status:** Reflects the codebase as of v1.5 (commit `9c4cd64`)
**Last updated:** 2026-08-02

---

## 1. The single-file constraint

`index.html` is ~5,500 lines and is the entire dashboard: markup, CSS, and every module of JavaScript, in one file, with zero build step and zero server. This is a constraint carried forward from the project's very first commit, not a limitation nobody got around to fixing. It buys three things a bundled SPA doesn't get for free:

- **It deploys as a static file to GitHub Pages with no build pipeline to keep working.** There is no webpack config, no `npm run build`, no dependency lockfile for the dashboard itself to go stale. The file that's in the repo is the file that's served.
- **It runs from `file://` with no server at all**, which matters for the self-hosting use case documented in the README (download two files, edit two constants, open in a browser).
- **Every dependency the dashboard has is CDN-loaded at runtime** (previously the Tabler icon webfont — see [Design Doc §2.3](DESIGN.md#23-iconography) for why that specific dependency was removed) rather than vendored or bundled, keeping the "one file" claim literally true.

The cost of this constraint shows up directly in §3: it's the reason the shared domain-logic module can't simply be `import`ed into the dashboard the way the CLI imports it, and it's the reason a small dev-time sync script exists instead.

## 2. Module map

Inside `index.html`'s single `<script>` block, the code is organized as a sequence of IIFEs, each with one responsibility:

```
CFG       — config: username, TMDB key (obfuscated), poll interval, visitor overrides
STORE     — localStorage read/write, including generic readJSON/writeJSON for arbitrary keys
DATA      — CSV parsing, entry merge/dedup, and thin delegations into MG_DOMAIN
MG_DOMAIN — inlined copy of cli/src/domain.js (see §3) — parsing, rating math, hashing
LB        — Letterboxd sync: films-grid scrape + CORS-proxy chain; fetchUserFilms for merge/cherry-pick
TMDB      — lazy enrichment (search → details → credits), batched, rate-limited, cached
RENDER    — every view renderer (overview, diary, stats, canon) + shared esc()/mgHash delegation
UI        — tab switching, theme toggle, modal, share, keyboard shortcuts
MG        — bootstrap, poll loop, seed-merge logic, sync reflog
MGSH      — the mg terminal: drawer UI + a 29-command registry
```

The CLI mirrors this at the file level instead of the IIFE level, since it's a real Node package:

```
cli/bin/mg.js         — argv parsing, command dispatch, --help text
cli/src/commands.js   — the 20 command implementations (~350 lines)
cli/src/domain.js     — canonical shared logic (~220 lines) — see §3
cli/src/letterboxd.js — films-grid fetch + pagination + film-page resolution
cli/src/tmdb.js       — enrichment, thin wrapper around domain.js's URL builders
cli/src/auth.js       — the unofficial write path (cookie-based, see §5)
cli/src/config.js     — ~/.config/moviegit/ read/write
cli/src/format.js     — terminal color/formatting, re-exports domain.js's mgHash/starGlyphs
```

## 3. The shared domain module, and why it exists

Through v1.4, the dashboard and the CLI were two independent implementations of the same product, and several pieces of genuinely identical logic had been written twice: the films-grid HTML parser, the TMDB field-extraction logic, and — more subtly — the *formulas* behind `blame`, `merge`, and `wrapped` (rating-divergence math, taste-compatibility scoring, streak calculation). They had matching magic constants (batch size 4, 280ms enrichment pacing, the same `compat = round((1 - meanΔ/4.5) * 100)` formula) that made the duplication unambiguous rather than coincidental.

This wasn't hypothetical risk — it had already caused a real bug. The CLI's film-matching function had three match tiers (exact → starts-with → includes); the dashboard's `cherry-pick` command had quietly regressed to two tiers at some point, so the same ambiguous query could resolve to a different film depending on which surface you asked. Two independent copies of "the same logic" don't stay the same; they drift, silently, until something depends on the difference.

**The fix:** `cli/src/domain.js` is now the single canonical implementation of every piece of logic both surfaces need — parsing, rating math, film lookup, TMDB field extraction, hashing, streak calculation, display formatting (`formatAgo`, `starGlyphs`), and the blame/merge/wrapped formulas. It has zero dependencies, touches no `fetch`, no DOM, and no `localStorage` — it's pure data in, data out, so both a browser environment and a Node environment can run it unmodified.

- **The CLI imports it directly** (`import { ... } from './domain.js'`) — trivial, since `cli/` is already a real Node ESM package.
- **The dashboard can't import anything** (§1), so `scripts/sync-domain.py` inlines `cli/src/domain.js`'s source into a marked block in `index.html` (`/* DOMAIN:BEGIN */` … `/* DOMAIN:END */`) at dev time, stripping only the ES-module `export` keywords. The embedded copy is otherwise byte-identical to what the CLI imports.
- **`scripts/check-domain-sync.py`, wired into CI, fails the build if the two ever disagree** — i.e., if someone edits `domain.js` and forgets to re-run the sync script. This is the actual enforcement mechanism; without it, "single source of truth, inlined at dev time" would just be a slower way to reintroduce the same drift the module exists to prevent.

This was refactored incrementally, in six separate commits, each independently reviewed and each verified live in both the browser terminal and the installed CLI before merging (`2b76231` through `9c4cd64` in the changelog) — deliberately, so that a single large "extract everything" commit wouldn't hide a regression in one command among forty others.

## 4. The RSS dead end, and what replaced it

This is the single most consequential architectural decision in the project's history, and it's worth documenting in full because the failure mode is non-obvious.

Letterboxd's RSS feed (`letterboxd.com/{user}/rss/`) **only publishes diary entries** — films logged with an explicit watched-date via Letterboxd's diary flow. The account this dashboard tracks logs films by *rating them and marking them watched*, which is a different, more common Letterboxd workflow that never creates a diary entry. For this account, and for any account using that workflow, the RSS feed was — and always had been — completely empty of film-watch data. It contained only user-created lists.

This was not diagnosed correctly the first three times it was investigated. Commits `dc17ff6`, `a6c4e26`, and `8e7242d` each treated the symptom ("new films aren't showing up") as a parsing or transport problem: XML namespace handling, CORS proxy reliability, cache-busting. Each fix genuinely improved feed *reliability* — and none of them could have worked, because there was nothing in the feed to parse correctly. The actual root cause was only found by fetching the raw feed directly and reading its contents: five items, all lists, zero diary entries, confirmed against a byte-for-byte identical response on a second fetch minutes later.

**The fix (`a62f63c`) replaced the data source, not the parser.** Letterboxd's profile films grid (`letterboxd.com/{user}/films/`) lists *every* watched film with its star rating (`rated-N` CSS class, N/2 = stars), newest-watched first, and updates the instant a film is rated and marked watched — regardless of whether it was ever diaried. This is what both the dashboard and the CLI now scrape.

Two consequences of this data source, both handled explicitly rather than papered over:

- **No per-film date.** The films grid has no timestamp field. A newly-discovered film is stamped with the date it was first *seen by the sync*, not the date it was actually watched ("commit-today" semantics) — an approximation, disclosed in [Known Issues](KNOWN_ISSUES.md), not hidden. Films already in history keep their real date from the original CSV-export seed; re-polling only upgrades a rating in place, never duplicates a row.
- **Browser and CLI need different transports for the same scrape.** The browser has no direct access to Letterboxd (CORS), so it routes through a proxy chain (`allorigins.win/raw` → `cors.eu.org` → `codetabs.com`, tried in order, non-fatal on total failure — stored history just doesn't update that cycle). The CLI runs server-side and hits Letterboxd directly with no proxy. This is the one piece of logic the domain-module refactor (§3) deliberately did *not* try to unify — the transport difference is real and load-bearing, not incidental duplication.

## 5. The CLI's write path, and the packaging bug caught before it shipped

Letterboxd has no public write API. `mg commit` (the CLI's only mutating command against Letterboxd) works by replaying the same authenticated HTTP request Letterboxd's own website makes when a user logs a film through the site's UI — an unofficial, intentionally fragile integration that can break whenever Letterboxd changes that form, and says so in its own `--help` text.

The design constraint here was as much about trust as engineering: the CLI **never handles a password**. Authentication is a session cookie (`letterboxd.signed.in.as`) the user copies out of their own browser's DevTools and supplies explicitly via `mg auth --cookie`. It's stored at `~/.config/moviegit/credentials.json` with `0600` permissions and is sent to exactly one host. Every write attempt reports success or failure honestly — an ambiguous server response is treated as failure with an explanation, never assumed to have worked.

Separately, during the CLI's initial build, a real packaging defect was caught before publishing: `cli/src/domain.js` was originally placed at the repository root (`domain/letterboxd.mjs`), and the CLI imported it via a relative path (`../../domain/letterboxd.mjs`) that reached *outside* the npm package's root directory. `npm pack`/`npm publish` cannot include files outside the package root — a real `npm install -g moviegit` would have installed a package whose imports pointed at files that didn't exist, failing at runtime on the very first command. The fix was relocating the module to `cli/src/domain.js`, inside the package boundary, and confirming its presence in `npm pack --dry-run`'s file list as part of the CI job (`.github/workflows/ci.yml`) rather than trusting the directory structure by inspection alone.

## 6. Data model

```javascript
{
  id: string,           // Letterboxd URI slug
  title: string,
  year: number,
  director: string,     // from TMDB
  rating: number,        // 0.5–5.0, null if unrated
  watchedDate: string,   // ISO date YYYY-MM-DD
  rewatch: boolean,
  tags: string[],
  letterboxdUrl: string,
  tmdbId: number,
  poster: string,        // TMDB poster path
  genres: string[],
  runtime: number,       // minutes
  country: string,
  decade: number,        // e.g. 1970
  canon: boolean,
  voteAvg: number,       // TMDB 0–10
  voteCount: number,
  popularity: number,
  source: 'seed' | 'rss' | 'manual',
}
```

`source` is a small but load-bearing field: it distinguishes films from the original CSV-backed seed (real dates), films picked up by the live films-grid scrape (approximate dates, per §4), and films logged manually through `mg commit` in the terminal (`source: 'manual'`) — which affects how merge/dedup logic treats a re-poll of the same film.

## 7. localStorage as the entire persistence layer

There is no backend, so every piece of state lives in the browser's `localStorage`, accessed through `STORE`'s generic `readJSON`/`writeJSON` (added specifically to stop a class of bug where individual modules were reinventing the same try/parse/stringify pattern locally — see the CHANGELOG entries for `95c5720`). Keys in active use:

| Key | Contents |
|---|---|
| `mg_history` | Full parsed film log |
| `mg_tmdb_cache` | TMDB ID → enriched metadata |
| `mg_dir_filmography` | Director name → `{ tmdbId, total }`, for the director-completion stat |
| `mg_last_poll` | ISO timestamp of the last sync |
| `mg_user_settings` | Visitor-supplied username/TMDB-key override (Settings panel) |
| `mg_seed_version` | Which baked-in seed the current history was last merged against |
| `mg_branches` / `mg_head` / `mg_stash` / `mg_reflog` | mg-terminal state: named film collections, active branch, watchlist, sync audit log |

The CLI has its own, entirely separate persistence at `~/.config/moviegit/` (`config.json`, `credentials.json`, `cache.json`) — the two surfaces share logic (§3), not storage; there was never a design intent to sync state between a browser session and a terminal session.

## 8. CI and verification gates

There is no test framework for either surface — a deliberate, disclosed choice rather than an oversight (documented as a standing constraint in the project's internal engineering notes). The verification gates that exist are cheap, targeted, and each one exists because it caught a real problem once:

- **`scripts/check-syntax.py`** — a brace-balance check across `index.html`'s inline `<script>` block. For a single 5,500-line file with no compiler, this is the cheapest available signal that an edit didn't silently break the page.
- **`scripts/check-domain-sync.py`** — fails if the dashboard's inlined domain logic has drifted from `cli/src/domain.js` (§3).
- **CLI job** — `node --check` on every source file, `mg --help` actually runs, and `npm pack --dry-run` is inspected for contents — the last of which exists specifically because of the packaging bug in §5.

These three run on every push and pull request via `.github/workflows/ci.yml`, requiring zero secrets — appropriate for a project with no backend to hold credentials for in the first place.

A separate workflow, `.github/workflows/a11y.yml`, runs an `axe-core` scan (via `npx @axe-core/cli`, so no persistent dependency is added to the repo) against the served page for WCAG 2 A/AA violations, with `--load-delay 800` so the scan runs after `.tab-panel`'s 200ms `fadeIn` settles (without the delay, axe can snapshot mid-fade and report false-positive contrast failures on nearly every text node — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md#color-contrast--fixed-two-lessons-kept-for-the-record) for how that inflated the first run's count to 71 when only 3 were real). Both real violations are fixed and the job runs with `--exit` (blocking) — this is the same reasoning that keeps `check-syntax.py`/`check-domain-sync.py` narrow and targeted rather than a generic test suite: a verification gate is only useful while it's still telling you something you didn't already know.
