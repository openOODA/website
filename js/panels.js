// panels.js — 8-Bit Panel Reveal, Section Navigation, Rainbow Palette & Card Spotlight
const port = document.querySelector(".scroll-port");
const panels = Array.from(document.querySelectorAll(".panel"));
const navUp = document.getElementById("nav-up");
const navDown = document.getElementById("nav-down");

const ACCENTS = [
  { name: "Coral", hex: "#ff5555", rgb: [255, 85, 85], hot: "#ff9999", hotRgb: [255, 153, 153] },
  { name: "Orange", hex: "#ff7700", rgb: [255, 119, 0], hot: "#ffa040", hotRgb: [255, 160, 64] },
  { name: "Amber", hex: "#ffb000", rgb: [255, 176, 0], hot: "#ffd447", hotRgb: [255, 212, 71] },
  { name: "Yellow", hex: "#f1fa8c", rgb: [241, 250, 140], hot: "#ffffb0", hotRgb: [255, 255, 176] },
  { name: "Emerald", hex: "#50fa7b", rgb: [80, 250, 123], hot: "#a2ffbc", hotRgb: [162, 255, 188] },
  { name: "Cyan", hex: "#00e5ff", rgb: [0, 229, 255], hot: "#80f4ff", hotRgb: [128, 244, 255] },
  { name: "Blue", hex: "#3b82f6", rgb: [59, 130, 246], hot: "#7cb3ff", hotRgb: [124, 179, 255] },
  { name: "Violet", hex: "#bd93f9", rgb: [189, 147, 249], hot: "#d9b8ff", hotRgb: [217, 184, 255] },
];

function applyAccent(a) {
  if (!a) return;
  const [r, g, b] = a.rgb;
  const [hr, hg, hb] = a.hotRgb;
  window.oodaCurrentAccent = a.rgb;
  window.oodaCurrentAccentName = a.name;
  try { localStorage.setItem("openooda_accent", a.name.toLowerCase()); } catch (e) {}

  const root = document.documentElement;
  root.style.setProperty("--phosphor", a.hex);
  root.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
  root.style.setProperty("--phosphor-dim", `rgba(${r}, ${g}, ${b}, 0.14)`);
  root.style.setProperty("--phosphor-glow", `rgba(${r}, ${g}, ${b}, 0.30)`);
  root.style.setProperty("--border-accent-color", `rgba(${r}, ${g}, ${b}, 0.42)`);
  root.style.setProperty("--hot", a.hot);
  root.style.setProperty("--hot-rgb", `${hr}, ${hg}, ${hb}`);
  root.style.setProperty("--spotlight-inner", `rgba(${r}, ${g}, ${b}, 0.055)`);

  const swatchLabel = document.getElementById("dock-swatch-name");
  if (swatchLabel) swatchLabel.textContent = a.name.toUpperCase();
  if (window.oodaDrawHeaderWordmark) window.oodaDrawHeaderWordmark();

  document.querySelectorAll("[data-accent-name]").forEach((btn) => {
    const active = btn.dataset.accentName.toLowerCase() === a.name.toLowerCase();
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-checked", active ? "true" : "false");
    btn.setAttribute("tabindex", active ? "0" : "-1");
  });
}

function cycleRandomAccent() {
  const cur = (window.oodaCurrentAccentName || "Emerald").toLowerCase();
  const pool = ACCENTS.filter((x) => x.name.toLowerCase() !== cur);
  const picked = pool[Math.floor(Math.random() * pool.length)];
  if (picked) applyAccent(picked);
}
window.oodaCycleRandomAccent = cycleRandomAccent;

// Fade panels in as they enter the scroll port & cycle 8-bit phosphor accent
let lastSectionId = null;
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("vis");
        if (lastSectionId && lastSectionId !== e.target.id) {
          cycleRandomAccent();
        }
        lastSectionId = e.target.id;
      }
    });
  },
  { root: port, threshold: 0.15 }
);
panels.forEach((p) => observer.observe(p));

function updateArrows() {
  if (!port || !navUp || !navDown) return;
  const atTop = port.scrollTop <= 4;
  const atBottom = port.scrollTop + port.clientHeight >= port.scrollHeight - 4;
  navUp.classList.toggle("off", atTop);
  navDown.classList.toggle("off", atBottom);
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

// Mount 8-Bit Rainbow Swatches, Arcade Triggers [1]-[3], and Card Spotlight
(function init8BitControls() {
  let saved = null;
  try {
    const k = localStorage.getItem("openooda_accent");
    if (k) saved = ACCENTS.find((x) => x.name.toLowerCase() === k.toLowerCase());
  } catch (e) {}
  applyAccent(saved || ACCENTS[4]);

  document.addEventListener("click", (e) => {
    const sw = e.target.closest("[data-accent-name]");
    if (sw) {
      const f = ACCENTS.find((a) => a.name.toLowerCase() === sw.dataset.accentName.toLowerCase());
      if (f) applyAccent(f);
      return;
    }
    const pulseBtn = e.target.closest("#act-pulse");
    if (pulseBtn && window.oodaTriggerPulse) window.oodaTriggerPulse("pulse");
    const themeBtn = e.target.closest("#act-theme");
    if (themeBtn) cycleRandomAccent();
    const stormBtn = e.target.closest("#act-storm");
    if (stormBtn && window.oodaTriggerPulse) window.oodaTriggerPulse("storm");
  });

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
    if (e.key === "1" && window.oodaTriggerPulse) window.oodaTriggerPulse("pulse");
    else if (e.key === "2") cycleRandomAccent();
    else if (e.key === "3" && window.oodaTriggerPulse) window.oodaTriggerPulse("storm");
    else if (e.key === "ArrowDown") { e.preventDefault(); goToPanel(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); goToPanel(-1); }
  });

  let activeCard = null;
  document.addEventListener("pointermove", (e) => {
    const card = e.target && e.target.closest
      ? e.target.closest(".bring-row, .demo-pane, .cat-card, .terminal-install-box, .repo-list")
      : null;
    if (activeCard && activeCard !== card) activeCard.classList.remove("spotlight-active");
    activeCard = card;
    if (card) {
      const r = card.getBoundingClientRect();
      card.classList.add("spotlight-active");
      card.style.setProperty("--mouse-x", Math.round(e.clientX - r.left) + "px");
      card.style.setProperty("--mouse-y", Math.round(e.clientY - r.top) + "px");
    }
  }, { passive: true });
})();
