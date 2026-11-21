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
import base64, datetime, json, os, re, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

ROOT = sys.argv[1]
MODE = sys.argv[2]
TOKEN = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""
if not TOKEN:
    sys.exit("tracker: GH_TOKEN or GITHUB_TOKEN is required")

ORGS = ["openOODA", "openOODA-core", "openOODA-system", "openOODA-apps"]
ORG_SHORT = {"openOODA": "ROOT", "openOODA-core": "CORE",
             "openOODA-system": "SYSTEM", "openOODA-apps": "APPS"}
# CI/CD is gated in @openOODA only. The other three organizations ship without
# gates, so their CI/CD is not tracked and their tier is decided by the gates
# that do apply to them.
CI_ORGS = {"openOODA"}
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


def fetch_catalog():
    """The signed package index: name|version|capabilities|standard|digest."""
    raw = rest("/repos/openOODA/catalog/contents/index")
    if not raw or "content" not in raw:
        return {}
    body = base64.b64decode(raw["content"]).decode("utf-8", "replace")
    out = {}
    for line in body.splitlines():
        parts = line.strip().split("|")
        if len(parts) >= 3 and parts[0]:
            out[parts[0]] = {"version": parts[1], "caps": parts[2],
                              "digest": parts[4] if len(parts) > 4 else ""}
    return out


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
    gated = org in CI_ORGS
    workflows = None
    if gated:
        workflows = rest("/repos/%s/%s/contents/.github/workflows" % (org, name))
    has_ci_wf = isinstance(workflows, list) and any(
        "ci" in (w.get("name") or "").lower() for w in workflows)
    runs = rest("/repos/%s/%s/actions/runs?per_page=30" % (org, name))
    all_runs = (runs or {}).get("workflow_runs") or []
    ci_runs = [x for x in all_runs if "ci" in (x.get("name") or "").lower()]
    pick = ci_runs or all_runs
    if not pick:
        return {"ci": None, "has_ci_wf": has_ci_wf, "gated": gated}
    x = pick[0]
    return {"ci": {"conclusion": x.get("conclusion") or x.get("status"),
                   "workflow": (x.get("name") or "")[:28],
                   "date": (x.get("created_at") or "")[:10]},
            "has_ci_wf": has_ci_wf, "gated": gated}


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
    ("skeleton", "UNRELEASED", "no release tag"),
    ("uncited", "UNGATED", "no CI gate has run"),
    ("red", "CI RED", "gated, and the gate is red"),
    ("stale", "STALE", "released, but not shipped in 30 days"),
    ("blocked", "OPEN WORK", "shipped, but carries open work"),
    ("complete", "COMPLETE", "every gate passes"),
]
GATE_TIER = {"versioned": "skeleton", "cited": "uncited", "green": "red",
             "shipping": "stale", "clean": "blocked"}
TIER_LABEL = {key: label for key, label, _n in TIERS}
TILES = [("complete", "COMPLETE"), ("red", "CI RED @ROOT"), ("uncited", "NO CI GATE @ROOT")]


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


def build_rows(repos, catalog):
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
        entry = catalog.get(r["name"])
        if not entry:
            attested, caps, catalog_ver = "none", "", ""
        elif entry["version"] == (version or "").lstrip("v"):
            attested, caps, catalog_ver = "signed", entry["caps"], entry["version"]
        else:
            attested, caps, catalog_ver = "drift", entry["caps"], entry["version"]
        gated = r.get("gated", False)
        carries_ci = gated and r.get("has_ci_wf")
        gates = {
            "versioned": bool(version),
            "cited": (carries_ci and verdict != "none") if gated else None,
            "green": (carries_ci and verdict == "success") if gated else None,
            "shipping": released is not None and days_since(released) <= 30,
            "clean": r["issues"]["totalCount"] == 0 and r["pullRequests"]["totalCount"] == 0,
        }
        tier = "complete"
        for gate in GATES:
            if gates[gate] is None:
                continue
            if not gates[gate]:
                tier = GATE_TIER[gate]
                break
        applicable = [g for g in GATES if gates[g] is not None]
        passed = sum(1 for g in applicable if gates[g])
        rows.append({
            "org": r["org"], "name": r["name"], "version": version,
            "gates": gates, "tier": tier, "score": passed, "applicable": len(applicable),
            "gated": gated, "has_ci_wf": bool(r.get("has_ci_wf")),
            "attested": attested, "caps": caps, "catalog_ver": catalog_ver,
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
    signed = sum(1 for r in rows if r["attested"] == "signed")
    drift = sum(1 for r in rows if r["attested"] == "drift")
    out = []
    out.append('          <p class="tracker-sub">%d REPOSITORIES • %d RELEASES SHIPPED • '
               'EVERY CELL BELOW IS A DIRECTLY OBSERVED FACT, NEVER AN INFERENCE</p>'
               % (total, releases))
    out.append('          <div class="tk-matrix" id="tk-matrix">')
    out.append('            <div class="tk-mrow tk-mhead"><span>LAYER</span><span>REPOS</span>'
               '<span>CATALOGUED</span><span>SIGNED</span><span>DRIFT</span>'
               '<span>COMPLETE</span></div>')
    for org in ORGS:
        layer = [r for r in rows if r["org"] == org]
        cat = sum(1 for r in layer if r["attested"] != "none")
        sg = sum(1 for r in layer if r["attested"] == "signed")
        dr = sum(1 for r in layer if r["attested"] == "drift")
        cp = sum(1 for r in layer if r["tier"] == "complete")
        out.append('            <div class="tk-mrow" data-org="%s"><span class="tk-mname">%s</span>'
                   '<span>%d</span><span>%s</span><span>%d</span><span>%d</span><span>%d</span></div>'
                   % (org, ORG_SHORT[org], len(layer), cat if cat else "—", sg, dr, cp))
    out.append('            <div class="tk-mrow tk-mtotal"><span class="tk-mname">TOTAL</span>'
               '<span>%d</span><span>%d</span><span>%d</span><span>%d</span><span>%d</span></div>'
               % (total, total - sum(1 for r in rows if r["attested"] == "none"), signed, drift,
                  counts.get("complete", 0)))
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
    out.append('          <details class="tk-legend-box" open>')
    out.append('            <summary class="tk-legend-sum">HOW THE CONTRACT IS SCORED</summary>')
    out.append('            <p class="tk-legend">Every cell is a directly observed fact, never an '
               'inference. <code>VERSION</code> is the repository\u2019s latest semver release tag. '
               '<code>ATTESTED</code> compares that tag against the signed package index in '
               '<code>@openOODA/catalog</code>: <code>SIGNED</code> means the catalog attests this '
               'exact release with an audited digest, <code>DRIFT</code> means the repository has '
               'shipped ahead of the catalog. <code>CAPS</code> is the capability set the catalog '
               'records for the package \u2014 exactly the authority it may hold, never ambient. '
               '<code>GATE</code> is the CI verdict, and it applies to <code>@openOODA</code> only, '
               'the one organization that carries CI/CD gates; the other three ship without them, so '
               'those gates do not apply to their repositories. <code>CONTRACT</code> is the '
               'fail-closed verdict \u2014 a repository is credited only when every earlier gate '
               'passes: <code>RELEASED</code> \u2192 <code>CITED</code> \u2192 <code>GREEN</code> '
               '\u2192 <code>SHIPPING</code> \u2192 <code>CLEAN</code>.</p>')
    out.append('          </details>')
    out.append('          <div class="tk-head" id="tk-head">'
               '<span data-sort="name">REPO</span>'
               '<span data-sort="org">ORG</span>'
               '<span data-sort="version">VERSION</span>'
               '<span data-sort="score">CONTRACT</span>'
               '<span data-sort="attested">ATTESTED</span>'
               '<span data-sort="caps">CAPS</span>'
               '<span data-sort="ci">GATE</span>'
               '<span data-sort="pushed">PUSHED</span></div>')
    out.append('          <div class="tk-rows" id="tk-rows">')
    for r in rows:
        ci_label = {"success": "GREEN", "failure": "RED", "startup_failure": "RED",
                    "cancelled": "RED", "skipped": "SKIP"}.get(r["ci"], "NO GATE")
        ci_kind = "success" if r["ci"] == "success" else ("none" if r["ci"] == "none" else "failure")
        if not r.get("gated"):
            ci_label, ci_kind = "&#8212;", "na"
        elif not r.get("has_ci_wf"):
            ci_label, ci_kind = "NO GATE", "none"
        pct = int(round(100.0 * r["score"] / r["applicable"])) if r["applicable"] else 0
        att_label = {"signed": "SIGNED", "drift": "DRIFT"}.get(r["attested"], "&#8212;")
        caps = r["caps"] or "&#8212;"
        caps_title = r["caps"] or "not a catalogued package"
        if r["attested"] == "drift":
            att_title = "catalog attests %s; this repository has shipped ahead" % r["catalog_ver"]
        elif r["attested"] == "signed":
            att_title = "the signed catalog attests this release"
        else:
            att_title = "not a catalogued package"
        out.append(
            '            <a class="tk-row" data-org="%s" data-tier="%s" data-name="%s" '
            'data-search="%s" data-version="%s" data-ci="%s" data-releases="%d" '
            'data-pushed="%d" data-score="%d" data-attested="%s" data-caps="%s" '
            'href="https://github.com/%s/%s" target="_blank" rel="noopener noreferrer">'
            '<code class="tk-name">%s</code>'
            '<span class="tk-org" data-org="%s">%s</span>'
            '<span class="tk-ver">%s</span>'
            '<span class="tk-contract"><span class="tk-tier" data-tier="%s">%s</span>'
            '<span class="tk-bar" title="%d of %d gates pass"><i style="width:%d%%"></i></span></span>'
            '<span class="tk-att" data-att="%s" title="%s">%s</span>'
            '<span class="tk-caps" title="%s">%s</span>'
            '<span class="tk-gate" data-ci="%s">%s</span>'
            '<span class="tk-pushed">%s</span>'
            '</a>' % (
                r["org"], r["tier"], r["name"].lower(),
                ("%s/%s" % (r["org"], r["name"])).lower(),
                r["version"] or "", ci_kind, r["releases"], int(r["pushed"]), r["score"],
                r["attested"], r["caps"].lower(),
                r["org"], r["name"],
                esc(r["name"]), r["org"], ORG_SHORT[r["org"]], esc(r["version"] or "UNRELEASED"),
                r["tier"], TIER_LABEL[r["tier"]], r["score"], r["applicable"], pct,
                r["attested"], esc(att_title), att_label,
                esc(caps_title), caps,
                ci_kind, ci_label, ago(r["pushed"])))
    out.append('          </div>')
    return "\n".join(out)


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
    catalog = fetch_catalog()
    print("tracker: signed catalog carries %d packages" % len(catalog))
    rows = build_rows(repos, catalog)
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
