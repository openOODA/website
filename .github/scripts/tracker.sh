#!/usr/bin/env bash
#
# tracker.sh — regenerate the openOODA repository completion tracker.
#
# Reads the live state of every repository in the four canonical organizations
# and rewrites two things inside docs/index.html:
#
#   1. the tracker block between <!-- TRACKER:BEGIN --> and <!-- TRACKER:END -->
#   2. every <span data-ver="org/repo"> version claim, so a version printed on
#      the page always matches the repository's latest release tag
#
# The page ships as a static webroot with no build step and no remote
# subresources, so the tracker is rendered into the HTML at generation time and
# the browser only ever reads local files.
#
# Auth: GH_TOKEN (preferred) or GITHUB_TOKEN. Needs read access to the public
# repositories of the four organizations.
#
# Usage: .github/scripts/tracker.sh [--check]
#   --check  report what would change and exit non-zero if the page is stale
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

python3 - "$ROOT" "${1:-}" <<'PYEOF'
import datetime, json, os, re, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

ROOT = sys.argv[1]
MODE = sys.argv[2]
TOKEN = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""
if not TOKEN:
    sys.exit("tracker: GH_TOKEN or GITHUB_TOKEN is required")

ORGS = ["openOODA", "openOODA-core", "openOODA-system", "openOODA-apps"]
ORG_SHORT = {"openOODA": "ROOT", "openOODA-core": "CORE",
             "openOODA-system": "SYSTEM", "openOODA-apps": "APPS"}
API = "https://api.github.com/graphql"
REST = "https://api.github.com"
PAGE = os.path.join(ROOT, "docs", "index.html")
NOW = datetime.datetime.now(datetime.timezone.utc).timestamp()

# --------------------------------------------------------------------------
# GitHub access
# --------------------------------------------------------------------------

def gql(query, variables):
    body = json.dumps({"query": query, "variables": variables})
    req = urllib.request.Request(
        API, data=body.encode(),
        headers={"Authorization": "bearer " + TOKEN,
                 "Content-Type": "application/json",
                 "User-Agent": "openooda-tracker"})
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read())
    if "errors" in d:
        raise SystemExit("tracker: graphql error: " + str(d["errors"][:2]))
    return d["data"]


def rest(path):
    req = urllib.request.Request(
        REST + path,
        headers={"Authorization": "bearer " + TOKEN,
                 "Accept": "application/vnd.github+json",
                 "User-Agent": "openooda-tracker"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except (urllib.error.HTTPError, urllib.error.URLError):
        return None


ORGS_QUERY = """
query($org:String!,$cursor:String){
  organization(login:$org){
    repositories(first:100,after:$cursor,orderBy:{field:NAME,direction:ASC}){
      pageInfo{hasNextPage endCursor}
      nodes{
        name
        description
        pushedAt
        isArchived
        primaryLanguage{name}
        issues(states:OPEN){totalCount}
        pullRequests(states:OPEN){totalCount}
      }
    }
  }
}
"""

REFS_QUERY = """
query($owner:String!,$name:String!,$cursor:String){
  repository(owner:$owner,name:$name){
    refs(refPrefix:"refs/tags/",first:100,after:$cursor){
      pageInfo{hasNextPage endCursor}
      nodes{
        name
        target{
          ... on Commit{
            committedDate
          }
          ... on Tag{
            tagger{
              date
            }
            target{
              ... on Commit{
                committedDate
              }
            }
          }
        }
      }
    }
  }
}
"""


def all_tags(org, name):
    tags, cursor = [], None
    while True:
        d = gql(REFS_QUERY, {"owner": org, "name": name, "cursor": cursor})
        conn = d["repository"]["refs"]
        tags.extend(conn["nodes"])
        if not conn["pageInfo"]["hasNextPage"]:
            return tags
        cursor = conn["pageInfo"]["endCursor"]
        if not cursor:
            return tags


def collect_repos():
    repos = []
    for org in ORGS:
        cursor = None
        while True:
            d = gql(ORGS_QUERY, {"org": org, "cursor": cursor})
            conn = d["organization"]["repositories"]
            for r in conn["nodes"]:
                r["org"] = org
                repos.append(r)
            if not conn["pageInfo"]["hasNextPage"]:
                break
            cursor = conn["pageInfo"]["endCursor"]
            if not cursor:
                break
    return repos


def side_data(repo):
    """Latest CI verdict for a repository, from its Actions history."""
    org, name = repo["org"], repo["name"]
    runs = rest("/repos/%s/%s/actions/runs?per_page=30" % (org, name))
    all_runs = (runs or {}).get("workflow_runs") or []
    ci_runs = [x for x in all_runs if "ci" in (x.get("name") or "").lower()]
    pick = ci_runs or all_runs
    if not pick:
        return {"ci": None}
    x = pick[0]
    return {"ci": {"conclusion": x.get("conclusion") or x.get("status"),
                   "workflow": (x.get("name") or "")[:28],
                   "date": (x.get("created_at") or "")[:10]}}


# --------------------------------------------------------------------------
# Completion model — fail-closed, in the project's own vocabulary.
#
#   VERSIONED  the repository carries a semver release tag
#   CITED      a CI gate has run against it
#   GREEN      that gate concluded successfully
#   SHIPPING   the latest release is within 30 days
#   CLEAN      no open issues and no open pull requests
#
# The tier is decided by the first gate that fails, so a repository can never
# be credited for passing a later gate while an earlier one is red.
# --------------------------------------------------------------------------

GATES = ["versioned", "cited", "green", "shipping", "clean"]
TIERS = [
    ("skeleton", "SKELETON", "no release tag"),
    ("uncited", "NO CI GATE", "no CI gate has run"),
    ("red", "CI RED", "gated, and the gate is red"),
    ("stale", "STALE", "released, but not shipped in 30 days"),
    ("blocked", "BLOCKED", "shipped, but carries open work"),
    ("complete", "COMPLETE", "every gate passes"),
]
GATE_TIER = {"versioned": "skeleton", "cited": "uncited", "green": "red",
             "shipping": "stale", "clean": "blocked"}
TIER_LABEL = {key: label for key, label, _n in TIERS}
TILES = [("complete", "COMPLETE"), ("red", "CI RED"), ("uncited", "NO CI GATE")]


def semver(tag):
    m = re.match(r"^v?(\d+)\.(\d+)\.(\d+)$", tag)
    return tuple(int(x) for x in m.groups()) if m else None


def parse_stamp(raw):
    """Parses an ISO-8601 stamp, honouring its UTC offset.

    The GraphQL API renders some timestamps with a local offset and others in
    UTC, so the offset has to be read rather than assumed.
    """
    if not raw:
        return None
    return datetime.datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp()


def tag_date(tag):
    target = tag["target"]
    raw = target.get("committedDate") or (target.get("tagger") or {}).get("date")
    return parse_stamp(raw)


def days_since(stamp):
    return (NOW - stamp) / 86400.0


def build_rows(repos):
    rows = []
    for r in repos:
        tags = r["tags"]
        sem = [(t["name"], tag_date(t)) for t in tags if semver(t["name"])]
        # The current release is the most recently tagged semver, not the
        # numerically largest one: a project that re-baselines its version
        # series would otherwise report a release it has already retired.
        sem.sort(key=lambda x: (x[1] or 0, semver(x[0])), reverse=True)
        version = sem[0][0] if sem else None
        released = sem[0][1] if sem else None
        ci = r.get("ci")
        verdict = ci["conclusion"] if ci else "none"
        gates = {
            "versioned": bool(version),
            "cited": verdict != "none",
            "green": verdict == "success",
            "shipping": released is not None and days_since(released) <= 30,
            "clean": r["issues"]["totalCount"] == 0 and r["pullRequests"]["totalCount"] == 0,
        }
        tier = "complete"
        for gate in GATES:
            if not gates[gate]:
                tier = GATE_TIER[gate]
                break
        rows.append({
            "org": r["org"], "name": r["name"], "version": version,
            "gates": gates, "tier": tier, "score": sum(1 for g in GATES if gates[g]),
            "ci": verdict, "ciwf": ci["workflow"] if ci else "",
            "cidate": ci["date"] if ci else "",
            "releases": len(sem),
            "pushed": days_since(parse_stamp(r["pushedAt"])),
            "issues": r["issues"]["totalCount"], "prs": r["pullRequests"]["totalCount"],
            "desc": r["description"] or "", "lang": (r["primaryLanguage"] or {}).get("name", ""),
        })
    rows.sort(key=lambda x: (ORGS.index(x["org"]), x["name"]))
    return rows


def ago(days):
    d = int(days)
    if d <= 0:
        return "TODAY"
    if d == 1:
        return "1D AGO"
    if d < 30:
        return "%dD AGO" % d
    if d < 365:
        return "%dMO AGO" % (d // 30)
    return "%dY AGO" % (d // 365)


def esc(text):
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace('"', "&quot;"))


def render(rows):
    total = len(rows)
    counts = {}
    for r in rows:
        counts[r["tier"]] = counts.get(r["tier"], 0) + 1
    releases = sum(r["releases"] for r in rows)
    out = []
    out.append('          <p class="tracker-sub">%d REPOSITORIES • %d RELEASES SHIPPED • '
               'LIVE CENSUS OF ALL 4 ORGANIZATIONS</p>' % (total, releases))
    out.append('          <div class="tk-summary">')
    out.append('            <div class="tk-tile"><span class="tk-num">%d</span>'
               '<span class="tk-lbl">REPOSITORIES</span></div>' % total)
    for key, label in TILES:
        out.append('            <div class="tk-tile" data-tier="%s"><span class="tk-num">%d</span>'
                   '<span class="tk-lbl">%s</span></div>' % (key, counts.get(key, 0), label))
    out.append('            <div class="tk-tile"><span class="tk-num">%d</span>'
               '<span class="tk-lbl">RELEASES</span></div>' % releases)
    out.append('          </div>')
    out.append('          <div class="tk-controls">')
    out.append('            <button type="button" class="tk-chip is-on" data-org="all">ALL %d</button>' % total)
    for org in ORGS:
        n = sum(1 for r in rows if r["org"] == org)
        out.append('            <button type="button" class="tk-chip" data-org="%s">%s %d</button>'
                   % (org, ORG_SHORT[org], n))
    out.append('            <input type="search" id="tk-search" class="tk-search" '
               'placeholder="FILTER REPOSITORY…" aria-label="Filter repositories" />')
    out.append('            <span class="tk-count" id="tk-count">%d / %d</span>' % (total, total))
    out.append('          </div>')
    out.append('          <div class="tk-head" id="tk-head">'
               '<span data-sort="name">REPOSITORY</span>'
               '<span data-sort="version">VERSION</span>'
               '<span data-sort="tier">TIER</span>'
               '<span data-sort="ci">CI</span>'
               '<span data-sort="releases">REL</span>'
               '<span data-sort="pushed">PUSHED</span>'
               '<span data-sort="score">COMPLETION</span></div>')
    out.append('          <div class="tk-rows" id="tk-rows">')
    for r in rows:
        ci_label = {"success": "GREEN", "failure": "RED", "startup_failure": "RED",
                    "cancelled": "RED", "skipped": "SKIP"}.get(r["ci"], "NO CI")
        ci_kind = "success" if r["ci"] == "success" else ("none" if r["ci"] == "none" else "failure")
        pct = int(round(100.0 * r["score"] / len(GATES)))
        out.append(
            '            <a class="tk-row" data-org="%s" data-tier="%s" data-name="%s" '
            'data-search="%s" data-version="%s" data-ci="%s" data-releases="%d" '
            'data-pushed="%d" data-score="%d" '
            'href="https://github.com/%s/%s" target="_blank" rel="noopener noreferrer">'
            '<code class="tk-name"><span class="tk-org">%s</span>%s</code>'
            '<span class="tk-ver">%s</span>'
            '<span class="tk-tier" data-tier="%s">%s</span>'
            '<span class="tk-ci" data-ci="%s">%s</span>'
            '<span class="tk-rel">%d</span>'
            '<span class="tk-pushed">%s</span>'
            '<span class="tk-bar" title="%d of %d gates pass"><i style="width:%d%%"></i></span>'
            '</a>' % (
                r["org"], r["tier"], r["name"].lower(),
                ("%s/%s" % (r["org"], r["name"])).lower(),
                r["version"] or "", ci_kind, r["releases"], int(r["pushed"]), r["score"],
                r["org"], r["name"],
                ORG_SHORT[r["org"]], esc(r["name"]), esc(r["version"] or "UNRELEASED"),
                r["tier"], TIER_LABEL[r["tier"]],
                ci_kind, ci_label, r["releases"], ago(r["pushed"]),
                r["score"], len(GATES), pct))
    out.append('          </div>')
    out.append('          <p class="tk-legend">Completion is fail-closed: a repository is credited only when '
               'every earlier gate passes — <code>VERSIONED</code> (a semver release tag) → '
               '<code>CITED</code> (a CI gate has run) → <code>GREEN</code> (that gate concluded '
               'successfully) → <code>SHIPPING</code> (released within 30 days) → <code>CLEAN</code> '
               '(no open issues and no open pull requests). The first red gate decides the tier, so a '
               'repository is never credited for a later gate while an earlier one is red.</p>')
    return "\n".join(out)


# --------------------------------------------------------------------------
# Page rewrite
# --------------------------------------------------------------------------

# --------------------------------------------------------------------------
# Fail-closed census check
#
# The token used to regenerate the page must be able to read every canonical
# organization. A repository-scoped token can only see its own organization and
# would silently produce a census of a fraction of the stack — so a short
# census is refused rather than published.
# --------------------------------------------------------------------------

def census_incomplete(rows, html):
    """Returns the reason the census cannot be trusted, or None."""
    seen = {}
    for r in rows:
        seen[r["org"]] = seen.get(r["org"], 0) + 1
    empty = [org for org in ORGS if seen.get(org, 0) == 0]
    if empty:
        return ("no repositories read from " + ", ".join(empty) +
                " — the token cannot read every canonical organization")
    listed = len(re.findall(r'class="tk-row"', html))
    if listed and len(rows) < listed:
        return ("census shrank from %d to %d repositories" % (listed, len(rows)))
    return None


def rewrite(html, rows):
    versions = {("%s/%s" % (r["org"], r["name"])): r["version"] for r in rows}
    missing = []

    def ver_sub(match):
        head, key, body, tail = match.group(1), match.group(2), match.group(3), match.group(4)
        got = versions.get(key)
        if not got:
            missing.append(key)
            return match.group(0)
        return head + got + tail

    html = re.sub(r'(<span data-ver="([^"]+)"[^>]*>)([^<]*)(</span>)', ver_sub, html)
    block = render(rows)
    pattern = re.compile(r"(<!-- TRACKER:BEGIN -->).*?(<!-- TRACKER:END -->)", re.S)
    if not pattern.search(html):
        raise SystemExit("tracker: markers not found in docs/index.html")
    html = pattern.sub(lambda m: m.group(1) + "\n" + block + "\n          " + m.group(2), html)
    if missing:
        print("tracker: warning: unknown data-ver targets: " + ", ".join(sorted(set(missing))))
    return html


def main():
    repos = collect_repos()
    with ThreadPoolExecutor(max_workers=8) as ex:
        sides = list(ex.map(side_data, repos))
    for r, s in zip(repos, sides):
        r.update(s)
    with ThreadPoolExecutor(max_workers=8) as ex:
        tags = list(ex.map(lambda r: all_tags(r["org"], r["name"]), repos))
    for r, t in zip(repos, tags):
        r["tags"] = t
    rows = build_rows(repos)
    print("tracker: %d repositories" % len(rows))
    counts = {}
    for r in rows:
        counts[r["tier"]] = counts.get(r["tier"], 0) + 1
    for key, label, _n in TIERS:
        print("tracker:   %-10s %-10s %d" % (key, label, counts.get(key, 0)))
    old = open(PAGE, encoding="utf-8").read()
    reason = census_incomplete(rows, old)
    if reason:
        raise SystemExit("tracker: refusing to publish an incomplete census: " + reason)
    new = rewrite(old, rows)
    if new == old:
        print("tracker: page already current")
        return
    if MODE == "--check":
        print("tracker: page is STALE")
        sys.exit(1)
    open(PAGE, "w", encoding="utf-8").write(new)
    print("tracker: docs/index.html updated")


main()
PYEOF
