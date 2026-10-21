/* Customer record (v14) — profile drawer laid out like a CRM contact record, per Thomas (2026-10-05):
 * header (initials, LAST, FIRST, address, map links, marketing queue, tags) + right-side Phone & Fax / Email & Internet cards,
 * then a tab strip: Lead Info · Activities · Attachments · Add'l Contacts · Notes · Custom Fields · Inquiries & Appointments ·
 * Quotes · Jobs (only with sales data). Dense tables. Original Command Center code, styling and icons (no third-party logo,
 * artwork or code). Every edit / add / delete / send is sample-only (toast). Data: DashboardData.getCustomerRecord(). */
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tip = (text) => `<button type="button" class="helper-tip" title="${esc(text)}" aria-label="${esc(text)}">?</button>`;
  const PL = () => window.PeopleLog || {};
  const badge = (sys) => (PL().sysBadge ? PL().sysBadge(sys) : `<span class="sysb">${esc(sys)}</span>`);
  const mdY = (iso) => (iso ? (+iso.slice(5, 7)) + "/" + (+iso.slice(8, 10)) + "/" + iso.slice(0, 4) : "");
  const t12 = (t) => { if (!t) return ""; let h = +t.slice(0, 2); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + t.slice(3, 5) + " " + ap; };
  const money = (n) => (n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const ICON = {
    pencil: `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M11.3 1.7a1.5 1.5 0 0 1 2.1 0l.9.9a1.5 1.5 0 0 1 0 2.1L5.6 13.4 2 14l.6-3.6z" fill="currentColor"/></svg>`,
    trash: `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M6 1h4l.5 1H14v1.5H2V2h3.5zM3.5 5h9l-.7 9.2a1 1 0 0 1-1 .8H5.2a1 1 0 0 1-1-.8z" fill="currentColor"/></svg>`,
    pin: `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M8 1a5 5 0 0 1 5 5c0 3.6-5 9-5 9S3 9.6 3 6a5 5 0 0 1 5-5zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor"/></svg>`,
    phone: `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M4 1.5 6 4 4.8 5.6a9 9 0 0 0 5.6 5.6L12 10l2.5 2-1 2.3c-.3.5-.8.8-1.4.7C6.6 14.4 1.6 9.4 1 3.9c0-.6.2-1.1.7-1.4z" fill="currentColor"/></svg>`,
    mail: `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M1.5 3h13v10h-13zM2.5 4.2v.3L8 8.6l5.5-4.1v-.3z" fill="currentColor"/></svg>`,
    note: `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3 1.5h7l3 3V14.5H3zM5 7h6v1H5zm0 2.5h6v1H5z" fill="currentColor"/></svg>`,
    cal: `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M2 3h12v11H2zM2 6h12M5 1.5v3M11 1.5v3" stroke="currentColor" fill="none" stroke-width="1.4"/></svg>`
  };
  const TABS = [
    { id: "info", label: "Leads/Appts" }, { id: "acts", label: "Activities" }, { id: "att", label: "Attachments" }, { id: "contacts", label: "Mail/Contacts" },
    { id: "notes", label: "Notes" }, { id: "custom", label: "Custom Fields" }, { id: "inq", label: "Inquiries & Appointments" }, { id: "quotes", label: "Quotes" }, { id: "jobs", label: "Jobs" }
  ];
  const ui = { tab: "inq", actStatus: "all" };
  let current = null;

  const sampleBtn = (label, what, cls) => `<button type="button" class="cr-btn ${cls || ""}" data-cr-sample="${esc(what || label)}">${esc(label)}</button>`;
  const iconBtn = (icon, what, label) => `<button type="button" class="cr-icon" data-cr-sample="${esc(what)}" aria-label="${esc(label)}" title="${esc(label)} (sample)">${ICON[icon]}</button>`;
  const empty = (msg, sub) => `<div class="cr-empty"><strong>${esc(msg)}</strong>${sub ? `<span>${esc(sub)}</span>` : ""}</div>`;
  const resultChip = (r) => (r ? `<span class="cr-chip ${/Failure|Cancel|Denied|Not Interested|Wrong/i.test(r) ? "bad" : /Success|Completed|Set Appointment|Received|Confirmed/i.test(r) ? "good" : ""}">${esc(r)}</span>` : "");
  const typeChip = (t) => `<span class="cr-type">${esc(t)}</span>`;

  function header(r) {
    const initials = ((r.first || "?")[0] + (r.last || "?")[0]).toUpperCase();
    const q = encodeURIComponent(r.fullAddr);
    const zq = encodeURIComponent(r.fullAddr.replace(/,/g, "").replace(/\s+/g, "-"));
    const maps = [["Google", "https://www.google.com/maps/search/?api=1&query=" + q], ["MapQuest", "https://www.mapquest.com/search/" + q], ["Bing", "https://www.bing.com/maps?q=" + q], ["Zillow", "https://www.zillow.com/homes/" + zq + "_rb/"]];
    const phones = r.phones.map((p) => `<div class="cr-kv"><span>${esc(p.label)}:</span><b>${esc(p.number)}</b> <em>${esc(p.note || "")}</em></div>`).join("") || `<div class="cr-kv muted">No phone on file</div>`;
    const emails = r.emails.map((e) => `<div class="cr-kv"><span>${esc(e.label)}:</span><b>${esc(e.address)}</b></div>`).join("") || `<div class="cr-kv muted">No email on file</div>`;
    return `
      <section class="cr-head">
        <div class="cr-id">
          <span class="cr-av" aria-hidden="true">${esc(initials)}</span>
          <div class="cr-id-main">
            <h3 class="cr-name">${esc((r.last || "").toUpperCase())}, ${esc((r.first || "").toUpperCase())}</h3>
            <div class="cr-addr">${esc(r.street)}<br>${esc(r.city)}, ${esc(r.state)} ${esc(r.zip4)}<br>${esc(r.country)}</div>
            <div class="cr-line"><span class="cr-ico">${ICON.pin}</span> Maps: ${maps.map((m) => `<a href="${m[1]}" target="_blank" rel="noopener noreferrer">${m[0]}</a>`).join(" ")}</div>
            <div class="cr-line"><strong>Marketing Queue:</strong> ${esc(r.marketingQueue)} ${tip("Where this customer sits in the marketing process (from the inquiry result and appointment). MarketSharp field.")}</div>
            <div class="cr-line">${r.tags.length ? r.tags.map((t) => `<span class="cr-tag">${esc(t)}</span>`).join(" ") : `<span class="cr-untag"><span class="cr-box" aria-hidden="true"></span> Untagged</span>`}</div>
            <div class="cr-line cr-srcs">Telemarketer: <b>${esc(r.ownerName)}</b> · Data from ${r.sources.map(badge).join(" ")} ${tip("Each section shows where its data comes from. Where Access and MarketSharp disagree on a number, Access is shown first with an amber flag (Thomas, 2026-10-05).")}</div>
          </div>
        </div>
        <aside class="cr-cards">
          <div class="cr-card">
            <div class="cr-card-h"><span class="cr-ico">${ICON.phone}</span> PHONE &amp; FAX ${iconBtn("pencil", "Edit phone numbers", "Edit phone numbers")}</div>
            ${phones}
            <div class="cr-card-f"><button type="button" class="cr-btn sm" id="cr-convo" ${r.threadId ? "" : "disabled"} title="${r.threadId ? "Open this customer’s texts in Speed to Lead" : "No text conversation on file"}">Show Conversation</button></div>
          </div>
          <div class="cr-card">
            <div class="cr-card-h"><span class="cr-ico">${ICON.mail}</span> EMAIL &amp; INTERNET ${iconBtn("pencil", "Edit email", "Edit email")}</div>
            ${emails}
            <div class="cr-card-f">${sampleBtn("Send Email", "Send Email", "sm")}</div>
          </div>
        </aside>
      </section>`;
  }

  function grid(rows) {
    return `<dl class="cr-grid">${rows.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)} ${f.system ? badge(f.system) : ""}</dd></div>`).join("")}</dl>`;
  }

  function tabInfo(r) {
    return `<div class="cr-toolbar">${sampleBtn("Edit Lead Info", "Edit Lead Info", "primary")}</div>${grid(r.leadInfo)}
      ${r.older ? `<p class="cr-foot">Older shared sample record — fewer details than the generated customers.</p>` : ""}`;
  }

  function tabActs(r) {
    let rows = r.activities;
    if (ui.actStatus === "open") rows = rows.filter((a) => !a.completedDate);
    if (ui.actStatus === "done") rows = rows.filter((a) => a.completedDate);
    const H = PL().HATCH_TIP || "Logged in MarketSharp under Tom’s login by Hatch — not Tom personally.";
    return `
      <div class="cr-toolbar">
        ${sampleBtn("Add Activity", "Add Activity", "primary")} ${sampleBtn("Add Activity Process", "Add Activity Process")} ${sampleBtn("Delete All Not Complete", "Delete All Not Complete")} ${sampleBtn("Send Template Email", "Send Template Email")}
        <label class="cr-status">Status <select id="cr-act-status"><option value="all" ${ui.actStatus === "all" ? "selected" : ""}>All</option><option value="open" ${ui.actStatus === "open" ? "selected" : ""}>Not complete</option><option value="done" ${ui.actStatus === "done" ? "selected" : ""}>Completed</option></select></label>
      </div>
      ${r.hiddenActivities ? `<p class="cr-note">${r.hiddenActivities} confirm-team / office activit${r.hiddenActivities === 1 ? "y" : "ies"} on this customer ${r.hiddenActivities === 1 ? "is" : "are"} hidden for marketers ${tip("Appointment reminders, confirm calls and thank-yous belong to the confirm team and office — same rule as your Activity list. Managers see every activity on the record.")}</p>` : ""}
      ${rows.length ? `<div class="cr-table-wrap"><table class="cr-table">
        <thead><tr><th>Completed (EDT)</th><th><span class="sr-only">Actions</span></th><th>Due date/time</th><th>Assigned to</th><th>Type</th><th>Reference</th><th>Result</th><th>Note</th></tr></thead>
        <tbody>${rows.map((a) => `<tr class="${a.completedDate ? "" : "is-open"}">
          <td>${a.completedDate ? esc(mdY(a.completedDate) + " " + t12(a.completedTime)) : `<span class="cr-open">Not complete</span>`}</td>
          <td class="cr-actions">${iconBtn("pencil", "Edit activity", "Edit")}${iconBtn("trash", "Delete activity", "Delete")}</td>
          <td>${esc(mdY(a.dueDate) + " " + t12(a.dueTime))}</td>
          <td>${a.isHatchProxy ? `${esc(a.assignedTo)} ${tip(H)}` : esc(a.assignedTo || "")}</td>
          <td>${typeChip(a.type)}${a.system && a.system !== "MarketSharp" ? " " + badge(a.system) : ""}</td>
          <td>${esc(a.reference || "")}</td>
          <td>${resultChip(a.result)}${a.opened != null && a.type === "Text Out" ? ` <span class="cr-sub">${a.opened ? "opened " + esc(t12(a.openedAt)) : "not opened"}</span>` : ""}</td>
          <td>${a.text ? `<span class="cr-noteic" title="${esc(a.text)}">${ICON.note}</span>` : ""}</td>
        </tr>`).join("")}</tbody></table></div>` : empty("No activities", ui.actStatus === "all" ? "Nothing logged on this customer yet." : "Nothing matches this status.")}
      <p class="cr-foot">MarketSharp Activities (Assigned To = assignToEmployeeId). Texts come from the conversation (Hatch texts under Tom’s login are flagged, not credited to Tom). Hatch: open times TBD until API confirmed.</p>`;
  }

  function tabAtt(r) {
    return `<div class="cr-toolbar">${sampleBtn("Add Attachment", "Add Attachment", "primary")}</div>
      ${r.attachments.length ? `<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>Name</th><th>Type</th><th>Added</th><th>Added by</th><th>Size</th><th></th></tr></thead>
      <tbody>${r.attachments.map((a) => `<tr><td><button type="button" class="cr-link" data-cr-sample="Open ${esc(a.name)}">${esc(a.name)}</button></td><td>${esc(a.kind)}</td><td>${esc(mdY(a.added))}</td><td>${esc(a.by)}</td><td>${esc(a.size)}</td><td class="cr-actions">${iconBtn("trash", "Delete attachment", "Delete")}</td></tr>`).join("")}</tbody></table></div>`
      : empty("No attachments", "Contracts, measure sheets and photos show here once a job is sold.")}`;
  }

  function tabContacts(r) {
    return `<div class="cr-toolbar">${sampleBtn("Add Contact", "Add Contact", "primary")}</div>
      ${r.contacts.length ? `<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th><th></th></tr></thead>
      <tbody>${r.contacts.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.relation)}</td><td>${esc(c.phone || "—")}</td><td>${esc(c.email || "—")}</td><td class="cr-actions">${iconBtn("pencil", "Edit contact", "Edit")}${iconBtn("trash", "Delete contact", "Delete")}</td></tr>`).join("")}</tbody></table></div>`
      : empty("No additional contacts", "Spouse, co-owner or property manager would show here.")}`;
  }

  function tabNotes(r) {
    return `<div class="cr-toolbar">${sampleBtn("+ Add Note", "Add Note", "primary")}</div>
      ${r.notes.length ? `<div class="cr-table-wrap"><table class="cr-table cr-notes"><thead><tr><th><span class="sr-only">Edit</span></th><th>Date/time (EDT)</th><th>Type</th><th>Source</th><th>Note</th><th><span class="sr-only">Delete</span></th></tr></thead>
      <tbody>${r.notes.map((n) => `<tr>
        <td class="cr-actions">${iconBtn("pencil", "Edit note", "Edit")}</td>
        <td class="cr-nowrap">${esc(mdY(n.date) + " " + t12(n.time))}</td>
        <td class="cr-nowrap">${esc(n.type)} ${n.system && n.system !== "MarketSharp" ? badge(n.system) : ""}</td>
        <td>${esc(n.source)}</td>
        <td class="cr-notetext">${esc(n.note)}</td>
        <td class="cr-actions">${iconBtn("trash", "Delete note", "Delete")}</td></tr>`).join("")}</tbody></table></div>`
      : empty("No notes", "Use “+ Add Note” to log a call or a detail for the rep.")}
      <p class="cr-foot">MarketSharp notes plus Access comments (FINCOM / confirm stamps), each badged with its source.</p>`;
  }

  function tabCustom(r) {
    return `<div class="cr-toolbar">${sampleBtn("Edit Custom Fields", "Edit Custom Fields", "primary")}</div>
      ${r.customFields.length ? grid(r.customFields) : empty("No custom fields", "Office-defined fields (home age, financing, best time…) show here.")}`;
  }

  function apptRows(list, r) {
    return list.map((a) => `<tr>
      <td class="cr-nowrap">${esc(mdY(a.date))} ${a.time ? esc(t12(a.time)) : ""} <span class="cr-cal" title="Add to calendar (sample)">${ICON.cal}</span></td>
      <td>${esc(a.type)}${a.onlyIn ? ` ${badge(a.onlyIn)} <span class="cr-sub">only in Access (RUNTYPE RES)</span>` : ""}</td>
      <td>${esc(a.salesperson)}${a.salespersonTip ? " " + tip(a.salespersonTip) : ""}</td>
      <td>${esc(a.result)}${a.mismatch && a.mismatch.kind === "confirm" ? ` <span class="cr-mis" title="${esc("Access WHOCONFIRM is filled for this visit but MarketSharp has no completed Confirm Appointment activity. Access counts as confirmed (Thomas, 2026-10-05).")}">${badge(a.resultSystem === "MarketSharp" ? (r.accSys || "Michigan Access") : a.resultSystem)} confirmed · not in MarketSharp</span>` : a.mismatch ? ` ${badge(a.resultSystem)} <span class="cr-mis" title="${esc("Access: " + a.mismatch.access + " · MarketSharp: " + a.mismatch.ms + ". Access is shown first (Thomas, 2026-10-05).")}">≠ MarketSharp: ${esc(a.mismatch.ms)}</span>` : ""}</td>
      <td>${esc(a.resultReason || "")}</td>
      <td class="cr-links">${["Edit", "Proposals", "Quotes", "Delete"].map((x) => `<button type="button" class="cr-link" data-cr-sample="${x} appointment">${x}</button>`).join("")}</td></tr>`).join("");
  }

  function tabInq(r) {
    return `<div class="cr-toolbar">${sampleBtn("Add Lead Inquiry", "Add Lead Inquiry", "primary")}</div>
      ${r.inquiries.map((q) => `
        <section class="cr-inq ${q.old ? "is-old" : ""}">
          <header class="cr-bar"><h4>${esc(mdY(q.date))} - ${q.kind ? esc(q.kind) + " - " : ""}${esc(q.source)} - ${esc(q.product)}</h4>
            <span class="cr-bar-ic">${iconBtn("pencil", "Edit inquiry", "Edit inquiry")}${iconBtn("trash", "Delete inquiry", "Delete inquiry")}</span></header>
          <div class="cr-inq-body">
            <div class="cr-site">Job Site Address: ${esc(q.jobSite)}</div>
            <div class="cr-inq-row">
              <div><span class="cr-statsub">${esc(q.statusSub || "")}</span><span>Status:</span> <b>${esc(q.status)}</b></div>
              <div><span>Canvasser:</span> <b>${esc(q.canvasser || "")}</b></div>
              <div><span>Telemarketer:</span> <b>${esc(q.telemarketer || "")}</b></div>
              <div><span>Promoter:</span> <b>${esc(q.promoter || "")}</b></div>
              ${q.accessLeadNum ? `<div><span>Access lead #:</span> <b>${esc(q.accessLeadNum)}</b> ${badge(r.accSys)}</div>` : ""}
            </div>
            ${q.note ? `<p class="cr-note">${esc(q.note)}</p>` : ""}
            <div class="cr-toolbar tight">${sampleBtn("Add Appointment", "Add Appointment", "primary sm")}</div>
            ${q.appointments.length ? `<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>Date/time (EDT)</th><th>Type</th><th>Salesperson</th><th>Result</th><th>Result reason</th><th><span class="sr-only">Actions</span></th></tr></thead>
              <tbody>${apptRows(q.appointments, r)}</tbody></table></div>`
              : `<p class="cr-none">No appointments found. Click “Add Appointment” to create a new one.</p>`}
          </div>
        </section>`).join("")}`;
  }

  function tabQuotes(r) {
    return `<div class="cr-toolbar">${sampleBtn("Add Quote", "Add Quote", "primary")}</div>
      ${r.quotes.length ? `<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>Quote #</th><th>Date</th><th>Product</th><th>Salesperson</th><th>Amount</th><th>Status</th><th></th></tr></thead>
      <tbody>${r.quotes.map((x) => `<tr><td><b>${esc(x.number)}</b></td><td>${esc(mdY(x.date))}</td><td>${esc(x.product)}</td><td>${esc(x.salesperson)}</td><td>${esc(money(x.amount))}</td><td>${esc(x.status)}</td><td class="cr-links"><button type="button" class="cr-link" data-cr-sample="Open quote">Open</button></td></tr>`).join("")}</tbody></table></div>`
      : empty("No quotes", "A quote shows here after the rep prices the job at the visit.")}`;
  }

  function tabJobs(r) {
    if (!r.jobs.length) return empty("No jobs", "Jobs appear once this customer buys.");
    return `<div class="cr-toolbar">${sampleBtn("Add New Job", "Add New Job", "primary")} ${sampleBtn("Add Quick Sale", "Add Quick Sale", "primary")}</div>
      ${r.jobs.map((j) => `
        <section class="cr-job">
          <header class="cr-bar"><h4>${esc(j.number)} - ${esc(j.name)}</h4><span class="cr-bar-ic">${iconBtn("pencil", "Edit job", "Edit job")}${iconBtn("trash", "Delete job", "Delete job")}</span></header>
          <div class="cr-inq-body">
            <div class="cr-site">Job Site Address: ${esc(j.site)}</div>
            <div class="cr-inq-row">
              <div><span>Contract Date:</span> <b>${esc(mdY(j.contractDate))}</b></div>
              <div><span>Total Contract:</span> <b>${esc(money(j.total))}</b> ${j.totalAccess != null ? badge(j.accSys) : ""}
                ${j.mismatch ? `<span class="cr-ms">${badge("MarketSharp")} ${esc(money(j.totalMs))}</span> <span class="cr-mis" title="${esc("Access CONPRICE " + money(j.totalAccess) + " vs MarketSharp " + money(j.totalMs) + " (difference " + money(Math.abs(j.totalAccess - j.totalMs)) + "). Access is shown first (Thomas, 2026-10-05).")}">Doesn’t match MarketSharp</span>` : ""}</div>
              <div><span>Balance Due:</span> <b>${esc(money(j.balance))}</b></div>
              <div><span>Job Status:</span> <b>${esc(j.status)}</b></div>
            </div>
            <div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>Product</th><th>Salesperson</th><th>Price</th><th>Complete date</th><th>Work crew</th><th><span class="sr-only">Actions</span></th></tr></thead>
              <tbody>${j.products.map((p) => `<tr><td><b>${esc(p.product)}</b></td><td>${esc(p.salesperson)}</td><td>${esc(money(p.price))}</td><td>${esc(mdY(p.completeDate))}</td><td>${esc(p.workCrew)}</td>
                <td class="cr-links">${["Details", "Production", "Commission", "Costs", "Service"].map((x) => `<button type="button" class="cr-link" data-cr-sample="${x}">${x}</button>`).join("")}</td></tr>`).join("")}</tbody></table></div>
          </div>
        </section>`).join("")}
      <p class="cr-foot">Total contract: Access (LEAD.CONPRICE, boarded) first; MarketSharp sale amount shown only when it differs. Balance, crew and complete date are sample.</p>`;
  }

  const BODY = { info: tabInfo, acts: tabActs, att: tabAtt, contacts: tabContacts, notes: tabNotes, custom: tabCustom, inq: tabInq, quotes: tabQuotes, jobs: tabJobs };
  function count(r, id) {
    return { acts: r.activities.length, att: r.attachments.length, contacts: r.contacts.length, notes: r.notes.length, inq: r.inquiries.length, quotes: r.quotes.length, jobs: r.jobs.length }[id];
  }

  function render(root, r, ctx) {
    current = { root, r, ctx };
    if (r.restricted) {
      root.innerHTML = `<div class="cr-empty big"><strong>This customer belongs to another marketer</strong><span>${esc(r.name)} is worked by ${esc(r.ownerName)}. Marketers only see their own customers — ask your manager if you need this record.</span></div>`;
      return;
    }
    const tabs = TABS.filter((t) => t.id !== "jobs" || r.jobs.length);
    if (!tabs.some((t) => t.id === ui.tab)) ui.tab = "inq";
    root.innerHTML = `<div class="cr">
      ${header(r)}
      <nav class="cr-tabs" role="tablist" aria-label="Customer record sections">${tabs.map((t) => {
        const n = count(r, t.id);
        return `<button type="button" role="tab" class="cr-tab ${t.id === ui.tab ? "active" : ""}" aria-selected="${t.id === ui.tab}" data-cr-tab="${t.id}">${esc(t.label)}${n ? ` <span class="cr-n">${n}</span>` : ""}</button>`;
      }).join("")}</nav>
      <section class="cr-body" role="tabpanel">${BODY[ui.tab](r)}</section>
      <p class="cr-foot">Sample record — Command Center layout modeled on the contact-record structure the office already knows. Nothing here edits MarketSharp, Access or Hatch.</p>
    </div>`;
    wire(root, r, ctx);
  }

  function wire(root, r, ctx) {
    /* keep the active tab visible when the strip scrolls sideways (phone width) */
    const nav = root.querySelector(".cr-tabs"), act = root.querySelector(".cr-tab.active");
    if (nav && act && nav.scrollWidth > nav.clientWidth) {
      const d = act.getBoundingClientRect().left - nav.getBoundingClientRect().left;
      nav.scrollLeft += d - 12;
    }
    root.querySelectorAll("[data-cr-tab]").forEach((b) => b.addEventListener("click", () => { ui.tab = b.getAttribute("data-cr-tab"); render(root, r, ctx); const t = root.querySelector(".cr-tab.active"); if (t) t.focus(); }));
    root.querySelectorAll("[data-cr-sample]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); ctx.toast && ctx.toast("Sample — “" + b.getAttribute("data-cr-sample") + "” isn’t saved. In the live version this opens the record in MarketSharp."); }));
    const st = root.querySelector("#cr-act-status");
    if (st) st.addEventListener("change", () => { ui.actStatus = st.value; render(root, r, ctx); });
    const cv = root.querySelector("#cr-convo");
    if (cv && r.threadId) cv.addEventListener("click", () => ctx.onShowConversation && ctx.onShowConversation(r.threadId));
  }

  function reset() { ui.tab = "inq"; ui.actStatus = "all"; }
  window.CustomerRecord = { render, reset, setTab: (t) => { ui.tab = t; } };
})();
