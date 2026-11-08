# MovieGit maintainer notes

MovieGit has two entry points. The browser dashboard ships as a static
[`index.html`](index.html) on GitHub Pages. The Node CLI starts at
[`cli/bin/mg.js`](cli/bin/mg.js). See the [architecture guide](docs/ARCHITECTURE.md)
for the module map, sync model, storage, and verification workflow.

- Edit shared parsing and calculations in [`cli/src/domain.js`](cli/src/domain.js).
  Run `python3 scripts/sync-domain.py` to regenerate the dashboard copy.
- Keep icons in the inline SVG sprite. The former icon webfont could fail
  independently of the dashboard and leave controls without visible icons.
- Escape interpolated text in browser terminal output. The terminal renders HTML.
- Keep raw Letterboxd exports and generated graph output out of commits.
  When refreshing the baked seed from the export, bump `SEED_VERSION` so
  existing browsers merge the new entries.
- Record user-visible changes in the [changelog](CHANGELOG.md). Use
  [known issues](docs/KNOWN_ISSUES.md) to track behavior that remains unverified.

Run `python3 scripts/check-syntax.py`, `python3 scripts/check-domain-sync.py`,
and `npm --prefix cli run check` before shipping code changes. For UI changes,
serve the dashboard locally and verify the affected views in both themes.
