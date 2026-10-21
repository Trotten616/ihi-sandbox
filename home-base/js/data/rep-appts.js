/* v16 phone (sales reps only) — SAMPLE sales-rep users + their assigned appointments.
 *   window.SAMPLE_REP_APPTS  = { "u-mark": [Appt, …], "u-drew": [Appt, …] }   ← keyed by rep user id, sorted by date+time
 *   window.SampleReps        = { users, today, now, results, list(repId), get(apptId), repFor(id), weekRange(), … }
 * Read by: Today + My Leads (track 2, js/pages/rep-leads.js), Calendar (track 3), My Activity (track 4).
 * Everything is fictional sample data (names, streets, 555-01xx phones). Deterministic: no Math.random, same data every load.
 * Sample clock = the rest of the app: Mon Oct 5, 2026 · 11:50 AM ET. Field contract: MOBILE-home-leads.md. */
(function () {
  "use strict";
  const TODAY = "2026-10-05";
  const NOW = "2026-10-05T11:50:00-04:00";
  const pad = (n) => String(n).padStart(2, "0");
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function fmix(h) { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; }
  const u = (k) => fmix(hashStr("rep-v1:" + k)) / 4294967296;
  const pick = (k, arr) => arr[Math.floor(u(k) * arr.length)];
  const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dow = (iso) => new Date(iso + "T00:00:00Z").getUTCDay();
  const prevWork = (iso) => { let d = addDays(iso, -1); while (dow(d) === 0) d = addDays(d, -1); return d; };

  /* Sales reps — names reused from the Sales sample salesperson list (SampleData.salesDaily). role "Rep" → IHIPages.roleKey = "rep". */
  const USERS = [
    { id: "u-mark", name: "Mark Stone", email: "mark.stone@example.com", role: "Rep", roleLabel: "Sales rep", initials: "MS", officeDefault: "MI", rep: true, salesperson: "Mark Stone", salespersonId: "sp-mark" },
    { id: "u-drew", name: "Drew Hale", email: "drew.hale@example.com", role: "Rep", roleLabel: "Sales rep", initials: "DH", officeDefault: "MI", rep: true, salesperson: "Drew Hale", salespersonId: "sp-drew" }
  ];

  /* Result vocabulary on the phone (Access STATUS ↔ MarketSharp result). demo = Sold or Demo/No sale. */
  const RESULTS = ["Sold", "Demo/No sale", "No demo", "Reset", "Cancelled", "TM CANX", "No show"];
  const RESULT_INFO = {
    "Sold": { demo: true, access: "SOLD", ms: "Demo / Sold", tone: "good" },
    "Demo/No sale": { demo: true, access: "DEMO NO SALE", ms: "Demo / No Sale", tone: "" },
    "No demo": { demo: false, access: "NO DEMO", ms: "No Demo", tone: "" },
    "Reset": { demo: false, access: "RESET", ms: "Reset", tone: "" },
    "Cancelled": { demo: false, access: "CANCELLED", ms: "Cancelled", tone: "bad" },
    "TM CANX": { demo: false, access: "TM CANX", ms: "Cancelled (TM)", tone: "bad" },
    "No show": { demo: false, access: "NO SHOW", ms: "No Show", tone: "bad" }
  };

  const FIRSTS = ["Linda", "Mark", "Karen", "Jim", "Sue", "Ron", "Pam", "Dave", "Joan", "Rick", "Brenda", "Gary", "Donna", "Paul", "Ruth", "Ken", "Nancy", "Larry", "Carol", "Dennis"];
  const SPOUSE = { Linda: "Tom", Mark: "Julie", Karen: "Steve", Jim: "Mary", Sue: "Bob", Ron: "Deb", Pam: "Gary", Dave: "Lori", Joan: "Ed", Rick: "Tammy", Brenda: "Mike", Gary: "Pam", Donna: "Jerry", Paul: "Anne", Ruth: "Walt", Ken: "Barb", Nancy: "Phil", Larry: "Kathy", Carol: "Jack", Dennis: "Gail" };
  const LASTS = ["Vander Molen", "Kowalczyk", "DeVries", "Hendricks", "Brinks", "Ostrander", "Patterson", "Zylstra", "Nowak", "Gardner", "Holstege", "Ramirez", "Bouwens", "Fisher", "Slagter", "Okonkwo", "Lindqvist", "Meyers", "Talsma", "Brennan", "Kuiper", "Sandoval", "Wierenga", "Hollis"];
  const STREETS = ["Maple Ridge Dr", "Cedar Ln", "Lakeshore Ave", "Burton St SE", "Riverbend Ct", "Orchard View Dr", "Kalamazoo Ave", "Pine Hollow Rd", "Byron Center Ave", "Wilson Ave SW", "Fulton St E", "Alpine Ave NW", "Beltline Ave", "Butterworth St", "Leonard St NE", "Hall St SE"];
  const CITIES = [["Grand Rapids", "49506"], ["Wyoming", "49509"], ["Kentwood", "49508"], ["Holland", "49423"], ["Grandville", "49418"], ["Hudsonville", "49426"], ["Rockford", "49341"], ["Walker", "49534"], ["Kalamazoo", "49008"], ["Portage", "49024"], ["Muskegon", "49441"], ["Jenison", "49428"]];
  const PRODUCTS = [["Windows"], ["Gutter Helmet"], ["Siding"], ["Roofing"], ["Windows", "Entry Door"], ["Siding", "Windows"], ["Bath"], ["Windows"], ["Gutter Helmet"], ["Patio Door"]];
  const SOURCES = ["Google Ad", "Home Show", "Referral", "Angi", "Facebook", "Canvass", "Modernize", "TV", "Website", "Repeat Customer"];
  const SETTERS = ["Casey Bennett", "Laura Keller", "Dana Howard", "Carla Mason", "Kara Tanner", "Sara Vance", "Sandra Webb", "Stella Shaw"];
  const CONFIRMERS = ["Shelby Lane", "Toby Baker"];
  const SLOTS = ["10:00", "12:00", "14:00", "16:00", "18:00"];
  const NOTES = ["Wants to see color samples", "Old aluminum windows, drafty upstairs", "Gutters overflow on the north side", "Dog in the back yard, use the front door", "Got two other quotes", "Asked about financing", "Ranch house, about 1,400 sq ft", "Call when on the way", "Storm damage last spring", "Interested in a full tear-off", "Retired, home all day", "Park in the driveway, not on the street"];
  const short = (full) => { const p = String(full).split(" "); return p[0] + " " + (p[1] ? p[1][0] + "." : ""); };
  const fakePhone = (k) => { const area = pick("ar:" + k, ["616", "616", "616", "269", "231"]); return "(" + area + ") 555-01" + pad(Math.floor(u("ph:" + k) * 100)); };

  /* per rep: which days and how many appointments (Mon 9/28 → Sat 10/10, Sundays off) */
  function plan(repId) {
    const days = [];
    for (let d = "2026-09-28"; d <= "2026-10-10"; d = addDays(d, 1)) {
      if (dow(d) === 0) continue;
      const base = repId === "u-mark" ? 3 : 2;
      let n = d === TODAY ? (repId === "u-mark" ? 4 : 3) : base + (u("n:" + repId + d) < 0.4 ? 1 : 0) - (dow(d) === 6 ? 1 : 0);
      if (repId === "u-drew" && dow(d) === 3) n = 0; /* Drew's day off: Wednesdays */
      const slots = SLOTS.slice().sort((a, b) => u("s:" + repId + d + a) - u("s:" + repId + d + b)).slice(0, Math.max(0, n)).sort();
      if (d === TODAY) days.push([d, repId === "u-mark" ? ["10:00", "14:00", "16:00", "18:00"] : ["12:00", "16:00", "18:00"]]);
      else if (slots.length) days.push([d, dow(d) === 6 ? slots.filter((s) => s <= "14:00").concat(slots.length && !slots.some((s) => s <= "14:00") ? ["12:00"] : []) : slots]);
    }
    return days;
  }

  function pastResult(k) {
    const r = u("res:" + k);
    return r < 0.24 ? "Sold" : r < 0.56 ? "Demo/No sale" : r < 0.63 ? "No demo" : r < 0.74 ? "Reset" : r < 0.83 ? "Cancelled" : r < 0.9 ? "TM CANX" : "No show";
  }

  function build(rep) {
    const out = [];
    plan(rep.id).forEach(([date, slots]) => {
      slots.forEach((time, i) => {
        const k = rep.id + ":" + date + ":" + time;
        const first = pick("f:" + k, FIRSTS), last = pick("l:" + k, LASTS);
        const [city, zip] = pick("c:" + k, CITIES);
        const street = (100 + Math.floor(u("no:" + k) * 9800)) + " " + pick("st:" + k, STREETS);
        const products = pick("p:" + k, PRODUCTS).slice();
        const source = pick("so:" + k, SOURCES);
        const setter = pick("se:" + k, SETTERS);
        const setDate = addDays(date, -(2 + Math.floor(u("sd:" + k) * 9)));
        const isReset = u("rs:" + k) < 0.12;
        const past = date < TODAY;
        const isToday = date === TODAY;
        /* confirm: Access WHOCONFIRM (no timestamp column) + MarketSharp "Confirm Appointment" call activity (completedDate) */
        const confDay = prevWork(date);
        const confTime = pad(9 + Math.floor(u("ct:" + k) * 9)) + ":" + pad(Math.floor(u("cm:" + k) * 60));
        /* the confirm call happens the working day before; today's calls only count once the sample clock (11:50 AM) has passed them */
        const confDue = confDay < TODAY || (confDay === TODAY && confTime < "11:50");
        const cr = u("cf:" + k);
        const confirmer = cr < 0.62 ? CONFIRMERS[0] : CONFIRMERS[1];
        let accessConfirmed = false, msConfirmed = false, leftMessage = false;
        if (confDue) {
          if (cr < 0.7) { accessConfirmed = true; msConfirmed = u("cfm:" + k) > 0.18; }
          if (k === "u-mark:2026-10-05:16:00") { accessConfirmed = true; msConfirmed = false; leftMessage = false; } /* keep one Access-only confirm on today's sample */
          else if (cr < 0.85) leftMessage = true;
        }
        let confirm;
        if (accessConfirmed && msConfirmed) confirm = { status: "Confirmed", by: confirmer, byShort: short(confirmer), date: confDay, time: confTime, timeStored: true, timeSource: "MarketSharp", access: true, ms: true, mismatch: false };
        else if (accessConfirmed) confirm = { status: "Confirmed", by: confirmer, byShort: short(confirmer), date: confDay, time: null, timeStored: false, timeSource: null, access: true, ms: false, mismatch: true, mismatchText: "Access WHOCONFIRM = " + confirmer.split(" ").map((x) => x[0]).join("") + " · MarketSharp has no completed Confirm Appointment call" };
        else if (leftMessage) confirm = { status: "Not confirmed", attempt: "Left message", by: confirmer, byShort: short(confirmer), date: confDay, time: confTime, timeStored: true, timeSource: "MarketSharp", access: false, ms: false, mismatch: false };
        else confirm = { status: "Not confirmed", attempt: confDue ? "No answer yet" : "Confirm call due", by: null, byShort: null, date: confDue ? null : confDay, time: null, timeStored: false, access: false, ms: false, mismatch: false };
        /* decision-makers: who owns the home, and whether all owners will be there (asked on the confirm call) */
        const two = u("dm2:" + k) < 0.72;
        const owners = two ? [first + " " + last, SPOUSE[first] + " " + last] : [first + " " + last];
        const allHome = !two ? true : confirm.status === "Confirmed" ? u("dmh:" + k) > 0.2 : null;
        const decisionMakers = { owners, allHome, note: !two ? "Sole owner" : allHome === true ? "Both owners will be home" : allHome === false ? SPOUSE[first] + " may not be home, works until 6 PM" : "Not asked yet (asked on the confirm call)" };
        /* result (past only; today's visits are keyed tonight) */
        let result = null, msResult = null, resultMismatch = false, saleAmount = null;
        if (past) {
          result = pastResult(k);
          msResult = result;
          if (result === "Sold" && u("rmm:" + k) < 0.35) { msResult = "Demo/No sale"; resultMismatch = true; } /* contract not keyed in MS yet */
          else if (result === "TM CANX" && u("rmm2:" + k) < 0.5) { msResult = "Cancelled"; resultMismatch = false; } /* same thing, different words */
          if (result === "Sold") saleAmount = Math.round((6000 + u("amt:" + k) * 18000) / 10) * 10;
        }
        const accessOnly = isReset && u("ro:" + k) < 0.5; /* reset entered in Access (RUNTYPE RES) but not in MarketSharp */
        const tz = "America/New_York";
        const history = [
          { date: setDate, time: pad(9 + Math.floor(u("ht:" + k) * 2)) + ":" + pad(Math.floor(u("hm:" + k) * 60)), what: "Lead came in · " + source, by: "", system: "Access" },
          { date: setDate, time: pad(11 + Math.floor(u("ht2:" + k) * 6)) + ":" + pad(Math.floor(u("hm2:" + k) * 60)), what: (isReset ? "Reset set" : "Appointment set") + " for " + (+date.slice(5, 7)) + "/" + (+date.slice(8, 10)), by: setter, system: "Access" }
        ];
        if (confirm.status === "Confirmed") history.push({ date: confDay, time: confirm.time, what: "Confirmed" + (decisionMakers.allHome === true && two ? " · both owners home" : ""), by: confirmer, system: confirm.ms ? "MarketSharp" : "Access", timeNote: confirm.timeStored ? "" : "time not stored" });
        else if (confirm.attempt === "Left message") history.push({ date: confDay, time: confirm.time, what: "Confirm call · left message", by: confirmer, system: "MarketSharp" });
        if (u("txt:" + k) < 0.5 && (past || confDue)) history.push({ date: confDay, time: "10:02", what: "Reminder text sent", by: "Hatch (system/AI, via Tom’s login)", system: "Hatch" });
        if (isToday) history.push({ date: TODAY, time: "08:15", what: "Issued to " + rep.name, by: "Office", system: "Access" });
        if (past) history.push({ date, time: pad(+time.slice(0, 2) + 2) + ":00", what: "Result: " + result + (resultMismatch ? " (MarketSharp: " + msResult + ")" : ""), by: rep.name, system: "Access" });
        history.sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
        out.push({
          id: "RA-" + rep.id.slice(2, 4).toUpperCase() + "-" + date.slice(5).replace("-", "") + "-" + time.slice(0, 2),
          repId: rep.id, rep: rep.name, office: "MI", tz,
          date, time, type: isReset ? "Reset" : pick("ty:" + k, ["Sales Presentation", "Sales Presentation", "Sales Presentation", "GH Presentation"]),
          first, last, name: last + ", " + first, street, city, state: "MI", zip, fullAddr: street + ", " + city + ", MI " + zip,
          phone: fakePhone(k), dnc: false,
          products, source, sources: accessOnly ? ["Access"] : ["Access", "MarketSharp"].concat(history.some((h) => h.system === "Hatch") ? ["Hatch"] : []),
          accessOnly, accessLeadNum: 1100000 + Math.floor(u("ld:" + k) * 90000),
          setBy: setter, setDate,
          confirm, decisionMakers,
          notes: pick("nt:" + k, NOTES),
          result, accessResult: result ? RESULT_INFO[result].access : null, msResult, resultMismatch, saleAmount,
          resultPending: isToday ? (time < "12:00" ? "At the visit now · result keyed tonight" : "Result keyed tonight") : null,
          history, isSample: true
        });
      });
    });
    out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return out;
  }

  const SAMPLE_REP_APPTS = {};
  USERS.forEach((r) => { SAMPLE_REP_APPTS[r.id] = build(r); });
  window.SAMPLE_REP_APPTS = SAMPLE_REP_APPTS;

  /* rep users join the sample staff list (desktop sign-in groups don't list role "Rep", so desktop v15 is unchanged) */
  if (window.SampleData && Array.isArray(window.SampleData.users)) {
    USERS.forEach((r) => { if (!window.SampleData.users.some((x) => x.id === r.id)) window.SampleData.users.push(r); });
  }

  const byId = {};
  Object.keys(SAMPLE_REP_APPTS).forEach((k) => SAMPLE_REP_APPTS[k].forEach((a) => { byId[a.id] = a; }));
  /* WEEK (one definition for every phone page): Infinity reports Sunday–Saturday periods.
     weekRange()   = this period to date (Sun → today), label "This week (Sun–Sat)".
     weekRange(-1) = last week, the previous full Sun–Sat period, label "Last week (Sun–Sat)". */
  const weekStart = (iso) => addDays(iso, -dow(iso));
  function weekRange(offset) {
    const o = Math.round(+offset || 0);
    const from = addDays(weekStart(TODAY), 7 * o), end = addDays(from, 6);
    const to = o === 0 ? TODAY : end;
    const label = o === 0 ? "This week (Sun–Sat)" : o === -1 ? "Last week (Sun–Sat)" : "Week of " + (+from.slice(5, 7)) + "/" + (+from.slice(8, 10)) + " (Sun–Sat)";
    return { from, to, end, offset: o, label, short: o === 0 ? "This week" : o === -1 ? "Last week" : label };
  }
  const lastWeekRange = () => weekRange(-1);
  function countsFor(repId, range, which) {
    const rows = (SAMPLE_REP_APPTS[repId] || []).filter((a) => a.date >= range.from && a.date <= range.to);
    const res = (a) => (which === "ms" ? a.msResult : a.result);
    return {
      demos: rows.filter((a) => res(a) && RESULT_INFO[res(a)] && RESULT_INFO[res(a)].demo).length,
      sold: rows.filter((a) => res(a) === "Sold").length,
      resets: rows.filter((a) => res(a) === "Reset" && (which !== "ms" || !a.accessOnly)).length
    };
  }
  window.SampleReps = {
    users: USERS, today: TODAY, now: NOW, results: RESULTS, resultInfo: RESULT_INFO,
    list: (repId) => (SAMPLE_REP_APPTS[repId] || []).slice(),
    get: (apptId) => byId[apptId] || null,
    repFor: (userId) => USERS.find((r) => r.id === userId) || null,
    isRep: (user) => !!(user && (user.rep || String(user.role || "").toLowerCase() === "rep")),
    addDays, weekStart, weekRange, lastWeekRange, countsFor,
    /* freshness stamps for the sample (ET clock times) */
    synced: { access: "11:30 AM", ms: "11:45 AM", appointments: "11:45 AM" }
  };
})();
