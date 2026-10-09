/* MarketSharp adapter — STUB (not wired). Swap target for the sample adapter.
 *
 * Must return the same raw rows as sample-adapter.js (shapes documented in js/data/metrics.js).
 * Nothing here calls MarketSharp yet; no credentials live in this prototype.
 *
 * TODO (field mapping, per raw stream):
 *  appointments  ← Appointment records joined to their Inquiry
 *    setById        = Appointment "Appt Set By" (user id). Fallback: Inquiry.Telemarketer when Appt Set By is blank.
 *    setDate        = Appointment set date (created date of the appointment)
 *    apptDate/Slot  = Appointment date / time
 *    office         = Division / office (MI vs IL) — keep the MI/IL hard wall
 *    source         = Inquiry Lead Source (primary source)
 *    product        = Inquiry Interest / product
 *    confirmedDate  = completed date of the Activity of type "Confirm Appointment" (status Completed) linked to the appointment
 *    dateIssued     = Appointment "Date Issued"
 *    resulted       = Appointment Result is not blank
 *    result         = Appointment Result text
 *    presentation   = Appointment Result type has the Presentation flag (sit/demo)
 *    quoted/quoteAmount = Proposal / Quote on the appointment
 *    sold           = Appointment Result = Sold  (→ Gross Sold)
 *    saleDate/saleAmount/contractStatus = Contract linked to the sold appointment
 *                     (Net Sold = Sold AND Contract Status = Approved; Canceled / Finance Rejected / Pending map 1:1)
 *  inquiries     ← Inquiry records where Telemarketer = user (Inquiry Date, Lead Source, Interest, outcome/CTS)
 *  callActivity  ← Call Center Report, grouped by completer + day (calls in, calls out)
 *
 * Reports to cross-check totals against once live: Operating Statement widget (dashboard),
 * Telemarketing / Lead Activity reports, Appointment Results report, Sales report by Appt Set By.
 */
(function () {
  "use strict";
  const NS = (window.DashboardAdapters = window.DashboardAdapters || {});
  NS.marketsharp = {
    id: "marketsharp",
    label: "MarketSharp",
    isLive: false,
    streams: {
      appointments: { system: "MarketSharp", detail: "Appt Set By" },
      inquiries: { system: "MarketSharp", detail: "Inquiry.Telemarketer" },
      callActivity: { system: "MarketSharp", detail: "Call Center Report" },
      activities: { system: "MarketSharp", detail: "Activity List · Assigned To" }
    },
    /* Activity List — STUB.
     * TODO (OData v2, read-only, server-side only):
     *   GET https://api4.marketsharpm.com/WcfDataService.svc/Activities
     *       ?$filter=assignToEmployeeId eq '<employee guid>' and completedDate eq null      (open)
     *        or  … and completedDate ge datetime'<today-6 04:00Z>'                           (completed 7 days)
     *       &$expand=Contact,ActivityReference,ActivityResult
     *       &$select=id,type,name,dueDate,completedDate,activityReferenceId,activityResultId,
     *                assignToEmployeeId,scheduledByEmployeeId,appointmentId,inquiryId,Contact/firstName,Contact/lastName
     *   (Task brief wrote "assignedEmployeeId … completed eq false"; the observed entity uses assignToEmployeeId +
     *    completedDate — run `ms_appts.py --discover` / $metadata to confirm before wiring.)
     *   Infinity has a record per company (MI 4746 / IL 1) for many people → query BOTH employee ids per user.
     * Column mapping → normalized row (activity-defs.js):
     *   Mark Complete      ← completedDate == null
     *   Lead Last / First  ← Contact.lastName / Contact.firstName      leadId ← inquiryId (fallback contactId)
     *   Type icon / Type   ← type (Call Out, Call In, Text Out, Text In, Email Out, To-Do, Event Emailed Out)
     *   Due Date           ← dueDate (/Date(ms)/ UTC → ET → dueDate + dueTime)
     *   Activity Reference ← ActivityReference.name
     *   Assigned To        ← assignToEmployeeId → Command Center user
     *   Result             ← ActivityResult.name (+ flags Contacted / Appt Created / Appt Confirmed for CCR)
     *   office             ← Contact.companyId (4746 = MI, 1 = IL)
     * Caveat: texts sent through the texting integration are logged under Tom Otten's login today, so Text Out
     * rows must be re-attributed (conversation owner / sender name in the activity text) or the integration
     * moved to a dedicated "Marketing" login, or marketers' text counts will be wrong.
     * Mark complete: OData can't write. Needs the partner-only REST API 2.0 or a deep link into MarketSharp. */
    fetchActivities(/* userId */) {
      return Promise.reject(new Error("MarketSharp Activity List not connected yet (sample data in use)."));
    },
    /* Speed to Lead threads — STUB.
     * TODO (OData, read-only, server-side):
     *   GET Activities?$filter=(type eq 'Text Out' or type eq 'Text In') and dueDate ge datetime'<3 phone days ago>'
     *        and assignToEmployeeId eq '<guid>'   (both company ids per person)
     *       &$expand=Contact&$orderby=dueDate
     *   Group rows by contactId → one thread. Message: dir ← type (Text Out = out, Text In = in) · time ← completedDate/dueDate (UTC → ET)
     *   · text ← activity notes/name · sent by ← scheduledByEmployeeId / sender name in the note · opened ← read status the
     *   texting integration writes into the activity (confirm the field before wiring; not every integration sends it).
     * Caveat: the texting integration pushes its texts under Tom Otten's login, so "sent by" for auto texts must come from
     *   the note text / integration, and assignee must be the lead's marketer (Inquiry.Telemarketer), not Tom.
     * Status rule (same as sample): newest text from the lead (not STOP) → Needs a reply; else Done. */
    fetchTextThreads(/* userId */) {
      return Promise.reject(new Error("MarketSharp text activities not connected yet (sample data in use)."));
    },
    /* Per-user activity events — STUB (wire SECOND). Feed map §2. OData read-only:
     *   GET Activities?$filter=completedDate ge datetime'<from>'&$orderby=completedDate desc&$top=500 (page)
     * Promise<MsActivityEvent[]>  MsActivityEvent = { source:"marketsharp", employeeId, employeeName, type, reference, result,
     *   due, completed, inquiryId, appointmentId, isHatchProxy }
     *   employeeId ← assignToEmployeeId (scheduledByEmployeeId kept for "scheduled by") · employeeName ← Employees.name
     *   → user via IdentityMap.fromMarketSharp(name) (merges company 4746 + company 1 ids)
     *   isHatchProxy ← IdentityMap.isHatchProxy(row): assigned to Tom (Hatch's integration employee) AND name contains "Hatch"
     *   ("Hatch - Outbound sms/email") → shown as "Hatch (system/AI, via Tom's login)", never credited to Tom.
     * Text sends = type "Text Out" (result Text Success / Text Failure); replies = "Text In". MarketSharp has no opened field. */
    fetchActivityEvents(/* { from, to } */) {
      return Promise.reject(new Error("MarketSharp activity events not connected yet (sample data in use)."));
    },
    fetchLeadProfile(/* leadId */) {
      /* TODO: Inquiries('<id>')?$expand=Contact,Appointments,InquirySourcePrimary + ContactPhones(contactId) */
      return Promise.reject(new Error("MarketSharp lead profile not connected yet."));
    },
    /* Customer record (v14) — STUB. One call per opened record, server-side.
     * Promise<MsContactRecord>  MsContactRecord = {
     *   contact:   { id, firstName, lastName, address1, city, state, zip, zip4, marketingQueue, tags[], contactType },
     *   phones:    [{ type:"Cell Phone"|"Home Phone"|…, number, isPrimary, sourceCode }]   ← ContactPhones
     *   emails:    [{ type, address, isPrimary }]                                          ← ContactEmails
     *   inquiries: [{ id, date, primarySource, product, status, statusSub, jobSiteAddress, canvasserId, telemarketerId, promoterId }]
     *   appointments: [{ id, inquiryId, at, type:"Sales Presentation"|"Reset"|…, salespersonId, result, resultReason }]
     *   jobs:      [{ id, number, name, siteAddress, contractDate, totalContract, balanceDue, status,
     *                products:[{ product, salespersonId, price, completeDate, workCrew }] }]
     *   activities: MsActivityEvent[] (same shape as fetchActivityEvents, filtered to this contact)
     *   notes:     [{ at, type:"Appointment"|"Contact Note"|…, source, text, employeeId }]
     *   quotes:    [{ number, date, product, salespersonId, amount, status }]
     *   attachments: [{ name, type, addedAt, addedById, size }]
     *   contacts:  [{ name, relationship, phone, email }]   customFields: [{ label, value }] }
     * Employee ids → users via IdentityMap.fromMarketSharp. */
    fetchContactRecord(/* contactId */) {
      return Promise.reject(new Error("MarketSharp contact record not connected yet (sample data in use)."));
    },
    fetchMarketerRaw(/* userId, { office } */) {
      /* TODO: call the MarketSharp API / OData feed server-side (never from the browser with a key),
       * page through Appointments + Inquiries + Activities for this user, map to raw rows above. */
      return Promise.reject(new Error("MarketSharp adapter not connected yet (sample data in use)."));
    }
  };
})();
