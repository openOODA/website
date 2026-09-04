const ROUTE_NAME_TO_ID = {
"openOODA": 1, "home": 1,
"ooda": 2, "std": 3, "opm": 4, "cli": 5, "lsp": 6, "mcp": 7,
"oodar": 8, "oodac": 9
};
const ROUTE_ID_TO_NAME = {
1: "openOODA",
2: "ooda", 3: "std", 4: "opm", 5: "cli", 6: "lsp", 7: "mcp",
8: "oodar", 9: "oodac"
};

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

const DEFAULT_ROUTE = "openOODA";
const INSTALL_HTML = '<div class="install"><span class="install-cmd">curl -fsSL <a href="https://openooda.org/install.sh">https://openooda.org/install.sh</a> | bash</span><button type="button" class="copy" aria-label="Copy install command">copy</button></div>';


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
var route = safeTarget.replace(/^[#/]/, "");
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

const DASH_4_4 = [4, 4];


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
        inViewport: isFixedBg ? true : !intersectionObserver,
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





function setupOpenOODA() {
var copyBtns = document.querySelectorAll("main .copy");
for (var i = 0; i < copyBtns.length; i++) {
(function (btn) {
  btn.onclick = function () {
    var cmd = "curl -fsSL https://openooda.org/install.sh | bash";
    function ok() {
      // Just toggle color (no size change, no text change)
      btn.classList.add("is-on");
      setTimeout(function () { btn.classList.remove("is-on"); }, 1400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cmd).then(ok, function () {});
    }
  };
})(copyBtns[i]);
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
if (!raw || raw === "home" || raw === "/") raw = "openOODA";
var contentEl = document.getElementById("content");
if (!contentEl) return;
// Local sub-menu active state
document.querySelectorAll("aside .local a").forEach(function (a) {
var isAct = a.dataset.route === raw;
if (a.classList.contains("active") !== isAct) {
a.classList.toggle("active", isAct);
}
});
if (typeof CanvasLifecycleManager !== "undefined") {
  CanvasLifecycleManager.cleanupRoute();
}
if (raw === "openOODA" || raw === "home") {
document.title = "openOODA — Sovereign Systems Language for the AI Era";
contentEl.innerHTML = '<p class="canon">Loading openOODA overview from openOODA/openOODA/docs/&hellip;</p>';
fetch("/pulled/openOODA.json").then(function (r) {
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}).then(function (data) {
  var html = "";
  if (data.title) html += '<h1 class="visually-hidden">' + data.title + "</h1>";
  if (data.source) html += '<p class="canon">Source: ' + data.source + "</p>";
  // Install box at the top, before the prose — always visible
  html += INSTALL_HTML;
  if (data.content) {
    var parsed = "";
    parsed = simpleMarkdown(data.content);
    html += parsed;
  }
  // Install box at the bottom, after the prose — same component, no change
  html += INSTALL_HTML;
  contentEl.innerHTML = html;
  setupOpenOODA();
}).catch(function (err) {
  contentEl.innerHTML = '<h1>openOODA</h1><p>Failed to load overview: ' + (err && err.message ? err.message : "unknown") + '.</p><p><a href="https://github.com/openOODA/openOODA" target="_blank" rel="noopener noreferrer">View on GitHub</a>.</p>';
});
} else if (raw === "ooda" || raw === "std" || raw === "opm" || raw === "cli" || raw === "lsp" || raw === "mcp" || raw === "oodar" || raw === "oodac") {
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
    parsed = simpleMarkdown(data.content);
    html += parsed;
  }
  contentEl.innerHTML = html;
}).catch(function (err) {
  contentEl.innerHTML = '<h1>' + raw + '</h1><p>Failed to load docs: ' + (err && err.message ? err.message : "unknown") + '.</p><p><a href="https://github.com/openOODA/' + raw + '" target="_blank" rel="noopener noreferrer">View on GitHub</a>.</p>';
});
} else if (raw === "oodac") {
document.title = "openOODA — oodac";
// oodac is now a shipped polyrepo sibling (v0.1.x, gemini reorg + cap-ABI alignment).
// This branch is now reachable only if the loadDocs path above fails; the
// canonical route is handled by the pulled/oodac.json loader.
} else {
document.title = "openOODA — Not Found";
contentEl.innerHTML = "<p>Not found.</p>";
}
window.scrollTo(0, 0);
setupGenSelector();
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
  }
  });
}
const originalRenderRoute = renderRoute;
renderRoute = function(rawRoute) {
  var r = (rawRoute || "").replace(/^#/, "").trim();
  if (!r) r = "openOODA";
  if (r === "registry" || r === "search") {
    originalRenderRoute(r);
    return;
  }
  // The WASM ooda_app_route() was an experiment; it's compiled against an
  // older route table that doesn't know about "openOODA" (the new front-
  // door route added in v1.1.0). When the WASM returns an ID that maps
  // to a *different* route than what the user asked for, we honor the
  // JS route instead so the user always lands where they clicked.
  originalRenderRoute(r);
};

function getInitialRoute() {
  if (typeof location !== "undefined" && location.hash) return location.hash.replace(/^#/, "").trim();
  var p = (typeof location !== "undefined" && location.pathname) ? location.pathname.replace(/^\//, "").replace(/\/index\.html$/, "").replace(/\.html$/, "") : "";
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

  })();
}
