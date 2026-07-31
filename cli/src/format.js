/** Terminal rendering: colors, stars, tables. */

// mgHash lives in domain.js — same FNV-1a hash the web dashboard uses,
// so hashes match across both. Re-exported so callers don't need to know
// it moved.
export { mgHash } from './domain.js';

const NO_COLOR = process.env.NO_COLOR != null || !process.stdout.isTTY;
const wrap = (code) => (s) => NO_COLOR ? String(s) : `\x1b[${code}m${s}\x1b[0m`;

export const c = {
  dim:    wrap('2'),
  bold:   wrap('1'),
  green:  wrap('32'),
  red:    wrap('31'),
  yellow: wrap('33'),
  blue:   wrap('34'),
  magenta:wrap('35'),
  cyan:   wrap('36'),
  gray:   wrap('90'),
};

export function stars(r) {
  if (r == null) return c.gray('unrated');
  return c.yellow('★'.repeat(Math.floor(r)) + (r % 1 ? '½' : ''));
}

export function bar(value, max, width = 16) {
  const n = max ? Math.round((value / max) * width) : 0;
  return c.cyan('█'.repeat(n)) + c.gray('░'.repeat(Math.max(0, width - n)));
}

export function delta(v, unit = '') {
  const s = `${v >= 0 ? '+' : ''}${unit === '★' ? v.toFixed(1) : v}${unit}`;
  return v >= 0 ? c.green(s) : c.red(s);
}

export const pad = (s, n) => String(s).padEnd(n);
export const padStart = (s, n) => String(s).padStart(n);

export function heading(text) {
  return c.bold(text);
}

export function die(msg) {
  console.error(c.red('error: ') + msg);
  process.exit(1);
}
