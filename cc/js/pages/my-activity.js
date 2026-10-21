/* v16 phone — My Activity (sales reps). Results on the rep's own appointments:
 * Sold · Demo/No sale · No demo · Reset · Cancelled/TM CANX · No show.
 * Today and this-week tiles (Access first, MarketSharp small, amber ≠ when they differ), sold $, then a recent
 * results list as cards. Read-only. Scoped to ctx.rep (signed-in rep, or the rep Tom picked via "View as rep").
 * Data: window.SAMPLE_REP_APPTS[repId] only (js/data/rep-appts.js, rep ids u-mitch / u-dylan). Sample only.
 * Weeks: SampleReps.weekRange() = Infinity's Sun–Sat period to date; weekRange(-1) = last week (previous Sun–Sat). */
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CATS = [
    { id: "sold", label: "Sold", icon: "✓" },
    { id: "demo", label: "Demo / No sale", icon: "◐" },
    { id: "nodemo", label: "No demo", icon: "○" },
    { id: "reset", label: "Reset", icon: "↻" },
    { id: "cancel", label: "Cancelled / TM CANX", icon: "✕" },
    { id: "noshow", label: "No show", icon: "∅" }
  ];
  const CAT = {}; CATS.forEach((c) => { CAT[c.id] = c; });
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const ui = { period: null, filter: "all", limit: 20, rep: null };

  /* ——— result text → category (Access STATUS / MS AppointmentResult names) ——— */
  function cat(r) {
    const s = String(r || "").toLowerCase();
    if (!s) return null;
    if (/sold/.test(s) && !/no sale/.test(s)) return "sold";
    if (/demo no sale|no sale|demo\/no|dns/.test(s)) return "demo";
    if (/no demo|one.?leg|1.?leg|not demo/.test(s)) return "nodemo";
    if (/reset|resched/.test(s)) return "reset";
    if (/canx|cancel/.test(s)) return "cancel";
    if (/no show|noshow|nobody home/.test(s)) return "noshow";
    return null; /* Confirmed / Pending / Unconfirmed / Not Issued = no result yet */
  }

  /* ——— dates ——— */
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  /* the shared sample clock (same "today" as Today, My Leads and Calendar) */
  function today() {
    if (window.SampleReps && SampleReps.today) return SampleReps.today;
    try { if (window.DashboardData && DashboardData.clock) return DashboardData.clock().today; } catch (e) { /* fall through */ }
    return "2026-10-05";
  }
  const S = () => window.SampleReps;
  function range(period, t) {
    if (period === "today") return { from: t, to: t, label: "Today" };
    const o = period === "last" ? -1 : 0;
    if (S() && S().weekRange) return S().weekRange(o);
    const from = addDays(addDays(t, -new Date(t + "T12:00:00Z").getUTCDay()), 7 * o);
    return { from, to: o ? addDays(from, 6) : t, label: o ? "Last week (Sun–Sat)" : "This week (Sun–Sat)" };
  }
  function dayLabel(s, t) {
    if (s === t) return "Today";
    if (s === addDays(t, -1)) return "Yesterday";
    const d = new Date(s + "T12:00:00Z"); return DOW[d.getUTCDay()] + " " + (d.getUTCMonth() + 1) + "/" + d.getUTCDate();
  }
  function t12(hm) { if (!hm) return ""; let h = +hm.slice(0, 2); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + hm.slice(3, 5) + " " + ap; }
  const mdShort = (s) => DOW[new Date(s + "T12:00:00Z").getUTCDay()] + " " + (+s.slice(5, 7)) + "/" + (+s.slice(8, 10));
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");

  /* ——— who is the rep ——— */
  function repOf(ctx) {
    const r = ctx && ctx.rep;
    if (r && typeof r === "object") return { id: r.id || r.repId || "", name: r.name || r.repName || "" };
    if (typeof r === "string") {
      const u = ((S() && S().users) || []).find((x) => x.id === r || x.name === r);
      return { id: u ? u.id : r, name: u ? u.name : r };
    }
    const u = (ctx && ctx.user) || {};
    if (/rep/i.test(String(ctx && ctx.activeRole || "") + " " + String((u.roles || []).join(" ") || u.role || ""))) return { id: u.id || "", name: u.name || "" };
    return null;
  }
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");
  const sameRep = (a, rep) => norm(a) && (norm(a) === norm(rep.name) || norm(a) === norm(rep.id));

  /* ——— normalise one appointment from any sample shape ——— */
  function fromAny(a, rep) {
    const accR = a.accessResult || a.result || a.status || a.resultName;
    const c = cat(accR);
    if (!c) return null;
    const dt = String(a.apptDate || a.date || a.appointmentDate || "");
    const msR = a.msResult !== undefined ? a.msResult : a.marketsharpResult !== undefined ? a.marketsharpResult : accR;
    const name = a.customer || a.name || (a.lastName ? a.lastName + ", " + (a.firstName || "") : "Sample Homeowner");
    const prod = a.product || (Array.isArray(a.products) ? a.products.join(", ") : a.products) || a.division || "Product not listed";
    return { id: a.id || (rep.id + dt + name), date: dt.slice(0, 10), time: dt.length > 10 ? dt.slice(11, 16) : (a.time || ""), customer: name, city: a.city || "",
      product: prod, cat: c, accessResult: accR, msResult: msR, msCat: cat(msR), amount: Number(a.saleAmount || a.soldAmount || a.amount || a.contractAmount || 0) || null,
      amountSample: true, note: a.note || a.notes || a.resultReason || "" };
  }

  function load(rep, office) {
    const t = today();
    const R = window.SAMPLE_REP_APPTS || {};
    let list = R[rep.id];
    if (!Array.isArray(list)) { const k = Object.keys(R).find((key) => Array.isArray(R[key]) && R[key].some((a) => sameRep(a.rep || a.salesperson || a.repName, rep))); list = k ? R[k] : []; }
    let rows = list.filter((a) => !office || !a.office || a.office === office).map((a) => fromAny(a, rep)).filter(Boolean);
    rows.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    return { rows, today: t, source: "SAMPLE_REP_APPTS" };
  }

  function counts(rows) {
    const c = {}; CATS.forEach((k) => { c[k.id] = { acc: 0, ms: 0 }; });
    let sold$ = 0, soldN = 0;
    rows.forEach((r) => { c[r.cat].acc++; if (r.msCat) c[r.msCat].ms++; if (r.cat === "sold" && r.amount) { sold$ += r.amount; soldN++; } });
    return { c, sold$, soldN };
  }

  /* same sample freshness stamps as Today / My Leads / Calendar (SampleReps.synced, sample clock) */
  function freshness() {
    const sy = (S() && S().synced) || { access: "11:30 AM", ms: "11:45 AM", appointments: "11:45 AM" };
    try { if (window.IHIMobile && typeof IHIMobile.freshness === "function") { const o = IHIMobile.freshness({ access: sy.access, ms: sy.ms }, { now: S() && S().now }); if (typeof o === "string" && o) return o; } } catch (e) { /* local version below */ }
    const offline = navigator.onLine === false;
    return `${offline ? `<div class="mya-offline" role="status">Offline, showing data from ${esc(sy.ms)}</div>` : ""}
      <p class="mya-fresh"><span><b>Access</b> ${esc(sy.access)}</span> · <span><b>MS</b> ${esc(sy.ms)}</span> ET · <span class="mya-sample">Sample data</span></p>`;
  }

  function tile(k, v) {
    const diff = v.acc !== v.ms;
    return `<button type="button" class="mya-tile mya-t-${k.id} ${ui.filter === k.id ? "is-on" : ""}" data-mya-filter="${k.id}" aria-pressed="${ui.filter === k.id}"
        aria-label="${esc(k.label)}: Access ${v.acc}, MarketSharp ${v.ms}${diff ? ", doesn’t match" : ""}. Tap to show only these.">
      <span class="mya-tl"><span aria-hidden="true">${k.icon}</span> ${esc(k.label)}</span>
      <span class="mya-tv"><span class="mya-pill acc">ACCESS</span><b>${v.acc}</b></span>
      <span class="mya-tms"><span class="mya-pill ms">MS</span> ${v.ms}${diff ? ` <span class="mya-neq" title="Doesn’t match MarketSharp">≠</span>` : ""}</span>
    </button>`;
  }

  function card(r, t) {
    const k = CAT[r.cat];
    const diff = r.msCat !== r.cat;
    return `<li class="mya-card">
      <div class="mya-card-top"><span class="mya-when">${esc(dayLabel(r.date, t))}${r.time ? " · " + t12(r.time) : ""}</span>
        <span class="mya-chip mya-c-${r.cat}"><span aria-hidden="true">${k.icon}</span> ${esc(k.label)}</span></div>
      <p class="mya-cust"><strong>${esc(r.customer)}</strong>${r.city ? ` <span class="mya-city">${esc(r.city)}</span>` : ""}</p>
      <p class="mya-prod">${esc(r.product)}${r.cat === "sold" && r.amount ? ` · <span class="mya-num">${money(r.amount)}</span> <span class="mya-sample">sample</span>` : ""}</p>
      ${r.note ? `<p class="mya-note">${esc(r.note)}</p>` : ""}
      <p class="mya-src"><span class="mya-pill acc">ACCESS</span> ${esc(r.accessResult)}${diff ? ` <span class="mya-mm"><span class="mya-pill ms">MS</span> ${esc(r.msResult || "(blank)")} <span class="mya-neq-txt"><span aria-hidden="true">≠</span> Doesn’t match MarketSharp</span></span>` : ` <span class="mya-pill ms">MS</span> <span class="mya-ok">matches</span>`}</p>
    </li>`;
  }

  function render(el, ctx) {
    ctx = ctx || {};
    const rep = repOf(ctx);
    if (!rep || !rep.name) {
      el.innerHTML = `<section class="mya"><div class="card mya-empty"><strong>Pick a rep first</strong>Use “View as rep” to see a sales rep’s results.</div></section>`;
      return;
    }
    const key = norm(rep.id) + "|" + norm(rep.name);
    if (ui.rep !== key) { ui.rep = key; ui.filter = "all"; ui.limit = 20; ui.period = null; } /* new rep (View as rep) starts unfiltered */
    let office = ctx.office;
    if (!office) { try { office = localStorage.getItem("ihi-command-office"); } catch (e) { /* ignore */ } }
    const data = load(rep, office === "IL" ? "IL" : "MI"); /* MI/IL is a hard wall; Michigan by default */
    const t = data.today;
    const within = (p) => { const g = range(p, t); return (r) => r.date >= g.from && r.date <= g.to; };
    /* open on the first period that has results, so the sample Monday (results keyed tonight) isn't empty */
    if (!ui.period) ui.period = ["today", "week", "last"].find((p) => data.rows.some(within(p))) || "today";
    const rg = range(ui.period, t);
    const pr = data.rows.filter(within(ui.period));
    const cnt = counts(pr);
    const list = pr.filter((r) => ui.filter === "all" || r.cat === ui.filter);
    const shown = list.slice(0, ui.limit);
    const viewing = ctx.user && ctx.user.name && norm(ctx.user.name) !== norm(rep.name);
    el.innerHTML = `<section class="mya" aria-labelledby="mya-h">
      <header class="mya-head">
        <h2 id="mya-h">${viewing ? esc(rep.name) + "’s activity" : "My activity"}</h2>
        <p class="mya-sub">Results on ${viewing ? "their" : "your"} own appointments. Read-only.</p>
        ${freshness()}
      </header>
      <div class="mya-seg" role="group" aria-label="Period">
        <button type="button" data-mya-period="today" aria-pressed="${ui.period === "today"}">Today</button>
        <button type="button" data-mya-period="week" aria-pressed="${ui.period === "week"}">This week</button>
        <button type="button" data-mya-period="last" aria-pressed="${ui.period === "last"}">Last week</button>
      </div>
      <p class="mya-range">${ui.period === "today" ? "Today · " + esc(new Date(t + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "numeric", day: "numeric", timeZone: "UTC" })) : esc(rg.label) + " · " + esc(mdShort(rg.from)) + " to " + (ui.period === "week" ? "today" : esc(mdShort(rg.to))) + " (closed Sundays)"}</p>
      <div class="mya-tiles">
        ${tile(CATS[0], cnt.c.sold)}
        <div class="mya-tile mya-money" aria-label="Sold dollars, sample">
          <span class="mya-tl">Sold $</span>
          <span class="mya-tv"><b class="mya-num">${cnt.soldN ? money(cnt.sold$) : "—"}</b></span>
          <span class="mya-tms">${cnt.soldN ? `${cnt.soldN} sale${cnt.soldN === 1 ? "" : "s"} · sample $` : "No sale amounts"}</span>
        </div>
        ${CATS.slice(1).map((k) => tile(k, cnt.c[k.id])).join("")}
      </div>
      <p class="mya-fine">Access is the source of truth; MarketSharp is shown small underneath. An amber ≠ means MarketSharp doesn’t match yet. Sold $ is sample; real amounts depend on sale amounts reaching Access/MarketSharp. Results for today’s later appointments come in tonight.</p>
      <div class="mya-list-head">
        <h3>Recent results${ui.filter !== "all" ? ` · ${esc(CAT[ui.filter].label)}` : ""}</h3>
        ${ui.filter !== "all" ? `<button type="button" class="mya-link" data-mya-filter="all">Show all</button>` : ""}
      </div>
      ${shown.length ? `<ul class="mya-list">${shown.map((r) => card(r, t)).join("")}</ul>
        ${list.length > shown.length ? `<button type="button" class="mya-more" data-mya-more>Show ${Math.min(20, list.length - shown.length)} more</button>` : ""}`
        : `<div class="card mya-empty"><strong>No results ${ui.period === "today" ? "yet today" : ui.period === "week" ? "this week yet" : "last week"}</strong>${ui.period === "last" ? "Nothing last week for this filter." : "Results are keyed in after each appointment, usually tonight. Try “Last week”."}</div>`}
      <p class="mya-foot">Sample data. Nothing here changes Access or MarketSharp.</p>
    </section>`;
    const rr = () => render(el, ctx);
    el.querySelectorAll("[data-mya-period]").forEach((b) => b.addEventListener("click", () => { ui.period = b.getAttribute("data-mya-period"); ui.limit = 20; rr(); }));
    el.querySelectorAll("[data-mya-filter]").forEach((b) => b.addEventListener("click", () => { const f = b.getAttribute("data-mya-filter"); ui.filter = ui.filter === f ? "all" : f; ui.limit = 20; rr(); }));
    const more = el.querySelector("[data-mya-more]"); if (more) more.addEventListener("click", () => { ui.limit += 20; rr(); });
  }

  (window.IHIPages = window.IHIPages || { _q: [], register: function (r, d) { this._q.push([r, d]); } }).register("my-activity", {
    title: "My Activity", tab: "My Activity", icon: "✓", roles: ["Sales rep", "Manager"], phoneOnly: true,
    badge: function () { return 0; },
    render: render,
    _test: { load, counts, cat, repOf, range }
  });
})();
