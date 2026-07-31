/** mg command implementations. */
import { writeFileSync } from 'node:fs';
import { config, resolveUser } from './config.js';
import { fetchFilms, fetchProfile, resolveFilm } from './letterboxd.js';
import { enrich, hasKey } from './tmdb.js';
import { AUTH_HELP, logFilm, whoami, getCookie } from './auth.js';
import { c, stars, mgHash, bar, delta, pad, padStart, heading, die } from './format.js';
import {
  avgRating, findFilm as findFilmDomain, ratingDelta, isHotTake, isTrustedDirector,
  computeCompat, isMergeConflict, summarize, longestStreak,
} from './domain.js';

const today = () => new Date().toISOString().slice(0, 10);
const log = console.log;

/* ── data loading ─────────────────────────────────────────────────────── */

/** Load films: cached unless --refresh, then optionally enriched. */
async function load(flags, { needEnrich = false } = {}) {
  const user = resolveUser(flags.user);
  const cached = config.cache();
  let films;
  let truncated = false;

  if (!flags.refresh && cached?.user === user && cached.films?.length) {
    films = cached.films;
  } else {
    process.stderr.write(c.gray(`fetching ${user}/films/ …\n`));
    const fetched = await fetchFilms(user);
    truncated = Boolean(fetched.truncated);
    films = fetched.map((f) => ({ ...f, watchedDate: f.watchedDate || null }));
  }

  if (needEnrich && hasKey() && films.some((f) => !f.tmdbId && !f.tmdbMiss)) {
    process.stderr.write(c.gray('enriching from TMDB …\n'));
    films = await enrich(films, {
      onProgress: (d, t) => process.stderr.write(c.gray(`\r  ${d}/${t}`)),
    });
    process.stderr.write('\r\x1b[K');
  }

  if (!flags.refresh && cached?.user === user && cached.films?.length) truncated = Boolean(cached.truncated);
  config.setCache({ user, films, syncedAt: new Date().toISOString(), truncated });
  return { user, films, truncated };
}

/** Printed whenever we only hold the most-recent page of a larger history. */
function truncNote(truncated, films) {
  if (!truncated) return;
  console.log(c.gray(
    `\nnote: showing the ${films.length} most recently-watched films. Letterboxd refuses ` +
    `deeper\n      pagination to non-browser clients, so older titles aren't available here.`));
}

const rated = (films) => films.filter((f) => f.rating != null);
const avg = avgRating;

// findFilm here matches the pre-existing local contract (returns the film
// directly, not {film, matches}) — same 3-tier match as the browser
// dashboard's MGSH commands, via domain/letterboxd.mjs.
function findFilm(films, q) {
  return findFilmDomain(films, q).film;
}

/* ── commands ─────────────────────────────────────────────────────────── */

export const commands = {

  async login(args, flags) {
    const user = (args[0] || flags.user || '').replace(/^@/, '');
    if (!user) die('usage: mg login <letterboxd-username> [--tmdb-key <key>]');
    process.stderr.write(c.gray(`verifying ${user} …\n`));
    const films = await fetchFilms(user, { maxPages: 1 });
    const prof = await fetchProfile(user);
    const patch = { username: user };
    if (flags['tmdb-key']) patch.tmdbKey = flags['tmdb-key'];
    config.set(patch);
    config.setCache({ user, films, syncedAt: new Date().toISOString() });
    log(c.green('✓ ') + `linked ${c.bold('@' + user)}${prof.displayName ? ` (${prof.displayName})` : ''}`);
    log(c.gray(`  ${films.length} most-recent films visible · config at ${config.paths.config}`));
    if (!hasKey()) log(c.gray('  tip: add --tmdb-key <key> for directors, genres and runtimes'));
    log(c.gray("  writes to Letterboxd need a session cookie — run: mg auth"));
  },

  async auth(args, flags) {
    if (flags.logout) {
      log(config.clearCreds() ? c.green('✓ credentials removed') : c.gray('no stored credentials'));
      return;
    }
    if (flags.cookie) {
      config.setCreds({ sessionCookie: String(flags.cookie).trim() });
      process.stderr.write(c.gray('verifying session …\n'));
      const who = await whoami();
      if (who) log(c.green('✓ ') + `authenticated${who !== 'signed-in' ? ` as ${c.bold('@' + who)}` : ''} — ${c.bold('mg commit')} can now write to Letterboxd`);
      else {
        log(c.yellow('! ') + 'cookie stored, but the session did not verify.');
        log(c.gray('  It may be expired or copied incompletely. Re-copy it and run mg auth again.'));
      }
      return;
    }
    if (flags.status) {
      const who = getCookie() ? await whoami() : null;
      log(who ? c.green('✓ ') + `authenticated${who !== 'signed-in' ? ` as @${who}` : ''}`
              : c.gray('not authenticated — mg commit is unavailable'));
      return;
    }
    log(AUTH_HELP);
  },

  async status(args, flags) {
    const { user, films, truncated: t } = await load(flags);
    const a = avg(films);
    const mins = films.reduce((s, f) => s + (f.runtime || 0), 0);
    const cache = config.cache();
    const ago = cache?.syncedAt
      ? Math.round((Date.now() - new Date(cache.syncedAt)) / 60000) + 'm ago' : 'never';
    log(`On account ${c.cyan('@' + user)}`);
    log(`${c.bold(films.length)} films watched · ${rated(films).length} rated${a ? ` · avg ${stars(Math.round(a * 2) / 2)} ${c.gray(a.toFixed(2))}` : ''}`);
    if (mins) log(`${Math.round(mins / 60)}h total runtime`);
    log(c.gray(`last synced: ${ago}${hasKey() ? '' : ' · no TMDB key (limited data)'}`));
    log(getCookie() ? c.green('write access: enabled') : c.gray('write access: disabled (mg auth)'));
    truncNote(t, films);
  },

  async log(args, flags) {
    const n = Number(args[0]) || 20;
    const { films, truncated: t } = await load(flags, { needEnrich: true });
    films.slice(0, n).forEach((f) => {
      log(`${c.magenta(mgHash(f.title, f.year))}  ${pad(f.title, 40)} ${c.gray(`(${f.year || '—'})`)}  ${stars(f.rating)}${f.director ? c.gray('  — ' + f.director) : ''}`);
    });
    log(c.gray(`\n${films.length} films · newest first`));
    truncNote(t, films);
  },

  async show(args, flags) {
    const { films } = await load(flags, { needEnrich: true });
    const f = findFilm(films, args.join(' '));
    if (!f) die(`no film matches: ${args.join(' ')}`);
    log(`${c.magenta(mgHash(f.title, f.year))} ${c.bold(f.title)} ${c.gray(`(${f.year || '—'})`)}`);
    log(`rating:   ${stars(f.rating)}${f.voteAvg ? c.gray(`  · TMDB ★${(f.voteAvg / 2).toFixed(1)}`) : ''}`);
    if (f.director) log(`director: ${f.director}`);
    if (f.genres?.length) log(`genres:   ${f.genres.join(', ')}`);
    if (f.runtime) log(`runtime:  ${f.runtime} min`);
    log(c.gray(`letterboxd.com/film/${f.slug}/`));
  },

  async grep(args, flags) {
    const q = args.join(' ').toLowerCase();
    if (!q) die('usage: mg grep <query>');
    const { films } = await load(flags, { needEnrich: true });
    const hits = films.filter((f) =>
      f.title.toLowerCase().includes(q) ||
      (f.director || '').toLowerCase().includes(q) ||
      (f.genres || []).some((g) => g.toLowerCase().includes(q)));
    if (!hits.length) return log(c.gray('no matches'));
    hits.slice(0, 40).forEach((f) =>
      log(`${c.magenta(mgHash(f.title, f.year))}  ${pad(f.title, 40)} ${c.gray(`(${f.year || '—'})`)}  ${stars(f.rating)}`));
    if (hits.length > 40) log(c.gray(`…and ${hits.length - 40} more`));
  },

  async shortlog(args, flags) {
    const { films } = await load(flags, { needEnrich: true });
    if (!hasKey()) die('shortlog needs director data — add a TMDB key: mg login <user> --tmdb-key <key>');
    const by = {};
    films.forEach((f) => { if (f.director) (by[f.director] ||= []).push(f); });
    Object.entries(by).sort((a, b) => b[1].length - a[1].length).slice(0, 20)
      .forEach(([d, fs]) => {
        const a = avg(fs);
        log(`${padStart(fs.length, 4)}  ${pad(d, 28)} ${a ? c.yellow(`avg ★${a.toFixed(1)}`) : ''}`);
      });
  },

  async contributors(args, flags) {
    const { films } = await load(flags, { needEnrich: true });
    if (!hasKey()) die('contributors needs director data — add a TMDB key');
    const by = {};
    films.forEach((f) => { if (f.director) by[f.director] = (by[f.director] || 0) + 1; });
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const total = films.filter((f) => f.director).length;
    const max = rows[0]?.[1] || 1;
    rows.forEach(([d, n]) =>
      log(`${bar(n, max)} ${padStart(n, 3)}  ${c.gray(`${((n / total) * 100).toFixed(0)}%`)}  ${d}`));
    log(c.gray(`\n${Object.keys(by).length} directors · ${total} credited films`));
  },

  async diff(args, flags) {
    const [y1, y2] = args;
    if (!/^\d{4}$/.test(y1 || '') || !/^\d{4}$/.test(y2 || '')) die('usage: mg diff 2024 2025');
    const { films } = await load(flags, { needEnrich: true });
    const pick = (y) => films.filter((f) => (f.watchedDate || '').startsWith(y));
    const A = pick(y1), B = pick(y2);
    if (!A.length && !B.length) {
      return log(c.gray('no per-film dates available — Letterboxd\'s films grid carries no watch dates.\n' +
        'Use the web dashboard (seeded from a CSV export) for date-based diffs.'));
    }
    const aA = avg(A), aB = avg(B);
    log(heading(`diff ${y1}..${y2}`));
    log(`films:  ${A.length} → ${B.length}  ${delta(B.length - A.length)}`);
    if (aA && aB) log(`avg:    ★${aA.toFixed(1)} → ★${aB.toFixed(1)}  ${delta(aB - aA, '★')}`);
  },

  async streak(args, flags) {
    const { films } = await load(flags);
    const days = [...new Set(films.map((f) => f.watchedDate).filter(Boolean))];
    if (!days.length) {
      return log(c.gray('the films grid carries no watch dates, so streaks are dashboard-only.\n' +
        'Open the web dashboard for streaks (it seeds real dates from your CSV export).'));
    }
    const { length } = longestStreak(films);
    log(`longest streak: ${c.yellow(length)} days · active days: ${days.length}`);
  },

  async wrapped(args, flags) {
    const { user, films } = await load(flags, { needEnrich: true });
    // Same summary shape as the browser dashboard's mg wrapped — see
    // domain/letterboxd.mjs summarize().
    const s = summarize(films);
    log(heading(`━━ MovieGit Wrapped · @${user} ━━`));
    log(`${c.bold(s.count)} films${s.totalMin ? ` · ${s.hours}h · ${(s.totalMin / 1440).toFixed(1)} days of cinema` : ''}`);
    if (s.avg != null) log(`average rating: ${c.yellow('★' + s.avg.toFixed(2))}`);
    if (s.topRated) log(`top rated: ${s.topRated.title} ${stars(s.topRated.rating)}`);
    if (s.topDirector) log(`most-watched director: ${s.topDirector[0]} ${c.gray(`(${s.topDirector[1]})`)}`);
    if (s.topGenres.length) log(`top genres: ${c.gray(s.topGenres.join(' · '))}`);
  },

  async blame(args, flags) {
    const { films } = await load(flags, { needEnrich: true });
    const f = findFilm(films, args.join(' '));
    if (!f) die(`no film matches: ${args.join(' ')}`);
    log(`${c.magenta(mgHash(f.title, f.year))} ${c.bold(f.title)} ${c.gray(`(${f.year || '—'})`)}`);
    if (f.rating != null && f.voteAvg) {
      const d = ratingDelta(f.rating, f.voteAvg);
      log(`rating: ${stars(f.rating)} vs TMDB ★${(f.voteAvg / 2).toFixed(1)} → ${delta(d, '★')} ${isHotTake(d) ? c.yellow('(hot take)') : c.gray('(consensus)')}`);
    }
    (f.genres || []).slice(0, 3).forEach((g) => {
      const gs = rated(films.filter((x) => (x.genres || []).includes(g)));
      if (gs.length > 1) log(`genre ${pad(g, 14)} your avg ${c.yellow('★' + avgRating(gs).toFixed(1))} ${c.gray(`over ${gs.length} films`)}`);
    });
    if (f.director) {
      const ds = films.filter((x) => x.director === f.director);
      const a = avgRating(ds);
      log(`director ${f.director}: ${ds.length} film(s), avg ${a ? c.yellow('★' + a.toFixed(1)) : '—'}${isTrustedDirector(ds.length, a) ? c.cyan(' (trusted)') : ''}`);
    }
  },

  async merge(args, flags) {
    const other = (args[0] || '').replace(/^@/, '');
    if (!other) die('usage: mg merge <letterboxd-user>');
    const { user, films } = await load(flags);
    process.stderr.write(c.gray(`fetching ${other}/films/ …\n`));
    const theirs = await fetchFilms(other);
    const mine = new Map(rated(films).map((f) => [`${f.title.toLowerCase()}|${f.year}`, f.rating]));
    const shared = [];
    theirs.forEach((t) => {
      const k = `${t.title.toLowerCase()}|${t.year}`;
      if (mine.has(k) && t.rating != null) shared.push({ t: t.title, mine: mine.get(k), theirs: t.rating });
    });
    const overlap = theirs.filter((t) => mine.has(`${t.title.toLowerCase()}|${t.year}`)).length;
    if (!shared.length) return log(c.gray(`no shared rated films with @${other}`));
    // Same compatibility formula as the browser dashboard's mg merge — see
    // domain/letterboxd.mjs computeCompat().
    const { compat, meanDiff } = computeCompat(shared);
    log(heading(`merge @${user} ← @${other}`));
    log(`${overlap} films both watched · ${shared.length} both rated`);
    const col = compat >= 70 ? c.green : compat >= 45 ? c.yellow : c.red;
    log(`taste compatibility: ${col(compat + '%')} ${c.gray(`(mean Δ ${meanDiff.toFixed(2)}★)`)}`);
    const conflicts = shared.filter((x) => isMergeConflict(x.mine, x.theirs))
      .sort((p, q) => Math.abs(q.mine - q.theirs) - Math.abs(p.mine - p.theirs));
    if (!conflicts.length) return log(c.green('no merge conflicts — aligned taste'));
    log(c.red('merge conflicts') + c.gray(' (rated ≥2★ apart):'));
    conflicts.slice(0, 8).forEach((x) =>
      log(`  ${pad(x.t, 34)} ${c.yellow(`you ★${x.mine}`)} ${c.gray(`vs @${other} ★${x.theirs}`)}`));
  },

  async pull(args, flags) {
    const { user, films, truncated: t } = await load({ ...flags, refresh: true }, { needEnrich: true });
    log(c.green('✓ ') + `synced ${films.length} films from @${user}`);
    truncNote(t, films);
  },

  async push(args, flags) {
    const { user, films } = await load(flags, { needEnrich: true });
    const file = flags.out || `moviegit-${user}-${today()}.json`;
    writeFileSync(file, JSON.stringify(films, null, 2));
    log(c.green('✓ ') + `exported ${films.length} films → ${file}`);
  },

  async commit(args, flags) {
    const query = args.join(' ');
    if (!query) die('usage: mg commit "Film Title" [--rating 4.5] [--date YYYY-MM-DD] [--rewatch] [--liked]');
    const rating = flags.rating != null ? Number(flags.rating) : null;
    if (rating != null && (isNaN(rating) || rating < 0.5 || rating > 5)) die('--rating must be between 0.5 and 5');
    const date = flags.date || today();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) die('--date must be YYYY-MM-DD');

    process.stderr.write(c.gray(`resolving "${query}" …\n`));
    const film = await resolveFilm(query, { year: flags.year, slug: flags.slug });
    if (!film) {
      die(`no Letterboxd film page found for "${query}".\n` +
          `       Try adding the year (--year 2025) or the exact slug from the film's URL\n` +
          `       (letterboxd.com/film/<slug>/):  mg commit "${query}" --slug <slug>`);
    }

    log(`${c.bold(film.title)} ${c.gray(`(${film.year || '—'})`)}  ${rating != null ? stars(rating) : c.gray('unrated')}  ${c.gray(date)}`);
    log(c.gray(`  letterboxd.com/film/${film.slug}/`));
    if (flags['dry-run']) return log(c.gray('dry run — nothing written'));

    // Auth is required only for the real write, so --dry-run stays usable unauthenticated.
    if (!getCookie()) {
      log('');
      log(c.yellow('write access not configured — nothing was logged.\n'));
      return log(AUTH_HELP);
    }

    const res = await logFilm({
      slug: film.slug, rating, date,
      rewatch: Boolean(flags.rewatch), liked: Boolean(flags.liked),
    });
    if (!res.ok) die(res.message);
    log(c.green(`[main ${mgHash(film.title, film.year)}] `) + `logged to Letterboxd`);
    log(c.gray('  it will appear in the web dashboard on its next sync'));
    config.setCache(null);
  },

  async remote(args, flags) {
    const user = resolveUser(flags.user);
    log(`origin  ${c.cyan(`https://letterboxd.com/${user}/`)} (fetch)`);
    log(`origin  ${getCookie() ? c.green('authenticated session') : c.gray('no push — run mg auth')} (push)`);
    log(c.gray(`dashboard: https://jeffzh4.github.io/Moviegit?user=${user}`));
    log(c.gray(`tmdb: ${hasKey() ? 'key configured' : 'no key (limited metadata)'}`));
  },

  async config(args) {
    const cfg = config.get();
    if (args[0] === 'path') return log(config.paths.config);
    log(`username  ${cfg.username || c.gray('(unset)')}`);
    log(`tmdbKey   ${cfg.tmdbKey ? c.gray('set') : c.gray('(unset)')}`);
    log(`auth      ${getCookie() ? 'session cookie stored' : c.gray('(none)')}`);
    log(c.gray(`config    ${config.paths.config}`));
  },

  async gc() {
    config.setCache(null);
    log(c.green('✓ ') + 'cache cleared');
  },
};

export const READ_ONLY = ['status', 'log', 'show', 'grep', 'shortlog', 'contributors',
  'diff', 'streak', 'wrapped', 'blame', 'merge', 'pull', 'push', 'remote', 'config', 'gc'];
