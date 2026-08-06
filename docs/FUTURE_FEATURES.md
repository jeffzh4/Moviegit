# MovieGit — Future Features

**Status:** Idea backlog — not scoped, not committed
**Last updated:** 2026-08-02

This is deliberately separate from [ROADMAP.md](ROADMAP.md). Everything here is a direction worth exploring, not a plan with a definition of done. An idea graduates to the roadmap once it's actually scoped; until then, it stays here so the roadmap doesn't accumulate aspirational clutter.

---

### Taste Graph — a force-directed map of your own watch history

The product already borrows GitHub's *profile* vocabulary; this borrows its *dependency-graph* vocabulary instead. Nodes are films; edges connect films that share a director, genre, decade, or composer. Community detection over that graph would surface taste clusters the account owner never explicitly named — "your unlabeled 1970s-paranoia-thriller phase" — the same way code-dependency analysis surfaces architectural clusters nobody drew on a whiteboard. Bridge films (films that connect two otherwise-separate clusters) become a natural "why do you like both of these things" question, which is exactly the kind of question `mg blame` already answers for a single film — this would answer it for a *pattern* instead.

Why it's not on the roadmap yet: it needs a real design pass on the interaction model (a force-directed graph is expensive to make legible, not just expensive to compute) before it's scoped.

### Shareable diff/merge report card (extending the single-year card that shipped)

A single-URL, no-login report card shipped for the single-year case — `?report=YYYY` opens a standalone summary of one year's watching, linkable directly (see [CHANGELOG.md](../CHANGELOG.md)). `mg diff <year1> <year2>` and `mg merge <user>` still don't have a shareable equivalent: both compute real comparison data (a year-over-year diff, a cross-user compatibility score) that currently only renders inside the terminal or a live dashboard session. Extending the same `?report=` mechanism to a `?report=diff&from=Y1&to=Y2` or `?report=merge&vs=user` form is the natural next step — the hard part (a standalone, addressable card view with its own share affordance) is already built; what's missing is centralizing the diff/merge math in `cli/src/domain.js` the way `blame`/`wrapped` already are, so the card isn't a third reimplementation of logic that already exists twice.

### A recommendation engine that argues from divergence, not popularity

The data already exists to build this: `blame`'s rating-vs-TMDB-consensus delta, combined with a per-genre/per-director bias vector (the raw material behind the Taste DNA stats panel). The idea is a recommendation surface that explicitly looks for films where the *predicted* rating (given the account owner's own bias) is high but the TMDB consensus is mediocre-to-low — the inverse of a popularity-driven "trending" feed. Candidate films would be pulled from TMDB's director/genre filmography endpoints, which the director-completion feature already integrates with.

### `mg wrapped` as a generated share image

`mg wrapped` already produces a genuinely good year-in-review summary in both the terminal and the CLI. It has no visual, shareable form — no PNG export, no OG-image equivalent for social sharing. Given the zero-backend constraint, this would need to be a client-side canvas render (or an SVG-to-image conversion), not a server-rendered image — worth scoping once the shareable-report-card idea above is further along, since they'd likely share rendering infrastructure.

### Blind Spots sourced from TMDB instead of a hardcoded director list

The Blind Spots stats panel ("acclaimed directors you haven't watched yet") currently checks the account owner's history against a small hardcoded list of notable directors. Replacing that with a live TMDB query (e.g., directors above a popularity/filmography-size threshold) would make the panel scale with an arbitrary account's actual taste rather than a fixed, somewhat arbitrary curated list — the same category of improvement already planned for Composers ([ROADMAP.md §5](ROADMAP.md#5-composer-data-from-tmdb-credits-replacing-the-curated-map)).

### A `mg bisect --taste` that explains a shift, not just locates it

The current `mg bisect [genre]` finds the single watch after which the account owner's average rating shifted most within a genre — a real, useful signal, but purely numeric. A natural extension is pairing that pivot film with the actual genre/director/era delta before and after it (which the Taste DNA and Taste Drift stats already compute independently) to produce something closer to a sentence — "your rating in Horror dropped after *X*, coinciding with a shift away from 1980s slasher films toward elevated horror" — rather than a bare number.
