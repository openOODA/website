<div align="center">

<pre>
   ____  ____  ___  ____    ___   ___  ____    _
  / __ \/ __ \/ _ \/ __ \  / _ \ / _ \|  _ \  / \
 / /_/ / /_/ /  __/ / / / | | | | | | | | | |/ _ \
/_____/ .___/\___/_/ /_/  | |_| | |_| | |_| / ___ \
      /_/                   \___/ \___/|____/_/   \_\
</pre>

### openOODA — Capability-Secure Computing Stack for the AI Era (Stealth Pre-Release)

[openooda.org](https://openooda.org) • [@openOODA](https://github.com/openOODA)

</div>

---

> **Status: Stealth Mode (Private Pre-Release Development)**
>
> `openOODA` is currently in private pre-release development and is not publicly released yet. Keep an eye on [openooda.org](https://openooda.org) and [@openOODA](https://github.com/openOODA) for our upcoming public launch.

## About openOODA

**openOODA** is an AI-native, capability-secured, fail-closed computing stack built from first principles across eight unified layers (`L0`–`L7`).

Legacy operating systems and programming languages were designed around implicit ambient authority—where any imported dependency or generated routine inherits the full privileges of the user running the process. As software creation and execution become increasingly autonomous, ambient trust turns every component into a systemic risk.

openOODA replaces implicit trust with verifiable proof:
- **Zero Ambient Authority**: Every process is born with zero privileges. Filesystem, network, device, and inter-process effects require explicit, unforgeable capability tokens.
- **Compile-Time & Hardware Enforcement**: Missing capabilities and memory safety violations are rejected ahead of time by the compiler and enforced at runtime by hardware-isolated kernel boundaries.
- **Unified L0–L7 Architecture**:
  - **L0 — Core**: Systems language, self-hosting native compiler, deterministic standard library, and developer toolchain.
  - **L1 — Kernel**: Capability microkernel, hardware abstraction layers, and isolated user-space drivers.
  - **L2 — OS**: Zero-root system services, capability filesystems, networking, and compatibility realms.
  - **L3 — Tools**: Capability-scoped userland command-line utilities and structured data pipelines.
  - **L4 — Desktop**: Capability compositor, spatial window manager, and interactive privacy portals.
  - **L5 — Apps**: Native productivity, creative, and developer applications with zero ambient tracking.
  - **L6 — Cloud**: Distributed compute grid, encrypted mesh networking, and cluster orchestration.
  - **L7 — Agents**: Bounded autonomous OODA loops (Observe, Orient, Decide, Act) and verification engines.

## This Repository (`website`)

Static source for [openooda.org](https://openooda.org).

## License

Apache-2.0. See [LICENSE](LICENSE) for full text.
