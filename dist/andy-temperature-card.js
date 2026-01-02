/**
 * Andy Temperature Card
 * v1.0.3
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
 * Changelog 1.0.3 - 2026-01-02
 * - Improved scale rendering (outside the outline)
 * - Fixed the Interval Edit / Delete issues
 * - Added the posibility to change scale color, can be done in each interval in 2 modes: per interval (coloring the specific interval only) or active interval (same color for the whole scale)
 * - Added support for horizontal / vertical mode
 *
 *
 */

console.info("Andy Temperature Card loaded: v1.0.3");

const LitElement =
  window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = window.html || LitElement.prototype.html;
const css = window.css || LitElement.prototype.css;

const DEFAULT_INTERVALS = [
  { id: "it0", to: 0,   color: "#2b6cff", outline: "#ffffff", scale_color: "#2b6cff", gradient: { enabled: false, from: "#2b6cff", to: "#2b6cff" } },
  { id: "it1", to: 10,  color: "#39c0ff", outline: "#ffffff", scale_color: "#39c0ff", gradient: { enabled: false, from: "#39c0ff", to: "#39c0ff" } },
  { id: "it2", to: 20,  color: "#22c55e", outline: "#ffffff", scale_color: "#22c55e", gradient: { enabled: false, from: "#22c55e", to: "#22c55e" } },
  { id: "it3", to: 30,  color: "#f59e0b", outline: "#ffffff", scale_color: "#f59e0b", gradient: { enabled: false, from: "#f59e0b", to: "#f59e0b" } },
  { id: "it4", to: 100, color: "#ef4444", outline: "#ffffff", scale_color: "#ef4444", gradient: { enabled: false, from: "#ef4444", to: "#ef4444" } },
];

function deepClone(x) { return JSON.parse(JSON.stringify(x ?? {})); }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function isHexColor(s) { return typeof s === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(s).trim()); }
function normalizeHex(s, fallback = "#22c55e") {
  if (!s) return fallback;
  const t = String(s).trim();
  return isHexColor(t) ? t : fallback;
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

  out.scale_color = normalizeHex(out.scale_color, out.color);

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

class AndyTemperatureCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: { state: true },
      _stats: { state: true },
      _lastStatsAt: { state: false },
      _statsBusy: { state: false },
    };
  }

  setConfig(config) {
    if (!config?.entity) throw new Error("You need to define an entity");

    const base = {
      name: "Temperature",
      entity: "",
      min: -20,
      max: 40,
      unit: "",
      decimals: 1,

      value_position: "top_right",
      value_font_size: 0,

      glass: true,

      orientation: "vertical",

      show_scale: false,

      scale_color_mode: "per_interval",

      show_stats: false,
      stats_hours: 24,

      intervals: deepClone(DEFAULT_INTERVALS),
    };

    const cfg = { ...(config || {}) };
    if ("liquid_animation" in cfg) delete cfg.liquid_animation;

    this._config = Object.assign({}, base, cfg);

    if (!Number.isFinite(Number(this._config.min))) this._config.min = -20;
    if (!Number.isFinite(Number(this._config.max))) this._config.max = 40;

    const ori = String(this._config.orientation || "vertical");
    this._config.orientation = (ori === "horizontal") ? "horizontal" : "vertical";

    const scm = String(this._config.scale_color_mode || "per_interval");
    this._config.scale_color_mode = (scm === "active_interval") ? "active_interval" : "per_interval";

    if (!Array.isArray(this._config.intervals) || this._config.intervals.length === 0) {
      this._config.intervals = deepClone(DEFAULT_INTERVALS);
    }
    this._config.intervals = this._config.intervals.map(normalizeInterval);

    this._stats = null;
    this._lastStatsAt = 0;
    this._statsBusy = false;
  }

  static getConfigElement() { return document.createElement("andy-temperature-card-development-editor"); }

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

  _findIntervalForValue(value) {
    const intervals = intervalsSortedByTo(this._config.intervals);
    for (const it of intervals) if (value <= it.to) return it;
    return intervals.length ? intervals[intervals.length - 1] : normalizeInterval(DEFAULT_INTERVALS[2]);
  }

  async _maybeUpdateStats() {
    if (!this.hass || !this._config?.show_stats) return;

    const now = Date.now();
    const throttleMs = 3 * 60 * 1000;
    if (this._statsBusy) return;
    if (this._lastStatsAt && (now - this._lastStatsAt) < throttleMs && this._stats) return;

    const hours = Number(this._config.stats_hours ?? 24);
    const hrs = Number.isFinite(hours) && hours > 0 ? hours : 24;

    const end = new Date();
    const start = new Date(end.getTime() - hrs * 3600 * 1000);
    const entityId = this._config.entity;
    if (!entityId) return;

    this._statsBusy = true;

    try {
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const path = `history/period/${encodeURIComponent(startIso)}?end_time=${encodeURIComponent(endIso)}&filter_entity_id=${encodeURIComponent(entityId)}&minimal_response`;
      const data = await this.hass.callApi("GET", path);

      const series = Array.isArray(data) && data.length ? data[0] : [];
      const nums = [];

      for (const item of series) {
        const raw = item?.state ?? item?.s;
        const n = Number(raw);
        if (Number.isFinite(n)) nums.push(n);
      }

      if (!nums.length) {
        this._stats = { min: null, avg: null, max: null, samples: 0 };
      } else {
        let min = nums[0], max = nums[0], sum = 0;
        for (const n of nums) {
          if (n < min) min = n;
          if (n > max) max = n;
          sum += n;
        }
        this._stats = { min, avg: sum / nums.length, max, samples: nums.length };
      }
      this._lastStatsAt = now;
    } catch (e) {
      console.warn("Andy Temperature Card v1.0.3:  history fetch failed (REST)", e);
      this._stats = { min: null, avg: null, max: null, samples: 0, error: true };
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

  // --- SCALE: LEFT of outline, auto-placed outside widest point (bbox + stroke) ---
  _drawScaleDom() {
    try {
      const showScale = !!this._config?.show_scale;
      const root = this.renderRoot;
      if (!root) return;

      const svgEl = root.querySelector("svg.thermo");
      if (!svgEl) return;

      const layer = svgEl.querySelector("g.scale-layer");
      if (!layer) return;

      while (layer.firstChild) layer.removeChild(layer.firstChild);
      if (!showScale) return;

      // detect outline left edge: outer path bbox + stroke width
      const outerPath = svgEl.querySelector("path.outer");
      let bbox = null;
      try { bbox = outerPath?.getBBox?.() || null; } catch (_) { bbox = null; }

      const strokeWAttr = outerPath?.getAttribute?.("stroke-width");
      const strokeW = Number(strokeWAttr) || 3.2;

      const pad = 8; // breathing room outside outline
      const leftEdge = bbox ? (bbox.x - strokeW / 2) : 15;

      // place ticks OUTSIDE (left of) the outline, extending toward the outline
      const x2 = Math.max(0, leftEdge - pad);      // closest to outline (still outside)
      const xMajor1 = Math.max(0, x2 - 14);        // further left
      const xMinor1 = Math.max(0, x2 - 8);
      const xLabel = Math.max(0, xMajor1 - 8);

      let minS = Number(this._config.min ?? -20);
      let maxS = Number(this._config.max ?? 40);
      if (!Number.isFinite(minS)) minS = -20;
      if (!Number.isFinite(maxS)) maxS = 40;
      if (maxS < minS) [minS, maxS] = [maxS, minS];

      const range = (maxS - minS) || 1;

      // LOCKED geometry
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
    } catch (e) {
      console.warn("Andy Temperature Card v1.0.3: scale DOM draw failed", e);
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
    const showHeaderValue = (vp === "top_right" || vp === "top_center");
    const showBottomValue = (vp === "bottom_right" || vp === "bottom_center");
    const showInsideValue = (vp === "inside");

    const valueStyle = (this._config.value_font_size && Number(this._config.value_font_size) > 0)
      ? `font-size:${Number(this._config.value_font_size)}px;`
      : "";

    const interval = normalizeInterval(this._findIntervalForValue(value));
    const glassOn = this._config.glass !== false;

    const showStats = !!this._config.show_stats;
    const stats = this._stats || { min: null, avg: null, max: null, samples: 0 };

    const isHorizontal = (this._config.orientation === "horizontal");

    return html`
      <ha-card>
        <div class="wrap ${isHorizontal ? "orient-horizontal" : "orient-vertical"}">
          <div class="rotator">
            <div class="header ${vp}">
              <div class="title">${name}</div>
              ${showHeaderValue ? html`
                <div class="value" style="${valueStyle}">${shown}${unit ? html`<span class="unit">${unit}</span>` : ""}</div>
              ` : ""}
            </div>

            <div class="iconRow">
              <div class="iconWrap">
                ${this._thermoSvg({ value, interval, glassOn })}
                ${showInsideValue ? html`
                  <div class="value inside" style="${valueStyle}">${shown}${unit ? html`<span class="unit">${unit}</span>` : ""}</div>
                ` : ""}
              </div>
            </div>

            ${showBottomValue ? html`
              <div class="bottom ${vp}">
                <div class="value" style="${valueStyle}">${shown}${unit ? html`<span class="unit">${unit}</span>` : ""}</div>
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

  _thermoSvg(opts) {
    const { value, interval, glassOn } = opts;

    const it = normalizeInterval(interval);
    const useGradient = !!it.gradient?.enabled;
    const cSolid = normalizeHex(it.color, "#22c55e");
    const outline = normalizeHex(it.outline, "#ffffff");
    const gFrom = normalizeHex(it.gradient?.from, cSolid);
    const gTo = normalizeHex(it.gradient?.to, gFrom);

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

    const outerFill = glassOn ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.06)";
    const tubeBg = glassOn ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)";

    return html`
      <svg class="thermo" viewBox="0 0 220 230" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Temperature">
        <defs>
          <linearGradient id="liquidGrad" x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stop-color="${gFrom}"></stop>
            <stop offset="100%" stop-color="${gTo}"></stop>
          </linearGradient>

          <linearGradient id="glassSheen" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="rgba(255,255,255,0.94)"></stop>
            <stop offset="35%" stop-color="rgba(255,255,255,0.22)"></stop>
            <stop offset="78%" stop-color="rgba(255,255,255,0.05)"></stop>
            <stop offset="100%" stop-color="rgba(255,255,255,0.52)"></stop>
          </linearGradient>

          <linearGradient id="glassBand" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,0.00)"></stop>
            <stop offset="35%" stop-color="rgba(255,255,255,0.22)"></stop>
            <stop offset="55%" stop-color="rgba(255,255,255,0.06)"></stop>
            <stop offset="100%" stop-color="rgba(255,255,255,0.00)"></stop>
          </linearGradient>

          <filter id="specBlur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>

          <clipPath id="tubeClip">
            <path d="M160 18 C149 18 140 27 140 38 V138 C131 145 126 156 126 168 C126 191 145 208 160 208 C175 208 194 191 194 168 C194 156 189 145 180 138 V38 C180 27 171 18 160 18 Z" />
          </clipPath>

          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="rgba(0,0,0,0.28)"/>
          </filter>
        </defs>

        <!-- CRITICAL: shift thermometer drawing left so it is truly centered (DO NOT TOUCH) -->
        <g transform="translate(-50,0)">
          <path class="outer"
            d="M160 10 C144 10 131 23 131 39 V135 C121 147 116 157 116 170 C116 200 140 220 160 220 C180 220 204 200 204 170 C204 157 199 147 189 135 V39 C189 23 176 10 160 10 Z"
            fill="${outerFill}"
            stroke="${outline}"
            stroke-width="3.2"
            opacity="0.95"
            filter="url(#shadow)"/>

          <g clip-path="url(#tubeClip)">
            <rect x="120" y="0" width="100" height="220" fill="${tubeBg}"></rect>

            <rect class="liquid"
              x="120" y="${yTop}" width="100" height="${220 - yTop}"
              fill="${useGradient ? "url(#liquidGrad)" : cSolid}" opacity="0.98"></rect>

            ${glassOn ? html`
              <rect x="120" y="0" width="100" height="220" fill="url(#glassSheen)" opacity="0.95"></rect>
              <rect x="118" y="-10" width="120" height="250" fill="url(#glassBand)" opacity="0.78" transform="rotate(-12 160 110)"></rect>
            ` : ""}
          </g>

          ${glassOn ? html`
            <path class="glass1"
              d="M146 26 C140 31 138 36 138 45 V128 C138 140 130 147 130 168 C130 180 140 194 150 198"
              fill="none" stroke="rgba(255,255,255,0.94)" stroke-width="14" stroke-linecap="round" opacity="0.98" filter="url(#specBlur)" />
            <path class="glass2"
              d="M154 22 C148 30 146 34 146 44 V120"
              fill="none" stroke="rgba(255,255,255,0.98)" stroke-width="5.0" stroke-linecap="round" opacity="0.98"/>
          ` : ""}

          <path
            d="M160 18 C149 18 140 27 140 38 V138 C131 145 126 156 126 168 C126 191 145 208 160 208 C175 208 194 191 194 168 C194 156 189 145 180 138 V38 C180 27 171 18 160 18 Z"
            fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="2"/>
        </g>

        <!-- Scale layer (DOM-populated in updated()) -->
        <g class="scale-layer" transform="translate(-50,0)" style="pointer-events:none;" shape-rendering="crispEdges"></g>
      </svg>
    `;
  }

  static get styles() {
    return css`
      :host { display:block; }
      ha-card { border-radius: 18px; overflow: hidden; }
      .wrap { padding: 16px; }

      .wrap.orient-horizontal {
        display:flex;
        justify-content:center;
        align-items:center;
        min-height: 260px;
      }
      .wrap.orient-horizontal .rotator {
        transform: rotate(90deg);
        transform-origin: center;
      }
      .wrap.orient-vertical .rotator { transform: none; }

      .header { display:flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
      .header.top_center { justify-content:center; text-align:center; flex-direction:column; align-items:center; }

      .title { font-size: 14px; opacity: 0.9; letter-spacing: 0.2px; }
      .value { font-weight: 850; letter-spacing: 0.2px; font-size: clamp(14px, 4vw, 22px); line-height: 1.1; }
      .unit { font-size: 12px; opacity: 0.75; margin-left: 4px; font-weight: 700; }

      .iconRow { display:flex; justify-content:center; padding-top: 6px; }
      .iconWrap { position: relative; display:flex; justify-content:center; align-items:center; }

      .thermo { width: clamp(210px, 62vw, 260px); height: clamp(150px, 34vw, 182px); display:block; }

      .value.inside {
        position:absolute; bottom:18px; left:50%; transform:translateX(-50%);
        background: rgba(0,0,0,0.12);
        border: 1px solid rgba(255,255,255,0.14);
        padding: 6px 10px; border-radius: 999px;
        backdrop-filter: blur(6px);
        font-size: clamp(12px, 3.5vw, 18px);
        font-weight: 850;
        z-index: 4;
      }

      .bottom { margin-top: 10px; display:flex; }
      .bottom.bottom_center { justify-content:center; text-align:center; }
      .bottom.bottom_right { justify-content:flex-end; text-align:right; }

      .statsRow {
        margin-top: 12px;
        display:flex;
        justify-content:center;
        gap: 18px;
        font-size: 12px;
        opacity: 0.85;
        font-weight: 700;
      }

      .sub { opacity:0.7; font-size:12px; padding:4px 0 0; }
    `;
  }
}

if (!customElements.get("andy-temperature-card-development")) {
  customElements.define("andy-temperature-card-development", AndyTemperatureCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "andy-temperature-card-development",
  name: "Andy Temperature Card (Dev)",
  description: "Thermometer with locked scale + intervals (fill/gradient/outline) + per-interval scale coloring + glass + orientation + min/avg/max (REST history).",
});

/* =============================================================================
 * Editor (HTMLElement)
 * ============================================================================= */

const EDITOR_TAG = "andy-temperature-card-development-editor";

const DEFAULTS = {
  name: "Temperature",
  entity: "",
  min: -20,
  max: 40,
  unit: "",
  decimals: 1,
  value_position: "top_right",
  value_font_size: 0,
  glass: true,
  orientation: "vertical",
  show_scale: false,
  scale_color_mode: "per_interval",
  show_stats: false,
  stats_hours: 24,
  intervals: deepClone(DEFAULT_INTERVALS).map(normalizeInterval),
};

class AndyTemperatureCardEditor extends HTMLElement {
  setConfig(config) {
    const incomingRaw = { ...DEFAULTS, ...(config || {}) };
    if ("liquid_animation" in incomingRaw) delete incomingRaw.liquid_animation;

    incomingRaw.orientation = (String(incomingRaw.orientation) === "horizontal") ? "horizontal" : "vertical";
    incomingRaw.scale_color_mode = (String(incomingRaw.scale_color_mode) === "active_interval") ? "active_interval" : "per_interval";

    if (!Array.isArray(incomingRaw.intervals) || incomingRaw.intervals.length === 0) incomingRaw.intervals = deepClone(DEFAULT_INTERVALS);
    incomingRaw.intervals = incomingRaw.intervals.map(normalizeInterval);

    if (!Number.isFinite(Number(incomingRaw.min))) incomingRaw.min = -20;
    if (!Number.isFinite(Number(incomingRaw.max))) incomingRaw.max = 40;

    this._config = incomingRaw;
    this._buildOnce();
    this._sync();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._built) this._sync();
  }

  _buildOnce() {
    if (this._built) return;
    this._built = true;

    const stopBubble = (e) => {
      if (e?.target?.matches?.('input[type="color"]')) return;
      e.stopPropagation();
    };

    const root = document.createElement("div");
    root.className = "form";

    const mkText = (label, key, type = "text", placeholder = "") => {
      const tf = document.createElement("ha-textfield");
      tf.label = label;
      tf.type = type;
      tf.placeholder = placeholder;
      tf.configValue = key;
      tf.addEventListener("input", (e) => this._onChange(e));
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
      const sel = document.createElement("ha-select");
      sel.label = label;
      sel.configValue = key;

      options.forEach(([value, text]) => {
        const item = document.createElement("mwc-list-item");
        item.value = value;
        item.innerText = text;
        sel.appendChild(item);
      });

      sel.addEventListener("click", stopBubble);
      sel.addEventListener("opened", stopBubble);
      sel.addEventListener("closed", stopBubble);
      sel.addEventListener("keydown", stopBubble);

      sel.addEventListener("value-changed", (e) => {
        e.stopPropagation();
        this._onChange(e);
      });

      sel.addEventListener("selected", (e) => {
        e.stopPropagation();
        if (sel.value) this._commit(key, sel.value);
      });

      return sel;
    };

    const mkEntityControl = () => {
      const hasSelector = !!customElements.get("ha-selector");
      if (hasSelector) {
        const sel = document.createElement("ha-selector");
        sel.label = "Entity (numeric)";
        sel.configValue = "entity";
        sel.selector = { entity: {} };
        sel.addEventListener("value-changed", (e) => this._onChange(e));
        sel.addEventListener("click", stopBubble);
        return sel;
      }
      const ep = document.createElement("ha-entity-picker");
      ep.label = "Entity (numeric)";
      ep.allowCustomEntity = true;
      ep.configValue = "entity";
      ep.addEventListener("value-changed", (e) => this._onChange(e));
      ep.addEventListener("click", stopBubble);
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

    const row3 = document.createElement("div");
    row3.className = "grid3";
    this._elMin = mkText("Min (scale)", "min", "number");
    this._elMax = mkText("Max (scale)", "max", "number");
    this._elFont = mkText("Value font size (px) — 0 = auto", "value_font_size", "number", "0");
    row3.appendChild(this._elMin);
    row3.appendChild(this._elMax);
    row3.appendChild(this._elFont);
    root.appendChild(row3);

    const rowVP = document.createElement("div");
    rowVP.className = "grid2";

    this._elValuePos = mkSelect("Value position", "value_position", [
      ["top_right", "Top right"],
      ["top_center", "Top center"],
      ["bottom_right", "Bottom right"],
      ["bottom_center", "Bottom center"],
      ["inside", "Inside icon"],
    ]);
    rowVP.appendChild(this._elValuePos);

    const secTog = document.createElement("div");
    secTog.className = "toggles";

    const { wrap: swGlassWrap, sw: swGlass } = mkSwitch("Glass effect", "glass");
    this._swGlass = swGlass;

    const { wrap: swScaleWrap, sw: swScale } = mkSwitch("Show scale (ticks)", "show_scale");
    this._swScale = swScale;

    const { wrap: swStatsWrap, sw: swStats } = mkSwitch("Show Min/Avg/Max (history)", "show_stats");
    this._swStats = swStats;

    secTog.appendChild(swGlassWrap);
    secTog.appendChild(swScaleWrap);
    secTog.appendChild(swStatsWrap);

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

    this._elStatsHours = mkText("Stats lookback hours", "stats_hours", "number", "24");
    root.appendChild(this._elStatsHours);

    // Intervals UI remains the same as v1.0.3 (id-based edit/delete + scale_color field)
    // (Kept unchanged intentionally)

    // ---- intervals section (unchanged) ----
    const secInt = document.createElement("div");
    secInt.className = "section";
    const secTitle = document.createElement("div");
    secTitle.className = "section-title";
    secTitle.innerText = "Intervals";
    secInt.appendChild(secTitle);

    const head = document.createElement("div");
    head.className = "section-head";
    const btnAdd = document.createElement("mwc-button");
    btnAdd.setAttribute("outlined", "");
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
      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
      .grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; }
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
      .colorRow ha-textfield { flex: 1 1 auto; }
      .colorBtn{
        width: 44px;
        height: 38px;
        padding: 0;
        border: 1px solid rgba(0,0,0,0.25);
        border-radius: 6px;
        background: transparent;
        cursor: pointer;
      }
    `;

    this.innerHTML = "";
    this.appendChild(style);
    this.appendChild(root);

    this.addEventListener("click", stopBubble);
    this.addEventListener("mousedown", stopBubble);
    this.addEventListener("mouseup", stopBubble);
    this.addEventListener("pointerdown", stopBubble);
    this.addEventListener("pointerup", stopBubble);
    this.addEventListener("keydown", stopBubble);
  }

  // ---- The rest of the editor code (interval list + draft UI + commit/onChange) is identical to v1.0.3 ----
  // To keep this file complete and consistent, we include it verbatim below.

  _sync() {
    if (!this._hass || !this._config) return;

    this._elEntity.hass = this._hass;
    this._elEntity.value = this._config.entity || "";

    this._elName.value = this._config.name || "";
    this._elUnit.value = this._config.unit || "";
    this._elDecimals.value = String(this._config.decimals ?? 1);

    this._elMin.value = String(this._config.min ?? -20);
    this._elMax.value = String(this._config.max ?? 40);
    this._elFont.value = String(this._config.value_font_size ?? 0);

    this._elValuePos.value = this._config.value_position || "top_right";

    this._swGlass.checked = !!this._config.glass;
    this._swScale.checked = !!this._config.show_scale;
    this._swStats.checked = !!this._config.show_stats;

    this._elOrientation.value = this._config.orientation || "vertical";
    this._elScaleMode.value = this._config.scale_color_mode || "per_interval";

    this._elStatsHours.style.display = this._config.show_stats ? "" : "none";
    this._elStatsHours.value = String(this._config.stats_hours ?? 24);

    this._renderIntervals();
    this._renderDraft();
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
      badgeFill.style.background = it.gradient?.enabled ? `linear-gradient(${it.gradient.from}, ${it.gradient.to})` : it.color;

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
        <div class="itSub">Fill: ${it.gradient?.enabled ? `${it.gradient.from} → ${it.gradient.to}` : it.color} • Outline: ${it.outline} • Scale: ${it.scale_color || it.color}</div>
      `;

      const btns = document.createElement("div");
      btns.className = "btns";

      const bEdit = document.createElement("mwc-button");
      bEdit.innerText = "Edit";
      bEdit.addEventListener("click", (e) => { e.stopPropagation(); this._startEdit(it.id); });

      const bDel = document.createElement("mwc-button");
      bDel.className = "danger";
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
      scale_color: "#22c55e",
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
    btnClose.innerText = "Close";
    btnClose.addEventListener("click", (e) => { e.stopPropagation(); this._closeDraft(); });
    head.appendChild(btnClose);
    box.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "draftGrid2";

    const tfTo = document.createElement("ha-textfield");
    tfTo.type = "number";
    tfTo.label = "Upper bound (to)";
    tfTo.value = String(this._draft.to ?? 0);
    tfTo.addEventListener("input", (e) => { e.stopPropagation(); this._draft.to = Number(tfTo.value); });
    grid.appendChild(tfTo);

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

    box.appendChild(grid);

    const mkDraftColor = (label, getVal, setVal) => {
      const row = document.createElement("div");
      row.className = "colorRow";

      const tf = document.createElement("ha-textfield");
      tf.label = label;
      tf.placeholder = "#RRGGBB";

      const btn = document.createElement("input");
      btn.type = "color";
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
    box.appendChild(mkDraftColor("Outline color (HEX)", () => this._draft.outline, (v) => { this._draft.outline = v; }));
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
    btnCancel.setAttribute("outlined", "");
    btnCancel.innerText = "Cancel";
    btnCancel.addEventListener("click", (e) => { e.stopPropagation(); this._closeDraft(); });

    const btnSave = document.createElement("mwc-button");
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

  _eventValue(ev, target) {
    if (ev && ev.detail && typeof ev.detail.value !== "undefined") return ev.detail.value;
    return target.value;
  }

  _onChange(ev) {
    const target = ev.target;
    const key = target.configValue || target.dataset?.configValue;
    if (!key) return;

    if (typeof target.checked !== "undefined") {
      return this._commit(key, target.checked);
    }

    let value = this._eventValue(ev, target);

    if (key === "min" || key === "max" || key === "value_font_size" || key === "stats_hours") {
      value = value === "" ? 0 : Number(value);
      return this._commit(key, value);
    }
    if (key === "decimals") {
      value = value === "" ? 1 : Number(value);
      if (!Number.isFinite(value)) value = 1;
      return this._commit(key, value);
    }

    return this._commit(key, value);
  }
}

if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, AndyTemperatureCardEditor);
}
