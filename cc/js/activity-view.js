/* Infinity Home Improvement Command Center — Activity (calls, texts, emails, to-dos tied to leads).
 * Concepts mirror a CRM Activity List; Command Center styling only. Sample data via DashboardData.getActivities().
 * The Home "My Activity" card uses the same function, so counts agree.
 */
(function () {
  "use strict";
  const AD = window.ActivityDefs;
  const ui = { status: "open", groups: [], reference: "all" };
  const MAX_ROWS = 200;
  let token = 0;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tip = (text) => `<button type="button" class="helper-tip" title="${esc(text)}" aria-label="${esc(text)}">?</button>`;
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const toDate = (iso) => new Date(iso + "T00:00:00Z");
  const dayDiff = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
  function fmtTime(t) { if (!t) return ""; let h = +t.slice(0, 2); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + t.slice(3) + " " + ap; }
  function fmtDay(iso, today) {
    const d = dayDiff(today, iso);
    if (d === 0) return "Today";
    if (d === 1) return "Tomorrow";
    if (d === -1) return "Yesterday";
    return DOW[toDate(iso).getUTCDay()] + " " + +iso.slice(5, 7) + "/" + +iso.slice(8, 10);
  }
  const STATUS_LABEL = { overdue: "Overdue", today: "Due today", upcoming: "Upcoming", done: "Done" };

  function statusPill(a, today) {
    let extra = "";
    if (a.status === "overdue") { const late = dayDiff(a.dueDate, today); extra = ` · ${late} day${late === 1 ? "" : "s"} late`; }
    return `<span class="act-pill act-${a.status}">${STATUS_LABEL[a.status]}${extra}</span>`;
  }
  function typeChip(type) {
    const t = AD.TYPES[type] || {};
    return `<span class="act-type act-type-${t.group || "todo"}" title="${esc(t.tip || "")}"><span aria-hidden="true">${t.icon || "•"}</span> ${esc(type)}</span>`;
  }
  function resultCell(a) {
    if (!a.completedDate) return `<span class="act-muted">—</span>`;
    if (!a.result) return `<span class="act-muted">Logged</span>`;
    const r = AD.RESULTS[a.result] || {};
    const warn = a.result === "Confirmed" && a.reference === "Confirm Appointment";
    return `<span class="act-result ${warn ? "warn" : ""}" title="${esc(warn ? AD.CONFIRM_TIP : r.tip || "")}">${warn ? "⚠ " : ""}${esc(a.result)}</span>${a.sampleEdited ? ' <span class="pd-tag">Sample edit</span>' : ""}`;
  }

  /* ——— toast + result picker (shared, created once) ——— */
  function toast(msg) {
    let el = document.getElementById("cc-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "cc-toast"; el.className = "cc-toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 3800);
  }

  function openPicker(act, onDone) {
    closePicker();
    const opts = AD.resultOptions(act.type);
    const isConfirm = act.reference === "Confirm Appointment";
    const back = document.createElement("div");
    back.className = "act-picker-backdrop"; back.id = "act-picker-backdrop";
    const box = document.createElement("div");
    box.className = "act-picker"; box.id = "act-picker"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "act-picker-title");
    box.innerHTML = `
      <div class="act-picker-head">
        <div>
          <h3 id="act-picker-title">Mark complete</h3>
          <p>${esc(act.type)} · ${esc(act.reference)} · ${esc(act.leadFirst + " " + act.leadLast)}</p>
        </div>
        <button type="button" class="icon-btn" data-picker-close aria-label="Close">✕</button>
      </div>
      <p class="act-picker-tip ${isConfirm ? "strong" : ""}">${isConfirm ? "⚠ " + esc(AD.CONFIRM_TIP) : esc(AD.SETTER_RESULT_TIP)}</p>
      <div class="act-picker-opts">
        ${opts.map((o) => `<button type="button" class="act-opt" data-result="${esc(o)}" title="${esc((AD.RESULTS[o] || {}).tip || "")}">${esc(o)}${o === "Completed" && isConfirm ? " <small>(counts as confirmed)</small>" : ""}</button>`).join("")}
      </div>
      <p class="act-picker-foot">Sample only — this changes the screen, not MarketSharp. Refresh resets it.</p>`;
    document.body.appendChild(back);
    document.body.appendChild(box);
    const first = box.querySelector(".act-opt");
    if (first) first.focus();
    back.addEventListener("click", closePicker);
    box.querySelector("[data-picker-close]").addEventListener("click", closePicker);
    box.querySelectorAll("[data-result]").forEach((b) => b.addEventListener("click", () => {
      const result = b.getAttribute("data-result");
      window.DashboardData.completeActivity(act.id, result).then(() => {
        closePicker();
        toast(`Marked “${result}” — Sample, not saved to MarketSharp.`);
        if (onDone) onDone();
      });
    }));
    box.addEventListener("keydown", (e) => { if (e.key === "Escape") closePicker(); });
  }
  function closePicker() {
    ["act-picker", "act-picker-backdrop"].forEach((id) => { const el = document.getElementById(id); if (el) el.remove(); });
  }

  /* ——— Activity view ——— */
  async function render(root, ctx) {
    const my = ++token;
    if (!root.querySelector(".act-summary")) root.innerHTML = `<div class="pd-loading card card-pad">Loading activities…</div>`;
    const data = await window.DashboardData.getActivities(ctx.userId, { status: ui.status, groups: ui.groups, reference: ui.reference, office: ctx.office });
    if (my !== token) return;
    const c = data.counts;
    const team = ctx.userId === "ALL";
    const today = data.today;
    const shown = data.items.slice(0, MAX_ROWS);
    const officeLabel = ctx.office === "IL" ? "Illinois" : "Michigan";

    const scope = ctx.isManager ? `
      <label class="act-scope">
        <span>Showing</span>
        <select class="select" id="act-scope" aria-label="Whose activities">
          <option value="ALL" ${team ? "selected" : ""}>All marketers (team)</option>
          ${(ctx.marketers || []).map((m) => `<option value="${esc(m.id)}" ${m.id === ctx.userId ? "selected" : ""}>${esc(m.name)}</option>`).join("")}
        </select>
      </label>` : "";

    const tiles = [
      ["open", "Open", c.open, "Not completed yet."],
      ["overdue", "Overdue", c.overdue, "Open and due before today."],
      ["dueToday", "Due today", c.dueToday, "Open and due today."],
      ["completedToday", "Completed today", c.completedToday, "Finished today. Auto-logged inbound texts/calls aren’t counted."]
    ];
    const chipLabel = (f) => {
      const n = { open: c.open, dueToday: c.dueToday, overdue: c.overdue, completedToday: c.completedToday, completed7: c.completed7, all: c.all }[f.id];
      return `${esc(f.id === "all" && team ? "All" : f.label)} <span class="act-chip-n">${n}</span>`;
    };
    const emptyMsg = ui.status === "open" && !ui.groups.length && ui.reference === "all"
      ? (team ? "No open activities for the team." : ctx.ownView ? "No open activities assigned to you." : "No open activities assigned to this marketer.")
      : (ui.status === "completedToday" && !ui.groups.length && ui.reference === "all") ? "Nothing completed today yet."
      : "No activities match these filters.";

    root.innerHTML = `
      ${ctx.note || ""}
      <div class="act-head">
        <div>
          <h2>${team ? "Team activity" : esc(ctx.userName) + (ctx.ownView ? " — my activity" : "’s activity")} · ${officeLabel}
            ${tip("Activities are calls, texts, emails and to-dos tied to a lead, each with a due date. Finish one by picking a result (like Left Message or Set Appointment) — that result is what the Call Center Report counts.")}</h2>
          <p>${team ? "Every marketer’s activities. Pick a name to narrow it." : "Only activities assigned to " + (ctx.ownView ? "you" : esc(ctx.userName.split(" ")[0])) + "."} Click a lead name for their profile.</p>
        </div>
        ${scope}
      </div>
      <div class="act-summary">
        ${tiles.map(([id, label, n, t]) => `<button type="button" class="act-tile act-tile-${id} ${ui.status === id ? "active" : ""}" data-act-status="${id}" title="${esc(t)}">
          <span class="v">${n}</span><span class="l">${label}</span></button>`).join("")}
      </div>
      <div class="card card-pad act-filters">
        <div class="act-chip-row" role="group" aria-label="Status">
          ${AD.STATUS_FILTERS.map((f) => `<button type="button" class="act-chip" data-act-status="${f.id}" aria-pressed="${ui.status === f.id}" title="${esc(f.tip)}">${chipLabel(f)}</button>`).join("")}
        </div>
        <div class="act-chip-row act-chip-row-2">
          <div class="act-chip-group" role="group" aria-label="Activity type">
            ${AD.GROUPS.map((g) => `<button type="button" class="act-chip act-chip-type" data-act-group="${g.id}" aria-pressed="${ui.groups.indexOf(g.id) !== -1}" title="${esc(g.tip)}">${esc(g.label)}</button>`).join("")}
          </div>
          <label class="act-ref">
            <span class="sr-only">Activity reference</span>
            <select class="select" id="act-ref" aria-label="Activity reference">
              <option value="all">All references</option>
              ${data.references.map((r) => `<option value="${esc(r)}" ${ui.reference === r ? "selected" : ""}>${esc(r)}</option>`).join("")}
            </select>
          </label>
          ${tip("Reference = what the activity is about (Recontact Call, Rehash Call, Second Chance Call…). " + (data.audience === "marketer" ? "Confirmation work (Confirm Appointment, Appointment Reminder) belongs to the confirm team and isn’t shown here. " : "") + AD.referenceTip(ui.reference))}
          <div class="act-tools">
            <span title="Live version: pulls the next unassigned callback that is due today or earlier and assigns it to you. Not available in this sample.">
              <button type="button" class="btn btn-secondary btn-sm" disabled>Get next callback</button>
            </span>
            ${tip("Live version: pulls the next unassigned callback (Call Out due today or earlier) and assigns it to you.")}
            <button type="button" class="btn btn-ghost btn-sm" disabled title="Sample only">Export</button>
          </div>
        </div>
      </div>
      <div class="act-toolbar">
        <span><strong>${data.total}</strong> activit${data.total === 1 ? "y" : "ies"}${data.total > MAX_ROWS ? ` · showing first ${MAX_ROWS}` : ""}</span>
        <span class="pd-source act-src">${esc(data.meta.label)}</span>
      </div>
      ${shown.length ? `
      <div class="table-wrap act-wrap">
        <table class="data act-table" aria-label="Activities">
          <thead><tr>
            <th>Lead</th>
            ${team ? "<th>Assigned to</th>" : ""}
            <th>Activity type</th>
            <th>Reference</th>
            <th>Due</th>
            <th>Status</th>
            <th>Result ${tip("The disposition picked when it was finished. " + AD.CONFIRM_TIP)}</th>
            <th><span class="sr-only">Action</span></th>
          </tr></thead>
          <tbody>
            ${shown.map((a) => `<tr class="no-row-click act-row act-row-${a.status}">
              <td data-label="Lead"><button type="button" class="linkish act-lead" data-act-lead="${esc(a.leadId)}">${esc(a.leadLast)}, ${esc(a.leadFirst)}</button><span class="act-office">${esc(a.office)}</span></td>
              ${team ? `<td data-label="Assigned to">${esc(a.assignedToName)}</td>` : ""}
              <td data-label="Type">${typeChip(a.type)}</td>
              <td data-label="Reference">${esc(a.reference)}</td>
              <td data-label="Due"><span class="act-due">${fmtDay(a.dueDate, today)} ${fmtTime(a.dueTime)}</span>${a.completedDate ? `<span class="act-done-at">done ${fmtDay(a.completedDate, today)} ${fmtTime(a.completedTime)}</span>` : ""}</td>
              <td data-label="Status">${statusPill(a, today)}</td>
              <td data-label="Result">${resultCell(a)}</td>
              <td class="act-action">${a.completedDate ? "" : `<button type="button" class="btn btn-primary btn-sm act-complete" data-act-complete="${esc(a.id)}">✓ Mark complete</button>`}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>` : `<div class="empty-state card card-pad"><strong>${esc(emptyMsg)}</strong>${ui.status === "open" ? "Nice work. Check Completed to see what’s been done." : "Try another filter, or switch office at the top."}</div>`}
      <p class="sales-footnote">Sample activities generated from the same sample leads and appointments as the dashboard. Each is assigned to the marketer who worked the lead. Not live.</p>
    `;

    const rerender = () => render(root, ctx);
    root.querySelectorAll("[data-act-status]").forEach((b) => b.addEventListener("click", () => { ui.status = b.getAttribute("data-act-status"); rerender(); }));
    root.querySelectorAll("[data-act-group]").forEach((b) => b.addEventListener("click", () => {
      const g = b.getAttribute("data-act-group");
      const i = ui.groups.indexOf(g);
      if (i === -1) ui.groups.push(g); else ui.groups.splice(i, 1);
      rerender();
    }));
    const ref = root.querySelector("#act-ref");
    if (ref) ref.addEventListener("change", () => { ui.reference = ref.value; rerender(); });
    const sc = root.querySelector("#act-scope");
    if (sc && ctx.onScope) sc.addEventListener("change", () => ctx.onScope(sc.value));
    root.querySelectorAll("[data-act-lead]").forEach((b) => b.addEventListener("click", () => ctx.onOpenLead && ctx.onOpenLead(b.getAttribute("data-act-lead"))));
    root.querySelectorAll("[data-act-complete]").forEach((b) => b.addEventListener("click", () => {
      const id = b.getAttribute("data-act-complete");
      const act = data.items.find((x) => x.id === id);
      if (act) openPicker(act, rerender);
    }));
  }

  /* ——— Home card (marketer personal Home) ——— */
  function homeCard(data, opts) {
    const c = data.counts;
    const today = data.today;
    const next = data.items.filter((a) => a.status !== "done").slice(0, 5);
    const who = opts && opts.viewer ? "this marketer" : "you";
    return `<article class="card pd-card pd-span-8 act-home">
      <div class="pd-card-head"><h3>My Activity ${tip("Calls, texts, emails and to-dos assigned to " + who + ", with due dates. Same numbers as the Activity page.")}</h3>
        <button type="button" class="btn btn-ghost btn-sm" data-act-seeall="open">See all →</button></div>
      <div class="act-mini">
        ${[["open", "Open", c.open], ["overdue", "Overdue", c.overdue], ["dueToday", "Due today", c.dueToday], ["completedToday", "Done today", c.completedToday]].map(([id, l, n]) =>
          `<button type="button" class="act-mini-tile act-tile-${id}" data-act-seeall="${id}"><span class="v">${n}</span><span class="l">${l}</span></button>`).join("")}
      </div>
      ${next.length ? `<div class="act-next-title">Next up</div><ul class="act-next">
        ${next.map((a) => `<li class="act-next-item">
          ${statusPill(a, today)}
          <span class="act-next-main"><button type="button" class="linkish act-lead" data-act-lead="${esc(a.leadId)}">${esc(a.leadFirst)} ${esc(a.leadLast)}</button>
          <span class="act-next-meta">${esc(a.type)} · ${esc(a.reference)}</span></span>
          <span class="act-next-due">${fmtDay(a.dueDate, today)} ${fmtTime(a.dueTime)}</span>
        </li>`).join("")}
      </ul>` : `<div class="pd-empty"><strong>No open activities assigned to ${who === "you" ? "you" : "them"}.</strong><span>Nice work.</span></div>`}
      <div class="pd-source">${esc(data.meta.label)}</div>
    </article>`;
  }

  function bindHomeCard(root, ctx) {
    root.querySelectorAll(".act-home [data-act-seeall]").forEach((b) => b.addEventListener("click", () => {
      ui.status = b.getAttribute("data-act-seeall"); ui.groups = []; ui.reference = "all";
      if (ctx.onNavigate) ctx.onNavigate("activity");
    }));
    root.querySelectorAll(".act-home [data-act-lead]").forEach((b) => b.addEventListener("click", () => ctx.onOpenLead && ctx.onOpenLead(b.getAttribute("data-act-lead"))));
  }

  window.ActivityView = { render, homeCard, bindHomeCard, toast, closePicker };
})();
