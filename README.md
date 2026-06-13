<p align="center">
  <img src="favicon-tv-b.svg" alt="MovieGit" width="80" height="80">
</p>

<h1 align="center">MovieGit</h1>

<p align="center">
  A GitHub-profile-inspired personal film dashboard. Watch history, ratings, and streaks — visualized like a developer profile.
</p>

<p align="center">
  <strong><a href="https://jeffzh4.github.io/Moviegit">View Live</a></strong> · <strong><a href="https://letterboxd.com/islaby/">Open in Letterboxd</a></strong>
</p>

---

A GitHub-profile-inspired personal film dashboard that visualizes your watch history, ratings, and activity patterns in the language of a developer. Rather than a traditional review site, MovieGit reimagines cinema through the lens of version control — watching a film becomes a commit, streaks become contribution patterns, and your taste is measured in data.

---

## The Idea

Why MovieGit? Because you measure code in commits, lines changed, and contribution history. Why not measure cinema the same way?

MovieGit takes your Letterboxd watch history and visualizes it through the GitHub profile aesthetic:
- **Contribution graph** → Films watched per day, colored by intensity
- **`mg log`** → Terminal-style diary: every film as a commit hash + one-liner
- **Streak stats** → Current and longest watch streaks
- **Taste drift** → Year-over-year diff of your avg rating, genre mix, and new directors
- **Director completion** → Filmography coverage % for your most-watched directors
- **Activity metrics** → Average rating, total watch time, films this month, rewatches
- **Hottest takes** → Films where you diverge most from TMDB consensus

It's a personal portfolio piece that celebrates cinema data, not a social platform. Everything lives client-side, fully in your browser.

---

## Features

### Overview
- **Contribution graph** — 52-week heatmap of watch activity (films/day colored 0–4)
- **Live sync timestamp** — "Last synced X min ago" on the graph, auto-refreshes
- **Metrics cards** — Avg rating, total watch time, films this month, rewatches
- **Hottest takes callout** — Top 3 films with biggest divergence from TMDB consensus
- **Recent activity feed** — Last 7 diary entries styled as git commits
- **Sidebar** — Avatar (pulled live from Letterboxd RSS), stat tiles, genre bars with avg rating sparklines, member since date

### Diary
- Chronological list of every logged film, paginated (25/page)
- **Filters**: by year, genre, rating, canon toggle
- **Search**: fuzzy title search (keyboard shortcut: `/`)
- **`mg log` terminal view**: toggle to a monospace commit-log aesthetic — `[7-char hash]  [date]  [title (year)]  [★★★]  — Director` — with rewatch/canon badge chips. Hash is deterministic (FNV-1a from title+year), reproducible across sessions.

### Stats (15 panels)
- **By decade** — Bar chart of films watched per decade
- **Top directors** — Most-watched directors + avg rating
- **Rating timeline** — Monthly avg rating over time
- **Genres full breakdown** — Complete genre list
- **By the numbers** — Snapshot stats grid
- **Rewatches** — Count, avg rating on rewatch, top rewatched films
- **Composers** — Soundtrack trends (Zimmer, Morricone, Williams, etc.)
- **Streak breakdown** — Current/longest/avg streaks, top 5 list
- **Blind spots** — Famous directors you haven't watched
- **Taste DNA** — Your film profile: top genres, era, bias vs consensus, polarization, most-trusted director
- **Watch patterns** — Activity by month
- **Hottest takes** — Full divergence list vs TMDB
- **Discoveries** — Films you rated 4+ with low TMDB vote counts (hidden gems)
- **Director completion** — Filmography coverage % for your top directors, lazy-loaded from TMDB, color-coded by depth
- **Taste drift** — Year-over-year diff: watch count delta, avg rating drift, top genre shift, new directors discovered

### Canon
- Grid view of all films tagged as "canon" or rated ★5
- **Tier view** — Organize films by tier (S/A/B/C)
- **Sort options** — By date added, rating, year, or title
- **Detail overlay** — Click a poster for title, director, year, rating, watch date

### UX Polish
- **Light/dark theme** — Manual toggle + respects `prefers-color-scheme`
- **Keyboard shortcuts** — `1/2/3/4` for tabs, `/` for diary search
- **Mobile responsive** — Sidebar collapses at 768px, contribution graph scrolls horizontally, metrics go 2×2
- **About modal** — Tech stack, how it works, creator links

---

## Data Architecture

### Sources

| Source | Purpose | Method |
|---|---|---|
| **Letterboxd CSV export** | Full watch history (seed data) | One-time file input, parsed client-side |
| **Letterboxd RSS** | Live recent diary entries | Client-side polling every 5 minutes via CORS proxy |
| **TMDB API v3** | Posters, genres, runtime, directors, vote averages, director filmographies | Fetched per film/person, cached in localStorage |

### Data Flow

1. **On load**, check `localStorage` for cached CSV data (full history)
2. **Immediately** poll Letterboxd RSS for entries newer than the latest cached entry; extract avatar from RSS channel image
3. **Merge** RSS entries with cached history; re-render affected views
4. **Enrich** entries missing metadata via TMDB (poster, genres, runtime, director) — lazy, cached
5. **Poll** RSS again every 5 minutes; only update UI if new entries found

### Entry Schema

```javascript
{
  id: string,           // Letterboxd URI slug
  title: string,
  year: number,
  director: string,     // from TMDB
  rating: number,       // 0.5–5.0, null if unrated
  watchedDate: string,  // ISO date (YYYY-MM-DD)
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
  popularity: number
}
```

### Storage

| Key | Contents |
|---|---|
| `mg_history` | Full parsed film log |
| `mg_tmdb_cache` | TMDB ID → enriched metadata |
| `mg_dir_filmography` | Director name → `{ tmdbId, total }` for completion % |
| `mg_last_poll` | ISO timestamp of last RSS poll |
| `mg_settings` | Username, theme preference |
| `mg_csv_loaded` | Boolean — CSV seeded |

---

## Tech Stack

- **HTML5** — Semantic markup
- **Vanilla JavaScript** — Zero dependencies (except CDN icons)
- **CSS3** — Grid, flexbox, CSS custom properties, media queries
- **localStorage** — Client-side persistence
- **Letterboxd RSS** — Public feed at `https://letterboxd.com/{username}/rss/`
- **TMDB API v3** — Search, movie details, credits, person filmographies
- **allorigins.win** — CORS proxy for RSS polling
- **Tabler Icons** — Icon library via CDN

**No build step. No server. No tracking. Fully self-contained in a single HTML file.**

---

## Setup & Usage

### Option 1: Use the Demo
1. Visit the [live site](https://jeffzh4.github.io/Moviegit)
2. Click "About" (?) to learn how it works

### Option 2: Self-Host
1. **Download** `index.html` + `favicon-tv-b.svg`
2. **Get a TMDB API key** (free) at [tmdb.org/settings/api](https://www.themoviedb.org/settings/api)
3. **Edit the file**:
   - Find `USERNAME = 'islaby'` and change to your Letterboxd handle
   - Replace the TMDB key halves with your own (base64-encode each half of your key split at position 16)
4. **Export your watch history**:
   - Letterboxd → Settings → Data Import & Export → Download diary CSV
   - Open the app → click "Seed your watch history" → drop the CSV
5. **Deploy** anywhere: GitHub Pages, Netlify, Vercel, or open locally

### Option 3: Phase 2 Multi-User (Coming Soon)
- Enter any Letterboxd username + your TMDB key
- View dashboards for any user (read-only, no login required)
- Share via URL: `?user=yourhandle`

---

## Key Technical Decisions

### 1. CORS Proxy for Letterboxd RSS
```javascript
const URL = `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`;
```

### 2. TMDB Key Obfuscation
Split at 16 characters, each half base64-encoded:
```javascript
const _parts = ['YTE3ZGM1OTZkMzg1OGFkOQ==', 'N2Q5YjA2MTA3ODYyMDljOQ=='];
const KEY = _parts.map(atob).join('');
```

### 3. `mg log` Commit Hashes
Deterministic 7-char hex per film using FNV-1a on `title+year`. Same film always gets the same hash across sessions — no storage needed.

### 4. Director Completion via TMDB Person API
Two-step fetch: `/search/person?query=name` → `/person/{id}/movie_credits`, filtering crew to `job === 'Director'`. Results cached in `mg_dir_filmography` — each director only looked up once ever.

### 5. Lazy TMDB Enrichment
Batches of 4 with 280ms sleep between batches to respect rate limits (180 reqs/10s).

### 6. Deduplication
Merge entries by `{id, watchedDate}`. RSS entries take priority over CSV.

### 7. Contribution Graph via CSS Grid
53 weeks × 7 days cells. `grid-auto-flow: column` handles week-major layout.

---

## Limitations

- No Letterboxd OAuth (Letterboxd doesn't offer a public user API)
- No watchlist management (read-only dashboard)
- No social features
- Rewatch detection via Letterboxd tags only
- Composer data uses a curated film→composer map (not live from TMDB)

---

## Troubleshooting

**"No data appears"** — Check console (F12). Ensure Letterboxd handle is correct. Try a fresh CSV export.

**"No posters/genres/directors"** — Check TMDB key validity. Look for rate-limit errors in console.

**"Theme toggle doesn't work"** — Run `localStorage.clear()` in console and reload.

**"RSS not updating"** — Verify Letterboxd RSS URL. allorigins.win may have downtime.

---

## Contributing

Found a bug? Have a feature request? Open an issue or submit a PR.

---

## License

MIT. Use, modify, and distribute freely.

---

## Credits

Built by **Jeffrey Zhang**.

Data powered by **Letterboxd** and **TMDB**. Icons via **Tabler Icons**.

Also in the portfolio:
- [Twosday](https://github.com/jeffzh4-ux/Twosday) — A Tuesday-themed productivity app
- Cinematch — A film recommendation engine (coming soon)

---

## Changelog

### v1.2.1 (Current)
- ✅ Refreshed seed data from latest Letterboxd export — now 134 films (was ~115), including recent 2026 watches
- ✅ `SEED_VERSION` mechanism — updated seed merges into existing users' data without wiping TMDB enrichment
- ✅ Diagnosed RSS limitation: feed only carries diary entries; watched+rated films (this account's method) aren't published to RSS

### v1.2
- ✅ `?user=handle` guest view — read-only dashboard for any Letterboxd user, namespaced storage
- ✅ URL state for active tab (`?tab=diary` etc.) — deep-linkable, preserved across nav
- ✅ Year in Film prose panel — auto-generated narrative summary of the current year
- ✅ Contribution graph film-title tooltips — hover shows film names for each day
- ✅ Milestone markers — gold dots on graph at the 50th / 100th / 250th / 500th film
- ✅ Taste DNA narrative rewrite — personality-profile prose, not a stats dump
- ✅ "Days of your life" + "Longest gap" in By the Numbers
- ✅ Web Share API button — native share sheet on mobile, clipboard fallback on desktop
- ✅ Enrichment progress bar — thin green bar fills as TMDB data loads

### v1.1
- ✅ `mg log` terminal diary view with deterministic FNV-1a commit hashes
- ✅ Director filmography completion % (lazy TMDB person API, cached)
- ✅ Taste drift panel (year-over-year diff: watch count, avg rating, genre, new directors)
- ✅ Mobile responsiveness (768px / 480px breakpoints)
- ✅ Letterboxd avatar pulled live from RSS channel image
- ✅ Metric card icon visibility improvements
- ✅ Light mode audit (hardcoded colors replaced with CSS variables)
- ✅ Keyboard shortcuts (`1/2/3/4`, `/`)
- ✅ `@islaby` sidebar link
- ✅ "Last synced" timestamp on contribution graph

### v1.0
- ✅ Contribution graph (52-week heatmap)
- ✅ Metrics cards (avg rating, watch time, films this month, rewatches)
- ✅ Rating distribution chart
- ✅ Recent activity feed
- ✅ Diary view (paginated, filterable)
- ✅ Stats view (decades, directors, rating timeline, genres, by the numbers, taste DNA, watch patterns, hottest takes, discoveries, rewatches, composers, streak breakdown, blind spots)
- ✅ Canon shelf (grid + tier view)
- ✅ About modal
- ✅ Light/dark theme toggle
- ✅ Letterboxd RSS polling (5min)
- ✅ TMDB enrichment (batch, cached)
- ✅ CSV import/seed
- ✅ Hottest takes callout
- ✅ Genre sparklines

### v1.3 Roadmap
- [ ] Settings panel (multi-user — enter any username + TMDB key)
- [ ] Composer data from TMDB credits (replace curated map)
- [ ] Terminal mode (full green-on-black aesthetic)
- [ ] Export enriched history as JSON/CSV
- [ ] Blind spots director count from TMDB (replace hardcoded map)
- [ ] Service worker / offline support

---

Built with ❤️ for cinema.
