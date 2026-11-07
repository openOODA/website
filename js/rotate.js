// rotate.js — Hero Typewriter, Canvas Backdrop & Wordmark Engine
const HEADLINES = [
  "Fail-Closed by Design",
  "Zero Ambient Authority",
  "Every Effect Needs a Capability",
  "Systems + Crypto + AI Unified",
  "Conservation of Authority",
  "Born With No Privileges",
  "Unified L0-L7 Architecture",
  "Verifiable Proof Over Trust",
];

const WORDMARK_ROWS = [
  "00000000000000000000000000000000000000000000001111100000011111000011111110000001111100",
  "00000000000000000000000000000000000000000000011111110000111111100011111111000011111110",
  "00000000000000000000000000000000000000000000111000111001110001110011100011100111000111",
  "00111110000111011100000011111000011101110000111000111001110001110011100011100111000111",
  "01111111000111111110000111111100011111111000111000111001110001110011100011100111000111",
  "11100011100111000111001110001110011100011100111000111001110001110011100011100111111111",
  "11100011100111000111001111111110011100011100111000111001110001110011100011100111111111",
  "11100011100111000111001111111110011100011100111000111001110001110011100011100111000111",
  "11100011100111000111001110000000011100011100111000111001110001110011100011100111000111",
  "11100011100111111110001110001110011100011100111000111001110001110011100011100111000111",
  "01111111000111011100000111111100011100011100011111110000111111100011111111000111000111",
  "00111110000111000000000011111000011100011100001111100000011111000011111110000111000111",
  "00000000000111000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000111000000000000000000000000000000000000000000000000000000000000000000000000",
];
const WM_W = 86, WM_H = 14;
const BAYER = [
  0,32,8,40,2,34,10,42, 48,16,56,24,50,18,58,26,
  12,44,4,36,14,46,6,38, 60,28,52,20,62,30,54,22,
  3,35,11,43,1,33,9,41, 51,19,59,27,49,17,57,25,
  15,47,7,39,13,45,5,37, 63,31,55,23,61,29,53,21
];

let currentHeadlineIdx = 0;
const titleEl = document.getElementById("hero-title");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function rotateHeadline() {
  if (!titleEl) return;
  let nextIdx;
  do { nextIdx = Math.floor(Math.random() * HEADLINES.length); }
  while (nextIdx === currentHeadlineIdx && HEADLINES.length > 1);
  currentHeadlineIdx = nextIdx;
  const targetText = HEADLINES[nextIdx];
  if (reducedMotion) {
    titleEl.textContent = targetText;
    setTimeout(rotateHeadline, 5000);
    return;
  }
  let currentText = titleEl.textContent;
  const bs = setInterval(() => {
    if (currentText.length > 0) {
      currentText = currentText.slice(0, -1);
      titleEl.textContent = currentText;
    } else {
      clearInterval(bs);
      let i = 0;
      const ty = setInterval(() => {
        if (i < targetText.length) {
          currentText += targetText[i++];
          titleEl.textContent = currentText;
        } else {
          clearInterval(ty);
          setTimeout(rotateHeadline, 5000);
        }
      }, 35);
    }
  }, 20);
}
setTimeout(rotateHeadline, 5000);

(function initStage() {
  const hdrCanvas = document.getElementById("header-wordmark");
  function drawHeaderWordmark() {
    if (!hdrCanvas) return;
    const hctx = hdrCanvas.getContext("2d");
    if (!hctx) return;
    const s = 3;
    hdrCanvas.width = WM_W * s;
    hdrCanvas.height = WM_H * s;
    hctx.clearRect(0, 0, hdrCanvas.width, hdrCanvas.height);
    const acc = window.oodaCurrentAccent || [80, 250, 123];
    const hot = `rgb(${Math.min(255, acc[0] + 60)},${Math.min(255, acc[1] + 60)},${Math.min(255, acc[2] + 60)})`;
    const mid = `rgb(${acc[0]},${acc[1]},${acc[2]})`;
    for (let r = 0; r < WM_H; r++) {
      for (let c = 0; c < WM_W; c++) {
        if (WORDMARK_ROWS[r][c] === "1") {
          hctx.fillStyle = c >= 39 ? hot : mid;
          hctx.fillRect(c * s, r * s, s - 1, s - 1);
        }
      }
    }
  }
  window.oodaDrawHeaderWordmark = drawHeaderWordmark;
  drawHeaderWordmark();

  const canvas = document.getElementById("review-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: false });
  const port = document.querySelector(".scroll-port");
  let width = 0, height = 0, cellPx = 8, cols = 0, rows = 0, originX = 0;
  let mouse = { x: -2000, y: -2000, active: false }, ripples = [], smoothAcc = [80, 250, 123];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cellPx = Math.max(4, Math.floor(Math.min(width * 0.88, 920) / WM_W));
    originX = Math.round((width - WM_W * cellPx) / 2);
    cols = Math.ceil(width / cellPx) + 1;
    rows = Math.ceil(height / cellPx) + 1;
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });
  window.addEventListener("pointerdown", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    ripples.push({ x: e.clientX, y: e.clientY, born: performance.now(), maxR: 340, dur: 900 });
    if (ripples.length > 6) ripples.shift();
  }, { passive: true });

  window.oodaTriggerPulse = function (mode) {
    const cx = width * 0.5, cy = height * 0.46, now = performance.now();
    for (let i = 0; i < (mode === "storm" ? 4 : 2); i++) {
      ripples.push({
        x: cx + (Math.random() - 0.5) * (mode === "storm" ? width * 0.55 : 120),
        y: cy + (Math.random() - 0.5) * (mode === "storm" ? height * 0.45 : 80),
        born: now + i * 70,
        maxR: mode === "storm" ? 520 : 380,
        dur: 1050,
      });
    }
  };

  function frame(t) {
    const scrollY = port ? port.scrollTop : 0;
    const sub = Math.min(1, Math.max(0, scrollY / (height * 0.65)));
    const acc = window.oodaCurrentAccent || [80, 250, 123];
    smoothAcc[0] += (acc[0] - smoothAcc[0]) * 0.12;
    smoothAcc[1] += (acc[1] - smoothAcc[1]) * 0.12;
    smoothAcc[2] += (acc[2] - smoothAcc[2]) * 0.12;
    const ar = Math.round(smoothAcc[0]), ag = Math.round(smoothAcc[1]), ab = Math.round(smoothAcc[2]);
    const hr = Math.min(255, ar + 65), hg = Math.min(255, ag + 65), hb = Math.min(255, ab + 65);
    ctx.fillStyle = "#06080b";
    ctx.fillRect(0, 0, width, height);

    const sec = t * 0.001;
    const wx = width * (0.5 + 0.34 * Math.sin(sec * 0.75));
    const wy = height * (0.45 + 0.22 * Math.cos(sec * 1.1));
    ripples = ripples.filter((rp) => t - rp.born < rp.dur);
    const originY = Math.round(height * 0.44 - (WM_H * cellPx) * 0.5 - scrollY * 0.45);
    const showWm = sub < 0.85;

    for (let r = 0; r < rows; r++) {
      const py = r * cellPx, wmR = Math.floor((py - originY) / cellPx);
      const inWmRow = showWm && wmR >= 0 && wmR < WM_H;
      for (let c = 0; c < cols; c++) {
        const px = c * cellPx, wmC = Math.floor((px - originX) / cellPx);
        const isWord = inWmRow && wmC >= 0 && wmC < WM_W && WORDMARK_ROWS[wmR][wmC] === "1";
        const dxm = px - mouse.x, dym = py - mouse.y;
        const sm = mouse.active ? Math.max(0, 1 - Math.sqrt(dxm * dxm + dym * dym) / 230) : 0;
        const dxw = px - wx, dyw = py - wy;
        const sw = Math.max(0, 1 - Math.sqrt(dxw * dxw + dyw * dyw) / 210) * (1 - sub * 0.65);
        let rip = 0;
        for (let i = 0; i < ripples.length; i++) {
          const rp = ripples[i], age = Math.max(0, t - rp.born) / rp.dur;
          const rad = rp.maxR * (1 - Math.pow(1 - age, 3));
          const dist = Math.abs(Math.hypot(px - rp.x, py - rp.y) - rad);
          if (dist < 26) rip = Math.max(rip, (1 - dist / 26) * (1 - age));
        }
        const spot = Math.max(sm, sw * 0.7);
        if (isWord) {
          const lit = (0.55 + spot * 1.35 + rip * 1.5) * (1 - sub * 0.9);
          ctx.fillStyle = lit > 1.25 ? "#ffffff" : lit > 0.82 ? `rgb(${hr},${hg},${hb})` : `rgb(${ar},${ag},${ab})`;
          ctx.fillRect(px, py, cellPx - 1, cellPx - 1);
          continue;
        }
        const wave = 0.5 + 0.5 * Math.sin(c * 0.14 + sec * 1.4) * Math.cos(r * 0.14 - sec * 1.1);
        const val = wave * (0.28 - 0.15 * sub) + spot * (0.68 - 0.35 * sub) + rip * 0.95;
        if (val > (BAYER[(r & 7) * 8 + (c & 7)] / 64) * 0.78) {
          const a = Math.min(0.85, (0.12 + spot * 0.55 + rip * 0.7) * (1 - sub * 0.45)).toFixed(2);
          ctx.fillStyle = (spot > 0.35 || rip > 0.3) ? `rgba(${hr},${hg},${hb},${a})` : `rgba(${ar},${ag},${ab},${a})`;
          ctx.fillRect(px, py, cellPx - 1, cellPx - 1);
        }
      }
    }
    if (!reducedMotion) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
