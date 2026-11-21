#!/usr/bin/env bash
#
# assets.sh — stamps a content hash onto every asset reference in docs/index.html.
#
# GitHub Pages serves the page itself with a ten-minute cache and its assets
# with a four-hour cache, and the edge keeps both. A deploy therefore publishes
# new HTML that can still be paired with the previous release's CSS and
# JavaScript — which is how a layout fix can sit on the server and never reach
# a browser. Stamping ?v=<hash> on the references makes the asset URL change
# whenever the asset changes, so the edge has to fetch the new bytes.
#
# The hash covers every stylesheet and script together, so one stamp moves the
# whole set: the page never mixes a new stylesheet with an old script.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

MODE="${1:-}"
export MODE

python3 - <<'PYEOF'
import hashlib, os, re, sys

ROOT = os.environ.get("PWD", ".")
PAGE = os.path.join(ROOT, "docs", "index.html")

assets = []
for sub in ("styles", "js"):
    d = os.path.join(ROOT, "docs", sub)
    for name in sorted(os.listdir(d)):
        if name.endswith(".css") or name.endswith(".js"):
            assets.append("/%s/%s" % (sub, name))

digest = hashlib.sha256()
for rel in assets:
    with open(os.path.join(ROOT, "docs", rel.lstrip("/")), "rb") as fh:
        digest.update(rel.encode())
        digest.update(fh.read())
stamp = digest.hexdigest()[:12]

html = open(PAGE, encoding="utf-8").read()

# Drop any previous stamp first, so the script is idempotent.
html = re.sub(r'((?:href|src)="/(?:styles|js)/[^"?]+)\?v=[0-9a-f]*"', r'\1"', html)

def stamp_ref(match):
    return match.group(1) + '?v=' + stamp + '"'

html = re.sub(r'((?:href|src)="/(?:styles|js)/[^"?]+)"', stamp_ref, html)
open(PAGE, "w", encoding="utf-8").write(html)

if os.environ.get("MODE") == "--check":
    expected = '?v=' + stamp
    stale = [r for r in re.findall(r'(?:href|src)="/(?:styles|js)/[^"]+"', html)
             if expected not in r]
    if stale:
        sys.stderr.write("assets: stale asset references:\n  " + "\n  ".join(stale) +
                         "\nassets: run .github/scripts/assets.sh\n")
        raise SystemExit(1)
    print("assets: %d references stamped with ?v=%s" % (len(assets), stamp))
else:
    open(PAGE, "w", encoding="utf-8").write(html)
    print("assets: stamped %d assets with ?v=%s" % (len(assets), stamp))
PYEOF
