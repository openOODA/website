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
bash tests/test_links.sh
```

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
