# website: Agent Engineering Standards (v1)

This repository houses the official static documentation and web portal for openOODA (`openooda.org`).
All work in this repository strictly defers to the organization standards in [`openOODA/AGENTS.md`](file:///home/ubermetroid/Projects/openOODA/openOODA/AGENTS.md).

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
