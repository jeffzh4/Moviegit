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
