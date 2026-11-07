// bench.js — Artificial Analysis style Scatter Quadrants, Bar Charts & Interactive Table
const OOBENCH_PROFILES = [
  { rank: 1, name: "devin/swe-2-flash-max", short: "SWE-2 Flash Max", tier: "promo", panes: 10.0, plan: "Devin Pro ($20/mo — Free Unlimited SWE-2 Promo)", url: "https://devin.ai/pricing", pricePane: "$0 / pane ($2 base)", priceNum: 2, q: 97, eff: 120, speed: 145, time: 120, costIdx: 10, ovs: 564540 },
  { rank: 2, name: "devin/swe-2-max", short: "SWE-2 Max", tier: "promo", panes: 10.0, plan: "Devin Pro ($20/mo — Free Unlimited SWE-2 Promo)", url: "https://devin.ai/pricing", pricePane: "$0 / pane ($2 base)", priceNum: 2, q: 98, eff: 118, speed: 92, time: 180, costIdx: 10, ovs: 377750 },
  { rank: 3, name: "mcode/MiniMax-M3.1-Flash", short: "MiniMax M3.1 Flash", tier: "cloud", panes: 3.5, plan: "MiniMax M-Plan Annual ($550/yr = $45.83/mo, 5h Rolling)", url: "https://www.minimax.io/platform/coding-plan", pricePane: "~$13 / pane (Annual)", priceNum: 13, q: 95, eff: 130, speed: 128, time: 140, costIdx: 13, ovs: 135373 },
  { rank: 4, name: "devin/glm-5-3-flash-high", short: "GLM-5.3 Flash High", tier: "cloud", panes: 2.0, plan: "Devin 24h Daily Pool ($0.15/$0.50 per 1M)", url: "https://docs.devin.ai/", pricePane: "~$10 / pane (Inc. Pro)", priceNum: 10, q: 94, eff: 115, speed: 135, time: 130, costIdx: 15, ovs: 62530 },
  { rank: 5, name: "muse/spark-1.3-contributor", short: "Muse Spark 1.3", tier: "cloud", panes: 2.0, plan: "Meta Muse Contributor ($50/mo or $1.25/$4.25 1M)", url: "https://ai.meta.com/", pricePane: "~$25 / pane ($50/mo)", priceNum: 25, q: 97, eff: 128, speed: 112, time: 145, costIdx: 25, ovs: 39868 },
  { rank: 6, name: "vibe/glm-5-3", short: "Mistral Vibe GLM-5.3", tier: "cloud", panes: 1.0, plan: "Mistral Le Chat Pro Annual (~$12/mo, 30-Day Cap)", url: "https://mistral.ai/products/le-chat", pricePane: "~$12 / pane (Annual)", priceNum: 12, q: 95, eff: 115, speed: 95, time: 165, costIdx: 12, ovs: 31450 },
  { rank: 7, name: "grok/grok-4.7-build-fast", short: "Grok 4.7 Build Fast", tier: "cloud", panes: 1.0, plan: "xAI SuperGrok Annual ($300/yr = $25/mo, 7-Day Cap)", url: "https://x.ai/grok", pricePane: "$25 / pane (Annual)", priceNum: 25, q: 96, eff: 128, speed: 115, time: 150, costIdx: 25, ovs: 18874 },
  { rank: 8, name: "oocode/2x4060ti (qwen3-coder-30b-a3b)", short: "Qwen3-Coder-30B-A3B", tier: "local", panes: 2.0, plan: "Owned HW: 2x Nodes (2x RTX 4060 Ti 16GB = 32GB/node) via oollama", url: "https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct", pricePane: "$0 sub (~$15/pane pwr)", priceNum: 15, q: 74, eff: 90, speed: 78, time: 210, costIdx: 12, ovs: 23468 },
  { rank: 9, name: "oocode/2x4060ti (qwen36-35b-mtp)", short: "Qwen3.6-35B-MTP", tier: "local", panes: 2.0, plan: "Owned HW: 2x Nodes (2x RTX 4060 Ti 16GB = 32GB/node) via oollama", url: "https://status.openooda.org", pricePane: "$0 sub (~$15/pane pwr)", priceNum: 15, q: 68, eff: 82, speed: 42, time: 360, costIdx: 12, ovs: 10532 },
  { rank: 10, name: "oocode/2x4060ti (deepseek-r1-32b)", short: "DeepSeek-R1-32B", tier: "local", panes: 2.0, plan: "Owned HW: 2x Nodes (2x RTX 4060 Ti 16GB = 32GB/node) via oollama", url: "https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B", pricePane: "$0 sub (~$15/pane pwr)", priceNum: 15, q: 72, eff: 85, speed: 38, time: 420, costIdx: 12, ovs: 10490 },
  { rank: 11, name: "oocode/1x3060 (qwen2.5-coder-14b)", short: "Qwen2.5-Coder-14B", tier: "local", panes: 1.0, plan: "Owned HW: 1x Node (1x RTX 3060 12GB VRAM) via oollama", url: "https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct", pricePane: "$0 sub (~$8/pane pwr)", priceNum: 8, q: 62, eff: 78, speed: 58, time: 310, costIdx: 8, ovs: 7254 },
  { rank: 12, name: "oocode/1x3060 (qwen2.5-coder-7b)", short: "Qwen2.5-Coder-7B", tier: "local", panes: 1.0, plan: "Owned HW: 1x Node (1x RTX 3060 12GB VRAM) via oollama", url: "https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct", pricePane: "$0 sub (~$8/pane pwr)", priceNum: 8, q: 54, eff: 72, speed: 95, time: 240, costIdx: 8, ovs: 6561 }
];

function tierColor(tier) {
  if (tier === "promo") return "#50fa7b";
  if (tier === "cloud") return "#00e5ff";
  return "#ffb000";
}

function renderScatter(svgId, xKey, yKey, xMin, xMax, yMin, yMax, xLabel, yLabel) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const W = 520, H = 290, padL = 48, padR = 24, padT = 22, padB = 38;
  const pw = W - padL - padR, ph = H - padT - padB;
  let out = `<rect x="${padL}" y="${padT}" width="${pw}" height="${ph}" fill="rgba(4,7,12,0.82)" stroke="#1e2636" stroke-width="1"/>`;
  out += `<rect x="${padL + pw * 0.5}" y="${padT}" width="${pw * 0.5}" height="${ph * 0.5}" fill="rgba(80,250,123,0.045)" stroke="rgba(80,250,123,0.18)" stroke-dasharray="3,3"/>`;
  out += `<text x="${padL + pw - 6}" y="${padT + 14}" fill="#50fa7b" font-size="9" text-anchor="end" font-weight="700">OPTIMAL FRONTIER &#8599;</text>`;
  for (let i = 0; i <= 4; i++) {
    const gx = padL + (pw * i) / 4;
    const gy = padT + (ph * i) / 4;
    const xv = Math.round(xMin + ((xMax - xMin) * i) / 4);
    const yv = Math.round(yMax - ((yMax - yMin) * i) / 4);
    out += `<line x1="${gx}" y1="${padT}" x2="${gx}" y2="${padT + ph}" stroke="#141c28" stroke-width="1"/>`;
    out += `<line x1="${padL}" y1="${gy}" x2="${padL + pw}" y2="${gy}" stroke="#141c28" stroke-width="1"/>`;
    out += `<text x="${gx}" y="${H - 18}" fill="#64748b" font-size="9" text-anchor="middle">${xv}</text>`;
    out += `<text x="${padL - 6}" y="${gy + 3}" fill="#64748b" font-size="9" text-anchor="end">${yv}</text>`;
  }
  out += `<text x="${padL + pw / 2}" y="${H - 3}" fill="#94a3b8" font-size="10" text-anchor="middle" font-weight="700">${xLabel}</text>`;
  out += `<text x="13" y="${padT + ph / 2}" fill="#94a3b8" font-size="10" text-anchor="middle" font-weight="700" transform="rotate(-90 13 ${padT + ph / 2})">${yLabel}</text>`;

  OOBENCH_PROFILES.forEach((p) => {
    const xVal = p[xKey];
    const yVal = p[yKey];
    const cx = padL + Math.max(0, Math.min(1, (xVal - xMin) / (xMax - xMin))) * pw;
    const cy = padT + ph - Math.max(0, Math.min(1, (yVal - yMin) / (yMax - yMin))) * ph;
    const col = tierColor(p.tier);
    const r = Math.max(4.5, Math.min(9.5, 4 + p.panes * 0.55));
    const tx = cx > padL + pw * 0.72 ? cx - r - 4 : cx + r + 4;
    const anchor = cx > padL + pw * 0.72 ? "end" : "start";
    out += `<g><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" fill-opacity="0.85" stroke="#000" stroke-width="1.5"><title>${p.name} | Q=${p.q} | ${p.speed} tok/s | OVS=${p.ovs.toLocaleString()}</title></circle>`;
    out += `<text x="${tx.toFixed(1)}" y="${(cy + 3).toFixed(1)}" fill="#e2e8f0" font-size="8.8" text-anchor="${anchor}">${p.short}</text></g>`;
  });
  svg.innerHTML = out;
}

function renderBars(containerId, key, maxVal, unit) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const sorted = [...OOBENCH_PROFILES].sort((a, b) => b[key] - a[key]);
  el.innerHTML = sorted.map((p) => {
    const pct = Math.max(3, Math.min(100, (p[key] / maxVal) * 100));
    const cls = p.tier === "promo" ? "" : p.tier === "cloud" ? "aa-bar-fill-cyan" : "aa-bar-fill-amber";
    return `<div class="aa-bar-row">
      <span class="aa-bar-label" title="${p.name}">#${p.rank} ${p.short}</span>
      <div class="aa-bar-track"><div class="aa-bar-fill ${cls}" style="width:${pct.toFixed(1)}%"></div></div>
      <span class="aa-bar-val">${p[key].toLocaleString()}${unit}</span>
    </div>`;
  }).join("");
}

let currentFilter = "all";
let currentSortKey = "ovs";
let currentSortDesc = true;

function renderTable() {
  const tbody = document.getElementById("ovs-tbody");
  if (!tbody) return;
  const rows = OOBENCH_PROFILES
    .filter((p) => currentFilter === "all" || p.tier === currentFilter)
    .sort((a, b) => currentSortDesc ? b[currentSortKey] - a[currentSortKey] : a[currentSortKey] - b[currentSortKey]);
  const maxOvs = 564540;
  tbody.innerHTML = rows.map((p) => {
    const col = tierColor(p.tier);
    const badgeCls = p.tier === "promo" ? "ovs-badge" : p.tier === "cloud" ? "ovs-badge ovs-badge-cyan" : "ovs-badge ovs-badge-amber";
    const pct = Math.max(5, Math.round((p.ovs / maxOvs) * 100));
    return `<tr>
      <td><strong>#${p.rank}</strong></td>
      <td><code>${p.name}</code></td>
      <td><span class="${badgeCls}">${p.panes.toFixed(1)}x Panes</span></td>
      <td><a href="${p.url}" target="_blank" rel="noopener noreferrer" style="color:${col}; text-decoration:underline;">${p.plan}</a></td>
      <td><strong>${p.pricePane}</strong></td>
      <td><strong style="color:${col};">${p.q} / 100</strong></td>
      <td>${p.eff}%</td>
      <td>${p.speed} tok/s (${p.time}s)</td>
      <td>${p.costIdx}</td>
      <td><div class="ovs-bar-wrap"><div class="ovs-bar-fill" style="width:${pct}%; background:${col};"></div></div><strong style="color:${col};">${p.ovs.toLocaleString()}</strong></td>
    </tr>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  renderScatter("svg-q-speed", "speed", "q", 30, 160, 50, 100, "Output Speed (tokens / sec) →", "Gate Quality (Q / 100) →");
  renderScatter("svg-q-cost", "costIdx", "q", 5, 28, 50, 100, "24/7 Cost Index (lower = cheaper) →", "Gate Quality (Q / 100) →");
  renderBars("bars-ovs", "ovs", 564540, "");
  renderBars("bars-speed", "speed", 150, " t/s");
  renderTable();

  document.querySelectorAll("[data-tier-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-tier-filter]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.tierFilter;
      renderTable();
    });
  });

  document.querySelectorAll("[data-sort-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const k = th.dataset.sortKey;
      if (currentSortKey === k) currentSortDesc = !currentSortDesc;
      else { currentSortKey = k; currentSortDesc = true; }
      renderTable();
    });
  });
});
