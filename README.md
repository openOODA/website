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

## The 5-Organization Architecture

| Layer & Org | Repositories | Focus |
| :--- | :---: | :--- |
| **Layer 0: [openOODA](https://github.com/openOODA)** | 14 | Self-hosting compiler (`oodac`), runtime substrate (`oodar`), `std`, `cli`, `opm`, `lsp`, `mcp`, `tui`, governance |
| **Layer 1: [openOODA-kernel](https://github.com/openOODA-kernel)** | 16 | Ring-0 NT/seL4 hybrid microkernel (`ookernel-ob`, `ookernel-mm`, `ookernel-sched`, `ookernel-ipc`) & Ring-3 drivers |
| **Layer 2: [openOODA-OS](https://github.com/openOODA-OS)** | 16 | Zero-root system daemons (`ooinit`, `oovfs`, `oonetd`, `oosysbus`, `oohealthd`, `ooimage`) |
| **Layer 3: [openOODA-tools](https://github.com/openOODA-tools)** | 256 | Userland CLI / TUI / MCP utilities across 12 functional categories (`oosh`, `oogrep`, `oofind`, `oojq`) |
| **Layer 4: [openOODA-DE](https://github.com/openOODA-DE)** | 18 | Capability Wayland Desktop Environment (`oocomp`, `oowm`, `oopanel`, `ooportal`, `ooterm`, `ooagent-hud`) |

## License

Apache-2.0. See [LICENSE](LICENSE) for full text.
