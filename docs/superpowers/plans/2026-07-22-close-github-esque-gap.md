# Close GitHub-esque / Publishable Gap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take MovieGit from "working portfolio piece" to "publishable, GitHub-esque Letterboxd tool" — settings-driven multi-user support, a publish-ready CLI package, clean repo hygiene, and a CI gate — while asking the project owner for as few external credentials as possible.

**Architecture:** Five independent tracks against the existing single-file dashboard (`index.html`) and the existing zero-dependency CLI (`cli/`). No new services, no new runtime dependencies, no backend. Multi-user support stays localStorage-based (a settings panel that overrides the hardcoded `CFG.USERNAME`/`CFG.TMDB_KEY`, the same override pattern `?user=` already uses). CLI publish-readiness is packaging-only — no code rewrite. CI is a syntax/smoke gate, not a full test framework, because none exists in this codebase today (documented as a constraint below, not silently ignored).

**Tech Stack:** Vanilla JS/CSS/HTML (dashboard), zero-dep Node 18+ ESM (CLI), GitHub Actions (CI), npm (CLI distribution).

## Global Constraints

- Zero build step for `index.html` — every task must keep it a single self-contained file, no bundler introduced.
- Zero runtime dependencies in `cli/` — `package.json` `dependencies` stays `{}`.
- No test framework exists for `index.html` today. Verification for dashboard tasks is: (a) a syntax gate (brace-balance check, already used manually throughout this project — Task 4 turns it into a reusable script) and (b) an explicit browser-driven manual check with exact steps and expected results. This is documented, not glossed over, per project reality.
- `cli/` has no test framework either. Verification there is `node --check` (syntax) plus explicit CLI invocations with expected stdout, run against the live, public, unauthenticated Letterboxd endpoints already used elsewhere in this codebase (no fixtures/mocks exist in this project).
- Never write, request, or transmit the user's Letterboxd password. The existing session-cookie-only auth model (`cli/src/auth.js`) is not renegotiated by this plan.
- Any step needing a credential the agent cannot obtain itself is called out explicitly in that task's **Requires from you** block, and is the last step of its task so everything up to it can be verified independently.

---

## What's needed from you, minimized and consolidated

Only two things in this whole plan need something from you personally, and neither is needed until the very last step of its task:

1. **Task 5 (live write verification):** your own Letterboxd session cookie, entered by *you* running `mg auth --cookie "..."` on *your* machine. I never see it, store it, or need it relayed to me — you run the verification command yourself and report the output.
2. **Task 6 (npm publish):** an npm account (create one free at npmjs.com if you don't have one) and running `npm login` yourself, then `npm publish` yourself from `cli/`. I cannot and should not hold your npm credentials. Everything up to that point (package correctness, `npm pack --dry-run` contents) is verified without needing your login.

Nothing else in this plan requires a key, token, or account from you. CI (Task 4) runs on GitHub's free Actions minutes for public repos with no secrets. The settings panel (Task 2) needs a TMDB key only from *whoever visits the page* (their own, entered at runtime) — not from you as the maintainer.

---

### Task 1: Repo hygiene — `.gitignore` for generated/tooling directories

**Files:**
- Create: `.gitignore`
- Modify: none (graphify-out/ and .claude/ are already untracked per `git status`)

**Interfaces:**
- Consumes: nothing
- Produces: a `.gitignore` that later tasks (CI, CLI) can rely on to not accidentally get swept into `git add -A`

- [ ] **Step 1: Confirm current untracked state**

Run: `git status --short`
Expected: `?? .claude/` and `?? graphify-out/` present (confirms these are not yet tracked — safe to gitignore without needing `git rm --cached`).

- [ ] **Step 2: Create `.gitignore`**

```gitignore
# graphify knowledge-graph output (regenerate with /graphify, don't ship)
graphify-out/

# Claude Code project-local settings
.claude/

# CLI package — installed deps, npm logs (none should exist, dependencies are {})
cli/node_modules/
npm-debug.log*

# OS cruft
.DS_Store
```

- [ ] **Step 3: Verify it takes effect**

Run: `touch graphify-out/.tmp-test && touch .claude/.tmp-test && git status --short`
Expected: neither `.tmp-test` file appears in the output (both directories are ignored).

Run: `rm graphify-out/.tmp-test .claude/.tmp-test` (clean up the probe files)

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore graphify-out/ and .claude/ tooling directories"
```

---

### Task 2: Settings panel — runtime username + TMDB key, no source edit required

**Files:**
- Modify: `index.html:2297-2320` (the `CFG` module — read overrides before falling back to hardcoded defaults)
- Modify: `index.html:1774-1793` (`.mg-header-right` — add a settings button next to the existing four)
- Modify: `index.html` (near `about-modal` at line 2234 — add a sibling `settings-modal`)
- Modify: `index.html:4505+` (`init()` — no seed/guest logic changes needed; CFG already resolves before `init()` runs, so this is additive only)

**Interfaces:**
- Consumes: existing `STORE` module (`STORE.getTheme`/`STORE.setTheme` pattern to copy for the new `mg_user_settings` key — do not reuse `mg_settings`, which the CLI's `~/.config/moviegit/config.json` docs already reference as a *different* thing; keep this dashboard-local key namespaced as `mg_user_settings` to avoid confusion in the codebase)
- Produces: `CFG.USERNAME` and `CFG.TMDB_KEY` that any *anonymous visitor* can override for their own session, persisted in their own browser only. Does **not** touch the maintainer's hardcoded fallback (`islaby` + the built-in obfuscated key stay the default for anyone who doesn't open settings).

This closes the "anyone visiting has to fork+edit source" gap: a visitor can click **Settings**, type their own Letterboxd username and (optionally) their own free TMDB key, and reload — no code edit, no fork.

- [ ] **Step 1: Add the settings-read helper to `CFG`, ahead of the return block**

Read `index.html` lines 2295-2320 first to confirm the exact current text (icon-sprite and other recent edits may have shifted line numbers slightly — match on content, not line number).

Replace:
```javascript
const CFG = (() => {
  // Username for Letterboxd RSS polling
  const USERNAME = 'islaby';

  // TMDB key — split + base64 encoded, not plaintext
  const _p = ['YTE3ZGM1OTZkMzg1OGFkOQ==', 'N2Q5YjA2MTA3ODYyMDljOQ=='];
  const TMDB_KEY = (() => {
    try { return _p.map(atob).join(''); } catch { return ''; }
  })();

  return {
    USERNAME,
    TMDB_KEY,
```

With:
```javascript
const CFG = (() => {
  // Default username — used unless a visitor sets their own via Settings.
  const DEFAULT_USERNAME = 'islaby';

  // Default TMDB key — split + base64 encoded, not plaintext. Used unless a
  // visitor supplies their own (free) key via Settings.
  const _p = ['YTE3ZGM1OTZkMzg1OGFkOQ==', 'N2Q5YjA2MTA3ODYyMDljOQ=='];
  const DEFAULT_TMDB_KEY = (() => {
    try { return _p.map(atob).join(''); } catch { return ''; }
  })();

  // Visitor-supplied overrides, read once at load. Stored under a key distinct
  // from the CLI's ~/.config/moviegit/config.json (that's a different surface).
  function readUserSettings() {
    try { return JSON.parse(localStorage.getItem('mg_user_settings')) || {}; }
    catch { return {}; }
  }
  const _settings = readUserSettings();

  const USERNAME  = (_settings.username && _settings.username.trim()) || DEFAULT_USERNAME;
  const TMDB_KEY  = (_settings.tmdbKey && _settings.tmdbKey.trim())   || DEFAULT_TMDB_KEY;

  function saveUserSettings(patch) {
    const next = { ..._settings, ...patch };
    localStorage.setItem('mg_user_settings', JSON.stringify(next));
  }

  return {
    USERNAME,
    TMDB_KEY,
    DEFAULT_USERNAME,
    hasCustomUsername: () => Boolean(_settings.username && _settings.username.trim()),
    saveUserSettings,
```

Leave the rest of the `return { ... }` block (`TMDB_BASE`, `TMDB_IMG_SM`, etc.) unchanged — this only adds fields, it doesn't remove any.

- [ ] **Step 2: Syntax-gate this change before touching anything else**

Run:
```bash
python3 -c "
import re
html = open('index.html').read()
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
balance = 0
for ch in '\n'.join(scripts):
    balance += 1 if ch == '{' else -1 if ch == '}' else 0
print('brace balance:', balance)
"
```
Expected: `brace balance: 0`

- [ ] **Step 3: Add the settings button to the header**

Find (near line 1774-1793, the four existing `tipped` icon buttons):
```html
      <button class="icon-btn tipped" id="about-btn" aria-label="About MovieGit" data-tip="About MovieGit">
```

Insert immediately before that line:
```html
      <button class="icon-btn tipped" id="settings-btn" aria-label="Settings" data-tip="Settings">
        <svg class="ic"><use href="#i-settings"/></svg>
      </button>
```

- [ ] **Step 4: Add the missing `i-settings` SVG symbol to the icon sprite**

Find the `<symbol id="i-help-circle" ...>` entry in the sprite block near the top of `<body>` (added in the previous icon-sprite migration). Insert a new symbol immediately after it:

```html
<symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></symbol>
```

- [ ] **Step 5: Add the settings modal markup**

Find `<div class="modal-overlay" id="about-modal">` (line 2234). Insert a sibling modal immediately before it:

```html
<div class="modal-overlay" id="settings-modal">
  <div class="modal">
    <div class="modal-header">
      <h2>Settings</h2>
      <button class="icon-btn" id="settings-close" aria-label="Close settings">
        <svg class="ic"><use href="#i-x"/></svg>
      </button>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">letterboxd username</div>
      <input type="text" id="settings-username" placeholder="e.g. islaby" autocomplete="off" spellcheck="false">
      <p class="modal-hint">Leave blank to use the default (<code id="settings-default-user"></code>).</p>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">tmdb api key <span class="modal-hint-inline">(optional)</span></div>
      <input type="text" id="settings-tmdb-key" placeholder="your own free TMDB v3 key" autocomplete="off" spellcheck="false">
      <p class="modal-hint">Get one free at <a class="modal-link" href="https://www.themoviedb.org/settings/api" target="_blank">themoviedb.org/settings/api</a>. Leave blank to use the built-in demo key.</p>
    </div>
    <div class="modal-section">
      <button class="btn-primary" id="settings-save">Save &amp; reload</button>
      <button class="btn-secondary" id="settings-reset">Reset to default</button>
    </div>
    <p class="modal-hint">Stored only in your browser's localStorage. Never sent anywhere except to Letterboxd and TMDB directly.</p>
  </div>
</div>
```

If `.btn-primary` / `.btn-secondary` / `.modal-hint` classes don't already exist in the stylesheet, add minimal styles near the existing `.modal-section` rules:

```css
.modal-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 6px; }
.modal-hint-inline { font-weight: 400; color: var(--text-tertiary); }
#settings-username, #settings-tmdb-key {
  width: 100%; padding: 8px 10px; margin-top: 6px;
  background: var(--bg-tertiary); border: 1px solid var(--border);
  border-radius: var(--r-md); color: var(--text-primary); font: inherit;
}
.btn-primary, .btn-secondary {
  padding: 8px 14px; border-radius: var(--r-md); font: inherit; cursor: pointer;
  border: 1px solid var(--border);
}
.btn-primary { background: var(--accent-green); color: #05140b; border-color: transparent; font-weight: 600; }
.btn-secondary { background: transparent; color: var(--text-secondary); margin-left: 8px; }
```

- [ ] **Step 6: Wire the modal's open/close/save/reset behavior**

Find the existing about-modal wiring inside the `UI` module (search for `document.getElementById('about-modal')` — currently near line 4452-4453). Add a parallel block immediately after it:

```javascript
    // Settings modal
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn   = document.getElementById('settings-btn');
    settingsBtn?.addEventListener('click', () => {
      document.getElementById('settings-username').value = CFG.hasCustomUsername() ? CFG.USERNAME : '';
      document.getElementById('settings-default-user').textContent = CFG.DEFAULT_USERNAME;
      const saved = JSON.parse(localStorage.getItem('mg_user_settings') || '{}');
      document.getElementById('settings-tmdb-key').value = saved.tmdbKey || '';
      settingsModal.classList.add('open');
    });
    document.getElementById('settings-close')?.addEventListener('click', () => settingsModal.classList.remove('open'));
    settingsModal?.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.remove('open'); });

    document.getElementById('settings-save')?.addEventListener('click', () => {
      const username = document.getElementById('settings-username').value.trim();
      const tmdbKey  = document.getElementById('settings-tmdb-key').value.trim();
      CFG.saveUserSettings({ username: username || null, tmdbKey: tmdbKey || null });
      window.location.reload();
    });
    document.getElementById('settings-reset')?.addEventListener('click', () => {
      localStorage.removeItem('mg_user_settings');
      window.location.reload();
    });
```

Confirm the surrounding function is `initModal()` or equivalent inside `UI` — if the about-modal wiring lives in a differently-named function, place this block in that same function so it runs at the same lifecycle point (`DOMContentLoaded`).

- [ ] **Step 7: Syntax-gate again**

Run the same brace-balance check from Step 2.
Expected: `brace balance: 0`

- [ ] **Step 8: Manual browser verification (no test framework exists — this is the real gate)**

Start the existing preview server (`.claude/launch.json` already defines `moviegit` on port 7821 — reuse it, do not create a new one):

```bash
python3 -m http.server 7821
```

Then, using whatever browser tooling is available in the working session:
1. Navigate to `http://localhost:7821`.
2. Click the new settings icon in the header. **Expected:** modal opens, username field is empty (default), TMDB key field is empty.
3. Type `torontokid` (or any other public Letterboxd handle) into the username field, leave TMDB key blank, click **Save & reload**.
4. **Expected:** page reloads; sidebar handle now shows `@torontokid`; browser console shows a poll against `torontokid`'s films grid (check via `read_console_messages` or Network tab — should NOT reference `islaby`).
5. Open settings again, click **Reset to default**.
6. **Expected:** page reloads; sidebar reverts to the default account.

- [ ] **Step 9: Commit**

```bash
git add index.html
git commit -m "feat: settings panel for visitor-supplied username + TMDB key

Closes the gap where using MovieGit with your own Letterboxd account
required forking and editing CFG.USERNAME/TMDB_KEY in source. Settings
persist to localStorage under mg_user_settings and override CFG's
hardcoded defaults at load time; the maintainer's own account remains
the default for anyone who doesn't open settings."
```

---

### Task 3: Extract the brace-balance syntax check into a reusable script

**Files:**
- Create: `scripts/check-syntax.py`

**Interfaces:**
- Consumes: `index.html` (reads it, does not modify it)
- Produces: an exit-code-driven check (`0` = balanced, `1` = mismatch) that Task 4's CI workflow calls directly, and that Task 2 already ran manually — this makes it a committed, reusable tool instead of a copy-pasted one-off.

- [ ] **Step 1: Write the script**

```python
#!/usr/bin/env python3
"""Syntax gate for index.html's inline <script> blocks.

This repo ships a single self-contained HTML file with no build step and no
test framework. This script is the cheapest real signal we have that an edit
didn't break the JS: every '<script>' block's braces must balance. It will
not catch every bug, but it catches the most common one (an unclosed
function/object from a bad find-and-replace) before it ships.
"""
import re
import sys
from pathlib import Path

def check(path: str) -> int:
    html = Path(path).read_text(encoding="utf-8")
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.DOTALL)
    if not scripts:
        print(f"ERROR: no <script> blocks found in {path}")
        return 1
    combined = "\n".join(scripts)
    balance = 0
    for ch in combined:
        if ch == "{":
            balance += 1
        elif ch == "}":
            balance -= 1
    if balance != 0:
        print(f"FAIL: brace balance is {balance} (expected 0) across {len(scripts)} <script> block(s) in {path}")
        return 1
    print(f"OK: brace balance 0 across {len(scripts)} <script> block(s) in {path}")
    return 0

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    sys.exit(check(target))
```

- [ ] **Step 2: Make it executable and run it against the current file**

```bash
chmod +x scripts/check-syntax.py
python3 scripts/check-syntax.py index.html
```
Expected: `OK: brace balance 0 across 1 <script> block(s) in index.html`

- [ ] **Step 3: Verify it actually fails on broken input**

```bash
cp index.html /tmp/broken.html
python3 -c "
p = '/tmp/broken.html'
s = open(p).read()
s = s.replace('function sleep(ms)', 'function sleep(ms', 1)  # remove a paren, not a brace on purpose
open(p, 'w').write(s)
"
# That edit breaks a paren, not a brace — use a brace-breaking edit instead:
python3 -c "
p = '/tmp/broken.html'
s = open(p).read()
s = s.replace('document.addEventListener(\'DOMContentLoaded\', () => { MG.init(); MGSH.init(); });',
              'document.addEventListener(\'DOMContentLoaded\', () => { MG.init(); MGSH.init(); ')
open(p, 'w').write(s)
"
python3 scripts/check-syntax.py /tmp/broken.html
```
Expected: `FAIL: brace balance is -1 ...` and the script exits non-zero (`echo $?` shows `1`).

Clean up: `rm /tmp/broken.html`

- [ ] **Step 4: Commit**

```bash
git add scripts/check-syntax.py
git commit -m "chore: extract brace-balance syntax gate into a reusable script"
```

---

### Task 4: CI — GitHub Actions smoke test on every push/PR

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `scripts/check-syntax.py` (Task 3), `cli/bin/mg.js` + `cli/src/*.js` (existing)
- Produces: a green/red check on every push and PR, visible on GitHub, no secrets required

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  dashboard-syntax:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.x'
      - name: Check index.html brace balance
        run: python3 scripts/check-syntax.py index.html

  cli-syntax:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: node --check every CLI source file
        run: |
          set -e
          for f in cli/bin/mg.js cli/src/*.js; do
            echo "checking $f"
            node --check "$f"
          done
      - name: CLI --help runs without crashing
        run: node cli/bin/mg.js --help
      - name: npm pack dry-run (validates package.json + files field)
        working-directory: cli
        run: npm pack --dry-run
```

- [ ] **Step 2: Validate the YAML locally before pushing**

```bash
python3 -c "
import yaml, sys
with open('.github/workflows/ci.yml') as f:
    yaml.safe_load(f)
print('valid YAML')
" 2>&1 || python3 -c "
import json, sys
print('pyyaml not installed — falling back to a structural check')
content = open('.github/workflows/ci.yml').read()
assert content.count('runs-on:') == 2, 'expected 2 jobs'
assert 'node --check' in content
print('structural check OK')
"
```
Expected: `valid YAML` (or the fallback's `structural check OK` if `pyyaml` isn't installed locally — the real validation happens on first push regardless).

- [ ] **Step 3: Run the same commands the workflow runs, locally, to catch failures before pushing**

```bash
python3 scripts/check-syntax.py index.html
for f in cli/bin/mg.js cli/src/*.js; do node --check "$f"; done
node cli/bin/mg.js --help
cd cli && npm pack --dry-run && cd ..
```
Expected: all four steps succeed; `npm pack --dry-run` lists `bin/mg.js`, `src/*.js`, and `README.md` (per the existing `"files"` array in `cli/package.json`) with no unexpected files (no `node_modules`, no `.git`).

- [ ] **Step 4: Commit and push, then confirm on GitHub**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions smoke test (dashboard syntax + CLI syntax/pack)"
git push
```

After pushing, check the repo's **Actions** tab on GitHub. Expected: a new "CI" workflow run, both jobs green. This step needs no secret — Actions is free for public repos and this workflow reads no external credentials.

---

### Task 5: Verify the `mg commit` live write path end-to-end

**Files:** none modified — this is a verification task against existing code (`cli/src/auth.js`, `cli/src/commands.js`), documented as a checklist so it's repeatable.

**Interfaces:**
- Consumes: `cli/bin/mg.js` (existing, unmodified)
- Produces: confirmation (or a bug report with exact repro) that `mg commit` actually writes a diary entry on Letterboxd — the one piece of this codebase that has never been confirmed against a real write, called out as a known gap in the last session summary.

**Requires from you:** your own Letterboxd session cookie, entered by you, on your machine. Nothing is transmitted to me or stored outside `~/.config/moviegit/credentials.json` (0600, already how `auth.js` is built).

- [ ] **Step 1 (you, or me with your account already linked from prior testing): confirm read path still works**

```bash
mg login islaby   # or your own handle
mg status
```
Expected: prints your film count, avg rating, "write access: disabled (mg auth)".

- [ ] **Step 2 (you): obtain your session cookie**

Follow the exact steps `mg auth` already prints (from `cli/src/auth.js`'s `AUTH_HELP`):
1. Sign in to letterboxd.com in your browser.
2. DevTools → Application (or Storage) → Cookies → `https://letterboxd.com`.
3. Copy the value of the cookie named `letterboxd.signed.in.as`.

- [ ] **Step 3 (you): store it**

```bash
mg auth --cookie "<paste the value>"
```
Expected: `✓ authenticated as @<yourhandle> — mg commit can now write to Letterboxd` **or** a clear failure message (`cookie stored, but the session did not verify`). If it fails, stop here and report the exact message — that's a bug to fix before Step 4, not something to push through.

- [ ] **Step 4 (you): dry-run first, on a real film you're comfortable testing with**

```bash
mg commit "Paddington" --year 2014 --dry-run
```
Expected: resolves to the correct film page, prints the title/year/rating/date it *would* write, and `dry run — nothing written`. Confirms slug resolution + CSRF extraction work with a real authenticated session before anything is actually written.

- [ ] **Step 5 (you): the real write, on a film safe to test with**

```bash
mg commit "Paddington" --year 2014 --rating 3
```
Expected: either
- **Success:** `[main <hash>] logged to Letterboxd` — then check letterboxd.com/you/films/diary/ in a browser; the entry should be there with today's date and ★3.
- **Failure:** an exact error message from `logFilm()` (e.g. `letterboxd rejected the write (HTTP 403)...` or `wrote the request but could not confirm the result...`). Report the exact message.

- [ ] **Step 6: report the outcome back**

If Step 5 succeeded: this task is done, no code changes needed — update `cli/README.md`'s "Known limits" section to remove any hedging language about the write path being unverified, and update `CLAUDE.md`'s status line. If it failed: file the exact error message and HTTP status; that becomes a new, separately-scoped bug-fix task (out of scope for this plan to pre-guess, since the fix depends entirely on what Letterboxd's actual response looks like).

- [ ] **Step 7 (conditional on success): tidy up the test entry**

If you don't want a test *Paddington* rating cluttering your real diary, delete it manually on letterboxd.com (there's no `mg revert`-to-Letterboxd — CLI writes are one-directional, matching the "Letterboxd is the remote" model documented in the README).

- [ ] **Step 8 (conditional on success): commit the doc update**

```bash
git add cli/README.md CLAUDE.md
git commit -m "docs: confirm mg commit write path verified against live Letterboxd"
```

---

### Task 6: Publish the CLI to npm

**Files:**
- Modify: `cli/package.json`

**Interfaces:**
- Consumes: everything in `cli/` (unmodified by this task except `package.json` metadata)
- Produces: `moviegit` installable via `npm install -g moviegit`, matching what the root `README.md` already documents

**Requires from you:** an npm account (free, npmjs.com) and running `npm login` + `npm publish` yourself from `cli/`. I can prepare and verify everything up to that command; I should not hold your npm credentials or publish on your behalf.

- [ ] **Step 1: Check name availability**

```bash
npm view moviegit
```
Expected: either `npm ERR! 404 'moviegit' is not in this registry` (name is free — proceed as-is) or an existing package (name is taken — you'll need to either claim a scoped name like `@jeffzh4/moviegit` or pick a different name; if taken, update `"name"` in `cli/package.json` accordingly before continuing, and update the install instructions in both READMEs to match).

- [ ] **Step 2: Add a prepublish safety check**

Modify `cli/package.json`, adding a `scripts` block (currently absent):

```json
{
  "name": "moviegit",
  "version": "1.0.0",
  "description": "git for your movies — a command line over your Letterboxd watch history",
  "bin": { "mg": "./bin/mg.js" },
  "type": "module",
  "engines": { "node": ">=18" },
  "files": ["bin", "src", "README.md"],
  "keywords": ["letterboxd", "cli", "film", "movies", "git", "moviegit"],
  "license": "MIT",
  "author": "Jeffrey Zhang",
  "repository": { "type": "git", "url": "https://github.com/jeffzh4/Moviegit.git" },
  "scripts": {
    "prepublishOnly": "for f in bin/mg.js src/*.js; do node --check \"$f\" || exit 1; done && node bin/mg.js --help > /dev/null"
  },
  "dependencies": {}
}
```

This mirrors exactly what CI (Task 4) already checks, so a broken publish is caught locally before it ever reaches the registry.

- [ ] **Step 3: Verify the prepublish check works**

```bash
cd cli && npm run prepublishOnly && cd ..
```
Expected: no output (all `node --check` calls succeed silently) and exit code 0. Confirm with `echo $?` → `0`.

- [ ] **Step 4: Final dry-run of exactly what will be published**

```bash
cd cli && npm pack --dry-run && cd ..
```
Expected: file list shows `bin/mg.js`, `src/auth.js`, `src/commands.js`, `src/config.js`, `src/format.js`, `src/letterboxd.js`, `src/tmdb.js`, `README.md`, `package.json` — nothing else (no test fixtures, no `.git`, no `node_modules`, since `dependencies: {}`).

- [ ] **Step 5: Commit the package.json change**

```bash
git add cli/package.json
git commit -m "chore(cli): add prepublishOnly syntax check before npm publish"
git push
```

- [ ] **Step 6 (you, manual — the one step I cannot do): log in and publish**

```bash
cd cli
npm login
npm publish
```
Expected: package appears at `https://www.npmjs.com/package/moviegit` (or your chosen name) within a few minutes.

- [ ] **Step 7 (you): confirm the install path from the README actually works**

```bash
npm install -g moviegit
mg --help
```
Expected: prints the same help text as running `node cli/bin/mg.js --help` from the repo. This is the first time the README's `npm install -g moviegit` line has been true rather than aspirational.

---

## Self-Review

**Spec coverage** (against the five priorities from the prior session's gap analysis):
1. Verify real `mg commit` write → Task 5. ✓
2. Settings panel for multi-user → Task 2. ✓
3. `npm publish` the CLI → Task 6. ✓
4. `.gitignore` `graphify-out/`/`.claude/`, tidy repo root → Task 1. ✓
5. CI smoke test → Task 4 (plus Task 3, which the CI task depends on). ✓

**Placeholder scan:** no "TBD"/"handle appropriately"/"similar to Task N" language — every step has literal commands or literal code. Task 5 and Task 6's final steps are explicitly marked manual-only because they require credentials this agent cannot and should not hold; that's a disclosed constraint, not a placeholder.

**Type/naming consistency:** `mg_user_settings` (Task 2) is deliberately distinct from `mg_settings` mentioned in the CLI's `~/.config/moviegit/` docs and from the dashboard's other `mg_*` localStorage keys (`mg_history`, `mg_tmdb_cache`, etc.) documented in `CLAUDE.md` — checked against that file to avoid a collision. `CFG.hasCustomUsername()` and `CFG.saveUserSettings()` are the only two new public `CFG` methods and are used consistently in both the `init()`-adjacent wiring (Step 6) and nowhere else, so no cross-task signature drift.

**Ordering rationale:** Task 3 (extract syntax script) sits before Task 4 (CI) because CI calls it directly. Task 1 (gitignore) is first and standalone. Tasks 2, 5, and 6 have no dependencies on each other and can run in any order or in parallel.
