/* Michigan / Illinois Access adapter.
 *
 * DECIDED (Thomas, 2026-10-05): Access numbers are more accurate than MarketSharp. Wherever both systems
 * show the same number, Command Center shows ACCESS FIRST (large, "Michigan Access" badge) and MarketSharp
 * smaller beside it, with an amber "Doesn't match MarketSharp" flag when they differ.
 *
 * Per-marketer Access measures (setter = APPOINTMENTS.WHOSET staff code; reports-map/reports-inventory.md):
 *   leads taken      ← LEAD rows taken by the setter (daily tally frmTallyTaken; OPERATOR/telemarketer)  ≈ MS Inquiries
 *   appts set        ← APPOINTMENTS SETDATE in range, WHOSET = setter, excl. sources ADMIN/DUPE/JOBSRC/VENDOR
 *                      and statuses DUPLICATE / FIN PW ONLY ("Leads Set" in quniLeadActSrcTM)            ≈ MS Appts Set
 *   callbacks set    ← APPOINTMENTS RUNTYPE = 'CB' (CALL BACK TO SET), WHOSET = setter          (Access only)
 *   resets           ← RUNTYPE = 'RES' (RESET APPT)                                             (Access only)
 *   confirmed        ← WHOCONFIRM filled on the setter's appointments (confirm date)            ≈ MS Confirmed
 *   issued           ← STATUS in (SOLD, DEMO NO SALE, 2-STEP, NO DEMO, NO SHOW, 1-LEG, NOT RUN)  ≈ MS Issued
 *   sold / net $     ← LEAD.CONPRICE of boarded (ONBRD) SOLD leads with no kick-out (KODATE null) ≈ MS Total Sold / Net Sales $
 *   net per issued   ← (Sales − Cancelled) / Issued  (TM Lead Activity "Net per lead")          (Access only)
 * Live wiring: run the TM Lead Activity temp-table path (frmPrintGivenSource → ttTMLeadActivity*), NOT the
 * union queries — the MI back end lost its indexes and quniLeadActSrcTM hangs (reports-map/mi-vs-il-corrupted.md).
 * Map WHOSET staff codes (e.g. KOLLIS) → Command Center users. Read-only, server-side.
 *
 * Company-level Access data (installed jobs, A/R payments, service) stays "Not tracked per marketer".
 */
(function () {
  "use strict";
  const NS = (window.DashboardAdapters = window.DashboardAdapters || {});

  /* Live adapter — stub */
  NS.access = {
    id: "access",
    label: "Access",
    isLive: false,
    streams: {
      jobs: { system: "Access", detail: "Installed jobs / A/R / Service" },
      marketer: { system: "Michigan Access", detail: "TM Lead Activity · WHOSET" }
    },
    fetchMarketerRaw() {
      return Promise.reject(new Error("Access adapter not connected yet."));
    },
    /* Promise<{ appointments, inquiries, callActivity: [], callbacks: [{id,date,office}], resets: [{id,date,office}] }>
     * Same row shapes as js/data/metrics.js so the same metric code runs on Access rows. */
    fetchMarketerActivity(/* userId, { office } */) {
      return Promise.reject(new Error("Access (TM Lead Activity) not connected yet."));
    },
    /* Per-employee trail — STUB (wire FIRST; Access is primary). Source: scheduled CSV/ODBC pull from a read-only
     * copy of K:\Data\MichiganData.accdb (never lock the live BE in business hours). Feed map §1.
     * Promise<AccessTrailEvent[]>  AccessTrailEvent = { source:"access-mi", employeeKey, eventType, leadNum, at, atPrecision, payload }
     *   eventType "lead_keyed"   ← LEAD.OPERATOR (staff code)  at = KEYDATE (or DATE + CALL1TIME)
     *             "call_outcome" ← LEADRESOLVE.CODE (APT/NI/NQ/RT/DNC/…) — NO actor column: employeeKey from LEAD.OPERATOR /
     *                              WHOSET; at = RESOLVE (date only → atPrecision "day")
     *             "note"         ← FINCOM.CMNTWHO (initials)  at = CMNTDATE + CMNTTIME
     *             "appt_set"     ← APPOINTMENTS.WHOSET (staff code)  at = SETON; payload.runType NEW/CB/RES, payload.apptAt = SETDATE+SETTIME
     *             "confirm"      ← APPOINTMENTS.WHOCONFIRM (initials) — no confirm timestamp column: time from a COMMENT/FINCOM
     *                              stamp like "SML [4/28/25 8:14a]" when present, else atPrecision "day"
     *             "rep_assigned" ← APPOINTMENTS.SALESMAN / SALESMAN2 (no time)
     *   employeeKey → user via IdentityMap.fromAccess(STAFF.STAFF or STAFF.INITIALS). No true field-edit audit log exists. */
    fetchTrailEvents(/* { from, to, office } */) {
      return Promise.reject(new Error("Access employee trail not connected yet (sample data in use)."));
    },
    /* Customer record (v14) — STUB. Access is primary where numbers conflict (Thomas 2026-10-05).
     * Promise<AccessLeadRecord>  AccessLeadRecord = {
     *   lead:  { leadNum ← LEAD.LEADNUM, operator ← LEAD.OPERATOR, keyDate, source, product, conPrice ← LEAD.CONPRICE (boarded contract $) },
     *   appointments: [{ id, runType ← APPOINTMENTS.RUNTYPE (NEW/CB/RES), setOn ← SETON, at ← SETDATE+SETTIME,
     *                    whoSet ← WHOSET, whoConfirm ← WHOCONFIRM, salesman ← SALESMAN, result ← STATUS }],
     *   comments: [{ at ← CMNTDATE+CMNTTIME, who ← CMNTWHO, text ← FINCOM comment }] }
     * Match to MarketSharp by phone + address (then LEADNUM once stored on the MS inquiry). */
    fetchLeadRecord(/* { leadNum, phone, office } */) {
      return Promise.reject(new Error("Access lead record not connected yet (sample data in use)."));
    }
  };

  /* Sample Access — derived deterministically from the sample MarketSharp rows, with seeded differences that
   * mimic real gaps: sets keyed in Access that never synced, duplicates Access excluded, confirms MarketSharp
   * missed (no "Completed" activity), contract price adjustments, and leads taken by phone that only Access has. */
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function fmix(h) { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; } /* spread bits evenly */
  const u = (key) => fmix(hashStr("acc-v1:" + key)) / 4294967296;
  const cache = {};
  NS.accessSample = {
    id: "accessSample",
    label: "Sample Access",
    isLive: false,
    streams: { marketer: { system: "Michigan Access", detail: "TM Lead Activity · WHOSET" } },
    async fetchMarketerActivity(userId, opts) {
      const office = (opts && opts.office) || "MI";
      const key = userId + "|" + office;
      if (cache[key]) return cache[key];
      const ms = await NS.sample.fetchMarketerRaw(userId, { office });
      const inquiries = [];
      ms.inquiries.forEach((q) => {
        const h = u("q:" + q.id);
        if (h < 0.006) return;                                              /* MS duplicate lead — Access dropped it */
        inquiries.push(q);
        if (h > 0.992) inquiries.push(Object.assign({}, q, { id: q.id + "-A", source: "Call-in", appointmentId: null })); /* taken by phone, only in Access */
      });
      const appointments = [];
      const resets = [];
      ms.appointments.forEach((a) => {
        const h = u("a:" + a.id);
        if (h < 0.005) return;                                               /* DUPLICATE in Access — excluded from Leads Set */
        const row = Object.assign({}, a, { runType: "NEW" });
        if (!row.confirmedDate && row.dateIssued && u("c:" + a.id) < 0.12) row.confirmedDate = row.dateIssued; /* confirmer filled WHOCONFIRM; MS activity missing */
        if (row.sold && row.saleAmount && u("s:" + a.id) < 0.05) row.saleAmount = Math.round((row.saleAmount + (u("d:" + a.id) < 0.5 ? -1 : 1) * (250 + Math.floor(u("m:" + a.id) * 1250))) / 50) * 50; /* price adjusted in Access */
        appointments.push(row);
        if (h > 0.994) appointments.push(Object.assign({}, row, { id: a.id + "-A" }));             /* set keyed in Access, never synced to MS */
        if (u("r:" + a.id) < 0.05) resets.push({ id: a.id + "-R", date: a.setDate, office: a.office }); /* RUNTYPE RES */
      });
      const callbacks = ms.inquiries.filter((q) => q.outcome === "Call back" && u("cb:" + q.id) < 0.8).map((q) => ({ id: q.id + "-CB", date: q.date, office: q.office }));
      return (cache[key] = { appointments, inquiries, callActivity: [], callbacks, resets });
    }
  };
})();
