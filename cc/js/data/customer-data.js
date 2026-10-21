/* Customer record data (v14) — one normalized record per customer for the profile drawer.
 *   DashboardData.getCustomers(scopeId | "ALL", { office, days }) → Promise<rows for the Leads list>
 *   DashboardData.getCustomerRecord(id, { viewer }) → Promise<CustomerRecord | { restricted }>
 * Sample: built from the same seeded rows as Home / Activity / Speed to Lead / the action trail, plus hash-seeded
 * extras (prior inquiries, repeat-customer jobs, notes, custom fields) — "cr-v1", no new RNG draws, so no other number moves.
 * Live: see DESIGN.md → Adapter field contract → Customer record (MarketSharp Contact / Inquiries / Appointments / Jobs /
 * Activities / Notes; Access LEAD / APPOINTMENTS / FINCOM / CONPRICE; Hatch thread link). Read-only. */
(function () {
  "use strict";
  const A = window.DashboardAdapters || {};
  const D = window.DashboardData;
  const TODAY = "2026-10-05";
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const pad = (n) => String(n).padStart(2, "0");
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function fmix(h) { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; }
  const u = (key) => fmix(hashStr("cr-v1:" + key)) / 4294967296;
  const pick = (key, arr) => arr[Math.floor(u(key) * arr.length)];
  const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dow = (iso) => new Date(iso + "T00:00:00Z").getUTCDay();
  const prevWork = (iso) => { let d = addDays(iso, -1); while (dow(d) === 0) d = addDays(d, -1); return d; };
  const nextWork = (iso, n) => { let d = iso; for (let i = 0; i < n; i++) { d = addDays(d, 1); if (dow(d) === 0) d = addDays(d, 1); } return d; };
  const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
  const slotTime = (s) => { const h = +s.split(":")[0]; return pad(h === 10 || h === 11 ? h : h === 12 ? 12 : h + 12) + ":00"; };
  const mdY = (iso) => (+iso.slice(5, 7)) + "/" + (+iso.slice(8, 10)) + "/" + iso.slice(0, 4);
  const md = (iso) => (+iso.slice(5, 7)) + "/" + (+iso.slice(8, 10));
  const t12 = (t) => { if (!t) return ""; let h = +t.slice(0, 2); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + t.slice(3, 5) + " " + ap; };
  const userName = (id) => (D && D.userName ? D.userName(id) : id);
  const initialsOf = (id) => { const c = window.IdentityMap && window.IdentityMap.accessCodes(id); return c ? c.initials : "?"; };

  /* fake sample reps / crews (never real names) */
  const REPS = ["Dan Whitaker", "Ray Holloway", "Greg Navarro", "Tom Brandt", "Luis Ortega", "Mike Sorensen", "Jeff Kaminski", "Scott Pruitt"];
  const CREWS = ["Crew 2 – Delgado", "Crew 4 – Hartman", "Crew 5 – Price", "Crew 7 – Okafor", "Install Team B"];
  const FIRSTS = ["Linda", "Mark", "Karen", "Jim", "Sue", "Ron", "Pam", "Dave", "Joan", "Rick"];
  const REASONS_DNS = ["Too much money for budget", "Wants other bids", "Needs to think about it", "Financing not approved", "Spouse wants to wait"];
  const REASONS_NS = ["Not home", "Forgot appointment", "Rescheduling — call back"];
  const REASONS_CX = ["Customer cancelled", "Went with another company", "Illness"];
  const OLD_PRODUCTS = ["Gutter Helmet", "Windows", "Entry Door", "Siding", "Roofing"];
  const OLD_SOURCES = ["Home Show", "Referral", "Google Ad", "Canvass", "TV"];

  const repFor = (apptId) => REPS[Math.floor(u("rep:" + apptId) * REPS.length)];
  const leadNum = (id) => 1100000 + Math.floor(u("ld:" + id) * 90000);
  const msContactId = (id) => { const h = fmix(hashStr("cid:" + id)).toString(16).padStart(8, "0"); return h + "-" + h.slice(0, 4) + "-4" + h.slice(1, 4) + "-a" + h.slice(4, 7) + "-" + (h + h).slice(0, 12); };
  const fmtPhone = (p) => { const d = String(p || "").replace(/\D/g, ""); return d.length === 10 ? "1 (" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : p; };
  const srcCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);

  function stageOf(q, ap) { return ap ? (ap.sold ? "Sold" : ap.dateIssued ? "Issued" : "Set") : "Inquiry"; }
  function queueOf(q, ap) {
    if (ap) {
      if (ap.sold) return "Sold";
      if (ap.apptDate > TODAY) return ap.confirmedDate ? "Confirmed" : "Pending Confirmation";
      if (ap.apptDate === TODAY) return "Issued — result tonight";
      if (/Demo No Sale/.test(ap.result)) return "Rehash";
      return "Recontact";
    }
    return ({ "Call back": "Call Back", "Left message": "Attempting Contact", "Not interested": "Not Interested", "Wrong number": "Dead Lead", "Out of area": "Dead Lead", "Price shopper": "Attempting Contact" })[q.outcome] || "New Lead";
  }
  const ownerOf = (id) => String(id).split("-Q")[0];

  /* ——— Leads list ——— */
  async function getCustomers(scopeId, opts) {
    const o = opts || {};
    const S = A.sample;
    const days = o.days || 10;
    const from = addDays(TODAY, -(days - 1));
    const soldFrom = addDays(TODAY, -60);
    const ids = scopeId === "ALL" ? S.marketerIds() : [scopeId];
    const rows = [];
    for (const m of ids) {
      const raw = await S.fetchMarketerRaw(m, { office: o.office });
      const apById = {}; raw.appointments.forEach((a) => { apById[a.id] = a; });
      raw.inquiries.forEach((q) => {
        const ap = q.appointmentId ? apById[q.appointmentId] : null;
        const recentSale = ap && ap.sold && ap.saleDate >= soldFrom;
        if (q.date < from && !recentSale) return;
        const name = S.leadName(q.id).split(" ");
        rows.push({
          id: q.id, first: name[0], last: name.slice(1).join(" "), name: name.slice(1).join(" ") + ", " + name[0], date: q.date, city: (S.leadCity ? S.leadCity(q) : ""), state: q.office,
          product: q.product, source: q.source, cts: queueOf(q, ap), status: stageOf(q, ap), rep: ap && ap.dateIssued ? repFor(ap.id) : null,
          setDate: ap ? ap.setDate : null, apptDate: ap ? ap.apptDate : null, system: "MarketSharp + Access", ownerId: m, ownerName: userName(m),
          hasJobs: !!(ap && ap.sold) || u("repeat:" + q.id) < 0.06
        });
      });
    }
    rows.sort((a, b) => b.date.localeCompare(a.date));
    return { rows, from, soldFrom, today: TODAY };
  }

  /* ——— Customer record ——— */
  async function getCustomerRecord(id, opts) {
    const viewer = (opts && opts.viewer) || null;
    const isMarketerViewer = !!(viewer && viewer.marketer);
    const isManager = !!(viewer && viewer.role === "Manager");
    let rec;
    if (/-Q\d+$/.test(String(id))) rec = await buildGenerated(id);
    else rec = buildStatic(id);
    if (!rec) return null;
    if (isMarketerViewer && rec.ownerId && rec.ownerId !== viewer.id) {
      return { restricted: true, id, name: rec.name, ownerName: rec.ownerName };
    }
    /* role rule on the record: managers (and confirm/office staff) see every activity; a marketer viewing their own customer
     * doesn't see confirm-team / office activities (same v9 audience rule as their Activity list) */
    const AD = window.ActivityDefs;
    const audience = isMarketerViewer ? "marketer" : "all";
    const allActs = rec.activities;
    rec.activities = allActs.filter((a) => !AD || a.isText || AD.inAudience(a, audience));
    rec.hiddenActivities = allActs.length - rec.activities.length;
    rec.viewerAudience = audience;
    rec.viewerIsManager = isManager;
    return rec;
  }

  async function buildGenerated(id) {
    const S = A.sample, T = A.sampleTrail, ACC = A.accessSample;
    const owner = ownerOf(id);
    const prof = await S.fetchLeadProfile(id);
    if (!prof) return null;
    const q = prof.inquiry, who = prof.identity, ap = prof.appointment, thread = prof.thread;
    const office = q.office;
    const acc = ACC ? await ACC.fetchMarketerActivity(owner, { office }) : { appointments: [], resets: [], callbacks: [] };
    const accAp = ap ? acc.appointments.find((x) => x.id === ap.id) : null;
    /* Access resets: only shown when the first appointment didn't sit (a sold / demo-no-sale visit can't be followed by a reset) */
    const accReset0 = ap ? (acc.resets || []).find((x) => x.id === ap.id + "-R") : null;
    const accReset = accReset0 && !(ap.sold || /Demo No Sale|SOLD/i.test(ap.result || "")) ? accReset0 : null;
    const events = T ? await T.fetchLeadEvents(owner, id, q.date) : [];
    const accSys = office === "IL" ? "Illinois Access" : "Michigan Access";
    const ownerName = userName(owner);
    const street = who.address, zip4 = who.zip + " - " + pad(1000 + Math.floor(u("z4:" + id) * 8999)).slice(-4);
    const fullAddr = street + ", " + who.city + ", " + office + " " + who.zip;
    const repeat = u("repeat:" + id) < 0.06 || (ap && ap.sold && u("repeat2:" + id) < 0.25);
    const dup = u("dup:" + id) < 0.12;
    const older = !repeat && u("old:" + id) < 0.14;
    const ln = leadNum(id);

    /* phones / email */
    const phones = [{ label: "Cell Phone", number: fmtPhone(who.phone), note: "(Primary)", system: "MarketSharp" }];
    if (u("ph2:" + id) < 0.45) phones.unshift({ label: u("ph3:" + id) < 0.5 ? "Cell Phone" : "Home Phone", number: fmtPhone(String(who.phone).replace(/\D/g, "").slice(0, 6) + String(1000 + Math.floor(u("ph4:" + id) * 9000))), note: srcCode(q.source), system: "MarketSharp" });
    const emails = [{ label: "Primary Email", address: (who.first + "." + who.last).toLowerCase().replace(/[^a-z.]/g, "") + (u("em:" + id) < 0.5 ? "" : Math.floor(u("em2:" + id) * 90 + 10)) + "@example.com" }];

    /* inquiries & appointments */
    const appts = [];
    if (ap) {
      const future = ap.apptDate > TODAY;
      const msResult = future ? (ap.confirmedDate ? "Confirmed" : "Scheduled") : ap.apptDate === TODAY ? "Issued — result tonight" : ap.result.toUpperCase();
      const accConfirmedOnly = accAp && accAp.confirmedDate && !ap.confirmedDate;
      appts.push({
        id: ap.id, date: ap.apptDate, time: slotTime(ap.apptSlot), type: "Sales Presentation",
        salesperson: ap.dateIssued ? repFor(ap.id) : (ap.confirmedDate || accConfirmedOnly ? "Confirmed" : "Unconfirmed"),
        salespersonTip: ap.dateIssued ? "" : "Placeholder salesperson until a rep is assigned (MarketSharp uses Confirmed / Unconfirmed placeholder employees).",
        result: accConfirmedOnly && future ? "Confirmed" : msResult,
        resultSystem: accConfirmedOnly && future ? accSys : "MarketSharp",
        mismatch: accConfirmedOnly ? { access: "Confirmed (WHOCONFIRM)", ms: future ? "Scheduled" : "no Confirm Appointment activity", kind: future ? "result" : "confirm" } : null,
        resultReason: /Demo No Sale/.test(ap.result) ? pick("rr:" + id, REASONS_DNS) : /No Show/.test(ap.result) ? pick("rr:" + id, REASONS_NS) : /Cancel|CANX/.test(ap.result) ? pick("rr:" + id, REASONS_CX) : "",
        system: "MarketSharp", setDate: ap.setDate, setBy: ownerName
      });
      if (accReset) {
        const rd = nextWork(ap.apptDate, 2);
        appts.unshift({ id: ap.id + "-R", date: rd, time: "16:00", type: "Reset", salesperson: rd > TODAY ? "Confirmed" : repFor(ap.id), result: rd > TODAY ? "Confirmed" : "Issued", resultReason: "", system: accSys, onlyIn: accSys, setDate: accReset.date, setBy: ownerName });
      }
    }
    const inquiries = [{
      id, date: q.date, source: q.source, product: q.product, kind: ap && /Demo No Sale/.test(ap.result) ? "Rehash" : "",
      jobSite: fullAddr, status: ap ? "Appointment" : "Lead", statusSub: ap ? "Set" : (q.outcome || "New"),
      canvasser: q.source === "Canvass" ? pick("cv:" + id, ["Jake Lindqvist", "Marcus Hill"]) : "", telemarketer: ownerName, promoter: "",
      appointments: appts, system: "MarketSharp", accessLeadNum: ln
    }];
    if (dup) inquiries.push({ id: id + "-D", date: q.date, source: q.source === "Google Ad" ? "Facebook" : "Google Ad", product: q.product, kind: "", jobSite: fullAddr, status: "Duplicate", statusSub: "", canvasser: "", telemarketer: "", promoter: "", appointments: [], system: "MarketSharp", note: "Same homeowner came in twice — Access dropped the duplicate (DUPE source)." });
    let oldInq = null;
    if (repeat || older) {
      const yrs = 1 + Math.floor(u("oy:" + id) * 5);
      const od = (+q.date.slice(0, 4) - yrs) + q.date.slice(4, 8) + pad(1 + Math.floor(u("od:" + id) * 27));
      const prod = pick("op:" + id, OLD_PRODUCTS), src = pick("os:" + id, OLD_SOURCES);
      const oa = nextWork(od, 3);
      oldInq = { id: id + "-O", date: od, source: src, product: prod, kind: "", jobSite: fullAddr, status: "Appointment", statusSub: "Set", canvasser: src === "Canvass" ? "Jake Lindqvist" : "", telemarketer: pick("ot:" + id, ["Lisa Kolenda", "Cindy Moreno", "Former employee"]), promoter: src === "Home Show" ? "Show booth team" : "",
        appointments: [{ id: id + "-OA", date: oa, time: "18:00", type: "Sales Presentation", salesperson: repFor(id + "o"), result: repeat ? "SOLD" : "DEMO NO SALE", resultReason: repeat ? "" : pick("orr:" + id, REASONS_DNS), system: "MarketSharp" }], system: "MarketSharp", old: true };
      inquiries.push(oldInq);
    }

    /* jobs (only with sales data) — Access CONPRICE is primary when the totals disagree */
    const jobs = [];
    if (ap && ap.sold) {
      const msTotal = ap.saleAmount, accTotal = accAp ? accAp.saleAmount : null;
      const age = daysBetween(ap.saleDate, TODAY);
      const cs = ap.contractStatus;
      const status = cs === "Approved" ? (age > 40 ? "Completed Paid" : age > 14 ? "In Progress" : "Ready to Order") : cs === "Pending" ? "Pending Approval" : cs === "Canceled" ? "Canceled" : cs === "Finance Rejected" ? "Finance Rejected" : "Contract not keyed yet";
      const total = accTotal != null ? accTotal : msTotal;
      const balance = status === "Completed Paid" || status === "Canceled" ? 0 : status === "In Progress" ? Math.round(total / 2 * 100) / 100 : total;
      jobs.push({ number: 90000 + Math.floor(u("jn:" + id) * 9000), name: (who.last + "-" + q.product).toUpperCase(), site: fullAddr, contractDate: ap.saleDate,
        total, totalMs: msTotal, totalAccess: accTotal, mismatch: accTotal != null && accTotal !== msTotal, balance, status, accSys,
        products: [{ product: q.product.toUpperCase(), salesperson: repFor(ap.id), price: total, completeDate: status === "Completed Paid" ? addDays(ap.saleDate, 30 + Math.floor(u("cd:" + id) * 9)) : "", workCrew: /Completed|In Progress/.test(status) ? pick("cw:" + id, CREWS) : "" }] });
    }
    if (repeat && oldInq) {
      const price = Math.round((3000 + u("opr:" + id) * 9000) / 10) * 10;
      jobs.push({ number: 70000 + Math.floor(u("ojn:" + id) * 19000), name: (who.last + "-" + oldInq.product).toUpperCase(), site: fullAddr, contractDate: oldInq.appointments[0].date,
        total: price, totalMs: price, totalAccess: price, mismatch: false, balance: 0, status: "Completed Paid", accSys,
        products: [{ product: oldInq.product.toUpperCase(), salesperson: oldInq.appointments[0].salesperson, price, completeDate: addDays(oldInq.appointments[0].date, 35), workCrew: pick("ocw:" + id, CREWS) }] });
    }

    /* activities: MarketSharp activity list for this lead + confirm-team rows + texts (from the thread, not doubled) */
    const activities = [];
    const TXT_FROM = "2026-10-02";
    (prof.activities || []).forEach((a) => {
      if ((a.type === "Text Out" || a.type === "Text In") && thread && a.dueDate >= TXT_FROM) return;
      activities.push({ id: a.id, completedDate: a.completedDate, completedTime: a.completedTime, dueDate: a.dueDate, dueTime: a.dueTime, assignedTo: userName(a.assignedToId),
        type: a.type, reference: a.reference, result: a.result, system: "MarketSharp" });
    });
    if (ap) {
      const conf = T.confirmerFor(ap.id);
      const before = prevWork(ap.apptDate) < ap.setDate ? ap.setDate : prevWork(ap.apptDate);
      const done = before < TODAY || (before === TODAY);
      activities.push({ id: ap.id + "-rem", type: "Text Out", reference: "Appointment Reminder", assignedTo: userName(conf), dueDate: before, dueTime: "10:00",
        completedDate: done ? before : null, completedTime: done ? (before === TODAY ? "10:04" : "10:02") : null, result: done ? "Text Success" : null, system: "MarketSharp" });
      if (u("remail:" + id) < 0.5) activities.push({ id: ap.id + "-reme", type: "Email Out", reference: "Appointment Reminder", assignedTo: userName(conf), dueDate: before, dueTime: "10:00",
        completedDate: done ? before : null, completedTime: done ? "10:01" : null, result: done ? (u("remf:" + id) < 0.24 ? "Email Failure" : "Email Success") : null, system: "MarketSharp" });
      const msConf = events.find((e) => e.actionType === "confirm" && e.system === "MarketSharp");
      if (msConf) activities.push({ id: ap.id + "-cf", type: "Call Out", reference: "Confirm Appointment", assignedTo: userName(msConf.userId), dueDate: before, dueTime: "14:00", completedDate: msConf.date, completedTime: msConf.time, result: "Completed", system: "MarketSharp" });
      else if (ap.apptDate > TODAY) activities.push({ id: ap.id + "-cf", type: "Call Out", reference: "Confirm Appointment", assignedTo: userName(conf), dueDate: before, dueTime: "14:00", completedDate: null, completedTime: null, result: null, system: "MarketSharp" });
      if (ap.sold && u("ty:" + id) < 0.6) activities.push({ id: ap.id + "-ty", type: "To-Do", reference: "Thank You", assignedTo: "Office", dueDate: nextWork(ap.saleDate, 1), dueTime: "11:00", completedDate: nextWork(ap.saleDate, 1) <= TODAY ? nextWork(ap.saleDate, 1) : null, completedTime: "11:20", result: nextWork(ap.saleDate, 1) <= TODAY ? "Completed" : null, system: "MarketSharp" });
    }
    if (thread) thread.messages.forEach((m, i) => {
      const proxy = m.auto || m.isHatchProxy;
      activities.push({ id: thread.id + "-m" + i, isText: true, type: m.dir === "out" ? "Text Out" : "Text In", reference: m.auto ? "Auto text" : "Speed to Lead",
        assignedTo: m.dir === "in" ? "" : proxy ? "Hatch (system/AI, via Tom’s login)" : userName(m.sentByUserId || owner), isHatchProxy: m.dir === "out" && !!proxy,
        dueDate: m.date, dueTime: m.time, completedDate: m.date, completedTime: m.time, result: m.dir === "out" ? "Text Success" : "Text Received",
        opened: m.dir === "out" ? !!m.opened : null, openedAt: m.openedAt, system: m.sourceSystem || (proxy ? "Hatch" : "MarketSharp"), text: m.text });
    });
    activities.sort((a, b) => ((b.completedDate || b.dueDate) + (b.completedTime || b.dueTime || "")).localeCompare((a.completedDate || a.dueDate) + (a.completedTime || a.dueTime || "")));

    /* notes */
    const notes = [];
    appts.filter((x) => x.type === "Sales Presentation" && x.setDate).forEach((x) => {
      const setEv = events.find((e) => e.actionType === "set" && e.system === "MarketSharp");
      const tm = setEv ? setEv.time : "12:00";
      notes.push({ date: x.setDate, time: tm, type: "Appointment", source: "Appointment set on " + mdY(x.setDate) + " for " + mdY(q.date) + " inquiry", note: "LD#" + ln + (u("nq:" + id) < 0.4 ? " - " + q.product.toUpperCase() + " QUOTE AT VISIT" : ""), system: "MarketSharp", by: ownerName });
      notes.push({ date: x.setDate, time: tm.slice(0, 3) + pad(Math.max(0, +tm.slice(3) - 3)), type: "Contact Note", source: ownerName, note: "APPT " + DOW[dow(x.date)].toUpperCase() + " " + md(x.date) + "@" + t12(x.time).replace(":00", "").replace(" ", ""), system: "MarketSharp", by: ownerName });
    });
    if (accReset) notes.push({ date: accReset.date, time: "15:14", type: "Contact Note", source: userName(T.confirmerFor(ap.id)), note: "CUST WANTS SPOUSE THERE — RESET " + md(nextWork(ap.apptDate, 2)) + " @ 4 PM", system: accSys, by: "FINCOM" });
    events.forEach((e) => {
      if (e.actionType === "note" && e.noteText) notes.push({ date: e.date, time: e.time, type: "Contact Note", source: ownerName, note: e.noteText.toUpperCase(), system: e.system, by: "FINCOM " + initialsOf(owner) });
      if (e.actionType === "confirm" && e.eventType === "confirm" && e.stamped) {
        const ini = initialsOf(e.userId);
        const d = new Date(e.date + "T00:00:00Z");
        notes.push({ date: e.date, time: e.time, type: "Contact Note", source: userName(e.userId), note: "CNF W/HO " + ini + " [" + (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + "/" + e.date.slice(2, 4) + " " + t12(e.time).replace(" ", "").replace("PM", "p").replace("AM", "a") + "] " + ini, system: e.system, by: "COMMENT stamp" });
      }
      if (e.eventType === "status_keyed") notes.push({ date: e.date, time: e.time, type: "Result", source: userName(e.userId), note: "RESULT KEYED: " + String(e.result || "").toUpperCase(), system: e.system, by: initialsOf(e.userId) });
    });
    if (u("tomnote:" + id) < 0.12 && ap) notes.push({ date: ap.setDate, time: "16:27", type: "Contact Note", source: "Tom Otten", note: "Good lead — make sure the rep brings " + q.product.toLowerCase() + " samples", system: "MarketSharp", by: "Tom Otten" });
    notes.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));

    /* quotes / attachments / add'l contacts / custom fields / lead info */
    const quotes = [];
    if (ap && ap.quoted) quotes.push({ number: "Q-" + (40000 + Math.floor(u("qn:" + id) * 9999)), date: ap.apptDate, product: q.product, salesperson: repFor(ap.id), amount: ap.quoteAmount, status: ap.sold ? "Accepted" : "Open — rehash", system: "MarketSharp" });
    const attachments = [];
    if (ap && ap.sold) {
      attachments.push({ name: "Contract - " + who.last + ".pdf", kind: "Contract", added: ap.saleDate, by: userName(T.dataProcFor(ap.id)), size: "412 KB" });
      if (u("att2:" + id) < 0.6) attachments.push({ name: "Measure sheet - " + q.product + ".jpg", kind: "Photo", added: ap.saleDate, by: repFor(ap.id), size: "1.8 MB" });
    }
    const contacts = [];
    if (u("ac:" + id) < 0.35) contacts.push({ name: pick("acn:" + id, FIRSTS) + " " + who.last, relation: "Spouse / co-owner", phone: u("acp:" + id) < 0.5 ? fmtPhone(who.phone.slice(0, 8) + pad(Math.floor(u("acq:" + id) * 100))) : "", email: "", primary: false });
    const customFields = [
      { label: "Access lead #", value: String(ln), system: accSys },
      { label: "Home built (year)", value: String(1950 + Math.floor(u("yb:" + id) * 70)) },
      { label: "How did you hear about us", value: q.source },
      { label: "Interested in financing", value: u("fin:" + id) < 0.35 ? "Yes" : "No" },
      { label: "Best time to call", value: pick("bt:" + id, ["Evenings", "Mornings", "Weekends", "Any time"]) },
      { label: "OK to text", value: thread && thread.messages.some((m) => m.optOut) ? "No — texted STOP" : "Yes" },
      { label: "Pets on site", value: u("pet:" + id) < 0.3 ? "Dog" : "None" }
    ];
    const leadInfo = [
      { label: "Contact type", value: ap && ap.sold ? "Customer" : "Lead", system: "MarketSharp" },
      { label: "Marketing queue", value: queueOf(q, ap), system: "MarketSharp" },
      { label: "Primary lead source", value: q.source, system: "MarketSharp" },
      { label: "Product interest", value: q.product, system: "MarketSharp" },
      { label: "Telemarketer", value: ownerName, system: "MarketSharp" },
      { label: "Lead taken by (OPERATOR)", value: ownerName + " · " + ((window.IdentityMap && window.IdentityMap.accessCodes(owner)) || {}).staff, system: accSys },
      { label: "Date entered", value: mdY(q.date), system: "MarketSharp" },
      { label: "Access lead #", value: String(ln), system: accSys },
      { label: "MarketSharp contact id", value: msContactId(id), system: "MarketSharp" },
      { label: "Office", value: office === "IL" ? "Illinois (company 1)" : "Michigan (company 4746)", system: "MarketSharp" },
      { label: "Speed to Lead", value: thread ? (thread.firstTextSec != null ? "First text " + thread.firstTextSec + " s after the lead came in" : "Text thread on file") : "No texts", system: thread ? "Hatch" : null }
    ];
    const tags = [];
    if (repeat) tags.push("Repeat customer");
    if (thread && thread.messages.some((m) => m.optOut)) tags.push("Do not text");
    return {
      id, kind: "generated", first: who.first, last: who.last, name: who.first + " " + who.last, street, city: who.city, state: office, zip: who.zip, zip4, country: "USA", fullAddr,
      office, ownerId: owner, ownerName, marketingQueue: queueOf(q, ap), tags, phones, emails, threadId: thread ? thread.id : null, threadLegacy: false,
      leadInfo, activities, notes, inquiries, jobs, quotes, attachments, contacts, customFields, accSys,
      sources: ["MarketSharp", accSys].concat(thread ? ["Hatch"] : []), isSample: true
    };
  }

  /* older shared sample leads (SampleData.leads) → same shape, thin */
  function buildStatic(id) {
    const l = ((window.SampleData && window.SampleData.leads) || []).find((x) => x.id === id);
    if (!l) return null;
    const parts = String(l.name).split(" ");
    const last = parts.slice(-1)[0], first = parts.slice(0, -1).join(" ");
    const stl = ((window.SampleData.speedToLead || {}).conversations || []).find((c) => c.lead === l.name || (l.phones || []).some((p) => p.number === c.leadPhone));
    const accSys = l.state === "IL" ? "Illinois Access" : "Michigan Access";
    const sys = l.system === "Access" ? accSys : "MarketSharp";
    return {
      id, kind: "static", first, last, name: l.name, street: l.address || "", city: l.city, state: l.state, zip: l.zip || "", zip4: l.zip || "", country: "USA",
      fullAddr: (l.address || "") + ", " + l.city + ", " + l.state + " " + (l.zip || ""), office: l.state, ownerId: null, ownerName: "—",
      marketingQueue: l.cts, tags: [], phones: (l.phones || []).map((p, i) => ({ label: p.label + " Phone", number: p.number, note: i === 0 ? "(Primary)" : "", system: sys })),
      emails: l.email && l.email !== "—" ? [{ label: "Primary Email", address: l.email }] : [], threadId: stl ? stl.id : null, threadLegacy: true,
      leadInfo: [{ label: "Lead source", value: l.source, system: sys }, { label: "Product interest", value: l.product, system: sys }, { label: "Stage", value: l.status, system: sys }, { label: "Call status (CTS)", value: l.cts, system: sys }, { label: "Rep", value: l.rep || "Unassigned", system: sys }],
      activities: [],
      notes: (l.notes || []).map((n) => ({ date: n.when.slice(0, 10), time: n.when.slice(11, 16), type: "Contact Note", source: n.who, note: n.text, system: sys })),
      inquiries: [{ id, date: (l.inquiryHistory && l.inquiryHistory[0] && l.inquiryHistory[0].when) || TODAY, source: l.source, product: l.product, kind: "", jobSite: (l.address || "") + ", " + l.city + ", " + l.state, status: l.setDate ? "Appointment" : "Lead", statusSub: l.cts, canvasser: l.source === "Canvass" ? "Sample canvasser" : "", telemarketer: "", promoter: "",
        appointments: (l.appointmentHistory || []).map((h, i) => ({ id: id + "-a" + i, date: l.setDate || TODAY, time: "", type: "Sales Presentation", salesperson: l.rep || "Unconfirmed", result: h.label, resultReason: "", system: sys, dateText: h.when })), system: sys }],
      jobs: [], quotes: [], attachments: [], contacts: [], customFields: [], accSys, sources: [sys], isSample: true, older: true
    };
  }

  D.getCustomers = getCustomers;
  D.getCustomerRecord = getCustomerRecord;
  D.customerHelpers = { mdY, t12, slotTime };
})();
