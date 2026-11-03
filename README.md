<div align="center">

<pre>
   ____  ____  ___  ____    ___   ___  ____    _
  / __ \/ __ \/ _ \/ __ \  / _ \ / _ \|  _ \  / \
 / /_/ / /_/ /  __/ / / / | | | | | | | | | |/ _ \
/_____/ .___/\___/_/ /_/  | |_| | |_| | |_| / ___ \
      /_/                   \___/ \___/|____/_/   \_\
</pre>

### openOODA — Primary Systems Language & 5-Organization Ecosystem for the AI Era

[openooda.org](https://openooda.org) • [openOODA](https://github.com/openOODA) • [openOODA-kernel](https://github.com/openOODA-kernel) • [openOODA-OS](https://github.com/openOODA-OS) • [openOODA-tools](https://github.com/openOODA-tools) • [openOODA-DE](https://github.com/openOODA-DE)

</div>

---

## This repo: website

Source for [openooda.org](https://openooda.org).

## Install

```sh
curl -fsSL https://openooda.org/install.sh | bash
```

## The 5-Organization Architecture (325 Repositories at v0.2.3)

| Layer & Org | Repositories | Focus |
| :--- | :---: | :--- |
| **Layer 0: [openOODA](https://github.com/openOODA)** | 14 | Sublayers L0.1-L0.4: **L0.1 Host/Silicon ABI** (`oodar`: Landlock, `sys_spawn`/`sys_wait`, `OODA_LISTEN_FD`), **L0.2 Deterministic Runtime & Memory** (`std` linear arenas), **L0.3 Self-Hosted Compiler** (`oodac`), **L0.4 Language/Stdlib/Tools** (`cli`, `opm`, `lsp`, `mcp`, `tui`), governance |
| **Layer 1: [openOODA-kernel](https://github.com/openOODA-kernel)** | 16 | Ring-0 NT/seL4 hybrid microkernel (`ookernel-ob`, `ookernel-mm`, `ookernel-sched`, `ookernel-ipc`) & Ring-3 drivers |
| **Layer 2: [openOODA-OS](https://github.com/openOODA-OS)** | 18 | Zero-root system daemons (`ooinit`, `oosvc-mgr`, `oovfs`, `oonetd`, `oosysbus`, `oohealthd`, `ooimage`, `ooaid --serve`, `oorealm`) |
| **Layer 3: [openOODA-tools](https://github.com/openOODA-tools)** | 257 | Userland CLI / TUI / MCP utilities across 12 functional categories (`oosh`, `oogrep`, `oofind`, `oojq`, `oollama`) |
| **Layer 4: [openOODA-DE](https://github.com/openOODA-DE)** | 20 | Capability Wayland Desktop Environment (`oocomp`, `oowm`, `oopanel`, `ooportal`, `oobazaar`, `oocockpit`, `ooagent-hud`) |

**Fleet verification at v0.2.3: 54/54 KVM microVM boot-verified** — `eco-vm-test` stages all 54 core subsystem binaries (16 kernel + 18 OS + 20 DE), sha256 Merkle-hashes and `--self-test` gates each, then boots the initramfs in a QEMU/KVM microVM on a Landlock-enforced kernel; the serial log reads `54/54 subsystems verified in hardware VM (fail=0)`.

## License

Apache-2.0. See [LICENSE](LICENSE) for full text.
