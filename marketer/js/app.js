/* Infinity Home Improvement Command Center — clickable design draft (sample data only) */
(function () {
  "use strict";

  const STORAGE_THEME = "mkc-command-theme";
  const STORAGE_OFFICE = "mkc-command-office";
  const STORAGE_USER = "mkc-command-user";
  /* migrate old keys if present */
  if (!localStorage.getItem(STORAGE_THEME) && localStorage.getItem("mkc-legacy-command-theme")) {
    localStorage.setItem(STORAGE_THEME, localStorage.getItem("mkc-legacy-command-theme"));
  }
  if (!localStorage.getItem(STORAGE_OFFICE) && localStorage.getItem("mkc-legacy-command-office")) {
    localStorage.setItem(STORAGE_OFFICE, localStorage.getItem("mkc-legacy-command-office"));
  }

  function themeKeyForUser(userId) {
    return userId ? STORAGE_THEME + ":" + userId : STORAGE_THEME;
  }

  function readTheme(userId) {
    const keyed = localStorage.getItem(themeKeyForUser(userId));
    if (keyed) return keyed;
    return localStorage.getItem(STORAGE_THEME) || "dark"; /* /marketer/: dark slate like the earlier CC */
  }

  function writeTheme(theme, userId) {
    localStorage.setItem(themeKeyForUser(userId), theme);
    localStorage.setItem(STORAGE_THEME, theme); /* fallback / shared */
  }

  const state = {
    office: localStorage.getItem(STORAGE_OFFICE) || "MI",
    userId: localStorage.getItem(STORAGE_USER) || "u-chris", /* /marketer/: Chris Baareman */
    theme: "light",
    view: "home",
    boardTab: "board",
    boardDayId: "mon",
    boardView: "week",
    boardWeekOffset: 0,
    selectedLeadId: null,
    selectedThreadId: null,
    selectedStlId: null,
    stlFilter: "all",
    stlTab: "conversations",
    selectedReportId: null,
    reportQuery: "",
    reportGroup: "all",
    reportPrimaryOnly: false,
    selectedPeriodId: null,
    leadFilters: { product: "all", source: "all", cts: "all", status: "all", rep: "all", tm: "all", q: "", jobs: false },
    leadSort: { key: "date", dir: "desc" },
    leadLimit: 60,
    salesSubview: "daily",
    salesFilters: {
      view: "Daily Results",
      salesperson: "all",
      hideInactive: true,
      dateRange: "today",
      appointmentType: "all",
      appointmentResult: "all",
      division: "all"
    },
    salesTaggedCount: 0,
    viewAsId: null, /* manager "View a marketer's Home" */
    activityScope: null, /* manager Activity view: "ALL" or a marketer id */
    stlScope: null, /* manager Speed to Lead: "ALL" or a marketer id */
    stlDetails: false, /* Speed to Lead "More details" toggle */
    route: "home" /* v16: route in the URL; registry pages (js/mobile-utils.js IHIPages) render into #view-page */
  };
  state.theme = readTheme(state.userId);

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function currentUser() {
    return (SampleData.users || []).find((u) => u.id === state.userId) || (SampleData.users || [])[0];
  }

  function setUser(userId) {
    const user = (SampleData.users || []).find((u) => u.id === userId);
    if (!user) return;
    state.userId = user.id;
    state.viewAsId = null;
    state.activityScope = null;
    state.stlScope = null;
    state.selectedStlId = null;
    if (window.SpeedToLead) SpeedToLead.reset();
    state.activityTab = "list";
    if (window.PeopleLog) { PeopleLog.resetActions(); PeopleLog.resetTexts(); }
    state.leadFilters = { product: "all", source: "all", cts: "all", status: "all", rep: "all", tm: "all", q: "", jobs: false };
    state.leadLimit = 60;
    localStorage.setItem(STORAGE_USER, user.id);
    state.theme = readTheme(user.id);
    applyTheme(state.theme);
    updateUserChip();
    applyNavForRole();
  }

  function updateUserChip() {
    const user = currentUser();
    if (!user) return;
    const av = $("#user-avatar");
    const nm = $("#user-name");
    const rl = $("#user-role");
    if (av) av.textContent = user.initials;
    if (nm) nm.textContent = user.name;
    if (rl) rl.textContent = user.roleLabel || user.role;
    const chip = $("#user-chip");
    if (chip) chip.title = user.email + " · " + (user.roleLabel || user.role);
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    writeTheme(theme, state.userId);
    const darkOn = theme === "dark";
    $$("[data-theme-toggle]").forEach((el) => {
      if (el.getAttribute("role") === "switch") {
        el.setAttribute("aria-checked", darkOn ? "true" : "false");
      }
      if (el.classList.contains("icon-btn")) {
        el.setAttribute("aria-label", darkOn ? "Switch to light mode" : "Switch to dark mode");
        el.textContent = darkOn ? "☀" : "☾";
      }
    });
  }

  function userFromEmail(email) {
    const e = (email || "").trim().toLowerCase();
    const users = SampleData.users || [];
    return users.find((u) => (u.email || "").toLowerCase() === e) || null;
  }

  function setOffice(office) {
    state.office = office;
    localStorage.setItem(STORAGE_OFFICE, office);
    $$("[data-office-btn]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-office-btn") === office ? "true" : "false");
    });
    const label = office === "IL" ? "Illinois" : "Michigan";
    $$("[data-office-label]").forEach((el) => { el.textContent = label; });
    renderCurrentView();
  }

  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.remove("active"));
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
  }

  function setHash(view, sub) {
    const h = sub ? "#" + view + "/" + sub : "#" + view;
    if (location.hash !== h) {
      history.replaceState(null, "", h);
    }
  }

  function navigate(view, opts) {
    opts = opts || {};
    if (!isRoute(view)) view = "home"; /* unknown / old link → Home, never an empty screen */
    state.view = view;
    state.route = view;
    $$(".nav-btn[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-view") === view);
    });
    $$(".view").forEach((v) => v.classList.remove("active"));
    const allowed = canSee(view, currentUser());
    const pane = document.getElementById(paneId(view));
    if (pane && allowed) pane.classList.add("active");
    if (!allowed) showUnavailable(view);

    const titles = {
      home: { title: "Home", tip: "Your morning checklist — what needs attention today." },
      leads: { title: "Leads", tip: "Everyone who asked for an estimate, plus customers sold in the last 60 days. Click a row to open the customer record." },
      appointments: { title: "Appointments", tip: "Who is going out, when, and who still needs a confirm call." },
      sales: { title: "Sales", tip: "Daily Results — today’s sales appointments, per-rep board, and filters (sample)." },
      activity: { title: "Activity", tip: "Calls, texts, emails and to-dos tied to your leads — what’s due, what’s late, and what you finished (sample)." },
      messages: { title: "Messages", tip: "Simple text inbox (sample). For open/read tracking and who-sent-what, use Speed to Lead." },
      speed: { title: "Speed to Lead", tip: "New leads texting in. Answer the ones that need a reply (oldest first), see who sent each text and whether it was opened — sample texts." },
      reports: { title: "Reports", tip: "Michigan Access reports the office uses — plain names, sample previews. Illinois mirrors the same list." },
      integrations: { title: "Connections", tip: "Systems, lead vendors, and sync links — sample status only." },
      settings: { title: "Settings", tip: "Appearance, default office, and AI connection (placeholders)." },
      audit: { title: "Audit log", tip: "System record of who changed what in Command Center — sample entries only. (Lead calls/texts are under Activity.)" },
      marketing: { title: "Marketing", tip: "GoHighLevel campaigns and AI voice status (placeholders)." }
    };
    const pmeta = !titles[view] && window.IHIPages ? IHIPages.meta(view) : null;
    const meta = titles[view] || (pmeta ? { title: pmeta.title, tip: pmeta.tip || "" } : { title: view, tip: "" });
    $("#page-title").textContent = meta.title;
    $("#page-tip").textContent = meta.tip;

    const sidebar = $(".sidebar");
    if (sidebar) sidebar.classList.remove("open");

    if (view === "activity") {
      const u = currentUser();
      if (u && u.role === "Manager") state.activityScope = state.viewAsId || state.activityScope || "ALL";
    }
    if (view === "speed") {
      const u = currentUser();
      if (u && u.role === "Manager") state.stlScope = state.viewAsId || state.stlScope || "ALL";
      if (opts.stlId !== undefined) state.selectedStlId = opts.stlId || null;
    }

    if (!opts.skipHash) {
      if (view === "reports" && opts.reportId) setHash("reports", opts.reportId);
      else if (view === "integrations" && opts.integrationId) setHash("integrations", opts.integrationId);
      else if (view === "speed" && opts.stlId) setHash("speed", opts.stlId);
      else setHash(view);
    }

    document.dispatchEvent(new CustomEvent("ihi:navigate", { detail: { route: view } }));
    renderCurrentView();
    if (!opts.keepScroll) window.scrollTo(0, 0); /* each page opens at its top (no landing below short content) */

    if (view === "reports" && opts.reportId) {
      openReportPreview(opts.reportId);
    }
  }

  /* v15 — pages each role may open. Missing = everyone. Hidden pages: nav item hidden AND a plain
   * "not available for your role" page if reached by URL (Thomas 2026-10-07: never a blank page). */
  const VIEWS = ["home", "leads", "appointments", "sales", "activity", "messages", "speed", "reports", "integrations", "settings", "audit", "marketing"];
  const PAGE_ROLES = {}; /* /marketer/: Thomas wants every page visible to Chris */
  const PAGE_NAMES = { integrations: "Connections", marketing: "Marketing", audit: "Audit log" };
  /* v16 — routes beyond VIEWS come from the page registry (window.IHIPages in js/mobile-utils.js):
   * my-leads, calendar, my-activity (+ "today", the phone Home). They render into #view-page. Not in the desktop nav. */
  function isPageRoute(view) { return VIEWS.indexOf(view) < 0 && !!(window.IHIPages && IHIPages.isRoute(view)); }
  function isRoute(view) { return VIEWS.indexOf(view) >= 0 || isPageRoute(view); }
  function paneId(view) { return isPageRoute(view) ? "view-page" : "view-" + view; }
  function canSee(view, user) {
    const r = PAGE_ROLES[view];
    if (!r && isPageRoute(view)) return IHIPages.allowed(view, user && user.role);
    return !r || !!(user && r.includes(user.role));
  }
  function applyNavForRole() {
    const u = currentUser();
    $$(".nav-btn[data-view]").forEach((b) => { b.hidden = !canSee(b.getAttribute("data-view"), u); });
    const more = $(".nav-more");
    if (more) more.hidden = !$$(".nav-more .nav-btn[data-view]").some((b) => !b.hidden);
  }
  function showUnavailable(view) {
    const pane = $("#view-unavailable");
    if (!pane) return;
    const u = currentUser();
    const pm = !PAGE_NAMES[view] && window.IHIPages ? IHIPages.meta(view) : null;
    pane.innerHTML = `<div class="card role-denied"><h2>This page isn’t available for your role</h2>
      <p>${esc(PAGE_NAMES[view] || (pm && pm.title) || view)} is for ${pm ? "sales reps" : "managers"}. You’re signed in as ${esc(u ? u.name : "")} (${esc(u ? (u.roleLabel || u.role) : "")}).</p>
      <button type="button" class="btn btn-primary" data-unavail-home>Go to Home</button></div>`;
    pane.classList.add("active");
    const b = pane.querySelector("[data-unavail-home]");
    if (b) b.addEventListener("click", () => navigate("home"));
  }
  function paneRoot(view) {
    const pane = document.getElementById(paneId(view));
    return pane ? (pane.querySelector('[id$="-root"]') || pane) : null;
  }
  function showViewError(view, err) {
    console.error("[Command Center] " + view + " page failed to render:", err);
    const root = paneRoot(view);
    if (!root || state.view !== view) return;
    root.innerHTML = `<div class="card view-error" role="alert"><h2>This page couldn’t load</h2>
      <p>Something went wrong showing ${esc((document.getElementById("page-title") || {}).textContent || view)} for this sign-in. Nothing was changed. Try Home, or sign out and back in.</p>
      <button type="button" class="btn btn-primary" data-viewerr-home>Go to Home</button></div>`;
    const b = root.querySelector("[data-viewerr-home]");
    if (b) b.addEventListener("click", () => navigate("home"));
  }
  /* last line of defence: a page that rendered nothing gets a plain empty state instead of white space */
  function ensureFilled(view) {
    setTimeout(() => {
      if (state.view !== view) return;
      const pane = document.getElementById(paneId(view));
      if (!pane || pane.innerText.trim().length > 0) return;
      const root = paneRoot(view);
      if (root) root.innerHTML = `<div class="empty-state"><strong>Nothing to show yet</strong>There’s no sample data for this page for your sign-in and office.</div>`;
    }, 1500);
  }

  function renderCurrentView() {
    const view = state.view;
    const R = {
      home: renderHome, leads: renderLeads, appointments: renderAppointments, sales: renderSales,
      activity: renderActivity, messages: renderMessages, speed: renderSpeedToLead, reports: renderReports,
      integrations: renderIntegrations, settings: renderSettings, audit: renderAudit, marketing: renderMarketing
    };
    if (isPageRoute(view)) R[view] = () => renderRegistryPage(view);
    /* v16 phone shell (js/mobile-shell.js): non-rep cards, manager "View as rep", phone Today ("today" page) */
    if (window.IHIShell && IHIShell.intercept(view)) return;
    if (!R[view] || !canSee(view, currentUser())) return;
    try {
      const out = R[view]();
      if (out && typeof out.then === "function") out.then(() => ensureFilled(view), (err) => showViewError(view, err));
      else ensureFilled(view);
    } catch (err) {
      showViewError(view, err);
    }
  }

  /* v16 — registry page render. ctx = IHIShell.ctx(): { user, rep, office, navigate, openLead, isPhone, esc } */
  function pageCtx() {
    const u = currentUser();
    const base = {
      user: u ? Object.assign({}, u) : null,
      rep: null,
      office: state.office,
      navigate: (route, o) => navigate(route, o),
      openLead: (id) => openLeadDrawer(id),
      isPhone: !!(window.IHIMobile && IHIMobile.isPhone()),
      esc: esc
    };
    return window.IHIShell ? IHIShell.ctx(base) : base;
  }
  function renderRegistryPage(route, el) {
    const root = el || $("#page-root");
    if (!root) return;
    root.setAttribute("data-route", route);
    const def = IHIPages.get(route);
    if (!def || typeof def.render !== "function") {
      const m = IHIPages.meta(route) || { title: route };
      root.innerHTML = `<div class="card empty-state coming-soon"><strong>${esc(m.title)}: coming in this build</strong>${esc(m.tip || "This page is being built for the phone app.")} Sample data only.</div>`;
      return;
    }
    root.innerHTML = window.IHIMobile && IHIMobile.skeleton ? IHIMobile.skeleton(3) : "";
    return def.render(root, pageCtx());
  }

  function badge(system) {
    const label = (system === "IHI" || system === "Command") ? "Infinity Home Improvement Command Center" : system;
    const cls = (system === "IHI" || system === "Command") ? "Command" : system;
    return `<span class="badge badge-${cls}">${label}</span>`;
  }

  function marketerUsers() {
    return (SampleData.users || []).filter((u) => u.marketer);
  }

  function renderHome() {
    const user = currentUser();
    const personal = $("#personal-home");
    const hq = $("#hq-home");
    const viewAs = user && user.role === "Manager" && state.viewAsId
      ? (SampleData.users || []).find((u) => u.id === state.viewAsId && u.marketer)
      : null;
    const target = user && user.marketer ? user : viewAs;
    if (target && personal && window.PersonalDashboard) {
      hq.hidden = true;
      personal.hidden = false;
      $("#page-tip").textContent = viewAs
        ? "Viewing a marketer’s personal Home — exactly what they see after signing in (sample)."
        : "Your personal numbers — only appointments you set (sample data).";
      PersonalDashboard.render(personal, {
        user: target,
        office: state.office,
        viewer: viewAs ? user : null,
        marketers: marketerUsers(),
        onNavigate: (view, o) => navigate(view, o),
        onOpenLead: (leadId) => openLeadDrawer(leadId),
        onBack: () => { state.viewAsId = null; renderHome(); },
        onPick: (id) => { state.viewAsId = id; renderHome(); }
      });
      return;
    }
    if (personal) { personal.hidden = true; personal.innerHTML = ""; }
    if (hq) hq.hidden = false;
    renderHqHome(user);
  }

  function renderHqHome(user) {
    const role = user ? user.role : "Manager";
    const vaWrap = $("#viewas-wrap");
    const vaSel = $("#viewas-select");
    if (vaWrap && vaSel) {
      vaWrap.hidden = role !== "Manager";
      if (role === "Manager") {
        vaSel.innerHTML = `<option value="">Pick a marketer…</option>` +
          marketerUsers().map((m) => `<option value="${m.id}">${m.name}</option>`).join("");
        vaSel.onchange = () => {
          if (!vaSel.value) return;
          state.viewAsId = vaSel.value;
          renderHome();
          window.scrollTo(0, 0);
        };
      }
    }
    const k = SampleData.kpis[state.office];
    const sources = SampleData.kpiSources;
    const showKpis = role === "Manager" || role === "Confirmer";
    const cards = [
      { key: "inquiriesToday", label: "New inquiries today", tip: "People who asked for an estimate today.", roles: ["Manager", "Setter", "Data processor"] },
      { key: "setsToday", label: "Appointments set", tip: "Inquiries that got a booked visit.", roles: ["Manager", "Setter"] },
      { key: "issuedToday", label: "Sent to a rep", tip: "Appointments handed to a sales rep (issued).", roles: ["Manager"] },
      { key: "presentationsToday", label: "Demos done", tip: "Rep sat with the homeowner (presentation).", roles: ["Manager"] },
      { key: "soldToday", label: "Sold today", tip: "Gross sold count — sample only.", roles: ["Manager"] },
      { key: "confirmQueue", label: "Need a confirm call", tip: "Appointments waiting for the 3-day confirm process.", roles: ["Manager", "Confirmer"] },
      { key: "openMessages", label: "Open text threads", tip: "Text conversations waiting on a reply (see Speed to Lead).", roles: ["Manager", "Setter", "Confirmer"] },
      { key: "ghlCampaignsActive", label: "Active campaigns", tip: "GoHighLevel marketing sequences running.", roles: ["Manager"] },
      { key: "accessJobsPending", label: "Access jobs pending", tip: "Items still living in Michigan Access.", roles: ["Manager", "Data processor"] }
    ].filter((c) => c.roles.includes(role));

    const kpiEl = $("#kpi-grid");
    if (kpiEl) {
      kpiEl.innerHTML = cards.map((c) => `
        <article class="kpi" title="${c.tip}">
          <div class="kpi-label">${c.label} <button type="button" class="helper-tip" title="${c.tip}" aria-label="${c.tip}">?</button></div>
          <div class="kpi-value">${k[c.key]}</div>
          <div class="kpi-source">${badge(sources[c.key])}</div>
        </article>
      `).join("");
    }

    const byRole = (SampleData.nextActionsByRole || {})[role] || {};
    const actions = byRole[state.office] || (SampleData.nextActions[state.office] || []);
    $("#next-actions").innerHTML = actions.length
      ? actions.map((a) => `
          <button type="button" class="action-item tone-${a.tone}" data-goto="${a.view}" ${a.leadId ? `data-lead-id="${a.leadId}"` : ""}>
            <span class="label">${a.label}</span>
            <span class="go">Open →</span>
          </button>
        `).join("")
      : `<div class="empty-state"><strong>You're caught up</strong>Nothing urgent for this office right now.</div>`;

    $$("#next-actions [data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-goto");
        const leadId = btn.getAttribute("data-lead-id");
        navigate(view);
        if (leadId) setTimeout(() => openLeadDrawer(leadId), 0);
      });
    });

    const roleHint = {
      Manager: "Manager Home — KPIs plus the whole office queue.",
      Confirmer: "Confirmer Home — confirm queue first.",
      Setter: "Setter Home — call list and open board slots.",
      "Data processor": "Data processor Home — intake cleanup first."
    };
    $("#funnel-strip").innerHTML = `
      <span>${roleHint[role] || ""}</span>
      ${showKpis || role === "Manager" ? ` · <strong>${k.inquiriesToday}</strong> inquired → <strong>${k.setsToday}</strong> set → <strong>${k.issuedToday}</strong> issued → <strong>${k.presentationsToday}</strong> demos → <strong>${k.soldToday}</strong> sold` : ""}
    `;
  }

  function sortLeads(rows) {
    const { key, dir } = state.leadSort;
    const mul = dir === "asc" ? 1 : -1;
    return rows.slice().sort((a, b) => {
      let av = a[key];
      let bv = b[key];
      if (key === "rep") { av = a.rep || ""; bv = b.rep || ""; }
      if (key === "setDate") { av = a.setDate || ""; bv = b.setDate || ""; }
      av = (av == null ? "" : String(av)).toLowerCase();
      bv = (bv == null ? "" : String(bv)).toLowerCase();
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
  }

  /* Leads (v14): generated customers — leads from the last 10 days + anyone who bought in the last 60 days.
   * Marketers see only their own customers; Tom / confirm / office staff see everyone. Click a row → customer record. */
  let leadsToken = 0;
  function renderLeads() {
    const user = currentUser();
    const own = !!(user && user.marketer);
    const scope = own ? user.id : "ALL";
    const my = ++leadsToken;
    if (!$("#leads-table").querySelector("table")) $("#leads-table").innerHTML = `<div class="empty-state card card-pad"><strong>Loading customers…</strong></div>`;
    if (!window.DashboardData || !DashboardData.getCustomers) return;
    return DashboardData.getCustomers(scope, { office: state.office }).then((data) => { if (my === leadsToken) drawLeads(data, own); });
  }

  function drawLeads(data, own) {
    const f = state.leadFilters;
    const all = data.rows;
    let rows = all;
    const qtext = (f.q || "").trim().toLowerCase();
    if (qtext) rows = rows.filter((l) => (l.name + " " + l.city + " " + l.id).toLowerCase().indexOf(qtext) !== -1);
    if (f.product !== "all") rows = rows.filter((l) => l.product === f.product);
    if (f.source !== "all") rows = rows.filter((l) => l.source === f.source);
    if (f.cts !== "all") rows = rows.filter((l) => l.cts === f.cts);
    if (f.status !== "all") rows = rows.filter((l) => l.status === f.status);
    if (f.rep !== "all") rows = rows.filter((l) => (l.rep || "") === f.rep);
    if (!own && f.tm && f.tm !== "all") rows = rows.filter((l) => l.ownerId === f.tm);
    if (f.jobs) rows = rows.filter((l) => l.hasJobs);
    rows = sortLeads(rows);
    const uniq = (k) => [...new Set(all.map((l) => l[k]).filter(Boolean))].sort();
    const opt = (list, val) => list.map((s) => `<option value="${s}" ${s === val ? "selected" : ""}>${s}</option>`).join("");
    const sortAria = (key) => state.leadSort.key === key ? (state.leadSort.dir === "asc" ? "ascending" : "descending") : "none";
    const limit = state.leadLimit || 60;
    const shown = rows.slice(0, limit);
    $("#lead-filters").innerHTML = `
      <div class="filters-bar">
        <input type="search" class="select lead-search" id="filter-q" placeholder="Search name, city or id" value="${(f.q || "").replace(/"/g, "&quot;")}" aria-label="Search customers" />
        <select class="select" id="filter-product" aria-label="Filter by product"><option value="all">All products</option>${opt(uniq("product"), f.product)}</select>
        <select class="select" id="filter-source" aria-label="Filter by source"><option value="all">All sources</option>${opt(uniq("source"), f.source)}</select>
        <select class="select" id="filter-cts" aria-label="Filter by marketing queue"><option value="all">All queues</option>${opt(uniq("cts"), f.cts)}</select>
        <select class="select" id="filter-status" aria-label="Filter by stage"><option value="all">All stages</option>${opt(uniq("status"), f.status)}</select>
        <select class="select" id="filter-rep" aria-label="Filter by rep"><option value="all">All reps</option>${opt(uniq("rep"), f.rep)}</select>
        ${own ? "" : `<select class="select" id="filter-tm" aria-label="Filter by telemarketer"><option value="all">All telemarketers</option>${marketerUsers().map((m) => `<option value="${m.id}" ${f.tm === m.id ? "selected" : ""}>${m.name}</option>`).join("")}</select>`}
        <label class="lead-jobs"><input type="checkbox" id="filter-jobs" ${f.jobs ? "checked" : ""}/> Has jobs</label>
        <span class="sort-label">${rows.length} customers · ${own ? "only yours" : "all marketers"} · ${state.office === "IL" ? "Illinois" : "Michigan"} <button type="button" class="helper-tip" title="Leads that came in during the last 10 days, plus anyone who bought in the last 60 days. Click a row for the full customer record (sample).">?</button></span>
      </div>`;
    const map = { "filter-product": "product", "filter-source": "source", "filter-cts": "cts", "filter-status": "status", "filter-rep": "rep", "filter-tm": "tm" };
    Object.keys(map).forEach((id) => { const el = $(`#${id}`); if (el) el.addEventListener("change", (e) => { state.leadFilters[map[id]] = e.target.value; state.leadLimit = 60; drawLeads(data, own); }); });
    const jb = $("#filter-jobs"); if (jb) jb.addEventListener("change", () => { state.leadFilters.jobs = jb.checked; state.leadLimit = 60; drawLeads(data, own); });
    const qi = $("#filter-q");
    if (qi) qi.addEventListener("input", () => { state.leadFilters.q = qi.value; state.leadLimit = 60; const pos = qi.selectionStart; drawLeads(data, own); const n = $("#filter-q"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } });

    if (!rows.length) {
      $("#leads-table").innerHTML = `<div class="empty-state card card-pad"><strong>No customers match these filters</strong>Try clearing a filter, or switch office at the top.</div>`;
      return;
    }
    const fmtD = (iso) => iso ? (+iso.slice(5, 7)) + "/" + (+iso.slice(8, 10)) : "—";
    $("#leads-table").innerHTML = `
      <div class="table-wrap">
        <table class="data" aria-label="Customers">
          <thead><tr>
            <th class="th-sort" data-sort="name" aria-sort="${sortAria("name")}">Homeowner</th>
            <th class="th-sort" data-sort="date" aria-sort="${sortAria("date")}">Came in</th>
            <th class="th-sort" data-sort="city" aria-sort="${sortAria("city")}">City</th>
            <th class="th-sort" data-sort="product" aria-sort="${sortAria("product")}">Product</th>
            <th class="th-sort" data-sort="source" aria-sort="${sortAria("source")}">Source</th>
            <th class="th-sort" data-sort="cts" aria-sort="${sortAria("cts")}">Marketing queue <button type="button" class="helper-tip" title="Where the customer is in the marketing process (inquiry result / appointment).">?</button></th>
            <th class="th-sort" data-sort="status" aria-sort="${sortAria("status")}">Stage</th>
            <th class="th-sort" data-sort="rep" aria-sort="${sortAria("rep")}">Rep</th>
            ${own ? "" : `<th class="th-sort" data-sort="ownerName" aria-sort="${sortAria("ownerName")}">Telemarketer</th>`}
            <th class="th-sort" data-sort="apptDate" aria-sort="${sortAria("apptDate")}">Appt</th>
          </tr></thead>
          <tbody>
            ${shown.map((l) => `
              <tr data-lead="${l.id}" tabindex="0">
                <td><strong>${l.name}</strong>${l.hasJobs ? ` <span class="lead-job" title="Has job / sales data">Jobs</span>` : ""}<div style="font-size:0.75rem;color:var(--text-faint)">${l.id}</div></td>
                <td>${fmtD(l.date)}</td>
                <td>${l.city}, ${l.state}</td>
                <td>${l.product}</td>
                <td>${l.source}</td>
                <td>${l.cts}</td>
                <td><span class="status-pill status-${l.status}">${l.status}</span></td>
                <td>${l.rep || "—"}</td>
                ${own ? "" : `<td>${l.ownerName}</td>`}
                <td>${fmtD(l.apptDate)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      ${rows.length > shown.length ? `<button type="button" class="btn btn-ghost btn-sm lead-more" id="leads-more">Show more (${rows.length - shown.length} left)</button>` : ""}`;
    $$("#leads-table [data-sort]").forEach((th) => th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      if (state.leadSort.key === key) state.leadSort.dir = state.leadSort.dir === "asc" ? "desc" : "asc";
      else state.leadSort = { key, dir: key === "date" || key === "apptDate" ? "desc" : "asc" };
      drawLeads(data, own);
    }));
    const more = $("#leads-more"); if (more) more.addEventListener("click", () => { state.leadLimit = limit + 60; drawLeads(data, own); });
    $$("#leads-table [data-lead]").forEach((tr) => {
      const open = () => openLeadDrawer(tr.getAttribute("data-lead"));
      tr.addEventListener("click", open);
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }

  /* Customer record drawer (v14) — wide, contact-record layout (js/customer-record.js) */
  function openLeadDrawer(id) {
    if (!id) return;
    state.selectedLeadId = id;
    const user = currentUser();
    $(".drawer").classList.add("drawer-record");
    $("#drawer-title").textContent = "Customer record";
    $("#drawer-sub").textContent = "Loading…";
    $("#drawer-body").innerHTML = `<div class="cr-empty"><strong>Loading customer…</strong></div>`;
    $(".drawer-backdrop").classList.add("open");
    $(".drawer").classList.add("open");
    $("#drawer-close").focus();
    if (window.CustomerRecord) CustomerRecord.reset();
    if (!window.DashboardData || !DashboardData.getCustomerRecord || !window.CustomerRecord) return;
    DashboardData.getCustomerRecord(id, { viewer: user }).then((rec) => {
      if (state.selectedLeadId !== id) return;
      if (!rec) { $("#drawer-sub").textContent = ""; $("#drawer-body").innerHTML = `<div class="cr-empty"><strong>Customer not found in the sample</strong></div>`; return; }
      $("#drawer-sub").innerHTML = rec.restricted ? "Not your customer"
        : `${rec.office === "IL" ? "Illinois" : "Michigan"} · ${rec.kind === "generated" ? "Telemarketer " + rec.ownerName + " · " : ""}<span class="cr-subid">${rec.id}</span>`;
      CustomerRecord.render($("#drawer-body"), rec, {
        toast: (m) => (window.ActivityView && ActivityView.toast ? ActivityView.toast(m) : null),
        onShowConversation: (tid) => { closeDrawer(); state.selectedStlId = tid; navigate("speed", { stlId: tid }); window.scrollTo(0, 0); }
      });
    }).catch((err) => { $("#drawer-body").innerHTML = `<div class="cr-empty"><strong>Couldn’t load this customer</strong>${String(err && err.message || err)}</div>`; });
  }

  function closeDrawer() {
    $(".drawer-backdrop").classList.remove("open");
    $(".drawer").classList.remove("open");
  }

  function renderAppointments() {
    const days = SampleData.boardDays || [];
    if (!days.find((d) => d.id === state.boardDayId) && days[0]) {
      state.boardDayId = days[0].id;
    }
    const day = days.find((d) => d.id === state.boardDayId) || days[0];
    const reps = SampleData.boardReps || [];
    const legend = SampleData.boardLegend || [];

    const tabs = `
      <div class="board-tabs" role="tablist">
        <button type="button" role="tab" aria-selected="${state.boardTab === "board"}" data-board-tab="board">Future Board</button>
        <button type="button" role="tab" aria-selected="${state.boardTab === "calendar"}" data-board-tab="calendar">Week at a glance</button>
      </div>
    `;

    const fbCell = (a) => {
      if (!a) return `<div class="board-cell"><div class="slot slot-fb-open">Open</div></div>`;
      const dim = a.state && a.state !== state.office;
      const typ = a.type || "set";
      const main = a.label || a.lead || "";
      const sub = a.lead && a.type !== "unavailable" && a.type !== "product" && a.type !== "radius"
        ? `${a.lead}${a.state ? " · " + a.state : ""}`
        : (a.state ? a.state : "");
      return `<div class="board-cell ${dim ? "dimmed" : ""}"><div class="slot slot-fb-${typ}">${main}${sub ? `<span class="sub">${sub}</span>` : ""}</div></div>`;
    };
    const fbRepHeads = () => reps.map((r) => `<div class="board-cell head board-rep-head"><div class="rep-name">${r.name}</div><span class="rep-city">🏠 ${r.city}</span></div>`).join("");
    const viewToggle = `
      <div class="board-view-toggle" role="group" aria-label="Board view">
        <button type="button" data-board-view="week" aria-pressed="${state.boardView === "week"}">Whole week</button>
        <button type="button" data-board-view="day" aria-pressed="${state.boardView === "day"}">Single day</button>
      </div>`;

    let body = "";
    const useFB = state.boardTab === "board" && window.FutureBoard;
    if (useFB) {
      body = `<div id="fb-root"></div>`;
    } else if (state.boardTab === "board" && state.boardView === "week") {
      const iso = (dt) => dt.toISOString().slice(0, 10);
      const first = days[0] ? new Date(days[0].date + "T12:00:00Z") : new Date();
      const sun = new Date(first.getTime() - first.getUTCDay() * 864e5 + state.boardWeekOffset * 7 * 864e5);
      const week = Array.from({ length: 7 }, (_, i) => new Date(sun.getTime() + i * 864e5));
      const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const fmt = (dt) => `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`;
      const rangeLabel = `${fmt(week[0])} – ${fmt(week[6])}/${week[6].getUTCFullYear()}`;
      const sections = week.map((dt, i) => {
        const d = days.find((x) => x.date === iso(dt));
        const age = d ? (d.confirmAge === "next" ? "NEXT DAY" : d.confirmAge === "day2" ? "DAY 2" : d.confirmAge === "day3" ? "DAY 3" : "") : "";
        const head = `<div class="board-cell week-day-head" data-week-date="${iso(dt)}" style="grid-column:1 / -1;"><strong>${names[i]} ${fmt(dt)}</strong>${age ? ` <span class="week-age">${age}</span>` : ""}</div>`;
        if (!d || !d.slots || !d.slots.length) return head + `<div class="board-cell week-empty" style="grid-column:1 / -1;">No appointments on the board</div>`;
        return head + d.slots.map((row) => `<div class="board-cell time">${row.time}</div>${reps.map((_, ri) => fbCell(row.cells[ri])).join("")}`).join("");
      }).join("");
      body = `
        ${viewToggle}
        <div class="board-week-nav" role="group" aria-label="Week">
          <button type="button" data-board-week="-1" aria-label="Previous week">‹ Prev week</button>
          <strong class="board-week-label">Week of ${rangeLabel}</strong>
          <button type="button" data-board-week="1" aria-label="Next week">Next week ›</button>
          ${state.boardWeekOffset ? `<button type="button" data-board-week="0">This board week</button>` : ""}
        </div>
        <div class="board-legend" aria-label="Color legend">
          ${legend.map((L) => `<span><i class="legend-dot dot-fb-${L.type}" style="background:${L.color}"></i>${L.label}</span>`).join("")}
        </div>
        <div class="board-scroll board-week-scroll">
          <div class="board-grid board-week-grid" role="grid" aria-label="Future Board week of ${rangeLabel}" style="grid-template-columns: 64px repeat(${reps.length}, minmax(124px, 1fr));">
            <div class="board-cell head">Time</div>
            ${fbRepHeads()}
            ${sections}
          </div>
        </div>
        <p style="margin:0.85rem 0 0;font-size:0.85rem;color:var(--text-muted);">Sunday–Saturday period week. Sample Homeowner names and 555 numbers only. Faded slots belong to the other office.</p>
      `;
    } else if (state.boardTab === "board" && day) {
      const ageClass = day.confirmAge === "next" ? "age-next" : day.confirmAge === "day2" ? "age-day2" : day.confirmAge === "day3" ? "age-day3" : "age-same";
      body = `
        ${viewToggle}
        <div class="board-day-pills" role="group" aria-label="Board day">
          ${days.map((d) => {
            const ac = d.confirmAge === "next" ? "age-next" : d.confirmAge === "day2" ? "age-day2" : d.confirmAge === "day3" ? "age-day3" : "age-same";
            return `<button type="button" class="${ac}" data-board-day="${d.id}" aria-pressed="${d.id === day.id}">${d.label} ${d.date.slice(5)}</button>`;
          }).join("")}
        </div>
        <div class="board-legend" aria-label="Color legend">
          ${legend.map((L) => `<span><i class="legend-dot dot-fb-${L.type}" style="background:${L.color}"></i>${L.label}</span>`).join("")}
        </div>
        <p style="margin:0 0 0.75rem;font-size:0.85rem;color:var(--text-muted);">
          Layout mirrors the office Future Board (rep columns · 10/12/2/4/6 · Excel colors). Sample Homeowner names and 555 numbers only — day pill color shows confirm age (next / day 2 / day 3).
        </p>
        <div class="board-scroll">
          <div class="board-grid" role="grid" aria-label="Future Board for ${day.label} ${day.date}" style="grid-template-columns: 88px repeat(${reps.length}, minmax(132px, 1fr));">
            <div class="board-cell head">Time</div>
            ${reps.map((r) => {
              const products = r.products || [];
              const opts = products.map((p) => `<option value="${p}">${p}</option>`).join("");
              return `<div class="board-cell head board-rep-head">
                <div class="rep-name">${r.name}</div>
                <span class="rep-city">🏠 ${r.city}</span>
                <label class="rep-products-label">
                  <span class="sr-only">Products ${r.name} sells</span>
                  <select class="rep-products" data-rep="${r.id}" aria-label="Products ${r.name} sells" title="Products this wrap sells">
                    <option value="">Products they sell (${products.length})</option>
                    ${opts}
                  </select>
                </label>
              </div>`;
            }).join("")}
            ${day.slots.map((row) => `
              <div class="board-cell time">${row.time}</div>
              ${row.cells.map((a) => {
                if (!a) {
                  return `<div class="board-cell"><div class="slot slot-fb-open">Open</div></div>`;
                }
                const dim = a.state && a.state !== state.office;
                const typ = a.type || "set";
                const main = a.label || a.lead || "";
                const sub = a.lead && a.type !== "unavailable" && a.type !== "product" && a.type !== "radius"
                  ? `${a.lead}${a.state ? " · " + a.state : ""}`
                  : (a.state ? a.state : "");
                return `<div class="board-cell ${dim ? "dimmed" : ""}">
                  <div class="slot slot-fb-${typ}">
                    ${main}
                    ${sub ? `<span class="sub">${sub}</span>` : ""}
                  </div>
                </div>`;
              }).join("")}
            `).join("")}
          </div>
        </div>
        <p style="margin:0.85rem 0 0;font-size:0.85rem;color:var(--text-muted);">
          Faded slots belong to the other office. Switch Michigan / Illinois at the top to focus one office. Day accent: <span class="${ageClass}" style="font-weight:700;">${day.confirmAge === "next" ? "NEXT DAY" : day.confirmAge === "day2" ? "DAY 2" : day.confirmAge === "day3" ? "DAY 3" : "SAME / later"}</span>
        </p>
      `;
    } else {
      body = `
        <div class="calendar-week">
          ${SampleData.calendarDays.map((d) => `
            <div class="cal-day ${d.count === 0 ? "empty" : ""}">
              <div class="d">${d.label}</div>
              <div class="c">${d.count === 0 ? "—" : d.count}</div>
              <div class="l">${d.count === 0 ? "Nothing booked" : "appointments"}</div>
            </div>
          `).join("")}
        </div>
      `;
    }

    $("#appointments-root").innerHTML = tabs + body;
    if (useFB) FutureBoard.render($("#fb-root"), { office: state.office });
    $$("[data-board-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.boardTab = btn.getAttribute("data-board-tab");
        renderAppointments();
      });
    });
    $$("[data-board-view]").forEach((btn) => {
      btn.addEventListener("click", () => { state.boardView = btn.getAttribute("data-board-view"); renderAppointments(); });
    });
    $$("[data-board-week]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = Number(btn.getAttribute("data-board-week"));
        state.boardWeekOffset = v === 0 ? 0 : state.boardWeekOffset + v;
        renderAppointments();
      });
    });
    $$("[data-board-day]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.boardDayId = btn.getAttribute("data-board-day");
        renderAppointments();
      });
    });
  }

  function salesResultTone(result) {
    const r = (result || "").toLowerCase();
    if (r.includes("sold")) return "sold";
    if (r.includes("demo")) return "demo";
    if (r.includes("no show")) return "noshow";
    if (r.includes("cancel") || r.includes("canx")) return "cancel";
    if (r.includes("not issued")) return "issue";
    if (r.includes("confirm")) return "confirm";
    if (r.includes("unconfirm") || r.includes("pending")) return "pending";
    return "neutral";
  }

  function filterSalesAppointments() {
    const day = SampleData.salesDay || {};
    const f = state.salesFilters;
    let rows = (day.appointments || []).filter((a) => a.state === state.office);
    const people = day.salespeople || [];
    if (f.hideInactive) {
      const activeNames = new Set(people.filter((p) => p.active).map((p) => p.name));
      rows = rows.filter((a) => activeNames.has(a.salesperson));
    }
    if (f.salesperson !== "all") rows = rows.filter((a) => a.salesperson === f.salesperson);
    if (f.appointmentType !== "all") rows = rows.filter((a) => a.appointmentType === f.appointmentType);
    if (f.appointmentResult !== "all") rows = rows.filter((a) => a.result === f.appointmentResult);
    if (f.division !== "all") rows = rows.filter((a) => a.division === f.division);
    /* dateRange "today" is the sample dataset itself */
    return rows;
  }

  function renderSales() {
    const day = SampleData.salesDay || {};
    const f = state.salesFilters;
    const rows = filterSalesAppointments();
    const people = (day.salespeople || []).filter((p) => !f.hideInactive || p.active);
    const rollups = (day.repRollups || []).filter((r) => r.state === state.office);
    const tagged = rows.filter((a) => a.tagged).length;
    state.salesTaggedCount = tagged;

    const typeOpts = (day.appointmentTypes || ["All"]).map((t) => {
      const v = t === "All" ? "all" : t;
      return `<option value="${v}">${t}</option>`;
    }).join("");
    const resultOpts = (day.appointmentResults || ["All"]).map((t) => {
      const v = t === "All" ? "all" : t;
      return `<option value="${v}">${t}</option>`;
    }).join("");
    const divOpts = (day.divisions || ["All"]).map((t) => {
      const v = t === "All" ? "all" : t;
      return `<option value="${v}">${t}</option>`;
    }).join("");
    const viewOpts = (day.views || ["Daily Results"]).map((t) =>
      `<option value="${t}">${t}</option>`
    ).join("");
    const spOpts = [`<option value="all">All</option>`]
      .concat(people.map((p) => `<option value="${p.name}">${p.name}${p.active ? "" : " (inactive)"}</option>`))
      .join("");

    const scoreboard = rollups.length ? `
      <div class="card card-pad sales-scoreboard">
        <div class="section-head" style="margin-bottom:0.65rem;">
          <div>
            <h2>Rep day summary · ${day.dateDisplay || "Today"}</h2>
            <p>Issued, demos, sold, no-shows, cancels, and issues for ${state.office === "IL" ? "Illinois" : "Michigan"} (sample).</p>
          </div>
        </div>
        <div class="table-wrap sales-scoreboard-table">
          <table class="data" aria-label="Per-rep day summary">
            <thead>
              <tr>
                <th>Salesperson</th>
                <th>Issued</th>
                <th>Demos</th>
                <th>Sold</th>
                <th>No Show</th>
                <th>Cancelled / TM CANX</th>
                <th>Issues (Not Issued)</th>
              </tr>
            </thead>
            <tbody>
              ${rollups.map((r) => `
                <tr class="no-row-click">
                  <td><strong>${r.salesperson}</strong></td>
                  <td>${r.issued}</td>
                  <td>${r.demos}</td>
                  <td><span class="status-pill sales-tone-sold">${r.sold}</span></td>
                  <td>${r.noShow}</td>
                  <td>${r.cancelled}</td>
                  <td>${r.issues}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    ` : "";

    const filters = `
      <div class="sales-filters card card-pad">
        <div class="sales-filters-grid">
          <label class="sales-field">
            <span>View</span>
            <select class="select" id="sales-filter-view" aria-label="Saved view">${viewOpts}</select>
          </label>
          <label class="sales-field">
            <span>Salesperson</span>
            <select class="select" id="sales-filter-sp" aria-label="Salesperson">${spOpts}</select>
          </label>
          <label class="sales-field sales-check">
            <span>&nbsp;</span>
            <label class="check-inline"><input type="checkbox" id="sales-hide-inactive" ${f.hideInactive ? "checked" : ""} /> Hide inactive salespeople</label>
          </label>
          <label class="sales-field">
            <span>Date range</span>
            <select class="select" id="sales-filter-date" aria-label="Date range">
              <option value="today">Today’s Appointments</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This week</option>
            </select>
          </label>
          <label class="sales-field">
            <span>Appointment type</span>
            <select class="select" id="sales-filter-type" aria-label="Appointment type">${typeOpts}</select>
          </label>
          <label class="sales-field">
            <span>Appointment result</span>
            <select class="select" id="sales-filter-result" aria-label="Appointment result">${resultOpts}</select>
          </label>
          <label class="sales-field">
            <span>Division</span>
            <select class="select" id="sales-filter-div" aria-label="Division">${divOpts}</select>
          </label>
          <div class="sales-filter-actions">
            <button type="button" class="btn btn-ghost btn-sm" id="sales-clear-filters">Clear filters</button>
            <button type="button" class="btn btn-ghost btn-sm" id="sales-refresh" title="Sample refresh">↻ Refresh</button>
          </div>
        </div>
        <div class="sales-tagged-box" aria-label="Tagged appointments">
          <strong>${tagged} Tagged</strong>
          <div class="sales-tagged-links">
            <button type="button" class="linkish" disabled title="Sample only">Tag All Filtered</button>
            <button type="button" class="linkish" disabled title="Sample only">Untag All</button>
            <button type="button" class="linkish" disabled title="Sample only">Email &amp; Issue Tagged</button>
          </div>
        </div>
      </div>
    `;

    const toolbar = `
      <div class="sales-toolbar">
        <span class="sales-count"><strong>${rows.length}</strong> Sales Appointments · ${day.dateDisplay || "Today"} · ${state.office === "IL" ? "Illinois" : "Michigan"}</span>
        <div class="sales-toolbar-right">
          <label class="sales-display">Display
            <select class="select" aria-label="Page size" disabled>
              <option>200</option>
            </select>
          </label>
          <button type="button" class="btn btn-ghost btn-sm" disabled title="Sample only">Export</button>
        </div>
      </div>
    `;

    const table = rows.length ? `
      <div class="table-wrap">
        <table class="data sales-table" aria-label="Sales appointments Daily Results">
          <thead>
            <tr>
              <th class="col-check"><span class="sr-only">Select</span></th>
              <th class="col-actions">Actions</th>
              <th>Last Name</th>
              <th>First Name</th>
              <th>Type</th>
              <th>Appointment Type</th>
              <th>Salesperson</th>
              <th>Appointment Set Date</th>
              <th>Appointment Date</th>
              <th>Inquiry Address</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((a) => `
              <tr class="no-row-click" data-sales-id="${a.id}">
                <td class="col-check"><input type="checkbox" ${a.tagged ? "checked" : ""} aria-label="Tag ${a.lastName}" disabled /></td>
                <td class="col-actions">
                  <button type="button" class="icon-btn sales-action" disabled title="Edit (sample)">✎</button>
                  <button type="button" class="icon-btn sales-action" disabled title="More (sample)">⋯</button>
                  <button type="button" class="icon-btn sales-action" disabled title="Delete (sample)">🗑</button>
                </td>
                <td><button type="button" class="linkish sales-name">${a.lastName}</button></td>
                <td><button type="button" class="linkish sales-name">${a.firstName}</button></td>
                <td><span class="type-chip type-chip-${(a.typeChip || "L").replace("/", "")}">${a.typeChip}</span></td>
                <td>${a.appointmentType}</td>
                <td>${a.salesperson}</td>
                <td>${a.setDateDisplay}</td>
                <td>${a.apptDateDisplay}</td>
                <td>${a.address}${a.city ? ", " + a.city : ""}</td>
                <td><span class="status-pill sales-tone-${salesResultTone(a.result)}">${a.result}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : `<div class="empty-state card card-pad"><strong>No sales appointments match these filters</strong>Try Clear filters, or switch office at the top.</div>`;

    $("#sales-root").innerHTML = `
      <div class="sales-subnav" role="tablist">
        <button type="button" role="tab" aria-selected="true" data-sales-sub="daily">Daily Results</button>
      </div>
      ${scoreboard}
      ${filters}
      ${toolbar}
      ${table}
      <p class="sales-footnote">Sample data only — not connected to a live CRM. Layout inspired by a Sales List Daily Results board; Infinity Home Improvement Command Center styling.</p>
    `;

    const setSel = (id, val) => { const el = $(id); if (el) el.value = val; };
    setSel("#sales-filter-view", f.view);
    setSel("#sales-filter-sp", f.salesperson);
    setSel("#sales-filter-date", f.dateRange);
    setSel("#sales-filter-type", f.appointmentType);
    setSel("#sales-filter-result", f.appointmentResult);
    setSel("#sales-filter-div", f.division);

    const bind = (id, key) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("change", (e) => {
        state.salesFilters[key] = e.target.value;
        renderSales();
      });
    };
    bind("#sales-filter-view", "view");
    bind("#sales-filter-sp", "salesperson");
    bind("#sales-filter-date", "dateRange");
    bind("#sales-filter-type", "appointmentType");
    bind("#sales-filter-result", "appointmentResult");
    bind("#sales-filter-div", "division");

    const hide = $("#sales-hide-inactive");
    if (hide) {
      hide.addEventListener("change", (e) => {
        state.salesFilters.hideInactive = e.target.checked;
        if (state.salesFilters.salesperson !== "all") {
          const pool = (day.salespeople || []).filter((p) => !e.target.checked || p.active);
          if (!pool.find((p) => p.name === state.salesFilters.salesperson)) {
            state.salesFilters.salesperson = "all";
          }
        }
        renderSales();
      });
    }
    const clearBtn = $("#sales-clear-filters");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        state.salesFilters = {
          view: "Daily Results",
          salesperson: "all",
          hideInactive: true,
          dateRange: "today",
          appointmentType: "all",
          appointmentResult: "all",
          division: "all"
        };
        renderSales();
      });
    }
    const refreshBtn = $("#sales-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => renderSales());
    }
  }

  /* Activity = three tabs: the to-do list (v8/v9), What each person did (v13, cross-system), Texts sent (v12 log) */
  function renderActivity() {
    const root = $("#activity-root");
    if (!root || !window.ActivityView) return;
    const user = currentUser();
    const isManager = !!(user && user.role === "Manager");
    let scopeId = user ? user.id : "ALL";
    if (isManager) scopeId = state.activityScope || state.viewAsId || "ALL";
    const scopeUser = (SampleData.users || []).find((u) => u.id === scopeId);
    const tab = window.PeopleLog ? (state.activityTab || "list") : "list";
    const tabs = [
      { id: "list", label: isManager ? "Activities" : "My activities", tip: "Open and completed MarketSharp activities (calls, texts, emails, to-dos)." },
      { id: "people", label: isManager ? "What each person did" : "What I did", tip: "Every action across Access, MarketSharp and Hatch, with who did it and when." },
      { id: "texts", label: "Texts sent", tip: "Every text sent — who sent it, which system, and whether the customer opened it." }
    ];
    root.innerHTML = `<div class="act-tabs" role="tablist" aria-label="Activity views">${tabs.map((t) => `<button type="button" role="tab" class="act-tab ${t.id === tab ? "active" : ""}" aria-selected="${t.id === tab}" data-act-tab="${t.id}" title="${t.tip}">${t.label}</button>`).join("")}</div><div id="act-pane" role="tabpanel"></div>`;
    root.querySelectorAll("[data-act-tab]").forEach((b) => b.addEventListener("click", () => { state.activityTab = b.getAttribute("data-act-tab"); renderActivity(); }));
    const pane = $("#act-pane");
    const openThread = (id) => { state.selectedStlId = id; navigate("speed", { stlId: id }); window.scrollTo(0, 0); };
    if (tab === "people") {
      PeopleLog.renderActions(pane, {
        scopeId, isManager, office: state.office,
        presetUserId: isManager && scopeId !== "ALL" ? scopeId : null,
        onOpenLead: (leadId) => openLeadDrawer(leadId), onOpenThread: openThread,
        onOpenTexts: () => { state.activityTab = "texts"; renderActivity(); }
      });
      return;
    }
    if (tab === "texts") {
      PeopleLog.renderTexts(pane, { scopeId, isManager, office: state.office, onOpenThread: openThread });
      return;
    }
    const note = !isManager && user && !user.marketer
      ? `<p class="card card-pad act-note">Sample activities are seeded for the marketers so far. In the live version, ${user.role === "Confirmer" ? "your Confirm Appointment calls and reminders" : "your assigned activities"} show here. Your confirms and status changes already show under “What I did”.</p>`
      : "";
    ActivityView.render(pane, {
      userId: scopeId,
      userName: scopeUser ? scopeUser.name : "Team",
      ownView: !isManager,
      isManager,
      note,
      marketers: marketerUsers(),
      office: state.office,
      onScope: (id) => { state.activityScope = id; renderActivity(); },
      onOpenLead: (leadId) => openLeadDrawer(leadId)
    });
  }

  function renderSpeedToLead() {
    const root = $("#speed-root");
    if (!root || !window.SpeedToLead) return;
    const user = currentUser();
    const isManager = !!(user && user.role === "Manager");
    const scopeId = isManager ? (state.stlScope || state.viewAsId || "ALL") : (user ? user.id : "ALL");
    const note = !isManager && user && !user.marketer
      ? `<p class="card card-pad act-note">Sample texts are generated for the marketers. You’re seeing the older shared sample inbox; in the live version, your own conversations show here.</p>`
      : "";
    SpeedToLead.render(root, {
      user, isManager, scopeId, note,
      marketers: marketerUsers(),
      office: state.office,
      selectedId: state.selectedStlId,
      details: state.stlDetails,
      onScope: (id) => { state.stlScope = id; state.selectedStlId = null; setHash("speed"); renderSpeedToLead(); },
      onSelect: (id) => { state.selectedStlId = id; setHash("speed", id || null); renderSpeedToLead(); window.scrollTo(0, 0); },
      onToggleDetails: (on) => { state.stlDetails = on; renderSpeedToLead(); },
      onOpenLead: (t) => {
        if (t.leadId) { openLeadDrawer(t.leadId); return; }
        const lead = (SampleData.leads || []).find((l) => l.name === t.leadName || (l.phones || []).some((p) => p.number === t.leadPhone));
        if (lead) openLeadDrawer(lead.id);
        else if (window.ActivityView) ActivityView.toast("No customer profile in the sample for this lead.");
      }
    });
  }

  function renderMessages() {
    const threads = SampleData.conversations.filter((c) => c.state === state.office);
    if (!state.selectedThreadId || !threads.find((t) => t.id === state.selectedThreadId)) {
      state.selectedThreadId = threads[0] ? threads[0].id : null;
    }
    const active = threads.find((t) => t.id === state.selectedThreadId);

    if (!threads.length) {
      $("#messages-root").innerHTML = `
        <p class="card card-pad" style="margin-bottom:1rem;">
          Looking for open/read tracking and who sent each text?
          <button type="button" class="btn btn-primary btn-sm" id="goto-speed" style="margin-left:0.5rem;">Open Speed to Lead</button>
        </p>
        <div class="empty-state card card-pad"><strong>No open text threads</strong>Nothing to reply to for this office right now.</div>`;
      const g = $("#goto-speed");
      if (g) g.addEventListener("click", () => navigate("speed"));
      return;
    }

    $("#messages-root").innerHTML = `
      <p class="card card-pad" style="margin-bottom:1rem;">
        Simple inbox view. For <strong>who sent</strong>, <strong>opened/unopened</strong>, and <strong>user activity</strong>, use
        <button type="button" class="btn btn-primary btn-sm" id="goto-speed" style="margin-left:0.35rem;">Speed to Lead</button>
      </p>
      <div class="messages-layout">
        <div class="thread-list" role="listbox" aria-label="Text conversations">
          ${threads.map((t) => `
            <button type="button" class="thread-item ${t.id === state.selectedThreadId ? "active" : ""}" data-thread="${t.id}" role="option" aria-selected="${t.id === state.selectedThreadId}">
              <div class="name">
                <span>${t.name}</span>
                ${t.unread ? '<span class="unread-dot" aria-label="Unread"></span>' : ""}
              </div>
              <div class="preview">${t.preview}</div>
              <div style="margin-top:0.35rem">${badge(t.system)}</div>
            </button>
          `).join("")}
        </div>
        <div class="thread-pane">
          ${active ? `
            <div class="thread-pane-head">
              <strong>${active.name}</strong>
              <div style="margin-top:0.35rem">${badge(active.system)} · Sample thread</div>
            </div>
            <div class="thread-pane-body">
              ${active.messages.map((m) => `
                <div class="bubble ${m.from}">
                  ${m.text}
                  <span class="t">${m.time}</span>
                </div>
              `).join("")}
            </div>
            <div class="thread-pane-foot">
              <label class="sr-only" for="msg-compose">Type a reply</label>
              <input id="msg-compose" type="text" placeholder="Type a reply (demo — not sent)…" />
              <button type="button" class="btn btn-primary btn-sm" style="width:auto;" id="msg-send">Send</button>
            </div>
          ` : `<div class="empty-state"><strong>Pick a conversation</strong>Select a thread on the left.</div>`}
        </div>
      </div>
    `;

    $$("[data-thread]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedThreadId = btn.getAttribute("data-thread");
        renderMessages();
      });
    });
    const g2 = $("#goto-speed");
    if (g2) g2.addEventListener("click", () => navigate("speed"));
    const send = $("#msg-send");
    if (send) {
      send.addEventListener("click", () => {
        alert("Sample only — messages are not sent from this design draft.");
      });
    }
  }

  function renderMarketing() {
    $("#marketing-root").innerHTML = `
      <div class="campaign-grid">
        ${SampleData.campaigns.map((c) => `
          <article class="card card-pad campaign-card">
            <div style="margin-bottom:0.5rem">${badge(c.system)}
              <span class="status-pill" style="margin-left:0.35rem">${c.status}</span>
            </div>
            <h3>${c.name}</h3>
            <p>${c.metric}</p>
            <p>${c.voice}</p>
          </article>
        `).join("")}
      </div>
      <p style="margin:1rem 0 0;font-size:0.85rem;color:var(--text-muted);">
        These are placeholders. Live GoHighLevel wiring is intentionally not connected in this draft.
      </p>
    `;
  }

  /* ——— Reports catalog (Access) ——— */
  function currentPeriod() {
    if (state.selectedPeriodId) {
      return SampleData.periods.find((p) => p.id === state.selectedPeriodId) || SampleData.periods[0];
    }
    return SampleData.periods.find((p) => p.current) || SampleData.periods[0];
  }

  function dateModeBadge(modeId) {
    const m = AccessReports.getDateMode(modeId);
    return `<span class="date-badge date-badge-${modeId}" title="${m.tip}">${m.badge}</span>`;
  }

  function renderReports() {
    const period = currentPeriod();
    const groups = AccessReports.getGroups();
    const list = AccessReports.search(state.reportQuery, state.reportGroup, state.reportPrimaryOnly);
    const corrupted = AccessReports.getCorruptedCount();
    const officeLabel = state.office === "IL" ? "Illinois" : "Michigan";

    const byGroup = {};
    groups.forEach((g) => { byGroup[g.id] = []; });
    list.forEach((rep) => {
      if (!byGroup[rep.group]) byGroup[rep.group] = [];
      byGroup[rep.group].push(rep);
    });

    let sections = "";
    groups.forEach((g) => {
      const items = byGroup[g.id] || [];
      if (!items.length) return;
      sections += `
        <section class="report-group" aria-labelledby="rg-${g.id}">
          <div class="report-group-head">
            <h3 id="rg-${g.id}">${g.label}</h3>
            <p>${g.tip}</p>
          </div>
          <div class="report-tiles">
            ${items.map((rep) => `
              <button type="button" class="report-tile ${rep.priority === "primary" ? "report-tile-primary" : ""}" data-open-report="${rep.id}">
                <div class="report-tile-top">
                  ${dateModeBadge(rep.dateMode)}
                  ${rep.corruptedMI ? '<span class="corrupt-badge" title="Michigan Access: these lead-activity-by-source queries hang until back-end indexes are restored. Illinois is fine.">Needs repair in Access</span>' : ""}
                </div>
                <h3>${rep.plainName}</h3>
                <p class="report-access-name" title="${rep.accessName}">Access: ${rep.accessName}</p>
                <p>${rep.tip}</p>
                ${rep.openQuestion ? `<p class="report-open-q">Open question: ${rep.openQuestion}</p>` : ""}
              </button>
            `).join("")}
          </div>
        </section>
      `;
    });

    if (!sections) {
      sections = `<div class="empty-state card card-pad"><strong>No reports match</strong>Try clearing the search or picking All groups.</div>`;
    }

    $("#reports-root").innerHTML = `
      <div class="section-head reports-toolbar">
        <div>
          <h2>Access reports · ${officeLabel}</h2>
          <p>
            Curated from the Access reports map (not all ${officeLabel === "Michigan" ? "384" : "383"} objects).
            ${corrupted} cards marked <strong>Needs repair in Access</strong> (MI lead-activity-by-source).
            Sample previews only.
          </p>
        </div>
        <label class="sr-only" for="period-pick">Period</label>
        <select id="period-pick" class="select" style="width:auto;min-width:220px;" title="Sunday–Saturday fiscal period">
          ${SampleData.periods.map((p) => `<option value="${p.id}" ${p.id === period.id ? "selected" : ""}>${p.label} (${p.start} → ${p.end})</option>`).join("")}
        </select>
      </div>

      <div class="filters report-filters">
        <input type="search" class="input" id="report-search" placeholder="Search reports by name…" value="${state.reportQuery.replace(/"/g, "&quot;")}" aria-label="Search reports" />
        <select class="select" id="report-group-filter" aria-label="Filter by group">
          <option value="all">All groups</option>
          ${groups.map((g) => `<option value="${g.id}" ${state.reportGroup === g.id ? "selected" : ""}>${g.label}</option>`).join("")}
        </select>
        <label class="check-inline">
          <input type="checkbox" id="report-primary-only" ${state.reportPrimaryOnly ? "checked" : ""} />
          Most-used only
        </label>
        <span class="filter-count">${list.length} shown</span>
      </div>

      <div class="legend-row">
        <span class="date-badge date-badge-period">Period</span>
        <span class="date-badge date-badge-snapshot">Snapshot</span>
        <span class="date-badge date-badge-endOnly">End date only</span>
        <span class="date-badge date-badge-range">Date range</span>
        <span class="corrupt-badge">Needs repair in Access</span>
      </div>

      ${sections}
    `;

    $("#period-pick").addEventListener("change", (e) => {
      state.selectedPeriodId = e.target.value;
    });
    $("#report-search").addEventListener("input", (e) => {
      state.reportQuery = e.target.value;
      renderReports();
      const inp = $("#report-search");
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    });
    $("#report-group-filter").addEventListener("change", (e) => {
      state.reportGroup = e.target.value;
      renderReports();
    });
    $("#report-primary-only").addEventListener("change", (e) => {
      state.reportPrimaryOnly = e.target.checked;
      renderReports();
    });
    $$("[data-open-report]").forEach((btn) => {
      btn.addEventListener("click", () => openReportPreview(btn.getAttribute("data-open-report")));
    });
  }

  function openReportPreview(id) {
    const rep = AccessReports.getById(id);
    if (!rep) return;
    state.selectedReportId = id;
    setHash("reports", id);
    const period = currentPeriod();
    const mode = AccessReports.getDateMode(rep.dateMode);
    const officeLabel = state.office === "IL" ? "Illinois" : "Michigan";

    $("#report-modal-title").textContent = rep.plainName;
    $("#report-modal-sub").innerHTML = `
      ${badge("Access")} · ${officeLabel}
      ${dateModeBadge(rep.dateMode)}
      ${rep.corruptedMI ? '<span class="corrupt-badge">Needs repair in Access</span>' : ""}
      <br/><span style="color:var(--text-faint)">Access name: ${rep.accessName}</span>
    `;

    let body = "";
    body += `<p class="modal-tip">${rep.tip}</p>`;
    if (rep.openQuestion) {
      body += `<p class="report-open-q">Open question for Thomas: ${rep.openQuestion}</p>`;
    }

    /* Date range stub */
    body += `
      <div class="preview-dates card-pad" style="background:var(--bg-muted);border-radius:var(--radius-sm);margin-bottom:1rem;">
        <strong style="display:block;margin-bottom:0.5rem;font-size:0.9rem;">Date range (sample stub)</strong>
        <div class="filters" style="margin:0;">
          <label>Period
            <select class="select" disabled title="Uses the period picker on the Reports page">
              <option>${period.label} (${period.start} → ${period.end})</option>
            </select>
          </label>
          <span style="font-size:0.85rem;color:var(--text-muted);align-self:center;">${mode.tip}</span>
        </div>
        ${rep.dateMode === "snapshot" ? '<p style="margin:0.5rem 0 0;font-size:0.85rem;color:var(--warn);">Snapshot report — period heading is ignored in Access.</p>' : ""}
        ${rep.dateMode === "endOnly" ? '<p style="margin:0.5rem 0 0;font-size:0.85rem;color:var(--text-muted);">Access asks for an end date only.</p>' : ""}
        ${rep.dateMode === "spiff" ? '<p style="margin:0.5rem 0 0;font-size:0.85rem;color:var(--text-muted);">SPIFF also needs a year-beginning date.</p>' : ""}
      </div>
    `;

    if (rep.corruptedMI && state.office === "MI") {
      body += `<div class="corrupt-banner">Michigan: this lead-activity-by-source report hangs in live Access until APPOINTMENTS/LEAD indexes are restored (see reports-map/mi-vs-il-corrupted.md). Sample preview below is fake data so you can still review the UI. Illinois runs the same report fine.</div>`;
    }

    if (rep.previewType === "empty") {
      body += `<div class="empty-state card card-pad"><strong>No pending cancels</strong>Nothing in this sample period. (Access used to show #Error here — we show a clean empty state instead.)</div>`;
    } else {
      body += `
        <div class="table-wrap">
          <table class="data" aria-label="Sample preview">
            <thead><tr>${(rep.sampleColumns || []).map((c) => `<th>${c}</th>`).join("")}</tr></thead>
            <tbody>
              ${(rep.sampleRows || []).map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
        <p class="sample-note">Sample Homeowner rows · round fake dollars labeled “sample” · not live Access data.</p>
      `;
      if (rep.previewType === "chart") {
        body += `<div class="chart-placeholder">Chart placeholder (no chart library in this draft)</div>`;
      }
    }

    $("#report-modal-body").innerHTML = body;
    const modal = $("#report-modal");
    const backdrop = $("#report-modal-backdrop");
    modal.hidden = false;
    modal.classList.add("open");
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    $("#report-modal-close").focus();
  }

  function closeReportModal() {
    const modal = $("#report-modal");
    const backdrop = $("#report-modal-backdrop");
    modal.classList.remove("open");
    modal.hidden = true;
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    if (state.view === "reports") setHash("reports");
  }

  /* ——— Connections / Integrations ——— */
  function statusPill(status, tone) {
    return `<span class="conn-status conn-status-${tone || "ok"}">${status}</span>`;
  }

  function renderIntegrations() {
    const groups = IntegrationsCatalog.getGroups();
    let html = `
      <div class="section-head">
        <div>
          <h2>Connections</h2>
          <p>Where leads and messages come from, and how systems talk to each other. Sample status only — nothing is live.</p>
        </div>
      </div>
    `;

    groups.forEach((g) => {
      const items = IntegrationsCatalog.byGroup(g.id);
      html += `
        <section class="report-group" aria-labelledby="ig-${g.id}">
          <div class="report-group-head">
            <h3 id="ig-${g.id}">${g.label}</h3>
            <p>${g.tip}</p>
          </div>
          <div class="conn-grid">
            ${items.map((it) => `
              <article class="card card-pad conn-card">
                <div class="conn-card-top">
                  <h3>${it.name}</h3>
                  ${statusPill(it.status, it.statusTone)}
                </div>
                <p class="conn-blurb">${it.blurb}</p>
                <p class="conn-detail">${it.detail}</p>
                ${it.openQuestion ? '<p class="report-open-q">Confirm details with Thomas</p>' : ""}
                <button type="button" class="btn btn-secondary btn-sm" style="width:auto;margin-top:0.75rem;" data-conn-open="${it.id}" data-conn-href="${it.openHref}">${it.openLabel}</button>
              </article>
            `).join("")}
          </div>
        </section>
      `;
    });

    $("#integrations-root").innerHTML = html;

    $$("[data-conn-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const href = btn.getAttribute("data-conn-href") || "";
        const id = btn.getAttribute("data-conn-open");
        setHash("integrations", id);
        if (href === "#reports") navigate("reports");
        else if (href === "#messages") navigate("messages");
        else if (href === "#speed") navigate("speed");
        else if (href === "#marketing") navigate("marketing");
        else if (href === "#appointments") navigate("appointments");
        else {
          const item = IntegrationsCatalog.getById(id);
          alert((item ? item.name + "\n\n" + item.detail : "Sample only") + "\n\nNo live deep-link in this design draft.");
        }
      });
    });
  }

  function renderAudit() {
    $("#audit-root").innerHTML = `
      <ul class="audit-list card card-pad">
        ${SampleData.audit.map((a) => `
          <li>
            <div class="when">${a.when}</div>
            <div>
              <div class="who">${a.who}</div>
              <div>${a.action}</div>
              <div class="detail">${a.detail}</div>
            </div>
          </li>
        `).join("")}
      </ul>
    `;
  }

  function renderSettings() {
    $("#settings-root").innerHTML = `
      <div class="settings-grid">
        <div class="card card-pad settings-card">
          <h3>Appearance</h3>
          <p>Light for the office; dark for late confirm calls.</p>
          <div class="toggle-row">
            <span>Dark mode</span>
            <button type="button" class="switch" role="switch" data-theme-toggle aria-checked="${state.theme === "dark"}" aria-label="Dark mode"></button>
          </div>
        </div>
        <div class="card card-pad settings-card">
          <h3>Default office</h3>
          <p>After login, open this office first. Michigan and Illinois data stay separate.</p>
          <select class="select" id="settings-office" aria-label="Default office">
            <option value="MI">Michigan</option>
            <option value="IL">Illinois</option>
          </select>
        </div>
        <div class="card card-pad settings-card">
          <h3>AI connection</h3>
          <p>Paste an API key when AI features go live. Nothing is stored on a server in this draft.</p>
          <label class="sr-only" for="ai-key">AI API key</label>
          <input class="input" id="ai-key" type="password" placeholder="sk-sample-not-a-real-key" autocomplete="off" />
          <p class="hint" style="margin-top:0.5rem;font-size:0.8rem;color:var(--text-faint);">Placeholder only — do not paste real secrets into this prototype.</p>
        </div>
        <div class="card card-pad settings-card">
          <h3>About this draft</h3>
          <p><strong>Infinity Home Improvement Command Center</strong>. Sample data only. Not connected to MarketSharp, Hatch, GoHighLevel, or Access. Leap is out of scope.</p>
        </div>
      </div>
    `;
    $("#settings-office").value = state.office;
    $("#settings-office").addEventListener("change", (e) => setOffice(e.target.value));
    $("[data-theme-toggle]", $("#settings-root")).addEventListener("click", () => {
      applyTheme(state.theme === "dark" ? "light" : "dark");
    });
  }

  function parseHash() {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return null;
    const parts = raw.split("/");
    return { view: parts[0], sub: parts[1] || null };
  }

  function showLoginError(msg) {
    const el = $("#login-error");
    if (msg) syncLoginHint();
    if (!el) return false;
    el.textContent = msg || "";
    el.hidden = !msg;
    return false;
  }

  /* small line under the email: who it belongs to, or that it doesn't match the list */
  function syncLoginHint() {
    const el = $("#email-match");
    const emailEl = $("#email"), sel = $("#login-user");
    if (!el || !emailEl || !sel) return;
    const v = emailEl.value.trim();
    const u = v ? userFromEmail(v) : null;
    const picked = (SampleData.users || []).find((x) => x.id === sel.value);
    if (!v) { el.textContent = "Pick your name below and your email fills in."; el.className = "hint"; return; }
    if (!u) { el.textContent = "No sample staff member uses this email."; el.className = "hint hint-warn"; return; }
    if (picked && picked.id !== u.id) { el.textContent = "This email belongs to " + u.name + "."; el.className = "hint hint-warn"; return; }
    el.textContent = "Signing in as " + u.name + " (" + (u.roleLabel || u.role) + ").";
    el.className = "hint hint-ok";
  }

  function populateLoginUsers(sel) {
    const users = SampleData.users || [];
    const groups = [
      ["Marketers (personal Home)", (u) => u.marketer],
      ["Managers", (u) => !u.marketer && u.role === "Manager"],
      ["Confirmers", (u) => !u.marketer && u.role === "Confirmer"],
      ["Data processors", (u) => !u.marketer && u.role === "Data processor"],
      ["Setters (generic sample)", (u) => !u.marketer && u.role === "Setter"],
      /* v16: sales reps are listed only on the PHONE sign-in (the phone app is for reps; desktop picker unchanged) */
      ["Sales reps", (u) => !!(window.IHIMobile && IHIMobile.isPhone()) && !u.marketer && (u.rep === true || (window.IHIPages && IHIPages.roleKey(u.role) === "salesrep"))]
    ];
    sel.innerHTML = groups.map(([label, pred]) => {
      const list = users.filter(pred);
      if (!list.length) return "";
      return `<optgroup label="${label}">${list.map((u) => `<option value="${u.id}">${u.name} — ${u.roleLabel || u.role}</option>`).join("")}</optgroup>`;
    }).join("");
  }

  /* v16 — one sign-out path (top-bar button, phone menu, phone cards, 30-min idle timer). */
  function signOut(reason) {
    closeReportModal();
    closeDrawer();
    state.viewAsId = null;
    state.activityScope = null;
    state.stlScope = null;
    state.selectedStlId = null;
    state.activityTab = "list";
    const note = $("#login-notice");
    if (note) {
      note.textContent = reason === "idle" ? "Signed out after " + ((window.IHIShell && IHIShell.IDLE_MINUTES) || 30) + " minutes of no activity." : "";
      note.hidden = reason !== "idle";
    }
    showScreen("screen-login");
    document.dispatchEvent(new CustomEvent("ihi:signout", { detail: { reason: reason || "manual" } }));
  }

  function bindGlobal() {
    $("#login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      /* v15: the email and the staff picker must name the same person (Thomas 2026-10-07). */
      const emailEl = $("#email");
      const email = ((emailEl && emailEl.value) || "").trim();
      const pick = $("#login-user") ? $("#login-user").value : null;
      const picked = (SampleData.users || []).find((u) => u.id === pick) || null;
      const mapped = email ? userFromEmail(email) : null;
      let who = null;
      if (!email && picked) who = picked;
      else if (email && !mapped) return showLoginError("No sample staff member uses " + email + ". Pick your name from the list and your email fills in by itself.");
      else if (mapped && picked && mapped.id !== picked.id) return showLoginError("That email belongs to " + mapped.name + ", but the list says " + picked.name + ". Pick one person, then sign in.");
      else who = mapped || picked;
      if (!who) return showLoginError("Pick your name from the list.");
      showLoginError("");
      const note = $("#login-notice"); if (note) note.hidden = true;
      setUser(who.id);
      const office = $("[data-office-btn][aria-pressed='true']");
      if (office) setOffice(office.getAttribute("data-office-btn"));
      updateUserChip();
      showScreen("screen-app");
      document.dispatchEvent(new CustomEvent("ihi:signin"));
      const h = parseHash();
      if (h && h.view && h.view !== "login") {
        navigate(h.view, {
          reportId: h.view === "reports" ? h.sub : null,
          integrationId: h.view === "integrations" ? h.sub : null,
          stlId: h.view === "speed" ? h.sub : null
        });
        if (h.view === "speed" && h.sub) state.selectedStlId = h.sub;
      } else {
        navigate("home");
      }
    });

    $$("[data-office-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inLogin = btn.closest("#screen-login");
        if (inLogin) {
          $$("#screen-login [data-office-btn]").forEach((b) => {
            b.setAttribute("aria-pressed", b === btn ? "true" : "false");
          });
        } else {
          setOffice(btn.getAttribute("data-office-btn"));
        }
      });
    });

    $$(".topbar [data-office-btn]").forEach((btn) => {
      btn.addEventListener("click", () => setOffice(btn.getAttribute("data-office-btn")));
    });

    $$(".nav-btn[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => { const v = btn.getAttribute("data-view"); navigate(v, v === "speed" ? { stlId: null } : undefined); });
    });

    const loginUser = $("#login-user");
    const emailInput = $("#email");
    if (loginUser) {
      populateLoginUsers(loginUser);
      loginUser.value = state.userId;
      /* v16: last user was a phone-only sales rep but this is the desktop picker → start from the first listed person */
      if (loginUser.value !== state.userId && loginUser.options.length) {
        loginUser.selectedIndex = 0;
        const first = (SampleData.users || []).find((x) => x.id === loginUser.value);
        if (first && emailInput) emailInput.value = first.email || "";
      }
      /* picking a person fills in their email (kept in sync) */
      loginUser.addEventListener("change", () => {
        const u = (SampleData.users || []).find((x) => x.id === loginUser.value);
        if (u && emailInput) emailInput.value = u.email;
        showLoginError("");
        syncLoginHint();
      });
    }
    /* v16: re-fill the picker when crossing the phone breakpoint (Sales reps group is phone-only) */
    document.addEventListener("ihi:layout", () => {
      if (!loginUser) return;
      const keep = loginUser.value;
      populateLoginUsers(loginUser);
      loginUser.value = keep;
      if (loginUser.value !== keep && loginUser.options.length) {
        loginUser.selectedIndex = 0;
        const u = (SampleData.users || []).find((x) => x.id === loginUser.value);
        if (u && emailInput) emailInput.value = u.email;
      }
      syncLoginHint();
    });
    if (emailInput) {
      /* typing an email selects the matching person as soon as it matches */
      const onEmail = () => {
        const u = userFromEmail(emailInput.value);
        if (u && loginUser) loginUser.value = u.id;
        showLoginError("");
        syncLoginHint();
      };
      emailInput.addEventListener("input", onEmail);
      emailInput.addEventListener("change", onEmail);
    }

    $$("[data-theme-toggle]").forEach((el) => {
      if (el.closest("#settings-root")) return;
      el.addEventListener("click", () => applyTheme(state.theme === "dark" ? "light" : "dark"));
    });

    $("#btn-logout").addEventListener("click", () => signOut());

    $(".drawer-backdrop").addEventListener("click", closeDrawer);
    $("#drawer-close").addEventListener("click", closeDrawer);
    $("#report-modal-backdrop").addEventListener("click", closeReportModal);
    $("#report-modal-close").addEventListener("click", closeReportModal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (window.ActivityView) ActivityView.closePicker();
        const drawerOpen = $(".drawer") && $(".drawer").classList.contains("open");
        if (!drawerOpen && state.view === "speed" && state.selectedStlId && !(e.target && e.target.id === "stl3-reply")) {
          state.selectedStlId = null; setHash("speed"); renderSpeedToLead();
        }
        closeDrawer();
        closeReportModal();
      }
    });

    const menuBtn = $("#menu-toggle");
    if (menuBtn) {
      menuBtn.addEventListener("click", () => $(".sidebar").classList.toggle("open"));
    }

    window.addEventListener("hashchange", () => {
      if (!$("#screen-app").classList.contains("active")) return;
      const h = parseHash();
      if (!h || !h.view) return;
      if (h.view === state.view && h.view === "reports" && h.sub) {
        openReportPreview(h.sub);
      } else {
        navigate(h.view, { skipHash: true, reportId: h.view === "reports" ? h.sub : null, stlId: h.view === "speed" ? (h.sub || null) : undefined });
      }
    });
  }

  function init() {
    if (!SampleData.users || !SampleData.users.find((u) => u.id === state.userId)) {
      state.userId = (SampleData.users && SampleData.users[0].id) || "u-manager";
    }
    state.theme = readTheme(state.userId);
    applyTheme(state.theme);
    setOffice(state.office);
    updateUserChip();
    $$("#screen-login [data-office-btn]").forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-office-btn") === state.office ? "true" : "false");
    });
    const lu = $("#login-user");
    if (lu) lu.value = state.userId;
    const em = $("#email");
    const cu = currentUser();
    if (em && cu) em.value = cu.email;
    bindGlobal();
    syncLoginHint();
    /* v16: light demo passcode gate (js/mobile-shell.js) comes before sign-in */
    showScreen(window.IHIShell && !IHIShell.gatePassed() ? "screen-gate" : "screen-login");
    /* /marketer/ (make-marketer-cc.sh): open straight into the app signed in as Chris Baareman */
    if (!(window.IHIShell && !IHIShell.gatePassed())) {
      const chris = (SampleData.users || []).find((u) => u.id === state.userId) || (SampleData.users || []).find((u) => u.id === "u-chris");
      if (chris) { if (lu) { if (![...lu.options].some((o) => o.value === chris.id)) lu.add(new Option(chris.name, chris.id)); lu.value = chris.id; } if (em) em.value = chris.email; const f = $("#login-form"); if (f && f.requestSubmit) f.requestSubmit(); }
    }
    /* page modules that register late re-render their route */
    document.addEventListener("ihi:pages", () => { if ($("#screen-app").classList.contains("active") && (isPageRoute(state.view) || state.view === "home")) renderCurrentView(); });
  }

  /* v16 — small API for js/mobile-shell.js (phone tab bar, menu, idle sign-out) and for page modules */
  window.IHIApp = {
    navigate: (route, o) => navigate(route, o),
    route: () => state.route,
    currentUser: () => currentUser(),
    canSee: (route) => canSee(route, currentUser()),
    pageCtx: () => pageCtx(),
    renderPage: (route, el) => renderRegistryPage(route, el),
    rerender: () => renderCurrentView(),
    toggleTheme: () => applyTheme(state.theme === "dark" ? "light" : "dark"),
    theme: () => state.theme,
    signOut: (reason) => signOut(reason),
    showScreen: (id) => showScreen(id),
    closeDrawer: () => closeDrawer(),
    closeReportModal: () => closeReportModal()
  };

  document.addEventListener("DOMContentLoaded", init);
})();
