/* Infinity Home Improvement Command Center — Marketer personal Home (sample data).
 * Layout inspired by a CRM dashboard card grid; Command Center styling only.
 * All numbers come from DashboardData (js/data/dashboard-data.js) → DashboardMetrics. Nothing hand-typed here.
 */
(function () {
  "use strict";
  const M = window.DashboardMetrics;
  const ui = {}; /* per-user UI state: { trend, preset, from, to } */
  let renderToken = 0;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tip = (text) => `<button type="button" class="helper-tip" title="${esc(text)}" aria-label="${esc(text)}">?</button>`;
  const src = (meta, extra) => `<div class="pd-source" title="${meta && meta.isSample ? "Sample numbers shaped like the live source — not live yet" : "Live"}">${esc(meta ? meta.label : "Sample")}${extra ? " · " + esc(extra) : ""}</div>`;
  const fmt = M.fmt;

  /* ——— Two sources: Michigan Access is PRIMARY, MarketSharp secondary (decided by Thomas, 2026-10-05) ——— */
  const RULE = "Access is the source of truth (Thomas, 2026-10-05); MarketSharp is shown for comparison.";
  const accTip = (sys) => sys + ": from Access’s TM Lead Activity (appointments where you are the setter, WHOSET). " + RULE;
  const msTip = "MarketSharp: Appt Set By / Telemarketer on the inquiry, Date Issued, contract status. Shown smaller because Access wins when they differ.";
  const accChip = (sys, short) => `<span class="pd-srcchip acc" title="${esc(accTip(sys))}">${esc(short ? "Access" : sys)}</span>`;
  const msChip = (short) => `<span class="pd-srcchip ms" title="${esc(msTip)}">${short ? "MS" : "MarketSharp"}</span>`;
  const fmtKind = (id) => (id === "netSalesAmt" ? "money" : "int");
  function mismatch(pair, sys, label, compact) {
    if (!pair || pair.match) return "";
    const k = fmtKind(pair.id);
    const d = pair.diff;
    const text = `${label || "This number"} doesn’t match. ${sys}: ${fmt(pair.access, k)} · MarketSharp: ${fmt(pair.ms, k)} · Difference: ${d > 0 ? "+" : "−"}${fmt(Math.abs(d), k)} (Access ${d > 0 ? "higher" : "lower"}). ${RULE}`;
    return compact
      ? `<span class="pd-mismatch sm" title="${esc(text)}" aria-label="${esc(text)}">≠</span>`
      : `<span class="pd-mismatch" title="${esc(text)}">Doesn’t match MarketSharp ${tip(text)}</span>`;
  }
  /* big Access value + small MarketSharp value (hero / tiles) */
  function dualStat(pair, sys, label, msFallback) {
    if (!pair) return `<div class="pd-stat"><span class="v">${fmt(msFallback, "int")}</span><span class="l">${esc(label)} ${msChip(true)}</span></div>`;
    const k = fmtKind(pair.id);
    return `<div class="pd-stat pd-dual-stat">
      <span class="v">${fmt(pair.access, k)}</span>
      <span class="l">${esc(label)}</span>
      <span class="pd-dual-ms ${pair.match ? "" : "off"}" title="${esc(msTip)}">MS ${fmt(pair.ms, k)}${mismatch(pair, sys, label, true)}</span>
    </div>`;
  }
  /* table cell: Access value, tiny MS value, ≠ marker */
  function dualCell(pair, sys, label, fmtName) {
    if (!pair || pair.access == null) return null;
    return `<span class="pd-dual-cell"><span class="a">${fmt(pair.access, fmtName)}</span><span class="m ${pair.match ? "" : "off"}" title="${esc(msTip)}">MS ${fmt(pair.ms, fmtName)}</span>${mismatch(pair, sys, label, true)}</span>`;
  }

  /* ——— SVG helpers ——— */
  function ring(value, opts) {
    const o = opts || {};
    const size = o.size || 96;
    const stroke = o.stroke || 8;
    const r = (size - stroke) / 2 - 1;
    const c = 2 * Math.PI * r;
    const has = value != null;
    const pct = has ? Math.max(0, Math.min(1, value)) : 0;
    const label = has ? fmt(value, "pct") : "—";
    return `
      <svg class="pd-ring ${has ? "" : "is-empty"}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc((o.aria || "") + " " + label)}">
        <circle class="pd-ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none" />
        ${has && pct > 0 ? `<circle class="pd-ring-fill ${o.tone ? "tone-" + o.tone : ""}" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"
          stroke-dasharray="${(pct * c).toFixed(2)} ${c.toFixed(2)}" stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})" />` : ""}
        <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" class="pd-ring-text" style="font-size:${Math.round(size * 0.2)}px">${label}</text>
      </svg>`;
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * pow >= v) return m * pow;
    return 10 * pow;
  }

  function lineChart(o) {
    const W = 640, H = 250, padL = 58, padR = 16, padT = 16, padB = 34;
    const n = o.labels.length;
    const all = [];
    o.series.forEach((s) => s.values.forEach((v) => { if (v != null) all.push(v); }));
    const max = niceMax(Math.max.apply(null, all.concat([1])));
    const x = (i) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
    const y = (v) => padT + (1 - v / max) * (H - padT - padB);
    let g = "";
    for (let k = 0; k <= 4; k++) {
      const v = (max * k) / 4;
      g += `<line class="pd-gridline" x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" />`;
      g += `<text class="pd-axis" x="${padL - 8}" y="${y(v)}" text-anchor="end" dominant-baseline="central">${fmt(v, "moneyK")}</text>`;
    }
    const step = Math.ceil(n / (o.maxLabels || 12));
    o.labels.forEach((lab, i) => {
      if (i % step === 0 || i === n - 1) g += `<text class="pd-axis" x="${x(i)}" y="${H - 10}" text-anchor="middle">${esc(lab)}</text>`;
    });
    const paths = o.series.map((s, si) => {
      let d = ""; let pen = false; let area = ""; let first = null; let last = null;
      s.values.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += (pen ? " L" : " M") + x(i).toFixed(1) + " " + y(v).toFixed(1);
        if (first == null) first = i;
        last = i;
        pen = true;
      });
      if (s.area && first != null) {
        area = `<path class="pd-area pd-area-${si + 1}" d="${d} L${x(last).toFixed(1)} ${y(0)} L${x(first).toFixed(1)} ${y(0)} Z" />`;
      }
      const dots = n <= 31 ? s.values.map((v, i) => v == null ? "" : `<circle class="pd-dot pd-dot-${si + 1}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${n > 14 ? 2.2 : 3.4}"><title>${esc(o.labels[i])}: ${fmt(v, "money")}</title></circle>`).join("") : "";
      return area + `<path class="pd-line pd-line-${si + 1}" d="${d}" />` + dots;
    }).join("");
    return `<svg class="pd-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || "Chart")}">${g}${paths}</svg>`;
  }

  function emptyState(title, body) {
    return `<div class="pd-empty"><strong>${esc(title)}</strong><span>${esc(body)}</span></div>`;
  }

  function cardHead(title, tipText, right) {
    return `<div class="pd-card-head"><h3>${esc(title)} ${tipText ? tip(tipText) : ""}</h3>${right || ""}</div>`;
  }

  /* ——— Cards ——— */
  /* "My texts today" — people texts on my leads (auto texts don't count). MarketSharp = credited to me;
   * Hatch = logged under Tom's login by Hatch's integration (flagged, not credited to anyone). */
  function textsLine(x, viewer) {
    if (!x) return "";
    const PL = window.PeopleLog || {};
    const b = (sys) => (PL.sysBadge ? PL.sysBadge(sys) : esc(sys));
    return `<div class="pd-texts">
      <span class="pd-texts-title">${viewer ? "Their" : "My"} texts today:</span>
      <span><b>${x.ms}</b> sent ${b("MarketSharp")}</span>
      <span><b>${x.hatch}</b> on ${viewer ? "their" : "my"} leads ${b("Hatch")} <span class="pd-texts-sub">via Tom’s login</span> ${tip(PL.HATCH_TIP || "Hatch texts are logged under Tom’s login, so they can’t be credited to a marketer yet.")}</span>
      <span><b>${x.opened}</b> of ${x.total} opened ${tip(PL.OPEN_TBD_TIP || "Hatch: open times TBD until API confirmed.")}</span>
      <button type="button" class="pd-texts-link" data-pd-goto="speed" data-pd-sub="log">Texts sent log →</button>
    </div>`;
  }

  function heroCard(data, user, viewer) {
    const t = data.todayStrip;
    const acc = data.access && !data.access.error ? data.access : null;
    const tp = acc ? acc.periods.today : {};
    const sys = acc ? acc.system : "Access";
    const office = data.office === "IL" ? "Illinois" : "Michigan";
    const offChip = data.schedule.workingToday ? "" :
      `<span class="pd-chip pd-chip-off" title="From the schedule — no phone work expected today">Off today (${esc(data.schedule.todayDow)})${user.scheduleNote ? " · " + esc(user.scheduleNote) : ""}</span>`;
    const actions = (((window.SampleData || {}).nextActionsByRole || {}).Setter || {})[data.office] || [];
    return `
      <section class="card pd-hero">
        <div class="pd-hero-id">
          <span class="avatar pd-avatar" aria-hidden="true">${esc(user.initials)}</span>
          <div>
            <h2>${viewer ? esc(user.name) + "’s Home" : "Hi " + esc(user.name.split(" ")[0]) + " — your numbers"}</h2>
            <p>${esc(user.roleLabel || user.role)} · ${office} · only appointments ${viewer ? "they" : "you"} set ${tip("Everything here counts appointments where " + (viewer ? "this marketer" : "you") + " are the ‘Appt Set By’ (or Telemarketer on the inquiry). Switch Michigan / Illinois at the top.")}</p>
          </div>
          ${offChip}
        </div>
        <div class="pd-today">
          <div class="pd-today-group">
            <div class="pd-today-title">${viewer ? "Phone work today" : "My phone work today"} ${tip("Calls, leads worked, and appointments booked so far today. Calls come from the Call Center Report and aren’t split by office.")}</div>
            <div class="pd-stats">
              <div class="pd-stat"><span class="v">${fmt(t.calls)}</span><span class="l">Calls ${msChip(true)}</span></div>
              ${dualStat(tp.inquiries, sys, "Leads taken", t.inquiries)}
              ${dualStat(tp.apptsSet, sys, "Appts set", t.apptsSet)}
            </div>
          </div>
          <div class="pd-today-group">
            <div class="pd-today-title">${viewer ? "Their" : "My"} appointments running today ${tip("Appointments set earlier that go out today. Confirms are done by the confirm team; results are keyed in tonight.")}</div>
            <div class="pd-stats">
              ${dualStat(tp.issued, sys, "Sent to a rep", t.issued)}
              ${dualStat(tp.confirmed, sys, "Confirmed today", t.confirmed)}
            </div>
          </div>
          ${actions.length ? `<div class="pd-today-group pd-next">
            <div class="pd-today-title">Do this next</div>
            ${actions.slice(0, 3).map((a) => `<button type="button" class="pd-next-btn tone-${esc(a.tone)}" data-pd-goto="${esc(a.view)}">${esc(a.label)} <span aria-hidden="true">→</span></button>`).join("")}
          </div>` : ""}
        </div>
        ${textsLine(data.myTexts, viewer)}
        <div class="pd-hero-foot">${acc ? `<span class="pd-legend">Big number = ${accChip(sys)} · small “MS” = ${msChip()} ${tip("Where both systems count the same thing, Access is shown first because it’s more accurate (Thomas, 2026-10-05). ≠ means they don’t match — hover it for both numbers.")}</span>` : src(data.todayStrip.meta)} <span class="pd-asof">Sample clock: Mon Oct 5, 2026 · 11:50 AM ET</span></div>
      </section>`;
  }

  function trendCard(data, st) {
    const mode = st.trend;
    const series = mode === "year" ? data.salesTrend.year : data.salesTrend.month;
    const total = mode === "year" ? series.reduce((a, b) => a + (b.value || 0), 0) : (series.length ? series[series.length - 1].value : 0);
    const toggle = `<div class="pd-seg" role="group" aria-label="Trend period">
        <button type="button" data-pd-trend="month" aria-pressed="${mode === "month"}">Month</button>
        <button type="button" data-pd-trend="year" aria-pressed="${mode === "year"}">Year</button>
      </div>`;
    const body = total > 0
      ? `<div class="pd-big">${fmt(total, "money")} <small>${mode === "year" ? "net sales this year" : "net sales, last 30 days"}</small></div>
         ${lineChart({ labels: series.map((s) => s.label), series: [{ values: series.map((s) => s.value), area: true }], aria: "My net sales trend", maxLabels: mode === "year" ? 12 : 6 })}
         <p class="pd-note">${mode === "year" ? "Each point = that month’s net sales. * = month so far." + (series.some((x) => x.value == null) ? " Gaps = before start date." : "") : "Running total by day for the last 30 days."}</p>`
      : emptyState("No Data", "No approved sales from your sets in this view yet.");
    return `<article class="card pd-card pd-span-4">
      ${cardHead("My Sales Trend", "Net sales dollars (Approved contracts) from appointments you set.", toggle)}
      ${body}
      ${src(data.salesTrend.meta)}
    </article>`;
  }

  function ringNote(item, kind) {
    if (item.den) return kind === "perf" ? `${item.num} of ${item.den} issued` : `${item.num} of ${item.den} demos`;
    if (item.key === "today" && kind === "perf" && item.issued) return "Results come in tonight";
    if (item.short && item.short.indexOf("Sun") === 0) return "No appointments Sunday";
    return kind === "perf" ? "Nothing issued" : "No demos yet";
  }

  function performanceCard(data) {
    const p = data.performance;
    return `<article class="card pd-card pd-span-4">
      ${cardHead("My Performance Ratios", p.def.tip + " (Issued → Presentation, also called the sit rate.)")}
      <div class="pd-ring-grid">
        ${p.items.map((it) => `<div class="pd-ring-cell">
          <div class="pd-ring-label">${esc(it.label)}<span>${esc(it.short)}</span></div>
          ${ring(it.value, { size: 96, aria: "Performance " + it.label })}
          <div class="pd-ring-note">${esc(ringNote(it, "perf"))}</div>
        </div>`).join("")}
      </div>
      ${src(p.meta)}
    </article>`;
  }

  function overviewCard(data) {
    const o = data.overview;
    const acc = data.access && !data.access.error ? data.access : null;
    return `<article class="card pd-card pd-span-4">
      ${cardHead("My Overview", null)}
      <div class="pd-sub-head">Sales from my sets ${acc ? accChip(acc.system, true) : ""} ${tip("Net sales dollars from appointments you set. Pending and canceled dollars are not included." + (acc ? " Big = " + acc.system + " (boarded, not kicked out); small MS = MarketSharp Approved contracts." : ""))}</div>
      <div class="pd-money-row">
        ${o.sales.map((s) => { const pr = acc ? acc.periods[s.key] && acc.periods[s.key].netSalesAmt : null; const v = pr ? pr.access : s.net; return `<div class="pd-money">
          <span class="l">${esc(s.label)}</span>
          <span class="v ${v > 0 ? "pos" : ""}" title="${fmt(v, "money")} net${pr ? " (" + esc(acc.system) + ")" : ""}">${fmt(v, "moneyShort")}</span>
          ${pr ? `<span class="pd-dual-ms ${pr.match ? "" : "off"}" title="${esc(msTip)}">MS ${fmt(pr.ms, "moneyShort")}${mismatch(pr, acc.system, "Net sales " + s.label, true)}</span>` : ""}
          ${s.pending ? `<span class="s" title="${fmt(s.pending, "money")} sold but contract still pending (MarketSharp)">+${fmt(s.pending, "moneyK")} pending</span>` : `<span class="s">&nbsp;</span>`}
        </div>`; }).join("")}
      </div>
      <div class="pd-sub-head">My Closing Ratios ${tip(o.closingDef.tip)}</div>
      <div class="pd-ring-row">
        ${o.closing.map((it) => `<div class="pd-ring-cell sm">
          <div class="pd-ring-label">${esc(it.label)}</div>
          ${ring(it.value, { size: 70, stroke: 7, aria: "Closing " + it.label, tone: "close" })}
          <div class="pd-ring-note">${esc(ringNote(it, "close"))}</div>
        </div>`).join("")}
      </div>
      ${acc ? src(acc.meta, "ratios: MarketSharp") : src(o.meta)}
    </article>`;
  }

  function opTable(rows, firstHead, acc) {
    return `<table class="pd-op-table">
      <thead><tr><th scope="col">${esc(firstHead)}</th><th scope="col">Date Range</th><th scope="col">Last Year</th></tr></thead>
      <tbody>
        ${rows.map((r) => `<tr class="${r.na ? "is-na" : ""}">
          <th scope="row">${esc(r.label)}${r.marketerExtra ? ' <span class="pd-tag">Marketer</span>' : ""} ${tip(r.na ? "Not tracked per marketer. " + r.tip : r.tip)}</th>
          <td>${(acc && acc.range[r.id] && !r.na && dualCell(acc.range[r.id], acc.system, r.label, r.fmt)) || fmt(r.cur, r.fmt)}</td>
          <td class="pd-ly">${(acc && acc.ly[r.id] && !r.na && r.ly != null && dualCell(acc.ly[r.id], acc.system, r.label + " (last year)", r.fmt)) || fmt(r.ly, r.fmt)}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;
  }

  function operatingCard(data, st, user) {
    const op = data.operating;
    const acc = data.access && !data.access.error ? data.access : null;
    const presets = [["last30", "Last 30 days"], ["mtd", "This month"], ["lastmonth", "Last month"], ["ytd", "Year to date"], ["custom", "Custom dates"]];
    const right = `<div class="pd-range">
        <label class="sr-only" for="pd-preset">Date range</label>
        <select id="pd-preset" class="select pd-select">${presets.map(([v, l]) => `<option value="${v}" ${st.preset === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <label class="sr-only" for="pd-from">From</label>
        <input type="date" id="pd-from" class="input pd-date" value="${op.range.from}" max="${data.today}" />
        <span aria-hidden="true">|</span>
        <label class="sr-only" for="pd-to">To</label>
        <input type="date" id="pd-to" class="input pd-date" value="${op.range.to}" max="${data.today}" />
      </div>`;
    return `<article class="card pd-card pd-span-8">
      ${cardHead("My Operating Statement", "Your funnel for the dates picked, next to the same dates last year. Each row has a ? that says exactly what is counted.", right)}
      <p class="pd-note pd-range-note">${esc(op.rangeDisplay)} &nbsp;vs&nbsp; last year ${esc(op.lyDisplay)}${op.startedAfterLy ? ` · <strong>${esc(user.name.split(" ")[0])} wasn’t on the team last year</strong> — Last Year shows —` : ""}</p>
      <div class="pd-op-grid">
        ${opTable(op.left, "Totals", acc)}
        ${opTable(op.right, "Ratios", null)}
      </div>
      ${acc ? `<p class="pd-note">Rows with a small “MS” number: big = ${accChip(acc.system, true)} (source of truth), small = ${msChip(true)}. Ratios and the other rows are MarketSharp.</p>` : ""}
      ${src(op.meta, "calls: " + op.callsMeta.detail + " · leads: " + op.inqMeta.detail)}
    </article>`;
  }

  function accessCard(data) {
    const acc = data.access;
    if (!acc) return "";
    if (acc.error) return `<article class="card pd-card pd-span-12">${cardHead("My numbers by system", null)}${emptyState("Access not connected", "Showing MarketSharp only. " + acc.error)}</article>`;
    const op = data.operating;
    const tiles = acc.metrics.map((id) => {
      const p = acc.range[id];
      const k = fmtKind(id);
      return `<div class="pd-sys-tile ${p.match ? "" : "is-off"}">
        <div class="pd-sys-label">${esc(acc.labels[id])}</div>
        <div class="pd-sys-main"><span class="v">${fmt(p.access, k)}</span>${accChip(acc.system)}</div>
        <div class="pd-sys-ms">${msChip()} <span>${fmt(p.ms, k)}</span></div>
        ${p.match ? `<div class="pd-sys-ok">Matches</div>` : mismatch(p, acc.system, acc.labels[id], false)}
      </div>`;
    }).join("");
    const only = Object.keys(acc.onlyAccess).map((k) => {
      const o = acc.onlyAccess[k];
      return `<div class="pd-sys-tile only">
        <div class="pd-sys-label">${esc(o.label)} ${tip(o.tip)}</div>
        <div class="pd-sys-main"><span class="v">${o.value == null ? "—" : fmt(o.value, o.fmt || "int")}</span>${accChip(acc.system)}</div>
        <div class="pd-sys-ms pd-faint">Access only</div>
      </div>`;
    }).join("");
    return `<article class="card pd-card pd-span-12">
      ${cardHead("My numbers by system", "The same measures from both systems for the dates on your Operating Statement. " + RULE + " Amber = they don’t match; hover for both numbers.",
        acc.mismatches ? `<span class="pd-mismatch">${acc.mismatches} don’t match</span>` : `<span class="pd-sys-ok">All match</span>`)}
      <p class="pd-note pd-range-note">${esc(op.rangeDisplay)} · big = ${accChip(acc.system)} (source of truth) · small = ${msChip()}</p>
      <div class="pd-sys-grid">${tiles}${only}</div>
      ${src(acc.meta, "compared with " + (op.meta ? op.meta.label : "MarketSharp"))}
    </article>`;
  }

  function comparisonCard(data) {
    const c = data.netComparison;
    const hasLast = c.lastYear.some((v) => v != null);
    const sumThis = c.thisYear.reduce((a, b) => a + (b || 0), 0);
    const sumLast = c.lastYear.reduce((a, b) => a + (b || 0), 0);
    return `<article class="card pd-card pd-span-4">
      ${cardHead("My Net Sales Comparison", "Net sales dollars by month from your sets: the last 12 months vs the same months a year earlier. * = month so far.")}
      <div class="pd-cmp-sum">
        <div><span class="l">Last 12 months</span><span class="v">${fmt(sumThis, "moneyShort")}</span></div>
        <div><span class="l">Year before</span><span class="v muted">${hasLast ? fmt(sumLast, "moneyShort") : "—"}</span></div>
        ${hasLast && sumLast ? `<div><span class="l">Change</span><span class="v ${sumThis >= sumLast ? "up" : "down"}">${sumThis >= sumLast ? "▲" : "▼"} ${fmt(Math.abs(sumThis - sumLast) / sumLast, "pct")}</span></div>` : ""}
      </div>
      <div class="pd-legend">
        <span><i class="pd-key pd-key-1"></i>${esc(c.thisLabel)}</span>
        <span><i class="pd-key pd-key-2"></i>${esc(c.lastLabel)}${hasLast ? "" : " (no data)"}</span>
      </div>
      ${lineChart({ labels: c.labels, series: [{ values: c.thisYear }, { values: c.lastYear }], aria: "Net sales this year vs last year" })}
      ${src(c.meta)}
    </article>`;
  }

  function leadSourceCard(data) {
    const items = data.leadSources.items;
    const top = items.slice(0, 10);
    const max = Math.max.apply(null, top.map((i) => i.sets).concat([1]));
    const body = top.length ? `<div class="pd-bars">
        ${top.map((i) => `<div class="pd-bar-row" title="${esc(i.source)}: ${i.sets} set from ${i.inquiries} leads worked">
          <span class="pd-bar-label">${esc(i.source)}</span>
          <span class="pd-bar-track"><span class="pd-bar-fill" style="width:${((i.sets / max) * 100).toFixed(1)}%"></span></span>
          <span class="pd-bar-val">${i.sets}<small>/${i.inquiries}</small></span>
        </div>`).join("")}
      </div>
      ${items.length > top.length ? `<p class="pd-note">+ ${items.length - top.length} smaller sources</p>` : ""}
      <p class="pd-note">Bar = appointments you set · small number = leads you worked from that source.</p>`
      : emptyState("No Data", "No leads worked in this date range.");
    return `<article class="card pd-card pd-span-6">
      ${cardHead("My Lead Sources", "Where your appointments came from, for the same dates as your Operating Statement.")}
      ${body}
      ${src(data.leadSources.meta, "Inquiry Lead Source")}
    </article>`;
  }

  function standingCard(data, viewer) {
    const s = data.standing;
    const who = viewer ? "This marketer" : "You";
    return `<article class="card pd-card pd-span-6">
      ${cardHead("Where I stand", "Your ratios next to the team average (all " + s.teamSize + " marketers pooled), same dates as your Operating Statement. No one else’s names or dollars are shown.")}
      <div class="pd-compare">
        ${s.items.map((it) => {
          const scale = Math.max(it.me || 0, it.team || 0, 0.01) * 1.15;
          const diff = it.me != null && it.team != null ? (it.me - it.team) * 100 : null;
          const tone = diff == null ? "" : diff >= 1 ? "up" : diff <= -1 ? "down" : "even";
          const verdict = diff == null ? "Not enough data yet" : tone === "up" ? `${diff.toFixed(1)} pts above team` : tone === "down" ? `${Math.abs(diff).toFixed(1)} pts below team` : "Right at team average";
          return `<div class="pd-compare-item">
            <div class="pd-compare-head"><strong>${esc(it.label)}</strong> ${tip(it.tip)} <span class="pd-verdict ${tone}">${esc(verdict)}</span></div>
            <div class="pd-compare-bar"><span class="who">${who}</span><span class="pd-bar-track"><span class="pd-bar-fill" style="width:${(((it.me || 0) / scale) * 100).toFixed(1)}%"></span></span><span class="val">${fmt(it.me, "pct1")}</span></div>
            <div class="pd-compare-bar team"><span class="who">Team avg</span><span class="pd-bar-track"><span class="pd-bar-fill" style="width:${(((it.team || 0) / scale) * 100).toFixed(1)}%"></span></span><span class="val">${fmt(it.team, "pct1")}</span></div>
          </div>`;
        }).join("")}
      </div>
      ${src(s.meta)}
    </article>`;
  }

  function goalCard(data) {
    return `<article class="card pd-card pd-span-4">
      ${cardHead("My Sales Goal", "A monthly goal (appointments set or net sales $) your manager sets for you.")}
      ${emptyState("No Data", "No goal set yet for this month. Ask your manager to add one — it will show progress here.")}
      ${src(data.goal.meta)}
    </article>`;
  }

  function presetRange(preset, today) {
    const y = today.slice(0, 4);
    const add = window.DashboardData.addDays;
    if (preset === "mtd") return { from: today.slice(0, 8) + "01", to: today };
    if (preset === "ytd") return { from: y + "-01-01", to: today };
    if (preset === "lastmonth") {
      const firstThis = today.slice(0, 8) + "01";
      const lastPrev = add(firstThis, -1);
      return { from: lastPrev.slice(0, 8) + "01", to: lastPrev };
    }
    return { from: add(today, -29), to: today };
  }

  async function render(root, ctx) {
    const user = ctx.user;
    const today = window.DashboardData.clock().today;
    if (!ui[user.id]) ui[user.id] = Object.assign({ trend: "month", preset: "last30" }, presetRange("last30", today));
    const st = ui[user.id];
    const token = ++renderToken;
    if (!root.querySelector(".pd-grid")) root.innerHTML = `<div class="pd-loading card card-pad">Loading ${esc(user.name)}’s numbers…</div>`;

    let data;
    let acts = null;
    try {
      const both = await Promise.all([
        window.DashboardData.getMarketerDashboard(user.id, { from: st.from, to: st.to, office: ctx.office }),
        window.DashboardData.getActivities ? window.DashboardData.getActivities(user.id, { status: "open", office: ctx.office }) : Promise.resolve(null),
        window.DashboardData.getMyTextsToday ? window.DashboardData.getMyTextsToday(user.id, ctx.office).catch(() => null) : Promise.resolve(null)
      ]);
      data = both[0];
      acts = both[1];
      data.myTexts = both[2];
    } catch (err) {
      root.innerHTML = `<div class="empty-state card card-pad"><strong>Couldn’t load numbers</strong>${esc(err && err.message)}</div>`;
      return;
    }
    if (token !== renderToken) return; /* a newer render started */

    const viewer = ctx.viewer || null;
    const viewBar = viewer ? `<div class="pd-viewas card">
        <span>Viewing as <strong>${esc(user.name)}</strong> (what they see when they sign in)</span>
        <label class="sr-only" for="pd-viewas-pick">Switch marketer</label>
        <select id="pd-viewas-pick" class="select pd-select">${(ctx.marketers || []).map((m) => `<option value="${esc(m.id)}" ${m.id === user.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select>
        <button type="button" class="btn btn-ghost btn-sm" id="pd-viewas-back">← Back to manager Home</button>
      </div>` : "";

    root.innerHTML = `
      ${viewBar}
      ${heroCard(data, user, viewer)}
      <div class="pd-grid">
        ${acts && window.ActivityView ? window.ActivityView.homeCard(acts, { viewer }) : ""}
        ${goalCard(data)}
        ${accessCard(data)}
        ${trendCard(data, st)}
        ${performanceCard(data)}
        ${overviewCard(data)}
        ${operatingCard(data, st, user)}
        ${comparisonCard(data)}
        ${leadSourceCard(data)}
        ${standingCard(data, viewer)}
      </div>
      <p class="pd-footnote">Sample data shaped like MarketSharp records (Appt Set By, Date Issued, results, contract status) and ${esc(data.access && data.access.system ? data.access.system : "Access")} (TM Lead Activity by setter) — not live. Where both systems count the same thing, Access is shown first (Thomas, 2026-10-05). Charts, rings and ratios are computed from the MarketSharp sample rows.</p>
    `;

    const rerender = () => render(root, ctx);
    root.querySelectorAll("[data-pd-trend]").forEach((b) => b.addEventListener("click", () => { st.trend = b.getAttribute("data-pd-trend"); rerender(); }));
    const preset = root.querySelector("#pd-preset");
    if (preset) preset.addEventListener("change", () => {
      st.preset = preset.value;
      if (st.preset !== "custom") Object.assign(st, presetRange(st.preset, today));
      rerender();
    });
    const from = root.querySelector("#pd-from");
    const to = root.querySelector("#pd-to");
    const onDate = () => {
      if (!from.value || !to.value) return;
      st.preset = "custom";
      st.from = from.value <= to.value ? from.value : to.value;
      st.to = from.value <= to.value ? to.value : from.value;
      rerender();
    };
    if (from) from.addEventListener("change", onDate);
    if (to) to.addEventListener("change", onDate);
    root.querySelectorAll("[data-pd-goto]").forEach((b) => b.addEventListener("click", () => {
      const sub = b.getAttribute("data-pd-sub");
      if (ctx.onNavigate) ctx.onNavigate(b.getAttribute("data-pd-goto"), sub ? { stlId: sub } : undefined);
    }));
    const back = root.querySelector("#pd-viewas-back");
    if (back && ctx.onBack) back.addEventListener("click", ctx.onBack);
    if (window.ActivityView) window.ActivityView.bindHomeCard(root, ctx);
    const pick = root.querySelector("#pd-viewas-pick");
    if (pick && ctx.onPick) pick.addEventListener("change", () => ctx.onPick(pick.value));
  }

  window.PersonalDashboard = { render };
})();
