/* BiasLab — front-end statico. Legge i JSON in data/ generati dalla pipeline. */
"use strict";

const S = {
  meta: null, board: null, cot: null, inst: {},
  boardTab: "major", sel: null, sort: 0,
  pairTab: "summary",
  sum: { range: "1A", show: { total: 1, macro: 0, cot: 0, season: 0, price: 1 }, prange: "6M" },
  season: { lines: new Set(["cy", "a5", "a10", "a15"]), from: null, to: null, dir: "long", wr: "month", mr: "10" },
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const nf = (v, d = 2) => v == null || !isFinite(v) ? "—" : Number(v).toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
const sgn = (v) => v == null ? "—" : (v > 0 ? "+" : "") + v;
const sgnf = (v, d = 2) => v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : "") + nf(v, d);
const kfmt = (v) => v == null ? "—" : (v > 0 ? "+" : "") + Math.round(v).toLocaleString("it-IT");

const CCY_COLOR = { USD: "#1f3a8a", EUR: "#2e6ae6", GBP: "#7a3fd1", JPY: "#d6453d", CHF: "#e27b1f", CAD: "#c2306b", AUD: "#0f8a6a", NZD: "#14161b" };
const CC2 = { USD: "US", EUR: "EU", GBP: "GB", JPY: "JP", CHF: "CH", CAD: "CA", AUD: "AU", NZD: "NZ" };
const flag = (c) => `<span class="flag" style="background:${CCY_COLOR[c] || "#64748b"}">${CC2[c] || c.slice(0, 2)}</span>`;
const flags = (...cs) => `<span class="flags">${cs.filter(Boolean).map(flag).join("")}</span>`;
const dcls = (v) => v == null ? "dnn" : v >= 2 ? "dp2" : v >= 1 ? "dp1" : v <= -2 ? "dm2" : v <= -1 ? "dm1" : "d0";
const dot = (v) => `<span class="dot ${dcls(v)}" title="${v == null ? "n.d." : sgn(v)}">${v == null || v === 0 ? "" : sgn(v)}</span>`;
function sbar(v, max) {
  if (v == null) return `<div class="sbar"><div class="sbar-t"></div><b class="z">—</b></div>`;
  const w = Math.min(50, (Math.abs(v) / (max > 4 ? max * .6 : max)) * 50);
  return `<div class="sbar"><div class="sbar-t"><span class="sbar-f ${v >= 0 ? "pos" : "neg"}" style="${v >= 0 ? `left:50%` : `left:${50 - w}%`};width:${w}%"></span></div><b class="${v > 0 ? "up" : v < 0 ? "dn" : "z"}">${sgn(v)}</b></div>`;
}
const arrow = (v) => `<span class="arrow ${v > 0 ? "up" : v < 0 ? "dn" : "z"}">${v > 0 ? "▲ " + sgn(v) : v < 0 ? "▼ " + v : "— 0"}</span>`;
function gauge(v, max, W = 240) {
  const H = W * .6, cx = W / 2, cy = H - 14, R = W / 2 - 18, sw = 14;
  const P = (r) => { const t = Math.PI - ((r + 1) / 2) * Math.PI; return [cx + R * Math.cos(t), cy - R * Math.sin(t)]; };
  const arc = (a, b, col) => { const [x1, y1] = P(a), [x2, y2] = P(b); return `<path d="M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`; };
  const segs = [[-1, -.37, "#ee4637"], [-.33, -.14, "#f7a197"], [-.1, .1, "#e2e2dc"], [.14, .33, "#7fd9ad"], [.37, 1, "#12a568"]];
  const r = Math.max(-1, Math.min(1, (v || 0) / max)), [kx, ky] = P(r);
  return `<svg class="gauge" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${segs.map((s) => arc(...s)).join("")}
    <circle cx="${kx}" cy="${ky}" r="11" fill="#fff" stroke="#14161b" stroke-width="4"/>
    <text x="${cx}" y="${cy - 22}" class="gauge-v" fill="${v > 0 ? "#12a568" : v < 0 ? "#ee4637" : "#14161b"}">${sgn(v)}</text>
    <text x="${cx}" y="${cy}" class="gauge-s">su ±${max}</text></svg>`;
}
function sparkW(values, h = 44, color) {
  const v = (values || []).filter((x) => x != null); if (v.length < 2) return "";
  const lo = Math.min(...v, 0), hi = Math.max(...v, 0), n = values.length;
  const X = (i) => (i / (n - 1)) * 100, Y = (x) => h - 3 - ((x - lo) / (hi - lo || 1)) * (h - 6);
  let d = ""; values.forEach((x, i) => { if (x != null) d += (d ? "L" : "M") + X(i).toFixed(2) + "," + Y(x).toFixed(2); });
  const col = color || (v.at(-1) >= 0 ? "#12a568" : "#ee4637");
  return `<svg viewBox="0 0 100 ${h}" preserveAspectRatio="none" height="${h}"><line x1="0" x2="100" y1="${Y(0)}" y2="${Y(0)}" stroke="#d4d5cf" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/><path d="${d}L100,${Y(0)}L0,${Y(0)}Z" fill="${col}" fill-opacity=".1"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}
const sc = (v) => v == null ? "sn" : v >= 2 ? "s2" : v >= 1 ? "s1" : v <= -2 ? "sm2" : v <= -1 ? "sm1" : "s0";
const cell = (v, txt) => `<div class="cell ${sc(v)}">${txt ?? (v == null ? "—" : sgn(v))}</div>`;
const tcls = (v, max) => { if (v == null) return "sn"; const r = v / max; return r >= .35 ? "s2" : r >= .12 ? "s1" : r <= -.35 ? "sm2" : r <= -.12 ? "sm1" : "s0"; };
const tcell = (v, max) => `<div class="cell ${tcls(v, max)}">${v == null ? "—" : sgn(v)}</div>`;
const PILL = { "Molto rialzista": "p-vb", "Rialzista": "p-b", "Neutrale": "p-n", "Ribassista": "p-be", "Molto ribassista": "p-vbe" };
const pill = (l) => `<span class="pill ${PILL[l] || "p-n"}">${esc(l)}</span>`;
const biasOf = (t, m) => { const r = t / m; return r >= .35 ? "Molto rialzista" : r >= .12 ? "Rialzista" : r <= -.35 ? "Molto ribassista" : r <= -.12 ? "Ribassista" : "Neutrale"; };
const digits = (id) => { const i = S.board.instruments[id]; if (!i) return 2; if (i.type === "major" || i.type === "cross") return id.includes("JPY") ? 3 : 5; return 2; };
const TYPE_LABEL = { ccy: "Valute", major: "Major", cross: "Cross", index: "Indici", commodity: "Materie prime" };

async function getJSON(p) { const r = await fetch(p, { cache: "no-cache" }); if (!r.ok) throw new Error(p); return r.json(); }
async function getInst(id) { if (!S.inst[id]) S.inst[id] = await getJSON(`data/inst/${id}.json`); return S.inst[id]; }

/* ====================================================================== charts */
const charts = new Set();
let rzT; window.addEventListener("resize", () => { clearTimeout(rzT); rzT = setTimeout(() => charts.forEach((el) => document.body.contains(el) ? el._draw() : charts.delete(el)), 120); });

function niceRange(lo, hi, pad = .06) {
  if (!isFinite(lo) || !isFinite(hi)) return [0, 1];
  if (lo === hi) { lo -= 1; hi += 1; }
  const p = (hi - lo) * pad; return [lo - p, hi + p];
}
function ticks(lo, hi, n = 5) {
  const step0 = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), f = step0 / mag;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10)); return out;
}

function lineChart(el, opt) {
  el.classList.add("chart");
  el._draw = () => drawLine(el, opt);
  charts.add(el); el._draw();
}
function drawLine(el, o) {
  const W = Math.max(280, el.clientWidth), H = o.height || 260;
  const hasR = o.series.some((s) => s.axis === "r");
  const L = 46, R = hasR ? 60 : 14, T = 10, B = 26, iw = W - L - R, ih = H - T - B, n = o.n;
  const rng = (ax) => {
    let lo = Infinity, hi = -Infinity;
    o.series.filter((s) => (s.axis || "l") === ax).forEach((s) => s.values.forEach((v) => { if (v != null && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
    if (ax === "l" && o.yMin != null) lo = Math.min(lo, o.yMin);
    if (ax === "l" && o.yMax != null) hi = Math.max(hi, o.yMax);
    if (ax === "l" && o.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    return niceRange(lo, hi);
  };
  const [l0, l1] = rng("l"), [r0, r1] = hasR ? rng("r") : [0, 1];
  const X = (i) => L + (n <= 1 ? 0 : (i / (n - 1)) * iw);
  const Y = (v, ax) => ax === "r" ? T + ih - ((v - r0) / (r1 - r0)) * ih : T + ih - ((v - l0) / (l1 - l0)) * ih;
  let g = "";
  const dec = (tl) => tl.length > 1 ? Math.max(0, -Math.floor(Math.log10(tl[1] - tl[0]) + 1e-9)) : 0;
  const tl = ticks(l0, l1), dl = dec(tl);
  tl.forEach((t) => { const y = Y(t, "l"); g += `<line class="gridline" x1="${L}" x2="${L + iw}" y1="${y}" y2="${y}"/><text x="${L - 8}" y="${y + 4}" text-anchor="end">${(o.yFmt || ((v, d) => nf(v, d)))(t, dl)}</text>`; });
  if (hasR) { const tr = ticks(r0, r1, 4), dr = dec(tr); tr.forEach((t) => { const y = Y(t, "r"); g += `<text x="${L + iw + 8}" y="${y + 4}">${(o.y2Fmt || ((v, d) => nf(v, d)))(t, dr)}</text>`; }); }
  (o.ticks || []).forEach((t) => { g += `<text x="${X(t.i)}" y="${H - 6}" text-anchor="middle">${t.label}</text>`; });
  if (o.zero) { const y = Y(0, "l"); g += `<line x1="${L}" x2="${L + iw}" y1="${y}" y2="${y}" stroke="#c9ccd9" stroke-dasharray="3 3"/>`; }
  (o.refLines || []).forEach((r) => { const y = Y(r.v, "l"); g += `<line x1="${L}" x2="${L + iw}" y1="${y}" y2="${y}" stroke="${r.color}" stroke-opacity=".35" stroke-dasharray="2 4"/><text x="${L + 4}" y="${y - 4}" style="fill:${r.color};font-size:10px">${r.label}</text>`; });
  if (o.band) { const [a, b] = o.band; g += `<rect x="${X(Math.min(a, b))}" y="${T}" width="${Math.max(2, Math.abs(X(b) - X(a)))}" height="${ih}" rx="6" fill="#d9f56b" fill-opacity=".35" stroke="#9ec31f" stroke-opacity=".6"/>`; }
  let paths = "";
  o.series.forEach((s) => {
    const ax = s.axis || "l"; let d = "", pen = false, area = "", first = null, last = null;
    s.values.forEach((v, i) => {
      if (v == null || !isFinite(v)) { pen = false; return; }
      const x = X(i), y = Y(v, ax);
      if (!pen) { d += `M${x},${y}`; pen = true; if (first == null) first = x; }
      else if (s.step) d += `H${x}V${y}`; else d += `L${x},${y}`;
      last = x;
    });
    if (s.area && first != null) area = `<path d="${d}L${last},${T + ih}L${first},${T + ih}Z" fill="${s.color}" fill-opacity=".08"/>`;
    paths += area + `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ""} stroke-linejoin="round" stroke-linecap="round" ${s.opacity ? `stroke-opacity="${s.opacity}"` : ""}/>`;
  });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}"><g class="axis">${g}</g>${paths}<line class="hl" y1="${T}" y2="${T + ih}" stroke="#0f1222" stroke-opacity=".25" style="display:none"/><g class="dots"></g><rect class="ov" x="${L}" y="${T}" width="${iw}" height="${ih}" fill="transparent" style="cursor:${o.onDrag ? "col-resize" : "crosshair"}"/></svg><div class="tip"></div>`;
  const svg = $("svg", el), ov = $(".ov", el), hl = $(".hl", el), tip = $(".tip", el), dots = $(".dots", el);
  const idxAt = (ev) => { const r = svg.getBoundingClientRect(); const x = (ev.clientX - r.left) * (W / r.width); return Math.max(0, Math.min(n - 1, Math.round(((x - L) / iw) * (n - 1)))); };
  let drag = null;
  ov.addEventListener("mousemove", (ev) => {
    const i = idxAt(ev), x = X(i);
    hl.setAttribute("x1", x); hl.setAttribute("x2", x); hl.style.display = "";
    let rows = "", dd = "";
    o.series.forEach((s) => { const v = s.values[i]; if (v == null || s.noTip) return; dd += `<circle cx="${x}" cy="${Y(v, s.axis || "l")}" r="3.5" fill="#fff" stroke="${s.color}" stroke-width="2"/>`; rows += `<div><span class="k" style="background:${s.color}"></span>${esc(s.name)} <b class="num">${(s.fmt || o.tipFmt || ((v) => nf(v)))(v)}</b></div>`; });
    dots.innerHTML = dd;
    tip.innerHTML = `<div style="opacity:.7;margin-bottom:3px">${esc(o.x ? o.x[i] : i)}</div>${rows}`;
    tip.style.display = "block";
    const r = el.getBoundingClientRect(), px = (x / W) * r.width;
    tip.style.left = (px > r.width * .6 ? px - tip.offsetWidth - 12 : px + 12) + "px"; tip.style.top = "8px";
    if (drag != null && o.onDrag) { o.band = [drag, i]; const b = $("rect.band", el); }
  });
  ov.addEventListener("mouseleave", () => { hl.style.display = "none"; tip.style.display = "none"; dots.innerHTML = ""; });
  if (o.onDrag) {
    ov.addEventListener("mousedown", (ev) => { drag = idxAt(ev); ev.preventDefault(); });
    ov.addEventListener("mouseup", (ev) => { if (drag == null) return; const a = drag, b = idxAt(ev); drag = null; if (Math.abs(a - b) >= 2) o.onDrag(Math.min(a, b), Math.max(a, b)); });
  }
}

function barChart(el, o) {
  el.classList.add("chart");
  el._draw = () => {
    const W = Math.max(260, el.clientWidth), H = o.height || 150, L = 46, R = 8, T = 8, B = 22, iw = W - L - R, ih = H - T - B, n = o.values.length;
    let lo = Math.min(0, ...o.values.filter((v) => v != null)), hi = Math.max(0, ...o.values.filter((v) => v != null));
    [lo, hi] = niceRange(lo, hi, .1);
    const Y = (v) => T + ih - ((v - lo) / (hi - lo)) * ih, bw = iw / n;
    let g = ""; ticks(lo, hi, 3).forEach((t) => { g += `<line class="gridline" x1="${L}" x2="${L + iw}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end">${(o.fmt || nf)(t)}</text>`; });
    o.labels.forEach((lb, i) => { if (lb) g += `<text x="${L + bw * i + bw / 2}" y="${H - 6}" text-anchor="middle">${lb}</text>`; });
    let bars = "";
    o.values.forEach((v, i) => { if (v == null) return; const y = Y(Math.max(v, 0)), h = Math.abs(Y(v) - Y(0)); bars += `<rect x="${L + bw * i + bw * .15}" y="${y}" width="${bw * .7}" height="${Math.max(1, h)}" rx="2" fill="${v >= 0 ? "#12a568" : "#ee4637"}" fill-opacity=".9"><title>${esc(o.tips ? o.tips[i] : "")}: ${(o.fmt || nf)(v)}</title></rect>`; });
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}"><g class="axis">${g}</g><line x1="${L}" x2="${L + iw}" y1="${Y(0)}" y2="${Y(0)}" stroke="#c9ccd9"/>${bars}</svg>`;
  };
  charts.add(el); el._draw();
}

function spark(values, w = 120, h = 30) {
  const v = values.filter((x) => x != null); if (v.length < 2) return "";
  const lo = Math.min(...v), hi = Math.max(...v), X = (i) => (i / (values.length - 1)) * w, Y = (x) => h - 2 - ((x - lo) / (hi - lo || 1)) * (h - 4);
  let d = ""; values.forEach((x, i) => { if (x != null) d += (d ? "L" : "M") + X(i).toFixed(1) + "," + Y(x).toFixed(1); });
  const up = v[v.length - 1] >= v[0];
  const zy = lo < 0 && hi > 0 ? `<line x1="0" x2="${w}" y1="${Y(0)}" y2="${Y(0)}" stroke="#d5d8e3" stroke-dasharray="2 2"/>` : "";
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${zy}<path d="${d}" fill="none" stroke="${up ? "#12a568" : "#ee4637"}" stroke-width="1.6"/></svg>`;
}

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const fmtDate = (s) => { if (!s) return ""; const [y, m, d] = s.split("-"); return `${+d} ${MONTHS[+m - 1]} ${y}`; };
function dateTicks(dates, max = 7) {
  const n = dates.length; if (!n) return []; const out = []; let lastKey = null;
  const span = (Date.parse(dates[n - 1]) - Date.parse(dates[0])) / 864e5;
  const byYear = span > 900;
  dates.forEach((d, i) => { const key = byYear ? d.slice(0, 4) : d.slice(0, 7); if (key !== lastKey) { out.push({ i, label: byYear ? key : MONTHS[+d.slice(5, 7) - 1] }); lastKey = key; } });
  const step = Math.ceil(out.length / max); return out.filter((_, k) => k % step === 0 && out[k].i > 0);
}

/* ====================================================================== shell */
async function load() {
  try {
    [S.meta, S.board, S.cot] = await Promise.all([getJSON("data/meta.json"), getJSON("data/board.json"), getJSON("data/cot.json")]);
  } catch (e) {
    $("#app").innerHTML = `<div class="card empty">Dati non trovati. Esegui <code>python pipeline/build.py</code> per generarli.</div>`; return;
  }
  $("#site-name").textContent = S.meta.site;
  document.title = `${S.meta.site} — Bias macro, COT e stagionalità`;
  if (S.board.demo) $("#demo").innerHTML = `<div class="demo-banner"><b>Dati dimostrativi.</b> Sono numeri sintetici per provare l'interfaccia: i dati reali arrivano quando la pipeline gira online.</div>`;
  const g = new Date(S.board.generated);
  $("#stamp").textContent = `Aggiornato il ${g.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}, ${g.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  $("#foot-gen").textContent = `Dati al ${fmtDate(S.board.as_of)}`;
  $("#side-foot").innerHTML = `<b><span class="live"></span>Aggiornamento automatico</b>Ogni mattina e il venerdì sera dopo il report COT.<br>Ultimo: ${fmtDate(S.board.as_of)}`;
  document.addEventListener("keydown", (e) => { if (e.key === "/" && document.activeElement.tagName !== "INPUT") { e.preventDefault(); $("#goto").focus(); } if (e.key === "Escape") closeDrawer(); });
  $("#scrim").onclick = closeDrawer;
  setupGoto();
  window.addEventListener("hashchange", route);
  route();
}

function route() {
  const h = decodeURIComponent(location.hash.slice(1)) || "board";
  charts.clear(); closeDrawer();
  $$("#nav a").forEach((a) => a.classList.toggle("on", h === a.dataset.r || (h.startsWith("pair-") && a.dataset.r === "board")));
  if (h.startsWith("pair-")) renderPair(h.slice(5).toUpperCase());
  else if (h === "cot") renderCot();
  else if (h === "metodo") renderMethod();
  else if (h === "stato") renderStatus();
  else renderBoard();
  window.scrollTo(0, 0);
}

function setupGoto() {
  const inp = $("#goto"), list = $("#goto-list");
  const items = Object.entries(S.board.instruments).map(([id, r]) => ({ id, name: r.name, type: r.type, total: r.total, max: r.max }));
  const draw = () => {
    const q = inp.value.trim().toLowerCase().replace("/", "");
    const f = items.filter((x) => !q || x.id.toLowerCase().includes(q) || x.name.toLowerCase().replace("/", "").includes(q));
    let html = "", cur = null;
    f.forEach((x, k) => { if (x.type !== cur) { cur = x.type; html += `<div class="gh">${TYPE_LABEL[x.type]}</div>`; } html += `<a href="#pair-${x.id}" class="${k === 0 && q ? "hl" : ""}"><span>${esc(x.name)}</span>${`<span class="cell ${tcls(x.total, x.max)}" style="height:20px;min-width:30px;font-size:11px">${sgn(x.total)}</span>`}</a>`; });
    list.innerHTML = html || `<div class="gh">Nessun risultato</div>`;
  };
  inp.addEventListener("focus", () => { draw(); list.classList.add("open"); });
  inp.addEventListener("input", draw);
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { const a = $("a", list); if (a) { location.hash = a.getAttribute("href"); inp.blur(); } } if (e.key === "Escape") inp.blur(); });
  inp.addEventListener("blur", () => setTimeout(() => { list.classList.remove("open"); inp.value = ""; }, 150));
}

/* ====================================================================== board */
function ccyStrength(c) { const r = S.board.currencies[c]; return r.total + (r.cot ? r.cot.score : 0); }

function renderBoard() {
  const B = S.board, M = S.meta;
  const fx = [...M.groups.major, ...M.groups.cross].map((id) => ({ id, ...B.instruments[id] }));
  const bulls = [...fx].sort((a, b) => b.total - a.total).slice(0, 3), bears = [...fx].sort((a, b) => a.total - b.total).slice(0, 3);
  const ranks = M.currencies.map((c) => ({ c, v: ccyStrength(c), cot: B.currencies[c].cot })).sort((a, b) => b.v - a.v);
  const movers = Object.entries(B.instruments).map(([id, r]) => ({ id, ...r })).filter((x) => x.chg && x.chg["1w"]).sort((a, b) => Math.abs(b.chg["1w"]) - Math.abs(a.chg["1w"])).slice(0, 7);
  const nb = fx.filter((x) => x.total / x.max >= .12).length, ns = fx.filter((x) => x.total / x.max <= -.12).length;
  const counts = { ccy: M.currencies.length, major: M.groups.major.length, cross: M.groups.cross.length, index: M.groups.index.length, commodity: M.groups.commodity.length };
  const setup = (x, kind) => `<div class="setup ${kind}" data-open="${x.id}"><div class="t"><span style="display:flex;align-items:center">${flags(x.base, x.quote)}${esc(x.name)}</span>${pill(x.bias)}</div><div class="big">${sgn(x.total)}<small>/ ${x.max}</small></div>${sparkW(x.spark, 40)}</div>`;
  $("#app").innerHTML = `
  <div class="hero"><div><div class="eyebrow">Panoramica · ${fmtDate(B.as_of)}</div><h1>Dove punta il mercato</h1><div class="sub">${nb} coppie rialziste e ${ns} ribassiste su ${fx.length} · macro, COT e stagionalità in un punteggio</div></div></div>
  <div class="grid g-hero">
    <div class="card"><div class="card-h"><h2>Forza delle valute</h2><span class="hint">macro + COT, da −10 a +10</span></div>
      <div>${ranks.map((r, i) => { const w = Math.min(50, Math.abs(r.v) / 10 * 50); return `<div class="str-row" data-open="${r.c}"><div class="c"><span class="rank">${i + 1}</span>${flag(r.c)}${r.c}</div><div class="str-bar"><span class="${r.v >= 0 ? "pos" : "neg"}" style="width:${w}%"></span></div><div class="v ${r.v > 0 ? "up" : r.v < 0 ? "dn" : ""}">${sgn(r.v)}</div><div class="muted" style="font-size:11.5px;text-align:right">COT ${r.cot ? sgn(r.cot.score) : "—"}</div></div>`; }).join("")}</div>
      ${(() => { const L = ["Molto ribassista", "Ribassista", "Neutrale", "Rialzista", "Molto rialzista"], col = ["#ee4637", "#f7a197", "#e2e2dc", "#7fd9ad", "#12a568"]; const n = L.map((l) => fx.filter((x) => x.bias === l).length);
        return `<div class="eyebrow" style="margin-top:20px">Le ${fx.length} coppie forex per bias</div><div style="display:flex;height:14px;border-radius:999px;overflow:hidden;gap:3px">${n.map((k, i) => k ? `<span style="flex:${k};background:${col[i]};border-radius:999px" title="${L[i]}: ${k}"></span>` : "").join("")}</div>
        <div class="legend" style="justify-content:space-between">${n.map((k, i) => `<span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:${col[i]}"></span>${L[i]} <b class="num" style="color:var(--ink)">${k}</b></span>`).join("")}</div>`; })()}
    </div>
    <div class="card"><div class="card-h"><h2>Setup più forti</h2><span class="hint">andamento dello score, ultimi 6 mesi</span></div>
      <div class="setups"><div><div class="col-l up">Rialzisti</div><div class="grid" style="gap:10px">${bulls.map((x) => setup(x, "bull")).join("")}</div></div>
      <div><div class="col-l dn">Ribassisti</div><div class="grid" style="gap:10px">${bears.map((x) => setup(x, "bear")).join("")}</div></div></div>
    </div>
  </div>
  <div class="card mt">
    <div class="card-h"><h2>Mercati</h2>
      <div class="ctl"><div class="seg" id="btabs">${Object.keys(counts).map((k) => `<button data-t="${k}" class="${S.boardTab === k ? "on" : ""}">${TYPE_LABEL[k]}<span class="c">${counts[k]}</span></button>`).join("")}</div>
      <div class="seg" id="bview" style="${S.boardTab === "index" || S.boardTab === "commodity" ? "display:none" : ""}"><button data-v="sum" class="${S.view !== "grid" ? "on" : ""}">Sintesi</button><button data-v="grid" class="${S.view === "grid" ? "on" : ""}">Dato per dato</button></div></div>
    </div>
    <div class="tbl-wrap" id="btable"></div>
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-h"><h2>Mappa dei cross</h2><span class="hint">valuta in riga contro valuta in colonna</span></div><div class="tbl-wrap" id="matrix"></div></div>
    <div class="card"><div class="card-h"><h2>Cambiamenti della settimana</h2><span class="hint">variazione dello score in 7 giorni</span></div>
      <table class="list"><tbody>${movers.map((x) => `<tr data-open="${x.id}"><td><div class="mk">${x.base ? flags(x.base, x.quote) : ""}${esc(x.name)}</div></td><td>${sbar(x.total, x.max)}</td><td class="r">${arrow(x.chg["1w"])}</td></tr>`).join("") || `<tr><td class="muted">Nessuna variazione questa settimana</td></tr>`}</tbody></table>
    </div>
  </div>`;
  $$("[data-open]").forEach((k) => k.onclick = () => openDrawer(k.dataset.open));
  $$("#btabs button").forEach((b) => b.onclick = () => { S.boardTab = b.dataset.t; S.sort = 0; $$("#btabs button").forEach((x) => x.classList.toggle("on", x === b)); $("#bview").style.display = (S.boardTab === "index" || S.boardTab === "commodity") ? "none" : ""; drawBoardTable(); });
  $$("#bview button").forEach((b) => b.onclick = () => { S.view = b.dataset.v; $$("#bview button").forEach((x) => x.classList.toggle("on", x === b)); drawBoardTable(); });
  drawBoardTable(); drawMatrix();
}

function boardRows(tab) {
  const B = S.board, M = S.meta;
  if (tab === "ccy") return M.currencies.map((c) => { const r = B.currencies[c]; const cot = r.cot ? r.cot.score : null; const total = r.total + (cot || 0); const ind = {}; M.indicators.forEach((m) => ind[m.id] = r.ind[m.id] ? r.ind[m.id].score : null); return { id: c, ccy: true, c, name: r.name, ind, cats: r.cats, cot, total, max: 10, bias: biasOf(total, 10) }; });
  return M.groups[tab].map((id) => ({ id, ...B.instruments[id] }));
}

function drawBoardTable() {
  const M = S.meta, tab = S.boardTab, el = $("#btable");
  let rows = boardRows(tab);
  if (S.sort) rows = [...rows].sort((a, b) => S.sort * (b.total - a.total));
  const sortTh = `<th class="th-sort" id="sortT">Score ${S.sort === 1 ? "↓" : S.sort === -1 ? "↑" : "↕"}</th>`;
  const grid = S.view === "grid" && tab !== "index" && tab !== "commodity";
  let h;
  if (grid) {
    const cats = M.categories.map(([id, label]) => ({ id, label, inds: M.indicators.filter((m) => m.cat === id) }));
    h = `<table class="dg"><thead><tr><th></th><th></th>${cats.map((c) => `<th class="gap"></th><th class="grp" colspan="${c.inds.length}"><span>${c.label}</span></th>`).join("")}<th class="gap"></th><th class="grp" colspan="2"><span>Flussi</span></th></tr>
      <tr><th class="l">Mercato</th><th class="l th-sort" id="sortT">Score ${S.sort === 1 ? "↓" : S.sort === -1 ? "↑" : "↕"}</th>${cats.map((c) => `<th class="gap"></th>` + c.inds.map((m) => `<th title="${esc(m.label)}">${esc(m.short)}</th>`).join("")).join("")}<th class="gap"></th><th>COT</th><th>Stag.</th></tr></thead><tbody>`;
    rows.forEach((r) => {
      h += `<tr data-id="${r.id}"><td class="l"><div class="mk">${r.ccy ? flags(r.c) + r.c : flags(r.base, r.quote) + esc(r.name)}</div></td><td class="l" style="min-width:150px">${sbar(r.total, r.max)}</td>`;
      cats.forEach((c) => { h += `<td class="gap"></td>` + c.inds.map((m) => `<td>${dot(r.ind ? r.ind[m.id] : null)}</td>`).join(""); });
      h += `<td class="gap"></td><td>${dot(r.cot)}</td><td>${r.ccy ? dot(null) : dot(r.season)}</td></tr>`;
    });
    h += `</tbody></table><div class="legend">${[-2, -1, 0, 1, 2].map((v) => `${dot(v)}`).join("")} <span>da ribassista a rialzista · ogni dato confrontato con il precedente · trattino = dato non disponibile</span></div>`;
  } else if (tab === "ccy") {
    h = `<table class="list"><thead><tr><th>Valuta</th>${sortTh}<th>Bias</th>${M.categories.map(([, l]) => `<th style="text-align:center" class="col-hide">${l}</th>`).join("")}<th style="text-align:center">COT</th></tr></thead><tbody>`;
    rows.forEach((r) => { h += `<tr data-id="${r.id}"><td><div class="mk">${flags(r.c)}<div>${r.c}<small>${esc(r.name)}</small></div></div></td><td style="min-width:200px">${sbar(r.total, r.max)}</td><td>${pill(r.bias)}</td>${M.categories.map(([c]) => `<td style="text-align:center" class="col-hide">${dot(r.cats[c])}</td>`).join("")}<td style="text-align:center">${dot(r.cot)}</td></tr>`; });
    h += `</tbody></table>`;
  } else {
    const fx = tab === "major" || tab === "cross";
    h = `<table class="list"><thead><tr><th>Mercato</th>${sortTh}<th>Bias</th><th class="col-hide">Componenti</th><th class="col-hide">Trend 6 mesi</th><th class="r">1 sett.</th><th class="r col-hide">Prezzo</th><th class="r">1 giorno</th></tr></thead><tbody>`;
    rows.forEach((r) => {
      const comp = (fx ? [["M", r.macro]] : []).concat([["C", r.cot], ["S", r.season]]);
      h += `<tr data-id="${r.id}"><td><div class="mk">${fx ? flags(r.base, r.quote) : ""}<div>${esc(r.name)}${fx ? "" : `<small>${r.season_detail ? `stagionalità ${r.season_detail.winrate}% anni positivi` : ""}</small>`}</div></div></td>
        <td style="min-width:200px">${sbar(r.total, r.max)}</td><td>${pill(r.bias)}</td>
        <td class="col-hide"><span class="comp">${comp.map(([k, v]) => `<span class="${v > 0 ? "up" : v < 0 ? "dn" : ""}"><i>${k}</i>${v == null ? "—" : sgn(v)}</span>`).join("")}</span></td>
        <td class="col-hide" style="width:130px">${sparkW(r.spark, 28)}</td><td class="r">${arrow(r.chg ? r.chg["1w"] : 0)}</td>
        <td class="r num col-hide">${nf(r.last, digits(r.id))}</td><td class="r num ${r.chg_1d >= 0 ? "up" : "dn"}">${sgnf(r.chg_1d)}%</td></tr>`;
    });
    h += `</tbody></table><div class="legend"><span class="comp"><span><i>M</i>macro</span><span><i>C</i>COT</span><span><i>S</i>stagionalità</span></span> <span>clicca una riga per il dettaglio</span></div>`;
  }
  el.innerHTML = h;
  $$("tbody tr[data-id]", el).forEach((tr) => tr.onclick = () => openDrawer(tr.dataset.id));
  const st = $("#sortT"); if (st) st.onclick = () => { S.sort = S.sort === 0 ? 1 : S.sort === 1 ? -1 : 0; drawBoardTable(); };
}

function drawMatrix() {
  const C = S.meta.currencies, mx = S.board.matrix, max = S.meta.max_fx;
  let h = `<table class="bm"><thead><tr><th></th>${C.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;
  C.forEach((b) => {
    h += `<tr><th class="rh">${b}</th>`;
    C.forEach((q) => {
      if (b === q) { h += `<td class="diag"></td>`; return; }
      const v = mx[b][q], id = S.board.instruments[b + q] ? b + q : q + b;
      const sz = v == null ? 0 : Math.round(16 + Math.min(1, Math.abs(v) / (max * .5)) * 20);
      h += `<td data-p="${id}" title="${b}/${q}: ${sgn(v)}">${v == null ? "" : `<span class="bub ${v > 0 ? "pos" : v < 0 ? "neg" : "zero"}" style="width:${sz}px;height:${sz}px;opacity:${.45 + Math.min(1, Math.abs(v) / (max * .5)) * .55}">${sz >= 22 ? sgn(v) : ""}</span>`}</td>`;
    });
    h += "</tr>";
  });
  $("#matrix").innerHTML = h + `</tbody></table><div class="legend" style="justify-content:center"><span class="bub neg" style="width:14px;height:14px"></span> ribassista <span class="bub zero" style="width:14px;height:14px"></span> neutrale <span class="bub pos" style="width:14px;height:14px"></span> rialzista · più grande = più forte</div>`;
  $$("#matrix td[data-p]").forEach((td) => td.onclick = () => openDrawer(td.dataset.p));
}

/* ---------- pannello laterale */
function closeDrawer() { const d = $("#drawer"); if (d) { d.classList.remove("open"); $("#scrim").classList.remove("open"); } }
async function openDrawer(id) {
  const B = S.board, M = S.meta, d = $("#drawer");
  S.sel = id;
  if (B.currencies[id]) {
    const r = B.currencies[id], cot = r.cot, total = r.total + (cot ? cot.score : 0);
    const pairs = Object.entries(B.instruments).filter(([, x]) => x.base === id || x.quote === id).map(([pid, x]) => ({ pid, other: x.base === id ? x.quote : x.base, v: x.base === id ? x.total : -x.total, max: x.max })).sort((a, b) => b.v - a.v);
    d.innerHTML = `<button class="x" onclick="closeDrawer()">✕</button>
      <div class="eyebrow">Valuta</div><h3>${flags(id)}${id} · ${esc(r.name)}</h3>
      <div class="card mt" style="text-align:center">${gauge(total, 10)}<div style="margin-top:4px">${pill(biasOf(total, 10))}</div>
        <div class="kv" style="grid-template-columns:repeat(5,1fr);margin-top:14px">${M.categories.map(([c, l]) => `<div><div class="l">${l}</div><div class="v ${r.cats[c] > 0 ? "up" : r.cats[c] < 0 ? "dn" : ""}">${sgn(r.cats[c])}</div></div>`).join("")}<div><div class="l">COT</div><div class="v ${cot && cot.score > 0 ? "up" : cot && cot.score < 0 ? "dn" : ""}">${cot ? sgn(cot.score) : "—"}</div></div></div></div>
      <div class="card mt"><div class="card-h"><h2>Dati macro</h2><span class="hint">attuale · precedente</span></div>${indTable(r)}</div>
      <div class="card mt"><div class="card-h"><h2>Coppie con ${id}</h2><span class="hint">${id} come base</span></div><table class="list"><tbody>${pairs.map((p) => `<tr onclick="location.hash='pair-${p.pid}'"><td><div class="mk">${flags(id, p.other)}${id}/${p.other}</div></td><td style="min-width:170px">${sbar(p.v, p.max)}</td></tr>`).join("")}</tbody></table></div>`;
  } else {
    const r = B.instruments[id], fx = !!r.base;
    d.innerHTML = `<button class="x" onclick="closeDrawer()">✕</button>
      <div class="eyebrow">${TYPE_LABEL[r.type]}</div><h3>${fx ? flags(r.base, r.quote) : ""}${esc(r.name)}</h3>
      <div class="card mt" style="text-align:center">${gauge(r.total, r.max)}<div style="margin-top:4px">${pill(r.bias)}</div>
        <div class="kv" style="margin-top:14px"><div><div class="l">Macro</div><div class="v ${r.macro > 0 ? "up" : r.macro < 0 ? "dn" : ""}">${r.macro == null ? "—" : sgn(r.macro)}</div></div><div><div class="l">COT</div><div class="v ${r.cot > 0 ? "up" : r.cot < 0 ? "dn" : ""}">${sgn(r.cot)}</div></div><div><div class="l">Stagionalità</div><div class="v ${r.season > 0 ? "up" : r.season < 0 ? "dn" : ""}">${sgn(r.season)}</div></div></div>
        ${fx ? `<div class="vs mt"><div class="side-c">${flag(r.base)}${r.base} <span class="num ${B.currencies[r.base].total >= 0 ? "up" : "dn"}">${sgn(B.currencies[r.base].total)}</span></div><span class="vsx">VS</span><div class="side-c"><span class="num ${B.currencies[r.quote].total >= 0 ? "up" : "dn"}">${sgn(B.currencies[r.quote].total)}</span> ${r.quote}${flag(r.quote)}</div></div>` : ""}
      </div>
      <div class="card mt"><div class="card-h"><h2>Prezzo</h2><div class="seg" id="dprange">${["1M", "3M", "6M", "1A"].map((k) => `<button data-k="${k}" class="${S.sum.prange === k ? "on" : ""}">${k}</button>`).join("")}</div></div>
        <div class="stat-line"><span>Ultimo<b>${nf(r.last, digits(id))}</b></span><span>1 giorno<b class="${r.chg_1d >= 0 ? "up" : "dn"}">${sgnf(r.chg_1d)}%</b></span></div><div id="dprice"></div></div>
      <div class="card mt">${fx ? `<div class="card-h"><h2>Dato per dato</h2><span class="hint">${r.base} · ${r.quote} · coppia</span></div>${pairMiniTable(r)}` : seasonCotMini(r)}</div>
      <div style="margin-top:16px;display:flex;justify-content:flex-end"><a class="btn" href="#pair-${id}">Apri l'analisi completa <span class="arr">→</span></a></div>`;
    getInst(id).then((inst) => {
      if (!inst || !inst.prices || S.sel !== id) return;
      const draw = () => priceChart($("#dprice"), inst, S.sum.prange, id, 200);
      draw(); $$("#dprange button").forEach((b) => b.onclick = () => { S.sum.prange = b.dataset.k; $$("#dprange button").forEach((x) => x.classList.toggle("on", x === b)); draw(); });
    }).catch(() => {});
  }
  d.scrollTop = 0; d.classList.add("open"); $("#scrim").classList.add("open");
}

function fmtVal(v, m) { if (v == null) return "—"; const d = m.unit === "k" ? 0 : m.unit === "idx" ? 1 : 2; return nf(v, d) + (m.unit.startsWith("%") ? "%" : ""); }

function indTable(r) {
  const M = S.meta; let h = `<table class="mini-t"><thead><tr><th>Dato</th><th>Periodo</th><th>Attuale</th><th>Prec.</th><th>Score</th></tr></thead><tbody>`;
  M.categories.forEach(([c, l]) => {
    const list = M.indicators.filter((m) => m.cat === c && r.ind[m.id]); if (!list.length) return;
    h += `<tr class="cat"><td colspan="5">${l}</td></tr>`;
    list.forEach((m) => { const x = r.ind[m.id]; h += `<tr><td title="${esc(x.source || "")}">${esc(m.label)}</td><td class="muted num">${esc(x.period)}</td><td class="num">${fmtVal(x.actual, m)}</td><td class="num muted">${fmtVal(x.previous, m)}</td><td>${dot(x.score)}</td></tr>`; });
  });
  return h + "</tbody></table>";
}

function pairMiniTable(r) {
  const M = S.meta, cb = S.board.currencies[r.base], cq = S.board.currencies[r.quote];
  let h = `<table class="mini-t"><thead><tr><th>Dato</th><th>${r.base}</th><th>${r.quote}</th><th>Coppia</th></tr></thead><tbody>`;
  M.categories.forEach(([c, l]) => {
    const list = M.indicators.filter((m) => m.cat === c && (cb.ind[m.id] || cq.ind[m.id])); if (!list.length) return;
    h += `<tr class="cat"><td colspan="4">${l}</td></tr>`;
    list.forEach((m) => h += `<tr><td>${esc(m.label)}</td><td>${dot(cb.ind[m.id] ? cb.ind[m.id].score : null)}</td><td>${dot(cq.ind[m.id] ? cq.ind[m.id].score : null)}</td><td>${dot(r.ind[m.id])}</td></tr>`);
  });
  return h + "</tbody></table>";
}

function seasonCotMini(r) {
  const s = r.season_detail, c = r.cot_code && S.cot[r.cot_code] ? S.cot[r.cot_code] : null;
  return `<div class="card-h"><h2>Flussi</h2></div><table class="mini-t"><tbody>
   <tr class="cat"><td colspan="2">Stagionalità prossimi ${S.meta.season_horizon} giorni</td></tr>
   <tr><td>Anni positivi (ultimi ${s ? s.n : "—"})</td><td class="num">${s ? s.winrate + "%" : "—"}</td></tr>
   <tr><td>Rendimento medio</td><td class="num">${s ? sgnf(s.avg) + "%" : "—"}</td></tr>
   <tr class="cat"><td colspan="2">COT · ${c ? esc(c.name) : "non disponibile"}</td></tr>
   ${c && c.score ? `<tr><td>Posizione netta speculativa</td><td class="num">${kfmt(c.score.net)}</td></tr><tr><td>Variazione 4 settimane</td><td class="num">${kfmt(c.score.chg_4w)}</td></tr><tr><td>Percentile 3 anni</td><td class="num">${c.score.pctile}°</td></tr>` : `<tr><td class="muted" colspan="2">Nessun contratto CFTC per questo mercato</td></tr>`}
  </tbody></table>`;
}

function sliceRange(d, key) {
  const days = { "1M": 31, "3M": 92, "6M": 183, "1A": 366, "2A": 731, "5A": 1827 }[key] || 99999;
  const end = Date.parse(d[d.length - 1]); let i = d.length - 1; while (i > 0 && end - Date.parse(d[i - 1]) <= days * 864e5) i--; return i;
}
function priceChart(el, inst, range, id, height = 260) {
  const p = inst.prices, i0 = sliceRange(p.d, range), d = p.d.slice(i0), c = p.c.slice(i0), dg = digits(id);
  lineChart(el, { n: d.length, x: d.map(fmtDate), ticks: dateTicks(d), height, series: [{ name: "Chiusura", values: c, color: "#2e6ae6", area: true, fmt: (v) => nf(v, dg) }] });
}

/* ====================================================================== pair page */
async function renderPair(id) {
  const B = S.board, r = B.instruments[id];
  if (!r) { $("#app").innerHTML = `<div class="card empty">Mercato "${esc(id)}" non trovato. <a class="btn ghost" href="#board">Torna alla board</a></div>`; return; }
  const sub = r.base ? `${S.meta.currency_names[r.base]} contro ${S.meta.currency_names[r.quote]}` : TYPE_LABEL[r.type];
  $("#app").innerHTML = `
   <div class="pair-hero ${r.total / r.max >= .12 ? "bull" : r.total / r.max <= -.12 ? "bear" : ""}"><div class="row">
     <div><div class="eyebrow"><a href="#board" class="muted">← Bias board</a> · ${TYPE_LABEL[r.type]}</div><h1>${r.base ? flags(r.base, r.quote) : ""}${esc(r.name)}</h1><div class="sub">${esc(sub)}</div></div>
     <div class="stats"><div>Score<b class="${r.total > 0 ? "up" : r.total < 0 ? "dn" : ""}">${sgn(r.total)} <span class="muted" style="font-size:12px">/ ${r.max}</span></b></div><div>Bias<b style="font-family:Inter;font-size:14px;margin-top:3px">${pill(r.bias)}</b></div><div>Ultimo prezzo<b>${nf(r.last, digits(id))}</b></div><div>1 giorno<b class="${r.chg_1d >= 0 ? "up" : "dn"}">${sgnf(r.chg_1d)}%</b></div><div>Score 1 sett.<b>${arrow(r.chg ? r.chg["1w"] : 0)}</b></div></div>
   </div></div>
   <div class="tabs" id="ptabs">
     <button data-t="summary">Panoramica ${tcell(r.total, r.max)}</button>
     <button data-t="cot">COT ${cell(r.cot)}</button>
     <button data-t="season">Stagionalità ${cell(r.season)}</button>
   </div><div id="pbody"><div class="empty">Caricamento…</div></div>`;
  const setTab = async (t) => {
    S.pairTab = t; $$("#ptabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
    charts.clear();
    const inst = await getInst(id).catch(() => null);
    if (location.hash.slice(1).toUpperCase() !== `PAIR-${id}`) return;
    if (t === "summary") pairSummary(id, r, inst); else if (t === "cot") pairCot(id, r); else pairSeason(id, r, inst);
  };
  $$("#ptabs button").forEach((b) => b.onclick = () => setTab(b.dataset.t));
  setTab(S.pairTab);
}

function pairSummary(id, r, inst) {
  const B = S.board, fx = !!r.base;
  const cb = fx && B.currencies[r.base], cq = fx && B.currencies[r.quote];
  $("#pbody").innerHTML = `
  <div class="grid g-sum">
    <div class="card">
      <div class="card-h"><h2>Score composito</h2>${pill(r.bias)}</div>
      <div style="text-align:center">${gauge(r.total, r.max, 280)}</div>
      ${fx ? `<div class="vs mt"><div class="side-c">${flag(r.base)}${r.base} <span class="num ${cb.total >= 0 ? "up" : "dn"}">${sgn(cb.total)}</span></div><span class="vsx">VS</span><div class="side-c"><span class="num ${cq.total >= 0 ? "up" : "dn"}">${sgn(cq.total)}</span> ${r.quote}${flag(r.quote)}</div></div>` : ""}
      <div class="mini-bars mt">
        ${fx ? `<div class="mb"><span>Macro</span>${sbar(r.macro, 16)}</div>` : ""}
        <div class="mb"><span>COT</span>${sbar(r.cot, fx ? 4 : 2)}</div>
        <div class="mb"><span>Stagionalità</span>${sbar(r.season, 2)}</div>
      </div>
      ${fx ? `<div class="eyebrow" style="margin-top:18px">Macro per area</div><div class="kv" style="grid-template-columns:repeat(4,1fr)">${S.meta.categories.map(([c, l]) => `<div><div class="l">${l}</div><div class="v ${r.cats[c] > 0 ? "up" : r.cats[c] < 0 ? "dn" : ""}">${sgn(r.cats[c])}</div></div>`).join("")}</div>` : ""}
      <div class="eyebrow" style="margin-top:18px">Variazione dello score</div>
      <div class="kv">${[["1w", "1 settimana"], ["1m", "1 mese"], ["3m", "3 mesi"]].map(([k, l]) => `<div><div class="l">${l}</div><div class="v">${arrow(r.chg[k])}</div></div>`).join("")}</div>
    </div>
    <div class="card">
      <div class="card-h"><h2>Score nel tempo</h2><div class="seg" id="srange">${["3M", "6M", "1A", "2A"].map((k) => `<button data-k="${k}" class="${S.sum.range === k ? "on" : ""}">${k}</button>`).join("")}</div></div>
      <div class="ctl" id="stog" style="margin-bottom:10px"></div>
      <div class="stat-line" id="sstat"></div>
      <div id="schart"></div>
    </div>
  </div>
  ${fx ? `<div class="card" style="margin-top:18px"><div class="card-h"><h2>Dato per dato</h2><span class="hint">ogni dato confrontato con il precedente</span></div><div class="tbl-wrap">${releaseTable(r)}</div></div>` : ""}
  <div class="card" style="margin-top:18px"><div class="card-h"><h2>Prezzo giornaliero</h2><div class="seg" id="prange">${["1M", "3M", "6M", "1A", "5A"].map((k) => `<button data-k="${k}" class="${S.sum.prange === k ? "on" : ""}">${k}</button>`).join("")}</div></div><div id="pchart"></div></div>`;

  const SER = [["total", "Totale", "#14161b"], ["macro", "Macro", "#0f8a6a"], ["cot", "COT", "#7a3fd1"], ["season", "Stagionalità", "#e27b1f"], ["price", "Prezzo", "#2e6ae6"]];
  const drawScore = () => {
    if (!inst) return;
    const H = inst.history, n = H.d.length, k = { "3M": 14, "6M": 27, "1A": 53, "2A": n }[S.sum.range];
    const i0 = Math.max(0, n - k), d = H.d.slice(i0);
    let price = null;
    if (inst.prices) { const p = inst.prices; let j = 0; price = d.map((x) => { while (j < p.d.length - 1 && p.d[j + 1] <= x) j++; return p.d[j] <= x ? p.c[j] : null; }); }
    const series = [];
    SER.forEach(([key, name, color]) => {
      if (!S.sum.show[key]) return;
      if (key === "price") { if (price) series.push({ name, values: price, color, axis: "r", width: 1.6, opacity: .9, fmt: (v) => nf(v, digits(id)) }); return; }
      const vals = H[key].slice(i0); if (vals.every((v) => v == null)) return;
      series.push({ name, values: vals, color, step: true, width: key === "total" ? 2.4 : 1.6, opacity: key === "total" ? 1 : .8, fmt: sgn });
    });
    const tot = H.total.slice(i0);
    $("#sstat").innerHTML = `<span>Ora<b>${sgn(tot.at(-1))}</b></span><span>Media<b>${sgnf(tot.reduce((a, b) => a + b, 0) / tot.length, 1)}</b></span><span>Massimo<b>${sgn(Math.max(...tot))}</b></span><span>Minimo<b>${sgn(Math.min(...tot))}</b></span>`;
    const t = r.max * .35, t2 = r.max * .12;
    lineChart($("#schart"), { n: d.length, x: d.map(fmtDate), ticks: dateTicks(d), height: 300, zero: true, series, yFmt: sgn,
      refLines: [{ v: t2, label: "Rialzista", color: "#12a568" }, { v: -t2, label: "Ribassista", color: "#ee4637" }] });
  };
  $("#stog").innerHTML = SER.map(([k, n, c]) => `<button class="chip ${S.sum.show[k] ? "" : "off"}" data-k="${k}"><i style="background:${c}"></i>${n}</button>`).join("");
  $$("#stog .chip").forEach((b) => b.onclick = () => { S.sum.show[b.dataset.k] ^= 1; b.classList.toggle("off"); drawScore(); });
  $$("#srange button").forEach((b) => b.onclick = () => { S.sum.range = b.dataset.k; $$("#srange button").forEach((x) => x.classList.toggle("on", x === b)); drawScore(); });
  drawScore();
  const drawP = () => inst && inst.prices && priceChart($("#pchart"), inst, S.sum.prange, id, 280);
  $$("#prange button").forEach((b) => b.onclick = () => { S.sum.prange = b.dataset.k; $$("#prange button").forEach((x) => x.classList.toggle("on", x === b)); drawP(); });
  drawP();
  if (!inst) $("#schart").innerHTML = `<div class="empty">Storico non disponibile</div>`;
}

function releaseTable(r) {
  const M = S.meta, cb = S.board.currencies[r.base], cq = S.board.currencies[r.quote];
  let h = `<table class="mini-t"><thead><tr><th>Dato</th><th>${flag(r.base)}Periodo</th><th>Attuale</th><th>Prec.</th><th>Score</th><th style="padding-left:24px">${flag(r.quote)}Periodo</th><th>Attuale</th><th>Prec.</th><th>Score</th><th style="padding-left:24px">Coppia</th></tr></thead><tbody>`;
  M.categories.forEach(([c, l]) => {
    const list = M.indicators.filter((m) => m.cat === c && (cb.ind[m.id] || cq.ind[m.id])); if (!list.length) return;
    h += `<tr class="cat"><td colspan="10">${l}</td></tr>`;
    list.forEach((m) => {
      const a = cb.ind[m.id], b = cq.ind[m.id];
      const part = (x, pad) => x ? `<td class="muted num" ${pad ? 'style="padding-left:24px"' : ""}>${esc(x.period)}</td><td class="num">${fmtVal(x.actual, m)}</td><td class="num muted">${fmtVal(x.previous, m)}</td><td>${dot(x.score)}</td>` : `<td ${pad ? 'style="padding-left:24px"' : ""} class="muted">—</td><td></td><td></td><td>${dot(null)}</td>`;
      h += `<tr><td>${esc(m.label)}</td>${part(a)}${part(b, 1)}<td style="padding-left:24px">${dot(r.ind[m.id])}</td></tr>`;
    });
  });
  return h + "</tbody></table>";
}

/* ---------------------------------------------------------------- COT */
function cotCard(code, title) {
  const c = S.cot[code];
  if (!c || !c.score) return `<div class="card"><div class="card-h"><h2>${title}</h2></div><div class="empty">Dati COT non disponibili per questo mercato</div></div>`;
  const s = c.score, net = c.net_spec, w = net.slice(-52).filter((v) => v != null), lo = Math.min(...w), hi = Math.max(...w);
  const pos = hi > lo ? ((s.net - lo) / (hi - lo)) * 100 : 50;
  const last = c.d.length - 1;
  let rows = "";
  c.groups.forEach((g, i) => {
    const L = c.long[i][last], Sh = c.short[i][last], pL = c.long[i][last - 1], pS = c.short[i][last - 1];
    const n = L - Sh, wk = n - (pL - pS), tot = L + Sh || 1;
    rows += `<tr><td>${esc(g)}</td><td class="num">${nf(L, 0)}</td><td class="num">${nf(Sh, 0)}</td><td class="num ${n >= 0 ? "up" : "dn"}">${kfmt(n)}</td><td class="num ${wk >= 0 ? "up" : "dn"}">${kfmt(wk)}</td><td><div class="lsbar"><span style="width:${(L / tot) * 100}%"></span><span style="width:${(Sh / tot) * 100}%"></span></div></td></tr>`;
  });
  return `<div class="card">
    <div class="card-h" style="margin-bottom:4px"><div><h2 style="display:flex;align-items:center">${title}</h2><div class="muted" style="font-size:12px;margin-top:2px">${esc(c.name)} · report del ${fmtDate(s.date)}</div></div>${dot(s.score)}</div>
    <div style="display:flex;align-items:baseline;gap:10px;margin-top:10px"><div class="cot-net ${s.net >= 0 ? "up" : "dn"}">${kfmt(s.net)}</div><span class="muted" style="font-size:12px">contratti netti speculativi</span></div>
    <div class="cot-stats"><div><div class="l">Questa settimana</div><div class="v">${kfmt(s.chg_1w)}</div></div><div><div class="l">4 settimane</div><div class="v">${kfmt(s.chg_4w)}</div></div><div><div class="l">Percentile 3 anni</div><div class="v">${s.pctile}°</div></div><div><div class="l">Open interest</div><div class="v">${Math.round(c.oi[last] / 1000)}k</div></div></div>
    <div class="range"><i style="left:${pos}%"></i></div><div class="range-l"><span>min 52s ${kfmt(lo)}</span><span>max 52s ${kfmt(hi)}</span></div>
    <div class="muted" style="font-size:12px;margin:16px 0 4px">Netto speculativo, ultimi 3 anni</div><div data-cl="${code}"></div>
    <div class="muted" style="font-size:12px;margin:12px 0 4px">Variazione settimanale del netto, ultime 26 settimane</div><div data-cb="${code}"></div>
    <table class="mini-t" style="margin-top:12px"><thead><tr><th>Gruppo</th><th>Long</th><th>Short</th><th>Netto</th><th>Sett.</th><th>Long / short</th></tr></thead><tbody>${rows}</tbody></table>
    
  </div>`;
}
function drawCotCharts() {
  $$("[data-cl]").forEach((el) => { const c = S.cot[el.dataset.cl]; lineChart(el, { n: c.d.length, x: c.d.map(fmtDate), ticks: dateTicks(c.d), height: 170, zero: true, series: [{ name: "Netto", values: c.net_spec, color: "#2e6ae6", area: true, fmt: kfmt }], yFmt: (v) => Math.abs(v) >= 1000 ? Math.round(v / 1000) + "k" : v }); });
  $$("[data-cb]").forEach((el) => { const c = S.cot[el.dataset.cb]; const n = c.net_spec; const ch = n.map((v, i) => i && v != null && n[i - 1] != null ? v - n[i - 1] : null).slice(-26); const d = c.d.slice(-26); barChart(el, { values: ch, labels: d.map((x, i) => i % 6 === 0 ? `${+x.slice(8)} ${MONTHS[+x.slice(5, 7) - 1]}` : ""), tips: d.map(fmtDate), fmt: (v) => Math.abs(v) >= 1000 ? Math.round(v / 1000) + "k" : Math.round(v) }); });
}
function pairCot(id, r) {
  const cc = S.meta.cot_currency;
  if (r.base) $("#pbody").innerHTML = `<div class="grid g-2">${cotCard(cc[r.base], `${flag(r.base)}${r.base}`)}${cotCard(cc[r.quote], `${flag(r.quote)}${r.quote}`)}</div><p class="muted" style="font-size:12.5px;margin-top:12px">Lo score COT della coppia è la differenza tra il momentum a 4 settimane delle due valute. Il dollaro usa il contratto US Dollar Index.</p>`;
  else $("#pbody").innerHTML = `<div class="grid g-2">${r.cot_code ? cotCard(r.cot_code, esc(r.name)) : `<div class="card empty">Nessun contratto CFTC per ${esc(r.name)}</div>`}</div>`;
  drawCotCharts();
}

/* ---------------------------------------------------------------- stagionalità */
const doyOf = (s) => { const y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5); };
const idxLabel = (i) => { const dt = new Date(Date.UTC(2025, 0, 1) + Math.min(i, 364) * 864e5); return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`; };
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

function seasonModel(inst) {
  const p = inst.prices, years = {}; let prevClose = {};
  for (let i = 0; i < p.d.length; i++) { const y = +p.d[i].slice(0, 4); (years[y] = years[y] || []).push(i); }
  const ys = Object.keys(years).map(Number).sort((a, b) => a - b);
  const cy = +p.d[p.d.length - 1].slice(0, 4), today = doyOf(p.d[p.d.length - 1]);
  const curve = {};
  ys.forEach((y) => {
    if (!years[y - 1]) return; const base = p.c[years[y - 1].at(-1)];
    const a = new Array(366).fill(null); years[y].forEach((i) => a[doyOf(p.d[i])] = (p.c[i] / base - 1) * 100);
    let last = 0; const end = y === cy ? today : 365;
    for (let k = 0; k <= end; k++) { if (a[k] == null) a[k] = last; else last = a[k]; }
    curve[y] = a;
  });
  const avg = (N) => { const yy = []; for (let y = cy - N; y < cy; y++) if (curve[y]) yy.push(curve[y]); if (yy.length < Math.min(3, N)) return null; return { vals: new Array(366).fill(0).map((_, k) => yy.reduce((s, a) => s + a[k], 0) / yy.length), n: yy.length }; };
  // rendimenti mensili e settimanali
  const bucketRet = (key) => { const last = {}; p.d.forEach((d, i) => last[key(d)] = i); const ks = Object.keys(last).sort(); const out = {}; ks.forEach((k, j) => { if (j) out[k] = (p.c[last[k]] / p.c[last[ks[j - 1]]] - 1) * 100; }); return out; };
  const monthly = bucketRet((d) => d.slice(0, 7));
  const weekly = bucketRet((d) => d.slice(0, 4) + "-" + String(Math.min(51, Math.floor(doyOf(d) / 7))).padStart(2, "0"));
  return { p, cy, today, curve, avg, monthly, weekly, ys };
}

const LINES = [["cy", "Quest'anno", "#14161b"], ["ly", "Anno scorso", "#b4b6bd"], ["a5", "Media 5 anni", "#e27b1f"], ["a7", "Media 7 anni", "#7a3fd1"], ["a10", "Media 10 anni", "#12a568"], ["a15", "Media 15 anni", "#2e6ae6"], ["a20", "Media 20 anni", "#c2306b"]];

function pairSeason(id, r, inst) {
  if (!inst || !inst.prices) { $("#pbody").innerHTML = `<div class="card empty">Prezzi non disponibili</div>`; return; }
  const m = seasonModel(inst), st = S.season;
  const sd = r.season_detail;
  $("#pbody").innerHTML = `
  <div class="card">
    <div class="card-h"><h2>Andamento stagionale</h2><div class="ctl" id="slines">${LINES.map(([k, n, c]) => `<button class="chip ${st.lines.has(k) ? "" : "off"}" data-k="${k}"><i style="background:${c}"></i>${n}</button>`).join("")}</div></div>
    <div class="season-grid">
      <div><div id="sc"></div><div class="muted" style="font-size:12px;margin-top:4px">Rendimento cumulato dall'inizio dell'anno. Trascina sul grafico per testare un periodo.</div></div>
      <div class="panel">
        <h4>Da inizio anno</h4><div id="ytd"></div>
        <h4 style="margin-top:18px">Prossimi ${S.meta.season_horizon} giorni</h4>
        <div class="li"><span>Anni positivi</span><b class="num">${sd ? sd.winrate + "%" : "—"}</b></div>
        <div class="li"><span>Rendimento medio</span><b class="num">${sd ? sgnf(sd.avg) + "%" : "—"}</b></div>
        <div class="li"><span>Score</span>${cell(r.season)}</div>
        <h4 style="margin-top:18px">Testa un periodo</h4>
        <div class="date-row"><label>Dal</label>${dateSel("f")}</div>
        <div class="date-row"><label>Al</label>${dateSel("t")}</div>
        <div style="display:flex;gap:8px;margin-top:8px"><button class="btn" id="btgo" style="padding:8px 14px">Calcola</button><button class="btn ghost" id="btclr" style="padding:8px 14px">Azzera</button></div>
      </div>
    </div>
  </div>
  <div id="btres"></div>
  <div class="card" style="margin-top:18px"><div class="card-h"><h2>Anni positivi <span class="hint">% di anni in rialzo</span></h2><div class="seg" id="wrmode"><button data-k="week">Settimana</button><button data-k="month">Mese</button></div></div><div class="tbl-wrap" id="wr"></div></div>
  <div class="card" style="margin-top:18px"><div class="card-h"><h2>Rendimenti mensili</h2><div class="seg" id="mrmode">${["5", "10", "20", "all"].map((k) => `<button data-k="${k}">${k === "all" ? "Tutti" : k + " anni"}</button>`).join("")}</div></div><div class="tbl-wrap" id="mr"></div></div>`;

  const lineVals = (k) => {
    if (k === "cy") return { vals: m.curve[m.cy], n: 1 }; if (k === "ly") return m.curve[m.cy - 1] ? { vals: m.curve[m.cy - 1], n: 1 } : null;
    return m.avg(+k.slice(1));
  };
  const draw = () => {
    const series = []; let ytd = "";
    LINES.forEach(([k, n, c]) => {
      const lv = lineVals(k); if (!lv) return;
      if (st.lines.has(k)) series.push({ name: n, values: lv.vals, color: c, width: k === "cy" ? 2.4 : 1.8, fmt: (v) => sgnf(v) + "%" });
      if (st.lines.has(k)) ytd += `<div class="li"><span><i class="sw" style="background:${c}"></i>${n}</span><b class="num">${sgnf(lv.vals[m.today])}%</b></div>`;
    });
    $("#ytd").innerHTML = ytd || `<div class="muted">Nessuna linea selezionata</div>`;
    const band = st.from != null && st.to != null ? [st.from, st.to] : null;
    lineChart($("#sc"), { n: 366, x: [...Array(366)].map((_, i) => idxLabel(i)), ticks: MONTH_START.map((i, k) => ({ i: i + 15, label: MONTHS[k] })), height: 330, zero: true, series, yFmt: (v) => sgnf(v, 0) + "%", band,
      refX: m.today, onDrag: (a, b) => { st.from = a; st.to = b; syncSel(); draw(); backtest(); } });
  };
  const syncSel = () => {
    const set = (p, i) => { if (i == null) return; const dt = new Date(Date.UTC(2025, 0, 1) + Math.min(i, 364) * 864e5); $(`#${p}m`).value = dt.getUTCMonth(); $(`#${p}d`).value = dt.getUTCDate(); };
    set("f", st.from); set("t", st.to);
  };
  const selIdx = (p) => MONTH_START[+$(`#${p}m`).value] + (+$(`#${p}d`).value) - 1;

  const backtest = () => {
    if (st.from == null || st.to == null) { $("#btres").innerHTML = ""; return; }
    const p = m.p, rows = [];
    const at = (y, i) => { const dt = new Date(Date.UTC(y, 0, 1) + i * 864e5).toISOString().slice(0, 10); let lo = 0, hi = p.d.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (p.d[mid] < dt) lo = mid + 1; else hi = mid; } return lo < p.d.length ? lo : null; };
    const wrap = st.to < st.from;
    for (let y = m.cy; y >= m.ys[0]; y--) {
      const a = at(y, st.from), b = at(y + (wrap ? 1 : 0), st.to);
      if (a == null || b == null || b <= a) continue;
      const endDate = new Date(Date.UTC(y + (wrap ? 1 : 0), 0, 1) + st.to * 864e5).toISOString().slice(0, 10);
      if (endDate > p.d.at(-1)) continue;
      let mx = -1e9, mn = 1e9; for (let i = a; i <= b; i++) { const rr = (p.c[i] / p.c[a] - 1) * 100; mx = Math.max(mx, rr); mn = Math.min(mn, rr); }
      let ret = (p.c[b] / p.c[a] - 1) * 100; if (st.dir === "short") { ret = -ret; [mx, mn] = [-mn, -mx]; }
      rows.push({ y, from: p.d[a], to: p.d[b], entry: p.c[a], exit: p.c[b], dd: mn, gain: mx, ret });
    }
    const dg = digits(id);
    const stats = [5, 7, 10, 15, 20].map((N) => { const rr = rows.slice(0, N); if (rr.length < 3) return null; const w = rr.filter((x) => x.ret > 0).length; return { N, n: rr.length, w, avg: rr.reduce((s, x) => s + x.ret, 0) / rr.length }; }).filter(Boolean);
    const col = { 5: "#e27b1f", 7: "#7a3fd1", 10: "#12a568", 15: "#2e6ae6", 20: "#c2306b" };
    const mxAbs = Math.max(...rows.map((x) => Math.abs(x.ret)), 0.01);
    $("#btres").innerHTML = `<div class="card" style="margin-top:18px"><div class="card-h"><h2>Dal ${idxLabel(st.from)} al ${idxLabel(st.to)}</h2><div style="display:flex;gap:8px"><div class="seg" id="btdir"><button data-k="long" class="${st.dir === "long" ? "on" : ""}">Long</button><button data-k="short" class="${st.dir === "short" ? "on" : ""}">Short</button></div><button class="btn ghost" id="btx" style="padding:6px 12px">✕</button></div></div>
      <div class="bt"><div>${stats.map((s) => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12.5px"><span style="font-weight:700;color:${col[s.N]}">Media ${s.N} anni</span><span class="num">${Math.round((s.w / s.n) * 100)}%</span></div><div class="bar-s"><i style="width:${(s.w / s.n) * 100}%;background:${col[s.N]}"></i></div><div class="muted" style="font-size:11.5px">${s.w} su ${s.n} positivi · media ${sgnf(s.avg)}%</div></div>`).join("") || `<div class="muted">Storico insufficiente</div>`}</div>
      <div class="bt-table"><table class="mini-t"><thead><tr><th>Anno</th><th>Dal</th><th>Al</th><th>Entrata</th><th>Uscita</th><th>Max drawdown</th><th>Max guadagno</th><th>Rendimento</th></tr></thead><tbody>
      ${rows.map((x) => `<tr><td class="num"><b>${x.y}</b></td><td class="num muted">${fmtDate(x.from)}</td><td class="num muted">${fmtDate(x.to)}</td><td class="num">${nf(x.entry, dg)}</td><td class="num">${nf(x.exit, dg)}</td><td class="num dn">${sgnf(x.dd)}%</td><td class="num up">${sgnf(x.gain)}%</td><td>${cell(x.ret / mxAbs > .5 ? 2 : x.ret > 0 ? 1 : x.ret / mxAbs < -.5 ? -2 : x.ret < 0 ? -1 : 0, sgnf(x.ret) + "%")}</td></tr>`).join("")}
      </tbody></table></div></div></div>`;
    $$("#btdir button").forEach((b) => b.onclick = () => { st.dir = b.dataset.k; backtest(); });
    $("#btx").onclick = () => { st.from = st.to = null; draw(); backtest(); };
  };

  const wrTable = () => {
    const mode = st.wr, src = mode === "month" ? m.monthly : m.weekly, nb = mode === "month" ? 12 : 52;
    const key = (y, b) => mode === "month" ? `${y}-${String(b + 1).padStart(2, "0")}` : `${y}-${String(b).padStart(2, "0")}`;
    const curB = mode === "month" ? +m.p.d.at(-1).slice(5, 7) - 1 : Math.min(51, Math.floor(m.today / 7));
    const heads = mode === "month" ? MONTHS : [...Array(52)].map((_, b) => b % 4 === 0 ? `S${b + 1}` : "");
    const rowsDef = [["Quest'anno", 0], ["5 anni", 5], ["7 anni", 7], ["10 anni", 10], ["15 anni", 15]];
    let h = `<table class="t hm"><thead><tr><th></th>${heads.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>`;
    rowsDef.forEach(([lab, N]) => {
      h += `<tr style="cursor:default"><td class="name" style="font-size:12px">${lab}</td>`;
      for (let b = 0; b < nb; b++) {
        let v = null;
        if (N === 0) { const x = src[key(m.cy, b)]; v = x == null ? null : x > 0 ? 100 : 0; }
        else { let w = 0, n = 0; for (let y = m.cy - N; y < m.cy; y++) { const x = src[key(y, b)]; if (x != null) { n++; if (x > 0) w++; } } v = n ? Math.round((w / n) * 100) : null; }
        const s = v == null ? null : v >= 70 ? 2 : v >= 60 ? 1 : v <= 30 ? -2 : v <= 40 ? -1 : 0;
        h += `<td class="${b === curB ? "cur" : ""}">${mode === "week" ? `<div class="cell ${sc(s)}" style="min-width:18px;font-size:0" title="${heads[b] || "S" + (b + 1)}: ${v ?? "—"}%">.</div>` : cell(s, v == null ? "—" : v)}</td>`;
      }
      h += "</tr>";
    });
    $("#wr").innerHTML = h + "</tbody></table>";
    $$("#wrmode button").forEach((b) => b.classList.toggle("on", b.dataset.k === mode));
  };

  const mrTable = () => {
    const N = st.mr === "all" ? 99 : +st.mr, yrs = []; for (let y = m.cy; y >= Math.max(m.ys[0], m.cy - N + 1); y--) yrs.push(y);
    const all = Object.values(m.monthly), sdv = Math.sqrt(all.reduce((s, x) => s + x * x, 0) / all.length) || 1;
    const rc = (v) => v == null ? null : v > sdv ? 2 : v > sdv * .2 ? 1 : v < -sdv ? -2 : v < -sdv * .2 ? -1 : 0;
    const curM = +m.p.d.at(-1).slice(5, 7) - 1;
    const past = yrs.filter((y) => y < m.cy);
    let h = `<table class="t hm"><thead><tr><th></th>${MONTHS.map((x) => `<th>${x}</th>`).join("")}<th>Anno</th></tr></thead><tbody>`;
    h += `<tr style="cursor:default"><td class="name" style="font-size:12px">Anni positivi</td>`;
    for (let k = 0; k < 12; k++) { const v = past.map((y) => m.monthly[`${y}-${String(k + 1).padStart(2, "0")}`]).filter((x) => x != null); const p = v.length ? Math.round((v.filter((x) => x > 0).length / v.length) * 100) : null; h += `<td class="${k === curM ? "cur" : ""}">${cell(p == null ? null : p >= 70 ? 2 : p >= 60 ? 1 : p <= 30 ? -2 : p <= 40 ? -1 : 0, p == null ? "—" : p + "%")}</td>`; }
    h += `<td></td></tr><tr style="cursor:default"><td class="name" style="font-size:12px">Media</td>`;
    for (let k = 0; k < 12; k++) { const v = past.map((y) => m.monthly[`${y}-${String(k + 1).padStart(2, "0")}`]).filter((x) => x != null); const a = v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; h += `<td class="${k === curM ? "cur" : ""}">${cell(rc(a), a == null ? "—" : sgnf(a, 1) + "%")}</td>`; }
    h += `<td></td></tr>`;
    yrs.forEach((y) => {
      h += `<tr style="cursor:default"><td class="name num" style="font-size:12px">${y}</td>`;
      for (let k = 0; k < 12; k++) { const v = m.monthly[`${y}-${String(k + 1).padStart(2, "0")}`]; h += `<td>${v == null ? `<div class="cell sn"></div>` : cell(rc(v), sgnf(v, 1) + "%")}</td>`; }
      const yr = m.curve[y] ? m.curve[y][y === m.cy ? m.today : 365] : null;
      h += `<td>${yr == null ? "" : `<div class="cell s0" style="font-weight:700">${sgnf(yr, 1)}%</div>`}</td></tr>`;
    });
    $("#mr").innerHTML = h + "</tbody></table>";
    $$("#mrmode button").forEach((b) => b.classList.toggle("on", b.dataset.k === st.mr));
  };

  $$("#slines .chip").forEach((b) => b.onclick = () => { const k = b.dataset.k; st.lines.has(k) ? st.lines.delete(k) : st.lines.add(k); b.classList.toggle("off"); draw(); });
  $$("#wrmode button").forEach((b) => b.onclick = () => { st.wr = b.dataset.k; wrTable(); });
  $$("#mrmode button").forEach((b) => b.onclick = () => { st.mr = b.dataset.k; mrTable(); });
  $("#btgo").onclick = () => { st.from = selIdx("f"); st.to = selIdx("t"); draw(); backtest(); };
  $("#btclr").onclick = () => { st.from = st.to = null; draw(); backtest(); };
  if (st.from == null) { const a = Math.min(m.today + 4, 364); syncSelDefault(a, Math.min(a + S.meta.season_horizon, 364)); } else syncSel();
  draw(); backtest(); wrTable(); mrTable();
}
function syncSelDefault(a, b) {
  [["f", a], ["t", b]].forEach(([p, i]) => { const dt = new Date(Date.UTC(2025, 0, 1) + i * 864e5); $(`#${p}m`).value = dt.getUTCMonth(); $(`#${p}d`).value = dt.getUTCDate(); });
}
function dateSel(p) {
  return `<select class="sel" id="${p}m">${MONTHS.map((x, i) => `<option value="${i}">${x}</option>`).join("")}</select><select class="sel" id="${p}d">${[...Array(31)].map((_, i) => `<option>${i + 1}</option>`).join("")}</select>`;
}

/* ====================================================================== COT page */
function renderCot() {
  const groups = [["Valute", S.meta.currencies.map((c) => ({ code: S.meta.cot_currency[c], label: `${flag(c)}${c}`, go: null }))],
    ["Indici", S.meta.groups.index.map((id) => ({ code: S.board.instruments[id].cot_code, label: esc(S.board.instruments[id].name), go: id }))],
    ["Materie prime", S.meta.groups.commodity.map((id) => ({ code: S.board.instruments[id].cot_code, label: esc(S.board.instruments[id].name), go: id }))]];
  let h = `<div class="hero"><div><h1>Posizionamento COT</h1><div class="sub">Commitments of Traders della CFTC: posizione netta degli speculatori</div></div><div class="chipd">Report settimanale, dati al martedì</div></div>`;
  groups.forEach(([title, list]) => {
    h += `<div class="card" style="margin-bottom:18px"><div class="card-h"><h2>${title}</h2><span class="hint">${title === "Materie prime" ? "managed money" : "asset manager + leveraged funds"}</span></div><div class="tbl-wrap"><table class="list"><thead><tr><th>Mercato</th><th>Contratto</th><th>Netto</th><th>1 sett.</th><th>4 sett.</th><th>Percentile 3 anni</th><th>Ultimo anno</th><th>Score</th></tr></thead><tbody>`;
    list.forEach((x) => {
      const c = x.code && S.cot[x.code];
      if (!c || !c.score) { h += `<tr><td><b>${x.label}</b></td><td class="muted" colspan="7">non disponibile</td></tr>`; return; }
      const s = c.score;
      h += `<tr ${x.go ? `style="cursor:pointer" onclick="location.hash='pair-${x.go}'"` : ""}><td><b>${x.label}</b></td><td class="muted">${esc(c.name)}</td><td class="num ${s.net >= 0 ? "up" : "dn"}">${kfmt(s.net)}</td><td class="num">${kfmt(s.chg_1w)}</td><td class="num">${kfmt(s.chg_4w)}</td><td><div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><div class="pct"><i style="width:${s.pctile}%"></i></div><span class="num" style="width:34px">${s.pctile}°</span></div></td><td style="width:150px">${sparkW(c.net_spec.slice(-52), 30)}</td><td>${dot(s.score)}</td></tr>`;
    });
    h += `</tbody></table></div></div>`;
  });
  $("#app").innerHTML = h;
}

/* ====================================================================== stato dati */
function renderStatus() {
  const M = S.meta, st = M.status || {};
  const byKey = {}; (st.macro || []).forEach((x) => byKey[x.cur + "|" + x.ind] = x);
  const okN = (st.macro || []).filter((x) => x.ok).length, tot = (st.macro || []).length;
  let h = `<div class="hero"><div><h1>Stato dati</h1><div class="sub">Quali serie sono arrivate all'ultimo aggiornamento e da quale fonte</div></div><div class="chipd">Aggiornato ${fmtDate(S.board.as_of)}</div></div>
  <div class="kpis"><div class="kpi"><div class="l">Serie macro attive</div><div class="v">${okN}<span class="muted" style="font-size:13px;font-weight:600">su ${tot}</span></div></div>
  <div class="kpi"><div class="l">Prezzi</div><div class="v">${Object.values(st.prices || {}).filter(Boolean).length}<span class="muted" style="font-size:13px;font-weight:600">su ${Object.keys(st.prices || {}).length}</span></div></div>
  <div class="kpi"><div class="l">Mercati COT</div><div class="v">${Object.values(st.cot || {}).filter(Boolean).length}<span class="muted" style="font-size:13px;font-weight:600">su ${Object.keys(st.cot || {}).length}</span></div></div>
  <div class="kpi"><div class="l">Non configurati</div><div class="v muted" style="font-size:14px;font-weight:600">mostrati come "·"</div></div></div>
  <div class="card"><div class="card-h"><h2>Dati macro per valuta</h2><span class="hint">verde = arrivato · rosso = errore · passa sopra per i dettagli</span></div><div class="tbl-wrap"><table class="t"><thead><tr><th class="l">Dato</th>${M.currencies.map((c) => `<th>${flag(c)}${c}</th>`).join("")}</tr></thead><tbody>`;
  M.indicators.forEach((m) => {
    h += `<tr style="cursor:default"><td class="name" style="font-size:12.5px">${esc(m.label)}</td>`;
    M.currencies.forEach((c) => {
      const x = byKey[c + "|" + m.id];
      if (!x) { h += `<td><div class="cell sn">·</div></td>`; return; }
      const tip = x.ok ? `${x.source} · ultimo ${x.last}` : `${x.source || ""}: ${x.error || ""}`;
      h += `<td title="${esc(tip)}"><div class="cell ${x.ok ? "s1" : "sm2"}" style="font-size:10.5px;padding:0 6px">${x.ok ? esc(x.last.slice(0, 7)) : "errore"}</div></td>`;
    });
    h += "</tr>";
  });
  h += `</tbody></table></div></div>`;
  const errs = (st.macro || []).filter((x) => !x.ok);
  if (errs.length) h += `<div class="card" style="margin-top:18px"><div class="card-h"><h2>Errori</h2></div><table class="mini-t"><thead><tr><th>Valuta</th><th>Dato</th><th>Fonte</th><th style="text-align:left">Motivo</th></tr></thead><tbody>${errs.map((x) => `<tr><td>${flag(x.cur)}${x.cur}</td><td style="text-align:left">${esc((M.indicators.find((m) => m.id === x.ind) || {}).label)}</td><td class="muted" style="text-align:left">${esc(x.source || "")}</td><td style="text-align:left;white-space:normal">${esc(x.error || "")}</td></tr>`).join("")}</tbody></table></div>`;
  const missP = Object.entries(st.prices || {}).filter(([, v]) => !v).map(([k]) => k), missC = Object.entries(st.cot || {}).filter(([, v]) => !v).map(([k]) => k);
  if (missP.length || missC.length) h += `<div class="card" style="margin-top:18px"><div class="card-h"><h2>Altri dati mancanti</h2></div>${missP.length ? `<p>Prezzi: ${missP.map(esc).join(", ")}</p>` : ""}${missC.length ? `<p>COT: ${missC.map(esc).join(", ")}</p>` : ""}</div>`;
  $("#app").innerHTML = h;
}

/* ====================================================================== metodo */
function renderMethod() {
  const M = S.meta;
  $("#app").innerHTML = `<div class="hero"><div><h1>Come funziona</h1><div class="sub">Regole del punteggio e fonti dei dati</div></div></div>
  <div class="card method">
    <h2 style="margin-top:0">Punteggio composito</h2>
    <p>Ogni coppia valutaria riceve un punteggio da −${M.max_fx} a +${M.max_fx}, dato dalla somma di tre componenti:</p>
    <ul>
      <li><b>Macro (±16)</b>: punteggio macro della valuta base meno quello della valuta quotata. Ogni valuta ha quattro aree (crescita, inflazione, tassi, lavoro) e ogni area vale da −2 a +2.</li>
      <li><b>COT (±4)</b>: momentum del posizionamento speculativo della base meno quello della quotata.</li>
      <li><b>Stagionalità (±2)</b>: comportamento della coppia nei prossimi ${M.season_horizon} giorni negli ultimi ${M.season_years} anni.</li>
    </ul>
    <p>Indici e materie prime usano solo COT e stagionalità, con un punteggio da −${M.max_other} a +${M.max_other}. L'etichetta di bias dipende dal rapporto tra punteggio e massimo: oltre il 35% è "molto rialzista", oltre il 12% "rialzista", e simmetricamente al ribasso.</p>
    <h2>Dati macro: confronto con il dato precedente</h2>
    <p>Ogni dato viene confrontato con la pubblicazione precedente. La variazione viene divisa per la variabilità tipica di quel dato (deviazione standard delle ultime 60 variazioni):</p>
    <ul><li>variazione piccola (meno di 0,25 volte la variabilità tipica): <code>0</code></li><li>variazione normale: <code>±1</code></li><li>variazione ampia (oltre 1 volta la variabilità tipica): <code>±2</code></li></ul>
    <p>Per disoccupazione e richieste di sussidi il segno è invertito: un aumento è negativo per la valuta. Un'inflazione più alta conta come positiva, perché spinge la banca centrale verso tassi più alti. Per il tasso di policy conta l'ultima mossa degli ultimi 6 mesi (±1, oppure ±2 se ci sono state almeno due mosse nella stessa direzione).</p>
    <p>Il punteggio di un'area è la media arrotondata dei dati disponibili, così le valute con meno dati pubblicati non sono penalizzate.</p>
    <h2>COT</h2>
    <p>Per valute e indici si usa il report <i>Traders in Financial Futures</i> (asset manager più leveraged funds), per le materie prime il report <i>Disaggregated</i> (managed money). Lo score guarda la variazione della posizione netta nelle ultime 4 settimane rispetto alla sua variabilità tipica: ±1 o ±2.</p>
    <h2>Stagionalità</h2>
    <p>Per ognuno degli ultimi ${M.season_years} anni si misura il rendimento dalla data di oggi ai ${M.season_horizon} giorni successivi. Se almeno il 70% degli anni è positivo e la media è positiva lo score è +2, con il 60% è +1, e simmetricamente al ribasso.</p>
    <h2>Fonti</h2>
    <ul><li>Prezzi: Yahoo Finance</li><li>COT: CFTC, Public Reporting Environment</li><li>Dati USA: FRED (Federal Reserve Bank of St. Louis)</li><li>Altre economie: OECD (CPI, disoccupazione, fiducia, PIL)</li><li>Tassi di policy: BIS</li></ul>
    <p class="muted">Il sito è a solo scopo informativo e non costituisce consulenza finanziaria.</p>
  </div>`;
}

load();
