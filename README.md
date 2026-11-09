# `@openOODA/website`

Static website source for [https://openOODA.org](https://openOODA.org), served via GitHub Pages from [`docs/`](docs).

## Layout

- [`docs/index.html`](docs/index.html) — Main landing page, interactive `ootheme` switcher, layer explorer, and direct ISO / Buildbox downloads
- [`docs/install.sh`](docs/install.sh) — Redirect bootstrap script (`curl -fsSL https://openOODA.org/install.sh | bash`)
- [`docs/CNAME`](docs/CNAME) — Custom domain binding (`openooda.org`)
- [`docs/styles/`](docs/styles) & [`docs/js/`](docs/js) — Stylesheets and interactive preview scripts
- [`docs/assets/`](docs/assets) — SVG icons and diagrams

## System Requirements (`openOODA` Stack)

| Tier | Target Workload | CPU & Architecture | Memory (RAM) | Storage | Host OS / Firmware |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1: CLI / TUI & Tools** | Pre-built `L2`–`L5` tools, `idlescreen`, `ooflash` | `x86_64`, `ARM64` (`aarch64`), or `RISC-V` (`riscv64gc`) (1+ core) | **64 – 256 MiB** (`2–24 MiB` RSS per tool) | **10 – 250 MiB** (`~0.3–3 MiB` per static binary) | Linux `4.19+` (`5.15+` for `io_uring`/Landlock), openOODA OS, Windows 10/11 (`PE32+`), macOS, WASM32 |
| **Tier 2: Bare-Metal OS & Desktop** | `ooboot` + `ookernel` + `oode` (`oocomp`, `ooterm`, `oobrowser`, 128 Hz engines) | 2+ cores (`4+` recommended for 128 Hz physics) | **512 MiB** min (TUI) / **2 – 4 GiB** rec (full Wayland desktop & 3D apps) | **1 – 4 GiB** NVMe / VirtIO-Blk / AHCI / USB (`oofs-core`) | UEFI (`x86_64` / `AA64`) with GOP framebuffer or DRM-KMS / VirtIO-GPU |
| **Tier 3: Developer Workstation** | Building from source with `oodac`, SMT/Z3 proofs & 8-hat `oohat` verification | 4+ cores / 8+ threads (`16+` threads recommended) | **8 – 16 GiB** min (`3` compiler slots) / **32 – 64 GiB+** rec (`8` slots) | **20 – 50 GiB** NVMe SSD (107 repos + `.ooda-cache`) | Linux `x86_64` / `ARM64` or openOODA Buildbox container |
| **Tier 4: AI & Frontier Science** | Local `L7` agent swarm (`ooaid`, `oocoder`) & `oostd` GPU compute kernels | Multi-core CPU + NVIDIA (`CUDA` SM 7.5+) or AMD (`ROCm`) GPU | **16 GiB+** system RAM + **8 – 24 GiB+ VRAM** per GPU | **50 GiB+** NVMe SSD (local model weights & telemetry) | Linux / openOODA OS with CUDA, ROCm, or Vulkan compute (automatic CPU fallback) |
