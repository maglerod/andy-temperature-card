/**
 * Andy Temperature Card
 * v2.0.5
 * ------------------------------------------------------------------
 * Developed by: Andreas ("AndyBonde") with some help from AI :).
 *
 * License / Disclaimer:
 * - Free to use, copy, modify, redistribute.
 * - Provided "AS IS" without warranty. No liability.
 * - Not affiliated with Home Assistant / Nabu Casa.
 * - Runs fully in the browser.
 *
 * Compatibility notes:
 * - Stats uses REST history endpoint via hass.callApi("GET", "history/period/...")
 *
 * Install: Se README.md in GITHUB
 *
 * Changelog 2.0.5 - 2026-07-14
 * - Updated visual-editor text, number and color fields for Home Assistant 2026.5+
 *   (ha-input), while retaining compatibility with older HA releases (ha-textfield).
 * - Prevented history-graph curves from drawing backwards when timestamps are
 *   irregular, duplicated or returned out of order.
 *
 * Changelog 2.0.4 - 2026-05-04
 * Now supports card_mod again. 
 * 
 * Changelog 2.0.2 - 2026-05-01
 * 
 * Added support for multiple temperature columns in one card.
 * Each column can now have its own full set of individual settings.
 * Multiple temperature sensors can be displayed side by side in the same card.
 * Added a new Board symbol type with its own layout, scale, and background styling.
 * Added support for shared graph and shared stats across multiple columns.
 * Added the option to use individual graphs per column or one shared graph below all columns.
 * Added Compact columns mode to keep multiple columns side by side in smaller spaces.
 * Added column duplication to quickly create a new column with the same settings.
 * Added per extra entity / badge placement options:
 * - right
 * - below
 * Added per extra entity / badge background toggle.
 * Added Value color on interval level, so the main value and unit can be colored per interval.
 * Expanded the original symbol with more symbol style options.
 * Added multiple liquid effects.
 * Preserved the original appearance as the Classic style.
 * Added more ways to customize scale, value, symbol, and badge layout.
 * Added modern symbol styles: Classic, Clean, Glass, Frosted and Neon Modern
 * Added liquid effects: None, Gloss, Shimmer and Pulse
 *
 * Changelog 1.1.0 - 2026-04-28
 *  UI: Replaced deprecated ha-select / mwc-list-item in visual editors with modern ha-selector-based select controls
 *  UI: Updated editor boolean fields to use Home Assistant-compatible switch/formfield patterns where needed
 *  FIX: Improved compatibility with newer Home Assistant versions in visual editors
 *  FIX: Refactored editor select handling to avoid deprecated component usage and improve stability on reload/update 
 *
 * Changelog 1.0.9 - 2026-04-24
 * - Added X,Y Offset on each extra entity / Badge
 *
 * Changelog 1.0.8 - 2026-04-20
 * - Added stats/graph period support (hours/today/yesterday/7d/30d) using real timestamps
 * - Added Name font size
 *
 * Changelog 1.0.7 - 2026-03-04
 * - Value Offset position now visibile
 * - Neon Card resize toggle
 *
 * Changelog 1.0.6.1 - 2026-02-17
 * - Click on badge opens more information on specific entity and not main entity
 *
 * Changelog 1.0.6 - 2026-02-15
 * - Added NEON effect on interval level, to make the symbol "glow"
 * - Added Inline color on interval level, to make it possible to change the color of the liquid border
 * - Added scale markers on the scale for current, max & min
 * - Fixed card clipping when changing the scale factor
 * - Added Value position X, Y Offset, to make it possible to tweak the position 
 * - Added card height value, make it possible to change the automatic calculated value
 * - Added some effects on the Graph makes it smoother and cleaner.
 *
 * Changelog 1.0.5 - 2026-01-07
 * - Added Name position
 * - Added Card scale function (0.2 - 4.0)
 * - Added History graph feature
 * - Added Time ticks below historygraph feature
 * - Added 3 Extra entities for example: Humidity, preassure etc
 * - Click on Main entity to get more information / history
 * - Fixed visual config editor issues
 * - Fixed the Value inside icon position
 *
 * Changelog 1.0.4 - 2026-01-02
 * - Improved scale rendering (outside the outline)
 * - Fixed the Interval Edit / Delete issues
 * - Added the posibility to change scale color, can be done in each interval in 2 modes: per interval (coloring the specific interval only) or active interval (same color for the whole scale)
 * - Added support for horizontal / vertical mode
 *
 */

const CARD_VERSION = "2.0.5";

console.info(`Andy Temperature Card: v${CARD_VERSION}`);

// Easy renaming (keep these at the very top)
const CARD_TAG = "andy-temperature-card";
const EDITOR_TAG = "andy-temperature-card-editor";
const INTERNAL_SINGLE_CARD_TAG = `${CARD_TAG}-inner`;
const INTERNAL_SINGLE_EDITOR_TAG = `${EDITOR_TAG}-inner`;

const LitElement =
  window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = window.html || LitElement.prototype.html;
const css = window.css || LitElement.prototype.css;
const svg  = window.svg  || LitElement.prototype.svg || html;


const DEFAULT_INTERVALS = [
  { id: "it0", to: 0,   color: "#2b6cff", outline: "#ffffff",
      inline: "#ffffff", value_color: "#ffffff", scale_color: "#2b6cff", neon: 0, inline: "#ffffff", gradient: { enabled: false, from: "#2b6cff", to: "#2b6cff" } },
  { id: "it1", to: 10,  color: "#39c0ff", outline: "#ffffff", value_color: "#ffffff", scale_color: "#39c0ff", neon: 0, inline: "#ffffff", gradient: { enabled: false, from: "#39c0ff", to: "#39c0ff" } },
  { id: "it2", to: 20,  color: "#22c55e", outline: "#ffffff", value_color: "#ffffff", scale_color: "#22c55e", neon: 0, inline: "#ffffff", gradient: { enabled: false, from: "#22c55e", to: "#22c55e" } },
  { id: "it3", to: 30,  color: "#f59e0b", outline: "#ffffff", value_color: "#ffffff", scale_color: "#f59e0b", neon: 0, inline: "#ffffff", gradient: { enabled: false, from: "#f59e0b", to: "#f59e0b" } },
  { id: "it4", to: 100, color: "#ef4444", outline: "#ffffff", value_color: "#ffffff", scale_color: "#ef4444", neon: 0, inline: "#ffffff", gradient: { enabled: false, from: "#ef4444", to: "#ef4444" } },
];

const SYMBOL_VARIANTS = ["classic", "board"];
const SYMBOL_STYLES = ["classic", "clean", "glass", "frosted", "minimal", "aurora", "neon_modern"];
const LIQUID_EFFECTS = ["none", "gloss", "shimmer", "pulse", "scan", "breathe"];
const INTERVAL_LIQUID_EFFECTS = ["inherit", ...LIQUID_EFFECTS];
const BOARD_SCALE_FORMATS = ["both", "fahrenheit", "celsius"];
const EXTRA_POSITIONS = ["right", "below"];

function deepClone(x) { return JSON.parse(JSON.stringify(x ?? {})); }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function isHexColor(s) { return typeof s === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(s).trim()); }
function normalizeHex(s, fallback = "#22c55e") {
  if (!s) return fallback;
  const t = String(s).trim();
  return isHexColor(t) ? t : fallback;
}
function hexToRgb(hex) {
  const t = normalizeHex(hex, "#000000").replace("#", "");
  const full = t.length === 3 ? t.split("").map((c) => c + c).join("") : t;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}
function rgbToHex(r, g, b) {
  const to2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}
function mixHex(hexA, hexB, amount = 0.5) {
  const a = clamp01(amount);
  const c1 = hexToRgb(hexA);
  const c2 = hexToRgb(hexB);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * a,
    c1.g + (c2.g - c1.g) * a,
    c1.b + (c2.b - c1.b) * a
  );
}
function normalizeChoice(value, allowed, fallback) {
  const s = String(value || "").trim().toLowerCase();
  return allowed.includes(s) ? s : fallback;
}
function createEditorInput() {
  const hasHaInput = !!customElements.get("ha-input");
  const input = document.createElement(hasHaInput ? "ha-input" : "ha-textfield");

  if (hasHaInput) {
    Object.defineProperty(input, "helperText", {
      configurable: true,
      get() { return this.hint || ""; },
      set(value) { this.hint = value == null ? "" : String(value); },
    });
  }

  return input;
}
function syncHaSelectorValue(el, value) {
  if (!el) return;
  if (String(el.tagName || "").toLowerCase() !== "ha-selector") return;
  const next = value == null ? "" : String(value);
  el.value = next;
  if (typeof el.requestUpdate === "function") {
    try { el.requestUpdate(); } catch (_) {}
  }
}
function getCardModStyleText(cardMod) {
  const style = cardMod?.style;
  return typeof style === "string" ? style : "";
}
function stripPureHaCardRules(cssText) {
  const src = String(cssText || "");
  if (!src.trim()) return "";
  return src.replace(/(^|})\s*ha-card\s*\{[^}]*\}\s*/gi, "$1").trim();
}
function uid(prefix = "it") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}
function normalizeInterval(it) {
  const out = { ...(it || {}) };
  if (!out.id) out.id = uid("it");

  out.to = Number(out.to);
  if (!Number.isFinite(out.to)) out.to = 0;

  out.color = normalizeHex(out.color, "#22c55e");
  out.outline = normalizeHex(out.outline, "#ffffff");
  out.value_color = normalizeHex(out.value_color, "#ffffff");
  out.scale_color = normalizeHex(out.scale_color, out.color);
  out.inline = normalizeHex(out.inline, out.outline);

  out.neon = Number(out.neon ?? 0);
  if (!Number.isFinite(out.neon)) out.neon = 0;
  out.neon = Math.max(0, out.neon);
  out.neon = Math.round(out.neon * 10) / 10;
  out.liquid_effect_override = normalizeChoice(out.liquid_effect_override, INTERVAL_LIQUID_EFFECTS, "inherit");
  const g0 = out.gradient || {};
  out.gradient = { ...(g0 || {}) };
  out.gradient.enabled = !!out.gradient.enabled;
  out.gradient.from = normalizeHex(out.gradient.from, out.color);
  out.gradient.to = normalizeHex(out.gradient.to, out.gradient.from);

  return out;
}
function intervalsSortedByTo(intervals) {
  return (intervals || []).slice().map(normalizeInterval).sort((a, b) => Number(a.to) - Number(b.to));
}
function fmtNum(v, decimals = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(decimals);
}

// v1.0.5
function toLocalHHMM(ts) {
  try {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch (_) {
    return "";
  }
}

function toLocalHH(ts) {
  try {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, "0");
  } catch (_) {
    return "";
  }
}

// v1.0.8 - resolve time span for stats/graph
function resolvePeriodRange(period, hoursFallback) {
  const p = String(period || "hours");
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 3600 * 1000);
  const endOfYesterday = new Date(startOfToday.getTime() - 1);

  if (p === "today") {
    return { start: startOfToday, end: now };
  }
  if (p === "yesterday") {
    return { start: startOfYesterday, end: endOfYesterday };
  }
  if (p === "7d") {
    return { start: new Date(now.getTime() - 7 * 24 * 3600 * 1000), end: now };
  }
  if (p === "30d") {
    return { start: new Date(now.getTime() - 30 * 24 * 3600 * 1000), end: now };
  }

  // default: hours
  let h = Number(hoursFallback);
  if (!Number.isFinite(h) || h <= 0) h = 24;
  return { start: new Date(now.getTime() - h * 3600 * 1000), end: now };
}

// Downsample a series to at most maxPoints using bucket averaging.
function downsampleSeries(series, maxPoints) {
  const s = normalizeTimeSeries(series);
  if (s.length <= maxPoints) return s;

  const buckets = maxPoints;
  const out = [];
  const n = s.length;
  for (let b = 0; b < buckets; b++) {
    const i0 = Math.floor((b * n) / buckets);
    const i1 = Math.floor(((b + 1) * n) / buckets);
    if (i1 <= i0) continue;

    let sumV = 0, sumT = 0, c = 0;
    for (let i = i0; i < i1; i++) {
      const p = s[i];
      if (!p) continue;
      sumV += p.v;
      sumT += p.t;
      c++;
    }
    if (c) out.push({ t: sumT / c, v: sumV / c });
  }
  return out;
}

// Keep history points in chronological order and collapse duplicate timestamps.
// History can briefly contain repeated or out-of-order entries after an entity
// reconnects; one value per timestamp guarantees a forward-moving plot.
function normalizeTimeSeries(series) {
  const sorted = (series || [])
    .filter((p) => p?.t != null && p.t !== "" && Number.isFinite(Number(p.t)) && Number.isFinite(Number(p?.v)))
    .map((p) => ({ t: Number(p.t), v: Number(p.v) }))
    .sort((a, b) => a.t - b.t);
  const out = [];
  for (const point of sorted) {
    const last = out[out.length - 1];
    if (last && point.t === last.t) last.v = point.v;
    else out.push(point);
  }
  return out;
}

// Build a smooth SVG path that always moves forward along the time axis.
function buildSmoothPath(pts) {
  const p = pts || [];
  if (p.length < 2) return "";
  const d = [];
  d.push(`M ${p[0].x} ${p[0].y}`);
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p[i + 1];

    const dx = Math.max(0, p2.x - p1.x);
    const c1x = p1.x + dx / 3;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - dx / 3;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

class AndyTemperatureCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: { state: true },
      _stats: { state: true },
      _series: { state: true },
      _lastStatsAt: { state: false },
      _statsBusy: { state: false },
    };
  }

  // *** Viktigt: behåll exception här, som du ville ***
  setConfig(config) {
    if (!config?.entity) throw new Error("You need to define an entity");

    const base = {
      name: "Temperature",
      entity: "",
      min: -20,
      max: 40,
      unit: "",
      decimals: 1,
      card_scale: 1,
      value_position: "top_right",
      value_font_size: 0,
      value_position_offset_x: 0,
      value_position_offset_y: 0,
      name_position: "auto",
      name_font_size: 0, // v1.0.8
      glass: true,
      orientation: "vertical",
      show_scale: false,
      scale_markers: false,
      scale_color_mode: "per_interval",
      show_stats: false,
      stats_hours: 24,
      stats_period: "hours", // v1.0.8: hours|today|yesterday|7d|30d
      show_graph: false,
      graph_hours: 24,
      graph_period: "hours", // v1.0.8: hours|today|yesterday|7d|30d
      graph_height: 58,
      graph_show_time: true,
      graph_max_points: 160,
      graph_line_width: 1.0,

      resize_card_on_neon: false,
      symbol_variant: "classic",
      board_scale_format: "both",
      board_background_color: "#e4e4e4",
      board_background_visible: true,
      board_background_gradient: true,
      symbol_style: "classic",
      liquid_effect: "none",

      extra_entity_1: "",
      extra_icon_1: "",
      extra_label_1: "",
      extra_position_1: "right",
      extra_background_1: true,

      extra_entity_2: "",
      extra_icon_2: "",
      extra_label_2: "",
      extra_position_2: "right",
      extra_background_2: true,

      extra_entity_3: "",
      extra_icon_3: "",
      extra_label_3: "",
      extra_position_3: "right",
      extra_background_3: true,
      
      // Extra badge offsets (v1.0.9)
      extra_offset_x_1: 0,
      extra_offset_y_1: 0,
      extra_offset_x_2: 0,
      extra_offset_y_2: 0,
      extra_offset_x_3: 0,
      extra_offset_y_3: 0,
      
      intervals: deepClone(DEFAULT_INTERVALS),
    };

    const cfg = { ...(config || {}) };
    if ("liquid_animation" in cfg) delete cfg.liquid_animation;

    this._config = Object.assign({}, base, cfg);

    if (!Number.isFinite(Number(this._config.min))) this._config.min = -20;
    if (!Number.isFinite(Number(this._config.max))) this._config.max = 40;

    const ori = String(this._config.orientation || "vertical");
    this._config.orientation = (ori === "horizontal") ? "horizontal" : "vertical";

    const np = String(this._config.name_position || "auto");
    this._config.name_position = (np === "left" || np === "center") ? np : "auto";

    const scm = String(this._config.scale_color_mode || "per_interval");
    this._config.scale_color_mode = (scm === "active_interval") ? "active_interval" : "per_interval";
    this._config.symbol_variant = normalizeChoice(this._config.symbol_variant, SYMBOL_VARIANTS, "classic");
    this._config.board_scale_format = normalizeChoice(this._config.board_scale_format, BOARD_SCALE_FORMATS, "both");
    this._config.extra_position_1 = normalizeChoice(this._config.extra_position_1, EXTRA_POSITIONS, "right");
    this._config.extra_position_2 = normalizeChoice(this._config.extra_position_2, EXTRA_POSITIONS, "right");
    this._config.extra_position_3 = normalizeChoice(this._config.extra_position_3, EXTRA_POSITIONS, "right");
    this._config.extra_background_1 = this._config.extra_background_1 !== false;
    this._config.extra_background_2 = this._config.extra_background_2 !== false;
    this._config.extra_background_3 = this._config.extra_background_3 !== false;
    this._config.board_background_color = normalizeHex(this._config.board_background_color, "#e4e4e4");
    this._config.board_background_visible = this._config.board_background_visible !== false;
    this._config.board_background_gradient = this._config.board_background_gradient !== false;
    this._config.symbol_style = normalizeChoice(this._config.symbol_style, SYMBOL_STYLES, "classic");
    this._config.liquid_effect = normalizeChoice(this._config.liquid_effect, LIQUID_EFFECTS, "none");

    let cs = Number(this._config.card_scale ?? 1);
    if (!Number.isFinite(cs) || cs <= 0) cs = 1;
    this._config.card_scale = Math.max(0.2, Math.min(4.0, cs));

    // graph clamps
    let gh = Number(this._config.graph_hours ?? this._config.stats_hours ?? 24);
    if (!Number.isFinite(gh) || gh <= 0) gh = 24;
    this._config.graph_hours = Math.max(1, Math.min(720, gh)); // allow up to 30 days in hours for hours-mode

    let ghPx = Number(this._config.graph_height ?? 58);
    if (!Number.isFinite(ghPx) || ghPx <= 0) ghPx = 58;
    this._config.graph_height = Math.max(40, Math.min(160, ghPx));

    let mp = Number(this._config.graph_max_points ?? 160);
    if (!Number.isFinite(mp) || mp < 30) mp = 160;
    this._config.graph_max_points = Math.max(30, Math.min(600, mp));

    let lw = Number(this._config.graph_line_width ?? 0.7);
    if (!Number.isFinite(lw) || lw <= 0) lw = 0.7;
    this._config.graph_line_width = Math.max(0.3, Math.min(3.0, lw));

    if (!Array.isArray(this._config.intervals) || this._config.intervals.length === 0) {
      this._config.intervals = deepClone(DEFAULT_INTERVALS);
    }
    this._config.intervals = this._config.intervals.map(normalizeInterval);

    // v1.0.8 normalize periods
    const sp = String(this._config.stats_period || "hours");
    this._config.stats_period = ["hours","today","yesterday","7d","30d"].includes(sp) ? sp : "hours";
    const gp = String(this._config.graph_period || "hours");
    this._config.graph_period = ["hours","today","yesterday","7d","30d"].includes(gp) ? gp : "hours";

    // name size
    let nfs = Number(this._config.name_font_size ?? 0);
    if (!Number.isFinite(nfs) || nfs < 0) nfs = 0;
    this._config.name_font_size = nfs;

    this._stats = null;
    this._lastStatsAt = 0;
    this._statsBusy = false;
    this._series = null;
  }

  static getConfigElement() { return document.createElement(INTERNAL_SINGLE_EDITOR_TAG); }

  _getSymbolVariant() {
    return normalizeChoice(this._config?.symbol_variant, SYMBOL_VARIANTS, "classic");
  }

  _getStateValue(entityId) {
    if (!entityId) return null;
    const st = this.hass?.states?.[entityId];
    if (!st) return null;
    const v = Number(st.state);
    return Number.isFinite(v) ? v : null;
  }

  _getUnit() {
    if (this._config.unit) return this._config.unit;
    const st = this.hass?.states?.[this._config.entity];
    return st?.attributes?.unit_of_measurement ?? "";
  }

  _boardUsesFahrenheit() {
    const unit = String(this._getUnit() || "").toLowerCase();
    return unit.includes("°f") || unit === "f" || unit.includes("fahrenheit");
  }

  _boardValueToCelsius(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (this._boardUsesFahrenheit()) return (n - 32) * 5 / 9;
    return n;
  }

  _boardCelsiusToSource(valueC) {
    const n = Number(valueC);
    if (!Number.isFinite(n)) return null;
    if (this._boardUsesFahrenheit()) return (n * 9 / 5) + 32;
    return n;
  }

  _getBoardScaleRangeC() {
    let minC = Number(this._config?.min ?? -20);
    let maxC = Number(this._config?.max ?? 40);
    if (!Number.isFinite(minC)) minC = -20;
    if (!Number.isFinite(maxC)) maxC = 40;
    if (maxC < minC) [minC, maxC] = [maxC, minC];
    if (Math.abs(maxC - minC) < 0.001) maxC = minC + 10;
    return { minC, maxC };
  }

  _buildBoardCMarks(minC, maxC) {
    const marks = [];
    let current = Number(maxC);
    marks.push(current);
    while ((current - 10) > minC) {
      current -= 10;
      marks.push(current);
    }
    if (Math.abs(marks[marks.length - 1] - minC) > 0.001) {
      marks.push(minC);
    }
    return marks;
  }

  _getUnitForEntity(entityId) {
    if (!entityId) return "";
    const st = this.hass?.states?.[entityId];
    return st?.attributes?.unit_of_measurement ?? "";
  }

  _inferExtraIcon(entityId) {
    const st = this.hass?.states?.[entityId];
    const dc = st?.attributes?.device_class;
    const unit = st?.attributes?.unit_of_measurement;

    if (dc === "humidity" || unit === "%") return "mdi:water-percent";
    if (dc === "carbon_dioxide") return "mdi:molecule-co2";
    if (dc === "pm25" || dc === "pm10") return "mdi:blur";
    if (String(entityId || "").toLowerCase().includes("air_quality")) return "mdi:air-filter";

    return "mdi:information-outline";
  }

  _hasExtras(position = null) {
    return [1, 2, 3].some((n) => {
      const entity = String(this._config?.[`extra_entity_${n}`] || "").trim();
      if (!entity) return false;
      if (!position) return true;
      return normalizeChoice(this._config?.[`extra_position_${n}`], EXTRA_POSITIONS, "right") === position;
    });
  }

  _renderExtraValues(position = "right") {
    const rows = [];

    const addRow = (n) => {
      const entity = String(this._config?.[`extra_entity_${n}`] || "").trim();
      if (!entity) return;
      const extraPosition = normalizeChoice(this._config?.[`extra_position_${n}`], EXTRA_POSITIONS, "right");
      if (extraPosition !== position) return;

      const st = this.hass?.states?.[entity];
      const raw = st?.state;
      const num = Number(raw);
      const hasNum = Number.isFinite(num);

      const unit = this._getUnitForEntity(entity);
      const rawLabel = String(this._config?.[`extra_label_${n}`] || "").trim();
      const label = rawLabel !== "" ? rawLabel : "";

      const icon = String(this._config?.[`extra_icon_${n}`] || "").trim()
        || this._inferExtraIcon(entity);

      const decimals = Number(this._config?.decimals ?? 1);
      const valueText = hasNum
        ? (fmtNum(num, Number.isFinite(decimals) ? decimals : 1) ?? String(num))
        : (raw ?? "—");

      
      const offX = Number(this._config?.[`extra_offset_x_${n}`] ?? 0);
      const offY = Number(this._config?.[`extra_offset_y_${n}`] ?? 0);
      const offXn = Number.isFinite(offX) ? offX : 0;
      const offYn = Number.isFinite(offY) ? offY : 0;
      const showBackground = this._config?.[`extra_background_${n}`] !== false;

      rows.push(html`
        <div
          class="extraRow ${position} ${showBackground ? "" : "noBg"}"
          @click=${(ev) => this._openMoreInfoForEntity(ev, entity)}
          style="cursor:pointer; transform: translate(${offXn}px, ${offYn}px);"
      >
          <ha-icon class="extraIcon" icon="${icon}"></ha-icon>
          <div class="extraText">
          ${label ? html`<div class="extraLabel">${label}</div>` : ""}
          <div class="extraValue">
              ${valueText}${unit ? html`<span class="extraUnit">${unit}</span>` : ""}
          </div>
          </div>
      </div>
      `);
    };

    addRow(1);
    addRow(2);
    addRow(3);

    if (!rows.length) return "";

    return html`<div class="extras ${position}">${rows}</div>`;
  }

  _findIntervalForValue(value) {
    const intervals = intervalsSortedByTo(this._config.intervals);
    for (const it of intervals) if (value <= it.to) return it;
    return intervals.length ? intervals[intervals.length - 1] : normalizeInterval(DEFAULT_INTERVALS[2]);
  }

  _getIntervalLiquidEffect(interval) {
    const it = normalizeInterval(interval);
    const override = normalizeChoice(it?.liquid_effect_override, INTERVAL_LIQUID_EFFECTS, "inherit");
    if (override !== "inherit") return override;
    return normalizeChoice(this._config?.liquid_effect, LIQUID_EFFECTS, "none");
  }

  _getLiquidColorMode() {
    return "active_interval";
  }

  _buildLiquidSegments({
    minValue,
    maxValue,
    currentValue,
    fillTop,
    fillBottom,
    positionTop = fillTop,
    positionBottom = fillBottom,
    renderBottom = fillBottom,
    x,
    width,
    defsPrefix,
  }) {
    const mode = this._getLiquidColorMode();
    const intervals = intervalsSortedByTo(this._config?.intervals || DEFAULT_INTERVALS);
    const clampValue = (v) => Math.max(minValue, Math.min(maxValue, Number(v)));
    const valueClamped = clampValue(currentValue);
    const valueToY = (v) => {
      const t = clamp01((clampValue(v) - minValue) / ((maxValue - minValue) || 1));
      return positionTop + (1 - t) * (positionBottom - positionTop);
    };

    if (mode !== "per_interval") return { defs: "", shapes: "" };

    const activeIt = normalizeInterval(this._findIntervalForValue(valueClamped));
    const defs = [];
    const shapes = [];
    const segments = [];
    const transitionHeight = 12;
    let lowerBound = minValue;

    intervals.forEach((rawIt, idx) => {
      const it = normalizeInterval(rawIt);
      const color = normalizeHex(it.color, "#22c55e");
      const gradientEnabled = !!it.gradient?.enabled;
      const gradientFrom = normalizeHex(it.gradient?.from, color);
      const gradientTo = normalizeHex(it.gradient?.to, gradientFrom);
      const upperBound = (idx === intervals.length - 1)
        ? maxValue
        : Math.min(maxValue, Number(it.to));
      const segStartValue = Math.max(minValue, lowerBound);
      const segEndValue = Math.min(valueClamped, upperBound);

      if (segEndValue > segStartValue) {
        const topY = valueToY(segEndValue);
        const bottomY = segStartValue <= minValue ? renderBottom : valueToY(segStartValue);
        if (bottomY > topY) {
            segments.push({
              from: segStartValue,
              to: segEndValue,
              color,
              gradientEnabled,
              gradientFrom,
              gradientTo,
              topY,
              bottomY,
            });
        }
      }

      lowerBound = upperBound;
    });

    if (!segments.length) {
      const fallbackColor = normalizeHex(activeIt.color, "#22c55e");
      const yTop = valueToY(valueClamped);
      shapes.push(svg`
        <rect
          x="${x}"
          y="${yTop}"
          width="${width}"
          height="${Math.max(0, renderBottom - yTop)}"
          fill="${fallbackColor}"
          opacity="0.98"
        ></rect>
      `);
      return { defs: svg`${defs}`, shapes: svg`${shapes}` };
    }

    segments.forEach((segment, idx) => {
      let fill = segment.color;
      if (segment.gradientEnabled) {
        const gradId = `${defsPrefix}_liquid_seg_${idx}`;
        defs.push(svg`
          <linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${x}" x2="${x}" y1="${segment.bottomY}" y2="${segment.topY}">
            <stop offset="0%" stop-color="${segment.gradientFrom}"></stop>
            <stop offset="100%" stop-color="${segment.gradientTo}"></stop>
          </linearGradient>
        `);
        fill = `url(#${gradId})`;
      }
      shapes.push(svg`
        <rect
          x="${x}"
          y="${segment.topY}"
          width="${width}"
          height="${Math.max(0, segment.bottomY - segment.topY)}"
          fill="${fill}"
          opacity="0.98"
        ></rect>
      `);
    });

    for (let i = 0; i < segments.length - 1; i += 1) {
      const lowerSeg = segments[i];
      const upperSeg = segments[i + 1];
      const boundaryY = upperSeg.bottomY;
      const gradId = `${defsPrefix}_liquid_transition_${i}`;
      defs.push(svg`
        <linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${x}" x2="${x}" y1="${boundaryY - transitionHeight / 2}" y2="${boundaryY + transitionHeight / 2}">
          <stop offset="0%" stop-color="${upperSeg.color}"></stop>
          <stop offset="100%" stop-color="${lowerSeg.color}"></stop>
        </linearGradient>
      `);
      shapes.push(svg`
        <rect
          x="${x}"
          y="${boundaryY - transitionHeight / 2}"
          width="${width}"
          height="${transitionHeight}"
          fill="url(#${gradId})"
          opacity="0.98"
        ></rect>
      `);
    }

    return { defs: svg`${defs}`, shapes: svg`${shapes}` };
  }

  _openMoreInfo() {
    const entityId = this._config?.entity;
    if (!entityId) return;

    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true,
    }));
  }

  _openMoreInfoForEntity(ev, entityId) {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault?.();
    }
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true,
    }));
  }

  async _maybeUpdateStats() {
    if (!this.hass || !this._config) return;

    const needStats = !!this._config.show_stats || (!!this._config.show_scale && !!this._config.scale_markers);
    const needGraph = !!this._config.show_graph;
    if (!needStats && !needGraph) return;

    const now = Date.now();
    const throttleMs = 3 * 60 * 1000;

    if (this._statsBusy) return;

    if (
      this._lastStatsAt &&
      now - this._lastStatsAt < throttleMs &&
      this._stats &&
      (!needGraph || this._series)
    ) {
      return;
    }

    const entityId = this._config.entity;
    if (!entityId) return;

    // v1.0.8 - period support for stats & graph
    const statsPeriod = String(this._config.stats_period || "hours");
    const graphPeriod = String(this._config.graph_period || "hours");

    // We fetch ONE range that covers what we need.
    // If both are enabled and periods differ, take the widest range to avoid double fetch.
    const rStats = resolvePeriodRange(statsPeriod, this._config.stats_hours ?? 24);
    const rGraph = resolvePeriodRange(graphPeriod, this._config.graph_hours ?? this._config.stats_hours ?? 24);

    let start = rStats.start;
    let end = rStats.end;

    if (needGraph) {
      // widen to include graph range too
      if (rGraph.start < start) start = rGraph.start;
      if (rGraph.end > end) end = rGraph.end;
    }

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const path =
      `history/period/${encodeURIComponent(startIso)}` +
      `?filter_entity_id=${encodeURIComponent(entityId)}` +
      `&end_time=${encodeURIComponent(endIso)}`;

    this._statsBusy = true;

    try {
      const data = await this.hass.callApi("GET", path);

      let seriesRaw;

      if (Array.isArray(data)) {
        seriesRaw = data.length ? data[0] : [];
      } else if (data && typeof data === "object") {
        const keys = Object.keys(data);
        if (keys.length && Array.isArray(data[keys[0]])) {
          seriesRaw = keys[0];
        } else {
          seriesRaw = [];
        }
      } else {
        seriesRaw = [];
      }

      const nums = [];
      const points = [];

      const tsOf = (item) => {
        const s = item?.last_changed || item?.last_updated || item?.lc || item?.lu;
        const t = Date.parse(s);
        return Number.isFinite(t) ? t : null;
      };

      const inRange = (t, range) => t != null && t >= range.start.getTime() && t <= range.end.getTime();

      for (const item of (seriesRaw || [])) {
        const rawState = item?.state ?? item?.s;
        const n = Number(rawState);
        if (!Number.isFinite(n)) continue;

        const t = tsOf(item);

        // Collect for stats-period
        if (needStats && inRange(t, rStats)) nums.push(n);

        // Collect for graph-period
        if (needGraph && inRange(t, rGraph)) points.push({ t, v: n });
      }

      // Graph data
      if (needGraph) {
        if (points.length) {
          const maxPts = Number(this._config.graph_max_points ?? 160);
          const sampled = downsampleSeries(
            points,
            Number.isFinite(maxPts) ? maxPts : 160
          );
          this._series = sampled;
        } else {
          const cur = this._getStateValue(this._config.entity);
          if (cur != null) {
            const tStart = rGraph.start.getTime();
            const tEnd = rGraph.end.getTime();
            const mid = (tStart + tEnd) / 2;

            this._series = [
              { t: tStart, v: cur },
              { t: mid,   v: cur },
              { t: tEnd,  v: cur },
            ];
          } else {
            this._series = [];
          }
        }
      } else {
        this._series = null;
      }

      // Stats
      if (needStats) {
        if (!nums.length) {
          this._stats = { min: null, avg: null, max: null, samples: 0 };
        } else {
          let min = nums[0], max = nums[0], sum = 0;
          for (const n of nums) {
            if (n < min) min = n;
            if (n > max) max = n;
            sum += n;
          }
          this._stats = {
            min,
            avg: sum / nums.length,
            max,
            samples: nums.length,
          };
        }
      } else {
        this._stats = null;
      }

      this._lastStatsAt = now;
    } catch (err) {
      console.error(
        "Andy Temperature Card v1.0.8: history fetch failed",
        err,
        path
      );

      if (needStats) {
        this._stats = {
          min: null,
          avg: null,
          max: null,
          samples: 0,
          error: true,
        };
      } else {
        this._stats = null;
      }

      if (needGraph) {
        this._series = [];
      } else {
        this._series = null;
      }

      this._lastStatsAt = now;
    } finally {
      this._statsBusy = false;
    }
  }

  updated(changedProps) {
    if (changedProps.has("hass") || changedProps.has("_config")) {
      this._maybeUpdateStats();
    }
    if (changedProps.has("hass") || changedProps.has("_config") || changedProps.has("_stats")) {
      this._drawScaleDom();
    }
  }

  _drawScaleDom() {
    try {
      const showScale = !!this._config?.show_scale;
      const showMarkers = !!this._config?.scale_markers;
      const root = this.renderRoot;
      if (!root) return;

      const svgEl = root.querySelector("svg.thermo");
      if (!svgEl) return;

      const layer = svgEl.querySelector("g.scale-layer");
      if (!layer) return;

      while (layer.firstChild) layer.removeChild(layer.firstChild);
      const variant = this._getSymbolVariant();
      if (variant === "board") {
        const shouldShowBoardScale = !!this._config?.show_scale || !!this._config?.scale_markers;
        if (!shouldShowBoardScale) return;

        const NS = "http://www.w3.org/2000/svg";
        const { minC: displayMin, maxC: displayMax } = this._getBoardScaleRangeC();
        const topY = 90;
        const bottomY = 522;
        const usable = bottomY - topY;
        const posY = (v) => {
          const t = clamp01((Number(v) - displayMin) / ((displayMax - displayMin) || 1));
          return topY + (1 - t) * usable;
        };

        const mode = String(this._config.scale_color_mode || "per_interval");
        const currentValue = this._getStateValue(this._config.entity);
        const currentValueC = this._boardValueToCelsius(currentValue);
        const activeInterval = (currentValue == null) ? null : normalizeInterval(this._findIntervalForValue(currentValue));
        const activeScaleColor = normalizeHex(activeInterval?.scale_color, "#ffffff");
        const tickColorFor = (tickValueC) => {
          if (mode === "active_interval") return activeScaleColor;
          const tickValue = this._boardCelsiusToSource(tickValueC);
          const itTick = normalizeInterval(this._findIntervalForValue(tickValue));
          return normalizeHex(itTick?.scale_color, "#ffffff");
        };
        const topScaleColor = tickColorFor(displayMax);
        const boardScaleFormat = normalizeChoice(this._config?.board_scale_format, BOARD_SCALE_FORMATS, "both");
        const showFScale = boardScaleFormat !== "celsius";
        const showCScale = boardScaleFormat !== "fahrenheit";

        const make = (name) => document.createElementNS(NS, name);
        const addText = (x, y, text, anchor, color = "#333", size = 18) => {
          const el = make("text");
          el.setAttribute("x", String(x));
          el.setAttribute("y", String(y));
          el.setAttribute("fill", color);
          el.setAttribute("font-size", String(size));
          el.setAttribute("font-family", "Arial");
          el.setAttribute("text-anchor", anchor);
          el.textContent = String(text);
          layer.appendChild(el);
        };
        const addLine = (x1, y1, x2, y2, width = 1.5, color = "#333", opacity = 1) => {
          const el = make("line");
          el.setAttribute("x1", String(x1));
          el.setAttribute("y1", String(y1));
          el.setAttribute("x2", String(x2));
          el.setAttribute("y2", String(y2));
          el.setAttribute("stroke", color);
          el.setAttribute("stroke-opacity", String(opacity));
          el.setAttribute("stroke-width", String(width));
          layer.appendChild(el);
        };

        {
          if (!!this._config?.show_scale) {
            if (showFScale) addText(50, 52, "\u00B0F", "start", topScaleColor, 28);
            if (showCScale) addText(145, 52, "\u00B0C", "start", topScaleColor, 28);

            const cMarks = this._buildBoardCMarks(displayMin, displayMax)
              .map((c) => [c, posY(c), c]);
            const fMarks = cMarks.map(([, y, c]) => [
              Math.round((c * 9 / 5) + 32),
              y,
              c,
            ]);
            const buildMinorMarks = (majors) => {
              const minors = [];
              for (let i = 0; i < majors.length - 1; i += 1) {
                const [, y1, c1] = majors[i];
                const [, y2, c2] = majors[i + 1];
                for (let step = 1; step <= 3; step += 1) {
                  const ratio = step / 4;
                  minors.push([
                    y1 + ((y2 - y1) * ratio),
                    c1 + ((c2 - c1) * ratio),
                  ]);
                }
              }
              return minors;
            };
            const cMinorMarks = buildMinorMarks(cMarks);
            const fMinorMarks = buildMinorMarks(fMarks);
            const tickStopY = 499 - 25;
            const cLineMarks = cMarks.filter(([, y]) => y <= tickStopY);
            const fLineMarks = fMarks.filter(([, y]) => y <= tickStopY);
            const cMinorLineMarks = cMinorMarks.filter(([y]) => y <= tickStopY);
            const fMinorLineMarks = fMinorMarks.filter(([y]) => y <= tickStopY);
            const cTopTextMarks = cMarks.slice(0, -1);
            const fTopTextMarks = fMarks.slice(0, -1);
            const bottomCMark = cMarks[cMarks.length - 1] || null;

            if (showFScale) fTopTextMarks.forEach(([f, y, c]) => addText(74, y, f, "end", tickColorFor(c)));
            if (showCScale) cTopTextMarks.forEach(([c, y]) => addText(158, y, c, "start", tickColorFor(c)));
            if (showCScale && bottomCMark) addText(158, bottomCMark[1], bottomCMark[0], "start", tickColorFor(bottomCMark[2]));

            if (showFScale) fLineMarks.forEach(([, y, c]) => addLine(78, y - 6, 94, y - 6, 1.5, tickColorFor(c)));
            if (showCScale) cLineMarks.forEach(([, y, c]) => addLine(126, y - 6, 142, y - 6, 1.5, tickColorFor(c)));

            if (showFScale) {
              fMinorLineMarks.forEach(([y, c]) => addLine(84, y - 6, 94, y - 6, 1, tickColorFor(c)));
            }
            if (showCScale) {
              cMinorLineMarks.forEach(([y, c]) => addLine(126, y - 6, 136, y - 6, 1, tickColorFor(c)));
            }
          }

          if (!!this._config?.scale_markers) {
            let minMarker = Number(this._stats?.min);
            let maxMarker = Number(this._stats?.max);
            if (!Number.isFinite(minMarker)) minMarker = currentValue;
            if (!Number.isFinite(maxMarker)) maxMarker = currentValue;
            if (!Number.isFinite(currentValue) || !Number.isFinite(currentValueC)) return;

            const colorForValue = (val) => {
              const it = normalizeInterval(this._findIntervalForValue(val));
              return normalizeHex(it?.color, "#ffffff");
            };

            const placedYs = [];
            const drawMarkerPair = (val) => {
              if (!Number.isFinite(val)) return;
              const markerC = this._boardValueToCelsius(val);
              if (!Number.isFinite(markerC)) return;
              const y = posY(markerC);
              if (placedYs.some((py) => Math.abs(py - y) < 10)) return;
              placedYs.push(y);

              const color = colorForValue(val);

              if (showFScale) {
                const left = make("path");
                left.setAttribute("d", `M 78 ${y} L 70 ${y - 5} L 70 ${y + 5} Z`);
                left.setAttribute("fill", color);
                left.setAttribute("fill-opacity", "0.96");
                layer.appendChild(left);
              }

              if (showCScale) {
                const right = make("path");
                right.setAttribute("d", `M 142 ${y} L 150 ${y - 5} L 150 ${y + 5} Z`);
                right.setAttribute("fill", color);
                right.setAttribute("fill-opacity", "0.96");
                layer.appendChild(right);
              }
            };

            drawMarkerPair(maxMarker);
            drawMarkerPair(currentValue);
            drawMarkerPair(minMarker);
          }
          return;
        }

        if (!!this._config?.show_scale) {
          addText(50, 52, "°F", "start");
          addText(145, 52, "°C", "start");

          const fMarks = [
            [122, 96], [104, 144], [86, 192], [68, 240], [50, 288],
            [32, 336], [14, 384], [-4, 432], [-22, 480],
          ];
          const cMarks = [
            [50, 96], [40, 144], [30, 192], [20, 240], [10, 288],
            [0, 336], [-10, 384], [-20, 432], [-30, 480], [-40, 528],
          ];
          fMarks.forEach(([v, y]) => addText(74, y, v, "end"));
          cMarks.forEach(([v, y]) => addText(158, y, v, "start"));

          [90,138,186,234,282,330,378,426,474].forEach((y) => addLine(78, y, 94, y, 1.5));
          [90,138,186,234,282,330,378,426,474,522].forEach((y) => addLine(126, y, 142, y, 1.5));
          [102,114,126,150,162,174,198,210,222,246,258,270,294,306,318,342,354,366,390,402,414]
            .forEach((y) => {
              addLine(84, y, 94, y, 1);
              addLine(126, y, 136, y, 1);
            });
        }

        if (!!this._config?.scale_markers) {
          const currentValue = this._getStateValue(this._config.entity);
          let minMarker = Number(this._stats?.min);
          let maxMarker = Number(this._stats?.max);
          if (!Number.isFinite(minMarker)) minMarker = currentValue;
          if (!Number.isFinite(maxMarker)) maxMarker = currentValue;
          if (!Number.isFinite(currentValue)) return;

          const colorForValue = (val) => {
            const it = normalizeInterval(this._findIntervalForValue(val));
            return normalizeHex(it?.color, "#ffffff");
          };

          const placedYs = [];
          const drawMarker = (val) => {
            if (!Number.isFinite(val)) return;
            const y = posY(val);
            if (placedYs.some((py) => Math.abs(py - y) < 8)) return;
            placedYs.push(y);

            const p = make("path");
            p.setAttribute("d", `M 98 ${y} L 90 ${y - 4.5} L 90 ${y + 4.5} Z`);
            p.setAttribute("fill", colorForValue(val));
            p.setAttribute("fill-opacity", "0.96");
            layer.appendChild(p);
          };

          drawMarker(maxMarker);
          drawMarker(currentValue);
          drawMarker(minMarker);
        }
        return;
      }

      if (!showScale) return;

      const outerPath = svgEl.querySelector("path.outer");
      let bbox = null;
      try { bbox = outerPath?.getBBox?.() || null; } catch (_) { bbox = null; }

      const strokeWAttr = outerPath?.getAttribute?.("stroke-width");
      const strokeW = Number(strokeWAttr) || 3.2;

      const pad = 8;
      const leftEdge = bbox ? (bbox.x - strokeW / 2) : 15;

      const x2 = Math.max(0, leftEdge - pad);
      const xMajor1 = Math.max(0, x2 - 14);
      const xMinor1 = Math.max(0, x2 - 8);
      const xLabel = Math.max(0, xMajor1 - 8);

      let minS = Number(this._config.min ?? -20);
      let maxS = Number(this._config.max ?? 40);
      if (!Number.isFinite(minS)) minS = -20;
      if (!Number.isFinite(maxS)) maxS = 40;
      if (maxS < minS) [minS, maxS] = [maxS, minS];

      const range = (maxS - minS) || 1;

      const topY = 26;
      const bottomY = 208;
      const usable = bottomY - topY;

      const majorStep = 10;
      const minorStep = 2;

      const posY = (v) => {
        const t = clamp01((v - minS) / range);
        return topY + (1 - t) * usable;
      };

      const start = Math.ceil(minS / minorStep) * minorStep;
      const end = Math.floor(maxS / minorStep) * minorStep;

      const NS = "http://www.w3.org/2000/svg";

      const mode = String(this._config.scale_color_mode || "per_interval");
      const currentValue = this._getStateValue(this._config.entity);
      const activeInterval = (currentValue == null) ? null : normalizeInterval(this._findIntervalForValue(currentValue));
      const activeScaleColor = normalizeHex(activeInterval?.scale_color, "#ffffff");

      const tickColorFor = (tickValue) => {
        if (mode === "active_interval") return activeScaleColor;
        const itTick = normalizeInterval(this._findIntervalForValue(tickValue));
        return normalizeHex(itTick?.scale_color, "#ffffff");
      };

      for (let v = start; v <= end + 1e-9; v += minorStep) {
        const y = posY(v);
        const isMajor = Math.abs(v / majorStep - Math.round(v / majorStep)) < 1e-9;

        const c = tickColorFor(v);

        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", String(isMajor ? xMajor1 : xMinor1));
        line.setAttribute("y1", String(y));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(y));
        line.setAttribute("stroke", c);
        line.setAttribute("stroke-opacity", String(isMajor ? 0.92 : 0.55));
        line.setAttribute("stroke-width", String(isMajor ? 2.8 : 1.6));
        line.setAttribute("stroke-linecap", "round");
        layer.appendChild(line);

        if (isMajor) {
          const text = document.createElementNS(NS, "text");
          text.setAttribute("x", String(xLabel));
          text.setAttribute("y", String(y + 4));
          text.setAttribute("fill", c);
          text.setAttribute("fill-opacity", "0.90");
          text.setAttribute("font-size", "12");
          text.setAttribute("font-weight", "900");
          text.setAttribute("text-anchor", "end");
          text.textContent = String(v);
          layer.appendChild(text);
        }
      }

      // Optional scale markers (clean, subtle arrows on the left)
      if (showMarkers) {
        const arrowTipX = xMinor1 + 1; // point towards tick
        const arrowBaseX = Math.max(0, arrowTipX - 7);
        const arrowH = 6; // small + discreet

        const colorForValue = (val) => {
          const it = normalizeInterval(this._findIntervalForValue(val));
          return normalizeHex(it?.color, "#ffffff");
        };

        const mkArrow = (val, color, y) => {
          const p = document.createElementNS(NS, "path");
          // small triangle pointing right
          const d = `M ${arrowBaseX} ${y - arrowH/2} L ${arrowBaseX} ${y + arrowH/2} L ${arrowTipX} ${y} Z`;
          p.setAttribute("d", d);
          p.setAttribute("fill", color);
          p.setAttribute("fill-opacity", "0.95");
          return p;
        };

        // Current
        if (currentValue != null && Number.isFinite(currentValue)) {
          const yc = posY(currentValue);
          layer.appendChild(mkArrow(currentValue, colorForValue(currentValue), yc));
        }

        // Min / Max from stats (if available)
        const st = this._stats;
        if (st && st.min != null && Number.isFinite(st.min)) {
          const yMin = posY(st.min);
          layer.appendChild(mkArrow(st.min, colorForValue(st.min), yMin));
        }
        if (st && st.max != null && Number.isFinite(st.max)) {
          const yMax = posY(st.max);
          layer.appendChild(mkArrow(st.max, colorForValue(st.max), yMax));
        }
      }

    } catch (e) {
      console.warn("Andy Temperature Card v1.0.8: scale DOM draw failed", e);
    }
  }

  render() {
    if (!this._config || !this.hass) return html``;

    const value = this._getStateValue(this._config.entity);
    const name = this._config.name ?? "Temperature";
    const unit = this._getUnit();

    if (value === null) {
      return html`
        <ha-card>
          <div class="wrap">
            <div class="title">${name}</div>
            <div class="sub">Entity not available</div>
          </div>
        </ha-card>
      `;
    }

    const decimals = Number(this._config.decimals ?? 1);
    const shown = fmtNum(value, decimals) ?? String(value);

    const vp = String(this._config.value_position || "top_right");
    const namePos = String(this._config.name_position || "auto");
    const showHeaderValue = (vp === "top_right" || vp === "top_center" || vp === "top_left");

    const headerClasses = ["header"];
    if (vp === "top_center" && (namePos === "auto" || namePos === "center")) {
      headerClasses.push("top_center");
    }
    if (vp === "top_left") {
      headerClasses.push("top_left");
    }
    const headerClassStr = headerClasses.join(" ");

    const showBottomValue = (vp === "bottom_right" || vp === "bottom_center" || vp === "bottom_left");
    const showInsideValue = (vp === "inside");
    const interval = normalizeInterval(this._findIntervalForValue(value));
    const valueColor = normalizeHex(interval.value_color, "#ffffff");

    const valueStyleBase = (this._config.value_font_size && Number(this._config.value_font_size) > 0)
      ? `font-size:${Number(this._config.value_font_size)}px;`
      : "";
    const valueStyle = `${valueStyleBase}color:${valueColor};`;

    const nameStyle = (this._config.name_font_size && Number(this._config.name_font_size) > 0)
      ? `font-size:${Number(this._config.name_font_size)}px;`
      : "";

    const neon = (() => {
      const n = Number(interval.neon ?? 0);
      const v = Number.isFinite(n) ? n : 0;
      return Math.max(0, Math.round(v * 10) / 10);
    })();
    const neonColor = normalizeHex(interval.outline, "#ffffff"); // neon follows outline

    const vOffX = Number(this._config.value_position_offset_x ?? 0);
    const vOffY = Number(this._config.value_position_offset_y ?? 0);
    const vOffXn = Number.isFinite(vOffX) ? vOffX : 0;
    const vOffYn = Number.isFinite(vOffY) ? vOffY : 0;

    const showStats = !!this._config.show_stats;
    const stats = this._stats || { min: null, avg: null, max: null, samples: 0 };

    const isHorizontal = (this._config.orientation === "horizontal");

    const cardScale = Number(this._config.card_scale ?? 1);
    const resizeNeon = (this._config.resize_card_on_neon ?? false);
    const neonPadX = resizeNeon ? Math.min(18, (neon || 0) * 8) : 0;
    const neonPadY = resizeNeon ? Math.min(12, (neon || 0) * 5) : 0;
    const scaleVarStyle = `--asc-scale:${cardScale};--asc-neon:${neon};--asc-neon-color:${neonColor};--asc-neon-outline:${neonColor};--asc-neon-pad-x:${neonPadX}px;--asc-neon-pad-y:${neonPadY}px;--asc-val-off-x:${vOffXn}px;--asc-val-off-y:${vOffYn}px;`;
    const cardModStyle = getCardModStyleText(this._config?.card_mod);

    return html`
      ${cardModStyle ? html`<style>${cardModStyle}</style>` : ""}
      <ha-card @click=${this._openMoreInfo} style="cursor:pointer;">
        <div class="wrap ${isHorizontal ? "orient-horizontal" : "orient-vertical"}" style="${scaleVarStyle}">
          <div class="rotator">
            <div class="${headerClassStr}">
              ${namePos === "center" && vp !== "top_center"
                ? html`
                    <div class="title" style="text-align:center; width:100%; ${nameStyle}">
                      ${name}
                    </div>
                  `
                : html`
                    <div class="title" style="${nameStyle}">${name}</div>
                  `}
              ${showHeaderValue ? html`
                <div class="value" style="${valueStyle}">
                  ${shown}${unit ? html`<span class="unit">${unit}</span>` : ""}
                </div>
              ` : ""}
            </div>

            <div class="iconRow ${this._hasExtras("right") ? "hasExtras" : ""}">
              <div class="iconWrap variant-${this._getSymbolVariant()}">
                ${this._thermoSvg({ value, interval })}
                ${showInsideValue ? html`
                  <div class="value inside" style="${valueStyle}">
                    ${shown}${unit ? html`<span class="unit">${unit}</span>` : ""}
                  </div>
                ` : ""}
              </div>

              ${this._renderExtraValues("right")}
            </div>

            ${this._renderExtraValues("below")}

            ${this._config.show_graph ? this._renderGraph() : ""}

            ${showBottomValue ? html`
              <div class="bottom ${vp}">
                <div class="value" style="${valueStyle}">
                  ${shown}${unit ? html`<span class="unit">${unit}</span>` : ""}
                </div>
              </div>
            ` : ""}

            ${showStats ? this._renderStatsRow(stats, decimals, unit) : ""}
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderStatsRow(stats, decimals, unit) {
    const m = fmtNum(stats.min, decimals) ?? "—";
    const a = fmtNum(stats.avg, decimals) ?? "—";
    const x = fmtNum(stats.max, decimals) ?? "—";
    const u = unit || "";
    return html`
      <div class="statsRow">
        <span>Min: ${m}${u}</span>
        <span>Avg: ${a}${u}</span>
        <span>Max: ${x}${u}</span>
      </div>
    `;
  }

  _renderGraph() {
    if (!this._config?.show_graph) return "";

    const base = Array.isArray(this._series) ? normalizeTimeSeries(this._series) : null;
    if (!base || !base.length) {
      return html`
        <div class="graphWrap" style="height:${this._config.graph_height}px;">
          <div class="graphEmpty">No history</div>
        </div>
      `;
    }

    try {
      let s = base;
      if (s.length === 1) {
        const p = base[0];
        const t2 = p.t + 60 * 60 * 1000;
        s = [
          { t: p.t, v: p.v },
          { t: t2, v: p.v },
        ];
      }

      const heightPx = Number(this._config.graph_height ?? 58);
      const height = Number.isFinite(heightPx) ? heightPx : 58;

      const W = 260;
      const H = 60;
      const padL = 8;
      const padR = 8;
      const padT = 6;
      const padB = 8;

      const innerW = W - padL - padR;
      const innerH = H - padT - padB;

      const t0 = s[0].t;
      const t1 = s[s.length - 1].t;
      const dt = (t1 - t0) || 1;

      let yMin = s[0].v;
      let yMax = s[0].v;
      for (const p of s) {
        if (p.v < yMin) yMin = p.v;
        if (p.v > yMax) yMax = p.v;
      }
      if (Math.abs(yMax - yMin) < 0.001) {
        yMin -= 1;
        yMax += 1;
      }

      const xFor = (t) => padL + ((t - t0) / dt) * innerW;
      const yFor = (v) => {
        const t = clamp01((v - yMin) / (yMax - yMin));
        return padT + (1 - t) * innerH;
      };

      const pts = s.map((p) => ({ x: xFor(p.t), y: yFor(p.v) }));
      const pathD = buildSmoothPath(pts);
      const baseY = padT + innerH;
      const firstX = pts[0].x;
      const lastX = pts[pts.length - 1].x;
      const areaD = `${pathD} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

      const last = s[s.length - 1];
      const it = normalizeInterval(this._findIntervalForValue(last.v));
      const c = normalizeHex(it.scale_color || it.color, "#ffffff");

      const lw = Number(this._config.graph_line_width ?? 1.0);
      const strokeW = Number.isFinite(lw) ? lw : 1.0;

      const showTimeTicks = this._config.graph_show_time !== false;
      const hostWidth = Number(this.clientWidth || this.offsetWidth || 0);
      const compactTickLabels = hostWidth > 0 && hostWidth < 185;
      const ticks = [];
      if (showTimeTicks && dt > 0) {
        const count = compactTickLabels ? 3 : 4;
        for (let i = 0; i <= count; i++) {
          const frac = i / count;
          const tTick = t0 + frac * dt;
          ticks.push({ t: tTick, label: compactTickLabels ? toLocalHH(tTick) : toLocalHHMM(tTick) });
        }
      }

      return html`
        <div class="graphWrap" style="height:${height + (showTimeTicks && ticks.length ? (compactTickLabels ? 14 : 18) : 0)}px;">
          <div class="graphInner">
            <svg
              class="graph"
              viewBox="0 0 ${W} ${H}"
              preserveAspectRatio="none"
              role="img"
              aria-label="History graph"
            >
              <defs>
                <linearGradient id="gFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="${c}" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="${c}" stop-opacity="0" />
                </linearGradient>
              </defs>

              <rect
                x="0"
                y="0"
                width="${W}"
                height="${H}"
                rx="10"
                ry="10"
                fill="none"
                stroke="none"
              />

              <path
                d="${areaD}"
                fill="url(#gFill)"
                stroke="none"
              />

              <path
                d="${pathD}"
                fill="none"
                stroke="${c}"
                stroke-width="${strokeW}"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <circle
                cx="${lastX}"
                cy="${yFor(last.v)}"
                r="2.6"
                fill="${c}"
                stroke="rgba(0,0,0,0.18)"
                stroke-width="1"
              />
            </svg>

            ${showTimeTicks && ticks.length
              ? html`
                  <div class="graphTicks">
                    <div class="graphTicksLabels">
                      ${ticks.map((ti) => html`<span>${ti.label}</span>`)}
                    </div>
                  </div>
                `
              : ""}
          </div>
        </div>
      `;
    } catch (e) {
      console.error("Andy Temp v1.0.8 _renderGraph error", e);
      return html`
        <div class="graphWrap" style="height:${this._config.graph_height}px;">
          <div class="graphEmpty">Graph error</div>
        </div>
      `;
    }
  }

  _thermoSvgBoard(opts) {
    const { value, interval } = opts;
    const it = normalizeInterval(interval);
    if (!this._boardSvgUid) this._boardSvgUid = uid("board");
    const svgUid = this._boardSvgUid;
    const idBg = `${svgUid}_bg`;
    const idGlass = `${svgUid}_glass`;
    const idLiquid = `${svgUid}_liquid`;
    const idGloss = `${svgUid}_liquidGlossGrad`;
    const idShimmer = `${svgUid}_liquidShimmerGrad`;
    const idScan = `${svgUid}_liquidScanGrad`;
    const idPulse = `${svgUid}_pulseGlowGrad`;
    const idBreathe = `${svgUid}_liquidBreatheGrad`;
    const idTubeClip = `${svgUid}_tubeClip`;
    const neon = (() => {
      const n = Number(it.neon ?? 0);
      const v = Number.isFinite(n) ? n : 0;
      return Math.max(0, Math.round(v * 10) / 10);
    })();
    const useGradient = !!it.gradient?.enabled;
    const cSolid = normalizeHex(it.color, "#22c55e");
    const gFrom = normalizeHex(it.gradient?.from, cSolid);
    const gTo = normalizeHex(it.gradient?.to, gFrom);
    const boardBg = normalizeHex(this._config?.board_background_color, "#e4e4e4");
    const showBoardBackground = this._config?.board_background_visible !== false;
    const useBoardGradient = this._config?.board_background_gradient !== false;
    const boardBgLight = mixHex(boardBg, "#ffffff", 0.45);
    const boardBgMid = mixHex(boardBg, "#ffffff", 0.18);
    const boardBgDark = mixHex(boardBg, "#8c8c8c", 0.28);
    const activeLiquidEffect = this._getIntervalLiquidEffect(it);
    const showLiquidEffect = activeLiquidEffect !== "none";

    const { minC: displayMin, maxC: displayMax } = this._getBoardScaleRangeC();
    const boardScaleMode = String(this._config.scale_color_mode || "per_interval");
    const activeScaleColor = normalizeHex(it?.scale_color, "#ffffff");
    const boardTickColorFor = (tickValueC) => {
      if (boardScaleMode === "active_interval") return activeScaleColor;
      const tickValue = this._boardCelsiusToSource(tickValueC);
      const tickInterval = normalizeInterval(this._findIntervalForValue(tickValue));
      return normalizeHex(tickInterval?.scale_color, "#ffffff");
    };
    const boardHeadingColor = boardTickColorFor(displayMax);
    const tubeTop = 74;
    const tubeBottom = 499;
    const scaleTop = 90;
    const scaleBottom = 522;
    const valueC = this._boardValueToCelsius(value);
    const pScaled = clamp01(((Number.isFinite(valueC) ? valueC : Number(value)) - displayMin) / ((displayMax - displayMin) || 1));
    const liquidTop = scaleTop + (1 - pScaled) * (scaleBottom - scaleTop);
    const liquidHeight = Math.max(0, 570 - liquidTop);
    const showScale = false;
    const boardLiquidSegments = this._buildLiquidSegments({
      minValue: displayMin,
      maxValue: displayMax,
      currentValue: Number.isFinite(valueC) ? valueC : value,
      fillTop: tubeTop,
      fillBottom: 570,
      positionTop: scaleTop,
      positionBottom: scaleBottom,
      renderBottom: 570,
      x: 0,
      width: 220,
      defsPrefix: `${svgUid}_board`,
    });

    const glossOpacity = activeLiquidEffect === "gloss" ? 0.65 : activeLiquidEffect === "breathe" ? 0.24 : 0.16;
    const shimmerOpacity = activeLiquidEffect === "shimmer" ? 0.82 : 0;
    const pulseOpacity = activeLiquidEffect === "pulse" ? Math.min(0.22 + (neon * 0.016), 0.42) : 0;
    const scanOpacity = activeLiquidEffect === "scan" ? 0.9 : 0;
    const breatheOpacity = activeLiquidEffect === "breathe" ? 0.34 : 0;

    return svg`
      <svg class="thermo variant-board effect-${activeLiquidEffect}" style="overflow: visible; --thermo-w: clamp(92px, 22vw, 118px); --thermo-h: clamp(258px, 62vw, 334px);" viewBox="0 0 220 620" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Temperature">
          <defs>
            <linearGradient id="${idBg}" x1="0" x2="1">
              <stop offset="0" stop-color="${boardBgLight}"></stop>
              <stop offset="0.5" stop-color="${boardBgMid}"></stop>
              <stop offset="1" stop-color="${boardBgDark}"></stop>
            </linearGradient>
          <linearGradient id="${idGlass}" x1="0" x2="1">
            <stop offset="0" stop-color="#ffffff" stop-opacity="0.9"></stop>
            <stop offset="0.45" stop-color="#8f99a3" stop-opacity="0.35"></stop>
            <stop offset="1" stop-color="#ffffff" stop-opacity="0.7"></stop>
          </linearGradient>
          <linearGradient id="${idLiquid}" x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stop-color="${gFrom}"></stop>
            <stop offset="100%" stop-color="${gTo}"></stop>
          </linearGradient>
          ${boardLiquidSegments.defs}
          <linearGradient id="${idGloss}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.92"></stop>
            <stop offset="32%" stop-color="#FFFFFF" stop-opacity="0.28"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </linearGradient>
          <linearGradient id="${idShimmer}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"></stop>
            <stop offset="48%" stop-color="#FFFFFF" stop-opacity="0.12"></stop>
            <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95"></stop>
            <stop offset="52%" stop-color="#FFFFFF" stop-opacity="0.12"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </linearGradient>
          <linearGradient id="${idScan}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"></stop>
            <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </linearGradient>
          <radialGradient id="${idPulse}" cx="50%" cy="78%" r="52%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.45"></stop>
            <stop offset="60%" stop-color="#FFFFFF" stop-opacity="0.12"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </radialGradient>
          <radialGradient id="${idBreathe}" cx="50%" cy="40%" r="68%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.82"></stop>
            <stop offset="42%" stop-color="#FFFFFF" stop-opacity="0.26"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </radialGradient>
          <clipPath id="${idTubeClip}">
            <rect x="99" y="74" width="22" height="425" rx="11"></rect>
            <circle cx="110" cy="526" r="42"></circle>
          </clipPath>
        </defs>

          <rect
            x="22"
            y="6"
            width="176"
            height="600"
            rx="16"
            fill="${showBoardBackground ? (useBoardGradient ? `url(#${idBg})` : boardBg) : "transparent"}"
          ></rect>

        ${showScale ? svg`
            <text x="50" y="52" font-size="28" font-family="Arial" fill="${boardHeadingColor}">°F</text>
            <text x="145" y="52" font-size="28" font-family="Arial" fill="${boardHeadingColor}">°C</text>

          <g font-family="Arial" font-size="18" fill="#333" text-anchor="end">
            <text x="74" y="96">122</text>
            <text x="74" y="144">104</text>
            <text x="74" y="192">86</text>
            <text x="74" y="240">68</text>
            <text x="74" y="288">50</text>
            <text x="74" y="336">32</text>
            <text x="74" y="384">14</text>
            <text x="74" y="432">-4</text>
            <text x="74" y="480">-22</text>
          </g>

          <g font-family="Arial" font-size="18" fill="#333" text-anchor="start">
            <text x="158" y="96">50</text>
            <text x="158" y="144">40</text>
            <text x="158" y="192">30</text>
            <text x="158" y="240">20</text>
            <text x="158" y="288">10</text>
            <text x="158" y="336">0</text>
            <text x="158" y="384">-10</text>
            <text x="158" y="432">-20</text>
            <text x="158" y="480">-30</text>
          </g>

          <g stroke="#333" stroke-width="1.5">
            <line x1="78" y1="90" x2="94" y2="90"></line>
            <line x1="78" y1="138" x2="94" y2="138"></line>
            <line x1="78" y1="186" x2="94" y2="186"></line>
            <line x1="78" y1="234" x2="94" y2="234"></line>
            <line x1="78" y1="282" x2="94" y2="282"></line>
            <line x1="78" y1="330" x2="94" y2="330"></line>
            <line x1="78" y1="378" x2="94" y2="378"></line>
            <line x1="78" y1="426" x2="94" y2="426"></line>
            <line x1="78" y1="474" x2="94" y2="474"></line>

            <line x1="126" y1="90" x2="142" y2="90"></line>
            <line x1="126" y1="138" x2="142" y2="138"></line>
            <line x1="126" y1="186" x2="142" y2="186"></line>
            <line x1="126" y1="234" x2="142" y2="234"></line>
            <line x1="126" y1="282" x2="142" y2="282"></line>
            <line x1="126" y1="330" x2="142" y2="330"></line>
            <line x1="126" y1="378" x2="142" y2="378"></line>
            <line x1="126" y1="426" x2="142" y2="426"></line>
            <line x1="126" y1="474" x2="142" y2="474"></line>
          </g>

          <g stroke="#333" stroke-width="1">
            <line x1="84" y1="102" x2="94" y2="102"></line><line x1="126" y1="102" x2="136" y2="102"></line>
            <line x1="84" y1="114" x2="94" y2="114"></line><line x1="126" y1="114" x2="136" y2="114"></line>
            <line x1="84" y1="126" x2="94" y2="126"></line><line x1="126" y1="126" x2="136" y2="126"></line>
            <line x1="84" y1="150" x2="94" y2="150"></line><line x1="126" y1="150" x2="136" y2="150"></line>
            <line x1="84" y1="162" x2="94" y2="162"></line><line x1="126" y1="162" x2="136" y2="162"></line>
            <line x1="84" y1="174" x2="94" y2="174"></line><line x1="126" y1="174" x2="136" y2="174"></line>
            <line x1="84" y1="198" x2="94" y2="198"></line><line x1="126" y1="198" x2="136" y2="198"></line>
            <line x1="84" y1="210" x2="94" y2="210"></line><line x1="126" y1="210" x2="136" y2="210"></line>
            <line x1="84" y1="222" x2="94" y2="222"></line><line x1="126" y1="222" x2="136" y2="222"></line>
            <line x1="84" y1="246" x2="94" y2="246"></line><line x1="126" y1="246" x2="136" y2="246"></line>
            <line x1="84" y1="258" x2="94" y2="258"></line><line x1="126" y1="258" x2="136" y2="258"></line>
            <line x1="84" y1="270" x2="94" y2="270"></line><line x1="126" y1="270" x2="136" y2="270"></line>
            <line x1="84" y1="294" x2="94" y2="294"></line><line x1="126" y1="294" x2="136" y2="294"></line>
            <line x1="84" y1="306" x2="94" y2="306"></line><line x1="126" y1="306" x2="136" y2="306"></line>
            <line x1="84" y1="318" x2="94" y2="318"></line><line x1="126" y1="318" x2="136" y2="318"></line>
            <line x1="84" y1="342" x2="94" y2="342"></line><line x1="126" y1="342" x2="136" y2="342"></line>
            <line x1="84" y1="354" x2="94" y2="354"></line><line x1="126" y1="354" x2="136" y2="354"></line>
            <line x1="84" y1="366" x2="94" y2="366"></line><line x1="126" y1="366" x2="136" y2="366"></line>
            <line x1="84" y1="390" x2="94" y2="390"></line><line x1="126" y1="390" x2="136" y2="390"></line>
            <line x1="84" y1="402" x2="94" y2="402"></line><line x1="126" y1="402" x2="136" y2="402"></line>
            <line x1="84" y1="414" x2="94" y2="414"></line><line x1="126" y1="414" x2="136" y2="414"></line>
          </g>
        ` : ""}

        <rect x="96" y="70" width="28" height="436" rx="14" fill="url(#${idGlass})" stroke="#9ea4aa" stroke-width="4"></rect>
        <circle cx="110" cy="526" r="46" fill="url(#${idGlass})" stroke="#9ea4aa" stroke-width="4"></circle>

        <g clip-path="url(#${idTubeClip})">
          <rect class="liquid liquid-effect-${activeLiquidEffect}" x="0" y="${liquidTop}" width="220" height="${liquidHeight}" fill="${useGradient ? `url(#${idLiquid})` : cSolid}" opacity="0.98"></rect>
          ${this._getLiquidColorMode() === "per_interval" ? boardLiquidSegments.shapes : ""}
          ${showLiquidEffect ? svg`
            <rect class="liquidFxGloss" x="103" y="${liquidTop}" width="7" height="${Math.max(36, 570 - liquidTop)}" fill="url(#${idGloss})" opacity="${glossOpacity}"></rect>
            <rect class="liquidFxShimmer" x="96" y="${Math.max(74, liquidTop - 18)}" width="28" height="${Math.max(36, 560 - liquidTop)}" fill="url(#${idShimmer})" opacity="${shimmerOpacity}"></rect>
            <rect class="liquidFxScan" x="99" y="${Math.max(74, liquidTop - 10)}" width="22" height="28" fill="url(#${idScan})" opacity="${scanOpacity}"></rect>
            <circle class="liquidFxPulse" cx="110" cy="526" r="34" fill="url(#${idPulse})" opacity="${pulseOpacity}"></circle>
            <rect class="liquidFxBreathe" x="99" y="${Math.max(74, liquidTop - 8)}" width="22" height="${Math.max(36, 560 - liquidTop)}" fill="url(#${idBreathe})" opacity="${breatheOpacity}"></rect>
          ` : ""}
        </g>

        <path d="M103 82 C101 150 101 360 103 495" fill="none" stroke="white" stroke-width="5" opacity="0.55"></path>
        <circle cx="96" cy="510" r="22" fill="white" opacity="0.25"></circle>
        <g class="scale-layer" style="pointer-events:none;" shape-rendering="crispEdges"></g>
      </svg>
    `;
  }

  _thermoSvg(opts) {
    const { value, interval } = opts;
    const variant = this._getSymbolVariant();
    if (variant === "board") {
      return this._thermoSvgBoard({ value, interval });
    }

    const it = normalizeInterval(interval);
    const neon = (() => {
      const n = Number(it.neon ?? 0);
      const v = Number.isFinite(n) ? n : 0;
      return Math.max(0, Math.round(v * 10) / 10);
    })();
    const neonOutline = normalizeHex(it.outline, "#ffffff");
    const useGradient = !!it.gradient?.enabled;
    const cSolid = normalizeHex(it.color, "#22c55e");
    const outline = normalizeHex(it.outline, "#ffffff");
    const inline = normalizeHex(it.inline, outline);
    const gFrom = normalizeHex(it.gradient?.from, cSolid);
    const gTo = normalizeHex(it.gradient?.to, gFrom);
    const symbolStyle = normalizeChoice(this._config?.symbol_style, SYMBOL_STYLES, "classic");
    const isClassic = symbolStyle === "classic";
    const showStyleLayers = !isClassic;
    const activeLiquidEffect = this._getIntervalLiquidEffect(it);
    const showLiquidEffect = activeLiquidEffect !== "none";

    let minS = Number(this._config.min ?? -20);
    let maxS = Number(this._config.max ?? 40);
    if (!Number.isFinite(minS)) minS = -20;
    if (!Number.isFinite(maxS)) maxS = 40;
    if (maxS < minS) [minS, maxS] = [maxS, minS];

    const range = (maxS - minS) || 1;
    const pScaled = clamp01((Number(value) - minS) / range);

    const SCALE_TOP = 26;
    const SCALE_BOTTOM = 208;

    let yTop = SCALE_TOP + (1 - pScaled) * (SCALE_BOTTOM - SCALE_TOP);
    yTop = Math.max(0, Math.min(220, yTop));
    const classicLiquidSegments = this._buildLiquidSegments({
      minValue: minS,
      maxValue: maxS,
      currentValue: value,
      fillTop: 0,
      fillBottom: 220,
      x: 120,
      width: 100,
      defsPrefix: "classic",
    });

    const shellPath = "M160 10 C144 10 131 23 131 39 V135 C121 147 116 157 116 170 C116 200 140 220 160 220 C180 220 204 200 204 170 C204 157 199 147 189 135 V39 C189 23 176 10 160 10 Z";
    const tubePath = "M160 18 C149 18 140 27 140 38 V138 C131 145 126 156 126 168 C126 191 145 208 160 208 C175 208 194 191 194 168 C194 156 189 145 180 138 V38 C180 27 171 18 160 18 Z";
    const stylePreset = {
      classic: {
        outerFill: "rgba(255,255,255,0.06)",
        tubeBg: "rgba(255,255,255,0.03)",
        outerOpacity: 0.95,
        outerStrokeWidth: 3.2,
        innerStrokeWidth: 2.1,
        shellGlassOpacity: 0.08,
        shellFrostOpacity: 0.00,
        tubeSheenOpacity: 0.08,
        liquidGlossOpacity: 0.06,
        shadowDy: 8,
        shadowStd: 10,
      },
      clean: {
        outerFill: "rgba(255,255,255,0.05)",
        tubeBg: "rgba(255,255,255,0.025)",
        outerOpacity: 0.9,
        outerStrokeWidth: 2.8,
        innerStrokeWidth: 1.8,
        shellGlassOpacity: 0.12,
        shellFrostOpacity: 0.00,
        tubeSheenOpacity: 0.12,
        liquidGlossOpacity: 0.12,
        shadowDy: 7,
        shadowStd: 9,
      },
      glass: {
        outerFill: "rgba(255,255,255,0.09)",
        tubeBg: "rgba(255,255,255,0.05)",
        outerOpacity: 0.92,
        outerStrokeWidth: 3.0,
        innerStrokeWidth: 1.9,
        shellGlassOpacity: 0.22,
        shellFrostOpacity: 0.00,
        tubeSheenOpacity: 0.22,
        liquidGlossOpacity: 0.18,
        shadowDy: 10,
        shadowStd: 12,
      },
      frosted: {
        outerFill: "rgba(255,255,255,0.12)",
        tubeBg: "rgba(255,255,255,0.06)",
        outerOpacity: 0.9,
        outerStrokeWidth: 2.9,
        innerStrokeWidth: 1.8,
        shellGlassOpacity: 0.10,
        shellFrostOpacity: 0.18,
        tubeSheenOpacity: 0.10,
        liquidGlossOpacity: 0.08,
        shadowDy: 8,
        shadowStd: 11,
      },
      minimal: {
        outerFill: "rgba(255,255,255,0.03)",
        tubeBg: "rgba(255,255,255,0.015)",
        outerOpacity: 0.88,
        outerStrokeWidth: 2.4,
        innerStrokeWidth: 1.45,
        shellGlassOpacity: 0.06,
        shellFrostOpacity: 0.00,
        tubeSheenOpacity: 0.05,
        liquidGlossOpacity: 0.05,
        shadowDy: 6,
        shadowStd: 8,
      },
      aurora: {
        outerFill: "rgba(255,255,255,0.07)",
        tubeBg: "rgba(255,255,255,0.04)",
        outerOpacity: 0.94,
        outerStrokeWidth: 3.0,
        innerStrokeWidth: 1.9,
        shellGlassOpacity: 0.18,
        shellFrostOpacity: 0.00,
        tubeSheenOpacity: 0.20,
        liquidGlossOpacity: 0.20,
        shadowDy: 10,
        shadowStd: 13,
      },
      neon_modern: {
        outerFill: "rgba(255,255,255,0.04)",
        tubeBg: "rgba(255,255,255,0.025)",
        outerOpacity: 0.96,
        outerStrokeWidth: 3.0,
        innerStrokeWidth: 2.0,
        shellGlassOpacity: 0.14,
        shellFrostOpacity: 0.00,
        tubeSheenOpacity: 0.16,
        liquidGlossOpacity: 0.12,
        shadowDy: 10,
        shadowStd: 14,
      },
    }[symbolStyle];

    const outerFill = stylePreset.outerFill;
    const tubeBg = stylePreset.tubeBg;
    const shellGlassOpacity = showStyleLayers ? stylePreset.shellGlassOpacity : 0;
    const shellFrostOpacity = showStyleLayers ? stylePreset.shellFrostOpacity : 0;
    const tubeSheenOpacity = showStyleLayers ? stylePreset.tubeSheenOpacity : 0;
    const baseLiquidGlossOpacity = stylePreset.liquidGlossOpacity;
    const shimmerOpacity = activeLiquidEffect === "shimmer" ? (symbolStyle === "glass" ? 0.38 : 0.30) : 0;
    const pulseOpacity = activeLiquidEffect === "pulse" ? Math.min(0.22 + (neon * 0.016), 0.42) : 0;
    const scanOpacity = activeLiquidEffect === "scan" ? (symbolStyle === "aurora" ? 0.32 : 0.26) : 0;
    const breatheOpacity = activeLiquidEffect === "breathe" ? (isClassic ? 0.18 : 0.22) : 0;
    const glossWidth = activeLiquidEffect === "gloss" ? 44 : 34;
    const glossX = activeLiquidEffect === "gloss" ? 126 : 130;
    const shimmerWidth = activeLiquidEffect === "shimmer" ? 96 : 74;
    const shimmerX = activeLiquidEffect === "shimmer" ? 108 : 118;
    const liquidGlossOpacity =
      activeLiquidEffect === "gloss"
        ? Math.max(baseLiquidGlossOpacity, symbolStyle === "glass" ? 0.48 : 0.40)
        : activeLiquidEffect === "pulse"
          ? Math.max(baseLiquidGlossOpacity * 0.95, isClassic ? 0.12 : 0.16)
          : activeLiquidEffect === "shimmer"
            ? Math.max(baseLiquidGlossOpacity * 0.9, isClassic ? 0.12 : 0.16)
            : activeLiquidEffect === "scan"
              ? Math.max(baseLiquidGlossOpacity * 0.75, isClassic ? 0.08 : 0.11)
              : activeLiquidEffect === "breathe"
                ? Math.max(baseLiquidGlossOpacity, isClassic ? 0.14 : 0.18)
                : 0;

    const thermoVB = `0 0 220 230`;

    return html`
      <svg class="thermo style-${symbolStyle} effect-${activeLiquidEffect}" style="overflow: visible;" viewBox="${thermoVB}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Temperature">
        <defs>
          <linearGradient id="liquidGrad" x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stop-color="${gFrom}"></stop>
            <stop offset="100%" stop-color="${gTo}"></stop>
          </linearGradient>
          ${classicLiquidSegments.defs}
          <linearGradient id="shellGlassGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85"></stop>
            <stop offset="35%" stop-color="#FFFFFF" stop-opacity="0.22"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </linearGradient>
          <linearGradient id="tubeSheenGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.34"></stop>
            <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.10"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </linearGradient>
          <linearGradient id="liquidGlossGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.65"></stop>
            <stop offset="35%" stop-color="#FFFFFF" stop-opacity="0.18"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </linearGradient>
          <linearGradient id="liquidGlossStrongGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.92"></stop>
            <stop offset="22%" stop-color="#FFFFFF" stop-opacity="0.34"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </linearGradient>
          <linearGradient id="liquidShimmerGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"></stop>
            <stop offset="36%" stop-color="#FFFFFF" stop-opacity="0.08"></stop>
            <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.90"></stop>
            <stop offset="64%" stop-color="#FFFFFF" stop-opacity="0.08"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </linearGradient>
          <linearGradient id="liquidScanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"></stop>
            <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </linearGradient>
          <radialGradient id="liquidBreatheGrad" cx="50%" cy="40%" r="68%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.78"></stop>
            <stop offset="42%" stop-color="#FFFFFF" stop-opacity="0.24"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </radialGradient>
          <radialGradient id="pulseGlowGrad" cx="50%" cy="78%" r="52%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.45"></stop>
            <stop offset="60%" stop-color="#FFFFFF" stop-opacity="0.12"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"></stop>
          </radialGradient>
          <linearGradient id="frostGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.75"></stop>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.08"></stop>
          </linearGradient>

          <clipPath id="tubeClip">
            <path d="${tubePath}" />
          </clipPath>

          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="${stylePreset.shadowDy}" stdDeviation="${stylePreset.shadowStd}" flood-color="rgba(0,0,0,0.28)"/>
          </filter>
        </defs>

        <g class="${isClassic ? "" : "symbol"}" transform="translate(-50,0)">
          <path class="neonHalo3"
            d="${shellPath}"
            fill="none"
            stroke="${neonOutline}"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="${3.2 + (neon || 0) * 10}"
            stroke-opacity="${(neon || 0) > 0 ? 0.06 : 0}"/>
          <path class="neonHalo2"
            d="${shellPath}"
            fill="none"
            stroke="${neonOutline}"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="${3.2 + (neon || 0) * 6}"
            stroke-opacity="${(neon || 0) > 0 ? 0.10 : 0}"/>
          <path class="neonHalo1"
            d="${shellPath}"
            fill="none"
            stroke="${neonOutline}"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="${3.2 + (neon || 0) * 3}"
            stroke-opacity="${(neon || 0) > 0 ? 0.18 : 0}"/>

          <path class="outer"
            d="${shellPath}"
            fill="${outerFill}"
            stroke="${outline}"
            stroke-width="${stylePreset.outerStrokeWidth}"
            opacity="${stylePreset.outerOpacity}"
            filter="url(#shadow)"/>
          ${showStyleLayers ? svg`
            <path
              class="shellGlass"
              d="${shellPath}"
              fill="url(#shellGlassGrad)"
              opacity="${shellGlassOpacity}"
            />
            <path
              class="shellFrost"
              d="${shellPath}"
              fill="url(#frostGrad)"
              opacity="${shellFrostOpacity}"
            />
          ` : ""}

          <g clip-path="url(#tubeClip)">
            <rect x="120" y="0" width="100" height="220" fill="${tubeBg}"></rect>

            <rect class="liquid liquid-effect-${activeLiquidEffect}"
              x="120" y="${yTop}" width="100" height="${220 - yTop}"
              fill="${useGradient ? "url(#liquidGrad)" : cSolid}"
              opacity="0.98"></rect>
            ${this._getLiquidColorMode() === "per_interval" ? classicLiquidSegments.shapes : ""}
            ${showStyleLayers ? svg`
              <path
                class="tubeSheen"
                d="M146 22 C142 30 141 45 141 68 V140 C136 148 133 157 133 168 C133 183 143 196 154 203 C147 190 145 178 145 160 V74 C145 48 147 31 152 20 Z"
                fill="url(#tubeSheenGrad)"
                opacity="${tubeSheenOpacity}"
              ></path>
            ` : ""}
            ${showLiquidEffect ? svg`
              <rect
                class="liquidFxGloss"
                x="${glossX}"
                y="${yTop}"
                width="${glossWidth}"
                height="${220 - yTop}"
                fill="${activeLiquidEffect === "gloss" ? "url(#liquidGlossStrongGrad)" : "url(#liquidGlossGrad)"}"
                opacity="${liquidGlossOpacity}"
              ></rect>
              <rect
                class="liquidFxShimmer"
                x="${shimmerX}"
                y="${Math.max(0, yTop - 18)}"
                width="${shimmerWidth}"
                height="${Math.max(30, 240 - yTop)}"
                fill="url(#liquidShimmerGrad)"
                opacity="${shimmerOpacity}"
              ></rect>
              <rect
                class="liquidFxScan"
                x="120"
                y="${Math.max(0, yTop - 28)}"
                width="100"
                height="34"
                fill="url(#liquidScanGrad)"
                opacity="${scanOpacity}"
              ></rect>
              <circle
                class="liquidFxPulse"
                cx="160"
                cy="172"
                r="44"
                fill="url(#pulseGlowGrad)"
                opacity="${pulseOpacity}"
              ></circle>
              <rect
                class="liquidFxBreathe"
                x="122"
                y="${Math.max(0, yTop - 8)}"
                width="76"
                height="${Math.max(34, 230 - yTop)}"
                fill="url(#liquidBreatheGrad)"
                opacity="${breatheOpacity}"
              ></rect>
            ` : ""}
          </g>

          <path class="tubeBorder"
            d="${tubePath}"
            fill="none"
            stroke="${inline}"
            stroke-width="${stylePreset.innerStrokeWidth}"
            stroke-linejoin="round"
            stroke-linecap="round"
            opacity="1"/>
        </g>

        <g class="scale-layer" transform="translate(-50,0)" style="pointer-events:none;" shape-rendering="crispEdges"></g>
      </svg>
    `;
  }

  static get styles() {
    return css`
      :host { display:block; }
      ha-card { overflow: hidden; border-radius: 18px; }

      .wrap { overflow: visible; padding: 16px; }

      .wrap.orient-horizontal {
        display:flex;
        justify-content:center;
        align-items:center;
        min-height: 260px;
      }

      .wrap.orient-horizontal .rotator {
        transform: rotate(90deg);
        zoom: var(--asc-scale, 1);
        transform-origin: center;
      }
      .wrap.orient-vertical .rotator {
        zoom: var(--asc-scale, 1);
        transform-origin: top center;
      }

      .header { display:flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
      .header.top_center { justify-content:center; text-align:center; flex-direction:column; align-items:center; }
      .header.top_left { justify-content: space-between; flex-direction: row-reverse; align-items: baseline; gap: 12px; }

      .title { font-size: 14px; opacity: 0.9; letter-spacing: 0.2px; }
      .value { font-weight: 850; letter-spacing: 0.2px; font-size: clamp(14px, 4vw, 22px); line-height: 1.1; position: relative; left: var(--asc-val-off-x, 0px); top: var(--asc-val-off-y, 0px); }
      .unit { font-size: 12px; opacity: 0.75; margin-left: 4px; font-weight: 700; }

      .iconRow { display:flex; justify-content:center; padding-top: 6px; align-items:center; }
      .iconRow.hasExtras { gap: 0px; align-items: flex-start;}
      .iconWrap { position: relative; overflow: visible; display:flex; justify-content:center; align-items:center; padding: var(--asc-neon-pad-y, 0px) var(--asc-neon-pad-x, 0px); box-sizing: border-box; }

      .thermo { width: var(--thermo-w, clamp(210px, 62vw, 260px)); height: var(--thermo-h, clamp(150px, 34vw, 182px)); display:block; overflow: visible; }

      /* Neon glow (per active interval) */
      .thermo { filter: none; }
      .thermo .symbol {
        filter:
          drop-shadow(0 0 calc(var(--asc-neon, 0) * 1.5px) var(--asc-neon-color, rgba(255,255,255,0)))
          drop-shadow(0 0 calc(var(--asc-neon, 0) * 4px) var(--asc-neon-color, rgba(255,255,255,0)));
      }
      .thermo .outer {
        filter:
          drop-shadow(0 0 calc(var(--asc-neon, 0) * 2px) var(--asc-neon-outline, rgba(255,255,255,0)))
          drop-shadow(0 0 calc(var(--asc-neon, 0) * 6px) var(--asc-neon-color, rgba(255,255,255,0)));
      }
      .thermo .shellGlass,
      .thermo .shellFrost,
      .thermo .tubeSheen,
      .thermo .liquidFxGloss,
      .thermo .liquidFxShimmer,
      .thermo .liquidFxScan,
      .thermo .liquidFxBreathe,
      .thermo .liquidFxPulse {
        pointer-events: none;
      }
      .thermo .liquidFxGloss {
        mix-blend-mode: screen;
        filter: drop-shadow(0 0 2px rgba(255,255,255,0.18));
      }
      .thermo .liquidFxShimmer,
      .thermo .liquidFxScan,
      .thermo .liquidFxBreathe {
        mix-blend-mode: screen;
      }
      .thermo .liquid {
        transition: opacity 180ms ease, filter 180ms ease;
        transform-origin: center bottom;
        transform-box: fill-box;
      }
      .thermo.effect-gloss .liquid {
        filter:
          brightness(1.16)
          saturate(1.16)
          contrast(1.05)
          drop-shadow(0 0 7px rgba(255,255,255,0.14));
      }
      .thermo.effect-gloss .liquidFxGloss {
        filter:
          drop-shadow(0 0 4px rgba(255,255,255,0.20))
          drop-shadow(0 0 10px rgba(255,255,255,0.10));
      }
      .thermo.effect-shimmer .liquid {
        filter:
          brightness(1.08)
          saturate(1.18);
        animation: ascThermoLiquidShimmer 3.2s ease-in-out infinite;
      }
      .thermo.effect-pulse .liquid {
        animation: ascThermoLiquidPulse 2.6s ease-in-out infinite;
      }
      .thermo.effect-scan .liquid {
        animation: ascThermoLiquidScan 2.1s ease-in-out infinite;
      }
      .thermo.effect-breathe .liquid {
        animation: ascThermoLiquidBreathe 5.8s ease-in-out infinite;
      }
      .thermo.effect-shimmer .liquidFxShimmer {
        animation: ascThermoShimmer 3.2s linear infinite;
        transform-box: fill-box;
        transform-origin: center;
        filter:
          drop-shadow(0 0 4px rgba(255,255,255,0.18))
          drop-shadow(0 0 8px rgba(255,255,255,0.10));
      }
      .thermo.effect-pulse .liquidFxPulse,
      .thermo.effect-pulse .liquidFxGloss {
        animation: ascThermoPulse 2.6s ease-in-out infinite;
        transform-box: fill-box;
        transform-origin: center;
      }
      .thermo.effect-scan .liquidFxScan {
        animation: ascThermoScan 2.1s ease-in-out infinite;
        transform-box: fill-box;
        transform-origin: center;
      }
      .thermo.effect-breathe .liquidFxBreathe,
      .thermo.effect-breathe .liquidFxGloss {
        animation: ascThermoBreathe 5.8s ease-in-out infinite;
        transform-box: fill-box;
        transform-origin: center;
      }
      .thermo.style-clean .shellGlass { opacity: 0.14; }
      .thermo.style-glass .shellGlass { opacity: 0.24; }
      .thermo.style-frosted .shellFrost { opacity: 0.18; }
      .thermo.style-minimal .outer { opacity: 0.88; }
      .thermo.style-minimal .tubeBorder { opacity: 0.9; }
      .thermo.style-aurora .outer {
        filter:
          drop-shadow(0 0 6px rgba(255,255,255,0.10))
          drop-shadow(0 0 calc((var(--asc-neon, 0) + 1) * 4px) var(--asc-neon-color, rgba(255,255,255,0)));
      }
      .thermo.style-aurora .liquidFxGloss {
        opacity: 0.22;
      }
      .thermo.style-neon_modern .outer {
        filter:
          drop-shadow(0 0 calc(var(--asc-neon, 0) * 2px) var(--asc-neon-outline, rgba(255,255,255,0)))
          drop-shadow(0 0 calc((var(--asc-neon, 0) + 1) * 7px) var(--asc-neon-color, rgba(255,255,255,0)));
      }
      .thermo.style-neon_modern .tubeBorder {
        filter:
          drop-shadow(0 0 calc((var(--asc-neon, 0) + 1) * 2px) var(--asc-neon-outline, rgba(255,255,255,0)));
      }

      .value.inside {
        position:absolute;
        bottom: calc(8px + var(--asc-val-off-y, 0px));
        left: calc(50% + var(--asc-val-off-x, 0px));
        transform: translate(-50%, 70%);
        background: transparent;
        border: none;
        padding: 6px 10px; border-radius: 999px;
        backdrop-filter: none;
        font-size: clamp(12px, 3.5vw, 18px);
        font-weight: 850;
        z-index: 4;
        text-shadow: 0 2px 8px rgba(0,0,0,0.55);
      }
      .iconWrap.variant-board .value.inside {
        top: calc(84.5% + var(--asc-val-off-y, 0px));
        bottom: auto;
        left: calc(50% + var(--asc-val-off-x, 0px));
        transform: translate(-50%, -50%);
      }

      .bottom { margin-top: 10px; display:flex; }
      .bottom.bottom_center { justify-content:center; text-align:center; }
      .bottom.bottom_right { justify-content:flex-end; text-align:right; }
      .bottom.bottom_left { justify-content:flex-start; text-align:left; }

      .statsRow {
        margin-top: 4px;
        display:flex;
        justify-content:center;
        gap: 14px;
        font-size: 12px;
        opacity: 0.85;
        font-weight: 700;
      }

      .graphWrap {
        margin-top: 2px;
        display:flex;
        justify-content:center;
        align-items:flex-start;
      }

      .graphInner {
        width: clamp(210px, 62vw, 260px);
        display:flex;
        flex-direction:column;
        align-items:stretch;
        gap: 0;
      }

      .graph {
        width: 100%;
        height: 100%;
        display:block;
      }

      .graphTicks {
        margin-top: -1px;
        padding-top: 0px;
        font-size: 9px;
        font-weight: 600;
        line-height: 1;
        opacity: 0.85;
      }

      .graphTicksLabels {
        display:flex;
        justify-content:space-between;
        gap: 4px;
      }

      .graphTicksLabels span {
        min-width: 0;
        white-space: nowrap;
      }

      .graphEmpty {
        font-size: 12px;
        opacity: 0.75;
        font-weight: 700;
      }
      @keyframes ascThermoShimmer {
        0% { transform: translateX(-56px) skewX(-10deg); opacity: 0; }
        18% { opacity: 0.28; }
        50% { opacity: 0.60; }
        82% { opacity: 0.28; }
        100% { transform: translateX(76px) skewX(-10deg); opacity: 0; }
      }
      @keyframes ascThermoLiquidShimmer {
        0%, 100% {
          filter: brightness(1.04) saturate(1.10);
        }
        50% {
          filter: brightness(1.16) saturate(1.24);
        }
      }
      @keyframes ascThermoPulse {
        0%, 100% { opacity: 0.16; transform: scale(0.96); }
        50% { opacity: 0.44; transform: scale(1.065); }
      }
      @keyframes ascThermoLiquidPulse {
        0%, 100% {
          opacity: 0.98;
          filter: brightness(1) saturate(1);
          transform: scale(1);
        }
        50% {
          opacity: 1;
          filter: brightness(1.14) saturate(1.16);
          transform: scale(1.018);
        }
      }
      @keyframes ascThermoScan {
        0% { transform: translateY(-36px) scaleY(0.85); opacity: 0; }
        18% { opacity: 0.22; }
        50% { opacity: 0.42; transform: translateY(0px) scaleY(1); }
        82% { opacity: 0.22; }
        100% { transform: translateY(32px) scaleY(0.85); opacity: 0; }
      }
      @keyframes ascThermoLiquidScan {
        0%, 100% {
          filter: brightness(1.02) saturate(1.04);
          opacity: 0.98;
        }
        50% {
          filter: brightness(1.16) saturate(1.18);
          opacity: 1;
        }
      }
      @keyframes ascThermoBreathe {
        0%, 100% { opacity: 0.10; transform: translateY(2px); }
        50% { opacity: 0.28; transform: translateY(-2px); }
      }
      @keyframes ascThermoLiquidBreathe {
        0%, 100% {
          filter: brightness(1.01) saturate(1.04);
          opacity: 0.97;
          transform: translateY(0px);
        }
        50% {
          filter: brightness(1.08) saturate(1.10);
          opacity: 1;
          transform: translateY(-1px);
        }
      }

      .extras {
        display:flex;
        flex-direction:column;
        gap: 2px;
        min-width: 90px;
        margin-left: calc(-50px * var(--asc-scale, 1));
      }
      .extras.below {
        margin-left: 0;
        margin-top: 8px;
        min-width: 0;
        flex-direction: row;
        justify-content: center;
        align-items: stretch;
        flex-wrap: wrap;
        gap: 8px;
      }

      .extraRow {
        display:flex;
        align-items:center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 14px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.10);
        backdrop-filter: blur(6px);
      }
      .extraRow.below {
        min-width: 116px;
        justify-content: flex-start;
      }
      .extraRow.noBg {
        background: transparent;
        border: none;
        backdrop-filter: none;
        box-shadow: none;
      }

      .extraIcon { opacity: 0.90; }

      .extraText { display:flex; flex-direction:column; line-height: 1.05; }
      .extraLabel { font-size: 11px; opacity: 0.75; font-weight: 800; }
      .extraValue { font-size: 14px; font-weight: 900; letter-spacing: 0.2px; }
      .extraUnit  { font-size: 11px; opacity: 0.75; margin-left: 4px; font-weight: 800; color: inherit; }

      .sub { opacity:0.7; font-size:12px; padding:4px 0 0; }
      .graph text { fill: rgba(255,255,255,0.95); }
    `;
  }
}

if (!customElements.get(INTERNAL_SINGLE_CARD_TAG)) {
  customElements.define(INTERNAL_SINGLE_CARD_TAG, AndyTemperatureCard);
}

/* =============================================================================
 * Editor
 * ============================================================================= */

const DEFAULTS = {
  name: "Temperature",
  entity: "",
  min: -20,
  max: 40,
  unit: "",
  decimals: 1,
  value_position: "top_right",
  value_position_offset_x: 0,
  value_position_offset_y: 0,
  name_position: "auto",
  name_font_size: 0, // v1.0.8
  value_font_size: 0,
  glass: true,
  orientation: "vertical",
  show_scale: false,
  scale_markers: false,
  scale_color_mode: "per_interval",
  show_stats: false,
  stats_hours: 24,
  stats_period: "hours", // v1.0.8
  card_scale: 1,
  show_graph: false,
  graph_hours: 24,
  graph_period: "hours", // v1.0.8
  graph_height: 58,
  graph_show_time: true,
  graph_max_points: 160,
  graph_line_width: 0.7,

  resize_card_on_neon: false,
  symbol_variant: "classic",
  board_scale_format: "both",
  board_background_color: "#e4e4e4",
  board_background_visible: true,
  board_background_gradient: true,
  symbol_style: "classic",
  liquid_effect: "none",

  extra_entity_1: "",
  extra_icon_1: "",
  extra_label_1: "",
  extra_position_1: "right",
  extra_background_1: true,

  extra_entity_2: "",
  extra_icon_2: "",
  extra_label_2: "",
  extra_position_2: "right",
  extra_background_2: true,

  extra_entity_3: "",
  extra_icon_3: "",
  extra_label_3: "",
  extra_position_3: "right",
  extra_background_3: true,
  
  // Extra badge offsets (v1.0.9)
  extra_offset_x_1: 0,
  extra_offset_y_1: 0,
  extra_offset_x_2: 0,
  extra_offset_y_2: 0,
  extra_offset_x_3: 0,
  extra_offset_y_3: 0,

  intervals: deepClone(DEFAULT_INTERVALS).map(normalizeInterval),
};

class AndyTemperatureCardEditor extends HTMLElement {
  setConfig(config) {
    const incomingRaw = { ...DEFAULTS, ...(config || {}) };
    if ("liquid_animation" in incomingRaw) delete incomingRaw.liquid_animation;

    incomingRaw.orientation =
      (String(incomingRaw.orientation) === "horizontal") ? "horizontal" : "vertical";
    incomingRaw.scale_color_mode =
      (String(incomingRaw.scale_color_mode) === "active_interval")
        ? "active_interval"
        : "per_interval";
    incomingRaw.symbol_variant = normalizeChoice(incomingRaw.symbol_variant, SYMBOL_VARIANTS, "classic");
    incomingRaw.board_scale_format = normalizeChoice(incomingRaw.board_scale_format, BOARD_SCALE_FORMATS, "both");
    incomingRaw.extra_position_1 = normalizeChoice(incomingRaw.extra_position_1, EXTRA_POSITIONS, "right");
    incomingRaw.extra_position_2 = normalizeChoice(incomingRaw.extra_position_2, EXTRA_POSITIONS, "right");
    incomingRaw.extra_position_3 = normalizeChoice(incomingRaw.extra_position_3, EXTRA_POSITIONS, "right");
    incomingRaw.extra_background_1 = incomingRaw.extra_background_1 !== false;
    incomingRaw.extra_background_2 = incomingRaw.extra_background_2 !== false;
    incomingRaw.extra_background_3 = incomingRaw.extra_background_3 !== false;
    incomingRaw.board_background_color = normalizeHex(incomingRaw.board_background_color, "#e4e4e4");
    incomingRaw.board_background_visible = incomingRaw.board_background_visible !== false;
    incomingRaw.board_background_gradient = incomingRaw.board_background_gradient !== false;
    incomingRaw.symbol_style = normalizeChoice(incomingRaw.symbol_style, SYMBOL_STYLES, "classic");
    incomingRaw.liquid_effect = normalizeChoice(incomingRaw.liquid_effect, LIQUID_EFFECTS, "none");

    // v1.0.8 normalize periods
    const sp = String(incomingRaw.stats_period || "hours");
    incomingRaw.stats_period = ["hours","today","yesterday","7d","30d"].includes(sp) ? sp : "hours";
    const gp = String(incomingRaw.graph_period || "hours");
    incomingRaw.graph_period = ["hours","today","yesterday","7d","30d"].includes(gp) ? gp : "hours";

    if (!Array.isArray(incomingRaw.intervals) || incomingRaw.intervals.length === 0) {
      incomingRaw.intervals = deepClone(DEFAULT_INTERVALS);
    }
    incomingRaw.intervals = incomingRaw.intervals.map(normalizeInterval);

    if (!Number.isFinite(Number(incomingRaw.min))) incomingRaw.min = -20;
    if (!Number.isFinite(Number(incomingRaw.max))) incomingRaw.max = 40;

    this._config = incomingRaw;
    this._buildOnce();
    this._sync();
  }

  set hass(hass) {
    this._hass = hass;
    try {
      this.querySelectorAll("ha-selector").forEach((el) => {
        el.hass = this._hass;
      });
    } catch (_) {}
    if (this._elEntity) this._elEntity.hass = this._hass;
    if (this._elExtraEntity1) this._elExtraEntity1.hass = this._hass;
    if (this._elExtraEntity2) this._elExtraEntity2.hass = this._hass;
    if (this._elExtraEntity3) this._elExtraEntity3.hass = this._hass;
  }

  _buildOnce() {
    if (this._built) return;
    this._built = true;

    this._isPickingColor = false;
    if (!this._winFocusBound) {
      this._winFocusBound = true;
      window.addEventListener("focus", () => {
        setTimeout(() => { this._isPickingColor = false; }, 0);
      });
    }

    const stopBubbleColor = (e) => {
      if (e?.target?.matches?.('input[type="color"]')) return;
    };

    const stopBubble = (e) => {
      e.stopPropagation();
    };

    const wrap = document.createElement("div");
    wrap.className = "editorWrap";

    const topTitle = document.createElement("div");
    topTitle.className = "editorTopTitle";
    topTitle.textContent = `Andy Temperature Card v${CARD_VERSION}`;
    wrap.appendChild(topTitle);

    const root = document.createElement("div");
    root.className = "form";

    const mkText = (label, key, type = "text", placeholder = "") => {
      const tf = createEditorInput();
      tf.label = label;
      tf.type = type;
      tf.placeholder = placeholder;
      tf.configValue = key;
      tf.addEventListener("input", (e) => {
        clearTimeout(tf._debounceTimer);
        tf._debounceTimer = setTimeout(() => this._onChange(e), 120);
      });
      tf.addEventListener("change", (e) => this._onChange(e));
      tf.addEventListener("value-changed", (e) => this._onChange(e));
      return tf;
    };

    const mkSwitch = (label, key) => {
      const ff = document.createElement("ha-formfield");
      ff.label = label;
      const sw = document.createElement("ha-switch");
      sw.configValue = key;
      sw.addEventListener("change", (e) => this._onChange(e));
      sw.addEventListener("value-changed", (e) => this._onChange(e));
      ff.appendChild(sw);
      return { wrap: ff, sw };
    };

    const mkIconInput = (label, key) => {
      if (customElements.get("ha-icon-picker")) {
        const ic = document.createElement("ha-icon-picker");
        ic.label = label;
        ic.configValue = key;
        ic.addEventListener("value-changed", (e) => this._onChange(e));
        ic.addEventListener("click", stopBubbleColor);
        return ic;
      }
      return mkText(label, key, "text", "mdi:water-percent");
    };

    const normalizeSelectOptions = (options) =>
      (options || []).map((opt) => {
        if (Array.isArray(opt)) return { value: String(opt[0] ?? ""), label: String(opt[1] ?? opt[0] ?? "") };
        return { value: String(opt?.value ?? ""), label: String(opt?.label ?? opt?.value ?? "") };
      });

    const mkSelect = (label, key, options) => {
      const hasSelector = !!customElements.get("ha-selector");
      const sel = hasSelector ? document.createElement("ha-selector") : document.createElement("select");
      sel.label = label;
      sel.configValue = key;

      const isHaSelector = sel.tagName.toLowerCase() === "ha-selector";

      if (isHaSelector) {
        sel.hass = this._hass;
        sel.selector = {
          select: {
            mode: "dropdown",
            options: normalizeSelectOptions(options),
          },
        };
      } else {
        normalizeSelectOptions(options).forEach(({ value, label: optionLabel }) => {
          const item = document.createElement("option");
          item.value = value;
          item.textContent = optionLabel;
          sel.appendChild(item);
        });
      }

      sel.addEventListener("click", stopBubble);
      sel.addEventListener("keydown", stopBubble);

      const handleChange = (e) => {
        stopBubble(e);
        const resolvedValue = (e?.detail && "value" in e.detail) ? e.detail.value : sel.value;
        this._onChange({
          currentTarget: sel,
          target: sel,
          detail: { value: resolvedValue },
        });
      };
      if (isHaSelector) {
        sel.addEventListener("value-changed", handleChange);
      } else {
        sel.addEventListener("change", handleChange);
      }

      return sel;
    };

    const mkEntityControl = () => {
      const hasSelector = !!customElements.get("ha-selector") && !!this._hass;
      if (hasSelector) {
        const sel = document.createElement("ha-selector");
        sel.label = "Entity (numeric)";
        sel.configValue = "entity";
        sel.selector = { entity: {} };
        sel.hass = this._hass;
        sel.addEventListener("value-changed", (e) => this._onChange(e));
        sel.addEventListener("click", stopBubbleColor);
        return sel;
      }
      const ep = document.createElement("ha-entity-picker");
      ep.label = "Entity (numeric)";
      ep.allowCustomEntity = true;
      ep.configValue = "entity";
      ep.addEventListener("value-changed", (e) => this._onChange(e));
      ep.addEventListener("click", stopBubbleColor);
      return ep;
    };

    this._elEntity = mkEntityControl();
    root.appendChild(this._elEntity);

    this._elName = mkText("Name", "name");
    root.appendChild(this._elName);

    const row2 = document.createElement("div");
    row2.className = "grid2";
    this._elUnit = mkText("Unit (optional)", "unit", "text", "");
    this._elDecimals = mkText("Decimals", "decimals", "number", "1");
    row2.appendChild(this._elUnit);
    row2.appendChild(this._elDecimals);
    root.appendChild(row2);

    // Name size (v1.0.8)
    const rowNameSize = document.createElement("div");
    rowNameSize.className = "grid2";
    this._elNameFont = mkText("Name font size (px) — 0 = auto", "name_font_size", "number", "0");
    rowNameSize.appendChild(this._elNameFont);
    root.appendChild(rowNameSize);

    const row3 = document.createElement("div");
    row3.className = "grid3";
    this._elMin = mkText("Min (scale)", "min", "number");
    this._elMax = mkText("Max (scale)", "max", "number");
    this._elFont = mkText("Value font size (px) — 0 = auto", "value_font_size", "number", "0");
    row3.appendChild(this._elMin);
    row3.appendChild(this._elMax);
    row3.appendChild(this._elFont);
    root.appendChild(row3);

    const rowScale = document.createElement("div");
    rowScale.className = "grid2";
    this._elCardScale = mkText("Card scale (0.2–4.0) — 1 = default", "card_scale", "number", "1");
    this._elCardScale.min = "0.2";
    this._elCardScale.max = "4.0";
    this._elCardScale.step = "0.1";
    rowScale.appendChild(this._elCardScale);
    root.appendChild(rowScale);

    const rowVP = document.createElement("div");
    rowVP.className = "grid2";

    this._elValuePos = mkSelect("Value position", "value_position", [
      ["top_left", "Top left"],
      ["top_right", "Top right"],
      ["top_center", "Top center"],
      ["bottom_left", "Bottom left"],
      ["bottom_right", "Bottom right"],
      ["bottom_center", "Bottom center"],
      ["inside", "Inside icon"],
    ]);
    rowVP.appendChild(this._elValuePos);

    const rowVPOff = document.createElement("div");
    rowVPOff.className = "grid2";
    this._elValueOffX = mkText("Offset X (px)", "value_position_offset_x", "number", "0");
    this._elValueOffY = mkText("Offset Y (px)", "value_position_offset_y", "number", "0");
    this._elValueOffX.step = "0.1";
    this._elValueOffY.step = "0.1";
    rowVPOff.appendChild(this._elValueOffX);
    rowVPOff.appendChild(this._elValueOffY);
    rowVP.appendChild(rowVPOff);

    this._elNamePos = mkSelect("Name position", "name_position", [
      ["auto", "Auto (follow value)"],
      ["left", "Left"],
      ["center", "Center"],
    ]);
    root.appendChild(this._elNamePos);

    const secTog = document.createElement("div");
    secTog.className = "toggles";

    const { wrap: swScaleWrap, sw: swScale } = mkSwitch("Show scale (ticks)", "show_scale");
    this._swScale = swScale;

    const { wrap: swMarkersWrap, sw: swMarkers } = mkSwitch("Scale markers (Min/Max/Current)", "scale_markers");
    this._swScaleMarkers = swMarkers;

    const { wrap: swStatsWrap, sw: swStats } = mkSwitch("Show Min/Avg/Max (history)", "show_stats");
    this._swStats = swStats;

    const { wrap: swGraphWrap, sw: swGraph } = mkSwitch("Show history graph", "show_graph");
    this._swGraph = swGraph;

    secTog.appendChild(swScaleWrap);
    secTog.appendChild(swMarkersWrap);
    secTog.appendChild(swStatsWrap);
    secTog.appendChild(swGraphWrap);

    const { wrap: swResizeWrap, sw: swResize } = mkSwitch("Resize card based on Neon", "resize_card_on_neon");
    this._swResizeNeon = swResize;
    secTog.appendChild(swResizeWrap);

    rowVP.appendChild(secTog);
    root.appendChild(rowVP);

    const rowOpt = document.createElement("div");
    rowOpt.className = "grid2";

    this._elOrientation = mkSelect("Orientation", "orientation", [
      ["vertical", "Vertical"],
      ["horizontal", "Horizontal"],
    ]);
    rowOpt.appendChild(this._elOrientation);

    this._elScaleMode = mkSelect("Scale color mode", "scale_color_mode", [
      ["per_interval", "Per interval"],
      ["active_interval", "Active interval"],
    ]);
    rowOpt.appendChild(this._elScaleMode);

    root.appendChild(rowOpt);

    this._elSymbolVariant = mkSelect("Symbol type", "symbol_variant", [
      ["classic", "Classic"],
      ["board", "Board"],
    ]);
    root.appendChild(this._elSymbolVariant);

    this._rowBoardOptions = document.createElement("div");
    this._rowBoardOptions.className = "grid3";

    this._elBoardScaleFormat = mkSelect("Scale format", "board_scale_format", [
      ["both", "Fahrenheit and Celcius"],
      ["fahrenheit", "Fahrenheit"],
      ["celsius", "Celsius"],
    ]);
    this._rowBoardOptions.appendChild(this._elBoardScaleFormat);

    const { wrap: swBoardBgVisibleWrap, sw: swBoardBgVisible } = mkSwitch("Show board background", "board_background_visible");
    this._swBoardBgVisible = swBoardBgVisible;
    this._rowBoardOptions.appendChild(swBoardBgVisibleWrap);

    const { wrap: swBoardBgGradWrap, sw: swBoardBgGrad } = mkSwitch("Gradient board background", "board_background_gradient");
    this._swBoardBgGradient = swBoardBgGrad;
    this._rowBoardOptions.appendChild(swBoardBgGradWrap);

    root.appendChild(this._rowBoardOptions);

    this._elBoardBg = mkText("Board background color (HEX)", "board_background_color", "text", "#e4e4e4");
    this._elBoardBgPicker = document.createElement("input");
    this._elBoardBgPicker.type = "color";
    this._elBoardBgPicker.className = "colorBtn";
    this._elBoardBgPicker.value = "#e4e4e4";
    this._elBoardBgPicker.addEventListener("input", (e) => {
      const v = normalizeHex(this._elBoardBgPicker.value, "#e4e4e4").toUpperCase();
      if (this._elBoardBg) this._elBoardBg.value = v;
      this._commit("board_background_color", v);
      e.stopPropagation();
    });
    this._rowBoardBg = document.createElement("div");
    this._rowBoardBg.className = "colorRow";
    this._rowBoardBg.appendChild(this._elBoardBg);
    this._rowBoardBg.appendChild(this._elBoardBgPicker);
    root.appendChild(this._rowBoardBg);

    const rowSymbolFx = document.createElement("div");
    rowSymbolFx.className = "grid2";
    this._rowSymbolFx = rowSymbolFx;

    this._elSymbolStyle = mkSelect("Symbol style", "symbol_style", [
      ["classic", "Classic"],
      ["clean", "Clean"],
      ["glass", "Glass"],
      ["frosted", "Frosted"],
      ["minimal", "Minimal"],
      ["aurora", "Aurora"],
      ["neon_modern", "Neon modern"],
    ]);
    rowSymbolFx.appendChild(this._elSymbolStyle);

    this._elLiquidEffect = mkSelect("Liquid effect", "liquid_effect", [
      ["none", "None"],
      ["gloss", "Gloss"],
      ["shimmer", "Shimmer"],
      ["pulse", "Pulse"],
      ["scan", "Scan"],
      ["breathe", "Breathe"],
    ]);
    rowSymbolFx.appendChild(this._elLiquidEffect);

    root.appendChild(rowSymbolFx);

    // v1.0.8 periods
    this._elStatsPeriod = mkSelect("Stats period", "stats_period", [
      ["hours", "Last N hours"],
      ["today", "Today"],
      ["yesterday", "Yesterday"],
      ["7d", "Last 7 days"],
      ["30d", "Last 30 days"],
    ]);
    root.appendChild(this._elStatsPeriod);

    this._elGraphPeriod = mkSelect("Graph period", "graph_period", [
      ["hours", "Last N hours"],
      ["today", "Today"],
      ["yesterday", "Yesterday"],
      ["7d", "Last 7 days"],
      ["30d", "Last 30 days"],
    ]);
    root.appendChild(this._elGraphPeriod);

    this._elStatsHours = mkText("Stats lookback hours", "stats_hours", "number", "24");
    root.appendChild(this._elStatsHours);

    this._elGraphHours = mkText("Graph lookback hours", "graph_hours", "number", "24");
    root.appendChild(this._elGraphHours);

    const { wrap: swGraphTimeWrap, sw: swGraphTime } =
      mkSwitch("Graph: show time ticks", "graph_show_time");
    this._swGraphTime = swGraphTime;
    root.appendChild(swGraphTimeWrap);  
    
    // Extra values
    const secExtra = document.createElement("div");
    secExtra.className = "section";

    const extraTitle = document.createElement("div");
    extraTitle.className = "section-title";
    extraTitle.innerText = "Extra values";
    secExtra.appendChild(extraTitle);

    const mkEntityPick = (label, key) => {
      const hasSelector = !!customElements.get("ha-selector") && !!this._hass;
      if (hasSelector) {
        const sel = document.createElement("ha-selector");
        sel.label = label;
        sel.configValue = key;
        sel.selector = { entity: {} };
        sel.hass = this._hass;
        sel.addEventListener("value-changed", (e) => this._onChange(e));
        sel.addEventListener("click", stopBubbleColor);
        return sel;
      }
      const ep = document.createElement("ha-entity-picker");
      ep.label = label;
      ep.allowCustomEntity = true;
      ep.configValue = key;
      ep.addEventListener("value-changed", (e) => this._onChange(e));
      ep.addEventListener("click", stopBubbleColor);
      return ep;
    };

    const rowE1 = document.createElement("div");
    rowE1.className = "grid1";
    this._elExtraEntity1 = mkEntityPick("Extra entity 1", "extra_entity_1");
    rowE1.appendChild(this._elExtraEntity1);
    secExtra.appendChild(rowE1);

    const rowE11 = document.createElement("div");
    rowE11.className = "grid2";
    this._elExtraLabel1 = mkText("Label (optional)", "extra_label_1");
    const { wrap: swExtraBgWrap1, sw: swExtraBg1 } = mkSwitch("Show background", "extra_background_1");
    this._swExtraBg1 = swExtraBg1;
    rowE11.appendChild(this._elExtraLabel1);
    rowE11.appendChild(swExtraBgWrap1);
    secExtra.appendChild(rowE11);

    const rowE12 = document.createElement("div");
    rowE12.className = "grid2";
    this._elExtraIcon1  = mkIconInput("Icon (optional, mdi:...)", "extra_icon_1");
    this._elExtraPosition1 = mkSelect("Placement", "extra_position_1", [
      ["right", "Right"],
      ["below", "Below"],
    ]);
    rowE12.appendChild(this._elExtraIcon1);
    rowE12.appendChild(this._elExtraPosition1);
    secExtra.appendChild(rowE12);
    
    const rowE1Off = document.createElement("div");
    rowE1Off.className = "grid2";
    this._elExtraOffX1 = mkText("Offset X (px)", "extra_offset_x_1", "number", "0");
    this._elExtraOffY1 = mkText("Offset Y (px)", "extra_offset_y_1", "number", "0");
    this._elExtraOffX1.step = "0.1";
    this._elExtraOffY1.step = "0.1";
    rowE1Off.appendChild(this._elExtraOffX1);
    rowE1Off.appendChild(this._elExtraOffY1);
    secExtra.appendChild(rowE1Off);

    const rowE2 = document.createElement("div");
    rowE2.className = "grid1";
    this._elExtraEntity2 = mkEntityPick("Extra entity 2", "extra_entity_2");
    rowE2.appendChild(this._elExtraEntity2);
    secExtra.appendChild(rowE2);
    
    const rowE22 = document.createElement("div");
    rowE22.className = "grid2";
    this._elExtraLabel2 = mkText("Label (optional)", "extra_label_2");
    const { wrap: swExtraBgWrap2, sw: swExtraBg2 } = mkSwitch("Show background", "extra_background_2");
    this._swExtraBg2 = swExtraBg2;
    rowE22.appendChild(this._elExtraLabel2);
    rowE22.appendChild(swExtraBgWrap2);
    secExtra.appendChild(rowE22);

    const rowE23 = document.createElement("div");
    rowE23.className = "grid2";
    this._elExtraIcon2  = mkIconInput("Icon (optional, mdi:...)", "extra_icon_2");
    this._elExtraPosition2 = mkSelect("Placement", "extra_position_2", [
      ["right", "Right"],
      ["below", "Below"],
    ]);
    rowE23.appendChild(this._elExtraIcon2);
    rowE23.appendChild(this._elExtraPosition2);
    secExtra.appendChild(rowE23);

    const rowE2Off = document.createElement("div");
    rowE2Off.className = "grid2";
    this._elExtraOffX2 = mkText("Offset X (px)", "extra_offset_x_2", "number", "0");
    this._elExtraOffY2 = mkText("Offset Y (px)", "extra_offset_y_2", "number", "0");
    this._elExtraOffX2.step = "0.1";
    this._elExtraOffY2.step = "0.1";
    rowE2Off.appendChild(this._elExtraOffX2);
    rowE2Off.appendChild(this._elExtraOffY2);
    secExtra.appendChild(rowE2Off);


    const rowE3 = document.createElement("div");
    rowE3.className = "grid1";
    this._elExtraEntity3 = mkEntityPick("Extra entity 3", "extra_entity_3");
    rowE3.appendChild(this._elExtraEntity3);
    secExtra.appendChild(rowE3);

    const rowE33 = document.createElement("div");
    rowE33.className = "grid2";
    this._elExtraLabel3 = mkText("Label (optional)", "extra_label_3");
    const { wrap: swExtraBgWrap3, sw: swExtraBg3 } = mkSwitch("Show background", "extra_background_3");
    this._swExtraBg3 = swExtraBg3;
    rowE33.appendChild(this._elExtraLabel3);
    rowE33.appendChild(swExtraBgWrap3);
    secExtra.appendChild(rowE33);

    const rowE34 = document.createElement("div");
    rowE34.className = "grid2";
    this._elExtraIcon3  = mkIconInput("Icon (optional, mdi:...)", "extra_icon_3");
    this._elExtraPosition3 = mkSelect("Placement", "extra_position_3", [
      ["right", "Right"],
      ["below", "Below"],
    ]);
    rowE34.appendChild(this._elExtraIcon3);
    rowE34.appendChild(this._elExtraPosition3);
    secExtra.appendChild(rowE34);
    
    const rowE3Off = document.createElement("div");
    rowE3Off.className = "grid2";
    this._elExtraOffX3 = mkText("Offset X (px)", "extra_offset_x_3", "number", "0");
    this._elExtraOffY3 = mkText("Offset Y (px)", "extra_offset_y_3", "number", "0");
    this._elExtraOffX3.step = "0.1";
    this._elExtraOffY3.step = "0.1";
    rowE3Off.appendChild(this._elExtraOffX3);
    rowE3Off.appendChild(this._elExtraOffY3);
    secExtra.appendChild(rowE3Off);    

    root.appendChild(secExtra);

    // Intervals
    const secInt = document.createElement("div");
    secInt.className = "section";
    const secTitle = document.createElement("div");
    secTitle.className = "section-title";
    secTitle.innerText = "Intervals";
    secInt.appendChild(secTitle);

    const head = document.createElement("div");
    head.className = "section-head";
    const btnAdd = document.createElement("mwc-button");
    btnAdd.className = "actionButton";
    btnAdd.setAttribute("raised", "");
    btnAdd.innerText = "+ Add";
    btnAdd.addEventListener("click", (e) => { e.stopPropagation(); this._startAdd(); });
    head.appendChild(btnAdd);
    secInt.appendChild(head);

    this._intervalList = document.createElement("div");
    this._intervalList.className = "intervalList";
    secInt.appendChild(this._intervalList);

    this._draftBox = document.createElement("div");
    this._draftBox.className = "draft";
    secInt.appendChild(this._draftBox);

    root.appendChild(secInt);

    const style = document.createElement("style");
    style.textContent = `
      .form { display:flex; flex-direction:column; gap:12px; padding:8px 0; overflow: visible; }
      mwc-button { --mdc-theme-primary: var(--primary-color); --mdc-theme-on-primary: #fff; }
      mwc-button.danger { --mdc-theme-primary: var(--error-color); --mdc-theme-on-primary: #fff; }
      .grid1 { display:grid; grid-template-columns: 1fr; gap:12px; }
      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
      .grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; }
      .grid4 { display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:12px; }
      .toggles { display:flex; flex-direction:column; gap:8px; justify-content:center; }

      .section { border-top:1px solid rgba(0,0,0,0.10); padding-top:10px; margin-top:6px; display:flex; flex-direction:column; gap:10px; }
      .section-title { font-size:12px; opacity:.75; letter-spacing:.2px; }
      .section-head { display:flex; justify-content:flex-end; }

      .intervalList { display:flex; flex-direction:column; gap:10px; }
      .intervalItem { display:flex; align-items:center; gap:10px; padding:10px; border-radius:12px; border:1px solid rgba(0,0,0,0.12); }
      .badge { width:14px; height:14px; border-radius:999px; border:1px solid rgba(0,0,0,0.25); }
      .itText { flex:1 1 auto; }
      .itTitle { font-weight:700; }
      .itSub { font-size:12px; opacity:.75; }

      .btns { display:flex; gap:8px; }
      .danger { --mdc-theme-primary: #ef4444; }

      .draft { display:none; padding:12px; border-radius:14px; border:1px solid rgba(0,0,0,0.14); background: rgba(0,0,0,0.02); }
      .draft.show { display:block; }
      .draftHead { display:flex; justify-content:space-between; align-items:center; font-weight:800; margin-bottom:10px; }
      .draftGrid2 { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
      .draftActions { display:flex; justify-content:flex-end; gap:10px; margin-top:10px; }

      .colorRow { display:flex; align-items:flex-end; gap:10px; margin-top:10px; }
      .colorRow ha-input, .colorRow ha-textfield { flex: 1 1 auto; }
      .colorBtn{
        width: 44px;
        height: 38px;
        padding: 0;
        border: 1px solid rgba(0,0,0,0.25);
        border-radius: 6px;
        background: transparent;
        cursor: pointer;
      }

      .editorWrap { display:flex; flex-direction:column; gap:14px; overflow: visible; }
      .editorTopTitle{
        display:block;
        padding:10px 14px;
        border-radius:12px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(0,0,0,0.22);
        font-weight: 800;
        letter-spacing: .2px;
      }

      .badgeSupport{
        border-radius:16px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(0,0,0,0.18);
        padding: 14px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .badgeSupportTitle{ font-weight: 800; }
      .badgeSupportText{ font-size: 13px; opacity: .9; line-height: 1.35; }
      .badgeSupportActions{ display:flex; }
      .badgeSupportImgLink img{ border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
`;

    this.innerHTML = "";
    this.appendChild(style);

    // Support the project (editor footer)
    const support = document.createElement("div");
    support.className = "badgeSupport";
    support.innerHTML = `
      <div class="badgeSupportTitle">☕ Support the project</div>
      <div class="badgeSupportText">
        I’m a Home Automation enthusiast who spends late nights building custom cards and tools for Home Assistant.
        If you enjoy my work or use any of my cards, your support helps me keep improving and maintaining everything.
      </div>
      <div class="badgeSupportActions">
        <a class="badgeSupportImgLink" href="https://www.buymeacoffee.com/AndyBonde" target="_blank" rel="noopener noreferrer" aria-label="Buy me a coffee">
          <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" width="140" alt="Buy me a coffee">
        </a>
      </div>
    `;
    wrap.appendChild(support);
    wrap.appendChild(root);

    this.appendChild(wrap);
  }

  _setFieldValue(el, value) {
    if (!el) return;
    if (document.activeElement === el || el.matches?.(":focus-within")) return;
    const next = value == null ? "" : String(value);
    const current = el.value == null ? "" : String(el.value);
    if (current !== next) el.value = next;
  }

  _setSelectorValue(el, value) {
    if (!el) return;
    el.value = value == null ? "" : String(value);
  }

  _setFieldChecked(el, value) {
    if (!el) return;
    if (document.activeElement === el || el.matches?.(":focus-within")) return;
    const next = !!value;
    if (!!el.checked !== next) el.checked = next;
  }

  _sync() {
    if (!this._hass || !this._config) return;

    if (this._isPickingColor) {
      if (this._elEntity) this._elEntity.hass = this._hass;
      return;
    }

    this._elEntity.hass = this._hass;
    this._setFieldValue(this._elEntity, this._config.entity || "");

    this._setFieldValue(this._elName, this._config.name || "");
    this._setFieldValue(this._elUnit, this._config.unit || "");
    this._setFieldValue(this._elDecimals, this._config.decimals ?? 1);

    if (this._elNameFont) this._setFieldValue(this._elNameFont, this._config.name_font_size ?? 0);

    this._setFieldValue(this._elMin, this._config.min ?? -20);
    this._setFieldValue(this._elMax, this._config.max ?? 40);
    this._setFieldValue(this._elFont, this._config.value_font_size ?? 0);
    this._setFieldValue(this._elCardScale, this._config.card_scale ?? 1);

    this._setSelectorValue(this._elValuePos, this._config.value_position || "top_right");
    if (this._elValueOffX) this._setFieldValue(this._elValueOffX, this._config.value_position_offset_x ?? 0);
    if (this._elValueOffY) this._setFieldValue(this._elValueOffY, this._config.value_position_offset_y ?? 0);

    this._setFieldChecked(this._swScale, !!this._config.show_scale);
    this._setFieldChecked(this._swScaleMarkers, !!this._config.scale_markers);
    this._setFieldChecked(this._swStats, !!this._config.show_stats);
    this._setFieldChecked(this._swGraph, !!this._config.show_graph);
    if (this._swResizeNeon) this._setFieldChecked(this._swResizeNeon, (this._config.resize_card_on_neon ?? false));

    this._setSelectorValue(this._elOrientation, this._config.orientation || "vertical");
    this._setSelectorValue(this._elScaleMode, this._config.scale_color_mode || "per_interval");
    this._setSelectorValue(this._elNamePos, this._config.name_position || "auto");
    if (this._elSymbolVariant) this._setSelectorValue(this._elSymbolVariant, this._config.symbol_variant || "classic");
    if (this._elBoardScaleFormat) this._setSelectorValue(this._elBoardScaleFormat, this._config.board_scale_format || "both");
    if (this._swBoardBgVisible) this._setFieldChecked(this._swBoardBgVisible, this._config.board_background_visible !== false);
    if (this._swBoardBgGradient) this._setFieldChecked(this._swBoardBgGradient, this._config.board_background_gradient !== false);
    if (this._elBoardBg) this._setFieldValue(this._elBoardBg, this._config.board_background_color || "#e4e4e4");
    if (this._elBoardBgPicker) this._elBoardBgPicker.value = normalizeHex(this._config.board_background_color, "#e4e4e4");
    if (this._elSymbolStyle) this._setSelectorValue(this._elSymbolStyle, this._config.symbol_style || "classic");
    if (this._elLiquidEffect) this._setSelectorValue(this._elLiquidEffect, this._config.liquid_effect || "none");
    this._updateSymbolEditorVisibility();

    if (this._elStatsPeriod) this._setSelectorValue(this._elStatsPeriod, this._config.stats_period || "hours");
    if (this._elGraphPeriod) this._setSelectorValue(this._elGraphPeriod, this._config.graph_period || "hours");

    this._elStatsHours.style.display = (this._config.show_stats && (this._config.stats_period || "hours") === "hours") ? "" : "none";
    this._setFieldValue(this._elStatsHours, this._config.stats_hours ?? 24);

    this._elGraphHours.style.display = (this._config.show_graph && (this._config.graph_period || "hours") === "hours") ? "" : "none";
    this._setFieldValue(this._elGraphHours, this._config.graph_hours ?? this._config.stats_hours ?? 24);

    this._setFieldChecked(this._swGraphTime, !!this._config.graph_show_time);
    this._swGraphTime.parentElement.style.display = this._config.show_graph ? "" : "none";

    this._renderIntervals();
    if (!this._isPickingColor) this._renderDraft();

    if (this._elExtraEntity1) { this._elExtraEntity1.hass = this._hass; this._setFieldValue(this._elExtraEntity1, this._config.extra_entity_1 || ""); }
    if (this._elExtraLabel1) this._setFieldValue(this._elExtraLabel1, this._config.extra_label_1 || "");
    if (this._elExtraIcon1)  this._setFieldValue(this._elExtraIcon1, this._config.extra_icon_1  || "");
    if (this._elExtraPosition1) this._setSelectorValue(this._elExtraPosition1, this._config.extra_position_1 || "right");
    if (this._swExtraBg1) this._setFieldChecked(this._swExtraBg1, this._config.extra_background_1 !== false);

    if (this._elExtraEntity2) { this._elExtraEntity2.hass = this._hass; this._setFieldValue(this._elExtraEntity2, this._config.extra_entity_2 || ""); }
    if (this._elExtraLabel2) this._setFieldValue(this._elExtraLabel2, this._config.extra_label_2 || "");
    if (this._elExtraIcon2)  this._setFieldValue(this._elExtraIcon2, this._config.extra_icon_2  || "");
    if (this._elExtraPosition2) this._setSelectorValue(this._elExtraPosition2, this._config.extra_position_2 || "right");
    if (this._swExtraBg2) this._setFieldChecked(this._swExtraBg2, this._config.extra_background_2 !== false);

    if (this._elExtraEntity3) { this._elExtraEntity3.hass = this._hass; this._setFieldValue(this._elExtraEntity3, this._config.extra_entity_3 || ""); }
    if (this._elExtraLabel3) this._setFieldValue(this._elExtraLabel3, this._config.extra_label_3 || "");
    if (this._elExtraIcon3)  this._setFieldValue(this._elExtraIcon3, this._config.extra_icon_3  || "");
    if (this._elExtraPosition3) this._setSelectorValue(this._elExtraPosition3, this._config.extra_position_3 || "right");
    if (this._swExtraBg3) this._setFieldChecked(this._swExtraBg3, this._config.extra_background_3 !== false);
    
    if (this._elExtraOffX1) this._setFieldValue(this._elExtraOffX1, this._config.extra_offset_x_1 ?? 0);
    if (this._elExtraOffY1) this._setFieldValue(this._elExtraOffY1, this._config.extra_offset_y_1 ?? 0);

    if (this._elExtraOffX2) this._setFieldValue(this._elExtraOffX2, this._config.extra_offset_x_2 ?? 0);
    if (this._elExtraOffY2) this._setFieldValue(this._elExtraOffY2, this._config.extra_offset_y_2 ?? 0);

    if (this._elExtraOffX3) this._setFieldValue(this._elExtraOffX3, this._config.extra_offset_x_3 ?? 0);
    if (this._elExtraOffY3) this._setFieldValue(this._elExtraOffY3, this._config.extra_offset_y_3 ?? 0);
  
  
  
  }

  _updateSymbolEditorVisibility() {
    const isClassic = (this._config?.symbol_variant || "classic") === "classic";
    const isBoard = (this._config?.symbol_variant || "classic") === "board";
    if (this._elSymbolStyle) {
      this._elSymbolStyle.style.display = isClassic ? "" : "none";
    }
    if (this._rowSymbolFx) {
      this._rowSymbolFx.className = isClassic ? "grid3" : "grid2";
    }
    if (this._rowBoardOptions) {
      this._rowBoardOptions.style.display = isBoard ? "" : "none";
    }
    if (this._rowBoardBg) {
      this._rowBoardBg.style.display = isBoard ? "" : "none";
    }
  }

  _renderIntervals() {
    const list = this._intervalList;
    list.innerHTML = "";

    const intervals = (this._config.intervals || []).map(normalizeInterval).sort((a, b) => a.to - b.to);

    intervals.forEach((it) => {
      const row = document.createElement("div");
      row.className = "intervalItem";

      const badgeFill = document.createElement("div");
      badgeFill.className = "badge";
      badgeFill.style.background = it.gradient?.enabled
        ? `linear-gradient(${it.gradient.from}, ${it.gradient.to})`
        : it.color;

      const badgeOutline = document.createElement("div");
      badgeOutline.className = "badge";
      badgeOutline.style.background = it.outline;

      const badgeScale = document.createElement("div");
      badgeScale.className = "badge";
      badgeScale.style.background = it.scale_color || it.color;

      const text = document.createElement("div");
      text.className = "itText";
      text.innerHTML = `
        <div class="itTitle">≤ ${it.to}</div>
        <div class="itSub">Fill: ${it.gradient?.enabled ? `${it.gradient.from} → ${it.gradient.to}` : it.color} • Outline: ${it.outline} • Scale: ${it.scale_color || it.color} • Neon: ${it.neon ?? 0}</div>
      `;

      const effectSub = document.createElement("div");
      effectSub.className = "itSub";
      effectSub.textContent = `Liquid effect: ${normalizeChoice(it.liquid_effect_override, INTERVAL_LIQUID_EFFECTS, "inherit")}`;
      text.appendChild(effectSub);

      const valueSub = document.createElement("div");
      valueSub.className = "itSub";
      valueSub.textContent = `Value color: ${it.value_color || "#FFFFFF"}`;
      text.appendChild(valueSub);

      const btns = document.createElement("div");
      btns.className = "btns";

      const bEdit = document.createElement("mwc-button");
      bEdit.className = "actionButton";
      bEdit.setAttribute("raised", "");
      bEdit.innerText = "Edit";
      bEdit.addEventListener("click", (e) => { e.stopPropagation(); this._startEdit(it.id); });

      const bDel = document.createElement("mwc-button");
      bDel.className = "danger actionButton";
      bDel.setAttribute("unelevated", "");
      bDel.innerText = "Delete";
      bDel.addEventListener("click", (e) => { e.stopPropagation(); this._deleteInterval(it.id); });

      btns.appendChild(bEdit);
      btns.appendChild(bDel);

      row.appendChild(badgeFill);
      row.appendChild(badgeOutline);
      row.appendChild(badgeScale);
      row.appendChild(text);
      row.appendChild(btns);

      list.appendChild(row);
    });
  }

  _startAdd() {
    this._editingId = null;
    this._draft = normalizeInterval({
      id: uid("it"),
      to: 0,
      color: "#22c55e",
      outline: "#ffffff",
      value_color: "#ffffff",
      scale_color: "#22c55e",
      liquid_effect_override: "inherit",
      neon: 0, inline: "#ffffff",
      gradient: { enabled: false, from: "#22c55e", to: "#22c55e" }
    });
    this._renderDraft(true);
  }

  _startEdit(id) {
    const it = (this._config.intervals || []).map(normalizeInterval).find(x => x.id === id);
    this._editingId = id;
    this._draft = normalizeInterval(deepClone(it || {}));
    this._renderDraft(true);
  }

  _deleteInterval(id) {
    const next = (this._config.intervals || []).map(normalizeInterval).filter((x) => x.id !== id);
    this._commit("intervals", next.map(normalizeInterval));
  }

  _closeDraft() {
    this._draft = null;
    this._editingId = null;
    this._renderDraft(false);
    this._isPickingColor = false;
  }

  _saveDraft() {
    if (!this._draft) return;
    const d = normalizeInterval(this._draft);
    const cur = (this._config.intervals || []).map(normalizeInterval);

    const idx = cur.findIndex(x => x.id === d.id);
    if (idx === -1) cur.push(d);
    else cur[idx] = d;

    this._commit("intervals", cur.map(normalizeInterval));
    this._closeDraft();
  }

  _renderDraft(forceShow) {
    const box = this._draftBox;
    if (!this._draft) {
      box.classList.remove("show");
      box.innerHTML = "";
      return;
    }
    if (forceShow) box.classList.add("show");

    box.innerHTML = "";

    const head = document.createElement("div");
    head.className = "draftHead";
    head.innerHTML = `<div>${this._editingId == null ? "Add interval" : "Edit interval"}</div>`;
    const btnClose = document.createElement("mwc-button");
    btnClose.className = "actionButton";
    btnClose.innerText = "Close";
    btnClose.addEventListener("click", (e) => { e.stopPropagation(); this._closeDraft(); });
    head.appendChild(btnClose);
    box.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "draftGrid2";

    const tfTo = createEditorInput();
    tfTo.type = "number";
    tfTo.label = "Upper bound (to)";
    tfTo.value = String(this._draft.to ?? 0);
    tfTo.addEventListener("input", (e) => { e.stopPropagation(); this._draft.to = Number(tfTo.value); });
    tfTo.addEventListener("value-changed", (e) => { e.stopPropagation(); this._draft.to = Number(tfTo.value); });
    grid.appendChild(tfTo);

    const tfNeon = createEditorInput();
    tfNeon.type = "number";
    tfNeon.step = "0.1";
    tfNeon.min = "0";
    tfNeon.label = "Neon glow";
    tfNeon.value = String(this._draft.neon ?? 0);
    tfNeon.addEventListener("input", (e) => {
      e.stopPropagation();
      const n = Number(tfNeon.value);
      this._draft.neon = Number.isFinite(n) ? n : 0;
    });
    tfNeon.addEventListener("value-changed", (e) => {
      e.stopPropagation();
      const n = Number(tfNeon.value);
      this._draft.neon = Number.isFinite(n) ? n : 0;
    });
    grid.appendChild(tfNeon);

    const ffGrad = document.createElement("ha-formfield");
    ffGrad.label = "Enable gradient";
    const swGrad = document.createElement("ha-switch");
    swGrad.checked = !!(this._draft.gradient && this._draft.gradient.enabled);
    swGrad.addEventListener("change", (e) => {
      e.stopPropagation();
      this._draft.gradient = this._draft.gradient || {};
      this._draft.gradient.enabled = !!swGrad.checked;
      this._renderDraft(true);
    });
    ffGrad.appendChild(swGrad);
    grid.appendChild(ffGrad);

    const mkDraftSelect = (label, value, options, onValue) => {
      const hasSelector = !!customElements.get("ha-selector");
      const sel = hasSelector ? document.createElement("ha-selector") : document.createElement("select");
      sel.label = label;

      const isHaSelector = sel.tagName.toLowerCase() === "ha-selector";

      if (isHaSelector) {
        sel.hass = this._hass;
        sel.selector = {
          select: {
            mode: "dropdown",
            options: (options || []).map(([optValue, optLabel]) => ({
              value: String(optValue),
              label: String(optLabel),
            })),
          },
        };
        sel.value = String(value ?? "");
      } else {
        (options || []).forEach(([optValue, optLabel]) => {
          const item = document.createElement("option");
          item.value = String(optValue);
          item.textContent = String(optLabel);
          sel.appendChild(item);
        });
        sel.value = String(value ?? "");
      }

      const handle = (e) => {
        e.stopPropagation();
        const nextValue = (e?.detail && "value" in e.detail) ? e.detail.value : sel.value;
        onValue(String(nextValue ?? ""));
      };
      if (isHaSelector) {
        sel.addEventListener("value-changed", handle);
      } else {
        sel.addEventListener("change", handle);
      }
      return sel;
    };

    const liquidEffectSelect = mkDraftSelect(
      "Liquid effect override",
      normalizeChoice(this._draft.liquid_effect_override, INTERVAL_LIQUID_EFFECTS, "inherit"),
      [
        ["inherit", "Inherit parent"],
        ["none", "None"],
        ["gloss", "Gloss"],
        ["shimmer", "Shimmer"],
        ["pulse", "Pulse"],
        ["scan", "Scan"],
        ["breathe", "Breathe"],
      ],
      (v) => { this._draft.liquid_effect_override = normalizeChoice(v, INTERVAL_LIQUID_EFFECTS, "inherit"); }
    );
    grid.appendChild(liquidEffectSelect);

    box.appendChild(grid);

    const mkDraftColor = (label, getVal, setVal) => {
      const row = document.createElement("div");
      row.className = "colorRow";

      const tf = createEditorInput();
      tf.label = label;
      tf.placeholder = "#RRGGBB";

      const btn = document.createElement("input");
      btn.type = "color";

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._isPickingColor = true;
      });
      btn.addEventListener("change", () => {
        this._isPickingColor = false;
      });

      btn.className = "colorBtn";

      const cur = normalizeHex(getVal(), "#ffffff");
      tf.value = cur.toUpperCase();
      btn.value = cur;

      tf.addEventListener("change", (e) => {
        e.stopPropagation();
        const n = normalizeHex(tf.value, cur).toUpperCase();
        tf.value = n;
        btn.value = n;
        setVal(n);
      });
      tf.addEventListener("value-changed", (e) => {
        e.stopPropagation();
        const n = normalizeHex(tf.value, cur).toUpperCase();
        tf.value = n;
        btn.value = n;
        setVal(n);
      });

      btn.addEventListener("input", () => {
        const n = String(btn.value || cur).toUpperCase();
        tf.value = n;
        setVal(n);
      });

      row.appendChild(tf);
      row.appendChild(btn);
      return row;
    };

    box.appendChild(mkDraftColor("Fill color (HEX)", () => this._draft.color, (v) => { this._draft.color = v; }));
    box.appendChild(mkDraftColor("Value color (HEX)", () => this._draft.value_color, (v) => { this._draft.value_color = v; }));
    box.appendChild(mkDraftColor("Outline color (HEX)", () => this._draft.outline, (v) => { this._draft.outline = v; }));
    box.appendChild(mkDraftColor("Inner border (tube) color (HEX)", () => this._draft.inline, (v) => { this._draft.inline = v; }));
    box.appendChild(mkDraftColor("Scale color (HEX)", () => this._draft.scale_color, (v) => { this._draft.scale_color = v; }));

    if (this._draft.gradient?.enabled) {
      box.appendChild(mkDraftColor(
        "Gradient from (HEX)",
        () => this._draft.gradient?.from,
        (v) => { this._draft.gradient = this._draft.gradient || {}; this._draft.gradient.from = v; }
      ));
      box.appendChild(mkDraftColor(
        "Gradient to (HEX)",
        () => this._draft.gradient?.to,
        (v) => { this._draft.gradient = this._draft.gradient || {}; this._draft.gradient.to = v; }
      ));
    }

    const actions = document.createElement("div");
    actions.className = "draftActions";

    const btnCancel = document.createElement("mwc-button");
    btnCancel.className = "actionButton";
    btnCancel.setAttribute("outlined", "");
    btnCancel.innerText = "Cancel";
    btnCancel.addEventListener("click", (e) => { e.stopPropagation(); this._closeDraft(); });

    const btnSave = document.createElement("mwc-button");
    btnSave.className = "actionButton";
    btnSave.setAttribute("raised", "");
    btnSave.innerText = "Save";
    btnSave.addEventListener("click", (e) => { e.stopPropagation(); this._saveDraft(); });

    actions.appendChild(btnCancel);
    actions.appendChild(btnSave);
    box.appendChild(actions);
  }

  _commit(key, value) {
    const next = { ...(this._config || DEFAULTS), [key]: value };
    this._config = next;

    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: next },
      bubbles: true,
      composed: true,
    }));
  }

  _onChange(ev) {
    const target = ev.currentTarget || ev.target;
    const key = target.configValue || target.dataset?.configValue;
    if (!key) return;

    // Switches
    if (typeof target.checked !== "undefined") {
      return this._commit(key, target.checked);
    }

    // Numeric fields
    if (
      key === "extra_offset_x_1" ||
      key === "extra_offset_y_1" ||
      key === "extra_offset_x_2" ||
      key === "extra_offset_y_2" ||
      key === "extra_offset_x_3" ||
      key === "extra_offset_y_3" ||
      key === "min" ||
      key === "max" ||
      key === "value_font_size" ||
      key === "name_font_size" ||
      key === "stats_hours" ||
      key === "card_scale" ||
      key === "graph_hours" ||
      key === "graph_height" ||
      key === "graph_max_points" ||
      key === "graph_line_width" ||
      key === "value_position_offset_x" ||
      key === "value_position_offset_y"
    ) {
      let v;
      if (ev && ev.detail && "value" in ev.detail) {
        v = ev.detail.value;
      } else {
        v = target.value;
      }
      v = v === "" || v === null || v === undefined ? 0 : Number(v);
      return this._commit(key, v);
    }

    if (key === "decimals") {
      let v;
      if (ev && ev.detail && "value" in ev.detail) {
        v = ev.detail.value;
      } else {
        v = target.value;
      }
      v = v === "" || v === null || v === undefined ? 1 : Number(v);
      if (!Number.isFinite(v)) v = 1;
      return this._commit(key, v);
    }

    if (key === "board_background_color") {
      let v;
      if (ev && ev.detail && "value" in ev.detail) {
        v = ev.detail.value;
      } else {
        v = target.value;
      }
      return this._commit(key, normalizeHex(v, "#e4e4e4"));
    }

    // Entity fields (incl extra_entity_1–3)
    if (
      key === "entity" ||
      key === "extra_entity_1" ||
      key === "extra_entity_2" ||
      key === "extra_entity_3"
    ) {
      let value;
      if (ev && ev.detail && "value" in ev.detail) {
        value = ev.detail.value;
      } else {
        value = target.value;
      }

      if (value && typeof value === "object") {
        if ("value" in value && value.value && typeof value.value === "object") {
          const inner = value.value;
          if ("entity" in inner) value = inner.entity;
          else if ("entity_id" in inner) value = inner.entity_id;
          else if (Object.keys(inner).length === 0) value = "";
        } else if ("entity" in value) {
          value = value.entity;
        } else if ("entity_id" in value) {
          value = value.entity_id;
        } else if (Object.keys(value).length === 0) {
          value = "";
        }
      }

      if (typeof value === "string") value = value.trim();
      if (value === null || value === undefined) value = "";

      // X pressed -> remove field from config
      if (!value) {
        const next = { ...(this._config || DEFAULTS) };
        delete next[key];

        this._config = next;
        this.dispatchEvent(
          new CustomEvent("config-changed", {
            detail: { config: next },
            bubbles: true,
            composed: true,
          })
        );
        return;
      }

      return this._commit(key, value);
    }

    // Everything else (text / select)
    let genericValue;
    if (ev && ev.detail && "value" in ev.detail) {
      genericValue = ev.detail.value;
    } else {
      genericValue = target.value;
    }

    if (genericValue && typeof genericValue === "object") {
      if ("value" in genericValue) {
        genericValue = genericValue.value;
      } else if ("item" in genericValue && genericValue.item && typeof genericValue.item === "object" && "value" in genericValue.item) {
        genericValue = genericValue.item.value;
      }
    }

    if (key === "board_scale_format") {
      const raw = String(genericValue ?? "").trim().toLowerCase();
      if (raw === "both" || (raw.includes("fahrenheit") && raw.includes("celsius"))) {
        genericValue = "both";
      } else if (raw === "fahrenheit" || raw.includes("fahrenheit")) {
        genericValue = "fahrenheit";
      } else if (raw === "celsius" || raw.includes("celsius")) {
        genericValue = "celsius";
      } else {
        genericValue = "both";
      }
    }

    syncHaSelectorValue(target, genericValue);
    this._commit(key, genericValue);
    if (key === "symbol_variant") this._updateSymbolEditorVisibility();
    return;
  }
}

if (!customElements.get(INTERNAL_SINGLE_EDITOR_TAG)) {
  customElements.define(INTERNAL_SINGLE_EDITOR_TAG, AndyTemperatureCardEditor);
}

/* =============================================================================
 * Columns Wrapper Card
 * ============================================================================= */

const COLUMNS_CARD_TAG = CARD_TAG;
const COLUMNS_EDITOR_TAG = EDITOR_TAG;
const GRAPH_MODES = ["individual", "shared"];
const PERIOD_OPTIONS = ["hours", "today", "yesterday", "7d", "30d"];

function cloneValue(x) {
  return x == null ? x : JSON.parse(JSON.stringify(x));
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function pickColumnDefaults(index = 0) {
  const base = cloneValue(DEFAULTS);
  base.name = index === 0 ? "Temperature" : `Temperature ${index + 1}`;
  base.intervals = deepClone(DEFAULT_INTERVALS).map(normalizeInterval);
  return base;
}

function normalizeColumnDraft(raw, index = 0) {
  const next = { ...pickColumnDefaults(index), ...(cloneValue(raw) || {}) };
  if ("liquid_animation" in next) delete next.liquid_animation;
  next.symbol_variant = normalizeChoice(next.symbol_variant, SYMBOL_VARIANTS, "classic");
  next.board_scale_format = normalizeChoice(next.board_scale_format, BOARD_SCALE_FORMATS, "both");
  next.symbol_style = normalizeChoice(next.symbol_style, SYMBOL_STYLES, "classic");
  next.liquid_effect = normalizeChoice(next.liquid_effect, LIQUID_EFFECTS, "none");
  next.extra_position_1 = normalizeChoice(next.extra_position_1, EXTRA_POSITIONS, "right");
  next.extra_position_2 = normalizeChoice(next.extra_position_2, EXTRA_POSITIONS, "right");
  next.extra_position_3 = normalizeChoice(next.extra_position_3, EXTRA_POSITIONS, "right");
  next.extra_background_1 = next.extra_background_1 !== false;
  next.extra_background_2 = next.extra_background_2 !== false;
  next.extra_background_3 = next.extra_background_3 !== false;
  next.board_background_color = normalizeHex(next.board_background_color, "#e4e4e4");
  next.board_background_visible = next.board_background_visible !== false;
  next.board_background_gradient = next.board_background_gradient !== false;
  if (!Array.isArray(next.intervals) || !next.intervals.length) {
    next.intervals = deepClone(DEFAULT_INTERVALS);
  }
  next.intervals = next.intervals.map(normalizeInterval);
  return next;
}

function extractLegacySingleConfig(raw) {
  const col = {};
  Object.keys(DEFAULTS).forEach((key) => {
    if (key in (raw || {})) col[key] = cloneValue(raw[key]);
  });
  return normalizeColumnDraft(col, 0);
}

function normalizeColumnsConfig(raw) {
  const source = cloneValue(raw) || {};
  let columns = Array.isArray(source.columns) ? source.columns.slice() : [];
  if (!columns.length) {
    if (source.entity) columns = [extractLegacySingleConfig(source)];
    else columns = [pickColumnDefaults(0)];
  }
  columns = columns.map((col, idx) => normalizeColumnDraft(col, idx));

  const first = columns[0] || pickColumnDefaults(0);
  const graphMode = normalizeChoice(source.graph_mode, GRAPH_MODES, "individual");

  return {
    type: String(source.type || CARD_TAG),
    card_mod: cloneValue(source.card_mod),
    title: String(source.title ?? source.name ?? ""),
    graph_mode: graphMode,
    show_shared_graph: source.show_shared_graph !== false,
    show_shared_stats: source.show_shared_stats !== false,
    shared_stats_period: PERIOD_OPTIONS.includes(String(source.shared_stats_period || "")) ? String(source.shared_stats_period) : String(first.stats_period || "hours"),
    shared_stats_hours: clampNumber(source.shared_stats_hours ?? first.stats_hours ?? 24, 1, 720, 24),
    shared_graph_period: PERIOD_OPTIONS.includes(String(source.shared_graph_period || "")) ? String(source.shared_graph_period) : String(first.graph_period || "hours"),
    shared_graph_hours: clampNumber(source.shared_graph_hours ?? first.graph_hours ?? 24, 1, 720, 24),
    shared_graph_height: clampNumber(source.shared_graph_height ?? first.graph_height ?? 58, 40, 220, 58),
    shared_graph_show_time: source.shared_graph_show_time !== false,
    shared_graph_max_points: clampNumber(source.shared_graph_max_points ?? first.graph_max_points ?? 160, 30, 600, 160),
    shared_graph_line_width: clampNumber(source.shared_graph_line_width ?? first.graph_line_width ?? 1.0, 0.3, 3.0, 1.0),
    compact_columns: source.compact_columns !== undefined
      ? source.compact_columns !== false
      : source.shared_compact_columns !== undefined
        ? source.shared_compact_columns !== false
        : true,
    column_min_width: clampNumber(
      source.column_min_width ?? source.shared_column_min_width ?? 120,
      80,
      260,
      120
    ),
    shared_compact_columns: source.shared_compact_columns !== false,
    shared_column_min_width: clampNumber(source.shared_column_min_width ?? 140, 80, 260, 140),
    column_gap: clampNumber(source.column_gap ?? 16, 6, 40, 16),
    columns,
  };
}

class AndyTemperatureColumnsCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: { state: true },
      _sharedStats: { state: true },
      _sharedSeries: { state: true },
      _lastSharedAt: { state: false },
      _sharedBusy: { state: false },
    };
  }

  get hass() {
    return this._hass;
  }

  set hass(value) {
    const oldValue = this._hass;
    this._hass = value;
    this.requestUpdate("hass", oldValue);
    if (this._config) {
      this._syncChildCards();
      if (this._config?.graph_mode === "shared") {
        this._maybeUpdateSharedData();
      }
    }
  }

  setConfig(config) {
    this._config = normalizeColumnsConfig(config);
    this._sharedStats = null;
    this._sharedSeries = null;
    this._lastSharedAt = 0;
    this._sharedBusy = false;
  }

  shouldUpdate(changedProps) {
    if (
      changedProps.size === 1 &&
      changedProps.has("hass") &&
      this._config?.graph_mode !== "shared"
    ) {
      return false;
    }
    return true;
  }

  static getConfigElement() {
    return document.createElement(COLUMNS_EDITOR_TAG);
  }

  updated(changedProps) {
    if (changedProps.has("hass") || changedProps.has("_config")) {
      this._syncChildCards();
      this._maybeUpdateSharedData();
    }
  }

  _getColumns() {
    return Array.isArray(this._config?.columns) ? this._config.columns.map((col, idx) => normalizeColumnDraft(col, idx)) : [pickColumnDefaults(0)];
  }

  _getSharedUnit() {
    const first = this._getColumns()[0];
    if (first?.unit) return first.unit;
    const entityId = first?.entity;
    return entityId ? (this.hass?.states?.[entityId]?.attributes?.unit_of_measurement ?? "") : "";
  }

  _sharedNeedsStats() {
    return this._config?.graph_mode === "shared" && !!this._config?.show_shared_stats;
  }

  _sharedNeedsGraph() {
    return this._config?.graph_mode === "shared" && !!this._config?.show_shared_graph;
  }

  _getSharedEntities() {
    const seen = new Set();
    return this._getColumns()
      .map((col) => String(col.entity || "").trim())
      .filter((entityId) => entityId && !seen.has(entityId) && seen.add(entityId));
  }

  _getSharedCurrentAverage() {
    const values = this._getColumns()
      .map((col) => {
        const st = this.hass?.states?.[col.entity];
        const n = Number(st?.state);
        return Number.isFinite(n) ? n : null;
      })
      .filter((n) => Number.isFinite(n));
    if (!values.length) return null;
    return values.reduce((sum, n) => sum + n, 0) / values.length;
  }

  _findIntervalForColumn(col, value) {
    const intervals = intervalsSortedByTo(col?.intervals || DEFAULT_INTERVALS);
    for (const it of intervals) if (value <= it.to) return normalizeInterval(it);
    return intervals.length ? intervals[intervals.length - 1] : normalizeInterval(DEFAULT_INTERVALS[DEFAULT_INTERVALS.length - 1]);
  }

  async _fetchHistorySeries(entityId, startIso, endIso, statsRange, graphRange) {
    const path =
      `history/period/${encodeURIComponent(startIso)}` +
      `?filter_entity_id=${encodeURIComponent(entityId)}` +
      `&end_time=${encodeURIComponent(endIso)}`;

    const data = await this.hass.callApi("GET", path);
    let seriesRaw;
    if (Array.isArray(data)) {
      seriesRaw = data.length ? data[0] : [];
    } else if (data && typeof data === "object") {
      const keys = Object.keys(data);
      if (keys.length && Array.isArray(data[keys[0]])) seriesRaw = data[keys[0]];
      else seriesRaw = [];
    } else {
      seriesRaw = [];
    }

    const statsValues = [];
    const graphPoints = [];
    const tsOf = (item) => {
      const s = item?.last_changed || item?.last_updated || item?.lc || item?.lu;
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : null;
    };
    const inRange = (t, range) => t != null && t >= range.start.getTime() && t <= range.end.getTime();

    for (const item of (seriesRaw || [])) {
      const n = Number(item?.state ?? item?.s);
      if (!Number.isFinite(n)) continue;
      const t = tsOf(item);
      if (statsRange && inRange(t, statsRange)) statsValues.push(n);
      if (graphRange && inRange(t, graphRange)) graphPoints.push({ t, v: n });
    }

    let stats = null;
    if (statsValues.length) {
      let min = statsValues[0];
      let max = statsValues[0];
      let sum = 0;
      for (const n of statsValues) {
        if (n < min) min = n;
        if (n > max) max = n;
        sum += n;
      }
      stats = { min, max, avg: sum / statsValues.length };
    }

    return { stats, points: normalizeTimeSeries(graphPoints) };
  }

  _sampleSeriesLinear(points, t) {
    if (!Array.isArray(points) || !points.length) return null;
    if (t <= points[0].t) return points[0].v;
    const last = points[points.length - 1];
    if (t >= last.t) return last.v;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const next = points[i];
      if (t === next.t) return next.v;
      if (t < next.t) {
        const span = next.t - prev.t || 1;
        const ratio = (t - prev.t) / span;
        return prev.v + ((next.v - prev.v) * ratio);
      }
    }
    return last.v;
  }

  _buildSharedAverageSeries(entitySeries, range, maxPoints) {
    const valid = (entitySeries || []).filter((entry) => Array.isArray(entry.points) && entry.points.length);
    if (!valid.length) return [];

    const startMs = range.start.getTime();
    const endMs = range.end.getTime();
    const count = Math.max(30, Math.min(Number(maxPoints) || 160, 240));
    const points = [];
    const span = Math.max(1, endMs - startMs);

    for (let i = 0; i < count; i += 1) {
      const t = startMs + (span * (i / Math.max(1, count - 1)));
      const samples = valid
        .map((entry) => this._sampleSeriesLinear(entry.points, t))
        .filter((v) => Number.isFinite(v));
      if (!samples.length) continue;
      points.push({
        t,
        v: samples.reduce((sum, n) => sum + n, 0) / samples.length,
      });
    }
    return downsampleSeries(points, count);
  }

  async _maybeUpdateSharedData() {
    if (!this.hass || !this._config) return;
    if (this._config.graph_mode !== "shared") {
      this._sharedStats = null;
      this._sharedSeries = null;
      return;
    }

    const needStats = this._sharedNeedsStats();
    const needGraph = this._sharedNeedsGraph();
    if (!needStats && !needGraph) {
      this._sharedStats = null;
      this._sharedSeries = null;
      return;
    }

    const entities = this._getSharedEntities();
    if (!entities.length) {
      this._sharedStats = null;
      this._sharedSeries = [];
      return;
    }

    const now = Date.now();
    const throttleMs = 30 * 1000;
    if (
      this._lastSharedAt &&
      now - this._lastSharedAt < throttleMs &&
      (!needStats || this._sharedStats) &&
      (!needGraph || this._sharedSeries)
    ) {
      return;
    }

    const statsRange = needStats ? resolvePeriodRange(String(this._config.shared_stats_period || "hours"), this._config.shared_stats_hours ?? 24) : null;
    const graphRange = needGraph ? resolvePeriodRange(String(this._config.shared_graph_period || "hours"), this._config.shared_graph_hours ?? 24) : null;

    let start = statsRange ? statsRange.start : graphRange.start;
    let end = statsRange ? statsRange.end : graphRange.end;
    if (statsRange && graphRange) {
      if (graphRange.start < start) start = graphRange.start;
      if (graphRange.end > end) end = graphRange.end;
    }

    this._sharedBusy = true;
    try {
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const all = await Promise.all(
        entities.map(async (entityId) => ({
          entityId,
          ...(await this._fetchHistorySeries(entityId, startIso, endIso, statsRange, graphRange)),
        }))
      );

      if (needStats) {
        const metricRows = all.map((entry) => entry.stats).filter((entry) => entry && Number.isFinite(entry.min) && Number.isFinite(entry.avg) && Number.isFinite(entry.max));
        if (metricRows.length) {
          this._sharedStats = {
            min: metricRows.reduce((sum, row) => sum + row.min, 0) / metricRows.length,
            avg: metricRows.reduce((sum, row) => sum + row.avg, 0) / metricRows.length,
            max: metricRows.reduce((sum, row) => sum + row.max, 0) / metricRows.length,
            samples: metricRows.length,
          };
        } else {
          this._sharedStats = { min: null, avg: null, max: null, samples: 0 };
        }
      } else {
        this._sharedStats = null;
      }

      if (needGraph) {
        this._sharedSeries = this._buildSharedAverageSeries(all, graphRange, this._config.shared_graph_max_points ?? 160);
      } else {
        this._sharedSeries = null;
      }

      this._lastSharedAt = now;
    } catch (err) {
      console.error("Andy Temperature Columns: shared history fetch failed", err);
      if (needStats) {
        this._sharedStats = { min: null, avg: null, max: null, samples: 0, error: true };
      }
      if (needGraph) this._sharedSeries = [];
      this._lastSharedAt = now;
    } finally {
      this._sharedBusy = false;
    }
  }

  _syncChildCards() {
    const root = this.renderRoot;
    if (!root) return;
    const mounts = Array.from(root.querySelectorAll(".columnMount"));
    const columns = this._getColumns();
    const sharedMode = this._config?.graph_mode === "shared";

    mounts.forEach((mount, idx) => {
      const col = columns[idx];
      if (!col) {
        mount.innerHTML = "";
        return;
      }
      const entityId = String(col.entity || "").trim();
      if (!entityId) {
        mount.innerHTML = `<div class="columnPlaceholder">Select an entity for column ${idx + 1}</div>`;
        return;
      }
      let el = mount.firstElementChild;
      if (!el || el.tagName.toLowerCase() !== INTERNAL_SINGLE_CARD_TAG) {
        mount.innerHTML = "";
        el = document.createElement(INTERNAL_SINGLE_CARD_TAG);
        el.className = "singleColumnCard";
        el.style.display = "block";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.setProperty("--ha-card-background", "transparent");
        el.style.setProperty("--ha-card-box-shadow", "none");
        el.style.setProperty("--ha-card-border-width", "0");
        mount.appendChild(el);
      }

      const childConfig = cloneValue(col);
      if (this._config?.card_mod) {
        const childCardMod = cloneValue(this._config.card_mod);
        const childStyle = stripPureHaCardRules(getCardModStyleText(childCardMod));
        if ("style" in childCardMod) {
          if (childStyle) childCardMod.style = childStyle;
          else delete childCardMod.style;
        }
        if (Object.keys(childCardMod).length) {
          childConfig.card_mod = childCardMod;
        }
      }
      if (sharedMode) {
        childConfig.show_graph = false;
        childConfig.show_stats = false;
      }
      el.hass = this.hass;
      try {
        const nextConfigText = JSON.stringify(childConfig);
        if (el._lastColumnsConfigText !== nextConfigText) {
          el._lastColumnsConfigText = nextConfigText;
          el.setConfig(childConfig);
        }
      } catch (err) {
        console.error("Andy Temperature Columns: child config failed", err, childConfig);
      }
    });
  }

  _renderSharedStatsRow() {
    if (!this._sharedNeedsStats()) return "";
    const stats = this._sharedStats || { min: null, avg: null, max: null };
    const unit = this._getSharedUnit();
    const decimals = Number(this._getColumns()[0]?.decimals ?? 1);
    const m = fmtNum(stats.min, decimals) ?? "—";
    const a = fmtNum(stats.avg, decimals) ?? "—";
    const x = fmtNum(stats.max, decimals) ?? "—";
    return html`
      <div class="sharedStatsRow">
        <span>Min avg: ${m}${unit}</span>
        <span>Avg avg: ${a}${unit}</span>
        <span>Max avg: ${x}${unit}</span>
      </div>
    `;
  }

  _renderSharedGraph() {
    if (!this._sharedNeedsGraph()) return "";
    const series = Array.isArray(this._sharedSeries) ? normalizeTimeSeries(this._sharedSeries) : null;
    const heightPx = Number(this._config.shared_graph_height ?? 58);
    const height = Number.isFinite(heightPx) ? heightPx : 58;
    if (!series || !series.length) {
      return html`
        <div class="graphWrap shared" style="height:${height}px;">
          <div class="graphEmpty">No shared history</div>
        </div>
      `;
    }

    try {
      let s = series;
      if (s.length === 1) {
        const p = s[0];
        const t2 = p.t + 60 * 60 * 1000;
        s = [{ t: p.t, v: p.v }, { t: t2, v: p.v }];
      }

      const W = 260;
      const H = 60;
      const padL = 8;
      const padR = 8;
      const padT = 6;
      const padB = 8;
      const innerW = W - padL - padR;
      const innerH = H - padT - padB;
      const t0 = s[0].t;
      const t1 = s[s.length - 1].t;
      const dt = (t1 - t0) || 1;

      let yMin = s[0].v;
      let yMax = s[0].v;
      for (const p of s) {
        if (p.v < yMin) yMin = p.v;
        if (p.v > yMax) yMax = p.v;
      }
      if (Math.abs(yMax - yMin) < 0.001) {
        yMin -= 1;
        yMax += 1;
      }

      const xFor = (t) => padL + ((t - t0) / dt) * innerW;
      const yFor = (v) => {
        const t = clamp01((v - yMin) / (yMax - yMin));
        return padT + (1 - t) * innerH;
      };

      const pts = s.map((p) => ({ x: xFor(p.t), y: yFor(p.v) }));
      const pathD = buildSmoothPath(pts);
      const baseY = padT + innerH;
      const firstX = pts[0].x;
      const lastX = pts[pts.length - 1].x;
      const areaD = `${pathD} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

      const refColumn = this._getColumns()[0] || pickColumnDefaults(0);
      const last = s[s.length - 1];
      const it = normalizeInterval(this._findIntervalForColumn(refColumn, last.v));
      const c = normalizeHex(it.scale_color || it.color, "#ffffff");
      const strokeW = Number(this._config.shared_graph_line_width ?? 1.0) || 1.0;
      const showTimeTicks = this._config.shared_graph_show_time !== false;
      const ticks = [];
      if (showTimeTicks && dt > 0) {
        const count = 4;
        for (let i = 0; i <= count; i++) {
          const frac = i / count;
          const tTick = t0 + frac * dt;
          ticks.push({ t: tTick, label: toLocalHHMM(tTick) });
        }
      }

      return html`
        <div class="graphWrap shared" style="--shared-graph-height:${height}px;">
          <div class="graphInner">
            <svg class="graph sharedGraph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Shared history graph">
              <defs>
                <linearGradient id="columnsSharedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="${c}" stop-opacity="0.25"></stop>
                  <stop offset="100%" stop-color="${c}" stop-opacity="0"></stop>
                </linearGradient>
              </defs>
              <path d="${areaD}" fill="url(#columnsSharedFill)" stroke="none"></path>
              <path d="${pathD}" fill="none" stroke="${c}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round"></path>
              <circle cx="${lastX}" cy="${yFor(last.v)}" r="2.6" fill="${c}" stroke="rgba(0,0,0,0.18)" stroke-width="1"></circle>
            </svg>
            ${showTimeTicks && ticks.length ? html`
              <div class="graphTicks">
                <div class="graphTicksLabels">
                  ${ticks.map((ti) => html`<span>${ti.label}</span>`)}
                </div>
              </div>
            ` : ""}
          </div>
        </div>
      `;
    } catch (e) {
      console.error("Andy Temperature Columns shared graph error", e);
      return html`
        <div class="graphWrap shared" style="--shared-graph-height:${height}px;">
          <div class="graphEmpty">Shared graph error</div>
        </div>
      `;
    }
  }

  render() {
    const columns = this._getColumns();
    const title = String(this._config?.title || "");
    const gap = clampNumber(this._config?.column_gap ?? 16, 6, 40, 16);
    const compactColumns = this._config?.compact_columns !== false;
    const columnMin = compactColumns
      ? clampNumber(this._config?.column_min_width ?? 140, 80, 260, 140)
      : 190;
    const cardModStyle = getCardModStyleText(this._config?.card_mod);

    return html`
      ${cardModStyle ? html`<style>${cardModStyle}</style>` : ""}
      <ha-card>
        <div class="columnsWrap" style="--columns-gap:${gap}px; --columns-min:${columnMin}px;">
          ${title ? html`<div class="columnsTitle title">${title}</div>` : ""}
          <div class="columnsGrid cols-${Math.min(columns.length, 4)}">
            ${columns.map((_, idx) => html`
              <div class="columnCell">
                <div class="columnMount" data-idx="${idx}"></div>
              </div>
            `)}
          </div>
          ${this._renderSharedGraph()}
          ${this._renderSharedStatsRow()}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host { display:block; }
      .columnsWrap {
        display:flex;
        flex-direction:column;
        gap:14px;
        padding: 12px;
      }
      .columnsTitle {
        font-weight: 700;
        font-size: 16px;
        line-height: 1.2;
      }
      .columnsGrid {
        display:grid;
        grid-template-columns: repeat(auto-fit, minmax(var(--columns-min, 190px), 1fr));
        gap: var(--columns-gap, 16px);
        align-items: start;
      }
      .columnCell {
        min-width: 0;
      }
      .columnMount {
        width: 100%;
      }
      .columnPlaceholder {
        min-height: 220px;
        border-radius: 16px;
        border: 1px dashed rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.03);
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding: 18px;
        font-size: 13px;
        opacity: 0.78;
      }
      .sharedStatsRow {
        display:flex;
        justify-content:center;
        gap: 18px;
        flex-wrap: wrap;
        font-size: 13px;
        opacity: 0.92;
        margin-top: 0;
        padding-bottom: 1px;
      }
      .graphWrap.shared {
        margin-top: 0;
      }
      .graphWrap {
        width: 100%;
      }
      .graphInner {
        width: 100%;
        display:flex;
        flex-direction:column;
        gap: 1px;
      }
      .graph {
        display:block;
        width:100%;
        height:100%;
      }
      .sharedGraph {
        height: var(--shared-graph-height, 58px);
        flex: 0 0 auto;
      }
      .graphTicks {
        margin-top: 0;
        flex: 0 0 auto;
      }
      .graphEmpty {
        opacity:0.6;
        font-size:12px;
      }
      .graphTicksLabels {
        display:flex;
        justify-content:space-between;
        gap:8px;
        font-size:11px;
        opacity:0.7;
        margin-top:1px;
      }
    `;
  }
}

if (!customElements.get(COLUMNS_CARD_TAG)) {
  customElements.define(COLUMNS_CARD_TAG, AndyTemperatureColumnsCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: COLUMNS_CARD_TAG,
  name: "Andy Temperature Card",
  description: "Temperature card with multi-column support and optional shared graph/stats.",
});

/* =============================================================================
 * Columns Wrapper Editor
 * ============================================================================= */

const COLUMNS_DEFAULTS = {
  type: CARD_TAG,
  title: "",
  graph_mode: "individual",
  show_shared_graph: true,
  show_shared_stats: true,
  shared_stats_period: "hours",
  shared_stats_hours: 24,
  shared_graph_period: "hours",
  shared_graph_hours: 24,
  shared_graph_height: 58,
  shared_graph_show_time: true,
  shared_graph_max_points: 160,
  shared_graph_line_width: 1.0,
  compact_columns: true,
  column_min_width: 120,
  shared_compact_columns: true,
  shared_column_min_width: 120,
  column_gap: 16,
  columns: [pickColumnDefaults(0)],
};

class AndyTemperatureColumnsEditor extends HTMLElement {
  setConfig(config) {
    const nextConfig = {
      ...cloneValue(COLUMNS_DEFAULTS),
      ...normalizeColumnsConfig(config),
    };
    const nextJson = JSON.stringify(nextConfig);
    this._config = nextConfig;
    if (this._built && this._pendingChildConfigJson && this._pendingChildConfigJson === nextJson) {
      this._pendingChildConfigJson = "";
      return;
    }
    this._buildOnce();
    this._sync();
  }

  set hass(hass) {
    this._hass = hass;
    this._syncColumnEditors();
  }

  _buildOnce() {
    if (this._built) return;
    this._built = true;

    const stopBubble = (e) => e.stopPropagation();
    const mkText = (label, key, type = "text", placeholder = "") => {
      const tf = createEditorInput();
      tf.label = label;
      tf.type = type;
      tf.placeholder = placeholder;
      tf.configValue = key;
      tf.addEventListener("input", (e) => {
        clearTimeout(tf._debounceTimer);
        tf._debounceTimer = setTimeout(() => this._onChange(e), 120);
      });
      tf.addEventListener("change", (e) => this._onChange(e));
      tf.addEventListener("value-changed", (e) => this._onChange(e));
      return tf;
    };
    const mkSwitch = (label, key) => {
      const ff = document.createElement("ha-formfield");
      ff.label = label;
      const sw = document.createElement("ha-switch");
      sw.configValue = key;
      sw.addEventListener("change", (e) => this._onChange(e));
      sw.addEventListener("value-changed", (e) => this._onChange(e));
      ff.appendChild(sw);
      return { wrap: ff, sw };
    };
    const mkSelect = (label, key, options) => {
      const hasSelector = !!customElements.get("ha-selector");
      const sel = hasSelector ? document.createElement("ha-selector") : document.createElement("select");
      sel.label = label;
      sel.configValue = key;
      const normalized = (options || []).map((opt) => Array.isArray(opt) ? { value: String(opt[0]), label: String(opt[1]) } : { value: String(opt.value), label: String(opt.label ?? opt.value) });
      const isHaSelector = sel.tagName.toLowerCase() === "ha-selector";

      if (isHaSelector) {
        sel.hass = this._hass;
        sel.selector = { select: { mode: "dropdown", options: normalized } };
      } else {
        normalized.forEach(({ value, label: optionLabel }) => {
          const item = document.createElement("option");
          item.value = value;
          item.textContent = optionLabel;
          sel.appendChild(item);
        });
      }
      const handle = (e) => {
        stopBubble(e);
        const resolvedValue = (e?.detail && "value" in e.detail) ? e.detail.value : sel.value;
        this._onChange({
          currentTarget: sel,
          target: sel,
          detail: { value: resolvedValue },
        });
      };
      if (isHaSelector) {
        sel.addEventListener("value-changed", handle);
      } else {
        sel.addEventListener("change", handle);
      }
      return sel;
    };

    const style = document.createElement("style");
    style.textContent = `
      .columnsEditor { display:flex; flex-direction:column; gap:14px; padding:8px 0; }
      .columnsTopTitle {
        padding:10px 14px;
        border-radius:12px;
        border:1px solid color-mix(in srgb, var(--warning-color, #ff9800) 55%, transparent);
        background:color-mix(in srgb, var(--warning-color, #ff9800) 22%, transparent);
        font-weight:800;
        opacity:.98;
        color:var(--primary-text-color);
        letter-spacing:.2px;
      }
      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
      .grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; }
      .section { border-top:1px solid rgba(0,0,0,0.10); padding-top:10px; display:flex; flex-direction:column; gap:10px; }
      .section-title {
        background: color-mix(in srgb, var(--warning-color, #ff9800) 22%, transparent);
        padding: 8px 10px;
        border-radius: 12px;
        border: 1px solid color-mix(in srgb, var(--warning-color, #ff9800) 55%, transparent);
        font-weight: 800;
        opacity: 0.98;
        color: var(--primary-text-color);
        letter-spacing: .2px;
      }
      .section-head { display:flex; justify-content:space-between; align-items:center; gap:10px; }
      .section-head.alignStart { justify-content:flex-start; }
      .section-note { font-size:12px; opacity:.75; line-height:1.35; }
      .toggles { display:flex; flex-direction:column; gap:8px; }
      .columnList { display:flex; flex-direction:column; gap:12px; }
      .columnCard {
        border-radius:14px;
        border:1px solid rgba(0,0,0,0.12);
        padding:12px;
        display:flex;
        flex-direction:column;
        gap:10px;
        background:rgba(0,0,0,0.02);
      }
      .columnHead { display:flex; justify-content:space-between; align-items:center; gap:10px; }
      .columnTitle {
        font-weight:800;
        font-size:14px;
        line-height:1.2;
        flex:1 1 auto;
      }
      .columnsSectionTitle { flex:1 1 auto; }
      .columnActions { display:flex; gap:8px; align-items:center; }
      .actionButton {
        --mdc-shape-small: 10px;
      }
      .actionButton[raised],
      .actionButton[unelevated],
      .actionButton[outlined] {
        min-width: 0;
      }
      .badgeSupport{
        border-radius:16px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(0,0,0,0.18);
        padding: 14px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .badgeSupportTitle{ font-weight: 800; }
      .badgeSupportText{ font-size: 13px; opacity: .9; line-height: 1.35; }
      .badgeSupportActions{ display:flex; }
      .badgeSupportImgLink img{ border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
      .columnEditor .badgeSupport,
      .columnEditor .editorTopTitle { display:none !important; }
      .columnEditor .editorWrap { gap:10px; }
      mwc-button { --mdc-theme-primary: var(--primary-color); --mdc-theme-on-primary: #fff; }
      mwc-button.danger { --mdc-theme-primary: var(--error-color); --mdc-theme-on-primary: #fff; }
    `;

    const root = document.createElement("div");
    root.className = "columnsEditor";

    const top = document.createElement("div");
    top.className = "columnsTopTitle";
    top.textContent = `Andy Temperature Card Columns v${CARD_VERSION}`;
    root.appendChild(top);

    const support = document.createElement("div");
    support.className = "badgeSupport";
    support.innerHTML = `
      <div class="badgeSupportTitle">&#9749; Support the project</div>
      <div class="badgeSupportText">
        I’m a Home Automation enthusiast who spends late nights building custom cards and tools for Home Assistant.
        If you enjoy my work or use any of my cards, your support helps me keep improving and maintaining everything.
      </div>
      <div class="badgeSupportActions">
        <a class="badgeSupportImgLink" href="https://www.buymeacoffee.com/AndyBonde" target="_blank" rel="noopener noreferrer" aria-label="Buy me a coffee">
          <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" width="140" alt="Buy me a coffee">
        </a>
      </div>
    `;
    root.appendChild(support);

    this._elTitle = mkText("Card title (optional)", "title");
    root.appendChild(this._elTitle);

    const sharedSection = document.createElement("div");
    sharedSection.className = "section";
    const sharedTitle = document.createElement("div");
    sharedTitle.className = "section-title";
    sharedTitle.textContent = "Shared graph / stats";
    sharedSection.appendChild(sharedTitle);

    this._elGraphMode = mkSelect("Graph mode", "graph_mode", [
      ["individual", "Individual per column"],
      ["shared", "Shared below all columns"],
    ]);
    sharedSection.appendChild(this._elGraphMode);

    this._sharedSettings = document.createElement("div");
    this._sharedSettings.className = "section";

    const rowToggles = document.createElement("div");
    rowToggles.className = "toggles";
    const { wrap: swSharedGraphWrap, sw: swSharedGraph } = mkSwitch("Show shared graph", "show_shared_graph");
    const { wrap: swSharedStatsWrap, sw: swSharedStats } = mkSwitch("Show shared Min/Avg/Max", "show_shared_stats");
    this._swSharedGraph = swSharedGraph;
    this._swSharedStats = swSharedStats;
    rowToggles.appendChild(swSharedGraphWrap);
    rowToggles.appendChild(swSharedStatsWrap);
    this._sharedSettings.appendChild(rowToggles);

    const rowSharedStats = document.createElement("div");
    rowSharedStats.className = "grid2";
    this._elSharedStatsPeriod = mkSelect("Shared stats period", "shared_stats_period", [
      ["hours", "Last N hours"],
      ["today", "Today"],
      ["yesterday", "Yesterday"],
      ["7d", "Last 7 days"],
      ["30d", "Last 30 days"],
    ]);
    this._elSharedStatsHours = mkText("Shared stats hours", "shared_stats_hours", "number", "24");
    rowSharedStats.appendChild(this._elSharedStatsPeriod);
    rowSharedStats.appendChild(this._elSharedStatsHours);
    this._sharedSettings.appendChild(rowSharedStats);

    const rowSharedGraphA = document.createElement("div");
    rowSharedGraphA.className = "grid2";
    this._elSharedGraphPeriod = mkSelect("Shared graph period", "shared_graph_period", [
      ["hours", "Last N hours"],
      ["today", "Today"],
      ["yesterday", "Yesterday"],
      ["7d", "Last 7 days"],
      ["30d", "Last 30 days"],
    ]);
    this._elSharedGraphHours = mkText("Shared graph hours", "shared_graph_hours", "number", "24");
    rowSharedGraphA.appendChild(this._elSharedGraphPeriod);
    rowSharedGraphA.appendChild(this._elSharedGraphHours);
    this._sharedSettings.appendChild(rowSharedGraphA);

    const rowSharedGraphB = document.createElement("div");
    rowSharedGraphB.className = "grid2";
    this._elSharedGraphHeight = mkText("Shared graph height", "shared_graph_height", "number", "58");
    this._elSharedGraphPoints = mkText("Shared graph max points", "shared_graph_max_points", "number", "160");
    rowSharedGraphB.appendChild(this._elSharedGraphHeight);
    rowSharedGraphB.appendChild(this._elSharedGraphPoints);
    this._sharedSettings.appendChild(rowSharedGraphB);

    const rowSharedGraphC = document.createElement("div");
    rowSharedGraphC.className = "grid2";
    this._elSharedGraphLineWidth = mkText("Shared graph line width", "shared_graph_line_width", "number", "1");
    rowSharedGraphC.appendChild(this._elSharedGraphLineWidth);
    this._sharedSettings.appendChild(rowSharedGraphC);

    const { wrap: swSharedTimeWrap, sw: swSharedTime } = mkSwitch("Shared graph: show time ticks", "shared_graph_show_time");
    this._swSharedGraphTime = swSharedTime;
    this._sharedSettings.appendChild(swSharedTimeWrap);

    sharedSection.appendChild(this._sharedSettings);
    root.appendChild(sharedSection);

    const columnsSection = document.createElement("div");
    columnsSection.className = "section";
    const columnsHead = document.createElement("div");
    columnsHead.className = "section-head alignStart";
    const columnsTitle = document.createElement("div");
    columnsTitle.className = "section-title columnsSectionTitle";
    columnsTitle.textContent = "Columns";
    const addBtn = document.createElement("mwc-button");
    addBtn.className = "actionButton";
    addBtn.setAttribute("raised", "");
    addBtn.textContent = "+ Add column";
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = this._getColumns();
      next.push(pickColumnDefaults(next.length));
      this._commit("columns", next);
    });
    columnsHead.appendChild(columnsTitle);
    columnsHead.appendChild(addBtn);
    columnsSection.appendChild(columnsHead);

    const note = document.createElement("div");
    note.className = "section-note";
    note.textContent = "Each column uses the full single-card editor below, so every temperature column can have its own symbol type, intervals, graph settings and extras.";
    columnsSection.appendChild(note);

    const rowColumnsLayout = document.createElement("div");
    rowColumnsLayout.className = "grid3";
    this._elColumnGap = mkText("Column gap (px)", "column_gap", "number", "16");
    const { wrap: swCompactWrap, sw: swCompact } = mkSwitch("Compact columns", "compact_columns");
    this._swCompactColumns = swCompact;
    this._elColumnMinWidth = mkText("Column min width (px)", "column_min_width", "number", "120");
    rowColumnsLayout.appendChild(this._elColumnGap);
    rowColumnsLayout.appendChild(swCompactWrap);
    rowColumnsLayout.appendChild(this._elColumnMinWidth);
    columnsSection.appendChild(rowColumnsLayout);

    this._columnList = document.createElement("div");
    this._columnList.className = "columnList";
    columnsSection.appendChild(this._columnList);
    root.appendChild(columnsSection);

    this.innerHTML = "";
    this.appendChild(style);
    this.appendChild(root);
  }

  _getColumns() {
    return Array.isArray(this._config?.columns) ? this._config.columns.map((col, idx) => normalizeColumnDraft(col, idx)) : [pickColumnDefaults(0)];
  }

  _setFieldValue(el, value) {
    if (!el) return;
    if (document.activeElement === el || el.matches?.(":focus-within")) return;
    const next = value == null ? "" : String(value);
    const current = el.value == null ? "" : String(el.value);
    if (current !== next) el.value = next;
  }

  _setSelectorValue(el, value) {
    if (!el) return;
    el.value = value == null ? "" : String(value);
  }

  _setFieldChecked(el, value) {
    if (!el) return;
    if (document.activeElement === el || el.matches?.(":focus-within")) return;
    const next = !!value;
    if (!!el.checked !== next) el.checked = next;
  }

  _sync() {
    if (!this._config) return;
    this._setFieldValue(this._elTitle, this._config.title || "");
    this._setSelectorValue(this._elGraphMode, this._config.graph_mode || "individual");
    this._setFieldChecked(this._swSharedGraph, !!this._config.show_shared_graph);
    this._setFieldChecked(this._swSharedStats, !!this._config.show_shared_stats);
    this._setSelectorValue(this._elSharedStatsPeriod, this._config.shared_stats_period || "hours");
    this._setFieldValue(this._elSharedStatsHours, this._config.shared_stats_hours ?? 24);
    this._setSelectorValue(this._elSharedGraphPeriod, this._config.shared_graph_period || "hours");
    this._setFieldValue(this._elSharedGraphHours, this._config.shared_graph_hours ?? 24);
    this._setFieldValue(this._elSharedGraphHeight, this._config.shared_graph_height ?? 58);
    this._setFieldValue(this._elSharedGraphPoints, this._config.shared_graph_max_points ?? 160);
    this._setFieldValue(this._elSharedGraphLineWidth, this._config.shared_graph_line_width ?? 1.0);
    this._setFieldValue(this._elColumnGap, this._config.column_gap ?? 16);
    if (this._swCompactColumns) this._setFieldChecked(this._swCompactColumns, this._config.compact_columns !== false);
    if (this._elColumnMinWidth) this._setFieldValue(this._elColumnMinWidth, this._config.column_min_width ?? 140);
    this._setFieldChecked(this._swSharedGraphTime, this._config.shared_graph_show_time !== false);
    this._sharedSettings.style.display = (this._config.graph_mode === "shared") ? "" : "none";
    this._elSharedStatsHours.style.display = (this._config.shared_stats_period || "hours") === "hours" ? "" : "none";
    this._elSharedGraphHours.style.display = (this._config.shared_graph_period || "hours") === "hours" ? "" : "none";
    if (this._elColumnMinWidth) this._elColumnMinWidth.style.display = (this._config.compact_columns !== false) ? "" : "none";
    this._renderColumnEditors();
  }

  _syncColumnEditors() {
    (this._childEditors || []).forEach((entry) => {
      if (entry?.editor) entry.editor.hass = this._hass;
    });
  }

  _renderColumnEditors() {
    const columns = this._getColumns();
    this._childEditors = this._childEditors || [];
    const activeColumns = new Set(columns.map((_, idx) => idx));

    columns.forEach((columnConfig, idx) => {
      let entry = this._childEditors[idx];
      if (!entry) {
        const card = document.createElement("div");
        card.className = "columnCard";

        const head = document.createElement("div");
        head.className = "columnHead";
        const title = document.createElement("div");
        title.className = "columnTitle section-title";
        head.appendChild(title);

        const actions = document.createElement("div");
        actions.className = "columnActions";

        const duplicateBtn = document.createElement("mwc-button");
        duplicateBtn.className = "actionButton";
        duplicateBtn.setAttribute("outlined", "");
        duplicateBtn.textContent = "Duplicate";
        duplicateBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const currentIndex = Number(entry?.index ?? idx);
          const next = this._getColumns();
          const copy = normalizeColumnDraft(cloneValue(next[currentIndex] || columnConfig), next.length);
          next.splice(currentIndex + 1, 0, copy);
          this._commit("columns", next);
        });
        actions.appendChild(duplicateBtn);

        const del = document.createElement("mwc-button");
        del.className = "danger actionButton";
        del.setAttribute("unelevated", "");
        del.textContent = "Remove";
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          const currentIndex = Number(entry?.index ?? idx);
          const next = this._getColumns();
          next.splice(currentIndex, 1);
          this._commit("columns", next);
        });
        actions.appendChild(del);

        head.appendChild(actions);
        card.appendChild(head);

        const editor = document.createElement(INTERNAL_SINGLE_EDITOR_TAG);
        editor.className = "columnEditor";
        editor.hass = this._hass;
        editor.addEventListener("config-changed", (ev) => {
          ev.stopPropagation();
          const currentIndex = Number(entry?.index ?? idx);
          const next = this._getColumns();
          next[currentIndex] = normalizeColumnDraft(ev.detail?.config || {}, currentIndex);
          entry.title.textContent = String(next[currentIndex]?.name || "").trim() || `Column ${currentIndex + 1}`;
          entry.lastConfigJson = JSON.stringify(next[currentIndex]);
          entry.skipNextSetConfigJson = entry.lastConfigJson;
          const merged = {
            ...cloneValue(COLUMNS_DEFAULTS),
            ...(this._config || {}),
            columns: next,
          };
          merged.type = String(merged.type || CARD_TAG);
          this._config = merged;
          this._pendingChildConfigJson = JSON.stringify(merged);
          this.dispatchEvent(new CustomEvent("config-changed", {
            detail: { config: merged },
            bubbles: true,
            composed: true,
          }));
        });

        card.appendChild(editor);
        entry = { card, head, title, actions, duplicateBtn, del, editor, index: idx, lastConfigJson: "", skipNextSetConfigJson: "" };
        this._childEditors[idx] = entry;
      }

      entry.index = idx;
      entry.title.textContent = String(columnConfig.name || "").trim() || `Column ${idx + 1}`;
      entry.del.style.display = columns.length > 1 ? "" : "none";
      entry.editor.hass = this._hass;

      const nextJson = JSON.stringify(columnConfig);
      if (entry.lastConfigJson !== nextJson) {
        if (entry.skipNextSetConfigJson === nextJson) {
          entry.lastConfigJson = nextJson;
          entry.skipNextSetConfigJson = "";
        } else {
          entry.editor.setConfig(columnConfig);
          entry.lastConfigJson = nextJson;
        }
      }

      if (entry.card.parentElement !== this._columnList) {
        this._columnList.appendChild(entry.card);
      } else if (this._columnList.children[idx] !== entry.card) {
        this._columnList.insertBefore(entry.card, this._columnList.children[idx] || null);
      }
    });

    this._childEditors.forEach((entry, idx) => {
      if (!entry || activeColumns.has(idx)) return;
      if (entry.card?.parentElement === this._columnList) {
        this._columnList.removeChild(entry.card);
      }
    });
    this._childEditors.length = columns.length;
  }

  _commit(key, value) {
    const next = {
      ...cloneValue(COLUMNS_DEFAULTS),
      ...(this._config || {}),
      [key]: value,
    };
    next.type = String(next.type || CARD_TAG);
    this._config = next;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: next },
      bubbles: true,
      composed: true,
    }));
  }

  _onChange(ev) {
    const target = ev.currentTarget || ev.target;
    const key = target.configValue || target.dataset?.configValue;
    if (!key) return;

    if (typeof target.checked !== "undefined") {
      this._commit(key, target.checked);
      return;
    }

    let value = (ev && ev.detail && "value" in ev.detail) ? ev.detail.value : target.value;
    if ([
      "shared_stats_hours",
      "shared_graph_hours",
      "shared_graph_height",
      "shared_graph_max_points",
      "shared_graph_line_width",
      "column_min_width",
      "shared_column_min_width",
      "column_gap",
    ].includes(key)) {
      value = value === "" || value == null ? 0 : Number(value);
    }

    syncHaSelectorValue(target, value);
    this._commit(key, value);
  }
}

if (!customElements.get(COLUMNS_EDITOR_TAG)) {
  customElements.define(COLUMNS_EDITOR_TAG, AndyTemperatureColumnsEditor);
}
