# Case Study: The RSS Sync Bug That Took Four Attempts to Actually Fix

**Timeframe:** 2026-06-01 to 2026-07-21 (seven weeks, four commits, one root cause)
**Status:** Resolved in `a62f63c`

Most of this repo's documentation talks about what shipped. This document is about what didn't work, three times, before the actual fix landed — because the debugging process is more informative than the fix, and because a PRD that only shows finished work hides the part of the job that's actually hard: figuring out what question you're even asking.

---

## The symptom

> "I made some new logs in my Letterboxd but they're not being reflected on MovieGit. I thought it was supposed to be live polling."

That's the whole bug report. One sentence, no stack trace, no repro steps beyond "I did a thing on Letterboxd and the dashboard didn't pick it up." The dashboard's own sync indicator said "synced Xm ago" the whole time — it wasn't failing loudly, it was succeeding at syncing nothing.

## Attempt 1 (2026-06-01, `dc17ff6`): "it's a caching problem"

**Hypothesis:** the CORS proxy (`allorigins.win`) was serving a stale cached copy of the RSS feed, so new entries genuinely weren't reaching the parser.

**What shipped:** a cache-busting query parameter on every request, plus a fix for a real, separate bug found along the way — the diary-entry slug parser was reading the numeric index at the end of a Letterboxd diary URL (`/film/inception/1/`) instead of the film slug (`inception`), because it wasn't checking whether the last path segment was purely numeric before using it.

**Result:** the slug fix was correct and stayed in the codebase. The sync bug was still there. Cache-busting had no effect, because the feed being fetched was returning the same *complete* content every time — there was nothing stale about it.

## Attempt 2 (2026-06-02 morning, `a6c4e26`): "it's an XML-parsing problem"

**Hypothesis:** the feed has namespaced XML tags (`<letterboxd:watchedDate>`), and `querySelector` silently fails to match namespaced elements in most browsers — so `watchedDate` was coming back empty, and a downstream filter (`entries.filter(e => e.watchedDate)`) was dropping every entry as a result.

**What shipped:** switched from `querySelector` to `getElementsByTagName`, which does handle XML namespaces correctly; added a second CORS proxy (`corsproxy.io`) as a fallback; added a force-sync button so the fix could be tested without waiting for the poll interval.

**Result:** a real bug, correctly diagnosed and correctly fixed — `getElementsByTagName` was the right call. Still no new films showed up. The proxies were the next thing to check, because at this point the dashboard had gone through two "correct fix, no observable change" cycles, which is the signal that the working hypothesis is wrong at a level above where the fixes were being applied.

## Attempt 3 (2026-06-02 afternoon, `8e7242d`): "the proxies are actually dead"

**This is where the hypothesis space got exhausted the wrong way.** Both CORS proxies were tested directly: `allorigins.win` was returning HTTP 522 (origin unreachable), and `corsproxy.io` was returning HTTP 403 (Letterboxd actively rejecting the proxy's requests). Neither proxy could reach Letterboxd at all — a real, verifiable infrastructure failure, not a guess.

**What shipped:** a full rewrite of the sync module to route through `rss2json.com` instead of a raw CORS proxy, with a regex-based raw-XML parser as a fallback path.

**Result:** `rss2json.com` could reach Letterboxd. The sync started returning data again. And the bug was *still* there — because the fix, correct as far as it went, had solved a real problem (dead proxies) that happened to be sitting directly on top of the actual one.

## The actual root cause (2026-06-13 and 2026-07-21, `d9113b1` and `a62f63c`)

Fetching the raw RSS feed directly — no proxy, no parser, just the bytes Letterboxd was serving — and reading its contents by hand finally surfaced it: **the feed contained five items. All five were user-created lists. Zero were film watches.**

Letterboxd's RSS feed only publishes *diary* entries — films logged with an explicit watched-date through Letterboxd's diary flow. The account this bug was filed against logs films a different way: rate the film, mark it watched, no diary entry. That workflow **never produces an RSS item**, on any account that uses it, regardless of proxy health, XML parsing correctness, or cache freshness. The feed wasn't broken. It was accurately, permanently empty of the data the dashboard was trying to sync — for a structural reason, not a bug.

`d9113b1` (2026-06-13) got partway there — it correctly identified that the feed's `guid` field wasn't a reliable diary-vs-list discriminator and switched to filtering by `/film/` links instead — but was still operating on the premise that *some* film-watch items existed in the feed to filter for. `a62f63c` (2026-07-21), five weeks later, is the commit that actually named the real problem and replaced the data source rather than patching the parser again: Letterboxd's profile films grid (`letterboxd.com/{user}/films/`) lists every watched film with its star rating regardless of diary status, and updates the instant a film is rated. The dashboard now scrapes that page instead of the RSS feed. Root cause fixed, not routed around.

## What the first three attempts got right

Worth stating plainly, because a case study that only lists mistakes would be its own kind of dishonest: every fix along the way was a real, verified bug, independently confirmed rather than guessed at.

- The diary-slug parsing bug (attempt 1) was real and would have caused wrong-film sync errors even after the RSS issue was fixed.
- The namespace-parsing bug (attempt 2) was real, `getElementsByTagName` genuinely was the correct fix for it, and it's still the parsing approach used today wherever the codebase still touches XML.
- The dead-proxy diagnosis (attempt 3) was verified with direct HTTP requests (522 and 403 responses, checked directly, not inferred) before any code was written — it wasn't a guess that got lucky, it was confirmed infrastructure failure that happened to not be the user-visible bug.

## What would have found the root cause on attempt 1

In hindsight, the fastest path to the actual answer was always available and wasn't taken until the fourth pass: **fetch the raw feed and read it, before writing or changing any code.** Each of the first three attempts started from a plausible mechanism (caching, XML parsing, proxy health) and wrote a fix for that mechanism before confirming the feed's actual contents. The fourth attempt started by asking "what is actually in this feed right now" as a literal, un-skippable first step — and the answer (five items, zero film watches) made every previous hypothesis irrelevant in about thirty seconds.

The lesson that generalizes past this one bug: when a fix is verifiably correct and the symptom doesn't move, that's not evidence to look harder at the same layer — it's evidence the layer itself was never the problem. Three consecutive "correct fix, unchanged symptom" results should have been the trigger to go inspect the raw input on attempt two, not attempt four.

## Where this shows up elsewhere in the repo

The architectural consequence of this bug — why sync now scrapes a different page entirely, what tradeoffs that source brings (no per-film date, a proxy-chain dependency for the browser dashboard specifically) — is documented in full in [ARCHITECTURE.md §4](ARCHITECTURE.md#4-the-rss-dead-end-and-what-replaced-it). The user-facing limitations that fix's data source still carries are disclosed in [KNOWN_ISSUES.md](KNOWN_ISSUES.md#data-accuracy). This document is the narrative in between: not what the system looks like now, and not what's still imperfect about it, but the actual sequence of wrong turns that got from one to the other.
