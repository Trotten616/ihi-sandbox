/* Sample adapter — deterministic (seeded) raw-shaped rows for each marketer.
 * Produces the SAME row shapes a live MarketSharp adapter will return (see js/data/metrics.js header),
 * so swapping adapters changes no widget code. Numbers never change on reload.
 *
 * Sample clock is frozen at Mon Oct 5 2026, 11:50 AM ET so "Today" is a partial phone day and
 * today's appointments are issued but have no result yet (results are keyed in at night).
 */
(function () {
  "use strict";
  const NS = (window.DashboardAdapters = window.DashboardAdapters || {});

  const SAMPLE_TODAY = "2026-10-05";
  const SAMPLE_AS_OF = "2026-10-05T11:50:00-04:00";
  const DATA_START = "2024-11-01"; /* enough history for Last Year + Nov→Oct comparison */
  const TODAY_ELAPSED = 0.3; /* share of the phone day done by 11:50 AM */

  /* Per-marketer profile = the "truth" the generator samples around. Ranges follow Thomas’s guide:
   * 3–8 sets/day · issued 70–80% of sets · sit 55–70% of issued · close 15–30% of sits · avg sale $9k–$15k */
  const ALL_WEEK = [1, 2, 3, 4, 5, 6]; /* Mon–Sat; nobody phones on Sunday */
  const PROFILES = {
    "u-chris":   { setsPerDay: 6.3, setRate: 0.33, issue: 0.77, sit: 0.64, close: 0.25, avgSale: 12600, ilShare: 0.18, callsPerDay: 78, workDays: ALL_WEEK },
    "u-laura":    { setsPerDay: 5.6, setRate: 0.31, issue: 0.79, sit: 0.61, close: 0.27, avgSale: 11800, ilShare: 0.12, callsPerDay: 70, workDays: ALL_WEEK },
    "u-dana":   { setsPerDay: 4.8, setRate: 0.35, issue: 0.74, sit: 0.67, close: 0.21, avgSale: 13900, ilShare: 0.10, callsPerDay: 62, workDays: [2, 3, 4, 5, 6] /* off Mondays */ },
    "u-cindy":   { setsPerDay: 7.1, setRate: 0.30, issue: 0.72, sit: 0.57, close: 0.19, avgSale: 10900, ilShare: 0.22, callsPerDay: 88, workDays: ALL_WEEK },
    "u-karrie":  { setsPerDay: 4.2, setRate: 0.34, issue: 0.80, sit: 0.69, close: 0.29, avgSale: 14200, ilShare: 0.08, callsPerDay: 58, workDays: [1, 2, 3, 4, 5] },
    "u-sara":   { setsPerDay: 5.1, setRate: 0.32, issue: 0.75, sit: 0.60, close: 0.23, avgSale: 12100, ilShare: 0.15, callsPerDay: 66, workDays: ALL_WEEK },
    "u-sandra": { setsPerDay: 3.6, setRate: 0.36, issue: 0.78, sit: 0.63, close: 0.17, avgSale: 9800, ilShare: 0.30, callsPerDay: 52, workDays: ALL_WEEK },
    "u-stella":   { setsPerDay: 4.4, setRate: 0.29, issue: 0.71, sit: 0.56, close: 0.16, avgSale: 11200, ilShare: 0.20, callsPerDay: 74, workDays: ALL_WEEK, start: "2026-03-16" /* newer hire → no last-year numbers */ }
  };

  const SEASON = { 1: 0.72, 2: 0.78, 3: 0.95, 4: 1.08, 5: 1.15, 6: 1.12, 7: 1.05, 8: 1.05, 9: 1.0, 10: 0.95, 11: 0.85, 12: 0.65 };
  const YEAR_MULT = { 2024: 0.94, 2025: 0.97, 2026: 1.04 };

  const SOURCES = [
    ["Google Ad", 16], ["Facebook", 13], ["HomeBuddy", 12], ["Angi Leads", 10], ["Call-in", 9], ["BREV", 7],
    ["Lead Perfection", 6], ["Home Guru", 5], ["HomeBuddy CTS", 5], ["ABC Web", 4], ["Porch", 4], ["Thumbtack", 3],
    ["Referral", 3], ["Keyword Connects", 2], ["HomeYou", 2]
  ];
  const ANGI_OFF_FROM = "2026-08-01"; /* Connections shows Angi = Off */
  const PRODUCTS = [["Windows", 30, 1.05], ["Siding", 18, 1.35], ["Roofing", 14, 1.25], ["Doors", 10, 0.6], ["Gutter Helmet", 16, 0.45], ["Bath", 7, 1.15], ["Insulation", 5, 0.5]];
  const SLOTS = ["10:00", "12:00", "2:00", "4:00", "6:00"];
  const NO_SET_OUTCOMES = ["Call back", "Not interested", "Left message", "Out of area", "Price shopper", "Wrong number"];

  /* ——— seeded RNG ——— */
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pickWeighted(rng, list, weightIdx) {
    const wi = weightIdx == null ? 1 : weightIdx;
    let total = 0;
    for (const it of list) total += it[wi];
    let x = rng() * total;
    for (const it of list) { x -= it[wi]; if (x <= 0) return it; }
    return list[list.length - 1];
  }
  /* small-count draw around a mean (sum of Bernoullis ≈ Poisson-ish, but bounded) */
  function drawCount(rng, mean) {
    const n = Math.max(0, Math.ceil(mean * 2));
    if (!n) return 0;
    const p = mean / n;
    let c = 0;
    for (let i = 0; i < n; i++) if (rng() < p) c++;
    return c;
  }

  /* ——— dates (UTC math on ISO strings, no timezone drift) ——— */
  const toDate = (iso) => new Date(iso + "T00:00:00Z");
  const toISO = (d) => d.toISOString().slice(0, 10);
  const addDays = (iso, n) => { const d = toDate(iso); d.setUTCDate(d.getUTCDate() + n); return toISO(d); };
  const dow = (iso) => toDate(iso).getUTCDay();
  const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
  function addWorkDays(iso, n) { /* skip Sundays (no appointments run Sunday) */
    let d = iso;
    while (n > 0) { d = addDays(d, 1); if (dow(d) !== 0) n--; }
    return d;
  }
  function prevWorkDay(iso) { let d = addDays(iso, -1); while (dow(d) === 0) d = addDays(d, -1); return d; }

  const cache = {};

  function generate(userId) {
    if (cache[userId]) return cache[userId];
    const p = PROFILES[userId];
    if (!p) return (cache[userId] = { inquiries: [], appointments: [], callActivity: [] });
    const rng = mulberry32(hashStr("ihi-sample-v1:" + userId));
    const srcBias = SOURCES.map((s) => [s[0], s[1] * (0.6 + rng() * 0.8)]);
    const inquiries = [];
    const appointments = [];
    const callActivity = [];
    let seq = 0;
    let d = p.start || DATA_START;

    while (d <= SAMPLE_TODAY) {
      const wd = dow(d);
      const ptoRoll = rng();
      const pto = ptoRoll < 0.025 && d !== SAMPLE_TODAY; /* occasional day off; never on the sample "today" so only real schedule gaps show 0 */
      if (p.workDays.indexOf(wd) !== -1 && !pto) {
        const isToday = d === SAMPLE_TODAY;
        const month = +d.slice(5, 7);
        const year = +d.slice(0, 4);
        const f = SEASON[month] * (YEAR_MULT[year] || 1) * (wd === 6 ? 0.55 : 1) * (0.78 + rng() * 0.44) * (isToday ? TODAY_ELAPSED : 1);

        const calls = Math.round(p.callsPerDay * f * (0.85 + rng() * 0.3));
        const callsIn = Math.round(calls * (0.22 + rng() * 0.12));
        callActivity.push({ date: d, userId, callsIn, callsOut: calls - callsIn });

        const nInq = drawCount(rng, (p.setsPerDay / p.setRate) * f);
        for (let i = 0; i < nInq; i++) {
          seq++;
          const office = rng() < p.ilShare ? "IL" : "MI";
          let src = pickWeighted(rng, srcBias)[0];
          if (src === "Angi Leads" && d >= ANGI_OFF_FROM) src = "Google Ad";
          const prod = pickWeighted(rng, PRODUCTS);
          const inq = { id: userId + "-Q" + seq, date: d, telemarketerId: userId, office, source: src, product: prod[0], outcome: "", appointmentId: null };
          if (rng() < p.setRate) {
            inq.outcome = "Appt Set";
            const appt = buildAppointment(rng, p, userId, seq, d, office, src, prod);
            inq.appointmentId = appt.id;
            appointments.push(appt);
          } else {
            inq.outcome = NO_SET_OUTCOMES[Math.floor(rng() * NO_SET_OUTCOMES.length)];
          }
          inquiries.push(inq);
        }
      }
      d = addDays(d, 1);
    }
    return (cache[userId] = { inquiries, appointments, callActivity });
  }

  function buildAppointment(rng, p, userId, seq, setDate, office, source, prod) {
    const leadDays = pickWeighted(rng, [[1, 22], [2, 24], [3, 20], [4, 15], [5, 11], [6, 8]])[0];
    const apptDate = addWorkDays(setDate, leadDays);
    const a = {
      id: userId + "-A" + seq, inquiryId: userId + "-Q" + seq, office, setById: userId, source, product: prod[0],
      setDate, apptDate, apptSlot: SLOTS[Math.floor(rng() * SLOTS.length)],
      confirmedDate: null, dateIssued: null, resulted: false, result: "Scheduled",
      presentation: false, quoted: false, quoteAmount: 0, sold: false, saleDate: null, saleAmount: 0, contractStatus: null
    };
    /* decide the whole story up front (keeps RNG consumption stable), then reveal only what has happened by the sample clock */
    const willIssue = rng() < p.issue;
    const willConfirm = rng() < (willIssue ? 0.86 : 0.35);
    const willSit = rng() < p.sit;
    const willQuote = rng() < 0.93;
    const willSell = rng() < p.close / 0.93; /* close is of all sits; only quoted sits can sell */
    const r1 = rng(), r2 = rng(), r3 = rng(), r4 = rng();
    const amount = Math.round((p.avgSale * prod[2] / 0.99) * (0.55 + r1 * 0.9) / 10) * 10;

    let confirmDate = prevWorkDay(apptDate);
    if (confirmDate < setDate) confirmDate = setDate;
    if (willConfirm && confirmDate <= SAMPLE_TODAY) a.confirmedDate = confirmDate;

    if (apptDate > SAMPLE_TODAY) return a; /* future — still on the board */

    if (!willIssue) {
      a.resulted = true;
      a.result = r2 < 0.45 ? "Cancelled" : r2 < 0.7 ? "TM CANX" : "Not Issued";
      return a;
    }
    a.dateIssued = apptDate;
    if (apptDate === SAMPLE_TODAY) { a.result = "Issued — result tonight"; return a; }

    a.resulted = true;
    if (!willSit) {
      a.result = r2 < 0.55 ? "No Show" : r2 < 0.8 ? "One Leg — No Demo" : "No Demo";
      return a;
    }
    a.presentation = true;
    if (willQuote) { a.quoted = true; a.quoteAmount = amount; }
    if (!(willQuote && willSell)) { a.result = "Demo No Sale"; return a; }

    a.sold = true;
    a.result = "Sold";
    a.saleDate = apptDate;
    a.saleAmount = Math.round(amount * (0.86 + r3 * 0.14) / 10) * 10;
    const age = daysBetween(apptDate, SAMPLE_TODAY);
    if (age <= 3 && r4 < 0.12) { a.contractStatus = null; return a; } /* contract not keyed in yet */
    if (age <= 10 && r4 < 0.45) a.contractStatus = "Pending";
    else if (r4 < 0.09) a.contractStatus = "Canceled";
    else if (r4 < 0.15) a.contractStatus = "Finance Rejected";
    else a.contractStatus = "Approved";
    return a;
  }

  /* ——— Lead identity (fake names / 555-01xx phones) — separate seeded stream so dashboard numbers don’t change ——— */
  const LAST = ["Anderson", "Baker", "Brooks", "Carter", "Collins", "Cooper", "Davis", "DeVries", "Evans", "Fisher", "Garcia", "Green", "Hall", "Harris", "Hoekstra",
    "Jackson", "Jansen", "Johnson", "Kowalski", "Lee", "Lewis", "Martin", "Meyer", "Miller", "Moore", "Nelson", "Nguyen", "Parker", "Peters", "Reed",
    "Roberts", "Schmidt", "Smith", "Taylor", "Thomas", "VanDyke", "Walker", "White", "Wilson", "Young"];
  const FIRST = ["Alan", "Amy", "Angela", "Barb", "Brian", "Carol", "Dave", "Debbie", "Diane", "Doug", "Ed", "Gary", "Gloria", "Greg", "Heather", "Jan",
    "Jeff", "Jim", "Joan", "Karen", "Ken", "Linda", "Mark", "Mary", "Mike", "Nancy", "Pam", "Paul", "Rick", "Rita", "Ron", "Sandy", "Steve", "Sue",
    "Terry", "Tim", "Tom", "Vicki", "Wayne", "Wendy"];
  const STREETS = ["Maple Ave", "Oak St", "Cedar Dr", "Lakeview Dr", "Elm St", "Pine Ridge Ct", "Division Ave", "28th St SW", "Burton St", "Chicago Dr", "Byron Rd", "Main St"];
  const CITIES = { MI: [["Grand Rapids", "495"], ["Wyoming", "495"], ["Kentwood", "495"], ["Holland", "494"], ["Jenison", "494"], ["Grandville", "494"], ["Muskegon", "494"], ["Kalamazoo", "490"], ["Hudsonville", "494"], ["Rockford", "493"], ["Caledonia", "493"], ["Byron Center", "493"], ["Zeeland", "494"], ["Grand Haven", "494"], ["Portage", "490"], ["Lansing", "489"]],
    IL: [["Naperville", "605"], ["Aurora", "605"], ["Joliet", "604"], ["Oak Park", "603"], ["Wheaton", "601"], ["Downers Grove", "605"], ["Plainfield", "605"], ["Bolingbrook", "604"]] };
  const pad2 = (n) => String(n).padStart(2, "0");
  function leadIdentity(inq) {
    const r = mulberry32(hashStr("lead:" + inq.id));
    const city = CITIES[inq.office === "IL" ? "IL" : "MI"][Math.floor(r() * (inq.office === "IL" ? 8 : 16))];
    return {
      first: FIRST[Math.floor(r() * FIRST.length)], last: LAST[Math.floor(r() * LAST.length)],
      phone: (inq.office === "IL" ? "630" : "616") + "-555-01" + pad2(Math.floor(r() * 100)),
      address: (100 + Math.floor(r() * 9800)) + " " + STREETS[Math.floor(r() * STREETS.length)],
      city: city[0], zip: city[1] + pad2(Math.floor(r() * 90) + 10)
    };
  }

  /* ——— Activities (MarketSharp Activity List shape) — generated from the same seeded leads/appointments ——— */
  const ACT_FROM = addDays(SAMPLE_TODAY, -30);
  const ACT_TO = addDays(SAMPLE_TODAY, 7);
  const NOW_TIME = "11:50";
  const actCache = {};
  const workingOn = (p, iso) => dow(iso) !== 0 && p.workDays.indexOf(dow(iso)) !== -1 && (!p.start || iso >= p.start);
  function nextWorkOn(p, iso) { let d = iso; for (let i = 0; i < 10 && !workingOn(p, d); i++) d = addDays(d, 1); return d; }
  function randTime(rng, fromH, toH) {
    const m = fromH * 60 + Math.floor(rng() * ((toH - fromH) * 4)) * 15;
    return pad2(Math.floor(m / 60)) + ":" + pad2(m % 60);
  }
  const addMin = (t, n) => { const m = Math.min(+t.slice(0, 2) * 60 + +t.slice(3) + n, 23 * 60 + 59); return pad2(Math.floor(m / 60)) + ":" + pad2(m % 60); };
  const RES = {
    text: [["Text Success", 95], ["Text Failure", 5]],
    email: [["Email Success", 76], ["Email Failure", 24]], /* ~24% email failure seen in the live account */
    second: [["Left Message", 34], ["No Answer", 24], ["Set Appointment", 12], ["Call Back", 12], ["Not Interested", 10], ["Busy Signal", 4], ["Wrong Number", 4]],
    recontact: [["Left Message", 30], ["No Answer", 20], ["Set Appointment", 22], ["Call Back", 12], ["Not Interested", 12], ["Wrong Number", 4]],
    rehash: [["Left Message", 32], ["No Answer", 22], ["Set Appointment", 10], ["Not Interested", 22], ["Call Back", 14]],
    confirm: [["Completed", 88], ["Cust Cancelled Appt", 6], ["Left Message", 4], ["Confirmed", 2]],
    todo: [["Completed", 1]]
  };

  function generateActivities(userId) {
    if (actCache[userId]) return actCache[userId];
    const p = PROFILES[userId];
    const raw = generate(userId);
    const out = [];
    if (!p) return (actCache[userId] = out);
    const rng = mulberry32(hashStr("ihi-act-v1:" + userId));
    const inqById = {};
    raw.inquiries.forEach((q) => { inqById[q.id] = q; });
    let seq = 0;

    /* Marketers get setter / callback work only. Confirmation-workflow references (Confirm Appointment,
     * Appointment Reminder — ActivityDefs.CONFIRMER_REFERENCES) and office refs (Thank You) belong to the
     * confirm team / office, so they are NOT kept for a marketer. They are still rolled (same RNG draws)
     * so the marketer rows that remain are identical to v8 and the v7 dashboard numbers never move. */
    const AD = window.ActivityDefs;
    const keepFor = p.marketer === false ? "all" : "marketer";
    function keep(a) { if (!AD || AD.inAudience(a, keepFor)) out.push(a); }

    function add(o) {
      let due = o.due;
      if (dow(due) === 0) due = addDays(due, 1); /* nothing due on Sunday */
      const roll = rng(), lag = rng(), pickR = rng();
      if (due < ACT_FROM || due > ACT_TO) return null;
      const inq = inqById[o.leadId];
      const who = leadIdentity(inq);
      const a = {
        id: userId + "-T" + (++seq), type: o.type, reference: o.reference, leadId: o.leadId, leadFirst: who.first, leadLast: who.last,
        office: inq.office, appointmentId: o.appointmentId || null, assignedToId: userId, scheduledById: userId,
        dueDate: due, dueTime: o.time, completedDate: null, completedTime: null, result: null, inbound: !!o.inbound
      };
      if (o.inbound) {
        if (due > SAMPLE_TODAY || (due === SAMPLE_TODAY && a.dueTime > NOW_TIME)) return null;
        a.completedDate = due; a.completedTime = a.dueTime;
        keep(a); return a;
      }
      /* Skipped items stay open (overdue) — but only for a while: a reminder older than 2 days was sent late,
         anything else older than 14 days got worked late. Keeps the backlog realistic instead of ancient. */
      const staleDays = o.reference === "Appointment Reminder" ? 2 : 14;
      const skipped = roll >= o.completeProb;
      if (skipped && daysBetween(due, SAMPLE_TODAY) <= staleDays) { keep(a); return a; }
      let doneOn = nextWorkOn(p, skipped ? addDays(due, Math.min(staleDays, 1 + Math.floor(lag * staleDays))) : due);
      if (!skipped && lag < (o.lateProb || 0)) doneOn = nextWorkOn(p, addDays(doneOn, 1));
      if (doneOn < SAMPLE_TODAY || (doneOn === SAMPLE_TODAY && workingOn(p, SAMPLE_TODAY))) {
        let t = doneOn === due ? addMin(a.dueTime, 2 + Math.floor(lag * 40)) : randTime(rng, 9, 17);
        if (doneOn === SAMPLE_TODAY) {
          if (doneOn === due && a.dueTime > NOW_TIME) { keep(a); return a; } /* later today — still open */
          if (t > "11:45") t = "11:" + pad2(10 + Math.floor(lag * 35));
        }
        a.completedDate = doneOn; a.completedTime = t;
        a.result = pickWeighted(rng, o.results)[0];
        void pickR;
      }
      keep(a);
      return a;
    }

    /* 1) From inquiries worked (first-touch text, replies, second-chance calls/emails, vendor credits) */
    raw.inquiries.forEach((q) => {
      if (q.date < addDays(ACT_FROM, -10) || q.date > SAMPLE_TODAY) return;
      const isToday = q.date === SAMPLE_TODAY;
      if (rng() < 0.45) {
        const t = isToday ? randTime(rng, 8, 11) : randTime(rng, 9, 19);
        const txt = add({ type: "Text Out", reference: "Schedule / Reschedule Appointment", leadId: q.id, due: q.date, time: t, completeProb: 0.995, results: RES.text });
        if (txt && txt.completedDate && rng() < 0.22) add({ type: "Text In", reference: "Schedule / Reschedule Appointment", leadId: q.id, due: q.date, time: addMin(t, 6 + Math.floor(rng() * 90)), inbound: true });
      }
      if (q.outcome === "Call back" || q.outcome === "Left message") {
        add({ type: "Call Out", reference: "Second Chance Call", leadId: q.id, due: addWorkDays(q.date, 2 + Math.floor(rng() * 3)), time: randTime(rng, 9, 19), completeProb: 0.95, lateProb: 0.25, results: RES.second });
        if (rng() < 0.35) add({ type: "Email Out", reference: "Second Chance Email", leadId: q.id, due: addWorkDays(q.date, 1), time: randTime(rng, 9, 17), completeProb: 0.97, results: RES.email });
      }
      if ((q.outcome === "Wrong number" || q.outcome === "Out of area") && ["Call-in", "Referral"].indexOf(q.source) === -1 && rng() < 0.6) {
        add({ type: "To-Do", reference: "Request Refund/Credit", leadId: q.id, due: addWorkDays(q.date, 1), time: randTime(rng, 9, 16), completeProb: 0.92, lateProb: 0.3, results: RES.todo });
      }
      if (q.outcome === "Call back" && rng() < 0.15) {
        add({ type: "To-Do", reference: "Follow Up", leadId: q.id, due: addWorkDays(q.date, 3 + Math.floor(rng() * 5)), time: randTime(rng, 9, 17), completeProb: 0.85, results: RES.todo });
      }
    });

    /* 2) From appointments they set: recontact / rehash call outs are kept. Reminders, confirm calls and thank-yous
     *    are confirmer / office work — rolled for RNG stability but dropped by keep() for marketers. */
    raw.appointments.forEach((ap) => {
      if (ap.apptDate < addDays(ACT_FROM, -14) || ap.setDate > SAMPLE_TODAY) return;
      const before = prevWorkDay(ap.apptDate);
      add({ type: "Text Out", reference: "Appointment Reminder", leadId: ap.inquiryId, appointmentId: ap.id, due: before < ap.setDate ? ap.setDate : before, time: randTime(rng, 10, 17), completeProb: 0.97, results: RES.text });
      if (rng() < 0.12) add({ type: "Call Out", reference: "Confirm Appointment", leadId: ap.inquiryId, appointmentId: ap.id, due: before < ap.setDate ? ap.setDate : before, time: randTime(rng, 10, 18), completeProb: 0.92, results: RES.confirm });
      if (/No Show|Cancelled|TM CANX|One Leg|No Demo/.test(ap.result)) {
        add({ type: "Call Out", reference: "Recontact Call", leadId: ap.inquiryId, appointmentId: ap.id, due: addWorkDays(ap.apptDate, 1 + Math.floor(rng() * 3)), time: randTime(rng, 9, 19), completeProb: 0.94, lateProb: 0.3, results: RES.recontact });
      } else if (ap.result === "Demo No Sale") {
        add({ type: "Call Out", reference: "Rehash Call", leadId: ap.inquiryId, appointmentId: ap.id, due: addDays(ap.apptDate, 3 + Math.floor(rng() * 8)), time: randTime(rng, 9, 19), completeProb: 0.9, lateProb: 0.35, results: RES.rehash });
      } else if (ap.sold && rng() < 0.25) {
        add({ type: "To-Do", reference: "Thank You", leadId: ap.inquiryId, appointmentId: ap.id, due: addWorkDays(ap.saleDate, 1), time: randTime(rng, 10, 16), completeProb: 0.85, results: RES.todo });
      }
    });

    out.sort((a, b) => (a.dueDate + a.dueTime).localeCompare(b.dueDate + b.dueTime));
    return (actCache[userId] = out);
  }

  /* ——— Speed to Lead text threads (sample) — from the same seeded inquiries, own RNG stream ("ihi-txt-v1") ———
   * Thread row (what any adapter returns — see dashboard-data.getTextThreads):
   *   { id, leadId, leadFirst, leadLast, leadPhone, office, ownerId, source, product, cameIn:{date,time},
   *     firstTextSec, outcome, messages:[{ dir:"out"|"in", auto:boolean, sentById|null, sentByName, date, time,
   *       opened:boolean|null, openedDate|null, openedAt|null, text, optOut? }] }
   * dir "out": opened = the lead opened it.  dir "in": opened = the marketer opened (saw) it. */
  const TXT_FROM = addDays(SAMPLE_TODAY, -3); /* Fri 10/2 → today = the last 3 phone days (Sunday is off) */
  const txtCache = {};
  const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  const fromMin = (m) => pad2(Math.floor(m / 60)) + ":" + pad2(m % 60);
  const T = {
    leadAsk: ["Tonight after 6 works", "Can you call me tomorrow morning?", "How much does it usually cost?", "Is the estimate really free?",
      "Saturday would be best for us", "Who is this?", "Yes please. Weekdays after 5", "I'm at work, can you text me some times?", "Does my husband need to be there?"],
    leadNo: ["No thanks, we went with someone else", "Not interested anymore, thanks"],
    leadWrong: ["Wrong number, I didn't request anything"],
    leadOk: ["Thursday at 4 works", "Ok sounds good", "Can we do next week instead?", "Perfect, see you then", "What time would the guy get here?"],
    staffAsk: (f, prod, me) => [
      `Thanks ${f}! I have Wednesday at 6:00 or Thursday at 4:00 — which works better?`,
      `Happy to help! The estimate is free and takes about an hour. Does tomorrow at 6:00 work?`,
      `Good question — price depends on size, and our specialist gives an exact quote at the visit. Want me to set that up?`,
      `This is ${me} with Infinity Home Improvement — you asked about ${prod.toLowerCase()} online. Is evening or Saturday better?`],
    staffNo: ["No problem — thanks for letting us know!"],
    staffWrong: ["Sorry about that — we'll fix our records."],
    staffDone: ["Great, you're on the schedule. You'll get a reminder the day before. Thanks!", "Got it — I'll call you to lock in a time."]
  };

  function generateTextThreads(userId) {
    if (txtCache[userId]) return txtCache[userId];
    const p = PROFILES[userId];
    const out = [];
    if (!p) return (txtCache[userId] = out);
    const raw = generate(userId);
    const rng = mulberry32(hashStr("ihi-txt-v3:" + userId));
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const nowM = toMin(NOW_TIME);
    const from = TXT_FROM;
    const meName = (window.SampleData && (window.SampleData.users || []).find((u) => u.id === userId) || {}).name || "your marketer";
    const meFirst = meName.split(" ")[0];
    /* when can the marketer answer something that arrived at (date, minute)? → {date, m} or null (not yet) */
    function answerAt(date, m, delay) {
      let d = date, t = m + delay;
      if (!workingOn(p, d) || t > 19 * 60) { d = nextWorkOn(p, addDays(d, 1)); t = 9 * 60 + Math.floor(rng() * 40); }
      else if (t < 8 * 60 + 30) t = 8 * 60 + 30 + Math.floor(rng() * 20);
      if (d > SAMPLE_TODAY || (d === SAMPLE_TODAY && (t > nowM || !workingOn(p, d)))) return null;
      return { date: d, m: t };
    }
    function later(date, m, delay) { /* lead-side time (any day, capped at now) */
      const t = m + delay;
      if (t >= 24 * 60) { const d2 = addDays(date, 1); const m2 = Math.min(t - 24 * 60 + 7 * 60, 23 * 60); return d2 > SAMPLE_TODAY || (d2 === SAMPLE_TODAY && m2 > nowM) ? null : { date: d2, m: m2 }; }
      if (date === SAMPLE_TODAY && t > nowM) return null;
      return { date, m: t };
    }
    let seq = 0;
    raw.inquiries.forEach((q) => {
      if (q.date < from || q.date > SAMPLE_TODAY) return;
      const r0 = rng(), r1 = rng(), r2 = rng(), r3 = rng(), r4 = rng();
      if (q.source === "Call-in" || q.source === "Referral") return; /* phoned in — no auto text */
      const who = leadIdentity(q);
      const cameM = q.date === SAMPLE_TODAY ? 8 * 60 + Math.floor(r0 * 205) : 8 * 60 + 30 + Math.floor(r0 * 660);
      const firstSec = 12 + Math.floor(r1 * 70);
      const msgs = [];
      const push = (o) => { msgs.push(o); return o; };
      const autoM = cameM + 1;
      const auto = push({ dir: "out", auto: true, sentById: null, sentByName: "Auto text", date: q.date, time: fromMin(autoM), opened: false, openedDate: null, openedAt: null,
        text: `Hi ${who.first}, this is Infinity Home Improvement. Thanks for your ${q.product.toLowerCase()} request! When's a good time for a free in-home estimate?` });
      const openedT = later(q.date, autoM, 1 + Math.floor(r2 * 45));
      if (openedT && r2 < 0.82) { auto.opened = true; auto.openedDate = openedT.date; auto.openedAt = fromMin(openedT.m); }
      const wrong = q.outcome === "Wrong number", no = q.outcome === "Not interested", set = q.outcome === "Appt Set";
      const replyProb = wrong ? 0.5 : no ? 0.55 : set ? 0.8 : 0.5;
      let cursor = auto.opened ? { date: auto.openedDate, m: toMin(auto.openedAt) } : null;
      let outcome = "Waiting on lead";
      if (cursor && r3 < replyProb) {
        const lr = later(cursor.date, cursor.m, 1 + Math.floor(rng() * 50));
        if (lr) {
          const optOut = !wrong && !no && r4 < 0.05;
          const txt = optOut ? "STOP" : wrong ? pick(T.leadWrong) : no ? pick(T.leadNo) : pick(T.leadAsk);
          const inMsg = push({ dir: "in", auto: false, sentById: null, sentByName: who.first + " " + who.last, date: lr.date, time: fromMin(lr.m), opened: false, openedDate: null, openedAt: null, text: txt, optOut });
          if (optOut) { outcome = "Opted out"; }
          else {
            const forgot = lr.date < SAMPLE_TODAY && rng() < 0.02;
            const delay = 2 + Math.floor(Math.pow(rng(), 2) * 55) + (rng() < 0.18 ? 45 + Math.floor(rng() * 120) : 0); /* sometimes stuck on calls */
            const ans = forgot ? null : answerAt(lr.date, lr.m, delay);
            if (ans && rng() < 0.97) {
              inMsg.opened = true; inMsg.openedDate = ans.date; inMsg.openedAt = fromMin(Math.max(lr.m === ans.m ? ans.m : ans.m - 1, 0));
              const reply = wrong ? pick(T.staffWrong) : no ? pick(T.staffNo) : pick(T.staffAsk(who.first, q.product, meFirst));
              const out1 = push({ dir: "out", auto: false, sentById: userId, sentByName: meName, date: ans.date, time: fromMin(ans.m), opened: false, openedDate: null, openedAt: null, text: reply });
              const op = later(ans.date, ans.m, 1 + Math.floor(rng() * 30));
              if (op && rng() < 0.88) { out1.opened = true; out1.openedDate = op.date; out1.openedAt = fromMin(op.m); }
              outcome = wrong ? "Wrong number" : no ? "Not interested" : "Replied";
              if (!wrong && !no && out1.opened && rng() < (set ? 0.75 : 0.4)) {
                const lr2 = later(out1.openedDate, toMin(out1.openedAt), 1 + Math.floor(rng() * 40));
                if (lr2) {
                  const in2 = push({ dir: "in", auto: false, sentById: null, sentByName: who.first + " " + who.last, date: lr2.date, time: fromMin(lr2.m), opened: false, openedDate: null, openedAt: null, text: pick(T.leadOk) });
                  const ans2 = answerAt(lr2.date, lr2.m, 2 + Math.floor(Math.pow(rng(), 2) * 40));
                  if (ans2) {
                    in2.opened = true; in2.openedDate = ans2.date; in2.openedAt = fromMin(Math.max(ans2.m - 1, 0));
                    const out2 = push({ dir: "out", auto: false, sentById: userId, sentByName: meName, date: ans2.date, time: fromMin(ans2.m), opened: false, openedDate: null, openedAt: null, text: set ? T.staffDone[0] : T.staffDone[1] });
                    const op2 = later(ans2.date, ans2.m, 1 + Math.floor(rng() * 25));
                    if (op2 && rng() < 0.85) { out2.opened = true; out2.openedDate = op2.date; out2.openedAt = fromMin(op2.m); }
                    outcome = set ? "Appt set" : "Replied";
                  } else if (rng() < 0.5) { in2.opened = true; in2.openedDate = lr2.date; in2.openedAt = fromMin(Math.min(lr2.m + 2, nowM)); }
                }
              }
            } else if (lr.date === SAMPLE_TODAY && workingOn(p, SAMPLE_TODAY) && rng() < 0.5) {
              inMsg.opened = true; inMsg.openedDate = lr.date; inMsg.openedAt = fromMin(Math.min(lr.m + 1 + Math.floor(rng() * 5), nowM)); /* seen, not answered yet */
            }
          }
        }
      }
      /* Leads from earlier days often text back the next phone morning ("Monday morning catch-up") */
      const lastMsg = msgs[msgs.length - 1];
      if ((outcome === "Replied" || outcome === "Waiting on lead") && lastMsg.date < SAMPLE_TODAY && rng() < 0.3) {
        const m = 8 * 60 + Math.floor(rng() * 225);
        const inM = push({ dir: "in", auto: false, sentById: null, sentByName: who.first + " " + who.last, date: SAMPLE_TODAY, time: fromMin(m), opened: false, openedDate: null, openedAt: null,
          text: outcome === "Replied" ? pick(T.leadOk) : pick(T.leadAsk) });
        const ans = answerAt(SAMPLE_TODAY, m, 3 + Math.floor(Math.pow(rng(), 2) * 50) + (rng() < 0.4 ? 40 + Math.floor(rng() * 120) : 0));
        if (ans) {
          inM.opened = true; inM.openedDate = ans.date; inM.openedAt = fromMin(ans.m - 1);
          const o2 = push({ dir: "out", auto: false, sentById: userId, sentByName: meName, date: ans.date, time: fromMin(ans.m), opened: false, openedDate: null, openedAt: null,
            text: outcome === "Replied" ? T.staffDone[1] : pick(T.staffAsk(who.first, q.product, meFirst)) });
          const op = later(ans.date, ans.m, 1 + Math.floor(rng() * 20));
          if (op && rng() < 0.8) { o2.opened = true; o2.openedDate = op.date; o2.openedAt = fromMin(op.m); }
          outcome = "Replied";
        } else if (workingOn(p, SAMPLE_TODAY) && rng() < 0.5) { inM.opened = true; inM.openedDate = SAMPLE_TODAY; inM.openedAt = fromMin(Math.min(m + 2, nowM)); }
      }
      out.push({ id: userId + "-X" + (++seq), leadId: q.id, leadFirst: who.first, leadLast: who.last, leadPhone: who.phone, office: q.office, ownerId: userId,
        source: q.source, product: q.product, cameIn: { date: q.date, time: fromMin(cameM) }, firstTextSec: firstSec, outcome, messages: msgs,
        loggedAs: "Tom Otten" /* live caveat: the texting integration logs its texts under Tom's MarketSharp login */ });
    });
    /* Who-did-what fields (no RNG draws — hashed per message, so the threads above don't change).
     * Names follow /workspace/automation-plan/CommandCenter_Activity_Feed_Map.md:
     *   sourceSystem      "Hatch" | "MarketSharp" — which tool the text went through
     *   isHatchProxy      true = MarketSharp Text Out logged under Tom (Hatch's integration employee id) → shown as
     *                     "Hatch (system/AI, via Tom's login)", NOT credited to Tom. sentByUserId stays null.
     *   loggedUnderUserId who MarketSharp shows it under (assignToEmployeeId → identity map) — "u-tom" for Hatch proxies
     *   sentByUserId      real person credited (MarketSharp human Text Out → assignToEmployeeId → identity map)
     *   openedAt          (out) when the customer opened it — SAMPLE; Hatch open times TBD until its API is confirmed
     *   seenByUserId/seenAt (in) which staff user first viewed the reply — SAMPLE; same TBD */
    const team = Object.keys(PROFILES);
    out.forEach((t) => t.messages.forEach((m, i) => {
      const h = mulberry32(hashStr("txt-who:" + t.id + ":" + i))();
      if (m.dir === "out") {
        if (m.auto) { m.sourceSystem = "Hatch"; m.isHatchProxy = true; m.sentByUserId = null; m.loggedUnderUserId = "u-tom"; }
        else if (h < 0.62) { m.sourceSystem = "MarketSharp"; m.isHatchProxy = false; m.sentByUserId = userId; m.loggedUnderUserId = userId; }
        else { m.sourceSystem = "Hatch"; m.isHatchProxy = true; m.sentByUserId = null; m.loggedUnderUserId = "u-tom"; m.sentByName = "Hatch (system/AI, via Tom's login)"; }
      } else {
        m.sourceSystem = t.messages.some((x) => x.dir === "out" && !x.auto && x.sourceSystem === "MarketSharp") ? "MarketSharp" : "Hatch";
        if (m.opened) {
          m.seenByUserId = h < 0.8 ? userId : h < 0.92 ? "u-tom" : team[(team.indexOf(userId) + 1 + Math.floor(h * 100)) % team.length];
          if (m.seenByUserId === userId && h >= 0.8) m.seenByUserId = "u-tom";
          m.seenAt = m.openedAt; m.seenDate = m.openedDate;
        } else { m.seenByUserId = null; m.seenAt = null; m.seenDate = null; }
      }
    }));
    return (txtCache[userId] = out);
  }

  function leadProfile(leadId) {
    const userId = String(leadId).split("-Q")[0];
    const raw = generate(userId);
    const q = raw.inquiries.find((x) => x.id === leadId);
    if (!q) return null;
    const who = leadIdentity(q);
    const ap = q.appointmentId ? raw.appointments.find((x) => x.id === q.appointmentId) : null;
    const acts = generateActivities(userId).filter((a) => a.leadId === leadId);
    const thread = generateTextThreads(userId).find((t) => t.leadId === leadId) || null;
    return { inquiry: q, identity: who, appointment: ap, activities: acts, thread };
  }

  function filterOffice(raw, office) {
    if (!office || office === "ALL") return raw;
    return {
      inquiries: raw.inquiries.filter((q) => q.office === office),
      appointments: raw.appointments.filter((a) => a.office === office),
      callActivity: raw.callActivity /* Call Center Report isn’t split by office */
    };
  }

  NS.sample = {
    id: "sample",
    label: "Sample",
    isLive: false,
    asOf: SAMPLE_AS_OF,
    today: SAMPLE_TODAY,
    /* What each raw stream will come from once live (shown in card source labels) */
    streams: {
      appointments: { system: "MarketSharp", detail: "Appt Set By" },
      inquiries: { system: "MarketSharp", detail: "Inquiry.Telemarketer" },
      callActivity: { system: "MarketSharp", detail: "Call Center Report" },
      activities: { system: "MarketSharp", detail: "Activity List · Assigned To" },
      texts: { system: "MarketSharp", detail: "Text Out / Text In activities" }
    },
    /* Speed to Lead threads for this marketer (last 3 days). Promise<threads> */
    fetchTextThreads(userId) {
      return Promise.resolve(generateTextThreads(userId));
    },
    marketerIds: () => Object.keys(PROFILES),
    /* fake lead name for an inquiry id (same seeded identity the profile uses; name doesn't depend on office) */
    leadCity(inq) { return leadIdentity(inq).city; },
    leadName(inqId) { const w = leadIdentity({ id: String(inqId).replace(/-A$/, ""), office: "MI" }); return w.first + " " + w.last; },
    schedule(userId) {
      const p = PROFILES[userId];
      if (!p) return null;
      return { workDays: p.workDays.slice(), start: p.start || null };
    },
    /* Activities assigned to this user (Activity List). Promise<rows> — see activity-defs.js for the row shape. */
    fetchActivities(userId) {
      return Promise.resolve(generateActivities(userId));
    },
    /* Lead profile for the customer drawer (inquiry + identity + appointment + activities). Promise */
    fetchLeadProfile(leadId) {
      return Promise.resolve(leadProfile(leadId));
    },
    /* Same signature the live adapters must implement. Returns a Promise. */
    fetchMarketerRaw(userId, opts) {
      const o = opts || {};
      return Promise.resolve(filterOffice(generate(userId), o.office));
    }
  };
})();
