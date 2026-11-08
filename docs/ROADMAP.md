# MovieGit — Roadmap

**Status:** Living document
**Last updated:** 2026-11-07

This is the committed, ordered plan: scoped work, not a brainstorm. Unscoped ideas live in [FUTURE_FEATURES.md](FUTURE_FEATURES.md); once something moves from "idea" to "planned," it moves here.

---

## Near-term (next)

### 1. Verify `mg commit`'s live write path against a real Letterboxd account

**Why it's next:** every other piece of the CLI's write path has been verified independently (film-page resolution, film-ID extraction, CSRF-token extraction, all against live Letterboxd pages), but the POST to `save-diary-entry` has never been confirmed end-to-end against a real, authenticated write. This is the one gap between "should work" and "known to work," and it is gated on the account owner's own credentials (a session cookie), which this project's engineering process will not hold or transmit on someone else's behalf. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md#the-mg-commit-write-path-is-unverified) for the full disclosure.

**Definition of done:** `mg commit "<film>" --rating N` on a real account produces a real diary entry, confirmed by checking the account's own Letterboxd diary afterward; the CLI's success/failure reporting is confirmed accurate in both directions.

### 2. Publish `moviegit` to the npm registry

**Why it's next:** the CLI is currently installed from a clone. Publishing would make `npm install -g moviegit` available. Everything before publishing is verified (`npm pack --dry-run` contents, `prepublishOnly` syntax gate, package-root packaging fixed per [ARCHITECTURE.md §5](ARCHITECTURE.md#5-the-clis-write-path-and-the-packaging-bug-caught-before-it-shipped)) — the remaining step is `npm login` + `npm publish`, both of which require the account owner's own npm identity.

**Definition of done:** `npm install -g moviegit` from a clean machine installs a working CLI; the README documents the registry install.

## Mid-term

### 3. A settings-driven multi-user experience that doesn't require reading source

Settings already lets visitors change the handle and TMDB key. It checks the public films grid before saving a new handle and warns when verification fails. The remaining work is a clearer first-run experience and better feedback when a profile cannot be loaded.

### 4. Director-completion expansion beyond the current top-12 cap

The director-filmography-completion stat (Stats panel) shows coverage for the 12 directors with the most logged films — a deliberate cap to keep the lazy TMDB person-API fetch cheap, not a data limitation. Raising or removing the cap is scoped but not yet built, pending a decision on whether the extra TMDB request volume is worth a marginally more complete stat.

### 5. Composer data from TMDB credits, replacing the curated map

The Composers stats panel currently reads from a small hand-curated film→composer map (Zimmer, Morricone, Williams, and a handful of others) rather than pulling composer credits from TMDB directly. This was a deliberate scope cut for v1.0 — TMDB's crew-credit data for composers is less consistently populated than for directors — and remains open.

## Long-term / directional

### 6. A real, native terminal experience beyond the browser drawer

The `mg` CLI (v1.5) already closes the biggest gap here — commands run in an actual shell, not just an in-page drawer. What's missing is whatever makes the CLI a *daily* tool rather than an occasional one: shell completion, a `mg` alias/wrapper that's genuinely faster to reach for than opening the dashboard, and — longer term — investigating whether Letterboxd's actual mobile-app API (reverse-engineered by the wider community, not officially documented) is worth adopting for a more reliable write path than the current unofficial diary-form replay.

### 7. Terminal mode as a full dashboard theme, not just a drawer

A green-on-black, fully terminal-styled variant of the entire diary view (not just the `mg log` toggle) has been discussed since early versions and never scoped. It would be a pure presentation-layer change — no new data, no new logic — which is exactly why it keeps losing priority to work that fixes something broken.

---

## What's explicitly not on this roadmap

See [PRD.md §4](PRD.md#4-non-goals) for the full non-goals list. The short version: no social features, no backend/hosted-account model, no attempt to out-feature Letterboxd's own stats where Letterboxd already does the job. Adding any would be a different product, not a version bump.
