#!/usr/bin/env node
/**
 * mg — git for your movies.
 * A command line over your Letterboxd watch history.
 */
import { commands } from '../src/commands.js';
import { c, die } from '../src/format.js';

const HELP = `
${c.bold('mg')} — git for your movies

${c.bold('USAGE')}
  mg <command> [args] [flags]

${c.bold('SETUP')}
  login <user>        Link a Letterboxd account (add --tmdb-key <key> for rich data)
  auth                Enable writes (--cookie <v> · --status · --logout)
  config [path]       Show stored configuration
  remote              Show the linked account and access level

${c.bold('INSPECT')}
  status              Account summary: films, ratings, runtime, sync age
  log [n]             Commit log of watches (default 20)
  show <film>         Full detail for one film
  grep <query>        Search titles, directors and genres
  blame <film>        Why a rating happened: divergence, genre avg, director trust
  shortlog            Films grouped by director
  contributors        Directors ranked by contribution share
  streak              Watch streaks (needs dated history)

${c.bold('ANALYSE')}
  diff <y1> <y2>      Taste diff between two years
  wrapped             Year-in-review card
  merge <user>        Taste compatibility with another account

${c.bold('SYNC')}
  pull                Re-fetch from Letterboxd (refresh cache)
  push [--out f]      Export enriched history as JSON
  commit "<film>"     ${c.bold('Log a film to Letterboxd')}
                        --rating <0.5-5>  --date YYYY-MM-DD
                        --rewatch  --liked  --dry-run
  gc                  Clear the local cache

${c.bold('GLOBAL FLAGS')}
  --user <name>       Act on another account (read-only)
  --refresh           Bypass cache for this command
  --help  --version

${c.gray('Reads are public and need no authentication. Writes use your own Letterboxd')}
${c.gray('session cookie, stored locally at ~/.config/moviegit/ with 0600 permissions.')}
`.trim();

function parse(argv) {
  const args = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next != null && !next.startsWith('--')) { flags[key] = next; i++; }
      else flags[key] = true;
    } else args.push(a);
  }
  return { args, flags };
}

const [, , cmdRaw, ...rest] = process.argv;
const { args, flags } = parse(rest);

if (!cmdRaw || flags.help || cmdRaw === 'help' || cmdRaw === '--help') {
  console.log(HELP);
  process.exit(0);
}
if (cmdRaw === '--version' || cmdRaw === 'version') {
  console.log('moviegit 1.0.0');
  process.exit(0);
}

const cmd = commands[cmdRaw];
if (!cmd) {
  console.error(c.red(`mg: '${cmdRaw}' is not an mg command.`));
  console.error(c.gray("See 'mg --help'."));
  process.exit(1);
}

try {
  await cmd(args, flags);
} catch (err) {
  die(err.message || String(err));
}
