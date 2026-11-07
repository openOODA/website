<div align="center">

<pre>
   ____  ____  ___  ____    ___   ___  ____    _
  / __ \/ __ \/ _ \/ __ \  / _ \ / _ \|  _ \  / \
 / /_/ / /_/ /  __/ / / / | | | | | | | | | |/ _ \
/_____/ .___/\___/_/ /_/  | |_| | |_| | |_| / ___ \
      /_/                   \___/ \___/|____/_/   \_\
</pre>

### openOODA — Capability-Secure Computing Stack (L0–L7)

[openooda.org](https://openooda.org) • [@openOODA](https://github.com/openOODA)

</div>

---

## About openOODA

**openOODA** is an AI-native, capability-secured, fail-closed computing stack built from first principles across eight unified layers (`L0`–`L7`). It fuses **Linux/Unix systems engineering**, **cryptographic bearer authority and Merkle provenance**, and **closed-loop autonomous AI** into a unified computing foundation.

Legacy operating systems and programming languages were designed around implicit ambient authority—where any imported dependency or generated routine inherits the full privileges of the user running the process. As software creation and execution become increasingly autonomous, ambient trust turns every component into a systemic risk.

openOODA replaces implicit trust with verifiable proof:
- **Zero Ambient Authority (Conservation of Authority)**: Every process is born with zero privileges. Filesystem, network, device, and inter-process effects require explicit capabilities that can only be delegated or monotonically narrowed, never forged or widened.
- **Full Use of Every 64-Bit CPU Cycle (`32 + 32 = 64` Capability Register)**: The lower 32 bits encode all **32 Root Capabilities** (`13` Hardware + `19` Software/OS)—fitting natively into a single 32-bit GPU register / 32-lane GPU warp and a 32-bit seccomp-BPF accumulator. The upper 32 bits pack a **16-bit OODA Epoch** (instant revocation) + **8-bit Rights Mask** (`R/W/X/Delegate/Revoke`) + **8-bit Scope Badge**, allowing a 64-bit CPU to validate *both* **which capabilities** an agent holds (`WHAT`) and **how they are permitted to be used during that exact cycle** (`HOW & WHEN`) in a single clock cycle.
- **Cryptographic Provenance at Silicon Speed**: Bearer capabilities, Merkle-DAG AST and artifact state, post-quantum warrants, and deterministic resource quotas are enforced at compile time and hardware/kernel boundaries without consensus latency.
- **Closed-Loop Autonomous AI**: Observe–Orient–Decide–Act (OODA) loops and adversarial falsification gates verify code against formal contracts and capability budgets before execution.
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
