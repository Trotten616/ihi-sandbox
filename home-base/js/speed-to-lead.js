/* Speed to Lead — inbox-style board (Command Center).
 * Layout follows the familiar "salesboard + contact card" pattern Thomas asked for (2026-10-05):
 *   Board: two columns of conversation cards — Needs a reply (oldest wait first) | Done.
 *   Open conversation: left list · center thread + reply box · right lead info.
 * Original Command Center code, names and styling (no third-party names, logos, icons, copy or bot names).
 * Data: DashboardData.getTextThreads() — sample now, MarketSharp Text Out / Text In activities later.
 * Send / Mark done are sample-only (in memory, toast). */
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tip = (text) => `<button type="button" class="helper-tip" title="${esc(text)}" aria-label="${esc(text)}">?</button>`;
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const ui = { search: "", showAllDone: false, quick: false, infoMore: false, draft: {} };
  let token = 0;
  let last = null; /* { data, ctx } from the latest render */

  function t12(hm) { if (!hm) return ""; let h = +hm.slice(0, 2); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + hm.slice(3, 5) + " " + ap; }
  function dayLabel(iso, today) {
    if (iso === today) return "Today";
    const d = new Date(iso + "T12:00:00Z");
    const y = new Date(today + "T12:00:00Z"); y.setUTCDate(y.getUTCDate() - 1);
    if (d.toISOString().slice(0, 10) === y.toISOString().slice(0, 10)) return "Yesterday";
    return DAYS[d.getUTCDay()] + " " + (d.getUTCMonth() + 1) + "/" + d.getUTCDate();
  }
  function when(date, time, today) { return date === today ? t12(time) : dayLabel(date, today); }
  function waitText(min) {
    if (min == null) return "—";
    if (min < 60) return Math.max(1, min) + " min";
    if (min < 1440) { const h = Math.floor(min / 60), m = min % 60; return h + " hr" + (m ? " " + m + " min" : ""); }
    const d = Math.floor(min / 1440); return d + (d === 1 ? " day" : " days");
  }
  const waitClass = (min) => (min >= 120 ? "late" : min >= 30 ? "warm" : "");
  const initials = (name) => String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const RESULT_CLASS = { "Appt set": "good", "Replied": "info", "Waiting on lead": "muted", "No reply needed": "muted", "Not interested": "bad", "Wrong number": "bad", "Opted out": "bad" };
  const RESULT_TIP = {
    "Appt set": "They booked an appointment.",
    "Replied": "You answered their last text — the ball is in their court.",
    "Waiting on lead": "Only the auto text went out; the lead hasn’t texted back.",
    "No reply needed": "Marked done without a reply (e.g. “ok thanks”).",
    "Not interested": "They said no — you closed it politely.",
    "Wrong number": "The number doesn’t belong to the lead.",
    "Opted out": "They texted STOP — no more texts can go to this number."
  };
  function lastPreview(t) {
    const m = t.last; if (!m) return "";
    const who = m.dir === "in" ? "" : m.auto ? "Auto text: " : m.isHatchProxy ? "Hatch: " : (m.sentByName ? m.sentByName.split(" ")[0] + ": " : "");
    return who + m.text;
  }
  function matches(t) {
    if (!ui.search) return true;
    const q = ui.search.toLowerCase();
    return (t.leadName + " " + (t.leadPhone || "")).toLowerCase().indexOf(q) !== -1;
  }

  /* ——— Board ——— */
  function card(t, ctx, today) {
    const needs = t.status === "needsReply";
    const team = ctx.scopeId === "ALL";
    const cls = ["stl3-card", needs && !t.seen ? "unread" : "", needs ? waitClass(t.waitMin) : ""].join(" ");
    const right = needs ? `<span class="stl3-wait ${waitClass(t.waitMin)}" title="Waiting since ${esc(when(t.waitingSince.date, t.waitingSince.time, today))}">${esc(waitText(t.waitMin))}</span>`
      : `<span class="stl3-when">${esc(when(t.last.date, t.last.time, today))}</span>`;
    const chip = needs ? (t.seen ? `<span class="stl3-chip muted" title="Opened but not answered yet">Seen</span>` : `<span class="stl3-chip new" title="Nobody has opened their text yet">New</span>`)
      : `<span class="stl3-chip ${RESULT_CLASS[t.outcome] || "muted"}" title="${esc(RESULT_TIP[t.outcome] || "")}">${esc(t.outcome)}</span>`;
    const extra = ctx.details ? `<div class="stl3-extra">${esc(t.source || "—")} · ${esc(t.product || "—")} · came in ${esc(when(t.cameIn.date, t.cameIn.time, today))}${t.firstTextSec != null ? " · first text " + t.firstTextSec + " s" : ""}</div>` : "";
    return `<button type="button" class="${cls}" data-stl-open="${esc(t.id)}">
      <span class="stl3-card-top"><span class="stl3-name">${esc(t.leadName)}</span>${right}</span>
      <span class="stl3-preview">${esc(lastPreview(t))}</span>
      <span class="stl3-card-bot">${chip}${team || ctx.legacy ? `<span class="stl3-owner" title="Assigned to ${esc(t.ownerName)}"><span class="stl3-av">${esc(initials(t.ownerName))}</span>${esc(t.ownerName)}</span>` : ""}</span>
      ${extra}
    </button>`;
  }

  function activityLog(data, today) {
    const ev = [];
    data.needsReply.concat(data.done).forEach((t) => (t.messages || []).forEach((m) => {
      const at = m.date + " " + m.time;
      let line;
      if (m.dir === "in") line = `<strong>${esc(t.leadName)}</strong> texted back${m.opened ? " · opened" + (m.openedAt ? " " + esc(when(m.openedDate || m.date, m.openedAt, today)) : "") : " · not opened yet"}`;
      else if (m.auto) line = `Auto text to <strong>${esc(t.leadName)}</strong>${m.opened ? " · they opened it " + esc(t12(m.openedAt)) : ""} <span class="stl3-faint">(logged under ${esc(t.loggedAs || "the texting login")})</span>`;
      else line = `<strong>${esc(m.sentByName)}</strong> ${m.sourceSystem ? sys(m.sourceSystem) + " " : ""}texted ${esc(t.leadName)}${m.opened ? " · opened " + esc(t12(m.openedAt)) : " · not opened yet"}${m.sampleSend ? " · sample" : ""}`;
      ev.push({ at, html: `<li><span class="stl3-faint">${esc(when(m.date, m.time, today))}</span> ${line}</li>` });
    }));
    ev.sort((a, b) => b.at.localeCompare(a.at));
    return `<section class="card stl3-log">
      <h3>Text activity log ${tip("Every text in this view, newest first — who sent it and whether it was opened. Comes from MarketSharp Text Out / Text In activities (sample).")}</h3>
      <ul>${ev.slice(0, 40).map((e) => e.html).join("") || "<li>No texts yet.</li>"}</ul>
    </section>`;
  }

  function boardHtml(data, ctx) {
    const today = data.now.date;
    const c = data.counts;
    const needs = data.needsReply.filter(matches);
    const doneAll = data.done.filter(matches);
    const done = ui.showAllDone || ui.search ? doneAll : doneAll.slice(0, 20);
    const scope = ctx.isManager ? `<label class="stl3-scope">Showing
        <select id="stl3-scope">
          <option value="ALL" ${ctx.scopeId === "ALL" ? "selected" : ""}>All marketers (team)</option>
          ${ctx.marketers.map((m) => `<option value="${esc(m.id)}" ${ctx.scopeId === m.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}
        </select></label>` : "";
    return `
      ${ctx.note || ""}
      <div class="stl3-bar">
        <div class="stl3-stats" role="list">
          <span class="stl3-stat" role="listitem"><b>${c.needsReply}</b> need a reply</span>
          <span class="stl3-stat ${c.longestWaitMin != null ? waitClass(c.longestWaitMin) : ""}" role="listitem"><b>${esc(waitText(c.longestWaitMin))}</b> longest wait</span>
          <span class="stl3-stat" role="listitem"><b>${c.done}</b> done</span>
          <span class="stl3-stat" role="listitem"><b>${c.avgReplyMinToday != null ? esc(waitText(c.avgReplyMinToday)) : "—"}</b> avg reply today ${tip("Average time from a lead’s text to a person’s reply, for texts that came in today. Auto texts don’t count.")}</span>
        </div>
        <div class="stl3-tools">
          ${scope}
          <input type="search" id="stl3-search" class="stl3-search" placeholder="Search name or phone" value="${esc(ui.search)}" aria-label="Search conversations" />
          <button type="button" class="stl3-toggle" id="stl3-textlog" title="Every text sent — who sent it, which system, and whether the customer opened it">Texts sent log</button>
          <button type="button" class="stl3-toggle" id="stl3-details" aria-pressed="${!!ctx.details}" title="Show lead source, product, when the lead came in, first-text speed, and the text activity log">More details</button>
        </div>
      </div>
      <div class="stl3-board">
        <section class="stl3-col" aria-labelledby="stl3-needs-h">
          <header class="stl3-col-head"><span class="stl3-dot needs" aria-hidden="true"></span><h3 id="stl3-needs-h">Needs a reply</h3><span class="stl3-n">${needs.length}</span>
            ${tip("The lead texted last and nobody has answered. Oldest wait at the top. Blue edge = nobody has opened it yet.")}</header>
          <div class="stl3-cards">${needs.map((t) => card(t, ctx, today)).join("") || `<div class="stl3-empty"><strong>All caught up</strong>No leads are waiting on a reply.</div>`}</div>
        </section>
        <section class="stl3-col" aria-labelledby="stl3-done-h">
          <header class="stl3-col-head"><span class="stl3-dot done" aria-hidden="true"></span><h3 id="stl3-done-h">Done</h3><span class="stl3-n">${doneAll.length}</span>
            ${tip("Answered, booked, closed, or only the auto text so far — last 3 phone days, newest first.")}</header>
          <div class="stl3-cards">${done.map((t) => card(t, ctx, today)).join("") || `<div class="stl3-empty"><strong>Nothing here yet</strong></div>`}
            ${doneAll.length > done.length ? `<button type="button" class="stl3-more" id="stl3-showall">Show all ${doneAll.length}</button>` : ""}</div>
        </section>
      </div>
      ${ctx.details ? activityLog(data, today) : ""}
      <p class="stl3-foot">${esc(data.meta.label)} · Sent by comes from MarketSharp Text Out activities (Hatch texts under Tom’s login are flagged, not credited to Tom). Hatch: open times TBD until API confirmed. Nothing on this page sends a real text.</p>`;
  }

  /* ——— Open conversation ——— */
  /* Each bubble: header = WHO · SYSTEM · TIME (prominent), then the text, then the open status.
   * Out: "Opened by <customer> at <time>" is the main status (Thomas: “who opened” = the customer opening our text).
   * In:  "Seen by <staff> at <time>" is a secondary detail (which staff user first viewed the reply). */
  const sys = (name) => (window.PeopleLog ? window.PeopleLog.sysBadge(name) : `<span class="sysb">${esc(name)}</span>`);
  const PL = () => window.PeopleLog || {};
  const HATCH_LABEL = "Hatch (system/AI, via Tom’s login)";
  const hatchTip = () => PL().HATCH_TIP || "Logged in MarketSharp under Tom’s login by Hatch — not Tom personally.";
  const tbd = () => tip(PL().OPEN_TBD_TIP || "Hatch: open times TBD until API confirmed.");
  function bubble(m, t, today) {
    const at = (d, hm) => (d && d !== m.date ? dayLabel(d, today) + " " : "") + t12(hm);
    if (m.dir === "in") {
      const seenName = m.seenByUserId && window.DashboardData.shortName ? window.DashboardData.shortName(m.seenByUserId) : ((t.ownerName || "").split(" ")[0] || "team");
      const seen = m.opened ? `Seen by ${esc(seenName)} at ${esc(at(m.seenDate || m.openedDate, m.seenAt || m.openedAt))}` : "Not seen by staff yet";
      return `<div class="stl3-msg in">
        <div class="stl3-from"><strong>${esc(t.leadName)}</strong>${m.sourceSystem ? " " + sys(m.sourceSystem) : ""}<span class="stl3-faint">${esc(t12(m.time))}</span></div>
        <div class="stl3-bub">${esc(m.text)}</div>
        <div class="stl3-meta"><span class="${m.opened ? "stl3-seen" : "stl3-alert"}" title="Which staff user first opened this reply (secondary detail)">${seen}</span></div></div>`;
    }
    const system = m.sourceSystem || (m.auto ? "Hatch" : "MarketSharp");
    const name = m.auto ? `Auto text <span class="stl3-faint">· ${esc(HATCH_LABEL)}</span>` : m.isHatchProxy ? esc(HATCH_LABEL) : esc(m.sentByName);
    const why = m.auto ? tip("Sent automatically a few seconds after the lead came in. " + hatchTip()) : m.isHatchProxy ? tip(hatchTip()) : "";
    const opened = (m.opened ? `<span class="stl3-open ok">Opened by ${esc(t.leadName)} at ${esc(at(m.openedDate, m.openedAt))}</span>`
      : `<span class="stl3-open no">Not opened yet</span>`) + tbd();
    return `<div class="stl3-msg out ${m.auto ? "auto" : ""} ${m.sampleSend ? "sample" : ""}">
      <div class="stl3-from"><strong>${name}</strong>${why} ${sys(system)}<span class="stl3-faint">${esc(t12(m.time))}</span></div>
      <div class="stl3-bub">${esc(m.text)}</div>
      <div class="stl3-meta">${opened}${m.sampleSend ? ` · <span class="stl3-chip muted">Sample — not sent</span>` : ""}</div></div>`;
  }

  function listItem(t, active, today) {
    const needs = t.status === "needsReply";
    return `<button type="button" class="stl3-li ${active ? "active" : ""} ${needs && !t.seen ? "unread" : ""}" data-stl-open="${esc(t.id)}" ${active ? 'aria-current="true"' : ""}>
      <span class="stl3-li-top"><span class="stl3-name">${esc(t.leadName)}</span>${needs ? `<span class="stl3-wait ${waitClass(t.waitMin)}">${esc(waitText(t.waitMin))}</span>` : `<span class="stl3-when">${esc(when(t.last.date, t.last.time, today))}</span>`}</span>
      <span class="stl3-preview">${esc(lastPreview(t))}</span></button>`;
  }

  function convoHtml(data, ctx, t) {
    const today = data.now.date;
    const needs = data.needsReply.filter(matches);
    const done = data.done.filter(matches).slice(0, 40);
    let lastDay = "";
    const msgs = t.messages.map((m) => {
      const sep = m.date !== lastDay ? `<div class="stl3-day"><span>${esc(dayLabel(m.date, today))}</span></div>` : "";
      lastDay = m.date;
      return sep + bubble(m, t, today);
    }).join("");
    const optedOut = t.messages.some((m) => m.optOut);
    const status = t.status === "needsReply"
      ? `<span class="stl3-chip ${t.seen ? "muted" : "new"}">Needs a reply</span> <span class="stl3-wait ${waitClass(t.waitMin)}">waiting ${esc(waitText(t.waitMin))}</span>`
      : `<span class="stl3-chip ${RESULT_CLASS[t.outcome] || "muted"}" title="${esc(RESULT_TIP[t.outcome] || "")}">Done · ${esc(t.outcome)}</span>`;
    const quick = [
      `Thanks ${t.leadFirst}! I have tomorrow at 4:00 or 6:00 open — which works better?`,
      `Hi ${t.leadFirst}, this is ${(ctx.user && ctx.user.name || "").split(" ")[0] || "the office"} with Infinity Home Improvement. Is evening or Saturday better for the free estimate?`,
      `Great — you're all set. You'll get a reminder the day before. Thanks!`
    ];
    const autoMsg = t.messages.find((m) => m.auto);
    return `
      <div class="stl3-convo">
        <aside class="stl3-list" aria-label="Conversations">
          <div class="stl3-list-head"><button type="button" class="stl3-link" data-stl-board>← Board</button>
            <span class="stl3-faint">${data.counts.needsReply} need a reply</span></div>
          <div class="stl3-list-group">Needs a reply <span class="stl3-n">${needs.length}</span></div>
          ${needs.map((x) => listItem(x, x.id === t.id, today)).join("") || `<div class="stl3-li-empty">All caught up</div>`}
          <div class="stl3-list-group">Done <span class="stl3-n">${data.done.length}</span></div>
          ${done.map((x) => listItem(x, x.id === t.id, today)).join("")}
        </aside>
        <section class="stl3-thread" aria-labelledby="stl3-thread-h">
          <header class="stl3-thread-head">
            <div class="stl3-who"><span class="stl3-av lg">${esc(initials(t.leadName))}</span>
              <div><h3 id="stl3-thread-h">${esc(t.leadName)}</h3><div class="stl3-sub">${status}</div></div></div>
            <div class="stl3-actions">
              ${t.status === "needsReply" ? `<button type="button" class="stl3-btn ghost" id="stl3-markdone" title="Close it without replying (e.g. they said “ok thanks”)">Mark done</button>` : ""}
              <button type="button" class="stl3-btn ${t.status === "needsReply" ? "ghost" : "dark"}" id="stl3-next" title="Open the next lead that needs a reply (oldest wait first)">Next lead →</button>
              <button type="button" class="icon-btn" data-stl-board aria-label="Close conversation">✕</button>
            </div>
          </header>
          <div class="stl3-msgs" id="stl3-msgs">${msgs}</div>
          <footer class="stl3-compose">
            ${optedOut ? `<p class="stl3-optout">This lead texted STOP — no more texts can go to this number.</p>` : `
            ${ui.quick ? `<div class="stl3-quick">${quick.map((q, i) => `<button type="button" class="stl3-qr" data-qr="${i}">${esc(q)}</button>`).join("")}</div>` : ""}
            <label class="sr-only" for="stl3-reply">Reply to ${esc(t.leadName)}</label>
            <textarea id="stl3-reply" rows="2" placeholder="Text ${esc(t.leadFirst)}…">${esc(ui.draft[t.id] || "")}</textarea>
            <div class="stl3-compose-row">
              <button type="button" class="stl3-link" id="stl3-quick" aria-pressed="${ui.quick}">Quick replies</button>
              <span class="stl3-faint">Sample — nothing is sent</span>
              <button type="button" class="stl3-btn dark" id="stl3-send">Send</button>
            </div>`}
          </footer>
        </section>
        <aside class="stl3-info" aria-label="Lead info">
          <div class="stl3-info-head"><span class="stl3-av xl">${esc(initials(t.leadName))}</span><h4>${esc(t.leadName)}</h4><p>${esc(t.leadPhone || "")}</p></div>
          <dl class="stl3-dl">
            <div><dt>Assigned to</dt><dd>${esc(t.ownerName || "—")}</dd></div>
            <div><dt>Office</dt><dd>${t.office === "IL" ? "Illinois" : "Michigan"}</dd></div>
            <div><dt>Product</dt><dd>${esc(t.product || "—")}</dd></div>
            <div><dt>Lead source</dt><dd>${esc(t.source || "—")}</dd></div>
            <div><dt>Came in</dt><dd>${esc(dayLabel(t.cameIn.date, today) + " " + t12(t.cameIn.time))}</dd></div>
          </dl>
          <button type="button" class="stl3-btn ghost full" id="stl3-profile">Customer profile</button>
          <button type="button" class="stl3-link" id="stl3-infomore" aria-expanded="${ui.infoMore}">${ui.infoMore ? "Hide details" : "More details"}</button>
          ${ui.infoMore ? `<dl class="stl3-dl small">
            <div><dt>First text</dt><dd>${t.firstTextSec != null ? t.firstTextSec + " seconds after the lead came in" : "—"}</dd></div>
            <div><dt>Texts</dt><dd>${t.messages.filter((m) => m.dir === "out").length} sent · ${t.messages.filter((m) => m.dir === "in").length} received</dd></div>
            <div><dt>Logged in MarketSharp</dt><dd>Text Out / Text In activities on this lead${autoMsg ? `; auto texts under <strong>${esc(t.loggedAs || "the texting login")}</strong>` : ""}</dd></div>
            <div><dt>Conversation id</dt><dd>${esc(t.id)}${t.legacy ? " (older shared sample)" : ""}</dd></div>
          </dl>` : ""}
        </aside>
      </div>`;
  }

  /* ——— render + wiring ——— */
  async function render(root, ctx) {
    const my = ++token;
    if (ctx.selectedId === "log" && window.PeopleLog) {
      last = null;
      root.innerHTML = `<div class="stl3 is-log">${ctx.note || ""}<div id="stl3-logroot"></div></div>`;
      return window.PeopleLog.renderTexts(root.querySelector("#stl3-logroot"), {
        scopeId: ctx.scopeId, isManager: ctx.isManager, office: ctx.office, onBack: () => ctx.onSelect(null), backLabel: "← Speed to Lead board",
        onOpenThread: (id) => ctx.onSelect(id)
      });
    }
    const data = await window.DashboardData.getTextThreads(ctx.scopeId, { office: ctx.office });
    if (my !== token) return;
    ctx.legacy = data.legacy;
    let t = null;
    if (ctx.selectedId) {
      t = data.needsReply.concat(data.done).find((x) => x.id === ctx.selectedId) || await window.DashboardData.getTextThread(ctx.selectedId);
      if (my !== token) return;
    }
    last = { data, ctx, t };
    root.innerHTML = `<div class="stl3 ${t ? "is-open" : ""}">${t ? convoHtml(data, ctx, t) : boardHtml(data, ctx)}</div>`;
    wire(root, ctx, data, t);
    if (t) { const box = root.querySelector("#stl3-msgs"); if (box) box.scrollTop = box.scrollHeight; }
  }

  function nextNeeding(data, currentId) {
    const list = data.needsReply.filter(matches);
    const i = list.findIndex((x) => x.id === currentId);
    const rest = i === -1 ? list : list.slice(i + 1).concat(list.slice(0, i));
    return rest.find((x) => x.id !== currentId) || null;
  }

  function toast(msg) { (window.ActivityView && window.ActivityView.toast) ? window.ActivityView.toast(msg) : null; }

  function wire(root, ctx, data, t) {
    root.querySelectorAll("[data-stl-open]").forEach((b) => b.addEventListener("click", () => ctx.onSelect(b.getAttribute("data-stl-open"))));
    root.querySelectorAll("[data-stl-board]").forEach((b) => b.addEventListener("click", () => ctx.onSelect(null)));
    const scope = root.querySelector("#stl3-scope");
    if (scope) scope.addEventListener("change", () => ctx.onScope(scope.value));
    const search = root.querySelector("#stl3-search");
    if (search) search.addEventListener("input", () => {
      ui.search = search.value.trim();
      const pos = search.selectionStart;
      render(root, ctx).then(() => { const s = root.querySelector("#stl3-search"); if (s) { s.focus(); try { s.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } });
    });
    const tl = root.querySelector("#stl3-textlog");
    if (tl) tl.addEventListener("click", () => ctx.onSelect("log"));
    const det = root.querySelector("#stl3-details");
    if (det) det.addEventListener("click", () => ctx.onToggleDetails(!ctx.details));
    const all = root.querySelector("#stl3-showall");
    if (all) all.addEventListener("click", () => { ui.showAllDone = true; render(root, ctx); });
    if (!t) return;

    const reply = root.querySelector("#stl3-reply");
    if (reply) {
      reply.addEventListener("input", () => { ui.draft[t.id] = reply.value; });
      reply.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });
    }
    async function send() {
      const text = (reply && reply.value || "").trim();
      if (!text) { if (reply) reply.focus(); return; }
      await window.DashboardData.sendTextReply(t.id, text, ctx.user);
      ui.draft[t.id] = ""; ui.quick = false;
      toast("Sample — not sent. Nothing went to the homeowner or MarketSharp.");
      await render(root, ctx);
      const n = root.querySelector("#stl3-next"); if (n) n.focus();
    }
    const sendBtn = root.querySelector("#stl3-send");
    if (sendBtn) sendBtn.addEventListener("click", send);
    const q = root.querySelector("#stl3-quick");
    if (q) q.addEventListener("click", () => { ui.quick = !ui.quick; render(root, ctx); });
    root.querySelectorAll("[data-qr]").forEach((b) => b.addEventListener("click", () => {
      ui.draft[t.id] = b.textContent; ui.quick = false;
      render(root, ctx).then(() => { const r = root.querySelector("#stl3-reply"); if (r) { r.focus(); r.setSelectionRange(r.value.length, r.value.length); } });
    }));
    const next = root.querySelector("#stl3-next");
    if (next) next.addEventListener("click", () => {
      const n = nextNeeding(data, t.id);
      if (n) ctx.onSelect(n.id); else { toast("All caught up — no other leads need a reply."); ctx.onSelect(null); }
    });
    const md = root.querySelector("#stl3-markdone");
    if (md) md.addEventListener("click", async () => {
      const n = nextNeeding(data, t.id);
      await window.DashboardData.markThreadDone(t.id);
      toast("Marked done (sample — not saved to MarketSharp).");
      ctx.onSelect(n ? n.id : null);
    });
    const prof = root.querySelector("#stl3-profile");
    if (prof) prof.addEventListener("click", () => ctx.onOpenLead(t));
    const im = root.querySelector("#stl3-infomore");
    if (im) im.addEventListener("click", () => { ui.infoMore = !ui.infoMore; render(root, ctx); });
  }

  function reset() { ui.search = ""; ui.showAllDone = false; ui.quick = false; ui.infoMore = false; }

  window.SpeedToLead = { render, reset, waitText };
})();
