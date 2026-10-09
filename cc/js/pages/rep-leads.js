/* v16 phone (sales reps only) — Today + My Leads pages, plus the read-only appointment detail sheet.
 * Data: window.SAMPLE_REP_APPTS / window.SampleReps (js/data/rep-appts.js). Registered with the IHIPages shim
 * (track 1's registry drains the queue). Routes: "today" and "my-leads", roles rep + manager (manager = "View as rep").
 * Read-only: phone numbers are plain text (tap-to-call only if IHIMobile.CALLS_ENABLED), no text / outcome / swipe actions.
 * Access is primary; MarketSharp shown small; amber "≠ Doesn't match MarketSharp" when they differ (tap for both values). */
(function () {
  "use strict";
  const R = () => window.SampleReps;
  const M = () => window.IHIMobile || {};
  const VIEW_KEY = "ihi-view-as-rep";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DOWL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dow = (iso) => new Date(iso + "T00:00:00Z").getUTCDay();
  const md = (iso) => (+iso.slice(5, 7)) + "/" + (+iso.slice(8, 10));
  const t12 = (t) => { if (!t) return ""; let h = +t.slice(0, 2); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + t.slice(3, 5) + " " + ap; };
  const nowHm = () => "11:50"; /* sample clock, same as the rest of the app */
  function dayName(iso) {
    const S = R(); if (iso === S.today) return "Today";
    if (iso === S.addDays(S.today, 1)) return "Tomorrow";
    if (iso === S.addDays(S.today, -1)) return "Yesterday";
    return DOW[dow(iso)] + " " + md(iso);
  }
  const longDay = (iso) => DOWL[dow(iso)] + ", " + MON[+iso.slice(5, 7) - 1] + " " + (+iso.slice(8, 10));
  const whenShort = (iso, t) => (iso === R().today ? "today" : DOW[dow(iso)]) + (t ? " " + t12(t) : "");

  /* ——— small building blocks ——— */
  function pills(sources) {
    if (M().sourcePills) return M().sourcePills(sources);
    const order = ["Access", "MarketSharp", "Hatch", "GoHighLevel"], short = { Access: "ACCESS", MarketSharp: "MS", Hatch: "HATCH", GoHighLevel: "GHL" };
    return `<span class="m-pills">${sources.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((s) => `<span class="m-pill m-pill-${esc(s)}" title="${esc(s)}">${esc(short[s] || s)}</span>`).join("")}</span>`;
  }
  /* amber flag; tap opens both values (works without JS: <details>) */
  function flag(detail) {
    return `<details class="rl-mm"><summary><span class="rl-mm-chip"><b aria-hidden="true">≠</b> Doesn’t match MarketSharp</span></summary><span class="rl-mm-body">${esc(detail)}</span></details>`;
  }
  function phoneText(number, full) {
    const shown = full ? number : (M().maskPhone ? M().maskPhone(number) : "•••-" + String(number).replace(/\D/g, "").slice(-4));
    if (M().CALLS_ENABLED && M().phoneActions) return M().phoneActions(number, { compact: true, mask: !full });
    return `<span class="m-phone-num rl-phone" aria-label="Phone ${esc(full ? number : "ending " + String(number).replace(/\D/g, "").slice(-4))}">${esc(shown)}</span>`;
  }
  function mapLink(addr, label) {
    const url = M().mapUrl ? M().mapUrl(addr) : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addr);
    return `<a class="m-map rl-map" href="${esc(url)}" target="_blank" rel="noopener" aria-label="Navigate to ${esc(addr)} in Google Maps"><span aria-hidden="true">➤</span> ${esc(label || addr)}</a>`;
  }
  function confirmChip(a) {
    return a.confirm.status === "Confirmed"
      ? `<span class="rl-chip ok"><span aria-hidden="true">✓</span> Confirmed</span>`
      : `<span class="rl-chip wait"><span aria-hidden="true">○</span> Not confirmed</span>`;
  }
  function confirmLine(a) {
    const c = a.confirm;
    if (c.status === "Confirmed") {
      return `<span>Confirmed by <b>${esc(c.byShort)}</b>, ${c.timeStored ? esc(DOW[dow(c.date)] + " " + t12(c.time)) : esc(DOW[dow(c.date)]) + ` <span class="rl-unconf">· time not stored</span>`}</span>` +
        (c.mismatch ? " " + flag("Access: Confirmed (WHOCONFIRM " + c.by + ", time not stored) · MarketSharp: not confirmed (no completed Confirm Appointment call). Access is shown first.") : "");
    }
    if (c.attempt === "Left message") return `<span>Not confirmed · left message ${esc(whenShort(c.date, c.time))} (${esc(c.byShort)})</span>`;
    if (c.attempt === "Confirm call due") return `<span>Not confirmed · confirm call due ${esc(c.date === R().today ? "today" : DOW[dow(c.date)])}</span>`;
    return `<span>Not confirmed yet</span>`;
  }
  function dmLine(a, long) {
    const d = a.decisionMakers;
    const who = d.owners.length > 1 ? d.owners[0].split(" ")[0] + " & " + d.owners[1] : d.owners[0];
    const state = d.allHome === true ? `<span class="rl-dm ok"><span aria-hidden="true">✓</span> ${d.owners.length > 1 ? "All owners home" : "Sole owner"}</span>`
      : d.allHome === false ? `<span class="rl-dm warn"><span aria-hidden="true">!</span> Not all owners home</span>`
      : `<span class="rl-dm unk"><span aria-hidden="true">?</span> Owners home: not asked yet</span>`;
    return `<span class="rl-dm-who">${esc(who)}</span> ${state}${long && d.note ? `<span class="rl-sub">${esc(d.note)}</span>` : ""}`;
  }
  function freshLine() {
    const s = R().synced;
    if (M().freshness) return M().freshness({ access: s.access, ms: s.ms, appointments: s.appointments }, { now: R().now });
    return `<p class="m-fresh">Access ${esc(s.access)} ET · MarketSharp ${esc(s.ms)} ET · Appointments ${esc(s.appointments)} ET · sample</p>`;
  }

  /* ——— which rep? signed-in rep, ctx.rep (track 1 "View as rep"), or the manager's pick here ——— */
  const isManager = (ctx) => /manager/i.test(String((ctx && (ctx.role || (ctx.user && ctx.user.role))) || ""));
  function repFor(ctx) {
    const S = R(); if (!S) return null;
    const cr = ctx && ctx.rep ? (ctx.rep.id || ctx.rep) : null;
    if (cr && S.repFor(cr)) return S.repFor(cr);
    if (ctx && ctx.user && (S.isRep(ctx.user) || /^rep$/i.test(ctx.role || ""))) return S.repFor(ctx.user.id);
    if (isManager(ctx)) { let v = null; try { v = localStorage.getItem(VIEW_KEY); } catch (e) { /* private mode */ } return S.repFor(v); }
    return null;
  }
  function viewAsBar(ctx, rep, rerender) {
    if (!isManager(ctx) || (ctx && ctx.rep)) return "";
    return `<div class="rl-viewas card"><label for="rl-viewas-pick">Viewing as rep</label>
      <select id="rl-viewas-pick" class="select">${R().users.map((u) => `<option value="${esc(u.id)}" ${rep && rep.id === u.id ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></div>`;
  }
  function noRep(el, ctx, rerender) {
    if (isManager(ctx)) {
      el.innerHTML = `<div class="rl"><div class="card rl-empty"><h2>View as rep</h2><p>The phone app shows one sales rep’s day. Pick a rep to see exactly what they see (sample data).</p>
        <div class="rl-pick">${R().users.map((u) => `<button type="button" class="btn btn-primary rl-pick-btn" data-rl-rep="${esc(u.id)}">${esc(u.name)}</button>`).join("")}</div></div></div>`;
      el.querySelectorAll("[data-rl-rep]").forEach((b) => b.addEventListener("click", () => { try { localStorage.setItem(VIEW_KEY, b.getAttribute("data-rl-rep")); } catch (e) { /* ignore */ } rerender(); }));
      return;
    }
    el.innerHTML = `<div class="rl"><div class="card rl-empty"><h2>The phone app is for sales reps</h2><p>Use the desktop Command Center for your work.</p></div></div>`;
  }
  function bindViewAs(el, rerender) {
    const p = el.querySelector("#rl-viewas-pick");
    if (p) p.addEventListener("change", () => { try { localStorage.setItem(VIEW_KEY, p.value); } catch (e) { /* ignore */ } rerender(); });
  }

  /* ——— cards ——— */
  function leadCard(a, opts) {
    const o = opts || {};
    const S = R(), full = a.date <= S.addDays(S.today, 2); /* full number only for the working set (today + 2 days) */
    return `<article class="rl-card" role="button" tabindex="0" data-rl-appt="${esc(a.id)}" aria-label="${esc(a.first + " " + a.last + ", " + dayName(a.date) + " " + t12(a.time) + ", " + a.confirm.status)}">
      <div class="rl-card-top">
        <span class="rl-time m-num">${o.showDay ? `<span class="rl-day">${esc(dayName(a.date))}</span> ` : ""}${esc(t12(a.time))}</span>
        ${a.type === "Reset" ? `<span class="rl-type">Reset</span>` : ""}
        ${confirmChip(a)}
      </div>
      <h3 class="rl-name">${esc(a.name)}</h3>
      <div class="rl-row">${mapLink(a.fullAddr, a.street + ", " + a.city)}</div>
      <div class="rl-row rl-meta"><span class="rl-k">Phone</span> ${phoneText(a.phone, full)}</div>
      <div class="rl-row rl-meta"><span class="rl-k">Products</span> <span>${esc(a.products.join(", "))}</span></div>
      <div class="rl-row rl-meta"><span class="rl-k">Source</span> <span class="rl-src">${esc(a.source)}</span> ${pills(a.sources)}</div>
      <div class="rl-row rl-conf">${confirmLine(a)}</div>
      <div class="rl-row rl-dmrow">${dmLine(a)}</div>
      ${a.notes ? `<p class="rl-note">${esc(a.notes)}</p>` : ""}
      ${a.resultPending ? `<p class="rl-pending">${esc(a.resultPending)}</p>` : ""}
    </article>`;
  }
  function agendaRow(a) {
    return `<button type="button" class="rl-agenda" data-rl-appt="${esc(a.id)}">
      <span class="rl-time m-num">${esc(t12(a.time))}</span>
      <span class="rl-agenda-main"><b>${esc(a.name)}</b><span>${esc(a.city)} · ${esc(a.products.join(", "))}</span></span>
      ${confirmChip(a)}</button>`;
  }
  function bindCards(el) {
    el.querySelectorAll("[data-rl-appt]").forEach((c) => {
      const open = (e) => {
        if (e && e.target && e.target.closest && e.target.closest("a, details, summary, select")) return; /* map link / flag keep their own tap */
        openSheet(c.getAttribute("data-rl-appt"), c);
      };
      c.addEventListener("click", open);
      if (c.tagName !== "BUTTON") c.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === c) { e.preventDefault(); open(); } });
    });
  }

  /* ——— KPI tile: Access big first, MS small, ≠ when they differ ——— */
  function kpi(label, acc, ms, sub) {
    const differ = ms != null && acc !== ms;
    return `<div class="rl-kpi ${differ ? "is-off" : ""}">
      <span class="rl-kpi-l">${esc(label)}</span>
      <span class="rl-kpi-v m-num"><span class="sr-only">Access </span>${esc(acc)}</span>
      <span class="rl-kpi-ms m-num">MS ${esc(ms == null ? "—" : ms)}</span>
      ${differ ? flag(label + ": Access " + acc + " · MarketSharp " + ms + " · difference " + Math.abs(acc - ms) + ". Access is the source of truth.") : sub ? `<span class="rl-sub">${esc(sub)}</span>` : ""}
    </div>`;
  }

  /* ——— Today ——— */
  function renderToday(el, ctx) {
    const rerender = () => renderToday(el, ctx);
    const S = R();
    if (!S) { el.innerHTML = `<div class="card rl-empty"><h2>Sample data didn’t load</h2></div>`; return; }
    const rep = repFor(ctx);
    if (!rep) return noRep(el, ctx, rerender);
    const all = S.list(rep.id);
    const today = all.filter((a) => a.date === S.today);
    const next = all.find((a) => a.date > S.today || (a.date === S.today && a.time > nowHm())) || null;
    const later = all.filter((a) => a.date > S.today && a.date <= S.addDays(S.today, 6));
    const wk = S.weekRange(), cA = S.countsFor(rep.id, wk), cM = S.countsFor(rep.id, wk, "ms");
    const apptsA = today.length, apptsM = today.filter((a) => !a.accessOnly).length;
    const confA = today.filter((a) => a.confirm.access).length, confM = today.filter((a) => a.confirm.ms).length;
    const byDay = {}; later.forEach((a) => { (byDay[a.date] = byDay[a.date] || []).push(a); });
    el.innerHTML = `<div class="rl rl-today">
      ${viewAsBar(ctx, rep, rerender)}
      <header class="rl-hello"><h2>${isManager(ctx) ? esc(rep.name) + "’s Today" : "Hi " + esc(rep.name.split(" ")[0])}</h2><p>${esc(longDay(S.today))} · Sales rep · Michigan</p></header>
      <section class="rl-next card" aria-label="Next appointment">
        <div class="rl-sec-h">Next appointment</div>
        ${next ? `<div class="rl-next-body" role="button" tabindex="0" data-rl-appt="${esc(next.id)}" aria-label="Open ${esc(next.first + " " + next.last)}">
            <div class="rl-card-top"><span class="rl-time big m-num">${next.date === S.today ? "" : `<span class="rl-day">${esc(dayName(next.date))}</span> `}${esc(t12(next.time))}</span>${confirmChip(next)}</div>
            <h3 class="rl-name">${esc(next.first + " " + next.last)}</h3>
            <div class="rl-row rl-meta"><span>${esc(next.city)}</span> · <span>${esc(next.products.join(", "))}</span> ${pills(next.sources)}</div>
            <div class="rl-row rl-conf">${confirmLine(next)}</div>
            <div class="rl-row rl-dmrow">${dmLine(next)}</div>
          </div>
          <a class="btn btn-primary rl-nav-btn" href="${esc(M().mapUrl ? M().mapUrl(next.fullAddr) : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(next.fullAddr))}" target="_blank" rel="noopener"><span aria-hidden="true">➤</span> Navigate to ${esc(next.street)}</a>`
          : `<p class="rl-none">No more appointments on your schedule this week.</p>`}
      </section>
      <section class="rl-kpis" aria-label="My numbers">
        ${kpi("Appts today", apptsA, apptsM)}
        ${kpi("Confirmed today", confA, confM, "of " + apptsA + " today")}
        ${kpi("Demos", cA.demos, cM.demos, wk.label)}
        ${kpi("Sold", cA.sold, cM.sold, wk.label)}
        ${kpi("Resets", cA.resets, cM.resets, wk.label)}
      </section>
      <p class="rl-legend">Big number = ${pills(["Access"])} (source of truth) · small “MS” = ${pills(["MarketSharp"])}. Demos, Sold and Resets: ${esc(wk.label)}, ${esc(md(wk.from))} to today.</p>
      <section class="rl-sec" aria-label="Today’s agenda">
        <h3 class="rl-sticky">Today · ${esc(DOW[dow(S.today)] + " " + md(S.today))} <span class="rl-count">${today.length}</span></h3>
        ${today.length ? today.map(agendaRow).join("") : `<p class="rl-none">No appointments today.</p>`}
      </section>
      <section class="rl-sec" aria-label="Later this week">
        <h3 class="rl-sec-title">Later this week</h3>
        ${Object.keys(byDay).length ? Object.keys(byDay).map((d) => `<div class="rl-daygrp"><h4 class="rl-sticky">${esc(dayName(d))} · ${esc(DOW[dow(d)] + " " + md(d))} <span class="rl-count">${byDay[d].length}</span></h4>${byDay[d].map(agendaRow).join("")}</div>`).join("") : `<p class="rl-none">Nothing else scheduled this week.</p>`}
      </section>
      <button type="button" class="btn btn-ghost rl-all" data-rl-goto="my-leads">All my leads →</button>
      ${freshLine()}
    </div>`;
    bindViewAs(el, rerender);
    bindCards(el);
    const g = el.querySelector("[data-rl-goto]");
    if (g) g.addEventListener("click", () => { if (ctx && ctx.navigate) ctx.navigate("my-leads"); else location.hash = "#my-leads"; });
  }

  /* ——— My Leads ——— */
  function renderMyLeads(el, ctx) {
    const rerender = () => renderMyLeads(el, ctx);
    const S = R();
    if (!S) { el.innerHTML = `<div class="card rl-empty"><h2>Sample data didn’t load</h2></div>`; return; }
    const rep = repFor(ctx);
    if (!rep) return noRep(el, ctx, rerender);
    const up = S.list(rep.id).filter((a) => a.date >= S.today);
    const tom = S.addDays(S.today, 1);
    const groups = [["Today", up.filter((a) => a.date === S.today), false], ["Tomorrow", up.filter((a) => a.date === tom), false], ["Later", up.filter((a) => a.date > tom), true]];
    el.innerHTML = `<div class="rl rl-leads">
      ${viewAsBar(ctx, rep, rerender)}
      <header class="rl-hello"><h2>${isManager(ctx) ? esc(rep.name) + "’s leads" : "My leads"}</h2><p>${up.length} appointments assigned to ${isManager(ctx) ? esc(rep.name.split(" ")[0]) : "you"} · read-only</p></header>
      ${groups.map(([label, rows, showDay]) => `<section class="rl-sec" aria-label="${esc(label)}">
        <h3 class="rl-sticky">${esc(label)}${label === "Today" ? " · " + esc(DOW[dow(S.today)] + " " + md(S.today)) : label === "Tomorrow" ? " · " + esc(DOW[dow(tom)] + " " + md(tom)) : ""} <span class="rl-count">${rows.length}</span></h3>
        ${rows.length ? rows.map((a) => leadCard(a, { showDay })).join("") : `<p class="rl-none">Nothing ${label === "Later" ? "else scheduled" : "on your schedule " + label.toLowerCase()}.</p>`}
      </section>`).join("")}
      <p class="rl-foot">Phone numbers are shown as text only. Full numbers show for today and the next 2 days; later ones are masked until you open the card.</p>
      ${freshLine()}
    </div>`;
    bindViewAs(el, rerender);
    bindCards(el);
  }

  /* ——— Detail sheet (read-only) ——— */
  let lastFocus = null;
  function localTime(tz) {
    /* sample clock (SampleReps.now), not the wall clock */
    try { return new Date((R() && R().now) || Date.now()).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz || "America/New_York" }); } catch (e) { return ""; }
  }
  function closeSheet() {
    const sh = document.getElementById("rl-sheet");
    if (!sh) return;
    sh.remove();
    document.documentElement.classList.remove("rl-sheet-open");
    document.removeEventListener("keydown", onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onKey(e) {
    if (e.key === "Escape") { e.stopPropagation(); closeSheet(); return; }
    if (e.key === "Tab") { /* keep focus inside the sheet */
      const sh = document.getElementById("rl-sheet"); if (!sh) return;
      const f = Array.from(sh.querySelectorAll("a[href], button, summary, [tabindex='0']")).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  function field(label, html) { return `<div class="rl-f"><dt>${esc(label)}</dt><dd>${html}</dd></div>`; }
  function openSheet(id, from) {
    const S = R(), a = S && S.get(id);
    if (!a) return;
    closeSheet();
    lastFocus = from || document.activeElement;
    const info = a.result ? S.resultInfo[a.result] : null;
    const resultHtml = a.result
      ? `<span class="rl-res ${info && info.tone ? info.tone : ""}"><b>${esc(a.result)}</b>${a.saleAmount ? " · $" + a.saleAmount.toLocaleString("en-US") : ""}</span> <span class="rl-kpi-ms">MS ${esc(a.msResult)}</span>${a.resultMismatch ? " " + flag("Access: " + a.accessResult + " · MarketSharp: " + a.msResult + " (contract not keyed in MarketSharp yet). Access is shown first.") : ""}`
      : esc(a.resultPending || "Not run yet");
    const sh = document.createElement("div");
    sh.id = "rl-sheet";
    sh.className = "rl-sheet-wrap";
    sh.innerHTML = `<div class="rl-sheet-backdrop" data-rl-close></div>
      <div class="rl-sheet" role="dialog" aria-modal="true" aria-labelledby="rl-sheet-title">
        <header class="rl-sheet-head">
          <div class="rl-sheet-hrow"><h2 id="rl-sheet-title">${esc(a.first + " " + a.last)}</h2><button type="button" class="rl-close" data-rl-close aria-label="Close">✕</button></div>
          <div class="rl-sheet-hrow2">${confirmChip(a)} <span class="rl-sub">Customer’s local time <b class="m-num">${esc(localTime(a.tz))}</b></span></div>
          <div class="rl-row">${mapLink(a.fullAddr)}</div>
        </header>
        <div class="rl-sheet-body">
          <dl class="rl-fields">
            ${field("Appointment", `<b>${esc(longDay(a.date))} · ${esc(t12(a.time))}</b> <span class="rl-sub">${esc(a.type)} · ${esc(a.rep)}</span>`)}
            ${field("Phone", phoneText(a.phone, true) + ` <span class="rl-sub">Read-only</span>`)}
            ${field("Products", esc(a.products.join(", ")))}
            ${field("Lead source", `<span class="rl-src">${esc(a.source)}</span> ${pills(a.sources)}${a.accessOnly ? `<span class="rl-sub">Only in Access (RUNTYPE RES), not in MarketSharp</span>` : ""}`)}
            ${field("Confirm", confirmLine(a))}
            ${field("Decision-makers", `${esc(a.decisionMakers.owners.join(" and "))}<br>${dmLine(a, true).replace(/^<span class="rl-dm-who">[^<]*<\/span> /, "")}`)}
            ${field("Notes", esc(a.notes || "—"))}
            ${field("Set by", `${esc(a.setBy)} <span class="rl-sub">on ${esc(md(a.setDate))}</span>`)}
            ${field("Result", resultHtml)}
            ${field("Access lead #", `<span class="m-num">${esc(a.accessLeadNum)}</span>`)}
          </dl>
          <h3 class="rl-sheet-sec">Recent history</h3>
          <ol class="rl-hist">${a.history.slice(0, 6).map((h) => `<li><span class="rl-hist-when m-num">${esc(dayName(h.date))}${h.time ? " " + esc(t12(h.time)) : ""}${h.timeNote ? ` <span class="rl-unconf">${esc(h.timeNote)}</span>` : ""}</span>
            <span class="rl-hist-what">${esc(h.what)}${h.by ? ` <span class="rl-sub">· ${esc(h.by)}</span>` : ""}</span> ${pills([h.system])}</li>`).join("")}</ol>
          <p class="rl-foot">Read-only sample. Nothing here changes Access or MarketSharp.</p>
          ${freshLine()}
        </div>
      </div>`;
    document.body.appendChild(sh);
    document.documentElement.classList.add("rl-sheet-open");
    sh.querySelectorAll("[data-rl-close]").forEach((b) => b.addEventListener("click", closeSheet));
    document.addEventListener("keydown", onKey);
    const c = sh.querySelector(".rl-close"); if (c) c.focus();
  }

  const reg = (window.IHIPages = window.IHIPages || { _q: [], register: function (r, d) { this._q.push([r, d]); } });
  reg.register("today", { title: "Today", short: "Today", icon: "⌂", roles: ["rep", "manager"], tip: "Your next appointment, today’s agenda and a few numbers (sample).", render: renderToday });
  reg.register("my-leads", { title: "My Leads", short: "My Leads", icon: "☰", roles: ["rep", "manager"], tip: "Leads and appointments assigned to you, read-only (sample).", render: renderMyLeads });
  window.RepPages = { renderToday, renderMyLeads, openSheet, closeSheet, repFor, VIEW_KEY };
})();
