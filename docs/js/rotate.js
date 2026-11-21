// rotate.js — Thin DOM/canvas host bridge backed by docs/js/site_ui.wasm
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
  const WM_W = 86, WM_H = 14;
  let currentHeadlineIdx = 0;
  const titleEl = document.getElementById("hero-title");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rotateHeadline(w) {
    if (!titleEl) return;
    const seed = (Math.floor(Math.random() * 0x7fffffff) ^ Date.now()) >>> 0;
    currentHeadlineIdx = Number(w.ex.oo_ui_headline_next(BigInt(currentHeadlineIdx), BigInt(seed)));
    const targetText = w.readStr(w.ex.oo_ui_headline_text(BigInt(currentHeadlineIdx)));
    if (reducedMotion) {
      titleEl.textContent = targetText;
      setTimeout(() => rotateHeadline(w), 5000);
      return;
    }
    let cur = titleEl.textContent;
    const bs = setInterval(() => {
      if (cur.length > 0) {
        cur = cur.slice(0, -1);
        titleEl.textContent = cur;
      } else {
        clearInterval(bs);
        let i = 0;
        const ty = setInterval(() => {
          if (i < targetText.length) {
            cur += targetText[i++];
            titleEl.textContent = cur;
          } else {
            clearInterval(ty);
            setTimeout(() => rotateHeadline(w), 5000);
          }
        }, 35);
      }
    }, 20);
  }

  const hdrCanvas = document.getElementById("header-wordmark");
  function drawHeaderWordmark() {
    if (!hdrCanvas) return;
    const hctx = hdrCanvas.getContext("2d");
    if (!hctx) return;
    window.__oodaEnsureWasm().then(({ ex, base }) => {
      const s = 3;
      hdrCanvas.width = WM_W * s;
      hdrCanvas.height = WM_H * s;
      hctx.clearRect(0, 0, hdrCanvas.width, hdrCanvas.height);
      const acc = window.oodaCurrentAccent || [80, 250, 123];
      ex.oo_ui_render_wordmark(BigInt(acc[0]), BigInt(acc[1]), BigInt(acc[2]));
      const px = new Uint8Array(ex.memory.buffer, base, WM_W * WM_H * 4);
      for (let r = 0; r < WM_H; r++) {
        for (let c = 0; c < WM_W; c++) {
          const o = (r * WM_W + c) * 4;
          if (px[o + 3] > 0) {
            hctx.fillStyle = `rgb(${px[o]},${px[o + 1]},${px[o + 2]})`;
            hctx.fillRect(c * s, r * s, s - 1, s - 1);
          }
        }
      }
    });
  }
  window.oodaDrawHeaderWordmark = drawHeaderWordmark;
  drawHeaderWordmark();

  const canvas = document.getElementById("review-canvas");
  const port = document.querySelector(".scroll-port");
  let width = 0, height = 0, cellPx = 8, cols = 0, rows = 0, originX = 0;
  let mouse = { x: -2000, y: -2000, active: false }, ripples = [], smoothAcc = [80, 250, 123];

  function resize() {
    if (!canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cellPx = Math.max(4, Math.floor(Math.min(width * 0.88, 920) / WM_W));
    while ((Math.ceil(width / cellPx) + 1) * (Math.ceil(height / cellPx) + 1) > 65024) cellPx++;
    originX = Math.round((width - WM_W * cellPx) / 2);
    cols = Math.ceil(width / cellPx) + 1;
    rows = Math.ceil(height / cellPx) + 1;
  }

  window.oodaTriggerPulse = function (mode) {
    const cx = width * 0.5, cy = height * 0.46, now = performance.now();
    for (let i = 0; i < (mode === "storm" ? 4 : 2); i++) {
      ripples.push({
        x: cx + (Math.random() - 0.5) * (mode === "storm" ? width * 0.55 : 120),
        y: cy + (Math.random() - 0.5) * (mode === "storm" ? height * 0.45 : 80),
        born: now + i * 70, maxR: mode === "storm" ? 520 : 380, dur: 1050,
      });
    }
  };

  window.__oodaEnsureWasm().then((w) => {
    setTimeout(() => rotateHeadline(w), 5000);
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });
    window.addEventListener("pointerdown", (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
      ripples.push({ x: e.clientX, y: e.clientY, born: performance.now(), maxR: 340, dur: 900 });
      if (ripples.length > 6) ripples.shift();
    }, { passive: true });

    let lastRgb = "", midLut = [], hotLut = [];
    function ensureLuts(ar, ag, ab, hr, hg, hb) {
      const k = ar + "," + ag + "," + ab;
      if (k === lastRgb) return;
      lastRgb = k;
      midLut = []; hotLut = [];
      for (let i = 0; i < 32; i++) {
        const a = ((i / 31) * 0.85).toFixed(2);
        midLut.push(`rgba(${ar},${ag},${ab},${a})`);
        hotLut.push(`rgba(${hr},${hg},${hb},${a})`);
      }
    }

    function frame(t) {
      const scrollY = port ? port.scrollTop : 0;
      const sub = Math.min(1, Math.max(0, scrollY / (height * 0.65)));
      const acc = window.oodaCurrentAccent || [80, 250, 123];
      smoothAcc[0] += (acc[0] - smoothAcc[0]) * 0.12;
      smoothAcc[1] += (acc[1] - smoothAcc[1]) * 0.12;
      smoothAcc[2] += (acc[2] - smoothAcc[2]) * 0.12;
      const ar = Math.round(smoothAcc[0]), ag = Math.round(smoothAcc[1]), ab = Math.round(smoothAcc[2]);
      const hr = Math.min(255, ar + 65), hg = Math.min(255, ag + 65), hb = Math.min(255, ab + 65);
      ensureLuts(ar, ag, ab, hr, hg, hb);

      ripples = ripples.filter((rp) => t - rp.born < rp.dur);
      const originY = Math.round(height * 0.44 - (WM_H * cellPx) * 0.5 - scrollY * 0.45);
      const pb = new Int32Array(w.ex.memory.buffer, w.base + w.paramBase, 40);
      const rCnt = Math.min(6, ripples.length);
      pb[0] = width; pb[1] = height; pb[2] = cellPx; pb[3] = originX; pb[4] = originY;
      pb[5] = cols; pb[6] = rows; pb[7] = Math.round(sub * 1000); pb[8] = Math.floor(t);
      pb[9] = Math.round(mouse.x); pb[10] = Math.round(mouse.y); pb[11] = mouse.active ? 1 : 0;
      pb[12] = rCnt;
      for (let i = 0; i < rCnt; i++) {
        const rp = ripples[i];
        pb[13 + i * 4] = Math.round(rp.x);
        pb[14 + i * 4] = Math.round(rp.y);
        pb[15 + i * 4] = Math.min(1000, Math.max(0, Math.round(((t - rp.born) / rp.dur) * 1000)));
        pb[16 + i * 4] = rp.maxR;
      }

      const total = Number(w.ex.oo_ui_render_backdrop());
      const grid = new Uint8Array(w.ex.memory.buffer, w.base, total);
      ctx.fillStyle = "#06080b";
      ctx.fillRect(0, 0, width, height);
      const midSolid = `rgb(${ar},${ag},${ab})`, hotSolid = `rgb(${hr},${hg},${hb})`;
      for (let r = 0; r < rows; r++) {
        const py = r * cellPx, ro = r * cols;
        for (let c = 0; c < cols; c++) {
          const code = grid[ro + c];
          if (code === 0) continue;
          ctx.fillStyle = code === 3 ? "#ffffff" : code === 2 ? hotSolid : code === 1 ? midSolid
            : code >= 48 ? hotLut[code - 48] : midLut[code - 16];
          ctx.fillRect(c * cellPx, py, cellPx - 1, cellPx - 1);
        }
      }
      if (!reducedMotion) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
})();
