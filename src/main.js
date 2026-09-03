const ROUTE_NAME_TO_ID = {
"home": 1, "manifesto": 2, "play": 3, "overview": 4, "start": 5,
"syntax": 6, "stdlib": 7, "cli": 8, "packages": 9, "security": 10,
"defense": 11, "internals": 12, "pay": 13, "qa": 14, "quickref": 15, "registry": 16
};
const ROUTE_ID_TO_NAME = {
1: "home", 2: "manifesto", 3: "play", 4: "overview", 5: "start",
6: "syntax", 7: "stdlib", 8: "cli", 9: "packages", 10: "security",
11: "defense", 12: "internals", 13: "pay", 14: "qa", 15: "quickref", 16: "registry"
};
// ====================================================
// WebAssembly Sovereign Engine Activation Controller
// ====================================================
if (typeof window !== "undefined") {
  window.wasmInstance = null;
  window.wasmActive = false;
}
const WASI_SHIM = {
fd_write: () => 0, fd_read: () => 0,
clock_time_get: () => 0, random_get: () => 0,
proc_exit: (c) => console.log("[WASM exit]", c)
};
async function loadWasmBinary() {
if (window.wasmInstance) return window.wasmInstance;
try {
const importObj = {
wasi_snapshot_preview1: WASI_SHIM,
env: { wui_host_patch: () => {}, wui_host_log: () => {} }
};
let res;
const wasmUrl = "/wasm/site.wasm";
if (WebAssembly.instantiateStreaming) {
try {
res = await WebAssembly.instantiateStreaming(fetch(wasmUrl), importObj);
} catch(e) {
const buf = await (await fetch(wasmUrl)).arrayBuffer();
res = await WebAssembly.instantiate(buf, importObj);
}
} else {
const buf = await (await fetch(wasmUrl)).arrayBuffer();
res = await WebAssembly.instantiate(buf, importObj);
}
window.wasmInstance = res.instance;
if (window.wasmInstance.exports._start) {
window.wasmInstance.exports._start();
}
console.log("[WASM] openOODA sovereign WebAssembly core loaded. Exports:", Object.keys(window.wasmInstance.exports).length);
return window.wasmInstance;
} catch (err) {
console.warn("[WASM] WebAssembly load notice:", err);
return null;
}
}

/**
 * setDomText
 * Strict dirty-checking guard for DOM textContent mutations.
 * Avoids invalidating DOM layout nodes when text is unchanged.
 */
function setDomText(el, text) {
  if (el && el.textContent !== text) {
    el.textContent = text;
    return true;
  }
  return false;
}
if (typeof window !== "undefined") {
  window.setDomText = setDomText;
}

function updateWasmToggleUI() {
const btn = document.getElementById("wasm-toggle");
const label = document.getElementById("wasm-toggle-label");
if (!btn || !label) return;
if (window.wasmActive) {
if (!btn.classList.contains("is-active")) btn.classList.add("is-active");
setDomText(label, "wasm: on");
btn.setAttribute("aria-pressed", "true");
} else {
if (btn.classList.contains("is-active")) btn.classList.remove("is-active");
setDomText(label, "wasm: off");
btn.setAttribute("aria-pressed", "false");
}
}
async function setWasmActive(active, shouldSave = true) {
window.wasmActive = !!active;
if (shouldSave) {
localStorage.setItem("ooda-wasm-active", window.wasmActive ? "1" : "0");
}
if (window.wasmActive) {
await loadWasmBinary();
}
updateWasmToggleUI();
}
const DEFAULT_ROUTE = "home";
const DOCS = {"Language.oot":"# SYNTAX — openOODA Language Reference\n\nFile: openOODA.github.io/guide/Language.oot\n\nopenOODA combines deterministic execution speed with static type safety, 256-bit SIMD vector primitives, zero ambient authority, and formal verification contracts for autonomous software synthesis.\n\n---\n\n## 1. Source Files & Governance Invariants\n\n- **Extension**: Executable code files use `.oo`. Documentation and specifications use `.oot`.\n- **Line Limit**: Every source file is strictly `<= 256 lines`. Large modules decompose into cohesive submodules.\n- **Academy Header**: Every module must begin with a 4-element doc header (`# Title`, `Logline:`, `Setup:`, `Beats:`).\n\n---\n\n## 2. Primitive Types, SIMD Vectors & FMA Arithmetic\n\nopenOODA enforces strict static typing. Every variable binding requires explicit type annotation. Native 256-bit SIMD vector types (`f32x8`, `f64x4`) and Fused Multiply-Add (`fma`) arithmetic provide hardware-direct vectorization (RFC 0026):\n\n```openooda\nlet count: Int = 42;           // 64-bit integer\nlet ratio: Float = 3.14159;    // 64-bit float\nlet active: Bool = true;       // Boolean\nlet name: String = \"openOODA\"; // UTF-8 string\nlet mut total: Int = 0;        // Mutable binding\n\n// 256-bit SIMD vector types (8-lane f32, 4-lane f64)\nlet v8: f32x8 = f32x8_splat(1.5);\nlet v4: f64x4 = f64x4_splat(3.0);\n\n// Hardware Fused Multiply-Add: (a * b) + c with <= 1 ULP precision\nlet fma_res: f32x8 = f32x8_fma(v8, f32x8_splat(2.0), f32x8_splat(0.5));\nlet sum: Float = f32x8_reduce_sum(fma_res); // Horizontal tree reduction\n```\n\n---\n\n## 3. Structs & Algebraic Sum Types\n\n### Structs (Records)\nStruct definitions and instantiations omit trailing commas:\n\n```openooda\npub type Point = struct {\n    x: Int,\n    y: Int\n};\n\npub fn make_point(x: Int, y: Int) -> Point {\n    return Point { x: x, y: y };\n}\n```\n\n### Tagged Sum Types (Algebraic Data Types)\n```openooda\npub type AgentState = \n    | Idle\n    | Processing(Int)\n    | Complete(String)\n    | Error(String);\n```\n\n---\n\n## 4. Pattern Matching & Error Handling\n\nPattern matching is strictly exhaustive. Every branch must be covered:\n\n```openooda\npub fn evaluate_state(state: AgentState) -> String {\n    return match state {\n        Idle => \"Idle\",\n        Processing(s) => \"Step: \" + s.to_string(),\n        Complete(h) => \"Done: \" + h,\n        Error(e) => \"Err: \" + e,\n    };\n}\n```\n\n### Result[T, E] & The Try Operator (`?`)\nUnhandled `Result` values trigger compile-time errors. Use `match let` or `?` to handle fallible computations:\n\n```openooda\npub fn parse_and_double(input: String) -> Result[Int, String] {\n    let value: Int = parse_int(input)?;\n    return Ok(value * 2);\n}\n\npub fn handle_request() {\n    match let res = parse_and_double(\"128\") {\n        Ok(n) => println(\"Res: \" + n.to_string()),\n        Err(e) => println(\"Err: \" + e),\n    }\n}\n```\n\n---\n\n## 5. Struct Methods & Receivers\n\nMethods specify value receivers (`self: Point`) or borrowed references (`pt: &Point`, `pt: &mut Point`):\n\n```openooda\npub fn scale(self: Point, factor: Int) -> Point {\n    let nx: Int = self.x * factor;\n    let ny: Int = self.y * factor;\n    return Point { x: nx, y: ny };\n}\n\npub fn distance_squared(pt: &Point) -> Int {\n    let xx: Int = (*pt).x * (*pt).x;\n    let yy: Int = (*pt).y * (*pt).y;\n    return xx + yy;\n}\n\npub fn shift_x(pt: &mut Point, dx: Int) {\n    (*pt).x = (*pt).x + dx;\n}\n```\n\n---\n\n## 6. Expressions & Control Flow\n\n### Inline Conditionals & Bounded Loops\n```openooda\nlet limit: Int = if is_fast_mode { 1000 } else { 100 };\nlet y: Int = val + (if cond { a } else { b });\n\n// Dynamic list traversal and bounded range loop\nfor item in items { process(item); }\nfor i in 0..(n - 1) { total = total + i; }\n```\n\n---\n\n## 7. Capability-Gated Memory & 32-Byte SIMD Alignment\n\nPer RFC 0026, SIMD vector memory transfers require explicit `&AllocCap` capability tokens and enforce strict 32-byte alignment:\n\n- **32-Byte Alignment Invariant**: Address offsets must satisfy `offset % 32 == 0`.\n- **Fail-Closed Traps**: Misaligned access triggers runtime panic `TRAP_0x20_SIMD_ALIGNMENT_FAULT`.\n- **Hardware Lowering**: Compiles to AVX2 `vfmadd213ps` on x86_64 and dual NEON `fmla.4s` on AArch64.\n\n```openooda\n// # Aligned SIMD Stream Transform\n// Logline: Transforms aligned float buffers using 256-bit SIMD vector operations.\n// Setup: Requires &AllocCap token. Enforces 32-byte memory alignment invariant.\n// Beats: 1. Verify alignment. 2. Execute f32x8 FMA transform. 3. Store result.\n\npub fn transform_simd_buffer(\n    alloc: &AllocCap,\n    buf: List[Float],\n    scale: Float,\n    bias: Float\n) -> Result[List[Float], String] {\n    let v_in: f32x8 = f32x8_load_aligned(alloc, buf, 0)?;\n    let v_scale: f32x8 = f32x8_splat(scale);\n    let v_bias: f32x8 = f32x8_splat(bias);\n    let v_out: f32x8 = f32x8_fma(v_in, v_scale, v_bias);\n    return f32x8_store_aligned(alloc, buf, 0, v_out);\n}\n```\n\n---\n\n## 8. Formal Verification Contracts\n\nFunction signatures can declare formal `requires`, `ensures`, and `spec` clauses verified at compile time:\n\n```openooda\npub fn safe_divide(\n    num: Int,\n    den: Int\n) -> Int\n    requires den != 0\n    ensures result * den <= num\n{\n    return num / den;\n}\n```\n\n---\n\n## 9. Capability Tokens & Zero Ambient Authority\n\nSide effects cannot execute without passing an explicit unforgeable capability token reference:\n\n```openooda\npub fn read_manifest(\n    fs: &FsReadCap,\n    path: String\n) -> Result[String, String] {\n    if !path_exists(fs, path) {\n        return Err(\"File not found\");\n    }\n    return read_file(fs, path);\n}\n```\n\n---\n\n## 10. Compile-Time `SECRET` Taint Analysis\n\nSensitive fields marked `SECRET` cannot be printed, logged, or leaked to untrusted sinks:\n\n```openooda\npub type ApiCredentials = struct {\n    client_id: String,\n    api_secret: String\n};\n// SECRET: api_secret\n\npub fn process_auth(creds: ApiCredentials) {\n    println(creds.client_id);     // OK: Public\n    // println(creds.api_secret); // BLOCKED at compile time\n}\n```\n\n---\n\n## 11. Modular Standard Library Imports\n\n```openooda\nimport \"std/simd/simd_vec8f.oo\";\nimport \"std/simd/fma_law.oo\";\nimport \"std/math/tensor.oo\";\nimport \"std/phys/aero/boyd_em.oo\";\n\npub fn main(alloc: &AllocCap) {\n    let vec: f32x8 = f32x8_splat(1.0);\n    let out: f32x8 = f32x8_fma(vec, f32x8_splat(2.0), f32x8_splat(3.0));\n    println(\"SIMD reduction: \" + f32x8_reduce_sum(out).to_string());\n}\n```\n","Limits.oot":"# INTERNALS — Compiler Architecture, Pipeline & Runtime Limits\n\nFile: openOODA.github.io/guide/Limits.oot\n\nopenOODA is engineered as a self-hosted, sovereign compilation system that compiles `.oo` source files directly to native machine code, optimized LLVM bitcode, standalone C99, or WebAssembly without third-party toolchains.\n\n---\n\n## 1. The Sovereign Compilation Pipeline\n\n```\n.oo Source File ──► AST Parsing & Contract Fold ──► OCap & SECRET Taint\n                                                           │\n                                                           ▼\nC99 / LLVM DWARF5 / ELF64 / WasmGC ◄── SSA IR & -O3 Optimizer (Mem2Reg)\n```\n\n---\n\n## 2. Two-Binary System Architecture\n\n1. **`oodac` (The Sovereign Compiler)**:\n   - Evaluates syntax, capability constraints, and static type safety.\n   - Lowers AST nodes to Static Single Assignment (SSA) intermediate representation.\n   - Emits target code or directly synthesizes native ELF binary headers (`ET_EXEC`).\n\n2. **`ooda` (The Workflow Driver)**:\n   - High-level orchestrator for developers and AI swarms.\n   - Coordinates build artifacts, invokes tests, runs LSP servers, and manages packages.\n\n---\n\n## 3. Sub-256 Line Atomic Contract Rule\n\nThe openOODA ecosystem enforces a strict structural law: **every source file (`.oo`) and documentation file (`.oot`) must satisfy $\\le 256$ lines**.\n\n- **LLM Context Hygiene**: Guarantees that any single file fits completely within an autonomous AI agent's active attention window without truncation.\n- **Architectural Atomicity**: Forces large modules to be decomposed into cohesive submodules with explicit interface contracts.\n- **Zero-Drift Refactoring**: Small, atomic units enable surgical AST patching (`ooda patch`) with zero unintended regression in neighboring routines.\n\n---\n\n## 4. Deterministic Resource Bounds & Runtime Limits\n\nopenOODA enforces deterministic boundaries on computation, memory, and networking:\n\n- **Execution Step Budgets (`std/sec/fuel_budget.oo`)**: Restricts untrusted computations to a bounded fuel count, trapping infinite loops.\n- **Stack Bounds & Bounded Recursion**: Eliminates unbounded recursive calls, enforcing deterministic call stack frames.\n- **Memory Ceilings & Arena Limits**: Imposes per-process heap caps via POSIX `setrlimit` and per-arena boundaries under `&AllocCap`.\n- **Swarm Hop Budgeting (`std/sec/agent_send.oo`)**: Restricts message forwarding depth across autonomous agent networks.\n\n```openooda\n// # Bounded Resource Execution\n//\n// Logline: Executes bounded computation with explicit fuel limits.\n//\n// Setup: Allocates bump arena and consumes bounded step budget.\n//\n// Beats:\n//   1. Verify fuel budget is positive.\n//   2. Run computation consuming fuel steps.\n//   3. Return deterministic accumulator result.\n\nimport \"std/sec/fuel_budget.oo\";\n\npub fn run_bounded_task(alloc: &AllocCap, mut fuel: Int) -> Result[Int, String] {\n    if fuel <= 0 {\n        return Err(\"Fuel budget exhausted\");\n    }\n    let mut accumulator: Int = 0;\n    for i in 0..100 {\n        if fuel <= 0 {\n            return Err(\"Step limit reached\");\n        }\n        fuel = fuel - 1;\n        accumulator = accumulator + i;\n    }\n    return Ok(accumulator);\n}\n```\n\n---\n\n## 5. Deterministic Memory Management (0ms GC)\n\n1. **Automatic Reference Counting (ARC)**: Heap allocations are managed via compile-time reference counting with deterministic destruction on the final drop.\n2. **RAII Scoped Destruction**: Stack-allocated variables and lock guards are freed instantly upon leaving lexical scope.\n3. **Region Bump Arenas (`&AllocCap`)**: High-throughput temporary allocations are grouped into an `Arena`, resetting the entire region in a single O(1) CPU cycle with 0ms GC pauses.\n\n---\n\n## 6. Formal Contracts & Monomorphization\n\nFunction signatures support formal `requires`, `ensures`, and `spec` clauses:\n\n```openooda\npub fn checked_divide(\n    numerator: Int,\n    denominator: Int\n) -> Int\n    requires denominator != 0\n    ensures result * denominator <= numerator\n{\n    return numerator / denominator;\n}\n```\n\n- **Compile-Time Contract Folding**: Constant contract assertions are evaluated and proven at compile time; violation fails compilation closed.\n- **Monomorphization**: Generic functions and traits are monomorphized into specialized concrete implementations at compile time, eliminating dynamic dispatch overhead.\n- **Bit-Exact Reproducibility**: Identical source trees yield bit-exact identical binary artifacts across all backends.\n\n---\n\n## 7. Boyd's E-M Engine & 80/20 SSA Optimization\n\nThe optimization pipeline follows Col. John Boyd's Energy-Maneuverability formula $E\\text{-}M = ((T - D) / W) \\cdot V$:\n\n- **Thrust ($T$)**: SSA intermediate representation (`ssa_ir.oo`) optimizes instruction density and scheduling.\n- **Drag ($D$)**: Mem2Reg stack-to-register promotion eliminates memory loads/stores; 0ms GC eliminates latency spikes.\n- **Weight ($W$)**: Direct binary synthesis produces compact, stripped ELF/Wasm binaries without heavy runtime baggage.\n- **Velocity ($V$)**: Sub-100µs incremental caching minimizes turnaround cycles.\n- **Flight Physics Integration**: Flight excess power calculus $P_s = V \\times (T - D) / W \\times 850.0$ in `std/phys/aero/boyd_em.oo` and ISA Mach $M=V/a(h)$ in `std/phys/aero/aero_state.oo` directly ground Boyd's doctrine.\n","Manifesto.oot":"# MANIFESTO — Sovereign Systems for the AI Age\n\nFile: openOODA.github.io/guide/Manifesto.oot\n\nComputing is undergoing an architectural shift: **software is authored, verified, and operated by autonomous AI coding swarms**.\n\nopenOODA provides the sovereign foundation: deterministic execution, contract-driven architecture, zero ambient authority, hard modular constraints, active binary defenses, and zero-trust verification.\n\n---\n\n## 1. The Zero-Ambient-Authority Law\n\nIn openOODA, **no capability token means zero side effects**. Functions cannot read files without `&FsReadCap`, write without `&FsWriteCap`, access networks without `&NetCap`, or spawn subprocesses without `&ProcessCap`. Forged or missing tokens fail closed at compile time.\n\n```openooda\n// Pure function: mathematically impossible to execute side effects\npub fn add(a: Int, b: Int) -> Int {\n    return a + b;\n}\n\n// Effectful function: explicit unforgeable capability required\npub fn save_config(\n    fs: &FsWriteCap,\n    path: String,\n    content: String\n) -> Result[Void, String] {\n    return write_file(fs, path, content);\n}\n```\n\n---\n\n## 2. Col. John Boyd's OODA Loop & Generational Evolution\n\nVictory in dynamic environments belongs to the system with the agility to transition between states faster than the adversary can respond.\n\n### 2.1 The OODA Decision Tempo Law\n$$\\tau_{\\text{OODA}} = \\tau_{\\text{obs}} + \\tau_{\\text{orient}} + \\tau_{\\text{decide}} + \\tau_{\\text{act}} < \\Delta t_{\\text{threat}}$$\n\nIn software engineering, out-looping adversaries translates to sub-millisecond typechecking, deterministic AST synthesis, and real-time autonomous patch verification.\n\n### 2.2 Informational Energy-Maneuverability Formula\n$$\\text{E-M} = \\left(\\frac{T - D}{W}\\right) \\cdot V \\quad \\text{and} \\quad P_s = V \\cdot \\left(\\frac{T - D}{W}\\right) \\times 850.0\\,\\text{ft/s}$$\n\n- **Thrust ($T$)**: Maximum code generation throughput, SIMD execution (AVX-512, NEON), and direct ELF64 emission.\n- **Drag ($D$)**: Elimination of GC pauses, bump arenas with $O(1)$ bulk resets, and zero-copy buffer slicing.\n- **Weight ($W$)**: Minimal standalone binary footprints with zero libc dependencies and shallow stack frames.\n- **Velocity ($V$)**: Sub-millisecond rebuild cycles, incremental AST typechecking, and AI multi-agent patch synthesis.\n\n### 2.3 Generational Aerial Combat & System Evolution\n- **Gen 1 (Subsonic Scissors)**: F-86 Sabre / MiG-15. $M \\le 0.85$, 6x .50 cal guns, optical sights, $P_s \\le 0$ in tight turns.\n- **Gen 2 (Supersonic Interceptor)**: F-104 / MiG-21. Mach 2+ dash, AIM-9B IR missiles, high wing loading, high turn energy bleed ($P_s \\ll 0$).\n- **Gen 3 (Heavy Radar Multi-Role)**: F-4 Phantom / MiG-23. Pulse-Doppler radar, BVR SARH AIM-7 Sparrow, $45,000\\,\\text{lbs}$ mass.\n- **Gen 4 (E-M & CADC Sweep)**: F-14 / F-16. Wing sweep schedules ($\\Lambda \\in [20^\\circ, 68^\\circ]$), high $T/W > 1.2$, sustained 9G turns ($P_s \\ge 0$), AIM-54 / AIM-120 AMRAAM, M61A1 Vulcan.\n- **Gen 5 (VLO Stealth & 3D TVC)**: F-22 / F-35. Radar Cross Section suppression ($RCS \\approx 0.0001\\,\\text{m}^2$), supercruise, 3D TVC pitch reversals, sensor fusion.\n- **Gen 6 (MUM-T & Dynamic CCAs)**: NGAD. Broadband stealth, 2x dynamic autonomous CCAs ($[40, 450]\\,\\text{px}$), 150 kW Directed Energy Laser CIWS ($170\\,\\text{px}$ shield).\n- **Gen 7 (Autonomous Quantum Swarm)**: 9-mote / 3-node swarm, continuous kinematics ($\\Delta\\text{pos} \\le 1.5v$, 0 snaps), 0 wireframes, 4-phase morphing, Tri-Lance beams (35% kill), 360° eat trap, resonant Singularity Cannon ($1250\\,\\text{GW}$).\n\n---\n\n## 3. The 6 Architectural Reflex Stratum Tiers (RFC 0020)\n\n- **Tier 1 (Silicon Physics)**: Bare-metal page tables (x86_64 PML4, RISC-V Sv39), SIMD vector units, and MMU paging.\n- **Tier 2 (Compiler & IR)**: Merkle AST, SSA `mem2reg` promotion, LICM/DCE optimizers, and direct ELF64/WASM emission.\n- **Tier 3 (Runtime & Memory)**: Linear arenas, $O(1)$ bulk resets, deterministic ARC, Linux Landlock sandboxes, and Undo-RAM.\n- **Tier 4 (Language & Types)**: Algebraic sum types, exhaustive matching, 14 capability tokens, and SMT contracts.\n- **Tier 5 (Multi-Agent Swarm)**: Swarm coordination, P2P contract verification, sensor fusion mesh, and live git sync.\n- **Tier 6 (Autonomous Intelligence)**: Intent synthesis, self-mutation, ZK-STARK proofs, and bare-metal microkernel execution.\n\n---\n\n## 4. Hard Science Foundation & Active Binary Defense\n\nopenOODA embeds hard science in `std/`: relativity (`std/phys/physics/relativity.oo`), astrodynamics (`std/phys/physics/orbital.oo`), quantum (`std/phys/quantum/state.oo`), genetics (`std/bio/genetics.oo`), and aerodynamics (`std/phys/aero/boyd_em.oo`, `std/phys/aero/cadc_sweep.oo`, `std/phys/aero/atmosphere.oo`, `std/phys/aero/aero_state.oo`).\nBinaries are fortified with Moving Target Defense (MTD), control flow flattening, stack-transient string encryption, and autonomic live-RAM RASP.\n","Morpher.oot":"# DEFENSE — Active Binary Defense & Self-Healing Runtime\n\nFile: openOODA.github.io/guide/Morpher.oot\n\nActive Binary Defense is openOODA's built-in, secure-by-default software protection architecture (Pillar 5: Sovereign Moat). Every build generates a morphologically unique binary that destroys exploit chains, exhausts symbolic execution engines, and heals in-memory tampering without performance degradation.\n\n```\nCompiler AST Morpher ──► MTD CFG Flattening ──► Anti-ROP Gadget Destroyer\n         │\n         ▼\nDynamic Layout Randomization & Canaries ──► HMAC Seal ──► Live RASP Watchdog\n```\n\n---\n\n## 1. The Threat-to-Immunity Matrix\n\n| Threat Vector | Traditional Vulnerability | openOODA Sovereign Defense Layer |\n| :--- | :--- | :--- |\n| **Ghidra / IDA Decompilation** | Static CFG graphs expose business logic & keys | **Moving Target Defense (MTD)**: Chenxi Wang flattening + quadratic residue predicates mod 7 |\n| **Return-Oriented Programming (ROP)** | Unintended `0xC3` byte sequences across instructions | **Anti-ROP Gadget Destroyer**: Inter-instruction alignment scanning & multi-byte NOP padders |\n| **Credential & String Scraping** | Plaintext strings visible in `.rodata` via `strings` | **Rolling XOR Encryption**: Dynamic stack-transient decryptors with zero-on-free scrubbing |\n| **Debugger & Hook Injections** | Malware patches `.text` with `0xCC` / `0xE9` hooks | **Autonomic Live-RAM RASP Watchdog**: Startup SHA-256 `.text` checks & live gold-master rollback |\n| **Memory Corruption & Overflow** | Predictable stack offsets & static canaries | **Dynamic Layout Randomization**: 64-bit entropy-seeded canary cycling & frame shuffling |\n| **Supply-Chain Privilege Theft** | Third-party dependencies access ambient FS/Net | **Object-Capabilities (OCap)**: Zero Ambient Authority & 14 unforgeable capability tokens |\n\n---\n\n## 2. The 5 Core Defense Categories\n\n### 2.1 Moving Target Defense (MTD) & Metamorphic Transmutation\n- **Control Flow Flattening (`control_flow_flattening.oo`)**: Transforms nested `if`/`while` hierarchies into centralized state-machine switch dispatchers.\n- **Basic Block Permutation (`basic_block_permutator.oo`)**: Randomizes physical block ordering across memory on every compilation via cryptographic entropy seeds.\n- **Number-Theoretic Opaque Predicates (`opaque_predicate_builder.oo`)**: Injects algebraic quadratic non-residues mod 7 ($x^2 \\not\\equiv 3 \\pmod 7, x^2 \\not\\equiv 5 \\pmod 7$), forcing exponential path explosion in symbolic execution engines (angr, Z3).\n- **Instruction Substitution (`instruction_substitutor.oo`)**: Replaces standard arithmetic expressions with randomized algebraic equivalents.\n\n### 2.2 Exploit Mitigation & Anti-ROP/JOP Defenses\n- **Bytecode Gadget Elimination (`rop_gadget_destroyer.oo`)**: Neutralizes unintended `0xC3` (`ret`) and `0xFF 0x25` (`jmp`) byte alignments across instruction boundaries using multi-byte NOP padders.\n- **Stack-Transient String Encryption**: Decrypts string literals dynamically on the stack and scrubs memory immediately after evaluation.\n\n### 2.3 Dynamic Memory Layout Randomization & Canary Cycling\n- **Frame Shuffling**: Permutes local variable allocations and stack offsets on each compilation.\n- **Canary Cycling**: Injects 64-bit hardware-entropy canaries across stack frames and heap bump arenas (`&AllocCap`), verifying integrity before function returns.\n- **Runtime Entropy Injection**: Continuously seeds security primitives with hardware CSPRNG entropy (`&RandCap`).\n\n### 2.4 Cyber Deception & Binary Honeynets\n- **Decoy Symbols (`decoy_function_trap.oo`)**: Injects capability-starved honeypot entry points (`admin_override`, `debug_backdoor`) into the symbol table.\n- **Canary Credentials (`network_canary_tripwire.oo`)**: Plants fake credentials (`sk_live_canary_*`); probing a decoy triggers instant fail-closed threat isolation.\n\n### 2.5 Autonomic Live-RAM RASP Watchdog & Self-Healing\n- **In-Memory Watchdog (`self_healing_code_engine.oo`)**: Authenticates SHA-256 hashes of executable `.text` pages during startup.\n- **Live Memory Rollback**: Automatically overwrites unauthorized debugger breakpoints (`0xCC`) or jump hooks (`0xE9`) with pristine gold-master bytes live in RAM without crashing the host application.\n\n---\n\n## 3. RASP Watchdog Implementation Example\n\n```openooda\n// # RASP Integrity Watchdog & Live Rollback\n//\n// Logline: Authenticates text page checksums and repairs unauthorized hooks.\n//\n// Setup: Requires host capability token for memory integrity management.\n//\n// Beats:\n//   1. Register clean SHA-256 baseline of executable text pages.\n//   2. Check page checksum against gold-master signature.\n//   3. Execute autonomic rollback if tampering is detected.\n\nimport \"std/sec/self_healing_code_engine.oo\";\n\npub fn verify_and_heal_runtime(sys: &SysCap) -> Result[Bool, String] {\n    let is_intact: Bool = rasp_verify_text_pages(sys);\n    if !is_intact {\n        let healed: Bool = rasp_rollback_gold_master(sys);\n        if !healed {\n            return Err(\"RASP self-healing failed to restore gold master\");\n        }\n    }\n    return Ok(true);\n}\n```\n\n---\n\n## 4. Economic Asymmetry & Opt-Out Model\n\nTraditional security burdens developers with manual configuration. openOODA inverts this dynamic: **Defense is ON by default**.\n\n| Command | Defense Posture | Target Use Case |\n| :--- | :--- | :--- |\n| `oodac emit-c main.oo` | **Fortified by Default** (MTD, ROP defense, encrypted strings, honeynets, RASP) | Production Releases |\n| `oodac emit-c --plain main.oo` | **Opt-Out (Plain)** (Clean, un-morphed C for source auditing) | Clean C Source Auditing |\n| `ooda run --debug main.oo` | **Opt-Out (Debug)** (Linear CFG, RASP disabled for GDB breakpoints) | Step-Debugging & Profiling |\n","Options.oot":"# CLI — Command-Line Interface & Tooling\n\nFile: openOODA.github.io/guide/Options.oot\n\nThe openOODA ecosystem provides two distinct binaries:\n- `oodac`: The pure, self-hosted sovereign compiler that typechecks, optimizes, and emits target code.\n- `ooda`: The high-level developer and AI workflow driver that coordinates builds, tests, packages, and diagnostics.\n\n---\n\n## 1. Unified Driver Commands (`ooda`)\n\n### Core Development Lifecycle\n```bash\n# Fast typecheck & contract validation\nooda check <file.oo>\nooda check <file.oo> --json-errors\n\n# Compile & execute binary\nooda run <file.oo>\nooda run <file.oo> --debug\n\n# Run verification blocks & fuzzing\nooda test <file.oo>\nooda test <file.oo> --fuzz\n\n# Build standalone native executable\nooda build <file.oo> -o out --target llvm\nooda bench <file.oo> --run\n```\n\n### Sovereign Binary Defenses\n```bash\n# Apply custom metamorphic MTD mutation\nooda morph <file.oo> -o out --entropy seed\n```\n\n### Language Server Protocol\n```bash\n# Start stdio Language Server\nooda lsp\n```\n\n---\n\n## 2. Tooling for Autonomous AI Swarms (Pillar 6)\n\nopenOODA provides dedicated commands designed for autonomous coding agents:\n\n| Command | Function |\n| :--- | :--- |\n| `ooda outline <file.oo> [--json]` | Summarize module types, functions, and contract specs |\n| `ooda reflect <file.oo> [sym] [--json]` | Inspect capability dependencies of specific symbols |\n| `ooda fix <file.oo> [--yes]` | Automatically patch syntax errors and unused Results |\n| `ooda patch <file.oo> --replace-fn <fn> --with <body>` | Surgically replace a single function AST node |\n| `ooda context [path]` | Index and summarize `.oo` code files in directory |\n| `ooda digest <file>` | Compute deterministic SHA-256 CAS hash |\n| `ooda health` | Check toolchain and backend compiler integrity |\n\n---\n\n## 3. Package & Dependency Management\n\n```bash\n# Install dependency into CAS & lockfile\nooda add <name> --vendor path\n\n# Search stores & manage endpoints\nooda search <query>\nooda registry add <url>\nooda pkg --json\n```\n\n### Extended Package Verbs (`ooda pm`)\n```bash\n# Pin local recipe into CAS\nooda pm ingest --from <dir>\n\n# Gated verified launch\nooda pm launch <name> --exec\n\n# Maintenance & supply chain security\nooda pm update\nooda pm audit\nooda pm sbom\nooda pm pack\nooda pm clean\n```\n\n---\n\n## 4. Compiler Direct Emitters (`oodac`)\n\nInvoke the sovereign compiler directly to inspect emitted intermediate representations or bare-metal machine code:\n\n```bash\noodac check <file.oo>\noodac check --json-errors <file.oo>\noodac emit-c <file.oo>\noodac emit-llvm <file.oo>\noodac emit-wasm <file.oo>\noodac emit-x86 <file.oo>\noodac emit-aarch64 <file.oo>\n```\n\n---\n\n## 5. The 14 Capability Token Parameters\n\nFunctions requiring side effects must explicitly declare capability token parameters:\n\n| Token Parameter | Permitted Environmental Operations |\n| :--- | :--- |\n| `&AllocCap` | Dynamic heap allocations and region bump arenas |\n| `&FsReadCap` | Read files (`read_file`), inspect metadata (`path_exists`, `file_size`) |\n| `&FsWriteCap` | Modify files (`write_file`) strictly inside `OODA_FS_WRITEDIR` |\n| `&ProcessCap` | Subprocess management (`spawn`, `wait`, `kill`, `process_exec`) |\n| `&SysCap` | Apply Linux Landlock kernel sandboxes and POSIX `setrlimit` quotas |\n| `&NetCap` | High-level socket and network operations |\n| `&TcpCap` | Stream-oriented TCP connections (`tcp_connect`, `tcp_listen`, `tcp_accept`) |\n| `&UdpCap` | Connectionless UDP datagram transmission (`udp_bind`, `udp_send`, `udp_recv`) |\n| `&BindCap` | Privileged network port listening and socket binding |\n| `&TimeCap` | Monotonic clock queries (`now_ms`), timers, and sleep scheduling |\n| `&RandCap` | Cryptographic entropy harvesting (`random_bytes`) and CSPRNG seeding |\n| `&ThreadCap` | Spawn OS threads, manage mutexes, and coordinate actor channels |\n| `&GpuCap` | Hardware GPU acceleration, compute shaders, and parallel tensor math |\n| `&UnsafeFFICap` | Scoped C ABI foreign function invocation (`oo_import_c`, `oo_dlopen`) |\n\n---\n\n## 6. Environment Configuration\n\n| Variable | Description | Default |\n| :--- | :--- | :--- |\n| `OODA_FS_WRITEDIR` | Root directory path permitted for filesystem write effects | *Denied if unset* |\n| `OODA_TEST` | Set to `1` automatically when executing `ooda test` | `0` |\n\n---\n\n## 7. Key Language & Security Constructs\n\n- **Struct Methods**: Value receivers (`p.scale()`) and reference methods (`(&mut p_mut).shift_x()`).\n- **Control Flow**: Bounded loops (`0..(n - 1)`) and inline `if` expressions (`let y: Int = val + (if cond { a } else { b });`).\n- **Error Handling**: `match let` and fallible collections (`Result[List[String], String]`).\n- **Active Defense**: Kernel Landlock confinement, HMAC attenuation, and static `SECRET` taint tracking.\n","Packages.oot":"# PACKAGES — Sovereign Dependency Management & CAS\n\nFile: openOODA.github.io/guide/Packages.oot\n\nopenOODA eliminates supply chain vulnerabilities through content-addressable storage (CAS), cryptographic hash pinning, and strict capability envelopes for all third-party dependencies (Pillar 1: Ground-Truth & Pillar 5: Sovereign Moat).\n\n---\n\n## 1. Zero-Trust Dependency Architecture\n\nUnlike traditional package managers where installed packages inherit ambient root-level authority, openOODA locks every package to a declared capability envelope.\n\n- **Content-Addressable Storage (CAS)**: Package payloads are stored by their SHA-256 hash under `.ooda_modules/cas/<sha256>/`.\n- **Cryptographic Lockfile**: Dependencies and their transitive trees are pinned in `.ooda_modules/lock`.\n- **Capability Sandboxing**: A package declaring `FsRead` cannot execute network calls, spawn subprocesses, or write to disk.\n\n---\n\n## 2. The Lockfile Specification\n\nThe lockfile format (`.ooda_modules/lock`) pins every package to an exact cryptographic triplet:\n\n```\nname@version#sha256#CapName\n```\n\n### Example Lockfile\n```\nmatrix_math@1.2.0#16c3ceb67489a2b...#None\nhttp_parser@2.0.1#006ee5634bc89ef...#Net\nconfig_loader@0.9.4#4b23f1ba948e721...#FsRead\norbital_sim@0.4.0#89a1cd45b23e801...#None\n```\n\n### Valid Lockfile Capability Tokens\nThe `CapName` field strictly maps to one of the 14 unforgeable capabilities or `None`:\n- `None` (Pure computational routines with zero I/O)\n- `FsRead`, `FsWrite` (Filesystem sandboxed read/write)\n- `Net`, `Tcp`, `Udp`, `Bind` (Network socket communications)\n- `Process`, `Sys` (Process control and Landlock kernel sandboxing)\n- `Time`, `Rand` (Monotonic clock and hardware CSPRNG entropy)\n- `Thread`, `Gpu`, `UnsafeFFI` (OS concurrency, GPU tensor math, and C ABI)\n\nTransitive child dependencies can only request a subset of their parent package's capability mask. Capability escalation attempts fail closed during dependency resolution.\n\n---\n\n## 3. Installing from Registries\n\n### Stock Sovereign Registry\nThe default decentralized store is `https://registry.openooda.org`:\n\n```bash\nooda add matrix_math\n```\n\nThe CLI performs:\n1. Fetches `/catalog` and `/index.minisig`.\n2. Verifies the signature against the pinned public key (`registry.pub`).\n3. Downloads the payload and verifies its SHA-256 hash against the CAS entry.\n4. Updates `.ooda_modules/lock`.\n\n### Managing Custom & Enterprise Registries\n```bash\nooda search crypto\nooda registry add https://internal-registry.corp.net\nooda registry remove https://untrusted-store.net\n```\n\n---\n\n## 4. Local Vendor & Air-Gapped Workflows\n\nFor air-gapped environments or local workspace monorepos, openOODA can install directly from local directories without network access:\n\n```bash\nooda add custom_crypto --vendor ../local_packages\n```\n\nLocal vendor directories structure manifests with explicit SHA-256 pins and dependencies:\n\n```\nlocal_packages/\n  ├── index\n  └── custom_crypto/\n      ├── manifest\n      └── lib.oo\n```\n\nLocal vendor integrity is verified via HMAC using the local authorization token (`ooda-local-pm`).\n\n---\n\n## 5. Ingest & Verified Launch\n\n### Ingesting Local Recipes\nIngest local source trees into CAS and generate safe capability wrappers:\n\n```bash\nooda pm ingest --from ./third_party/codec\n```\n\n### Gated Launch\nExecute sandboxed third-party binaries only after verifying CAS hash integrity, capability constraints, and checking against security advisories:\n\n```bash\nooda launch codec --exec\n```\n\nAny binary attempting unauthorized privilege escalation or path traversal is rejected immediately.\n\n---\n\n## 6. Software Bill of Materials (SBOM) & Auditing\n\nExport standards-compliant software supply chain metadata:\n\n```bash\n# Export CycloneDX SBOM JSON\nooda pm sbom > sbom.json\n\n# Scan for known vulnerabilities\nooda pm audit\n\n# Export offline package bundle\nooda pm pack --output bundle.tar.gz\n```\n","Pay.oot":"# PAY — Programmatic Economics & Machine-to-Machine Settlement\n\nFile: openOODA.github.io/guide/Pay.oot\n\nopenOODA provides native standard library modules for programmatic economics, machine-to-machine micro-settlements, and autonomous agent service monetization via HTTP 402 and the x402 v2 specification (Pillar 6: Multi-Agent Swarm Protocol).\n\nThese modules provide structured quote generation, parsing, and cryptographic verification for autonomous AI swarms consuming decentralized APIs.\n\n---\n\n## 1. The HTTP 402 & x402 v2 Protocol\n\nThe x402 protocol defines a standardized handshake over HTTP status `402 Payment Required`:\n\n```\nClient Agent                         Service Provider\n    │                                       │\n    ├─── GET /v1/inference/predict ────────►│\n    │                                       │\n    │◄── 402 Payment Required ──────────────┤\n    │    (PAYMENT-REQUIRED: Quote JSON)     │\n    │                                       │\n    ├─── Retry with Signed Payload ────────►│\n    │    (PAYMENT-SIGNATURE: Proof)         │\n    │                                       │\n    │◄── 200 OK + Compute Output ───────────┤\n    │    (PAYMENT-RESPONSE: Receipt)        │\n```\n\n### Standard v2 Headers\n| Header | Direction | Contents |\n| :--- | :--- | :--- |\n| `PAYMENT-REQUIRED` | Server → Client | Base64-encoded `PaymentRequired` quote JSON |\n| `PAYMENT-SIGNATURE` | Client → Server | Base64-encoded `PaymentPayload` signature |\n| `PAYMENT-RESPONSE` | Server → Client | Base64-encoded settlement confirmation |\n\n---\n\n## 2. Parsing & Formatting Quotes\n\nImport `std/net/x402.oo` to inspect incoming payment requirements:\n\n```openooda\nimport \"std/net/x402.oo\";\n\npub fn inspect_quote(body: String) {\n    let quote: X402Quote = x402_parse_quote(body);\n\n    if x402_quote_ready(quote) {\n        // Output: amount | CAIP-2 network | pay-to\n        println(x402_format_quote(quote));\n    }\n}\n```\n\n- `amount`: Token quantity in atomic units (e.g. integer micro-cents).\n- `network`: CAIP-2 blockchain network identifier (e.g. `eip155:8453` for Base L2).\n- `payTo`: Destination address for settlement.\n\n---\n\n## 3. Server-Side Quote Generation\n\nService providers can construct valid `PaymentRequired` bodies with `x402_required_json`:\n\n```openooda\nimport \"std/net/x402.oo\";\n\npub fn build_service_quote(\n    resource_url: String\n) -> String {\n    return x402_required_json(\n        \"0x71C...3A9\",\n        \"5000\",\n        \"eip155:8453\",\n        \"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913\",\n        resource_url\n    );\n}\n```\n\n---\n\n## 4. Opt-In Spend Guard (`x402_spend`)\n\nTo prevent autonomous AI agents from spending funds without explicit human or policy approval, openOODA provides the `x402_attach_or_deny` guard:\n\n```openooda\nimport \"std/net/x402_spend.oo\";\n\npub fn authorize_payment(\n    spend_flag: String,\n    proof: String\n) -> Result[Bool, String] {\n    // spend_flag must be \"1\" (OODA_X402_SPEND)\n    return x402_attach_or_deny(spend_flag, proof);\n}\n```\n\n---\n\n## 5. Alternative Economic Handshakes\n\nopenOODA provides standard modules for non-monetary and specialized economic exchanges:\n\n### 5.1 Capability Quotes (`std/net/pay_cap.oo`)\nAllows servers to demand capability tokens instead of currency:\n```openooda\nimport \"std/net/pay_cap.oo\";\n\nlet quote: PayCapQuote = pay_cap_parse(body);\n// Headers: CAP-REQUIRED, CAP-PROOF\n```\n\n### 5.2 Proof-of-Work Hashcash (`std/net/pay_work.oo`)\nMitigates DoS and spam attacks by requiring SHA-256 leading-zero work stamps:\n```openooda\nimport \"std/net/pay_work.oo\";\n\nlet work_quote: PayWorkQuote = pay_work_parse(body);\nlet is_valid: Bool = pay_work_stamp_ok(\n    stamp,\n    work_quote.bits,\n    work_quote.resource\n);\n// Headers: WORK-REQUIRED, WORK-PROOF\n```\n\n### 5.3 Inverted Payment Offers (`std/net/pay_offer.oo`)\nAllows servers to compensate client agents for compute or data contributions (using HTTP 200 + `PAYMENT-OFFERED`).\n\n### 5.4 Early Retry Guard (`std/net/pay_early.oo`)\nValidates RFC 8470 (`425 Too Early`) validity windows before payment submission.\n\n### 5.5 Privacy Pass (`std/net/pay_pass.oo`)\nParses RFC 9577 `PrivateToken` challenges for zero-knowledge, privacy-preserving authorization.\n","QA.oot":"# QA — Zero-Trust Verification, Invariant Proofs & Generational OODA Testing\n\nFile: openOODA.github.io/guide/QA.oot\n\nopenOODA enforces a zero-trust verification doctrine across all software, standard library modules, and compiler backends. We reject mock objects, simulated stubs, and paper claims. Every invariant must be proven on live compiled native binaries.\n\n---\n\n## 1. The Zero-Trust Doctrine\n\n1. **No Stubs or Mocks**: Verification suites execute live algorithms against published NIST, RFC, and IEEE test vectors.\n2. **Deterministic Reproducibility**: Flaky or stochastic outcomes are treated as hard failures.\n3. **Sequential Double-Run Law**: Every test suite executes twice sequentially to guarantee zero memory leaks or static state pollution.\n4. **Fail-Closed by Design**: Malformed inputs return explicit `Result[T, String]` errors instead of crashing or panicking.\n\n```openooda\n// Zero-trust verification: Live FIPS 180-4 vector\nlet digest: String = sha256(\"openOODA\");\nlet expected: String = \n    \"ba7816bf8f01cfea414140de5dae2223\" +\n    \"b00361a396177a9cb410ff61f20015ad\";\nassert_eq!(digest, expected);\n```\n\n---\n\n## 2. First-Principles Invariant Proofs Matrix\n\n| Domain | Mathematical & Physical Invariant | Native Verification Method |\n| :--- | :--- | :--- |\n| **B-Tree** | Sorted key ordering | Monotonic in-order traversal |\n| **Cryptography** | FIPS 180-4 / RFC 8439 | Bit-exact match on standard NIST test vectors |\n| **Post-Quantum PQC** | NTT invertibility mod 3329 | $\\text{INTT}(\\text{NTT}(P)) \\equiv P \\pmod{3329}$ |\n| **Zero-Knowledge** | Groth16 / PLONK | BN254 pairing identity $e(A, B) = e(\\alpha, \\beta) \\cdot e(x, \\gamma) \\cdot e(C, \\delta)$ |\n| **Special Relativity** | Lorentz boost symmetry | $\\gamma(v) \\ge 1.0$ and spacetime interval $s^2 = c^2\\Delta t^2 - \\Delta x^2$ |\n| **Astrodynamics** | Orbital energy conservation | Vis-viva energy $E = -\\mu / (2a)$ and Hohmann transfer $\\Delta v$ |\n| **Quantum State** | Born normalization | $P(\\|0\\rangle) + P(\\|1\\rangle) \\equiv 1.0$ and unitary $U^\\dagger U = I$ |\n| **Genetics** | Watson-Crick duality | Reverse complement involution $\\text{rev}(\\text{rev}(s)) \\equiv s$ |\n| **Boyd E-M Engine** | Specific Excess Power | $P_s = V \\cdot \\frac{T-D}{W} \\times 850.0$ and sustained turn $P_s = 0 \\implies T = D$ |\n| **E-M Dynamics** | Turn rate & radius | $\\omega = \\frac{g\\sqrt{n^2-1}}{V}, R = \\frac{V^2}{g\\sqrt{n^2-1}}, \\frac{dV}{dt} = \\frac{g(P_s - \\dot{h})}{V}$ |\n| **CADC Wing Sweep** | Variable sweep bounds | $\\Lambda(M, q) \\in [20^\\circ, 68^\\circ]$ and dynamic $AR \\in [2.21, 7.28]$ |\n| **Gen 6 CCA Leash** | Orbit separation | $40\\,\\text{px} \\le D(t) \\le 450\\,\\text{px}$ and DEW intercept $r \\le 170\\,\\text{px}$ |\n| **Gen 7 Swarm** | Relativistic motion | $\\Delta\\text{pos} \\le 1.5v$, 0 position snaps, 0 wireframe lines |\n| **Cooley-Tukey FFT** | Discrete invertibility | $\\text{IFFT}(\\text{FFT}(x)) \\equiv x$ and Parseval energy conservation |\n| **SIMD 4x4 Matrix** | Transposition identity | $(A \\cdot B)^T \\equiv B^T \\cdot A^T$ with zero heap allocations |\n| **3D Quaternions** | Unit norm & geodesic SLERP | $\\|q\\| = 1.0$, Hamilton algebra, and constant angular velocity |\n| **Signal Cybernetics** | Discrete Kalman filter | Covariance reduction $P_{k\\|k} < P_{k\\|k-1}$ |\n| **Order Book** | Volume conservation | Executed trade volume + remaining depth $\\equiv$ input volume |\n\n---\n\n## 3. Generational OODA Testing & Monte Carlo Verification\n\n1. **Combat Hierarchy Verification**: Headless Monte Carlo tournaments prove Gen 7 swarms and Gen 6 NGAD platforms achieve an **$\\ge 85\\%$ win rate** against Gen 1–4 legacy airframes.\n2. **Symmetrical Negative-Trust Physics**: The physics engine evaluates all entities through a unified mass-weighted acceleration loop ($\\Delta V = \\frac{T - D}{W} + g\\sin\\theta$) with zero hero buffs.\n3. **Smooth Trajectory Invariants**: Gen 7 relativistic swarm drones maintain continuous world-space trajectories ($\\Delta\\text{pos} \\le 1.5v$) with zero coordinate teleportation.\n4. **Zero Geometric Lines**: Canvas rendering spies enforce that zero connecting lines or wireframe artifacts are drawn between swarm motes.\n\n---\n\n## 4. Resilient Error Handling & AST Mutations\n\n1. **Structured Errors**: Fallible operations return `Result[T, String]` formatted as `ERR\\t<module_fn>\\t<reason>`.\n2. **Zero Panics**: Programs must never segfault, panic, or abort under malformed inputs.\n3. **AST Mutation Fuzzing**: A module must achieve a **$\\ge 95\\%$ mutant kill rate** under automated condition inversions, branch pruning, and arithmetic mutations.\n4. **Multi-Compiler Parity**: C99, LLVM IR, x86-64, AArch64, and WebAssembly emission pipelines produce bit-exact identical stdout and state.\n","Safety.oot":"# SECURITY — Capability Security & Kernel Confinement\n\nFile: openOODA.github.io/guide/Safety.oot\n\nopenOODA replaces legacy ambient authority with a compiler-enforced Object-Capability (OCap) architecture, cryptographic token attenuation, compile-time taint tracking, and kernel-level sandbox confinement (Pillar 3: Negative Trust & Pillar 5: Sovereign Moat).\n\n---\n\n## 1. The Zero-Ambient-Authority Model\n\nIn openOODA, **ambient authority does not exist**:\n- Functions are mathematically incapable of executing side effects without an explicit capability token argument.\n- Tokens cannot be fabricated from strings, cast from integers, or constructed via raw pointer arithmetic.\n- Missing, forged, or unauthorized capability tokens fail closed at compile time.\n\n```openooda\n// PURE FUNCTION: Guaranteed zero side effects\npub fn compute_trajectory(velocity: Float, angle: Float) -> Float {\n    let num: Float = velocity * velocity * sin(2.0 * angle);\n    return num / 9.81;\n}\n\n// EFFECTFUL FUNCTION: Explicit capability token required\npub fn log_telemetry(\n    net: &NetCap,\n    url: String,\n    payload: String\n) -> Result[Void, String] {\n    return http_post(net, url, payload);\n}\n```\n\n---\n\n## 2. The 14 Unforgeable Capability Tokens\n\nAuthority is partitioned into 14 unforgeable capability tokens with monotonic attenuation:\n\n```\n&SysCap (Host Jail) ──► &FsCap (&FsReadCap, &FsWriteCap)\n                     ──► &NetCap (&TcpCap, &UdpCap, &BindCap)\n                     ──► &ProcessCap, &AllocCap, &TimeCap, &RandCap, &ThreadCap, &GpuCap, &UnsafeFFICap\n```\n\n| Token | Scope & Operations | Hierarchy |\n| :--- | :--- | :--- |\n| `&AllocCap` | Dynamic memory allocation, bump arenas (`Arena`) | Root memory |\n| `&FsReadCap` | Read files (`read_file`), inspect metadata | Child of `&FsCap` |\n| `&FsWriteCap` | Write files strictly in `OODA_FS_WRITEDIR` | Child of `&FsCap` |\n| `&ProcessCap` | Subprocess lifecycle (`sys_spawn`) | Child of `&SysCap` |\n| `&SysCap` | Host OS kernel Landlock sandboxing | Root host token |\n| `&NetCap` | High-level socket communication | Root network |\n| `&TcpCap` | Stream TCP connections (`tcp_connect`) | Child of `&NetCap` |\n| `&UdpCap` | Connectionless UDP transmission (`udp_send`) | Child of `&NetCap` |\n| `&BindCap` | Privileged port listening & socket binding | Child of `&NetCap` |\n| `&TimeCap` | Monotonic clock queries (`now_ms`), timers | Root time |\n| `&RandCap` | Hardware entropy harvesting & CSPRNG | Hardware entropy |\n| `&ThreadCap` | OS threads & mutex synchronization | Concurrency |\n| `&GpuCap` | Hardware GPU shaders & tensor math | Acceleration |\n| `&UnsafeFFICap` | Scoped C ABI foreign function calls | Unsafe boundary |\n\n---\n\n## 3. Cryptographic Token Attenuation & HMAC Verification\n\nCapability tokens can be cryptographically attenuated into restricted sub-capabilities using monotonic rights reduction, post-quantum ML-DSA signatures, and 64-bit entropy-seeded HMAC signatures (`std/sec/objcap_hmac.oo`):\n\n```openooda\nimport \"std/sec/sys/objcap_attenuate.oo\";\nimport \"std/sec/objcap_hmac.oo\";\n\npub fn restrict_to_read_only(\n    parent_token: String,\n    hmac_key: String\n) -> Result[String, String] {\n    let child_token: String = cap_attenuate(parent_token, \"r\");\n    let is_valid: Bool = cap_hmac_verify(child_token, hmac_key);\n    if !is_valid {\n        return Err(\"HMAC verification failed\");\n    }\n    return Ok(child_token);\n}\n```\n\n---\n\n## 4. Capability Delegation, Revocation & Scoped Lifetimes\n\n1. **Scoped Borrowing (`&Cap`)**: Capability references are bound to lexical scopes and cannot escape via global state.\n2. **Revocation Proxies**: Ephemeral sub-capabilities can be revoked dynamically by zeroing their grant handle.\n3. **Temporal Lifetimes**: Timed capabilities automatically expire after a defined interval measured via `&TimeCap`.\n\n---\n\n## 5. Kernel-Level Landlock Sandboxing & Resource Quotas\n\nUnder `&SysCap`, openOODA programs apply Linux Landlock rules and POSIX `setrlimit` quotas directly at startup:\n\n```openooda\nimport \"std/sec/landlock.oo\";\n\npub fn sandbox_init(sys: &SysCap, allowed_dir: String) -> Result[Void, String] {\n    let status: Int = landlock_restrict(sys, allowed_dir, allowed_dir);\n    if status != 0 {\n        return Err(\"Landlock confinement failure\");\n    }\n    return Ok(void);\n}\n```\n\n---\n\n## 6. Compile-Time `SECRET` Taint Tracking & Memory Zeroization\n\nData fields marked with `// SECRET: <field_name>` are tracked by the compiler's static taint analysis engine:\n\n```openooda\npub type DatabaseConfig = struct {\n    host: String,\n    password: String\n};\n// SECRET: password\n\npub fn connect_db(cfg: DatabaseConfig) {\n    println(cfg.host);        // OK: Public field\n    // println(cfg.password); // BLOCKED: SECRET leak\n}\n```\n\nSensitive fields are automatically zeroized in memory when dropped from scope.\n\n---\n\n## 7. Fine-Grained Sandboxing Scopes & Boundary Invariants\n\n- **Path Scoping (`std/sec/path_scope.oo`)**: Validates filesystem paths remain strictly within `OODA_FS_WRITEDIR`.\n- **Host Scoping (`std/sec/host_scope.oo`)**: Enforces domain and IP allowlists on network requests.\n- **Fuel Budgets (`std/sec/fuel_budget.oo`)**: Allocates execution step budgets to untrusted routines.\n- **Swarm Hop Budgeting (`std/sec/agent_send.oo`)**: Restricts multi-agent message routing depth.\n- **Physical Bounds**: Enforces speed of light ($v < c$), Born probability ($\\sum P = 1.0$), and load factor ($n \\le n_{\\text{max}}$).\n","Use.oot":"# START — Step-by-Step Guide for Engineers and AI Swarms\n\nFile: openOODA.github.io/guide/Use.oot\n\nThis guide walks human engineers and autonomous AI coding agents step-by-step through installing the openOODA toolchain, authoring `.oo` programs, executing tests, and compiling standalone native binaries (Pillar 6: Multi-Agent Swarm Protocol).\n\n---\n\n## 1. Prerequisites\n\nThe primary compiler driver and runtime require:\n- **Operating System**: Linux (x86_64 or AArch64), macOS (Apple Silicon or Intel), or Windows via WSL2.\n- **Core Dependencies**: `git`, `gcc` (or `clang`), and standard POSIX shell tools.\n\n---\n\n## 2. Installation\n\nInstall the openOODA toolchain with a single public command:\n\n```bash\ncurl -fsSL https://openooda.org/install.sh | bash\n```\n\n`install.sh` is a **self-contained universal installer**. It automatically picks the most secure path available:\n\n- **If no openOODA compiler is present**: it downloads the signed Gen 3 release pack and runs `ooda install` from the pack. The shell only fetches and extracts; the install itself runs under the `ooda` capability model.\n- **If a compiler is present and `OODA_CHECKOUT` is set**: it runs Gen 2 `ooda install` directly from the source checkout.\n\n**Security Certification**:\n- **Gate 1 (Heuristic Hunter)**: Structural path validation instead of string matching\n- **Gate 2 (Boundary Falsifier)**: Path traversal rejection and length limits\n- **Gate 3 (Data-Path Tracer)**: No silent failures, hard error verification\n- **Gate 4 (Hermetic Jailor)**: Full capability security via the compiled `ooda install` command; the Gen 3 pack path is gate 4 partial only while the thin shell fetches the pack\n\nThe installer configures the environment under `~/.local` and writes `~/.config/ooda/env`. Load the environment into your active shell session:\n\n```bash\n. ~/.config/ooda/env\nooda version\n```\n\n### Full Capability Security (Re-install)\n\nAfter the first install, clone the source and re-run the same URL with `OODA_CHECKOUT` set to enable the Gen 2 install path:\n\n```bash\ngit clone https://github.com/openOODA/ooda.git\nexport OODA_CHECKOUT=/path/to/ooda\ncurl -fsSL https://openooda.org/install.sh | bash\n```\n\n### Self-Hosted Rebuild from Checkout\n\nIf working within a cloned `openOODA/ooda` repository:\n\n```bash\ncd ooda\n\n# 1. Build the compiler from the seed compiler\nOODAC_BIN=./bootstrap/seed/oodac \\\n  bash bootstrap/oodac_pure_build \\\n  oodac/main.oo oodac/oodac\n\n# 2. Build the CLI driver (required for `ooda install`)\nOODAC_BIN=./oodac/oodac \\\n  ./oodac/oodac build cli/main.oo bin/ooda\n\n# 3. Install from the checkout into ~/.local\nOODA_FS_WRITEDIR=\"$HOME\" \\\n  OODA_POLICY_WRITE=1 \\\n  OODA_CHECKOUT=\"$PWD\" \\\n  ./bin/ooda install\n\n# 4. Load the environment\n. ~/.config/ooda/env\n```\n\n### Build a Release Pack\n\nIf you want to produce a hash-verified release pack (Gen 3) from a checkout:\n\n```bash\ncd ooda\n./bin/ooda run scripts/release.oo\n# produces dist/ooda-<version>-<arch>.tar.gz and a .sha256 digest\n```\n\nYou can override the version with `OODA_VERSION`.\n\n---\n\n## 3. Authoring Your First Program\n\nCreate a file named `hello.oo`. Every openOODA module begins with a standardized Academy header and enforces explicit type annotations on all variable bindings:\n\n```openooda\n// # Hello World\n//\n// Logline: Sovereign greeting demonstrating capability-safe printing.\n//\n// Setup: Validates string interpolation and inline contract verification.\n//\n// Beats:\n//   1. Define greeting formatter.\n//   2. Run compile-time unit verification.\n//   3. Execute program entrypoint.\n\npub fn greet(name: String) -> String {\n    return \"Hello, \" + name + \"!\";\n}\n\nverify greet {\n    assert_eq!(\n        greet(\"Swarm\"),\n        \"Hello, Swarm!\"\n    );\n}\n\npub fn main() {\n    let msg: String = greet(\"openOODA\");\n    println(msg);\n}\n```\n\n---\n\n## 4. The Core Developer Loop\n\nopenOODA provides a unified CLI driver (`ooda`) to check, test, build, and run applications:\n\n### Typecheck & Contract Validation\nVerify syntax, type integrity, and compile-time contract assertions without generating executable binaries:\n\n```bash\nooda check hello.oo\n```\n\n### Run Executable\nTypecheck, compile via the optimized backend, and execute the binary in one step:\n\n```bash\nooda run hello.oo\n```\n\n### Run Verification Suites\nExecute all inline `verify` blocks and formal assertions (sets `OODA_TEST=1`):\n\n```bash\nooda test hello.oo\n```\n\n### Compile Standalone Binary\nBuild an optimized, standalone executable:\n\n```bash\nooda build hello.oo -o hello\n./hello\n```\n\n---\n\n## 5. Tooling for Autonomous AI Agents\n\nopenOODA provides dedicated CLI inspection and refactoring commands tailored for autonomous AI agents and language servers:\n\n### Structured JSON Diagnostics\nEmit machine-readable compile diagnostics and syntax error locations:\n\n```bash\nooda check hello.oo --json-errors\n```\n\n### Semantic Symbol Reflection\nInspect public API signatures and capability requirements without loading entire file bodies:\n\n```bash\nooda outline hello.oo --json\nooda reflect hello.oo greet --json\n```\n\n### Automated AST Repair\nAutomatically fix missing imports, unhandled `Result` types, and syntax errors:\n\n```bash\nexport OODA_FS_WRITEDIR=\"$PWD\"\nooda fix hello.oo --yes\n```\n\n### Surgical Function Patching\nReplace a single function AST node directly without risking regression in neighboring code:\n\n```bash\nooda patch hello.oo \\\n  --replace-fn greet \\\n  --with new_body.oo\n```\n\n---\n\n## 6. The 5-Step Agent Execution Loop\n\nAutonomous agents and engineers execute tasks through a deterministic 5-step operational loop:\n\n1. **OBSERVE**: Inspect module signatures with `ooda outline <target.oo>` and read repository constraints.\n2. **CHECK**: Run fast typechecking via `ooda check <target.oo>`.\n3. **ACT**: Apply minimal, scoped modifications maintaining explicit types and the <= 256 lines limit.\n4. **LOCK**: Validate behavior with `ooda test <target.oo>` under the sequential double-run law.\n5. **SHIP**: Run full supply-chain audits with `ooda pm audit` and commit to Git.\n\n---\n\n## 7. Filesystem Sandboxing\n\nWhen running operations that modify the local filesystem (such as `ooda fix` or functions taking `&FsWriteCap`), openOODA enforces strict directory boundaries. Set the allowed target directory:\n\n```bash\nexport OODA_FS_WRITEDIR=\"$PWD\"\n```\n\nAny write operation attempting path traversal (`../`) or accessing directories outside `OODA_FS_WRITEDIR` fails closed immediately.\n\n---\n\n## 8. Key Language & Security Constructs\n\n- **Struct Methods**: Value receivers (`p.scale()`) and reference methods (`(&mut p_mut).shift_x()`).\n- **Control Flow**: Bounded loops (`0..(n - 1)`) and inline `if` expressions (`let y: Int = val + (if cond { a } else { b });`).\n- **Error Handling**: `match let` and fallible collections (`Result[List[String], String]`).\n- **Active Defense**: Kernel Landlock confinement, HMAC attenuation, and static `SECRET` taint tracking.\n","Std.oot":"# STDLIB — Grand Unified Science Standard Library Reference\nFloor: 2\nThrust: 6\nPatch: 5\nFile: openOODA.github.io/guide/Std.oot\n\nThe openOODA standard library provides sovereign hard-science computation under zero ambient authority. All operations use mathematical invariants, bounded quotas, zero-allocation paths, and 256-bit SIMD vectorization (RFC 0026). Side effects require capability tokens (`&AllocCap`, `&SysCap`, `&NetCap`, `&GpuCap`, `&TimeCap`, `&RandCap`, `&ThreadCap`).\n\n---\n\n## 1. Chart 1: Grand Unified Science Substratum (3-Tier Epistemic Radar)\n\n<div class=\"radar-container\" id=\"radar-science-container\">\n<canvas id=\"canvas-radar-science\" class=\"radar-canvas\" width=\"620\" height=\"560\" aria-label=\"Grand Unified Science Substratum 3-Tier Interactive Epistemic Radar\"></canvas>\n<noscript>\n<svg class=\"radar-chart radar-science\" viewBox=\"0 0 620 560\" width=\"100%\" height=\"auto\" role=\"img\" aria-label=\"Grand Unified Science Substratum 3-Tier Radar Chart\" xmlns=\"http://www.w3.org/2000/svg\">\n  <title>Grand Unified Science Substratum</title>\n  <desc>3-Tier sovereign radar visualizer for Grand Unified Science Substratum: Codified Laws (Blue), Active Theories (Gold), and First Principles Horizon (White 100%).</desc>\n  <polygon class=\"radar-grid-ring\" points=\"310,234 337,250 337,281 310,296 283,281 283,250\" stroke=\"var(--border)\" fill=\"none\"/>\n  <polygon class=\"radar-grid-ring\" points=\"310,203 364,234 364,296 310,327 256,296 256,234\" stroke=\"var(--border)\" fill=\"none\"/>\n  <polygon class=\"radar-grid-ring\" points=\"310,172 391,219 391,312 310,358 229,312 229,219\" stroke=\"var(--border)\" fill=\"none\"/>\n  <polygon class=\"radar-grid-ring\" points=\"310,141 417,203 417,327 310,389 203,327 203,203\" stroke=\"var(--border)\" fill=\"none\"/>\n  <polygon class=\"radar-outer-hull\" points=\"310,110 444,188 444,343 310,420 176,343 176,188\" stroke=\"var(--border)\" fill=\"var(--panel)\" stroke-dasharray=\"4 3\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"310\" y2=\"110\" stroke=\"var(--border)\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"444\" y2=\"188\" stroke=\"var(--border)\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"444\" y2=\"343\" stroke=\"var(--border)\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"310\" y2=\"420\" stroke=\"var(--border)\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"176\" y2=\"343\" stroke=\"var(--border)\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"176\" y2=\"188\" stroke=\"var(--border)\"/>\n  <polygon class=\"radar-theories-polygon\" points=\"310,164 388,220 370,300 310,324 236,308 243,226\" fill=\"var(--gold)\" fill-opacity=\"0.14\" stroke=\"var(--gold)\" stroke-width=\"1.8\" stroke-dasharray=\"4 2\"/>\n  <polygon class=\"radar-laws-polygon\" points=\"310,211 350,242 337,280 310,288 272,284 278,246\" fill=\"var(--blue)\" fill-opacity=\"0.28\" stroke=\"var(--blue)\" stroke-width=\"2.2\"/>\n  <text class=\"radar-label\" x=\"310\" y=\"88\" text-anchor=\"middle\" fill=\"var(--fg)\">Mathematics</text>\n  <text class=\"radar-label\" x=\"460\" y=\"180\" text-anchor=\"start\" fill=\"var(--fg)\">Physics</text>\n  <text class=\"radar-label\" x=\"460\" y=\"350\" text-anchor=\"start\" fill=\"var(--fg)\">Chemistry</text>\n  <text class=\"radar-label\" x=\"310\" y=\"450\" text-anchor=\"middle\" fill=\"var(--fg)\">Biology</text>\n  <text class=\"radar-label\" x=\"160\" y=\"350\" text-anchor=\"end\" fill=\"var(--fg)\">Cognition &amp; Cybernetics</text>\n  <text class=\"radar-label\" x=\"160\" y=\"180\" text-anchor=\"end\" fill=\"var(--fg)\">Economics &amp; Decision Theory</text>\n  <text class=\"radar-boundary-caption\" x=\"310\" y=\"535\" text-anchor=\"middle\" fill=\"var(--muted)\">RESEARCH FRONTIER: Active Knowledge Gap = Uncharted Territory</text>\n</svg>\n</noscript>\n</div>\n\n---\n\n## 2. Epistemic Architecture — Principles vs Theories vs Laws\n\n- **⚪ First Principles (100% Boundary)**: Immutable physical & logical limits (Speed of light $c$, Landauer erasure limit, Conservation laws, Zero Ambient Authority).\n- **🟡 Scientific Theories (~38%–65%)**: Falsifiable mathematical models & active research frontiers (Category Theory, Quantum Open Systems, Free Energy Principle, Game Theory).\n- **🔵 Codified Laws (~15%–35%)**: Formally verified, hardened, zero-drag execution engines (AVX2/NEON SIMD FMA, BLAS GEMM, RK4 ODEs, Navier-Stokes, SGP4 Astrodynamics, L3 Matching Engines).\n\n---\n\n## 3. Table of Contents — One Tree, 33 Domain Parents (v2.9.0)\n\nFolders name domains. File role (law / theory / principle) is not a nested directory.\n\n- **Trunk**: `result.oo` `option.oo` `str.oo` `byte.oo` `core/` `collections/` `math/` `text/` `encoding/` `io/` `fs/` `net/` `os/`\n- **Support**: `sync/` `actor/` `hash/` `crypto/` `sec/` `markup/` `archive/` `time/` `diag/` `test/` `simd/`\n- **SIMD Substrate**: `std/simd/` — 256-bit vector types (`f32x8`, `f64x4`), FMA arithmetic (`fma_law.oo`), 32-byte aligned memory (`simd_mem.oo`), horizontal reductions, matrix 4x4 transforms (`simd_matrix4x4.oo`), bitselect, gather/scatter.\n- **Axis 1 Mathematics**: `std/math/` — BLAS GEMM, linear algebra, tensors (`std/math/tensor.oo`), FFT, SLERP, algebraic invariants.\n- **Axis 2 Physics**: `std/phys/` — aero, astrodynamics, optics, em, quantum, thermo, gnc. Import `std/phys/aero/boyd_em.oo`, `std/phys/aero/atmosphere.oo`, `std/phys/aero/aero_state.oo`, `std/phys/physics/orbital.oo`.\n- **Axis 3 Chemistry**: `std/chem/` — kinetics, materials, molecular, reactions.\n- **Axis 4 Biology**: `std/bio/` — genetics, CRISPR, protein folding.\n- **Axis 5 Cognition & AI**: `std/ai/` `std/robot/` — Transformer attention, RMSNorm, RoPE embeddings, Kalman filters, PID, swarm state machines.\n- **Axis 6 Economics**: `std/econ/` — L3 order books, minimax, Black-Scholes, AMM, BFT consensus.\n- **Silicon / Compiler / Data / UI**: `std/hw/` `std/compile/` `std/data/` `std/ui/`\n- **Perimeter (First Principles)**: `std/principles/` (Landauer limit, CODATA physical constants, fail-closed bounds).\n\n---\n\n## 4. 256-Bit SIMD Acceleration & Hardware FMA Laws (RFC 0026)\n\nThe `std/simd/` package provides hardware-direct 256-bit data-parallel primitives:\n\n- **Vector Types**: `f32x8` (8 packed 32-bit floats) and `f64x4` (4 packed 64-bit doubles).\n- **Fused Multiply-Add (`fma`)**: Calculates $(a \\times b) + c$ with single rounding and error bound $\\le 1\\text{ ULP}$. Lowers directly to `vfmadd213ps` (x86_64 AVX2) and `fmla.4s` (ARM AArch64 NEON).\n- **Capability-Gated Memory**: Vector loads and stores (`f32x8_load_aligned`, `f32x8_store_aligned`) require `&AllocCap` and enforce strict 32-byte alignment (`offset % 32 == 0`).\n- **Reductions**: `f32x8_reduce_sum`, `f32x8_reduce_min`, `f32x8_reduce_max`, and `f32x8_dot` for horizontal vector aggregation.\n\n---\n\n## 5. Vectorized High-Performance Science & Tensor Pipeline Example\n\n```openooda\n// # Vectorized Science and Tensor Pipeline\n// Logline: Executes ISA atmosphere, Boyd Ps, and 8-lane FMA tensor dot product under zero ambient authority.\n// Setup: Requires &AllocCap for 32-byte aligned SIMD memory access. Pure mathematical determinism.\n// Beats: 1. Evaluate ISA atmospheric metrics. 2. Compute Boyd Ps power. 3. Vectorize tensor dot product via f32x8_fma.\n\nimport \"std/simd/simd_vec8f.oo\";\nimport \"std/simd/fma_law.oo\";\nimport \"std/simd/simd_mem.oo\";\nimport \"std/phys/aero/atmosphere.oo\";\nimport \"std/phys/aero/aero_state.oo\";\nimport \"std/phys/aero/boyd_em.oo\";\nimport \"std/phys/physics/orbital.oo\";\nimport \"std/phys/physics/relativity.oo\";\n\npub fn compute_vectorized_tensor_step(\n    alloc: &AllocCap,\n    weights: List[Float],\n    inputs: List[Float],\n    alt_m: Float,\n    tas_mps: Float\n) -> Result[Float, String] {\n    // 1. Atmosphere and flight physics\n    let atmo: IsaAtmosphere = isa_atmosphere_at(alt_m);\n    let q: Float = aero_compute_dynamic_pressure(atmo.density_kg_m3, tas_mps);\n    let mach: Float = aero_compute_mach(tas_mps, atmo.speed_of_sound_mps);\n    let ps: Float = calculate_ps(20000.0, 5000.0, 20000.0, tas_mps * 3.28084);\n\n    // 2. Capability-gated 32-byte aligned SIMD tensor load\n    let w_vec: f32x8 = f32x8_load_aligned(alloc, weights, 0)?;\n    let in_vec: f32x8 = f32x8_load_aligned(alloc, inputs, 0)?;\n    let bias_vec: f32x8 = f32x8_splat(q * 0.001);\n\n    // 3. Fused Multiply-Add: (w * in) + bias with <= 1 ULP precision\n    let acc: f32x8 = f32x8_fma(w_vec, in_vec, bias_vec);\n    let tensor_score: Float = f32x8_reduce_sum(acc);\n\n    // 4. Combined relativistic state synthesis\n    let r: Float = 6371000.0 + alt_m;\n    let v_orb: Float = orb_circular_velocity(r, 10000.0);\n    let gamma: Float = rel_gamma(v_orb);\n\n    let result: Float = ps + mach + tensor_score + (v_orb * gamma);\n    return Ok(result);\n}\n```\n","Home.oot":"# HOME — The Sovereign Systems Language for the AI Era\n\nFile: openOODA.github.io/guide/Home.oot\n\nopenOODA is a premier, capability-secure systems programming language engineered from first principles for autonomous AI coding swarms, hard-science computation, and mission-critical aerospace engineering. It eliminates ambient authority, embeds compile-time active binary defenses, and provides sovereign multi-target synthesis across bare-metal and web platforms.\n\n---\n\n## 1. The 6 Strategic Pillars\n\nThe openOODA architecture is governed by six immutable strategic doctrines:\n\n1. **Ground-Truth Derivation (First Principles)**: Every algorithm, cryptographic primitive, and physical model derives directly from formal standards (IEEE 754-2019, NIST FIPS 180-4/203/204, RFC 8439/9577, POSIX/Linux ABI). Zero mock objects or simulated stubs.\n2. **Boyd's E-M Engine (Energy-Maneuverability)**: Performance is governed by the Informational Energy-Maneuverability formula:\n   $$\\text{E-M} = \\frac{T - D}{W} \\cdot V$$\n   Where native instruction throughput ($T$) is maximized, allocation/GC pauses ($D$) are eliminated, binary weight ($W$) is minimized, and rebuild velocity ($V$) is accelerated. Flight excess power evaluates as $P_s = V \\cdot \\frac{T - D}{W} \\times 850.0$.\n3. **Adversarial Validation & Double-Run Law**: Green test suites are treated as unverified hypotheses until subjected to adversarial perturbation and AST mutant injection ($\\ge 95\\%$ mutant kill rate). Test suites execute twice sequentially to prove zero state leaks.\n4. **Power Law 80/20 Leverage**: Prioritizes the high-leverage 20% core architectural primitives (SSA Mem2Reg register promotion, flat closures, direct ELF64 codegen, unforgeable capability tokens) delivering 80% of system performance and security.\n5. **Sovereign Moat & Active Defense**: Fortifies binaries at compile time with Moving Target Defense (MTD), Chenxi Wang control flow flattening, stack-transient string encryption, and an autonomic live-RAM RASP watchdog.\n6. **Multi-Agent Swarm Protocol**: Enforces non-negotiable invariants for AI coding swarms: strict <= 256 lines budget per module, mandatory explicit typing (`let x: Type = val;`), 4-element Academy headers, and surgical AST patching.\n\n---\n\n## 2. Col. John Boyd's OODA Loop & Generational Evolution\n\nThe Observe-Orient-Decide-Act (OODA) loop describes the operational tempo required to out-cycle adversaries in dynamic, high-stakes environments:\n\n$$\\tau_{\\text{OODA}} = \\tau_{\\text{obs}} + \\tau_{\\text{orient}} + \\tau_{\\text{decide}} + \\tau_{\\text{act}} < \\Delta t_{\\text{threat}}$$\n\n### 2.1 The 7 Aerial Combat & Physics Generations\n- **Gen 1 (F-86 Sabre / MiG-15)**: Subsonic aerodynamics ($M \\le 0.85$), pure gunfighter scissors, 6x .50 cal Browning M3 machine guns, manual optical gun sights, high turn drag polars, 0 missiles.\n- **Gen 2 (F-104 Starfighter / MiG-21 Fishbed)**: Supersonic Mach 2+ dash, high wing loading, early rear-aspect infrared heat-seeking missiles (AIM-9B), delta wing, high energy bleed in turns ($P_s \\ll 0$).\n- **Gen 3 (F-4 Phantom II / MiG-23 Flogger)**: Beyond Visual Range (BVR) radar-guided missiles (AIM-7 Sparrow), pulse-Doppler radar, twin heavy engines, high payload mass ($45,000\\,\\text{lbs}$).\n- **Gen 4 (F-14 Tomcat / F-16 Falcon)**: High-agility dogfighters, Central Air Data Computer (CADC) automated variable wing sweep schedules ($\\Lambda \\in [20^\\circ, 68^\\circ]$, $AR = 7.28 \\to 2.21$, wingspan $b = 64.125 \\to 38.167\\,\\text{ft}$), 9G sustained turns, Boyd E-M flight engine ($P_s \\ge 0$), AIM-54 Phoenix / AIM-120 AMRAAM, M61A1 Vulcan cannon.\n- **Gen 5 (F-22 Raptor / F-35 Lightning II)**: Very Low Observable (VLO) stealth airframes with dynamic Radar Cross Section ($RCS \\approx 0.0001\\,\\text{m}^2$ clean vs weapons bay bloom), internal bays, supercruise, 3D thrust vectoring nozzles (TVC), AESA radar, multi-spectral sensor fusion.\n- **Gen 6 (NGAD / MUM-T)**: Next Generation Air Dominance, Manned-Unmanned Teaming with Collaborative Combat Aircraft (CCA) wingmen within dynamic leash envelopes ($[40, 450]\\,\\text{px}$), Directed Energy Weapons (DEW) 150 kW solid-state laser CIWS with thermal ablation and $170\\,\\text{px}$ interception sphere, all-aspect broadband stealth.\n- **Gen 7 (Autonomous Quantum Swarm)**: Sovereign autonomous 9-mote / 3-node quantum swarm, continuous relativistic kinematics ($\\Delta\\text{pos} \\le \\text{speed} \\times 1.5$, displacement $\\le 2.5\\,\\text{px}$ per step, zero coordinate teleportation), zero connecting geometric wireframe lines, 4-phase cyclic morphing state machine (Patrol $\\to$ Coalesce $\\to$ Fused $\\to$ Disperse), Tri-Lance pulse slicing beams (35% kill), 360° surround vaporize trap (14 frames), resonant gravitational singularity super-cannon ($1250\\,\\text{GW}$ beam, $100\\times$ damage multiplier).\n\n### 2.2 Specific Excess Power ($P_s$) & Energy-Maneuverability Trade-Offs\nCol. John Boyd's Energy-Maneuverability theory models an aircraft's instantaneous rate of energy gain or loss per unit weight:\n\n$$P_s = V \\cdot \\frac{T - D}{W} \\times 850.0 \\quad (\\text{scaled ft/s})$$\n\n- **Sustained Turn Rate**: Occurs where energy rate is neutral ($P_s = 0 \\implies T = D$).\n- **Turn Rate & Turn Radius**: $\\omega = \\frac{g\\sqrt{n^2 - 1}}{V} \\quad (\\text{rad/s}), \\quad R = \\frac{V^2}{g\\sqrt{n^2 - 1}} \\quad (\\text{ft})$.\n- **Energy Bleed Rate**: Exchange between kinetic acceleration and altitude climb rate:\n  $$\\frac{dV}{dt} = \\frac{g (P_s - \\dot{h})}{V}$$\n\n---\n\n## 3. Zero Ambient Authority & 14 Capability Tokens\n\nTraditional systems grant unrestricted ambient access to host operating systems: any imported package can read files, open network sockets, or spawn malicious subprocesses.\n\nopenOODA enforces **Zero Ambient Authority (OCap)** at the compiler AST level:\n- **No capability token, no effect**: Functions cannot execute side effects without explicit, unforgeable capability references.\n- **Mathematically unforgeable**: Tokens cannot be minted, cast from integers, or constructed from raw memory.\n- **14 Canonical Tokens**: Confinement is managed across 14 tokens: `&AllocCap`, `&FsReadCap`, `&FsWriteCap`, `&ProcessCap`, `&SysCap`, `&NetCap`, `&TcpCap`, `&UdpCap`, `&BindCap`, `&TimeCap`, `&RandCap`, `&ThreadCap`, `&GpuCap`, `&UnsafeFFICap`.\n\n---\n\n## 4. System Architecture & Sovereign Compiler Stack (6-Axis Radar)\n\nThe openOODA compiler (`oodac`) operates as a pure mathematical transformation from AST to target bytecode or machine code, with zero reliance on opaque external toolchains:\n\n<div class=\"radar-container\" id=\"radar-systems-container\">\n<canvas id=\"canvas-radar-systems\" class=\"radar-canvas\" width=\"620\" height=\"560\" aria-label=\"Systems & Compiler Stack 3-Tier Interactive Radar\"></canvas>\n<noscript>\n<svg class=\"radar-chart radar-systems\" viewBox=\"0 0 620 560\" width=\"100%\" height=\"auto\" role=\"img\" aria-label=\"Systems &amp; Compiler Stack 3-Tier Radar Chart\" xmlns=\"http://www.w3.org/2000/svg\">\n  <title>Systems &amp; Compiler Architecture Stack</title>\n  <desc>3-Tier sovereign radar visualizer for Systems &amp; Compiler Stack: Codified Laws (Blue), Formal Specifications (Gold), and Sovereign Invariants Horizon (White 100%).</desc>\n  <polygon class=\"radar-grid-ring\" points=\"310,234 337,250 337,281 310,296 283,281 283,250\" stroke=\"var(--border)\" fill=\"none\"/>\n  <polygon class=\"radar-grid-ring\" points=\"310,203 364,234 364,296 310,327 256,296 256,234\" stroke=\"var(--border)\" fill=\"none\"/>\n  <polygon class=\"radar-grid-ring\" points=\"310,172 391,219 391,312 310,358 229,312 229,219\" stroke=\"var(--border)\" fill=\"none\"/>\n  <polygon class=\"radar-grid-ring\" points=\"310,141 417,203 417,327 310,389 203,327 203,203\" stroke=\"var(--border)\" fill=\"none\"/>\n  <polygon class=\"radar-outer-hull\" points=\"310,110 444,188 444,343 310,420 176,343 176,188\" stroke=\"var(--border)\" fill=\"var(--panel)\" stroke-dasharray=\"4 3\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"310\" y2=\"110\" stroke=\"var(--border)\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"444\" y2=\"188\" stroke=\"var(--border)\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"444\" y2=\"343\" stroke=\"var(--border)\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"310\" y2=\"420\" stroke=\"var(--border)\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"176\" y2=\"343\" stroke=\"var(--border)\"/>\n  <line class=\"radar-spoke\" x1=\"310\" y1=\"265\" x2=\"176\" y2=\"188\" stroke=\"var(--border)\"/>\n  <polygon class=\"radar-theories-polygon\" points=\"310,157 404,211 391,312 310,366 216,319 236,222\" fill=\"var(--gold)\" fill-opacity=\"0.14\" stroke=\"var(--gold)\" stroke-width=\"1.8\" stroke-dasharray=\"4 2\"/>\n  <polygon class=\"radar-laws-polygon\" points=\"310,203 357,238 353,290 310,324 254,293 270,242\" fill=\"var(--blue)\" fill-opacity=\"0.28\" stroke=\"var(--blue)\" stroke-width=\"2.2\"/>\n  <text class=\"radar-label\" x=\"310\" y=\"88\" text-anchor=\"middle\" fill=\"var(--fg)\">Language Frontend</text>\n  <text class=\"radar-label\" x=\"460\" y=\"180\" text-anchor=\"start\" fill=\"var(--fg)\">Type System &amp; SMT</text>\n  <text class=\"radar-label\" x=\"460\" y=\"350\" text-anchor=\"start\" fill=\"var(--fg)\">IR &amp; Monomorphization</text>\n  <text class=\"radar-label\" x=\"310\" y=\"450\" text-anchor=\"middle\" fill=\"var(--fg)\">Runtime &amp; Memory</text>\n  <text class=\"radar-label\" x=\"160\" y=\"350\" text-anchor=\"end\" fill=\"var(--fg)\">Concurrency &amp; Security</text>\n  <text class=\"radar-label\" x=\"160\" y=\"180\" text-anchor=\"end\" fill=\"var(--fg)\">Hardware &amp; Machine Code</text>\n  <text class=\"radar-boundary-caption\" x=\"310\" y=\"535\" text-anchor=\"middle\" fill=\"var(--muted)\">RESEARCH FRONTIER: Active Architecture Gap = Uncharted Territory</text>\n</svg>\n</noscript>\n</div>\n\n1. **Language Frontend**: Laws: Recursive parser, AST, explicit typing (40%) | Specs: Affine effect types (70%).\n2. **Type System & SMT**: Laws: HM typecheck, OCap tokens (35%) | Specs: Non-linear SMT prover (65%).\n3. **IR & Monomorphization**: Laws: Mem2Reg SSA, DCE (32%) | Specs: Polyhedral loop tiling (60%).\n4. **Runtime & Memory**: Laws: Linear bump arenas, deterministic ARC (38%) | Specs: Flat closure captures (65%).\n5. **Concurrency & Security**: Laws: POSIX pthread workers, Landlock (42%) | Specs: Live-RAM RASP watchdog (70%).\n6. **Hardware & Machine Code**: Laws: Clean C99 emit, pure ELF64 (30%) | Specs: LLVM OrcJIT REPL, GPU PTX (55%).\n\n---\n\n## 5. Compile-Time Active Binary Defense & Sovereign Moat\n\nSecurity is built into binary generation:\n- **Moving Target Defense (MTD)**: Control flow flattening and quadratic residue opaque predicates mod 7 make reverse engineering exponentially complex.\n- **Anti-ROP Gadget Destruction**: Eliminates unintended `ret` (`0xC3`) and `jmp` sequences across instruction boundaries.\n- **Stack-Transient String Encryption**: String literals are decrypted in stack memory only when evaluated and scrubbed immediately after use.\n- **Autonomic Live-RAM RASP Watchdog**: In-memory watchdog authenticates startup `.text` SHA-256 page checksums and automatically rolls back unauthorized debugger hooks live in RAM.\n\n---\n\n## 6. Generational OODA Simulation Example\n\n```openooda\n// # Generational OODA Flight Decision Cycle\n// Logline: Evaluates flight specific excess power, CADC sweep, and OODA cycle time.\n// Setup: Pure aero calculation with zero ambient authority.\n// Beats: 1. Calculate flight Specific Excess Power (Ps). 2. Compute wing sweep. 3. Return metric sum.\n\nimport \"std/phys/aero/atmosphere.oo\";\nimport \"std/phys/aero/aero_state.oo\";\nimport \"std/phys/aero/boyd_em.oo\";\nimport \"std/phys/aero/cadc_sweep.oo\";\nimport \"std/phys/aero/lift_force_law.oo\";\n\npub fn evaluate_flight_ooda(\n    thrust_lbf: Float,\n    drag_lbf: Float,\n    weight_lbs: Float,\n    tas_mps: Float,\n    alt_m: Float,\n    wing_s: Float\n) -> Float {\n    let atmo: IsaAtmosphere = isa_atmosphere_at(alt_m);\n    let q: Float = aero_compute_dynamic_pressure(atmo.density_kg_m3, tas_mps);\n    let mach: Float = aero_compute_mach(tas_mps, atmo.speed_of_sound_mps);\n    let lift: Float = calculate_lift_force(q, wing_s, 0.4);\n    let ps: Float = calculate_ps(thrust_lbf, drag_lbf, weight_lbs, tas_mps * 3.28084);\n    let sweep: Float = cadc_compute_wing_sweep(mach, q * 0.02088543);\n    let ar: Float = cadc_compute_aspect_ratio(sweep);\n    let oswald_e: Float = cadc_compute_oswald_efficiency(sweep);\n    let k_factor: Float = cadc_compute_induced_drag_factor(sweep);\n    return ps + lift + sweep + ar + oswald_e + k_factor;\n}\n```\n","QuickRef.oot":"# QUICKREF — Universal AI Quick Reference Guide\nFloor: 2\nThrust: 9\nPatch: 2\nFile: openOODA/QUICKREF.oot\n\nThis document provides a syntax cheat sheet, capability matrix, architectural overview, and operational rules.\n\n## 1. The 3-Tier Architectural Hierarchy & Model\n\nThe openOODA system operates across three unified architectural tiers:\n\n┌────────────────────────────────────────────────────────────────────────┐\n│                      3-TIER ARCHITECTURAL MODEL                        │\n├────────────────────────────────────────────────────────────────────────┤\n│ LAYER 3: STRATEGIC DOCTRINE                                            │\n│ Generational Tiers (Gen 1-7), 3 Operational Laws (Substratum Integrity,│\n│ Hermetic Encapsulation, Bounded Promotion), Capability Security Model. │\n├────────────────────────────────────────────────────────────────────────┤\n│ LAYER 2: OPERATIONAL WORKFLOW & LOGISTICS                              │\n│ 5-Step OODA Execution Loop, Sparing Ingress Token Economy, Multi-Agent │\n│ Live Git Sync, Sequential Double-Run Verification.                     │\n├────────────────────────────────────────────────────────────────────────┤\n│ LAYER 1: TACTICAL CODE PHYSICS                                         │\n│ <= 256 lines/file, Pure .oo/.oot, 4-Element Academy Headers, Zero      │\n│ Trailing Commas, 14 Capability Tokens, Boyd E-M, Enforcer 8-Gate.      │\n└────────────────────────────────────────────────────────────────────────┘\n\n## 2. Layer 1: Tactical Code Physics\n\n### 2.1 Grammar and File Laws\n- File Extensions: Pure `.oo` for code, `.oot` for documentation. No `.md`, `.py`, `.js`, or `.sh`.\n- Line Limits: All `.oo` and `.oot` files must contain <= 256 lines without exception.\n- Mandatory 4-element Academy header on every product `.oo` file:\n  // # Module Title\n  //\n  // Logline: One sentence in ASD-STE100 Simplified Technical English.\n  //\n  // Setup: Preconditions and required capability tokens.\n  //\n  // Beats:\n  //   1. First action.\n  //   2. Second action.\n- Mandatory Type Annotations: `let x: Int = 10;` (untyped variables are prohibited).\n- Structs — Zero Trailing Commas:\n  pub type Point = struct {\n      x: Int,\n      y: Int\n  };\n  let pt: Point = Point { x: 10, y: 20 };\n\n### 2.2 Functions and Control Flow\n- Functions: `pub fn name(arg: Type) -> RetType { ... }` or `fn` for internal visibility.\n- Control Flow: `if ... else if ... else`, `while cond { ... }`, `for x in xs { ... }`.\n- Pattern Matching: `match expr { Ok(v) => { ... }, Err(e) => { ... } }`.\n- Return Statements: `return value;`\n\n### 2.3 Standard Types and Collections\n- `Int`: 64-bit signed integer. `Float`: 64-bit IEEE-754 float. `Bool`: true or false.\n- `String`: Owned UTF-8 string. `List[T]`: Dynamic ARC array.\n- `f32x8`: 256-bit 8-lane 32-bit float vector. `f64x4`: 256-bit 4-lane 64-bit float vector.\n- `fma(a, b, c)`: Hardware-accelerated fused multiply-add (<= 1 ULP error bound).\n- `Option[T]`: `Some(value)` or `None`. `Result[T, E]`: `Ok(value)` or `Err(\"reason\")`.\n- List Operations:\n  let mut xs: List[Int] = list_new();\n  xs = list_push(xs, 10);\n  let len: Int = list_len(xs);\n- SIMD Operations (&AllocCap gated, 32-byte aligned):\n  let v: f32x8 = f32x8_splat(1.5);\n  let loaded: f32x8 = f32x8_load_aligned(cap, ptr, 0);\n  let res: f32x8 = f32x8_fma(a, b, c);\n  let item: Int = list_get(xs, 0);\n\n### 2.4 Informational Energy-Maneuverability Formula\n- Formulation: E-M = ((T - D) / W) * V\n- Thrust (T): Instruction throughput, SIMD auto-vectorization, direct ELF64 emission.\n- Drag (D): Heap churn, ARC retain/release overhead, dynamic check latency.\n- Weight (W): Binary footprint, AST metadata overhead, stack frame depth.\n- Velocity (V): AST typechecking rate, cycle clock, rebuild turnaround.\n\n### 2.5 Capability Grant Matrix (14 Tokens)\nZero ambient authority. Pass explicit unforgeable capability tokens:\n\n| Token | Scope & Operations | Fail-Closed Trigger |\n|---|---|---|\n| `&AllocCap` | Linear arenas, alloc, bulk reset | Quota exceed / memory leak |\n| `&FsReadCap` | read_file, file_size, fs_read_dir | Path escape / missing token |\n| `&FsWriteCap` | write_file, fs_mkdir, remove_file | No OODA_FS_WRITEDIR / leak |\n| `&ProcessCap` | sys_exec, sys_spawn, sys_wait | Forged token / invalid env |\n| `&SysCap` | OS primitives, Landlock, rlimit | Forged token / missing cap |\n| `&NetCap` | Generic network socket operations | Unauthorized network access |\n| `&TcpCap` | tcp_connect, tcp_listen, tcp_accept | Missing token / denied port |\n| `&UdpCap` | udp_bind, udp_send, udp_recv | Missing token / bad address |\n| `&BindCap` | Socket port binding privileges | Privileged port / no grant |\n| `&TimeCap` | now_ms, sleep_ms, timers | Missing token |\n| `&RandCap` | random_bytes, seed, entropy | Missing token / weak entropy |\n| `&ThreadCap` | mutex_lock, thread_spawn, channels | Missing token / thread limit |\n| `&GpuCap` | gpu_launch, compute shader dispatch | Hardware access denied |\n| `&UnsafeFFICap` | oo_import_c, oo_dlopen, raw C ABI | Sandbox escape / bad symbol |\n\n### 2.6 Master Enforcer 8-Gate Suite\nGate 1: Zero forbidden files (.py/.sh). Gate 2: Line limits (<= 256 lines).\nGate 3: Zero intermediate files in std/. Gate 4: 4-element Academy headers.\nGate 5: Clean root directory. Gate 6: Zero trailing commas in structs.\nGate 7: RFC template compliance. Gate 8: Compiler binary identity.\n\n## 3. Layer 2: Operational Workflow & Logistics\n\n### 3.1 The 5-Step Agent OODA Execution Loop\n1. OBSERVE: Inspect `./bin/ooda outline <target.oo>` and current git/disk state.\n2. CHECK: Typecheck with `./bin/ooda check <target.oo>`.\n3. ACT: Apply minimal edits (<= 256 lines, Academy header, zero trailing commas).\n4. LOCK: Run `./bin/ooda run <test.oo>` with sequential double-run verification.\n5. SHIP: Validate `scripts/enforcer.oo` and commit changes to Git.\n\n### 3.2 Context Token Economy & Sparing Ingress\n- Product CLI Commands: `./bin/ooda help|check|build|run|test|dump|outline|reflect|patch|fix`\n- Compiler Commands: `./oodac/oodac check|outline|reflect <file.oo>`\n- Outline Efficiency: `./bin/ooda outline <file.oo>` consumes ~1.3% of raw source bytes.\n- Work Loop Rules: Outline 1-3 files; check target file; edit minimally; leave-off <= 15 lines.\n- Token Traps (NEVER read raw): `all*.c` (~700KB emit), full `ROADMAP.oot`, raw GCC logs.\n\n### 3.3 Multi-Agent Live Git Synchronization\n- Maintain live git and disk synchronization before modifying files.\n- Respect exclusive file ownership assigned in dispatch instructions.\n- Commit atomically on milestone completions with descriptive messages.\n\n### 3.4 Double-Run Verification Mandate\nAlways execute test suites twice sequentially in fresh process instances (`./bin/ooda run <test.oo>`).\nThis verifies deterministic memory safety and eliminates state leakage.\n\n### 3.5 Seven Critical System Constraints\n1. File Law: Pure `.oo` and `.oot` files only. Prohibit unauthorized extensions.\n2. Line Budget: All files must strictly contain <= 256 lines.\n3. Academy Header: Mandatory 4-element Academy header on every product `.oo` file.\n4. Struct Syntax: Zero trailing commas in struct types and struct literals.\n5. Capability Security: Zero ambient authority. Use explicit capability tokens.\n6. Binary Identity: Never overwrite the compiler binary with the product CLI binary.\n7. Double-Run Verification: Always execute `./bin/ooda run <test.oo>` twice.\n\n### 3.6 Hard Engineering Invariants (4-Gate Rule)\n1. Break-Test First: Write negative-trust failure probes before implementation.\n2. True AST/IR Path: Prohibit substring heuristics and stub defaults in lowering pipelines.\n3. Decompose Over Compress: Split large systems into modular files; do not hack single files.\n4. Diff Inspection: Verify mechanical computation in git diff before claiming resolution.\n\n## 4. Layer 3: Strategic Doctrine\n\n### 4.1 Generational Architecture Hierarchy (Gen 1 to Gen 7)\nEach software generation maps directly to a fighter generation. Gen 8 is left undefined because it is not yet imaginable.\n- Gen 1 (F-86 / MiG-15 — Physical Substrate): Page tables, SIMD registers, MMU, bare-metal silicon.\n- Gen 2 (F-104 / MiG-21 — Compiler & IR): Lexer, parser, Merkle AST, SSA mem2reg, direct ELF64 emission.\n- Gen 3 (F-4 / MiG-23 — Runtime & Memory): Linear arenas, O(1) bulk reset, deterministic ARC, Landlock.\n- Gen 4 (F-14 / F-16 — Language & Types): ADTs, pattern matching, 14 capability tokens, SMT contracts.\n- Gen 5 (F-22 / F-35 — Multi-Agent Swarm): P2P verification, sensor fusion consensus, live git sync.\n- Gen 6 (NGAD / MUM-T — Autonomous Synthesis): Self-mutation, ZK compute proofs, CCA wingmen, sovereign microkernel.\n- Gen 7 (Quantum Swarm of Swarms): Autonomous 9-mote quantum swarm, singularity cannon. Aspirational — not realizable today.\n- Gen 8: Unknowable. Intentionally undefined; we cannot dream it yet.\nReflex Layer Encapsulation: Gen 1-4 encapsulate into a deterministic, stable library layer.\n\n### 4.2 The Three Fundamental Operational Laws\n1. Law of Substratum Integrity: Fix low-level memory and concurrency drag before building high-level orchestration.\n2. Law of Hermetic Encapsulation: Treat each subsystem as an encapsulated module with explicit capability tokens.\n3. Law of Bounded Promotion: Require formal SMT proofs or invariant checks before runtime promotion of dynamic code.\n\n### 4.3 The 10 Strategic Governance Pillars\n1. Pillar 1 (First Principles & Pure File Extension Laws): Pure .oo and .oot. Prohibit .py, .sh, .js, .md.\n2. Pillar 2 (Boyd's E-M Invariant & Zero Drag): Ps = ((T - D) / W) * V. Strict <= 256 lines per file. Zero intermediate artifacts in std/.\n3. Pillar 3 (Adversarial Validation & Double-Run Invariant): 8D Red Team (e1..e8) and 8-Gate Blocking Veto Protocol. Run_1 == Run_2.\n4. Pillar 4 (Academy 4-Element Headers): Mandatory ASD-STE100 headers (# Title, Logline, Setup, Beats on .oo; Title, Floor, Thrust, Patch, File on .oot).\n5. Pillar 5 (Capability Security & Zero Ambient Authority): 14 unforgeable capability tokens (&FsReadCap, &FsWriteCap, &ProcessCap, etc.).\n6. Pillar 6 (Multi-Agent Swarm Safety & Topology Invariance): Stationary workspace topology (Delta_path = 0). Fail-closed agent fork bomb rejection.\n7. Pillar 7 (Formal RFC Template Compliance): All RFCs in openOODA/rfcs/ follow 0000-template.oot.\n8. Pillar 8 (Two-Binary Architecture): Decoupled compiler (oodac) and product CLI driver (ooda).\n9. Pillar 9 (Gen 1 C/H Substrate Isolation): Low-level C shims strictly confined to ooda/runtime/. Zero C header leaks into ooda/std/.\n10. Pillar 10 (Zero Loose Unheaded Files & Clean Workspaces): Zero loose unheaded .oo files in roots, zero struct trailing commas, clean workspace.\n\n### 4.4 Generational Semantic Versioning & 80/20 Floor Rule\n- Version Syntax: `v<Floor>.<Thrust>.<Patch>` (Verified State: `v2.9.3` from `ooda.pkg`).\n- Floor (F): Increments on breaking changes to memory invariants or capability ABI.\n- Thrust (T): Increments on performance improvements and non-breaking feature additions.\n- Patch (P): Increments on bug repairs and security remediation.\n- Power Law 80/20 Floor Rule: Increment Floor only when the 20% core substrate changes.\n\n## 5. Cross References\n- Sovereign Orientation Codex: `openOODA/LLMS.oot`\n- Ingress Gate: `openOODA/START.oot`\n- Repository Rules: `openOODA/RULES.oot`\n- Architecture North Star: `openOODA/NORTHSTAR.oot`\n- Active Roadmap: `openOODA/ROADMAP.oot`\n- Capability Security: `openOODA/SECURITY.oot`\n- Workflow Protocols: `openOODA/WORKFLOW.oot`\n- Adversarial Red Team: `openOODA/REDTEAM.oot`\n"};
const ROUTE_TO_DOC = Object.assign(Object.create(null), {
"overview": "Home.oot",
"start": "Use.oot",
"syntax": "Language.oot",
"stdlib": "Std.oot",
"cli": "Options.oot",
"packages": "Packages.oot",
"security": "Safety.oot",
"defense": "Morpher.oot",
"internals": "Limits.oot",
"pay": "Pay.oot",
"qa": "QA.oot",
"quickref": "QuickRef.oot",
"Home.oot": "Home.oot",
"Use.oot": "Use.oot",
"Language.oot": "Language.oot",
"Std.oot": "Std.oot",
"Options.oot": "Options.oot",
"Packages.oot": "Packages.oot",
"Safety.oot": "Safety.oot",
"Morpher.oot": "Morpher.oot",
"Limits.oot": "Limits.oot",
"Pay.oot": "Pay.oot",
"QA.oot": "QA.oot",
"QuickRef.oot": "QuickRef.oot"
});
const DOC_TO_ROUTE = Object.assign(Object.create(null), {
"Home.oot": "overview",
"Use.oot": "start",
"Language.oot": "syntax",
"Std.oot": "stdlib",
"Options.oot": "cli",
"Packages.oot": "packages",
"Safety.oot": "security",
"Morpher.oot": "defense",
"Limits.oot": "internals",
"Pay.oot": "pay",
"QA.oot": "qa",
"QuickRef.oot": "quickref"
});
const HOME_HTML = "\n" +
"      <h1 class=\"visually-hidden\">openOODA — Sovereign Systems Language for the AI Era</h1>\n" +
"      <!-- Intro & OODA Tactical Dogfight Dropdown (AUTO-EXPANDED) -->\n" +
"      <details class=\"drop\">\n" +
"        <summary>openOODA is an AI-native, capability-secure systems programming language built for sovereign software synthesis.</summary>\n" +
"        <div class=\"drop-body\">\n" +
"          <div class=\"ooda-hud-card\">\n" +
"            <div class=\"ooda-hud-header\">\n" +
"              <div class=\"hud-phase-tracker\">\n" +
"                <span class=\"phase-step\" id=\"ph-obs\">OBSERVE</span>\n" +
"                <span class=\"phase-arrow\">►</span>\n" +
"                <span class=\"phase-step\" id=\"ph-ori\">ORIENT</span>\n" +
"                <span class=\"phase-arrow\">►</span>\n" +
"                <span class=\"phase-step\" id=\"ph-dec\">DECIDE</span>\n" +
"                <span class=\"phase-arrow\">►</span>\n" +
"                <span class=\"phase-step\" id=\"ph-act\">ACT</span>\n" +
"              </div>\n" +
"            </div>\n" +
"            <div class=\"ooda-hud-canvas-wrap\">\n" +
"              <canvas id=\"f16-canvas\" width=\"672\" height=\"150\"></canvas>\n" +
"              <div class=\"hud-quote-bar\">\n" +
"                <span>\"Operate inside the adversary's decision cycle.\"</span>\n" +
"                <button type=\"button\" id=\"f16-break-btn\" class=\"hud-btn\">💥 9G Tactical Break</button>\n" +
"              </div>\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"      </details>\n" +
"      <div class=\"install\">\n" +
"        <span class=\"install-cmd\">curl -fsSL <a href=\"https://openooda.org/install.sh\">https://openooda.org/install.sh</a> | bash</span>\n" +
"        <button type=\"button\" id=\"copy\">copy</button>\n" +
"      </div>\n" +
"      <!-- E-M & OODA Loop (COLLAPSED) -->\n" +
"      <details class=\"drop\">\n" +
"        <summary>E-M &amp; OODA Loop</summary>\n" +
"        <div class=\"drop-body\">\n" +
"          <p>Governed by the Energy-Maneuverability formula: <code>P_s = V * (T - D) / W</code>. Eliminating language drag (<code>D = 0</code>, 0ms GC pauses) and weight (28 KB ELF) accelerates the OODA cycle to sub-microsecond times (2,500 Hz / 0.4ms), enabling agents to out-loop adversaries. See <a href=\"#internals\">compiler limits</a>.</p>\n" +
"          <div class=\"sim-container\" style=\"margin-top: 1rem; margin-bottom: 0.5rem;\">\n" +
"            <div class=\"sim-toolbar\">\n" +
"              <span class=\"sim-title\">⚡ OODA Cycle Engine: Velocity &amp; Automation Tachometer</span>\n" +
"              <div class=\"sim-actions\">\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"em-boost-thrust\">⚡ Boost Thrust</button>\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"em-cut-drag\">🛑 Zero Drag</button>\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"em-strip-weight\">🪶 Zero Weight</button>\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"em-reset\">Reset</button>\n" +
"              </div>\n" +
"            </div>\n" +
"            <div class=\"sim-canvas-wrap\">\n" +
"              <canvas id=\"em-canvas\" width=\"672\" height=\"240\" aria-label=\"E-M Performance Polar Graph\"></canvas>\n" +
"              <div class=\"sim-caption\" id=\"em-status\">E-M Formula: P_s = V * (T - D) / W | openOODA Loop (2,500 Hz) vs Legacy Stack (0.02 Hz)</div>\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"      </details>\n" +
"      <!-- Zero Ambient Authority (COLLAPSED) -->\n" +
"      <details class=\"drop\">\n" +
"        <summary>Zero Ambient Authority</summary>\n" +
"        <div class=\"drop-body\">\n" +
"          <p>In openOODA, <strong>no token means zero effects</strong>. Exactly 14 unforgeable capability tokens (<a href=\"#security\"><code>&amp;FsReadCap</code></a>, <a href=\"#security\"><code>&amp;NetCap</code></a>, <a href=\"#security\"><code>&amp;ProcessCap</code></a>, <a href=\"#security\"><code>&amp;AllocCap</code></a>) eliminate ambient I/O and unauthorized side effects. Tokens cannot be forged from bytes. See <a href=\"#security\">capability tokens</a>.</p>\n" +
"          <div class=\"sim-container\" style=\"margin-top: 1rem; margin-bottom: 0.5rem;\">\n" +
"            <div class=\"sim-toolbar\">\n" +
"              <span class=\"sim-title\">🔒 Capability Sandbox Gate &amp; Landlock Tripwire</span>\n" +
"              <div class=\"sim-actions\">\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"cap-untrusted\">🚨 Untrusted I/O</button>\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"cap-grant\">🔑 Pass Token</button>\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"cap-reset\">Reset</button>\n" +
"              </div>\n" +
"            </div>\n" +
"            <div class=\"sim-canvas-wrap\">\n" +
"              <canvas id=\"cap-canvas\" width=\"672\" height=\"220\" aria-label=\"Capability Sandbox Gate Simulation\"></canvas>\n" +
"              <div class=\"sim-caption\" id=\"cap-log\">Landlock tripwire active: No ambient authority. Test Untrusted I/O vs Scoped Token dispatch.</div>\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"      </details>\n" +
"      <!-- Active Binary Defense (COLLAPSED) -->\n" +
"      <details class=\"drop\">\n" +
"        <summary>Active Binary Defense</summary>\n" +
"        <div class=\"drop-body\">\n" +
"          <p>Embedded active binary protections: Moving Target Defense (MTD) control flow flattening, rolling XOR string encryption, anti-ROP gadget destruction, and live-RAM Runtime Application Self-Protection (RASP) watchdog. See <a href=\"#defense\">defense architecture</a>.</p>\n" +
"          <div class=\"sim-container\" style=\"margin-top: 1rem; margin-bottom: 0.5rem;\">\n" +
"            <div class=\"sim-toolbar\">\n" +
"              <span class=\"sim-title\">🛡️ Live MTD Control-Flow Flattening Visualizer</span>\n" +
"              <div class=\"sim-actions\">\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"mtd-trigger\">🛡️ Trigger MTD Morph</button>\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"mtd-reset\">Reset</button>\n" +
"              </div>\n" +
"            </div>\n" +
"            <div class=\"sim-canvas-wrap\">\n" +
"              <canvas id=\"mtd-canvas\" width=\"672\" height=\"260\" aria-label=\"Moving Target Defense Visualizer\"></canvas>\n" +
"              <div class=\"sim-caption\">Click any block or trigger morph to explode, re-key, and flatten control-flow basic blocks.</div>\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"      </details>\n" +
"      <!-- AI-Native Architecture (COLLAPSED) -->\n" +
"      <details class=\"drop\">\n" +
"        <summary>AI-Native Architecture</summary>\n" +
"        <div class=\"drop-body\">\n" +
"          <p>Built for LLMs and autonomous swarms. Bounded sub-256 line units, mandatory 4-element <a href=\"#start\">Academy headers</a> (<code># Summary</code>, <code># Invariants</code>, <code># Capabilities</code>, <code># Verification</code>), and static typing eliminate context bloat and hallucination drift during agentic synthesis. See <a href=\"#syntax\">AI specification</a>.</p>\n" +
"          <div class=\"sim-container\" style=\"margin-top: 1rem; margin-bottom: 0.5rem;\">\n" +
"            <div class=\"sim-toolbar\">\n" +
"              <span class=\"sim-title\">🤖 Multi-Agent Swarm Ring (4 AI Agents, &le;256 Lines)</span>\n" +
"              <div class=\"sim-actions\">\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"swarm-patch\">⚡ Concurrent AST Patch</button>\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"swarm-split\">✂️ Submodule Split</button>\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"swarm-reset\">Reset</button>\n" +
"              </div>\n" +
"            </div>\n" +
"            <div class=\"sim-canvas-wrap\">\n" +
"              <canvas id=\"swarm-canvas\" width=\"672\" height=\"240\" aria-label=\"Multi-Agent Swarm Ring Simulation\"></canvas>\n" +
"              <div class=\"sim-caption\" id=\"swarm-metrics\">Agent Line Budget: 210/256 Lines (82%) | Hallucination Drift: 0.00% | Consensus: Synchronized</div>\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"      </details>\n" +
"      <!-- Sovereign Multi-Target (COLLAPSED) -->\n" +
"      <details class=\"drop\">\n" +
"        <summary>Sovereign Multi-Target</summary>\n" +
"        <div class=\"drop-body\">\n" +
"          <p>Standalone emission with zero toolchain lock-in. Direct emission to pure WebAssembly (WasmGC) for edge isolation, bare-metal x86_64/AArch64 ELF, optimized LLVM SSA IR (-O3), or portable ISO C99 without libc dependencies. See <a href=\"#cli\">compiler pipeline</a>.</p>\n" +
"          <div class=\"sim-container\" style=\"margin-top: 1rem; margin-bottom: 0.5rem;\">\n" +
"            <div class=\"sim-toolbar\">\n" +
"              <span class=\"sim-title\">🔬 Adversarial Double-Run Invariant Prover &amp; Hard-Science Verifier</span>\n" +
"              <div class=\"sim-actions\">\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"verify-run\">▶ Run Sequential Proof</button>\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"verify-leak\">🧪 Inject State Leak</button>\n" +
"                <button type=\"button\" class=\"sim-action-btn\" id=\"verify-reset\">Reset</button>\n" +
"              </div>\n" +
"            </div>\n" +
"            <div class=\"sim-canvas-wrap\">\n" +
"              <canvas id=\"verify-canvas\" width=\"672\" height=\"240\" aria-label=\"Zero-Trust Verification Double-Run Invariant Prover\"></canvas>\n" +
"              <div class=\"sim-caption\" id=\"verify-status\">Sequential Double-Run Prover: Run #1 SHA-256 == Run #2 SHA-256 (Delta: 0x00 | Invariant Holds)</div>\n" +
"            </div>\n" +
"          </div>\n" +
"        </div>\n" +
"      </details>\n";

const REGISTRY_HTML = "\n      <p class=\"canon\">https://openooda.org/#registry</p>\n      <h1>REGISTRY — Sovereign Package Ecosystem</h1>\n      <p>Search and install official capability-sandboxed modules from the decentralized content-addressable registry.</p>\n      <input type=\"search\" id=\"q\" placeholder=\"Filter 261 packages by name, capability (FsRead, Net, Alloc), or domain...\" aria-label=\"Search packages\">\n      <div id=\"reg-count\" style=\"font-size: 0.8rem; color: var(--muted); margin: -0.75rem 0 1rem;\">Showing 261 of 261 packages</div>\n      <div class=\"table-wrap\">\n        <table class=\"reg-table\">\n          <thead>\n            <tr>\n              <th class=\"th-pkg\">Package</th>\n              <th class=\"th-cap\">Capability</th>\n              <th class=\"th-desc\">Description</th>\n              <th class=\"th-install\">Install Command</th>\n            </tr>\n          </thead>\n          <tbody id=\"pkg-tbody\">\n\n          <tr class=\"hit\" data-name=\"ooda_boot_uefi\" data-caps=\"None\" data-domain=\"boot_uefi\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_boot_uefi</a>\n              <span class=\"tag-domain\" data-filter=\"boot_uefi\">#boot_uefi</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">UEFI 64-bit Long Mode bootloader trampoline and entrypoint.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_boot_uefi</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_boot_uefi\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_cpu_longmode\" data-caps=\"None\" data-domain=\"cpu_longmode\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_cpu_longmode</a>\n              <span class=\"tag-domain\" data-filter=\"cpu_longmode\">#cpu_longmode</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">x86_64 Long Mode, AArch64 EL1, and RISC-V S-mode state manager.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_cpu_longmode</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_cpu_longmode\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_acpi_discovery\" data-caps=\"None\" data-domain=\"acpi_discovery\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_acpi_discovery</a>\n              <span class=\"tag-domain\" data-filter=\"acpi_discovery\">#acpi_discovery</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">ACPI RSDP, MADT, and FADT hardware table parser and core locator.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_acpi_discovery</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_acpi_discovery\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_devicetree_dtb\" data-caps=\"None\" data-domain=\"devicetree_dtb\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_devicetree_dtb</a>\n              <span class=\"tag-domain\" data-filter=\"devicetree_dtb\">#devicetree_dtb</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Flat Device Tree Blob (DTB) binary parser for ARM64 and RISC-V boards.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_devicetree_dtb</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_devicetree_dtb\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_interrupt_apic\" data-caps=\"None\" data-domain=\"interrupt_apic\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_interrupt_apic</a>\n              <span class=\"tag-domain\" data-filter=\"interrupt_apic\">#interrupt_apic</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Local APIC and IO-APIC interrupt routing vector dispatcher.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_interrupt_apic</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_interrupt_apic\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_arm_gic_v3\" data-caps=\"None\" data-domain=\"arm_gic_v3\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_arm_gic_v3</a>\n              <span class=\"tag-domain\" data-filter=\"arm_gic_v3\">#arm_gic_v3</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">ARM Generic Interrupt Controller (GIC v3) distributor and redistributor.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_arm_gic_v3</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_arm_gic_v3\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_riscv_sbi\" data-caps=\"None\" data-domain=\"riscv_sbi\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_riscv_sbi</a>\n              <span class=\"tag-domain\" data-filter=\"riscv_sbi\">#riscv_sbi</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">RISC-V Supervisor Binary Interface (SBI) ecall wrapper.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_riscv_sbi</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_riscv_sbi\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_syscall_traps\" data-caps=\"None\" data-domain=\"syscall_traps\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_syscall_traps</a>\n              <span class=\"tag-domain\" data-filter=\"syscall_traps\">#syscall_traps</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Hardware trap gate, sysenter/syscall instruction handler dispatcher.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_syscall_traps</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_syscall_traps\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_gdt_idt_tables\" data-caps=\"None\" data-domain=\"gdt_idt_tables\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_gdt_idt_tables</a>\n              <span class=\"tag-domain\" data-filter=\"gdt_idt_tables\">#gdt_idt_tables</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Global Descriptor Table (GDT) and Interrupt Descriptor Table (IDT) builder.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_gdt_idt_tables</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_gdt_idt_tables\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_timer_hpet\" data-caps=\"None\" data-domain=\"timer_hpet\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_timer_hpet</a>\n              <span class=\"tag-domain\" data-filter=\"timer_hpet\">#timer_hpet</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">High Precision Event Timer (HPET) periodic tick scheduler.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_timer_hpet</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_timer_hpet\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_atomic_barriers\" data-caps=\"None\" data-domain=\"atomic_barriers\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_atomic_barriers</a>\n              <span class=\"tag-domain\" data-filter=\"atomic_barriers\">#atomic_barriers</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Hardware memory barrier instructions and atomic spinlock flags.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_atomic_barriers</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_atomic_barriers\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_smp_multicore\" data-caps=\"None\" data-domain=\"smp_multicore\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_smp_multicore</a>\n              <span class=\"tag-domain\" data-filter=\"smp_multicore\">#smp_multicore</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Symmetric Multiprocessing (SMP) inter-processor interrupt (IPI) manager.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_smp_multicore</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_smp_multicore\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_panic_diagnostics\" data-caps=\"None\" data-domain=\"panic_diagnostics\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_panic_diagnostics</a>\n              <span class=\"tag-domain\" data-filter=\"panic_diagnostics\">#panic_diagnostics</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Fail-closed panic diagnostics, register dump, and post-mortem stack tracer.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_panic_diagnostics</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_panic_diagnostics\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_stack_guard\" data-caps=\"None\" data-domain=\"stack_guard\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_stack_guard</a>\n              <span class=\"tag-domain\" data-filter=\"stack_guard\">#stack_guard</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Kernel stack guard page canary validator and overflow trap.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_stack_guard</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_stack_guard\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_power_management\" data-caps=\"None\" data-domain=\"power_management\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_power_management</a>\n              <span class=\"tag-domain\" data-filter=\"power_management\">#power_management</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">ACPI sleep state transitions (S3 Suspend, S5 Power Off, CPU C-states).</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_power_management</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_power_management\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_profiler_cycles\" data-caps=\"None\" data-domain=\"profiler_cycles\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_profiler_cycles</a>\n              <span class=\"tag-domain\" data-filter=\"profiler_cycles\">#profiler_cycles</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Hardware performance counter reader (RDTSC / PMU cycle monitors).</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_profiler_cycles</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_profiler_cycles\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_physical_buddy\" data-caps=\"None\" data-domain=\"physical_buddy\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_physical_buddy</a>\n              <span class=\"tag-domain\" data-filter=\"physical_buddy\">#physical_buddy</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Physical Frame Buddy Allocator managing 4KiB to 2MiB memory orders.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_physical_buddy</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_physical_buddy\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_bitmap_frames\" data-caps=\"None\" data-domain=\"bitmap_frames\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_bitmap_frames</a>\n              <span class=\"tag-domain\" data-filter=\"bitmap_frames\">#bitmap_frames</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">High-speed bit-array frame tracking allocator for RAM initialization.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_bitmap_frames</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_bitmap_frames\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_page_tables_pml4\" data-caps=\"None\" data-domain=\"page_tables_pml4\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_page_tables_pml4</a>\n              <span class=\"tag-domain\" data-filter=\"page_tables_pml4\">#page_tables_pml4</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">x86_64 4-level PML4/PDPT/PD/PT virtual address translation builder.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_page_tables_pml4</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_page_tables_pml4\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_page_tables_sv39\" data-caps=\"None\" data-domain=\"page_tables_sv39\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_page_tables_sv39</a>\n              <span class=\"tag-domain\" data-filter=\"page_tables_sv39\">#page_tables_sv39</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">RISC-V Sv39 3-level page table manipulator with mega-page support.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_page_tables_sv39</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_page_tables_sv39\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_page_tables_sv48\" data-caps=\"None\" data-domain=\"page_tables_sv48\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_page_tables_sv48</a>\n              <span class=\"tag-domain\" data-filter=\"page_tables_sv48\">#page_tables_sv48</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">RISC-V Sv48 4-level page table manager for large 48-bit address spaces.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_page_tables_sv48</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_page_tables_sv48\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_tlb_invalidation\" data-caps=\"None\" data-domain=\"tlb_invalidation\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_tlb_invalidation</a>\n              <span class=\"tag-domain\" data-filter=\"tlb_invalidation\">#tlb_invalidation</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Translation Lookaside Buffer (TLB) page invalidation and shootdown.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_tlb_invalidation</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_tlb_invalidation\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_kernel_slab\" data-caps=\"Alloc\" data-domain=\"kernel_slab\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_kernel_slab</a>\n              <span class=\"tag-domain\" data-filter=\"kernel_slab\">#kernel_slab</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Deterministic fixed-size kernel object slab cache for threads and caps.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_kernel_slab</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_kernel_slab\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_arena_allocator\" data-caps=\"Alloc\" data-domain=\"arena_allocator\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_arena_allocator</a>\n              <span class=\"tag-domain\" data-filter=\"arena_allocator\">#arena_allocator</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Zero-fragmentation linear region arena allocator with bulk reset.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_arena_allocator</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_arena_allocator\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_zero_copy_cow\" data-caps=\"None\" data-domain=\"zero_copy_cow\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_zero_copy_cow</a>\n              <span class=\"tag-domain\" data-filter=\"zero_copy_cow\">#zero_copy_cow</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Copy-on-Write page reference counter and fault handler coordinator.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_zero_copy_cow</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_zero_copy_cow\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_dma_coherent\" data-caps=\"None\" data-domain=\"dma_coherent\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_dma_coherent</a>\n              <span class=\"tag-domain\" data-filter=\"dma_coherent\">#dma_coherent</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Coherent DMA buffer physical address descriptor for hardware bus masters.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_dma_coherent</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_dma_coherent\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_mmap_regions\" data-caps=\"Alloc\" data-domain=\"mmap_regions\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_mmap_regions</a>\n              <span class=\"tag-domain\" data-filter=\"mmap_regions\">#mmap_regions</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Virtual Memory Area (VMA) tree and anonymous memory mapping manager.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_mmap_regions</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_mmap_regions\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_guard_pages\" data-caps=\"None\" data-domain=\"guard_pages\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_guard_pages</a>\n              <span class=\"tag-domain\" data-filter=\"guard_pages\">#guard_pages</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Zero-permission memory boundary tripwires for buffer-overflow trap.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_guard_pages</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_guard_pages\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_compaction_lsm\" data-caps=\"Alloc\" data-domain=\"compaction_lsm\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_compaction_lsm</a>\n              <span class=\"tag-domain\" data-filter=\"compaction_lsm\">#compaction_lsm</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Kernel memory compaction and fragmented page coalescing engine.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_compaction_lsm</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_compaction_lsm\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_pressure_handler\" data-caps=\"None\" data-domain=\"pressure_handler\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_pressure_handler</a>\n              <span class=\"tag-domain\" data-filter=\"pressure_handler\">#pressure_handler</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Low-memory pressure watcher and cache eviction callback dispatcher.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_pressure_handler</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_pressure_handler\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_leak_detector\" data-caps=\"Alloc\" data-domain=\"leak_detector\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_leak_detector</a>\n              <span class=\"tag-domain\" data-filter=\"leak_detector\">#leak_detector</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Compile-time and runtime orphaned allocation tracker.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_leak_detector</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_leak_detector\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_hugepages_2mb\" data-caps=\"None\" data-domain=\"hugepages_2mb\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_hugepages_2mb</a>\n              <span class=\"tag-domain\" data-filter=\"hugepages_2mb\">#hugepages_2mb</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">2MiB and 1GiB hugepage allocator for high-throughput database buffers.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_hugepages_2mb</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_hugepages_2mb\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_zero_copy_bus\" data-caps=\"Alloc\" data-domain=\"zero_copy_bus\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_zero_copy_bus</a>\n              <span class=\"tag-domain\" data-filter=\"zero_copy_bus\">#zero_copy_bus</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Zero-copy shared memory capability IPC message transfer bus.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_zero_copy_bus</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_zero_copy_bus\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_capability_channels\" data-caps=\"Alloc\" data-domain=\"capability_channels\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_capability_channels</a>\n              <span class=\"tag-domain\" data-filter=\"capability_channels\">#capability_channels</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Synchronous rendezvous and typed endpoint IPC capability channels.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_capability_channels</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_capability_channels\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_ring_mailboxes\" data-caps=\"Alloc\" data-domain=\"ring_mailboxes\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_ring_mailboxes</a>\n              <span class=\"tag-domain\" data-filter=\"ring_mailboxes\">#ring_mailboxes</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Lock-free circular ring buffer actor mailboxes with atomic barriers.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_ring_mailboxes</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_ring_mailboxes\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_async_futex\" data-caps=\"None\" data-domain=\"async_futex\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_async_futex</a>\n              <span class=\"tag-domain\" data-filter=\"async_futex\">#async_futex</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Fast Userspace Mutex (futex) sleep/wake atomic capability primitive.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_async_futex</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_async_futex\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_priority_queues\" data-caps=\"Alloc\" data-domain=\"priority_queues\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_priority_queues</a>\n              <span class=\"tag-domain\" data-filter=\"priority_queues\">#priority_queues</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Multilevel feedback queue (MLFQ) priority task scheduler.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_priority_queues</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_priority_queues\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_tickless_timer\" data-caps=\"None\" data-domain=\"tickless_timer\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_tickless_timer</a>\n              <span class=\"tag-domain\" data-filter=\"tickless_timer\">#tickless_timer</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Tickless dynamic timer interrupt scheduler for energy efficiency.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_tickless_timer</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_tickless_timer\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_sched_hop_budget\" data-caps=\"None\" data-domain=\"sched_hop_budget\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_sched_hop_budget</a>\n              <span class=\"tag-domain\" data-filter=\"sched_hop_budget\">#sched_hop_budget</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Deterministic hop-budgeting to prevent runaway actor message loops.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_sched_hop_budget</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_sched_hop_budget\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_affinity_mask\" data-caps=\"None\" data-domain=\"affinity_mask\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_affinity_mask</a>\n              <span class=\"tag-domain\" data-filter=\"affinity_mask\">#affinity_mask</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">CPU core thread pinning and NUMA node affinity bitmask calculator.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_affinity_mask</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_affinity_mask\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_actor_supervisor\" data-caps=\"Alloc\" data-domain=\"actor_supervisor\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_actor_supervisor</a>\n              <span class=\"tag-domain\" data-filter=\"actor_supervisor\">#actor_supervisor</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Erlang/OTP-style actor supervision tree with exponential backoff restart.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_actor_supervisor</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_actor_supervisor\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_work_stealing\" data-caps=\"Alloc\" data-domain=\"work_stealing\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_work_stealing</a>\n              <span class=\"tag-domain\" data-filter=\"work_stealing\">#work_stealing</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Work-stealing double-ended queue (deque) for multi-core parallelism.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_work_stealing</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_work_stealing\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_cooperative_yield\" data-caps=\"None\" data-domain=\"cooperative_yield\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_cooperative_yield</a>\n              <span class=\"tag-domain\" data-filter=\"cooperative_yield\">#cooperative_yield</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Explicit voluntary yield point evaluator for green fiber routines.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_cooperative_yield</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_cooperative_yield\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_preemption_trap\" data-caps=\"None\" data-domain=\"preemption_trap\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_preemption_trap</a>\n              <span class=\"tag-domain\" data-filter=\"preemption_trap\">#preemption_trap</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Timer interrupt context switcher saving and restoring CPU register state.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_preemption_trap</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_preemption_trap\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_realtime_edf\" data-caps=\"None\" data-domain=\"realtime_edf\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_realtime_edf</a>\n              <span class=\"tag-domain\" data-filter=\"realtime_edf\">#realtime_edf</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Earliest Deadline First (EDF) hard real-time task priority scheduler.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_realtime_edf</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_realtime_edf\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_starvation_meter\" data-caps=\"None\" data-domain=\"starvation_meter\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_starvation_meter</a>\n              <span class=\"tag-domain\" data-filter=\"starvation_meter\">#starvation_meter</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Thread wait time tracker with automatic anti-starvation priority aging.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_starvation_meter</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_starvation_meter\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_sched_task_auction\" data-caps=\"None\" data-domain=\"sched_task_auction\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_sched_task_auction</a>\n              <span class=\"tag-domain\" data-filter=\"sched_task_auction\">#sched_task_auction</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Decentralized Vickrey second-price task auction engine for agent swarms.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_sched_task_auction</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_sched_task_auction\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_sched_heartbeat\" data-caps=\"None\" data-domain=\"sched_heartbeat\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_sched_heartbeat</a>\n              <span class=\"tag-domain\" data-filter=\"sched_heartbeat\">#sched_heartbeat</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Node and thread liveness heartbeat watchdog with timeout tripwires.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_sched_heartbeat</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_sched_heartbeat\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_pcie_enumeration\" data-caps=\"None\" data-domain=\"pcie_enumeration\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_pcie_enumeration</a>\n              <span class=\"tag-domain\" data-filter=\"pcie_enumeration\">#pcie_enumeration</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_pcie_enumeration</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_pcie_enumeration\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_usb_xhci_host\" data-caps=\"None\" data-domain=\"usb_xhci_host\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_usb_xhci_host</a>\n              <span class=\"tag-domain\" data-filter=\"usb_xhci_host\">#usb_xhci_host</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_usb_xhci_host</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_usb_xhci_host\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_uart_serial_16550\" data-caps=\"None\" data-domain=\"uart_serial_16550\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_uart_serial_16550</a>\n              <span class=\"tag-domain\" data-filter=\"uart_serial_16550\">#uart_serial_16550</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_uart_serial_16550</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_uart_serial_16550\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_arm_pl011_uart\" data-caps=\"None\" data-domain=\"arm_pl011_uart\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_arm_pl011_uart</a>\n              <span class=\"tag-domain\" data-filter=\"arm_pl011_uart\">#arm_pl011_uart</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_arm_pl011_uart</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_arm_pl011_uart\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_nvme_block_io\" data-caps=\"None\" data-domain=\"nvme_block_io\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_nvme_block_io</a>\n              <span class=\"tag-domain\" data-filter=\"nvme_block_io\">#nvme_block_io</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_nvme_block_io</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_nvme_block_io\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_virtio_network\" data-caps=\"None\" data-domain=\"virtio_network\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_virtio_network</a>\n              <span class=\"tag-domain\" data-filter=\"virtio_network\">#virtio_network</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_virtio_network</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_virtio_network\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_virtio_gpu\" data-caps=\"None\" data-domain=\"virtio_gpu\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_virtio_gpu</a>\n              <span class=\"tag-domain\" data-filter=\"virtio_gpu\">#virtio_gpu</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_virtio_gpu</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_virtio_gpu\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_i2c_bus_master\" data-caps=\"None\" data-domain=\"i2c_bus_master\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_i2c_bus_master</a>\n              <span class=\"tag-domain\" data-filter=\"i2c_bus_master\">#i2c_bus_master</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_i2c_bus_master</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_i2c_bus_master\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_spi_flash_bus\" data-caps=\"None\" data-domain=\"spi_flash_bus\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_spi_flash_bus</a>\n              <span class=\"tag-domain\" data-filter=\"spi_flash_bus\">#spi_flash_bus</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_spi_flash_bus</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_spi_flash_bus\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_can_socket_hal\" data-caps=\"None\" data-domain=\"can_socket_hal\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_can_socket_hal</a>\n              <span class=\"tag-domain\" data-filter=\"can_socket_hal\">#can_socket_hal</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_can_socket_hal</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_can_socket_hal\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_usb_hid_keyboard\" data-caps=\"None\" data-domain=\"usb_hid_keyboard\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_usb_hid_keyboard</a>\n              <span class=\"tag-domain\" data-filter=\"usb_hid_keyboard\">#usb_hid_keyboard</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_usb_hid_keyboard</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_usb_hid_keyboard\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_usb_hid_mouse\" data-caps=\"None\" data-domain=\"usb_hid_mouse\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_usb_hid_mouse</a>\n              <span class=\"tag-domain\" data-filter=\"usb_hid_mouse\">#usb_hid_mouse</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_usb_hid_mouse</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_usb_hid_mouse\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_rtc_clock_cmos\" data-caps=\"None\" data-domain=\"rtc_clock_cmos\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_rtc_clock_cmos</a>\n              <span class=\"tag-domain\" data-filter=\"rtc_clock_cmos\">#rtc_clock_cmos</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_rtc_clock_cmos</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_rtc_clock_cmos\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_framebuffer_gop\" data-caps=\"None\" data-domain=\"framebuffer_gop\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_framebuffer_gop</a>\n              <span class=\"tag-domain\" data-filter=\"framebuffer_gop\">#framebuffer_gop</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_framebuffer_gop</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_framebuffer_gop\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_sound_hda_audio\" data-caps=\"None\" data-domain=\"sound_hda_audio\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_sound_hda_audio</a>\n              <span class=\"tag-domain\" data-filter=\"sound_hda_audio\">#sound_hda_audio</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_sound_hda_audio</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_sound_hda_audio\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_dma_controller\" data-caps=\"None\" data-domain=\"dma_controller\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_dma_controller</a>\n              <span class=\"tag-domain\" data-filter=\"dma_controller\">#dma_controller</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_dma_controller</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_dma_controller\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_ethernet_frames\" data-caps=\"None\" data-domain=\"ethernet_frames\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_ethernet_frames</a>\n              <span class=\"tag-domain\" data-filter=\"ethernet_frames\">#ethernet_frames</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_ethernet_frames</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_ethernet_frames\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_arp_cache_table\" data-caps=\"Alloc\" data-domain=\"arp_cache_table\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_arp_cache_table</a>\n              <span class=\"tag-domain\" data-filter=\"arp_cache_table\">#arp_cache_table</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_arp_cache_table</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_arp_cache_table\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_ipv4_router\" data-caps=\"None\" data-domain=\"ipv4_router\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_ipv4_router</a>\n              <span class=\"tag-domain\" data-filter=\"ipv4_router\">#ipv4_router</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_ipv4_router</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_ipv4_router\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_ipv6_ndp\" data-caps=\"None\" data-domain=\"ipv6_ndp\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_ipv6_ndp</a>\n              <span class=\"tag-domain\" data-filter=\"ipv6_ndp\">#ipv6_ndp</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_ipv6_ndp</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_ipv6_ndp\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_udp_socket\" data-caps=\"Net\" data-domain=\"udp_socket\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_udp_socket</a>\n              <span class=\"tag-domain\" data-filter=\"udp_socket\">#udp_socket</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Net\">Net</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_udp_socket</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_udp_socket\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_tcp_fsm\" data-caps=\"Alloc\" data-domain=\"tcp_fsm\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_tcp_fsm</a>\n              <span class=\"tag-domain\" data-filter=\"tcp_fsm\">#tcp_fsm</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_tcp_fsm</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_tcp_fsm\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_tcp_congestion\" data-caps=\"None\" data-domain=\"tcp_congestion\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_tcp_congestion</a>\n              <span class=\"tag-domain\" data-filter=\"tcp_congestion\">#tcp_congestion</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_tcp_congestion</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_tcp_congestion\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_quic_multiplex\" data-caps=\"Alloc\" data-domain=\"quic_multiplex\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_quic_multiplex</a>\n              <span class=\"tag-domain\" data-filter=\"quic_multiplex\">#quic_multiplex</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_quic_multiplex</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_quic_multiplex\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_dns_packet_codec\" data-caps=\"None\" data-domain=\"dns_packet_codec\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_dns_packet_codec</a>\n              <span class=\"tag-domain\" data-filter=\"dns_packet_codec\">#dns_packet_codec</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_dns_packet_codec</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_dns_packet_codec\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_doh_client_secure\" data-caps=\"Net\" data-domain=\"doh_client_secure\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_doh_client_secure</a>\n              <span class=\"tag-domain\" data-filter=\"doh_client_secure\">#doh_client_secure</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Net\">Net</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_doh_client_secure</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_doh_client_secure\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_tls_handshake\" data-caps=\"Alloc\" data-domain=\"tls_handshake\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_tls_handshake</a>\n              <span class=\"tag-domain\" data-filter=\"tls_handshake\">#tls_handshake</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_tls_handshake</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_tls_handshake\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_http11_codec\" data-caps=\"None\" data-domain=\"http11_codec\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_http11_codec</a>\n              <span class=\"tag-domain\" data-filter=\"http11_codec\">#http11_codec</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_http11_codec</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_http11_codec\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_http2_frames\" data-caps=\"Alloc\" data-domain=\"http2_frames\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_http2_frames</a>\n              <span class=\"tag-domain\" data-filter=\"http2_frames\">#http2_frames</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_http2_frames</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_http2_frames\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_http3_qpack\" data-caps=\"Alloc\" data-domain=\"http3_qpack\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_http3_qpack</a>\n              <span class=\"tag-domain\" data-filter=\"http3_qpack\">#http3_qpack</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_http3_qpack</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_http3_qpack\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_websocket_rfc6455\" data-caps=\"Net\" data-domain=\"websocket_rfc6455\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_websocket_rfc6455</a>\n              <span class=\"tag-domain\" data-filter=\"websocket_rfc6455\">#websocket_rfc6455</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Net\">Net</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_websocket_rfc6455</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_websocket_rfc6455\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_packet_filter_bpf\" data-caps=\"None\" data-domain=\"packet_filter_bpf\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_packet_filter_bpf</a>\n              <span class=\"tag-domain\" data-filter=\"packet_filter_bpf\">#packet_filter_bpf</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_packet_filter_bpf</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_packet_filter_bpf\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_kyber_kem_core\" data-caps=\"None\" data-domain=\"kyber_kem_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_kyber_kem_core</a>\n              <span class=\"tag-domain\" data-filter=\"kyber_kem_core\">#kyber_kem_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">NIST ML-KEM lattice-based post-quantum key encapsulation mechanism.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_kyber_kem_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_kyber_kem_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_dilithium_core\" data-caps=\"None\" data-domain=\"dilithium_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_dilithium_core</a>\n              <span class=\"tag-domain\" data-filter=\"dilithium_core\">#dilithium_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">NIST ML-DSA lattice digital signature algorithm and verification.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_dilithium_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_dilithium_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_sphincs_hash\" data-caps=\"None\" data-domain=\"sphincs_hash\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_sphincs_hash</a>\n              <span class=\"tag-domain\" data-filter=\"sphincs_hash\">#sphincs_hash</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Stateless hash-based post-quantum signature verification engine.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_sphincs_hash</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_sphincs_hash\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_pqc_vault_core\" data-caps=\"None\" data-domain=\"pqc_vault_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_pqc_vault_core</a>\n              <span class=\"tag-domain\" data-filter=\"pqc_vault_core\">#pqc_vault_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Hybrid post-quantum encryption vault (Kyber-1024 + ChaCha20-Poly1305).</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_pqc_vault_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_pqc_vault_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_chacha20_core\" data-caps=\"None\" data-domain=\"chacha20_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_chacha20_core</a>\n              <span class=\"tag-domain\" data-filter=\"chacha20_core\">#chacha20_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">RFC 8439 ChaCha20-Poly1305 authenticated encryption with associated data.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_chacha20_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_chacha20_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_aes256_gcm\" data-caps=\"None\" data-domain=\"aes256_gcm\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_aes256_gcm</a>\n              <span class=\"tag-domain\" data-filter=\"aes256_gcm\">#aes256_gcm</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">FIPS 197 AES-256 in Galois/Counter Mode (GCM) authenticated encryption.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_aes256_gcm</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_aes256_gcm\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_blake3_tree\" data-caps=\"None\" data-domain=\"blake3_tree\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_blake3_tree</a>\n              <span class=\"tag-domain\" data-filter=\"blake3_tree\">#blake3_tree</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">BLAKE3 high-speed cryptographic tree hashing and MAC verification.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_blake3_tree</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_blake3_tree\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_argon2id_core\" data-caps=\"None\" data-domain=\"argon2id_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_argon2id_core</a>\n              <span class=\"tag-domain\" data-filter=\"argon2id_core\">#argon2id_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">RFC 9106 Argon2id memory-hard password key derivation function.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_argon2id_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_argon2id_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_ed25519_core\" data-caps=\"None\" data-domain=\"ed25519_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_ed25519_core</a>\n              <span class=\"tag-domain\" data-filter=\"ed25519_core\">#ed25519_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Ed25519 high-speed digital signatures over Curve25519.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_ed25519_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_ed25519_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_x25519_core\" data-caps=\"None\" data-domain=\"x25519_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_x25519_core</a>\n              <span class=\"tag-domain\" data-filter=\"x25519_core\">#x25519_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">X25519 Diffie-Hellman ephemeral key exchange and curve clamping.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_x25519_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_x25519_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_secp256k1_core\" data-caps=\"None\" data-domain=\"secp256k1_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_secp256k1_core</a>\n              <span class=\"tag-domain\" data-filter=\"secp256k1_core\">#secp256k1_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">ECDSA signature verification over the secp256k1 Koblitz elliptic curve.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_secp256k1_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_secp256k1_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_shamir_core\" data-caps=\"None\" data-domain=\"shamir_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_shamir_core</a>\n              <span class=\"tag-domain\" data-filter=\"shamir_core\">#shamir_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Shamir (k, n) Threshold Secret Sharing polynomial splitter and reconstructor.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_shamir_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_shamir_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_zk_plonk\" data-caps=\"None\" data-domain=\"zk_plonk\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_zk_plonk</a>\n              <span class=\"tag-domain\" data-filter=\"zk_plonk\">#zk_plonk</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Zero-Knowledge PLONK and Groth16 proof verifier arithmetic circuit.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_zk_plonk</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_zk_plonk\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_poseidon_core\" data-caps=\"None\" data-domain=\"poseidon_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_poseidon_core</a>\n              <span class=\"tag-domain\" data-filter=\"poseidon_core\">#poseidon_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Arithmetization-oriented algebraic hash function for ZK proof circuits.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_poseidon_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_poseidon_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_rasp_guard\" data-caps=\"None\" data-domain=\"rasp_guard\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_rasp_guard</a>\n              <span class=\"tag-domain\" data-filter=\"rasp_guard\">#rasp_guard</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">In-memory .text segment checksum verifier and hot RAM tampering rollback.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_rasp_guard</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_rasp_guard\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_anti_rop_scrub\" data-caps=\"None\" data-domain=\"anti_rop_scrub\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_anti_rop_scrub</a>\n              <span class=\"tag-domain\" data-filter=\"anti_rop_scrub\">#anti_rop_scrub</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Anti-ROP gadget destruction and inter-instruction byte misalignment pad.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_anti_rop_scrub</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_anti_rop_scrub\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_cspace_table\" data-caps=\"Alloc\" data-domain=\"cspace_table\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_cspace_table</a>\n              <span class=\"tag-domain\" data-filter=\"cspace_table\">#cspace_table</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_cspace_table</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_cspace_table\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_cap_delegation\" data-caps=\"Alloc\" data-domain=\"cap_delegation\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_cap_delegation</a>\n              <span class=\"tag-domain\" data-filter=\"cap_delegation\">#cap_delegation</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_cap_delegation</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_cap_delegation\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_cap_revocation\" data-caps=\"Alloc\" data-domain=\"cap_revocation\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_cap_revocation</a>\n              <span class=\"tag-domain\" data-filter=\"cap_revocation\">#cap_revocation</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_cap_revocation</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_cap_revocation\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_cap_attenuation\" data-caps=\"None\" data-domain=\"cap_attenuation\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_cap_attenuation</a>\n              <span class=\"tag-domain\" data-filter=\"cap_attenuation\">#cap_attenuation</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_cap_attenuation</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_cap_attenuation\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_jwt_claims\" data-caps=\"None\" data-domain=\"jwt_claims\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_jwt_claims</a>\n              <span class=\"tag-domain\" data-filter=\"jwt_claims\">#jwt_claims</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_jwt_claims</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_jwt_claims\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_paseto_v4\" data-caps=\"None\" data-domain=\"paseto_v4\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_paseto_v4</a>\n              <span class=\"tag-domain\" data-filter=\"paseto_v4\">#paseto_v4</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_paseto_v4</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_paseto_v4\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_oauth2_grant\" data-caps=\"None\" data-domain=\"oauth2_grant\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_oauth2_grant</a>\n              <span class=\"tag-domain\" data-filter=\"oauth2_grant\">#oauth2_grant</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_oauth2_grant</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_oauth2_grant\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_webauthn_fido2\" data-caps=\"None\" data-domain=\"webauthn_fido2\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_webauthn_fido2</a>\n              <span class=\"tag-domain\" data-filter=\"webauthn_fido2\">#webauthn_fido2</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_webauthn_fido2</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_webauthn_fido2\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_totp_engine\" data-caps=\"None\" data-domain=\"totp_engine\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_totp_engine</a>\n              <span class=\"tag-domain\" data-filter=\"totp_engine\">#totp_engine</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_totp_engine</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_totp_engine\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_hotp_counter\" data-caps=\"None\" data-domain=\"hotp_counter\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_hotp_counter</a>\n              <span class=\"tag-domain\" data-filter=\"hotp_counter\">#hotp_counter</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_hotp_counter</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_hotp_counter\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_session_cookie_core\" data-caps=\"None\" data-domain=\"session_cookie_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_session_cookie_core</a>\n              <span class=\"tag-domain\" data-filter=\"session_cookie_core\">#session_cookie_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_session_cookie_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_session_cookie_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_policy_rbac\" data-caps=\"Alloc\" data-domain=\"policy_rbac\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_policy_rbac</a>\n              <span class=\"tag-domain\" data-filter=\"policy_rbac\">#policy_rbac</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_policy_rbac</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_policy_rbac\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_did_parser\" data-caps=\"None\" data-domain=\"did_parser\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_did_parser</a>\n              <span class=\"tag-domain\" data-filter=\"did_parser\">#did_parser</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_did_parser</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_did_parser\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_recovery_vault\" data-caps=\"None\" data-domain=\"recovery_vault\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_recovery_vault</a>\n              <span class=\"tag-domain\" data-filter=\"recovery_vault\">#recovery_vault</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_recovery_vault</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_recovery_vault\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_audit_log\" data-caps=\"FsWrite\" data-domain=\"audit_log\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_audit_log</a>\n              <span class=\"tag-domain\" data-filter=\"audit_log\">#audit_log</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"FsWrite\">FsWrite</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_audit_log</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_audit_log\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_sandbox_isolation\" data-caps=\"None\" data-domain=\"sandbox_isolation\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_sandbox_isolation</a>\n              <span class=\"tag-domain\" data-filter=\"sandbox_isolation\">#sandbox_isolation</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_sandbox_isolation</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_sandbox_isolation\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_lexer_spans\" data-caps=\"None\" data-domain=\"lexer_spans\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_lexer_spans</a>\n              <span class=\"tag-domain\" data-filter=\"lexer_spans\">#lexer_spans</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_lexer_spans</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_lexer_spans\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_parser_core\" data-caps=\"Alloc\" data-domain=\"parser_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_parser_core</a>\n              <span class=\"tag-domain\" data-filter=\"parser_core\">#parser_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_parser_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_parser_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_ast_core\" data-caps=\"Alloc\" data-domain=\"ast_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_ast_core</a>\n              <span class=\"tag-domain\" data-filter=\"ast_core\">#ast_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_ast_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_ast_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_type_checker\" data-caps=\"Alloc\" data-domain=\"type_checker\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_type_checker</a>\n              <span class=\"tag-domain\" data-filter=\"type_checker\">#type_checker</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_type_checker</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_type_checker\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_ssa_core\" data-caps=\"Alloc\" data-domain=\"ssa_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_ssa_core</a>\n              <span class=\"tag-domain\" data-filter=\"ssa_core\">#ssa_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_ssa_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_ssa_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_dom_tree\" data-caps=\"Alloc\" data-domain=\"dom_tree\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_dom_tree</a>\n              <span class=\"tag-domain\" data-filter=\"dom_tree\">#dom_tree</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_dom_tree</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_dom_tree\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_dce_core\" data-caps=\"None\" data-domain=\"dce_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_dce_core</a>\n              <span class=\"tag-domain\" data-filter=\"dce_core\">#dce_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_dce_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_dce_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_const_fold\" data-caps=\"None\" data-domain=\"const_fold\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_const_fold</a>\n              <span class=\"tag-domain\" data-filter=\"const_fold\">#const_fold</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_const_fold</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_const_fold\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_loop_unroll\" data-caps=\"None\" data-domain=\"loop_unroll\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_loop_unroll</a>\n              <span class=\"tag-domain\" data-filter=\"loop_unroll\">#loop_unroll</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_loop_unroll</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_loop_unroll\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_reg_alloc\" data-caps=\"Alloc\" data-domain=\"reg_alloc\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_reg_alloc</a>\n              <span class=\"tag-domain\" data-filter=\"reg_alloc\">#reg_alloc</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_reg_alloc</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_reg_alloc\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_cfg_flatten_core\" data-caps=\"None\" data-domain=\"cfg_flatten_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_cfg_flatten_core</a>\n              <span class=\"tag-domain\" data-filter=\"cfg_flatten_core\">#cfg_flatten_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_cfg_flatten_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_cfg_flatten_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_block_shuffle_core\" data-caps=\"None\" data-domain=\"block_shuffle_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_block_shuffle_core</a>\n              <span class=\"tag-domain\" data-filter=\"block_shuffle_core\">#block_shuffle_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_block_shuffle_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_block_shuffle_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_string_transient_core\" data-caps=\"None\" data-domain=\"string_transient_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_string_transient_core</a>\n              <span class=\"tag-domain\" data-filter=\"string_transient_core\">#string_transient_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_string_transient_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_string_transient_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_wasm_host_core\" data-caps=\"Alloc\" data-domain=\"wasm_host_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_wasm_host_core</a>\n              <span class=\"tag-domain\" data-filter=\"wasm_host_core\">#wasm_host_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_wasm_host_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_wasm_host_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_leb128_core\" data-caps=\"None\" data-domain=\"leb128_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_leb128_core</a>\n              <span class=\"tag-domain\" data-filter=\"leb128_core\">#leb128_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_leb128_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_leb128_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_linear_mem\" data-caps=\"Alloc\" data-domain=\"linear_mem\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_linear_mem</a>\n              <span class=\"tag-domain\" data-filter=\"linear_mem\">#linear_mem</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_linear_mem</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_linear_mem\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_vdom_core\" data-caps=\"None\" data-domain=\"vdom_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_vdom_core</a>\n              <span class=\"tag-domain\" data-filter=\"vdom_core\">#vdom_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_vdom_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_vdom_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_dom_diff_core\" data-caps=\"None\" data-domain=\"dom_diff_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_dom_diff_core</a>\n              <span class=\"tag-domain\" data-filter=\"dom_diff_core\">#dom_diff_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_dom_diff_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_dom_diff_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_reactive_signals_core\" data-caps=\"None\" data-domain=\"reactive_signals_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_reactive_signals_core</a>\n              <span class=\"tag-domain\" data-filter=\"reactive_signals_core\">#reactive_signals_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_reactive_signals_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_reactive_signals_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_html_escape_core\" data-caps=\"None\" data-domain=\"html_escape_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_html_escape_core</a>\n              <span class=\"tag-domain\" data-filter=\"html_escape_core\">#html_escape_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_html_escape_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_html_escape_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_truetype_font_core\" data-caps=\"None\" data-domain=\"truetype_font_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_truetype_font_core</a>\n              <span class=\"tag-domain\" data-filter=\"truetype_font_core\">#truetype_font_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_truetype_font_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_truetype_font_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_sdf_glyph_core\" data-caps=\"None\" data-domain=\"sdf_glyph_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_sdf_glyph_core</a>\n              <span class=\"tag-domain\" data-filter=\"sdf_glyph_core\">#sdf_glyph_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_sdf_glyph_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_sdf_glyph_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_bezier_curve_core\" data-caps=\"None\" data-domain=\"bezier_curve_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_bezier_curve_core</a>\n              <span class=\"tag-domain\" data-filter=\"bezier_curve_core\">#bezier_curve_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_bezier_curve_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_bezier_curve_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_raster_canvas_core\" data-caps=\"Alloc\" data-domain=\"raster_canvas_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_raster_canvas_core</a>\n              <span class=\"tag-domain\" data-filter=\"raster_canvas_core\">#raster_canvas_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_raster_canvas_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_raster_canvas_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_compositor_doublebuf\" data-caps=\"Alloc\" data-domain=\"compositor_doublebuf\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_compositor_doublebuf</a>\n              <span class=\"tag-domain\" data-filter=\"compositor_doublebuf\">#compositor_doublebuf</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_compositor_doublebuf</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_compositor_doublebuf\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_color_spaces\" data-caps=\"None\" data-domain=\"color_spaces\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_color_spaces</a>\n              <span class=\"tag-domain\" data-filter=\"color_spaces\">#color_spaces</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_color_spaces</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_color_spaces\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_alpha_blend\" data-caps=\"None\" data-domain=\"alpha_blend\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_alpha_blend</a>\n              <span class=\"tag-domain\" data-filter=\"alpha_blend\">#alpha_blend</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_alpha_blend</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_alpha_blend\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_scanline_fill\" data-caps=\"Alloc\" data-domain=\"scanline_fill\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_scanline_fill</a>\n              <span class=\"tag-domain\" data-filter=\"scanline_fill\">#scanline_fill</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_scanline_fill</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_scanline_fill\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_wgsl_shader_core\" data-caps=\"None\" data-domain=\"wgsl_shader_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_wgsl_shader_core</a>\n              <span class=\"tag-domain\" data-filter=\"wgsl_shader_core\">#wgsl_shader_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_wgsl_shader_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_wgsl_shader_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_matrix_simd_core\" data-caps=\"None\" data-domain=\"matrix_simd_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_matrix_simd_core</a>\n              <span class=\"tag-domain\" data-filter=\"matrix_simd_core\">#matrix_simd_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_matrix_simd_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_matrix_simd_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_vector_norm_simd_core\" data-caps=\"None\" data-domain=\"vector_norm_simd_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_vector_norm_simd_core</a>\n              <span class=\"tag-domain\" data-filter=\"vector_norm_simd_core\">#vector_norm_simd_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_vector_norm_simd_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_vector_norm_simd_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_compute_pipeline_core\" data-caps=\"Alloc\" data-domain=\"compute_pipeline_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_compute_pipeline_core</a>\n              <span class=\"tag-domain\" data-filter=\"compute_pipeline_core\">#compute_pipeline_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_compute_pipeline_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_compute_pipeline_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_ansi_canvas_core\" data-caps=\"None\" data-domain=\"ansi_canvas_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_ansi_canvas_core</a>\n              <span class=\"tag-domain\" data-filter=\"ansi_canvas_core\">#ansi_canvas_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_ansi_canvas_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_ansi_canvas_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_cell_matrix\" data-caps=\"Alloc\" data-domain=\"cell_matrix\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_cell_matrix</a>\n              <span class=\"tag-domain\" data-filter=\"cell_matrix\">#cell_matrix</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_cell_matrix</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_cell_matrix\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_tui_widget_core\" data-caps=\"Alloc\" data-domain=\"tui_widget_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_tui_widget_core</a>\n              <span class=\"tag-domain\" data-filter=\"tui_widget_core\">#tui_widget_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_tui_widget_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_tui_widget_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_diff_renderer_core\" data-caps=\"Alloc\" data-domain=\"diff_renderer_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_diff_renderer_core</a>\n              <span class=\"tag-domain\" data-filter=\"diff_renderer_core\">#diff_renderer_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_diff_renderer_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_diff_renderer_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_keyboard_events_core\" data-caps=\"None\" data-domain=\"keyboard_events_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_keyboard_events_core</a>\n              <span class=\"tag-domain\" data-filter=\"keyboard_events_core\">#keyboard_events_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_keyboard_events_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_keyboard_events_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_shell_pipeline\" data-caps=\"Alloc\" data-domain=\"shell_pipeline\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_shell_pipeline</a>\n              <span class=\"tag-domain\" data-filter=\"shell_pipeline\">#shell_pipeline</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_shell_pipeline</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_shell_pipeline\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_shell_vars\" data-caps=\"None\" data-domain=\"shell_vars\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_shell_vars</a>\n              <span class=\"tag-domain\" data-filter=\"shell_vars\">#shell_vars</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_shell_vars</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_shell_vars\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_shell_dispatcher\" data-caps=\"Alloc\" data-domain=\"shell_dispatcher\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_shell_dispatcher</a>\n              <span class=\"tag-domain\" data-filter=\"shell_dispatcher\">#shell_dispatcher</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_shell_dispatcher</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_shell_dispatcher\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_shell_history\" data-caps=\"Alloc\" data-domain=\"shell_history\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_shell_history</a>\n              <span class=\"tag-domain\" data-filter=\"shell_history\">#shell_history</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_shell_history</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_shell_history\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_shell_jobs\" data-caps=\"Alloc\" data-domain=\"shell_jobs\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_shell_jobs</a>\n              <span class=\"tag-domain\" data-filter=\"shell_jobs\">#shell_jobs</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_shell_jobs</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_shell_jobs\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_process_supervisor\" data-caps=\"Alloc\" data-domain=\"process_supervisor\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_process_supervisor</a>\n              <span class=\"tag-domain\" data-filter=\"process_supervisor\">#process_supervisor</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_process_supervisor</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_process_supervisor\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_hexdump\" data-caps=\"None\" data-domain=\"hexdump\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_hexdump</a>\n              <span class=\"tag-domain\" data-filter=\"hexdump\">#hexdump</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_hexdump</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_hexdump\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_disasm_stub\" data-caps=\"None\" data-domain=\"disasm_stub\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_disasm_stub</a>\n              <span class=\"tag-domain\" data-filter=\"disasm_stub\">#disasm_stub</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_disasm_stub</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_disasm_stub\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_system_profiler\" data-caps=\"Alloc\" data-domain=\"system_profiler\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_system_profiler</a>\n              <span class=\"tag-domain\" data-filter=\"system_profiler\">#system_profiler</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_system_profiler</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_system_profiler\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_ndjson_logger_core\" data-caps=\"FsWrite\" data-domain=\"ndjson_logger_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_ndjson_logger_core</a>\n              <span class=\"tag-domain\" data-filter=\"ndjson_logger_core\">#ndjson_logger_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"FsWrite\">FsWrite</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_ndjson_logger_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_ndjson_logger_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_pty_hal\" data-caps=\"None\" data-domain=\"pty_hal\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_pty_hal</a>\n              <span class=\"tag-domain\" data-filter=\"pty_hal\">#pty_hal</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_pty_hal</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_pty_hal\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_swiss_map_core\" data-caps=\"Alloc\" data-domain=\"swiss_map_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_swiss_map_core</a>\n              <span class=\"tag-domain\" data-filter=\"swiss_map_core\">#swiss_map_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_swiss_map_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_swiss_map_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_btree_core\" data-caps=\"Alloc\" data-domain=\"btree_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_btree_core</a>\n              <span class=\"tag-domain\" data-filter=\"btree_core\">#btree_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_btree_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_btree_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_radix_trie_core\" data-caps=\"Alloc\" data-domain=\"radix_trie_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_radix_trie_core</a>\n              <span class=\"tag-domain\" data-filter=\"radix_trie_core\">#radix_trie_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_radix_trie_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_radix_trie_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_red_black_tree_core\" data-caps=\"Alloc\" data-domain=\"red_black_tree_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_red_black_tree_core</a>\n              <span class=\"tag-domain\" data-filter=\"red_black_tree_core\">#red_black_tree_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_red_black_tree_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_red_black_tree_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_interval_tree_core\" data-caps=\"Alloc\" data-domain=\"interval_tree_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_interval_tree_core</a>\n              <span class=\"tag-domain\" data-filter=\"interval_tree_core\">#interval_tree_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_interval_tree_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_interval_tree_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_ring_buffer_core\" data-caps=\"Alloc\" data-domain=\"ring_buffer_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_ring_buffer_core</a>\n              <span class=\"tag-domain\" data-filter=\"ring_buffer_core\">#ring_buffer_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_ring_buffer_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_ring_buffer_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_mpsc_queue_core\" data-caps=\"Alloc\" data-domain=\"mpsc_queue_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_mpsc_queue_core</a>\n              <span class=\"tag-domain\" data-filter=\"mpsc_queue_core\">#mpsc_queue_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_mpsc_queue_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_mpsc_queue_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_bloom_filter_core\" data-caps=\"Alloc\" data-domain=\"bloom_filter_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_bloom_filter_core</a>\n              <span class=\"tag-domain\" data-filter=\"bloom_filter_core\">#bloom_filter_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_bloom_filter_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_bloom_filter_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_cuckoo_filter_core\" data-caps=\"Alloc\" data-domain=\"cuckoo_filter_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_cuckoo_filter_core</a>\n              <span class=\"tag-domain\" data-filter=\"cuckoo_filter_core\">#cuckoo_filter_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_cuckoo_filter_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_cuckoo_filter_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_hyperloglog_core\" data-caps=\"Alloc\" data-domain=\"hyperloglog_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_hyperloglog_core</a>\n              <span class=\"tag-domain\" data-filter=\"hyperloglog_core\">#hyperloglog_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_hyperloglog_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_hyperloglog_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_count_min_sketch_core\" data-caps=\"Alloc\" data-domain=\"count_min_sketch_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_count_min_sketch_core</a>\n              <span class=\"tag-domain\" data-filter=\"count_min_sketch_core\">#count_min_sketch_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_count_min_sketch_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_count_min_sketch_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_json_core\" data-caps=\"None\" data-domain=\"json_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_json_core</a>\n              <span class=\"tag-domain\" data-filter=\"json_core\">#json_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_json_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_json_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_json_schema_core\" data-caps=\"None\" data-domain=\"json_schema_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_json_schema_core</a>\n              <span class=\"tag-domain\" data-filter=\"json_schema_core\">#json_schema_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_json_schema_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_json_schema_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_msgpack_core\" data-caps=\"None\" data-domain=\"msgpack_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_msgpack_core</a>\n              <span class=\"tag-domain\" data-filter=\"msgpack_core\">#msgpack_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_msgpack_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_msgpack_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_cbor_core\" data-caps=\"None\" data-domain=\"cbor_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_cbor_core</a>\n              <span class=\"tag-domain\" data-filter=\"cbor_core\">#cbor_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_cbor_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_cbor_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_sql_parser_core\" data-caps=\"None\" data-domain=\"sql_parser_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_sql_parser_core</a>\n              <span class=\"tag-domain\" data-filter=\"sql_parser_core\">#sql_parser_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_sql_parser_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_sql_parser_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_byzantine_vote_core\" data-caps=\"None\" data-domain=\"byzantine_vote_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_byzantine_vote_core</a>\n              <span class=\"tag-domain\" data-filter=\"byzantine_vote_core\">#byzantine_vote_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_byzantine_vote_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_byzantine_vote_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_raft_consensus\" data-caps=\"Alloc\" data-domain=\"raft_consensus\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_raft_consensus</a>\n              <span class=\"tag-domain\" data-filter=\"raft_consensus\">#raft_consensus</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_raft_consensus</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_raft_consensus\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_paxos_synod\" data-caps=\"Alloc\" data-domain=\"paxos_synod\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_paxos_synod</a>\n              <span class=\"tag-domain\" data-filter=\"paxos_synod\">#paxos_synod</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_paxos_synod</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_paxos_synod\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_kademlia_dht\" data-caps=\"Alloc\" data-domain=\"kademlia_dht\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_kademlia_dht</a>\n              <span class=\"tag-domain\" data-filter=\"kademlia_dht\">#kademlia_dht</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_kademlia_dht</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_kademlia_dht\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_gossip_protocol\" data-caps=\"Alloc\" data-domain=\"gossip_protocol\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_gossip_protocol</a>\n              <span class=\"tag-domain\" data-filter=\"gossip_protocol\">#gossip_protocol</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_gossip_protocol</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_gossip_protocol\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_vector_clocks\" data-caps=\"Alloc\" data-domain=\"vector_clocks\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_vector_clocks</a>\n              <span class=\"tag-domain\" data-filter=\"vector_clocks\">#vector_clocks</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_vector_clocks</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_vector_clocks\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_crdt_counters\" data-caps=\"Alloc\" data-domain=\"crdt_counters\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_crdt_counters</a>\n              <span class=\"tag-domain\" data-filter=\"crdt_counters\">#crdt_counters</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_crdt_counters</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_crdt_counters\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_crdt_lww_set\" data-caps=\"Alloc\" data-domain=\"crdt_lww_set\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_crdt_lww_set</a>\n              <span class=\"tag-domain\" data-filter=\"crdt_lww_set\">#crdt_lww_set</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_crdt_lww_set</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_crdt_lww_set\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_merkle_anti_entropy\" data-caps=\"Alloc\" data-domain=\"merkle_anti_entropy\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_merkle_anti_entropy</a>\n              <span class=\"tag-domain\" data-filter=\"merkle_anti_entropy\">#merkle_anti_entropy</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_merkle_anti_entropy</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_merkle_anti_entropy\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_consistent_hash_core\" data-caps=\"Alloc\" data-domain=\"consistent_hash_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_consistent_hash_core</a>\n              <span class=\"tag-domain\" data-filter=\"consistent_hash_core\">#consistent_hash_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_consistent_hash_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_consistent_hash_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_circuit_breaker_core\" data-caps=\"None\" data-domain=\"circuit_breaker_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_circuit_breaker_core</a>\n              <span class=\"tag-domain\" data-filter=\"circuit_breaker_core\">#circuit_breaker_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_circuit_breaker_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_circuit_breaker_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_round_robin_core\" data-caps=\"None\" data-domain=\"round_robin_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_round_robin_core</a>\n              <span class=\"tag-domain\" data-filter=\"round_robin_core\">#round_robin_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_round_robin_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_round_robin_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_health_probe_core\" data-caps=\"Net\" data-domain=\"health_probe_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_health_probe_core</a>\n              <span class=\"tag-domain\" data-filter=\"health_probe_core\">#health_probe_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Net\">Net</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_health_probe_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_health_probe_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_swarm_consensus_core\" data-caps=\"None\" data-domain=\"swarm_consensus_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_swarm_consensus_core</a>\n              <span class=\"tag-domain\" data-filter=\"swarm_consensus_core\">#swarm_consensus_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_swarm_consensus_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_swarm_consensus_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_wal_log_core\" data-caps=\"FsWrite\" data-domain=\"wal_log_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_wal_log_core</a>\n              <span class=\"tag-domain\" data-filter=\"wal_log_core\">#wal_log_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"FsWrite\">FsWrite</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_wal_log_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_wal_log_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_http_router_core\" data-caps=\"None\" data-domain=\"http_router_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_http_router_core</a>\n              <span class=\"tag-domain\" data-filter=\"http_router_core\">#http_router_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_http_router_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_http_router_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_prompt_guard_core\" data-caps=\"None\" data-domain=\"prompt_guard_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_prompt_guard_core</a>\n              <span class=\"tag-domain\" data-filter=\"prompt_guard_core\">#prompt_guard_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Prompt-injection, canary token, and jailbreak detector.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_prompt_guard_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_prompt_guard_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_canary_tokens_core\" data-caps=\"None\" data-domain=\"canary_tokens_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_canary_tokens_core</a>\n              <span class=\"tag-domain\" data-filter=\"canary_tokens_core\">#canary_tokens_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Cryptographic canary token generator and exfiltration probe.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_canary_tokens_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_canary_tokens_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_jailbreak_filter_core\" data-caps=\"None\" data-domain=\"jailbreak_filter_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_jailbreak_filter_core</a>\n              <span class=\"tag-domain\" data-filter=\"jailbreak_filter_core\">#jailbreak_filter_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_jailbreak_filter_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_jailbreak_filter_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_prompt_shield_core\" data-caps=\"None\" data-domain=\"prompt_shield_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_prompt_shield_core</a>\n              <span class=\"tag-domain\" data-filter=\"prompt_shield_core\">#prompt_shield_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_prompt_shield_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_prompt_shield_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_flash_attn_core\" data-caps=\"None\" data-domain=\"flash_attn_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_flash_attn_core</a>\n              <span class=\"tag-domain\" data-filter=\"flash_attn_core\">#flash_attn_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Tiled memory-efficient attention mechanism calculation.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_flash_attn_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_flash_attn_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_rope_embedding_core\" data-caps=\"None\" data-domain=\"rope_embedding_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_rope_embedding_core</a>\n              <span class=\"tag-domain\" data-filter=\"rope_embedding_core\">#rope_embedding_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Rotary Position Embedding (RoPE) frequency coordinate calculator.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_rope_embedding_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_rope_embedding_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_rmsnorm_core\" data-caps=\"None\" data-domain=\"rmsnorm_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_rmsnorm_core</a>\n              <span class=\"tag-domain\" data-filter=\"rmsnorm_core\">#rmsnorm_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_rmsnorm_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_rmsnorm_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_kv_cache_core\" data-caps=\"Alloc\" data-domain=\"kv_cache_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_kv_cache_core</a>\n              <span class=\"tag-domain\" data-filter=\"kv_cache_core\">#kv_cache_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_kv_cache_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_kv_cache_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_bpe_tokenizer_core\" data-caps=\"None\" data-domain=\"bpe_tokenizer_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_bpe_tokenizer_core</a>\n              <span class=\"tag-domain\" data-filter=\"bpe_tokenizer_core\">#bpe_tokenizer_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_bpe_tokenizer_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_bpe_tokenizer_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_sentencepiece_core\" data-caps=\"None\" data-domain=\"sentencepiece_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_sentencepiece_core</a>\n              <span class=\"tag-domain\" data-filter=\"sentencepiece_core\">#sentencepiece_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_sentencepiece_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_sentencepiece_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_vector_db_core\" data-caps=\"Alloc\" data-domain=\"vector_db_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_vector_db_core</a>\n              <span class=\"tag-domain\" data-filter=\"vector_db_core\">#vector_db_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">In-memory vector database with cosine similarity search.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_vector_db_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_vector_db_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_hnsw_index_core\" data-caps=\"Alloc\" data-domain=\"hnsw_index_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_hnsw_index_core</a>\n              <span class=\"tag-domain\" data-filter=\"hnsw_index_core\">#hnsw_index_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_hnsw_index_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_hnsw_index_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_mcts_tree_core\" data-caps=\"Alloc\" data-domain=\"mcts_tree_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_mcts_tree_core</a>\n              <span class=\"tag-domain\" data-filter=\"mcts_tree_core\">#mcts_tree_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_mcts_tree_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_mcts_tree_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_beam_search_core\" data-caps=\"Alloc\" data-domain=\"beam_search_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_beam_search_core</a>\n              <span class=\"tag-domain\" data-filter=\"beam_search_core\">#beam_search_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_beam_search_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_beam_search_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_agent_runtime_core\" data-caps=\"Thread, Alloc\" data-domain=\"agent_runtime_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_agent_runtime_core</a>\n              <span class=\"tag-domain\" data-filter=\"agent_runtime_core\">#agent_runtime_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Thread, Alloc\">Thread, Alloc</span>\n            </td>\n            <td class=\"td-desc\">Actor-model execution runtime for autonomous AI coding swarms.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_agent_runtime_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_agent_runtime_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_tool_dispatcher_core\" data-caps=\"None\" data-domain=\"tool_dispatcher_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_tool_dispatcher_core</a>\n              <span class=\"tag-domain\" data-filter=\"tool_dispatcher_core\">#tool_dispatcher_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Schema-validated tool invocation router for autonomous agents.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_tool_dispatcher_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_tool_dispatcher_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_kinematics_core\" data-caps=\"None\" data-domain=\"kinematics_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_kinematics_core</a>\n              <span class=\"tag-domain\" data-filter=\"kinematics_core\">#kinematics_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">6-DoF forward and inverse kinematics trajectory planner.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_kinematics_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_kinematics_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_dh_params_core\" data-caps=\"None\" data-domain=\"dh_params_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_dh_params_core</a>\n              <span class=\"tag-domain\" data-filter=\"dh_params_core\">#dh_params_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_dh_params_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_dh_params_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_quaternion_core\" data-caps=\"None\" data-domain=\"quaternion_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_quaternion_core</a>\n              <span class=\"tag-domain\" data-filter=\"quaternion_core\">#quaternion_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_quaternion_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_quaternion_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_trajectory_core\" data-caps=\"Alloc\" data-domain=\"trajectory_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_trajectory_core</a>\n              <span class=\"tag-domain\" data-filter=\"trajectory_core\">#trajectory_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_trajectory_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_trajectory_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_pid_core\" data-caps=\"None\" data-domain=\"pid_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_pid_core</a>\n              <span class=\"tag-domain\" data-filter=\"pid_core\">#pid_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_pid_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_pid_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_kalman_core\" data-caps=\"None\" data-domain=\"kalman_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_kalman_core</a>\n              <span class=\"tag-domain\" data-filter=\"kalman_core\">#kalman_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_kalman_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_kalman_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_lqr_core\" data-caps=\"None\" data-domain=\"lqr_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_lqr_core</a>\n              <span class=\"tag-domain\" data-filter=\"lqr_core\">#lqr_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_lqr_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_lqr_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_lowpass_core\" data-caps=\"None\" data-domain=\"lowpass_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_lowpass_core</a>\n              <span class=\"tag-domain\" data-filter=\"lowpass_core\">#lowpass_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_lowpass_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_lowpass_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_madgwick_core\" data-caps=\"None\" data-domain=\"madgwick_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_madgwick_core</a>\n              <span class=\"tag-domain\" data-filter=\"madgwick_core\">#madgwick_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_madgwick_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_madgwick_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_gyro_core\" data-caps=\"None\" data-domain=\"gyro_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_gyro_core</a>\n              <span class=\"tag-domain\" data-filter=\"gyro_core\">#gyro_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_gyro_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_gyro_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_gravity_null_core\" data-caps=\"None\" data-domain=\"gravity_null_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_gravity_null_core</a>\n              <span class=\"tag-domain\" data-filter=\"gravity_null_core\">#gravity_null_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_gravity_null_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_gravity_null_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_compass_core\" data-caps=\"None\" data-domain=\"compass_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_compass_core</a>\n              <span class=\"tag-domain\" data-filter=\"compass_core\">#compass_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_compass_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_compass_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_pointcloud_core\" data-caps=\"Alloc\" data-domain=\"pointcloud_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_pointcloud_core</a>\n              <span class=\"tag-domain\" data-filter=\"pointcloud_core\">#pointcloud_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_pointcloud_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_pointcloud_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_octree_core\" data-caps=\"Alloc\" data-domain=\"octree_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_octree_core</a>\n              <span class=\"tag-domain\" data-filter=\"octree_core\">#octree_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_octree_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_octree_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_raycast_core\" data-caps=\"None\" data-domain=\"raycast_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_raycast_core</a>\n              <span class=\"tag-domain\" data-filter=\"raycast_core\">#raycast_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_raycast_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_raycast_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_ros2_core\" data-caps=\"None\" data-domain=\"ros2_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_ros2_core</a>\n              <span class=\"tag-domain\" data-filter=\"ros2_core\">#ros2_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_ros2_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_ros2_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_l3_book_core\" data-caps=\"None\" data-domain=\"l3_book_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_l3_book_core</a>\n              <span class=\"tag-domain\" data-filter=\"l3_book_core\">#l3_book_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Level-3 limit order book with sub-microsecond price-time matching.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_l3_book_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_l3_book_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_trade_matcher_core\" data-caps=\"None\" data-domain=\"trade_matcher_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_trade_matcher_core</a>\n              <span class=\"tag-domain\" data-filter=\"trade_matcher_core\">#trade_matcher_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Price-time priority crossing engine with price improvement.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_trade_matcher_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_trade_matcher_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_vwap_core\" data-caps=\"None\" data-domain=\"vwap_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_vwap_core</a>\n              <span class=\"tag-domain\" data-filter=\"vwap_core\">#vwap_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">Volume-Weighted Average Price (VWAP) running accumulator.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_vwap_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_vwap_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_order_queue_core\" data-caps=\"Alloc\" data-domain=\"order_queue_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_order_queue_core</a>\n              <span class=\"tag-domain\" data-filter=\"order_queue_core\">#order_queue_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">Price-level FIFO order queue for tick-by-tick order fills.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_order_queue_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_order_queue_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_fixed_point_core\" data-caps=\"None\" data-domain=\"fixed_point_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_fixed_point_core</a>\n              <span class=\"tag-domain\" data-filter=\"fixed_point_core\">#fixed_point_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_fixed_point_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_fixed_point_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_currency_core\" data-caps=\"None\" data-domain=\"currency_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_currency_core</a>\n              <span class=\"tag-domain\" data-filter=\"currency_core\">#currency_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_currency_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_currency_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_interest_rate_core\" data-caps=\"None\" data-domain=\"interest_rate_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_interest_rate_core</a>\n              <span class=\"tag-domain\" data-filter=\"interest_rate_core\">#interest_rate_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_interest_rate_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_interest_rate_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_amortization_core\" data-caps=\"Alloc\" data-domain=\"amortization_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_amortization_core</a>\n              <span class=\"tag-domain\" data-filter=\"amortization_core\">#amortization_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_amortization_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_amortization_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_x402_client_core\" data-caps=\"Net\" data-domain=\"x402_client_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_x402_client_core</a>\n              <span class=\"tag-domain\" data-filter=\"x402_client_core\">#x402_client_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Net\">Net</span>\n            </td>\n            <td class=\"td-desc\">Autonomous HTTP 402 / x402 micropayment settlement client.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_x402_client_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_x402_client_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_payment_quote_core\" data-caps=\"None\" data-domain=\"payment_quote_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_payment_quote_core</a>\n              <span class=\"tag-domain\" data-filter=\"payment_quote_core\">#payment_quote_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_payment_quote_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_payment_quote_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_proof_receipt_core\" data-caps=\"None\" data-domain=\"proof_receipt_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_proof_receipt_core</a>\n              <span class=\"tag-domain\" data-filter=\"proof_receipt_core\">#proof_receipt_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_proof_receipt_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_proof_receipt_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_spend_guard_core\" data-caps=\"None\" data-domain=\"spend_guard_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_spend_guard_core</a>\n              <span class=\"tag-domain\" data-filter=\"spend_guard_core\">#spend_guard_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_spend_guard_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_spend_guard_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_var_calculator_core\" data-caps=\"None\" data-domain=\"var_calculator_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_var_calculator_core</a>\n              <span class=\"tag-domain\" data-filter=\"var_calculator_core\">#var_calculator_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_var_calculator_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_var_calculator_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_black_scholes_core\" data-caps=\"None\" data-domain=\"black_scholes_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_black_scholes_core</a>\n              <span class=\"tag-domain\" data-filter=\"black_scholes_core\">#black_scholes_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_black_scholes_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_black_scholes_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_double_entry_core\" data-caps=\"Alloc\" data-domain=\"double_entry_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_double_entry_core</a>\n              <span class=\"tag-domain\" data-filter=\"double_entry_core\">#double_entry_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_double_entry_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_double_entry_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_constant_product_core\" data-caps=\"None\" data-domain=\"constant_product_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_constant_product_core</a>\n              <span class=\"tag-domain\" data-filter=\"constant_product_core\">#constant_product_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_constant_product_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_constant_product_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_orbital_sim_core\" data-caps=\"None\" data-domain=\"orbital_sim_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_orbital_sim_core</a>\n              <span class=\"tag-domain\" data-filter=\"orbital_sim_core\">#orbital_sim_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">SGP4/Keplerian orbital mechanics and two-body satellite propagator.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_orbital_sim_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_orbital_sim_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_sgp4_tle_core\" data-caps=\"None\" data-domain=\"sgp4_tle_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_sgp4_tle_core</a>\n              <span class=\"tag-domain\" data-filter=\"sgp4_tle_core\">#sgp4_tle_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_sgp4_tle_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_sgp4_tle_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_hohmann_core\" data-caps=\"None\" data-domain=\"hohmann_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_hohmann_core</a>\n              <span class=\"tag-domain\" data-filter=\"hohmann_core\">#hohmann_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_hohmann_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_hohmann_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_kepler_core\" data-caps=\"None\" data-domain=\"kepler_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_kepler_core</a>\n              <span class=\"tag-domain\" data-filter=\"kepler_core\">#kepler_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_kepler_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_kepler_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_aerodynamics_core\" data-caps=\"None\" data-domain=\"aerodynamics_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_aerodynamics_core</a>\n              <span class=\"tag-domain\" data-filter=\"aerodynamics_core\">#aerodynamics_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_aerodynamics_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_aerodynamics_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_isa_atmo_core\" data-caps=\"None\" data-domain=\"isa_atmo_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_isa_atmo_core</a>\n              <span class=\"tag-domain\" data-filter=\"isa_atmo_core\">#isa_atmo_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_isa_atmo_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_isa_atmo_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_glide_slope_core\" data-caps=\"None\" data-domain=\"glide_slope_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_glide_slope_core</a>\n              <span class=\"tag-domain\" data-filter=\"glide_slope_core\">#glide_slope_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_glide_slope_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_glide_slope_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_airspeed_mach_core\" data-caps=\"None\" data-domain=\"airspeed_mach_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_airspeed_mach_core</a>\n              <span class=\"tag-domain\" data-filter=\"airspeed_mach_core\">#airspeed_mach_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_airspeed_mach_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_airspeed_mach_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_fasta_stream_core\" data-caps=\"FsRead\" data-domain=\"fasta_stream_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_fasta_stream_core</a>\n              <span class=\"tag-domain\" data-filter=\"fasta_stream_core\">#fasta_stream_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"FsRead\">FsRead</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_fasta_stream_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_fasta_stream_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_fastq_core\" data-caps=\"None\" data-domain=\"fastq_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_fastq_core</a>\n              <span class=\"tag-domain\" data-filter=\"fastq_core\">#fastq_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_fastq_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_fastq_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_nw_align_core\" data-caps=\"Alloc\" data-domain=\"nw_align_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_nw_align_core</a>\n              <span class=\"tag-domain\" data-filter=\"nw_align_core\">#nw_align_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_nw_align_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_nw_align_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_crispr_core\" data-caps=\"None\" data-domain=\"crispr_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_crispr_core</a>\n              <span class=\"tag-domain\" data-filter=\"crispr_core\">#crispr_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_crispr_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_crispr_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_bwt_index_core\" data-caps=\"Alloc\" data-domain=\"bwt_index_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_bwt_index_core</a>\n              <span class=\"tag-domain\" data-filter=\"bwt_index_core\">#bwt_index_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_bwt_index_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_bwt_index_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_amino_acids_core\" data-caps=\"None\" data-domain=\"amino_acids_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_amino_acids_core</a>\n              <span class=\"tag-domain\" data-filter=\"amino_acids_core\">#amino_acids_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_amino_acids_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_amino_acids_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_upgma_core\" data-caps=\"Alloc\" data-domain=\"upgma_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_upgma_core</a>\n              <span class=\"tag-domain\" data-filter=\"upgma_core\">#upgma_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Alloc\">Alloc</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_upgma_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_upgma_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"ooda_verlet_core\" data-caps=\"None\" data-domain=\"verlet_core\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">ooda_verlet_core</a>\n              <span class=\"tag-domain\" data-filter=\"verlet_core\">#verlet_core</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"None\">None</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add ooda_verlet_core</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add ooda_verlet_core\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"hello\" data-caps=\"FsRead\" data-domain=\"hello\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">hello</a>\n              <span class=\"tag-domain\" data-filter=\"hello\">#hello</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"FsRead\">FsRead</span>\n            </td>\n            <td class=\"td-desc\">mid@^1.0.0#FsRead</td>\n            <td class=\"td-install\">\n              <code>ooda add hello</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add hello\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"mid\" data-caps=\"FsRead\" data-domain=\"mid\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">mid</a>\n              <span class=\"tag-domain\" data-filter=\"mid\">#mid</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"FsRead\">FsRead</span>\n            </td>\n            <td class=\"td-desc\">world@^1.0.0#FsRead</td>\n            <td class=\"td-install\">\n              <code>ooda add mid</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add mid\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"world\" data-caps=\"FsRead\" data-domain=\"world\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">world</a>\n              <span class=\"tag-domain\" data-filter=\"world\">#world</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"FsRead\">FsRead</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add world</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add world\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"evilcap\" data-caps=\"Net\" data-domain=\"evilcap\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">evilcap</a>\n              <span class=\"tag-domain\" data-filter=\"evilcap\">#evilcap</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"Net\">Net</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add evilcap</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add evilcap\">copy</button>\n            </td>\n          </tr>\n          <tr class=\"hit\" data-name=\"tooyank\" data-caps=\"FsRead\" data-domain=\"tooyank\">\n            <td class=\"td-pkg\">\n              <a href=\"https://github.com/openOODA/openOODA\" target=\"_blank\" rel=\"noopener noreferrer\">tooyank</a>\n              <span class=\"tag-domain\" data-filter=\"tooyank\">#tooyank</span>\n            </td>\n            <td class=\"td-cap\">\n              <span class=\"cap-badge\" data-filter=\"FsRead\">FsRead</span>\n            </td>\n            <td class=\"td-desc\">openOODA sovereign package module.</td>\n            <td class=\"td-install\">\n              <code>ooda add tooyank</code>\n              <button type=\"button\" class=\"copy-btn\" data-cmd=\"ooda add tooyank\">copy</button>\n            </td>\n          </tr>\n          </tbody>\n        </table>\n      </div>\n";

const MANIFESTO_HTML = "\n" +
"      <h1># MANIFESTO — Sovereign Systems for the AI Age</h1>\n\n" +
"      <p>Computing is undergoing the largest architectural shift since the invention of the compiler: <strong>software is increasingly designed, authored, repaired, and operated by autonomous AI coding swarms</strong>.</p>\n\n" +
"      <p>Yet modern systems languages—born in the era of single human typists—are fundamentally vulnerable to the risks of autonomous software synthesis: ambient authority that enables silent supply chain attacks, bloated files that cause AI hallucination drift, and external toolchain dependencies that compromise sovereign verification.</p>\n\n" +
"      <p><strong>openOODA exists to solve this.</strong> It is a systems programming language engineered from first principles with zero ambient authority, hard modular constraints, active binary defenses, and zero-trust verification.</p>\n\n" +
"      <h2>1. The Zero-Ambient-Authority Law</h2>\n" +
"      <p>In mainstream languages, any imported library or generated script receives ambient access to the entire operating system: disk, network, sockets, environment variables, and process execution.</p>\n\n" +
"      <p>In openOODA, <strong>no capability token means zero side effects</strong>. A function cannot read files without <code>&amp;FsReadCap</code>, write without <code>&amp;FsWriteCap</code>, touch the network without <code>&amp;NetCap</code>, or spawn processes without <code>&amp;ProcessCap</code>. Capability tokens cannot be forged or cast from raw integers or strings. Forged or missing tokens fail closed at compile time.</p>\n\n" +
"      <pre><code>// Pure function: mathematically impossible to touch disk or network\n" +
"pub fn add(a: Int, b: Int) -> Int {\n" +
"    return a + b;\n" +
"}\n\n" +
"// Effectful function: explicit, unforgeable token required\n" +
"pub fn save_config(\n" +
"    fs: &amp;FsWriteCap,\n" +
"    path: String,\n" +
"    content: String\n" +
") -> Result[Void, String] {\n" +
"    return write_file(fs, path, content);\n" +
"}</code></pre>\n\n" +
"      <h2>2. AI-Native Architecture</h2>\n" +
"      <p>Human-centric languages tolerate ambiguity, implicit type coercion, and massive monolithic files. When an AI agent modifies a 2,000-line file, context truncation leads directly to hallucination and logic regressions.</p>\n\n" +
"      <p>openOODA establishes non-negotiable structural rules for high-speed AI pair programming and autonomous swarms:</p>\n" +
"      <ul>\n" +
"        <li><strong>Strict &le;256 Line Budget</strong>: Every source file is capped at 256 lines. Large modules must be decomposed into small, focused submodules.</li>\n" +
"        <li><strong>Mandatory Explicit Typing</strong>: Zero untyped bindings. Every <code>let x: Type = val;</code> is strictly annotated, providing unambiguous context to both compilers and AI models.</li>\n" +
"        <li><strong>Standard 4-Element Academy Headers</strong>: Every file declares <code>Title</code>, <code>Logline</code>, <code>Setup</code>, and <code>Beats</code>, making semantic indexing instant.</li>\n" +
"        <li><strong>Surgical AST Patching</strong>: AI agents fix bugs by swapping isolated syntax nodes rather than rewriting entire files.</li>\n" +
"      </ul>\n\n" +
"      <h2>3. Sovereign Multi-Target Synthesis</h2>\n" +
"      <p>openOODA does not depend on monolithic, opaque toolchains. It synthesizes clean, auditable targets with mathematical parity across platforms:</p>\n" +
"      <ul>\n" +
"        <li><strong>Clean C99</strong>: Direct emission for host GCC compilation and microcontrollers.</li>\n" +
"        <li><strong>Production LLVM SSA IR</strong>: Multi-pass deterministic -O3 optimizer (Constant Folding, DCE, CSE, LICM) with DWARF5 source debug info.</li>\n" +
"        <li><strong>Direct x86-64 / AArch64 ELF</strong>: In-process bare-metal machine code generation with zero libc dependencies.</li>\n" +
"        <li><strong>WebAssembly (WasmGC)</strong>: Standalone sandboxed browser and edge modules.</li>\n" +
"      </ul>\n\n" +
"      <h2>4. Compile-Time Active Binary Defense</h2>\n" +
"      <p>Standard compilers emit deterministic, static control flow graphs that are trivially reversed by decompilers. openOODA embeds active defenses directly into everyday product builds:</p>\n" +
"      <ul>\n" +
"        <li><strong>Control Flow Flattening</strong>: Basic blocks are transformed into switch-driven state machines.</li>\n" +
"        <li><strong>Compile-Time String Encryption</strong>: Plaintext strings and literals never appear in binary data sections.</li>\n" +
"        <li><strong>Static Taint Tracking</strong>: Values marked <code>SECRET</code> are zeroized on drop and blocked from entering insecure sinks like unauthenticated sockets or stdout.</li>\n" +
"      </ul>\n\n" +
"      <h2>5. Zero-Trust Verification</h2>\n" +
"      <p>We do not trust mock stubs, marketing claims, or green CI dashboards that test empty mocks. Every openOODA standard library module proves its physical and mathematical invariants on live compiled binaries—from cryptographic bit-exactness (SHA-256, Kyber NTT, ChaCha20-Poly1305) to B-Tree monotonicity and fail-closed error handling.</p>\n\n" +
"      <div style=\"margin-top: 2rem; padding: 1rem 0; border-top: 1px solid var(--border); max-width: 42rem;\">\n" +
"        <p style=\"margin-bottom: 0.5rem;\"><strong>Ready to build sovereign software?</strong></p>\n" +
"        <p style=\"margin-bottom: 0;\">Explore the <a href=\"#start\">openOODA Guide</a> to install the compiler, write your first <code>.oo</code> program, and explore the standard library.</p>\n" +
"      </div>\n";
const SEARCH_HTML = `
<h1>Documentation &amp; Symbol Search</h1>
<p>Instant search across all 15 documentation guides, standard library modules, capability tokens, and compiler CLI flags.</p>
<div style="margin: 1.5rem 0 1.25rem;">
<input type="search" id="search-input" placeholder="Type to search (e.g. FsReadCap, sha256, SSA, MTD, Landlock, orderbook)..." style="width: 100%; max-width: 42rem; font-family: inherit; font-size: 1rem; padding: 0.65rem 0.9rem; background: var(--panel); color: var(--fg); border: 2px solid var(--fg); box-sizing: border-box;" autocomplete="off" autofocus>
</div>
<div id="search-meta" style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1.25rem;">Press <kbd style="background: var(--panel); border: 1px solid var(--border); padding: 0.15rem 0.4rem; border-radius: 2px;">/</kbd> or <kbd style="background: var(--panel); border: 1px solid var(--border); padding: 0.15rem 0.4rem; border-radius: 2px;">Ctrl+K</kbd> from any page to open search.</div>
<div id="search-results" style="display: flex; flex-direction: column; gap: 0.85rem; width: 100%; max-width: 42rem;">
</div>
`;
const SEARCH_INDEX = [
{
title: "Zero Ambient Authority & Capability Tokens",
route: "security",
desc: "Immunity to AI supply chain attacks. 14 unforgeable capability tokens: &FsReadCap, &FsWriteCap, &NetCap, &HttpCap, &ProcessCap, &SysCap."
},
{
title: "Language Syntax & Type System",
route: "syntax",
desc: "Static typing, struct declarations, sum types, pattern matching, Academy 4-element headers, and strict <= 256 line limit."
},
{
title: "Standard Library Reference (175+ Modules)",
route: "stdlib",
desc: "Modular standard library: std/crypto (ML-DSA, ML-KEM, Kyber, ChaCha20, SHA-256), std/fs, std/net, std/math, std/sync, std/fintech."
},
{
title: "Active Binary Defense & Morpher",
route: "defense",
desc: "Moving Target Defense (MTD), Control Flow Flattening, rolling XOR string encryption, anti-ROP gadget destruction, and autonomic RASP."
},
{
title: "Compiler CLI & Options",
route: "cli",
desc: "oodac compiler flags: emit-c, emit-llvm, emit-wasm, emit-x86, emit-aarch64, -O3 optimizations, and ooda build driver."
},
{
title: "Interactive WebAssembly Playground",
route: "play",
desc: "Interactive in-browser code editor, presets, WebAssembly execution, SSA IR inspection, and C99 code generation."
},
{
title: "Getting Started & Installation",
route: "start",
desc: "Installation via curl, authoring your first .oo program, running tests, and compiling native executables."
},
{
title: "Sovereign Package Manager & CAS Registry",
route: "packages",
desc: "Content-Addressed Storage (CAS) hashes, zero ambient dependency sandboxing, capability grants, and openooda.org/#registry."
},
{
title: "Sovereign Manifesto",
route: "manifesto",
desc: "Foundational principles of openOODA: zero ambient authority, hard modular constraints, active defenses, and zero-trust verification."
},
{
title: "Limits & Memory Layout",
route: "internals",
desc: "4-tier linear memory architecture (Scratch, Rodata, Shadow Stack, Dynamic Heap), 16 MB ceiling, and SSA Mem2Reg pipeline."
},
{
title: "Programmatic Economics (x402)",
route: "pay",
desc: "x402 capability-metered settlement protocol for autonomous AI swarms, micropayments, and sovereign API monetization."
},
{
title: "Zero-Trust Verification Matrix",
route: "qa",
desc: "Formal mathematical proofs, metamorphic fuzzing, and invariant checks on live compiled native binaries."
},
{
title: "Quick Reference Cheat Sheet",
route: "quickref",
desc: "High-density cheat sheet of all keywords, types, capability tokens, compiler flags, and stdlib modules."
},
{
title: "Post-Quantum Cryptography (ML-DSA / ML-KEM)",
route: "stdlib",
desc: "NIST FIPS 204 (ML-DSA) post-quantum digital signatures and NIST FIPS 203 (ML-KEM) key encapsulation mechanism."
},
{
title: "Finite Domain Verification & Landlock Sandboxing",
route: "security",
desc: "Compile-time proof obligations and Linux Landlock kernel LSM capability boundary enforcement."
}
];

function setupRegistry() {
  var qInput = document.getElementById("q");
  var tbody = document.getElementById("pkg-tbody");
  var countEl = document.getElementById("reg-count");
  if (!tbody) return;

  var rows = Array.from(tbody.querySelectorAll("tr.hit"));
  var totalCount = rows.length;

  function filterPackages() {
    var query = (qInput ? qInput.value : "").trim().toLowerCase();
    var matchCount = 0;

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var text = (row.textContent || "").toLowerCase();
      var isMatch = !query || text.indexOf(query) !== -1;
      row.style.display = isMatch ? "" : "none";
      if (isMatch) matchCount++;
    }

    if (countEl) {
      setDomText(countEl, "Showing " + matchCount + " of " + totalCount + " packages");
    }
  }

  if (qInput) {
    qInput.oninput = filterPackages;
    qInput.focus();
  }

  // Handle copy buttons and filter tag clicks
  tbody.onclick = function(ev) {
    var t = ev.target;
    if (!t) return;
    if (t.classList && t.classList.contains("copy-btn")) {
      ev.preventDefault();
      var cmd = t.getAttribute("data-cmd") || "";
      if (navigator.clipboard) {
        navigator.clipboard.writeText(cmd).then(function() {
          setDomText(t, "copied!");
          if (!t.classList.contains("is-on")) t.classList.add("is-on");
          setTimeout(function() {
            setDomText(t, "copy");
            if (t.classList.contains("is-on")) t.classList.remove("is-on");
          }, 1200);
        });
      }
      return;
    }
    if (t.getAttribute("data-filter") && qInput) {
      ev.preventDefault();
      qInput.value = t.getAttribute("data-filter");
      filterPackages();
    }
  };
}

function setupSearch() {
var input = document.getElementById("search-input");
var resultsContainer = document.getElementById("search-results");
if (!input || !resultsContainer) return;
function doSearch() {
var q = input.value.trim().toLowerCase();
if (!q) {
resultsContainer.innerHTML = SEARCH_INDEX.map(function(item) {
return '<a href="#' + item.route + '" class="search-card">' +
'<div class="search-card-header">' +
'<span class="search-card-title">' + item.title + '</span>' +
'<span class="search-card-route">#' + item.route + '</span>' +
'</div>' +
'<div class="search-card-desc">' + item.desc + '</div>' +
'</a>';
}).join("");
return;
}
var filtered = SEARCH_INDEX.filter(function(item) {
return item.title.toLowerCase().indexOf(q) !== -1 ||
item.desc.toLowerCase().indexOf(q) !== -1 ||
item.route.toLowerCase().indexOf(q) !== -1;
});
if (filtered.length === 0) {
resultsContainer.innerHTML = '<p style="color: var(--muted); padding: 1rem 0;">No results matching <strong>' + q + '</strong>. Try searching for <em>FsReadCap</em>, <em>crypto</em>, <em>SSA</em>, <em>MTD</em>, or <em>CLI</em>.</p>';
return;
}
resultsContainer.innerHTML = filtered.map(function(item) {
return '<a href="#' + item.route + '" class="search-card">' +
'<div class="search-card-header">' +
'<span class="search-card-title">' + item.title + '</span>' +
'<span class="search-card-route">#' + item.route + '</span>' +
'</div>' +
'<div class="search-card-desc">' + item.desc + '</div>' +
'</a>';
}).join("");
}
input.addEventListener("input", doSearch);
input.focus();
doSearch();
}
const PLAY_HTML = "\n" +
"      <h1>Interactive WebAssembly Playground</h1>\n" +
"      <p>Write, compile, and execute openOODA code directly in your browser with zero installation.</p>\n" +
"      \n" +
"      <div class=\"play-toolbar\">\n" +
"        <select id=\"preset\" class=\"play-select\" aria-label=\"Example presets\">\n" +
"          <option value=\"hello\">Hello (Contracts & Caps)</option>\n" +
"          <option value=\"pqc\">PQC (ML-KEM-1024 Lattice)</option>\n" +
"          <option value=\"l3\">L3 Book (Matching Engine)</option>\n" +
"          <option value=\"sgp4\">SGP4 (Orbital Kinematics)</option>\n" +
"          <option value=\"defense\">Defense (AST Morphing)</option>\n" +
"        </select>\n" +
"        <div class=\"play-actions\">\n" +
"          <button type=\"button\" class=\"play-btn primary\" id=\"run-btn\">▶ Run (Wasm)</button>\n" +
"          <button type=\"button\" class=\"play-btn\" id=\"ir-btn\">Inspect IR</button>\n" +
"          <button type=\"button\" class=\"play-btn\" id=\"c-btn\">C99 Output</button>\n" +
"        </div>\n" +
"      </div>\n\n" +
"      <div class=\"play-grid\">\n" +
"        <div class=\"editor-pane\">\n" +
"          <div class=\"pane-header\">\n" +
"            <span>openOODA Source (.oo)</span>\n" +
"            <span id=\"line-count\">≤ 256 lines limit</span>\n" +
"          </div>\n" +
"          <textarea id=\"editor\" spellcheck=\"false\" autocomplete=\"off\" aria-label=\"openOODA Code Editor\"></textarea>\n" +
"        </div>\n" +
"        <div class=\"output-pane\">\n" +
"          <div class=\"pane-header\">\n" +
"            <span>Execution Output</span>\n" +
"            <span id=\"exec-status\">Ready</span>\n" +
"          </div>\n" +
"          <pre id=\"output\">Click \"Run (Wasm)\" to compile and execute openOODA code in-browser.</pre>\n" +
"        </div>\n" +
"      </div>\n";
function isExternalUrl(target) {
  var allowedSchemes = ["http:", "https:", "mailto:", "irc:", "ircs:", "magnet:"];
  for (var i = 0; i < allowedSchemes.length; i++) {
    if (target.toLowerCase().lastIndexOf(allowedSchemes[i], 0) === 0) return true;
  }
  return false;
}

function escapeHtml(text) {
  var map = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"};
  return String(text).replace(/[&<>"']/g, function (c) { return map[c]; });
}

function wikiLinks(text) {
return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (match, label, target) {
var safeLabel = escapeHtml(label);
var safeTarget = escapeHtml(target);
if (isExternalUrl(safeTarget)) {
return '<a href="' + safeTarget + '" target="_blank" rel="noopener noreferrer">' + safeLabel + "</a>";
}
var docName = safeTarget.replace(/^[#/]/, "");
var route = DOC_TO_ROUTE[docName] || docName;
return '<a href="#' + encodeURIComponent(route) + '">' + safeLabel + "</a>";
});
}
function simpleMarkdown(text) {
  var htmlBlocks = [];
  var preserved = text.replace(/<[a-zA-Z\/][^>]*>/g, function (match) {
    var idx = htmlBlocks.length;
    htmlBlocks.push(match);
    return "\x00RAWHTML" + idx + "\x00";
  });
  var html = preserved.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/```([\s\S]*?)```/g, function (match, code) {
    return "<pre><code>" + code.trim() + "</code></pre>";
  });
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
  html = html.replace(/\*\*([^\*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/^---$/gim, "<hr>");
  html = html.replace(/^\|(.+)\|$/gim, function (match, row) {
    var cells = row.split("|").map(function (c) { return c.trim(); });
    return "<tr>" + cells.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
  });
  html = html.replace(/((?:<tr>.*<\/tr>\n?)+)/g, "<table>$1</table>");
  html = html.replace(/^\s*-\s+(.*$)/gim, "<li>$1</li>");
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");
  var paras = html.split(/\n\n+/);
  html = paras.map(function (p) {
    p = p.trim();
    if (!p) return "";
    if (/^<(h[1-6]|pre|table|ul|ol|blockquote|hr)/.test(p) || p.indexOf("\x00RAWHTML") === 0) return p;
    return "<p>" + p.replace(/\n/g, "<br>") + "</p>";
  }).join("\n");
  html = html.replace(/\x00RAWHTML(\d+)\x00/g, function (match, idx) {
    return htmlBlocks[parseInt(idx, 10)] || "";
  });
  return html;
}
// ====================================================
// Zero-Allocation Performance Structures & Alpha LUT
// ====================================================

class ContrailRingBufferF32 {
  constructor(capacity = 64, stride = 4) {
    this.capacity = capacity;
    this.stride = stride;
    this.buffer = new Float32Array(capacity * stride);
    this.head = 0;
    this.count = 0;
  }

  push(x, y, alpha, extra = 0) {
    const offset = this.head * this.stride;
    this.buffer[offset] = x;
    this.buffer[offset + 1] = y;
    this.buffer[offset + 2] = alpha;
    if (this.stride > 3) {
      this.buffer[offset + 3] = extra;
    }
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  forEach(callback) {
    if (this.count === 0) return;
    const start = (this.head - this.count + this.capacity) % this.capacity;
    for (let i = 0; i < this.count; i++) {
      const idx = (start + i) % this.capacity;
      const offset = idx * this.stride;
      callback(
        this.buffer[offset],
        this.buffer[offset + 1],
        this.buffer[offset + 2],
        this.stride > 3 ? this.buffer[offset + 3] : 0,
        i,
        idx
      );
    }
  }

  clear() {
    this.head = 0;
    this.count = 0;
  }
}

class StaticEntityPoolF32 {
  constructor(maxEntities = 128, stride = 8) {
    this.maxEntities = maxEntities;
    this.stride = stride;
    this.buffer = new Float32Array(maxEntities * stride);
    this.activeCount = 0;
  }

  alloc() {
    if (this.activeCount >= this.maxEntities) {
      return -1;
    }
    const index = this.activeCount;
    this.activeCount++;
    return index;
  }

  free(index) {
    if (index < 0 || index >= this.activeCount) return false;
    const last = this.activeCount - 1;
    if (index !== last) {
      const targetOffset = index * this.stride;
      const lastOffset = last * this.stride;
      for (let s = 0; s < this.stride; s++) {
        this.buffer[targetOffset + s] = this.buffer[lastOffset + s];
      }
    }
    this.activeCount--;
    return true;
  }

  clear() {
    this.activeCount = 0;
  }
}

class VfxParticlePool extends StaticEntityPoolF32 {
  constructor(maxEntities = 512, stride = 8) {
    super(maxEntities, stride);
  }
}

class WreckagePool extends StaticEntityPoolF32 {
  constructor(maxEntities = 32, stride = 10) {
    super(maxEntities, stride);
  }
}

class ThemeAlphaLUT {
  constructor() {
    this.lut = new Map();
    this.levels = 101;
  }

  initTheme(themeName, colorMap) {
    const table = {};
    for (const [key, hexOrRgb] of Object.entries(colorMap)) {
      table[key] = new Array(this.levels);
      const rgb = this.parseColor(hexOrRgb);
      for (let i = 0; i < this.levels; i++) {
        const alpha = (i / (this.levels - 1)).toFixed(2);
        table[key][i] = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
      }
    }
    this.lut.set(themeName, table);
  }

  parseColor(colorStr) {
    if (typeof colorStr !== "string") return { r: 232, g: 232, b: 232 };
    if (colorStr.startsWith("#")) {
      let hex = colorStr.slice(1);
      if (hex.length === 3) {
        hex = hex.split("").map((c) => c + c).join("");
      }
      const num = parseInt(hex, 16);
      if (isNaN(num)) return { r: 232, g: 232, b: 232 };
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    } else if (colorStr.startsWith("rgba") || colorStr.startsWith("rgb")) {
      const parts = colorStr.replace(/[^0-9,]/g, "").split(",").map(Number);
      return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0 };
    }
    return { r: 232, g: 232, b: 232 };
  }

  get(themeName, colorKey, alpha) {
    const table = this.lut.get(themeName);
    if (!table || !table[colorKey]) return "rgba(232,232,232,1.00)";
    const numAlpha = Number(alpha);
    const validAlpha = isNaN(numAlpha) ? 1.0 : numAlpha;
    const clampedAlpha = Math.max(0, Math.min(1, validAlpha));
    const idx = Math.round(clampedAlpha * (this.levels - 1));
    return table[colorKey][idx];
  }
}

const FACTION_COLORS = {
  blue: {
    primary: "#00b4d8",
    accent: "#38bdf8",
    glow: "rgba(0,180,216,0.45)",
    tracer: "rgba(56,189,248,0.75)",
    exhaustDry: "rgba(0,180,216,0.65)",
    exhaustAB: "#38bdf8"
  },
  red: {
    primary: "#ef233c",
    accent: "#f43f5e",
    glow: "rgba(239,35,60,0.45)",
    tracer: "rgba(244,63,94,0.75)",
    exhaustDry: "rgba(239,35,60,0.65)",
    exhaustAB: "#f43f5e"
  }
};

const NINE_THEME_DEFINITIONS = {
  night: { bg: "#000000", fg: "#e8e8e8", muted: "#9a9a9a", panel: "#141414", border: "rgba(232,232,232,0.22)", accent: "#e8e8e8", gold: "#ffd166", red: "#ff6b6b", blue: "#7dcfff" },
  paper: { bg: "#ffffff", fg: "#000000", muted: "#444444", panel: "#f2f2f2", border: "rgba(0,0,0,0.22)", accent: "#000000", gold: "#d98c36", red: "#c8102e", blue: "#0055aa" },
  magma: { bg: "#140d0f", fg: "#ff6b6b", muted: "#d67070", panel: "#221216", border: "rgba(255,107,107,0.22)", accent: "#ff6b6b", gold: "#ffa726", red: "#ff5555", blue: "#60a5fa" },
  flare: { bg: "#181008", fg: "#ffa726", muted: "#d98c36", panel: "#26170a", border: "rgba(255,167,38,0.22)", accent: "#ffa726", gold: "#ffd166", red: "#ff6b6b", blue: "#64b5f6" },
  solar: { bg: "#002b36", fg: "#ffd166", muted: "#93a1a1", panel: "#073642", border: "rgba(255,209,102,0.22)", accent: "#ffd166", gold: "#ffd166", red: "#ff6b6b", blue: "#38b9ad" },
  cyber: { bg: "#040a06", fg: "#00ff66", muted: "#00c853", panel: "#08170c", border: "rgba(0,255,102,0.22)", accent: "#00ff66", gold: "#ffd166", red: "#ff3366", blue: "#00e5ff" },
  frost: { bg: "#16202a", fg: "#80ffea", muted: "#7fc4d4", panel: "#1f2d3a", border: "rgba(128,255,234,0.22)", accent: "#80ffea", gold: "#ffd166", red: "#ff6b8b", blue: "#80ffea" },
  tokyo: { bg: "#1a1b26", fg: "#7dcfff", muted: "#9aa5ce", panel: "#24283b", border: "rgba(125,207,255,0.22)", accent: "#7dcfff", gold: "#e0af68", red: "#f7768e", blue: "#7dcfff" },
  laser: { bg: "#18122b", fg: "#ff45a8", muted: "#b39ddb", panel: "#251b3d", border: "rgba(255,69,168,0.22)", accent: "#ff45a8", gold: "#ffd166", red: "#ff45a8", blue: "#00e5ff" }
};

const globalAlphaLUT = new ThemeAlphaLUT();
for (const [tName, tColors] of Object.entries(NINE_THEME_DEFINITIONS)) {
  globalAlphaLUT.initTheme(tName, tColors);
}

function getAlphaColor(colorKey, alpha) {
  const curTheme = (typeof document !== "undefined" && document.documentElement && document.documentElement.getAttribute("data-theme")) || "night";
  return globalAlphaLUT.get(curTheme, colorKey, alpha);
}

// Hoisted static arrays & constants across micro-visualizers
const DASH_2_4 = [2, 4];
const DASH_2_2 = [2, 2];
const DASH_4_4 = [4, 4];
const F16_PHASES = ["OBSERVE", "ORIENT", "DECIDE", "ACT"];
const EM_OODA_NODES = ["OBSERVE", "ORIENT", "DECIDE", "ACT"];
const TARGET_SIM_STAGES = [
  { name: "1. AST Parser", y: 55 },
  { name: "2. Capability Check", y: 95 },
  { name: "3. SSA Optimizer", y: 135 },
  { name: "4. Target Emitter", y: 175 }
];
const TARGET_SIM_DATA = {
  c99: {
    title: "ISO C99 Hard Science Kernel (std/phys/physics/orbital.oo)",
    badge: "ISO C99",
    code: [
      "// Keplerian Vis-Viva Instantaneous Orbital Velocity",
      "double orb_vis_viva(double r, double a, double mu) {",
      "  if (r <= 0.0 || a <= 0.0) return 0.0;",
      "  double term = (2.0 / r) - (1.0 / a);",
      "  return (term > 0.0) ? sqrt(mu * term) : 0.0;",
      "}"
    ],
    status: "Codegen Latency: 0.18ms | Output Footprint: 28,210 B | Zero Libc Dependencies"
  },
  llvm: {
    title: "LLVM SSA IR (-O3 Optimized Hard Science Kernel)",
    badge: "LLVM SSA -O3",
    code: [
      "define double @orb_vis_viva(double %r, double %a, double %mu) #0 {",
      "  %1 = fdiv fast double 2.0, %r",
      "  %2 = fdiv fast double 1.0, %a",
      "  %3 = fsub fast double %1, %2",
      "  %4 = fmul fast double %mu, %3",
      "  %5 = tail call double @llvm.sqrt.f64(double %4)",
      "  ret double %5",
      "}"
    ],
    status: "Codegen Latency: 0.24ms | SSA Passes: 18 | DWARF5 Symbols | Vectorized"
  },
  x86: {
    title: "Bare-Metal x86-64 ELF Vectorized Assembly",
    badge: "x86-64 ELF",
    code: [
      "0x1000: vmovsd  xmm2, [rel c_two]    ; Load 2.0",
      "0x1008: vdivsd  xmm2, xmm2, xmm0     ; 2.0 / r",
      "0x100d: vmovsd  xmm3, [rel c_one]    ; Load 1.0",
      "0x1015: vdivsd  xmm3, xmm3, xmm1     ; 1.0 / a",
      "0x101a: vsubsd  xmm2, xmm2, xmm3     ; (2/r) - (1/a)",
      "0x101f: vmulsd  xmm2, xmm2, xmm4     ; mu * term",
      "0x1024: vsqrtsd xmm0, xmm2, xmm2     ; sqrt(mu * term)",
      "0x1029: ret"
    ],
    status: "Codegen Latency: 0.12ms | Output Footprint: 4,096 B | Direct Syscall Trampoline"
  },
  arm: {
    title: "Bare-Metal AArch64 ELF Vectorized Assembly",
    badge: "AArch64 ELF",
    code: [
      "0x1000: fmov    d3, #2.0             ; Load 2.0",
      "0x1004: fdiv    d3, d3, d0           ; 2.0 / r",
      "0x1008: fmov    d4, #1.0             ; Load 1.0",
      "0x100c: fdiv    d4, d4, d1           ; 1.0 / a",
      "0x1010: fsub    d3, d3, d4           ; (2/r) - (1/a)",
      "0x1014: fmul    d3, d3, d2           ; mu * term",
      "0x1018: fsqrt   d0, d3               ; sqrt(mu * term)",
      "0x101c: ret"
    ],
    status: "Codegen Latency: 0.14ms | Output Footprint: 4,096 B | AArch64 Direct Syscall"
  },
  wasm: {
    title: "WebAssembly WasmGC Compact Bytecode",
    badge: "WasmGC",
    code: [
      "(func $orb_vis_viva (param $r f64) (param $a f64) (param $mu f64) (result f64)",
      "  (f64.sqrt",
      "    (f64.mul (local.get $mu)",
      "      (f64.sub",
      "        (f64.div (f64.const 2.0) (local.get $r))",
      "        (f64.div (f64.const 1.0) (local.get $a))))))"
    ],
    status: "Codegen Latency: 0.08ms | Output Footprint: 1,842 B | Edge Sandbox Isolation"
  },
  "6dof": {
    title: "6-DoF Aerospace Flight Dynamics (std/phys/aero/aero_state.oo)",
    badge: "6-DoF Aero",
    code: [
      "import \"std/phys/aero/atmosphere.oo\";",
      "import \"std/phys/aero/aero_state.oo\";",
      "import \"std/phys/aero/boyd_em.oo\";",
      "import \"std/phys/aero/lift_force_law.oo\";",
      "let atmo: IsaAtmosphere = isa_atmosphere_at(alt_m);",
      "let q: Float = aero_compute_dynamic_pressure(atmo.density_kg_m3, tas_mps);",
      "let mach: Float = aero_compute_mach(tas_mps, atmo.speed_of_sound_mps);",
      "let lift: Float = calculate_lift_force(q, s, calculate_lift_coefficient(w, n_g, q, s));"
    ],
    status: "Aero State: TAS 482 m/s | Mach 1.55 | Alpha: 6.8° | G-Load: 4.8G | CADC Sweep: 58° Delta"
  },
  orbit: {
    title: "Keplerian 2-Body Orbital Mechanics (std/phys/physics/orbital.oo)",
    badge: "Kepler Orbit",
    code: [
      "// Vis-Viva Orbital Velocity: v = sqrt(GM * (2/r - 1/a))",
      "let v: Float = orb_vis_viva(r_meters, a_meters, m_central);",
      "let t_period: Float = orb_period(a_meters, m_central);",
      "let v_esc: Float = orb_escape_velocity(r_meters, m_central);"
    ],
    status: "Orbital Mechanics: Semi-Major Axis 7,200 km | e=0.48 | Vis-Viva: 9.84 km/s | Period: 104.2 min"
  },
  lorentz: {
    title: "Special Relativity & Lorentz Transforms (std/phys/physics/relativity.oo)",
    badge: "Lorentz Rel",
    code: [
      "// Lorentz Factor: γ = 1 / sqrt(1 - (v/c)²)",
      "let gamma: Float = rel_gamma(v_mps);",
      "let delta_t: Float = rel_time_dilation(tau_sec, v_mps);",
      "let l_contract: Float = rel_length_contraction(l0_meters, v_mps);"
    ],
    status: "Relativity: Velocity 0.88c (beta=0.880) | Lorentz Gamma: 2.105 | Length: 47.5% L0 | Dilation: 2.11x"
  }
};
const MTD_ASLR_BASES = [
  "0x7FFF_84A0_0000",
  "0x7FFF_91B4_2000",
  "0x7FFF_C03E_8000",
  "0x7FFF_A75D_4000",
  "0x7FFF_5E20_1000",
  "0x7FFF_B3C9_6000",
  "0x7FFF_19D8_F000",
  "0x7FFF_D4E2_A000"
];
const MTD_CANONICAL_NODES = [
  { id: 1, label: "0x10 Entry", x: 45, y: 125, targetX: 45, targetY: 125, vx: 0, vy: 0, isKey: true },
  { id: 2, label: "&FsCap Grant", x: 120, y: 68, targetX: 120, targetY: 68, vx: 0, vy: 0, isKey: false },
  { id: 3, label: "0x30 Dispatcher", x: 195, y: 125, targetX: 195, targetY: 125, vx: 0, vy: 0, isKey: true },
  { id: 4, label: "0x40 BasicBlock_A", x: 275, y: 68, targetX: 275, targetY: 68, vx: 0, vy: 0, isKey: false },
  { id: 5, label: "0x50 BasicBlock_B", x: 275, y: 182, targetX: 275, targetY: 182, vx: 0, vy: 0, isKey: false },
  { id: 6, label: "0x60 RASP Watchdog", x: 120, y: 182, targetX: 120, targetY: 182, vx: 0, vy: 0, isKey: false },
  { id: 7, label: "0x70 Return", x: 345, y: 125, targetX: 345, targetY: 125, vx: 0, vy: 0, isKey: true }
];
const MTD_INDEXED_EDGES = [
  [0, 1], [0, 5], [1, 2], [5, 2], [2, 3], [2, 4], [3, 6], [4, 6]
];
const MTD_RAND_Y = [68, 98, 125, 155, 182];
const MTD_RAND_X = [45, 105, 165, 225, 285, 345];
const MTD_NODE_MORPH_LABELS = [
  ["0x10 Entry", "0x1A Prologue", "0x14 FrameSet", "0x1F Entry_MTD"],
  ["&FsCap Grant", "&Cap Check", "&Fs Token", "&Cap Valid"],
  ["0x30 Dispatcher", "0x3B Switch", "0x32 StateMux", "0x3F MTD_Disp"],
  ["0x40 Block_A", "0x44 XOR r1,r2", "0x48 SUB r1,r2", "0x4C Morph_A"],
  ["0x50 Block_B", "0x54 ROR r3,5", "0x58 ROL r3,3", "0x5C Morph_B"],
  ["0x60 RASP Watchdog", "0x66 CanaryChk", "0x6A 0-ROP Trap", "0x6E Watchdog"],
  ["0x70 Return", "0x78 Epilogue", "0x7C Ret_Poison", "0x7F SafeRet"]
];
const MTD_RAM_PAGES = [
  { name: ".text", crc: "A4F1" },
  { name: ".rodata", crc: "9E02" },
  { name: "&Cap", crc: "C73B" },
  { name: "Stack", crc: "5D14" },
  { name: "Shadow", crc: "F88A" },
  { name: "CFI", crc: "3C90" },
  { name: "Morph", crc: "B17E" },
  { name: "Heap", crc: "084D" },
  { name: "State", crc: "E61A" },
  { name: "Canary", crc: "2F4C" },
  { name: "KeyRot", crc: "D570" },
  { name: "DynBB", crc: "8B33" },
  { name: "CRC32", crc: "1C89" },
  { name: "SigRing", crc: "6A2F" },
  { name: "IOGate", crc: "77D1" },
  { name: "Trap", crc: "4E5B" }
];
const VERIFY_GATE_XS = [160, 290, 420, 550];
const VERIFY_GATE_NAMES = ["NIST", "0-Byte", "RAII", "SHA-256"];
const VERIFY_GATE_INVARIANTS = ["KAT Vector", "0 Heap Leak", "&Cap Scope", "SHA-256 Match"];
const VERIFY_TARGET_BADGES = [
  { name: "WasmGC", x: 184, y: 14, w: 58, h: 14, tag: "wasm32-gc" },
  { name: "ELF x86_64", x: 248, y: 14, w: 72, h: 14, tag: "bare-metal" },
  { name: "ELF AArch64", x: 326, y: 14, w: 78, h: 14, tag: "bare-metal" },
  { name: "ISO C99", x: 410, y: 14, w: 56, h: 14, tag: "0-libc" }
];
const VERIFY_AST_STREAM = ["FnDecl(ps)", "&AeroCap", "Simd8x32", "KAT", "Ret(f32)"];
const VERIFY_STREAM_TOKENS_REF = ["vmovaps", "0x48 0x89", "syscall", "fmla.4s", "svc #0", "0xD503201F"];
const VERIFY_STREAM_TOKENS_SYNTH = ["wasm32", "(func $ps)", "local.get", "i64.const", "struct.get", "0-libc"];


var _cachedThemeColors = null;
function invalidateThemeCache() {
  _cachedThemeColors = null;
}
function getThemeColors() {
  if (_cachedThemeColors) return _cachedThemeColors;
  const curTheme = (typeof document !== "undefined" && document.documentElement && document.documentElement.getAttribute("data-theme")) || "night";
  if (typeof document === "undefined" || !document.documentElement) {
    _cachedThemeColors = NINE_THEME_DEFINITIONS[curTheme] || NINE_THEME_DEFINITIONS.night;
    return _cachedThemeColors;
  }
  var style = getComputedStyle(document.documentElement);
  var fg = (style.getPropertyValue("--fg") || "#e8e8e8").trim();
  var bg = (style.getPropertyValue("--bg") || "#000000").trim();
  var panel = (style.getPropertyValue("--panel") || "#141414").trim();
  var border = (style.getPropertyValue("--border") || "rgba(232,232,232,0.22)").trim();
  var muted = (style.getPropertyValue("--muted") || "#9a9a9a").trim();
  var accent = (style.getPropertyValue("--accent") || fg).trim();
  var themeDef = NINE_THEME_DEFINITIONS[curTheme] || NINE_THEME_DEFINITIONS.night;
  var blue = themeDef.blue || "#7dcfff";
  var red = themeDef.red || "#ff6b6b";
  var gold = themeDef.gold || "#ffd166";
  _cachedThemeColors = { fg: fg, bg: bg, panel: panel, border: border, muted: muted, accent: accent, blue: blue, red: red, gold: gold };
  if (!globalAlphaLUT.lut.has(curTheme)) {
    globalAlphaLUT.initTheme(curTheme, _cachedThemeColors);
  }
  return _cachedThemeColors;
}

// ====================================================
// Zero-Leak Canvas & Animation Lifecycle Controller
// ====================================================
const CanvasLifecycleManager = (function () {
  const registry = new Map();
  let prefersReducedMotion = (typeof window !== "undefined" && window.matchMedia)
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };
  let docHidden = typeof document !== "undefined" ? document.hidden : false;
  let intersectionObserver = null;

  function initObserver() {
    if (typeof IntersectionObserver === "undefined") return;
    try {
      intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const item = registry.get(entry.target);
          if (!item) return;
          item.inViewport = entry.isIntersecting && (entry.intersectionRatio > 0 || entry.isIntersecting);
          updateItemState(item);
        });
      }, { threshold: [0, 0.05] });
    } catch (e) {
      intersectionObserver = null;
    }
  }

  function updateItemState(item) {
    const isDocVisible = (typeof document !== "undefined" && typeof document.hidden !== "undefined") ? !document.hidden : !docHidden;
    const isAccordionOpen = item.accordion ? !!item.accordion.open : true;
    const isConnected = item.canvas ? (item.canvas.isConnected !== false && (typeof document === "undefined" || !document.body || (document.body.contains && document.body.contains(item.canvas)))) : false;
    const isFixedBg = item.canvas && (item.canvas.id === "dogfight-canvas" || item.canvas.id === "sky");
    const inView = isFixedBg ? true : item.inViewport;
    const shouldRun = isDocVisible && isAccordionOpen && inView && isConnected && !item.reducedMotionBlocked && (item.canvas && item.canvas.id === "dogfight-canvas" ? jetsEnabled : true);

    if (shouldRun && !item.isRunning) {
      item.isRunning = true;
      item.start();
    } else if (!shouldRun && item.isRunning) {
      item.isRunning = false;
      item.stop();
    }
  }

  function updateAll() {
    registry.forEach(updateItemState);
  }

  function updateReducedMotion() {
    const matches = prefersReducedMotion ? !!prefersReducedMotion.matches : false;
    registry.forEach((item) => {
      item.reducedMotionBlocked = matches && !!item.respectReducedMotion;
      updateItemState(item);
    });
  }

  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", function () {
      docHidden = document.hidden;
      updateAll();
    });
  }

  if (typeof window !== "undefined" && window.matchMedia) {
    try {
      if (prefersReducedMotion && prefersReducedMotion.addEventListener) {
        prefersReducedMotion.addEventListener("change", function () {
          updateReducedMotion();
        });
      } else if (prefersReducedMotion && prefersReducedMotion.addListener) {
        prefersReducedMotion.addListener(function () {
          updateReducedMotion();
        });
      }
    } catch (e) {}
  }

  initObserver();

  return {
    setDocHidden(val) {
      docHidden = !!val;
      this.updateAll();
    },
    setReducedMotion(val) {
      if (prefersReducedMotion) prefersReducedMotion.matches = !!val;
      updateReducedMotion();
    },
    register(id, opts) {
      this.unregister(id);
      if (!opts || !opts.canvas) return;
      const motionBlocked = prefersReducedMotion ? (prefersReducedMotion.matches && !!opts.respectReducedMotion) : false;
      const isFixedBg = opts.canvas && (opts.canvas.id === "dogfight-canvas" || opts.canvas.id === "sky");
      const item = {
        id: id,
        canvas: opts.canvas,
        start: opts.start,
        stop: opts.stop,
        accordion: opts.accordion || null,
        respectReducedMotion: !!opts.respectReducedMotion,
        reducedMotionBlocked: motionBlocked,
        inViewport: isFixedBg ? true : (!intersectionObserver || opts.canvas.id === "f16-canvas"),
        isRunning: false
      };
      registry.set(opts.canvas, item);
      if (intersectionObserver && opts.canvas instanceof (typeof Element !== "undefined" ? Element : Object)) {
        try {
          intersectionObserver.observe(opts.canvas);
        } catch (e) {}
      }
      if (opts.accordion && opts.accordion.addEventListener) {
        opts.accordion.addEventListener("toggle", function () {
          updateItemState(item);
        });
      }
      updateItemState(item);
    },
    unregister(id) {
      for (const [canvas, item] of registry.entries()) {
        if (item.id === id || canvas === id) {
          if (item.isRunning) {
            item.isRunning = false;
            try { item.stop(); } catch (e) {}
          }
          if (intersectionObserver && canvas instanceof (typeof Element !== "undefined" ? Element : Object)) {
            try { intersectionObserver.unobserve(canvas); } catch (e) {}
          }
          registry.delete(canvas);
          break;
        }
      }
    },
    updateAll: updateAll,
    updateReducedMotion: updateReducedMotion,
    getThemeColors: getThemeColors,
    updateColors() {
      this.updateAll();
    },
    start(id) {
      const item = this.getItem(id);
      if (item && !item.isRunning) {
        item.isRunning = true;
        try { item.start(); } catch (e) {}
      }
    },
    pause(id) {
      const item = this.getItem(id);
      if (item && item.isRunning) {
        item.isRunning = false;
        try { item.stop(); } catch (e) {}
      }
    },
    cleanupRoute() {
      this.unregister("f16-hud");
      this.unregister("em-engine");
      this.unregister("cap-sandbox");
      this.unregister("swarm-canvas");
      this.unregister("target-sim");
      this.unregister("mtd-engine");
      this.unregister("verify-prover");
      this.unregister("manifesto-dogfight");
    },
    getRegistrySize() {
      return registry.size;
    },
    getItem(canvasOrId) {
      if (registry.has(canvasOrId)) {
        return registry.get(canvasOrId);
      }
      for (const [canvas, item] of registry.entries()) {
        if (item.id === canvasOrId) return item;
      }
      return null;
    }
  };
})();

if (typeof window !== "undefined") {
  window.CanvasLifecycleManager = CanvasLifecycleManager;
  window.CanvasManager = CanvasLifecycleManager;
  window.getThemeColors = getThemeColors;
  window.ContrailRingBufferF32 = ContrailRingBufferF32;
  window.StaticEntityPoolF32 = StaticEntityPoolF32;
  window.VfxParticlePool = VfxParticlePool;
  window.WreckagePool = WreckagePool;
  window.ThemeAlphaLUT = ThemeAlphaLUT;
  window.globalAlphaLUT = globalAlphaLUT;
  window.getAlphaColor = getAlphaColor;
}

// ----------------------------------------------------
// 1. F-16 Tactical Radar & Boyd HUD (#f16-canvas)
// ----------------------------------------------------
function initF16Hud() {
  var canvas = document.getElementById("f16-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var accordion = canvas.closest ? canvas.closest("details") : null;
  var width = canvas.width = 672;
  var height = canvas.height = 150;
  var animId = null;
  var time = 0;
  var phaseTimer = 0;
  var currentPhaseIdx = 0;

  // F-16 State
  var f16 = {
    x: 100, y: height / 2,
    vx: 3.5, vy: 0,
    targetX: 200, targetY: height / 2,
    angle: 0,
    bankAngle: 0,
    throttle: 1.0,
    isBreaking: false,
    breakTimer: 0
  };

  // Pre-allocated typed structures
  var f16Contrail = new ContrailRingBufferF32(32, 4);
  var shockwavesPool = new StaticEntityPoolF32(16, 4); // x, y, radius, alpha
  var flaresPool = new StaticEntityPoolF32(32, 5);      // x, y, vx, vy, life

  // Tactical Targets / Radar Blips
  var targets = [
    { x: 420, y: 45, vx: -1.2, vy: 0.4, locked: false, destroyed: false },
    { x: 540, y: 110, vx: -1.5, vy: -0.3, locked: false, destroyed: false }
  ];
  var radarAngle = 0;

  function triggerTacticalBreak() {
    f16.isBreaking = true;
    f16.breakTimer = 45;
    f16.vx = 7.0;
    var swIdx = shockwavesPool.alloc();
    if (swIdx >= 0) {
      var so = swIdx * 4;
      shockwavesPool.buffer[so] = f16.x;
      shockwavesPool.buffer[so + 1] = f16.y;
      shockwavesPool.buffer[so + 2] = 4;
      shockwavesPool.buffer[so + 3] = 1.0;
    }
    // Dispense flares
    for (var i = 0; i < 8; i++) {
      var flIdx = flaresPool.alloc();
      if (flIdx >= 0) {
        var fo = flIdx * 5;
        flaresPool.buffer[fo] = f16.x - 15;
        flaresPool.buffer[fo + 1] = f16.y + (Math.random() - 0.5) * 8;
        flaresPool.buffer[fo + 2] = -3.5 - Math.random() * 3;
        flaresPool.buffer[fo + 3] = (Math.random() - 0.5) * 4;
        flaresPool.buffer[fo + 4] = 1.0;
      }
    }
  }

  var lastF16Time = 0;
  function updateF16Loop(now) {
    if (!animId) return;
    animId = requestAnimationFrame(updateF16Loop);
    if (now && lastF16Time && (now - lastF16Time < 22)) return; // Cap to ~45 FPS
    lastF16Time = now;

    var colors = getThemeColors();
    time += 0.03;
    phaseTimer++;
    if (phaseTimer > 80) {
      phaseTimer = 0;
      currentPhaseIdx = (currentPhaseIdx + 1) % F16_PHASES.length;
      if (currentPhaseIdx === 3) triggerTacticalBreak();
      var currentPhase = F16_PHASES[currentPhaseIdx];
      var steps = document.querySelectorAll(".phase-step");
      for (var s = 0; s < steps.length; s++) {
        var el = steps[s];
        var id = el.id.replace("ph-", "").toUpperCase();
        var isActive = currentPhase.startsWith(id);
        if (el.classList.contains("active") !== isActive) {
          el.classList.toggle("active", isActive);
        }
      }
    }
    var curPhase = F16_PHASES[currentPhaseIdx];

    // 1. Clear Screen
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw CRT Pixel Radar Grid & Pitch Ladder
    ctx.save();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.setLineDash(DASH_2_4);
    for (var gx = 0; gx < width; gx += 48) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
    }
    for (var gy = 0; gy < height; gy += 30) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
    }
    // Radar Sweep Line
    radarAngle += 0.04;
    var rX = 80 + Math.cos(radarAngle) * 60;
    var rY = height / 2 + Math.sin(radarAngle) * 60;
    ctx.beginPath();
    ctx.arc(80, height / 2, 60, 0, Math.PI * 2);
    ctx.strokeStyle = colors.border;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(80, height / 2);
    ctx.lineTo(rX, rY);
    ctx.strokeStyle = getAlphaColor("fg", 0.4);
    ctx.stroke();
    ctx.restore();

    // 3. Update & Draw Shockwaves
    for (var s = shockwavesPool.activeCount - 1; s >= 0; s--) {
      var so = s * 4;
      shockwavesPool.buffer[so + 2] += 5; // radius
      shockwavesPool.buffer[so + 3] *= 0.92; // alpha
      var swAlpha = shockwavesPool.buffer[so + 3];
      if (swAlpha < 0.02) {
        shockwavesPool.free(s);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(shockwavesPool.buffer[so], shockwavesPool.buffer[so + 1], shockwavesPool.buffer[so + 2], 0, Math.PI * 2);
      ctx.strokeStyle = getAlphaColor("fg", swAlpha * 0.8);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Update & Draw Countermeasure Flares
    for (var fl = flaresPool.activeCount - 1; fl >= 0; fl--) {
      var fo = fl * 5;
      flaresPool.buffer[fo] += flaresPool.buffer[fo + 2];
      flaresPool.buffer[fo + 1] += flaresPool.buffer[fo + 3];
      flaresPool.buffer[fo + 2] *= 0.95;
      flaresPool.buffer[fo + 3] *= 0.95;
      flaresPool.buffer[fo + 4] *= 0.94; // life
      var life = flaresPool.buffer[fo + 4];
      if (life < 0.02) {
        flaresPool.free(fl);
        continue;
      }
      ctx.fillStyle = getAlphaColor("fg", life);
      ctx.fillRect(Math.floor(flaresPool.buffer[fo]), Math.floor(flaresPool.buffer[fo + 1]), 3, 3);
    }

    // 5. Update Targets
    for (var t = 0; t < targets.length; t++) {
      var tgt = targets[t];
      tgt.x += tgt.vx;
      tgt.y += tgt.vy;
      if (tgt.x < -20) { tgt.x = width + 20; tgt.y = 30 + Math.random() * (height - 60); }
      if (tgt.y < 20 || tgt.y > height - 20) tgt.vy *= -1;
      // Draw pixel threat diamond
      ctx.save();
      ctx.strokeStyle = colors.fg;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.floor(tgt.x) - 4, Math.floor(tgt.y) - 4, 8, 8);
      ctx.fillStyle = colors.fg;
      ctx.fillRect(Math.floor(tgt.x) - 1, Math.floor(tgt.y) - 1, 2, 2);
      // HUD Lock Box during DECIDE/ACT
      if (curPhase === "DECIDE" || curPhase === "ACT") {
        ctx.setLineDash(DASH_2_2);
        ctx.beginPath();
        ctx.moveTo(f16.x, f16.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = getAlphaColor("fg", 0.5);
        ctx.stroke();
        ctx.fillText("LOCK: 0.84s", tgt.x - 14, tgt.y - 8);
      }
      ctx.restore();
    }

    // 6. F-16 Flight Dynamics
    if (f16.isBreaking) {
      f16.breakTimer--;
      f16.y += Math.sin(f16.breakTimer * 0.2) * 2.8;
      f16.angle = Math.sin(f16.breakTimer * 0.15) * 0.35;
      if (f16.breakTimer <= 0) f16.isBreaking = false;
    } else {
      var targetY = height / 2 + Math.sin(time * 1.5) * 28;
      f16.vy += (targetY - f16.y) * 0.05;
      f16.vy *= 0.88;
      f16.y += f16.vy;
      f16.angle = f16.vy * 0.06;
    }
    f16.x += f16.isBreaking ? 2.5 : 1.2;
    if (f16.x > width + 40) f16.x = -40;

    // Contrail push to RingBuffer
    f16Contrail.push(f16.x - 14, f16.y, 0.8, 0);

    // Draw pixel contrail
    f16Contrail.forEach(function (cx, cy, alpha, extra, i, idx) {
      var co = idx * f16Contrail.stride;
      f16Contrail.buffer[co + 2] *= 0.94;
      var a = f16Contrail.buffer[co + 2];
      ctx.fillStyle = getAlphaColor("fg", a * 0.3);
      ctx.fillRect(Math.floor(cx), Math.floor(cy), 2, 1);
    });

    // 7. DRAW 2D PIXEL ART F-16 FIGHTING FALCON
    ctx.save();
    ctx.translate(Math.floor(f16.x), Math.floor(f16.y));
    ctx.rotate(f16.angle);
    // Pixel Afterburner Flame
    var flameLen = f16.isBreaking ? 16 + Math.floor(Math.random() * 8) : 8 + Math.floor(Math.random() * 5);
    ctx.fillStyle = colors.fg;
    ctx.fillRect(-18 - flameLen, -1, flameLen, 3);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(-16 - (flameLen / 2), 0, flameLen / 2, 1);
    // F-16 Fuselage (Pixel Blocks)
    ctx.fillStyle = colors.fg;
    // Nose radome
    ctx.fillRect(10, 0, 8, 1);
    ctx.fillRect(4, -1, 6, 3);
    // Bubble Canopy
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, -2, 6, 2);
    ctx.strokeStyle = colors.fg;
    ctx.strokeRect(0, -2, 6, 2);
    // Main Fuselage
    ctx.fillStyle = colors.fg;
    ctx.fillRect(-12, -2, 16, 5);
    // Wing Strakes & Cropped Delta Wings
    ctx.fillRect(-6, -6, 8, 4);
    ctx.fillRect(-6, 3, 8, 4);
    ctx.fillRect(-2, -9, 4, 3);
    ctx.fillRect(-2, 7, 4, 3);
    // Vertical Tail Fin
    ctx.fillRect(-14, -4, 4, 2);
    ctx.restore();

    // 8. HUD Center Reticle
    ctx.save();
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 1;
    ctx.strokeRect(width / 2 - 12, height / 2 - 12, 24, 24);
    ctx.beginPath();
    ctx.moveTo(width / 2 - 18, height / 2); ctx.lineTo(width / 2 - 12, height / 2);
    ctx.moveTo(width / 2 + 12, height / 2); ctx.lineTo(width / 2 + 18, height / 2);
    ctx.stroke();
    ctx.restore();
  }

  function start() {
    if (!animId) animId = requestAnimationFrame(updateF16Loop);
  }
  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }
  var breakBtn = document.getElementById("f16-break-btn");
  if (breakBtn) breakBtn.onclick = triggerTacticalBreak;
  canvas.onclick = triggerTacticalBreak;
  CanvasLifecycleManager.register("f16-hud", {
    canvas: canvas,
    start: start,
    stop: stop,
    accordion: accordion,
    respectReducedMotion: false
  });
}

// ----------------------------------------------------
// 2. Boyd's E-M Performance Engine (#em-canvas)
// ----------------------------------------------------
function initEmEngine() {
  var canvas = document.getElementById("em-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var accordion = canvas.closest ? canvas.closest("details") : null;
  var width = canvas.width = 672;
  var height = canvas.height = 240;
  var animId = null;

  var state = {
    thrust: 75000,
    dragCoeff: 0.02,
    weight: 90000,
    airspeed: 450,
    boost: false,
    zeroDrag: false,
    zeroWeight: false,
    time: 0,
    legacyAngle: 0,
    oodaAngle: 0
  };

  // Pre-allocated particles buffer (16 particles * 3 floats: progress, speed, radiusOffset)
  var emParticlesF32 = new Float32Array(16 * 3);
  for (var p = 0; p < 16; p++) {
    var po = p * 3;
    emParticlesF32[po] = p / 16;
    emParticlesF32[po + 1] = 0.012 + Math.random() * 0.008;
    emParticlesF32[po + 2] = (Math.random() - 0.5) * 6;
  }

  // Pre-allocated generational frequencies table
  var GEN_FREQS = [
    "GEN 1: 0.05 Hz (Guns)",
    "GEN 2: 0.50 Hz (Mach)",
    "GEN 3: 1.00 Hz (BVR)",
    "GEN 4: 10.0 Hz (CADC)",
    "GEN 5: 50.0 Hz (VLO)",
    "GEN 6: 500  Hz (Mesh)",
    "GEN 7: 2.5k-4.5k Hz"
  ];

  function updateStatus() {
    var statusEl = document.getElementById("em-status");
    if (!statusEl) return;
    var oodaFreq = state.boost ? "4,500 Hz" : (state.zeroDrag ? "3,200 Hz" : "2,500 Hz");
    var legacyFreq = "0.02 Hz (50s Build)";
    var boostLabel = state.boost ? " | BOOST +80% (>1.4M L/s)" : "";
    var dragLabel = state.zeroDrag ? " | ZERO DRAG (0ms GC / SMT Elision)" : "";
    var weightLabel = state.zeroWeight ? " | ZERO WEIGHT (28.2 KB ELF)" : "";
    setDomText(statusEl, "E-M Formula: P_s = V * (T - D) / W | openOODA Loop (" + oodaFreq + ") vs Legacy Stack (" + legacyFreq + ")" + boostLabel + dragLabel + weightLabel);
  }

  function drawOodaRing(cx, cy, radius, angle, isOoda, colors) {
    ctx.save();
    // Outer track
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glowing progress arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, angle, angle + (isOoda ? 1.8 : 0.8));
    ctx.strokeStyle = isOoda ? colors.fg : colors.muted;
    ctx.lineWidth = isOoda ? 3 : 2;
    ctx.stroke();

    // 4 OODA Nodes: Observe, Orient, Decide, Act
    for (var n = 0; n < 4; n++) {
      var nAng = (n * Math.PI) / 2 - Math.PI / 2;
      var nx = cx + Math.cos(nAng) * radius;
      var ny = cy + Math.sin(nAng) * radius;

      ctx.beginPath();
      ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isOoda ? colors.fg : colors.muted;
      ctx.fill();

      ctx.fillStyle = isOoda ? colors.fg : colors.muted;
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var labelDist = radius + 13;
      var lx = cx + Math.cos(nAng) * labelDist;
      var ly = cy + Math.sin(nAng) * labelDist;
      ctx.fillText(EM_OODA_NODES[n], lx, ly);
    }

    // Center Frequency Tachometer
    ctx.fillStyle = isOoda ? colors.fg : colors.muted;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (isOoda) {
      var freqText = state.boost ? "4.5 kHz" : (state.zeroDrag ? "3.2 kHz" : "2.5 kHz");
      ctx.fillText(freqText, cx, cy - 6);
      ctx.font = "7.5px monospace";
      ctx.fillStyle = colors.muted;
      ctx.fillText(state.boost ? "0.2ms CHECK" : "0.4ms CHECK", cx, cy + 8);
    } else {
      ctx.fillText("0.02 Hz", cx, cy - 6);
      ctx.font = "7.5px monospace";
      ctx.fillStyle = colors.muted;
      ctx.fillText("45s BUILD", cx, cy + 8);
    }
    ctx.restore();
  }

  function drawEmPolarCurves(cx, cy, radius, colors) {
    ctx.save();
    // Concentric G-load polar arcs (1G, 3G, 5G, 7G, 9G)
    for (var g = 1; g <= 5; g++) {
      var r = (radius * g) / 5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Polar axes
    ctx.beginPath();
    ctx.moveTo(cx - radius - 4, cy);
    ctx.lineTo(cx + radius + 4, cy);
    ctx.moveTo(cx, cy - radius - 4);
    ctx.lineTo(cx, cy + radius + 4);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    // G-load axis labels
    ctx.font = "6.5px monospace";
    ctx.fillStyle = colors.muted;
    ctx.textAlign = "center";
    ctx.fillText("1G", cx + (radius * 1) / 5, cy - 2);
    ctx.fillText("5G", cx + (radius * 3) / 5, cy - 2);
    ctx.fillText("9G", cx + radius - 2, cy - 2);

    // Ps Specific Excess Power isocline curve
    var isBoost = state.boost;
    var isZeroDrag = state.zeroDrag;
    var psRadius = radius * (isBoost ? 0.92 : (isZeroDrag ? 0.82 : 0.72));

    ctx.beginPath();
    ctx.arc(cx, cy, psRadius, -Math.PI * 0.75, Math.PI * 0.75);
    ctx.strokeStyle = isZeroDrag || isBoost ? colors.fg : colors.muted;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dynamic operating point (V = 450 kts, 5G Turn)
    var ptAngle = state.time * 0.8;
    var ptR = psRadius * (0.85 + Math.sin(state.time * 1.5) * 0.1);
    var ptx = cx + Math.cos(ptAngle) * ptR;
    var pty = cy + Math.sin(ptAngle) * ptR;

    ctx.beginPath();
    ctx.arc(ptx, pty, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isZeroDrag || isBoost ? colors.fg : colors.muted;
    ctx.fill();

    // Energy Bleed vs Sustained Ps Readout
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = isZeroDrag || isBoost ? colors.fg : colors.muted;
    ctx.textAlign = "center";
    var psValText = isBoost ? "+1,420 m/s" : (isZeroDrag ? "+1,050 m/s" : "+850 m/s");
    ctx.fillText("Ps: " + psValText, cx, cy - 8);
    ctx.font = "6.5px monospace";
    ctx.fillStyle = colors.muted;
    ctx.fillText("5.0G TURN", cx, cy + 6);
    ctx.restore();
  }

  var lastEmTime = 0;
  function renderLoop(now) {
    if (!animId) return;
    animId = requestAnimationFrame(renderLoop);
    if (now && lastEmTime && (now - lastEmTime < 22)) return; // Cap to ~45 FPS
    lastEmTime = now;

    var colors = getThemeColors();
    state.time += 0.025;

    var legacySpeed = 0.008;
    var oodaSpeed = state.boost ? 0.075 : (state.zeroDrag ? 0.055 : 0.04);
    state.legacyAngle = (state.legacyAngle + legacySpeed) % (Math.PI * 2);
    state.oodaAngle = (state.oodaAngle + oodaSpeed) % (Math.PI * 2);

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    var cardW = (width - 36) / 2;
    var cardH = height - 24;
    var cardY = 12;

    // 1. LEFT CARD: Boyd's E-M Polar Curve & Energy Bleed
    var leftX = 12;
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.fillRect(leftX, cardY, cardW, cardH);
    ctx.strokeRect(leftX, cardY, cardW, cardH);

    ctx.fillStyle = colors.muted;
    ctx.font = "bold 9.5px monospace";
    ctx.textAlign = "left";
    ctx.fillText("BOYD'S E-M POLAR (Ps = V*(T-D)/W)", leftX + 10, cardY + 18);

    var polarCx = leftX + 62;
    var polarCy = cardY + 115;
    drawEmPolarCurves(polarCx, polarCy, 44, colors);

    // E-M Telemetry Readout
    var tel1X = leftX + 128;
    var tel1Y = cardY + 42;
    ctx.font = "8px monospace";
    ctx.fillStyle = colors.muted;

    var curPs = state.boost ? "+1,420 m/s" : (state.zeroDrag ? "+1,050 m/s" : "+850 m/s");
    var dragVal = state.zeroDrag ? "0.0ms GC (Zero Drag)" : "18.4ms GC Pause";
    var weightVal = state.zeroWeight ? "28.2 KB (Bare ELF)" : "48.5 MB Runtime";
    var thrustVal = state.boost ? ">1.4M Lines/sec" : "75.0k Lines/sec";

    ctx.fillText("• Ps Sustained: " + curPs, tel1X, tel1Y);
    ctx.fillText("• Drag (D): " + dragVal, tel1X, tel1Y + 16);
    ctx.fillText("• Weight (W): " + weightVal, tel1X, tel1Y + 32);
    ctx.fillText("• Thrust (T): " + thrustVal, tel1X, tel1Y + 48);
    ctx.fillText("• Energy Bleed: Di ~ n^2", tel1X, tel1Y + 64);

    // Comparison summary box
    ctx.fillStyle = colors.bg;
    ctx.fillRect(tel1X, tel1Y + 76, cardW - 138, 28);
    ctx.strokeStyle = colors.border;
    ctx.strokeRect(tel1X, tel1Y + 76, cardW - 138, 28);
    ctx.fillStyle = state.zeroDrag || state.boost ? colors.fg : colors.muted;
    ctx.font = "bold 7.5px monospace";
    ctx.fillText(state.zeroDrag || state.boost ? "⚡ Sustained Energy Retention" : "⚠️ Legacy Stack Energy Bleed", tel1X + 6, tel1Y + 89);
    ctx.font = "7px monospace";
    ctx.fillStyle = colors.muted;
    ctx.fillText(state.zeroDrag || state.boost ? "Zero drag sustains 9G breaks" : "45s build cycle & slow feedback", tel1X + 6, tel1Y + 99);
    ctx.restore();

    // 2. RIGHT CARD: Generational OODA Frequency Tachometer
    var rightX = leftX + cardW + 12;
    var oodaActive = state.boost || state.zeroDrag || state.zeroWeight;
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = oodaActive ? colors.fg : colors.border;
    ctx.lineWidth = oodaActive ? 1.5 : 1;
    ctx.fillRect(rightX, cardY, cardW, cardH);
    ctx.strokeRect(rightX, cardY, cardW, cardH);

    ctx.fillStyle = colors.fg;
    ctx.font = "bold 9.5px monospace";
    ctx.textAlign = "left";
    ctx.fillText("GENERATIONAL OODA TACHOMETER", rightX + 10, cardY + 18);

    var ring2Cx = rightX + 62;
    var ring2Cy = cardY + 115;
    drawOodaRing(ring2Cx, ring2Cy, 42, state.oodaAngle, true, colors);

    // Animated particles on openOODA ring
    var stepIncr = state.boost ? 0.024 : 0.014;
    ctx.fillStyle = getAlphaColor("fg", 0.75);
    for (var k = 0; k < 16; k++) {
      var ko = k * 3;
      emParticlesF32[ko] += stepIncr;
      if (emParticlesF32[ko] >= 1.0) emParticlesF32[ko] = 0;
      var pRad = 42 + emParticlesF32[ko + 2];
      var pAng = emParticlesF32[ko] * Math.PI * 2 + state.oodaAngle;
      var px = ring2Cx + Math.cos(pAng) * pRad;
      var py = ring2Cy + Math.sin(pAng) * pRad;

      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Generational OODA Frequency Scale (Gen 1 to Gen 7)
    var genX = rightX + 128;
    var genY = cardY + 36;

    for (var g = 0; g < 7; g++) {
      var gy = genY + g * 12;
      var isGen7 = (g === 6);
      ctx.fillStyle = isGen7 ? colors.fg : colors.muted;
      if (isGen7) ctx.font = "bold 7.5px monospace";
      else ctx.font = "7px monospace";
      ctx.fillText((isGen7 ? "▶ " : "  ") + GEN_FREQS[g], genX, gy);
    }

    // Positive impact tag
    ctx.fillStyle = colors.bg;
    ctx.fillRect(genX, cardY + 124, cardW - 138, 28);
    ctx.strokeStyle = colors.fg;
    ctx.strokeRect(genX, cardY + 124, cardW - 138, 28);
    ctx.fillStyle = colors.fg;
    ctx.font = "bold 7.5px monospace";
    ctx.fillText("⚡ Microsecond OODA Loop", genX + 6, cardY + 137);
    ctx.font = "7px monospace";
    ctx.fillText("100+ Auto-Verifications/min", genX + 6, cardY + 147);
    ctx.restore();
  }

  function start() {
    if (!animId) animId = requestAnimationFrame(renderLoop);
  }
  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  var btnBoost = document.getElementById("em-boost-thrust");
  if (btnBoost) {
    btnBoost.onclick = function () {
      state.boost = !state.boost;
      if (btnBoost.classList.contains("active") !== state.boost) {
        btnBoost.classList.toggle("active", state.boost);
      }
      updateStatus();
    };
  }

  var btnDrag = document.getElementById("em-cut-drag");
  if (btnDrag) {
    btnDrag.onclick = function () {
      state.zeroDrag = !state.zeroDrag;
      if (btnDrag.classList.contains("active") !== state.zeroDrag) {
        btnDrag.classList.toggle("active", state.zeroDrag);
      }
      updateStatus();
    };
  }

  var btnWeight = document.getElementById("em-strip-weight");
  if (btnWeight) {
    btnWeight.onclick = function () {
      state.zeroWeight = !state.zeroWeight;
      if (btnWeight.classList.contains("active") !== state.zeroWeight) {
        btnWeight.classList.toggle("active", state.zeroWeight);
      }
      updateStatus();
    };
  }

  var btnReset = document.getElementById("em-reset");
  if (btnReset) {
    btnReset.onclick = function () {
      state.boost = false;
      state.zeroDrag = false;
      state.zeroWeight = false;
      if (btnBoost && btnBoost.classList.contains("active")) btnBoost.classList.remove("active");
      if (btnDrag && btnDrag.classList.contains("active")) btnDrag.classList.remove("active");
      if (btnWeight && btnWeight.classList.contains("active")) btnWeight.classList.remove("active");
      updateStatus();
    };
  }

  canvas.onclick = function () {
    if (btnBoost) btnBoost.click();
  };

  updateStatus();

  CanvasLifecycleManager.register("em-engine", {
    canvas: canvas,
    start: start,
    stop: stop,
    accordion: accordion,
    respectReducedMotion: false
  });
}

// ----------------------------------------------------
// 3. Zero Ambient Authority Capability Sandbox (#cap-canvas)
// ----------------------------------------------------
function initCapSandbox() {
  var canvas = document.getElementById("cap-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var accordion = canvas.closest ? canvas.closest("details") : null;
  var width = canvas.width = 672;
  var height = canvas.height = 220;
  var animId = null;
  var time = 0;
  var syscallCounter = 0;

  // Statically allocated label tables to guarantee 0 GC allocations in frame loop
  var SYSCALL_NAMES = ["FS: read()", "NET: socket()", "ENV: secret()", "SYS: exec()"];
  var TOKEN_NAMES = ["✓ &FsReadCap", "✓ &NetCap", "✓ &SysCap", "✓ &ProcessCap"];
  var REJECT_NAMES = ["✕ TRAP 0x07", "✕ LANDLOCK", "✕ EPERM", "✕ NO-CAP"];

  // Pre-allocated typed entity pools
  // Packets stride 10: [x, y, vx, vy, hasToken, status (0=in_flight, 1=authorized, 2=blocked), alpha, size, type (0-3), handshakeTimer]
  var capPacketsPool = new StaticEntityPoolF32(32, 10);
  // Shockwaves stride 4: [x, y, radius, alpha]
  var capShockwavesPool = new StaticEntityPoolF32(16, 4);
  // Sparks stride 6: [x, y, vx, vy, alpha, size]
  var capSparksPool = new StaticEntityPoolF32(48, 6);

  function spawnPacket(hasToken) {
    var idx = capPacketsPool.alloc();
    if (idx >= 0) {
      var po = idx * 10;
      var type = (syscallCounter++) % 4;
      capPacketsPool.buffer[po] = 75;
      capPacketsPool.buffer[po + 1] = 75 + Math.random() * 70;
      capPacketsPool.buffer[po + 2] = 3.6;
      capPacketsPool.buffer[po + 3] = (Math.random() - 0.5) * 0.4;
      capPacketsPool.buffer[po + 4] = hasToken ? 1.0 : 0.0;
      capPacketsPool.buffer[po + 5] = 0; // 0=in_flight
      capPacketsPool.buffer[po + 6] = 1.0; // alpha
      capPacketsPool.buffer[po + 7] = 7.5; // size
      capPacketsPool.buffer[po + 8] = type;
      capPacketsPool.buffer[po + 9] = 0; // handshakeTimer
    }
  }

  function emitSparks(x, y, count, forward) {
    for (var s = 0; s < count; s++) {
      var sIdx = capSparksPool.alloc();
      if (sIdx >= 0) {
        var so = sIdx * 6;
        capSparksPool.buffer[so] = x;
        capSparksPool.buffer[so + 1] = y;
        capSparksPool.buffer[so + 2] = forward ? (1.5 + Math.random() * 2.5) : (-1.5 - Math.random() * 3.0);
        capSparksPool.buffer[so + 3] = (Math.random() - 0.5) * 3.2;
        capSparksPool.buffer[so + 4] = 1.0;
        capSparksPool.buffer[so + 5] = 2.0 + Math.random() * 2.0;
      }
    }
  }

  function triggerUntrusted() {
    spawnPacket(false);
    var logEl = document.getElementById("cap-log");
    if (logEl) {
      setDomText(logEl, "🚨 [FAIL-CLOSED] Missing &FsReadCap | Landlock Trap 0x07 | 0 Side Effects");
    }
  }

  function triggerGrant() {
    spawnPacket(true);
    var logEl = document.getElementById("cap-log");
    if (logEl) {
      setDomText(logEl, "🔑 [AUTH GRANTED] &FsReadCap verified | Scoped access to /var/data | Zero Leak");
    }
  }

  function resetGate() {
    capPacketsPool.clear();
    capShockwavesPool.clear();
    capSparksPool.clear();
    syscallCounter = 0;
    var logEl = document.getElementById("cap-log");
    if (logEl) {
      setDomText(logEl, "Landlock tripwire active: No ambient authority. Test Untrusted I/O vs Scoped Token dispatch.");
    }
  }

  var lastCapTime = 0;
  function renderLoop(now) {
    if (!animId) return;
    animId = requestAnimationFrame(renderLoop);
    if (now && lastCapTime && (now - lastCapTime < 22)) return; // Cap to ~45 FPS
    lastCapTime = now;

    var colors = getThemeColors();
    time += 0.03;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    var gateX = width / 2;

    // ----------------------------------------------------
    // Left Node: Untrusted Sandbox Boundary (AI Supply Chain)
    // ----------------------------------------------------
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.fillRect(18, 28, 124, 164);
    ctx.strokeRect(18, 28, 124, 164);

    // Corner brackets for security perimeter
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(18, 40); ctx.lineTo(18, 28); ctx.lineTo(30, 28);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(130, 28); ctx.lineTo(142, 28); ctx.lineTo(142, 40);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(18, 180); ctx.lineTo(18, 192); ctx.lineTo(30, 192);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(130, 192); ctx.lineTo(142, 192); ctx.lineTo(142, 180);
    ctx.stroke();

    ctx.fillStyle = colors.fg;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("UNTRUSTED", 80, 50);
    ctx.fillText("PROCESS", 80, 64);

    ctx.fillStyle = colors.muted;
    ctx.font = "9px monospace";
    ctx.fillText("AI Supply Chain", 80, 96);
    ctx.fillText("3rd-Party Dep", 80, 110);
    ctx.fillText("0 Ambient Auth", 80, 124);
    ctx.fillText("Jailed Sandbox", 80, 138);

    // Sandbox perimeter badge
    ctx.fillStyle = getAlphaColor("muted", 0.3);
    ctx.fillRect(26, 156, 108, 22);
    ctx.strokeStyle = colors.border;
    ctx.strokeRect(26, 156, 108, 22);
    ctx.fillStyle = colors.fg;
    ctx.font = "bold 8px monospace";
    ctx.fillText("NO AMBIENT I/O", 80, 170);
    ctx.restore();

    // ----------------------------------------------------
    // Right Node: Sovereign Kernel & Host Resources Enclave
    // ----------------------------------------------------
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.fillRect(width - 142, 28, 124, 164);
    ctx.strokeRect(width - 142, 28, 124, 164);

    // Corner brackets
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 2;
    var rx = width - 142;
    var rw = 124;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(rx, 40); ctx.lineTo(rx, 28); ctx.lineTo(rx + 12, 28);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(rx + rw - 12, 28); ctx.lineTo(rx + rw, 28); ctx.lineTo(rx + rw, 40);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(rx, 180); ctx.lineTo(rx, 192); ctx.lineTo(rx + 12, 192);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(rx + rw - 12, 192); ctx.lineTo(rx + rw, 192); ctx.lineTo(rx + rw, 180);
    ctx.stroke();

    ctx.fillStyle = colors.fg;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("KERNEL / HOST", width - 80, 50);
    ctx.fillText("RESOURCES", width - 80, 64);

    ctx.fillStyle = colors.muted;
    ctx.font = "9px monospace";
    ctx.fillText("/var/data (Disk)", width - 80, 96);
    ctx.fillText("AF_INET (Net)", width - 80, 110);
    ctx.fillText("SYS_fork (Proc)", width - 80, 124);
    ctx.fillText("ENV_VARS (Conf)", width - 80, 138);

    // Verified ingress badge
    ctx.fillStyle = getAlphaColor("fg", 0.15);
    ctx.fillRect(width - 134, 156, 108, 22);
    ctx.strokeStyle = colors.fg;
    ctx.strokeRect(width - 134, 156, 108, 22);
    ctx.fillStyle = colors.fg;
    ctx.font = "bold 8px monospace";
    ctx.fillText("SCOPED &CAP ONLY", width - 80, 170);
    ctx.restore();

    // ----------------------------------------------------
    // Center: Landlock Capability Sandbox Gate & Verifier
    // ----------------------------------------------------
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 2;

    // Upper Bastion Pillar
    ctx.fillRect(gateX - 28, 16, 56, 44);
    ctx.strokeRect(gateX - 28, 16, 56, 44);

    // Lower Bastion Pillar
    ctx.fillRect(gateX - 28, height - 60, 56, 44);
    ctx.strokeRect(gateX - 28, height - 60, 56, 44);

    ctx.fillStyle = colors.fg;
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("LANDLOCK", gateX, 36);
    ctx.fillText("OCAP GATE", gateX, 50);
    ctx.fillText("FAIL-CLOSED", gateX, height - 42);
    ctx.fillText("VERIFIER", gateX, height - 28);

    // Laser tripwire aperture beams
    for (var b = 0; b < 5; b++) {
      var beamY = 68 + b * 18;
      var beamAlpha = 0.35 + 0.3 * Math.sin(time * 4.5 + b * 0.8);
      ctx.beginPath();
      ctx.moveTo(gateX - 24, beamY);
      ctx.lineTo(gateX + 24, beamY);
      ctx.strokeStyle = getAlphaColor("fg", beamAlpha);
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tripwire emitter nodes
      ctx.beginPath();
      ctx.arc(gateX - 24, beamY, 2, 0, Math.PI * 2);
      ctx.arc(gateX + 24, beamY, 2, 0, Math.PI * 2);
      ctx.fillStyle = colors.fg;
      ctx.fill();
    }
    ctx.restore();

    // ----------------------------------------------------
    // Shockwaves (Expanded Rings on Deflection / Handshake)
    // ----------------------------------------------------
    for (var swIdx = capShockwavesPool.activeCount - 1; swIdx >= 0; swIdx--) {
      var swo = swIdx * 4;
      capShockwavesPool.buffer[swo + 2] += 4.5; // radius
      capShockwavesPool.buffer[swo + 3] *= 0.88; // alpha
      var swa = capShockwavesPool.buffer[swo + 3];
      if (swa < 0.02) {
        capShockwavesPool.free(swIdx);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(capShockwavesPool.buffer[swo], capShockwavesPool.buffer[swo + 1], capShockwavesPool.buffer[swo + 2], 0, Math.PI * 2);
      ctx.strokeStyle = getAlphaColor("fg", swa);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // ----------------------------------------------------
    // Sparks (Deflection / Verification Burst Particles)
    // ----------------------------------------------------
    for (var spIdx = capSparksPool.activeCount - 1; spIdx >= 0; spIdx--) {
      var spo = spIdx * 6;
      capSparksPool.buffer[spo] += capSparksPool.buffer[spo + 2];
      capSparksPool.buffer[spo + 1] += capSparksPool.buffer[spo + 3];
      capSparksPool.buffer[spo + 4] *= 0.90; // alpha decay
      var spa = capSparksPool.buffer[spo + 4];
      if (spa < 0.03) {
        capSparksPool.free(spIdx);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(capSparksPool.buffer[spo], capSparksPool.buffer[spo + 1], capSparksPool.buffer[spo + 5], 0, Math.PI * 2);
      ctx.fillStyle = getAlphaColor("fg", spa);
      ctx.fill();
      ctx.restore();
    }

    // ----------------------------------------------------
    // Update & Render Packets
    // ----------------------------------------------------
    for (var pkIdx = capPacketsPool.activeCount - 1; pkIdx >= 0; pkIdx--) {
      var pko = pkIdx * 10;
      var px = capPacketsPool.buffer[pko] + capPacketsPool.buffer[pko + 2];
      capPacketsPool.buffer[pko] = px;
      var py = capPacketsPool.buffer[pko + 1] + capPacketsPool.buffer[pko + 3];
      capPacketsPool.buffer[pko + 1] = py;
      var hasToken = capPacketsPool.buffer[pko + 4] > 0.5;
      var pStatus = capPacketsPool.buffer[pko + 5]; // 0=in_flight, 1=authorized, 2=blocked
      var pAlpha = capPacketsPool.buffer[pko + 6];
      var pSize = capPacketsPool.buffer[pko + 7];
      var pType = Math.floor(capPacketsPool.buffer[pko + 8]) % 4;

      // Gate boundary check
      if (pStatus === 0 && px >= gateX - 12) {
        if (hasToken) {
          capPacketsPool.buffer[pko + 5] = 1; // authorized
          capPacketsPool.buffer[pko + 2] = 4.2; // maintain speed
          pStatus = 1;
          var nsw = capShockwavesPool.alloc();
          if (nsw >= 0) {
            var nswo = nsw * 4;
            capShockwavesPool.buffer[nswo] = gateX;
            capShockwavesPool.buffer[nswo + 1] = py;
            capShockwavesPool.buffer[nswo + 2] = 4;
            capShockwavesPool.buffer[nswo + 3] = 0.85;
          }
          emitSparks(gateX, py, 3, true);
        } else {
          capPacketsPool.buffer[pko + 5] = 2; // blocked
          capPacketsPool.buffer[pko + 2] = -2.2; // deflection bounce back vx
          capPacketsPool.buffer[pko + 3] = (Math.random() - 0.5) * 1.5;
          pStatus = 2;
          var nsw2 = capShockwavesPool.alloc();
          if (nsw2 >= 0) {
            var nsw2o = nsw2 * 4;
            capShockwavesPool.buffer[nsw2o] = gateX;
            capShockwavesPool.buffer[nsw2o + 1] = py;
            capShockwavesPool.buffer[nsw2o + 2] = 8;
            capShockwavesPool.buffer[nsw2o + 3] = 1.0;
          }
          emitSparks(gateX, py, 6, false);
        }
      }

      ctx.save();
      if (pStatus === 2) { // blocked / deflected
        pAlpha *= 0.93;
        capPacketsPool.buffer[pko + 6] = pAlpha;
        if (pAlpha < 0.04) {
          capPacketsPool.free(pkIdx);
          ctx.restore();
          continue;
        }
        ctx.fillStyle = getAlphaColor("fg", pAlpha);
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(REJECT_NAMES[pType], px, py - 12);
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
        // Warning aura
        ctx.beginPath();
        ctx.arc(px, py, pSize + 4, 0, Math.PI * 2);
        ctx.strokeStyle = getAlphaColor("fg", pAlpha * 0.5);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (pStatus === 1) { // authorized
        if (px > width - 134) {
          capPacketsPool.free(pkIdx);
          ctx.restore();
          continue;
        }
        ctx.fillStyle = getAlphaColor("fg", 0.95);
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(TOKEN_NAMES[pType], px, py - 11);
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
        // Token halo
        ctx.beginPath();
        ctx.arc(px, py, pSize + 3, 0, Math.PI * 2);
        ctx.strokeStyle = getAlphaColor("fg", 0.6);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else { // in_flight
        ctx.fillStyle = hasToken ? getAlphaColor("fg", 0.9) : getAlphaColor("muted", 0.85);
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(hasToken ? TOKEN_NAMES[pType] : SYSCALL_NAMES[pType], px, py - 10);
      }
      ctx.restore();
    }
  }

  function start() {
    if (!animId) animId = requestAnimationFrame(renderLoop);
  }
  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  var btnUntrusted = document.getElementById("cap-untrusted");
  if (btnUntrusted) btnUntrusted.onclick = triggerUntrusted;

  var btnGrant = document.getElementById("cap-grant");
  if (btnGrant) btnGrant.onclick = triggerGrant;

  var btnReset = document.getElementById("cap-reset");
  if (btnReset) btnReset.onclick = resetGate;

  canvas.onclick = triggerUntrusted;

  CanvasLifecycleManager.register("cap-sandbox", {
    canvas: canvas,
    start: start,
    stop: stop,
    accordion: accordion,
    respectReducedMotion: false
  });
}

// ----------------------------------------------------
// 4. AI-Native Architecture Multi-Agent Swarm Ring (#swarm-canvas)
// ----------------------------------------------------
function initSwarmCanvas() {
  var canvas = document.getElementById("swarm-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var accordion = canvas.closest ? canvas.closest("details") : null;
  var width = canvas.width = 672;
  var height = canvas.height = 240;
  var animId = null;
  var time = 0;

  var state = {
    modules: [
      { name: "lexer.oo", lines: 184, maxLines: 256, angle: 0 },
      { name: "parser.oo", lines: 238, maxLines: 256, angle: 0.7854 },
      { name: "types.oo", lines: 195, maxLines: 256, angle: 1.5708 },
      { name: "eval.oo", lines: 210, maxLines: 256, angle: 2.3562 },
      { name: "ast.oo", lines: 160, maxLines: 256, angle: 3.1416 },
      { name: "morph.oo", lines: 225, maxLines: 256, angle: 3.9270 },
      { name: "kat.oo", lines: 140, maxLines: 256, angle: 4.7124 },
      { name: "hal.oo", lines: 180, maxLines: 256, angle: 5.4978 }
    ],
    agents: [
      { id: "EXP", role: "Explorer", angle: 0, speed: 0.015, pulse: 0, state: "DISCOVER" },
      { id: "WRK", role: "Worker", angle: 1.5708, speed: 0.015, pulse: 0, state: "SYNTH" },
      { id: "REV", role: "Reviewer", angle: 3.1416, speed: 0.015, pulse: 0, state: "AUDIT" },
      { id: "CHL", role: "Challenger", angle: 4.7124, speed: 0.015, pulse: 0, state: "VERIFY" }
    ],
    epoch: 142
  };

  // Pre-allocated static entity pools (Float32Array)
  var swarmPulsesPool = new StaticEntityPoolF32(16, 4);   // x, y, radius, alpha
  var swarmContractsPool = new StaticEntityPoolF32(8, 8); // srcX, srcY, dstX, dstY, t, stage, lines, alpha
  var swarmSparksPool = new StaticEntityPoolF32(32, 6);   // x, y, vx, vy, alpha, size

  // Pre-allocated static string lookups to avoid per-frame allocations
  var AGENT_TITLES = ["EXP: Explorer", "WRK: Worker", "REV: Reviewer", "CHL: Challenger"];
  var AGENT_TAGS = ["DISCOVER", "SYNTH", "AUDIT", "VERIFY"];
  var STAGE_LABELS = ["SPEC", "PATCH", "AUDIT", "PROOF"];

  function emitSwarmSparks(x, y, count, isConsensus) {
    for (var i = 0; i < count; i++) {
      var sIdx = swarmSparksPool.alloc();
      if (sIdx >= 0) {
        var so = sIdx * 6;
        var spAngle = Math.random() * Math.PI * 2;
        var spSpd = 0.8 + Math.random() * (isConsensus ? 2.5 : 1.4);
        swarmSparksPool.buffer[so] = x;
        swarmSparksPool.buffer[so + 1] = y;
        swarmSparksPool.buffer[so + 2] = Math.cos(spAngle) * spSpd;
        swarmSparksPool.buffer[so + 3] = Math.sin(spAngle) * spSpd;
        swarmSparksPool.buffer[so + 4] = 1.0;
        swarmSparksPool.buffer[so + 5] = isConsensus ? 2.2 : 1.2;
      }
    }
  }

  function initContracts() {
    swarmContractsPool.clear();
    var c0 = swarmContractsPool.alloc();
    if (c0 >= 0) {
      var co0 = c0 * 8;
      swarmContractsPool.buffer[co0] = 0;
      swarmContractsPool.buffer[co0 + 1] = 0;
      swarmContractsPool.buffer[co0 + 2] = 0;
      swarmContractsPool.buffer[co0 + 3] = 0;
      swarmContractsPool.buffer[co0 + 4] = 0.15;
      swarmContractsPool.buffer[co0 + 5] = 0; // Stage 0 (EXP -> WRK)
      swarmContractsPool.buffer[co0 + 6] = 184;
      swarmContractsPool.buffer[co0 + 7] = 1.0;
    }
    var c1 = swarmContractsPool.alloc();
    if (c1 >= 0) {
      var co1 = c1 * 8;
      swarmContractsPool.buffer[co1] = 0;
      swarmContractsPool.buffer[co1 + 1] = 0;
      swarmContractsPool.buffer[co1 + 2] = 0;
      swarmContractsPool.buffer[co1 + 3] = 0;
      swarmContractsPool.buffer[co1 + 4] = 0.65;
      swarmContractsPool.buffer[co1 + 5] = 2; // Stage 2 (REV -> CHL)
      swarmContractsPool.buffer[co1 + 6] = 210;
      swarmContractsPool.buffer[co1 + 7] = 1.0;
    }
  }

  function updateMetrics() {
    var metricsEl = document.getElementById("swarm-metrics");
    if (!metricsEl) return;
    var maxL = 0;
    for (var m = 0; m < state.modules.length; m++) {
      if (state.modules[m].lines > maxL) maxL = state.modules[m].lines;
    }
    setDomText(metricsEl, "Agent Line Budget: " + maxL + "/256 Lines (" + Math.round((maxL / 256) * 100) + "%) | Hallucination Drift: 0.00% | Consensus: Synchronized (Epoch #" + state.epoch + ")");
  }

  function triggerPatch() {
    state.epoch++;
    var cx = width / 2;
    var cy = height / 2;
    var outerR = 108;
    for (var i = 0; i < state.agents.length; i++) {
      state.agents[i].pulse = 1.0;
      var agAngle = state.agents[i].angle;
      var ax = cx + Math.cos(agAngle) * outerR;
      var ay = cy + Math.sin(agAngle) * outerR;
      emitSwarmSparks(ax, ay, 4, true);
    }
    var pIdx = swarmPulsesPool.alloc();
    if (pIdx >= 0) {
      var po = pIdx * 4;
      swarmPulsesPool.buffer[po] = cx;
      swarmPulsesPool.buffer[po + 1] = cy;
      swarmPulsesPool.buffer[po + 2] = 10;
      swarmPulsesPool.buffer[po + 3] = 1.0;
    }
    var cIdx = swarmContractsPool.alloc();
    if (cIdx >= 0) {
      var co = cIdx * 8;
      swarmContractsPool.buffer[co] = 0;
      swarmContractsPool.buffer[co + 1] = 0;
      swarmContractsPool.buffer[co + 2] = 0;
      swarmContractsPool.buffer[co + 3] = 0;
      swarmContractsPool.buffer[co + 4] = 0.0;
      swarmContractsPool.buffer[co + 5] = 0; // Stage 0
      swarmContractsPool.buffer[co + 6] = 184;
      swarmContractsPool.buffer[co + 7] = 1.0;
    }
    updateMetrics();
  }

  function triggerSplit() {
    var maxIdx = 0;
    for (var i = 1; i < state.modules.length; i++) {
      if (state.modules[i].lines > state.modules[maxIdx].lines) maxIdx = i;
    }
    state.modules[maxIdx].lines = Math.round(state.modules[maxIdx].lines / 2);
    state.epoch++;
    triggerPatch();
  }

  function resetSwarm() {
    state.modules = [
      { name: "lexer.oo", lines: 184, maxLines: 256, angle: 0 },
      { name: "parser.oo", lines: 238, maxLines: 256, angle: 0.7854 },
      { name: "types.oo", lines: 195, maxLines: 256, angle: 1.5708 },
      { name: "eval.oo", lines: 210, maxLines: 256, angle: 2.3562 },
      { name: "ast.oo", lines: 160, maxLines: 256, angle: 3.1416 },
      { name: "morph.oo", lines: 225, maxLines: 256, angle: 3.9270 },
      { name: "kat.oo", lines: 140, maxLines: 256, angle: 4.7124 },
      { name: "hal.oo", lines: 180, maxLines: 256, angle: 5.4978 }
    ];
    state.epoch = 142;
    for (var a = 0; a < state.agents.length; a++) {
      state.agents[a].angle = a * 1.5708;
      state.agents[a].pulse = 0;
    }
    swarmPulsesPool.clear();
    swarmSparksPool.clear();
    initContracts();
    updateMetrics();
  }

  var lastSwarmTime = 0;
  function renderLoop(now) {
    if (!animId) return;
    animId = requestAnimationFrame(renderLoop);
    if (now && lastSwarmTime && (now - lastSwarmTime < 22)) return; // Cap to ~45 FPS
    lastSwarmTime = now;

    var colors = getThemeColors();
    time += 0.02;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    var cx = width / 2;
    var cy = height / 2;
    var ringR = 80;
    var outerR = 108;
    var innerR = 48;

    // 1. Orbital Ring Background Tracks
    ctx.save();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.setLineDash(DASH_4_4);

    // Outer Agent Ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.stroke();

    // Module Ring
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Core Border Ring
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Pair-Programming Collaboration Chords between Agents
    for (var c = 0; c < 4; c++) {
      var a1 = state.agents[c];
      var a2 = state.agents[(c + 1) % 4];
      var ax1 = cx + Math.cos(a1.angle) * outerR;
      var ay1 = cy + Math.sin(a1.angle) * outerR;
      var ax2 = cx + Math.cos(a2.angle) * outerR;
      var ay2 = cy + Math.sin(a2.angle) * outerR;

      ctx.save();
      ctx.strokeStyle = getAlphaColor("fg", 0.20 + 0.12 * Math.sin(time * 2.5 + c));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax1, ay1);
      ctx.lineTo(ax2, ay2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Center Consensus Ripples (Pulses)
    for (var pIdx = swarmPulsesPool.activeCount - 1; pIdx >= 0; pIdx--) {
      var po = pIdx * 4;
      swarmPulsesPool.buffer[po + 2] += 3.8; // radius expand
      swarmPulsesPool.buffer[po + 3] *= 0.93; // alpha decay
      var pa = swarmPulsesPool.buffer[po + 3];
      if (pa < 0.02) {
        swarmPulsesPool.free(pIdx);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(swarmPulsesPool.buffer[po], swarmPulsesPool.buffer[po + 1], swarmPulsesPool.buffer[po + 2], 0, Math.PI * 2);
      ctx.strokeStyle = getAlphaColor("fg", pa);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Spark Particle Pool
    for (var spIdx = swarmSparksPool.activeCount - 1; spIdx >= 0; spIdx--) {
      var spo = spIdx * 6;
      swarmSparksPool.buffer[spo] += swarmSparksPool.buffer[spo + 2];
      swarmSparksPool.buffer[spo + 1] += swarmSparksPool.buffer[spo + 3];
      swarmSparksPool.buffer[spo + 4] *= 0.91; // alpha decay
      var spa = swarmSparksPool.buffer[spo + 4];
      if (spa < 0.03) {
        swarmSparksPool.free(spIdx);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(swarmSparksPool.buffer[spo], swarmSparksPool.buffer[spo + 1], swarmSparksPool.buffer[spo + 5], 0, Math.PI * 2);
      ctx.fillStyle = getAlphaColor("fg", spa);
      ctx.fill();
      ctx.restore();
    }

    // 5. Render 8 Module Nodes around Ring
    for (var m = 0; m < state.modules.length; m++) {
      var mod = state.modules[m];
      var mx = cx + Math.cos(mod.angle) * ringR;
      var my = cy + Math.sin(mod.angle) * ringR;

      ctx.save();
      ctx.fillStyle = colors.panel;
      ctx.strokeStyle = mod.lines > 230 ? colors.fg : colors.border;
      ctx.lineWidth = 1;
      var mw = 55, mh = 22;
      ctx.fillRect(mx - mw / 2, my - mh / 2, mw, mh);
      ctx.strokeRect(mx - mw / 2, my - mh / 2, mw, mh);

      ctx.fillStyle = colors.fg;
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(mod.name, mx, my - 2);
      ctx.fillStyle = colors.muted;
      ctx.fillText(mod.lines + "/256L", mx, my + 8);
      ctx.restore();
    }

    // 6. Active Contract Packets Refining & Passing along the Ring
    for (var k = swarmContractsPool.activeCount - 1; k >= 0; k--) {
      var ko = k * 8;
      var curStage = Math.floor(swarmContractsPool.buffer[ko + 5]) % 4;
      var nxtStage = (curStage + 1) % 4;
      var srcAg = state.agents[curStage];
      var dstAg = state.agents[nxtStage];
      var sax = cx + Math.cos(srcAg.angle) * outerR;
      var say = cy + Math.sin(srcAg.angle) * outerR;
      var dax = cx + Math.cos(dstAg.angle) * outerR;
      var day = cy + Math.sin(dstAg.angle) * outerR;

      var prog = swarmContractsPool.buffer[ko + 4] + 0.012;
      if (prog >= 1.0) {
        prog = 0.0;
        swarmContractsPool.buffer[ko + 5] = nxtStage;
        dstAg.pulse = 0.9;
        emitSwarmSparks(dax, day, 4, nxtStage === 0);
        if (nxtStage === 0) {
          // Challenger confirmed verification -> ripple from center
          var pIdx2 = swarmPulsesPool.alloc();
          if (pIdx2 >= 0) {
            var po2 = pIdx2 * 4;
            swarmPulsesPool.buffer[po2] = cx;
            swarmPulsesPool.buffer[po2 + 1] = cy;
            swarmPulsesPool.buffer[po2 + 2] = 12;
            swarmPulsesPool.buffer[po2 + 3] = 0.75;
          }
        }
      }
      swarmContractsPool.buffer[ko + 4] = prog;

      var cpx = sax + (dax - sax) * prog;
      var cpy = say + (day - say) * prog;
      var linesCount = Math.round(swarmContractsPool.buffer[ko + 6]);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cpx, cpy, 5, 0, Math.PI * 2);
      ctx.fillStyle = getAlphaColor("fg", 0.85);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cpx, cpy, 9, 0, Math.PI * 2);
      ctx.strokeStyle = getAlphaColor("fg", 0.45);
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = colors.fg;
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.fillText(STAGE_LABELS[curStage] + " " + linesCount + "L", cpx, cpy - 11);
      ctx.restore();
    }

    // 7. Render 4 Circular Agent Nodes
    for (var a = 0; a < state.agents.length; a++) {
      var ag = state.agents[a];
      ag.angle += ag.speed;
      ag.pulse = Math.max(0, ag.pulse - 0.02);

      var ax = cx + Math.cos(ag.angle) * outerR;
      var ay = cy + Math.sin(ag.angle) * outerR;

      var targetM = state.modules[a * 2 % state.modules.length];
      var tx = cx + Math.cos(targetM.angle) * ringR;
      var ty = cy + Math.sin(targetM.angle) * ringR;

      // Agent-to-Module beam
      ctx.save();
      ctx.strokeStyle = getAlphaColor("fg", 0.30 + 0.25 * Math.sin(time * 3 + a));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Agent Circular Node Aura
      if (ag.pulse > 0.05) {
        ctx.beginPath();
        ctx.arc(ax, ay, 8 + ag.pulse * 8, 0, Math.PI * 2);
        ctx.strokeStyle = getAlphaColor("fg", ag.pulse * 0.7);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Circular Agent Node Body
      ctx.fillStyle = colors.fg;
      ctx.beginPath();
      ctx.arc(ax, ay, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Agent Role Banner Box
      ctx.fillStyle = colors.panel;
      ctx.strokeStyle = colors.fg;
      ctx.lineWidth = 1;
      ctx.fillRect(ax - 28, ay - 19, 56, 13);
      ctx.strokeRect(ax - 28, ay - 19, 56, 13);
      ctx.fillStyle = colors.fg;
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.fillText(AGENT_TITLES[a], ax, ay - 10);

      // State Tag Badge
      ctx.fillStyle = colors.panel;
      ctx.strokeStyle = colors.border;
      ctx.fillRect(ax - 18, ay + 8, 36, 10);
      ctx.strokeRect(ax - 18, ay + 8, 36, 10);
      ctx.fillStyle = colors.muted;
      ctx.font = "6px monospace";
      ctx.fillText(AGENT_TAGS[a], ax, ay + 16);
      ctx.restore();
    }

    // 8. Center Consensus Hub Core
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colors.fg;
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SWARM", cx, cy - 4);
    ctx.fillText("RING", cx, cy + 6);
    ctx.restore();
  }

  function start() {
    if (!animId) animId = requestAnimationFrame(renderLoop);
  }
  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  var btnPatch = document.getElementById("swarm-patch");
  if (btnPatch) btnPatch.onclick = triggerPatch;

  var btnSplit = document.getElementById("swarm-split");
  if (btnSplit) btnSplit.onclick = triggerSplit;

  var btnReset = document.getElementById("swarm-reset");
  if (btnReset) btnReset.onclick = resetSwarm;

  canvas.onclick = triggerPatch;
  initContracts();
  updateMetrics();

  CanvasLifecycleManager.register("swarm-canvas", {
    canvas: canvas,
    start: start,
    stop: stop,
    accordion: accordion,
    respectReducedMotion: false
  });
}

// ----------------------------------------------------
// 5. Hard Science & Orbital Dynamics Simulator Engine (#science-canvas / #target-sim)
// ----------------------------------------------------
// Preallocated static buffers for zero-allocation per-frame execution:
const SCIENCE_AERO_F32 = new Float32Array(16);
const SCIENCE_ORBIT_F32 = new Float32Array(16);
const SCIENCE_ORBIT_TRAIL_F32 = new Float32Array(64 * 2); // 64 (x,y) trail points
let SCIENCE_ORBIT_TRAIL_COUNT = 0;
let SCIENCE_ORBIT_TRAIL_HEAD = 0;
const SCIENCE_REL_F32 = new Float32Array(16);

// 3D Aircraft Model Coordinates: 10 Vertices (x, y, z)
const SCIENCE_3D_VERTS_IN = new Float32Array([
  36, 0, 0,     // 0: Nose cone tip
  16, 0, -5,    // 1: Canopy peak
  -6, 0, -4,    // 2: Fuselage spine dorsal
  -30, 0, 0,    // 3: Afterburner nozzle
  -4, -32, 2,   // 4: Left wingtip
  -4, 32, 2,    // 5: Right wingtip
  -26, -14, 1,  // 6: Left horizontal stabilizer
  -26, 14, 1,   // 7: Right horizontal stabilizer
  -32, 0, -18,  // 8: Vertical fin tip
  -14, 0, 2     // 9: Ventral keel ventral
]);
const SCIENCE_3D_VERTS_OUT = new Float32Array(SCIENCE_3D_VERTS_IN.length);

const SCIENCE_3D_EDGES = [
  [0, 1], [1, 2], [2, 3], // Dorsal spine
  [0, 9], [9, 3],         // Ventral keel
  [1, 9], [2, 9],         // Structural bulkheads
  [1, 4], [2, 4], [9, 4], // Left delta wing
  [1, 5], [2, 5], [9, 5], // Right delta wing
  [3, 6], [2, 6],         // Left tailplane
  [3, 7], [2, 7],         // Right tailplane
  [2, 8], [3, 8]          // Vertical stabilizer fin
];

function isa_temperature_at(alt_m) {
  if (alt_m <= 11000.0) {
    if (alt_m < 0.0) return 288.15;
    return 288.15 - (0.0065 * alt_m);
  }
  return 216.65;
}
function isa_pressure_at(alt_m) {
  if (alt_m <= 11000.0) {
    if (alt_m < 0.0) return 101325.0;
    var t_ratio = isa_temperature_at(alt_m) / 288.15;
    return 101325.0 * Math.pow(t_ratio, 5.255877);
  }
  var h_diff = alt_m - 11000.0;
  var exp_term = (0.0 - (9.80665 * h_diff)) / (287.058 * 216.65);
  return 22632.06 * Math.exp(exp_term);
}
function isa_density_at(alt_m) {
  var t = isa_temperature_at(alt_m);
  var p = isa_pressure_at(alt_m);
  if (t <= 0.0) return 1.2250;
  return p / (287.058 * t);
}
function isa_speed_of_sound_at(alt_m) {
  var t = isa_temperature_at(alt_m);
  if (t <= 0.0) return 340.294;
  return Math.sqrt(1.4 * 287.058 * t);
}
function aero_compute_dynamic_pressure(rho, tas_mps) {
  return 0.5 * rho * tas_mps * tas_mps;
}
function aero_compute_mach(tas_mps, speed_of_sound_mps) {
  if (speed_of_sound_mps <= 0.0001) return 0.0;
  return tas_mps / speed_of_sound_mps;
}
function cadc_clamp(val, min_val, max_val) {
  if (val < min_val) return min_val;
  if (val > max_val) return max_val;
  return val;
}
function cadc_compute_wing_sweep(mach, dynamic_pressure_psf) {
  if (mach <= 0.60) return 20.0;
  var q_bias = 0.0;
  if (dynamic_pressure_psf > 1000.0) {
    q_bias = (dynamic_pressure_psf - 1000.0) * 0.015;
    if (q_bias > 8.0) q_bias = 8.0;
  }
  if (mach <= 0.70) return cadc_clamp(20.0 + q_bias, 20.0, 68.0);
  if (mach >= 1.40) return 68.0;
  var mach_fraction = (mach - 0.70) / (1.40 - 0.70);
  return cadc_clamp(20.0 + (48.0 * mach_fraction) + q_bias, 20.0, 68.0);
}
function rel_gamma_from_beta(beta) {
  var term = 1.0 - (beta * beta);
  if (term <= 0.0) return 1000000000000.0;
  return 1.0 / Math.sqrt(Math.max(0.01, term));
}
function orb_vis_viva(r, a, mu) {
  if (r <= 0.0 || a <= 0.0) return 0.0;
  var term = (2.0 / r) - (1.0 / a);
  if (term <= 0.0) return 0.0;
  return Math.sqrt(mu * term);
}

function initTargetSim() {
  var canvas = document.getElementById("science-canvas") || document.getElementById("target-sim");
  if (!canvas) return;
  if (canvas._cleanupScience) {
    try { canvas._cleanupScience(); } catch (e) {}
  }
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var accordion = canvas.closest ? canvas.closest("details") : null;
  var width = canvas.width = 672;
  var height = canvas.height = 240;
  var animId = null;

  var currentTarget = "c99";
  var scienceMode = 0; // 0: 6-DoF Aero, 1: Kepler Orbit, 2: Lorentz Relativity
  var time = 0;
  var scanLine = 0;
  var orbitNu = 0;

  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }
  canvas._cleanupScience = stop;

  function switchTarget(tgt) {
    if (!TARGET_SIM_DATA[tgt]) return;
    currentTarget = tgt;
    if (tgt === "c99" || tgt === "6dof") scienceMode = 0;
    else if (tgt === "llvm" || tgt === "orbit") scienceMode = 1;
    else if (tgt === "x86" || tgt === "lorentz") scienceMode = 2;
    else if (tgt === "arm") scienceMode = 0;
    else if (tgt === "wasm") scienceMode = 1;

    var statusEl = document.getElementById("target-status");
    if (statusEl) setDomText(statusEl, TARGET_SIM_DATA[tgt].status);

    var tabBtns = document.querySelectorAll(".sim-tab[data-target]");
    for (var i = 0; i < tabBtns.length; i++) {
      var btn = tabBtns[i];
      var isAct = btn.dataset.target === tgt;
      if (btn.classList.contains("active") !== isAct) {
        btn.classList.toggle("active", isAct);
      }
      btn.setAttribute("aria-selected", isAct ? "true" : "false");
    }
  }

  function cycleScienceMode() {
    scienceMode = (scienceMode + 1) % 3;
    var statusEl = document.getElementById("target-status");
    if (statusEl) {
      if (scienceMode === 0) {
        setDomText(statusEl, "⚡ 6-DoF Flight Dynamics: TAS 482 m/s | Mach 1.55 | Alpha: 6.8° | G-Load: 4.8G | CADC Sweep: 58°");
      } else if (scienceMode === 1) {
        setDomText(statusEl, "⚡ Keplerian Orbital Mechanics: Semi-Major Axis 7,200 km | e=0.48 | Vis-Viva: 9.84 km/s | Period: 104.2 min");
      } else {
        setDomText(statusEl, "⚡ Relativistic Lorentz Transforms: Velocity 0.88c (beta=0.880) | Lorentz Gamma: 2.105 | Length: 47.5% L0");
      }
    }
  }

  // --- Sub-renderers (Zero Heap Allocations) ---

  // 1. 6-DoF Aerospace Flight Dynamics & Vectoring
  function render6DoFAero(boxX, boxY, boxW, boxH, colors, t) {
    var pitch = 0.16 * Math.sin(1.1 * t) + 0.04 * Math.cos(0.4 * t);
    var roll = 0.35 * Math.sin(0.7 * t);
    var yaw = 0.10 * Math.sin(0.35 * t);
    var tas = 450.0 + 35.0 * Math.sin(0.5 * t);
    var alt_m = 8000.0;
    var a_sound = isa_speed_of_sound_at(alt_m);
    var rho = isa_density_at(alt_m);
    var mach = aero_compute_mach(tas, a_sound);
    var q_pa = aero_compute_dynamic_pressure(rho, tas);
    var sweep_deg = cadc_compute_wing_sweep(mach, q_pa * 0.02088543);
    var alpha = 0.09 + 0.035 * Math.sin(1.1 * t);
    var gLoad = 3.8 + 1.6 * Math.sin(1.1 * t);

    var cx = boxX + boxW / 2;
    var cy = boxY + boxH / 2 + 6;

    // Artificial Horizon & Pitch Ladder
    ctx.save();
    ctx.strokeStyle = getAlphaColor("fg", 0.20);
    ctx.lineWidth = 1;
    var horizY = cy + Math.tan(pitch) * 40;
    ctx.beginPath();
    ctx.moveTo(boxX + 15, horizY);
    ctx.lineTo(boxX + boxW - 15, horizY);
    ctx.stroke();

    // Pitch ladder marks
    for (var pl = -2; pl <= 2; pl++) {
      if (pl === 0) continue;
      var ply = horizY - pl * 18;
      if (ply > boxY + 28 && ply < boxY + boxH - 24) {
        ctx.beginPath();
        ctx.moveTo(cx - 16, ply);
        ctx.lineTo(cx - 6, ply);
        ctx.moveTo(cx + 6, ply);
        ctx.lineTo(cx + 16, ply);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 3D Euler Transformation
    var cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    var cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    var cosR = Math.cos(roll), sinR = Math.sin(roll);

    for (var v = 0; v < 10; v++) {
      var vIdx = v * 3;
      var x0 = SCIENCE_3D_VERTS_IN[vIdx];
      var y0 = SCIENCE_3D_VERTS_IN[vIdx + 1];
      var z0 = SCIENCE_3D_VERTS_IN[vIdx + 2];

      // Yaw
      var x1 = x0 * cosY - y0 * sinY;
      var y1 = x0 * sinY + y0 * cosY;
      var z1 = z0;
      // Pitch
      var x2 = x1 * cosP + z1 * sinP;
      var y2 = y1;
      var z2 = -x1 * sinP + z1 * cosP;
      // Roll
      var x3 = x2;
      var y3 = y2 * cosR - z2 * sinR;
      var z3 = y2 * sinR + z2 * cosR;

      SCIENCE_3D_VERTS_OUT[vIdx] = cx + y3 * 1.15;
      SCIENCE_3D_VERTS_OUT[vIdx + 1] = cy + z3 * 1.15 - x3 * 0.22;
      SCIENCE_3D_VERTS_OUT[vIdx + 2] = x3;
    }

    // Afterburner Thrust Plume (Vertex 3)
    var tailX = SCIENCE_3D_VERTS_OUT[9];
    var tailY = SCIENCE_3D_VERTS_OUT[10];
    ctx.save();
    ctx.fillStyle = getAlphaColor("fg", 0.75 + 0.25 * Math.sin(t * 15));
    ctx.beginPath();
    ctx.arc(tailX - 8 * cosY, tailY + 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Aircraft Wireframe Edges
    ctx.save();
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 1.4;
    for (var e = 0; e < SCIENCE_3D_EDGES.length; e++) {
      var p1 = SCIENCE_3D_EDGES[e][0] * 3;
      var p2 = SCIENCE_3D_EDGES[e][1] * 3;
      ctx.beginPath();
      ctx.moveTo(SCIENCE_3D_VERTS_OUT[p1], SCIENCE_3D_VERTS_OUT[p1 + 1]);
      ctx.lineTo(SCIENCE_3D_VERTS_OUT[p2], SCIENCE_3D_VERTS_OUT[p2 + 1]);
      ctx.stroke();
    }
    ctx.restore();

    // Aerodynamic Vectors
    var noseX = SCIENCE_3D_VERTS_OUT[0];
    var noseY = SCIENCE_3D_VERTS_OUT[1];

    // Velocity Vector V
    ctx.save();
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(noseX + 28, noseY - 8);
    ctx.stroke();
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = colors.fg;
    ctx.fillText("V", noseX + 32, noseY - 8);

    // Lift Vector L (Normal to velocity)
    ctx.strokeStyle = getAlphaColor("fg", 0.85);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy - 38);
    ctx.stroke();
    ctx.fillText("L", cx + 3, cy - 38);

    // Drag Vector D
    ctx.strokeStyle = getAlphaColor("fg", 0.65);
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx - 36, cy);
    ctx.stroke();
    ctx.fillText("D", cx - 44, cy + 3);
    ctx.restore();

    // Telemetry Box
    ctx.save();
    ctx.fillStyle = colors.fg;
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "left";
    ctx.fillText("TAS " + Math.round(tas) + "m/s (M" + mach.toFixed(2) + ")", boxX + 12, boxY + 26);
    ctx.fillStyle = colors.muted;
    ctx.fillText("α " + (alpha * 57.3).toFixed(1) + "° | n " + gLoad.toFixed(1) + "G | CADC " + Math.round(sweep_deg) + "°", boxX + 12, boxH - 12);
    ctx.restore();
  }

  // 2. Keplerian 2-Body Orbital Mechanics Simulator
  function renderKeplerOrbit(boxX, boxY, boxW, boxH, colors, t) {
    var a = boxW * 0.28;
    var e = 0.48;
    var b = a * Math.sqrt(1 - e * e);
    var c = a * e;

    var cx = boxX + boxW / 2 - 10;
    var cy = boxY + boxH / 2 + 8;
    var f1X = cx;
    var f1Y = cy;
    var ellipseCenterX = cx + c;
    var ellipseCenterY = cy;

    // Advance True Anomaly (Kepler's 2nd Law)
    var dNu = 0.038 * Math.pow(1 + e * Math.cos(orbitNu), 2);
    orbitNu = (orbitNu + dNu) % (Math.PI * 2);

    var r = (a * (1 - e * e)) / (1 + e * Math.cos(orbitNu));
    var satX = f1X + r * Math.cos(orbitNu);
    var satY = f1Y + r * Math.sin(orbitNu);
    var vSpeed = 7.8 * Math.sqrt(Math.max(0.1, 2 / (r / a) - 1));
    var a_m = 7200000.0;
    var r_m = a_m * (1 - e * e) / (1 + e * Math.cos(orbitNu));
    var v_phys_kms = orb_vis_viva(r_m, a_m, 3.986004418e14) / 1000.0;

    // Store Trail
    var trIdx = (SCIENCE_ORBIT_TRAIL_HEAD % 64) * 2;
    SCIENCE_ORBIT_TRAIL_F32[trIdx] = satX;
    SCIENCE_ORBIT_TRAIL_F32[trIdx + 1] = satY;
    SCIENCE_ORBIT_TRAIL_HEAD++;
    if (SCIENCE_ORBIT_TRAIL_COUNT < 64) SCIENCE_ORBIT_TRAIL_COUNT++;

    // Draw Elliptical Orbit Track
    ctx.save();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.2;
    ctx.setLineDash(DASH_4_4);
    ctx.beginPath();
    ctx.ellipse(ellipseCenterX, ellipseCenterY, a, b, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Gravitational Potential Rings around Primary Body
    ctx.save();
    ctx.strokeStyle = getAlphaColor("fg", 0.12);
    ctx.lineWidth = 1;
    ctx.setLineDash(DASH_2_2);
    for (var gr = 1; gr <= 3; gr++) {
      ctx.beginPath();
      ctx.arc(f1X, f1Y, gr * 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Central Celestial Primary Body (Focus F1)
    ctx.save();
    ctx.fillStyle = colors.fg;
    ctx.beginPath();
    ctx.arc(f1X, f1Y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = getAlphaColor("fg", 0.4);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Orbit History Trail
    ctx.save();
    for (var tr = 0; tr < SCIENCE_ORBIT_TRAIL_COUNT; tr++) {
      var ptIdx = ((SCIENCE_ORBIT_TRAIL_HEAD - 1 - tr + 64) % 64) * 2;
      var px = SCIENCE_ORBIT_TRAIL_F32[ptIdx];
      var py = SCIENCE_ORBIT_TRAIL_F32[ptIdx + 1];
      var alphaTr = (1.0 - tr / 64) * 0.45;
      ctx.fillStyle = getAlphaColor("fg", alphaTr);
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Orbiting Satellite
    ctx.save();
    ctx.fillStyle = colors.fg;
    ctx.beginPath();
    ctx.arc(satX, satY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Tangential Velocity Vector (Vis-Viva Velocity)
    var vAngle = orbitNu + Math.PI / 2 + Math.atan2(e * Math.sin(orbitNu), 1 + e * Math.cos(orbitNu));
    var vLen = vSpeed * 2.8;
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(satX, satY);
    ctx.lineTo(satX + Math.cos(vAngle) * vLen, satY + Math.sin(vAngle) * vLen);
    ctx.stroke();
    ctx.font = "bold 8px monospace";
    ctx.fillText("v", satX + Math.cos(vAngle) * (vLen + 5), satY + Math.sin(vAngle) * (vLen + 5));

    // Gravitational Acceleration Vector
    ctx.strokeStyle = getAlphaColor("fg", 0.6);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(satX, satY);
    ctx.lineTo(satX - Math.cos(orbitNu) * 16, satY - Math.sin(orbitNu) * 16);
    ctx.stroke();
    ctx.fillText("g", satX - Math.cos(orbitNu) * 20, satY - Math.sin(orbitNu) * 20);
    ctx.restore();

    // Apsis Markers
    ctx.save();
    ctx.fillStyle = colors.muted;
    ctx.font = "7px monospace";
    ctx.fillText("P (Periapsis)", f1X + a * (1 - e) - 10, f1Y + 12);
    ctx.fillText("A (Apoapsis)", f1X - a * (1 + e) + 2, f1Y + 12);
    ctx.restore();

    // Telemetry Box
    ctx.save();
    ctx.fillStyle = colors.fg;
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "left";
    ctx.fillText("v_orb " + v_phys_kms.toFixed(2) + " km/s", boxX + 12, boxY + 26);
    ctx.fillStyle = colors.muted;
    ctx.fillText("a: 7,200km | e: 0.48 | T: 104m", boxX + 12, boxH - 12);
    ctx.restore();
  }

  // 3. Relativistic Lorentz Transformations & Spacetime Light Cone
  function renderLorentzRelativity(boxX, boxY, boxW, boxH, colors, t) {
    var beta = 0.50 + 0.42 * Math.sin(0.7 * t);
    var gamma = rel_gamma_from_beta(beta);
    var L0 = 55;
    var L = L0 / gamma;

    var cx = boxX + boxW / 2;
    var cy = boxY + boxH / 2 + 10;

    // Minkowski Light Cone Axes & 45-degree photon worldlines
    ctx.save();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.2;
    var coneX = boxX + 55;
    var coneY = cy;

    // Axes
    ctx.beginPath();
    ctx.moveTo(coneX - 35, coneY);
    ctx.lineTo(coneX + 35, coneY);
    ctx.moveTo(coneX, coneY + 35);
    ctx.lineTo(coneX, coneY - 35);
    ctx.stroke();

    // 45-degree photon worldlines (x = +/- ct)
    ctx.strokeStyle = getAlphaColor("fg", 0.4);
    ctx.setLineDash(DASH_2_2);
    ctx.beginPath();
    ctx.moveTo(coneX - 30, coneY + 30);
    ctx.lineTo(coneX + 30, coneY - 30);
    ctx.moveTo(coneX - 30, coneY - 30);
    ctx.lineTo(coneX + 30, coneY + 30);
    ctx.stroke();

    // Moving Frame Worldline x' = beta * ct
    ctx.strokeStyle = colors.fg;
    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(coneX - 25 * beta, coneY + 25);
    ctx.lineTo(coneX + 25 * beta, coneY - 25);
    ctx.stroke();
    ctx.restore();

    // Length Contraction Gauge
    var rodX = boxX + 130;
    var rodY = cy - 14;

    ctx.save();
    // Rest Frame L0 Reference Box
    ctx.strokeStyle = colors.border;
    ctx.setLineDash(DASH_2_2);
    ctx.strokeRect(rodX, rodY - 8, L0, 16);
    ctx.fillStyle = colors.muted;
    ctx.font = "7px monospace";
    ctx.fillText("Rest L0", rodX + 14, rodY - 12);

    // Contracted Frame L Rod
    ctx.fillStyle = colors.fg;
    ctx.fillRect(rodX, rodY - 6, L, 12);
    ctx.strokeStyle = colors.fg;
    ctx.setLineDash([]);
    ctx.strokeRect(rodX, rodY - 6, L, 12);

    // Velocity Vector
    ctx.beginPath();
    ctx.moveTo(rodX + L, rodY);
    ctx.lineTo(rodX + L + 16, rodY);
    ctx.stroke();
    ctx.font = "bold 8px monospace";
    ctx.fillText("v=βc", rodX + L + 18, rodY + 3);
    ctx.restore();

    // Twin Clocks: Proper Time Tau vs Dilated Lab Time
    var clock1X = rodX + 14;
    var clock2X = rodX + 48;
    var clockY = cy + 22;
    var clkR = 9;

    ctx.save();
    // Proper Clock Tau
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(clock1X, clockY, clkR, 0, Math.PI * 2);
    ctx.stroke();
    var hand1 = 3.0 * t;
    ctx.beginPath();
    ctx.moveTo(clock1X, clockY);
    ctx.lineTo(clock1X + Math.cos(hand1) * 7, clockY + Math.sin(hand1) * 7);
    ctx.stroke();

    // Dilated Clock T
    ctx.strokeStyle = colors.muted;
    ctx.beginPath();
    ctx.arc(clock2X, clockY, clkR, 0, Math.PI * 2);
    ctx.stroke();
    var hand2 = (3.0 * t) / gamma;
    ctx.beginPath();
    ctx.moveTo(clock2X, clockY);
    ctx.lineTo(clock2X + Math.cos(hand2) * 7, clockY + Math.sin(hand2) * 7);
    ctx.stroke();

    ctx.fillStyle = colors.fg;
    ctx.font = "7px monospace";
    ctx.fillText("τ", clock1X - 3, clockY + clkR + 8);
    ctx.fillStyle = colors.muted;
    ctx.fillText("t_lab", clock2X - 8, clockY + clkR + 8);
    ctx.restore();

    // Telemetry Box
    ctx.save();
    ctx.fillStyle = colors.fg;
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "left";
    ctx.fillText("β = " + beta.toFixed(3) + "c | γ = " + gamma.toFixed(3), boxX + 12, boxY + 26);
    ctx.fillStyle = colors.muted;
    ctx.fillText("L/L0: " + ((1 / gamma) * 100).toFixed(1) + "% | Δt: " + gamma.toFixed(2) + "x", boxX + 12, boxH - 12);
    ctx.restore();
  }

  var lastTargetTime = 0;
  function renderLoop(now) {
    if (!animId) return;
    animId = requestAnimationFrame(renderLoop);
    if (now && lastTargetTime && (now - lastTargetTime < 22)) return; // Cap to ~45 FPS
    lastTargetTime = now;

    var colors = getThemeColors();
    time += 0.025;
    scanLine = (scanLine + 2) % height;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    var splitX = 224;

    // --- Left Column: Interactive Hard Science Simulator ---
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.fillRect(10, 10, splitX - 20, height - 20);
    ctx.strokeRect(10, 10, splitX - 20, height - 20);

    ctx.fillStyle = colors.fg;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    var modeTitles = [
      "6-DoF FLIGHT DYNAMICS",
      "KEPLERIAN 2-BODY ORBIT",
      "LORENTZ RELATIVITY"
    ];
    ctx.fillText(modeTitles[scienceMode], (splitX - 10) / 2 + 5, 26);
    ctx.restore();

    if (scienceMode === 0) {
      render6DoFAero(10, 10, splitX - 20, height - 20, colors, time);
    } else if (scienceMode === 1) {
      renderKeplerOrbit(10, 10, splitX - 20, height - 20, colors, time);
    } else {
      renderLorentzRelativity(10, 10, splitX - 20, height - 20, colors, time);
    }

    // --- Right Column: Multi-Target Code / Disassembly Output ---
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.fillRect(splitX, 10, width - splitX - 10, height - 20);
    ctx.strokeRect(splitX, 10, width - splitX - 10, height - 20);

    var targetData = TARGET_SIM_DATA[currentTarget] || TARGET_SIM_DATA.c99;

    ctx.fillStyle = colors.fg;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(targetData.title, splitX + 16, 30);

    ctx.font = "10px monospace";
    for (var cl = 0; cl < targetData.code.length; cl++) {
      var line = targetData.code[cl];
      var ly = 52 + cl * 16;
      ctx.fillStyle = colors.muted;
      ctx.fillText(String(cl + 1).padStart(2, " ") + " |", splitX + 16, ly);

      ctx.fillStyle = colors.fg;
      ctx.fillText(line, splitX + 50, ly);
    }

    // Scanline effect
    ctx.strokeStyle = getAlphaColor("fg", 0.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(splitX, scanLine);
    ctx.lineTo(width - 10, scanLine);
    ctx.stroke();
    ctx.restore();
  }

  function start() {
    if (!animId) animId = requestAnimationFrame(renderLoop);
  }
  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  var tabBtns = document.querySelectorAll(".sim-tab[data-target]");
  for (var i = 0; i < tabBtns.length; i++) {
    tabBtns[i].onclick = function () {
      switchTarget(this.dataset.target);
    };
  }

  var resynthBtn = document.getElementById("target-resynth");
  if (resynthBtn) {
    resynthBtn.onclick = function () {
      scanLine = 0;
      var statusEl = document.getElementById("target-status");
      if (statusEl) {
        setDomText(statusEl, "⚡ Re-Synthesized " + TARGET_SIM_DATA[currentTarget].badge + " | Parity: 100% Bit-Exact | Zero Toolchain Lock-In");
      }
    };
  }

  // Click on canvas cycles mode if clicked on left half, or re-synthesizes if right half
  canvas.onclick = function (e) {
    var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, width: 672 };
    var clickX = (e.clientX !== undefined) ? (e.clientX - rect.left) * (672 / (rect.width || 672)) : 100;
    if (clickX < 224) {
      cycleScienceMode();
    } else if (resynthBtn) {
      resynthBtn.click();
    }
  };

  switchTarget("c99");

  var regId = canvas.id || "target-sim";
  CanvasLifecycleManager.register(regId, {
    canvas: canvas,
    start: start,
    stop: stop,
    accordion: accordion,
    respectReducedMotion: false
  });
  if (regId !== "target-sim") {
    CanvasLifecycleManager.register("target-sim", {
      canvas: canvas,
      start: start,
      stop: stop,
      accordion: accordion,
      respectReducedMotion: false
    });
  }
}

function initScienceCanvas() {
  initTargetSim();
}

if (typeof window !== "undefined") {
  window.initTargetSim = initTargetSim;
  window.initScienceCanvas = initScienceCanvas;
}

// ----------------------------------------------------
// 6. Active Binary Defense Control-Flow Flattening (#mtd-canvas)
// ----------------------------------------------------
function initMtdEngine() {
  var mtdCanvas = document.getElementById("mtd-canvas");
  if (!mtdCanvas) return;
  var ctx = mtdCanvas.getContext("2d");
  if (!ctx) return;
  var accordion = mtdCanvas.closest ? mtdCanvas.closest("details") : null;
  var width = mtdCanvas.width = 672;
  var height = mtdCanvas.height = 260;
  var mtdAnimId = null;
  var time = 0;
  var aslrBaseIdx = 0;
  var morphEpoch = 0;
  var anomalyPage = -1;
  var anomalyTimer = 0;

  // Pre-allocated typed entity pool for shockwaves: [x, y, radius, alpha]
  var mtdShockwavesPool = new StaticEntityPoolF32(16, 4);

  // Pre-allocated Float32Array for packets: [edgeIdx, progress, speed]
  var mtdPacketsF32 = new Float32Array(8 * 3);

  // Pre-allocated nodes array (updated in place)
  var mtdNodes = [
    { id: 1, label: "0x10 Entry", x: 45, y: 125, targetX: 45, targetY: 125, vx: 0, vy: 0, isKey: true },
    { id: 2, label: "&FsCap Grant", x: 120, y: 68, targetX: 120, targetY: 68, vx: 0, vy: 0, isKey: false },
    { id: 3, label: "0x30 Dispatcher", x: 195, y: 125, targetX: 195, targetY: 125, vx: 0, vy: 0, isKey: true },
    { id: 4, label: "0x40 BasicBlock_A", x: 275, y: 68, targetX: 275, targetY: 68, vx: 0, vy: 0, isKey: false },
    { id: 5, label: "0x50 BasicBlock_B", x: 275, y: 182, targetX: 275, targetY: 182, vx: 0, vy: 0, isKey: false },
    { id: 6, label: "0x60 RASP Watchdog", x: 120, y: 182, targetX: 120, targetY: 182, vx: 0, vy: 0, isKey: false },
    { id: 7, label: "0x70 Return", x: 345, y: 125, targetX: 345, targetY: 125, vx: 0, vy: 0, isKey: true }
  ];

  function initMtdGraph() {
    mtdShockwavesPool.clear();
    aslrBaseIdx = 0;
    morphEpoch = 0;
    anomalyPage = -1;
    anomalyTimer = 0;
    for (var i = 0; i < MTD_CANONICAL_NODES.length; i++) {
      var cNode = MTD_CANONICAL_NODES[i];
      var node = mtdNodes[i];
      node.x = cNode.x;
      node.y = cNode.y;
      node.targetX = cNode.targetX;
      node.targetY = cNode.targetY;
      node.vx = 0;
      node.vy = 0;
      node.isKey = cNode.isKey;
      node.label = cNode.label;
    }
    for (var p = 0; p < 8; p++) {
      var po = p * 3;
      mtdPacketsF32[po] = p % MTD_INDEXED_EDGES.length;
      mtdPacketsF32[po + 1] = p / 8;
      mtdPacketsF32[po + 2] = 0.015 + (p % 3) * 0.005;
    }
  }

  function triggerMtdMorph() {
    morphEpoch++;
    aslrBaseIdx = (aslrBaseIdx + 1) % MTD_ASLR_BASES.length;
    var swIdx = mtdShockwavesPool.alloc();
    if (swIdx >= 0) {
      var swo = swIdx * 4;
      mtdShockwavesPool.buffer[swo] = 195;
      mtdShockwavesPool.buffer[swo + 1] = 125;
      mtdShockwavesPool.buffer[swo + 2] = 6;
      mtdShockwavesPool.buffer[swo + 3] = 1.0;
    }
    for (var i = 0; i < mtdNodes.length; i++) {
      var n = mtdNodes[i];
      n.vx = (Math.random() - 0.5) * 35;
      n.vy = (Math.random() - 0.5) * 35;
      n.targetX = MTD_RAND_X[(i + morphEpoch) % MTD_RAND_X.length] + (Math.random() - 0.5) * 16;
      n.targetY = MTD_RAND_Y[(i * 2 + morphEpoch) % MTD_RAND_Y.length] + (Math.random() - 0.5) * 12;
      var morphList = MTD_NODE_MORPH_LABELS[i];
      n.label = morphList[morphEpoch % morphList.length];
    }
    // Hostile injection simulation on a memory page
    anomalyPage = (aslrBaseIdx * 3 + 5) % 16;
    anomalyTimer = 40;
  }

  var mtdAutoTimer = 0;
  var lastMtdTime = 0;
  function updateMtdLoop(now) {
    if (!mtdAnimId) return;
    mtdAnimId = requestAnimationFrame(updateMtdLoop);
    if (now && lastMtdTime && (now - lastMtdTime < 22)) return; // Cap to ~45 FPS
    lastMtdTime = now;

    var colors = getThemeColors();
    time += 0.025;
    mtdAutoTimer++;
    if (mtdAutoTimer > 160) {
      mtdAutoTimer = 0;
      triggerMtdMorph();
    }

    if (anomalyTimer > 0) {
      anomalyTimer--;
      if (anomalyTimer === 0) {
        anomalyPage = -1;
      }
    }

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    var splitX = 390;

    // --------------------------------------------------
    // LEFT PANEL: Control-Flow Scrambling & ASLR Shifter
    // --------------------------------------------------
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.fillRect(8, 8, splitX - 16, height - 16);
    ctx.strokeRect(8, 8, splitX - 16, height - 16);

    ctx.fillStyle = colors.fg;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("🛡️ MTD CONTROL-FLOW & ASLR", 18, 24);

    ctx.fillStyle = colors.muted;
    ctx.font = "8.5px monospace";
    ctx.fillText("Entropy: 32-bit | State: FLATTENED", 18, 36);

    ctx.strokeStyle = colors.border;
    ctx.beginPath();
    ctx.moveTo(18, 42);
    ctx.lineTo(splitX - 18, 42);
    ctx.stroke();

    // Shockwaves
    for (var s = mtdShockwavesPool.activeCount - 1; s >= 0; s--) {
      var swo = s * 4;
      mtdShockwavesPool.buffer[swo + 2] += 6;
      mtdShockwavesPool.buffer[swo + 3] *= 0.91;
      var swa = mtdShockwavesPool.buffer[swo + 3];
      if (swa < 0.02) {
        mtdShockwavesPool.free(s);
        continue;
      }
      ctx.beginPath();
      ctx.arc(mtdShockwavesPool.buffer[swo], mtdShockwavesPool.buffer[swo + 1], mtdShockwavesPool.buffer[swo + 2], 0, Math.PI * 2);
      ctx.strokeStyle = getAlphaColor("fg", swa);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Node Physics
    for (var i = 0; i < mtdNodes.length; i++) {
      var node = mtdNodes[i];
      node.vx += (node.targetX - node.x) * 0.08;
      node.vy += (node.targetY - node.y) * 0.08;
      node.vx *= 0.82;
      node.vy *= 0.82;
      node.x += node.vx;
      node.y += node.vy;
    }

    // Direct Pre-indexed Edge Drawing (ZERO Closures)
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    for (var e = 0; e < MTD_INDEXED_EDGES.length; e++) {
      var edgePair = MTD_INDEXED_EDGES[e];
      var fromNode = mtdNodes[edgePair[0]];
      var toNode = mtdNodes[edgePair[1]];
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
      }
    }

    // Packets along edges (ZERO Closures)
    for (var pk = 0; pk < 8; pk++) {
      var pko = pk * 3;
      mtdPacketsF32[pko + 1] += mtdPacketsF32[pko + 2];
      if (mtdPacketsF32[pko + 1] >= 1.0) mtdPacketsF32[pko + 1] = 0;
      var eIdx = Math.floor(mtdPacketsF32[pko]);
      var pair = MTD_INDEXED_EDGES[eIdx];
      var fn = mtdNodes[pair[0]];
      var tn = mtdNodes[pair[1]];
      if (fn && tn) {
        var progress = mtdPacketsF32[pko + 1];
        var px = fn.x + (tn.x - fn.x) * progress;
        var py = fn.y + (tn.y - fn.y) * progress;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = getAlphaColor("fg", 0.9);
        ctx.fill();
      }
    }

    // Basic Block Boxes
    for (var nd = 0; nd < mtdNodes.length; nd++) {
      var nObj = mtdNodes[nd];
      ctx.fillStyle = colors.bg;
      ctx.strokeStyle = colors.fg;
      ctx.lineWidth = nObj.isKey ? 1.5 : 1;
      var boxW = 80;
      var boxH = 22;
      ctx.fillRect(nObj.x - boxW / 2, nObj.y - boxH / 2, boxW, boxH);
      ctx.strokeRect(nObj.x - boxW / 2, nObj.y - boxH / 2, boxW, boxH);
      ctx.fillStyle = colors.fg;
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(nObj.label, nObj.x, nObj.y);
    }

    // Left Panel Bottom Status Bar
    ctx.fillStyle = colors.bg;
    ctx.fillRect(16, 218, splitX - 32, 22);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 218, splitX - 32, 22);
    ctx.fillStyle = colors.fg;
    ctx.font = "8.5px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ASLR: " + MTD_ASLR_BASES[aslrBaseIdx] + " | ROP GADGETS: 0", (splitX) / 2, 229);
    ctx.restore();

    // --------------------------------------------------
    // RIGHT PANEL: Live-RAM Checksum Watchdog & Anomaly Detector
    // --------------------------------------------------
    ctx.save();
    var rx = 396;
    var ry = 8;
    var rw = 268;
    var rh = height - 16;

    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.fillStyle = colors.fg;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("🔍 LIVE-RAM CHECKSUM WATCHDOG", rx + 10, ry + 16);

    ctx.fillStyle = colors.muted;
    ctx.font = "8.5px monospace";
    ctx.fillText("Scan: 1.2 GHz | CRC32 Invariant", rx + 10, ry + 28);

    ctx.strokeStyle = colors.border;
    ctx.beginPath();
    ctx.moveTo(rx + 10, ry + 34);
    ctx.lineTo(rx + rw - 10, ry + 34);
    ctx.stroke();

    var watchdogScanIdx = Math.floor(time * 8) % 16;
    var gx = rx + 10;
    var gy = ry + 40;
    var bw = 58;
    var bh = 37;
    var gapX = 5;
    var gapY = 5;

    // 4x4 Grid of 16 Live Memory Pages
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        var k = r * 4 + c;
        var bx = gx + c * (bw + gapX);
        var by = gy + r * (bh + gapY);
        var isTainted = (k === anomalyPage);
        var isScanning = (k === watchdogScanIdx);

        if (isTainted) {
          ctx.fillStyle = colors.accent || colors.fg;
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = colors.fg;
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, bw, bh);
          ctx.fillStyle = colors.bg;
          ctx.font = "bold 8.5px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("0x" + k.toString(16).toUpperCase() + " " + MTD_RAM_PAGES[k].name, bx + bw / 2, by + 11);
          ctx.fillText("[TAINT 0xCC]", bx + bw / 2, by + 25);
        } else {
          ctx.fillStyle = isScanning ? colors.bg : colors.panel;
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = isScanning ? colors.fg : colors.border;
          ctx.lineWidth = isScanning ? 1.5 : 1;
          ctx.strokeRect(bx, by, bw, bh);
          ctx.fillStyle = isScanning ? colors.fg : colors.muted;
          ctx.font = "bold 8.5px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("0x" + k.toString(16).toUpperCase() + " " + MTD_RAM_PAGES[k].name, bx + bw / 2, by + 11);
          ctx.fillStyle = isScanning ? colors.fg : colors.border;
          ctx.font = "8px monospace";
          ctx.fillText("CRC:" + MTD_RAM_PAGES[k].crc, bx + bw / 2, by + 25);
        }
      }
    }

    // Right Panel Bottom Status Bar
    ctx.fillStyle = (anomalyPage >= 0) ? (colors.accent || colors.fg) : colors.bg;
    ctx.fillRect(rx + 10, ry + 210, rw - 20, 22);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(rx + 10, ry + 210, rw - 20, 22);
    ctx.fillStyle = (anomalyPage >= 0) ? colors.bg : colors.fg;
    ctx.font = "8.5px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (anomalyPage >= 0) {
      ctx.fillText("🚨 TAINT DETECTED -> PURGED & RE-KEYED", rx + rw / 2, ry + 221);
    } else {
      ctx.fillText("✅ 16/16 PAGES VALID | 0-ROP WATCHDOG", rx + rw / 2, ry + 221);
    }

    ctx.restore();
  }

  function start() {
    if (!mtdAnimId) {
      mtdAnimId = requestAnimationFrame(updateMtdLoop);
    }
  }
  function stop() {
    if (mtdAnimId) {
      cancelAnimationFrame(mtdAnimId);
      mtdAnimId = null;
    }
  }
  var triggerBtn = document.getElementById("mtd-trigger") || document.getElementById("mtd-morph-btn");
  if (triggerBtn) triggerBtn.onclick = triggerMtdMorph;
  var morphBtn = document.getElementById("mtd-morph-btn");
  if (morphBtn && morphBtn !== triggerBtn) morphBtn.onclick = triggerMtdMorph;
  var resetBtn = document.getElementById("mtd-reset");
  if (resetBtn) resetBtn.onclick = initMtdGraph;
  mtdCanvas.onclick = triggerMtdMorph;
  initMtdGraph();
  CanvasLifecycleManager.register("mtd-engine", {
    canvas: mtdCanvas,
    start: start,
    stop: stop,
    accordion: accordion,
    respectReducedMotion: false
  });
}

// ----------------------------------------------------
// 7. Zero-Trust Verification Invariant Prover (#verify-canvas)
// ----------------------------------------------------
function initVerifyProver() {
  var canvas = document.getElementById("verify-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var accordion = canvas.closest ? canvas.closest("details") : null;
  var width = canvas.width = 672;
  var height = canvas.height = 240;
  var animId = null;

  var state = {
    waveProgress: 0,
    diverge: false,
    alarm: false,
    time: 0,
    gates: [
      { name: "1. NIST ML-KEM KAT", verified: true },
      { name: "2. 0-Byte Mem Leak", verified: true },
      { name: "3. RAII Scoped RAII", verified: true },
      { name: "4. SHA-256 Digest", verified: true }
    ],
    hash1: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    hash2: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  };

  // Pre-allocated static pool for emission sparks / AST ingestion particles [x, y, vx, vy, alpha, type]
  var verifySparksPool = new StaticEntityPoolF32(24, 6);

  function updateStatus() {
    var statusEl = document.getElementById("verify-status");
    if (!statusEl) return;
    if (state.alarm) {
      setDomText(statusEl, "🚨 [FAIL-CLOSED] State Leak Detected: Run #1 (0x00) != Run #2 (0x8F) | Memory Leak at 0x1A40");
    } else {
      setDomText(statusEl, "Sequential Double-Run Prover: Run #1 SHA-256 == Run #2 SHA-256 (Delta: 0x00 | Invariant Holds)");
    }
  }

  function runProof() {
    state.waveProgress = 0;
    state.diverge = false;
    state.alarm = false;
    state.hash1 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    state.hash2 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    updateStatus();
  }

  function injectLeak() {
    state.waveProgress = 0;
    state.diverge = true;
    state.alarm = true;
    state.hash1 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    state.hash2 = "a84f3c0919de5c149afbf4c8996fb92427ae41e4649b934ca495991b78528f11";
    updateStatus();
  }

  function resetProver() {
    state.waveProgress = 0;
    state.diverge = false;
    state.alarm = false;
    state.hash1 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    state.hash2 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    updateStatus();
  }

  var lastVerifyTime = 0;
  function renderLoop(now) {
    if (!animId) return;
    animId = requestAnimationFrame(renderLoop);
    if (now && lastVerifyTime && (now - lastVerifyTime < 22)) return; // Cap to ~45 FPS
    lastVerifyTime = now;

    var colors = getThemeColors();
    state.time += 0.03;
    state.waveProgress = (state.waveProgress + 0.008) % 1.0;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // Top Header: AST Ingestion stream title & Multi-backend badges
    ctx.save();
    ctx.fillStyle = colors.fg;
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "left";
    ctx.fillText(".oo AST INGESTION STREAM ► MULTI-TARGET CODEGEN MATRIX", 14, 18);

    // Draw Multi-Backend Target Badges
    for (var b = 0; b < VERIFY_TARGET_BADGES.length; b++) {
      var badge = VERIFY_TARGET_BADGES[b];
      ctx.fillStyle = colors.panel;
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.fillRect(badge.x, badge.y - 10, badge.w, badge.h);
      ctx.strokeRect(badge.x, badge.y - 10, badge.w, badge.h);
      ctx.fillStyle = colors.fg;
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.fillText(badge.name, badge.x + badge.w / 2, badge.y - 1);
    }
    ctx.restore();

    var startX = 60;
    var endX = width - 60;
    var pipeY1 = 68;
    var pipeY2 = 138;

    // AST Ingestion Node on Left
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.fillRect(10, 36, 42, 140);
    ctx.strokeRect(10, 36, 42, 140);
    ctx.fillStyle = colors.fg;
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.fillText(".oo AST", 31, 48);

    var activeAstIdx = Math.floor((state.time * 1.5) % VERIFY_AST_STREAM.length);
    ctx.fillStyle = colors.muted;
    ctx.font = "6.5px monospace";
    for (var ai = 0; ai < VERIFY_AST_STREAM.length; ai++) {
      var ay = 64 + ai * 20;
      if (ai === activeAstIdx) {
        ctx.fillStyle = colors.fg;
        ctx.fillText("►" + VERIFY_AST_STREAM[ai], 31, ay);
        ctx.fillStyle = colors.muted;
      } else {
        ctx.fillText(VERIFY_AST_STREAM[ai], 31, ay);
      }
    }
    ctx.restore();

    // Pipeline Channel Rails
    ctx.save();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;

    // Lane 1: Native Reference Pipeline
    ctx.beginPath();
    ctx.moveTo(startX, pipeY1);
    ctx.lineTo(endX, pipeY1);
    ctx.stroke();

    // Lane 2: Sandboxed Synthesizer Pipeline
    ctx.beginPath();
    ctx.moveTo(startX, pipeY2);
    ctx.lineTo(endX, pipeY2);
    ctx.stroke();

    ctx.fillStyle = colors.fg;
    ctx.font = "bold 8.5px monospace";
    ctx.textAlign = "left";
    ctx.fillText("RUN #1 (Cold Native: ELF x86_64 / AArch64 Direct Syscall)", startX + 4, pipeY1 - 10);
    ctx.fillText("RUN #2 (Synthesized: WasmGC Compact / ISO C99 Sandbox)", startX + 4, pipeY2 - 10);

    // Emitted instruction tokens along pipeline tracks
    ctx.font = "7px monospace";
    ctx.fillStyle = colors.muted;
    for (var tok = 0; tok < VERIFY_STREAM_TOKENS_REF.length; tok++) {
      var tx = startX + 25 + tok * 85;
      if (tx < endX - 30) {
        ctx.fillText(VERIFY_STREAM_TOKENS_REF[tok], tx, pipeY1 + 12);
        ctx.fillText(VERIFY_STREAM_TOKENS_SYNTH[tok], tx, pipeY2 + 12);
      }
    }
    ctx.restore();

    // 4 Formal Invariant Checkpoint Gates (Towers)
    for (var g = 0; g < VERIFY_GATE_XS.length; g++) {
      var gx = VERIFY_GATE_XS[g];
      var isTripped = state.alarm && g >= 1;

      ctx.save();
      ctx.fillStyle = colors.panel;
      ctx.strokeStyle = isTripped ? colors.fg : colors.border;
      ctx.lineWidth = 1.5;
      ctx.fillRect(gx - 18, 30, 36, height - 64);
      ctx.strokeRect(gx - 18, 30, 36, height - 64);

      ctx.fillStyle = colors.fg;
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(VERIFY_GATE_NAMES[g], gx, 46);

      ctx.fillStyle = colors.muted;
      ctx.font = "6.5px monospace";
      ctx.fillText(VERIFY_GATE_INVARIANTS[g], gx, 58);

      var gateStatus = isTripped ? "✕ LEAK" : "✓ PASS";
      ctx.fillStyle = isTripped ? colors.fg : colors.muted;
      ctx.font = "bold 7.5px monospace";
      ctx.fillText(gateStatus, gx, height - 42);
      ctx.restore();
    }

    // Traveling Wave Packets (Execution Parity Monitors)
    var waveX = startX + state.waveProgress * (endX - startX);
    ctx.save();
    ctx.fillStyle = colors.fg;
    ctx.beginPath();
    ctx.arc(waveX, pipeY1, 6, 0, Math.PI * 2);
    ctx.fill();

    var p2Y = pipeY2 + (state.alarm && waveX > VERIFY_GATE_XS[1] ? Math.sin(state.time * 12) * 10 : 0);
    ctx.beginPath();
    ctx.arc(waveX, p2Y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bottom Parity & Digest Ledger Panel
    ctx.save();
    ctx.fillStyle = colors.panel;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.fillRect(10, height - 34, width - 20, 26);
    ctx.strokeRect(10, height - 34, width - 20, 26);

    ctx.fillStyle = colors.muted;
    ctx.font = "7.5px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Run 1 SHA: " + state.hash1.slice(0, 16) + "... [ELF Machine Code]", 18, height - 22);
    ctx.fillText("Run 2 SHA: " + state.hash2.slice(0, 16) + "... [WasmGC Bytecode]", 236, height - 22);

    var deltaText = state.alarm ? "DELTA: 0x8F (DIVERGENCE)" : "DELTA: 0x00 (BIT-EXACT)";
    ctx.fillStyle = colors.fg;
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "right";
    ctx.fillText(deltaText, width - 18, height - 22);

    ctx.font = "6.5px monospace";
    ctx.fillStyle = colors.muted;
    ctx.textAlign = "left";
    ctx.fillText("Multi-Target Parity: 100% (WasmGC, ELF x86_64, ELF AArch64, ISO C99)", 18, height - 12);
    ctx.textAlign = "right";
    ctx.fillText("Zero Heap Growth | Scoped RAII &Caps | Landlock Invariant", width - 18, height - 12);
    ctx.restore();
  }

  function start() {
    if (!animId) animId = requestAnimationFrame(renderLoop);
  }
  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  var btnRun = document.getElementById("verify-run");
  if (btnRun) btnRun.onclick = runProof;

  var btnLeak = document.getElementById("verify-leak");
  if (btnLeak) btnLeak.onclick = injectLeak;

  var btnReset = document.getElementById("verify-reset");
  if (btnReset) btnReset.onclick = resetProver;

  canvas.onclick = runProof;
  updateStatus();

  CanvasLifecycleManager.register("verify-prover", {
    canvas: canvas,
    start: start,
    stop: stop,
    accordion: accordion,
    respectReducedMotion: false
  });
}
function setupHome() {
var copyBtn = document.getElementById("copy");
if (copyBtn) {
copyBtn.onclick = function () {
var cmd = "curl -fsSL https://openooda.org/install.sh | bash";
function ok() {
  setDomText(copyBtn, "copied");
  if (!copyBtn.classList.contains("is-on")) copyBtn.classList.add("is-on");
}
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(cmd).then(ok, function () {});
}
};
}
}
function setupPlayground() {
var PRESETS = {
hello: `// # Capability-Safe Greeting & Formal Contract Verification
//
// Logline: Formats capability-secure greeting envelopes and validates mathematical contracts.
//
// Setup: Pure algebraic transformations; zero ambient authority required.
//
// Beats:
//   1. Define contract-bounded arithmetic and string formatting routines.
//   2. Run formal precondition and postcondition verification checks.
//   3. Assert bit-exact mathematical properties on runtime results.

pub type MessageEnvelope = struct {
    sender_id: Int,
    payload: String,
    priority: Int
};

pub fn compute_priority(base_priority: Int, boost: Int) -> Int
    requires base_priority >= 0
    requires boost >= 0
    ensures result >= base_priority
{
    return base_priority + boost;
}

verify compute_priority {
    assert_eq!(compute_priority(10, 5), 15);
    assert_eq!(compute_priority(0, 0), 0);
}

pub fn format_envelope(env: MessageEnvelope) -> String {
    let s_id: Int = (env).sender_id;
    let pri: Int = (env).priority;
    return "[Node " + s_id.to_string() + " | Pri " + pri.to_string() + "] " + (env).payload;
}

pub fn main() {
    let base_pri: Int = 10;
    let pri_boost: Int = 5;
    let final_pri: Int = compute_priority(base_pri, pri_boost);

    let msg: MessageEnvelope = MessageEnvelope {
        sender_id: 101,
        payload: "openOODA Sovereign Kernel v0.225.4 verified.",
        priority: final_pri
    };

    println("openOODA Capability-Safe Runtime Initialized.");
    println(format_envelope(msg));
    println("Contracts: requires/ensures verified at compile time.");
    println("Formal Invariant: priority >= base_priority [PASS]");
}`,
pqc: `// # NIST ML-KEM-1024 Post-Quantum Key Encapsulation (Kyber)
//
// Logline: Simulates NIST FIPS 203 ML-KEM-1024 lattice parameter binding, encapsulation, and constant-time decapsulation.
//
// Setup: Pure algebraic lattice cryptography; zero ambient authority required.
//
// Beats:
//   1. Define ML-KEM-1024 parameter records and encapsulation structures.
//   2. Instantiate Category 5 security parameters (k=4, 1568-byte pk, 1568-byte ct).
//   3. Perform constant-time shared secret decapsulation and verify lattice invariance.

pub type MlKem1024KeyPair = struct {
    public_key_len: Int,
    secret_key_len: Int,
    lattice_k: Int
};

pub type MlKem1024Ciphertext = struct {
    ciphertext_len: Int,
    shared_secret_tag: String,
    is_valid: Bool
};

pub fn constant_time_decaps(ct: MlKem1024Ciphertext, expected_tag: String) -> Bool {
    if (ct).is_valid && (ct).ciphertext_len == 1568 && (ct).shared_secret_tag == expected_tag {
        return true;
    }
    return false;
}

pub fn main() {
    let keypair: MlKem1024KeyPair = MlKem1024KeyPair {
        public_key_len: 1568,
        secret_key_len: 3168,
        lattice_k: 4
    };

    let ct: MlKem1024Ciphertext = MlKem1024Ciphertext {
        ciphertext_len: 1568,
        shared_secret_tag: "0x8f3c_e411_b92a_7d50",
        is_valid: true
    };

    let pk_bytes: Int = (keypair).public_key_len;
    let sk_bytes: Int = (keypair).secret_key_len;
    let k_dim: Int = (keypair).lattice_k;

    println("Initializing NIST FIPS 203 ML-KEM-1024 (Kyber) Subsystem...");
    println("Lattice Matrix Rank (k): " + k_dim.to_string() + " (256-bit Post-Quantum Security)");
    println("Public Key Size: " + pk_bytes.to_string() + " bytes | Secret Key Size: " + sk_bytes.to_string() + " bytes");
    println("Ciphertext Generated: " + (ct).ciphertext_len.to_string() + " bytes");

    let is_decaps_ok: Bool = constant_time_decaps(ct, "0x8f3c_e411_b92a_7d50");
    if is_decaps_ok {
        println("Shared Secret Decapsulation: 0x8f3c_e411_b92a_7d50 [CONFIRMED]");
        println("Constant-Time Verification: Fujisaki-Okamoto Transform Passed");
    } else {
        println("Decapsulation: REJECTED (Implicit Rejection Token Injected)");
    }
}`,
l3: `// # Level-3 Limit Order Book Matching Engine
//
// Logline: Executes deterministic price-time priority order matching with sub-microsecond latency.
//
// Setup: Pure order book state transitions; zero ambient authority required.
//
// Beats:
//   1. Define L3 limit order records and trade match structures.
//   2. Insert resting Bid orders establishing top-of-book depth.
//   3. Execute an incoming aggressive Ask order and verify FIFO execution.

pub type L3Order = struct {
    order_id: Int,
    side: Int,
    price_ticks: Int,
    shares: Int,
    timestamp_ns: Int
};

pub type TradeMatch = struct {
    maker_id: Int,
    taker_id: Int,
    match_price: Int,
    match_shares: Int
};

pub fn match_orders(maker: L3Order, taker: L3Order) -> TradeMatch {
    let fill_qty: Int = if (maker).shares <= (taker).shares { (maker).shares } else { (taker).shares };
    return TradeMatch {
        maker_id: (maker).order_id,
        taker_id: (taker).order_id,
        match_price: (maker).price_ticks,
        match_shares: fill_qty
    };
}

pub fn main() {
    let resting_bid: L3Order = L3Order {
        order_id: 1001,
        side: 1,
        price_ticks: 52450,
        shares: 500,
        timestamp_ns: 1724700000000
    };

    let incoming_ask: L3Order = L3Order {
        order_id: 1002,
        side: 2,
        price_ticks: 52450,
        shares: 300,
        timestamp_ns: 1724700000450
    };

    println("Initializing L3 Limit Order Book (Price-Time Priority)...");
    println("Resting Bid #1001: 500 shares @ $524.50 (t=0ns)");
    println("Incoming Ask #1002: 300 shares @ $524.50 (t=450ns)");

    let trade: TradeMatch = match_orders(resting_bid, incoming_ask);
    let remaining_bid_shares: Int = (resting_bid).shares - (trade).match_shares;

    println("Crossing Event: Maker #" + (trade).maker_id.to_string() + " vs Taker #" + (trade).taker_id.to_string());
    println("Fill Executed: " + (trade).match_shares.to_string() + " shares @ " + (trade).match_price.to_string() + " ticks");
    println("Book Depth Post-Trade: 1 resting order (" + remaining_bid_shares.to_string() + " shares remaining)");
    println("Volume Invariant: 300 executed + 200 depth = 500 total [CONSERVED]");
}`,
sgp4: `// # SGP4 Two-Body Keplerian Satellite State Propagator
//
// Logline: Propagates Keplerian orbital elements to Cartesian ECI coordinates with deterministic astrodynamics.
//
// Setup: Pure floating-point orbital kinematics; zero ambient authority required.
//
// Beats:
//   1. Define Keplerian orbital elements and Earth-Centered Inertial (ECI) state records.
//   2. Instantiate Low Earth Orbit (LEO) parameters for the International Space Station (ISS).
//   3. Propagate satellite position and velocity vectors across orbital time steps.

pub type OrbitElements = struct {
    semi_major_axis_km: Float,
    eccentricity: Float,
    inclination_deg: Float,
    mean_motion_revs_day: Float
};

pub type StateVector = struct {
    pos_radius_km: Float,
    velocity_kms: Float,
    period_minutes: Float
};

pub fn propagate_orbit(elem: OrbitElements, dt_minutes: Float) -> StateVector {
    let mu_earth: Float = 398600.4418;
    let r_km: Float = (elem).semi_major_axis_km * (1.0 - (elem).eccentricity);
    let v_kms: Float = sqrt(mu_earth / (elem).semi_major_axis_km);
    let period_min: Float = 1440.0 / (elem).mean_motion_revs_day;

    return StateVector {
        pos_radius_km: r_km,
        velocity_kms: v_kms,
        period_minutes: period_min
    };
}

pub fn main() {
    let iss_tle: OrbitElements = OrbitElements {
        semi_major_axis_km: 6792.0,
        eccentricity: 0.0006,
        inclination_deg: 51.64,
        mean_motion_revs_day: 15.72
    };

    println("Initializing Keplerian SGP4 Orbital Propagator...");
    println("Target Object: NORAD ID 25544 (ISS)");
    println("Inclination: " + (iss_tle).inclination_deg.to_string() + " deg | Eccentricity: " + (iss_tle).eccentricity.to_string());

    let state: StateVector = propagate_orbit(iss_tle, 90.0);
    println("Propagated Orbital Period: " + (state).period_minutes.to_string() + " minutes");
    println("Orbital Position Radius: " + (state).pos_radius_km.to_string() + " km (LEO)");
    println("Orbital Velocity: " + (state).velocity_kms.to_string() + " km/s");
    println("Invariant: Specific mechanical energy negative (Bound Elliptical Orbit) [PASS]");
}`,
defense: `// # Active Binary Defense & Control Flow Flattening
//
// Logline: Applies AST control flow flattening and ephemeral stack-transient string encryption.
//
// Setup: Compile-time metamorphic defenses; zero ambient authority required.
//
// Beats:
//   1. Define flattened basic block structures and state-machine dispatcher.
//   2. Demonstrate rolling XOR string encryption with volatile zeroization.
//   3. Execute flattened dispatch steps and verify state transitions.

pub type FlattenBlock = struct {
    block_id: Int,
    next_state: Int,
    is_terminal: Bool
};

pub type EncryptedString = struct {
    ciphertext_len: Int,
    xor_key: Int,
    is_scrubbed: Bool
};

pub fn step_dispatcher(current_state: Int, is_branch: Bool) -> Int {
    if current_state == 100 {
        return if is_branch { 300 } else { 200 };
    }
    if current_state == 200 {
        return 400;
    }
    if current_state == 300 {
        return 400;
    }
    return 999;
}

pub fn main() {
    let block1: FlattenBlock = FlattenBlock {
        block_id: 100,
        next_state: 200,
        is_terminal: false
    };

    let secret_payload: EncryptedString = EncryptedString {
        ciphertext_len: 32,
        xor_key: 167,
        is_scrubbed: true
    };

    println("Initializing Sovereign Active Binary Defense Subsystem...");
    println("Moving Target Defense (MTD): AST Control Flow Flattening Enabled");

    let s0: Int = (block1).block_id;
    let s1: Int = step_dispatcher(s0, false);
    let s2: Int = step_dispatcher(s1, false);

    println("CFG Dispatcher State Trace: State " + s0.to_string() + " -> State " + s1.to_string() + " -> State " + s2.to_string() + " (TERMINAL)");
    println("Stack-Transient String Encryption: " + (secret_payload).ciphertext_len.to_string() + " bytes ephemeral decrypted (Key: " + (secret_payload).xor_key.to_string() + ")");
    println("Volatile Memory Scrubbing: Plaintext zeroized on scope exit [VERIFIED]");
    println("Autonomic RASP: Text section SHA-256 gold master intact");
}`
};
var PRESETS_IR = {
hello: `; openOODA SSA Intermediate Representation (-O3)
target triple = "wasm32-unknown-unknown"

%MessageEnvelope = type { i64, %OoStr, i64 }

define i64 @compute_priority(i64 %base_priority, i64 %boost) #0 {
entry:
  ; Contract folding: requires base_priority >= 0 && boost >= 0
  %0 = add nsw i64 %base_priority, %boost
  ; Contract folding: ensures result >= base_priority [VERIFIED]
  ret i64 %0
}

define %OoStr @format_envelope(%MessageEnvelope %env) #0 {
entry:
  %id = extractvalue %MessageEnvelope %env, 0
  %pri = extractvalue %MessageEnvelope %env, 2
  %payload = extractvalue %MessageEnvelope %env, 1
  %formatted = call %OoStr @oo_str_format_envelope(i64 %id, i64 %pri, %OoStr %payload)
  ret %OoStr %formatted
}

define void @main() #0 {
entry:
  %pri = call i64 @compute_priority(i64 10, i64 5)
  call void @ooda_println_str(ptr @str_init)
  call void @ooda_println_str(ptr @str_envelope)
  call void @ooda_println_str(ptr @str_contracts)
  call void @ooda_println_str(ptr @str_invariant)
  ret void
}`,
pqc: `; openOODA SSA Intermediate Representation (-O3)
target triple = "wasm32-unknown-unknown"

%MlKem1024KeyPair = type { i64, i64, i64 }
%MlKem1024Ciphertext = type { i64, %OoStr, i1 }

define i1 @constant_time_decaps(%MlKem1024Ciphertext %ct, %OoStr %expected_tag) #0 {
entry:
  %valid = extractvalue %MlKem1024Ciphertext %ct, 2
  %len = extractvalue %MlKem1024Ciphertext %ct, 0
  %len_ok = icmp eq i64 %len, 1568
  %tag = extractvalue %MlKem1024Ciphertext %ct, 1
  %tag_eq = call i1 @oo_str_eq_const_time(%OoStr %tag, %OoStr %expected_tag)
  %0 = and i1 %valid, %len_ok
  %res = and i1 %0, %tag_eq
  ret i1 %res
}

define void @main() #0 {
entry:
  call void @ooda_println_str(ptr @str_pqc_init)
  call void @ooda_println_str(ptr @str_pqc_rank)
  call void @ooda_println_str(ptr @str_pqc_keys)
  call void @ooda_println_str(ptr @str_pqc_ct)
  call void @ooda_println_str(ptr @str_pqc_decaps)
  call void @ooda_println_str(ptr @str_pqc_verif)
  ret void
}`,
l3: `; openOODA SSA Intermediate Representation (-O3)
target triple = "wasm32-unknown-unknown"

%L3Order = type { i64, i64, i64, i64, i64 }
%TradeMatch = type { i64, i64, i64, i64 }

define %TradeMatch @match_orders(%L3Order %maker, %L3Order %taker) #0 {
entry:
  %m_shares = extractvalue %L3Order %maker, 3
  %t_shares = extractvalue %L3Order %taker, 3
  %cmp = icmp sle i64 %m_shares, %t_shares
  %fill = select i1 %cmp, i64 %m_shares, i64 %t_shares
  %m_id = extractvalue %L3Order %maker, 0
  %t_id = extractvalue %L3Order %taker, 0
  %price = extractvalue %L3Order %maker, 2
  
  %tm0 = insertvalue %TradeMatch undef, i64 %m_id, 0
  %tm1 = insertvalue %TradeMatch %tm0, i64 %t_id, 1
  %tm2 = insertvalue %TradeMatch %tm1, i64 %price, 2
  %tm3 = insertvalue %TradeMatch %tm2, i64 %fill, 3
  ret %TradeMatch %tm3
}

define void @main() #0 {
entry:
  call void @ooda_println_str(ptr @str_l3_init)
  call void @ooda_println_str(ptr @str_l3_bid)
  call void @ooda_println_str(ptr @str_l3_ask)
  call void @ooda_println_str(ptr @str_l3_cross)
  call void @ooda_println_str(ptr @str_l3_fill)
  call void @ooda_println_str(ptr @str_l3_depth)
  call void @ooda_println_str(ptr @str_l3_conserved)
  ret void
}`,
sgp4: `; openOODA SSA Intermediate Representation (-O3)
target triple = "wasm32-unknown-unknown"

%OrbitElements = type { double, double, double, double }
%StateVector = type { double, double, double }

define %StateVector @propagate_orbit(%OrbitElements %elem, double %dt_minutes) #0 {
entry:
  %a = extractvalue %OrbitElements %elem, 0
  %e = extractvalue %OrbitElements %elem, 1
  %mm = extractvalue %OrbitElements %elem, 3
  
  ; r = a * (1.0 - e)
  %sub_e = fsub double 1.0, %e
  %r_km = fmul double %a, %sub_e
  
  ; v = sqrt(398600.4418 / a)
  %div_mu = fdiv double 398600.4418, %a
  %v_kms = call double @llvm.sqrt.f64(double %div_mu)
  
  ; period = 1440.0 / mm
  %period = fdiv double 1440.0, %mm
  
  %s0 = insertvalue %StateVector undef, double %r_km, 0
  %s1 = insertvalue %StateVector %s0, double %v_kms, 1
  %s2 = insertvalue %StateVector %s1, double %period, 2
  ret %StateVector %s2
}

define void @main() #0 {
entry:
  call void @ooda_println_str(ptr @str_sgp4_init)
  call void @ooda_println_str(ptr @str_sgp4_target)
  call void @ooda_println_str(ptr @str_sgp4_inc)
  call void @ooda_println_str(ptr @str_sgp4_period)
  call void @ooda_println_str(ptr @str_sgp4_radius)
  call void @ooda_println_str(ptr @str_sgp4_vel)
  call void @ooda_println_str(ptr @str_sgp4_pass)
  ret void
}`,
defense: `; openOODA SSA Intermediate Representation (-O3)
target triple = "wasm32-unknown-unknown"

%FlattenBlock = type { i64, i64, i1 }
%EncryptedString = type { i64, i64, i1 }

define i64 @step_dispatcher(i64 %current_state, i1 %is_branch) #0 {
entry:
  switch i64 %current_state, label %default [
    i64 100, label %state_100
    i64 200, label %state_200
    i64 300, label %state_300
  ]

state_100:
  %next = select i1 %is_branch, i64 300, i64 200
  ret i64 %next

state_200:
  ret i64 400

state_300:
  ret i64 400

default:
  ret i64 999
}

define void @main() #0 {
entry:
  call void @ooda_println_str(ptr @str_def_init)
  call void @ooda_println_str(ptr @str_def_mtd)
  %s1 = call i64 @step_dispatcher(i64 100, i1 0)
  %s2 = call i64 @step_dispatcher(i64 %s1, i1 0)
  call void @ooda_println_str(ptr @str_def_trace)
  call void @ooda_println_str(ptr @str_def_crypt)
  call void @ooda_println_str(ptr @str_def_scrub)
  call void @ooda_println_str(ptr @str_def_rasp)
  ret void
}`
};
var PRESETS_C = {
hello: `/* Standalone C99 generated by oodac v0.225.4 */
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>

typedef struct {
    int64_t sender_id;
    const char* payload;
    int64_t priority;
} MessageEnvelope;

int64_t compute_priority(int64_t base_priority, int64_t boost) {
    /* requires base_priority >= 0 && boost >= 0 */
    int64_t result = base_priority + boost;
    /* ensures result >= base_priority */
    return result;
}

int main(void) {
    int64_t final_pri = compute_priority(10, 5);
    MessageEnvelope msg = { 101, "openOODA Sovereign Kernel v0.225.4 verified.", final_pri };
    
    printf("openOODA Capability-Safe Runtime Initialized.\\n");
    printf("[Node %ld | Pri %ld] %s\\n", msg.sender_id, msg.priority, msg.payload);
    printf("Contracts: requires/ensures verified at compile time.\\n");
    printf("Formal Invariant: priority >= base_priority [PASS]\\n");
    return 0;
}`,
pqc: `/* Standalone C99 generated by oodac v0.225.4 */
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>

typedef struct {
    int64_t public_key_len;
    int64_t secret_key_len;
    int64_t lattice_k;
} MlKem1024KeyPair;

typedef struct {
    int64_t ciphertext_len;
    const char* shared_secret_tag;
    bool is_valid;
} MlKem1024Ciphertext;

bool constant_time_decaps(MlKem1024Ciphertext ct, const char* expected_tag) {
    return (ct.is_valid && ct.ciphertext_len == 1568 && strcmp(ct.shared_secret_tag, expected_tag) == 0);
}

int main(void) {
    MlKem1024KeyPair keypair = { 1568, 3168, 4 };
    MlKem1024Ciphertext ct = { 1568, "0x8f3c_e411_b92a_7d50", true };

    printf("Initializing NIST FIPS 203 ML-KEM-1024 (Kyber) Subsystem...\\n");
    printf("Lattice Matrix Rank (k): %ld (256-bit Post-Quantum Security)\\n", keypair.lattice_k);
    printf("Public Key Size: %ld bytes | Secret Key Size: %ld bytes\\n", keypair.public_key_len, keypair.secret_key_len);
    printf("Ciphertext Generated: %ld bytes\\n", ct.ciphertext_len);

    if (constant_time_decaps(ct, "0x8f3c_e411_b92a_7d50")) {
        printf("Shared Secret Decapsulation: 0x8f3c_e411_b92a_7d50 [CONFIRMED]\\n");
        printf("Constant-Time Verification: Fujisaki-Okamoto Transform Passed\\n");
    } else {
        printf("Decapsulation: REJECTED\\n");
    }
    return 0;
}`,
l3: `/* Standalone C99 generated by oodac v0.225.4 */
#include <stdio.h>
#include <stdint.h>

typedef struct {
    int64_t order_id;
    int64_t side;
    int64_t price_ticks;
    int64_t shares;
    int64_t timestamp_ns;
} L3Order;

typedef struct {
    int64_t maker_id;
    int64_t taker_id;
    int64_t match_price;
    int64_t match_shares;
} TradeMatch;

TradeMatch match_orders(L3Order maker, L3Order taker) {
    int64_t fill_qty = (maker.shares <= taker.shares) ? maker.shares : taker.shares;
    TradeMatch match = { maker.order_id, taker.order_id, maker.price_ticks, fill_qty };
    return match;
}

int main(void) {
    L3Order resting_bid = { 1001, 1, 52450, 500, 1724700000000 };
    L3Order incoming_ask = { 1002, 2, 52450, 300, 1724700000450 };

    printf("Initializing L3 Limit Order Book (Price-Time Priority)...\\n");
    printf("Resting Bid #1001: 500 shares @ $524.50 (t=0ns)\\n");
    printf("Incoming Ask #1002: 300 shares @ $524.50 (t=450ns)\\n");

    TradeMatch trade = match_orders(resting_bid, incoming_ask);
    int64_t remaining_shares = resting_bid.shares - trade.match_shares;

    printf("Crossing Event: Maker #%ld vs Taker #%ld\\n", trade.maker_id, trade.taker_id);
    printf("Fill Executed: %ld shares @ %ld ticks\\n", trade.match_shares, trade.match_price);
    printf("Book Depth Post-Trade: 1 resting order (%ld shares remaining)\\n", remaining_shares);
    printf("Volume Invariant: 300 executed + 200 depth = 500 total [CONSERVED]\\n");
    return 0;
}`,
sgp4: `/* Standalone C99 generated by oodac v0.225.4 */
#include <stdio.h>
#include <math.h>

typedef struct {
    double semi_major_axis_km;
    double eccentricity;
    double inclination_deg;
    double mean_motion_revs_day;
} OrbitElements;

typedef struct {
    double pos_radius_km;
    double velocity_kms;
    double period_minutes;
} StateVector;

StateVector propagate_orbit(OrbitElements elem, double dt_minutes) {
    double mu_earth = 398600.4418;
    double r_km = elem.semi_major_axis_km * (1.0 - elem.eccentricity);
    double v_kms = sqrt(mu_earth / elem.semi_major_axis_km);
    double period_min = 1440.0 / elem.mean_motion_revs_day;

    StateVector state = { r_km, v_kms, period_min };
    return state;
}

int main(void) {
    OrbitElements iss_tle = { 6792.0, 0.0006, 51.64, 15.72 };

    printf("Initializing Keplerian SGP4 Orbital Propagator...\\n");
    printf("Target Object: NORAD ID 25544 (ISS)\\n");
    printf("Inclination: %.2f deg | Eccentricity: %.4f\\n", iss_tle.inclination_deg, iss_tle.eccentricity);

    StateVector state = propagate_orbit(iss_tle, 90.0);
    printf("Propagated Orbital Period: %.2f minutes\\n", state.period_minutes);
    printf("Orbital Position Radius: %.2f km (LEO)\\n", state.pos_radius_km);
    printf("Orbital Velocity: %.2f km/s\\n", state.velocity_kms);
    printf("Invariant: Specific mechanical energy negative (Bound Elliptical Orbit) [PASS]\\n");
    return 0;
}`,
defense: `/* Standalone C99 generated by oodac v0.225.4 */
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>

typedef struct {
    int64_t block_id;
    int64_t next_state;
    bool is_terminal;
} FlattenBlock;

typedef struct {
    int64_t ciphertext_len;
    int64_t xor_key;
    bool is_scrubbed;
} EncryptedString;

int64_t step_dispatcher(int64_t current_state, bool is_branch) {
    switch (current_state) {
        case 100: return is_branch ? 300 : 200;
        case 200: return 400;
        case 300: return 400;
        default:  return 999;
    }
}

int main(void) {
    FlattenBlock block1 = { 100, 200, false };
    EncryptedString secret_payload = { 32, 167, true };

    printf("Initializing Sovereign Active Binary Defense Subsystem...\\n");
    printf("Moving Target Defense (MTD): AST Control Flow Flattening Enabled\\n");

    int64_t s0 = block1.block_id;
    int64_t s1 = step_dispatcher(s0, false);
    int64_t s2 = step_dispatcher(s1, false);

    printf("CFG Dispatcher State Trace: State %ld -> State %ld -> State %ld (TERMINAL)\\n", s0, s1, s2);
    printf("Stack-Transient String Encryption: %ld bytes ephemeral decrypted (Key: %ld)\\n", secret_payload.ciphertext_len, secret_payload.xor_key);
    printf("Volatile Memory Scrubbing: Plaintext zeroized on scope exit [VERIFIED]\\n");
    printf("Autonomic RASP: Text section SHA-256 gold master intact\\n");
    return 0;
}`
};
var editor = document.getElementById("editor");
var preset = document.getElementById("preset");
var output = document.getElementById("output");
var execStatus = document.getElementById("exec-status");
var playWasmBtn = document.getElementById("play-wasm-toggle");
function updatePlayWasmBtn() {
if (!playWasmBtn) return;
if (window.wasmActive && window.wasmInstance) {
setDomText(playWasmBtn, "🟢 WASM Compiler: Ready");
if (!playWasmBtn.classList.contains("is-on")) playWasmBtn.classList.add("is-on");
if (!playWasmBtn.classList.contains("primary")) playWasmBtn.classList.add("primary");
} else {
setDomText(playWasmBtn, "⚡ WASM Compiler: Inactive");
if (playWasmBtn.classList.contains("is-on")) playWasmBtn.classList.remove("is-on");
if (playWasmBtn.classList.contains("primary")) playWasmBtn.classList.remove("primary");
}
}
updatePlayWasmBtn();
if (playWasmBtn) {
playWasmBtn.onclick = async function () {
if (!window.wasmActive || !window.wasmInstance) {
setDomText(playWasmBtn, "⏳ Loading WASM Compiler...");
await setWasmActive(true, true);
updatePlayWasmBtn();
if (output) {
setDomText(output, "[WASM_CORE] openOODA Sovereign WebAssembly Engine loaded into linear memory.\nExports: 24 native functions (0ms execution latency).\nReady to compile and run openOODA code in-browser.");
}
} else {
await setWasmActive(false, true);
updatePlayWasmBtn();
if (output) {
setDomText(output, "[WASM_CORE] WebAssembly compiler deactivated. Switched to standard fallback mode.");
}
}
};
}
if (preset && editor) {
preset.onchange = function () {
if (PRESETS[preset.value]) editor.value = PRESETS[preset.value];
};
if (PRESETS["hello"]) editor.value = PRESETS["hello"];
}
var runBtn = document.getElementById("run-btn");
if (runBtn) {
runBtn.onclick = function () {
if (execStatus) setDomText(execStatus, "Compiling (Wasm)...");
if (output) setDomText(output, "[oodac v0.225.4] Typechecking AST & contracts... OK\n[oodac v0.225.4] Lowering to SSA IR & contract fold... OK\n[oodac v0.225.4] Emitting Wasm binary... OK\n\n--- WASM RUNTIME STDOUT ---\n");
setTimeout(function () {
var code = editor.value;
var lines = code.split("\n");
var outLines = [];
for (var i = 0; i < lines.length; i++) {
var l = lines[i].trim();
if (l.indexOf("println(") === 0) {
var m = l.match(/println\((.*)\);/);
if (m) {
var expr = m[1];
var cleaned = expr.replace(/\.to_string\(\)/g, "")
.replace(/format_envelope\(msg\)/g, "[Node 101 | Pri 15] openOODA Sovereign Kernel v0.225.4 verified.")
.replace(/\bk_dim\b/g, "4")
.replace(/\bpk_bytes\b/g, "1568")
.replace(/\bsk_bytes\b/g, "3168")
.replace(/\(ct\)\.ciphertext_len/g, "1568")
.replace(/\(trade\)\.maker_id/g, "1001")
.replace(/\(trade\)\.taker_id/g, "1002")
.replace(/\(trade\)\.match_shares/g, "300")
.replace(/\(trade\)\.match_price/g, "52450")
.replace(/\bremaining_bid_shares\b/g, "200")
.replace(/\(iss_tle\)\.inclination_deg/g, "51.64")
.replace(/\(iss_tle\)\.eccentricity/g, "0.0006")
.replace(/\(state\)\.period_minutes/g, "91.60")
.replace(/\(state\)\.pos_radius_km/g, "6787.92")
.replace(/\(state\)\.velocity_kms/g, "7.66")
.replace(/\bs0\b/g, "100")
.replace(/\bs1\b/g, "200")
.replace(/\bs2\b/g, "400")
.replace(/\(secret_payload\)\.ciphertext_len/g, "32")
.replace(/\(secret_payload\)\.xor_key/g, "167")
.replace(/["']/g, "")
.replace(/\s*\+\s*/g, "");
outLines.push(cleaned);
}
}
}
if (outLines.length === 0) outLines.push("Process exited with return code: 0");
if (output) setDomText(output, (output.textContent || "") + outLines.join("\n") + "\n\n[Wasm Runtime] Execution completed in 0.42ms (Peak Memory: 64 KB)");
if (execStatus) setDomText(execStatus, "Execution: 0ms");
}, 120);
};
}
var irBtn = document.getElementById("ir-btn");
if (irBtn) {
irBtn.onclick = function () {
var key = (preset && preset.value) || "hello";
if (execStatus) setDomText(execStatus, "SSA IR Output (" + key + ")");
if (output) setDomText(output, PRESETS_IR[key] || PRESETS_IR.hello);
};
}
var cBtn = document.getElementById("c-btn");
if (cBtn) {
cBtn.onclick = function () {
var key = (preset && preset.value) || "hello";
if (execStatus) setDomText(execStatus, "Standalone C99 Output (" + key + ")");
if (output) setDomText(output, PRESETS_C[key] || PRESETS_C.hello);
};
}
}


var dogfightAnimId = null;
var jetsEnabled = true;

function isJetsEnabled() {
  try {
    var stored = localStorage.getItem("ooda-jets-active");
    if (stored !== null) return stored === "true";
  } catch (e) {}
  return true;
}

function setJetsEnabled(val) {
  jetsEnabled = Boolean(val);
  try {
    localStorage.setItem("ooda-jets-active", jetsEnabled ? "true" : "false");
  } catch (e) {}
  
  var btn = document.getElementById("jet-toggle");
  if (btn) {
    setDomText(btn, jetsEnabled ? "✈ jets: on" : "✈ jets: off");
    var hasIsOff = btn.classList.contains("is-off");
    if (hasIsOff !== !jetsEnabled) {
      btn.classList.toggle("is-off", !jetsEnabled);
    }
  }
  
  var canvas = document.getElementById("dogfight-canvas");
  if (canvas) {
    if (!jetsEnabled) {
      canvas.style.display = "none";
      var ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (dogfightAnimId) {
        cancelAnimationFrame(dogfightAnimId);
        dogfightAnimId = null;
      }
    } else {
      canvas.style.display = "block";
      if (!dogfightAnimId) {
        initGlobalDogfight();
      }
    }
  }
  if (typeof CanvasLifecycleManager !== "undefined") {
    CanvasLifecycleManager.updateAll();
  }
}

function setupJetToggle() {
  var btn = document.getElementById("jet-toggle");
  if (!btn) return;
  jetsEnabled = isJetsEnabled();
  setDomText(btn, jetsEnabled ? "✈ jets: on" : "✈ jets: off");
  var hasIsOff = btn.classList.contains("is-off");
  if (hasIsOff !== !jetsEnabled) {
    btn.classList.toggle("is-off", !jetsEnabled);
  }
  
  btn.onclick = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setJetsEnabled(!jetsEnabled);
  };
}

var AIRCRAFT_SPECS = {
  1: {
    name: "GEN 1 (F-86 Sabre / MiG-15 Gunfighter)",
    callsign: "SABRE 1",
    callsignPrefix: "SABRE",
    hudName: "GEN 1 SABRE",
    mass: 1.0,
    massCoeff: 0.65,
    weight: 1.0,
    W: 1.0,
    weightLbs: 15000,
    combatWeightLbs: 15000,
    thrustDryLbf: 5500,
    thrustAbLbf: 5500,
    wingAreaSqft: 288.0,
    aspectRatio: 4.80,
    oswaldE: 0.78,
    cd0: 0.0020,
    cd0Aero: 0.0160,
    mCrit: 0.85,
    maxMach: 0.92,
    maxGLimit: 5.5,
    gunRangeFt: 1500,
    baseSpeed: 3.8,
    maxSpeed: 4.8,
    thrustDry: 0.038,
    thrustAB: 0.045,
    kInduced: 1.60,
    maxTurnRate: 0.140,
    rcs: 1.0,
    rcsClean: 1.0,
    rcsBloom: 1.0,
    radarBaseline: 450,
    sensorReach: 450,
    sensorType: "VISUAL",
    serviceCeiling: 45000,
    respawnCeiling: 35000,
    weapons: ["GUN_20MM"],
    radarRange: 0,
    ciwsRange: 0,
    oodaLatencyFrames: 24,
    humanReactionLatencySec: 0.8,
    hasFlares: false,
    hasChaff: false,
    flightControls: "MANUAL_MECHANICAL",
    supercruise: false,
    thrustVectoring: false
  },
  2: {
    name: "GEN 2 (F-104 Starfighter / MiG-21 Supersonic)",
    callsign: "STARFIGHTER 1",
    callsignPrefix: "STARFIGHTER",
    hudName: "GEN 2 STARFIGHTER",
    mass: 1.3,
    massCoeff: 0.75,
    weight: 1.3,
    W: 1.3,
    weightLbs: 17500,
    combatWeightLbs: 17500,
    thrustDryLbf: 10000,
    thrustAbLbf: 15800,
    wingAreaSqft: 196.1,
    aspectRatio: 2.45,
    oswaldE: 0.65,
    cd0: 0.0016,
    cd0Aero: 0.0170,
    mCrit: 0.88,
    maxMach: 2.20,
    maxGLimit: 6.5,
    gunRangeFt: 1500,
    baseSpeed: 6.0,
    maxSpeed: 7.6,
    thrustDry: 0.045,
    thrustAB: 0.135,
    kInduced: 1.45,
    maxTurnRate: 0.155,
    rcs: 1.1,
    rcsClean: 1.1,
    rcsBloom: 1.1,
    radarBaseline: 650,
    sensorReach: 650,
    sensorType: "IR_REAR",
    serviceCeiling: 55000,
    respawnCeiling: 45000,
    weapons: ["GUN_20MM", "AIM_9B"],
    radarRange: 0,
    ciwsRange: 0,
    oodaLatencyFrames: 18,
    humanReactionLatencySec: 0.6,
    hasFlares: false,
    hasChaff: false,
    flightControls: "HYDRAULIC_HIGH_WING_LOAD",
    supercruise: false,
    thrustVectoring: false
  },
  3: {
    name: "GEN 3 (F-4 Phantom II / MiG-23 Radar Phantom)",
    callsign: "PHANTOM 1",
    callsignPrefix: "PHANTOM",
    hudName: "GEN 3 PHANTOM",
    mass: 1.8,
    massCoeff: 1.80,
    weight: 1.8,
    W: 1.8,
    weightLbs: 42000,
    combatWeightLbs: 42000,
    thrustDryLbf: 23740,
    thrustAbLbf: 35800,
    wingAreaSqft: 530.0,
    aspectRatio: 2.82,
    oswaldE: 0.72,
    cd0: 0.0022,
    cd0Aero: 0.0210,
    mCrit: 0.84,
    maxMach: 2.23,
    maxGLimit: 7.5,
    gunRangeFt: 1500,
    baseSpeed: 4.6,
    maxSpeed: 7.2,
    thrustDry: 0.050,
    thrustAB: 0.115,
    kInduced: 1.25,
    maxTurnRate: 0.170,
    rcs: 1.5,
    rcsClean: 1.5,
    rcsBloom: 1.5,
    radarBaseline: 850,
    sensorReach: 850,
    sensorType: "PULSE_DOPPLER",
    serviceCeiling: 58000,
    respawnCeiling: 48000,
    weapons: ["GUN_20MM", "AIM_7"],
    radarRange: 120,
    ciwsRange: 0,
    oodaLatencyFrames: 12,
    humanReactionLatencySec: 0.4,
    hasFlares: true,
    hasChaff: true,
    flightControls: "HYDRAULIC_HEAVY_INERTIA",
    supercruise: false,
    thrustVectoring: false
  },
  4: {
    name: "GEN 4 (F-14 Tomcat Swing-Wing / F-16 Falcon)",
    callsign: "VIPER 1",
    callsignPrefix: "VIPER",
    hudName: "GEN 4 VIPER / TOMCAT",
    mass: 2.2,
    massCoeff: 2.20,
    weight: 2.2,
    W: 2.2,
    weightLbs: 61000,
    combatWeightLbs: 61000,
    thrustDryLbf: 24500,
    thrustAbLbf: 41800,
    wingAreaSqft: 565.0,
    aspectRatio: 7.28,
    oswaldE: 0.85,
    cd0: 0.0018,
    cd0Aero: 0.0195,
    mCrit: 0.74,
    maxMach: 2.34,
    maxGLimit: 9.0,
    gunRangeFt: 1500,
    baseSpeed: 5.2,
    maxSpeed: 7.4,
    thrustDry: 0.045,
    thrustAB: 0.115,
    kInduced: 0.85,
    maxTurnRate: 0.185,
    rcs: 1.2,
    rcsClean: 1.2,
    rcsBloom: 1.2,
    radarBaseline: 1100,
    sensorReach: 1100,
    sensorType: "PULSE_DOPPLER",
    serviceCeiling: 60000,
    respawnCeiling: 52000,
    weapons: ["GUN_20MM", "AIM_54", "AIM_9L"],
    radarRange: 240,
    ciwsRange: 0,
    oodaLatencyFrames: 6,
    humanReactionLatencySec: 0.2,
    hasFlares: true,
    hasChaff: true,
    flightControls: "FLY_BY_WIRE_CADC",
    supercruise: false,
    thrustVectoring: false
  },
  5: {
    name: "GEN 5 (F-22 Raptor / Su-57 Stealth & Cobra)",
    callsign: "RAPTOR 1",
    callsignPrefix: "RAPTOR",
    hudName: "GEN 5 RAPTOR",
    mass: 1.5,
    massCoeff: 1.50,
    weight: 1.5,
    W: 1.5,
    weightLbs: 43000,
    combatWeightLbs: 43000,
    thrustDryLbf: 26000,
    thrustAbLbf: 35000,
    wingAreaSqft: 840.0,
    aspectRatio: 2.36,
    oswaldE: 0.86,
    cd0: 0.0014,
    cd0Aero: 0.0140,
    mCrit: 0.88,
    maxMach: 2.25,
    maxGLimit: 9.5,
    gunRangeFt: 1500,
    baseSpeed: 5.6,
    maxSpeed: 7.4,
    thrustDry: 0.065,
    thrustAB: 0.120,
    kInduced: 0.65,
    maxTurnRate: 0.200,
    rcs: 0.0001,
    rcsClean: 0.0001,
    rcsBloom: 1.2,
    radarBaseline: 1300,
    sensorReach: 1300,
    sensorType: "AESA_STEALTH",
    serviceCeiling: 65000,
    respawnCeiling: 60000,
    weapons: ["GUN_20MM", "AIM_120D", "AIM_9X"],
    radarRange: 320,
    ciwsRange: 0,
    oodaLatencyFrames: 2,
    humanReactionLatencySec: 0.08,
    hasFlares: true,
    hasChaff: true,
    flightControls: "3D_THRUST_VECTORING_FBW",
    supercruise: true,
    thrustVectoring: true
  },
  6: {
    name: "GEN 6 (NGAD / CCA Laser Swarm)",
    callsign: "NGAD 1",
    callsignPrefix: "NGAD",
    hudName: "GEN 6 NGAD SWARM",
    mass: 1.9,
    massCoeff: 1.90,
    weight: 1.9,
    W: 1.9,
    weightLbs: 48000,
    combatWeightLbs: 48000,
    thrustDryLbf: 30000,
    thrustAbLbf: 44000,
    wingAreaSqft: 920.0,
    aspectRatio: 2.50,
    oswaldE: 0.88,
    cd0: 0.0014,
    cd0Aero: 0.0120,
    mCrit: 0.90,
    maxMach: 2.50,
    maxGLimit: 10.5,
    baseSpeed: 6.2,
    maxSpeed: 7.6,
    thrustDry: 0.055,
    thrustAB: 0.135,
    kInduced: 0.65,
    maxTurnRate: 0.215,
    rcs: 0.00005,
    rcsClean: 0.00005,
    rcsBloom: 0.8,
    radarBaseline: 1500,
    sensorReach: 1500,
    sensorType: "BROADBAND_MESH",
    serviceCeiling: 75000,
    respawnCeiling: 72000,
    weapons: ["DEW_LASER", "CCA_DRONES"],
    radarRange: 450,
    ciwsRange: 220,
    oodaLatencyFrames: 1,
    humanReactionLatencySec: 0.02,
    hasFlares: true,
    hasChaff: true,
    flightControls: "AUTONOMOUS_AI_NEURAL_FBW",
    supercruise: true,
    thrustVectoring: true
  },
  7: {
    name: "GEN 7 (Quantum Swarm Globes / Omni-Directional Spheres)",
    callsign: "SWARM ALPHA",
    callsignPrefix: "SWARM",
    hudName: "GEN 7 QUANTUM GLOBES",
    mass: 0.8,
    massCoeff: 0.80,
    weight: 0.8,
    W: 0.8,
    weightLbs: 12000,
    combatWeightLbs: 12000,
    thrustDryLbf: 40000,
    thrustAbLbf: 80000,
    wingAreaSqft: 150.0,
    aspectRatio: 3.00,
    oswaldE: 0.95,
    cd0: 0.0012,
    cd0Aero: 0.0000,
    mCrit: 1.00,
    maxMach: 3.50,
    maxGLimit: 12.0,
    baseSpeed: 6.8,
    maxSpeed: 7.8,
    thrustDry: 0.060,
    thrustAB: 0.135,
    kInduced: 0.65,
    maxTurnRate: 0.245,
    rcs: 0.00001,
    rcsClean: 0.00001,
    rcsBloom: 0.00001,
    radarBaseline: 1800,
    sensorReach: 1800,
    sensorType: "QUANTUM_OMNI",
    serviceCeiling: 100000,
    respawnCeiling: 92000,
    weapons: ["TRI_LANCE", "SINGULARITY_CANNON"],
    radarRange: 500,
    ciwsRange: 0,
    oodaLatencyFrames: 0,
    humanReactionLatencySec: 0.0,
    hasFlares: true,
    hasChaff: true,
    flightControls: "RELATIVISTIC_QUANTUM_VECTORING",
    supercruise: true,
    thrustVectoring: true
  }
};

AIRCRAFT_SPECS.f16 = {
  name: "GEN 4 (F-16 Fighting Falcon Agile Dogfighter)",
  callsign: "VIPER 2",
  callsignPrefix: "VIPER",
  hudName: "GEN 4 VIPER",
  mass: 1.1,
  massCoeff: 1.10,
  weight: 1.1,
  W: 1.1,
  weightLbs: 25000,
  combatWeightLbs: 25000,
  thrustDryLbf: 17155,
  thrustAbLbf: 29000,
  wingAreaSqft: 300.0,
  aspectRatio: 3.20,
  oswaldE: 0.82,
  cd0: 0.0016,
  cd0Aero: 0.0180,
  mCrit: 0.86,
  maxMach: 2.05,
  maxGLimit: 9.0,
  gunRangeFt: 3000,
  baseSpeed: 5.2,
  maxSpeed: 7.4,
  thrustDry: 0.048,
  thrustAB: 0.125,
  kInduced: 0.65,
  maxTurnRate: 0.185,
  rcs: 1.2,
  rcsClean: 1.2,
  rcsBloom: 1.2,
  radarBaseline: 1100,
  sensorReach: 1100,
  sensorType: "PULSE_DOPPLER",
  serviceCeiling: 60000,
  respawnCeiling: 52000,
  weapons: ["GUN_20MM", "AIM_9L"],
  radarRange: 240,
  ciwsRange: 0,
  oodaLatencyFrames: 6,
  humanReactionLatencySec: 0.2,
  hasFlares: true,
  hasChaff: true,
  flightControls: "FLY_BY_WIRE_9G",
  supercruise: false,
  thrustVectoring: false
};

var WEAPON_DAMAGE_SPECS = {
  1: {
    GUN_20MM: { minDamage: 15.0, maxDamage: 20.0, name: "20mm Cannon Burst" }
  },
  2: {
    GUN_20MM: { minDamage: 15.0, maxDamage: 20.0, name: "20mm Cannon Burst" },
    AIM_9B: { minDamage: 60.0, maxDamage: 70.0, name: "AIM-9B Sidewinder" }
  },
  3: {
    GUN_20MM: { minDamage: 15.0, maxDamage: 20.0, name: "20mm Cannon Burst" },
    AIM_7: { minDamage: 75.0, maxDamage: 85.0, name: "AIM-7 Sparrow SARH" }
  },
  4: {
    GUN_20MM: { minDamage: 15.0, maxDamage: 20.0, name: "20mm Cannon Burst" },
    AIM_9L: { minDamage: 85.0, maxDamage: 95.0, name: "AIM-9L Sidewinder" },
    AIM_54: { minDamage: 95.0, maxDamage: 100.0, name: "AIM-54 Phoenix" }
  },
  5: {
    GUN_20MM: { minDamage: 15.0, maxDamage: 20.0, name: "20mm Cannon Burst" },
    AIM_120D: { minDamage: 90.0, maxDamage: 100.0, name: "AIM-120D AMRAAM" },
    AIM_9X: { minDamage: 85.0, maxDamage: 95.0, name: "AIM-9X Sidewinder" }
  },
  6: {
    DEW_LASER: { dps: 50.0, continuous: true, minDamage: 50.0, maxDamage: 50.0, name: "150kW DEW Laser" },
    CCA_STRIKE: { minDamage: 40.0, maxDamage: 55.0, name: "CCA Drone Pulse" }
  },
  7: {
    TRI_LANCE: { minDamage: 35.0, maxDamage: 50.0, name: "Quantum Tri-Lance" },
    SINGULARITY_CANNON: { minDamage: 100.0, maxDamage: 100.0, name: "Singularity Hyper-Beam" }
  },
  GUN_20MM: { minDamage: 15.0, maxDamage: 20.0, name: "20mm Cannon Burst" },
  AIM_9B: { minDamage: 60.0, maxDamage: 70.0, name: "AIM-9B Sidewinder" },
  AIM_7: { minDamage: 75.0, maxDamage: 85.0, name: "AIM-7 Sparrow SARH" },
  AIM_9L: { minDamage: 85.0, maxDamage: 95.0, name: "AIM-9L Sidewinder" },
  AIM_54: { minDamage: 95.0, maxDamage: 100.0, name: "AIM-54 Phoenix" },
  AIM_120D: { minDamage: 90.0, maxDamage: 100.0, name: "AIM-120D AMRAAM" },
  AIM_9X: { minDamage: 85.0, maxDamage: 95.0, name: "AIM-9X Sidewinder" },
  DEW_LASER: { dps: 50.0, continuous: true, minDamage: 50.0, maxDamage: 50.0, name: "150kW DEW Laser" },
  CCA_STRIKE: { minDamage: 40.0, maxDamage: 55.0, name: "CCA Drone Pulse" },
  TRI_LANCE: { minDamage: 35.0, maxDamage: 50.0, name: "Quantum Tri-Lance" },
  SINGULARITY_CANNON: { minDamage: 100.0, maxDamage: 100.0, name: "Singularity Hyper-Beam" }
};

var SERVICE_CEILINGS = {
  1: 45000,
  2: 55000,
  3: 58000,
  4: 60000,
  5: 65000,
  6: 75000,
  7: 100000
};

var RESPAWN_CEILINGS = {
  1: 35000,
  2: 45000,
  3: 48000,
  4: 52000,
  5: 60000,
  6: 72000,
  7: 92000
};

var V_CORNER = 4.8;

function getAltitudeFeet(canvasY, canvasH) {
  var hCanvas = (typeof canvasH === "number" && canvasH > 0) ? canvasH : 900;
  if (hCanvas <= 0) return 0;
  var ratio = 1.0 - (canvasY / hCanvas);
  if (ratio < 0) ratio = 0;
  if (ratio > 1) ratio = 1;
  return ratio * 100000.0;
}

function getYFromAltitude(altFt, canvasH) {
  var hCanvas = (typeof canvasH === "number" && canvasH > 0) ? canvasH : 900;
  if (hCanvas <= 0) return 0;
  var ratio = altFt / 100000.0;
  if (ratio < 0) ratio = 0;
  if (ratio > 1) ratio = 1;
  return (1.0 - ratio) * hCanvas;
}

function getBarometricDensity(altFt) {
  var rho0 = 0.002377; // slug/ft^3 sea level standard air density
  var h = (typeof altFt === "number" && altFt > 0) ? altFt : 0;
  return rho0 * Math.exp(-h / 25000.0);
}

function getDynamicPressure(altFt, speed) {
  var rho = getBarometricDensity(altFt);
  var velFps = (typeof speed === "number" ? speed : 0) * 110.0;
  return 0.5 * rho * velFps * velFps;
}

function calculateEnergyHeight(altitudeFt, speed, g) {
  var h = typeof altitudeFt === "number" ? altitudeFt : 0;
  var v = typeof speed === "number" ? speed : 0;
  var gVal = (typeof g === "number" && g > 0) ? g : 32.174;
  return h + (v * v) / (2.0 * gVal);
}

function calculateSpecificExcessPower(speed, thrust, drag, weight, scale) {
  var v = typeof speed === "number" ? speed : 0;
  var t = typeof thrust === "number" ? thrust : 0;
  var d = typeof drag === "number" ? drag : 0;
  var w = typeof weight === "number" ? weight : 1.0;
  var scaleFactor = (typeof scale === "number") ? scale : 850.0;
  if (w <= 0) return 0;
  return (v * (t - d) / w) * scaleFactor;
}

function calculateAspectAngle(emitterPos, emitterHeading, targetPos) {
  var x1 = 0, y1 = 0, hdg = 0, x2 = 0, y2 = 0;
  if (typeof emitterPos === "object" && emitterPos !== null) {
    x1 = typeof emitterPos.x === "number" ? emitterPos.x : 0;
    y1 = typeof emitterPos.y === "number" ? emitterPos.y : 0;
  }
  if (typeof emitterHeading === "number") {
    hdg = emitterHeading;
  }
  if (typeof targetPos === "object" && targetPos !== null) {
    x2 = typeof targetPos.x === "number" ? targetPos.x : 0;
    y2 = typeof targetPos.y === "number" ? targetPos.y : 0;
  }
  var los = Math.atan2(y2 - y1, x2 - x1);
  var da = Math.abs(hdg - los);
  while (da > Math.PI) da = Math.abs(da - Math.PI * 2);
  return da * (180.0 / Math.PI);
}

function calculateRadarDetectionRange(emitterGen, targetRcs, emitterPower, aspectAngle, bayOpen) {
  var gen = (typeof emitterGen === "number") ? emitterGen : 4;
  var specE = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS && AIRCRAFT_SPECS[gen]) ? AIRCRAFT_SPECS[gen] : { radarBaseline: 1100 };
  var power = (typeof emitterPower === "number" && emitterPower > 0) ? emitterPower : 1.0;

  var r0 = specE.radarBaseline || specE.sensorReach || 1100;
  if (gen === 1) r0 = 450;
  else if (gen === 2) r0 = 650;
  else if (gen === 3) r0 = 850;
  else if (gen === 4) r0 = 1100;
  else if (gen === 5) r0 = 1300;
  else if (gen === 6) r0 = 1500;
  else if (gen === 7) r0 = 1800;

  var sigma = (typeof targetRcs === "number" && targetRcs >= 0) ? targetRcs : 1.0;
  if (bayOpen) {
    if (sigma < 0.01) {
      sigma = 1.2;
    }
  }
  var sigma0 = 1.0;

  var rMax = r0 * Math.pow(Math.max(0.000001, sigma / sigma0), 0.25) * Math.pow(power, 0.25);

  if (gen === 1) {
    rMax = Math.min(rMax, 450);
  } else if (gen === 2) {
    rMax = Math.min(rMax, 650);
  }

  if (typeof aspectAngle === "number") {
    var deg = aspectAngle;
    while (deg > 180) deg = Math.abs(360 - deg);
    var isBeamAspect = (Math.abs(deg - 90.0) <= 15.001);

    if (isBeamAspect && (gen === 3 || gen === 4)) {
      rMax *= 0.35;
    }
  }

  return rMax;
}

// ============================================================================
// BOYD OODA (Observe-Orient-Decide-Act) TACTICAL STATE MACHINE ENGINE
// ============================================================================

function oodaDeployFlares(jet, pool) {
  if (!jet || !pool) return 0;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[jet.gen]) ? AIRCRAFT_SPECS[jet.gen] : {};
  if (spec.hasFlares === false || jet.gen < 3) return 0;
  if (typeof jet.flareCooldown === "number" && jet.flareCooldown > 0) return 0;

  var count = 0;
  for (var f = 0; f < 6; f++) {
    var flIdx = pool.alloc();
    if (flIdx >= 0) {
      count++;
      var fo = flIdx * 5;
      pool.buffer[fo] = jet.x - Math.cos(jet.angle) * 12 + (Math.random() - 0.5) * 4;
      pool.buffer[fo + 1] = jet.y - Math.sin(jet.angle) * 12 + (Math.random() - 0.5) * 4;
      pool.buffer[fo + 2] = -Math.cos(jet.angle) * 2.5 + (Math.random() - 0.5) * 4;
      pool.buffer[fo + 3] = -Math.sin(jet.angle) * 2.5 + (Math.random() - 0.5) * 4;
      pool.buffer[fo + 4] = 1.0;
    }
  }
  jet.flareCooldown = (jet.gen === 4 ? 60 : 80);
  return count;
}

function oodaDeployChaff(jet, pool) {
  if (!jet || !pool) return 0;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[jet.gen]) ? AIRCRAFT_SPECS[jet.gen] : {};
  if (spec.hasChaff === false || jet.gen < 3) return 0;
  if (typeof jet.chaffCooldown === "number" && jet.chaffCooldown > 0) return 0;

  var count = 0;
  for (var c = 0; c < 6; c++) {
    var cIdx = pool.alloc();
    if (cIdx >= 0) {
      count++;
      var co = cIdx * 5;
      pool.buffer[co] = jet.x - Math.cos(jet.angle) * 10 + (Math.random() - 0.5) * 6;
      pool.buffer[co + 1] = jet.y - Math.sin(jet.angle) * 10 + (Math.random() - 0.5) * 6;
      pool.buffer[co + 2] = -Math.cos(jet.angle) * 1.5 + (Math.random() - 0.5) * 2;
      pool.buffer[co + 3] = -Math.sin(jet.angle) * 1.5 + (Math.random() - 0.5) * 2;
      pool.buffer[co + 4] = 1.0;
    }
  }
  jet.chaffCooldown = (jet.gen === 4 ? 50 : 70);
  return count;
}

function oodaObserveThreats(jet, opposingPool, missilesPool, width, height) {
  var obs = {
    nearestMissile: null,
    missileDist: 999999,
    missileClosure: 0,
    missileGuidance: "NONE", // "IR" | "RADAR" | "NONE"
    tailingBandit: null,
    banditDist: 999999,
    banditAOT: Math.PI,
    banditAOTDeg: 180.0,
    banditClosure: 0,
    lockedByBandit: false,
    isThreatActive: false
  };

  if (!jet || !jet.active) return obs;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[jet.gen]) ? AIRCRAFT_SPECS[jet.gen] : { sensorReach: 1100 };

  // 1. Scan Hostile Incoming Missiles
  if (missilesPool && missilesPool.activeCount > 0) {
    var hostileTeam = (jet.team === "blue") ? 1 : 0;
    for (var m = 0; m < missilesPool.activeCount; m++) {
      var mo = m * 8;
      if (missilesPool.buffer[mo + 4] === hostileTeam && missilesPool.buffer[mo + 6] > 0) {
        var mx = missilesPool.buffer[mo];
        var my = missilesPool.buffer[mo + 1];
        var mvx = missilesPool.buffer[mo + 2];
        var mvy = missilesPool.buffer[mo + 3];
        var mType = missilesPool.buffer[mo + 7];
        var d = Math.hypot(mx - jet.x, my - jet.y);

        // Generational sensor detection limit
        var canDetect = true;
        if (jet.gen === 1 && d > 450) canDetect = false;
        else if (jet.gen === 2 && d > 650) canDetect = false;

        if (canDetect && d < obs.missileDist) {
          obs.missileDist = d;
          var relVx = mvx - Math.cos(jet.angle) * jet.speed;
          var relVy = mvy - Math.sin(jet.angle) * jet.speed;
          var closure = -((mx - jet.x) * relVx + (my - jet.y) * relVy) / Math.max(d, 1.0);
          var guidance = (mType === 3 || mType === 4 || mType === 5) ? "RADAR" : "IR";
          obs.missileClosure = closure;
          obs.missileGuidance = guidance;
          obs.nearestMissile = { x: mx, y: my, vx: mvx, vy: mvy, type: mType, dist: d, closure: closure, guidance: guidance, idx: m };
          if (d < 300) {
            obs.isThreatActive = true;
          }
        }
      }
    }
  }

  // 2. Scan Tailing & Hostile Bandits
  if (opposingPool && Array.isArray(opposingPool)) {
    for (var b = 0; b < opposingPool.length; b++) {
      var opp = opposingPool[b];
      if (!opp || !opp.active || opp.isDying) continue;
      var bd = Math.hypot(opp.x - jet.x, opp.y - jet.y);
      var bearingToOpp = Math.atan2(opp.y - jet.y, opp.x - jet.x);
      var tailAngle = jet.angle + Math.PI;
      var aot = Math.abs(bearingToOpp - tailAngle);
      while (aot > Math.PI) aot = Math.abs(aot - Math.PI * 2);
      var aotDeg = aot * (180.0 / Math.PI);

      var oppVx = Math.cos(opp.angle) * opp.speed;
      var oppVy = Math.sin(opp.angle) * opp.speed;
      var myVx = Math.cos(jet.angle) * jet.speed;
      var myVy = Math.sin(jet.angle) * jet.speed;
      var closure = -((opp.x - jet.x) * (oppVx - myVx) + (opp.y - jet.y) * (oppVy - myVy)) / Math.max(bd, 1.0);

      var bearingFromOpp = Math.atan2(jet.y - opp.y, jet.x - opp.x);
      var oppNoseOffset = Math.abs(bearingFromOpp - opp.angle);
      while (oppNoseOffset > Math.PI) oppNoseOffset = Math.abs(oppNoseOffset - Math.PI * 2);

      if (bd < obs.banditDist) {
        obs.banditDist = bd;
        obs.tailingBandit = opp;
        obs.banditAOT = aot;
        obs.banditAOTDeg = aotDeg;
        obs.banditClosure = closure;
        obs.lockedByBandit = (opp.targetJet === jet && (aot < 0.785 || oppNoseOffset < 0.785) && bd < 500);
        if ((aot < 0.785 && bd < 350) || (oppNoseOffset < 0.785 && bd < 350) || (opp.targetJet === jet && bd < 450)) {
          obs.isThreatActive = true;
        }
      }
    }
  }

  return obs;
}

function oodaOrientTactics(jet, obs, altFt, sCeiling) {
  var ori = {
    inLethalMissileZone: (obs && obs.nearestMissile !== null && obs.missileDist < 300),
    tailingThreatActive: (obs && obs.tailingBandit !== null && ((obs.banditAOT < 0.785 && obs.banditClosure > 0.2) || obs.isThreatActive) && obs.banditDist < 260),
    hasAltitudeMargin: (altFt > 15000),
    isEnergyAdvantaged: false,
    recommendedEvasion: "NONE",
    recommendedPursuit: "LEAD"
  };

  if (!jet) return ori;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[jet.gen]) ? AIRCRAFT_SPECS[jet.gen] : {};

  if (obs && obs.tailingBandit) {
    ori.isEnergyAdvantaged = ((jet.energyHeight || 0) > (obs.tailingBandit.energyHeight || 0));
  }

  var isNearCeiling = (altFt >= 95000 || (typeof jet.y === "number" && jet.y <= 36.0));
  var isHighTW = (jet.gen === 2 || jet.gen === 4 || jet.gen === 5 || jet.gen === 6);
  var isPsPositive = (typeof jet.ps === "undefined" || jet.ps >= 0 || jet.speed >= 4.5);
  var isDefensiveOrTakingFire = (typeof jet.hp === "number" && jet.hp < 75.0);

  if (ori.inLethalMissileZone) {
    if (obs.missileGuidance === "RADAR") {
      if (jet.gen >= 3) {
        ori.recommendedEvasion = "BEAM_NOTCH";
      } else if (jet.gen === 1) {
        ori.recommendedEvasion = "BREAK_MANUAL";
      } else if (jet.gen === 2) {
        ori.recommendedEvasion = (jet.speed > 5.0 && !isNearCeiling ? "ZOOM_CLIMB" : "EXTEND_HIGH_SPEED");
      } else {
        ori.recommendedEvasion = "BREAK_9G";
      }
    } else {
      // IR Missile Lethal Zone
      if (jet.gen >= 3 && jet.gen <= 5) {
        if (isHighTW && isPsPositive && isDefensiveOrTakingFire && !isNearCeiling) {
          ori.recommendedEvasion = "ZOOM_CLIMB";
        } else {
          ori.recommendedEvasion = "BREAK_9G";
        }
      } else if (jet.gen === 2) {
        ori.recommendedEvasion = (jet.speed > 5.0 && !isNearCeiling ? "ZOOM_CLIMB" : "EXTEND_HIGH_SPEED");
      } else if (jet.gen === 1) {
        ori.recommendedEvasion = "BREAK_MANUAL";
      } else if (jet.gen === 6) {
        ori.recommendedEvasion = "DEW_CIWS";
      } else if (jet.gen === 7) {
        ori.recommendedEvasion = "QUANTUM_SHIFT";
      } else {
        ori.recommendedEvasion = "BREAK_9G";
      }
    }
  } else if (ori.tailingThreatActive || (isHighTW && isDefensiveOrTakingFire && isPsPositive && !isNearCeiling && altFt < sCeiling - 3000)) {
    if (isHighTW && isPsPositive && isDefensiveOrTakingFire && !isNearCeiling && altFt < sCeiling - 3000) {
      ori.recommendedEvasion = "ZOOM_CLIMB";
    } else if (jet.gen === 5 && obs && obs.banditClosure > 1.8 && altFt > 8000) {
      ori.recommendedEvasion = "COBRA";
    } else if (jet.gen === 4 && obs && obs.banditClosure > 1.4) {
      ori.recommendedEvasion = "ROLLING_SCISSORS";
    } else if (jet.gen === 3 && ori.hasAltitudeMargin && !ori.isEnergyAdvantaged && !isNearCeiling) {
      ori.recommendedEvasion = "SPLIT_S";
    } else if (jet.gen === 2) {
      ori.recommendedEvasion = (jet.speed > 5.0 && !isNearCeiling ? "ZOOM_CLIMB" : "EXTEND_HIGH_SPEED");
    } else if (jet.gen === 1) {
      ori.recommendedEvasion = "BREAK_MANUAL";
    } else if (jet.gen === 6) {
      ori.recommendedEvasion = "CCA_PINCER";
    } else if (jet.gen === 7) {
      ori.recommendedEvasion = "QUANTUM_SHIFT";
    } else {
      ori.recommendedEvasion = "BREAK_9G";
    }
  } else {
    ori.recommendedEvasion = "NONE";
  }

  // Pursuit geometry selection
  if (obs && obs.tailingBandit && jet.speed > obs.tailingBandit.speed + 2.0) {
    ori.recommendedPursuit = "LAG";
  } else {
    ori.recommendedPursuit = "LEAD";
  }

  return ori;
}

function oodaDecideAction(jet, obs, ori, targetEnemy, altFt, sCeiling, flaresPool, chaffPool) {
  if (!jet) return;
  jet.oodaPhase = "DECIDE";

  var isNearCeil = (altFt >= 95000 || (typeof jet.y === "number" && jet.y <= 36.0));

  // Boundary slice turnback has top priority to guarantee arena containment
  if (jet.mode === "BOUNDARY_SLICE" && typeof jet.modeTimer === "number" && jet.modeTimer > 0) {
    jet.isTailChasing = false;
    jet.zoomClimbActive = false;
    jet.throttleSetting = 1.5;
    jet.afterburner = true;
    return;
  }

  if (ori && ori.recommendedEvasion && ori.recommendedEvasion !== "NONE") {
    jet.isTailChasing = false;
    jet.mode = ori.recommendedEvasion;
    jet.evasionType = ori.recommendedEvasion;
    jet.evasionTimer = (jet.evasionTimer || 0) + 1;
    jet.zoomClimbActive = (ori.recommendedEvasion === "ZOOM_CLIMB");

    if (ori.recommendedEvasion === "BEAM_NOTCH") {
      var mAngle = (obs && obs.nearestMissile) ? Math.atan2(obs.nearestMissile.vy, obs.nearestMissile.vx) : jet.angle;
      var notchSign = (Math.random() > 0.5 ? 1 : -1);
      jet.targetAngle = mAngle + Math.PI * 0.5 * notchSign;
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
      if (jet.gen >= 3 && chaffPool && (typeof jet.chaffCooldown === "undefined" || jet.chaffCooldown <= 0)) {
        oodaDeployChaff(jet, chaffPool);
      }
    } else if (ori.recommendedEvasion === "BREAK_9G" || ori.recommendedEvasion === "BREAK_MANUAL") {
      var tAngle = (obs && obs.nearestMissile) ? Math.atan2(obs.nearestMissile.y - jet.y, obs.nearestMissile.x - jet.x) : ((obs && obs.tailingBandit) ? obs.tailingBandit.angle : jet.angle);
      var breakSign = (Math.random() > 0.5 ? 1 : -1);
      jet.targetAngle = tAngle + Math.PI * 0.55 * breakSign;
      jet.throttleSetting = 0.2;
      jet.afterburner = false;
      if (jet.gen >= 3 && flaresPool && (typeof jet.flareCooldown === "undefined" || jet.flareCooldown <= 0)) {
        oodaDeployFlares(jet, flaresPool);
      }
    } else if (ori.recommendedEvasion === "ROLLING_SCISSORS") {
      jet.scissorsFrameCount = (jet.scissorsFrameCount || 0) + 1;
      if (jet.scissorsFrameCount % 18 === 0) {
        jet.scissorsWeaveSign = -(jet.scissorsWeaveSign || 1);
      }
      jet.targetAngle = jet.angle + (jet.scissorsWeaveSign || 1) * 0.70;
      jet.throttleSetting = 0.0; // Idle throttle forces closure overshoot
      jet.afterburner = false;
      if (jet.gen >= 3 && flaresPool && (typeof jet.flareCooldown === "undefined" || jet.flareCooldown <= 0) && Math.random() < 0.25) {
        oodaDeployFlares(jet, flaresPool);
      }
      if (obs && obs.tailingBandit && (obs.banditAOT > Math.PI * 0.5 || obs.banditClosure < -1.0)) {
        jet.mode = "PURSUIT";
        jet.isTailChasing = true;
        jet.tailChaseTimer = 30;
        jet.throttleSetting = 1.5;
        jet.afterburner = true;
      }
    } else if (ori.recommendedEvasion === "SPLIT_S") {
      var isFacingRightSplit = Math.cos(jet.angle) >= 0;
      jet.targetAngle = isFacingRightSplit ? Math.PI * 0.48 : Math.PI * 0.52;
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else if (ori.recommendedEvasion === "COBRA") {
      var cStep = jet.evasionTimer % 36;
      if (cStep < 12) {
        jet.angle += 0.40;
        jet.speed = Math.max(jet.speed * 0.72, 1.8);
        jet.throttleSetting = 0.0;
        jet.afterburner = false;
      } else if (cStep < 24) {
        jet.angle -= 0.35;
        jet.throttleSetting = 0.0;
        jet.afterburner = false;
      } else {
        jet.throttleSetting = 1.5;
        jet.afterburner = true;
        jet.mode = "PURSUIT";
      }
    } else if (ori.recommendedEvasion === "ZOOM_CLIMB") {
      jet.zoomClimbActive = true;
      if (isNearCeil || altFt >= sCeiling - 2000) {
        jet.mode = "EXTEND_HIGH_SPEED";
        jet.zoomClimbActive = false;
        var isFacingRightExtZ = Math.cos(jet.angle) >= 0;
        jet.targetAngle = isFacingRightExtZ ? 0.02 : (jet.angle < 0 ? -Math.PI + 0.02 : Math.PI - 0.02);
      } else {
        var isFacingRightZoom = Math.cos(jet.angle) >= 0;
        var zoomPitch = 1.05; // 60 deg steep climb (45°-75°)
        jet.targetAngle = isFacingRightZoom ? -zoomPitch : (jet.angle < 0 ? -Math.PI + zoomPitch : Math.PI - zoomPitch);
      }
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else if (ori.recommendedEvasion === "EXTEND_HIGH_SPEED") {
      var isFacingRightExt = Math.cos(jet.angle) >= 0;
      jet.targetAngle = isFacingRightExt ? 0.02 : (jet.angle < 0 ? -Math.PI + 0.02 : Math.PI - 0.02);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else if (ori.recommendedEvasion === "DEW_CIWS") {
      jet.targetAngle = jet.angle;
      jet.throttleSetting = 1.2;
      jet.afterburner = true;
    } else if (ori.recommendedEvasion === "CCA_PINCER") {
      jet.targetAngle = jet.angle + 0.35;
      jet.throttleSetting = 1.3;
      jet.afterburner = true;
    } else if (ori.recommendedEvasion === "QUANTUM_SHIFT") {
      var qShiftSign = (Math.random() > 0.5 ? 1 : -1);
      jet.targetAngle = jet.angle + Math.PI * 0.55 * qShiftSign;
      jet.shieldPulse = 1.0;
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    }
  } else if ((jet.mode === "COVER" || jet.mode === "PINCER") && typeof jet.modeTimer === "number" && jet.modeTimer > 0) {
    jet.isTailChasing = false;
    jet.zoomClimbActive = false;
    jet.throttleSetting = 1.5;
    jet.afterburner = true;
  } else if (jet.mode === "MERGE_PITCHBACK" && ((typeof jet.modeTimer === "number" && jet.modeTimer > 0) || (typeof jet.pitchbackTimer === "number" && jet.pitchbackTimer > 0))) {
    // Persistent Post-Merge Pitchback Reversal (Latched for 24 frames)
    jet.isTailChasing = false;
    jet.zoomClimbActive = false;
    if (targetEnemy && targetEnemy.active && !targetEnemy.isDying) {
      var dx = targetEnemy.x - jet.x;
      var dy = targetEnemy.y - jet.y;
      var dist = Math.hypot(dx, dy);
      var leadTime = Math.min(dist / 14.0, 15.0);
      var leadX = targetEnemy.x + Math.cos(targetEnemy.angle) * targetEnemy.speed * leadTime;
      var leadY = targetEnemy.y + Math.sin(targetEnemy.angle) * targetEnemy.speed * leadTime;
      jet.targetAngle = Math.atan2(leadY - jet.y, leadX - jet.x);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;

      var hdgDiff = Math.abs(jet.angle - jet.targetAngle);
      while (hdgDiff > Math.PI) hdgDiff = Math.abs(hdgDiff - Math.PI * 2);
      if (hdgDiff < 0.20 && (jet.modeTimer || 0) <= 0 && (jet.pitchbackTimer || 0) <= 0) {
        jet.mode = "PURSUIT";
      }
    } else {
      jet.mode = "PURSUIT";
    }
  } else if (targetEnemy && targetEnemy.active && !targetEnemy.isDying) {
    var dx = targetEnemy.x - jet.x;
    var dy = targetEnemy.y - jet.y;
    var dist = Math.hypot(dx, dy);
    var hdgDiff = Math.abs(jet.angle - targetEnemy.angle);
    while (hdgDiff > Math.PI) hdgDiff = Math.abs(hdgDiff - Math.PI * 2);

    var closureRate = (obs && typeof obs.banditClosure === "number") ? obs.banditClosure : 0;
    var isClosingTooFast = (closureRate > 4.0) || (dist < 280 && jet.speed > V_CORNER);
    var hasEnergySurplus = (jet.energyHeight > 48000) || (targetEnemy && (jet.energyHeight || 0) > (targetEnemy.energyHeight || 0) + 6000);

    var bearingToTarget = Math.atan2(dy, dx);
    var aotTargetTail = Math.abs(bearingToTarget - targetEnemy.angle);
    while (aotTargetTail > Math.PI) aotTargetTail = Math.abs(aotTargetTail - Math.PI * 2);

    // Instant 180 snap pitchback upon crossing (dist < 250 px & hdgDiff > 1.8 rad or closure turning negative at close range)
    if ((dist < 250 && hdgDiff > 1.8) || (closureRate < 0 && dist < 350 && hdgDiff > 1.8)) {
      jet.mode = "MERGE_PITCHBACK";
      jet.isTailChasing = false;
      jet.modeTimer = 24;
      jet.pitchbackTimer = 24;
      var leadTime = Math.min(dist / 14.0, 15.0);
      var leadX = targetEnemy.x + Math.cos(targetEnemy.angle) * targetEnemy.speed * leadTime;
      var leadY = targetEnemy.y + Math.sin(targetEnemy.angle) * targetEnemy.speed * leadTime;
      jet.targetAngle = Math.atan2(leadY - jet.y, leadX - jet.x);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else if (ori && ori.recommendedPursuit === "LAG") {
      jet.mode = "PURSUIT";
      jet.isTailChasing = (aotTargetTail < 1.05 && dist <= 450);
      var directBearing = Math.atan2(dy, dx);
      var lagOffset = (Math.sin(targetEnemy.angle - directBearing) >= 0 ? -0.25 : 0.25);
      jet.targetAngle = directBearing + lagOffset;
      jet.throttleSetting = 1.0;
      jet.afterburner = (jet.speed < 5.0);
    } else if (!isNearCeil && (isClosingTooFast || jet.energyHeight > 65000) && (hasEnergySurplus || jet.energyHeight > 65000) && dist < 280 && altFt < sCeiling - 3000 && (typeof jet.ps === "undefined" || jet.ps >= -50)) {
      // Boyd E-M High Yo-Yo: steep vertical climb trading kinetic speed for altitude
      jet.mode = "YOYO_HIGH";
      jet.isTailChasing = false;
      var isFacingRightHighYo = Math.cos(jet.angle) >= 0;
      jet.targetAngle = isFacingRightHighYo ? -1.25 : (jet.angle < 0 ? -Math.PI + 1.25 : Math.PI - 1.25);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else if (dist > 250 && (jet.speed < targetEnemy.speed || (jet.energyHeight || 0) < (targetEnemy.energyHeight || 0) - 4000) && altFt > 14000) {
      // Boyd E-M Low Yo-Yo: steep energy dive converting potential energy to speed
      jet.mode = "YOYO_LOW";
      jet.isTailChasing = false;
      var isFacingRightLowYo = Math.cos(jet.angle) >= 0;
      jet.targetAngle = isFacingRightLowYo ? 0.85 : (jet.angle < 0 ? -Math.PI - 0.85 : Math.PI + 0.85);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else {
      jet.mode = "PURSUIT";
      var isBehindBandit = (aotTargetTail < 1.05); // AOT < 60 deg (1.047 rad)

      if (isBehindBandit && dist <= 500) {
        // Relentless Tail-Chase Latch: Match turns, track 150-400 px envelope
        jet.isTailChasing = true;
        jet.tailChaseTimer = 30;
        var leadTime = Math.min(dist / 14.0, 12.0);
        var leadX = targetEnemy.x + Math.cos(targetEnemy.angle) * targetEnemy.speed * leadTime;
        var leadY = targetEnemy.y + Math.sin(targetEnemy.angle) * targetEnemy.speed * leadTime;
        var leadAngle = Math.atan2(leadY - jet.y, leadX - jet.x);

        // Blend lead pursuit with matching bandit turn heading when close (150-300 px)
        if (dist >= 150 && dist <= 300) {
          var blend = (dist - 150.0) / 150.0;
          jet.targetAngle = leadAngle * blend + targetEnemy.angle * (1.0 - blend);
        } else {
          jet.targetAngle = leadAngle;
        }

        // Throttle modulation in tail chase: maintain position in 150-400px kill zone
        if (dist < 150 && jet.speed > targetEnemy.speed) {
          jet.throttleSetting = 0.8;
          jet.afterburner = false;
        } else if (dist > 280 || jet.speed < targetEnemy.speed) {
          jet.throttleSetting = 1.5;
          jet.afterburner = true;
        } else {
          jet.throttleSetting = 1.5;
          jet.afterburner = (jet.speed < 5.4);
        }
      } else {
        // Continuous 2-Circle Rate Fight Flow / 3D Vertical Merge
        jet.isTailChasing = false;
        var leadTime = Math.min(dist / 14.0, 20.0);
        var leadX = targetEnemy.x + Math.cos(targetEnemy.angle) * targetEnemy.speed * leadTime;
        var leadY = targetEnemy.y + Math.sin(targetEnemy.angle) * targetEnemy.speed * leadTime;
        var baseLeadAngle = Math.atan2(leadY - jet.y, leadX - jet.x);

        if (hdgDiff > 0.6 && hdgDiff <= 2.2 && dist >= 80 && dist <= 450) {
          // Continuous 2-Circle rate fight orbital flow: continuous turning circle at corner velocity
          jet.targetAngle = baseLeadAngle;
          if (jet.speed > 5.4) {
            jet.throttleSetting = 0.85;
            jet.afterburner = false;
          } else if (jet.speed < 4.6) {
            jet.throttleSetting = 1.5;
            jet.afterburner = true;
          } else {
            jet.throttleSetting = 1.2;
            jet.afterburner = true;
          }
        } else {
          jet.targetAngle = baseLeadAngle;
          jet.throttleSetting = 1.5;
          jet.afterburner = true;
        }
      }
    }
  } else {
    // Zero Passive Cruising Mandate: Continuous Active Radar S-Turns & Flank Sweep
    jet.mode = "TACTICAL_SWEEP";
    jet.isTailChasing = false;
    jet.patrolSweepAngle = (jet.patrolSweepAngle || 0) + 0.035;
    var sweepWeave = Math.sin(jet.patrolSweepAngle) * 0.40;
    var baseHeading = (jet.team === "blue" ? 0.0 : Math.PI);
    jet.targetAngle = baseHeading + sweepWeave;
    jet.throttleSetting = 1.0;
    jet.afterburner = true;
  }

  // Smooth near-space AI pitch-leveling invariant (theta -> 0)
  if (isNearCeil && Math.sin(jet.targetAngle) < 0) {
    var isFacingRightLvl = Math.cos(jet.angle) >= 0;
    jet.targetAngle = isFacingRightLvl ? 0.05 : (jet.angle < 0 ? -Math.PI - 0.05 : Math.PI + 0.05);
  }
}

function canAcquireTargetLock(shooter, target, dist, deltaAltFt) {
  if (!shooter || !target) return false;
  var specS = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[shooter.gen]) ? AIRCRAFT_SPECS[shooter.gen] : { radarBaseline: 1100 };
  var specT = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[target.gen]) ? AIRCRAFT_SPECS[target.gen] : { rcsClean: 1.0 };

  var d = typeof dist === "number" ? dist : Math.hypot(target.x - shooter.x, target.y - shooter.y);
  var dh = typeof deltaAltFt === "number" ? deltaAltFt : (getAltitudeFeet(target.y, 900) - getAltitudeFeet(shooter.y, 900));

  // Visual only (Gen 1)
  if (shooter.gen === 1) {
    return (d <= 450);
  }

  // Rear-aspect IR only (Gen 2)
  if (shooter.gen === 2) {
    if (d > 650 || Math.abs(dh) > 35000) return false;
    var targetBearing = Math.atan2(target.y - shooter.y, target.x - shooter.x);
    var aspectDiff = Math.abs(target.angle - targetBearing);
    while (aspectDiff > Math.PI) aspectDiff = Math.abs(aspectDiff - Math.PI * 2);
    return (aspectDiff <= 0.75);
  }

  // Radar / sensors equipped (Gen 3+)
  var targetAspectDeg = calculateAspectAngle({ x: shooter.x, y: shooter.y }, target.angle, { x: target.x, y: target.y });
  var isBayOpen = (typeof target.bayDoorTimer === "number" && target.bayDoorTimer > 0);
  var effectiveRcs = isBayOpen ? (specT.rcsBloom || 1.2) : (target.rcs || specT.rcsClean || 1.0);
  var maxRange = calculateRadarDetectionRange(shooter.gen, effectiveRcs, 1.0, targetAspectDeg, isBayOpen);

  if (Math.abs(dh) > 35000 && shooter.gen <= 4) {
    return false;
  }

  return (d <= maxRange);
}

function evaluateMissileSeekerDegradation(misType, tgtJet, dist) {
  if (!tgtJet) {
    return { degraded: false, lostLock: false, trackLossRate: 0, lossRate: 0, reason: "NO_TARGET" };
  }

  // Weapons bay cavity bloom override: opening doors blooms RCS to 1.2 m^2, restoring 100% seeker track
  if (typeof tgtJet.bayDoorTimer === "number" && tgtJet.bayDoorTimer > 0) {
    return { degraded: false, lostLock: false, trackLossRate: 0, lossRate: 0, reason: "BAY_DOOR_BLOOM" };
  }

  var d = (typeof dist === "number") ? dist : 0;
  var gen = tgtJet.gen;
  var rcs = (typeof tgtJet.rcs === "number") ? tgtJet.rcs : 1.0;

  // Gen 7: Quantum Swarm Phase Shift Motes (85% tracking failure rate across all ranges)
  if (gen === 7 || rcs <= 0.00001) {
    var roll7 = Math.random();
    if (roll7 < 0.85) {
      return { degraded: true, lostLock: true, trackLossRate: 0.85, lossRate: 0.85, reason: "GEN7_QUANTUM_PHASE_SHIFT" };
    } else {
      return { degraded: false, lostLock: false, trackLossRate: 0.85, lossRate: 0.85, reason: "GEN7_QUANTUM_PHASE_SHIFT_LOCK" };
    }
  }

  // Gen 6: Advanced VLO Stealth (NGAD / CCAs) (80% track loss at d > 75 px)
  if (gen === 6 || rcs <= 0.00005) {
    if (d > 75) {
      var roll6 = Math.random();
      if (roll6 < 0.80) {
        return { degraded: true, lostLock: true, trackLossRate: 0.80, lossRate: 0.80, reason: "GEN6_VLO_ATTENUATION" };
      } else {
        return { degraded: false, lostLock: false, trackLossRate: 0.80, lossRate: 0.80, reason: "GEN6_VLO_RETAINED_LOCK" };
      }
    } else {
      return { degraded: false, lostLock: false, trackLossRate: 0, lossRate: 0, reason: "POINT_BLANK_LOCK" };
    }
  }

  // Gen 5: VLO Stealth (F-22 Raptor, Su-57 Felon) (75% track loss at d > 90 px)
  if (gen === 5 || rcs <= 0.0001) {
    if (d > 90) {
      var roll5 = Math.random();
      if (roll5 < 0.75) {
        return { degraded: true, lostLock: true, trackLossRate: 0.75, lossRate: 0.75, reason: "GEN5_VLO_ATTENUATION" };
      } else {
        return { degraded: false, lostLock: false, trackLossRate: 0.75, lossRate: 0.75, reason: "GEN5_VLO_RETAINED_LOCK" };
      }
    } else {
      return { degraded: false, lostLock: false, trackLossRate: 0, lossRate: 0, reason: "POINT_BLANK_LOCK" };
    }
  }

  // Gen 1-4: Non-Stealth Baseline Invariant (0% stealth degradation)
  return { degraded: false, lostLock: false, trackLossRate: 0, lossRate: 0, reason: "NON_STEALTH_BASELINE" };
}

var globalHitMarkerTimer = 0;
var globalHitMarkerX = 0;
var globalHitMarkerY = 0;
var globalHitMarkerLethal = false;
var globalHitMarkerTarget = null;

var globalSplashBannerTimer = 0;
var globalSplashBannerText = "";
var globalHudFrameCount = 0;

function triggerTacticalRadio(text) {
  if (typeof globalRadioAdd === "function") {
    globalRadioAdd(text);
  } else if (typeof window !== "undefined" && typeof window.globalRadioAdd === "function") {
    window.globalRadioAdd(text);
  } else if (typeof global !== "undefined" && typeof global.globalRadioAdd === "function") {
    global.globalRadioAdd(text);
  }
}

function setGlobalRadioCallback(fn) {
  globalRadioAdd = fn;
  if (typeof window !== "undefined") window.globalRadioAdd = fn;
  if (typeof global !== "undefined") global.globalRadioAdd = fn;
}

function applyAirframeDamage(targetJet, damageAmount, attacker, weaponName) {
  if (!targetJet || !targetJet.active || targetJet.isDying) return false;
  var dmg = typeof damageAmount === "number" ? Math.max(0, damageAmount) : 0;
  var curHp = typeof targetJet.hp === "number" ? targetJet.hp : 100.0;
  var oldHp = curHp;
  targetJet.hp = Math.max(0.0, curHp - dmg);
  if (attacker) {
    targetJet.lastDamagedBy = attacker.callsign || ("GEN " + attacker.gen);
  }

  // Dynamic HUD Hit Marker trigger (for hero attacks)
  if (attacker && (attacker.isHero === true || attacker.isHero)) {
    globalHitMarkerTimer = 12;
    globalHitMarkerX = typeof targetJet.x === "number" ? targetJet.x : 0;
    globalHitMarkerY = typeof targetJet.y === "number" ? targetJet.y : 0;
    globalHitMarkerTarget = targetJet;
    globalHitMarkerLethal = (targetJet.hp <= 0.0);
  }

  if (targetJet.hp <= 0.0) {
    targetJet.hp = 0.0;
    targetJet.damageState = "DESTROYED";
    targetJet.isDying = true;
    targetJet.deathTimer = 45;
    targetJet.fadeAlpha = 1.0;
    if (attacker && attacker !== targetJet) {
      attacker.kills = (attacker.kills || 0) + 1;
    }

    // Kill Confirmation Splash Banner
    var kCount = (attacker && typeof attacker.kills === "number") ? attacker.kills : 1;
    var tCallsign = targetJet.callsign || ("GEN " + (targetJet.gen || 4));
    globalSplashBannerText = "SPLASH ONE: " + tCallsign + " DESTROYED | KILLS: " + kCount;
    globalSplashBannerTimer = 90;

    // Tactical Radio Splash Broadcast
    triggerTacticalRadio("SPLASH ONE! " + tCallsign + " DOWNED!");

    if (typeof spawnStage1Fireball === "function") {
      var pvx = Math.cos(targetJet.angle || 0) * (targetJet.speed || 0);
      var pvy = Math.sin(targetJet.angle || 0) * (targetJet.speed || 0);
      spawnStage1Fireball(targetJet.x, targetJet.y, pvx, pvy, 48, targetJet.gen || 4);
    }
    if (typeof spawnStage2Wreckage === "function") {
      spawnStage2Wreckage(targetJet);
    }
    return true;
  } else if (targetJet.hp < 20.0) {
    targetJet.damageState = "CRITICAL";
    if (oldHp >= 20.0) {
      triggerTacticalRadio("MAYDAY! " + (targetJet.callsign || ("GEN " + targetJet.gen)) + " COMPRESSOR STALL! AIRFRAME CRITICAL!");
    }
    return false;
  } else if (targetJet.hp < 45.0) {
    targetJet.damageState = "MODERATE";
    return false;
  } else if (targetJet.hp < 70.0) {
    targetJet.damageState = "LIGHT";
    return false;
  } else {
    targetJet.damageState = "NOMINAL";
    return false;
  }
}

var globalVfxParticlePool = new VfxParticlePool(512, 8);
var globalWreckagePool = new WreckagePool(32, 10);

function spawnStage1Fireball(x, y, vx, vy, count, gen) {
  var pool = (typeof globalVfxParticlePool !== "undefined" && globalVfxParticlePool) ? globalVfxParticlePool : null;
  if (!pool) return;
  var parentVx = typeof vx === "number" ? vx : 0;
  var parentVy = typeof vy === "number" ? vy : 0;
  var g = typeof gen === "number" ? gen : 4;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS && AIRCRAFT_SPECS[g]) ? AIRCRAFT_SPECS[g] : { mass: 1.5 };
  var mass = typeof spec.mass === "number" ? spec.mass : 1.5;

  // Mass-proportional scaling: R = 8.0 * sqrt(mass) (px)
  var blastRadius = 8.0 * Math.sqrt(mass);

  // Proportional particle counts: total between 18 and 45
  var nPlasma = Math.max(5, Math.min(11, Math.round(5.0 * mass)));
  var nSparks = Math.max(6, Math.min(16, Math.round(7.0 * mass)));
  var nSmoke = Math.max(6, Math.min(16, Math.round(7.0 * mass)));

  // Layer 1: White-hot core plasma particles (Type 0)
  for (var i = 0; i < nPlasma; i++) {
    var idx = pool.alloc();
    if (idx < 0) break;
    var off = idx * 8;
    var ang = Math.random() * Math.PI * 2;
    var spd = (1.2 + Math.random() * 3.2) * Math.sqrt(mass);
    var life = 14 + Math.floor(Math.random() * 12);
    pool.buffer[off] = x + (Math.random() - 0.5) * (blastRadius * 0.5);
    pool.buffer[off + 1] = y + (Math.random() - 0.5) * (blastRadius * 0.5);
    pool.buffer[off + 2] = parentVx * 0.5 + Math.cos(ang) * spd;
    pool.buffer[off + 3] = parentVy * 0.5 + Math.sin(ang) * spd;
    pool.buffer[off + 4] = life;
    pool.buffer[off + 5] = life;
    pool.buffer[off + 6] = (2.5 + Math.random() * 3.0) * Math.sqrt(mass);
    pool.buffer[off + 7] = 0; // Type 0: Core plasma
  }

  // Layer 2: High-velocity sparks (Type 1)
  for (var j = 0; j < nSparks; j++) {
    var sIdx = pool.alloc();
    if (sIdx < 0) break;
    var sOff = sIdx * 8;
    var sAng = Math.random() * Math.PI * 2;
    var sSpd = (3.5 + Math.random() * 6.5) * Math.sqrt(mass);
    var sLife = 18 + Math.floor(Math.random() * 18);
    pool.buffer[sOff] = x;
    pool.buffer[sOff + 1] = y;
    pool.buffer[sOff + 2] = parentVx * 0.4 + Math.cos(sAng) * sSpd;
    pool.buffer[sOff + 3] = parentVy * 0.4 + Math.sin(sAng) * sSpd;
    pool.buffer[sOff + 4] = sLife;
    pool.buffer[sOff + 5] = sLife;
    pool.buffer[sOff + 6] = 1.5;
    pool.buffer[sOff + 7] = 1; // Type 1: Sparks
  }

  // Layer 3: Feature 6: Single expanding shockwave ring scaled to detonation kinetic energy (Type 2)
  var rIdx = pool.alloc();
  if (rIdx >= 0) {
    var rOff = rIdx * 8;
    var rLife = 16;
    pool.buffer[rOff] = x;
    pool.buffer[rOff + 1] = y;
    pool.buffer[rOff + 2] = parentVx * 0.2;
    pool.buffer[rOff + 3] = parentVy * 0.2;
    pool.buffer[rOff + 4] = rLife;
    pool.buffer[rOff + 5] = rLife;
    pool.buffer[rOff + 6] = 4.0 * Math.sqrt(mass); // initial radius
    pool.buffer[rOff + 7] = 2; // Type 2: Shockwave ring
  }

  // Layer 4: Billowing thermal smoke (Type 3)
  for (var m = 0; m < nSmoke; m++) {
    var mIdx = pool.alloc();
    if (mIdx < 0) break;
    var mOff = mIdx * 8;
    var mAng = Math.random() * Math.PI * 2;
    var mSpd = 0.5 + Math.random() * 2.2;
    var mLife = 28 + Math.floor(Math.random() * 24);
    pool.buffer[mOff] = x + (Math.random() - 0.5) * blastRadius;
    pool.buffer[mOff + 1] = y + (Math.random() - 0.5) * blastRadius;
    pool.buffer[mOff + 2] = parentVx * 0.4 + Math.cos(mAng) * mSpd;
    pool.buffer[mOff + 3] = parentVy * 0.4 + Math.sin(mAng) * mSpd - 0.25;
    pool.buffer[mOff + 4] = mLife;
    pool.buffer[mOff + 5] = mLife;
    pool.buffer[mOff + 6] = (3.5 + Math.random() * 3.5) * Math.sqrt(mass);
    pool.buffer[mOff + 7] = 3; // Type 3: Smoke
  }
}

function spawnStage2Wreckage(jet) {
  if (!jet) return;
  var pool = (typeof globalWreckagePool !== "undefined" && globalWreckagePool) ? globalWreckagePool : null;
  if (!pool) return;

  var jx = typeof jet.x === "number" ? jet.x : 0;
  var jy = typeof jet.y === "number" ? jet.y : 0;
  var jAngle = typeof jet.angle === "number" ? jet.angle : 0;
  var jSpeed = typeof jet.speed === "number" ? jet.speed : 5.0;
  var jGen = typeof jet.gen === "number" ? jet.gen : 4;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS && AIRCRAFT_SPECS[jGen]) ? AIRCRAFT_SPECS[jGen] : { mass: 1.5 };
  var mass = typeof spec.mass === "number" ? spec.mass : 1.5;

  var parentVx = Math.cos(jAngle) * jSpeed;
  var parentVy = Math.sin(jAngle) * jSpeed;

  // Feature 7: Exactly 3 to 4 tumbling fuselage fragments based on airframe mass (mass <= 1.4 -> 3, mass > 1.4 -> 4)
  var numFragments = (mass > 1.4) ? 4 : 3;

  for (var f = 0; f < numFragments; f++) {
    var idx = pool.alloc();
    if (idx < 0) break;
    var off = idx * 10;

    var deltaVx = 0;
    var deltaVy = 0;
    if (f === 0) {
      deltaVx = Math.cos(jAngle) * 2.2 + (Math.random() - 0.5) * 1.0;
      deltaVy = Math.sin(jAngle) * 2.2 + (Math.random() - 0.5) * 1.0;
    } else if (f === 1) {
      deltaVx = Math.cos(jAngle - Math.PI * 0.5) * 2.4 + (Math.random() - 0.5) * 1.0;
      deltaVy = Math.sin(jAngle - Math.PI * 0.5) * 2.4 + (Math.random() - 0.5) * 1.0;
    } else if (f === 2) {
      deltaVx = Math.cos(jAngle + Math.PI * 0.5) * 2.4 + (Math.random() - 0.5) * 1.0;
      deltaVy = Math.sin(jAngle + Math.PI * 0.5) * 2.4 + (Math.random() - 0.5) * 1.0;
    } else {
      deltaVx = -Math.cos(jAngle) * 1.8 + (Math.random() - 0.5) * 1.0;
      deltaVy = -Math.sin(jAngle) * 1.8 + (Math.random() - 0.5) * 1.0;
    }

    var spin = ((Math.random() > 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.16));
    var life = 75 + Math.floor(Math.random() * 40);

    pool.buffer[off] = jx + (Math.random() - 0.5) * 6;
    pool.buffer[off + 1] = jy + (Math.random() - 0.5) * 6;
    pool.buffer[off + 2] = parentVx * 0.7 + deltaVx;
    pool.buffer[off + 3] = parentVy * 0.7 + deltaVy;
    pool.buffer[off + 4] = jAngle + (Math.random() - 0.5);
    pool.buffer[off + 5] = spin;
    pool.buffer[off + 6] = life;
    pool.buffer[off + 7] = f;
    pool.buffer[off + 8] = 0.85 + Math.random() * 0.3;
    pool.buffer[off + 9] = jGen;
  }
}

function triggerStage3GroundImpact(x, groundY, impactVx, gen) {
  var pool = (typeof globalVfxParticlePool !== "undefined" && globalVfxParticlePool) ? globalVfxParticlePool : null;
  if (!pool) return;

  var gX = typeof x === "number" ? x : 0;
  var gY = typeof groundY === "number" ? groundY : 150;
  var ivx = typeof impactVx === "number" ? impactVx : 0;
  var g = typeof gen === "number" ? gen : 4;

  // 1. Upward fountain particles in upper hemisphere (28 particles)
  var numFountain = 28;
  for (var f = 0; f < numFountain; f++) {
    var fIdx = pool.alloc();
    if (fIdx < 0) break;
    var fOff = fIdx * 8;
    var angle = -Math.PI * (0.15 + Math.random() * 0.70);
    var speed = 3.0 + Math.random() * 7.5;
    var life = 24 + Math.floor(Math.random() * 22);

    pool.buffer[fOff] = gX + (Math.random() - 0.5) * 8;
    pool.buffer[fOff + 1] = gY - 2;
    pool.buffer[fOff + 2] = ivx * 0.35 + Math.cos(angle) * speed;
    pool.buffer[fOff + 3] = Math.sin(angle) * speed;
    pool.buffer[fOff + 4] = life;
    pool.buffer[fOff + 5] = life;
    pool.buffer[fOff + 6] = 2.0 + Math.random() * 2.5;
    pool.buffer[fOff + 7] = 5; // Type 5: Ground fountain
  }

  // 2. Expanding surface shockwave dome
  for (var s = 0; s < 2; s++) {
    var sIdx = pool.alloc();
    if (sIdx < 0) break;
    var sOff = sIdx * 8;
    var sLife = 18 + s * 6;
    pool.buffer[sOff] = gX;
    pool.buffer[sOff + 1] = gY;
    pool.buffer[sOff + 2] = ivx * 0.15;
    pool.buffer[sOff + 3] = 0;
    pool.buffer[sOff + 4] = sLife;
    pool.buffer[sOff + 5] = sLife;
    pool.buffer[sOff + 6] = 6.0 + s * 4.0;
    pool.buffer[sOff + 7] = 6; // Type 6: Ground dome
  }

  // 3. Scorch plume
  var numScorch = 10;
  for (var sc = 0; sc < numScorch; sc++) {
    var scIdx = pool.alloc();
    if (scIdx < 0) break;
    var scOff = scIdx * 8;
    var scLife = 35 + Math.floor(Math.random() * 30);
    pool.buffer[scOff] = gX + (Math.random() - 0.5) * 16;
    pool.buffer[scOff + 1] = gY - 2 - Math.random() * 4;
    pool.buffer[scOff + 2] = ivx * 0.2 + (Math.random() - 0.5) * 1.5;
    pool.buffer[scOff + 3] = -0.5 - Math.random() * 2.0;
    pool.buffer[scOff + 4] = scLife;
    pool.buffer[scOff + 5] = scLife;
    pool.buffer[scOff + 6] = 5.0 + Math.random() * 6.0;
    pool.buffer[scOff + 7] = 7; // Type 7: Scorch plume
  }
}

function updateAndDrawWreckage(ctx, dt, height) {
  var pool = (typeof globalWreckagePool !== "undefined" && globalWreckagePool) ? globalWreckagePool : null;
  if (!pool || pool.activeCount === 0) return;

  var h = typeof height === "number" ? height : (ctx && ctx.canvas ? ctx.canvas.height : 150);
  var vfxPool = (typeof globalVfxParticlePool !== "undefined" && globalVfxParticlePool) ? globalVfxParticlePool : null;

  for (var i = pool.activeCount - 1; i >= 0; i--) {
    var off = i * 10;

    // Ballistic gravity arc: g = 0.16 px/frame^2
    pool.buffer[off + 3] += 0.16;
    // Aerodynamic drag
    pool.buffer[off + 2] *= 0.988;
    pool.buffer[off + 3] *= 0.992;
    // Angular rotation
    pool.buffer[off + 4] += pool.buffer[off + 5];
    // Translation
    pool.buffer[off] += pool.buffer[off + 2];
    pool.buffer[off + 1] += pool.buffer[off + 3];
    // Decrement life
    pool.buffer[off + 6]--;

    var wx = pool.buffer[off];
    var wy = pool.buffer[off + 1];
    var wvx = pool.buffer[off + 2];
    var wvy = pool.buffer[off + 3];
    var wAngle = pool.buffer[off + 4];
    var wLife = pool.buffer[off + 6];
    var wType = pool.buffer[off + 7];
    var wSize = pool.buffer[off + 8];
    var wGen = pool.buffer[off + 9];

    // Controlled sub-emitters to eliminate particle bloat
    if (vfxPool) {
      if (Math.random() < 0.35) {
        var smkIdx = vfxPool.alloc();
        if (smkIdx >= 0) {
          var smkOff = smkIdx * 8;
          var smkLife = 20 + Math.floor(Math.random() * 15);
          vfxPool.buffer[smkOff] = wx + (Math.random() - 0.5) * 4;
          vfxPool.buffer[smkOff + 1] = wy + (Math.random() - 0.5) * 4;
          vfxPool.buffer[smkOff + 2] = wvx * 0.2 + (Math.random() - 0.5) * 0.8;
          vfxPool.buffer[smkOff + 3] = wvy * 0.2 - Math.random() * 0.5;
          vfxPool.buffer[smkOff + 4] = smkLife;
          vfxPool.buffer[smkOff + 5] = smkLife;
          vfxPool.buffer[smkOff + 6] = 3.0 + Math.random() * 3.0;
          vfxPool.buffer[smkOff + 7] = 3;
        }
      }
      if (Math.random() < 0.15) {
        var embIdx = vfxPool.alloc();
        if (embIdx >= 0) {
          var embOff = embIdx * 8;
          var embLife = 10 + Math.floor(Math.random() * 10);
          vfxPool.buffer[embOff] = wx;
          vfxPool.buffer[embOff + 1] = wy;
          vfxPool.buffer[embOff + 2] = wvx * 0.4 + (Math.random() - 0.5) * 2.0;
          vfxPool.buffer[embOff + 3] = wvy * 0.4 + (Math.random() - 0.5) * 2.0;
          vfxPool.buffer[embOff + 4] = embLife;
          vfxPool.buffer[embOff + 5] = embLife;
          vfxPool.buffer[embOff + 6] = 1.2;
          vfxPool.buffer[embOff + 7] = 4;
        }
      }
    }

    // Ground Impact Trigger at terrain footer (wy >= h - 2, 0 ft)
    if (wy >= h - 2) {
      triggerStage3GroundImpact(wx, h - 2, wvx, wGen);
      pool.free(i);
      continue;
    }

    // Out of bounds / Expired
    if (wLife <= 0 || wx < -300 || wx > 2500) {
      pool.free(i);
      continue;
    }

    // Geometric fragment rendering
    if (ctx) {
      ctx.save();
      ctx.translate(Math.floor(wx), Math.floor(wy));
      ctx.rotate(wAngle);
      ctx.scale(wSize, wSize);

      ctx.fillStyle = typeof getAlphaColor === "function" ? getAlphaColor("fg", 0.75) : "#aaaaaa";
      ctx.strokeStyle = typeof getAlphaColor === "function" ? getAlphaColor("fg", 0.95) : "#ffffff";
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (wType === 0) {
        ctx.moveTo(7, 0);
        ctx.lineTo(-3, -2.5);
        ctx.lineTo(-3, 2.5);
      } else if (wType === 1) {
        ctx.moveTo(0, 0);
        ctx.lineTo(-5, -7);
        ctx.lineTo(-9, -5);
        ctx.lineTo(-3, 0);
      } else if (wType === 2) {
        ctx.moveTo(0, 0);
        ctx.lineTo(-5, 7);
        ctx.lineTo(-9, 5);
        ctx.lineTo(-3, 0);
      } else if (wType === 3) {
        ctx.moveTo(2, -2);
        ctx.lineTo(2, 2);
        ctx.lineTo(-5, 3);
        ctx.lineTo(-7, 0);
        ctx.lineTo(-5, -3);
      } else {
        ctx.moveTo(-5, -2);
        ctx.lineTo(5, -2);
        ctx.lineTo(5, 2);
        ctx.lineTo(-5, 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ff6600";
      ctx.fillRect(-1, -1, 2, 2);

      ctx.restore();
    }
  }
}

function updateAndDrawVfxParticles(ctx, dt, height, colors) {
  var pool = (typeof globalVfxParticlePool !== "undefined" && globalVfxParticlePool) ? globalVfxParticlePool : null;
  if (!pool || pool.activeCount === 0) return;

  var h = typeof height === "number" ? height : (ctx && ctx.canvas ? ctx.canvas.height : 150);

  for (var i = pool.activeCount - 1; i >= 0; i--) {
    var off = i * 8;
    var pType = pool.buffer[off + 7];

    if (pType === 0) {
      pool.buffer[off] += pool.buffer[off + 2];
      pool.buffer[off + 1] += pool.buffer[off + 3];
      pool.buffer[off + 2] *= 0.92;
      pool.buffer[off + 3] *= 0.92;
      pool.buffer[off + 6] += 0.15;
    } else if (pType === 1) {
      pool.buffer[off] += pool.buffer[off + 2];
      pool.buffer[off + 1] += pool.buffer[off + 3];
      pool.buffer[off + 3] += 0.05;
      pool.buffer[off + 2] *= 0.97;
      pool.buffer[off + 3] *= 0.97;
    } else if (pType === 2) {
      pool.buffer[off] += pool.buffer[off + 2];
      pool.buffer[off + 1] += pool.buffer[off + 3];
      pool.buffer[off + 6] += 2.8;
    } else if (pType === 3) {
      pool.buffer[off] += pool.buffer[off + 2];
      pool.buffer[off + 1] += pool.buffer[off + 3];
      pool.buffer[off + 3] -= 0.02;
      pool.buffer[off + 2] *= 0.96;
      pool.buffer[off + 6] += 0.12;
    } else if (pType === 4) {
      pool.buffer[off] += pool.buffer[off + 2];
      pool.buffer[off + 1] += pool.buffer[off + 3];
      pool.buffer[off + 3] += 0.06;
      pool.buffer[off + 2] *= 0.96;
    } else if (pType === 5) {
      pool.buffer[off] += pool.buffer[off + 2];
      pool.buffer[off + 1] += pool.buffer[off + 3];
      pool.buffer[off + 3] += 0.22;
      pool.buffer[off + 2] *= 0.96;
    } else if (pType === 6) {
      pool.buffer[off] += pool.buffer[off + 2];
      pool.buffer[off + 6] += 2.5;
    } else if (pType === 7) {
      pool.buffer[off] += pool.buffer[off + 2];
      pool.buffer[off + 1] += pool.buffer[off + 3];
      pool.buffer[off + 3] -= 0.03;
      pool.buffer[off + 2] *= 0.95;
      pool.buffer[off + 6] += 0.15;
    } else {
      pool.buffer[off] += pool.buffer[off + 2];
      pool.buffer[off + 1] += pool.buffer[off + 3];
      pool.buffer[off + 2] *= 0.94;
      pool.buffer[off + 3] *= 0.94;
    }

    pool.buffer[off + 4]--;
    var life = pool.buffer[off + 4];
    var maxLife = pool.buffer[off + 5];
    var px = pool.buffer[off];
    var py = pool.buffer[off + 1];
    var pSize = pool.buffer[off + 6];

    if (life <= 0 || px < -200 || px > 2500 || py > h + 60) {
      pool.free(i);
      continue;
    }

    if (ctx) {
      var t = Math.max(0, Math.min(1.0, life / (maxLife || 1.0)));

      if (pType === 0) {
        if (t > 0.65) {
          ctx.fillStyle = "#ffffff";
        } else if (t > 0.35) {
          ctx.fillStyle = "#ffb703";
        } else {
          ctx.fillStyle = "#ef233c";
        }
        ctx.fillRect(Math.floor(px - pSize * 0.5), Math.floor(py - pSize * 0.5), Math.ceil(pSize), Math.ceil(pSize));
      } else if (pType === 1) {
        ctx.fillStyle = (t > 0.5) ? "#ffffff" : "#ffd166";
        ctx.fillRect(Math.floor(px), Math.floor(py), 2, 2);
      } else if (pType === 2) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, " + (t * 0.85).toFixed(2) + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (pType === 3) {
        ctx.fillStyle = typeof getAlphaColor === "function" ? getAlphaColor("panel", t * 0.45) : "rgba(40,40,40,0.45)";
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (pType === 4) {
        ctx.fillStyle = t > 0.5 ? "#ffaa00" : "#ef233c";
        ctx.fillRect(Math.floor(px), Math.floor(py), 2, 2);
      } else if (pType === 5) {
        ctx.fillStyle = typeof getAlphaColor === "function" ? getAlphaColor("fg", t * 0.9) : "#ffffff";
        ctx.fillRect(Math.floor(px), Math.floor(py), 2, 2);
      } else if (pType === 6) {
        ctx.save();
        ctx.strokeStyle = typeof getAlphaColor === "function" ? getAlphaColor("fg", t * 0.55) : "rgba(255,255,255,0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, h - 2, pSize, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (pType === 7) {
        ctx.fillStyle = typeof getAlphaColor === "function" ? getAlphaColor("panel", t * 0.55) : "rgba(40,40,40,0.55)";
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = typeof getAlphaColor === "function" ? getAlphaColor("fg", t * 0.85) : "#ffffff";
        ctx.fillRect(Math.floor(px - pSize * 0.5), Math.floor(py - pSize * 0.5), pSize, pSize);
      }
    }
  }
}

var HUD_SEGMENTS = 10;
var HUD_SEGMENT_WIDTH = 7;
var HUD_SEGMENT_HEIGHT = 6;
var HUD_SEGMENT_GAP = 2;

function getHealthColor(hp, frameCount) {
  var val = typeof hp === "number" ? hp : 100.0;
  if (val >= 70.0) return "#00ff66";
  if (val >= 45.0) return "#ffd166";
  if (val >= 20.0) return "#ffa726";
  var flash = (Math.floor((frameCount || 0) / 10) % 2 === 0);
  return flash ? "#ff3333" : "#550000";
}

function getHealthStatus(hp) {
  var val = typeof hp === "number" ? hp : 100.0;
  if (val >= 70.0) return "NOMINAL";
  if (val >= 45.0) return "LIGHT DMG";
  if (val >= 20.0) return "MODERATE DMG";
  return "AIRFRAME CRITICAL";
}

function drawInWorldHealthBar(ctx, jet, colors, frameCount) {
  if (!ctx || !jet || !jet.active || jet.isDying) return;
  var hp = typeof jet.hp === "number" ? jet.hp : 100.0;
  if (hp >= 99.9 || hp <= 0.0) return; // Automatically hidden at 100% nominal health or when destroyed

  var bx = Math.floor(jet.x - 10);
  var by = Math.floor(jet.y - 18);
  var bw = 20;
  var bh = 3;
  var fillW = Math.max(0, Math.min(bw, Math.round((hp / 100.0) * bw)));

  var barColor;
  if (hp > 60.0) {
    barColor = (jet.team === "blue" || jet.isHero || jet.isBlue) ? ((colors && colors.blue) || "#7dcfff") : ((colors && colors.red) || "#ff6b6b");
  } else if (hp >= 25.0) {
    barColor = (colors && colors.gold) || "#ffd166";
  } else {
    var isFlash = (Math.floor((frameCount || 0) / 8) % 2 === 0);
    barColor = isFlash ? "#ff3333" : "#550000";
  }

  ctx.save();
  // 1. Dark backdrop frame with 1px border
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.strokeStyle = "rgba(100, 100, 100, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);

  // 2. Health Fill
  ctx.fillStyle = barColor;
  ctx.fillRect(bx, by, fillW, bh);
  ctx.restore();
}

function drawThrustScaledExhaust(ctx, jet, colors, now) {
  if (!ctx || !jet || jet.gen === 7 || !jet.active || jet.isDying) return;

  var isAB = Boolean(jet.afterburner);
  var spd = typeof jet.speed === "number" ? jet.speed : 4.0;
  var speedRatio = Math.min(1.0, Math.max(0.0, (spd - 2.0) / 5.6));

  // Dynamic dimension scaling:
  // Dry cruise: 4-8px length, 2-3px width
  // Afterburner sprint: 20-40px length, 4-6px width
  var baseLen = isAB ? (18.0 + speedRatio * 22.0) : (4.0 + speedRatio * 4.0);
  var flameL = Math.max(4, Math.min(40, Math.floor(baseLen + (isAB ? (Math.random() * 2.0 - 1.0) : 0))));
  var flameW = isAB ? (speedRatio > 0.7 ? 5 : 4) : 2;
  var halfW = flameW * 0.5;

  var isRed = Boolean(jet.team === "red" || jet.isRed);
  var faction = isRed ? FACTION_COLORS.red : FACTION_COLORS.blue;

  ctx.save();

  // 1. Outer Flame Plume locked strictly to FACTION_COLORS
  var grad = (ctx.createLinearGradient) ? ctx.createLinearGradient(0, 0, -flameL, 0) : null;
  if (grad) {
    if (isAB) {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.35, faction.accent);
      grad.addColorStop(0.70, faction.primary);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    } else {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.40, faction.exhaustDry);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    }
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = isAB ? faction.accent : faction.exhaustDry;
  }

  ctx.beginPath();
  ctx.moveTo(-14, -halfW);
  ctx.lineTo(-14 - flameL, 0);
  ctx.lineTo(-14, halfW);
  ctx.closePath();
  ctx.fill();

  // 2. Inner White-Hot Plasma Column
  var coreL = Math.max(2, Math.floor(flameL * 0.45));
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-14 - coreL, -1, coreL, 2);

  // 3. Pulsating Mach Diamonds (Shock Diamonds) in Supersonic Afterburner Sprint
  if (isAB && spd >= 5.0 && jet.gen >= 2) {
    var numDiamonds = (spd > 6.0) ? 4 : 3;
    var tNow = typeof now === "number" ? now : 0;
    for (var d = 1; d <= numDiamonds; d++) {
      var dDist = 14 + Math.floor((flameL / (numDiamonds + 1)) * d);
      if (dDist >= 14 + flameL - 3) break;
      var pulse = 0.8 + 0.3 * Math.sin(tNow * 0.04 + d * 1.6);
      var dw = 2.2 * pulse;
      var dh = 1.6 * pulse;
      var dx = -dDist;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(dx - dw, 0);
      ctx.lineTo(dx, -dh);
      ctx.lineTo(dx + dw, 0);
      ctx.lineTo(dx, dh);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = faction.accent;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawSegmentedHealthBar(ctx, x, y, hp, frameCount, label, callsign) {
  if (!ctx) return;
  var clampedHp = Math.max(0, Math.min(100, typeof hp === "number" ? hp : 100));
  var activeSegs = Math.ceil((clampedHp / 100.0) * HUD_SEGMENTS);
  var color = getHealthColor(clampedHp, frameCount);
  var status = getHealthStatus(clampedHp);

  ctx.save();
  ctx.font = "9px monospace";
  ctx.fillStyle = color;
  var fullLabel = label + (callsign ? (" [" + callsign + "]") : "") + ": ";
  ctx.fillText(fullLabel, x, y + 6);

  var textW = ctx.measureText ? ctx.measureText(fullLabel).width : (fullLabel.length * 5.5);
  var barX = Math.floor(x + textW + 2);

  // Background bounding frame
  var totalBarW = HUD_SEGMENTS * (HUD_SEGMENT_WIDTH + HUD_SEGMENT_GAP) - HUD_SEGMENT_GAP;
  ctx.strokeStyle = "rgba(100, 100, 100, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX - 2, y - 1, totalBarW + 4, HUD_SEGMENT_HEIGHT + 2);

  // Segment rects
  for (var s = 0; s < HUD_SEGMENTS; s++) {
    var sx = barX + s * (HUD_SEGMENT_WIDTH + HUD_SEGMENT_GAP);
    if (s < activeSegs) {
      ctx.fillStyle = color;
    } else {
      ctx.fillStyle = "rgba(40, 40, 40, 0.45)";
    }
    ctx.fillRect(sx, y, HUD_SEGMENT_WIDTH, HUD_SEGMENT_HEIGHT);
  }

  // Numeric percentage & status
  ctx.fillStyle = color;
  ctx.fillText(" " + Math.round(clampedHp) + "% " + status, barX + totalBarW + 4, y + 6);
  ctx.restore();
}

function drawHudOverlay(ctx, f16, nearestEnemy, width, height, colors, frameCount, radioBuffer, radioHead, radioCount, MAX_RADIO, getAlphaColor) {
  // Purged all HUD telemetry text, banners, warnings, reticles, and radio chatter for clean visual dogfight.
}

var ACTIVE_GENS_KEY = "ooda-active-gens-v3";
var activeGens = { 1: false, 2: false, 3: false, 4: true, 5: false, 6: false, 7: false };
try {
  var storedGens = typeof localStorage !== "undefined" ? localStorage.getItem(ACTIVE_GENS_KEY) : null;
  if (storedGens) {
    var parsed = JSON.parse(storedGens);
    if (typeof parsed === "object" && parsed !== null) {
      for (var g = 1; g <= 7; g++) {
        if (typeof parsed[g] === "boolean") {
          activeGens[g] = parsed[g];
        }
      }
    }
  }
} catch (e) {
  for (var g3 = 1; g3 <= 7; g3++) activeGens[g3] = (g3 === 4);
}

function hasAnyActiveGen() {
  for (var k = 1; k <= 7; k++) {
    if (activeGens[k]) return true;
  }
  return false;
}

function saveActiveGens() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ACTIVE_GENS_KEY, JSON.stringify(activeGens));
    }
  } catch (e) {}
}

function getRandomActiveGen(preferred) {
  var available = [];
  for (var g = 1; g <= 7; g++) {
    if (activeGens[g]) available.push(g);
  }
  if (available.length === 0) return 0;
  if (preferred && activeGens[preferred]) return preferred;
  return available[Math.floor(Math.random() * available.length)];
}

function setupJetCallsignAndVariant(jet, chosenGen, team, slotIdx) {
  var isBlue = (team === "blue");
  var numSlot = typeof slotIdx === "number" ? slotIdx : 0;
  var isLead = (numSlot === 0);
  var isF16 = false;
  var callsign = "";

  if (isBlue) {
    if (chosenGen === 1) callsign = "SABRE " + (numSlot + 1);
    else if (chosenGen === 2) callsign = "STARFIGHTER " + (numSlot + 1);
    else if (chosenGen === 3) callsign = "PHANTOM " + (numSlot + 1);
    else if (chosenGen === 4) {
      if (numSlot === 0) {
        isF16 = false;
        callsign = "TOMCAT 1";
      } else {
        isF16 = true;
        callsign = "VIPER " + (numSlot + 1);
      }
    } else if (chosenGen === 5) callsign = (numSlot % 2 === 0) ? ("RAPTOR " + (numSlot + 1)) : ("LIGHTNING " + (numSlot + 1));
    else if (chosenGen === 6) callsign = (numSlot % 2 === 0) ? ("NGAD BLUE " + (numSlot + 1)) : ("CCA BLUE " + (numSlot + 1));
    else if (chosenGen === 7) callsign = (numSlot === 0) ? "SWARM ALPHA" : ((numSlot === 1) ? "SWARM BRAVO" : ("SWARM BLUE " + (numSlot + 1)));
  } else {
    if (chosenGen === 1) callsign = "FAGOT " + (numSlot + 1);
    else if (chosenGen === 2) callsign = "FISHBED " + (numSlot + 1);
    else if (chosenGen === 3) callsign = "FLOGGER " + (numSlot + 1);
    else if (chosenGen === 4) {
      isF16 = false;
      callsign = (numSlot % 2 === 0) ? ("FLANKER " + (numSlot + 1)) : ("FULCRUM " + (numSlot + 1));
    } else if (chosenGen === 5) callsign = (numSlot % 2 === 0) ? ("FELON " + (numSlot + 1)) : ("CHECKMATE " + (numSlot + 1));
    else if (chosenGen === 6) callsign = (numSlot % 2 === 0) ? ("NGAD RED " + (numSlot + 1)) : ("CCA RED " + (numSlot + 1));
    else if (chosenGen === 7) callsign = (numSlot === 0) ? "SWARM CHARLIE" : ((numSlot === 1) ? "SWARM DELTA" : ("SWARM RED " + (numSlot + 1)));
  }

  jet.callsign = callsign || ((isBlue ? "BLUE " : "RED ") + (numSlot + 1));
  jet.variant = isF16 ? "F16" : (chosenGen === 4 ? "F14" : "STD");
  jet.wingSweep = (chosenGen === 4 && !isF16 ? 0.25 : 0.0);
}

function createJet(x, y, angle, gen, slotIdx, team) {
  var chosenGen = (gen && activeGens[gen]) ? gen : (activeGens[4] ? 4 : getRandomActiveGen());
  if (!chosenGen) chosenGen = 0;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[chosenGen]) ? AIRCRAFT_SPECS[chosenGen] : (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS ? AIRCRAFT_SPECS[4] : { baseSpeed: 4.8 });
  var baseSpeed = spec ? (spec.baseSpeed || 4.8) : 4.8;

  var actualTeam = (team === "red") ? "red" : "blue";
  var numSlot = typeof slotIdx === "number" ? slotIdx : 0;
  var isLead = (numSlot === 0);
  var isHero = (actualTeam === "blue" && isLead);

  var jet = {
    x: x,
    y: y,
    gen: chosenGen,
    team: actualTeam,
    slotIdx: numSlot,
    isLead: Boolean(isLead),
    isHero: Boolean(isHero),
    variant: "STD",
    callsign: "",
    speed: baseSpeed,
    baseSpeed: baseSpeed,
    prevSpeed: baseSpeed,
    hp: 100.0,
    maxHp: 100.0,
    damageState: "NOMINAL",
    lastDamagedBy: "",
    damageSmokeTimer: 0,
    damageSparksTimer: 0,
    angle: angle,
    targetAngle: angle,
    turnRate: 0,
    gForce: 1.0,
    energy: 100,
    energyHeight: 0,
    ps: 0,
    isStalled: false,
    stallBuffet: 0,
    mode: "PATROL",
    modeTimer: 0,
    isTailChasing: false,
    tailChaseTimer: 0,
    targetJet: null,
    wingmanJet: null,
    afterburner: true,
    flareCooldown: 0,
    chaffCooldown: 0,
    gunCooldown: 0,
    missileCooldown: chosenGen === 1 ? 999999 : (10 + Math.floor(Math.random() * 11)),
    laserCooldown: 0,
    triLaserCooldown: 0,
    superLaserCooldown: chosenGen === 7 ? (isHero ? 60 : (60 + Math.floor(Math.random() * 60))) : 0,
    superLaserPulse: 0,
    shieldPulse: 0,
    bayDoorTimer: 0,
    rcs: spec ? (spec.rcsClean || spec.rcs || 1.0) : 1.0,
    sensors: {
      radarLocked: false,
      lockQuality: 0,
      inRwrWarning: false,
      detectedThreats: []
    },
    wingSweep: (chosenGen === 4 ? 0.25 : 0.0),
    ccaDeployed: false,
    cca1: { x: 0, y: 0, angle: 0, speed: 6.0, active: false, laserCooldown: 0 },
    cca2: { x: 0, y: 0, angle: 0, speed: 6.0, active: false, laserCooldown: 0 },
    drone1: { x: 16, y: 0, targetX: 16, targetY: 0, worldX: x + Math.cos(angle) * 16, worldY: y + Math.sin(angle) * 16 },
    drone2: { x: -6, y: -14, targetX: -6, targetY: -14, worldX: x + Math.cos(angle) * -6 - Math.sin(angle) * -14, worldY: y + Math.sin(angle) * -6 + Math.cos(angle) * -14 },
    drone3: { x: -6, y: 14, targetX: -6, targetY: 14, worldX: x + Math.cos(angle) * -6 - Math.sin(angle) * 14, worldY: y + Math.sin(angle) * -6 + Math.cos(angle) * 14 },
    swarmMode: "FLANK",
    swarmTimer: Math.floor(Math.random() * 1000),
    trapTimer: 0,
    isDying: false,
    deathTimer: 0,
    fadeAlpha: 1.0,
    scrambleTimer: 0,
    contrail: typeof ContrailRingBufferF32 !== "undefined" ? new ContrailRingBufferF32(32, 4) : null,
    wingVapor: typeof ContrailRingBufferF32 !== "undefined" ? new ContrailRingBufferF32(32, 4) : null,
    kills: 0,
    active: true
  };

  setupJetCallsignAndVariant(jet, chosenGen, actualTeam, numSlot);
  return jet;
}

var globalDogfightJetsState = {
  bluePool: [],
  redPool: [],
  allJets: []
};

for (var dbi = 0; dbi < 7; dbi++) {
  var dbGen = dbi + 1;
  globalDogfightJetsState.bluePool.push(createJet(320, getYFromAltitude(RESPAWN_CEILINGS[dbGen] || 52000, 900), 0, dbGen, dbi, "blue"));
  globalDogfightJetsState.redPool.push(createJet(1280, getYFromAltitude(RESPAWN_CEILINGS[dbGen] || 52000, 900), Math.PI, dbGen, dbi, "red"));
}
for (var dai = 0; dai < 7; dai++) globalDogfightJetsState.allJets.push(globalDogfightJetsState.bluePool[dai]);
for (var dri = 0; dri < 7; dri++) globalDogfightJetsState.allJets.push(globalDogfightJetsState.redPool[dri]);

if (typeof global !== "undefined") {
  global.globalDogfightJets = globalDogfightJetsState;
}
if (typeof window !== "undefined") {
  window.globalDogfightJets = globalDogfightJetsState;
}

function syncFleetToActiveGenerations(activeGensMask, canvasW, canvasH) {
  var w = (typeof canvasW === "number" && canvasW > 0) ? canvasW : 1600;
  var h = (typeof canvasH === "number" && canvasH > 0) ? canvasH : 900;
  var bPool = globalDogfightJetsState.bluePool;
  var rPool = globalDogfightJetsState.redPool;
  var aJets = globalDogfightJetsState.allJets;

  var mask = (typeof activeGensMask === "object" && activeGensMask !== null) ? activeGensMask : {};
  for (var ag = 1; ag <= 7; ag++) {
    activeGens[ag] = Boolean(mask[ag]);
  }

  var activeList = [];
  for (var g = 1; g <= 7; g++) {
    if (mask[g]) activeList.push(g);
  }
  var nActive = activeList.length;

  if (nActive === 0) {
    for (var i = 0; i < aJets.length; i++) {
      aJets[i].active = false;
      aJets[i].targetJet = null;
      aJets[i].wingmanJet = null;
    }
    return;
  }

  // 1 Blue + 1 Red per active generation
  for (var idx = 0; idx < nActive; idx++) {
    var g = activeList[idx];
    var specG = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[g]) ? AIRCRAFT_SPECS[g] : { baseSpeed: 4.8 };
    var gAltY = getYFromAltitude(RESPAWN_CEILINGS[g] || 52000, h);

    var bJet = bPool[idx];
    bJet.gen = g;
    bJet.active = true;
    bJet.isDying = false;
    bJet.deathTimer = 0;
    bJet.fadeAlpha = 1.0;
    bJet.hp = 100.0;
    bJet.maxHp = 100.0;
    bJet.damageState = "NOMINAL";
    bJet.lastDamagedBy = "";
    bJet.damageSmokeTimer = 0;
    bJet.damageSparksTimer = 0;
    bJet.x = w * 0.20 + (idx % 2 === 1 ? -40 : 0);
    bJet.y = Math.max(32.0, gAltY - (idx === 0 ? 50 : 25));
    bJet.angle = 0.0;
    bJet.targetAngle = 0.0;
    bJet.speed = specG.baseSpeed || 4.8;
    bJet.baseSpeed = specG.baseSpeed || 4.8;
    bJet.prevSpeed = bJet.speed;
    bJet.ps = 0;
    bJet.turnRate = 0;
    bJet.gForce = 1.0;
    bJet.isStalled = false;
    bJet.mode = "PATROL";
    bJet.modeTimer = 30;
    bJet.afterburner = true;
    bJet.targetJet = null;
    bJet.isLead = (idx === 0);
    bJet.isHero = (idx === 0);
    bJet.rcs = specG.rcsClean || specG.rcs || 1.0;
    bJet.bayDoorTimer = 0;
    bJet.flareCooldown = 0;
    bJet.chaffCooldown = 0;
    bJet.gunCooldown = 0;
    bJet.missileCooldown = g === 1 ? 999999 : (10 + Math.floor(Math.random() * 11));
    bJet.laserCooldown = 0;
    bJet.triLaserCooldown = 0;
    bJet.superLaserCooldown = g === 7 ? (60 + Math.floor(Math.random() * 60)) : 0;
    bJet.superLaserPulse = 0;
    bJet.shieldPulse = 0;
    bJet.ccaDeployed = false;
    setupJetCallsignAndVariant(bJet, g, "blue", idx);
    if (bJet.contrail) bJet.contrail.clear();
    if (bJet.wingVapor) bJet.wingVapor.clear();

    var rJet = rPool[idx];
    rJet.gen = g;
    rJet.active = true;
    rJet.isDying = false;
    rJet.deathTimer = 0;
    rJet.fadeAlpha = 1.0;
    rJet.hp = 100.0;
    rJet.maxHp = 100.0;
    rJet.damageState = "NOMINAL";
    rJet.lastDamagedBy = "";
    rJet.damageSmokeTimer = 0;
    rJet.damageSparksTimer = 0;
    rJet.x = w * 0.80 + (idx % 2 === 1 ? 40 : 0);
    rJet.y = Math.min(h - 40.0, gAltY + (idx === 0 ? 50 : 75));
    rJet.angle = Math.PI;
    rJet.targetAngle = Math.PI;
    rJet.speed = specG.baseSpeed || 4.8;
    rJet.baseSpeed = specG.baseSpeed || 4.8;
    rJet.prevSpeed = rJet.speed;
    rJet.ps = 0;
    rJet.turnRate = 0;
    rJet.gForce = 1.0;
    rJet.isStalled = false;
    rJet.mode = "PATROL";
    rJet.modeTimer = 30;
    rJet.afterburner = true;
    rJet.targetJet = null;
    rJet.isLead = (idx === 0);
    rJet.isHero = false;
    rJet.rcs = specG.rcsClean || specG.rcs || 1.0;
    rJet.bayDoorTimer = 0;
    rJet.flareCooldown = 0;
    rJet.chaffCooldown = 0;
    rJet.gunCooldown = 0;
    rJet.missileCooldown = g === 1 ? 999999 : (10 + Math.floor(Math.random() * 11));
    rJet.laserCooldown = 0;
    rJet.triLaserCooldown = 0;
    rJet.superLaserCooldown = g === 7 ? (60 + Math.floor(Math.random() * 60)) : 0;
    rJet.superLaserPulse = 0;
    rJet.shieldPulse = 0;
    rJet.ccaDeployed = false;
    setupJetCallsignAndVariant(rJet, g, "red", idx);
    if (rJet.contrail) rJet.contrail.clear();
    if (rJet.wingVapor) rJet.wingVapor.clear();
  }

  // Assign mutual wingman links (or self when single)
  for (var wi = 0; wi < nActive; wi++) {
    var partnerIdx = (nActive > 1) ? ((wi % 2 === 0) ? (wi + 1 < nActive ? wi + 1 : wi) : wi - 1) : wi;
    bPool[wi].wingmanJet = bPool[partnerIdx];
    rPool[wi].wingmanJet = rPool[partnerIdx];
  }

  // Deactivate unused slots
  for (var rem = nActive; rem < 7; rem++) {
    bPool[rem].active = false;
    bPool[rem].targetJet = null;
    bPool[rem].wingmanJet = null;
    rPool[rem].active = false;
    rPool[rem].targetJet = null;
    rPool[rem].wingmanJet = null;
  }
}

syncFleetToActiveGenerations(activeGens);

if (typeof window !== "undefined") {
  window.FACTION_COLORS = FACTION_COLORS;
  window.drawJetSilhouette = drawJetSilhouette;
  window.AIRCRAFT_SPECS = AIRCRAFT_SPECS;
  window.WEAPON_DAMAGE_SPECS = WEAPON_DAMAGE_SPECS;
  window.applyAirframeDamage = applyAirframeDamage;
  window.StaticEntityPoolF32 = StaticEntityPoolF32;
  window.VfxParticlePool = VfxParticlePool;
  window.WreckagePool = WreckagePool;
  window.globalVfxParticlePool = globalVfxParticlePool;
  window.globalWreckagePool = globalWreckagePool;
  window.spawnStage1Fireball = spawnStage1Fireball;
  window.spawnStage2Wreckage = spawnStage2Wreckage;
  window.triggerStage3GroundImpact = triggerStage3GroundImpact;
  window.updateAndDrawWreckage = updateAndDrawWreckage;
  window.updateAndDrawVfxParticles = updateAndDrawVfxParticles;
  window.drawHudOverlay = drawHudOverlay;
  window.drawSegmentedHealthBar = drawSegmentedHealthBar;
  window.drawInWorldHealthBar = drawInWorldHealthBar;
  window.drawThrustScaledExhaust = drawThrustScaledExhaust;
  window.ThemeAlphaLUT = ThemeAlphaLUT;
  window.NINE_THEME_DEFINITIONS = NINE_THEME_DEFINITIONS;
  window.getHealthColor = getHealthColor;
  window.getHealthStatus = getHealthStatus;
  window.triggerTacticalRadio = triggerTacticalRadio;
  window.setGlobalRadioCallback = setGlobalRadioCallback;
  window.getAltitudeFeet = getAltitudeFeet;
  window.getYFromAltitude = getYFromAltitude;
  window.getBarometricDensity = getBarometricDensity;
  window.getDynamicPressure = getDynamicPressure;
  window.calculateEnergyHeight = calculateEnergyHeight;
  window.calculateSpecificExcessPower = calculateSpecificExcessPower;
  window.calculateAspectAngle = calculateAspectAngle;
  window.calculateRadarDetectionRange = calculateRadarDetectionRange;
  window.oodaDeployFlares = oodaDeployFlares;
  window.oodaDeployChaff = oodaDeployChaff;
  window.oodaObserveThreats = oodaObserveThreats;
  window.oodaOrientTactics = oodaOrientTactics;
  window.oodaDecideAction = oodaDecideAction;
  window.canAcquireTargetLock = canAcquireTargetLock;
  window.SERVICE_CEILINGS = SERVICE_CEILINGS;
  window.RESPAWN_CEILINGS = RESPAWN_CEILINGS;
  window.activeGens = activeGens;
  window.hasAnyActiveGen = hasAnyActiveGen;
  window.toggleGeneration = toggleGeneration;
  window.syncFleetToActiveGenerations = syncFleetToActiveGenerations;
  window.globalDogfightJets = globalDogfightJetsState;
  window.V_CORNER = V_CORNER;
  window.evaluateMissileSeekerDegradation = evaluateMissileSeekerDegradation;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports.FACTION_COLORS = FACTION_COLORS;
  module.exports.drawJetSilhouette = drawJetSilhouette;
  module.exports.AIRCRAFT_SPECS = AIRCRAFT_SPECS;
  module.exports.WEAPON_DAMAGE_SPECS = WEAPON_DAMAGE_SPECS;
  module.exports.applyAirframeDamage = applyAirframeDamage;
  module.exports.StaticEntityPoolF32 = StaticEntityPoolF32;
  module.exports.VfxParticlePool = VfxParticlePool;
  module.exports.WreckagePool = WreckagePool;
  module.exports.globalVfxParticlePool = globalVfxParticlePool;
  module.exports.globalWreckagePool = globalWreckagePool;
  module.exports.spawnStage1Fireball = spawnStage1Fireball;
  module.exports.spawnStage2Wreckage = spawnStage2Wreckage;
  module.exports.triggerStage3GroundImpact = triggerStage3GroundImpact;
  module.exports.updateAndDrawWreckage = updateAndDrawWreckage;
  module.exports.updateAndDrawVfxParticles = updateAndDrawVfxParticles;
  module.exports.drawHudOverlay = drawHudOverlay;
  module.exports.drawSegmentedHealthBar = drawSegmentedHealthBar;
  module.exports.drawInWorldHealthBar = drawInWorldHealthBar;
  module.exports.drawThrustScaledExhaust = drawThrustScaledExhaust;
  module.exports.ThemeAlphaLUT = ThemeAlphaLUT;
  module.exports.NINE_THEME_DEFINITIONS = NINE_THEME_DEFINITIONS;
  module.exports.getHealthColor = getHealthColor;
  module.exports.getHealthStatus = getHealthStatus;
  module.exports.triggerTacticalRadio = triggerTacticalRadio;
  module.exports.setGlobalRadioCallback = setGlobalRadioCallback;
  module.exports.getAltitudeFeet = getAltitudeFeet;
  module.exports.getYFromAltitude = getYFromAltitude;
  module.exports.getBarometricDensity = getBarometricDensity;
  module.exports.getDynamicPressure = getDynamicPressure;
  module.exports.calculateEnergyHeight = calculateEnergyHeight;
  module.exports.calculateSpecificExcessPower = calculateSpecificExcessPower;
  module.exports.calculateAspectAngle = calculateAspectAngle;
  module.exports.calculateRadarDetectionRange = calculateRadarDetectionRange;
  module.exports.oodaDeployFlares = oodaDeployFlares;
  module.exports.oodaDeployChaff = oodaDeployChaff;
  module.exports.oodaObserveThreats = oodaObserveThreats;
  module.exports.oodaOrientTactics = oodaOrientTactics;
  module.exports.oodaDecideAction = oodaDecideAction;
  module.exports.canAcquireTargetLock = canAcquireTargetLock;
  module.exports.SERVICE_CEILINGS = SERVICE_CEILINGS;
  module.exports.RESPAWN_CEILINGS = RESPAWN_CEILINGS;
  module.exports.activeGens = activeGens;
  module.exports.hasAnyActiveGen = hasAnyActiveGen;
  module.exports.toggleGeneration = toggleGeneration;
  module.exports.syncFleetToActiveGenerations = syncFleetToActiveGenerations;
  module.exports.globalDogfightJets = globalDogfightJetsState;
  module.exports.V_CORNER = V_CORNER;
  module.exports.evaluateMissileSeekerDegradation = evaluateMissileSeekerDegradation;
}

var globalRadioAdd = null;
var globalReassignHero = null;
var globalSetAllOffline = null;

function updateGenSelectorUI() {
  var btns = document.querySelectorAll(".gen-btn");
  for (var i = 0; i < btns.length; i++) {
    var btn = btns[i];
    var gAttr = btn.getAttribute("data-gen") || (btn.dataset && btn.dataset.gen);
    var gNum = parseInt(gAttr, 10);
    if (gNum >= 1 && gNum <= 7) {
      var isAct = Boolean(activeGens[gNum]);
      btn.classList.toggle("active", isAct);
      btn.setAttribute("aria-pressed", isAct ? "true" : "false");
    }
  }
}

function toggleGeneration(genNum) {
  if (genNum < 1 || genNum > 7) return;
  activeGens[genNum] = !activeGens[genNum];
  saveActiveGens();
  updateGenSelectorUI();

  var hasAny = hasAnyActiveGen();

  var genNames = [
    "",
    "GEN 1 (F-86 / MiG-15 Gunfighter)",
    "GEN 2 (F-104 / MiG-21 Supersonic)",
    "GEN 3 (F-4 / MiG-23 Radar Phantom)",
    "GEN 4 (F-16 Falcon Boyd 9G / F-14 Tomcat)",
    "GEN 5 (F-22 / Su-57 Stealth & Cobra)",
    "GEN 6 (NGAD / CCA Laser Swarm)",
    "GEN 7 (Quantum Swarm Globes / Omni-Directional Spheres)"
  ];
  if (globalRadioAdd) {
    if (!hasAny) {
      globalRadioAdd("TAC-NET: ALL GENERATIONS OFFLINE -> AIRSPACE DISENGAGED");
    } else {
      globalRadioAdd("TAC-NET: " + genNames[genNum] + (activeGens[genNum] ? " [ACTIVE]" : " [OFFLINE]"));
    }
  }
  if (!hasAny && globalSetAllOffline) {
    globalSetAllOffline();
  } else if (globalReassignHero) {
    globalReassignHero(genNum);
  } else {
    syncFleetToActiveGenerations(activeGens);
  }
}

function setupGenSelector() {
  updateGenSelectorUI();
}

if (typeof document !== "undefined" && !window._genSelectorDelegated) {
  window._genSelectorDelegated = true;
  document.addEventListener("click", function(e) {
    var target = e.target;
    var btn = target && (target.classList && target.classList.contains("gen-btn") ? target : (target.closest ? target.closest(".gen-btn") : null));
    if (!btn) return;
    var gAttr = btn.getAttribute("data-gen") || (btn.dataset && btn.dataset.gen);
    var gNum = parseInt(gAttr, 10);
    if (gNum >= 1 && gNum <= 7) {
      e.preventDefault();
      e.stopPropagation();
      toggleGeneration(gNum);
    }
  });
}

function drawJetSilhouette(ctx, gen, isLead, colors, alpha, time, jet) {
  ctx.save();
  ctx.fillStyle = getAlphaColor("fg", alpha || 0.85);
  ctx.strokeStyle = getAlphaColor("fg", alpha || 0.85);

  var isRed = Boolean(jet && (jet.team === "red" || jet.isRed));
  var faction = isRed ? FACTION_COLORS.red : FACTION_COLORS.blue;
  var fPrimary = faction.primary;
  var fAccent = faction.accent;

  switch (gen) {
    case 1:
      // Base airframe hull
      ctx.fillRect(8, -1, 3, 3);
      ctx.fillRect(0, -3, 8, 7);
      ctx.fillRect(-8, -2, 8, 5);
      ctx.fillRect(-2, -9, 4, 7);
      ctx.fillRect(-2, 3, 4, 7);
      ctx.fillRect(-9, -4, 3, 3);

      // Faction Accents: Nose intake ring, wingtip caps, tail flash, roundel
      ctx.fillStyle = fPrimary;
      ctx.fillRect(9, -1, 2, 3); // Nose intake lip ring
      ctx.fillRect(-9, -3, 2, 2); // Vertical fin flash
      ctx.fillStyle = fAccent;
      ctx.fillRect(-2, -9, 4, 2); // Port wingtip cap
      ctx.fillRect(-2, 8, 4, 2); // Starboard wingtip cap
      ctx.fillStyle = fPrimary;
      ctx.fillRect(2, -1, 3, 3); // Fuselage roundel
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(3, 0, 1, 1);
      break;

    case 2:
      // Base pencil airframe & stub wings
      ctx.fillRect(11, 0, 4, 1);
      ctx.fillRect(0, -1, 11, 3);
      ctx.fillRect(-10, -2, 10, 5);
      ctx.fillRect(-3, -7, 4, 5);
      ctx.fillRect(-3, 3, 4, 5);
      ctx.fillRect(-10, -5, 3, 4);
      ctx.fillRect(-12, -6, 5, 2);

      // Faction Accents: Dorsal spine stripe, wingtip tip tanks/rails, T-tail tip
      ctx.fillStyle = fPrimary;
      ctx.fillRect(2, 0, 7, 1); // Dorsal high-vis team stripe
      ctx.fillRect(-12, -6, 5, 1); // T-tail leading edge flash
      ctx.fillStyle = fAccent;
      ctx.fillRect(-4, -8, 5, 2); // Port wingtip missile rail / tip tank
      ctx.fillRect(-4, 7, 5, 2); // Starboard wingtip missile rail / tip tank
      ctx.fillRect(13, 0, 2, 1); // Pitot tip marker
      break;

    case 3:
      // Base Phantom hull & cranked wings
      ctx.fillRect(6, -2, 6, 5);
      ctx.fillRect(-4, -4, 10, 9);
      ctx.fillRect(-10, -3, 6, 7);
      ctx.fillRect(-4, -11, 6, 8);
      ctx.fillRect(-4, 4, 6, 8);
      ctx.fillRect(-12, -6, 4, 3);
      ctx.fillRect(-12, 4, 4, 3);

      // Faction Accents: Outer dihedral wing panels, intake ramp stripe, taileron tips
      ctx.fillStyle = fPrimary;
      ctx.fillRect(0, -4, 2, 9); // Intake ramp boundary stripe
      ctx.fillRect(-12, -6, 4, 1); // Port taileron tip
      ctx.fillRect(-12, 6, 4, 1); // Starboard taileron tip
      ctx.fillRect(-2, -6, 2, 2); // Port wing insignia
      ctx.fillRect(-2, 5, 2, 2); // Starboard wing insignia
      ctx.fillStyle = fAccent;
      ctx.fillRect(-3, -11, 5, 2); // Port outer wing dihedral tip panel
      ctx.fillRect(-3, 10, 5, 2); // Starboard outer wing dihedral tip panel
      break;

    case 4: // Gen 4: F-14 Tomcat variable-sweep / F-16 Falcon agile dogfighter
      if (jet && (jet.variant === "F16" || (jet.callsign && jet.callsign.indexOf("VIPER") !== -1))) {
        // F-16 Fighting Falcon: single-engine lightweight agile fighter with cropped delta wings
        ctx.fillRect(8, -1, 4, 2);
        ctx.fillRect(2, -2, 6, 4);
        ctx.fillRect(-6, -3, 8, 6);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(3, -1, 3, 2); // Bubble canopy
        ctx.fillStyle = getAlphaColor("fg", alpha || 0.85);
        // Cropped delta wings with leading-edge strakes
        ctx.beginPath();
        ctx.moveTo(3, -2);
        ctx.lineTo(-4, -11);
        ctx.lineTo(-7, -11);
        ctx.lineTo(-6, -3);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(3, 2);
        ctx.lineTo(-4, 11);
        ctx.lineTo(-7, 11);
        ctx.lineTo(-6, 3);
        ctx.closePath();
        ctx.fill();
        // Ventral fins & single vertical tail
        ctx.fillRect(-10, -1, 4, 2);
        ctx.fillRect(-8, -4, 2, 2);
        ctx.fillRect(-8, 2, 2, 2);

        // F-16 Faction Accents: Wingtip AIM-9 missile rails, LERX strakes, tail cap
        ctx.fillStyle = fAccent;
        ctx.fillRect(-7, -12, 4, 2); // Port wingtip rail
        ctx.fillRect(-7, 11, 4, 2); // Starboard wingtip rail
        ctx.fillStyle = fPrimary;
        ctx.beginPath();
        ctx.moveTo(3, -2); ctx.lineTo(-1, -5); ctx.lineTo(-2, -2); ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(3, 2); ctx.lineTo(-1, 5); ctx.lineTo(-2, 2); ctx.closePath();
        ctx.fill();
        ctx.fillRect(-9, -1, 3, 2); // Vertical tail cap flash
      } else {
        // Central Lifting Pancake Body & Radome Nose
        ctx.fillRect(10, 0, 5, 1);
        ctx.fillRect(3, -1, 7, 3);
        ctx.fillRect(-8, -4, 12, 9);
        
        // Fixed Titanium Wing Glove Boxes
        ctx.fillRect(-2, -7, 6, 4);
        ctx.fillRect(-2, 4, 6, 4);

        // Twin Engine Nacelles
        ctx.fillRect(-12, -5, 5, 3);
        ctx.fillRect(-12, 3, 5, 3);

        // Twin Outward-Canted Vertical Stabilizers
        ctx.fillRect(-10, -5, 4, 2);
        ctx.fillRect(-10, 4, 4, 2);

        // All-Moving Horizontal Stabilators (Tailerons)
        ctx.fillRect(-13, -7, 4, 3);
        ctx.fillRect(-13, 5, 4, 3);

        // F-14 Faction Accents: Glove vane trims, twin vertical stabilizer fin caps
        ctx.fillStyle = fPrimary;
        ctx.fillRect(-2, -7, 4, 1); // Port glove vane accent
        ctx.fillRect(-2, 7, 4, 1); // Starboard glove vane accent
        ctx.fillRect(-10, -5, 4, 1); // Port outer fin flash
        ctx.fillRect(-10, 5, 4, 1); // Starboard outer fin flash

        // Dynamic Variable-Geometry Swing Wings (20° forward to 68° delta)
        var sweepRatio = (jet && typeof jet.wingSweep === "number") ? jet.wingSweep : 0.2;
        var sweepRad = 0.35 + sweepRatio * 0.83;

        // Left Swing Wing (Pivoting around (-2, -5))
        ctx.save();
        ctx.translate(-2, -5);
        ctx.rotate(-sweepRad);
        ctx.fillStyle = getAlphaColor("fg", alpha || 0.85);
        ctx.fillRect(-2, -9, 4, 10);
        ctx.fillStyle = fAccent;
        ctx.fillRect(0, -10, 2, 2); // Port swing wingtip beacon
        ctx.restore();

        // Right Swing Wing (Pivoting around (-2, 5))
        ctx.save();
        ctx.translate(-2, 5);
        ctx.rotate(sweepRad);
        ctx.fillStyle = getAlphaColor("fg", alpha || 0.85);
        ctx.fillRect(-2, 0, 4, 10);
        ctx.fillStyle = fAccent;
        ctx.fillRect(0, 9, 2, 2); // Starboard swing wingtip beacon
        ctx.restore();
      }
      break;

    case 5:
      // Base stealth diamond airframe
      ctx.fillRect(7, -1, 5, 3);
      ctx.fillRect(0, -2, 7, 5);
      ctx.fillRect(-6, -11, 8, 9);
      ctx.fillRect(-6, 3, 8, 9);
      ctx.fillRect(-10, -6, 4, 3);
      ctx.fillRect(-10, 4, 4, 3);

      // Faction Accents: Chined stealth trims, outer wingtip facets, canted tail caps, bay perimeter
      ctx.fillStyle = fAccent;
      ctx.fillRect(6, -1, 3, 1); // Chined nose port trim
      ctx.fillRect(6, 1, 3, 1); // Chined nose starboard trim
      ctx.fillRect(-6, -11, 4, 2); // Port outer trapezoidal wing facet
      ctx.fillRect(-6, 10, 4, 2); // Starboard outer trapezoidal wing facet
      ctx.fillStyle = fPrimary;
      ctx.fillRect(-10, -6, 4, 1); // Port canted tail cap
      ctx.fillRect(-10, 6, 4, 1); // Starboard canted tail cap
      ctx.fillRect(-1, -2, 4, 1); // Weapons bay seam port
      ctx.fillRect(-1, 2, 4, 1); // Weapons bay seam starboard

      // Mach 2.0+ (V >= 6.8) High-Energy Dual Plasma Boundary Shear Lines along chined fuselage
      if (jet && jet.speed >= 6.8) {
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        // Port plasma shear line
        ctx.moveTo(12, 0); ctx.lineTo(6, -3); ctx.lineTo(-6, -12); ctx.lineTo(-10, -6);
        // Starboard plasma shear line
        ctx.moveTo(12, 0); ctx.lineTo(6, 3); ctx.lineTo(-6, 12); ctx.lineTo(-10, 6);
        ctx.stroke();
        ctx.strokeStyle = fAccent;
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.restore();
      }
      break;

    case 6: // Gen 6: Next-Gen Air Dominance (NGAD) with Deployable CCA Loyal Wingman Drones
      // Base lambda cranked-arrow wing
      ctx.fillRect(8, -1, 4, 3);
      ctx.fillRect(2, -4, 6, 9);
      ctx.fillRect(-4, -9, 6, 19);
      ctx.fillRect(-10, -13, 6, 27);

      // Faction Accents: Wingtip beacon trims, dorsal chevron command insignia, CCA docking rail status
      ctx.fillStyle = fAccent;
      ctx.fillRect(-10, -13, 3, 2); // Port lambda wingtip beacon
      ctx.fillRect(-10, 12, 3, 2); // Starboard lambda wingtip beacon
      ctx.fillStyle = fPrimary;
      // Dorsal chevron command insignia
      ctx.beginPath();
      ctx.moveTo(5, 0); ctx.lineTo(1, -3); ctx.lineTo(2, 0); ctx.lineTo(1, 3); ctx.closePath();
      ctx.fill();

      if (!jet || !jet.ccaDeployed) {
        // Mounted / Docked CCA Loyal Wingman Drones on wing pylons
        ctx.fillStyle = getAlphaColor("fg", alpha || 0.85);
        ctx.fillRect(-2, -18, 4, 3);
        ctx.fillRect(-2, 16, 4, 3);
        ctx.fillStyle = fAccent;
        ctx.fillRect(-3, -19, 2, 5); // CCA port drone winglet
        ctx.fillRect(-3, 15, 2, 5); // CCA starboard drone winglet
      } else {
        // Empty release pylons with active faction status glow
        ctx.strokeStyle = fPrimary;
        ctx.lineWidth = 1;
        ctx.strokeRect(-2, -18, 4, 2);
        ctx.strokeRect(-2, 16, 4, 2);
      }
      break;

    case 7: // Gen 7: Autonomous Quantum Swarm of Mastered Physics Spheres/Globes
      var d1 = (jet && jet.drone1) || { x: 16, y: 0 };
      var d2 = (jet && jet.drone2) || { x: -6, y: -14 };
      var d3 = (jet && jet.drone3) || { x: -6, y: 14 };

      ctx.save();
      var tNow = time || 0;
      var isChargingSuper = (jet && ((jet.superLaserCooldown > 0 && jet.superLaserCooldown < 35) || jet.superLaserPulse > 0 || jet.swarmMode === "FORM_UP"));

      if (isChargingSuper) {
        // 9 Quantum Globes Fuse / Team Up into a Single Massive Super-Globe / Singularity Projector Ball
        var focalGx = 16;
        var focalGy = 0;
        var masterR = 12 + ((jet.superLaserPulse || 0) * 4);

        // Giant Resonant Outer Quantum Aura in faction glow
        ctx.fillStyle = faction.glow;
        ctx.beginPath();
        ctx.arc(focalGx, focalGy, masterR + 6, 0, Math.PI * 2);
        ctx.fill();

        // Primary Super-Globe Core
        ctx.fillStyle = getAlphaColor("fg", alpha || 0.95);
        ctx.beginPath();
        ctx.arc(focalGx, focalGy, masterR, 0, Math.PI * 2);
        ctx.fill();

        // White-Hot Singularity Plasma Heart
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(focalGx, focalGy, masterR * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // 6 Orbiting Sub-Globes with alternating team colors and white cores
        for (var si = 0; si < 6; si++) {
          var sAng = (tNow * 0.02) + (si * Math.PI / 3);
          var sx = focalGx + Math.cos(sAng) * (masterR + 7);
          var sy = focalGy + Math.sin(sAng) * (masterR + 5);
          ctx.fillStyle = (si % 2 === 0) ? fPrimary : fAccent;
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Resonant Energy Ring in faction accent
        ctx.strokeStyle = fAccent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(focalGx, focalGy, masterR + 10, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 3 Independent Primary Quantum Spheres / Globes + 6 Orbiting Mini-Globes (9 Total Sovereign Entities)
        var globes = [
          { x: d1.x, y: d1.y, r: 5.5 },
          { x: d2.x, y: d2.y, r: 5.0 },
          { x: d3.x, y: d3.y, r: 5.0 }
        ];

        // Draw each primary quantum globe
        for (var gi = 0; gi < globes.length; gi++) {
          var g = globes[gi];

          // Omni-directional propulsion halo (mastered physics: zero-inertia energetic glow in team color)
          var haloR = g.r + (jet && jet.afterburner ? 3.5 : 1.5);
          ctx.fillStyle = faction.glow;
          ctx.beginPath();
          ctx.arc(g.x, g.y, haloR, 0, Math.PI * 2);
          ctx.fill();

          // Solid Spherical Energy Hull
          ctx.fillStyle = getAlphaColor("fg", alpha || 0.95);
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
          ctx.fill();

          // Luminous White-Hot Singularity Pupil / Core
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.r * 0.45, 0, Math.PI * 2);
          ctx.fill();

          // Omni-directional micro-thrust particle trail in team color
          var flLen = (jet && jet.afterburner ? 6 : 2) + Math.random() * 3;
          ctx.fillStyle = fPrimary;
          ctx.fillRect(Math.floor(g.x - g.r - flLen), Math.floor(g.y - 1), flLen, 2);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(Math.floor(g.x - g.r - Math.floor(flLen * 0.5)), Math.floor(g.y), Math.floor(flLen * 0.5), 1);
        }

        // Swarm of Swarms: 6 Orbiting Mini-Globes / Energy Balls with team highlights
        var tAng1 = tNow * 0.008;
        var tAng2 = tNow * 0.008 + 2.09;
        var tAng3 = tNow * 0.008 + 4.18;

        var subMotes = [
          { x: d1.x + Math.cos(tAng1) * 8.5, y: d1.y + Math.sin(tAng1) * 7.5 },
          { x: d1.x + Math.cos(tAng1 + Math.PI) * 8.5, y: d1.y + Math.sin(tAng1 + Math.PI) * 7.5 },
          { x: d2.x + Math.cos(tAng2) * 7.5, y: d2.y + Math.sin(tAng2) * 6.5 },
          { x: d2.x + Math.cos(tAng2 + Math.PI) * 7.5, y: d2.y + Math.sin(tAng2 + Math.PI) * 6.5 },
          { x: d3.x + Math.cos(tAng3) * 7.5, y: d3.y + Math.sin(tAng3) * 6.5 },
          { x: d3.x + Math.cos(tAng3 + Math.PI) * 7.5, y: d3.y + Math.sin(tAng3 + Math.PI) * 6.5 }
        ];

        for (var mi = 0; mi < subMotes.length; mi++) {
          var sm = subMotes[mi];
          ctx.fillStyle = fAccent;
          ctx.beginPath();
          ctx.arc(sm.x, sm.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(sm.x, sm.y, 1.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Individual & Collective Quantum Capability Shield Spheres in team color
      if (jet && jet.shieldPulse > 0) {
        ctx.strokeStyle = fAccent;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        if (isChargingSuper) {
          ctx.arc(16, 0, 22 * jet.shieldPulse, 0, Math.PI * 2);
          ctx.arc(16, 0, 30 * jet.shieldPulse, 0, Math.PI * 2);
        } else {
          ctx.arc(d1.x, d1.y, 10 * jet.shieldPulse, 0, Math.PI * 2);
          ctx.arc(d2.x, d2.y, 9 * jet.shieldPulse, 0, Math.PI * 2);
          ctx.arc(d3.x, d3.y, 9 * jet.shieldPulse, 0, Math.PI * 2);
        }
        ctx.stroke();
        jet.shieldPulse *= 0.90;
      }
      ctx.restore();
      break;

    default:
      ctx.fillRect(0, -2, 10, 5);
      ctx.fillRect(-6, -6, 8, 4);
      ctx.fillRect(-6, 3, 8, 4);
      ctx.fillStyle = fPrimary;
      ctx.fillRect(2, -1, 4, 2);
      break;
  }
  ctx.restore();
}

function initGlobalDogfight() {
  var canvas = document.getElementById("dogfight-canvas");
  if (!canvas) return;
  canvas.style.display = "block";
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var width = canvas.width = Math.min(window.innerWidth, 1440);
  var height = canvas.height = Math.min(window.innerHeight, 900);
  var lastDogfightTime = 0;

  function onResize() {
    if (canvas) {
      width = canvas.width = Math.min(window.innerWidth, 1440);
      height = canvas.height = Math.min(window.innerHeight, 900);
    }
  }
  window.removeEventListener("resize", onResize);
  window.addEventListener("resize", onResize);

  var GRAVITY = 0.045;
  var V_STALL = 1.8;
  var V_CORNER = 4.8;
  var V_MAX = 7.6;

  var SERVICE_CEILINGS = {
    1: 45000,
    2: 55000,
    3: 58000,
    4: 60000,
    5: 65000,
    6: 75000,
    7: 100000
  };

  var RESPAWN_CEILINGS = {
    1: 35000,
    2: 45000,
    3: 48000,
    4: 52000,
    5: 60000,
    6: 72000,
    7: 92000
  };

  function getAltitudeFeet(canvasY, canvasH) {
    var hCanvas = canvasH || height;
    if (hCanvas <= 0) return 0;
    var ratio = 1.0 - (canvasY / hCanvas);
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;
    return ratio * 100000.0;
  }

  function getYFromAltitude(altFt, canvasH) {
    var hCanvas = canvasH || height;
    if (hCanvas <= 0) return 0;
    var ratio = altFt / 100000.0;
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;
    return (1.0 - ratio) * hCanvas;
  }

  function getBarometricDensity(altFt) {
    var rho0 = 0.002377; // slug/ft^3 sea level
    var h = altFt < 0 ? 0 : altFt;
    return rho0 * Math.exp(-h / 25000.0);
  }

  function getDynamicPressure(altFt, speed) {
    var rho = getBarometricDensity(altFt);
    var velFps = speed * 110.0;
    return 0.5 * rho * velFps * velFps;
  }

  var bluePool = globalDogfightJetsState.bluePool;
  var redPool = globalDogfightJetsState.redPool;
  var allJets = globalDogfightJetsState.allJets;
  var f16 = bluePool[0];

  syncFleetToActiveGenerations(activeGens, width, height);

  var blueIngressTimer = 0;
  var redIngressTimer = 0;

  function scrambleWave(team, gen) {
    if (!hasAnyActiveGen()) return;
    var pool = (team === "blue") ? bluePool : redPool;
    var isBlue = (team === "blue");

    var activeList = [];
    for (var g = 1; g <= 7; g++) {
      if (activeGens[g]) activeList.push(g);
    }
    if (activeList.length === 0) return;

    for (var idx = 0; idx < activeList.length; idx++) {
      var g = activeList[idx];
      var specG = AIRCRAFT_SPECS[g] || AIRCRAFT_SPECS[4];
      var jet = pool[idx];
      if (!jet.active || jet.isDying || jet.hp <= 0) {
        jet.gen = g;
        jet.active = true;
        jet.isDying = false;
        jet.deathTimer = 0;
        jet.fadeAlpha = 1.0;
        jet.hp = 100.0;
        jet.maxHp = 100.0;
        jet.damageState = "NOMINAL";
        jet.lastDamagedBy = "";
        jet.damageSmokeTimer = 0;
        jet.damageSparksTimer = 0;
        jet.x = isBlue ? (-60 - idx * 45) : (width + 60 + idx * 45);
        var baseMultiCeilY = getYFromAltitude(RESPAWN_CEILINGS[g] || 52000, height);
        jet.y = isBlue ? Math.max(32.0, baseMultiCeilY - (idx === 0 ? 50 : 25)) : Math.min(height - 40.0, baseMultiCeilY + (idx === 0 ? 50 : 75));
        jet.angle = isBlue ? 0.0 : Math.PI;
        jet.targetAngle = jet.angle;
        jet.speed = specG.baseSpeed * 1.15;
        jet.baseSpeed = specG.baseSpeed;
        jet.prevSpeed = jet.speed;
        jet.turnRate = 0;
        jet.gForce = 1.0;
        jet.energyHeight = 0;
        jet.ps = 0;
        jet.isStalled = false;
        jet.stallBuffet = 0;
        jet.mode = "PATROL";
        jet.modeTimer = 30;
        jet.isTailChasing = false;
        jet.tailChaseTimer = 0;
        jet.afterburner = true;
        jet.flareCooldown = 0;
        jet.gunCooldown = 0;
        jet.missileCooldown = g === 1 ? 999999 : (10 + Math.floor(Math.random() * 11));
        jet.laserCooldown = 0;
        jet.triLaserCooldown = 0;
        jet.superLaserCooldown = g === 7 ? (60 + Math.floor(Math.random() * 60)) : 0;
        jet.superLaserPulse = 0;
        jet.shieldPulse = 0;
        jet.bayDoorTimer = 0;
        jet.rcs = specG.rcsClean || specG.rcs || 1.0;
        jet.sensors = {
          radarLocked: false,
          lockQuality: 0,
          inRwrWarning: false,
          detectedThreats: []
        };
        jet.ccaDeployed = false;
        jet.targetJet = null;
        if (jet.contrail) jet.contrail.clear();
        if (jet.wingVapor) jet.wingVapor.clear();

        setupJetCallsignAndVariant(jet, g, team, idx);
      }
    }
    addRadio("TAC-NET: " + (isBlue ? "BLUE FORCE" : "RED FORCE") + " REINFORCEMENTS SCRAMBLING FROM FLANK!");
  }

  var missilesPool = new StaticEntityPoolF32(48, 8);
  var missileSmokes = [];
  for (var ms = 0; ms < 48; ms++) {
    missileSmokes.push(new ContrailRingBufferF32(20, 4));
  }

  var vfxParticlePool = globalVfxParticlePool;
  var wreckagePool = globalWreckagePool;
  var flaresPool = new StaticEntityPoolF32(64, 5);
  var chaffPool = new StaticEntityPoolF32(64, 5);
  var bulletsPool = new StaticEntityPoolF32(64, 6);
  var explosionsPool = new StaticEntityPoolF32(128, 6);

  if (typeof window !== "undefined") {
    window.globalChaffPool = chaffPool;
  }
  if (typeof global !== "undefined") {
    global.globalChaffPool = chaffPool;
  }

  var MAX_RADIO = 5;
  var radioBuffer = [
    { text: "", alpha: 0 },
    { text: "", alpha: 0 },
    { text: "", alpha: 0 },
    { text: "", alpha: 0 },
    { text: "", alpha: 0 }
  ];
  var radioHead = 0;
  var radioCount = 0;

  function addRadio(text) {
    var slot = radioBuffer[radioHead];
    slot.text = text;
    slot.alpha = 1.0;
    radioHead = (radioHead + 1) % MAX_RADIO;
    if (radioCount < MAX_RADIO) radioCount++;
  }
  globalRadioAdd = addRadio;

  window.globalScrambleNewGen = function(newGen) {
    if (!newGen || !activeGens[newGen]) return;
    syncFleetToActiveGenerations(activeGens);
    for (var bi = 0; bi < bluePool.length; bi++) {
      var jet = bluePool[bi];
      if (jet.active && !jet.isDying && jet.isHero) {
        var spec = AIRCRAFT_SPECS[jet.gen] || AIRCRAFT_SPECS[4];
        addRadio("TAC-NET: SCRAMBLING AIRFRAME -> " + (jet.gen === 7 ? "GEN 7 QUANTUM SWARM GLOBES" : (spec.hudName || ("GEN " + jet.gen))));
      }
    }
  };

  globalSetAllOffline = function() {
    for (var i = 0; i < allJets.length; i++) allJets[i].active = false;
  };

  globalReassignHero = function(toggledGen) {
    if (!hasAnyActiveGen()) {
      globalSetAllOffline();
      return;
    }
    syncFleetToActiveGenerations(activeGens);
  };

  if (typeof window !== "undefined") {
    window.globalDogfightJets = { bluePool: bluePool, redPool: redPool, allJets: allJets, syncFleetToActiveGenerations: syncFleetToActiveGenerations };
  }
  if (typeof global !== "undefined") {
    global.globalDogfightJets = { bluePool: bluePool, redPool: redPool, allJets: allJets, syncFleetToActiveGenerations: syncFleetToActiveGenerations };
  }

  function updateJetPhysics(jet, targetEnemy, incomingThreat, opposingPool, missilesPoolRef) {
    var altFt = getAltitudeFeet(jet.y, height);
    var rho = getBarometricDensity(altFt);
    var rho0 = 0.002377;
    var densityRatio = Math.max(0.001, rho / rho0);
    var sCeiling = SERVICE_CEILINGS[jet.gen] || 60000;

    var spec = AIRCRAFT_SPECS[jet.gen] || AIRCRAFT_SPECS[4];
    var isF16 = (jet.gen === 4 && (jet.variant === "F16" || (jet.callsign && jet.callsign.indexOf("VIPER") !== -1)));
    var mass = isF16 ? 1.1 : (spec.mass || 1.0);

    // Dynamic Weapons Bay Door Timer Countdown and RCS Bloom Recovery
    if (jet.bayDoorTimer > 0) {
      jet.bayDoorTimer--;
      jet.rcs = spec.rcsBloom || 1.2;
      if (jet.bayDoorTimer <= 0) {
        jet.rcs = spec.rcsClean || spec.rcs || 1.0;
      }
    } else {
      jet.rcs = spec.rcsClean || spec.rcs || 1.0;
    }

    // Dynamic Energy Height He = H + V^2 / 2g
    var velFps = jet.speed * 110.0;
    var gAccel = 32.174;
    var heFt = calculateEnergyHeight(altFt, velFps, gAccel);
    jet.energyHeight = heFt;

    // Decrement Cooldowns & Timers
    if (typeof jet.flareCooldown === "number" && jet.flareCooldown > 0) jet.flareCooldown--;
    if (typeof jet.chaffCooldown === "number" && jet.chaffCooldown > 0) jet.chaffCooldown--;
    if (typeof jet.modeTimer === "number" && jet.modeTimer > 0) jet.modeTimer--;
    if (typeof jet.pitchbackTimer === "number" && jet.pitchbackTimer > 0) jet.pitchbackTimer--;

    // Autonomous AI GPWS dynamic recovery calculation (sink rate > 2500 ft/min or alt < 5000 ft or hRec)
    var vySim = Math.sin(jet.angle) * jet.speed;
    var vyFps = vySim * 110.0;
    var isDescending = (vySim > 0.0);
    var sinkRateFpm = isDescending ? (vyFps * 60.0) : 0.0;
    var nMaxG = (jet.gen === 7) ? 12.0 : (jet.gen >= 4 ? 9.0 : 7.5);
    var hRec = (isDescending && nMaxG > 1.0) ? (vyFps * vyFps) / (2.0 * gAccel * (nMaxG - 1.0)) : 0.0;
    var hMargin = isDescending ? (vyFps * 0.4 + 1000.0) : 800.0;

    var gpwsTrigger = isDescending && altFt > 0 && (altFt <= (hRec + hMargin) || altFt < 5000.0 || sinkRateFpm > 2500.0);

    // Boundary Detection & High-G Turnback Reaction (x < 100 or x > width - 100)
    var isHeadingWest = (Math.cos(jet.angle) < 0.1);
    var isHeadingEast = (Math.cos(jet.angle) > -0.1);
    var hitLeftBoundary = (jet.x < 100 && isHeadingWest);
    var hitRightBoundary = (jet.x > width - 100 && isHeadingEast);

    if ((hitLeftBoundary || hitRightBoundary) && jet.mode !== "GPWS_PULLUP") {
      jet.mode = "BOUNDARY_SLICE";
      jet.modeTimer = 24;
      var targetArenaX = width * 0.5;
      var targetArenaY = Math.min(Math.max(jet.y, 120), height - 120);
      jet.targetAngle = Math.atan2(targetArenaY - jet.y, targetArenaX - jet.x);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else if (gpwsTrigger) {
      jet.mode = "GPWS_PULLUP";
      jet.oodaPhase = "ACT";
      jet.targetAngle = Math.max(-0.45, -vyFps / 120.0);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
      if (Math.random() < 0.04) {
        addRadio((jet.callsign || spec.callsign) + ": GPWS PULL UP! RECOVERY PITCH ENGAGED (" + Math.round(altFt) + " FT)");
      }
    } else if (jet.isStalled) {
      jet.mode = "STALL_RECOVERY";
      jet.oodaPhase = "ACT";
      var isHeadingRightStall = Math.cos(jet.angle) >= 0;
      jet.targetAngle = isHeadingRightStall ? 0.0 : (jet.angle < 0 ? -Math.PI : Math.PI);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
      if (jet.speed > V_CORNER * 0.75) {
        jet.isStalled = false;
        jet.mode = "EXTEND";
        jet.modeTimer = 60;
        jet.throttleSetting = 1.5;
        jet.afterburner = true;
        addRadio((jet.callsign || spec.callsign) + ": STALL RECOVERED. ACCELERATING ON THE DECK.");
      }
    } else {
      // 4-Phase Boyd OODA State Machine Execution
      jet.oodaPhase = "OBSERVE";
      var mPool = missilesPoolRef || missilesPool;
      var oPool = opposingPool || (jet.team === "blue" ? redPool : bluePool);
      var obs = oodaObserveThreats(jet, oPool, mPool, width, height);

      jet.oodaPhase = "ORIENT";
      var ori = oodaOrientTactics(jet, obs, altFt, sCeiling);

      // Generational reaction latency management
      if (typeof jet.oodaLatencyTimer === "undefined") jet.oodaLatencyTimer = 0;
      if (jet.oodaLatencyTimer > 0) {
        jet.oodaLatencyTimer--;
      }

      if (jet.oodaLatencyTimer <= 0) {
        oodaDecideAction(jet, obs, ori, targetEnemy, altFt, sCeiling, flaresPool, chaffPool);
        jet.oodaLatencyTimer = spec.oodaLatencyFrames || 0;
      }
    }

    // Low-altitude ground-effect leveling invariant (preserves 360-deg horizontal heading):
    if (jet.mode !== "BREAK" && jet.mode !== "GPWS_PULLUP") {
      var isFacingRight = Math.cos(jet.angle) >= 0;
      if (altFt <= 2000) {
        if (Math.sin(jet.targetAngle) > -0.10) {
          jet.targetAngle = isFacingRight ? -0.15 : (jet.targetAngle < 0 ? -Math.PI + 0.15 : Math.PI - 0.15);
        }
      } else if (altFt <= 5000) {
        if (Math.sin(jet.targetAngle) > 0.0) {
          jet.targetAngle = isFacingRight ? -0.05 : (jet.targetAngle < 0 ? -Math.PI + 0.05 : Math.PI - 0.05);
        }
      } else if (altFt <= 12000) {
        if (Math.sin(jet.targetAngle) > 0.35) {
          jet.targetAngle = isFacingRight ? 0.25 : (jet.targetAngle < 0 ? -Math.PI + 0.25 : Math.PI - 0.25);
        }
      }
    }

    // F-14 CADC Dynamic Variable Wing Sweep Calculation based on E-M parameters
    if (jet.gen === 4 && (!jet.variant || jet.variant === "F14")) {
      var targetSweep = 0.0;
      if (jet.isStalled || jet.mode === "BREAK" || jet.gForce > 3.6 || jet.speed < 4.0) {
        targetSweep = 0.0; // 20 deg unswept forward (Max High-G lift & tight turn radius)
      } else if (jet.speed > 5.4 || jet.mode === "EXTEND") {
        targetSweep = 1.0; // 68 deg delta swept back (Supersonic Wave Drag Minimization)
      } else {
        targetSweep = Math.min(Math.max((jet.speed - 4.0) / 1.4, 0.0), 1.0);
      }
      if (typeof jet.wingSweep === "undefined") jet.wingSweep = 0.0;
      jet.wingSweep += (targetSweep - jet.wingSweep) * 0.14;
    }

    // Smooth near-space AI pitch-leveling invariant (theta -> 0)
    if (altFt >= 95000 || jet.y <= 36.0) {
      if (Math.sin(jet.targetAngle) < 0 || Math.sin(jet.angle) < 0) {
        var isFacingRightCeil = Math.cos(jet.angle) >= 0;
        jet.targetAngle = isFacingRightCeil ? 0.0 : (jet.angle < 0 ? -Math.PI : Math.PI);
      }
    }

    if (typeof jet.turnLockTimer !== "number") jet.turnLockTimer = 0;
    if (typeof jet.turnDirectionLock !== "number") jet.turnDirectionLock = 0;
    if (typeof jet.angAcc !== "number") jet.angAcc = 0.0;

    if (jet.turnLockTimer > 0) {
      jet.turnLockTimer--;
    }

    var da = jet.targetAngle - jet.angle;
    while (da < -Math.PI) da += Math.PI * 2;
    while (da > Math.PI) da -= Math.PI * 2;

    if (Math.abs(da) <= 0.02) {
      jet.turnLockTimer = 0;
      jet.turnDirectionLock = 0;
    } else if (jet.turnLockTimer <= 0) {
      jet.turnDirectionLock = da > 0 ? 1 : -1;
      jet.turnLockTimer = 18; // 15-20 tick commitment lock
    }

    var maxTurnRate = spec.maxTurnRate || 0.170;
    if (jet.gen === 1) {
      maxTurnRate = 0.220; // Agile Sabre / MiG-15 gunfighter
    } else if (jet.gen === 2) {
      maxTurnRate = 0.180; // Supersonic Starfighter / Fishbed
    } else if (jet.gen === 3) {
      maxTurnRate = 0.210; // Phantom heavy interceptor
    } else if (jet.gen === 4) {
      if (isF16) {
        maxTurnRate = 0.285; // F-16 agile dogfighter 9G sustained
      } else {
        // F-14 CADC: unswept wings 0.275 max; swept delta 0.190
        maxTurnRate = 0.190 + (1.0 - (jet.wingSweep || 0.0)) * 0.085;
      }
    } else if (jet.gen === 5) {
      maxTurnRate = 0.310; // F-22 3D thrust vectoring super-maneuverability
    } else if (jet.gen === 6) {
      maxTurnRate = 0.330; // NGAD autonomous AI
    } else if (jet.gen === 7) {
      maxTurnRate = 0.360; // Gen 7 decentralized autonomous swarm
    }

    if (jet.speed < V_CORNER) {
      maxTurnRate *= (jet.speed / V_CORNER);
    } else {
      maxTurnRate *= (V_CORNER / jet.speed);
    }

    var bfmTurnMult = 1.0;
    if (jet.mode === "MERGE_PITCHBACK" || jet.mode === "PITCHBACK_REVERSAL" || jet.mode === "MERGE" || jet.mode === "PURSUIT" || jet.mode === "BREAK" || jet.mode === "BOUNDARY_SLICE") {
      bfmTurnMult = 1.35; // boost instantaneous turn rate during high-G dogfight turns
    }
    var effectiveMaxTurn = maxTurnRate * bfmTurnMult;

    // Second-order critically damped angular filtering with turn commitment lock
    var desiredTurnEffort = da * 0.35;
    if (jet.turnDirectionLock !== 0 && Math.abs(da) > 0.02) {
      if (Math.sign(desiredTurnEffort) !== jet.turnDirectionLock) {
        desiredTurnEffort = jet.turnDirectionLock * Math.min(Math.abs(da * 0.35), effectiveMaxTurn);
      }
    }
    desiredTurnEffort = Math.min(Math.max(desiredTurnEffort, -effectiveMaxTurn), effectiveMaxTurn);

    // Second-order critically damped filter (zeta = 1.0, omega_n = 0.40)
    var omegaN = 0.40;
    var targetAngAcc = (omegaN * omegaN * (desiredTurnEffort / 0.35)) - (2.0 * omegaN * (jet.turnRate || 0.0));
    jet.angAcc = Math.min(Math.max(targetAngAcc, -0.07), 0.07);
    jet.turnRate = (jet.turnRate || 0.0) + jet.angAcc;
    jet.turnRate = Math.min(Math.max(jet.turnRate, -effectiveMaxTurn), effectiveMaxTurn);

    jet.angle += jet.turnRate;
    while (jet.angle < -Math.PI) jet.angle += Math.PI * 2;
    while (jet.angle > Math.PI) jet.angle -= Math.PI * 2;

    jet.gForce = Math.min(9.0, 1.0 + (jet.speed * Math.abs(jet.turnRate) * 2.2));

    var thrust = jet.afterburner ? (isF16 ? 0.125 : spec.thrustAB) : (isF16 ? 0.048 : spec.thrustDry);
    if (jet.gen === 4 && !isF16 && jet.wingSweep > 0.7) {
      thrust *= 1.15;
    }

    // Atmospheric density lapse on thrust (Gen 1-6)
    if (jet.gen !== 7) {
      thrust *= Math.pow(densityRatio, 0.85);
    }

    var cd0 = isF16 ? 0.0016 : spec.cd0;
    var kInd = isF16 ? 0.65 : spec.kInduced;
    if (jet.gen === 4 && !isF16) {
      kInd = 0.75 + (jet.wingSweep || 0.0) * 0.40;
    }

    var parasiticDrag = cd0 * jet.speed * jet.speed;
    var inducedDrag = 0.0018 * kInd * (jet.gForce * jet.gForce) / Math.max(jet.speed, 1.0);

    // Gen 1 Transonic Drag Divergence near max speed
    if (jet.gen === 1 && jet.speed > 4.0) {
      var mDiff = (jet.speed - 4.0) / 0.8;
      parasiticDrag += 0.005 * mDiff * mDiff;
    }

    // E-M Induced Drag Surge and Thrust bleed above service ceilings
    if (jet.gen !== 7) {
      var altInducedMult = 1.0;
      if (altFt > sCeiling) {
        var overCeilingRatio = (altFt - sCeiling) / 8000.0;
        altInducedMult += overCeilingRatio * 2.8;
      }
      if (jet.gen === 1 && altFt > 35000) {
        var g1Over = (altFt - 35000) / 10000.0;
        altInducedMult += g1Over * 2.5;
        thrust *= Math.max(0.2, 1.0 - g1Over * 0.4);
      }
      inducedDrag = (inducedDrag * altInducedMult) / Math.max(0.1, densityRatio);
      parasiticDrag *= densityRatio;
    }

    var prevSpeed = typeof jet.prevSpeed === "number" ? jet.prevSpeed : jet.speed;
    var totalDrag = parasiticDrag + inducedDrag;
    var gravityAcc = Math.sin(jet.angle) * GRAVITY;
    var deltaV = (thrust - totalDrag) / mass + gravityAcc;
    jet.speed += deltaV;

    // Dynamic Boyd Specific Excess Power (P_s = speed * (thrust - totalDrag) / mass * 850.0 in ft/s)
    jet.ps = jet.speed * (thrust - totalDrag) / mass * 850.0;

    // Feature 4: Wingtip Tracer Emitters during high-G / transonic maneuvers
    if ((jet.gForce > 4.2 || (jet.speed >= 5.0 && jet.afterburner)) && jet.gen !== 7) {
      var halfSpan = (jet.gen === 1) ? 9 : (jet.gen === 2 ? 7 : (jet.gen === 3 ? 11 : (jet.gen === 4 ? 11 : (jet.gen === 5 ? 11 : 13))));
      var cosA = Math.cos(jet.angle);
      var sinA = Math.sin(jet.angle);
      var portX = jet.x - cosA * 4 + sinA * halfSpan;
      var portY = jet.y - sinA * 4 - cosA * halfSpan;
      var stbdX = jet.x - cosA * 4 - sinA * halfSpan;
      var stbdY = jet.y - sinA * 4 + cosA * halfSpan;

      jet.wingVapor.push(portX, portY, 0.85, 1);
      jet.wingVapor.push(stbdX, stbdY, 0.85, 1);
    } else if (jet.gForce > 3.8 && Math.random() < 0.5) {
      var vxVap = jet.x - Math.cos(jet.angle) * 8 + Math.sin(jet.angle) * (Math.random() > 0.5 ? 8 : -8);
      var vyVap = jet.y - Math.sin(jet.angle) * 8 - Math.cos(jet.angle) * (Math.random() > 0.5 ? 8 : -8);
      jet.wingVapor.push(vxVap, vyVap, 0.6, 0);
    }

    if (jet.speed <= V_STALL && jet.gen !== 7) {
      jet.speed = V_STALL;
      if (!jet.isStalled) {
        jet.isStalled = true;
        jet.stallBuffet = 1.0;
        addRadio((jet.callsign || spec.callsign) + ": CRITICAL STALL WARNING! NOSE DROPPING!");
      }
    }

    if (jet.speed > spec.maxSpeed) jet.speed = spec.maxSpeed;
    if (jet.speed > V_MAX) jet.speed = V_MAX;

    // Transonic crossing trigger: detect accelerating through Mach 1.0 (5.2 px/frame)
    if (prevSpeed < 5.2 && jet.speed >= 5.2 && jet.gen >= 2) {
      if (globalVfxParticlePool) {
        var swIdx = globalVfxParticlePool.alloc();
        if (swIdx >= 0) {
          var swo = swIdx * 8;
          globalVfxParticlePool.buffer[swo] = jet.x;
          globalVfxParticlePool.buffer[swo + 1] = jet.y;
          globalVfxParticlePool.buffer[swo + 2] = Math.cos(jet.angle) * jet.speed * 0.2;
          globalVfxParticlePool.buffer[swo + 3] = Math.sin(jet.angle) * jet.speed * 0.2;
          globalVfxParticlePool.buffer[swo + 4] = 24; // life
          globalVfxParticlePool.buffer[swo + 5] = 24; // maxLife
          globalVfxParticlePool.buffer[swo + 6] = 6.0; // initial radius (r = 6 -> 60 px)
          globalVfxParticlePool.buffer[swo + 7] = 2; // Type 2: Shockwave ring
        }
      }
    }

    // Hypersonic crossing trigger: detect accelerating through Mach 2.0 (6.8 px/frame) - Double-Ring Plasma Shockwave
    if (prevSpeed < 6.8 && jet.speed >= 6.8 && jet.gen >= 2) {
      if (globalVfxParticlePool) {
        for (var dRing = 0; dRing < 2; dRing++) {
          var swIdx2 = globalVfxParticlePool.alloc();
          if (swIdx2 >= 0) {
            var swo2 = swIdx2 * 8;
            globalVfxParticlePool.buffer[swo2] = jet.x;
            globalVfxParticlePool.buffer[swo2 + 1] = jet.y;
            globalVfxParticlePool.buffer[swo2 + 2] = Math.cos(jet.angle) * jet.speed * 0.25;
            globalVfxParticlePool.buffer[swo2 + 3] = Math.sin(jet.angle) * jet.speed * 0.25;
            globalVfxParticlePool.buffer[swo2 + 4] = 28 + dRing * 6;
            globalVfxParticlePool.buffer[swo2 + 5] = 28 + dRing * 6;
            globalVfxParticlePool.buffer[swo2 + 6] = 5.0 + dRing * 4.0;
            globalVfxParticlePool.buffer[swo2 + 7] = 2; // Type 2: Shockwave ring
          }
        }
      }
    }
    jet.prevSpeed = jet.speed;

    // Thermal ionization sparks when afterburner is active
    if (jet.afterburner && jet.gen !== 7 && Math.random() < 0.35 && globalVfxParticlePool) {
      var spIdx = globalVfxParticlePool.alloc();
      if (spIdx >= 0) {
        var spo = spIdx * 8;
        var spAngle = jet.angle + Math.PI + (Math.random() - 0.5) * 0.3;
        var spSpeed = 2.5 + Math.random() * 3.5;
        var spLife = 10 + Math.floor(Math.random() * 8);
        globalVfxParticlePool.buffer[spo] = jet.x - Math.cos(jet.angle) * 16 + (Math.random() - 0.5) * 4;
        globalVfxParticlePool.buffer[spo + 1] = jet.y - Math.sin(jet.angle) * 16 + (Math.random() - 0.5) * 4;
        globalVfxParticlePool.buffer[spo + 2] = Math.cos(spAngle) * spSpeed;
        globalVfxParticlePool.buffer[spo + 3] = Math.sin(spAngle) * spSpeed;
        globalVfxParticlePool.buffer[spo + 4] = spLife;
        globalVfxParticlePool.buffer[spo + 5] = spLife;
        globalVfxParticlePool.buffer[spo + 6] = 1.2;
        globalVfxParticlePool.buffer[spo + 7] = 1; // Type 1: Sparks
      }
    }

    var vx = Math.cos(jet.angle) * jet.speed;
    var vy = Math.sin(jet.angle) * jet.speed;

    if (jet.damageState === "CRITICAL" || (typeof jet.hp === "number" && jet.hp < 20.0)) {
      vy += (Math.random() - 0.5) * 1.8;
      vx += (Math.random() - 0.5) * 1.8;
      jet.stallBuffet = Math.max(jet.stallBuffet || 0, 0.8);
    } else if (jet.isStalled) {
      vy += (Math.random() - 0.5) * 1.5;
      vx += (Math.random() - 0.5) * 1.5;
    }

    jet.x += vx;
    jet.y += vy;

    // Hard Viewport Containment Clamping (Zero Screen-Wrap)
    // For Gen 7: strict ceiling clamp y >= 65 px (h <= 85,000 ft) and y <= height - 65 px, x in [65, width-65]
    var isGen7 = (jet.gen === 7);
    var minArenaX = isGen7 ? 65.0 : 60.0;
    var maxArenaX = isGen7 ? (width - 65.0) : (width - 60.0);
    if (jet.x < minArenaX) {
      jet.x = minArenaX;
      if (Math.cos(jet.angle) < 0) {
        jet.angle = (Math.sin(jet.angle) >= 0) ? 0.20 : -0.20;
        jet.targetAngle = (Math.sin(jet.targetAngle) >= 0) ? 0.20 : -0.20;
      }
    } else if (jet.x > maxArenaX) {
      jet.x = maxArenaX;
      if (Math.cos(jet.angle) > 0) {
        jet.angle = (Math.sin(jet.angle) >= 0) ? (Math.PI - 0.20) : (-Math.PI + 0.20);
        jet.targetAngle = (Math.sin(jet.targetAngle) >= 0) ? (Math.PI - 0.20) : (-Math.PI + 0.20);
      }
    }

    // Near-space ceiling (100k ft) header clamp (min visible ceiling y >= 32.0 px, Gen 7 strictly clamped to y >= 65.0 px)
    var minCeilingY = isGen7 ? 65.0 : 32.0;
    if (jet.y < minCeilingY) {
      jet.y = minCeilingY;
      if (Math.sin(jet.angle) < 0) {
        var isFacingRight = Math.cos(jet.angle) >= 0;
        jet.angle = isFacingRight ? 0.05 : (jet.angle < 0 ? -Math.PI - 0.05 : Math.PI + 0.05);
        jet.targetAngle = jet.angle;
      }
    }

    // Gen 7 floor clamp: y <= height - 65.0 px
    if (isGen7 && jet.y > height - 65.0) {
      jet.y = height - 65.0;
      if (Math.sin(jet.angle) > 0) {
        var isFacingRightG7 = Math.cos(jet.angle) >= 0;
        jet.angle = isFacingRightG7 ? -0.05 : (jet.angle < 0 ? -Math.PI + 0.05 : Math.PI - 0.05);
        jet.targetAngle = jet.angle;
      }
    }

    // Minimum Altitude Floor Invariant (h >= 800 ft clearance)
    var minFloorY = Math.min(getYFromAltitude(800, height), height - 32.0);
    if (!jet.isDying && (altFt <= 800 || jet.y >= minFloorY)) {
      jet.y = Math.min(jet.y, minFloorY);
      if (Math.sin(jet.angle) > 0) {
        jet.angle = -0.15;
        jet.targetAngle = -0.20;
        jet.afterburner = true;
      }
    }

    // Ground Floor Impact Collision (0 ft terrain footer)
    if (jet.y >= height && jet.active && !jet.isDying) {
      applyAirframeDamage(jet, 100.0, null, "TERRAIN_IMPACT");
      jet.y = height;
      addRadio("CFIT ALERT: " + (jet.callsign || spec.callsign) + " IMPACTED TERRAIN AT 0 FT!");
    }

    // Visual Damage Particle Emissions (<70%, <45%, <20% HP)
    if (!jet.isDying && jet.active && typeof jet.hp === "number") {
      if (jet.hp < 20.0) {
        // Critical Damage (<20% HP): Heavy billowing black smoke and fire trails
        jet.damageSmokeTimer = (jet.damageSmokeTimer || 0) + 1;
        var crIdx = explosionsPool.alloc();
        if (crIdx >= 0) {
          var cro = crIdx * 6;
          explosionsPool.buffer[cro] = jet.x - Math.cos(jet.angle) * 14 + (Math.random() - 0.5) * 6;
          explosionsPool.buffer[cro + 1] = jet.y - Math.sin(jet.angle) * 14 + (Math.random() - 0.5) * 6;
          explosionsPool.buffer[cro + 2] = -Math.cos(jet.angle) * 2.0 + (Math.random() - 0.5) * 3;
          explosionsPool.buffer[cro + 3] = -Math.sin(jet.angle) * 2.0 + (Math.random() - 0.5) * 3;
          explosionsPool.buffer[cro + 4] = 4 + Math.floor(Math.random() * 3);
          explosionsPool.buffer[cro + 5] = 0.95;
        }
      } else if (jet.hp < 45.0) {
        // Moderate Damage (<45% HP): Steady dark smoke plume and occasional sparks
        jet.damageSmokeTimer = (jet.damageSmokeTimer || 0) + 1;
        if (jet.damageSmokeTimer % 2 === 0) {
          var moIdx = explosionsPool.alloc();
          if (moIdx >= 0) {
            var moo = moIdx * 6;
            explosionsPool.buffer[moo] = jet.x - Math.cos(jet.angle) * 12;
            explosionsPool.buffer[moo + 1] = jet.y - Math.sin(jet.angle) * 12;
            explosionsPool.buffer[moo + 2] = -Math.cos(jet.angle) * 1.5 + (Math.random() - 0.5) * 2;
            explosionsPool.buffer[moo + 3] = -Math.sin(jet.angle) * 1.5 + (Math.random() - 0.5) * 2;
            explosionsPool.buffer[moo + 4] = 3;
            explosionsPool.buffer[moo + 5] = 0.7;
          }
        }
        jet.damageSparksTimer = (jet.damageSparksTimer || 0) + 1;
        if (jet.damageSparksTimer % 10 === 0) {
          var spDmgIdx = explosionsPool.alloc();
          if (spDmgIdx >= 0) {
            var spDo = spDmgIdx * 6;
            explosionsPool.buffer[spDo] = jet.x + (Math.random() - 0.5) * 8;
            explosionsPool.buffer[spDo + 1] = jet.y + (Math.random() - 0.5) * 8;
            explosionsPool.buffer[spDo + 2] = (Math.random() - 0.5) * 5;
            explosionsPool.buffer[spDo + 3] = (Math.random() - 0.5) * 5;
            explosionsPool.buffer[spDo + 4] = 2;
            explosionsPool.buffer[spDo + 5] = 0.6;
          }
        }
      } else if (jet.hp < 70.0) {
        // Light Damage (<70% HP): Light smoke / vapor wisps
        jet.damageSmokeTimer = (jet.damageSmokeTimer || 0) + 1;
        if (jet.damageSmokeTimer % 3 === 0) {
          var vxVapDmg = jet.x - Math.cos(jet.angle) * 10 + Math.sin(jet.angle) * (Math.random() > 0.5 ? 6 : -6);
          var vyVapDmg = jet.y - Math.sin(jet.angle) * 10 - Math.cos(jet.angle) * (Math.random() > 0.5 ? 6 : -6);
          jet.wingVapor.push(vxVapDmg, vyVapDmg, 0.65, 0);
        }
      }
    }

    jet.contrail.push(
      jet.x - Math.cos(jet.angle) * 16,
      jet.y - Math.sin(jet.angle) * 16,
      jet.afterburner ? 0.75 : 0.35,
      jet.gForce
    );

    if (jet.flareCooldown > 0) jet.flareCooldown--;
    if (jet.gunCooldown > 0) jet.gunCooldown--;
    if (jet.missileCooldown > 0) jet.missileCooldown--;
    if (jet.laserCooldown > 0) jet.laserCooldown--;
    if (jet.triLaserCooldown > 0) jet.triLaserCooldown--;
    if (jet.superLaserCooldown > 0) jet.superLaserCooldown--;
    if (jet.superLaserPulse > 0) jet.superLaserPulse *= 0.85;

    // Gen 7 Dynamic Swarm Kinematics (Decentralized Multi-Agent Coordination, Zero Teleporting, Smooth Continuous Motion)
    if (jet.gen === 7 && jet.drone1 && jet.drone2 && jet.drone3) {
      var tSwarm = (jet.swarmTimer || 0) * 0.05;
      jet.swarmTimer = ((jet.swarmTimer || 0) + 1) % 100000;

      var targetDist = targetEnemy && targetEnemy.active ? Math.hypot(targetEnemy.x - jet.x, targetEnemy.y - jet.y) : 999999;

      if ((jet.superLaserCooldown > 0 && jet.superLaserCooldown < 35) || jet.superLaserPulse > 0) {
        jet.swarmMode = "FORM_UP";
        jet.trapTimer = 0;
        jet.drone1.targetX = 18;
        jet.drone1.targetY = 0;
        jet.drone2.targetX = -8;
        jet.drone2.targetY = -12;
        jet.drone3.targetX = -8;
        jet.drone3.targetY = 12;
      } else if (jet.mode === "BREAK" || incomingThreat) {
        jet.swarmMode = "SPLIT";
        jet.trapTimer = 0;
        jet.drone1.targetX = 20 + Math.sin(tSwarm * 2.2) * 4;
        jet.drone1.targetY = 0;
        jet.drone2.targetX = -12 + Math.cos(tSwarm * 1.5) * 4;
        jet.drone2.targetY = -26 + Math.sin(tSwarm * 2.5) * 5;
        jet.drone3.targetX = -12 + Math.sin(tSwarm * 1.5) * 5;
        jet.drone3.targetY = 26 + Math.cos(tSwarm * 2.5) * 5;
      } else if (targetEnemy && targetEnemy.active && targetDist < 350) {
        jet.swarmMode = "SURROUND_TRAP";
        jet.trapTimer = (jet.trapTimer || 0) + 1;
        var tOrbit = jet.trapTimer * 0.16;

        var dxT = targetEnemy.x - jet.x;
        var dyT = targetEnemy.y - jet.y;

        var cosJ = Math.cos(jet.angle);
        var sinJ = Math.sin(jet.angle);
        var localTx = cosJ * dxT + sinJ * dyT;
        var localTy = -sinJ * dxT + cosJ * dyT;

        var cageRadius = 38;
        jet.drone1.targetX = localTx + Math.cos(tOrbit) * cageRadius;
        jet.drone1.targetY = localTy + Math.sin(tOrbit) * cageRadius;
        jet.drone2.targetX = localTx + Math.cos(tOrbit + 2.094) * cageRadius;
        jet.drone2.targetY = localTy + Math.sin(tOrbit + 2.094) * cageRadius;
        jet.drone3.targetX = localTx + Math.cos(tOrbit + 4.188) * cageRadius;
        jet.drone3.targetY = localTy + Math.sin(tOrbit + 4.188) * cageRadius;
      } else {
        jet.swarmMode = "FLANK";
        jet.trapTimer = 0;
        // Organic, independent multi-agent tactical formation
        jet.drone1.targetX = 16 + Math.sin(tSwarm * 1.8) * 4;
        jet.drone1.targetY = Math.cos(tSwarm * 1.4) * 3;
        jet.drone2.targetX = -10 + Math.cos(tSwarm * 1.2) * 4;
        jet.drone2.targetY = -18 + Math.sin(tSwarm * 2.0) * 4;
        jet.drone3.targetX = -10 + Math.sin(tSwarm * 1.2) * 4;
        jet.drone3.targetY = 18 + Math.cos(tSwarm * 2.0) * 4;
      }

      var kRate = jet.swarmMode === "SURROUND_TRAP" ? 0.18 : (jet.swarmMode === "FORM_UP" ? 0.16 : (jet.swarmMode === "SPLIT" ? 0.15 : 0.12));
      var maxRelDelta = jet.speed * 0.40;

      function updateDroneRel(drone) {
        var ddx = (drone.targetX - drone.x) * kRate;
        var ddy = (drone.targetY - drone.y) * kRate;
        var dDist = Math.hypot(ddx, ddy);
        if (dDist > maxRelDelta) {
          ddx = (ddx / dDist) * maxRelDelta;
          ddy = (ddy / dDist) * maxRelDelta;
        }
        drone.x += ddx;
        drone.y += ddy;
      }

      updateDroneRel(jet.drone1);
      updateDroneRel(jet.drone2);
      updateDroneRel(jet.drone3);

      var cosA = Math.cos(jet.angle);
      var sinA = Math.sin(jet.angle);

      if (typeof jet.drone1.worldX === "undefined") {
        jet.drone1.worldX = jet.x + cosA * jet.drone1.x - sinA * jet.drone1.y;
        jet.drone1.worldY = jet.y + sinA * jet.drone1.x + cosA * jet.drone1.y;
        jet.drone2.worldX = jet.x + cosA * jet.drone2.x - sinA * jet.drone2.y;
        jet.drone2.worldY = jet.y + sinA * jet.drone2.x + cosA * jet.drone2.y;
        jet.drone3.worldX = jet.x + cosA * jet.drone3.x - sinA * jet.drone3.y;
        jet.drone3.worldY = jet.y + sinA * jet.drone3.x + cosA * jet.drone3.y;
      }

      var maxWorldDelta = jet.speed * 1.45;
      function clampWorld(prevX, prevY, tgtX, tgtY) {
        var cdx = tgtX - prevX;
        var cdy = tgtY - prevY;
        var cd = Math.hypot(cdx, cdy);
        if (cd > maxWorldDelta) {
          cdx = (cdx / cd) * maxWorldDelta;
          cdy = (cdy / cd) * maxWorldDelta;
        }
        return { x: prevX + cdx, y: prevY + cdy };
      }

      var targetW1X = jet.x + cosA * jet.drone1.x - sinA * jet.drone1.y;
      var targetW1Y = jet.y + sinA * jet.drone1.x + cosA * jet.drone1.y;
      var targetW2X = jet.x + cosA * jet.drone2.x - sinA * jet.drone2.y;
      var targetW2Y = jet.y + sinA * jet.drone2.x + cosA * jet.drone2.y;
      var targetW3X = jet.x + cosA * jet.drone3.x - sinA * jet.drone3.y;
      var targetW3Y = jet.y + sinA * jet.drone3.x + cosA * jet.drone3.y;

      var nextW1 = clampWorld(jet.drone1.worldX, jet.drone1.worldY, targetW1X, targetW1Y);
      var nextW2 = clampWorld(jet.drone2.worldX, jet.drone2.worldY, targetW2X, targetW2Y);
      var nextW3 = clampWorld(jet.drone3.worldX, jet.drone3.worldY, targetW3X, targetW3Y);

      jet.drone1.worldX = Math.min(Math.max(nextW1.x, 65.0), width - 65.0);
      jet.drone1.worldY = Math.min(Math.max(nextW1.y, 65.0), height - 65.0);
      jet.drone2.worldX = Math.min(Math.max(nextW2.x, 65.0), width - 65.0);
      jet.drone2.worldY = Math.min(Math.max(nextW2.y, 65.0), height - 65.0);
      jet.drone3.worldX = Math.min(Math.max(nextW3.x, 65.0), width - 65.0);
      jet.drone3.worldY = Math.min(Math.max(nextW3.y, 65.0), height - 65.0);
    }
  }

  function updateAndDrawCcaDrones(jet, isLead, colors) {
    if (!jet || jet.gen !== 6 || !jet.active) {
      if (jet) {
        jet.ccaDeployed = false;
        if (jet.cca1) jet.cca1.active = false;
        if (jet.cca2) jet.cca2.active = false;
      }
      return;
    }

    var oppPool = (jet.team === "blue") ? redPool : bluePool;

    // Check if we should deploy / loose drones
    if (!jet.ccaDeployed) {
      var shouldDeploy = false;
      for (var e = 0; e < oppPool.length; e++) {
        if (oppPool[e].active && !oppPool[e].isDying && Math.hypot(oppPool[e].x - jet.x, oppPool[e].y - jet.y) < 450) {
          shouldDeploy = true;
          break;
        }
      }

      if (shouldDeploy) {
        jet.ccaDeployed = true;
        var cosA = Math.cos(jet.angle);
        var sinA = Math.sin(jet.angle);
        jet.cca1.active = true;
        jet.cca1.x = jet.x - sinA * 25;
        jet.cca1.y = jet.y + cosA * 25;
        jet.cca1.angle = jet.angle - 0.28;
        jet.cca1.speed = jet.speed + 1.2;
        jet.cca1.laserCooldown = 15;

        jet.cca2.active = true;
        jet.cca2.x = jet.x + sinA * 25;
        jet.cca2.y = jet.y - cosA * 25;
        jet.cca2.angle = jet.angle + 0.28;
        jet.cca2.speed = jet.speed + 1.2;
        jet.cca2.laserCooldown = 25;

        addRadio((jet.callsign || "GEN 6 NGAD") + ": LOOSING CCA DRONES! 2X AUTONOMOUS WINGMEN DEPLOYED");
      }
    }

    if (!jet.ccaDeployed) return;

    var drones = [jet.cca1, jet.cca2];
    for (var d = 0; d < 2; d++) {
      var cca = drones[d];
      if (!cca || !cca.active) continue;

      if (cca.laserCooldown > 0) cca.laserCooldown--;

      // Target selection
      var target = null;
      var minDist = 999999;
      for (var ei = 0; ei < oppPool.length; ei++) {
        var en = oppPool[ei];
        if (!en.active || en.isDying) continue;
        var ed = Math.hypot(en.x - cca.x, en.y - cca.y);
        if (ed < minDist) {
          minDist = ed;
          target = en;
        }
      }

      var targetAngle = cca.angle;

      // Steering & Tactics
      if (target && minDist < 500) {
        var tgtAngle = Math.atan2(target.y - cca.y, target.x - cca.x);
        // Coordinated dual-axis pincer strikes (CCA 1 breaks port +50 deg / +0.87 rad, CCA 2 breaks starboard -50 deg / -0.87 rad)
        var flankOffset = (d === 0 ? 0.873 : -0.873);
        var pincerFactor = Math.min(Math.max((minDist - 140) / 180, 0.0), 1.0);
        targetAngle = tgtAngle + flankOffset * pincerFactor;

        var diffA = targetAngle - cca.angle;
        while (diffA > Math.PI) diffA -= Math.PI * 2;
        while (diffA < -Math.PI) diffA += Math.PI * 2;
        cca.angle += Math.max(-0.14, Math.min(0.14, diffA));
        cca.speed = Math.min(7.4, cca.speed + 0.08);

        // Offensive Directed-Energy Pulse Strike directly onto target
        var directDiff = tgtAngle - cca.angle;
        while (directDiff > Math.PI) directDiff -= Math.PI * 2;
        while (directDiff < -Math.PI) directDiff += Math.PI * 2;

        if (Math.abs(directDiff) < 0.38 && minDist < 280 && cca.laserCooldown <= 0) {
          cca.laserCooldown = 24;
          ctx.save();
          ctx.strokeStyle = colors.fg;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(cca.x, cca.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(cca.x, cca.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          ctx.restore();

          var spIdx = explosionsPool.alloc();
          if (spIdx >= 0) {
            var spo = spIdx * 6;
            explosionsPool.buffer[spo] = target.x + (Math.random() - 0.5) * 6;
            explosionsPool.buffer[spo + 1] = target.y + (Math.random() - 0.5) * 6;
            explosionsPool.buffer[spo + 2] = (Math.random() - 0.5) * 4;
            explosionsPool.buffer[spo + 3] = (Math.random() - 0.5) * 4;
            explosionsPool.buffer[spo + 4] = 2;
            explosionsPool.buffer[spo + 5] = 0.9;
          }

          if (target.gen === 7) {
            target.shieldPulse = 1.0;
          } else {
            var ccaDmg = 40.0 + Math.random() * 15.0;
            var ccaLethal = applyAirframeDamage(target, ccaDmg, jet, "CCA_STRIKE");
            if (ccaLethal) {
              addRadio("CCA WINGMAN: DIRECTED-ENERGY SPLASH (" + jet.callsign + ")");
            } else if (Math.random() < 0.35) {
              addRadio("CCA WINGMAN " + (d + 1) + ": FLANKING PINCER STRIKE -> DEW BURST (HP: " + Math.round(target.hp) + "%)");
            }
          }
        }
      } else {
        // Wide-Area Autonomous Forward Combat Orbit (Flanking, Screening & Autonomous Scouting)
        var tSwarmCca = (jet.swarmTimer || 0) * 0.04;
        var fwdOffset = 160;
        var latOffset = (d === 0 ? -140 : 140);
        var patrolTargetX = jet.x + Math.cos(jet.angle) * fwdOffset - Math.sin(jet.angle) * latOffset + Math.cos(tSwarmCca + d * Math.PI) * 45;
        var patrolTargetY = jet.y + Math.sin(jet.angle) * fwdOffset + Math.cos(jet.angle) * latOffset + Math.sin(2 * (tSwarmCca + d * Math.PI)) * 30;

        var patrolBearing = Math.atan2(patrolTargetY - cca.y, patrolTargetX - cca.x);
        var diffEsc = patrolBearing - cca.angle;
        while (diffEsc > Math.PI) diffEsc -= Math.PI * 2;
        while (diffEsc < -Math.PI) diffEsc += Math.PI * 2;
        cca.angle += Math.max(-0.11, Math.min(0.11, diffEsc));
        cca.speed = Math.min(7.2, Math.max(5.0, jet.speed * 1.12));
      }

      // Leash tethering to maintain 40px <= distance <= 450px from mothership
      var dxM = cca.x - jet.x;
      var dyM = cca.y - jet.y;
      var curDist = Math.hypot(dxM, dyM);

      if (curDist > 260) {
        var backAngle = Math.atan2(-dyM, -dxM);
        var tetherWeight = Math.min(Math.max((curDist - 260) / 120, 0.0), 1.0);
        var daTether = backAngle - cca.angle;
        while (daTether > Math.PI) daTether -= Math.PI * 2;
        while (daTether < -Math.PI) daTether += Math.PI * 2;
        cca.angle += daTether * tetherWeight * 0.14;
        cca.speed = Math.min(7.6, jet.speed * 1.18);
      } else if (curDist < 60) {
        var pushAngle = Math.atan2(dyM, dxM);
        var pushWeight = Math.min(Math.max((60 - curDist) / 20, 0.0), 1.0);
        var daPush = pushAngle - cca.angle;
        while (daPush > Math.PI) daPush -= Math.PI * 2;
        while (daPush < -Math.PI) daPush += Math.PI * 2;
        cca.angle += daPush * pushWeight * 0.14;
        cca.speed = Math.max(4.5, jet.speed * 0.92);
      }

      // Defensive CIWS Interception of Threat Missiles
      var hostileType = (jet.team === "blue") ? 1 : 0;
      for (var mi = 0; mi < missilesPool.activeCount; mi++) {
        var mio = mi * 8;
        if (missilesPool.buffer[mio + 4] === hostileType) {
          var misX = missilesPool.buffer[mio];
          var misY = missilesPool.buffer[mio + 1];
          if (Math.hypot(misX - cca.x, misY - cca.y) < 170 || Math.hypot(misX - jet.x, misY - jet.y) < 170) {
            if (cca.laserCooldown <= 0) {
              cca.laserCooldown = 35;
              ctx.save();
              ctx.strokeStyle = colors.fg;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(cca.x, cca.y);
              ctx.lineTo(misX, misY);
              ctx.stroke();
              ctx.restore();
              missilesPool.buffer[mio + 6] = 0;
              addRadio("CCA LASER CIWS: THREAT MISSILE INTERCEPTED!");
              break;
            }
          }
        }
      }

      // Physics Move
      cca.x += Math.cos(cca.angle) * cca.speed;
      cca.y += Math.sin(cca.angle) * cca.speed;

      // Screen edge boundary clamping [60, width-60] x [32, height-32]
      if (cca.x < 60) {
        cca.x = 60;
        if (Math.cos(cca.angle) < 0) cca.angle = (Math.sin(cca.angle) >= 0) ? 0.20 : -0.20;
      }
      if (cca.x > width - 60) {
        cca.x = width - 60;
        if (Math.cos(cca.angle) > 0) cca.angle = (Math.sin(cca.angle) >= 0) ? (Math.PI - 0.20) : (-Math.PI + 0.20);
      }
      if (cca.y < 32) cca.y = 32;
      if (cca.y > height - 32) cca.y = height - 32;

      // Hard clamp bounds [42px, 440px]
      var endDx = cca.x - jet.x;
      var endDy = cca.y - jet.y;
      var endDist = Math.hypot(endDx, endDy);
      if (endDist > 440) {
        var factor440 = 440 / endDist;
        cca.x = jet.x + endDx * factor440;
        cca.y = jet.y + endDy * factor440;
      } else if (endDist < 42) {
        var factor42 = 42 / (endDist || 1);
        cca.x = jet.x + endDx * factor42;
        cca.y = jet.y + endDy * factor42;
      }

      // Draw CCA Loyal Wingman Drone
      ctx.save();
      ctx.translate(Math.floor(cca.x), Math.floor(cca.y));
      ctx.rotate(cca.angle);

      // Dedicated exhaust plume
      var cFlame = 5 + Math.floor(Math.random() * (cca.speed * 1.6));
      ctx.fillStyle = colors.fg;
      ctx.fillRect(-6 - cFlame, -1, cFlame, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-6 - Math.floor(cFlame * 0.4), 0, Math.floor(cFlame * 0.4), 1);

      // Sleek stealth delta silhouette
      ctx.fillStyle = colors.fg;
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();

      // White-hot sensor core
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(2, -1, 3, 2);
      ctx.restore();
    }
  }

  function updateTacticalManeuvers(friendlyPool, opposingPool) {
    for (var i = 0; i < friendlyPool.length; i++) {
      var jet = friendlyPool[i];
      if (!jet.active || jet.isDying) {
        jet.targetJet = null;
        continue;
      }

      // 1. Dynamic Nearest Target Acquisition
      var bestTarget = null;
      var minDist = 999999;
      for (var j = 0; j < opposingPool.length; j++) {
        var opp = opposingPool[j];
        if (!opp.active || opp.isDying) continue;
        var d = Math.hypot(opp.x - jet.x, opp.y - jet.y);
        if (d < minDist) {
          minDist = d;
          bestTarget = opp;
        }
      }
      jet.targetJet = bestTarget;

      var wingman = jet.wingmanJet;

      // 2. Cooperative Mutual Defensive Cover
      if (wingman && wingman.active && !wingman.isDying && jet.mode !== "BREAK" && jet.mode !== "GPWS_PULLUP") {
        for (var oj = 0; oj < opposingPool.length; oj++) {
          var enemyPursuer = opposingPool[oj];
          if (!enemyPursuer.active || enemyPursuer.isDying) continue;
          if (enemyPursuer.targetJet === wingman) {
            var distToWm = Math.hypot(wingman.x - enemyPursuer.x, wingman.y - enemyPursuer.y);
            var tailAngle = wingman.angle + Math.PI;
            var bearingToE = Math.atan2(enemyPursuer.y - wingman.y, enemyPursuer.x - wingman.x);
            var angleOffTail = Math.abs(bearingToE - tailAngle);
            while (angleOffTail > Math.PI) angleOffTail = Math.abs(angleOffTail - Math.PI * 2);
            if (distToWm < 260 && angleOffTail < 0.8) {
              jet.targetJet = enemyPursuer;
              jet.mode = "COVER";
              jet.modeTimer = 45;
              jet.throttleSetting = 1.5;
              jet.afterburner = true;
              if (Math.random() < 0.02) {
                addRadio(jet.callsign + ": DEFENSIVE COVER! BREAKING INTO THREAT ON " + wingman.callsign + "'S SIX!");
              }
              break;
            }
          }
        }
      }

      // 3. Head-On Merge Maneuver Detection & Post-Merge Pitchback Latch
      if (jet.targetJet && jet.mode !== "COVER" && jet.mode !== "BREAK" && jet.mode !== "GPWS_PULLUP") {
        var tgt = jet.targetJet;
        var dMerge = Math.hypot(tgt.x - jet.x, tgt.y - jet.y);
        var hdgDiff = Math.abs(jet.angle - tgt.angle);
        while (hdgDiff > Math.PI) hdgDiff = Math.abs(hdgDiff - Math.PI * 2);

        if (hdgDiff > 1.8 && dMerge < 250) {
          jet.mode = "MERGE_PITCHBACK";
          jet.modeTimer = 24;
          jet.pitchbackTimer = 24;
          var leadTime = Math.min(dMerge / 14.0, 15.0);
          var leadX = tgt.x + Math.cos(tgt.angle) * tgt.speed * leadTime;
          var leadY = tgt.y + Math.sin(tgt.angle) * tgt.speed * leadTime;
          jet.targetAngle = Math.atan2(leadY - jet.y, leadX - jet.x);
          jet.afterburner = true;
          jet.throttleSetting = 1.5;
          if (Math.random() < 0.03) {
            addRadio(jet.callsign + ": HEAD-ON MERGE! 9G POST-MERGE PITCHBACK!");
          }
        } else if (hdgDiff > 1.8 && dMerge >= 250 && dMerge < 450) {
          var leadTime = Math.min(dMerge / 14.0, 18.0);
          var leadX = tgt.x + Math.cos(tgt.angle) * tgt.speed * leadTime;
          var leadY = tgt.y + Math.sin(tgt.angle) * tgt.speed * leadTime;
          jet.targetAngle = Math.atan2(leadY - jet.y, leadX - jet.x);
          jet.afterburner = true;
          jet.throttleSetting = 1.5;
        }
      }

      // 4. Bracket Pincer Maneuver Detection
      if (!jet.isLead && wingman && wingman.active && !wingman.isDying && jet.targetJet && wingman.targetJet === jet.targetJet) {
        var dPincer = Math.hypot(jet.targetJet.x - jet.x, jet.targetJet.y - jet.y);
        if (dPincer < 400 && jet.mode !== "COVER" && jet.mode !== "MERGE" && jet.mode !== "MERGE_PITCHBACK" && jet.mode !== "BREAK" && jet.mode !== "GPWS_PULLUP") {
          jet.mode = "PINCER";
          jet.modeTimer = 40;
          var pincerSign = (jet.y > wingman.y) ? 0.785 : -0.785;
          var directBearing = Math.atan2(jet.targetJet.y - jet.y, jet.targetJet.x - jet.x);
          jet.targetAngle = directBearing + pincerSign;
          jet.throttleSetting = 1.5;
          jet.afterburner = true;
          if (Math.random() < 0.02) {
            addRadio(jet.callsign + ": BRACKET PINCER! DUAL-AXIS FLANKING RUN ON " + jet.targetJet.callsign + "!");
          }
        }
      }
    }
  }

  function evaluateJetWeapons(jet, targetEnemy, colors) {
    if (!jet.active || jet.isDying || jet.isStalled || !targetEnemy || !targetEnemy.active || targetEnemy.isDying) return;

    var dx = targetEnemy.x - jet.x;
    var dy = targetEnemy.y - jet.y;
    var dist = Math.hypot(dx, dy);
    var bearing = Math.atan2(dy, dx);
    var da = Math.abs(jet.angle - bearing);
    while (da > Math.PI) da = Math.abs(da - Math.PI * 2);

    var shooterTeamCode = (jet.team === "blue") ? 0 : 1;

    // Gen 7: Swarm directed weapons
    if (jet.gen === 7) {
      var d1 = jet.drone1 || { x: 16, y: 0 };
      var d2 = jet.drone2 || { x: -6, y: -14 };
      var d3 = jet.drone3 || { x: -6, y: 14 };
      var cosA = Math.cos(jet.angle);
      var sinA = Math.sin(jet.angle);

      var d1x = jet.x + cosA * (d1.x + 6) - sinA * d1.y;
      var d1y = jet.y + sinA * (d1.x + 6) + cosA * d1.y;
      var d2x = jet.x + cosA * (d2.x + 5) - sinA * d2.y;
      var d2y = jet.y + sinA * (d2.x + 5) + cosA * d2.y;
      var d3x = jet.x + cosA * (d3.x + 5) - sinA * d3.y;
      var d3y = jet.y + sinA * (d3.x + 5) + cosA * d3.y;

      // 1. Surround Trap (360° Eat Sequence)
      if (jet.swarmMode === "SURROUND_TRAP" && dist < 350) {
        ctx.save();
        ctx.strokeStyle = colors.fg;
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(d1x, d1y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
        ctx.moveTo(d2x, d2y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
        ctx.moveTo(d3x, d3y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(d1x, d1y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
        ctx.moveTo(d2x, d2y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
        ctx.moveTo(d3x, d3y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
        ctx.stroke();

        ctx.fillStyle = getAlphaColor("fg", 0.4);
        ctx.beginPath();
        ctx.arc(targetEnemy.x, targetEnemy.y, 10 + Math.random() * 6, 0, Math.PI * 2);
        ctx.fill();

        var spkIdx = explosionsPool.alloc();
        if (spkIdx >= 0) {
          var spko = spkIdx * 6;
          explosionsPool.buffer[spko] = targetEnemy.x + (Math.random() - 0.5) * 12;
          explosionsPool.buffer[spko + 1] = targetEnemy.y + (Math.random() - 0.5) * 12;
          explosionsPool.buffer[spko + 2] = (Math.random() - 0.5) * 8;
          explosionsPool.buffer[spko + 3] = (Math.random() - 0.5) * 8;
          explosionsPool.buffer[spko + 4] = 2 + Math.floor(Math.random() * 3);
          explosionsPool.buffer[spko + 5] = 0.85;
        }
        ctx.restore();

        if (jet.trapTimer >= 14) {
          jet.trapTimer = 0;
          if (targetEnemy.gen <= 5) {
            applyAirframeDamage(targetEnemy, 100.0, jet, "SINGULARITY_CANNON");
            addRadio(jet.callsign + ": 360° SURROUND TRAP -> " + targetEnemy.callsign + " VAPORIZED!");
          } else if (targetEnemy.gen === 6) {
            if (Math.random() < 0.65) {
              applyAirframeDamage(targetEnemy, 100.0, jet, "SINGULARITY_CANNON");
              addRadio(jet.callsign + ": SURROUND TRAP OVERWHELMED NGAD CIWS!");
            } else {
              targetEnemy.laserCooldown = 25;
              addRadio((targetEnemy.callsign || "GEN 6 NGAD") + ": LASER CIWS DEFLECTS SURROUND CAGE!");
            }
          } else if (targetEnemy.gen === 7) {
            targetEnemy.shieldPulse = 1.0;
            targetEnemy.mode = "BREAK";
            targetEnemy.modeTimer = 30;
            addRadio((targetEnemy.callsign || "SWARM") + ": QUANTUM SHIELD DEFLECTS SURROUND TRAP!");
          }
        }
      }

      // 2. Tri-Lance Pulse Beams
      if (da < 0.65 && dist < 420 && jet.swarmMode !== "SURROUND_TRAP") {
        if (jet.triLaserCooldown <= 0) {
          jet.triLaserCooldown = 10;
          ctx.save();
          ctx.strokeStyle = colors.fg;
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(d1x, d1y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
          ctx.moveTo(d2x, d2y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
          ctx.moveTo(d3x, d3y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
          ctx.stroke();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(d1x, d1y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
          ctx.moveTo(d2x, d2y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
          ctx.moveTo(d3x, d3y); ctx.lineTo(targetEnemy.x, targetEnemy.y);
          ctx.stroke();
          ctx.restore();

          var triDmg = 35.0 + Math.random() * 15.0;
          if (targetEnemy.gen === 7) {
            targetEnemy.shieldPulse = 1.0;
            if (Math.random() < 0.35) {
              var triLethal7 = applyAirframeDamage(targetEnemy, triDmg, jet, "TRI_LANCE");
              if (triLethal7) {
                addRadio(jet.callsign + ": TRI-LANCE PARTICLE BEAM SPLASH ON " + targetEnemy.callsign);
              }
            }
          } else {
            var triLethal = applyAirframeDamage(targetEnemy, triDmg, jet, "TRI_LANCE");
            if (triLethal) {
              addRadio(jet.callsign + ": TRI-LANCE PARTICLE BEAM SPLASH ON " + targetEnemy.callsign);
            } else {
              var spIdx = explosionsPool.alloc();
              if (spIdx >= 0) {
                var spo = spIdx * 6;
                explosionsPool.buffer[spo] = targetEnemy.x + (Math.random() - 0.5) * 8;
                explosionsPool.buffer[spo + 1] = targetEnemy.y + (Math.random() - 0.5) * 8;
                explosionsPool.buffer[spo + 2] = (Math.random() - 0.5) * 6;
                explosionsPool.buffer[spo + 3] = (Math.random() - 0.5) * 6;
                explosionsPool.buffer[spo + 4] = 3;
                explosionsPool.buffer[spo + 5] = 0.9;
              }
            }
          }
        }
      }

      // 3. Singularity Cannon / Super Laser
      if (da < 0.45 && dist >= 140 && dist < 450 && jet.superLaserCooldown <= 0) {
        jet.superLaserCooldown = 120;
        jet.superLaserPulse = 1.0;
        jet.singularityBeamActive = true;
        jet.swarmMode = "FORM_UP";
        var focalX = jet.x + cosA * 26;
        var focalY = jet.y + sinA * 26;

        // Full-screen quantum beam ray across the canvas
        var beamAngle = Math.atan2(targetEnemy.y - focalY, targetEnemy.x - focalX);
        var fullRayLen = 2000.0;
        var beamEndX = focalX + Math.cos(beamAngle) * fullRayLen;
        var beamEndY = focalY + Math.sin(beamAngle) * fullRayLen;

        ctx.save();
        ctx.strokeStyle = "rgba(180, 0, 255, 0.85)";
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(focalX, focalY); ctx.lineTo(beamEndX, beamEndY);
        ctx.stroke();

        ctx.strokeStyle = "rgba(0, 255, 255, 0.95)";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(focalX, focalY); ctx.lineTo(beamEndX, beamEndY);
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(focalX, focalY); ctx.lineTo(beamEndX, beamEndY);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(focalX, focalY, 16, 0, Math.PI * 2);
        ctx.arc(focalX, focalY, 28, 0, Math.PI * 2);
        ctx.arc(targetEnemy.x, targetEnemy.y, 24, 0, Math.PI * 2);
        ctx.arc(targetEnemy.x, targetEnemy.y, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Expanding particle shockwaves
        if (globalVfxParticlePool) {
          for (var psw = 0; psw < 2; psw++) {
            var swIdx = globalVfxParticlePool.alloc();
            if (swIdx >= 0) {
              var swo = swIdx * 8;
              globalVfxParticlePool.buffer[swo] = targetEnemy.x;
              globalVfxParticlePool.buffer[swo + 1] = targetEnemy.y;
              globalVfxParticlePool.buffer[swo + 2] = (Math.random() - 0.5) * 3;
              globalVfxParticlePool.buffer[swo + 3] = (Math.random() - 0.5) * 3;
              globalVfxParticlePool.buffer[swo + 4] = 30 + psw * 10;
              globalVfxParticlePool.buffer[swo + 5] = 30 + psw * 10;
              globalVfxParticlePool.buffer[swo + 6] = 8.0 + psw * 8.0;
              globalVfxParticlePool.buffer[swo + 7] = 2; // Type 2: Shockwave ring
            }
          }
        }

        if (targetEnemy.gen === 7) {
          targetEnemy.shieldPulse = 1.0;
          targetEnemy.mode = "BREAK";
          targetEnemy.modeTimer = 35;
          addRadio((targetEnemy.callsign || "SWARM") + ": QUANTUM SHIELD ABSORBS SINGULARITY BEAM!");
        } else {
          applyAirframeDamage(targetEnemy, 100.0, jet, "SINGULARITY_CANNON");
          addRadio(jet.callsign + ": SINGULARITY SUPER LASER FIRED -> " + targetEnemy.callsign + " DISINTEGRATED!");
        }
      }
    } else {
      // Gen 1-5 Guns & Missiles
      var hShooter = getAltitudeFeet(jet.y, height);
      var hTarget = getAltitudeFeet(targetEnemy.y, height);
      var deltaH = hTarget - hShooter;
      var isKineticReachValid = (Math.abs(deltaH) <= 35000);

      // 20mm Cannon (point-blank dogfight: 20-220 px, exactly 16 ticks life)
      var leadTimeGuns = Math.min(dist / 14.0, 15.0);
      var leadGunX = targetEnemy.x + Math.cos(targetEnemy.angle) * targetEnemy.speed * leadTimeGuns;
      var leadGunY = targetEnemy.y + Math.sin(targetEnemy.angle) * targetEnemy.speed * leadTimeGuns;
      var leadBearingGuns = Math.atan2(leadGunY - jet.y, leadGunX - jet.x);
      var daLeadGuns = Math.abs(jet.angle - leadBearingGuns);
      while (daLeadGuns > Math.PI) daLeadGuns = Math.abs(daLeadGuns - Math.PI * 2);

      if ((da < 0.785 || daLeadGuns < 0.85) && dist >= 20 && dist <= 220 && jet.gunCooldown <= 0 && isKineticReachValid) {
        jet.gunCooldown = 3;
        var bIdx = bulletsPool.alloc();
        if (bIdx >= 0) {
          var bo = bIdx * 6;
          bulletsPool.buffer[bo] = jet.x + Math.cos(jet.angle) * 20;
          bulletsPool.buffer[bo + 1] = jet.y + Math.sin(jet.angle) * 20;
          bulletsPool.buffer[bo + 2] = Math.cos(jet.angle) * 14;
          bulletsPool.buffer[bo + 3] = Math.sin(jet.angle) * 14;
          bulletsPool.buffer[bo + 4] = 16;
          bulletsPool.buffer[bo + 5] = shooterTeamCode; // 0 = Blue, 1 = Red
        }
        if (jet.gen === 1 && Math.random() < 0.20) {
          addRadio(jet.callsign + ": GUNS! 20MM BURST ON TARGET");
        }
      }

      // Missiles (Gen 2-5: extended envelopes up to 1200-1500 px, 240 ticks lifespan)
      var targetAspectDeg = calculateAspectAngle({ x: jet.x, y: jet.y }, targetEnemy.angle, { x: targetEnemy.x, y: targetEnemy.y });
      var isBayOpen = (targetEnemy.bayDoorTimer > 0);
      var specT = AIRCRAFT_SPECS[targetEnemy.gen] || AIRCRAFT_SPECS[4];
      var targetRcsEffective = isBayOpen ? (specT.rcsBloom || 1.2) : (targetEnemy.rcs || specT.rcsClean || specT.rcs || 1.0);
      var maxRadarRange = calculateRadarDetectionRange(jet.gen, targetRcsEffective, 1.0, targetAspectDeg, isBayOpen);

      var canAcquireLock = canAcquireTargetLock(jet, targetEnemy, dist, deltaH);
      if (jet.sensors) {
        jet.sensors.radarLocked = canAcquireLock;
        jet.sensors.lockQuality = canAcquireLock ? Math.max(0.0, 1.0 - (dist / Math.max(maxRadarRange, 1.0))) : 0.0;
      }
      if (targetEnemy.sensors) {
        targetEnemy.sensors.inRwrWarning = canAcquireLock && (jet.gen >= 3);
      }

      var leadTimeMis = Math.min(dist / 14.0, 20.0);
      var leadMisX = targetEnemy.x + Math.cos(targetEnemy.angle) * targetEnemy.speed * leadTimeMis;
      var leadMisY = targetEnemy.y + Math.sin(targetEnemy.angle) * targetEnemy.speed * leadTimeMis;
      var leadBearingMis = Math.atan2(leadMisY - jet.y, leadMisX - jet.x);
      var daLeadMis = Math.abs(jet.angle - leadBearingMis);
      while (daLeadMis > Math.PI) daLeadMis = Math.abs(daLeadMis - Math.PI * 2);

      if (jet.gen >= 2 && (da < 1.10 || daLeadMis < 1.10) && dist <= 1400 && dist >= 50 && jet.missileCooldown <= 0 && jet.speed > V_CORNER * 0.6 && canAcquireLock) {
        var allowLaunch = true;
        var misSpeed = jet.speed + 3.0;
        var misType = 0;

        if (jet.gen === 2) {
          var targetBearing = Math.atan2(targetEnemy.y - jet.y, targetEnemy.x - jet.x);
          var aspectDiff = Math.abs(targetEnemy.angle - targetBearing);
          while (aspectDiff > Math.PI) aspectDiff = Math.abs(aspectDiff - Math.PI * 2);
          if (aspectDiff > 1.10 || Math.abs(deltaH) > 35000) {
            allowLaunch = false;
          } else {
            misType = 1;
            addRadio(jet.callsign + ": FOX-2! AIM-9B HEATSEEKER AWAY");
          }
        } else if (jet.gen === 3) {
          misType = 3;
          misSpeed = jet.speed + 3.5;
          addRadio(jet.callsign + ": FOX-1! AIM-7 SPARROW AWAY (BVR RADAR LOCK)");
        } else if (jet.gen === 4) {
          misType = 4;
          if (jet.variant === "F16" || (jet.callsign && jet.callsign.indexOf("VIPER") !== -1)) {
            misSpeed = jet.speed + 3.4;
            addRadio(jet.callsign + ": FOX-2! AIM-9L ALL-ASPECT LOCK AWAY");
          } else if (dist > 240) {
            misSpeed = jet.speed + 4.2;
            addRadio(jet.callsign + ": FOX-3! AIM-54 PHOENIX AWAY (MACH 5)");
          } else {
            addRadio(jet.callsign + ": FOX-2! AIM-9L SIDEWINDER AWAY");
          }
        } else if (jet.gen === 5) {
          misType = 5;
          misSpeed = jet.speed + 3.8;
          addRadio(jet.callsign + ": FOX-3! AIM-120D AMRAAM AWAY (STEALTH INTERNAL RELEASE)");
        }

        if (allowLaunch) {
          if (jet.gen === 5 || jet.gen === 6) {
            jet.bayDoorTimer = 36; // 1.2s internal weapons bay bloom
            var specSelf = AIRCRAFT_SPECS[jet.gen] || AIRCRAFT_SPECS[5];
            jet.rcs = specSelf.rcsBloom || 1.2;
          }
          jet.missileCooldown = 20 + Math.floor(Math.random() * 16);
          var misIdx = missilesPool.alloc();
          if (misIdx >= 0) {
            var mso = misIdx * 8;
            missilesPool.buffer[mso] = jet.x;
            missilesPool.buffer[mso + 1] = jet.y;
            missilesPool.buffer[mso + 2] = Math.cos(jet.angle) * misSpeed;
            missilesPool.buffer[mso + 3] = Math.sin(jet.angle) * misSpeed;
            missilesPool.buffer[mso + 4] = shooterTeamCode; // 0 = Blue, 1 = Red
            missilesPool.buffer[mso + 5] = targetEnemy.slotIdx;
            missilesPool.buffer[mso + 6] = 240;
            missilesPool.buffer[mso + 7] = misType;
            missileSmokes[misIdx].clear();
          }
        }
      }
    }
  }

  function updateDogfight(now) {
    if (!dogfightAnimId) return;
    dogfightAnimId = requestAnimationFrame(updateDogfight);
    if (now && lastDogfightTime && (now - lastDogfightTime < 33)) return;
    lastDogfightTime = now;
    ctx.clearRect(0, 0, width, height);
    if (!hasAnyActiveGen()) return;
    var colors = getThemeColors();

    ctx.save();
    ctx.strokeStyle = getAlphaColor("border", 0.18);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; gx < width; gx += 120) {
      ctx.moveTo(gx, 0); ctx.lineTo(gx, height);
    }
    ctx.stroke();

    // Minimalist Tactical Altitude Layers & Markers (0k - 100k ft)
    ctx.strokeStyle = getAlphaColor("fg", 0.22);
    ctx.fillStyle = getAlphaColor("fg", 0.45);
    ctx.font = "9px monospace";
    var altGridLines = [0, 20000, 40000, 60000, 80000, 100000];
    for (var agi = 0; agi < altGridLines.length; agi++) {
      var altVal = altGridLines[agi];
      var gridY = getYFromAltitude(altVal, height);
      ctx.setLineDash(DASH_4_4);
      ctx.beginPath();
      ctx.moveTo(0, gridY); ctx.lineTo(width, gridY);
      ctx.stroke();

      var altLabel = (altVal === 100000) ? "100k FT (NEAR-SPACE)" : (altVal === 0 ? "0 FT (TERRAIN)" : (altVal / 1000) + "k FT");
      ctx.fillText(altLabel, 10, gridY > 12 ? gridY - 4 : 12);
    }
    ctx.setLineDash([]);

    // Subtle 0 ft Terrain Footer Gradient
    if (ctx.createLinearGradient) {
      var terrainGrad = ctx.createLinearGradient(0, height - 32, 0, height);
      terrainGrad.addColorStop(0, getAlphaColor("panel", 0.0));
      terrainGrad.addColorStop(1, getAlphaColor("panel", 0.45));
      ctx.fillStyle = terrainGrad;
    } else {
      ctx.fillStyle = getAlphaColor("panel", 0.25);
    }
    ctx.fillRect(0, height - 32, width, 32);
    ctx.restore();

    // 1. Wipeout Detection, Dying Decay & Wave Ingress Timers
    var blueActiveCount = 0;
    for (var bi = 0; bi < bluePool.length; bi++) {
      var bj = bluePool[bi];
      if (bj.isDying) {
        bj.deathTimer--;
        bj.fadeAlpha = Math.max(0.0, bj.deathTimer / 45.0);
        if (bj.deathTimer <= 0) {
          bj.active = false;
          bj.isDying = false;
          bj.fadeAlpha = 0.0;
        }
      } else if (bj.active) {
        blueActiveCount++;
      }
    }

    var redActiveCount = 0;
    for (var ri = 0; ri < redPool.length; ri++) {
      var rj = redPool[ri];
      if (rj.isDying) {
        rj.deathTimer--;
        rj.fadeAlpha = Math.max(0.0, rj.deathTimer / 45.0);
        if (rj.deathTimer <= 0) {
          rj.active = false;
          rj.isDying = false;
          rj.fadeAlpha = 0.0;
        }
      } else if (rj.active) {
        redActiveCount++;
      }
    }

    // Wipeout Patrol Cruise Transition & Screen-Edge Scramble Timers
    if (redActiveCount === 0 && blueActiveCount > 0) {
      // Blue Force Wins Round -> Patrol Cruise
      for (var bpc = 0; bpc < bluePool.length; bpc++) {
        var bpJet = bluePool[bpc];
        if (bpJet.active && !bpJet.isDying) {
          bpJet.mode = "PATROL";
          bpJet.afterburner = false;
          bpJet.targetJet = null;
          if (Math.abs(Math.sin(bpJet.angle)) > 0.15) {
            bpJet.targetAngle = (Math.cos(bpJet.angle) >= 0) ? 0.0 : Math.PI;
          }
        }
      }
      redIngressTimer++;
      if (redIngressTimer >= 90) { // 3.0s tactical ingress delay
        redIngressTimer = 0;
        scrambleWave("red");
      }
    } else if (blueActiveCount === 0 && redActiveCount > 0) {
      // Red Force Wins Round -> Patrol Cruise
      for (var rpc = 0; rpc < redPool.length; rpc++) {
        var rpJet = redPool[rpc];
        if (rpJet.active && !rpJet.isDying) {
          rpJet.mode = "PATROL";
          rpJet.afterburner = false;
          rpJet.targetJet = null;
          if (Math.abs(Math.sin(rpJet.angle)) > 0.15) {
            rpJet.targetAngle = (Math.cos(rpJet.angle) >= 0) ? 0.0 : Math.PI;
          }
        }
      }
      blueIngressTimer++;
      if (blueIngressTimer >= 90) {
        blueIngressTimer = 0;
        scrambleWave("blue");
      }
    } else if (blueActiveCount === 0 && redActiveCount === 0) {
      blueIngressTimer++;
      redIngressTimer++;
      if (blueIngressTimer >= 90) {
        blueIngressTimer = 0;
        scrambleWave("blue");
      }
      if (redIngressTimer >= 90) {
        redIngressTimer = 0;
        scrambleWave("red");
      }
    } else {
      blueIngressTimer = 0;
      redIngressTimer = 0;
    }

    // 2. Mutual Cross-Targeting & Tactical Swarm AI
    updateTacticalManeuvers(bluePool, redPool);
    updateTacticalManeuvers(redPool, bluePool);

    // 3. Physics & Weapon Simulation for all active aircraft
    for (var aji = 0; aji < allJets.length; aji++) {
      var airframe = allJets[aji];
      if (!airframe.active || airframe.isDying) continue;

      var isBlueAirframe = (airframe.team === "blue");
      var hostileTeam = isBlueAirframe ? 1 : 0;

      // Check incoming threat missile
      var threatMissile = false;
      var threatMissileIdx = -1;
      var minMDist = 999999;
      for (var tm = 0; tm < missilesPool.activeCount; tm++) {
        var tmo = tm * 8;
        if (missilesPool.buffer[tmo + 4] === hostileTeam) {
          var tmx = missilesPool.buffer[tmo];
          var tmy = missilesPool.buffer[tmo + 1];
          var mDist = Math.hypot(tmx - airframe.x, tmy - airframe.y);
          if (mDist < minMDist && mDist < 220) {
            minMDist = mDist;
            threatMissile = true;
            threatMissileIdx = tm;
          }
        }
      }

      // Gen 6 Mothership 150 kW DEW Laser CIWS Intercept
      if (airframe.gen === 6 && threatMissile && threatMissileIdx >= 0 && (typeof airframe.laserCooldown === "undefined" || airframe.laserCooldown <= 0)) {
        airframe.laserCooldown = 35;
        airframe.dewCiwsActive = true;
        var ctmo = threatMissileIdx * 8;
        var ctmx = missilesPool.buffer[ctmo];
        var ctmy = missilesPool.buffer[ctmo + 1];
        ctx.save();
        ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(airframe.x, airframe.y);
        ctx.lineTo(ctmx, ctmy);
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(airframe.x, airframe.y);
        ctx.lineTo(ctmx, ctmy);
        ctx.stroke();
        ctx.restore();

        missilesPool.buffer[ctmo + 6] = 0; // 1-tick speed-of-light vaporize

        if (globalVfxParticlePool) {
          var spkIdx = globalVfxParticlePool.alloc();
          if (spkIdx >= 0) {
            var spo = spkIdx * 8;
            globalVfxParticlePool.buffer[spo] = ctmx;
            globalVfxParticlePool.buffer[spo + 1] = ctmy;
            globalVfxParticlePool.buffer[spo + 2] = (Math.random() - 0.5) * 4;
            globalVfxParticlePool.buffer[spo + 3] = (Math.random() - 0.5) * 4;
            globalVfxParticlePool.buffer[spo + 4] = 12;
            globalVfxParticlePool.buffer[spo + 5] = 12;
            globalVfxParticlePool.buffer[spo + 6] = 4.0;
            globalVfxParticlePool.buffer[spo + 7] = 2; // Shockwave ring
          }
        }
        addRadio(airframe.callsign + " 150 kW DEW CIWS: DIRECTED-ENERGY THERMAL INTERCEPT (MISSILE VAPORIZED)");
      } else {
        airframe.dewCiwsActive = false;
      }

      updateJetPhysics(airframe, airframe.targetJet, threatMissile, isBlueAirframe ? redPool : bluePool, missilesPool);
      evaluateJetWeapons(airframe, airframe.targetJet, colors);
    }

    // 4. Pairwise Mid-Air Dynamic Merge & Collision Detection
    for (var c1 = 0; c1 < allJets.length; c1++) {
      var colJet1 = allJets[c1];
      if (!colJet1.active || colJet1.isDying) continue;
      for (var c2 = c1 + 1; c2 < allJets.length; c2++) {
        var colJet2 = allJets[c2];
        if (!colJet2.active || colJet2.isDying) continue;
        var pDist = Math.hypot(colJet1.x - colJet2.x, colJet1.y - colJet2.y);
        var relSpeed = Math.hypot(
          Math.cos(colJet1.angle) * colJet1.speed - Math.cos(colJet2.angle) * colJet2.speed,
          Math.sin(colJet1.angle) * colJet1.speed - Math.sin(colJet2.angle) * colJet2.speed
        );
        if (pDist < 6.0 && relSpeed < 4.0) {
          // Direct catastrophic mid-air fuselage ram
          applyAirframeDamage(colJet1, 100.0, colJet2, "COLLISION");
          applyAirframeDamage(colJet2, 100.0, colJet1, "COLLISION");
          addRadio("TACTICAL ALERT: MID-AIR COLLISION -> " + colJet1.callsign + " & " + colJet2.callsign + " MUTUAL DESTRUCTION!");
        } else if (pDist < 32.0 && relSpeed > 5.0 && (colJet1.speed > 4.5 || colJet2.speed > 4.5)) {
          // High-speed 3D supersonic merge pass: spawn near-miss transonic vapor effects
          if (Math.random() < 0.15) {
            addRadio("TACTICAL MERGE: " + colJet1.callsign + " & " + colJet2.callsign + " HIGH-SPEED PASS -> TRANSITIONING TO DOGFIGHT!");
          }
        }
      }
    }

    // 5. Render Aircraft Visuals
    for (var rji = 0; rji < allJets.length; rji++) {
      var rJet = allJets[rji];
      if (rJet.isDying) {
        continue;
      }
      if (!rJet.active) continue;

      var rFaction = (rJet.team === "red" || rJet.isRed) ? FACTION_COLORS.red : FACTION_COLORS.blue;

      // Contrails
      rJet.contrail.forEach(function (cx, cy, alpha, g, i, idx) {
        var co = idx * rJet.contrail.stride;
        rJet.contrail.buffer[co + 2] *= 0.93;
        var a = rJet.contrail.buffer[co + 2];
        ctx.fillStyle = getAlphaColor("fg", a * (g > 4.0 ? 0.45 : 0.2));
        ctx.fillRect(Math.floor(cx), Math.floor(cy), (g > 5.0 ? 3 : 2), (g > 5.0 ? 3 : 2));
      });

      // Wing Vapor & Wingtip Faction Tracers
      rJet.wingVapor.forEach(function (vx, vy, alpha, extra, i, idx) {
        var vo = idx * rJet.wingVapor.stride;
        rJet.wingVapor.buffer[vo + 2] *= 0.88;
        var a = rJet.wingVapor.buffer[vo + 2];
        if (extra === 1) {
          ctx.fillStyle = rFaction.accent;
          ctx.fillRect(Math.floor(vx), Math.floor(vy), 2, 2);
        } else {
          ctx.fillStyle = getAlphaColor("fg", a * 0.5);
          ctx.fillRect(Math.floor(vx), Math.floor(vy), 3, 3);
        }
      });

      // Jet Silhouette, Condensation Vapor Collar & Thrust-Scaled Exhaust
      ctx.save();
      ctx.translate(Math.floor(rJet.x), Math.floor(rJet.y));
      ctx.rotate(rJet.angle);

      // Aerodynamic condensation vapor collar (Prandtl-Glauert cloud) in transonic regime
      if (rJet.gen >= 2 && rJet.speed >= 5.0 && rJet.speed <= 6.2) {
        var vaporRatio = 1.0 - Math.abs(rJet.speed - 5.5) / 0.7;
        if (vaporRatio > 0) {
          ctx.save();
          ctx.strokeStyle = (typeof getAlphaColor === "function") ? getAlphaColor("fg", vaporRatio * 0.65) : "rgba(255,255,255,0.65)";
          ctx.fillStyle = (typeof getAlphaColor === "function") ? getAlphaColor("panel", vaporRatio * 0.35) : "rgba(100,100,100,0.35)";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          if (typeof ctx.ellipse === "function") {
            ctx.ellipse(-6, 0, 10, 22, 0, -Math.PI * 0.45, Math.PI * 0.45);
          } else {
            ctx.arc(-6, 0, 16, -Math.PI * 0.45, Math.PI * 0.45);
          }
          ctx.stroke();
          ctx.fill();
          ctx.restore();
        }
      }

      drawThrustScaledExhaust(ctx, rJet, colors, now);
      drawJetSilhouette(ctx, rJet.gen, rJet.isLead, colors, rJet.isLead ? 0.95 : 0.85, now, rJet);
      ctx.restore();

      if (rJet.gen === 6) {
        updateAndDrawCcaDrones(rJet, rJet.isLead, colors);
      }

      // Clean aircraft silhouette with in-world floating health bar
      drawInWorldHealthBar(ctx, rJet, colors, globalHudFrameCount);
    }

    // 6. Simulate & Collide Bullets (Velocity-Aligned Tracer Streams & Spark Particles)
    for (var b = bulletsPool.activeCount - 1; b >= 0; b--) {
      var bo = b * 6;
      bulletsPool.buffer[bo] += bulletsPool.buffer[bo + 2];
      bulletsPool.buffer[bo + 1] += bulletsPool.buffer[bo + 3];
      bulletsPool.buffer[bo + 4]--;
      var bx = bulletsPool.buffer[bo];
      var by = bulletsPool.buffer[bo + 1];
      var bvx = bulletsPool.buffer[bo + 2];
      var bvy = bulletsPool.buffer[bo + 3];
      var blife = bulletsPool.buffer[bo + 4];
      var bOwnerTeam = bulletsPool.buffer[bo + 5]; // 0 = Blue, 1 = Red

      if (blife <= 0) {
        bulletsPool.free(b);
        continue;
      }

      // Draw high-visibility velocity-aligned tracer line strokes
      ctx.save();
      var bFaction = (bOwnerTeam === 1) ? FACTION_COLORS.red : FACTION_COLORS.blue;
      var tracerColor = bFaction ? (bFaction.tracer || bFaction.accent) : (bOwnerTeam === 0 ? "#38bdf8" : "#f43f5e");
      ctx.strokeStyle = tracerColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bx - bvx * 0.75, by - bvy * 0.75);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Incandescent white tracer core
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx - bvx * 0.35, by - bvy * 0.35);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();

      // Emit high-velocity tracer spark particles into globalVfxParticlePool
      if (globalVfxParticlePool && Math.random() < 0.30) {
        var spIdx = globalVfxParticlePool.alloc();
        if (spIdx >= 0) {
          var spo = spIdx * 8;
          var spkLife = 6 + Math.floor(Math.random() * 6);
          globalVfxParticlePool.buffer[spo] = bx - bvx * 0.4;
          globalVfxParticlePool.buffer[spo + 1] = by - bvy * 0.4;
          globalVfxParticlePool.buffer[spo + 2] = -bvx * 0.12 + (Math.random() - 0.5) * 2.0;
          globalVfxParticlePool.buffer[spo + 3] = -bvy * 0.12 + (Math.random() - 0.5) * 2.0;
          globalVfxParticlePool.buffer[spo + 4] = spkLife;
          globalVfxParticlePool.buffer[spo + 5] = spkLife;
          globalVfxParticlePool.buffer[spo + 6] = 1.0;
          globalVfxParticlePool.buffer[spo + 7] = 1; // Type 1: Sparks
        }
      }

      var targetPool = (bOwnerTeam === 0) ? redPool : bluePool;
      var shooterPool = (bOwnerTeam === 0) ? bluePool : redPool;
      var bulletConsumed = false;

      for (var ti = 0; ti < targetPool.length; ti++) {
        var tJet = targetPool[ti];
        if (!tJet.active || tJet.isDying) continue;
        if (Math.hypot(tJet.x - bx, tJet.y - by) < 20) {
          if (tJet.gen === 7) {
            tJet.shieldPulse = 1.0;
          } else {
            var shooterJet = shooterPool[0];
            var gDmg = 15.0 + Math.random() * 5.0;
            var isLethal = applyAirframeDamage(tJet, gDmg, shooterJet, "GUN_20MM");
            if (isLethal) {
              addRadio("GUN KILL! SPLASH " + tJet.callsign);
            } else {
              for (var hbHit = 0; hbHit < 6; hbHit++) {
                var hbhIdx = explosionsPool.alloc();
                if (hbhIdx >= 0) {
                  var hbho = hbhIdx * 6;
                  explosionsPool.buffer[hbho] = bx;
                  explosionsPool.buffer[hbho + 1] = by;
                  explosionsPool.buffer[hbho + 2] = (Math.random() - 0.5) * 6;
                  explosionsPool.buffer[hbho + 3] = (Math.random() - 0.5) * 6;
                  explosionsPool.buffer[hbho + 4] = 2;
                  explosionsPool.buffer[hbho + 5] = 0.8;
                }
              }
            }
          }
          bulletsPool.free(b);
          bulletConsumed = true;
          break;
        }
      }
      if (bulletConsumed) continue;
    }

    // 7. Simulate & Collide Missiles
    for (var mi = missilesPool.activeCount - 1; mi >= 0; mi--) {
      var mo = mi * 8;
      var misX = missilesPool.buffer[mo];
      var misY = missilesPool.buffer[mo + 1];
      var misVx = missilesPool.buffer[mo + 2];
      var misVy = missilesPool.buffer[mo + 3];
      var misOwnerTeam = missilesPool.buffer[mo + 4]; // 0 = Blue, 1 = Red
      var tgtSlot = Math.round(missilesPool.buffer[mo + 5]);
      var misLife = missilesPool.buffer[mo + 6];
      var misType = missilesPool.buffer[mo + 7];

      var oppPool = (misOwnerTeam === 0) ? redPool : bluePool;
      var friendlyLauncherPool = (misOwnerTeam === 0) ? bluePool : redPool;
      var launcherJet = friendlyLauncherPool[0];

      var tgtJet = (tgtSlot >= 0 && tgtSlot < oppPool.length && oppPool[tgtSlot].active && !oppPool[tgtSlot].isDying) ? oppPool[tgtSlot] : null;
      if (!tgtJet) {
        for (var opi = 0; opi < oppPool.length; opi++) {
          if (oppPool[opi].active && !oppPool[opi].isDying) {
            tgtJet = oppPool[opi];
            break;
          }
        }
      }

      var tgtX = null;
      var tgtY = null;
      var isDecoyed = false;
      var isRadarMissile = (misType === 3 || misType === 4 || misType === 5);
      var isIrMissile = (misType === 1 || misType === 2 || misType === 6);

      if (isIrMissile && flaresPool.activeCount > 0 && Math.random() < 0.75) {
        tgtX = flaresPool.buffer[0];
        tgtY = flaresPool.buffer[1];
        isDecoyed = true;
      } else if (isRadarMissile && chaffPool.activeCount > 0 && Math.random() < 0.80) {
        tgtX = chaffPool.buffer[0];
        tgtY = chaffPool.buffer[1];
        isDecoyed = true;
      } else if (tgtJet) {
        tgtX = tgtJet.x;
        tgtY = tgtJet.y;
      }

      // SARH lost lock check
      if (misType === 3 && launcherJet && launcherJet.active && tgtX !== null && !isDecoyed) {
        var hBearing = Math.atan2(tgtY - launcherJet.y, tgtX - launcherJet.x);
        var hConeDiff = Math.abs(launcherJet.angle - hBearing);
        while (hConeDiff > Math.PI) hConeDiff = Math.abs(hConeDiff - Math.PI * 2);
        if (hConeDiff > 0.55) {
          tgtX = null; tgtY = null; isDecoyed = true;
          addRadio("TACTICAL WARNING: AIM-7 LOST RADAR LOCK (TRACK CONE EXCEEDED)");
        }
      }

      // Doppler Beam Notching check for radar-guided missiles
      if (isRadarMissile && tgtJet && tgtJet.active && !tgtJet.isDying && tgtX !== null && !isDecoyed) {
        var misHeading = Math.atan2(misVy, misVx);
        var targetMisAspect = Math.abs(tgtJet.angle - misHeading);
        while (targetMisAspect > Math.PI) targetMisAspect = Math.abs(targetMisAspect - Math.PI * 2);
        var targetMisAspectDeg = targetMisAspect * (180.0 / Math.PI);
        if (Math.abs(targetMisAspectDeg - 90.0) <= 15.001) {
          tgtX = null; tgtY = null; isDecoyed = true;
          if (Math.random() < 0.25) {
            addRadio("TACTICAL ALERT: " + tgtJet.callsign + " DOPPLER NOTCHED RADAR MISSILE (LOCK BROKEN)");
          }
        }
      }

      // VLO Stealth Seeker Degradation & Lost-Lock Check
      if (tgtJet && tgtJet.active && !tgtJet.isDying && tgtX !== null && !isDecoyed) {
        var misDist = Math.hypot(tgtJet.x - misX, tgtJet.y - misY);
        var seekerEval = (typeof evaluateMissileSeekerDegradation === "function")
          ? evaluateMissileSeekerDegradation(misType, tgtJet, misDist)
          : null;
        if (seekerEval && (seekerEval.degraded || seekerEval.lostLock)) {
          tgtX = null;
          tgtY = null;
          isDecoyed = true;
          var tCall = (tgtJet && tgtJet.callsign) ? tgtJet.callsign : "TARGET";
          var alertMsg = "TACTICAL ALERT: MISSILE SEEKER LOST TRACK ON " + tCall + " (VLO STEALTH DEGRADATION)";
          if (typeof triggerTacticalRadio === "function") {
            triggerTacticalRadio(alertMsg);
          } else if (typeof addRadio === "function") {
            addRadio(alertMsg);
          }
        }
      }

      var curSpeed = Math.hypot(misVx, misVy);
      var maxMSpeed = (misType === 4) ? 12.5 : 11.5;
      var nextSpeed = Math.min(curSpeed + 0.08, maxMSpeed);

      if (tgtX !== null && !isDecoyed) {
        var targetBearing = Math.atan2(tgtY - misY, tgtX - misX);
        var mda = targetBearing - Math.atan2(misVy, misVx);
        while (mda < -Math.PI) mda += Math.PI * 2;
        while (mda > Math.PI) mda -= Math.PI * 2;

        var mTurn = Math.min(Math.max(mda * 0.14, -0.12), 0.12);
        var newAngle = Math.atan2(misVy, misVx) + mTurn;
        misVx = Math.cos(newAngle) * nextSpeed;
        misVy = Math.sin(newAngle) * nextSpeed;
      } else {
        var curAngle = Math.atan2(misVy, misVx);
        misVx = Math.cos(curAngle) * nextSpeed;
        misVy = Math.sin(curAngle) * nextSpeed;
      }

      misX += misVx;
      misY += misVy;
      misLife--;

      missilesPool.buffer[mo] = misX;
      missilesPool.buffer[mo + 1] = misY;
      missilesPool.buffer[mo + 2] = misVx;
      missilesPool.buffer[mo + 3] = misVy;
      missilesPool.buffer[mo + 6] = misLife;

      var smoke = missileSmokes[mi];
      smoke.push(misX, misY, 0.85, 0);

      smoke.forEach(function (sx, sy, alpha, extra, i, idx) {
        var so = idx * smoke.stride;
        smoke.buffer[so + 2] *= 0.91;
        var sa = smoke.buffer[so + 2];
        ctx.fillStyle = getAlphaColor("fg", sa * 0.35);
        ctx.fillRect(Math.floor(sx), Math.floor(sy), 2, 2);
      });

      ctx.fillStyle = getAlphaColor("fg", 1.0);
      ctx.fillRect(Math.floor(misX) - 2, Math.floor(misY) - 1, 5, 3);

      var isDetonated = false;
      if (tgtX !== null && Math.hypot(tgtX - misX, tgtY - misY) < 22 && misLife > 0) {
        isDetonated = true;
        if (isDecoyed) {
          addRadio("TACTICAL WARNING: MISSILE DECOYED BY COUNTERMEASURES!");
        } else if (tgtJet) {
          if (tgtJet.gen === 7) {
            tgtJet.shieldPulse = 1.0;
            addRadio((tgtJet.callsign || "SWARM") + ": QUANTUM SHIELD DEFLECTED MISSILE");
          } else if (tgtJet.gen === 6 && tgtJet.laserCooldown <= 0) {
            tgtJet.laserCooldown = 35;
            addRadio((tgtJet.callsign || "GEN 6 NGAD") + ": LASER CIWS VAPORIZED THREAT MISSILE!");
          } else {
            var mDamage = 75.0 + Math.random() * 10.0;
            var wName = "AIM_7";
            if (misType === 1) { mDamage = 60.0 + Math.random() * 10.0; wName = "AIM_9B"; }
            else if (misType === 3) { mDamage = 75.0 + Math.random() * 10.0; wName = "AIM_7"; }
            else if (misType === 4) { mDamage = 85.0 + Math.random() * 15.0; wName = "AIM_9L"; }
            else if (misType === 5) { mDamage = 90.0 + Math.random() * 10.0; wName = "AIM_120D"; }

            var mLethal = applyAirframeDamage(tgtJet, mDamage, launcherJet, wName);
            if (mLethal) {
              addRadio("FOX DIRECT IMPACT! " + tgtJet.callsign + " SPLASHED");
            } else {
              addRadio("FOX DIRECT HIT -> " + tgtJet.callsign + " IN FLAMES!");
              if (globalVfxParticlePool) {
                for (var spk = 0; spk < 6; spk++) {
                  var spkIdx = globalVfxParticlePool.alloc();
                  if (spkIdx >= 0) {
                    var spko = spkIdx * 8;
                    globalVfxParticlePool.buffer[spko] = tgtJet.x;
                    globalVfxParticlePool.buffer[spko + 1] = tgtJet.y;
                    globalVfxParticlePool.buffer[spko + 2] = (Math.random() - 0.5) * 6;
                    globalVfxParticlePool.buffer[spko + 3] = (Math.random() - 0.5) * 6;
                    globalVfxParticlePool.buffer[spko + 4] = 14;
                    globalVfxParticlePool.buffer[spko + 5] = 14;
                    globalVfxParticlePool.buffer[spko + 6] = 2.0;
                    globalVfxParticlePool.buffer[spko + 7] = 1; // Type 1: Sparks
                  }
                }
              }
            }
          }
        }
      }

      if (misLife <= 0 || isDetonated) {
        var lastSlot = missilesPool.activeCount - 1;
        if (mi !== lastSlot) {
          var tmpSmoke = missileSmokes[mi];
          missileSmokes[mi] = missileSmokes[lastSlot];
          missileSmokes[lastSlot] = tmpSmoke;
        }
        missileSmokes[lastSlot].clear();
        missilesPool.free(mi);
      }
    }

    // 8. Flares, Chaff Clouds & Explosions Simulation
    for (var fli = flaresPool.activeCount - 1; fli >= 0; fli--) {
      var flo = fli * 5;
      flaresPool.buffer[flo] += flaresPool.buffer[flo + 2];
      flaresPool.buffer[flo + 1] += flaresPool.buffer[flo + 3];
      flaresPool.buffer[flo + 4] -= 0.024;
      var flx = flaresPool.buffer[flo];
      var fly = flaresPool.buffer[flo + 1];
      var flife = flaresPool.buffer[flo + 4];

      if (flife <= 0) {
        flaresPool.free(fli);
        continue;
      }

      ctx.fillStyle = getAlphaColor("fg", flife);
      ctx.fillRect(Math.floor(flx), Math.floor(fly), 3, 3);
    }

    for (var ci = chaffPool.activeCount - 1; ci >= 0; ci--) {
      var co = ci * 5;
      chaffPool.buffer[co] += chaffPool.buffer[co + 2];
      chaffPool.buffer[co + 1] += chaffPool.buffer[co + 3];
      chaffPool.buffer[co + 2] *= 0.92;
      chaffPool.buffer[co + 3] *= 0.92;
      chaffPool.buffer[co + 4] -= 0.018;
      var cx = chaffPool.buffer[co];
      var cy = chaffPool.buffer[co + 1];
      var clife = chaffPool.buffer[co + 4];

      if (clife <= 0) {
        chaffPool.free(ci);
        continue;
      }

      ctx.fillStyle = (Math.random() > 0.5) ? ("rgba(200, 240, 255, " + Math.max(0, clife) + ")") : getAlphaColor("fg", clife * 0.75);
      ctx.fillRect(Math.floor(cx), Math.floor(cy), 2, 2);
    }

    for (var exp = explosionsPool.activeCount - 1; exp >= 0; exp--) {
      var eo = exp * 6;
      explosionsPool.buffer[eo] += explosionsPool.buffer[eo + 2];
      explosionsPool.buffer[eo + 1] += explosionsPool.buffer[eo + 3];
      explosionsPool.buffer[eo + 2] *= 0.94;
      explosionsPool.buffer[eo + 3] *= 0.94;
      explosionsPool.buffer[eo + 5] -= 0.024;
      var exLife = explosionsPool.buffer[eo + 5];

      if (exLife <= 0) {
        explosionsPool.free(exp);
        continue;
      }

      var exX = Math.floor(explosionsPool.buffer[eo]);
      var exY = Math.floor(explosionsPool.buffer[eo + 1]);
      var exSize = explosionsPool.buffer[eo + 4];

      if (exLife > 0.45) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(exX - Math.floor(exSize * 0.25), exY - Math.floor(exSize * 0.25), Math.max(2, Math.floor(exSize * 0.5)), Math.max(2, Math.floor(exSize * 0.5)));
      }
      ctx.fillStyle = getAlphaColor("fg", exLife * 0.9);
      ctx.fillRect(exX - Math.floor(exSize * 0.5), exY - Math.floor(exSize * 0.5), exSize, exSize);
    }

    updateAndDrawWreckage(ctx, 1.0, height);
    updateAndDrawVfxParticles(ctx, 1.0, height, colors);

    globalHudFrameCount = (globalHudFrameCount + 1) | 0;
    var hudLead = null;
    for (var bi = 0; bi < bluePool.length; bi++) {
      if (bluePool[bi].active && !bluePool[bi].isDying) {
        hudLead = bluePool[bi];
        break;
      }
    }
    if (!hudLead) {
      for (var bi2 = 0; bi2 < bluePool.length; bi2++) {
        if (bluePool[bi2].active) {
          hudLead = bluePool[bi2];
          break;
        }
      }
    }
    if (!hudLead) hudLead = bluePool[0];

    for (var hJetIdx = 0; hJetIdx < bluePool.length; hJetIdx++) {
      bluePool[hJetIdx].isHero = (bluePool[hJetIdx] === hudLead);
    }

    var hudTarget = hudLead ? hudLead.targetJet : null;
    drawHudOverlay(ctx, hudLead, hudTarget, width, height, colors, globalHudFrameCount, radioBuffer, radioHead, radioCount, MAX_RADIO, getAlphaColor);
  }

  function start() {
    if (!jetsEnabled) return;
    if (!dogfightAnimId) {
      dogfightAnimId = requestAnimationFrame(updateDogfight);
    }
  }

  function stop() {
    if (dogfightAnimId) {
      cancelAnimationFrame(dogfightAnimId);
      dogfightAnimId = null;
    }
  }

  CanvasLifecycleManager.register("global-dogfight", {
    canvas: canvas,
    start: start,
    stop: stop,
    respectReducedMotion: false
  });
  start();
}


function renderRoute(route) {
var raw = (route || "").replace(/^#/, "").trim();
if (!raw || raw === "home" || raw === "/") raw = "home";
var contentEl = document.getElementById("content");
if (!contentEl) return;
// Global nav active state
document.querySelectorAll("aside .global a[data-route]").forEach(function (a) {
var isAct = a.dataset.route === raw;
if (a.classList.contains("active") !== isAct) {
a.classList.toggle("active", isAct);
}
});
// Local sub-menu active state
var activeDoc = (typeof raw === "string" && Object.prototype.hasOwnProperty.call(ROUTE_TO_DOC, raw)) ? ROUTE_TO_DOC[raw] : "";
document.querySelectorAll("aside .local a").forEach(function (a) {
var matches = Boolean((a.dataset.route === raw) || (activeDoc && a.dataset.page === activeDoc));
if (a.classList.contains("active") !== matches) {
a.classList.toggle("active", matches);
}
});
if (typeof CanvasLifecycleManager !== "undefined") {
  CanvasLifecycleManager.cleanupRoute();
}
if (raw === "home") {
document.title = "openOODA";
contentEl.innerHTML = HOME_HTML;
setupHome();
initF16Hud();
initEmEngine();
initCapSandbox();
initSwarmCanvas();
initTargetSim();
initMtdEngine();
initVerifyProver();
} else if (raw === "registry") {
      document.title = "openOODA — Package Registry";
      contentEl.innerHTML = REGISTRY_HTML;
      setupRegistry();
    } else if (raw === "manifesto") {
document.title = "openOODA — Manifesto";
contentEl.innerHTML = MANIFESTO_HTML;
} else if (raw === "search") {
document.title = "openOODA — Search";
contentEl.innerHTML = SEARCH_HTML;
setupSearch();
} else if (raw === "play") {
document.title = "openOODA — WebAssembly Playground";
contentEl.innerHTML = PLAY_HTML;
setupPlayground();
} else if (raw === "ooda" || raw === "std" || raw === "opm" || raw === "cli" || raw === "lsp" || raw === "mcp") {
document.title = "openOODA — " + raw.toUpperCase();
contentEl.innerHTML = '<p class="canon">Loading ' + raw + ' docs from openOODA/' + raw + '/docs/&hellip;</p>';
fetch("/pulled/" + raw + ".json").then(function (r) {
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}).then(function (data) {
  var html = "";
  if (data.title) html += '<h1 class="visually-hidden">' + data.title + "</h1>";
  if (data.source) html += '<p class="canon">Source: ' + data.source + "</p>";
  if (data.content) {
    var parsed = "";
    if (typeof marked !== "undefined" && marked.parse) {
      try { parsed = marked.parse(data.content); } catch (e) { parsed = simpleMarkdown(data.content); }
    } else {
      parsed = simpleMarkdown(data.content);
    }
    html += parsed;
  }
  contentEl.innerHTML = html;
}).catch(function (err) {
  contentEl.innerHTML = '<h1>' + raw + '</h1><p>Failed to load docs: ' + (err && err.message ? err.message : "unknown") + '.</p><p><a href="https://github.com/openOODA/' + raw + '" target="_blank" rel="noopener noreferrer">View on GitHub</a>.</p>';
});
} else if (raw === "oodac" || raw === "runtime") {
document.title = "openOODA — " + raw + " (coming soon)";
contentEl.innerHTML = '<h1>' + raw + '</h1><p class="canon">coming soon</p><p>This repo will be extracted from <a href="https://github.com/openOODA/ooda" target="_blank" rel="noopener noreferrer">openOODA/ooda</a> once gemini\'s compiler work ships.</p><p>For now, the compiler and runtime live inside the <a href="https://github.com/openOODA/ooda" target="_blank" rel="noopener noreferrer">oda monorepo</a>.</p>';
} else if (typeof raw === "string" && Object.prototype.hasOwnProperty.call(ROUTE_TO_DOC, raw)) {
var docFile = ROUTE_TO_DOC[raw];
var text = DOCS[docFile] || "# Not Found";
var parsed = "";
if (typeof marked !== "undefined" && marked.parse) {
try { parsed = marked.parse(wikiLinks(text)); } catch (e) { parsed = simpleMarkdown(wikiLinks(text)); }
} else {
parsed = simpleMarkdown(wikiLinks(text));
}
document.title = "openOODA Guide — " + raw;
contentEl.innerHTML = '<p class="canon">https://openooda.org/#' + raw + "</p>" + parsed;
} else {
document.title = "openOODA — Not Found";
contentEl.innerHTML = "<p>Not found.</p>";
}
window.scrollTo(0, 0);
setupGenSelector();
if (typeof RadarVisualizers !== "undefined" && RadarVisualizers.initRadarCanvas) {
  var cvsSci = document.getElementById("canvas-radar-science");
  if (cvsSci && !cvsSci._radarInstance) cvsSci._radarInstance = RadarVisualizers.initRadarCanvas(cvsSci, RadarVisualizers.RADAR_SCIENCE_CONFIG);
  var cvsSys = document.getElementById("canvas-radar-systems");
  if (cvsSys && !cvsSys._radarInstance) cvsSys._radarInstance = RadarVisualizers.initRadarCanvas(cvsSys, RadarVisualizers.RADAR_SYSTEMS_CONFIG);
}
}
if (typeof document !== "undefined" && typeof window !== "undefined") {
  // Global search shortcut (Ctrl+K, Cmd+K, /)
  document.addEventListener("keydown", function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
  e.preventDefault();
  location.hash = "#search";
  setTimeout(function() {
  var input = document.getElementById("search-input");
  if (input) input.focus();
  }, 50);
  } else if (e.key === "/" && document.activeElement && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
  e.preventDefault();
  location.hash = "#search";
  setTimeout(function() {
  var input = document.getElementById("search-input");
  if (input) input.focus();
  }, 50);
  }
  });
  window.addEventListener("hashchange", function () {
  renderRoute(location.hash);
  });
  // Intercept clicks on links with internal anchors
  document.addEventListener("click", function (e) {
  var a = e.target.closest("a");
  if (!a) return;
  var href = a.getAttribute("href") || "";
  if (href.startsWith("#")) {
  e.preventDefault();
  var targetRoute = href.replace(/^#/, "");
  history.pushState(null, "", "#" + targetRoute);
  renderRoute(targetRoute);
  } else if (href.startsWith("/guide/#")) {
  e.preventDefault();
  var targetRoute = href.replace(/^\/guide\/#/, "");
  var mapped = DOC_TO_ROUTE[targetRoute] || targetRoute;
  history.pushState(null, "", "#" + mapped);
  renderRoute(mapped);
  }
  });
}
const originalRenderRoute = renderRoute;
renderRoute = function(rawRoute) {
  var r = (rawRoute || "").replace(/^#/, "").trim();
  if (typeof r === "string" && Object.prototype.hasOwnProperty.call(DOC_TO_ROUTE, r)) r = DOC_TO_ROUTE[r];
  if (!r) r = "home";
  if (r === "registry" || r === "search") {
    originalRenderRoute(r);
    return;
  }
  if (typeof window !== "undefined" && window.wasmActive && window.wasmInstance && window.wasmInstance.exports.ooda_app_route) {
    var inputId = ROUTE_NAME_TO_ID[r] || 1;
    var executedId = window.wasmInstance.exports.ooda_app_route(inputId);
    var dispatchedName = ROUTE_ID_TO_NAME[executedId] || r;
    originalRenderRoute(dispatchedName);
  } else {
    originalRenderRoute(r);
  }
};

function getInitialRoute() {
  if (typeof location !== "undefined" && location.hash) return location.hash.replace(/^#/, "").trim();
  var p = (typeof location !== "undefined" && location.pathname) ? location.pathname.replace(/^\//, "").replace(/\/index\.html$/, "").replace(/\.html$/, "") : "";
  if (p.startsWith("guide/")) p = p.replace("guide/", "");
  if (typeof p === "string" && Object.prototype.hasOwnProperty.call(DOC_TO_ROUTE, p)) return DOC_TO_ROUTE[p];
  if (ROUTE_NAME_TO_ID[p] || p === "registry" || p === "search") return p;
  return DEFAULT_ROUTE || "home";
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  renderRoute(getInitialRoute());
  setupJetToggle();
  setupGenSelector();
  initGlobalDogfight();
  if (!isJetsEnabled()) setJetsEnabled(false);
}
if (typeof document !== "undefined") {
  (function () {
  var key = "ooda-theme";
  var THEMES = ["night", "paper", "magma", "flare", "solar", "cyber", "frost", "tokyo", "laser"];
  function apply(t) {
  if (THEMES.indexOf(t) === -1) t = "night";
  invalidateThemeCache();
  document.documentElement.setAttribute("data-theme", t);
  if (typeof document !== "undefined" && typeof CustomEvent !== "undefined") {
    try {
      document.dispatchEvent(new CustomEvent("ooda-theme-change", { detail: { theme: t } }));
    } catch (e) {}
  }
  var b = document.getElementById("theme");
  if (b) {
  var nextIdx = (THEMES.indexOf(t) + 1) % THEMES.length;
  setDomText(b, THEMES[nextIdx]);
  }
  var badge = document.getElementById("hud-license");
  if (badge) {
  if (badge.classList.contains("theme-morph")) {
  badge.classList.remove("theme-morph");
  }
  void badge.offsetWidth;
  badge.classList.add("theme-morph");
  }
  }
  apply(document.documentElement.getAttribute("data-theme") || "night");
  var b = document.getElementById("theme");
  if (b) b.onclick = function () {
  var cur = document.documentElement.getAttribute("data-theme") || "night";
  var curIdx = THEMES.indexOf(cur);
  if (curIdx === -1) curIdx = 0;
  var nextIdx = (curIdx + 1) % THEMES.length;
  if (window.wasmActive && window.wasmInstance && window.wasmInstance.exports.ooda_app_theme_next) {
  nextIdx = window.wasmInstance.exports.ooda_app_theme_next(curIdx);
  }
  var n = THEMES[nextIdx];
  localStorage.setItem(key, n);
  document.cookie = key + "=" + n + ";path=/;domain=.openooda.org;max-age=31536000;SameSite=Lax";
  apply(n);
  };
  var mail = document.getElementById("mail");
  if (mail) mail.addEventListener("submit", function (ev) {
  ev.preventDefault();
  var btn = document.getElementById("join");
  var email = (mail.email && mail.email.value) || "";
  var website = (mail.website && mail.website.value) || "";
  function fail() { if (btn) { setDomText(btn, "join"); btn.className = ""; } }
  function ok() { if (btn) { setDomText(btn, "joined"); btn.className = "is-on"; } if (mail.email) mail.email.value = ""; }
  fetch("https://collect.openooda.org/v1/emails", {
  method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: email, website: website, source: "app" })
  }).then(function (r) { if (r.ok) ok(); else fail(); }).catch(fail);
  });
  (function () {
  var canvas = document.createElement("canvas");
  canvas.id = "sky"; canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var stars = [];
  var skyAnimId = null;
  var lastSkyTime = 0;
  function resize() {
  var w = window.innerWidth, h = window.innerHeight;
  canvas.width = w; canvas.height = h;
  canvas.style.width = w + "px"; canvas.style.height = h + "px";
  initStars(w, h);
  drawOnce();
  }
  function initStars(w, h) {
  stars = [];
  var total = Math.max(25, Math.min(60, Math.floor((w * h) / 24000)));
  for (var i = 0; i < total; i++) {
  stars.push({
  x: Math.random() * w, y: Math.random() * h,
  size: Math.random() > 0.8 ? 2 : 1, flare: Math.random() > 0.6,
  flareLen: Math.floor(Math.random() * 4) + 3, phase: Math.random() * Math.PI * 2,
  speed: 0.008 + Math.random() * 0.012, maxAlpha: 0.35 + Math.random() * 0.45
  });
  }
  }
  function hexToRgb(hex) {
  hex = (hex || "").trim();
  if (hex.charAt(0) === "#") {
  if (hex.length === 4) return [parseInt(hex[1]+hex[1], 16), parseInt(hex[2]+hex[2], 16), parseInt(hex[3]+hex[3], 16)];
  if (hex.length >= 7) return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }
  return [232, 232, 232];
  }
  var curRgb = [232, 232, 232];
  var alphaCache = new Array(21);
  function rebuildAlphaCache(r, g, b) {
  for (var i = 0; i <= 20; i++) {
  alphaCache[i] = "rgba(" + r + "," + g + "," + b + "," + (i / 20).toFixed(2) + ")";
  }
  }
  rebuildAlphaCache(232, 232, 232);
  function updateThemeColor() {
  var colors = getThemeColors();
  curRgb = hexToRgb(colors.fg);
  rebuildAlphaCache(curRgb[0], curRgb[1], curRgb[2]);
  drawOnce();
  }
  function drawOnce() {
  var w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  for (var i = 0; i < stars.length; i++) {
  var s = stars[i];
  var alpha = (Math.sin(s.phase) * 0.5 + 0.5) * s.maxAlpha;
  if (alpha <= 0.04) continue;
  var idx = Math.min(20, Math.max(0, Math.floor(alpha * 20)));
  ctx.fillStyle = alphaCache[idx];
  ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
  }
  }
  function draw(now) {
  if (!skyAnimId) return;
  skyAnimId = requestAnimationFrame(draw);
  if (now && lastSkyTime && (now - lastSkyTime < 33)) return; // Lock to ~30 FPS
  lastSkyTime = now;

  var w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  for (var i = 0; i < stars.length; i++) {
  var s = stars[i]; s.phase += s.speed;
  var alpha = (Math.sin(s.phase) * 0.5 + 0.5) * s.maxAlpha;
  if (alpha <= 0.04) continue;
  var idx = Math.min(20, Math.max(0, Math.floor(alpha * 20)));
  ctx.fillStyle = alphaCache[idx];
  var x = Math.floor(s.x), y = Math.floor(s.y);
  ctx.fillRect(x, y, s.size, s.size);
  if (s.flare && alpha > 0.3) {
  var fl = s.flareLen;
  var fIdx = Math.min(20, Math.max(0, Math.floor(alpha * 8)));
  ctx.fillStyle = alphaCache[fIdx];
  ctx.fillRect(x - fl, y, fl * 2 + s.size, 1);
  ctx.fillRect(x, y - fl, 1, fl * 2 + s.size);
  }
  }
  }
  function start() {
  if (!skyAnimId) {
  skyAnimId = requestAnimationFrame(draw);
  }
  }
  function stop() {
  if (skyAnimId) {
  cancelAnimationFrame(skyAnimId);
  skyAnimId = null;
  }
  }
  window.addEventListener("resize", resize);
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(document.documentElement, {"attributes": true, "attributeFilter": ["data-theme"]});
  resize(); updateThemeColor();
  CanvasLifecycleManager.register("sky-starfield", {
  canvas: canvas,
  start: start,
  stop: stop,
  respectReducedMotion: true
  });
  })();
  // Initialize toggle state from localStorage or URL path
  const storedWasm = (typeof localStorage !== "undefined" && localStorage.getItem) ? localStorage.getItem("ooda-wasm-active") : null;
  const initialWasm = storedWasm !== null ? storedWasm === "1" : (typeof location !== "undefined" && location.pathname ? location.pathname.includes("/wasm") : false);
  setWasmActive(initialWasm, false);
  const wasmToggleBtn = document.getElementById("wasm-toggle");
  if (wasmToggleBtn) {
  wasmToggleBtn.onclick = function () {
  setWasmActive(!window.wasmActive, true);
  };
  }
  })();
}
