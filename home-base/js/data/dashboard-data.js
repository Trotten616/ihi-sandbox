/* DashboardData — the ONE loader the UI talks to.
 *
 *   DashboardData.getMarketerDashboard(userId, { from, to, office }) → Promise<MarketerDashboard>
 *
 * The loader asks the configured adapter for raw rows, then computes every widget with
 * DashboardMetrics (js/data/metrics.js). Each metric group carries { source, detail, adapter,
 * isSample, asOf, label } so cards can show "Sample · MarketSharp (Appt Set By)".
 *
 * Swap plan: set CONFIG.streams.* from "sample" to "marketsharp" (and "tapit" for calls if chosen)
 * once those adapters return real rows. No widget code changes.
 */
(function () {
  "use strict";
  const M = window.DashboardMetrics;
  const A = window.DashboardAdapters || {};

  const CONFIG = {
    /* which adapter feeds each raw stream */
    streams: { appointments: "sample", inquiries: "sample", callActivity: "sample" },
    /* Activity List + lead profile drawer */
    activities: "sample",
    /* team list + schedules come from the sample adapter until HR/user list is wired */
    roster: "sample",
    /* per-marketer Access numbers (TM Lead Activity by WHOSET). "access" = live stub, "accessSample" = sample */
    accessMarketer: "accessSample"
  };

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const toDate = (iso) => new Date(iso + "T00:00:00Z");
  const toISO = (d) => d.toISOString().slice(0, 10);
  const addDays = (iso, n) => { const d = toDate(iso); d.setUTCDate(d.getUTCDate() + n); return toISO(d); };
  const shiftYear = (iso, n) => {
    const y = +iso.slice(0, 4) + n;
    let md = iso.slice(5);
    if (md === "02-29") md = "02-28";
    return y + "-" + md;
  };
  const monthEnd = (y, m) => toISO(new Date(Date.UTC(y, m, 0))); /* m = 1..12 */
  const pad = (n) => String(n).padStart(2, "0");
  const mmddyyyy = (iso) => iso ? iso.slice(5, 7) + "-" + iso.slice(8, 10) + "-" + iso.slice(0, 4) : "";
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function adapterFor(stream) { return A[CONFIG.streams[stream]] || A.sample; }
  function rosterAdapter() { return A[CONFIG.roster] || A.sample; }

  function clock() {
    const ad = adapterFor("appointments");
    if (ad && !ad.isLive && ad.today) return { today: ad.today, asOf: ad.asOf };
    const now = new Date();
    return { today: now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()), asOf: now.toISOString() };
  }

  function meta(stream) {
    const ad = adapterFor(stream);
    const s = (ad.streams && ad.streams[stream]) || { system: "MarketSharp", detail: stream };
    const isSample = !ad.isLive;
    return {
      adapter: ad.id, source: s.system, detail: s.detail, isSample, asOf: clock().asOf,
      label: (isSample ? "Sample · " : "") + s.system + " (" + s.detail + ")"
    };
  }

  /* Merge raw streams (they may come from different adapters later) */
  async function fetchRaw(userId, office) {
    const want = Object.keys(CONFIG.streams);
    const byAdapter = {};
    want.forEach((s) => { const id = CONFIG.streams[s]; (byAdapter[id] = byAdapter[id] || []).push(s); });
    const raw = { appointments: [], inquiries: [], callActivity: [] };
    await Promise.all(Object.keys(byAdapter).map(async (id) => {
      const ad = A[id] || A.sample;
      const got = await ad.fetchMarketerRaw(userId, { office });
      byAdapter[id].forEach((s) => { raw[s] = got[s] || []; });
    }));
    return raw;
  }

  function periodRanges(today) {
    const y = today.slice(0, 4);
    const yest = addDays(today, -1);
    return {
      yesterday: { key: "yesterday", label: "Yesterday", short: DOW[toDate(yest).getUTCDay()] + " " + yest.slice(5).replace("-", "/"), from: yest, to: yest },
      today: { key: "today", label: "Today", short: DOW[toDate(today).getUTCDay()] + " " + today.slice(5).replace("-", "/"), from: today, to: today },
      mtd: { key: "mtd", label: "MTD", short: "Month to date", from: today.slice(0, 8) + "01", to: today },
      ytd: { key: "ytd", label: "YTD", short: "Year to date", from: y + "-01-01", to: today }
    };
  }

  function ratioObj(values, id) {
    const r = M.ratio(values, id);
    return { num: r.num, den: r.den, value: r.value };
  }

  async function getMarketerDashboard(userId, opts) {
    const o = opts || {};
    const { today, asOf } = clock();
    const office = o.office || "MI";
    const range = { from: o.from || addDays(today, -29), to: o.to || today };
    const lyRange = { from: shiftYear(range.from, -1), to: shiftYear(range.to, -1) };
    const raw = await fetchRaw(userId, office);
    const periods = periodRanges(today);

    /* Per-period values (rings + overview + today strip) */
    const periodVals = {};
    Object.keys(periods).forEach((k) => { periodVals[k] = M.computeAll(raw, periods[k]); });

    const performance = Object.keys(periods).map((k) => Object.assign({}, periods[k], ratioObj(periodVals[k], "sitRate"), { issued: periodVals[k].issued }));
    const closing = Object.keys(periods).map((k) => Object.assign({}, periods[k], ratioObj(periodVals[k], "closeNet")));
    const salesOverview = Object.keys(periods).map((k) => Object.assign({}, periods[k], {
      net: periodVals[k].netSalesAmt, gross: periodVals[k].grossSalesAmt, pending: periodVals[k].pendingAmt
    }));

    /* Operating Statement */
    const cur = M.computeAll(raw, range);
    const ly = M.computeAll(raw, lyRange);
    const roster = rosterAdapter();
    const sched = roster.schedule ? roster.schedule(userId) : null;
    const startedAfterLy = !!(sched && sched.start && sched.start > lyRange.to);
    const row = (id) => {
      if (M.DEFS[id]) {
        const d = M.DEFS[id];
        const na = d.perMarketer === false;
        return { id, label: d.label, tip: d.tip, ms: d.ms, fmt: d.fmt, na, cur: na ? null : cur[id], ly: na || startedAfterLy ? null : ly[id] };
      }
      const r = M.RATIOS[id];
      const c = M.ratio(cur, id); const l = M.ratio(ly, id);
      return { id, label: r.label, tip: r.tip, fmt: r.fmt, marketerExtra: !!r.marketerExtra, na: false, cur: c.value, ly: startedAfterLy ? null : l.value };
    };
    const operating = {
      range, lyRange, rangeDisplay: mmddyyyy(range.from) + " | " + mmddyyyy(range.to),
      lyDisplay: mmddyyyy(lyRange.from) + " | " + mmddyyyy(lyRange.to),
      startedAfterLy,
      left: M.OPERATING_LEFT.map(row),
      right: M.OPERATING_RIGHT.map(row)
    };

    /* Sales trend — Month = each day of the last 30 days (running total); Year = each month this year */
    const monthDays = [];
    let running = 0;
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i);
      const v = M.DEFS.netSalesAmt.compute(raw, { from: d, to: d });
      running += v;
      monthDays.push({ label: d.slice(5).replace("-", "/"), value: running, daily: v });
    }
    const yNow = +today.slice(0, 4);
    const mNow = +today.slice(5, 7);
    const yearMonths = [];
    for (let m = 1; m <= mNow; m++) {
      const r = { from: yNow + "-" + pad(m) + "-01", to: m === mNow ? today : monthEnd(yNow, m) };
      const before = sched && sched.start && sched.start > r.to; /* not on the team yet → gap, not $0 */
      yearMonths.push({ label: MONTHS[m - 1] + (m === mNow ? "*" : ""), value: before ? null : M.DEFS.netSalesAmt.compute(raw, r) });
    }

    /* Net Sales Comparison — 12 months ending this month, this year vs the same months a year earlier */
    const cmpLabels = []; const cmpThis = []; const cmpLast = [];
    for (let k = 11; k >= 0; k--) {
      let m = mNow - k; let y = yNow;
      while (m <= 0) { m += 12; y -= 1; }
      const isCur = k === 0;
      const rThis = { from: y + "-" + pad(m) + "-01", to: isCur ? today : monthEnd(y, m) };
      const rLast = { from: (y - 1) + "-" + pad(m) + "-01", to: isCur ? shiftYear(today, -1) : monthEnd(y - 1, m) };
      cmpLabels.push(MONTHS[m - 1] + (isCur ? "*" : ""));
      cmpThis.push(sched && sched.start && sched.start > rThis.to ? null : M.DEFS.netSalesAmt.compute(raw, rThis));
      cmpLast.push(sched && sched.start && sched.start > rLast.to ? null : M.DEFS.netSalesAmt.compute(raw, rLast));
    }

    /* Lead sources — appointments I set, by lead source, in the Operating Statement range */
    const srcMap = {};
    raw.appointments.forEach((a) => { if (M.inRange(a.setDate, range)) srcMap[a.source] = (srcMap[a.source] || 0) + 1; });
    const inqMap = {};
    raw.inquiries.forEach((q) => { if (M.inRange(q.date, range)) inqMap[q.source] = (inqMap[q.source] || 0) + 1; });
    const leadSources = Object.keys(inqMap).map((s) => ({ source: s, sets: srcMap[s] || 0, inquiries: inqMap[s] }))
      .sort((a, b) => b.sets - a.sets || b.inquiries - a.inquiries);

    /* Where I stand — my ratios vs pooled team average (no other people’s dollars or names) */
    const ids = roster.marketerIds ? roster.marketerIds() : [];
    const teamVals = await Promise.all(ids.map(async (id) => M.computeAll(await fetchRaw(id, office), range)));
    const pool = teamVals.reduce((acc, v) => { Object.keys(v).forEach((k) => { acc[k] = (acc[k] || 0) + (v[k] || 0); }); return acc; }, {});
    const standing = {
      range, teamSize: ids.length,
      items: ["sitRate", "closeNet", "inquiryToSet"].map((id) => ({
        id, label: M.RATIOS[id].label, tip: M.RATIOS[id].tip,
        me: M.ratio(cur, id).value, team: M.ratio(pool, id).value
      }))
    };

    /* Michigan / Illinois Access — PRIMARY source where both systems have the number (Thomas, 2026-10-05) */
    const access = await getAccessBlock(userId, office, { range, lyRange, periods, cur, ly, periodVals });

    /* Schedule / today strip */
    const wd = toDate(today).getUTCDay();
    const workingToday = sched ? sched.workDays.indexOf(wd) !== -1 : true;
    const t = periodVals.today;

    const callsMeta = meta("callActivity");
    const apptMeta = meta("appointments");
    const inqMeta = meta("inquiries");

    return {
      userId, office, today, asOf, isSample: apptMeta.isSample,
      schedule: { workingToday, workDays: sched ? sched.workDays : null, todayDow: DOW[wd] },
      todayStrip: { meta: apptMeta, callsMeta, calls: t.totalCalls, inquiries: t.inquiries, apptsSet: t.apptsSet, confirmed: t.confirmed, issued: t.issued },
      performance: { meta: apptMeta, def: M.RATIOS.sitRate, items: performance },
      overview: { meta: apptMeta, sales: salesOverview, closing, closingDef: M.RATIOS.closeNet },
      salesTrend: { meta: apptMeta, month: monthDays, year: yearMonths },
      operating: Object.assign({ meta: apptMeta, callsMeta, inqMeta }, operating),
      netComparison: { meta: apptMeta, labels: cmpLabels, thisYear: cmpThis, lastYear: cmpLast, thisLabel: (yNow - 1) + "–" + yNow, lastLabel: (yNow - 2) + "–" + (yNow - 1) },
      leadSources: { meta: apptMeta, range, items: leadSources },
      standing: Object.assign({ meta: apptMeta }, standing),
      goal: { meta: { label: "Sample · goals not set", isSample: true }, monthly: null },
      access
    };
  }

  /* ——— Access vs MarketSharp ———
   * DUAL_METRICS = numbers both systems have. Access is primary; MarketSharp shown smaller; mismatch flagged.
   * Returns null if Access isn't available (cards then show MarketSharp only, with a note). */
  const DUAL_METRICS = ["inquiries", "apptsSet", "confirmed", "issued", "totalSold", "netSalesAmt"];
  const DUAL_LABELS = { inquiries: "Leads taken", apptsSet: "Appts set", confirmed: "Confirmed", issued: "Issued", totalSold: "Sold", netSalesAmt: "Net sales $" };
  function dualPair(accVals, msVals, id) {
    const a = accVals ? accVals[id] : null, m = msVals ? msVals[id] : null;
    return { id, access: a, ms: m, diff: a != null && m != null ? a - m : null, match: a == null || m == null || a === m };
  }
  async function getAccessBlock(userId, office, ctx) {
    const ad = A[CONFIG.accessMarketer];
    if (!ad || !ad.fetchMarketerActivity) return null;
    let raw;
    try { raw = await ad.fetchMarketerActivity(userId, { office }); } catch (e) { return { error: e.message || String(e) }; }
    const sysName = (office === "IL" ? "Illinois" : "Michigan") + " Access";
    const s = (ad.streams && ad.streams.marketer) || { detail: "TM Lead Activity" };
    const cur = M.computeAll(raw, ctx.range);
    const ly = M.computeAll(raw, ctx.lyRange);
    const periodVals = {};
    Object.keys(ctx.periods).forEach((k) => { periodVals[k] = M.computeAll(raw, ctx.periods[k]); });
    const countIn = (rows, r) => (rows || []).reduce((n, x) => n + (M.inRange(x.date, r) ? 1 : 0), 0);
    /* net sales $ already excludes canceled / rejected contracts (Approved only) */
    const netPerIssued = (vals) => (vals.issued ? Math.round((vals.netSalesAmt || 0) / vals.issued) : null);
    const pairs = (accV, msV) => { const o = {}; DUAL_METRICS.forEach((id) => { o[id] = dualPair(accV, msV, id); }); return o; };
    return {
      system: sysName,
      meta: { system: sysName, detail: s.detail, isSample: !ad.isLive, label: (!ad.isLive ? "Sample · " : "") + sysName + " (" + s.detail + ")" },
      labels: DUAL_LABELS, metrics: DUAL_METRICS,
      range: pairs(cur, ctx.cur),
      ly: pairs(ly, ctx.ly),
      periods: Object.keys(periodVals).reduce((o, k) => { o[k] = pairs(periodVals[k], ctx.periodVals[k]); return o; }, {}),
      onlyAccess: {
        callbacks: { label: "Callbacks set", value: countIn(raw.callbacks, ctx.range), tip: "Call-back-to-set appointments you entered (Access appointment type CB). Not tracked as a number in MarketSharp — callbacks there are CB appointments without a rep." },
        resets: { label: "Resets", value: countIn(raw.resets, ctx.range), tip: "Appointments you reset (Access appointment type RES)." },
        netPerIssued: { label: "Net per issued", value: netPerIssued(cur), fmt: "money", tip: "Net sales ÷ issued appointments — the “Net per lead” column on Access’s TM Lead Activity report." }
      },
      mismatches: DUAL_METRICS.filter((id) => !dualPair(cur, ctx.cur, id).match).length
    };
  }

  /* ——— Activities (Activity List) ———
   * getActivities(userId | "ALL", { status, groups[], reference, office, audience }) → Promise<{ counts, items, ... }>
   * counts are always computed over ALL of the user's activities in that audience (only office applies), so the
   * Home card and the Activity view show the same numbers. Mark-complete is in-memory only (sample).
   *
   * Audience rule (applies to ANY adapter, so live MarketSharp rows get the same treatment):
   *   subject is a marketer, or "ALL" (manager team view = the marketers) → audience "marketer":
   *     confirmer references (ActivityDefs.CONFIRMER_REFERENCES: Confirm Appointment, Appointment Reminder…)
   *     and office references are removed before anything is counted or listed.
   *   anyone else → "all" (nothing removed).
   *   filters.audience overrides it — e.g. getActivities("u-sheila", { audience: "confirmer" }) for a future
   *   confirm queue (no UI yet).
   */
  const activityOverrides = {}; /* id → { completedDate, completedTime, result } — sample only, lost on reload */

  function activityAdapter() { return A[CONFIG.activities] || A.sample; }
  function isMarketerId(id) {
    const u = ((window.SampleData && window.SampleData.users) || []).find((x) => x.id === id);
    if (u) return !!u.marketer;
    const r = rosterAdapter();
    return !!(r.marketerIds && r.marketerIds().indexOf(id) !== -1);
  }
  function activityAudience(userId, f) {
    if (f && f.audience) return f.audience;
    return userId === "ALL" || isMarketerId(userId) ? "marketer" : "all";
  }
  function userName(id) {
    const u = ((window.SampleData && window.SampleData.users) || []).find((x) => x.id === id);
    return u ? u.name : id;
  }

  async function getActivities(userId, filters) {
    const f = filters || {};
    const AD = window.ActivityDefs;
    const ad = activityAdapter();
    const { today, asOf } = clock();
    const weekFrom = addDays(today, -6);
    const ids = userId === "ALL" ? (rosterAdapter().marketerIds ? rosterAdapter().marketerIds() : []) : [userId];
    const lists = await Promise.all(ids.map((id) => ad.fetchActivities ? ad.fetchActivities(id) : Promise.resolve([])));
    let all = [];
    lists.forEach((l) => { all = all.concat(l); });
    const audience = activityAudience(userId, f);
    all = all.filter((a) => AD.inAudience(a, audience)); /* marketers never see confirmer / office refs */
    all = all.map((a) => {
      const o = activityOverrides[a.id];
      const row = o ? Object.assign({}, a, o, { sampleEdited: true }) : Object.assign({}, a);
      row.assignedToName = userName(row.assignedToId);
      row.group = (AD.TYPES[row.type] || {}).group || "todo";
      return row;
    });
    if (f.office && f.office !== "ALL") all = all.filter((a) => a.office === f.office);
    all.forEach((a) => { a.status = AD.status(a, today); });
    const counts = AD.counts(all, today, weekFrom);

    const status = f.status || "open";
    let items = all.filter((a) => AD.matchStatus(a, status, today, weekFrom));
    if (f.groups && f.groups.length) items = items.filter((a) => f.groups.indexOf(a.group) !== -1);
    if (f.reference && f.reference !== "all") items = items.filter((a) => a.reference === f.reference);
    const doneFirst = status === "completedToday" || status === "completed7";
    items.sort((a, b) => {
      if (doneFirst) return ((b.completedDate || "") + (b.completedTime || "")).localeCompare((a.completedDate || "") + (a.completedTime || ""));
      const ao = a.status === "done" ? 1 : 0; const bo = b.status === "done" ? 1 : 0;
      if (ao !== bo) return ao - bo;
      if (ao) return ((b.completedDate || "") + (b.completedTime || "")).localeCompare((a.completedDate || "") + (a.completedTime || ""));
      return (a.dueDate + a.dueTime).localeCompare(b.dueDate + b.dueTime);
    });
    /* dropdown: the audience's defined references + any untagged ones present (live) — never confirmer refs for marketers */
    const defined = audience === "all" ? [] : AD.referencesFor(audience);
    const references = Array.from(new Set(defined.concat(all.map((a) => a.reference)))).sort();
    const s = (ad.streams && ad.streams.activities) || { system: "MarketSharp", detail: "Activity List" };
    return {
      userId, audience, today, nowTime: "11:50", weekFrom, counts, items, total: items.length, references,
      meta: { adapter: ad.id, source: s.system, detail: s.detail, isSample: !ad.isLive, asOf, label: (!ad.isLive ? "Sample · " : "") + s.system + " (" + s.detail + ")" }
    };
  }

  /* Sample-only: marks an activity complete in memory. Live: MarketSharp OData is read-only, so this would
   * need the partner REST API or a deep link to the activity in MarketSharp. */
  function completeActivity(id, result) {
    const { today } = clock();
    activityOverrides[id] = { completedDate: today, completedTime: "11:50", result };
    return Promise.resolve({ ok: true, saved: false, sample: true });
  }

  /* Lead profile for the existing customer drawer, built from adapter rows (same shape as SampleData.leads) */
  async function getLeadProfile(leadId) {
    const ad = activityAdapter();
    if (!ad.fetchLeadProfile) return null;
    const p = await ad.fetchLeadProfile(leadId);
    if (!p) return null;
    const q = p.inquiry; const who = p.identity; const ap = p.appointment;
    const fmtD = (iso) => iso ? +iso.slice(5, 7) + "/" + +iso.slice(8, 10) + "/" + iso.slice(0, 4) : "—";
    const fmtT = (t) => { if (!t) return ""; let h = +t.slice(0, 2); const ap2 = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + t.slice(3) + " " + ap2; };
    const stage = !ap ? (q.outcome === "Appt Set" ? "Set" : "Inquiry") : ap.sold ? "Sold" : ap.dateIssued ? (ap.resulted ? "Issued" : "Issued") : "Set";
    const acts = p.activities.map((a) => Object.assign({}, a, activityOverrides[a.id] || {}));
    return {
      id: q.id, name: who.first + " " + who.last, address: who.address, city: who.city, state: q.office, zip: who.zip,
      phones: [{ label: "Cell", number: who.phone }], email: "—",
      product: q.product, source: q.source, status: stage, cts: q.outcome || "—",
      rep: ap && ap.dateIssued ? "Issued (sample rep)" : null, setDate: ap ? fmtD(ap.setDate) : null,
      system: "MarketSharp",
      textThread: p.thread ? decorateThread(p.thread) : null,
      inquiryHistory: [{ when: fmtD(q.date), label: "Inquiry · " + q.source, detail: q.product + " · worked by " + userName(q.telemarketerId) + " · " + (q.outcome || "") }],
      appointmentHistory: ap ? [{ when: fmtD(ap.apptDate) + " " + ap.apptSlot, label: ap.result, detail: "Set " + fmtD(ap.setDate) + " by " + userName(ap.setById) + (ap.sold ? " · sold (sample $)" : "") }] : [],
      notes: acts.slice().reverse().map((a) => ({
        when: a.completedDate ? fmtD(a.completedDate) + " " + fmtT(a.completedTime) : "Due " + fmtD(a.dueDate) + " " + fmtT(a.dueTime),
        who: userName(a.assignedToId),
        text: a.type + " · " + a.reference + (a.completedDate ? " — " + (a.result || "logged") : " — open")
      }))
    };
  }

  /* ——— Speed to Lead (text threads) ———
   * getTextThreads(userId | "ALL", { office }) → Promise<{ counts, needsReply[], done[], now, meta }>
   *   marketer → their own threads · "ALL" → every marketer (manager team view) ·
   *   anyone else → the shared older sample inbox (SampleData.speedToLead), converted to the same shape.
   * Status: "needsReply" when the newest text is FROM the lead (and isn't STOP); otherwise "done".
   * Counts and both lists come from this one function, so tiles and sections always agree.
   * Send / Mark done are in-memory only (sample). */
  const textOverrides = {}; /* threadId → { add:[msgs], done:bool, outcome } */
  const NOW = { date: "2026-10-05", time: "11:50" };
  const minsOf = (date, time) => Math.round(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 60000) + (+time.slice(0, 2)) * 60 + (+time.slice(3, 5));
  const nowMins = () => minsOf(NOW.date, NOW.time);
  function textAdapter() { const a = A[CONFIG.activities] || A.sample; return a.fetchTextThreads ? a : A.sample; }

  function legacyThreads(office) {
    const stl = (window.SampleData && window.SampleData.speedToLead) || { conversations: [] };
    const toHM = (t) => { const m = /^(\d+):(\d\d)\s*(AM|PM)$/i.exec(t || ""); if (!m) return "08:00"; let h = +m[1] % 12; if (/PM/i.test(m[3])) h += 12; return String(h).padStart(2, "0") + ":" + m[2]; };
    return (stl.conversations || []).filter((c) => !office || office === "ALL" || c.state === office).map((c) => {
      const parts = String(c.lead).split(" ");
      const msgs = (c.messages || []).map((m) => {
        const date = /yesterday/i.test(m.time) ? "2026-10-04" : NOW.date;
        return { dir: m.from === "them" ? "in" : "out", auto: m.from === "ai", sentById: null, sentByName: m.from === "ai" ? "Auto text" : (m.sentByUser || m.who),
          date, time: /yesterday/i.test(m.time) ? "17:00" : toHM(m.time), opened: m.opened === undefined ? null : !!m.opened, openedDate: m.opened ? date : null,
          openedAt: m.openedAt ? toHM(m.openedAt) : null, text: m.text };
      });
      return { id: c.id, leadId: null, leadName: c.lead, leadFirst: parts.slice(0, -1).join(" "), leadLast: parts.slice(-1)[0], leadPhone: c.leadPhone, office: c.state,
        ownerId: null, ownerName: c.staff, source: c.source || "MarketSharp", product: "—", cameIn: { date: msgs[0] ? msgs[0].date : NOW.date, time: msgs[0] ? msgs[0].time : "08:00" },
        firstTextSec: c.speedSec, outcome: "Replied", messages: msgs, legacy: true };
    });
  }

  function decorateThread(t) {
    const o = textOverrides[t.id] || {};
    const row = Object.assign({}, t, { messages: (t.messages || []).concat(o.add || []) });
    row.leadName = row.leadName || (row.leadFirst + " " + row.leadLast);
    row.ownerName = row.ownerName || userName(row.ownerId);
    const last = row.messages[row.messages.length - 1];
    row.last = last || null;
    const optedOut = row.messages.some((m) => m.optOut);
    row.status = !o.done && last && last.dir === "in" && !optedOut ? "needsReply" : "done";
    row.outcome = o.outcome || row.outcome;
    if (row.status === "needsReply") {
      /* waiting since the first unanswered text from the lead */
      let i = row.messages.length - 1;
      while (i > 0 && row.messages[i - 1].dir === "in") i--;
      const w = row.messages[i];
      row.waitingSince = { date: w.date, time: w.time };
      row.waitMin = Math.max(0, nowMins() - minsOf(w.date, w.time));
      row.seen = !!last.opened;
    }
    row.lastAt = last ? minsOf(last.date, last.time) : 0;
    /* reply times (lead text → our next human text), used for the "Avg reply time today" tile */
    row.replyMins = [];
    for (let i = 0; i < row.messages.length; i++) {
      const m = row.messages[i];
      if (m.dir !== "in") continue;
      const nxt = row.messages.slice(i + 1).find((x) => x.dir === "out" && !x.auto);
      if (nxt && m.date === NOW.date && nxt.date === NOW.date && (i === 0 || row.messages[i - 1].dir !== "in")) row.replyMins.push(minsOf(nxt.date, nxt.time) - minsOf(m.date, m.time));
    }
    row.sampleEdited = !!(o.add && o.add.length) || !!o.done;
    return row;
  }

  async function getTextThreads(userId, filters) {
    const f = filters || {};
    const ad = textAdapter();
    let rows;
    if (userId === "ALL" || isMarketerId(userId)) {
      const ids = userId === "ALL" ? (rosterAdapter().marketerIds ? rosterAdapter().marketerIds() : []) : [userId];
      const lists = await Promise.all(ids.map((id) => ad.fetchTextThreads(id)));
      rows = [].concat.apply([], lists);
      if (f.office && f.office !== "ALL") rows = rows.filter((t) => t.office === f.office);
    } else {
      rows = legacyThreads(f.office);
    }
    rows = rows.map(decorateThread);
    const needsReply = rows.filter((t) => t.status === "needsReply").sort((a, b) => b.waitMin - a.waitMin);
    const done = rows.filter((t) => t.status === "done").sort((a, b) => b.lastAt - a.lastAt);
    const reply = [].concat.apply([], rows.map((t) => t.replyMins));
    const s = (ad.streams && ad.streams.texts) || { system: "MarketSharp", detail: "Text activities" };
    return {
      userId, now: NOW, legacy: !(userId === "ALL" || isMarketerId(userId)),
      counts: {
        needsReply: needsReply.length, done: done.length,
        longestWaitMin: needsReply.length ? needsReply[0].waitMin : null,
        avgReplyMinToday: reply.length ? Math.round(reply.reduce((a, b) => a + b, 0) / reply.length) : null,
        repliesToday: reply.length
      },
      needsReply, done,
      meta: { adapter: ad.id, isSample: !ad.isLive, source: s.system, detail: s.detail, label: (!ad.isLive ? "Sample · " : "") + s.system + " (" + s.detail + ")" }
    };
  }

  async function getTextThread(id, userId) {
    const ownerId = String(id).split("-X")[0];
    if (/-X\d+$/.test(id)) {
      const list = await textAdapter().fetchTextThreads(ownerId);
      const t = list.find((x) => x.id === id);
      if (t) return decorateThread(t);
    }
    const lt = legacyThreads("ALL").find((x) => x.id === id);
    return lt ? decorateThread(lt) : null;
  }

  /* Sample-only: nothing is sent to the homeowner or written to MarketSharp. */
  function sendTextReply(threadId, text, user) {
    const o = textOverrides[threadId] = textOverrides[threadId] || { add: [] };
    o.add.push({ dir: "out", auto: false, sentById: user ? user.id : null, sentByUserId: user ? user.id : null, sentByName: user ? user.name : "You", date: NOW.date, time: NOW.time,
      sourceSystem: "MarketSharp", isHatchProxy: false, loggedUnderUserId: user ? user.id : null,
      opened: false, openedDate: null, openedAt: null, text: String(text || "").slice(0, 480), sampleSend: true });
    o.done = false; o.outcome = "Replied";
    return Promise.resolve({ ok: true, sent: false, sample: true });
  }
  function markThreadDone(threadId) {
    const o = textOverrides[threadId] = textOverrides[threadId] || { add: [] };
    o.done = true; o.outcome = "No reply needed";
    return Promise.resolve({ ok: true, saved: false, sample: true });
  }

  /* ——— Texts sent log ———
   * getTextLog(userId | "ALL", { sentBy, system, range, office }) → Promise<{ items[], counts, ranges, senders, meta }>
   *   One row per text WE sent (auto + people), from the same text threads Speed to Lead uses — so the
   *   numbers always agree. Activity-List "Text Out" rows are NOT added on top (they're the same texts).
   *   sentBy: "all" | user id | "hatch"  (hatch = Hatch system/AI texts logged in MarketSharp under Tom — isHatchProxy)
   *   system: "all" | "MarketSharp" | "Hatch"      range: "today" | "prev" (previous phone day) | "all" (Fri → now)
   * Opened = the CUSTOMER opened our text (main display). Seen by = which staff user first viewed a reply (secondary). */
  const SYSTEMS = ["MarketSharp", "Hatch"];
  function shortName(id) {
    const n = userName(id); if (!n || n === id) return id || "";
    const p = n.split(" "); return p[0] + (p[1] ? " " + p[1][0] + "." : "");
  }
  function senderLabel(m) {
    if (m.auto) return "Auto text";
    if (m.isHatchProxy) return "Hatch (system/AI, via Tom's login)";
    return userName(m.sentByUserId || m.sentById) || m.sentByName;
  }
  function phoneDays() {
    const today = NOW.date; let prev = addDays(today, -1);
    while (toDate(prev).getUTCDay() === 0) prev = addDays(prev, -1);
    const lbl = (iso) => DOW[toDate(iso).getUTCDay()] + " " + (+iso.slice(5, 7)) + "/" + (+iso.slice(8, 10));
    return { today, prev, ranges: [
      { key: "today", label: "Today (" + lbl(today) + ")" },
      { key: "prev", label: "Previous phone day (" + lbl(prev) + ")" },
      { key: "all", label: "Last 3 phone days" }] };
  }
  function inTextRange(date, range, pd) { return range === "today" ? date === pd.today : range === "prev" ? date === pd.prev : true; }

  async function getTextLog(userId, filters) {
    const f = filters || {};
    const data = await getTextThreads(userId, { office: f.office });
    const pd = phoneDays();
    const range = f.range || "today";
    let items = [];
    data.needsReply.concat(data.done).forEach((t) => (t.messages || []).forEach((m, i) => {
      if (m.dir !== "out") return;
      const sys = m.sourceSystem || (m.auto ? "Hatch" : "MarketSharp");
      items.push({
        id: t.id + ":" + i, threadId: t.id, date: m.date, time: m.time, at: m.date + " " + m.time,
        auto: !!m.auto, isHatchProxy: !!(m.isHatchProxy || (m.auto && sys === "Hatch")), system: sys, loggedUnderUserId: m.loggedUnderUserId || null,
        sentByUserId: m.sentByUserId || m.sentById || null, sentByLabel: senderLabel(m),
        customer: t.leadName, ownerId: t.ownerId, ownerName: t.ownerName, office: t.office,
        opened: !!m.opened, openedDate: m.openedDate, openedAt: m.openedAt, text: m.text, sampleSend: !!m.sampleSend, legacy: !!t.legacy
      });
    }));
    const scoped = items.filter((x) => inTextRange(x.date, range, pd));
    let rows = scoped;
    if (f.system && f.system !== "all") rows = rows.filter((x) => x.system === f.system);
    if (f.sentBy === "hatch") rows = rows.filter((x) => x.isHatchProxy);
    else if (f.sentBy && f.sentBy !== "all") rows = rows.filter((x) => !x.isHatchProxy && x.sentByUserId === f.sentBy);
    rows.sort((a, b) => b.at.localeCompare(a.at));
    const count = (list) => ({
      sent: list.length, opened: list.filter((x) => x.opened).length,
      bySystem: SYSTEMS.reduce((o, s) => { o[s] = list.filter((x) => x.system === s).length; return o; }, {}),
      hatchProxy: list.filter((x) => x.isHatchProxy).length, auto: list.filter((x) => x.auto).length
    });
    const senderIds = Array.from(new Set(scoped.filter((x) => !x.isHatchProxy && x.sentByUserId).map((x) => x.sentByUserId)));
    return {
      userId, range, ranges: pd.ranges, now: NOW, items: rows, counts: count(rows), scopeCounts: count(scoped),
      senders: senderIds.map((id) => ({ id, name: userName(id) })).sort((a, b) => a.name.localeCompare(b.name)),
      hasHatchProxy: scoped.some((x) => x.isHatchProxy), legacy: data.legacy,
      systems: SYSTEMS, ghl: false,
      meta: Object.assign({}, data.meta, { label: (data.meta.isSample ? "Sample · " : "") + "MarketSharp Text Out activities (Hatch texts flagged) · open times TBD" })
    };
  }

  /* "My texts today" for a marketer's Home: people texts only (auto texts don't count as anyone's work) */
  async function getMyTextsToday(userId, office) {
    const log = await getTextLog(userId, { range: "today", office });
    const human = log.items.filter((x) => !x.auto);
    const ms = human.filter((x) => x.system === "MarketSharp" && x.sentByUserId === userId);
    const hatch = human.filter((x) => x.isHatchProxy);
    return { ms: ms.length, msOpened: ms.filter((x) => x.opened).length, hatch: hatch.length, hatchOpened: hatch.filter((x) => x.opened).length,
      opened: ms.concat(hatch).filter((x) => x.opened).length, total: ms.length + hatch.length, meta: log.meta };
  }

  /* ——— What each person did (cross-system action log) ———
   * getActionLog(scopeId, { isManager, userId, system, type, range, office }) → Promise<{ items, counts, people, users, ... }>
   *   Events come from CONFIG.actionTrail (sample now; live = Access trails → MarketSharp activities → Hatch comms,
   *   normalized to the ActionEvent shape in js/data/adapters/sample-trail.js).
   *   Manager: everyone, incl. confirmers (Access WHOCONFIRM + MarketSharp Confirm call) and data processors (status keyed).
   *   Marketer: only their own actions; confirm-team work never shows (v9 rule). Hatch-as-Tom texts belong to nobody
   *   (userId null, isHatchProxy) — a marketer sees a count of them on their leads, not credit.
   *   range: "today" | "prev" (previous phone day) | "7d"   system: "all" | "Access" | "MarketSharp" | "Hatch" */
  CONFIG.actionTrail = "sampleTrail";
  const ACTION_TYPES = [
    { id: "lead", label: "Lead taken / entered" }, { id: "set", label: "Appointment set / reset" }, { id: "callback", label: "Callback set" },
    { id: "confirm", label: "Confirm" }, { id: "call", label: "Call" }, { id: "email", label: "Email" }, { id: "text", label: "Text sent" },
    { id: "seen", label: "Text reply opened" }, { id: "note", label: "Note / to-do" }, { id: "status", label: "Status change" }];
  const ROLE_ORDER = { Setter: 0, Confirmer: 1, "Data processor": 2, Manager: 3 };
  async function getActionLog(scopeId, filters) {
    const f = filters || {};
    const ad = A[CONFIG.actionTrail];
    const { today } = clock();
    let prev = addDays(today, -1); while (toDate(prev).getUTCDay() === 0) prev = addDays(prev, -1);
    const range = f.range || "today";
    const from = range === "today" ? today : range === "prev" ? prev : addDays(today, -6);
    const to = range === "prev" ? prev : today;
    const lbl = (iso) => DOW[toDate(iso).getUTCDay()] + " " + (+iso.slice(5, 7)) + "/" + (+iso.slice(8, 10));
    const ranges = [{ key: "today", label: "Today (" + lbl(today) + ")" }, { key: "prev", label: "Previous phone day (" + lbl(prev) + ")" }, { key: "7d", label: "Last 7 days" }];
    if (!ad) return { items: [], counts: {}, people: [], users: [], ranges, range, types: ACTION_TYPES, error: "No action trail adapter" };
    let all = await ad.fetchActionEvents({ from, to, office: f.office });
    const users = (window.SampleData && window.SampleData.users) || [];
    const manager = !!f.isManager;
    const marketerScope = !manager && isMarketerId(scopeId);
    let scoped;
    if (manager) scoped = all;
    else scoped = all.filter((e) => e.userId === scopeId && (!marketerScope || e.actionType !== "confirm"));
    const hatchMine = marketerScope ? all.filter((e) => e.isHatchProxy && e.ownerId === scopeId) : [];
    const hatchOnMyLeads = hatchMine.length, hatchAutoOnMyLeads = hatchMine.filter((e) => e.auto).length;
    let items = scoped;
    if (manager && f.userId && f.userId !== "all") items = f.userId === "hatch" ? items.filter((e) => e.isHatchProxy) : items.filter((e) => e.userId === f.userId);
    if (f.system && f.system !== "all") items = items.filter((e) => (f.system === "Access" ? /Access/.test(e.system) : e.system === f.system));
    if (f.type && f.type !== "all") items = items.filter((e) => e.actionType === f.type);
    const nameOf = (id) => (id ? userName(id) : "Hatch (system/AI, via Tom’s login)");
    items = items.map((e) => Object.assign({}, e, { userName: nameOf(e.userId), ownerName: userName(e.ownerId) }));
    const countBy = (list, k) => list.reduce((o, e) => { o[e[k]] = (o[e[k]] || 0) + 1; return o; }, {});
    const sysKey = (e) => (/Access/.test(e.system) ? "Access" : e.system);
    /* people summary (manager): one row per person over the scoped range (system/type filters applied, user filter not) */
    let people = [];
    if (manager) {
      let base = scoped;
      if (f.system && f.system !== "all") base = base.filter((e) => (f.system === "Access" ? /Access/.test(e.system) : e.system === f.system));
      const by = {};
      base.forEach((e) => {
        const k = e.userId || "hatch";
        const r = by[k] = by[k] || { id: k, name: nameOf(e.userId), role: e.userId ? ((users.find((x) => x.id === e.userId) || {}).role || "") : "Hatch", total: 0, lead: 0, set: 0, confirm: 0, text: 0, call: 0, seen: 0, note: 0, status: 0, bySys: {} };
        r.total++;
        const g = e.actionType === "callback" ? "set" : e.actionType === "email" ? "call" : e.actionType;
        r[g] = (r[g] || 0) + 1;
        r.bySys[sysKey(e)] = (r.bySys[sysKey(e)] || 0) + 1;
      });
      people = Object.values(by).sort((a, b) => (ROLE_ORDER[a.role] == null ? 9 : ROLE_ORDER[a.role]) - (ROLE_ORDER[b.role] == null ? 9 : ROLE_ORDER[b.role]) || b.total - a.total);
    }
    const userOpts = manager ? users.filter((x) => !/Sample$/.test(x.name)).filter((x) => scoped.some((e) => e.userId === x.id))
      .sort((a, b) => (ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) || a.name.localeCompare(b.name)).map((x) => ({ id: x.id, name: x.name, role: x.roleLabel || x.role })) : [];
    return {
      scopeId, manager, range, ranges, from, to, today, types: ACTION_TYPES, items, total: items.length,
      counts: { byType: countBy(items, "actionType"), bySystem: items.reduce((o, e) => { o[sysKey(e)] = (o[sysKey(e)] || 0) + 1; return o; }, {}) },
      people, users: userOpts, hasHatch: scoped.some((e) => e.isHatchProxy), hatchOnMyLeads, hatchAutoOnMyLeads,
      meta: { isSample: !ad.isLive, label: (!ad.isLive ? "Sample · " : "") + "Access trails (OPERATOR / WHOSET / WHOCONFIRM / FINCOM) + MarketSharp Activities + Hatch texts" }
    };
  }

  function listMarketers() {
    const users = (window.SampleData && window.SampleData.users) || [];
    return users.filter((u) => u.marketer);
  }

  window.DashboardData = { CONFIG, getMarketerDashboard, getActivities, completeActivity, getLeadProfile, getTextThreads, getTextThread, sendTextReply, markThreadDone, getTextLog, getMyTextsToday, getActionLog, userName, shortName, listMarketers, clock, mmddyyyy, addDays };
})();
