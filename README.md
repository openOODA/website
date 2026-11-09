# `@openOODA/website`

Static website source for [https://openOODA.org](https://openOODA.org), served via GitHub Pages from [`docs/`](docs).

## Layout

- [`docs/index.html`](docs/index.html) — Main landing page, interactive `ootheme` switcher, layer explorer, and direct ISO / Buildbox downloads
- [`docs/install.sh`](docs/install.sh) — Redirect bootstrap script (`curl -fsSL https://openOODA.org/install.sh | bash`)
- [`docs/CNAME`](docs/CNAME) — Custom domain binding (`openooda.org`)
- [`docs/styles/`](docs/styles) & [`docs/js/`](docs/js) — Stylesheets and interactive preview scripts
- [`docs/assets/`](docs/assets) — SVG icons and diagrams

## System Requirements (`openOODA` Stack)

| Tier | Target Workload | CPU & Vector / TEE Extensions | Memory (RAM & CXL) | Storage & Bus | Host OS / Firmware / Interconnect |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1: CLI / TUI & Tools** | Pre-built `L2`–`L5` tools, `oosaver` (`idlescreen`), `ooflash` | `x86_64` (AVX2/AVX-512), `ARM64` (`SVE2`), or `RISC-V` (`RVV 1.0`) (1+ core) | **64 – 256 MiB** (`2–24 MiB` RSS per tool) | **10 – 250 MiB** (`~0.3–3 MiB` per static binary) | Linux `4.19+` (`5.15+` for `io_uring`/Landlock), openOODA OS, Windows 10/11 (`PE32+`), macOS, WASM32 |
| **Tier 2: Bare-Metal OS & Desktop** | `ooboot` + `ookernel` + `oode` (`oocomp`, `ooterm`, `oobrowser`, 128 Hz engines) | 2+ cores (`4+` rec; Intel RDT / ARM MPAM L3 QoS) | **512 MiB** min (TUI) / **2 – 4 GiB** rec (Wayland desktop & 3D apps) | **1 – 4 GiB** NVMe (ZNS), SATA/AHCI, VirtIO-Blk, SDHCI/eMMC/UFS, or USB4 | UEFI (`x86_64`/`AA64`) + TPM 2.0 / DICE / Caliptra Root-of-Trust, GOP/DRM-KMS/VirtIO-GPU 3D |
| **Tier 3: Developer Workstation** | Building from source with `oodac`, SMT/Z3 proofs & 8-hat `oohat` verification | 4+ cores / 8+ threads (`16+` threads; AMD SEV-SNP / Intel TDX / ARM CCA TEE) | **8 – 16 GiB** min (`3` compiler slots) / **32 – 64 GiB+** rec (`8` slots) | **20 – 50 GiB** NVMe SSD (107 repos + `.ooda-cache`) | Linux `x86_64` / `ARM64` or openOODA Buildbox container (SR-IOV VF / VirtIO-FS DAX) |
| **Tier 4: AI & Frontier Science** | Local `L7` agent swarm (`ooaid`, `oocoder`) & `oostd` GPU/NPU compute kernels | Multi-core CPU (Intel AMX / ARM SME) + NVIDIA (`CUDA` SM 7.5+) or AMD (`ROCm`) | **16 GiB+** system RAM / **CXL 3.0** pool + **8 – 24 GiB+ VRAM** per GPU | **50 GiB+** NVMe / Peer-to-Peer DMA (`peer_dma`) | Zero-Copy **RDMA / RoCEv2 / InfiniBand** fabric + CUDA, ROCm, or Vulkan (automatic CPU fallback) |
