/* Activity definitions — types, references, results (dispositions) and status rules.
 * Single source for the Activity view AND the "My Activity" card on the marketer Home,
 * so their counts always agree. Mirrors MarketSharp's Activity List concepts (Command Center styling).
 *
 * Normalized activity row (what any adapter returns — see dashboard-data.js / marketsharp-adapter.js):
 *   { id, type, reference, leadId, leadFirst, leadLast, office, appointmentId|null,
 *     assignedToId, scheduledById, dueDate "YYYY-MM-DD", dueTime "HH:MM",
 *     completedDate|null, completedTime|null, result|null, inbound:boolean }
 */
(function () {
  "use strict";

  const TYPES = {
    "Call Out": { group: "call", icon: "☎", inbound: false, tip: "A phone call you make to the lead." },
    "Call In": { group: "call", icon: "☎", inbound: true, tip: "The lead called in (logged automatically)." },
    "Text Out": { group: "text", icon: "✉", inbound: false, tip: "A text you sent (logged automatically when texting from the CRM)." },
    "Text In": { group: "text", icon: "✉", inbound: true, tip: "The lead texted back (logged automatically)." },
    "Email Out": { group: "email", icon: "@", inbound: false, tip: "An email to the lead." },
    "Event Emailed Out": { group: "email", icon: "@", inbound: false, tip: "A calendar invite emailed to the lead." },
    "To-Do": { group: "todo", icon: "✓", inbound: false, tip: "A task to do — not a call or text (e.g. ask a vendor for a lead credit)." }
  };

  const GROUPS = [
    { id: "call", label: "Call Out", tip: "Phone calls (Call Out; Call In if any)." },
    { id: "text", label: "Text", tip: "Text Out and Text In." },
    { id: "todo", label: "To-Do", tip: "Tasks that aren’t a call or text." },
    { id: "email", label: "Email", tip: "Email Out and emailed calendar invites." }
  ];

  /* Activity Reference = "what is this about" (MarketSharp editable list).
   * audience — whose queue the reference belongs to:
   *   'marketer'  = setter / callback work (shows in marketers' Activity and the manager's team view)
   *   'confirmer' = confirmation workflow (Shelby / confirm team) — NEVER shown in a marketer's Activity
   *   'office'    = post-sale / office follow-up (not a marketer's queue either; live refs only)
   * Unknown live references (not listed here) are shown to everyone until they're tagged. */
  const CONFIRMER_REFERENCES = [
    "Confirm Appointment",      /* Call Out confirm call (result Completed = Appt Confirmed) */
    "Appointment Reminder",     /* Text Out / Email Out the day before */
    "Pre-Appointment Email",    /* live MarketSharp reference (confirmation workflow) */
    "Pre-Appointment Letter"    /* live MarketSharp reference (confirmation workflow) */
  ];
  const REFERENCES = {
    "Confirm Appointment": { audience: "confirmer", tip: "Call to confirm an upcoming appointment. Result it Completed when the homeowner confirms." },
    "Appointment Reminder": { audience: "confirmer", tip: "Reminder text/email the day before the appointment." },
    "Pre-Appointment Email": { audience: "confirmer", tip: "Email sent before the appointment (confirmation workflow)." },
    "Pre-Appointment Letter": { audience: "confirmer", tip: "Letter sent before the appointment (confirmation workflow)." },
    "Schedule / Reschedule Appointment": { audience: "marketer", tip: "Reach out to book (or rebook) an appointment." },
    "Recontact Call": { audience: "marketer", tip: "Call back a lead whose appointment didn’t run (no show, cancel) to reset it." },
    "Rehash Call": { audience: "marketer", tip: "Call back after a demo that didn’t sell, to set a second visit." },
    "Second Chance Call": { audience: "marketer", tip: "Another try at a lead you couldn’t reach or who asked for a call back." },
    "Second Chance Email": { audience: "marketer", tip: "Email follow-up to a lead you couldn’t reach." },
    "Request Refund/Credit": { audience: "marketer", tip: "Ask the lead vendor to credit a bad lead (wrong number, out of area)." },
    "Follow Up": { audience: "marketer", tip: "A follow-up on a lead you scheduled for yourself." },
    "Thank You": { audience: "office", tip: "Thank-you touch after a sale (office, not a marketer task)." },
    "3 DAY RECISION": { audience: "office", tip: "Post-sale rescission-period task (office)." },
    "INSTALL READY": { audience: "office", tip: "Install-readiness task (office / production)." }
  };
  CONFIRMER_REFERENCES.forEach((r) => { if (!REFERENCES[r]) REFERENCES[r] = { audience: "confirmer", tip: "" }; else REFERENCES[r].audience = "confirmer"; });

  /* audience of a reference: listed → its tag; unknown → null (shown to everyone until tagged) */
  function referenceAudience(ref) { return (REFERENCES[ref] || {}).audience || null; }
  function referenceTip(ref) { return (REFERENCES[ref] || {}).tip || ""; }
  /* Does this activity belong in the given audience's queue?
   *   'marketer'  → marketer refs + untagged refs (never confirmer / office)
   *   'confirmer' → confirmer refs only (ready for a future confirm queue)
   *   'all' / falsy → everything */
  function inAudience(a, audience) {
    if (!audience || audience === "all") return true;
    const aud = referenceAudience(a.reference);
    if (audience === "confirmer") return aud === "confirmer";
    if (audience === "marketer") return aud === "marketer" || aud === null;
    return aud === audience;
  }
  function referencesFor(audience) {
    return Object.keys(REFERENCES).filter((r) => REFERENCES[r].audience === audience);
  }

  /* Activity Results (dispositions) and the Call Center Report flags they set.
   * Flags: contacted · apptCreated · apptConfirmed (Call In / Call Out flags come from the type). */
  const RESULTS = {
    "Completed": { flags: ["contacted", "apptConfirmed"], tip: "Done. On a Confirm Appointment call this is the result that counts as Appt Confirmed." },
    "Set Appointment": { flags: ["contacted", "apptCreated"], tip: "You booked an appointment on this call." },
    "Confirmed": { flags: ["contacted"], tip: "Counts only as Contacted — NOT Appt Confirmed. Use Completed for a confirm call." },
    "Left Message": { flags: [], tip: "Voicemail or message left." },
    "No Answer": { flags: [], tip: "Nobody picked up, no message." },
    "Busy Signal": { flags: [], tip: "Line was busy." },
    "Call Back": { flags: ["contacted"], tip: "Talked to them — they asked for a call at another time." },
    "Wrong Number": { flags: [], tip: "Number doesn’t reach this lead." },
    "Not Interested": { flags: ["contacted"], tip: "Talked to them — they don’t want an appointment." },
    "Cust Cancelled Appt": { flags: ["contacted"], tip: "Homeowner cancelled the appointment on this call." },
    "Text Success": { flags: [], tip: "Text delivered." },
    "Text Failure": { flags: [], tip: "Text didn’t deliver (bad cell number or blocked)." },
    "Email Success": { flags: [], tip: "Email delivered." },
    "Email Failure": { flags: [], tip: "Email bounced — get a correct address or rely on text/call." }
  };

  const CONFIRM_TIP = "Confirm calls: pick Completed (not ‘Confirmed’). In MarketSharp only Completed sets the Appt Confirmed flag; ‘Confirmed’ counts only as Contacted.";

  /* Shown in the result picker on marketer (non-confirm) activities */
  const SETTER_RESULT_TIP = "Booked one? Pick Set Appointment (counts as Appt Created). In MarketSharp, Completed also carries the Appt Confirmed flag, so on a call keep Completed for when there’s no better result.";

  function resultOptions(type) {
    const g = (TYPES[type] || {}).group;
    if (g === "call") return ["Completed", "Set Appointment", "Left Message", "No Answer", "Busy Signal", "Call Back", "Wrong Number", "Not Interested", "Cust Cancelled Appt"];
    if (g === "text") return ["Text Success", "Text Failure", "Completed"];
    if (g === "email") return ["Email Success", "Email Failure", "Completed"];
    return ["Completed"];
  }

  const isOpen = (a) => !a.completedDate;
  /* own work = activities the person did (inbound Text In / Call In are auto-logged, not work done) */
  const isOwnWork = (a) => !(TYPES[a.type] || {}).inbound;

  /* status: done · overdue (due before today) · today (due today) · upcoming */
  function status(a, today) {
    if (a.completedDate) return "done";
    if (a.dueDate < today) return "overdue";
    if (a.dueDate === today) return "today";
    return "upcoming";
  }

  function counts(rows, today, weekFrom) {
    const c = { open: 0, overdue: 0, dueToday: 0, completedToday: 0, completed7: 0, all: rows.length };
    rows.forEach((a) => {
      const s = status(a, today);
      if (s !== "done") c.open++;
      if (s === "overdue") c.overdue++;
      if (s === "today") c.dueToday++;
      if (s === "done" && isOwnWork(a)) {
        if (a.completedDate === today) c.completedToday++;
        if (a.completedDate >= weekFrom) c.completed7++;
      }
    });
    return c;
  }

  const STATUS_FILTERS = [
    { id: "open", label: "Open", tip: "Not completed yet — overdue, due today, and upcoming." },
    { id: "dueToday", label: "Due today", tip: "Open and due today." },
    { id: "overdue", label: "Overdue", tip: "Open and due before today." },
    { id: "completedToday", label: "Completed today", tip: "Finished today by you. Inbound texts/calls are logged automatically and not counted." },
    { id: "completed7", label: "Completed · 7 days", tip: "Finished in the last 7 days (today included)." },
    { id: "all", label: "All mine", tip: "Everything assigned to you in the sample window (last 30 days + next 7)." }
  ];

  function matchStatus(a, f, today, weekFrom) {
    const s = status(a, today);
    switch (f) {
      case "open": return s !== "done";
      case "dueToday": return s === "today";
      case "overdue": return s === "overdue";
      case "completedToday": return s === "done" && a.completedDate === today && isOwnWork(a);
      case "completed7": return s === "done" && a.completedDate >= weekFrom && isOwnWork(a);
      default: return true;
    }
  }

  window.ActivityDefs = { TYPES, GROUPS, REFERENCES, CONFIRMER_REFERENCES, referenceAudience, referenceTip, inAudience, referencesFor, RESULTS, CONFIRM_TIP, SETTER_RESULT_TIP, STATUS_FILTERS, resultOptions, isOpen, isOwnWork, status, counts, matchStatus };
})();
