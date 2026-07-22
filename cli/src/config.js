/**
 * Config + cache living under ~/.config/moviegit/
 *
 *   config.json       username, optional TMDB key            (0600)
 *   credentials.json  Letterboxd session cookie, if provided (0600)
 *   cache.json        last synced film list                  (0600)
 *
 * Credentials never leave this machine. They are sent only to letterboxd.com,
 * on requests you explicitly trigger with `mg commit`.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';

const DIR = process.env.MOVIEGIT_HOME || join(homedir(), '.config', 'moviegit');

const paths = {
  dir: DIR,
  config: join(DIR, 'config.json'),
  creds: join(DIR, 'credentials.json'),
  cache: join(DIR, 'cache.json'),
};

function ensureDir() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true, mode: 0o700 });
}

function readJSON(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJSON(file, data) {
  ensureDir();
  writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export const config = {
  paths,
  get:   ()  => readJSON(paths.config, {}),
  set:   (o) => writeJSON(paths.config, { ...readJSON(paths.config, {}), ...o }),

  creds:      ()  => readJSON(paths.creds, {}),
  setCreds:   (o) => writeJSON(paths.creds, { ...readJSON(paths.creds, {}), ...o }),
  clearCreds: ()  => { try { unlinkSync(paths.creds); return true; } catch { return false; } },

  cache:    ()  => readJSON(paths.cache, null),
  setCache: (o) => writeJSON(paths.cache, o),
};

/** Resolve the active username: --user flag > env > stored config. */
export function resolveUser(flagUser) {
  const u = flagUser || process.env.MOVIEGIT_USER || config.get().username;
  if (!u) {
    throw new Error("no Letterboxd account linked — run:  mg login <your-letterboxd-username>");
  }
  return u;
}
