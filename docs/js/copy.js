// copy.js — Thin DOM clipboard bridge backed by docs/js/site_ui.wasm
window.__oodaEnsureWasm = window.__oodaEnsureWasm || function () {
  if (window.__oodaWasmReady) return window.__oodaWasmReady;
  const s = document.currentScript && document.currentScript.src;
  const m = s ? s.match(/\?v=([0-9a-f]+)/) : null;
  const url = m ? "/js/site_ui.wasm?v=" + m[1] : "/js/site_ui.wasm";
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

function copySnippet(elementId, btn) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = (el.innerText || el.textContent || "").trim();
  const showFeedback = () => {
    window.__oodaEnsureWasm().then(({ ex, readStr }) => {
      const original = btn.innerText;
      const label = readStr(ex.oo_ui_copy_label());
      const color = readStr(ex.oo_ui_copy_color());
      const ms = Number(ex.oo_ui_copy_timeout_ms());
      btn.innerText = label;
      btn.style.borderColor = color;
      btn.style.color = color;
      setTimeout(() => {
        btn.innerText = original;
        btn.style.borderColor = "";
        btn.style.color = "";
      }, ms);
    });
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showFeedback).catch(() => fallbackCopy(text, showFeedback));
  } else {
    fallbackCopy(text, showFeedback);
  }
}

function fallbackCopy(text, onDone) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(ta);
  onDone();
}
