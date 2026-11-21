// panels.js — Thin DOM navigation/theme bridge backed by docs/js/site_ui.wasm
window.__oodaEnsureWasm = window.__oodaEnsureWasm || function () {
  if (window.__oodaWasmReady) return window.__oodaWasmReady;
  const url = "/js/site_ui.wasm";
  const inst = typeof WebAssembly.instantiateStreaming === "function"
    ? WebAssembly.instantiateStreaming(fetch(url)).catch(() => fetch(url).then((r) => r.arrayBuffer()).then((b) => WebAssembly.instantiate(b)))
    : fetch(url).then((r) => r.arrayBuffer()).then((b) => WebAssembly.instantiate(b));
  window.__oodaWasmReady = inst.then(({ instance }) => {
    const ex = instance.exports;
    const base = Number(ex.oo_wasm_scratch_base());
    const paramBase = Number(ex.oo_ui_param_base());
    const dec = new TextDecoder("utf-8");
    const readStr = (n) => dec.decode(new Uint8Array(ex.memory.buffer, base, Number(n)));
    return { ex, base, paramBase, readStr };
  });
  return window.__oodaWasmReady;
};

(function () {
  const port = document.querySelector(".scroll-port");
  const panels = Array.from(document.querySelectorAll(".panel"));
  const navUp = document.getElementById("nav-up");
  const navDown = document.getElementById("nav-down");
  let currentAccentIdx = 0;

  function applyAccentByIdx(w, idx) {
    currentAccentIdx = idx & 3;
    const rec = w.readStr(w.ex.oo_ui_accent_record(BigInt(currentAccentIdx))).split("|");
    if (rec.length < 9) return;
    const [name, , hex, rgbCss, hotHex, hotRgbCss, r, g, b] = rec;
    window.oodaCurrentAccent = [Number(r), Number(g), Number(b)];
    window.oodaCurrentAccentName = name;
    try { localStorage.setItem("openooda_accent", name.toLowerCase()); } catch (e) {}

    const root = document.documentElement;
    root.style.setProperty("--phosphor", hex);
    root.style.setProperty("--accent-rgb", rgbCss);
    root.style.setProperty("--phosphor-dim", `rgba(${rgbCss}, 0.14)`);
    root.style.setProperty("--phosphor-glow", `rgba(${rgbCss}, 0.30)`);
    root.style.setProperty("--border-accent-color", `rgba(${rgbCss}, 0.42)`);
    root.style.setProperty("--hot", hotHex);
    root.style.setProperty("--hot-rgb", hotRgbCss);
    root.style.setProperty("--review-inner", `rgba(${rgbCss}, 0.055)`);

    const swatchLabel = document.getElementById("dock-swatch-name");
    if (swatchLabel) swatchLabel.textContent = name.toUpperCase();
    if (window.oodaDrawHeaderWordmark) window.oodaDrawHeaderWordmark();

    document.querySelectorAll("[data-accent-name]").forEach((btn) => {
      const active = btn.dataset.accentName.toLowerCase() === name.toLowerCase();
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
      btn.setAttribute("tabindex", active ? "0" : "-1");
    });
  }

  function accentIdxByName(w, s) {
    if (!s) return -1;
    const c0 = s.charCodeAt(0) || 0;
    const c1 = s.charCodeAt(1) || 0;
    return Number(w.ex.oo_ui_accent_by_code(BigInt(c0), BigInt(c1)));
  }

  function cycleRandomAccent() {
    window.__oodaEnsureWasm().then((w) => {
      const seed = (Math.floor(Math.random() * 0x7fffffff) ^ Date.now()) >>> 0;
      const next = Number(w.ex.oo_ui_accent_cycle(BigInt(currentAccentIdx), BigInt(seed)));
      applyAccentByIdx(w, next);
    });
  }
  window.oodaCycleRandomAccent = cycleRandomAccent;

  let lastSectionId = null;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("vis");
        if (lastSectionId && lastSectionId !== e.target.id) cycleRandomAccent();
        lastSectionId = e.target.id;
      }
    });
  }, { root: port, threshold: 0.15 });
  panels.forEach((p) => observer.observe(p));

  function updateArrows() {
    if (!port || !navUp || !navDown) return;
    navUp.classList.toggle("off", port.scrollTop <= 4);
    navDown.classList.toggle("off", port.scrollTop + port.clientHeight >= port.scrollHeight - 4);
  }

  function goToPanel(dir) {
    if (!port) return;
    const portTop = port.getBoundingClientRect().top;
    const tops = panels.map((p) => port.scrollTop + p.getBoundingClientRect().top - portTop);
    const pos = port.scrollTop;
    let target;
    if (dir > 0) {
      target = tops.find((t) => t > pos + 8);
      if (target === undefined) target = port.scrollHeight;
    } else {
      const above = tops.filter((t) => t < pos - 8);
      target = above.length ? above[above.length - 1] : 0;
    }
    cycleRandomAccent();
    port.scrollTo({ top: target, behavior: "smooth" });
  }

  if (port && navUp && navDown) {
    port.addEventListener("scroll", updateArrows, { passive: true });
    navUp.addEventListener("click", () => goToPanel(-1));
    navDown.addEventListener("click", () => goToPanel(1));
    window.addEventListener("resize", updateArrows);
    updateArrows();
  }

  window.__oodaEnsureWasm().then((w) => {
    let saved = 0;
    try {
      const k = localStorage.getItem("openooda_accent");
      const found = accentIdxByName(w, k);
      if (found >= 0) saved = found;
    } catch (e) {}
    applyAccentByIdx(w, saved);

    document.addEventListener("click", (e) => {
      const sw = e.target.closest("[data-accent-name]");
      if (sw) {
        const idx = accentIdxByName(w, sw.dataset.accentName);
        if (idx >= 0) applyAccentByIdx(w, idx);
        return;
      }
      if (e.target.closest("#act-pulse") && window.oodaTriggerPulse) window.oodaTriggerPulse("pulse");
      if (e.target.closest("#act-theme")) cycleRandomAccent();
      if (e.target.closest("#act-storm") && window.oodaTriggerPulse) window.oodaTriggerPulse("storm");
    });

    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : "";
      if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
      const kc = e.key === "1" ? 49 : e.key === "2" ? 50 : e.key === "3" ? 51
        : e.key === "ArrowUp" ? 38 : e.key === "ArrowDown" ? 40 : 0;
      const act = Number(w.ex.oo_ui_key_action(BigInt(kc)));
      if (act === 1 && window.oodaTriggerPulse) window.oodaTriggerPulse("pulse");
      else if (act === 2) cycleRandomAccent();
      else if (act === 3 && window.oodaTriggerPulse) window.oodaTriggerPulse("storm");
      else if (act === 4) { e.preventDefault(); goToPanel(-1); }
      else if (act === 5) { e.preventDefault(); goToPanel(1); }
    });
  });

  let activeCard = null;
  document.addEventListener("pointermove", (e) => {
    const card = e.target && e.target.closest
      ? e.target.closest(".bring-row, .demo-pane, .cat-card, .terminal-install-box, .repo-list")
      : null;
    if (activeCard && activeCard !== card) activeCard.classList.remove("review-active");
    activeCard = card;
    if (card) {
      const r = card.getBoundingClientRect();
      card.classList.add("review-active");
      card.style.setProperty("--mouse-x", Math.round(e.clientX - r.left) + "px");
      card.style.setProperty("--mouse-y", Math.round(e.clientY - r.top) + "px");
    }
  }, { passive: true });
})();
