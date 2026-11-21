# `@openOODA/website`

Static website source for [https://openOODA.org](https://openOODA.org), served via GitHub Pages from [`docs/`](docs). **v2.4.4** documents the canonical 4-organization architecture: `@openOODA` (4 platform + `.github`), `@openOODA-core` (`15`), `@openOODA-system` (`37`), `@openOODA-apps` (`18`) — `70` product packages, `78` repositories total.

**Zero telemetry.** The shipped webroot carries no third-party beacons or remote
subresource loads — `core/site_check.oo`, `tests/`, `make site-gate`, both CI gates,
and `ooda-verify black` (`telemetry_beacons=0`) all refuse them. See `AGENTS.md` for the
full invariant and verification ladder.

## Layout

- [`docs/index.html`](docs/index.html) — Main landing page, interactive `ootheme` switcher, 4-organization explorer, repository completion tracker, and direct ISO / Buildbox downloads
- [docs/install.sh](docs/install.sh) — Installer copy served at https://openooda.org/install.sh (v2.0.0)
- [`docs/CNAME`](docs/CNAME) — Custom domain binding (`openooda.org`)
- [`docs/styles/`](docs/styles) & [`docs/js/`](docs/js) — Stylesheets and interactive preview scripts (local only)
- [`docs/assets/`](docs/assets) — SVG icons and diagrams
- [`cli/main.oo`](cli/main.oo) — `website check|about` conformance verbs (`bin/website`)
- [`core/site_check.oo`](core/site_check.oo) — Reference, anchor, integrity & zero-telemetry fold over `docs/`
- [`tests/`](tests) — Functional + refusal `.oo` suites (8 + 14 assertions)
- [`.github/scripts/tracker.sh`](.github/scripts/tracker.sh) — Regenerates the completion tracker and every live version claim from the live repository state

## Repository Completion Tracker

The tracker on the landing page is a live census of all `78` repositories across the
four organizations. It is generated, never hand-edited, so the page cannot drift from
the repositories it describes.

Each repository is scored on five gates, and the tier is decided by the **first gate
that fails** — so a repository is never credited for a later gate while an earlier one
is red:

| Column | What it reports |
| :--- | :--- |
| `REPO` | the repository, and the organization that owns it |
| `ORG` | the canonical organization: root, core, system or apps |
| `VERSION` | the latest semver release tag on the repository |
| `CONTRACT` | the fail-closed completion verdict, with the gate count it passed |
| `ATTESTED` | `SIGNED` when the signed package index in `@openOODA/catalog` attests that exact release, `DRIFT` when the repository has shipped ahead of the catalog |
| `CAPS` | the capability set the catalog records for the package — exactly the authority it may hold, never ambient |
| `GATE` | the CI verdict |
| `PUSHED` | how long ago the repository was last pushed |

The contract verdict is fail-closed, so a repository is credited only when every
earlier gate passes:

| Gate | Passes when | Applies to |
| :--- | :--- | :--- |
| `VERSIONED` | the repository carries a semver release tag | every repository |
| `CITED` | a CI gate has run against it | `@openOODA` only |
| `GREEN` | that gate concluded successfully | `@openOODA` only |
| `SHIPPING` | the latest release is within 30 days | every repository |
| `CLEAN` | no open issues and no open pull requests | every repository |

A matrix above the table rolls the same facts up per layer, so the shape of the
stack is legible before any single row is read.

**CI/CD is gated in `@openOODA` only.** That is the one organization that carries
CI/CD gates; the other three ship without them. The `CITED` and `GREEN` gates
therefore do not apply to `@openOODA-core`, `@openOODA-system` and `@openOODA-apps`,
and their tier is decided by `VERSIONED` → `SHIPPING` → `CLEAN`. A repository only
counts as gated when it actually carries a CI workflow file — a verdict left behind
by a workflow that has since been removed does not count.

| Tier | Meaning |
| :--- | :--- |
| `COMPLETE` | every gate passes |
| `BLOCKED` | shipped, but carries open work |
| `STALE` | released, but not shipped in 30 days |
| `CI RED` | gated, and the gate is red |
| `NO CI GATE` | no CI gate has run |
| `SKELETON` | no release tag |

Version numbers printed anywhere on the page are wrapped in
`<span data-ver="org/repo">` and rewritten by the same generator, so a version on the
page always matches the repository's latest release tag.

```sh
export GH_TOKEN=...            # or GITHUB_TOKEN
make tracker                   # regenerate docs/index.html from live state
make tracker-check             # fail when docs/index.html is stale
```

`.github/workflows/tracker.yml` runs the same generator on a schedule and opens a pull
request when the page has fallen behind.

## Verify

```sh
make build && make test     # bin/website + both .oo suites + site gate
make verify                 # shape/file/academy/link laws + ooda-compiler check + site-gate
make tracker-check          # page still matches the live repository state
make assets                 # stamp a content hash onto every asset reference
make assets --check         # fail when the committed page no longer matches its assets
~/.openooda/bin/ooda-verify cycle .   # 8-hat quorum_mask=255, telemetry_beacons=0
```

## System Requirements (`openOODA` Stack)

| Tier | Target Workload | CPU & Vector / TEE Extensions | Memory (RAM & CXL) | Storage & Bus | Host OS / Firmware / Interconnect |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1: CLI / TUI & Tools** | Pre-built `@openOODA-system` tools, `ooda-screensaver`, `ooda-flasher` | `x86_64` (AVX2/AVX-512), `ARM64` (`SVE2`), or `RISC-V` (`RVV 1.0`) (1+ core) | **64 – 256 MiB** (`2–24 MiB` RSS per tool) | **10 – 250 MiB** (`~0.3–3 MiB` per static binary) | Linux `4.19+` (`5.15+` for `io_uring`/Landlock), openOODA OS, Windows 10/11 (`PE32+`), macOS, WASM32 |
| **Tier 2: Bare-Metal OS & Desktop** | `ooda-boot` + `ooda-kernel` + desktop (`ooda-compositor`, `ooda-terminal`, `ooda-browser`, 128 Hz engines) | 2+ cores (`4+` rec; Intel RDT / ARM MPAM L3 QoS) | **512 MiB** min (TUI) / **2 – 4 GiB** rec (Wayland desktop & 3D apps) | **1 – 4 GiB** NVMe (ZNS), SATA/AHCI, VirtIO-Blk, SDHCI/eMMC/UFS, or USB4 | UEFI (`x86_64`/`AA64`) + TPM 2.0 / DICE / Caliptra Root-of-Trust, GOP/DRM-KMS/VirtIO-GPU 3D |
| **Tier 3: Developer Workstation** | Building from source with `ooda-compiler`, SMT/Z3 proofs & 8-hat `ooda-verify` verification | 4+ cores / 8+ threads (`16+` threads; AMD SEV-SNP / Intel TDX / ARM CCA TEE) | **8 – 16 GiB** min (`3` compiler slots) / **32 – 64 GiB+** rec (`8` slots) | **20 – 50 GiB** NVMe SSD (78 repos + `.ooda-cache`) | Linux `x86_64` / `ARM64` or openOODA Buildbox container (SR-IOV VF / VirtIO-FS DAX) |
| **Tier 4: AI & Frontier Science** | Local agent & inference workloads (`ooda-inference`) & `ooda-standard` GPU/NPU compute kernels | Multi-core CPU (Intel AMX / ARM SME) + NVIDIA (`CUDA` SM 7.5+) or AMD (`ROCm`) | **16 GiB+** system RAM / **CXL 3.0** pool + **8 – 24 GiB+ VRAM** per GPU | **50 GiB+** NVMe / Peer-to-Peer DMA (`peer_dma`) | Zero-Copy **RDMA / RoCEv2 / InfiniBand** fabric + CUDA, ROCm, or Vulkan (automatic CPU fallback) |
