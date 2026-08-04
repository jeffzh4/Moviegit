# MovieGit — Product Requirements Document

**Status:** Shipped (v1.5), actively iterated
**Owner:** Jeffrey Zhang
**Last updated:** 2026-08-02

---

## 1. Problem

Letterboxd is the system of record for a film watcher's taste, but it presents that data the way a social network presents an activity feed: chronological, ungrouped, and optimized for browsing other people's profiles rather than understanding your own. There is no view of *pace* (how much you're watching, and when), no view of *divergence* (where your taste disagrees with consensus), and no way to interrogate the data beyond what Letterboxd's own UI happens to expose.

Developers already have a tool that solves an analogous problem for a different kind of history: GitHub. A contribution graph turns a year of activity into one glance. A commit log turns a list of changes into a navigable record. A `git blame` turns "why does this line look like this" into an answerable question. None of that vocabulary exists for film-watching, even though the underlying shape of the data — timestamped events with metadata, attributable to sources, gaining a "why" only in aggregate — is the same.

MovieGit is that vocabulary, applied. It is not a Letterboxd competitor and does not try to be a social platform; it is a read-oriented lens over data a single person already owns, plus (as of v1.5) a real command line for interrogating it the way a developer would interrogate a codebase.

## 2. Target user

**Primary:** the account owner — someone with an existing Letterboxd habit who wants their watch history to read like a developer profile, either for their own use or as a portfolio artifact (this repo's own instance, at `jeffzh4.github.io/Moviegit`, is exactly that: a hiring signal disguised as a film dashboard).

**Secondary:** a visitor to that portfolio — someone evaluating the account owner (a recruiter, a fellow developer) who spends 30–90 seconds on the page and needs the value proposition ("this person thinks in commits and streaks, and built the tool to prove it") to land immediately, without an account, a login, or a loading spinner.

**Tertiary, as of v1.5:** a second Letterboxd user who points their own copy of the dashboard, or the `mg` CLI, at their own account. This persona was explicitly out of scope through v1.4 (the codebase had a single hardcoded username) and became supported — imperfectly, see [Known Issues](KNOWN_ISSUES.md) — with the Settings panel.

## 3. Goals

1. **Zero-friction viewing.** No login, no backend, no account creation to look at the primary instance. A visitor's first byte should be the page itself.
2. **Faithful metaphor, not just faithful skin.** "Watching a film is a commit" has to hold up under interrogation — a deterministic hash per film, a real streak calculation, a real diff between two years — not just green squares that happen to look like GitHub's.
3. **Sync that actually works.** Early versions treated Letterboxd's RSS feed as the source of truth and it silently failed for any account that logs films by rating rather than diarying (see [Architecture §4](ARCHITECTURE.md#4-the-rss-dead-end-and-what-replaced-it) for the full post-mortem). Sync had to be fixed at the data-source level, not patched at the parser level.
4. **A second interface that isn't a toy.** The in-browser `mg` terminal and the installable `mg` CLI needed to be the same tool wearing two skins — same command vocabulary, same commit hashes, same math — not a browser gimmick with a CLI afterthought.
5. **Portfolio-grade engineering hygiene**, visible in the repo itself: CI, a documented architecture, an honest known-issues list, a real changelog. The product *is* partly the repo.

## 4. Non-goals

- **Not a social platform.** No following, no comments, no activity feed of other users. The `merge`/`cherry-pick` commands touch another user's *public* data for comparison, not interaction.
- **Not a Letterboxd replacement.** MovieGit has no write path to Letterboxd except the CLI's unofficial, opt-in `mg commit`, and it depends on Letterboxd remaining the account owner's real diary.
- **Not multi-tenant infrastructure.** There is no backend, no database, no user accounts. "Multi-user" (§ the Settings panel, `?user=`) means "this static page, pointed at a different public Letterboxd handle," not hosted accounts.
- **Not trying to out-feature Letterboxd's own stats.** Panels that already exist on Letterboxd Pro (e.g. basic genre breakdowns) are included for completeness but aren't the differentiator; the differentiator is the vocabulary (commits, blame, streaks, diff) Letterboxd doesn't have at all.

## 5. Success criteria

There is no analytics pipeline on this project by design (no backend, no tracking — see the badge on the README), so "success" is evaluated qualitatively against the goals above, not against a dashboard of numbers:

- A visitor with no context can explain what the page shows within 10 seconds of landing on it (the contribution graph is the anchor for this).
- The account owner's real watch history stays in sync without manual intervention across a normal week of Letterboxd use.
- `mg` in the browser and `mg` installed via npm produce identical hashes, identical star glyphs, and identical `blame`/`merge`/`wrapped` output for the same film — a hard requirement enforced by CI (`scripts/check-domain-sync.py`), not just an aspiration.
- The repository itself would survive a technical interviewer reading it cover to cover — architecture decisions have a stated "why," known limitations are disclosed rather than hidden, and the commit history tells a coherent story of a real fix, not a scripted one.

## 6. Key user stories

| As a... | I want to... | So that... |
|---|---|---|
| Portfolio visitor | See the account owner's watch activity as a heatmap immediately on load | I can assess "does this person actually build things" in the time I'd otherwise spend reading a resume bullet |
| Account owner | Have a film I rate on Letterboxd show up on my dashboard within minutes, with no manual export | The site never goes stale between visits and I don't have to remember to maintain it |
| Account owner | Ask "why did I rate this film so high compared to everyone else" | I get a data-backed answer (`mg blame <film>`), not just a rating number |
| Account owner, at a real terminal | Run the exact same commands I'd run in the browser, against my own shell | I'm not locked into a browser tab to interrogate my own data |
| Second Letterboxd user | Point the dashboard at my own account without forking the source | I can use the tool without becoming a contributor to it first |
| Repo reader (technical) | Understand why RSS sync was abandoned, why the domain module exists, and what's still broken | I trust the rest of the codebase because the parts that aren't perfect are the parts that are disclosed |

## 7. Scope history (why the product looks like this today)

MovieGit did not launch with any of this. v1.0/v1.1 was the dashboard alone, seeded from a one-time CSV export with RSS polling for updates. Every major addition after that was a response to something that didn't work in production, not a speculative feature:

- RSS polling was rewritten three separate times (v1.1 → v1.3) chasing dead CORS proxies and namespace-parsing bugs, before the actual root cause was found: the account's own Letterboxd habit (rate + mark watched, no diary entry) meant RSS was **structurally** empty for it, not just misconfigured. The fix was replacing the data source entirely (the films-grid scrape), not another parser patch.
- The `mg` terminal (v1.4) and then the standalone `mg` CLI (v1.5) exist because the git metaphor was incomplete without something to actually run commands against.
- The shared `domain.js` module (v1.5, post-launch) exists because the terminal and the CLI had quietly reimplemented the same formulas twice and had already drifted once (`cherry-pick`'s match logic vs. `blame`'s) before anyone noticed.

This history is preserved in full in [CHANGELOG.md](../CHANGELOG.md) and in the architecture rationale in [ARCHITECTURE.md](ARCHITECTURE.md) — deliberately, since the "why" is the part a product document usually loses first.

## 8. Out-of-scope requests considered and declined

Worth recording explicitly, since a PRD that only lists what shipped hides the judgment calls: a request to backdate/spread out watch-history timestamps to make the contribution graph visually smoother was declined. Fabricating activity history to make a public-facing artifact look more consistent than the underlying data is the same category of problem as backdating git commits to fake a work history — it would misrepresent real activity to anyone viewing the page, including the recruiters this project is partly built to be evaluated by. The honest alternative (log to Letterboxd's diary with real dates so sync stops needing to guess a date) was offered instead. See [Known Issues §Data Accuracy](KNOWN_ISSUES.md#data-accuracy) for the underlying limitation this request was trying to route around.
