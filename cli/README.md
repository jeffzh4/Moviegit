# mg — git for your movies

A command line over your Letterboxd watch history. The terminal counterpart to the
[MovieGit dashboard](https://jeffzh4.github.io/Moviegit).

```
$ mg log 5
9585d6b  The Odyssey            (2026)  ★★★★½  — Christopher Nolan
ec73e5f  Minions & Monsters     (2026)  ★★★★   — Pierre Coffin
0d451f0  The Sheep Detectives   (2026)  ★★½    — Kyle Balda
3cbafa6  Hoppers                (2026)  ★½     — Daniel Chong
bc82d71  GOAT                   (2026)  ★★★    — Tyree Dillihay
```

Zero dependencies. Node 18+. Commit hashes match the web dashboard exactly — the
same FNV-1a of title + year — so a hash you see here is the hash you see there.

## Install

```bash
npm install -g moviegit
```

Or run it straight from a clone:

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

Reads are **public and unauthenticated** — no login, no cookie, nothing stored
server-side. A free [TMDB key](https://www.themoviedb.org/settings/api) is optional
but unlocks directors, genres, runtimes, and consensus ratings.

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
| `mg wrapped` | Year-in-review card |
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

Once written, the film appears in the web dashboard on its next sync — Letterboxd
is the shared remote, so terminal and browser stay in step through it.

### Authentication, and why it works this way

Letterboxd has **no public write API**. Logging a film therefore means acting as
your own signed-in browser session. This tool deliberately **never handles your
password**. Instead you paste a session cookie you copied yourself:

```
1. Sign in to letterboxd.com in your browser
2. DevTools → Application → Cookies → https://letterboxd.com
3. Copy the value of the cookie named:  letterboxd.signed.in.as
4. mg auth --cookie "<that value>"
```

It is stored at `~/.config/moviegit/credentials.json` with `0600` permissions and
is sent only to letterboxd.com, only on requests you trigger with `mg commit`.
Remove it any time with `mg auth --logout`, or by signing out on letterboxd.com.

**This write path is unofficial.** It drives the same form the Letterboxd website
posts when you use its own "log this film" dialog, and it can break whenever they
change that form. `mg commit` verifies the response and reports failure loudly
rather than pretending a write succeeded. Read commands are unaffected.

## Known limits

- **72-film ceiling on reads.** Letterboxd serves page 1 of the films grid to any
  client but returns `403` for deeper pages to non-browser requests, so the CLI
  reliably sees your 72 most recently-watched films. Commands say so explicitly
  rather than under-reporting silently. The web dashboard fills in the full
  back-catalogue from a CSV export baked into its seed.
- **No watch dates.** The films grid carries ratings but not per-film dates, so
  `streak` and date-based `diff` need the dashboard's seeded history.
- **`search` is blocked**, so `mg commit` resolves films by deriving the slug from
  the title and verifying it against the real film page. Use `--year` or `--slug`
  when a title is ambiguous (e.g. *Sinners* 2002 vs 2025).

## Config

```
~/.config/moviegit/
  config.json       username, optional TMDB key      (0600)
  credentials.json  Letterboxd session cookie        (0600)
  cache.json        last synced film list            (0600)
```

Override the location with `MOVIEGIT_HOME`. Environment overrides: `MOVIEGIT_USER`,
`TMDB_API_KEY`, `NO_COLOR`.

## License

MIT
