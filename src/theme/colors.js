// # Theme colors
//
// Logline: Nine palettes, faction colors, alpha LUT.
//
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
