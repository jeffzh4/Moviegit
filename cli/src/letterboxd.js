/**
 * Letterboxd access.
 *
 * READS are public and unauthenticated: we fetch the profile films grid
 * (letterboxd.com/{user}/films/), the same source the web dashboard uses.
 * Running outside a browser means no CORS proxy is needed — we hit the site
 * directly, which is faster and more reliable.
 *
 * WRITES require your own logged-in session (see auth.js). Letterboxd has no
 * public write API; `commit` drives the same form the website itself posts.
 */

import { decodeEntities, splitName, parseFilms as parseFilmsDomain } from './domain.js';

export { decodeEntities, splitName };

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

async function get(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'User-Agent': UA, 'Accept-Language': 'en', ...(opts.headers || {}) },
    redirect: opts.redirect || 'follow',
  });
  return res;
}

/** Parse a films-grid page into rows — see cli/src/domain.js for the shape. */
export const parseFilms = parseFilmsDomain;

/**
 * Fetch watched films for a user.
 *
 * NOTE ON PAGINATION: Letterboxd serves page 1 of the films grid to any client,
 * but returns 403 for /films/page/N/ (N>1) to non-browser requests — CORS
 * proxies are likewise blocked or rate-limited. So we reliably get the 72 most
 * recently-watched films and flag the result as truncated rather than quietly
 * under-reporting. The web dashboard has the same ceiling; it fills in the full
 * back-catalogue from a CSV export baked into its seed.
 *
 * Returns an array with a non-enumerable `truncated` marker.
 */
export async function fetchFilms(username, { maxPages = 20 } = {}) {
  const all = [];
  let truncated = false;

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1
      ? `https://letterboxd.com/${username}/films/`
      : `https://letterboxd.com/${username}/films/page/${page}/`;
    const res = await get(url, page > 1
      ? { headers: { Referer: `https://letterboxd.com/${username}/films/` } }
      : {});

    if (res.status === 404) {
      if (page === 1) throw new Error(`no such Letterboxd user: ${username}`);
      break;
    }
    if (!res.ok) {
      if (page === 1) throw new Error(`letterboxd returned HTTP ${res.status} for @${username}`);
      truncated = true; // deeper pages refused (typically 403)
      break;
    }

    const html = await res.text();
    const rows = parseFilms(html);
    all.push(...rows);

    if (rows.length < 72) break;                                  // last page
    if (!html.includes(`/films/page/${page + 1}/`)) break;         // no next link
  }

  Object.defineProperty(all, 'truncated', { value: truncated, enumerable: false });
  return all;
}

/** Pull the display name + avatar off a profile page (best effort). */
export async function fetchProfile(username) {
  try {
    const res = await get(`https://letterboxd.com/${username}/`);
    if (!res.ok) return {};
    const html = await res.text();
    const name = html.match(/<meta property="og:title" content="([^"]+)"/);
    return { displayName: name ? decodeEntities(name[1]).replace(/’s profile.*$/, '') : username };
  } catch { return {}; }
}

export function slugify(s) {
  return String(s).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolve a film to its Letterboxd slug.
 *
 * Letterboxd's /search/ endpoint returns 403 to non-browser clients, but the
 * canonical film pages themselves are served fine. So we derive candidate slugs
 * from the title (optionally disambiguated by year, which is how Letterboxd
 * disambiguates remakes) and confirm each against the real page. Pass an exact
 * slug with --slug to skip guessing entirely.
 */
export async function resolveFilm(query, { year, slug } = {}) {
  const candidates = [];
  if (slug) candidates.push(slug);
  else {
    const base = slugify(query);
    if (year) candidates.push(`${base}-${year}`);
    candidates.push(base);
    const m = query.match(/^(.*?)\s*\((\d{4})\)\s*$/); // "Title (2025)"
    if (m) { candidates.unshift(`${slugify(m[1])}-${m[2]}`); candidates.push(slugify(m[1])); }
  }

  for (const cand of [...new Set(candidates)]) {
    const meta = await filmPage(cand);
    if (meta) return { slug: cand, title: meta.title, year: meta.year, filmId: meta.filmId };
  }
  return null;
}

/** Fetch a film page; returns null on 404. Extracts id, title, year, CSRF. */
export async function filmPage(slug, cookie) {
  const res = await get(`https://letterboxd.com/film/${slug}/`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`could not load /film/${slug}/: HTTP ${res.status}`);
  const html = await res.text();

  // Modern Letterboxd exposes the numeric id as "film:<id>" in embedded JSON.
  const id = html.match(/"uid":"film:(\d+)"/) || html.match(/\bfilm:(\d+)\b/)
          || html.match(/data-film-id="(\d+)"/);
  // CSRF ships as a JS global:  CSRF = 'abc123…';
  const csrf = html.match(/CSRF\s*=\s*'([0-9a-f]{12,})'/i)
            || html.match(/name="__csrf"\s+value="([^"]+)"/);
  // <title>‎Sinners (2025) directed by …
  const cleanTitle = html.replace(/&lrm;|&#8206;|\u200e/g, '');
  const t = cleanTitle.match(/<title>\s*(.*?)\s*\((\d{4})\)\s*directed by/i);

  return {
    filmId: id ? id[1] : null,
    csrf: csrf ? csrf[1] : null,
    title: t ? decodeEntities(t[1]) : slug.replace(/-/g, ' '),
    year: t ? Number(t[2]) : null,
    tmdbId: (html.match(/data-tmdb-id="(\d+)"/) || [])[1] || null,
  };
}

/** Back-compat alias used by auth.js */
export const filmMeta = filmPage;

export { get as rawGet, UA };
