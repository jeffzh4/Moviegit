#!/usr/bin/env python3
"""Fail if index.html's embedded MG_DOMAIN block has drifted from
cli/src/domain.js — i.e. someone edited cli/src/domain.js (or the
embedded block) without re-running scripts/sync-domain.py.

This is the guard the architecture review asked for: a shared domain module
between the browser dashboard and the CLI only has leverage if the two
copies can't silently diverge again the way cherry-pick's match tiers once
did. Run in CI alongside check-syntax.py.
"""
import sys
from pathlib import Path


def expected_block(domain_path: str) -> str:
    # Reuse sync-domain.py's own extraction/stripping logic so this check
    # can never drift from what syncing actually produces.
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "sync_domain_module", Path(__file__).parent / "sync-domain.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    domain_src = Path(domain_path).read_text(encoding="utf-8")
    marker = "// ── HTML entity decoding"
    idx = domain_src.find(marker)
    if idx == -1:
        print(f"ERROR: expected marker '{marker}' not found in {domain_path}")
        sys.exit(1)
    return mod.strip_module_syntax(domain_src[idx:]).rstrip()


def check(domain_path: str, html_path: str) -> int:
    expected = expected_block(domain_path)
    html = Path(html_path).read_text(encoding="utf-8")

    begin, end = "/* DOMAIN:BEGIN */", "/* DOMAIN:END */"
    b, e = html.find(begin), html.find(end)
    if b == -1 or e == -1 or e < b:
        print(f"FAIL: {begin} / {end} markers not found (or out of order) in {html_path}")
        return 1

    actual = html[b + len(begin):e].strip("\n")
    if actual != expected:
        print(f"FAIL: {html_path}'s MG_DOMAIN block does not match {domain_path}.")
        print(f"      Run: python3 scripts/sync-domain.py")
        return 1

    print(f"OK: {html_path}'s MG_DOMAIN block matches {domain_path}")
    return 0


if __name__ == "__main__":
    domain = sys.argv[1] if len(sys.argv) > 1 else "cli/src/domain.js"
    html = sys.argv[2] if len(sys.argv) > 2 else "index.html"
    sys.exit(check(domain, html))
