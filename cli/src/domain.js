/**
 * Letterboxd domain module — zero-dependency, environment-agnostic.
 *
 * The single source of truth for logic that used to be implemented twice:
 * once in index.html (browser dashboard) and once in cli/src/*.js (the mg
 * CLI). Both surfaces scrape the same Letterboxd films-grid HTML, enrich
 * against the same TMDB endpoints, and compute the same mg-terminal command
 * math (blame/merge/wrapped/status) — this module holds that shared
 * reasoning so the two surfaces can't silently drift apart the way
 * cherry-pick's match tiers once did.
 *
 * Nothing in this file touches fetch, the DOM, or localStorage. It takes
 * data in, returns data out. Each adapter (browser or CLI) supplies its own
 * transport — a CORS-proxy chain in the browser, a direct fetch in the CLI —
 * and calls into these functions for everything else.
 *
 * index.html cannot `import` this module (it ships as one self-contained
 * file, no build step, no bundler) — scripts/sync-domain.py inlines this
 * file's source into index.html between marker comments instead, so the
 * shipped artifact stays a single file while the logic itself has one
 * canonical copy. cli/ imports this module directly (already Node ESM).
 */

// ── HTML entity decoding & name parsing ─────────────────────────────────

export function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&').replace(/&#0?38;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

/** "The Odyssey (2026)" -> { title: "The Odyssey", year: 2026 } */
export function splitName(name) {
  const m = name.match(/^(.*?)\s*\((\d{4})\)\s*$/);
  return m ? { title: decodeEntities(m[1]), year: Number(m[2]) }
           : { title: decodeEntities(name), year: null };
}

// ── Films-grid parsing ───────────────────────────────────────────────────

/**
 * Parse a Letterboxd films-grid page into { slug, title, year, rating }
 * rows. Each film is a LazyPoster react-component carrying data-item-slug /
 * data-item-name, plus a `rated-N` class (N/2 = stars) when rated.
 */
export function parseFilms(html) {
  const rows = [];
  for (const li of html.split('<li class="griditem">').slice(1)) {
    const slugM = li.match(/data-item-slug="([^"]+)"/);
    const nameM = li.match(/data-item-name="([^"]*)"/);
    if (!slugM || !nameM) continue;
    const ratedM = li.match(/rated-(\d+)/);
    const { title, year } = splitName(nameM[1]);
    rows.push({
      slug: slugM[1],
      title,
      year,
      rating: ratedM ? Number(ratedM[1]) / 2 : null, // Letterboxd 0–10 -> 0–5 stars
    });
  }
  return rows;
}

// ── Rating math & film lookup ────────────────────────────────────────────

/** Average rating across a films array, ignoring unrated entries. */
export function avgRating(films) {
  const rated = films.filter(e => e.rating != null);
  return rated.length ? rated.reduce((s, e) => s + e.rating, 0) / rated.length : null;
}

/** Fuzzy film lookup: exact title -> starts-with -> includes. */
export function findFilm(films, q) {
  if (!q) return { film: null, matches: [] };
  const needle = q.toLowerCase();
  let matches = films.filter(e => e.title.toLowerCase() === needle);
  if (!matches.length) matches = films.filter(e => e.title.toLowerCase().startsWith(needle));
  if (!matches.length) matches = films.filter(e => e.title.toLowerCase().includes(needle));
  return { film: matches[0] || null, matches };
}

// ── TMDB enrichment shape ────────────────────────────────────────────────
// URL builders and response-field extraction are pure; the actual fetch()
// call stays in each adapter (browser fetch vs Node fetch, different
// caching, different progress reporting).

export function tmdbSearchUrl(base, apiKey, title, year) {
  const q = encodeURIComponent(title);
  const yr = year ? `&year=${year}` : '';
  return `${base}/search/movie?api_key=${apiKey}&query=${q}${yr}`;
}

export function tmdbDetailsUrl(base, apiKey, tmdbId) {
  return `${base}/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits`;
}

/**
 * Extract the fields both surfaces enrich a film with, from raw TMDB
 * search + details JSON. Returns null if the search had no hit (a TMDB
 * miss — caller decides how to negative-cache that).
 */
export function extractTmdbFields(searchJson, detailsJson) {
  const hit = searchJson?.results?.[0];
  if (!hit) return null;
  const dd = detailsJson || {};
  return {
    tmdbId: hit.id,
    director: dd.credits?.crew?.find(c => c.job === 'Director')?.name || null,
    genres: (dd.genres || []).map(g => g.name),
    runtime: dd.runtime || null,
    country: dd.production_countries?.[0]?.iso_3166_1 || null,
    posterPath: dd.poster_path || null,
    voteAvg: dd.vote_average || null,
    voteCount: dd.vote_count || null,
    popularity: dd.popularity || null,
  };
}

// ── mg terminal command math ─────────────────────────────────────────────
// The formulas behind blame / merge / wrapped / status — previously
// reimplemented independently in index.html's MGSH.CMDS and cli/src/commands.js.

/** blame: how a rating compares to TMDB consensus. */
export function ratingDelta(rating, voteAvg) {
  if (rating == null || voteAvg == null) return null;
  return rating - voteAvg / 2;
}
export function isHotTake(delta) {
  return delta != null && Math.abs(delta) > 1;
}

/** blame: whether a director has enough logged films at a high enough avg to call "trusted". */
export function isTrustedDirector(filmCount, avg) {
  return filmCount >= 4 && avg != null && avg >= 4;
}

/** merge: taste-compatibility between two users' shared ratings. */
export function computeCompat(sharedPairs) {
  if (!sharedPairs.length) return { compat: null, meanDiff: null };
  const meanDiff = sharedPairs.reduce((s, x) => s + Math.abs(x.mine - x.theirs), 0) / sharedPairs.length;
  const compat = Math.max(0, Math.round((1 - meanDiff / 4.5) * 100));
  return { compat, meanDiff };
}
export function isMergeConflict(mine, theirs) {
  return Math.abs(mine - theirs) >= 2;
}

/** wrapped / status: shared summary stats for a films array. */
export function summarize(films) {
  const rated = films.filter(e => e.rating != null);
  const totalMin = films.reduce((s, e) => s + (e.runtime || 0), 0);
  const byDirector = {};
  films.forEach(e => { if (e.director) byDirector[e.director] = (byDirector[e.director] || 0) + 1; });
  const topDirector = Object.entries(byDirector).sort((a, b) => b[1] - a[1])[0] || null;
  const byGenre = {};
  films.forEach(e => (e.genres || []).forEach(g => { byGenre[g] = (byGenre[g] || 0) + 1; }));
  const topGenres = Object.entries(byGenre).sort((a, b) => b[1] - a[1]).slice(0, 3).map(g => g[0]);
  const topRated = rated.slice().sort((a, b) => b.rating - a.rating)[0] || null;
  return {
    count: films.length,
    ratedCount: rated.length,
    avg: avgRating(films),
    totalMin,
    hours: Math.round(totalMin / 60),
    topDirector,
    topGenres,
    topRated,
  };
}
