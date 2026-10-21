/* Jobs Board — GENERIC template (engine + UI). Tenant specifics come from a tenant file calling JobsBoardConfig.define().
   Tracks active and historical jobs: stage, projected/actual start, projected finish, crew, salesman/estimator, setter,
   costs, margin, alerts/down-status. Sample data only; "Sync CRM Jobs" is a simulation; nothing leaves the browser.
   State: localStorage "jobs-board-v1" = { jobs: { id: job }, seeded: true, syncs: n } */
(function () {
  var TEMPLATE = {
    tenant: "template", crmName: "CRM",
    stages: [
      { id: "pending", label: "Pending Finance/Contract", icon: "⏳" },
      { id: "scheduled", label: "Scheduled/Ready to Start", icon: "📅" },
      { id: "progress", label: "In Progress (On-Site)", icon: "🔨" },
      { id: "inspection", label: "Inspection/Punch List", icon: "🔍" },
      { id: "completed", label: "Completed", icon: "✓" },
      { id: "hold", label: "On Hold", icon: "⏸" }
    ],
    dateFilters: [["all", "All (incl. historical)"], ["last30", "Last 30 Days"], ["next7", "Next 7 Days"], ["month", "This Month"], ["custom", "Custom"]],
    trades: [], salesmen: [], setters: [], crews: [], cities: [], sampleJobs: 0, marginTarget: 0.35,
    /* Access-style hub (js/jobs/jobs-access.js) */
    companyName: "", items: ["Other"], itemOf: null, tasks: ["Permit Pulled"], customerTypes: ["Retail", "Warranty", "Service"],
    serviceTypes: ["Warranty", "Cash", "Credit"], serviceStatuses: ["OPEN", "SCHEDULED", "IN PROGRESS", "CLOSED"], techs: [], vendors: [],
    times: ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM"]
  };
  var cfg = TEMPLATE;
  window.JobsBoardConfig = { template: TEMPLATE, define: function (c) { cfg = Object.assign({}, TEMPLATE, c); return cfg; }, get: function () { return cfg; } };

  var KEY = "jobs-board-v1";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function todayISO() { var n = new Date(); return n.getFullYear() + "-" + pad(n.getMonth() + 1) + "-" + pad(n.getDate()); }
  function addDays(s, n) { var d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function fmt(s) { if (!s) return ""; var p = s.split("-"); return +p[1] + "/" + +p[2] + "/" + p[0]; }
  function money(n) { return "$" + Math.round(n || 0).toLocaleString("en-US"); }
  function rng(seed) { var x = seed >>> 0 || 7; return function () { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  var mem = null;
  function load() { if (mem) return mem; try { mem = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} mem = mem || { jobs: {} }; if (!mem.seeded) seed(mem); return mem; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function makeJob(r, i, t) {
    var C = cfg, st = pick(r, ["pending", "scheduled", "scheduled", "progress", "progress", "inspection", "completed", "completed", "completed", "hold"]);
    var off = { pending: 10 + r() * 30, scheduled: 1 + r() * 20, progress: -(1 + r() * 6), inspection: -(5 + r() * 10), completed: -(12 + r() * 300), hold: 5 + r() * 40 }[st];
    var ps = addDays(t, Math.round(off)), dur = 1 + Math.floor(r() * 5), city = pick(r, C.cities), trade = pick(r, C.trades);
    var sale = Math.round((4000 + r() * 26000) / 50) * 50, cost = Math.round(sale * (0.48 + r() * 0.22));
    var as = (st === "progress" || st === "inspection" || st === "completed") ? addDays(ps, Math.round(r() * 2)) : "";
    var crew = st === "pending" || (st === "hold" && r() < 0.5) || (st === "scheduled" && r() < 0.2) ? "" : pick(r, C.crews);
    var last = String.fromCharCode(65 + Math.floor(r() * 26));
    return { id: "J-" + (26000 + i * 7 + Math.floor(r() * 6)), customer: "Sample Homeowner " + last + (i % 3 ? "" : "2"), phone: "555-01" + pad(10 + (i * 13) % 90),
      city: city[0], zip: city[1], trade: trade, scope: trade + " · " + pick(r, ["full replacement", "partial", "repair + upgrade", "new install"]),
      salesman: pick(r, C.salesmen), setter: pick(r, C.setters), crew: crew, stage: st, projStart: ps, actualStart: as, projFinish: addDays(as || ps, dur),
      sale: sale, cost: cost, alert: st === "hold" ? pick(r, ["Waiting on financing", "Material back-ordered", "Customer requested delay"]) : (r() < 0.08 ? "Weather delay" : ""),
      crmId: "MS-" + Math.floor(100000 + r() * 899999), sample: true };
  }
  function seed(m) { var r = rng(20261021), t = todayISO(); for (var i = 0; i < (cfg.sampleJobs || 0); i++) { var j = makeJob(r, i, t); m.jobs[j.id] = j; } m.seeded = true; m.syncs = 0; mem = m; save(); }
  function all() { var J = load().jobs; return Object.keys(J).map(function (k) { return J[k]; }); }
  function stage(id) { return cfg.stages.filter(function (s) { return s.id === id; })[0] || { label: id, icon: "" }; }
  function crewStatus(j) { if (!j.crew) return ["Needs crew", "warn"]; if (j.stage === "progress") return ["On site", "ok"]; if (j.stage === "completed") return ["Done", "muted"]; if (j.stage === "hold") return ["Paused", "bad"]; return ["Assigned", "info"]; }

  var ui = { stage: "all", q: "", date: "all", from: "", to: "", trade: "", sales: "", crew: "", open: {} };
  function dateOk(j) {
    var t = todayISO(), d = j.actualStart || j.projStart, f = j.projFinish;
    if (ui.date === "all") return true;
    if (ui.date === "last30") return d >= addDays(t, -30) && d <= t || (f >= addDays(t, -30) && f <= t);
    if (ui.date === "next7") return d >= t && d <= addDays(t, 7);
    if (ui.date === "month") return d.slice(0, 7) === t.slice(0, 7) || f.slice(0, 7) === t.slice(0, 7);
    if (ui.date === "custom") return (!ui.from || f >= ui.from) && (!ui.to || d <= ui.to);
    return true;
  }
  function filtered(ignoreStage) {
    var q = ui.q.trim().toLowerCase();
    return all().filter(function (j) {
      if (!ignoreStage && ui.stage !== "all" && j.stage !== ui.stage) return false;
      if (q && [j.customer, j.id, j.phone, j.city, j.zip, j.crew || "unassigned"].join(" ").toLowerCase().indexOf(q) < 0) return false;
      if (ui.trade && j.trade !== ui.trade) return false;
      if (ui.sales && j.salesman !== ui.sales) return false;
      if (ui.crew && (ui.crew === "__none" ? j.crew : j.crew !== ui.crew)) return false;
      return dateOk(j);
    }).sort(function (a, b) { return (b.projStart > a.projStart) - (b.projStart < a.projStart); });
  }
  function initials(n) { return n.replace("Sample Homeowner ", "SH").slice(0, 3); }
  function opts(list, sel, any) { return (any != null ? '<option value="">' + esc(any) + "</option>" : "") + list.map(function (x) { var v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (v === sel ? " selected" : "") + ">" + esc(l) + "</option>"; }).join(""); }
  function schedCell(j) {
    var t = todayISO(), s = stage(j.stage), when = j.stage === "completed" ? "Finished " + fmt(j.projFinish) : j.stage === "progress" ? "On site · day " + (Math.max(0, Math.round((new Date(t) - new Date(j.actualStart || j.projStart)) / 864e5)) + 1) : j.stage === "hold" ? "Paused" : (j.projStart < t ? "Overdue start " : "Starts ") + fmt(j.projStart);
    return '<span class="jb-sched jb-st-' + j.stage + '" title="' + esc(s.label) + '">' + s.icon + " " + esc(when) + "</span>" + (j.alert ? '<span class="jb-alert">⚠ ' + esc(j.alert) + "</span>" : "");
  }
  function row(j) {
    var cs = crewStatus(j), open = !!ui.open[j.id], margin = j.sale - j.cost, pct = j.sale ? margin / j.sale : 0;
    var main = '<tr class="jb-row' + (open ? " open" : "") + '" data-job="' + esc(j.id) + '">' +
      '<td><div class="jb-cust"><span class="jb-av" aria-hidden="true">' + esc(initials(j.customer)) + '</span><div><button type="button" class="jb-open" data-jx-open="' + esc(j.id) + '">' + esc(j.customer) + '</button><div class="jb-sub">' + esc(j.id) + " · " + esc(j.phone) + " · " + esc(j.city) + '</div><a href="#" class="jb-crm" data-jb-crm="' + esc(j.crmId) + '">' + esc(cfg.crmName) + " LINK ↗</a></div></div></td>" +
      "<td><strong>" + esc(j.trade) + '</strong><div class="jb-sub">' + esc(j.scope) + "</div></td>" +
      "<td>" + esc(j.salesman) + '<div class="jb-sub">Set by ' + esc(j.setter) + "</div></td>" +
      '<td><span aria-hidden="true">🚚</span> ' + esc(j.crew || "Unassigned") + ' <span class="jb-badge ' + cs[1] + '">' + cs[0] + "</span></td>" +
      "<td>" + schedCell(j) + "</td><td>" + fmt(j.projStart) + "</td><td>" + (j.actualStart ? fmt(j.actualStart) : '<span class="jb-muted">Not started</span>') + "</td><td>" + fmt(j.projFinish) + "</td>" +
      '<td><button type="button" class="jb-chev" data-jb-toggle="' + esc(j.id) + '" aria-expanded="' + open + '" aria-label="Details for ' + esc(j.id) + '">' + (open ? "▴" : "▾") + "</button></td></tr>";
    if (!open) return main;
    return main + '<tr class="jb-detail" data-detail="' + esc(j.id) + '"><td colspan="9"><div class="jb-detail-grid">' +
      '<div><span class="jb-k">Sale value</span><strong>' + money(j.sale) + '</strong></div><div><span class="jb-k">Job / est. costs</span><strong>' + money(j.cost) + '</strong></div>' +
      '<div><span class="jb-k">Projected margin</span><strong class="' + (pct < cfg.marginTarget ? "jb-low" : "jb-good") + '">' + money(margin) + " (" + Math.round(pct * 100) + "%)</strong></div>" +
      '<label>Stage<select class="select" data-jb-stage="' + esc(j.id) + '">' + opts(cfg.stages.map(function (s) { return [s.id, s.label]; }), j.stage) + "</select></label>" +
      '<label>Crew<select class="select" data-jb-crew="' + esc(j.id) + '">' + opts([["", "Unassigned"]].concat(cfg.crews), j.crew) + "</select></label>" +
      (j.alert ? '<div class="jb-alert">⚠ ' + esc(j.alert) + "</div>" : "") + "</div></td></tr>";
  }
  function render(root) {
    root = root || ui.root; ui.root = root; if (!root) return;
    if (window.JobsAccess && JobsAccess.route(root)) return;
    var base = filtered(true), list = base.filter(function (j) { return ui.stage === "all" || j.stage === ui.stage; });
    var sale = list.reduce(function (s, j) { return s + j.sale; }, 0), cost = list.reduce(function (s, j) { return s + j.cost; }, 0);
    var tabs = [{ id: "all", label: "All Jobs" }].concat(cfg.stages);
    root.innerHTML = (window.JobsAccess ? JobsAccess.menu() : "") + '<section class="jb">' +
      '<div class="jb-head"><div><h2 class="jb-title">Jobs Board</h2><p class="jb-subtitle">Track active &amp; historical jobs: projected start, actual start, projected finish, assigned crew, salesman/estimator, job costs, alerts/down-status.</p></div>' +
      '<div class="jb-actions">' + (window.JobsAccess ? '<button type="button" class="btn btn-secondary" data-jx-view="search">▦ Search grid</button>' : "") + '<button type="button" class="btn btn-secondary" data-jb-sync>⟳ Sync CRM Jobs</button><button type="button" class="btn btn-primary" data-jb-add>+ Add Job to Board</button></div></div>' +
      '<div class="jb-kpis">' +
      '<div class="card jb-kpi" data-kpi="sold"><span class="jb-k">Total Sold/Sales Value</span><strong>' + money(sale) + '</strong><span class="jb-sub">' + list.length + " job" + (list.length === 1 ? "" : "s") + "</span></div>" +
      '<div class="card jb-kpi" data-kpi="cost"><span class="jb-k">Tracked Job/Est. Costs</span><strong>' + money(cost) + '</strong><span class="jb-sub">materials + labor (sample)</span></div>' +
      '<div class="card jb-kpi" data-kpi="margin"><span class="jb-k">Projected Margin $</span><strong>' + money(sale - cost) + '</strong><span class="jb-sub">' + (sale ? Math.round((sale - cost) / sale * 100) : 0) + "% of sales</span></div></div>" +
      '<div class="jb-tabs" role="tablist">' + tabs.map(function (t) { var n = t.id === "all" ? base.length : base.filter(function (j) { return j.stage === t.id; }).length; return '<button type="button" role="tab" class="jb-tab" data-jb-tab="' + t.id + '" aria-selected="' + (ui.stage === t.id) + '">' + esc(t.label) + ' <span class="jb-count">' + n + "</span></button>"; }).join("") + "</div>" +
      '<div class="jb-filters">' +
      '<input class="input jb-search" id="jb-q" type="search" placeholder="Search customer, job ID, phone, city, zip, crew" value="' + esc(ui.q) + '" aria-label="Search jobs">' +
      '<select class="select" id="jb-date" aria-label="Date">' + opts(cfg.dateFilters, ui.date) + "</select>" +
      (ui.date === "custom" ? '<input class="input" type="date" id="jb-from" value="' + ui.from + '" aria-label="From"><input class="input" type="date" id="jb-to" value="' + ui.to + '" aria-label="To">' : "") +
      '<select class="select" id="jb-trade" aria-label="Trade">' + opts(cfg.trades, ui.trade, "All trades") + "</select>" +
      '<select class="select" id="jb-sales" aria-label="Salesman">' + opts(cfg.salesmen, ui.sales, "All salesmen") + "</select>" +
      '<select class="select" id="jb-crew" aria-label="Crew/Installer">' + opts([["__none", "Unassigned"]].concat(cfg.crews), ui.crew, "All crews") + "</select>" +
      '<a href="#" class="jb-reset" data-jb-reset>Reset Filters</a></div>' +
      (list.length ? '<div class="jb-table-wrap"><table class="data jb-table"><thead><tr><th>Job &amp; Customer</th><th>Trade/Scope</th><th>Salesman &amp; Appt Setter</th><th>Crew</th><th>Where in Schedule</th><th>Projected Start</th><th>Actual Start</th><th>Projected Finish</th><th><span class="sr-only">Expand</span></th></tr></thead><tbody>' + list.map(row).join("") + "</tbody></table></div>"
        : '<div class="card empty-state jb-empty"><strong>No jobs match the current filter</strong>Try Reset Filters, or use <b>+ Add Job</b> to put a job on the board.</div>') +
      '<p class="jb-foot">Sample jobs only. "Sync CRM Jobs" is a simulation; nothing is read from or written to ' + esc(cfg.crmName) + ".</p></section>";
    bind(root);
  }
  function bind(root) {
    var $ = function (s) { return root.querySelector(s); };
    root.querySelectorAll("[data-jb-tab]").forEach(function (b) { b.onclick = function () { ui.stage = b.getAttribute("data-jb-tab"); render(); }; });
    var q = $("#jb-q"); q.oninput = function () { ui.q = q.value; var pos = q.selectionStart; render(); var n = ui.root.querySelector("#jb-q"); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} };
    [["#jb-date", "date"], ["#jb-trade", "trade"], ["#jb-sales", "sales"], ["#jb-crew", "crew"], ["#jb-from", "from"], ["#jb-to", "to"]].forEach(function (p) { var el = $(p[0]); if (el) el.onchange = function () { ui[p[1]] = el.value; render(); }; });
    $("[data-jb-reset]").onclick = function (e) { e.preventDefault(); ui.q = ""; ui.date = "all"; ui.from = ui.to = ui.trade = ui.sales = ui.crew = ""; render(); };
    root.querySelectorAll("[data-jb-toggle]").forEach(function (b) { b.onclick = function () { var id = b.getAttribute("data-jb-toggle"); ui.open[id] = !ui.open[id]; render(); }; });
    root.querySelectorAll("[data-jb-stage]").forEach(function (s) { s.onchange = function () { update(s.getAttribute("data-jb-stage"), { stage: s.value }); }; });
    root.querySelectorAll("[data-jb-crew]").forEach(function (s) { s.onchange = function () { update(s.getAttribute("data-jb-crew"), { crew: s.value }); }; });
    root.querySelectorAll("[data-jb-crm]").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); toast("Sample only: would open " + cfg.crmName + " job " + a.getAttribute("data-jb-crm")); }; });
    $("[data-jb-sync]").onclick = sync;
    $("[data-jb-add]").onclick = window.JobsAccess ? function () { JobsAccess.openJob(null); } : addForm;
    if (window.JobsAccess) JobsAccess.bindCommon(root);
  }
  function update(id, patch) {
    var j = load().jobs[id]; if (!j) return; Object.keys(patch).forEach(function (k) { j[k] = patch[k]; });
    if (patch.stage === "progress" && !j.actualStart) j.actualStart = todayISO();
    if (patch.stage === "completed" && !j.actualStart) j.actualStart = j.projStart;
    save(); render(); toast("Job " + id + " updated");
  }
  function sync() {
    var m = load(), r = rng(99 + (m.syncs || 0) * 31), t = todayISO(), n = 1 + Math.floor(r() * 2), added = [];
    for (var i = 0; i < n; i++) { var j = makeJob(r, 500 + (m.syncs || 0) * 5 + i, t); j.stage = "pending"; j.crew = ""; j.actualStart = ""; j.projStart = addDays(t, 14 + i); j.projFinish = addDays(j.projStart, 2); j.alert = ""; m.jobs[j.id] = j; added.push(j.id); }
    m.syncs = (m.syncs || 0) + 1; save(); render(); toast("Sample sync: " + added.length + " new sold job" + (added.length === 1 ? "" : "s") + " pulled in (" + added.join(", ") + ")");
  }
  function addForm() {
    var old = document.getElementById("jb-add"); if (old) old.remove();
    var t = todayISO(), w = document.createElement("div"); w.className = "fb-modal-wrap"; w.id = "jb-add";
    w.innerHTML = '<div class="fb-modal" role="dialog" aria-modal="true" aria-label="Add Job to Board"><div class="fb-modal-head"><h3>Add Job to Board</h3><button type="button" class="fb-x" data-close aria-label="Close">×</button></div><div class="fb-modal-body"><div class="fb-form">' +
      '<label>Customer<input id="jb-a-cust" value="Sample Homeowner "></label><label>Phone<input id="jb-a-phone" value="555-01' + pad(10 + Math.floor(Math.random() * 89)) + '"></label>' +
      '<label>City<select id="jb-a-city">' + opts(cfg.cities.map(function (c) { return [c[0], c[0] + " " + c[1]]; }), "") + "</select></label>" +
      '<label>Trade<select id="jb-a-trade">' + opts(cfg.trades, "") + '</select></label><label>Scope<input id="jb-a-scope" placeholder="e.g. 12 windows, full tear-off"></label>' +
      '<label>Salesman<select id="jb-a-sales">' + opts(cfg.salesmen, "") + '</select></label><label>Appt setter<select id="jb-a-setter">' + opts(cfg.setters, "") + "</select></label>" +
      '<label>Crew<select id="jb-a-crew">' + opts([["", "Unassigned"]].concat(cfg.crews), "") + '</select></label><label>Stage<select id="jb-a-stage">' + opts(cfg.stages.map(function (s) { return [s.id, s.label]; }), "scheduled") + "</select></label>" +
      '<label>Projected start<input type="date" id="jb-a-ps" value="' + addDays(t, 7) + '"></label><label>Projected finish<input type="date" id="jb-a-pf" value="' + addDays(t, 9) + '"></label>' +
      '<label>Sale value $<input type="number" id="jb-a-sale" min="0" value="12000"></label><label>Est. costs $<input type="number" id="jb-a-cost" min="0" value="7200"></label>' +
      '</div><p class="fb-err" id="jb-a-err" role="alert"></p></div><div class="fb-modal-foot"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="button" class="btn btn-primary" id="jb-a-save">Add to board</button></div></div>';
    document.body.appendChild(w);
    w.addEventListener("click", function (e) { if (e.target === w || e.target.closest("[data-close]")) w.remove(); });
    w.querySelector("#jb-a-save").onclick = function () {
      var g = function (id) { return w.querySelector(id).value.trim(); }, err = w.querySelector("#jb-a-err");
      if (g("#jb-a-cust").length < 3) { err.textContent = "Enter a customer name"; return; }
      if (!/^555-\d{4}$/.test(g("#jb-a-phone"))) { err.textContent = "Sandbox phones must be 555-xxxx"; return; }
      if (g("#jb-a-pf") && g("#jb-a-ps") && g("#jb-a-pf") < g("#jb-a-ps")) { err.textContent = "Projected finish is before projected start"; return; }
      var city = cfg.cities.filter(function (c) { return c[0] === g("#jb-a-city"); })[0] || ["", ""], m = load(), id = "J-" + (30000 + Object.keys(m.jobs).length + Math.floor(Math.random() * 900));
      var st = g("#jb-a-stage");
      m.jobs[id] = { id: id, customer: g("#jb-a-cust"), phone: g("#jb-a-phone"), city: city[0], zip: city[1], trade: g("#jb-a-trade"), scope: g("#jb-a-trade") + (g("#jb-a-scope") ? " · " + g("#jb-a-scope") : ""), salesman: g("#jb-a-sales"), setter: g("#jb-a-setter"), crew: g("#jb-a-crew"), stage: st,
        projStart: g("#jb-a-ps"), actualStart: (st === "progress" || st === "inspection" || st === "completed") ? g("#jb-a-ps") : "", projFinish: g("#jb-a-pf"), sale: +g("#jb-a-sale") || 0, cost: +g("#jb-a-cost") || 0, alert: "", crmId: "NEW", sample: true };
      save(); w.remove(); ui.stage = "all"; ui.q = id; render(); toast("Job " + id + " added to the board");
    };
  }
  function toast(msg) { var t = document.getElementById("fb-toast"); if (!t) { t = document.createElement("div"); t.id = "fb-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = msg; t.className = "fb-toast show"; clearTimeout(t._h); t._h = setTimeout(function () { t.className = "fb-toast"; }, 3200); }
  window.JobsBoard = { _int: { load: load, save: save, all: all, stage: stage, esc: esc, money: money, fmt: fmt, todayISO: todayISO, addDays: addDays, opts: opts, toast: toast, rng: rng, pad: pad, cfg: function () { return cfg; } }, render: render, all: all, filtered: filtered, ui: ui, update: update, sync: sync, _reset: function () { mem = null; localStorage.removeItem(KEY); } };
})();
