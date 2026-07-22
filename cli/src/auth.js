/**
 * Write access to Letterboxd.
 *
 * Letterboxd publishes no write API, so logging a film means acting as your own
 * logged-in browser session. We deliberately do NOT handle your password: you
 * paste a session cookie you copied from your own browser, and it is stored
 * locally with 0600 permissions and sent only to letterboxd.com.
 *
 * This path is UNOFFICIAL. It mirrors the request the Letterboxd website makes
 * when you use its own "log this film" dialog, and can break whenever they
 * change that form. Every failure is reported loudly rather than swallowed.
 */
import { config } from './config.js';
import { filmMeta, resolveFilm, UA } from './letterboxd.js';

export const AUTH_HELP = `
To let 'mg commit' write to Letterboxd you must supply your own session cookie:

  1. Sign in to letterboxd.com in your browser.
  2. Open DevTools -> Application (or Storage) -> Cookies -> https://letterboxd.com
  3. Copy the value of the cookie named:  letterboxd.signed.in.as
  4. Run:  mg auth --cookie "<that value>"

Stored at ~/.config/moviegit/credentials.json with 0600 permissions.
Revoke any time with:  mg auth --logout   (or just sign out on letterboxd.com)
`.trim();

export function getCookie() {
  const { sessionCookie } = config.creds();
  return sessionCookie || null;
}

export function cookieHeader() {
  const c = getCookie();
  return c ? `letterboxd.signed.in.as=${c}` : null;
}

/** Verify the stored cookie still corresponds to a signed-in session. */
export async function whoami() {
  const cookie = cookieHeader();
  if (!cookie) return null;
  const res = await fetch('https://letterboxd.com/', {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/href="\/([\w-]+)\/"[^>]*class="[^"]*navitem[^"]*"[^>]*>\s*Profile/i)
        || html.match(/data-current-user="([\w-]+)"/)
        || html.match(/"username":"([\w-]+)"/);
  return m ? m[1] : (html.includes('/sign-out/') ? 'signed-in' : null);
}

/**
 * Log a film to Letterboxd's diary.
 * Returns { ok, message }. Never throws on a normal API rejection.
 */
export async function logFilm({ slug, rating, date, rewatch = false, liked = false, review = '' }) {
  const cookie = cookieHeader();
  if (!cookie) return { ok: false, message: 'not authenticated — run: mg auth' };

  const meta = await filmMeta(slug, cookie);
  if (!meta) return { ok: false, message: `no such film page: /film/${slug}/` };
  if (!meta.filmId) return { ok: false, message: `could not resolve film id for "${slug}"` };
  if (!meta.csrf)   return { ok: false, message: 'could not obtain a CSRF token (session may be stale — re-run: mg auth)' };

  const body = new URLSearchParams({
    __csrf: meta.csrf,
    viewingId: '',
    filmId: meta.filmId,
    specifiedDate: 'true',
    viewingDateStr: date,
    review,
    tags: '',
    liked: liked ? 'true' : 'false',
    rewatch: rewatch ? 'true' : 'false',
  });
  if (rating != null) body.set('rating', String(Math.round(rating * 2))); // stars -> 0..10

  const res = await fetch('https://letterboxd.com/s/save-diary-entry/', {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `https://letterboxd.com/film/${slug}/`,
      Cookie: `${cookie}; __csrf=${meta.csrf}`,
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, message: `letterboxd rejected the write (HTTP ${res.status}). ${hint(res.status)}` };
  }
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON response */ }
  if (json && json.result === false) {
    return { ok: false, message: json.messages?.join('; ') || 'letterboxd reported a failure' };
  }
  if (json && json.result === true) return { ok: true, message: 'logged' };
  // Unknown shape: report honestly instead of claiming success.
  return {
    ok: false,
    message: 'wrote the request but could not confirm the result — check your Letterboxd diary. ' +
             'If this persists the site form has likely changed.',
  };
}

function hint(status) {
  if (status === 403) return 'Session or CSRF token is stale — re-run: mg auth';
  if (status === 404) return 'The save endpoint moved; this unofficial write path needs updating.';
  return 'Re-run with a fresh cookie via: mg auth';
}

export { resolveFilm };
