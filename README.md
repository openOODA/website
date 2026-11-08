<div align="center">

<pre>
   ____  ____  ___  ____    ___   ___  ____    _
  / __ \/ __ \/ _ \/ __ \  / _ \ / _ \|  _ \  / \
 / /_/ / /_/ /  __/ / / / | | | | | | | | | |/ _ \
/_____/ .___/\___/_/ /_/  | |_| | |_| | |_| / ___ \
      /_/                   \___/ \___/|____/_/   \_\
</pre>

### `website` — Official openOODA documentation and interactive architecture portal (https://openooda.org).

[openooda.org](https://openooda.org) • [`openOODA/website`](https://github.com/openOODA/website) • [Public Binary Hub (`install@hub`)](https://github.com/openOODA/install/releases/tag/hub) • [Governance & Quick Cards (`openOODA/openOODA`)](https://github.com/openOODA/openOODA)

</div>

---

## Overview

**`website`** (`v1.3.48`) is a canonical repository in **Root (`@openOODA`)** of the [openOODA](https://github.com/openOODA) capability-secured computing stack (`L0`–`L7`).

- **Description**: Official openOODA documentation and interactive architecture portal (https://openooda.org).
- **Layer & Bundle**: Root (`@openOODA`) • Fedora-style bundle `@core` (`oopm install @core` or `oopm install website`)
- **Explicit Capabilities (`CapReg64`)**: `FsReadCap`, `FsWriteCap`, `ProcessCap`, `EnvCap`
- **Security & CISA KEV Posture**: Hardened against `CWE-22` (path traversal admission), `CWE-78` (shell-free argv execution), `CWE-190`/`CWE-787` (checked bounds arithmetic), and `CWE-502` (depth-bounded `.oot` deserialization); verified under the 8-Hat adversarial consensus engine (`oohat cycle` `quorum_mask=255`) and deterministic double-compilation (`make det`).
- **Theme & Surface Integration**: Wired to [`ootheme`](https://github.com/openOODA-tools/ootheme) (`25` built-in dark/light/circadian presets, `34` semantic color tokens, `NO_COLOR=1`, and `--json`) and exposes `<binary> about` (`ooda about website`).
- **Tags**: `#openooda` `#capability-security` `#zero-trust` `#deterministic` `#post-quantum-cryptography` `#cisa-kev` `#documentation` `#website` `#architecture` `#systems-language`

## Module Anatomy (`25` `.oo` Pages — Power-of-2 Shape Ladder `1/2/4/8/16/32/64/128/256`)

| Page | Role & Logline |
| :--- | :--- |
| [`.github/workflows/anchor.oo`](.github/workflows/anchor.oo) | The CI pipeline that publishes the website to GitHub |
| [`anchor.oo`](anchor.oo) | Public site at openooda.org. Static index.html is the home. |
| [`assets/anchor.oo`](assets/anchor.oo) | Browser-loadable binary files referenced from HTML shell. |
| [`docs/anchor.oo`](docs/anchor.oo) | RFC-0005 docs for the website repo. Live home is index.html. |
| [`js/anchor.oo`](js/anchor.oo) | Copy, headline rotate, panel arrows. Home body is HTML. |
| [`src/anchor.oo`](src/anchor.oo) | Static index.html is the live home. No hash router. |
| [`src/emit_json.oo`](src/emit_json.oo) | Assemble the fleet board and quota board JSON documents from parsed fragments; every externally-derived string field passes through json_str so hostile text can never break the document. |
| [`src/fhist.oo`](src/fhist.oo) | Build and append sig-deduped per-tick history lines carrying per-repo severity vectors for the 24-tick sparklines. |
| [`src/fleet_refresh.oo`](src/fleet_refresh.oo) | Read .fleet-state.txt + the .fleet-alerts spool and write the JSON the fleet health board renders, plus a tick-sig-deduped history line for sparklines. |
| [`src/fsrc.oo`](src/fsrc.oo) | Split the fleettick state document into lines and render each section (repos, quota, workspaces, health/forge) as JSON array fragments for fleet.json. |
| [`src/json_test.oo`](src/json_test.oo) | Hostile state-file, pane, filename, and timestamp text must never break out of the JSON string fields the .oo refresh drivers emit. |
| [`src/qsrc.oo`](src/qsrc.oo) | Pull real quota signals from mcode, grok, and vibe plus the byte-native text helpers the refresh driver needs. |
| [`src/quota_refresh.oo`](src/quota_refresh.oo) | Read real quota signals from the four fleet agents and write the self-contained JSON data file the static quota dashboard renders. |
| [`styles/anchor.oo`](styles/anchor.oo) | Split CSS for the static home. Not a second SPA skin. |
| [`tests/anchor.oo`](tests/anchor.oo) | Bind the six website assertion pages into one suite over the published site. |
| [`tests/contract/contract_test.oo`](tests/contract/contract_test.oo) | Prove quota.js and fleet.js consume exactly the keys emit_json.oo produces. |
| [`tests/copy_test.oo`](tests/copy_test.oo) | Assert that the home page keeps its clipboard copy path and names the stealth mode. |
| [`tests/hooks_test.oo`](tests/hooks_test.oo) | Assert that every DOM hook of the site scripts resolves in the home page and that the sitemap names the live host. |
| [`tests/layout_test.oo`](tests/layout_test.oo) | Assert that both pages carry a viewport, load no app script, link only live files, and ship small-screen rules. |
| [`tests/links_test.oo`](tests/links_test.oo) | Assert that every owned link answers and every relative file reference exists. |
| [`tests/privacy_test.oo`](tests/privacy_test.oo) | Refuse every published file that names the internal fleet, a tailnet address, or a local path. |
| [`tests/routes/routes_test.oo`](tests/routes/routes_test.oo) | Assert every sitemap route resolves to a published file and the robots contract stays wired. |
| [`tests/shim/shim_trust_test.oo`](tests/shim/shim_trust_test.oo) | Run the website install shim against stubbed curl and bash and prove corrupt downloads never execute. |
| [`tests/shim_test.oo`](tests/shim_test.oo) | Assert that install.sh parses, keeps its no-empty-exec guards, and names the canonical master installer. |
| [`tests/test_website.oo`](tests/test_website.oo) | Positive and negative-trust assertions over the canonical post-quantum round that seals website digests. |

## Build, Deterministic Verification & 8-Hat Consensus Gates

```sh
make build                                         # Compile native ELF binary via oodac
make test                                          # Run functional /tmp round-trip + negative-trust refusal tests
make det                                           # Diverse Double-Compilation bit-for-bit determinism gate
/Projects/openOODA-agents/oohat/bin/oohat cycle .  # 8-Hat consensus + CISA KEV gate (quorum_mask=255)
```
