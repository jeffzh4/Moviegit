# MovieGit — Project Context for Claude

## Current Status: v1.2 shipped, v1.3 in planning

> **Note on syncing**: Letterboxd RSS only publishes **diary** entries. The `islaby` account logs films via *watched + rated* (not diary), so its RSS feed contains only lists — zero film watches. Live RSS sync therefore yields nothing for this account; the dashboard is seeded from the CSV export (`watched.csv` + `ratings.csv` + `likes/`) baked into `SEED_DATA`. Bump `SEED_VERSION` when regenerating the seed so existing users merge in new films without losing TMDB enrichment. RSS sync code remains functional and will pick up real diary entries if any are ever logged.

MovieGit is a GitHub-profile-inspired personal film dashboard. Single self-contained `index.html` — no build step, no server. Live at: https://jeffzh4.github.io/Moviegit (GitHub Pages).

The core metaphor: **watching a film = a git commit.** Contribution graphs, commit-style feeds, hashes, and streaks mirror a GitHub profile — but for cinema.

---

## Repo

- **GitHub**: https://github.com/jeffzh4/Moviegit
- **Hosting**: GitHub Pages (`main` branch, root)
- **Files that ship**: `index.html`, `favicon-tv-b.svg`, `README.md`
- **Files that don't ship**: `data.zip`, `lbdata/`, `moviegit_dashboard_template.html`, `CLAUDE.md`

> **On every commit**: update `README.md` changelog and this file's "Current Status" line if anything significant changed.

---

## Deliverable

- **Format**: Single `index.html` (zero build, zero server, CDN-only dependencies)
- **Phase 1**: Jeffrey Zhang's Letterboxd account hardcoded — portfolio display piece
- **Phase 2**: Multi-user via `?user=handle` URL param (not yet built)

---

## Data Architecture

### Sources

| Source | Purpose | Method |
|---|---|---|
| Letterboxd RSS | Live recent diary entries | Client-side polling every 5 min via `allorigins.win` CORS proxy |
| Letterboxd CSV export | Full watch history (seed data) | One-time file input, parsed client-side |
| TMDB API v3 | Posters, genres, runtime, director, vote avg | Lazy fetch per film, cached in `localStorage` |

### Data Flow

1. On load, check `localStorage` for cached CSV data
2. Immediately poll Letterboxd RSS for entries newer than latest cached
3. Merge RSS entries; re-render affected views
4. Lazy-enrich missing TMDB metadata (batches of 4, 280ms between batches)
5. Poll RSS again every 5 minutes; only update UI if new entries found
6. On RSS poll: extract `<channel><image><url>` for avatar and inject into sidebar

### TMDB Key

Split at position 16, each half base64-encoded, joined at runtime. Never stored plaintext.

### localStorage Keys

| Key | Contents |
|---|---|
| `mg_history` | Full parsed film log |
| `mg_tmdb_cache` | TMDB ID → enriched metadata |
| `mg_dir_filmography` | Director name → `{ tmdbId, total }` for completion % |
| `mg_last_poll` | ISO timestamp of last RSS poll |
| `mg_settings` | Username, theme preference |
| `mg_csv_done` | Boolean — CSV seeded |

---

## Film Entry Schema

```js
{
  id: string,           // Letterboxd URI slug
  title: string,
  year: number,
  director: string,     // from TMDB
  rating: number,       // 0.5–5.0, null if unrated
  watchedDate: string,  // ISO date YYYY-MM-DD
  rewatch: boolean,
  tags: string[],
  letterboxdUrl: string,
  tmdbId: number,
  poster: string,       // TMDB poster path
  genres: string[],
  runtime: number,      // minutes
  country: string,
  decade: number,       // e.g. 1970
  canon: boolean,
  voteAvg: number,      // TMDB 0–10
  voteCount: number,
  popularity: number,
  source: 'csv' | 'rss'
}
```

---

## Views — What's Built

### Overview
- 52-week contribution graph heatmap (films/day → color level 0–4)
- "Last synced" timestamp on graph legend, updates every 60s
- 4 metric cards: avg rating, watch time, films this month, rewatches
- Hottest takes callout (top 3 divergences from TMDB consensus)
- Recent activity feed (last 7 entries, styled as git commits)
- Sidebar: avatar (pulled from RSS or initials fallback), stat tiles, genre bars with sparklines, member since

### Diary
- Paginated list (25/page), newest first
- Filters: year, genre, rating, canon toggle
- Fuzzy title search
- **`mg log` view**: terminal-style toggle — every film as `[hash]  [date]  [title (year)]  [★★★]  — Director`, with rewatch/canon badges. Hash is deterministic 7-char hex (FNV-1a from title+year)
- Keyboard: `/` focuses search from anywhere

### Stats (15 panels)
- Films by decade (bar chart)
- Top directors (bar + avg rating)
- Avg rating by month (column chart)
- Genres full breakdown
- By the numbers (snapshot grid)
- Rewatches (count, top rewatched)
- Composers (curated map, bar chart)
- Streak breakdown (current/longest/avg, top 5 streaks)
- Blind spots (famous directors not yet watched)
- Taste DNA (top genres, era, bias, polarization, trusted director)
- Watch patterns (by month)
- Hottest takes (divergence vs TMDB)
- Discoveries (rated 4+, low vote count)
- **Director completion** (filmography % via TMDB person API, lazy-loaded, cached)
- **Taste drift** (year-over-year diff: watch count, avg rating, top genre, new directors, genre breakdown table)

### Canon
- Grid view + tier view (S/A/B/C)
- Sort: date added, rating, year, title
- Click-to-detail overlay

### About Modal
- TV-head icon header
- Tech stack, how it works, creator links

---

## Visual Design

- **GitHub-faithful**: dark default, CSS custom properties, monospace throughout
- **Light/dark toggle**: `[data-theme="light"]` on `<html>`, saved to localStorage, respects `prefers-color-scheme` on first load
- **Favicon**: `favicon-tv-b.svg` — retro B&W TV with rabbit ears, used in browser tab, header, modal, empty states

### Theme tokens (key ones)
```
--bg-canvas / --bg-primary / --bg-secondary / --bg-tertiary / --bg-overlay
--border / --border-muted
--text-primary / --text-secondary / --text-tertiary
--accent-green / --accent-blue / --accent-purple / --accent-orange
--trend-up / --trend-dn
--c0..c4  (contribution graph green scale)
```

---

## Navigation & Keyboard Shortcuts

Tabs: **overview · diary · stats · canon**

| Key | Action |
|---|---|
| `1` | Overview tab |
| `2` | Diary tab |
| `3` | Stats tab |
| `4` | Canon tab |
| `/` | Diary tab + focus search |

---

## Responsive Breakpoints

- **900px**: sidebar narrows (200px), metrics 2×2, stats single column
- **768px**: sidebar becomes horizontal strip (avatar + tiles only), nav wraps below header, contribution graph scrolls horizontally
- **480px**: tighter gaps, canon 2-col

---

## JS Module Structure (inside the `<script>` block)

```
CFG       — config: username, TMDB key (obfuscated), poll interval
STORE     — localStorage read/write helpers
DATA      — parse CSV, merge entries, dedup by {id, watchedDate}
LB        — Letterboxd RSS poll (via allorigins.win), avatar extraction
TMDB      — lazy enrichment: search → details → credits, batched
RENDER    — all view renderers (overview, diary, stats, canon)
UI        — tab switching, theme toggle, modal, keyboard shortcuts
MG        — bootstrap + pollRSS loop + updateSyncStamp
```

---

## Phase 2 Roadmap

- [x] `?user=handle` URL param for read-only public sharing (guest banner, namespaced storage, RSS override)
- [x] URL state for active tab (`?tab=`)
- [ ] Settings panel: enter any Letterboxd username + TMDB key
- [ ] Director completion expansion (beyond top 12)
- [ ] Shareable taste drift "report card"
- [ ] Terminal mode toggle (full green-on-black aesthetic for diary)
- [ ] Composer data via TMDB credits (replace curated map)
- [ ] Export enriched history as JSON/CSV
- [ ] Blind spots: pull director filmcount from TMDB instead of hardcoded map

---

## Out of Scope (Phase 1)

- Watchlist management
- Social features
- Film detail pages
- Letterboxd OAuth
- Any backend / server component
