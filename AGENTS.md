# website: Agent Engineering Standards (v1)

This repository houses the official static documentation and web portal for openOODA (`openooda.org`).
All work in this repository strictly defers to the organization standards in [`openOODA/AGENTS.md`](https://github.com/openOODA/openOODA/blob/master/AGENTS.md).

---

## 1. Web Architecture & Invariants
- **Zero-Build Static Assets**: Pure vanilla HTML, CSS, and client-side JavaScript. No webpack, npm, or node.js build pipelines.
- **Offline & Low-Bandwidth Resilience**: Fast, lightweight, semantic HTML with zero blocking external trackers.
- **Accurate Ecosystem Map**: Reflects the current constellation of repositories and active toolchain commands.

---

## 2. Invariants & Quality Standards
- **Pure Client JS**: `.js` files are strictly confined to `js/` for UI navigation, copy buttons, and theme rotation.
- **W3C Valid**: Valid HTML5 and CSS3.

---

## 3. Local Verification Commands
```bash
# One .oo page per gate. Build and run each from the website root.
# OODA_COMPILER must point at the compiler; no path is hardcoded here.
: "${OODA_COMPILER:?set OODA_COMPILER to the oodac binary}"
for page in copy layout privacy; do
  "$OODA_COMPILER" build "tests/${page}_test.oo" -o "/tmp/${page}_test" || exit 1
  "/tmp/${page}_test" || exit 1
done
# Gates that spawn host tools (node --check, curl, sh -n) need the runtime
# jail relaxed: the default cwd-scoped Landlock+seccomp profile cannot exec
# shells or open sockets for child processes. OODA_NO_JAIL is the runtime's
# own escape hatch for integration gates; CI sets it in the workflow env.
for page in hooks links shim; do
  "$OODA_COMPILER" build "tests/${page}_test.oo" -o "/tmp/${page}_test" || exit 1
  OODA_NO_JAIL=1 "/tmp/${page}_test" || exit 1
done
# JSON-injection gate over the .oo state emitters (src/json_test.oo).
"$OODA_COMPILER" build src/json_test.oo -o /tmp/json_test || exit 1
/tmp/json_test || exit 1
"$OODA_COMPILER" build tests/test_website.oo -o /tmp/test_website || exit 1
/tmp/test_website || exit 1
# Producer/consumer contract gate: js consumers must only read keys the
# .oo emitters produce (tests/contract/contract_test.oo).
"$OODA_COMPILER" build tests/contract/contract_test.oo -o /tmp/contract_test || exit 1
/tmp/contract_test || exit 1
```
Each page prints one `PASS ...` line and exits 0. A failed assertion prints
`FAIL ...` and exits 1. The pages read the site from the repository root, so
run them from the website directory.

---

## 7. Multi-Engine Audit Protocol (Pre-Release)

Advisory tiered audit run before tagging releases, budgeted by token capacity:
1. **`mcode`** (Abundant tokens): Full codebase scan for contract mismatches, packaging specs, and CI gates.  
   `mcode exec --permission full "<prompt>"`
2. **`vibe`** (Moderate tokens): Adversarial diff inspection for subtle regressions, security bypasses, and API validity.  
   `vibe -p "<prompt>" --trust --auto-approve`
3. **`grok`** (Strict quota): High-value referee and final sanity check on critical release diffs.  
   `grok -p "<prompt>" --always-approve`

**Rule:** External audits are strictly advisory; all findings must be verified against source code. External LLMs never gate CI—the §5 Verification Ladder is the sole canonical authority.
