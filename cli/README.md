# mg — git for your movies

A command line over your Letterboxd watch history, and the terminal counterpart to the
[MovieGit dashboard](https://jeffzh4.github.io/Moviegit).

```
$ mg log 5
9585d6b  The Odyssey            (2026)  ★★★★½  — Christopher Nolan
ec73e5f  Minions & Monsters     (2026)  ★★★★   — Pierre Coffin
0d451f0  The Sheep Detectives   (2026)  ★★½    — Kyle Balda
3cbafa6  Hoppers                (2026)  ★½     — Daniel Chong
bc82d71  GOAT                   (2026)  ★★★    — Tyree Dillihay
```

Zero dependencies. Node 18+. Commit hashes match the web dashboard (the same
FNV-1a of title + year).

## Install

The package is unpublished. From a clone, link the CLI locally with Node 18 or newer.

```bash
cd cli && npm link
```

## Quick start

```bash
mg login islaby --tmdb-key <your-tmdb-key>   # link an account (key is optional)
mg status                                    # summary
mg log 20                                    # your commit log
mg blame prestige                            # why you rated it that way
mg merge someuser                            # taste compatibility
```

Reads are **public and unauthenticated**: no login, no cookie, nothing stored
server-side. A free [TMDB key](https://www.themoviedb.org/settings/api) is optional
but adds directors, genres, runtimes, and consensus ratings.

## Commands

### Setup
| Command | Description |
|---|---|
| `mg login <user>` | Link a Letterboxd account (`--tmdb-key <key>` for rich metadata) |
| `mg auth` | Enable writes (`--cookie <v>`, `--status`, `--logout`) |
| `mg config [path]` | Show stored configuration |
| `mg remote` | Show the linked account and access level |

### Inspect
| Command | Description |
|---|---|
| `mg status` | Films, ratings, runtime, sync age, write access |
| `mg log [n]` | Commit log of watches (default 20) |
| `mg show <film>` | Full detail for one film |
| `mg grep <query>` | Search titles, directors, genres |
| `mg blame <film>` | Why a rating happened: TMDB divergence, genre averages, director trust |
| `mg shortlog` | Films grouped by director |
| `mg contributors` | Directors ranked by contribution share |
| `mg streak` | Watch streaks (needs dated history) |

### Analyse
| Command | Description |
|---|---|
| `mg diff <y1> <y2>` | Taste diff between two years |
| `mg wrapped` | Summary of the available films |
| `mg merge <user>` | Taste compatibility, with "merge conflicts" |

### Sync
| Command | Description |
|---|---|
| `mg pull` | Re-fetch from Letterboxd |
| `mg push [--out f]` | Export enriched history as JSON |
| `mg commit "<film>"` | **Log a film to Letterboxd** |
| `mg gc` | Clear the local cache |

### Global flags
`--user <name>` act on another account · `--refresh` bypass cache · `--help` · `--version`

## Logging films from your terminal

```bash
mg commit "Sinners" --year 2025 --rating 4.5
mg commit "Weapons" --rating 4 --date 2026-06-02 --liked
mg commit "Hoppers" --slug hoppers --dry-run     # preview, writes nothing
```

Flags: `--rating <0.5-5>` · `--date YYYY-MM-DD` (defaults to today) · `--rewatch`
· `--liked` · `--year <yyyy>` and `--slug <slug>` to disambiguate · `--dry-run`.

After a successful write, the dashboard can pick up the film from the Letterboxd grid. The authenticated write path still needs end-to-end verification.

### Authentication, and why it works this way

Letterboxd has **no public write API**, so logging a film means acting as your
own signed-in browser session. This tool **never handles your password**; you
paste a session cookie you copied yourself:

```
1. Sign in to letterboxd.com in your browser
2. DevTools → Application → Cookies → https://letterboxd.com
3. Copy the value of the cookie named:  letterboxd.signed.in.as
4. mg auth --cookie "<that value>"
```

It is stored at `~/.config/moviegit/credentials.json` with `0600` permissions and
is sent to Letterboxd for session verification and diary writes.
Run `mg auth --logout` to remove the stored cookie.

**This write path is unofficial.** It drives the same form the Letterboxd website
posts from its own "log this film" dialog, and it can break if they change that
form. `mg commit` verifies the response and reports failure rather than
pretending a write succeeded. Read commands are unaffected.

## Known limits

- **72-film ceiling on reads.** Letterboxd serves page 1 of the films grid to any
  client but returns `403` for deeper pages to non-browser requests, so the CLI
  sees your 72 most recently-watched films. Commands say so rather than
  under-reporting silently. The web dashboard holds the full
  back-catalogue from a CSV export in its seed.
- **No watch dates.** The films grid carries ratings but not per-film dates, so
  `streak` and date-based `diff` need the dashboard's seeded history.
- **`search` is blocked**, so `mg commit` derives the slug from the title and
  verifies it against the real film page. Use `--year` or `--slug` when a title
  is ambiguous (e.g. *Sinners* 2002 vs 2025).

## Config

```
~/.config/moviegit/
  config.json       username, optional TMDB key      (0600)
  credentials.json  Letterboxd session cookie        (0600)
  cache.json        last synced film list            (0600)
```

Override the location with `MOVIEGIT_HOME`. Other variables: `MOVIEGIT_USER`,
`TMDB_API_KEY`, `NO_COLOR`.

## Development checks

From `cli/`, run `npm run check` to check JavaScript syntax and
`npm pack --dry-run` to inspect the package contents. The publish hook runs
the syntax check automatically.

## License

MIT
