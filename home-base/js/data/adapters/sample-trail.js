/* Sample cross-system action trail — what the three live feeds will produce once normalized:
 *   Access    AccessTrailEvent  (lead_keyed, appt_set CB/RES/NEW, confirm, note, status keyed)   → access.fetchTrailEvents
 *   MarketSharp MsActivityEvent (inquiry, appt set, activities, Text Out, confirm call, status)   → marketsharp.fetchActivityEvents
 *   Hatch     HatchCommEvent    (texts; Hatch-as-Tom flagged isHatchProxy)                        → hatch.fetchCommEvents
 * Built deterministically from the SAME sample rows the dashboards use (hash-seeded "trail-v1", no new RNG draws),
 * so counts line up with Home, Activity and Speed to Lead.
 *
 * Normalized ActionEvent (what DashboardData.getActionLog filters and the UI renders):
 *   { id, userId|null, isHatchProxy, system, sourceKind, eventType, actionType, date, time|null, atPrecision:"minute"|"day",
 *     desc, customer, leadId, threadId|null, ownerId, office, employeeKey }
 * actionType (UI filter): lead · set · callback · confirm · call · email · text · seen · note · status
 * Texts: from the text threads only. Activity-list Text Out/In rows inside the thread window are skipped (same texts);
 * older Text Out rows (before the 3-day thread window) are kept as MarketSharp texts. */
(function () {
  "use strict";
  const NS = (window.DashboardAdapters = window.DashboardAdapters || {});
  const TODAY = "2026-10-05";
  const NOW_M = 11 * 60 + 50;
  const TXT_FROM = "2026-10-02";
  const CONFIRMERS = ["u-shelby", "u-tobyb"];
  const DATAPROC = ["u-erin", "u-taylorc"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const NOTES = ["Prefers evenings after 6", "Both owners will be home", "Call before arriving — dog in yard", "Wants a price on the back door too",
    "Has a quote from another company", "Text instead of call", "Saturday only", "Rental property — owner meeting rep"];
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function fmix(h) { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; }
  const u = (key) => fmix(hashStr("trail-v1:" + key)) / 4294967296;
  const pad = (n) => String(n).padStart(2, "0");
  const hm = (m) => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  const mins = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dow = (iso) => new Date(iso + "T00:00:00Z").getUTCDay();
  /* time of day for an event: spread over [fromH, toH); today = squeezed into 8:00–11:45 (sample clock 11:50) */
  function tod(key, date, fromH, toH) {
    if (date === TODAY) { fromH = Math.min(fromH, 8); toH = 11.75; }
    return hm(Math.floor(fromH * 60 + u(key) * (toH - fromH) * 60));
  }
  const later = (t, key, lo, hi, date) => { let m = mins(t) + lo + Math.floor(u(key) * (hi - lo)); if (date === TODAY) m = Math.min(m, NOW_M - 1); return hm(Math.min(m, 23 * 60 + 59)); };
  function slot12(s) { const h = +s.split(":")[0]; return s + (h === 10 || h === 11 ? " AM" : " PM"); }
  const apptLabel = (a) => DOW[dow(a.apptDate)] + " " + (+a.apptDate.slice(5, 7)) + "/" + (+a.apptDate.slice(8, 10)) + " " + slot12(a.apptSlot);
  const t12 = (t) => { let h = +t.slice(0, 2); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + t.slice(3, 5) + " " + ap; };
  const ACT_TYPE = { "Call Out": "call", "Call In": "call", "Email Out": "email", "To-Do": "note", "Text Out": "text" };
  const cache = {};

  /* events for ONE marketer's leads (their own work + confirm team + data processors on their appointments) */
  async function buildFor(m, from, to, office) {
    const S = NS.sample, ACC = NS.accessSample, IM = window.IdentityMap;
    const inR = (d) => d && d >= from && d <= to;
    const out = [];
    let seq = 0;
    const push = (e) => { e.id = m + "-ev" + (++seq); e.atPrecision = e.atPrecision || "minute"; out.push(e); };
    const accSys = (off) => (off === "IL" ? "Illinois Access" : "Michigan Access");
    const code = (uid) => (IM && IM.accessCodes(uid)) || { staff: "?", initials: "?" };
    {
      const raw = await S.fetchMarketerRaw(m, { office });
      const acc = await ACC.fetchMarketerActivity(m, { office: office || "MI" }).catch(() => ({ inquiries: [], appointments: [], callbacks: [], resets: [] }));
      const accAll = office ? acc : await (async () => { /* ALL offices: Access sample is per office */
        const il = await ACC.fetchMarketerActivity(m, { office: "IL" });
        return { inquiries: acc.inquiries.concat(il.inquiries), appointments: acc.appointments.concat(il.appointments), callbacks: acc.callbacks.concat(il.callbacks), resets: acc.resets.concat(il.resets) };
      })();
      const acts = await S.fetchActivities(m);
      const threads = await S.fetchTextThreads(m);
      const threadByLead = {}; threads.forEach((t) => { threadByLead[t.leadId] = t; });
      const qTime = {};
      const c = code(m);

      /* leads: MarketSharp inquiry + Access LEAD (OPERATOR) */
      raw.inquiries.forEach((q) => {
        if (!inR(q.date)) return;
        const t = threadByLead[q.id];
        const time = t ? later(t.cameIn.time, "qi:" + q.id, 1, 4, q.date) : tod("q:" + q.id, q.date, 8.5, 19.5);
        qTime[q.id] = time;
        push({ userId: m, system: "MarketSharp", sourceKind: "marketsharp", eventType: "inquiry_entered", actionType: "lead", date: q.date, time,
          desc: "Inquiry entered — " + q.source + " · " + q.product + (q.outcome && q.outcome !== "Appt Set" ? " · result: " + q.outcome : ""),
          customer: S.leadName(q.id), leadId: q.id, ownerId: m, office: q.office, employeeKey: "assignToEmployeeId" });
      });
      accAll.inquiries.forEach((q) => {
        if (!inR(q.date)) return;
        const only = /-A$/.test(q.id);
        const base = qTime[q.id] || tod("qa:" + q.id, q.date, 8.5, 19.5);
        push({ userId: m, system: accSys(q.office), sourceKind: "access-mi", eventType: "lead_keyed", actionType: "lead", date: q.date, time: later(base, "qk:" + q.id, 2, 9, q.date),
          desc: "Lead taken (OPERATOR " + c.staff + ") — " + q.source + (only ? " · taken by phone, only in Access" : ""),
          customer: S.leadName(q.id), leadId: q.id.replace(/-A$/, ""), ownerId: m, office: q.office, employeeKey: c.staff });
      });

      /* appointments set: MarketSharp + Access (WHOSET, RUNTYPE NEW) + Access-only CB / RES + FINCOM notes */
      raw.appointments.forEach((a) => {
        if (!inR(a.setDate)) return;
        const base = qTime[a.inquiryId] || tod("as:" + a.id, a.setDate, 9, 19.5);
        push({ userId: m, system: "MarketSharp", sourceKind: "marketsharp", eventType: "appt_set", actionType: "set", date: a.setDate, time: later(base, "am:" + a.id, 3, 12, a.setDate),
          desc: "Appointment set for " + apptLabel(a) + " · " + a.product, customer: S.leadName(a.inquiryId), leadId: a.inquiryId, ownerId: m, office: a.office, employeeKey: "Appt Set By" });
        const noteText = NOTES[Math.floor(u("nx:" + a.id) * NOTES.length)];
        if (u("note:" + a.id) < 0.3) push({ userId: m, system: accSys(a.office), sourceKind: "access-mi", eventType: "note", actionType: "note", date: a.setDate, time: later(base, "nt:" + a.id, 6, 15, a.setDate),
          noteText, appointmentId: a.id,
          desc: "Note (FINCOM, " + c.initials + "): “" + noteText + "”", customer: S.leadName(a.inquiryId), leadId: a.inquiryId, ownerId: m, office: a.office, employeeKey: c.initials });
      });
      accAll.appointments.forEach((a) => {
        if (!inR(a.setDate)) return;
        const id0 = a.id.replace(/-A$/, "");
        const base = qTime[a.inquiryId] || tod("aa:" + a.id, a.setDate, 9, 19.5);
        push({ userId: m, system: accSys(a.office), sourceKind: "access-mi", eventType: "appt_set", actionType: "set", date: a.setDate, time: later(base, "ak:" + id0, 4, 14, a.setDate),
          desc: "Appt set (WHOSET " + c.staff + ", NEW) for " + apptLabel(a) + (/-A$/.test(a.id) ? " · keyed only in Access" : ""), customer: S.leadName(a.inquiryId), leadId: a.inquiryId, ownerId: m, office: a.office, employeeKey: c.staff });
      });
      accAll.callbacks.forEach((cb) => {
        if (!inR(cb.date)) return;
        const qid = cb.id.replace(/-CB$/, "");
        push({ userId: m, system: accSys(cb.office), sourceKind: "access-mi", eventType: "appt_set", actionType: "callback", date: cb.date, time: later(qTime[qid] || tod("cb:" + cb.id, cb.date, 9, 19), "cbk:" + cb.id, 2, 8, cb.date),
          desc: "Callback set (RUNTYPE CB, WHOSET " + c.staff + ")", customer: S.leadName(qid), leadId: qid, ownerId: m, office: cb.office, employeeKey: c.staff });
      });
      accAll.resets.forEach((r) => {
        if (!inR(r.date)) return;
        const aid = r.id.replace(/-R$/, "");
        push({ userId: m, system: accSys(r.office), sourceKind: "access-mi", eventType: "appt_set", actionType: "set", date: r.date, time: tod("rs:" + r.id, r.date, 9, 19),
          desc: "Appointment reset (RUNTYPE RES, WHOSET " + c.staff + ")", customer: S.leadName(aid.replace("-A", "-Q")), leadId: aid.replace("-A", "-Q"), ownerId: m, office: r.office, employeeKey: c.staff });
      });

      /* MarketSharp activities this marketer completed (calls, emails, to-dos; old Text Outs) */
      acts.forEach((a) => {
        if (!inR(a.completedDate) || a.assignedToId !== m || a.type === "Text In") return;
        if (a.type === "Text Out" && a.completedDate >= TXT_FROM) return; /* same texts as the threads */
        if (office && a.office !== office) return;
        push({ userId: m, system: "MarketSharp", sourceKind: "marketsharp", eventType: "activity", actionType: ACT_TYPE[a.type] || "note", date: a.completedDate, time: a.completedTime,
          desc: a.type + " · " + a.reference + " — " + (a.result || "done"), customer: a.leadFirst + " " + a.leadLast, leadId: a.leadId, ownerId: m, office: a.office, employeeKey: "assignToEmployeeId" });
      });

      /* texts (threads): people texts credited; Hatch-as-Tom flagged; replies opened by staff */
      threads.forEach((t) => {
        if (office && t.office !== office) return;
        const cust = t.leadFirst + " " + t.leadLast;
        t.messages.forEach((msg, i) => {
          if (msg.dir === "out" && inR(msg.date)) {
            const proxy = !!(msg.auto || msg.isHatchProxy);
            const op = msg.opened ? "opened by the customer at " + t12(msg.openedAt) : "not opened yet";
            push({ userId: proxy ? null : (msg.sentByUserId || m), isHatchProxy: proxy, auto: !!msg.auto, system: msg.sourceSystem || (proxy ? "Hatch" : "MarketSharp"), sourceKind: proxy ? "hatch" : "marketsharp",
              eventType: "text_out", actionType: "text", date: msg.date, time: msg.time, desc: (msg.auto ? "Auto text sent — " : "Text sent — ") + op,
              customer: cust, leadId: t.leadId, threadId: t.id, ownerId: m, office: t.office, employeeKey: proxy ? "Tom (Hatch integration)" : "assignToEmployeeId" });
          }
          if (msg.dir === "in" && msg.seenByUserId && inR(msg.seenDate)) {
            push({ userId: msg.seenByUserId, system: msg.sourceSystem || "Hatch", sourceKind: "hatch", eventType: "reply_seen", actionType: "seen", date: msg.seenDate, time: msg.seenAt,
              desc: "Opened a text reply (sent " + t12(msg.time) + ") · Hatch open times TBD", customer: cust, leadId: t.leadId, threadId: t.id, ownerId: m, office: t.office, employeeKey: "TBD" });
          }
        });
      });

      /* confirm team (Shelby / Taylor B): Access WHOCONFIRM + MarketSharp Confirm Appointment call */
      const msConfirmed = {};
      raw.appointments.forEach((a) => {
        if (!inR(a.confirmedDate)) return;
        const who = u("cf:" + a.id) < 0.62 ? CONFIRMERS[0] : CONFIRMERS[1];
        const time = tod("cft:" + a.id, a.confirmedDate, 9, 18);
        msConfirmed[a.id] = time;
        push({ userId: who, system: "MarketSharp", sourceKind: "marketsharp", eventType: "activity", actionType: "confirm", date: a.confirmedDate, time, appointmentId: a.id,
          desc: "Call Out · Confirm Appointment — Completed (appt " + apptLabel(a) + ")", customer: S.leadName(a.inquiryId), leadId: a.inquiryId, ownerId: m, office: a.office, employeeKey: "assignToEmployeeId" });
      });
      accAll.appointments.forEach((a) => {
        if (!inR(a.confirmedDate)) return;
        const id0 = a.id.replace(/-A$/, "");
        const who = u("cf:" + id0) < 0.62 ? CONFIRMERS[0] : CONFIRMERS[1];
        const stamped = u("cfs:" + id0) < 0.55;
        const base = msConfirmed[id0] || tod("cfa:" + id0, a.confirmedDate, 9, 18);
        push({ userId: who, system: accSys(a.office), sourceKind: "access-mi", eventType: "confirm", actionType: "confirm", date: a.confirmedDate, appointmentId: id0, stamped,
          time: stamped ? later(base, "cfl:" + id0, 1, 4, a.confirmedDate) : null, atPrecision: stamped ? "minute" : "day",
          desc: "Confirmed (WHOCONFIRM " + code(who).initials + ") — appt " + apptLabel(a) + (stamped ? " · time from COMMENT stamp" : "") + (msConfirmed[id0] ? "" : " · no MarketSharp confirm"),
          customer: S.leadName(a.inquiryId), leadId: a.inquiryId, ownerId: m, office: a.office, employeeKey: code(who).initials });
      });

      /* data processors (Erin / Taylor C): results keyed the next morning, in both systems */
      raw.appointments.forEach((a) => {
        if (!a.resulted) return;
        let kd = addDays(a.apptDate, 1); if (dow(kd) === 0) kd = addDays(kd, 1);
        if (!inR(kd) || kd > TODAY) return;
        const who = u("dp:" + a.id) < 0.55 ? DATAPROC[0] : DATAPROC[1];
        const time = tod("dpt:" + a.id, kd, 8, 11.5);
        push({ userId: who, system: accSys(a.office), sourceKind: "access-mi", eventType: "status_keyed", actionType: "status", date: kd, time, appointmentId: a.id, result: a.result,
          desc: "STATUS keyed: " + a.result.toUpperCase() + (a.sold ? " · contract to board" : ""), customer: S.leadName(a.inquiryId), leadId: a.inquiryId, ownerId: m, office: a.office, employeeKey: code(who).initials });
        push({ userId: who, system: "MarketSharp", sourceKind: "marketsharp", eventType: "status_change", actionType: "status", date: kd, time: later(time, "dpm:" + a.id, 1, 6, kd),
          desc: "Appointment result changed to “" + a.result + "”", customer: S.leadName(a.inquiryId), leadId: a.inquiryId, ownerId: m, office: a.office, employeeKey: "Employees.name" });
      });
        }
    return out;
  }

  async function fetchActionEvents(opts) {
    const o = opts || {};
    const from = o.from, to = o.to || TODAY;
    const office = o.office && o.office !== "ALL" ? o.office : undefined;
    const key = from + "|" + to + "|" + (office || "ALL");
    if (cache[key]) return cache[key];
    let out = [];
    for (const m of NS.sample.marketerIds()) out = out.concat(await buildFor(m, from, to, office));
    out.sort((a, b) => (b.date + (b.time || "00:00")).localeCompare(a.date + (a.time || "00:00")));
    return (cache[key] = out);
  }

  /* every trail event on one customer (for the customer record's Notes / Activities tabs) */
  const leadCache = {};
  async function fetchLeadEvents(ownerId, leadId, from) {
    const key = ownerId + "|" + from;
    if (!leadCache[key]) leadCache[key] = await buildFor(ownerId, from, TODAY, undefined);
    return leadCache[key].filter((e) => e.leadId === leadId);
  }
  /* who confirmed / keyed results on an appointment (same hash the trail uses) */
  const confirmerFor = (apptId) => (u("cf:" + String(apptId).replace(/-A$/, "")) < 0.62 ? CONFIRMERS[0] : CONFIRMERS[1]);
  const dataProcFor = (apptId) => (u("dp:" + apptId) < 0.55 ? DATAPROC[0] : DATAPROC[1]);

  NS.sampleTrail = { id: "sampleTrail", isLive: false, fetchActionEvents, fetchLeadEvents, confirmerFor, dataProcFor, hash: u };
})();
