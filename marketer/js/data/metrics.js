/* Infinity Home Improvement Command Center — metric definitions (single source of truth).
 *
 * Every number on a marketer's personal Home is computed HERE from raw-shaped rows
 * (appointments, inquiries, call activity) supplied by an adapter. No widget hand-types totals,
 * so Overview, rings, Operating Statement and charts always agree.
 *
 * Raw row shapes (what any adapter must return — see js/data/dashboard-data.js):
 *   appointment: { id, inquiryId, office, setById, source, product, setDate, apptDate, apptSlot,
 *                  confirmedDate|null, dateIssued|null, resulted, result, presentation, quoted,
 *                  quoteAmount, sold, saleDate|null, saleAmount, contractStatus|null }
 *   inquiry:     { id, date, telemarketerId, office, source, product, outcome, appointmentId|null }
 *   callActivity:{ date, userId, callsIn, callsOut }
 * Dates are ISO "YYYY-MM-DD" strings (office-local, America/New_York).
 */
(function () {
  "use strict";

  const inRange = (d, r) => !!d && d >= r.from && d <= r.to;
  const countAppts = (raw, pred) => (raw.appointments || []).reduce((n, a) => n + (pred(a) ? 1 : 0), 0);
  const sumAppts = (raw, pred, field) => (raw.appointments || []).reduce((n, a) => n + (pred(a) ? (a[field] || 0) : 0), 0);
  const isSoldWithContract = (a) => a.sold && !!a.contractStatus;

  /* ——— Base metrics (counts and dollars) ———
   * ms = where this comes from in MarketSharp once live.
   * perMarketer:false rows are shown as "—" with a "Not tracked per marketer" tip. */
  const DEFS = {
    totalCalls: {
      label: "Total Calls In & Out", fmt: "int",
      tip: "Every inbound and outbound call you logged. (Not split by office — shows all your calls.)",
      ms: "Call Center Report → calls completed by this user (in + out), by call date",
      compute: (raw, r) => (raw.callActivity || []).reduce((n, c) => n + (inRange(c.date, r) ? c.callsIn + c.callsOut : 0), 0)
    },
    inquiries: {
      label: "Inquiries", fmt: "int",
      tip: "Leads you worked — you are the Telemarketer on the inquiry. Counted by inquiry date.",
      ms: "Inquiry.Telemarketer = user, Inquiry Date in range",
      compute: (raw, r) => (raw.inquiries || []).reduce((n, q) => n + (inRange(q.date, r) ? 1 : 0), 0)
    },
    apptsSet: {
      label: "Appts. Set", fmt: "int",
      tip: "Appointments you booked, counted on the day you set them.",
      ms: "Appointment.Appt Set By = user, Set Date in range",
      compute: (raw, r) => countAppts(raw, (a) => inRange(a.setDate, r))
    },
    appointments: {
      label: "Appointments", fmt: "int",
      tip: "Your appointments that were scheduled to run in this date range (any result).",
      ms: "Appt Set By = user, Appointment Date in range",
      compute: (raw, r) => countAppts(raw, (a) => inRange(a.apptDate, r))
    },
    confirmed: {
      label: "Confirmed", fmt: "int",
      tip: "Your appointments with a completed confirm call, counted on the day the confirm was done.",
      ms: "Activity type ‘Confirm Appointment’, status Completed → completed date",
      compute: (raw, r) => countAppts(raw, (a) => inRange(a.confirmedDate, r))
    },
    issued: {
      label: "Issued", fmt: "int",
      tip: "Your appointments handed to a sales rep to run (Date Issued in range).",
      ms: "Appointment.Date Issued in range",
      compute: (raw, r) => countAppts(raw, (a) => inRange(a.dateIssued, r))
    },
    resultedIssued: {
      label: "Issued with a result", fmt: "int", hidden: true,
      tip: "Issued appointments whose result has been entered. Today’s appointments don’t have results until tonight.",
      ms: "Date Issued in range AND Appointment Result not blank",
      compute: (raw, r) => countAppts(raw, (a) => inRange(a.dateIssued, r) && a.resulted)
    },
    presentations: {
      label: "Presentation", fmt: "int",
      tip: "The rep sat with the homeowner and did the full demo (a ‘sit’).",
      ms: "Appointment Result where the result type is flagged Presentation",
      compute: (raw, r) => countAppts(raw, (a) => inRange(a.dateIssued, r) && a.presentation)
    },
    proposals: {
      label: "Proposals", fmt: "int",
      tip: "Demos where the rep gave the homeowner a price.",
      ms: "Presentation with a Quote/Proposal attached",
      compute: (raw, r) => countAppts(raw, (a) => inRange(a.dateIssued, r) && a.presentation && a.quoted)
    },
    totalQuoted: {
      label: "Total Quoted", fmt: "money",
      tip: "Dollar total of every price given on your appointments.",
      ms: "Sum of Quote amount on proposals",
      compute: (raw, r) => sumAppts(raw, (a) => inRange(a.dateIssued, r) && a.quoted, "quoteAmount")
    },
    totalSold: {
      label: "Total Sold", fmt: "int",
      tip: "Your appointments with a Sold result (by sale date), even if the contract is later canceled.",
      ms: "Appointment Result = Sold (Gross Sold), by sale date",
      compute: (raw, r) => countAppts(raw, (a) => a.sold && inRange(a.saleDate, r))
    },
    grossSales: {
      label: "Gross Sales", fmt: "int",
      tip: "Sold jobs that have a contract keyed in. Can be lower than Total Sold if a contract hasn’t been entered yet.",
      ms: "Contracts created from Sold appointments, by sale date",
      compute: (raw, r) => countAppts(raw, (a) => isSoldWithContract(a) && inRange(a.saleDate, r))
    },
    grossSalesAmt: {
      label: "Gross Sales $", fmt: "money",
      tip: "Contract dollars on those sold jobs, before cancels and finance turn-downs.",
      ms: "Sum of contract amount, any contract status",
      compute: (raw, r) => sumAppts(raw, (a) => isSoldWithContract(a) && inRange(a.saleDate, r), "saleAmount")
    },
    canceledAmt: {
      label: "Canceled $", fmt: "money",
      tip: "Sold dollars the homeowner later canceled.",
      ms: "Contract Status = Canceled",
      compute: (raw, r) => sumAppts(raw, (a) => a.contractStatus === "Canceled" && inRange(a.saleDate, r), "saleAmount")
    },
    financeRejectedAmt: {
      label: "Finance Rejected $", fmt: "money",
      tip: "Sold dollars where the homeowner’s financing was turned down.",
      ms: "Contract Status = Finance Rejected",
      compute: (raw, r) => sumAppts(raw, (a) => a.contractStatus === "Finance Rejected" && inRange(a.saleDate, r), "saleAmount")
    },
    pendingAmt: {
      label: "Pending $", fmt: "money",
      tip: "Sold dollars still waiting on approval (financing, measure, or paperwork).",
      ms: "Contract Status = Pending",
      compute: (raw, r) => sumAppts(raw, (a) => a.contractStatus === "Pending" && inRange(a.saleDate, r), "saleAmount")
    },
    netSales: {
      label: "Net Sales", fmt: "int",
      tip: "Sold jobs whose contract is Approved — the sales that stuck.",
      ms: "Result = Sold AND Contract Status = Approved (Net Sold)",
      compute: (raw, r) => countAppts(raw, (a) => a.sold && a.contractStatus === "Approved" && inRange(a.saleDate, r))
    },
    netSalesAmt: {
      label: "Net Sales $", fmt: "money",
      tip: "Dollars on Approved contracts from appointments you set.",
      ms: "Sum of contract amount where Contract Status = Approved",
      compute: (raw, r) => sumAppts(raw, (a) => a.sold && a.contractStatus === "Approved" && inRange(a.saleDate, r), "saleAmount")
    },
    /* Company-level / not attributable to a setter today */
    paymentsReceived: { label: "Payments Received", fmt: "money", perMarketer: false, tip: "Not tracked per marketer — payments live in Access / accounting, not by who set the appointment.", ms: "Access A/R (company level)" },
    jobsCompleted: { label: "Jobs Completed", fmt: "int", perMarketer: false, tip: "Not tracked per marketer — installs are tracked in Access by job, not by setter.", ms: "Access installed jobs" },
    jobsCompletedAmt: { label: "Jobs Completed $", fmt: "money", perMarketer: false, tip: "Not tracked per marketer.", ms: "Access installed jobs $" },
    serviceCalls: { label: "Service Calls", fmt: "int", perMarketer: false, tip: "Not tracked per marketer — service work isn’t tied to who set the sale.", ms: "Access / MarketSharp Service" }
  };

  /* ——— Ratios (built only from DEFS above) ——— */
  const RATIOS = {
    sitRate: { label: "Issued → Presentation", num: "presentations", den: "resultedIssued", fmt: "pct",
      tip: "Of your issued appointments that have a result, how many turned into a full demo. Higher = better-quality sets." },
    closeNet: { label: "Presentation → Net Sold", num: "netSales", den: "presentations", fmt: "pct",
      tip: "Of the demos on your appointments, how many became an Approved sale (closing ratio)." },
    closeGross: { label: "Presentation → Gross Sold", num: "totalSold", den: "presentations", fmt: "pct", tip: "Demos that got a Sold result, before cancels." },
    inquiryToSet: { label: "Inquiry to Appt Set", num: "apptsSet", den: "inquiries", fmt: "pct", marketerExtra: true, tip: "Of the leads you worked, how many you booked." },
    confirmRate: { label: "Appointments Confirmed", num: "confirmed", den: "appointments", fmt: "pct", marketerExtra: true, tip: "Confirm calls completed vs appointments that ran in the range (approximate — a confirm can land a day before the range)." },
    issueRate: { label: "Appointments to Issued", num: "issued", den: "appointments", fmt: "pct", marketerExtra: true, tip: "How many of your appointments actually went out to a rep (didn’t cancel)." },
    inquiryToGross: { label: "Inquiry to Gross Sold", num: "totalSold", den: "inquiries", fmt: "pct", tip: "Leads you worked that ended in a Sold result." },
    inquiryToNet: { label: "Inquiry to Net Sold", num: "netSales", den: "inquiries", fmt: "pct", tip: "Leads you worked that ended in an Approved sale." },
    apptsToGross: { label: "Appts to Gross Sold", num: "totalSold", den: "appointments", fmt: "pct", tip: "Your appointments that ran and sold." },
    apptsToNet: { label: "Appts to Net Sold", num: "netSales", den: "appointments", fmt: "pct", tip: "Your appointments that ran and became Approved sales." },
    issuedToGross: { label: "Issued to Gross Sold", num: "totalSold", den: "issued", fmt: "pct", tip: "Issued appointments that sold." },
    issuedToNet: { label: "Issued to Net Sold", num: "netSales", den: "issued", fmt: "pct", tip: "Issued appointments that became Approved sales." },
    presToGross: { label: "Presentation to Gross Sold", num: "totalSold", den: "presentations", fmt: "pct", tip: "Demos that sold." },
    presToNet: { label: "Presentation to Net Sold", num: "netSales", den: "presentations", fmt: "pct", tip: "Demos that became Approved sales." },
    grossPerIssued: { label: "Gross Sales per Issued", num: "grossSalesAmt", den: "issued", fmt: "money2", tip: "Gross sales dollars ÷ issued appointments — what each issued appointment was worth." },
    grossPerPres: { label: "Gross Sales per Presentation", num: "grossSalesAmt", den: "presentations", fmt: "money2", tip: "Gross sales dollars ÷ demos." },
    netPerIssued: { label: "Net Sales per Issued", num: "netSalesAmt", den: "issued", fmt: "money2", tip: "Net sales dollars ÷ issued appointments." },
    netPerPres: { label: "Net Sales per Presentation", num: "netSalesAmt", den: "presentations", fmt: "money2", tip: "Net sales dollars ÷ demos." }
  };

  /* Operating Statement layout (mirrors the MarketSharp widget’s row order; Command Center styling) */
  const OPERATING_LEFT = ["totalCalls", "inquiries", "apptsSet", "appointments", "confirmed", "issued", "presentations", "proposals",
    "totalQuoted", "totalSold", "grossSales", "grossSalesAmt", "canceledAmt", "financeRejectedAmt", "pendingAmt", "netSales", "netSalesAmt"];
  const OPERATING_RIGHT = ["paymentsReceived", "inquiryToGross", "inquiryToNet", "apptsToGross", "apptsToNet", "issuedToGross", "issuedToNet",
    "presToGross", "presToNet", "grossPerIssued", "grossPerPres", "netPerIssued", "netPerPres", "jobsCompleted", "jobsCompletedAmt", "serviceCalls",
    "inquiryToSet", "issueRate", "confirmRate"];

  function computeAll(raw, range) {
    const out = {};
    Object.keys(DEFS).forEach((k) => {
      const d = DEFS[k];
      out[k] = d.perMarketer === false ? null : d.compute(raw, range);
    });
    return out;
  }

  function ratio(values, id) {
    const r = RATIOS[id];
    if (!r) return { num: 0, den: 0, value: null };
    const num = values[r.num] || 0;
    const den = values[r.den] || 0;
    return { num, den, value: den ? num / den : null };
  }

  function fmt(value, kind) {
    if (value == null || (typeof value === "number" && isNaN(value))) return "—";
    switch (kind) {
      case "money": return "$" + Math.round(value).toLocaleString("en-US");
      case "money2": return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "moneyShort": /* full dollars under $100k, compact above so cards don't truncate */
        if (Math.abs(value) >= 1000000) return "$" + (value / 1000000).toFixed(2) + "M";
        if (Math.abs(value) >= 100000) return "$" + (value / 1000).toFixed(1) + "k";
        return "$" + Math.round(value).toLocaleString("en-US");
      case "moneyK": return value >= 1000 ? "$" + (value / 1000).toFixed(value >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k" : "$" + Math.round(value);
      case "pct": return (value * 100).toFixed(value * 100 >= 10 || value === 0 ? 0 : 1) + "%";
      case "pct1": return (value * 100).toFixed(1) + "%";
      default: return Math.round(value).toLocaleString("en-US");
    }
  }

  window.DashboardMetrics = { DEFS, RATIOS, OPERATING_LEFT, OPERATING_RIGHT, computeAll, ratio, fmt, inRange };
})();
