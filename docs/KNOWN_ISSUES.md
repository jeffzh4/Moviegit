# MovieGit — Known Issues

**Status:** Living document — updated as issues are found, fixed, or accepted
**Last updated:** 2026-08-02

A disclosed-limitations list, not a bug tracker. Everything here is a current constraint of the shipped product, stated plainly so a reader doesn't have to take the README's confidence at face value. Items move to [CHANGELOG.md](../CHANGELOG.md) once fixed, not silently off this list.

---

## Data accuracy

### Newly-synced films get an approximate date, not a real one

Letterboxd's profile films grid — the data source live sync depends on (see [ARCHITECTURE.md §4](ARCHITECTURE.md#4-the-rss-dead-end-and-what-replaced-it)) — carries no per-film timestamp. A film discovered by sync is dated to the day the sync *saw* it, not the day it was actually watched. The contribution graph's most recent activity can therefore cluster on a single day even when the films were watched across several. This is a visible limitation, not a bug, and it is why a request to *further* smooth the graph by fabricating dates was declined (see [PRD.md §8](PRD.md#8-out-of-scope-requests-considered-and-declined)). The honest fix is logging to Letterboxd's diary (which does carry a real date) rather than rating only; that's a workflow change for the account owner, not something the tool can correct after the fact.

### The CLI can only see a user's 72 most-recently-watched films

Letterboxd serves page 1 of the films grid to any client, but returns `403` for `/films/page/N/` (N > 1) to non-browser requests — confirmed by direct testing. CORS proxies fare no better against deeper pages (observed `520`/`429` responses). The CLI's read commands (`log`, `blame`, `wrapped`, etc.) therefore reliably see only the 72 most recently-watched films and say so (`truncated` flag, surfaced in output) rather than silently under-reporting. The browser dashboard doesn't have this ceiling because it seeds full history from a one-time CSV export and only uses live sync for what's new since — a workaround, not a real fix for the CLI's read depth.

## The CLI's write path is unverified

`mg commit` (writing a diary entry to Letterboxd) has never been confirmed against a real authenticated write. See [ROADMAP.md §1](ROADMAP.md#1-verify-mg-commits-live-write-path-against-a-real-letterboxd-account) for why, and what "done" looks like. Every component up to the final POST has been independently verified (film-page resolution, film-ID extraction, CSRF-token extraction, all against live Letterboxd pages), and the write function reports failure rather than assuming success on an ambiguous response. But "written to fail honestly" is not "confirmed to succeed." Treat `mg commit` as unverified until this entry is removed.

## Sync reliability

### The CORS proxy chain is a real single point of partial failure

The browser dashboard has no direct network access to Letterboxd, so live sync depends on one of three public CORS proxies (`allorigins.win`, `cors.eu.org`, `codetabs.com`, tried in order) succeeding. These are free, rate-limited services outside this project's control, and have been observed failing under moderate testing load. A failed sync cycle is non-fatal (the dashboard keeps rendering the last successfully-synced history), but "live" sync has an occasionally visible latency floor that has nothing to do with this codebase.

### The Letterboxd scrape depends on undocumented HTML structure

Both the films-grid parser and the CLI's film-page resolver (slug-guess-and-verify, since Letterboxd's `/search/` endpoint also 403s non-browser clients) depend on Letterboxd's current HTML markup — specific class names (`rated-N`), data attributes (`data-item-slug`), and embedded JS globals (`CSRF = '...'`). None of this is a documented, versioned API. A Letterboxd front-end change could break sync or the write path with no warning beyond a failed request.

## Multi-user support is functional but unpolished

The Settings panel (v1.5) lets a visitor point the dashboard at their own Letterboxd account without forking the source. A review during implementation caught and fixed a correctness bug in this flow twice. First, a visitor's custom username was seeded with the maintainer's own watch history. Second, the fix for *that* cleared cached history in only one direction (switching *to* a custom account), not back to default. Both are fixed as of `3b4b085`, but the class of bug (state leaking across an identity switch with no backend to isolate accounts) deserves attention if this flow is extended. A later pass added existence validation before committing to a new username (it fetches the account's films grid and shows a non-blocking warning if it can't confirm); the original "raw text field with no validation" gap is closed.

## Color contrast — fixed, two lessons kept for the record

Wiring an `axe-core` scan into CI (see [ARCHITECTURE.md §8](ARCHITECTURE.md#8-ci-and-verification-gates)) first reported 71 `color-contrast` violations. The number was almost entirely a scanner artifact, not a design defect: every `.tab-panel` plays a 200ms `fadeIn` on mount, and axe's default synchronous snapshot could catch it mid-animation (opacity 0), which reads as a contrast failure on nearly every visible text node on the page. Re-running with `--load-delay 800` (giving the fade time to finish before the scan) collapsed 71 down to **3 real violations**, all `--text-tertiary` (`#6e7681` dark / `#818b98` light) against `--bg-tertiary`, measured at 3.97:1 against a 4.5:1 AA requirement. Both are fixed: `--text-tertiary` is now `#858d98` (dark) / `#616b78` (light), verified at 0 violations with the delay-corrected scan. `.github/workflows/a11y.yml` now runs with `--exit` (blocking) since there's no longer a known backlog to hide behind a non-blocking job.

Two lessons. First, a scanner's raw violation count is a starting point, not a verdict: a 71-violation "finding" that was really 3 violations plus a 68-violation animation-timing artifact would have been easy to dismiss entirely (wrong) or "fix" by hunting for 71 wrong colors (also wrong, and slower). Second, this had been an unmeasured assumption in [DESIGN.md §6](DESIGN.md#6-accessibility) before the scan ran; be wary when a design doc states an accessibility property without a machine check behind it.

## Engineering process

### No automated test suite

Neither `index.html` nor `cli/` has unit or integration tests. This is a stated, deliberate constraint (see [ARCHITECTURE.md §8](ARCHITECTURE.md#8-ci-and-verification-gates)) given the single-file, zero-build-step design, not an oversight. Verifying any change means a syntax gate plus manual, live verification against real Letterboxd/TMDB data, not a regression suite. A change that isn't manually re-verified against the live site could regress silently.

### `npm publish` hasn't happened yet

Covered in the roadmap ([ROADMAP.md §2](ROADMAP.md#2-publish-moviegit-to-the-npm-registry)) — the README's `npm install -g moviegit` instruction is currently aspirational.

## Scoped-out, not broken

Intentional cuts that read like gaps, listed so they aren't mistaken for oversights:

- **Composer data** comes from a small hand-curated map, not live TMDB credits — TMDB's composer-crew data is inconsistently populated, and a curated map was judged more reliable for the ~15 directors/composers the stat actually surfaces meaningfully for.
- **Director-completion** is capped at a director's top 12 films by design, to bound TMDB person-API request volume.
- **No watchlist management, no social features, no Letterboxd OAuth** — all explicit non-goals; see [PRD.md §4](PRD.md#4-non-goals).
