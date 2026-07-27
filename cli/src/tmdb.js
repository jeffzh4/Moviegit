/**
 * Optional TMDB enrichment: director, genres, runtime, consensus rating.
 * Without a key the CLI still works — commands that need enrichment say so.
 * Get a free key at https://www.themoviedb.org/settings/api then:
 *   mg login <user> --tmdb-key <key>
 */
import { config } from './config.js';
import { tmdbSearchUrl, tmdbDetailsUrl, extractTmdbFields } from './domain.js';

const BASE = 'https://api.themoviedb.org/3';

export function hasKey() {
  return Boolean(process.env.TMDB_API_KEY || config.get().tmdbKey);
}
function key() {
  return process.env.TMDB_API_KEY || config.get().tmdbKey;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function enrichOne(film) {
  const k = key();
  try {
    const s = await fetch(tmdbSearchUrl(BASE, k, film.title, film.year));
    const sd = await s.json();
    if (!sd.results?.[0]) return { ...film, tmdbMiss: true };

    const d = await fetch(tmdbDetailsUrl(BASE, k, sd.results[0].id));
    const dd = await d.json();
    const fields = extractTmdbFields(sd, dd);
    if (!fields) return { ...film, tmdbMiss: true };

    const { posterPath, country, popularity, ...rest } = fields;
    return { ...film, ...rest };
  } catch {
    return film;
  }
}

/** Enrich films in batches of 4 with pacing, mirroring the dashboard. */
export async function enrich(films, { onProgress } = {}) {
  if (!hasKey()) return films;
  const out = films.slice();
  const todo = out.map((f, i) => [f, i]).filter(([f]) => !f.tmdbId && !f.tmdbMiss);
  for (let i = 0; i < todo.length; i += 4) {
    const chunk = todo.slice(i, i + 4);
    const done = await Promise.all(chunk.map(([f]) => enrichOne(f)));
    done.forEach((f, j) => { out[chunk[j][1]] = f; });
    if (onProgress) onProgress(Math.min(i + 4, todo.length), todo.length);
    if (i + 4 < todo.length) await sleep(280);
  }
  return out;
}
