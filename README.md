<p align="center">
  <img src="favicon-tv-b.svg" alt="MovieGit" width="88" height="88">
</p>

<h1 align="center">MovieGit</h1>

<p align="center">
  <em>Your film history, as a developer profile.</em><br>
  A GitHub-inspired dashboard for Letterboxd — contribution graphs, commit-style diaries, and a built-in <code>mg</code> terminal.
</p>

<p align="center">
  <a href="https://jeffzh4.github.io/Moviegit"><strong>View Live</strong></a>
  &nbsp;·&nbsp;
  <a href="https://letterboxd.com/islaby/"><strong>Letterboxd</strong></a>
  &nbsp;·&nbsp;
  <a href="#the-mg-terminal"><strong>The mg Terminal</strong></a>
</p>

<p align="center">
  <img alt="Single file" src="https://img.shields.io/badge/build-zero--config-22C55E?style=flat-square">
  <img alt="Dependencies" src="https://img.shields.io/badge/dependencies-CDN--only-1E293B?style=flat-square">
  <img alt="Backend" src="https://img.shields.io/badge/backend-none-334155?style=flat-square">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square">
</p>

---

## Overview

**MovieGit** reimagines your film-watching history through the visual language of a GitHub profile. Watching a film is a **commit**. A run of daily watches is a **contribution streak**. Your diary is a **commit log**, complete with deterministic hashes. Your favorite films are **canon**, pinned like starred repositories.

It is a single, self-contained `index.html` — **no build step, no server, no tracking**. It reads a public Letterboxd account, enriches each film with poster/director/genre data from TMDB, and renders the whole thing client-side. Everything persists in your browser's `localStorage`.

The core metaphor, taken all the way: MovieGit ships a working **command line**, `mg`, with 28 git-style commands that operate over your watch history — `mg log`, `mg commit`, `mg diff 2024 2025`, `mg blame <film>`, `mg merge <user>`, and more.

---

## Table of Contents

- [Highlights](#highlights)
- [The Dashboard](#the-dashboard)
- [The mg Terminal](#the-mg-terminal)
- [How Sync Works](#how-sync-works)
- [Architecture](#architecture)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Self-Hosting](#self-hosting)
- [Multi-User & Sharing](#multi-user--sharing)
- [FAQ](#faq)
- [Changelog](#changelog)

---

## Highlights

- **Contribution graph** — a 52-week heatmap of everything you watched, colored by intensity, with per-day film tooltips and milestone markers.
- **Live sync from Letterboxd** — rate a film on Letterboxd and it appears here within minutes. No diary entry, no review, no manual export required (see [How Sync Works](#how-sync-works)).
- **15-panel stats view** — decades, directors, taste DNA, taste drift, blind spots, hidden discoveries, director-filmography completion, and more.
- **The `mg` terminal** — a genuine git-flavored shell over your data. 28 commands.
- **TMDB enrichment** — posters, directors, genres, runtimes, and consensus ratings, fetched lazily and cached.
- **GitHub-faithful design** — dark by default, monospace throughout, underline nav, tooltips, focus rings, light/dark toggle.
- **Fully client-side** — one HTML file, CDN-only dependencies, works offline once cached.

---

## The Dashboard

### Overview
- **52-week contribution graph** — films watched per day as a GitHub-style heatmap (5 intensity levels). Hover any cell for the film titles logged that day. Gold milestone markers appear at your 50th / 100th / 250th / 500th film.
- **"Last synced" indicator** with a manual **↻ sync** button.
- **Metric cards** — average rating, total watch time, films this month, rewatches.
- **Hottest takes** — the three films where your rating diverges most from TMDB consensus.
- **Recent activity feed** — your latest watches, styled as git commits.
- **Sidebar** — avatar (pulled live from Letterboxd), stat tiles, top-genre bars with average-rating sparklines, and member-since date.

### Diary
- Full watch history, paginated (25/page), newest first.
- **Filters** — by year, genre, rating, and a canon-only toggle.
- **Fuzzy search** across titles (press `/` from anywhere).
- **`mg log` view** — a terminal-style toggle rendering every film as
  `[hash]  [date]  [title (year)]  [★★★]  — Director`, with rewatch/canon badges. The 7-character hash is a deterministic FNV-1a of title + year, stable across sessions.

### Stats (15 panels)
| Panel | What it shows |
|---|---|
| By decade | Films watched per decade |
| Top directors | Most-watched directors with average rating |
| Rating timeline | Average rating by month |
| Genres | Full genre breakdown |
| By the numbers | Snapshot grid incl. "days of your life" and longest gap |
| Rewatches | Count, average rewatch rating, most rewatched |
| Composers | Soundtrack trends across a curated composer map |
| Streaks | Current / longest / average, plus your top 5 streaks |
| Blind spots | Acclaimed directors you haven't watched yet |
| Taste DNA | A prose personality profile: genres, era, bias, polarization, most-trusted director |
| Watch patterns | Activity by month |
| Hottest takes | Full divergence-vs-TMDB list |
| Discoveries | Films you rated 4★+ that have low TMDB vote counts (your hidden gems) |
| Director completion | Filmography coverage %, lazy-loaded from the TMDB person API |
| Taste drift | Year-over-year diff: watch count, average rating, top genre, new directors |

### Canon
- A shelf of your **canon** films (liked on Letterboxd, or tagged via `mg tag`).
- **Grid** and **tier** (S/A/B/C) views, sortable by date added, rating, year, or title.
- Click any poster for a detail overlay.

---

## The mg Terminal

Press **`` ` ``** (backtick) or click the **terminal icon** in the header to open a bottom-drawer command line. It parses quoted arguments, keeps per-session history (↑/↓), and speaks git.

```
mg@islaby:~$ status
On branch main
136 films logged · 293h runtime
last sync: 2m ago · auto-poll every 5m
this month: 2 films · current streak: 1d
enrichment: 136/136 (100%) ✓
working tree clean
```

### Command reference

**Inspecting history**
| Command | Description |
|---|---|
| `status` | Repo state: film count, sync, streak, enrichment progress |
| `log [n]` | Commit log of watches (scoped to the checked-out branch) |
| `show <film>` | Full detail for one film |
| `grep <query>` | Search titles, directors, and genres |
| `blame <film>` | *Why* a rating happened — TMDB divergence, your genre averages, director trust |
| `shortlog` | Films grouped by director (git-authors style) |
| `contributors` | Directors ranked by contribution share, with bars |
| `streak` | Current and longest watch streaks |

**Analysis**
| Command | Description |
|---|---|
| `diff <year1> <year2>` | Taste diff between two years |
| `rebase <year>` | Replay a year month-by-month |
| `wrapped [year]` | A year-in-review card |
| `bisect [genre]` | Find the film after which your ratings shifted most |
| `merge <user>` | Taste-compatibility score vs another Letterboxd user, with "merge conflicts" |

**Mutating state**
| Command | Description |
|---|---|
| `commit "Title" [year] [★]` | Log a film watched today |
| `revert <film>` | Un-log a film locally |
| `tag <film>` | Toggle a film's canon flag |
| `branch [name] [add\|rm <film>] [-d]` | Named film collections |
| `checkout <branch\|tab>` | Switch branch (scopes `log`) or jump to a view |
| `stash [<film>\|list\|pop\|drop n]` | A watchlist: set films aside |
| `cherry-pick <user> <film>` | Grab a film off another profile into your stash |

**Sync & remote**
| Command | Description |
|---|---|
| `pull` | Sync from Letterboxd (fetch + merge) |
| `fetch` | Check the origin for new films without merging |
| `push` | Export your enriched history as a JSON download |
| `remote [-v]` | Show the linked Letterboxd origin and sync health |
| `reflog` | Sync audit trail: every poll and what it found |
| `clone <user>` | Open another user's dashboard |

**Housekeeping**
| Command | Description |
|---|---|
| `gc` | Prune orphaned TMDB cache entries, report storage usage |
| `config [theme dark\|light]` | View or set dashboard config |
| `help` · `clear` · `exit` | Builtins |

> **On `push`:** Letterboxd has no public write API, so `push` exports locally rather than writing back. See [Logging from your own terminal](#faq) for how a thin CLI wrapper *could* close that loop.

---

## How Sync Works

This is the part most Letterboxd tools get wrong, so it's worth being precise.

**Letterboxd's RSS feed only publishes _diary_ entries** — films you log with an explicit watched-date. Many people (including this project's account) instead log films by simply **rating them and marking them watched**, which never produces a diary entry and therefore **never appears in RSS**. Any tool that relies on RSS silently misses those films forever.

MovieGit instead scrapes the **profile films grid** at `letterboxd.com/{user}/films/`. That page lists *every* watched film with its star rating (`rated-N`, where N/2 = stars), newest first, and updates the instant a film is rated and marked watched. MovieGit fetches it through a CORS-proxy chain (`allorigins.win/raw`, falling back to `cors.eu.org`), parses the grid, and merges new films into your history.

Because the films grid carries no per-film date, newly discovered films are dated to the day they're first seen ("commit today" semantics), while films already in your history keep their real dates from the seed import — so re-polling upgrades ratings in place without ever duplicating a row.

**Data sources at a glance:**

| Source | Purpose | Method |
|---|---|---|
| Letterboxd films grid | Live watched + rated films | Scraped every 5 min via CORS proxy |
| Letterboxd CSV export | Full backfilled history with real dates | Baked into `SEED_DATA`; `SEED_VERSION` merges updates |
| TMDB API v3 | Posters, genres, runtime, director, consensus ratings | Lazy per-film fetch, cached in `localStorage` |

---

## Architecture

Single `index.html`. Inside the one `<script>` block:

```
CFG    — config: username, TMDB key (obfuscated), poll interval
STORE  — localStorage read/write helpers
DATA   — CSV parsing, entry merge, dedup by {id, watchedDate}
LB     — Letterboxd sync: films-grid scrape + CORS-proxy chain
TMDB   — lazy enrichment (search → details → credits), batched + rate-limited
RENDER — every view renderer (overview, diary, stats, canon) + mg log
UI     — tabs, theme toggle, modal, share, keyboard shortcuts
MG     — bootstrap, poll loop, seed-merge, sync timestamp
MGSH   — the mg terminal: drawer UI + 28-command registry
```

**Design principles**
- **Zero build, zero server.** Deployable to any static host; runs from `file://`.
- **Resilient enrichment.** TMDB fetches run in batches of 4 with pacing to respect rate limits; films TMDB can't find are negative-cached for 24h; concurrent poll additions are never clobbered by an in-flight enrichment pass.
- **Obfuscated API key.** The TMDB key is split and base64-encoded, reassembled at runtime — never stored in plaintext.
- **Faithful GitHub aesthetic.** Monospace type, dark-first palette (`#0F172A` canvas, `#22C55E` accent), underline navigation, hover tooltips, visible focus rings, and a respected `prefers-reduced-motion`.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `1` `2` `3` `4` | Jump to Overview / Diary / Stats / Canon |
| `/` | Focus diary search |
| `` ` `` | Toggle the `mg` terminal |
| `↑` `↓` | (in terminal) cycle command history |
| `Esc` | (in terminal) close the drawer |

---

## Self-Hosting

1. **Download** `index.html` + `favicon-tv-b.svg`.
2. **Get a free TMDB API key** at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).
3. **Edit `index.html`:**
   - In the `CFG` module, set `USERNAME` to your Letterboxd handle.
   - Replace the two base64 key halves with your own TMDB key (split at 16 chars, base64-encode each half).
4. **Seed your history (optional but recommended):** export your data from Letterboxd (Settings → Data → Export) and drop `watched.csv` + `ratings.csv` into the seed, or let live sync build it up from scratch.
5. **Deploy** to GitHub Pages, Netlify, Vercel, or just open the file locally.

---

## Multi-User & Sharing

- **`?user=<handle>`** opens any public Letterboxd account in read-only guest mode (namespaced storage, guest banner, sync scoped to that user).
- **`?tab=<name>`** deep-links directly to a view.
- The **share button** uses the Web Share API on mobile, with a clipboard fallback on desktop.
- From the terminal, `clone <user>` is the shortcut for the same thing.

---

## FAQ

**Why don't my films show up if I only rate them?**
They do — that's the whole point of the films-grid sync. Tools built on RSS miss rated-but-not-diaried films; MovieGit doesn't. See [How Sync Works](#how-sync-works).

**Can I run `mg` from my real terminal instead of the in-app one?**
Not yet — `mg` currently lives in the browser. A thin CLI wrapper is a natural next step: a small Node/Python script that reads the same Letterboxd films grid for read commands (`log`, `status`, `diff`), and — for `commit` — drives Letterboxd's authenticated web session to actually log the film, which would then flow back into the dashboard on the next sync. Because Letterboxd has no public write API, `commit`-to-Letterboxd requires either browser automation against your logged-in session or the unofficial mobile API, so it ships as a deliberate, opt-in piece rather than something baked into the static page.

**Where is my data stored?**
Entirely in your browser's `localStorage`. Nothing is sent anywhere except read-only requests to Letterboxd (via CORS proxy) and TMDB (for enrichment).

**Does it work offline?**
Once loaded and cached, yes — the dashboard renders from `localStorage`. Sync and enrichment resume when you're back online.

---

## Changelog

### v1.4 (Current)
- **`mg` terminal** — a real command line over your watch history (`` ` `` or the header terminal button). **28 git-style commands**: `status` `log` `commit` `pull` `fetch` `push` `show` `grep` `diff` `shortlog` `contributors` `streak` `tag` `branch` `checkout` `stash` `revert` `blame` `remote` `reflog` `clone` `merge` `cherry-pick` `rebase` `wrapped` `bisect` `gc` `config` — plus `help`/`clear`/`exit`.
- `mg blame` traces *why* a rating happened; `mg merge <user>` scores taste compatibility against another account; `mg bisect` finds your taste-shifting film.
- **Poster fix** — removed the enrichment cap that left later films blank, added a 24h negative-cache for films missing from TMDB, upgraded posters to higher resolution (w342) with a one-time migration.
- **GitHub-esque polish** — header button tooltips, underline navigation, focus rings, `prefers-reduced-motion` support.

### v1.3
- **Live sync that actually works** — scrapes the profile films grid instead of RSS, so watched + rated films appear the moment they're logged. CORS-proxy chain (`allorigins.win/raw` → `cors.eu.org`). Fixed an enrichment race that dropped freshly-synced films.

### v1.2
- `?user=<handle>` guest view, `?tab=` deep-linking, contribution-graph tooltips, milestone markers, Taste DNA prose rewrite, Web Share button, enrichment progress bar.

### v1.1
- `mg log` terminal diary view, director-completion %, taste-drift panel, mobile responsiveness, live avatar from Letterboxd, keyboard shortcuts.

### v1.0
- Contribution graph, metric cards, rating distribution, activity feed, diary, 15-panel stats, canon shelf, about modal, light/dark theme, TMDB enrichment, CSV seed.

---

## Credits

Built by **Jeffrey Zhang**. Data from **Letterboxd** and **TMDB**. Icons via **Tabler Icons**.

Also in the portfolio: [Twosday](https://github.com/jeffzh4-ux/Twosday) · Cinematch *(coming soon)*.

## License

MIT — use, modify, and distribute freely.

<p align="center"><sub>Built for cinema. Committed daily.</sub></p>
