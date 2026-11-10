# website (openOODA) — Public Documentation & Static Site Generator

Public source for [https://openooda.org](https://openooda.org) (`@openOODA`), served via
GitHub Pages from `docs/` (the sealed webroot). The repository is a pure `.oo`
conformance surface over the static site: every build/test proves the shipped tree is
self-contained, reference-complete, and telemetry-free.

## Zero-Telemetry Invariant (privacy.md Law 1)

`cards/privacy.md` Law 1 seals `RIGHT_ZERO_TELEMETRY` (Rights bit 128) on every
capability register — the public site honors the same law in the webroot:

1. **Zero third-party beacon hosts** in any shipped `.html`/`.js`/`.css`/`.svg` page:
   `cloudflareinsights.com`, `google-analytics`, `googletagmanager.com`, `mixpanel.com`,
   `sentry.io`, `telemetry_upload` are refused (detector needles stay split, matching
   `oohat` Black Hat `telemetry_beacons`).
2. **Zero remote subresource loads**: `src=` (double- and single-quoted), `<link href=>`,
   and `url()` fetches must resolve locally under `docs/` — `<a href="https://…">` stays
   user-initiated navigation, never a fetch.
3. **Fail-closed enforcement**: `core/site_check.oo` (`site_beacon_hits`,
   `site_remote_refs`, `site_telemetry_free`, `site_tree_free`, `site_repo_ok`),
   `tests/test_refusal.oo` (8 telemetry refusal fixtures), `make site-gate`, both CI
   gates, and `oohat black` (`telemetry_beacons=0` required for `quorum_mask=255`).

## Architecture (8-entry root)

```
AGENTS.md   this card
README.md   project overview + system requirements matrix
Makefile    build / test / verify / site-gate / clean (bin/website, .ooda-cache/)
anchor.oo   root facade — re-exports the conformance checker
cli/
  main.oo   `website check|about` verbs; FsRead-only, exit-2 refusals, ootheme frame
core/
  site_check.oo   refs/anchors/integrity/zero-telemetry fold over docs/
docs/       sealed GitHub Pages webroot (index.html, styles/, js/, assets/, CNAME,
            install.sh, .nojekyll — no build step, no remote subresources)
tests/
  test_functional.oo   8 positive assertions over the shipped tree
  test_refusal.oo      14 negative assertions (dead refs, traversal, telemetry)
```

`cli/main.oo` is the lone entry page (`bin/website`); `tests/` is the lean 2-file
suite (0 source-grepping); `.github/workflows/{ci,deploy}.yml` replay the site gate
on checkout and before Pages deploy.

## Verification Gates

```sh
make build    # oodac build cli/main.oo -> bin/website + dist/website
make test     # functional 8/8 + refusal 14/14 + check gate + about card (PATH=/nonexistent)
make verify   # line-cap, file-law, academy, density, vocab, shape, link-law, check, site-gate
/Projects/openOODA-core/oohat/bin/oohat cycle /Projects/openOODA/website
# required: cycle=PASS quorum_mask=255 telemetry_beacons=0
```

## Power-of-2 Shape Ladder & .oo Rules

`1` stmt/line & link-count 1 · `2`-file tests suite · `4` max nesting & 4-Axis review
(`oohat` + semantics + native binary + ecosystem) · `8` files/dir, fns/file, params/fn,
root entries · `16` min lines/file · `32` caps & 32-char names · `64` lines/fn ·
`128` chars/line · `256` lines/file. Relative string imports only; no `if`/`while`
parens; no struct trailing commas; Academy header on every `.oo` page; always reuse
`oostd` (`str.oo`, `sec/hash/sha256.oo`, `app/ui/ootheme.oo`) — never duplicate helpers.
