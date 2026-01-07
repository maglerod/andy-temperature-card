/**
 * Andy Temperature Card
 * v1.0.5
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

console.info("Andy Temperature Card loaded: v1.0.5");

const LitElement =
  window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = window.html || LitElement.prototype.html;
const css = window.css || LitElement.prototype.css;
const svg  = window.svg  || LitElement.prototype.svg || html;


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

// Downsample a series to at most maxPoints using bucket averaging.
function downsampleSeries(series, maxPoints) {
  const s = series || [];
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
      name_position: "auto",
      glass: true,
      orientation: "vertical",
      show_scale: false,
      scale_color_mode: "per_interval",
      show_stats: false,
      stats_hours: 24,
      show_graph: false,
      graph_hours: 24,
      graph_height: 58,
      graph_show_time: true,
      graph_max_points: 160,
      graph_line_width: 1.0,

      extra_entity_1: "",
      extra_icon_1: "",
      extra_label_1: "",

      extra_entity_2: "",
      extra_icon_2: "",
      extra_label_2: "",

      extra_entity_3: "",
      extra_icon_3: "",
      extra_label_3: "",

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

    let cs = Number(this._config.card_scale ?? 1);
    if (!Number.isFinite(cs) || cs <= 0) cs = 1;
    this._config.card_scale = Math.max(0.2, Math.min(2.0, cs));

    // graph clamps
    let gh = Number(this._config.graph_hours ?? this._config.stats_hours ?? 24);
    if (!Number.isFinite(gh) || gh <= 0) gh = 24;
    this._config.graph_hours = Math.max(1, Math.min(168, gh));

    let ghPx = Number(this._config.graph_height ?? 58);
    if (!Number.isFinite(ghPx) || ghPx <= 0) ghPx = 58;
    this._config.graph_height = Math.max(40, Math.min(120, ghPx));

    let mp = Number(this._config.graph_max_points ?? 160);
    if (!Number.isFinite(mp) || mp < 30) mp = 160;
    this._config.graph_max_points = Math.max(30, Math.min(400, mp));

    let lw = Number(this._config.graph_line_width ?? 0.7);
    if (!Number.isFinite(lw) || lw <= 0) lw = 0.7;
    this._config.graph_line_width = Math.max(0.3, Math.min(2.0, lw));



    if (!Array.isArray(this._config.intervals) || this._config.intervals.length === 0) {
      this._config.intervals = deepClone(DEFAULT_INTERVALS);
    }
    this._config.intervals = this._config.intervals.map(normalizeInterval);

    this._stats = null;
    this._lastStatsAt = 0;
    this._statsBusy = false;
    this._series = null;
  }

  static getConfigElement() { return document.createElement("andy-temperature-card-editor"); }

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

  _hasExtras() {
    return !!(String(this._config?.extra_entity_1 || "").trim()
      || String(this._config?.extra_entity_2 || "").trim()
      || String(this._config?.extra_entity_3 || "").trim());
  }

  _renderExtraValues() {
    const rows = [];

    const addRow = (n) => {
      const entity = String(this._config?.[`extra_entity_${n}`] || "").trim();
      if (!entity) return;

      const st = this.hass?.states?.[entity];
      const raw = st?.state;
      const num = Number(raw);
      const hasNum = Number.isFinite(num);

      const unit = this._getUnitForEntity(entity);
//      const label = String(this._config?.[`extra_label_${n}`] || "").trim()
//        || (st?.attributes?.friendly_name ?? entity);
      const rawLabel = String(this._config?.[`extra_label_${n}`] || "").trim();
      const label = rawLabel !== "" ? rawLabel : "";  // visa aldrig default label
        
      const icon = String(this._config?.[`extra_icon_${n}`] || "").trim()
        || this._inferExtraIcon(entity);

      const decimals = Number(this._config?.decimals ?? 1);
      const valueText = hasNum
        ? (fmtNum(num, Number.isFinite(decimals) ? decimals : 1) ?? String(num))
        : (raw ?? "—");

      rows.push(html`
        <div class="extraRow">
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

    return html`<div class="extras">${rows}</div>`;
  }

  _findIntervalForValue(value) {
    const intervals = intervalsSortedByTo(this._config.intervals);
    for (const it of intervals) if (value <= it.to) return it;
    return intervals.length ? intervals[intervals.length - 1] : normalizeInterval(DEFAULT_INTERVALS[2]);
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

  // *** v1.0.5.7 – robust + debug, men använder fortfarande REST history ***
  async _maybeUpdateStats() {
    if (!this.hass || !this._config) return;

    const needStats = !!this._config.show_stats;
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

    const rawHours = needGraph
      ? (this._config.graph_hours ?? this._config.stats_hours ?? 24)
      : (this._config.stats_hours ?? 24);

    let hours = Number(rawHours);
    if (!Number.isFinite(hours) || hours <= 0) hours = 24;

    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600 * 1000);

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const path =
      `history/period/${encodeURIComponent(startIso)}` +
      `?filter_entity_id=${encodeURIComponent(entityId)}` +
      `&end_time=${encodeURIComponent(endIso)}`;

    this._statsBusy = true;

    //console.warn("Andy Temp v1.0.5.8 _maybeUpdateStats", {
    //  needStats,
    //  needGraph,
    //  entityId,
    //  path,
    //});

    try {
      const data = await this.hass.callApi("GET", path);

      //console.warn("Andy Temp v1.0.5.7 history raw data", {
    //    type: Array.isArray(data) ? "array" : typeof data,
    //    outerLength: Array.isArray(data) ? data.length : undefined,
    //    keys: data && !Array.isArray(data) && typeof data === "object"
    //      ? Object.keys(data)
    //      : undefined,
    //  });

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

      //console.warn("Andy Temp v1.0.5.8 seriesRaw length", seriesRaw?.length);

      const nums = [];
      const points = [];

      for (const item of (seriesRaw || [])) {
        const rawState = item?.state ?? item?.s;
        const n = Number(rawState);
        if (!Number.isFinite(n)) continue;
        nums.push(n);
      }

      //console.warn("Andy Temp v1.0.5.7 numeric samples", nums.length);

      // Graph data
      if (needGraph) {
        if (nums.length) {
          const tStart = start.getTime();
          const tEnd = end.getTime();
          const span = (tEnd - tStart) || 1;
          const N = nums.length;

          for (let i = 0; i < N; i++) {
            const v = nums[i];
            const frac = N === 1 ? 0 : i / (N - 1);
            const t = tStart + frac * span;
            points.push({ t, v });
          }

          const maxPts = Number(this._config.graph_max_points ?? 160);
          const sampled = downsampleSeries(
            points,
            Number.isFinite(maxPts) ? maxPts : 160
          );
          this._series = sampled;
          //console.warn("Andy Temp v1.0.5.7 graph points", this._series.length);
        } else {
          const cur = this._getStateValue(this._config.entity);
          if (cur != null) {
            const tStart = start.getTime();
            const tEnd = end.getTime();
            const mid = (tStart + tEnd) / 2;

            this._series = [
              { t: tStart, v: cur },
              { t: mid,   v: cur },
              { t: tEnd,  v: cur },
            ];
          } else {
            this._series = [];
          }
          //console.warn("Andy Temp v1.0.5.7 graph fallback series length", this._series.length);
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
        "Andy Temperature Card v1.0.5.8: history fetch failed",
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
      const root = this.renderRoot;
      if (!root) return;

      const svgEl = root.querySelector("svg.thermo");
      if (!svgEl) return;

      const layer = svgEl.querySelector("g.scale-layer");
      if (!layer) return;

      while (layer.firstChild) layer.removeChild(layer.firstChild);
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
    } catch (e) {
      console.warn("Andy Temperature Card v1.0.5.8: scale DOM draw failed", e);
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

    //const decimals = Number(this._config.decimals ?? 1);
    //const shown = fmtNum(value, decimals) ?? String(value);

    //const vp = String(this._config.value_position || "top_right");
    //const showHeaderValue = (vp === "top_right" || vp === "top_center");
    const decimals = Number(this._config.decimals ?? 1);
    const shown = fmtNum(value, decimals) ?? String(value);

    const vp = String(this._config.value_position || "top_right");
    const namePos = String(this._config.name_position || "auto");
    const showHeaderValue = (vp === "top_right" || vp === "top_center");

    const headerClasses = ["header"];
    if (vp === "top_center" && (namePos === "auto" || namePos === "center")) {
      headerClasses.push("top_center");
    }
    const headerClassStr = headerClasses.join(" ");

    
    
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

    const cardScale = Number(this._config.card_scale ?? 1);
    const scaleVarStyle = `--asc-scale:${cardScale};`;

    return html`
      <ha-card @click=${this._openMoreInfo} style="cursor:pointer;">
        <div class="wrap ${isHorizontal ? "orient-horizontal" : "orient-vertical"}" style="${scaleVarStyle}">
          <div class="rotator">
                        <div class="${headerClassStr}">
              ${namePos === "center" && vp !== "top_center"
                ? html`
                    <div class="title" style="text-align:center; width:100%;">
                      ${name}
                    </div>
                  `
                : html`
                    <div class="title">${name}</div>
                  `}
              ${showHeaderValue ? html`
                <div class="value" style="${valueStyle}">
                  ${shown}${unit ? html`<span class="unit">${unit}</span>` : ""}
                </div>
              ` : ""}
            </div>


            <div class="iconRow ${this._hasExtras() ? "hasExtras" : ""}">
              <div class="iconWrap">
                ${this._thermoSvg({ value, interval, glassOn })}
                ${showInsideValue ? html`
                  <div class="value inside" style="${valueStyle}">
                    ${shown}${unit ? html`<span class="unit">${unit}</span>` : ""}
                  </div>
                ` : ""}
              </div>

              ${this._renderExtraValues()}
            </div>

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


// v1.0.5.11 – auto-scale på data + tunnare linje + tids-ticks som verkligen syns
// v1.0.5.12 – auto-scale + tunn linje + tids-ticks som HTML under grafen
_renderGraph() {
  if (!this._config?.show_graph) return "";

  const base = Array.isArray(this._series) ? this._series : null;
  if (!base || !base.length) {
    return html`
      <div class="graphWrap" style="height:${this._config.graph_height}px;">
        <div class="graphEmpty">No history</div>
      </div>
    `;
  }

  try {
    // Om bara 1 punkt -> gör en liten “platta”
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
    const padB = 8; // lite bottenmarginal (grafen, inte ticks)

    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const t0 = s[0].t;
    const t1 = s[s.length - 1].t;
    const dt = (t1 - t0) || 1;

    // Y-range ENBART baserat på graf-data (inte card min/max)
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

    const pointsAttr = s.map((p) => `${xFor(p.t)},${yFor(p.v)}`).join(" ");

    const last = s[s.length - 1];
    const it = normalizeInterval(this._findIntervalForValue(last.v));
    const c = normalizeHex(it.scale_color || it.color, "#ffffff");

    const lw = Number(this._config.graph_line_width ?? 1.0);
    const strokeW = Number.isFinite(lw) ? lw : 1.0;

    // Tids-ticks (endast för labels, linjen i grafen kör på t0..t1 ändå)
    const showTimeTicks = this._config.graph_show_time !== false;
    const ticks = [];
    if (showTimeTicks && dt > 0) {
      const count = 4; // ger 5 ticks (0..4)
      for (let i = 0; i <= count; i++) {
        const frac = i / count;
        const tTick = t0 + frac * dt;
        ticks.push({ t: tTick, label: toLocalHHMM(tTick) });
      }
    }

//    console.warn("Andy Temp v1.0.5.12 ticks (HTML)", {
//      showTimeTicks,
//      tickCount: ticks.length,
//      ticks,
//    });

    return html`
      <div class="graphWrap" style="height:${height + (showTimeTicks && ticks.length ? 22 : 0)}px;">
        <div class="graphInner">
          <svg
            class="graph"
            viewBox="0 0 ${W} ${H}"
            preserveAspectRatio="none"
            role="img"
            aria-label="History graph"
          >
            <defs>
              <filter id="gShadowSimple" x="-20%" y="-40%" width="140%" height="180%">
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="2"
                  flood-color="rgba(0,0,0,0.30)"
                />
              </filter>
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

            <!-- Själva linjen -->
            <g filter="url(#gShadowSimple)">
              <polyline
                fill="none"
                stroke="${c}"
                stroke-width="${strokeW}"
                stroke-linecap="round"
                stroke-linejoin="round"
                points="${pointsAttr}"
              />
            </g>

            <!-- Marker på sista värdet -->
            <circle
              cx="${xFor(last.t)}"
              cy="${yFor(last.v)}"
              r="3.4"
              fill="${c}"
              stroke="rgba(0,0,0,0.25)"
              stroke-width="1"
            />
          </svg>

          ${showTimeTicks && ticks.length
            ? html`
                <div class="graphTicks">
                  <div class="graphTicksLine"></div>
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
    console.error("Andy Temp v1.0.5.12 _renderGraph error", e);
    return html`
      <div class="graphWrap" style="height:${this._config.graph_height}px;">
        <div class="graphEmpty">Graph error</div>
      </div>
    `;
  }
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
        transform: rotate(90deg) scale(var(--asc-scale, 1));
        transform-origin: center;
      }
      .wrap.orient-vertical .rotator {
        transform: scale(var(--asc-scale, 1));
        transform-origin: top center;
      }

      .header { display:flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
      .header.top_center { justify-content:center; text-align:center; flex-direction:column; align-items:center; }

      .title { font-size: 14px; opacity: 0.9; letter-spacing: 0.2px; }
      .value { font-weight: 850; letter-spacing: 0.2px; font-size: clamp(14px, 4vw, 22px); line-height: 1.1; }
      .unit { font-size: 12px; opacity: 0.75; margin-left: 4px; font-weight: 700; }

      .iconRow { display:flex; justify-content:center; padding-top: 6px; align-items:center; }
      .iconRow.hasExtras { gap: 0px; align-items: flex-start;}
      .iconWrap { position: relative; display:flex; justify-content:center; align-items:center; }

      .thermo { width: clamp(210px, 62vw, 260px); height: clamp(150px, 34vw, 182px); display:block; }

      .value.inside {
        position:absolute; bottom:25px; left:50%; transform:translateX(-50%);
        background: transparent;
        border: none; 
        padding: 6px 10px; border-radius: 999px;
        backdrop-filter: none;
        font-size: clamp(12px, 3.5vw, 18px);
        font-weight: 850;
        z-index: 4;
        text-shadow: 0 2px 8px rgba(0,0,0,0.55);
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
      }

      .graph {
        width: 100%;
        height: 100%;
        display:block;
      }

      .graphTicks {
        margin-top: 4px;
        font-size: 10px;
        font-weight: 700;
        opacity: 0.9;
      }

      .graphTicksLine {
        border-top: 1px solid rgba(255,255,255,0.35);
        margin-bottom: 2px;
      }

      .graphTicksLabels {
        display:flex;
        justify-content:space-between;
      }

      .graphTicksLabels span {
        min-width: 0;
      }

      .graphEmpty {
        font-size: 12px;
        opacity: 0.75;
        font-weight: 700;
      }

      .extras {
        display:flex;
        flex-direction:column;
        gap: 2px;
        min-width: 90px;
        /* flytta automatiskt närmare beroende på card_scale */
        margin-left: calc(-50px * var(--asc-scale, 1));
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

      .extraIcon {
        opacity: 0.90;
      }

      .extraText { display:flex; flex-direction:column; line-height: 1.05; }
      .extraLabel { font-size: 11px; opacity: 0.75; font-weight: 800; }
      .extraValue { font-size: 14px; font-weight: 900; letter-spacing: 0.2px; }
      .extraUnit  { font-size: 11px; opacity: 0.75; margin-left: 4px; font-weight: 800; }

      .sub { opacity:0.7; font-size:12px; padding:4px 0 0; }
      .graph text {fill: rgba(255,255,255,0.95);
}

    `;
  }
}

if (!customElements.get("andy-temperature-card")) {
  customElements.define("andy-temperature-card", AndyTemperatureCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "andy-temperature-card",
  name: "Andy Temperature Card",
  description: "Thermometer with locked scale + intervals (fill/gradient/outline) + per-interval scale coloring + glass + orientation + min/avg/max (REST history) + optional history graph.",
});

/* =============================================================================
 * Editor
 * ============================================================================= */

const EDITOR_TAG = "andy-temperature-card-editor";

const DEFAULTS = {
  name: "Temperature",
  entity: "",
  min: -20,
  max: 40,
  unit: "",
  decimals: 1,
  value_position: "top_right",
  name_position: "auto",
  value_font_size: 0,
  glass: true,
  orientation: "vertical",
  show_scale: false,
  scale_color_mode: "per_interval",
  show_stats: false,
  stats_hours: 24,
  card_scale: 1,
  show_graph: false,
  graph_hours: 24,
  graph_height: 58,
  graph_show_time: true,
  graph_max_points: 160,
  graph_line_width: 0.7,

  extra_entity_1: "",
  extra_icon_1: "",
  extra_label_1: "",

  extra_entity_2: "",
  extra_icon_2: "",
  extra_label_2: "",

  extra_entity_3: "",
  extra_icon_3: "",
  extra_label_3: "",

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
    if (this._elEntity) this._elEntity.hass = this._hass;
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
        stopBubble(e);
        this._onChange(e);
    });

    sel.addEventListener("selected", (e) => {
        stopBubble(e);
        if (sel.value) this._commit(key, sel.value);
    });

    return sel;
    };

    
    const mkSelectold = (label, key, options) => {
      const sel = document.createElement("ha-select");
      sel.label = label;
      sel.configValue = key;

      options.forEach(([value, text]) => {
        const item = document.createElement("mwc-list-item");
        item.value = value;
        item.innerText = text;
        sel.appendChild(item);
      });

      // Viktigt: låt events bubbla fritt, vi lyssnar bara och commit:ar
      sel.addEventListener("value-changed", (e) => {
        this._onChange(e);
      });

      sel.addEventListener("selected", (e) => {
        const v = sel.value;
        if (v) this._commit(key, v);
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
    rowScale.appendChild(this._elCardScale);
    root.appendChild(rowScale);

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
    
    
    this._elNamePos = mkSelect("Name position", "name_position", [
      ["auto", "Auto (follow value)"],
      ["left", "Left"],
      ["center", "Center"],
    ]);
    root.appendChild(this._elNamePos);

    const secTog = document.createElement("div");
    secTog.className = "toggles";

    const { wrap: swGlassWrap, sw: swGlass } = mkSwitch("Glass effect", "glass");
    this._swGlass = swGlass;

    const { wrap: swScaleWrap, sw: swScale } = mkSwitch("Show scale (ticks)", "show_scale");
    this._swScale = swScale;

    const { wrap: swStatsWrap, sw: swStats } = mkSwitch("Show Min/Avg/Max (history)", "show_stats");
    this._swStats = swStats;

    const { wrap: swGraphWrap, sw: swGraph } = mkSwitch("Show history graph", "show_graph");
    this._swGraph = swGraph;

    secTog.appendChild(swGlassWrap);
    secTog.appendChild(swScaleWrap);
    secTog.appendChild(swStatsWrap);
    secTog.appendChild(swGraphWrap);

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
    extraTitle.innerText = "Extra values (right of icon)";
    secExtra.appendChild(extraTitle);

    const mkEntityPick = (label, key) => {
      const hasSelector = !!customElements.get("ha-selector");
      if (hasSelector) {
        const sel = document.createElement("ha-selector");
        sel.label = label;
        sel.configValue = key;
        sel.selector = { entity: {} };
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
    this._elExtraIcon1  = mkIconInput("Icon (optional, mdi:...)", "extra_icon_1");
    rowE11.appendChild(this._elExtraLabel1);
    rowE11.appendChild(this._elExtraIcon1);
    secExtra.appendChild(rowE11);

    const rowE2 = document.createElement("div");
    rowE2.className = "grid1";
    this._elExtraEntity2 = mkEntityPick("Extra entity 2", "extra_entity_2");
    rowE2.appendChild(this._elExtraEntity2);
    secExtra.appendChild(rowE2);

    const rowE22 = document.createElement("div");
    rowE22.className = "grid2";
    this._elExtraLabel2 = mkText("Label (optional)", "extra_label_2");
    this._elExtraIcon2  = mkIconInput("Icon (optional, mdi:...)", "extra_icon_2");
    rowE22.appendChild(this._elExtraLabel2);
    rowE22.appendChild(this._elExtraIcon2);
    secExtra.appendChild(rowE22);

    const rowE3 = document.createElement("div");
    rowE3.className = "grid1";
    this._elExtraEntity3 = mkEntityPick("Extra entity 3", "extra_entity_3");
    rowE3.appendChild(this._elExtraEntity3);
    secExtra.appendChild(rowE3);

    const rowE33 = document.createElement("div");
    rowE33.className = "grid2";
    this._elExtraLabel3 = mkText("Label (optional)", "extra_label_3");
    this._elExtraIcon3  = mkIconInput("Icon (optional, mdi:...)", "extra_icon_3");
    rowE33.appendChild(this._elExtraLabel3);
    rowE33.appendChild(this._elExtraIcon3);
    secExtra.appendChild(rowE33);

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
  }

  _sync() {
    if (!this._hass || !this._config) return;

    if (this._isPickingColor) {
      if (this._elEntity) this._elEntity.hass = this._hass;
      return;
    }

    this._elEntity.hass = this._hass;
    this._elEntity.value = this._config.entity || "";

    this._elName.value = this._config.name || "";
    this._elUnit.value = this._config.unit || "";
    this._elDecimals.value = String(this._config.decimals ?? 1);

    this._elMin.value = String(this._config.min ?? -20);
    this._elMax.value = String(this._config.max ?? 40);
    this._elFont.value = String(this._config.value_font_size ?? 0);
    this._elCardScale.value = String(this._config.card_scale ?? 1);

    this._elValuePos.value = this._config.value_position || "top_right";

    this._swGlass.checked = !!this._config.glass;
    this._swScale.checked = !!this._config.show_scale;
    this._swStats.checked = !!this._config.show_stats;
    this._swGraph.checked = !!this._config.show_graph;

    this._elOrientation.value = this._config.orientation || "vertical";
    this._elScaleMode.value = this._config.scale_color_mode || "per_interval";
    this._elNamePos.value = this._config.name_position || "auto";

    this._elStatsHours.style.display = this._config.show_stats ? "" : "none";
    this._elStatsHours.value = String(this._config.stats_hours ?? 24);

    this._elGraphHours.style.display = this._config.show_graph ? "" : "none";
    this._elGraphHours.value = String(this._config.graph_hours ?? this._config.stats_hours ?? 24);

    this._swGraphTime.checked = !!this._config.graph_show_time;
    this._swGraphTime.parentElement.style.display = this._config.show_graph ? "" : "none";

    this._renderIntervals();
    if (!this._isPickingColor) this._renderDraft();

    if (this._elExtraEntity1) { this._elExtraEntity1.hass = this._hass; this._elExtraEntity1.value = this._config.extra_entity_1 || ""; }
    if (this._elExtraLabel1) this._elExtraLabel1.value = this._config.extra_label_1 || "";
    if (this._elExtraIcon1)  this._elExtraIcon1.value  = this._config.extra_icon_1  || "";

    if (this._elExtraEntity2) { this._elExtraEntity2.hass = this._hass; this._elExtraEntity2.value = this._config.extra_entity_2 || ""; }
    if (this._elExtraLabel2) this._elExtraLabel2.value = this._config.extra_label_2 || "";
    if (this._elExtraIcon2)  this._elExtraIcon2.value  = this._config.extra_icon_2  || "";

    if (this._elExtraEntity3) { this._elExtraEntity3.hass = this._hass; this._elExtraEntity3.value = this._config.extra_entity_3 || ""; }
    if (this._elExtraLabel3) this._elExtraLabel3.value = this._config.extra_label_3 || "";
    if (this._elExtraIcon3)  this._elExtraIcon3.value  = this._config.extra_icon_3  || "";
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

  _onChange(ev) {
    const target = ev.currentTarget || ev.target;
    const key = target.configValue || target.dataset?.configValue;
    if (!key) return;

    // Switches
    if (typeof target.checked !== "undefined") {
      return this._commit(key, target.checked);
    }

    // Numeriska fält
    if (
      key === "min" ||
      key === "max" ||
      key === "value_font_size" ||
      key === "stats_hours" ||
      key === "card_scale" ||
      key === "graph_hours" ||
      key === "graph_height" ||
      key === "graph_max_points" ||
      key === "graph_line_width"
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

    // Entity-fält (inkl extra_entity_1–3) – fixar X/rensning
    if (
      key === "entity" ||
      key === "extra_entity_1" ||
      key === "extra_entity_2" ||
      key === "extra_entity_3"
    ) {
      let value;
      if (ev && ev.detail && "value" in ev.detail) {
        value = ev.detail.value;  // kan vara string, objekt, null, ""
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

      // X tryckt → ta bort just det fältet ur config
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

    // Allt annat (text / select)
    let genericValue;
    if (ev && ev.detail && "value" in ev.detail) {
      genericValue = ev.detail.value;
    } else {
      genericValue = target.value;
    }

    return this._commit(key, genericValue);
  }
}

if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, AndyTemperatureCardEditor);
}
