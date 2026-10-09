/* People log — "who did what" views (Command Center).
 *   PeopleLog.renderTexts(root, ctx)   Texts sent log (v12): every text we sent, Sent by + system + opened.
 *   PeopleLog.renderActions(root, ctx) What each person did (v13): cross-system per-user action log.
 * Data: DashboardData.getTextLog / getActionLog (sample now; adapters carry sentByUserId, openedAt,
 * seenByUserId, seenAt, sourceSystem so live rows drop in). */
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tip = (text) => `<button type="button" class="helper-tip" title="${esc(text)}" aria-label="${esc(text)}">?</button>`;
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const HATCH_LABEL = "Hatch (system/AI, via Tom’s login)";
  const HATCH_TIP = "Hatch writes its texts into MarketSharp under Tom’s employee login, so these are Hatch’s automatic/AI texts (or someone working inside Hatch) — not Tom personally, and not credited to anyone. The real sender can’t be known until Hatch gets its own login and each marketer has their own Hatch login (open question).";
  const OPEN_TBD_TIP = "Sample open times. Hatch’s public API doesn’t confirm an “opened” or “seen” time yet, and MarketSharp Text Out rows have no opened field — so open times are TBD until the Hatch API is confirmed (asking Hatch).";
  const openTbd = () => `<span class="pl-tbd" title="${esc(OPEN_TBD_TIP)}">Hatch: open times TBD until API confirmed ${tip(OPEN_TBD_TIP)}</span>`;
  const SYS_TIP = {
    "Michigan Access": "Michigan Access — the source of truth for leads, sets and confirms.",
    "Illinois Access": "Illinois Access — the source of truth for leads, sets and confirms.",
    Access: "Access — the source of truth for leads, sets and confirms.",
    MarketSharp: "MarketSharp — logged as an activity or record change in MarketSharp.",
    Hatch: "Hatch — the texting tool. Today its texts land in MarketSharp under Tom’s login (flagged, not credited to Tom)."
  };
  function sysBadge(sys) {
    const cls = /Access/.test(sys) ? "acc" : sys === "Hatch" ? "hatch" : "ms";
    return `<span class="sysb ${cls}" title="${esc(SYS_TIP[sys] || sys)}">${esc(sys)}</span>`;
  }
  function t12(hm) { if (!hm) return ""; let h = +hm.slice(0, 2); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + hm.slice(3, 5) + " " + ap; }
  function dayLabel(iso, today) {
    if (iso === today) return "Today";
    const d = new Date(iso + "T12:00:00Z");
    const y = new Date(today + "T12:00:00Z"); y.setUTCDate(y.getUTCDate() - 1);
    if (d.toISOString().slice(0, 10) === y.toISOString().slice(0, 10)) return "Yesterday";
    return DAYS[d.getUTCDay()] + " " + (d.getUTCMonth() + 1) + "/" + d.getUTCDate();
  }
  const whenFull = (date, time, today) => (date === today ? "" : dayLabel(date, today) + " ") + t12(time);
  function sel(id, label, opts, val, tipText) {
    return `<label class="pl-f"><span>${esc(label)}${tipText ? " " + tip(tipText) : ""}</span><select id="${id}">${opts.map((o) => `<option value="${esc(o.value)}" ${o.value === val ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select></label>`;
  }
  function openedCell(x, today) {
    if (x.opened) return `<span class="pl-open ok">Opened by ${esc(x.customer)} at ${esc(whenFull(x.openedDate || x.date, x.openedAt, today))}</span>`;
    return `<span class="pl-open no">Not opened yet</span>`;
  }
  function senderCell(x) {
    if (x.auto) return `<strong class="pl-who">Auto text</strong> <span class="pl-sub">${esc(HATCH_LABEL)} ${tip("Sent automatically seconds after the lead came in. " + HATCH_TIP)}</span>`;
    if (x.isHatchProxy) return `<strong class="pl-who">${esc(HATCH_LABEL)}</strong> ${tip(HATCH_TIP)}`;
    return `<strong class="pl-who">${esc(x.sentByLabel)}</strong>${x.sampleSend ? ` <span class="stl3-chip muted">Sample — not sent</span>` : ""}`;
  }

  /* ——— Texts sent log ——— */
  const tUi = { sentBy: "all", system: "all", range: "today" };
  let tToken = 0;
  async function renderTexts(root, ctx) {
    const my = ++tToken;
    const log = await window.DashboardData.getTextLog(ctx.scopeId, { sentBy: tUi.sentBy, system: tUi.system, range: tUi.range, office: ctx.office });
    if (my !== tToken) return;
    const today = log.now.date;
    const c = log.counts;
    const pct = c.sent ? Math.round((c.opened / c.sent) * 100) : 0;
    const own = !ctx.isManager && ctx.scopeId !== "ALL";
    const senderOpts = [{ value: "all", label: own ? "All texts on my leads" : "Everyone" }]
      .concat(log.senders.map((s) => ({ value: s.id, label: own && s.id === ctx.scopeId ? "Me (" + s.name + ")" : s.name })))
      .concat(log.hasHatchProxy ? [{ value: "hatch", label: "Hatch (system/AI, via Tom’s login)" }] : []);
    const rows = log.items.map((x) => `<tr class="${x.opened ? "" : "unopened"}">
        <td class="pl-time" data-l="Time">${esc(whenFull(x.date, x.time, today))}</td>
        <td data-l="Sent by">${senderCell(x)}</td>
        <td data-l="Customer"><button type="button" class="pl-link" data-pl-thread="${esc(x.threadId)}" title="Open this conversation in Speed to Lead">${esc(x.customer)}</button>${ctx.isManager || ctx.scopeId === "ALL" ? `<span class="pl-sub">lead of ${esc(x.ownerName)}</span>` : ""}</td>
        <td data-l="System">${sysBadge(x.system)}</td>
        <td data-l="Opened">${openedCell(x, today)}</td>
        <td class="pl-text" data-l="Text">${esc(x.text)}</td>
      </tr>`).join("");
    root.innerHTML = `
      <section class="pl" aria-labelledby="pl-texts-h">
        <div class="pl-head">
          ${ctx.onBack ? `<button type="button" class="stl3-link" id="pl-back">${esc(ctx.backLabel || "← Back")}</button>` : ""}
          <h3 id="pl-texts-h">Texts sent ${tip("Every text sent to a lead — who sent it, which system it went through, and whether the customer opened it. Same texts as Speed to Lead, so the numbers match.")}</h3>
        </div>
        <div class="pl-stats" role="list">
          <span class="stl3-stat" role="listitem"><b>${c.sent}</b> sent</span>
          <span class="stl3-stat" role="listitem"><b>${c.opened}</b> opened by the customer${c.sent ? ` (${pct}%)` : ""}</span>
          <span class="stl3-stat" role="listitem">${sysBadge("MarketSharp")} <b>${c.bySystem.MarketSharp || 0}</b></span>
          <span class="stl3-stat" role="listitem">${sysBadge("Hatch")} <b>${c.bySystem.Hatch || 0}</b> <span class="pl-sub">via Tom’s login</span> ${tip(HATCH_TIP)}</span>
        </div>
        <p class="pl-note">${openTbd()}</p>
        <div class="pl-filters">
          ${sel("pl-sentby", "Sent by", senderOpts, tUi.sentBy)}
          ${sel("pl-system", "System", [{ value: "all", label: "All systems" }, { value: "MarketSharp", label: "MarketSharp" }, { value: "Hatch", label: "Hatch" }], tUi.system, "GoHighLevel isn’t in the sample. If it gets connected, it shows up here as another system.")}
          ${sel("pl-range", "Date", log.ranges.map((r) => ({ value: r.key, label: r.label })), tUi.range, "Sample texts cover the last 3 phone days (Sunday is off).")}
        </div>
        ${log.items.length ? `<div class="pl-table-wrap"><table class="pl-table">
          <thead><tr><th>Time</th><th>Sent by</th><th>Customer</th><th>System</th><th>Opened ${tip("Opened = the customer opened our text. " + OPEN_TBD_TIP)}</th><th>Text</th></tr></thead>
          <tbody>${rows}</tbody></table></div>` : `<div class="stl3-empty"><strong>No texts match</strong>Try another date or “Everyone”.</div>`}
        <p class="stl3-foot">${esc(log.meta.label)} · Activity-list “Text Out” rows aren’t added again — they’re the same texts. No GoHighLevel texts in the sample.</p>
      </section>`;
    const on = (id, key) => { const el = root.querySelector("#" + id); if (el) el.addEventListener("change", () => { tUi[key] = el.value; renderTexts(root, ctx); }); };
    on("pl-sentby", "sentBy"); on("pl-system", "system"); on("pl-range", "range");
    const back = root.querySelector("#pl-back"); if (back) back.addEventListener("click", ctx.onBack);
    root.querySelectorAll("[data-pl-thread]").forEach((b) => b.addEventListener("click", () => ctx.onOpenThread && ctx.onOpenThread(b.getAttribute("data-pl-thread"))));
  }
  function resetTexts() { tUi.sentBy = "all"; tUi.system = "all"; tUi.range = "today"; }

  /* ——— What each person did ——— */
  const TYPE_CHIP = { lead: "Lead", set: "Set", callback: "Callback", confirm: "Confirm", call: "Call", email: "Email", text: "Text sent", seen: "Reply opened", note: "Note", status: "Status" };
  const DAY_TIP = "Access doesn’t store a confirm time (no timestamp column for WHOCONFIRM). When the confirmer leaves a stamp like “SML [4/28/25 8:14a]” in the comments we use it; otherwise only the day is known.";
  const aUi = { userId: "all", system: "all", type: "all", range: "today", limit: 150, presetFor: null };
  let aToken = 0;
  async function renderActions(root, ctx) {
    const my = ++aToken;
    if (ctx.presetUserId !== aUi.presetFor) { aUi.presetFor = ctx.presetUserId || null; aUi.userId = ctx.presetUserId || "all"; }
    const log = await window.DashboardData.getActionLog(ctx.scopeId, { isManager: ctx.isManager, userId: aUi.userId, system: aUi.system, type: aUi.type, range: aUi.range, office: ctx.office });
    if (my !== aToken) return;
    const today = log.today;
    const multiDay = log.from !== log.to;
    const items = log.items.slice(0, aUi.limit);
    let lastDay = "";
    const rows = items.map((e) => {
      const sep = multiDay && e.date !== lastDay ? `<tr class="pl-day"><td colspan="5">${esc(dayLabel(e.date, today))}</td></tr>` : "";
      lastDay = e.date;
      const time = e.time ? (multiDay ? t12(e.time) : whenFull(e.date, e.time, today)) : `<span class="pl-sub">Time not stored ${tip(DAY_TIP)}</span>`;
      const who = e.isHatchProxy ? `<strong class="pl-who">${esc(HATCH_LABEL)}</strong> ${tip(HATCH_TIP)}` : `<strong class="pl-who">${esc(e.userName)}</strong>`;
      const cust = e.customer ? `<button type="button" class="pl-link" ${e.threadId ? `data-pl-thread="${esc(e.threadId)}"` : `data-pl-lead="${esc(e.leadId)}"`} title="${e.threadId ? "Open the text conversation" : "Open the customer profile"}">${esc(e.customer)}</button>` : "—";
      return sep + `<tr>
        <td class="pl-time" data-l="Time">${time}</td>
        <td data-l="Person">${who}</td>
        <td data-l="System">${sysBadge(e.system)}</td>
        <td data-l="What"><span class="pl-type t-${esc(e.actionType)}">${esc(TYPE_CHIP[e.actionType] || e.actionType)}</span> ${esc(e.desc)}</td>
        <td data-l="Customer">${cust}${ctx.isManager && e.ownerId && e.ownerId !== e.userId ? `<span class="pl-sub">lead of ${esc(e.ownerName)}</span>` : ""}</td>
      </tr>`;
    }).join("");
    const sysCount = (k) => log.counts.bySystem[k] || 0;
    const accName = ctx.office === "IL" ? "Illinois Access" : "Michigan Access";
    const people = ctx.isManager && log.people.length ? `<div class="pl-table-wrap"><table class="pl-table pl-people">
        <thead><tr><th>Person</th><th>Total</th><th>Leads</th><th>Sets</th><th>Confirms</th><th>Texts</th><th>Calls</th><th>Replies opened</th><th>Notes</th><th>Status changes</th><th>By system</th></tr></thead>
        <tbody>${log.people.map((r) => `<tr class="${aUi.userId === r.id ? "is-sel" : ""}">
          <td data-l="Person"><button type="button" class="pl-link" data-pl-user="${esc(r.id)}" title="Show only ${esc(r.name)}">${esc(r.name)}</button>${r.id === "hatch" ? " " + tip(HATCH_TIP) : ""}<span class="pl-sub">${esc(r.role === "Setter" ? "Marketer" : r.role)}</span></td>
          <td data-l="Total"><b>${r.total}</b></td><td data-l="Leads">${r.lead || 0}</td><td data-l="Sets">${r.set || 0}</td><td data-l="Confirms">${r.confirm || 0}</td>
          <td data-l="Texts">${r.text || 0}</td><td data-l="Calls">${r.call || 0}</td><td data-l="Replies opened">${r.seen || 0}</td><td data-l="Notes">${r.note || 0}</td><td data-l="Status">${r.status || 0}</td>
          <td data-l="By system" class="pl-sys">${Object.keys(r.bySys).sort().map((k) => `${sysBadge(k === "Access" ? accName : k)} ${r.bySys[k]}`).join(" ")}</td></tr>`).join("")}</tbody></table></div>` : "";
    const userOpts = [{ value: "all", label: "Everyone" }].concat(log.users.map((x) => ({ value: x.id, label: x.name + " — " + x.role })))
      .concat(log.hasHatch ? [{ value: "hatch", label: "Hatch (system/AI, via Tom’s login)" }] : []);
    root.innerHTML = `
      <section class="pl" aria-labelledby="pl-act-h">
        <div class="pl-head"><h3 id="pl-act-h">${ctx.isManager ? "What each person did" : "What I did"} ${tip(ctx.isManager
          ? "Every action by every person across Access, MarketSharp and Hatch — leads taken, sets, confirms, callbacks, texts, calls, notes and status changes. Confirmers’ and data processors’ work is included here. Pick a person to see only theirs."
          : "Everything you did across Access, MarketSharp and Hatch. Confirm-team work isn’t shown here.")}</h3></div>
        ${people}
        <div class="pl-filters">
          ${ctx.isManager ? sel("pl-a-user", "Person", userOpts, aUi.userId) : ""}
          ${sel("pl-a-sys", "System", [{ value: "all", label: "All systems" }, { value: "Access", label: accName }, { value: "MarketSharp", label: "MarketSharp" }, { value: "Hatch", label: "Hatch" }], aUi.system)}
          ${sel("pl-a-type", "Action", [{ value: "all", label: "All actions" }].concat(log.types.filter((t) => ctx.isManager || t.id !== "confirm").map((t) => ({ value: t.id, label: t.label }))), aUi.type)}
          ${sel("pl-a-range", "Date", log.ranges.map((r) => ({ value: r.key, label: r.label })), aUi.range, "Sample texts only go back 3 phone days; older texts come from MarketSharp Text Out activities.")}
        </div>
        <div class="pl-stats" role="list">
          <span class="stl3-stat" role="listitem"><b>${log.total}</b> actions</span>
          <span class="stl3-stat" role="listitem">${sysBadge(accName)} <b>${sysCount("Access")}</b></span>
          <span class="stl3-stat" role="listitem">${sysBadge("MarketSharp")} <b>${sysCount("MarketSharp")}</b></span>
          <span class="stl3-stat" role="listitem">${sysBadge("Hatch")} <b>${sysCount("Hatch")}</b></span>
        </div>
        ${!ctx.isManager && log.hatchOnMyLeads ? `<p class="pl-note pl-hint">${log.hatchOnMyLeads} text${log.hatchOnMyLeads === 1 ? "" : "s"} on your leads went out through ${esc(HATCH_LABEL)} (${log.hatchAutoOnMyLeads} auto, ${log.hatchOnMyLeads - log.hatchAutoOnMyLeads} by hand) — not counted as yours ${tip(HATCH_TIP)} <button type="button" class="pl-link" id="pl-a-texts">Texts sent log →</button></p>` : ""}
        <p class="pl-note pl-sub">The same action often shows twice — once in ${esc(accName)} and once in MarketSharp. That’s on purpose: you can see it was recorded in both (Access wins if they disagree).</p>
        ${items.length ? `<div class="pl-table-wrap"><table class="pl-table pl-actions">
          <thead><tr><th>Time</th><th>Person</th><th>System</th><th>What happened</th><th>Customer</th></tr></thead>
          <tbody>${rows}</tbody></table></div>
          ${log.items.length > items.length ? `<button type="button" class="stl3-more" id="pl-a-more">Show ${Math.min(150, log.items.length - items.length)} more (${log.items.length - items.length} left)</button>` : ""}`
          : `<div class="stl3-empty"><strong>Nothing here</strong>${aUi.range === "today" ? "No actions yet today for this filter — try “Previous phone day”." : "Try another filter."}</div>`}
        <p class="stl3-foot">${esc(log.meta.label)} · Read-only. Hatch open/seen times TBD until the API is confirmed.</p>
      </section>`;
    const on = (id, key) => { const el = root.querySelector("#" + id); if (el) el.addEventListener("change", () => { aUi[key] = el.value; aUi.limit = 150; renderActions(root, ctx); }); };
    on("pl-a-user", "userId"); on("pl-a-sys", "system"); on("pl-a-type", "type"); on("pl-a-range", "range");
    root.querySelectorAll("[data-pl-user]").forEach((b) => b.addEventListener("click", () => { const id = b.getAttribute("data-pl-user"); aUi.userId = aUi.userId === id ? "all" : id; aUi.limit = 150; renderActions(root, ctx); }));
    const more = root.querySelector("#pl-a-more"); if (more) more.addEventListener("click", () => { aUi.limit += 150; renderActions(root, ctx); });
    root.querySelectorAll("[data-pl-thread]").forEach((b) => b.addEventListener("click", () => ctx.onOpenThread && ctx.onOpenThread(b.getAttribute("data-pl-thread"))));
    root.querySelectorAll("[data-pl-lead]").forEach((b) => b.addEventListener("click", () => ctx.onOpenLead && ctx.onOpenLead(b.getAttribute("data-pl-lead"))));
    const tl = root.querySelector("#pl-a-texts"); if (tl && ctx.onOpenTexts) tl.addEventListener("click", ctx.onOpenTexts);
  }
  function resetActions() { aUi.userId = "all"; aUi.system = "all"; aUi.type = "all"; aUi.range = "today"; aUi.limit = 150; aUi.presetFor = null; }

  window.PeopleLog = { renderTexts, resetTexts, renderActions, resetActions, sysBadge, HATCH_LABEL, HATCH_TIP, OPEN_TBD_TIP, openTbd, esc, tip, t12, dayLabel, whenFull, sel };
})();
