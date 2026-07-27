#!/usr/bin/env python3
"""Inline cli/src/domain.js into index.html's MG_DOMAIN block.

index.html ships as one self-contained file with no build step and no
bundler — it can't `import` cli/src/domain.js the way cli/ does. So
this script is the dev-time mechanism that keeps index.html's copy of the
shared Letterboxd domain logic (parsing, rating math, film lookup, TMDB
field extraction, mg-command formulas) byte-identical to the canonical
module cli/ actually imports, without adding a runtime build step to the
shipped artifact.

Run after every change to cli/src/domain.js:
    python3 scripts/sync-domain.py

scripts/check-domain-sync.py verifies (in CI) that this was actually run.
"""
import re
import sys
from pathlib import Path

BEGIN = "/* DOMAIN:BEGIN */"
END = "/* DOMAIN:END */"


def strip_module_syntax(js: str) -> str:
    """cli/src/domain.js uses `export function`/`export const` (ESM) —
    index.html's <script> is a classic script, not a module. Strip the
    `export ` keyword only; every function/const stays otherwise verbatim,
    so behavior is guaranteed identical to what cli/ imports."""
    js = re.sub(r"^export function ", "function ", js, flags=re.MULTILINE)
    js = re.sub(r"^export const ", "const ", js, flags=re.MULTILINE)
    return js


def sync(domain_path: str, html_path: str) -> int:
    domain_src = Path(domain_path).read_text(encoding="utf-8")
    # Drop the module's own file-header docblock (index.html has its own
    # explanatory comment at the MG_DOMAIN block) — keep everything from the
    # first `// ──` section marker onward.
    marker = "// ── HTML entity decoding"
    idx = domain_src.find(marker)
    if idx == -1:
        print(f"ERROR: expected marker '{marker}' not found in {domain_path}")
        return 1
    body = strip_module_syntax(domain_src[idx:]).rstrip()

    html = Path(html_path).read_text(encoding="utf-8")
    begin_idx = html.find(BEGIN)
    end_idx = html.find(END)
    if begin_idx == -1 or end_idx == -1 or end_idx < begin_idx:
        print(f"ERROR: {BEGIN} / {END} markers not found (or out of order) in {html_path}")
        return 1

    new_html = (
        html[: begin_idx + len(BEGIN)]
        + "\n" + body + "\n"
        + html[end_idx:]
    )
    Path(html_path).write_text(new_html, encoding="utf-8")
    line_count = body.count("\n") + 1
    print(f"OK: synced {line_count} lines from {domain_path} into {html_path}")
    return 0


if __name__ == "__main__":
    domain = sys.argv[1] if len(sys.argv) > 1 else "cli/src/domain.js"
    html = sys.argv[2] if len(sys.argv) > 2 else "index.html"
    sys.exit(sync(domain, html))
