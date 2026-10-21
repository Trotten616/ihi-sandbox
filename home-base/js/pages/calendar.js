/* v16 phone page: Calendar (sales reps only; Tom sees it via "View as rep").
 * Thomas 2026-10-08 (v16 scope trim + rep-only update): the rep's OWN appointments, read-only, day / week.
 * Design pass item 7: opens in an agenda List covering the 7-day strip's week (sticky day headers, ~72px rows),
 * swipeable 7-day strip with count dots + Today pill, List | Day toggle (Day = time grid, 64px per hour).
 * No week/month grid, no Confirm / Call / Text buttons, no edge swipes (they clash with Android back).
 * Data: window.SAMPLE_REP_APPTS only (js/data/rep-appts.js, keyed by rep id u-mark / u-drew). Clock: the shared
 * sample clock (SampleReps.today / .now), the same "today" as the other phone pages. Access first; MarketSharp small + amber ≠.
 * Owned by v16 track 3. Sample data only. */
(function () {
  "use strict";
  const M = () => window.IHIMobile || {};
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAY_START = 9, DAY_END = 21, HOUR_PX = 64, APPT_HOURS = 2;

  /* confirm status → chip (text + icon + colour; colour is never the only cue) */
  const STATUS = {
    confirmed:   { label: "Confirmed",   icon: "✓", cls: "ok" },
    unconfirmed: { label: "Unconfirmed", icon: "○", cls: "pending" },
    leftvm:      { label: "Left VM",     icon: "☎", cls: "info" },
    reschedule:  { label: "Reschedule",  icon: "↻", cls: "resched" },
    cancelled:   { label: "Cancelled",   icon: "✕", cls: "bad" },
    tmcanx:      { label: "TM CANX",     icon: "✕", cls: "bad" }
  };
  function statusKey(v) {
    const k = String(v || "").toLowerCase().replace(/[^a-z]/g, "");
    if (!k) return "unconfirmed";
    if (k.indexOf("unconf") === 0 || k === "pending" || k === "pendingconfirmation" || k === "cb" || k === "callback") return "unconfirmed";
    if (k.indexOf("confirm") === 0 || k === "completed") return "confirmed";
    if (k === "leftvm" || k === "lm" || k === "voicemail" || k === "noanswer" || k === "textsent") return "leftvm";
    if (k.indexOf("resched") === 0 || k === "reset" || k === "res") return "reschedule";
    if (k === "tmcanx") return "tmcanx";
    if (k.indexOf("cancel") === 0 || k === "canx") return "cancelled";
    return STATUS[k] ? k : "unconfirmed";
  }
  const chip = (key, small) => { const s = STATUS[key] || STATUS.unconfirmed; return `<span class="cal3-chip ${s.cls}${small ? " sm" : ""}"><span aria-hidden="true">${s.icon}</span> ${esc(s.label)}</span>`; };

  /* —— dates (all in ET, the office zone) —— */
  /* shared sample clock (js/data/rep-appts.js): Mon Oct 5, 2026 · 11:50 AM ET — never the wall clock */
  const SR = () => window.SampleReps || {};
  function todayISO() { return SR().today || "2026-10-05"; }
  function nowMinutesET() { const m = String(SR().now || "").match(/T(\d\d):(\d\d)/); return m ? (+m[1]) * 60 + (+m[2]) : 11 * 60 + 50; }
  const toD = (iso) => new Date(iso + "T12:00:00Z");
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = toD(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const weekStartOf = (s) => addDays(s, -toD(s).getUTCDay()); /* Sunday */
  const dow = (s) => toD(s).getUTCDay();
  const dnum = (s) => toD(s).getUTCDate();
  const mdy = (s) => (toD(s).getUTCMonth() + 1) + "/" + dnum(s);
  function t12(hm) { if (!hm) return ""; let h = +hm.slice(0, 2); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + hm.slice(3, 5) + " " + ap; }
  function dayHeading(s, today) {
    const rel = s === today ? "Today · " : s === addDays(today, 1) ? "Tomorrow · " : s === addDays(today, -1) ? "Yesterday · " : "";
    return rel + DOW_LONG[dow(s)] + ", " + MONTHS[toD(s).getUTCMonth()].slice(0, 3) + " " + dnum(s);
  }

  /* only reps that have sample appointments (SAMPLE_REP_APPTS keys) */
  function repDirectory() {
    const src = window.SAMPLE_REP_APPTS || {};
    return (SR().users || []).filter((u) => Array.isArray(src[u.id]) && src[u.id].length).map((u) => ({ id: u.id, name: u.name, initials: u.initials }));
  }
  function resolveRep(ctx, st) {
    let r = ctx && ctx.rep;
    if (typeof r === "string") r = { id: r };
    const dir = repDirectory();
    if (r && (r.id || r.name)) {
      const hit = dir.find((d) => d.id === r.id || (r.name && d.name === r.name));
      return Object.assign({}, hit || {}, r, { name: r.name || (hit && hit.name) || r.id });
    }
    const u = ctx && ctx.user;
    const key = window.IHIPages && IHIPages.roleKey ? IHIPages.roleKey(u && (u.role || "")) : String(u && u.role || "").toLowerCase();
    if (u && key === "salesrep") return { id: u.id, name: u.name, initials: u.initials };
    if (u && key === "manager") { /* fallback until the shell passes ctx.rep: local "View as rep" picker */
      const chosen = dir.find((d) => d.id === st.repPick) || dir[0];
      return chosen ? Object.assign({ picker: true }, chosen) : null;
    }
    return null;
  }

  /* Normalise one SAMPLE_REP_APPTS row (field contract: MOBILE-home-leads.md) into the calendar's shape. */
  const initialsOf = (n) => String(n || "").split(/\s+/).filter(Boolean).map((w) => w[0]).join("").toUpperCase();
  function resultKey(r) { return r === "Cancelled" ? "cancelled" : r === "TM CANX" ? "tmcanx" : r === "Reset" ? "reschedule" : null; }
  function normalize(a) {
    const cf = a.confirm || {};
    const confirmedA = cf.status === "Confirmed" && cf.access !== false;
    let access = confirmedA ? "confirmed" : cf.attempt === "Left message" ? "leftvm" : "unconfirmed";
    let ms = cf.ms ? "confirmed" : cf.attempt === "Left message" ? "leftvm" : "unconfirmed";
    if (resultKey(a.result)) access = resultKey(a.result);
    if (resultKey(a.msResult)) ms = resultKey(a.msResult); else if (resultKey(a.result)) ms = a.result === "TM CANX" && a.msResult === "Cancelled" ? "cancelled" : access;
    const dm = a.decisionMakers || {};
    return {
      id: a.id, date: a.date, time: a.time || "10:00", first: a.first || "", last: a.last || "",
      address: a.street || "", city: a.city || "", state: a.state || a.office || "MI", zip: a.zip || "",
      phone: a.phone || "", products: Array.isArray(a.products) ? a.products : [], source: a.source || "",
      systems: Array.isArray(a.sources) && a.sources.length ? a.sources : ["Access", "MarketSharp"],
      access, ms, confirmBy: confirmedA && cf.by ? initialsOf(cf.by) : "", confirmByName: confirmedA ? cf.by || "" : "",
      confirmMsAt: cf.ms && cf.timeStored && cf.date ? mdy(cf.date) + " " + t12(cf.time) : "",
      owners: dm.owners ? dm.owners.join(" and ") + (dm.note ? " · " + dm.note : "") : "", notes: a.notes || "",
      dnc: !!a.dnc, office: a.office || "MI"
    };
  }
  function repAppts(rep) {
    const src = window.SAMPLE_REP_APPTS || {};
    const list = Array.isArray(src[rep.id]) ? src[rep.id] : [];
    return list.map(normalize);
  }
  function apptsFor(rep, weekStart, office) {
    const end = addDays(weekStart, 6);
    let list = repAppts(rep).filter((a) => a.date >= weekStart && a.date <= end);
    if (office) list = list.filter((a) => !a.office || a.office === office);
    return { list: list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)), from: "SAMPLE_REP_APPTS" };
  }

  /* —— UI state (per page module) —— */
  const st = { showEarlier: false, view: "list", weekStart: null, selected: null, status: "all", repPick: null, repKey: null, focusDay: null };

  function mismatchHtml(a) {
    if (a.ms === a.access) return "";
    const A = STATUS[a.access].label, B = STATUS[a.ms].label;
    if (M().mismatch) return M().mismatch(A, B, { label: "Confirm status" });
    return `<span class="mm mm-differs"><span class="mm-access">${esc(A)}</span><span class="mm-ms">MS ${esc(B)}</span><span class="mm-flag cal3-mm"><b aria-hidden="true">≠</b> Doesn’t match MarketSharp</span></span>`;
  }
  const pills = (systems) => M().sourcePills ? M().sourcePills(systems) : `<span class="m-pills">${systems.map((s) => `<span class="m-pill">${esc(s === "MarketSharp" ? "MS" : s.toUpperCase())}</span>`).join("")}</span>`;
  function freshLine() {
    const s = SR().synced || { access: "11:30 AM", ms: "11:45 AM", appointments: "11:45 AM" };
    if (M().freshness) return M().freshness({ access: s.access, ms: s.ms, appointments: s.appointments }, { now: SR().now });
    return `<p class="m-fresh">Access ${esc(s.access)} ET · MarketSharp ${esc(s.ms)} ET · sample</p>`;
  }

  function row(a, today) {
    const past = a.date < today;
    const name = (a.first + " " + a.last).trim();
    return `<button type="button" class="cal3-row ${past ? "past" : ""} st-${STATUS[a.access].cls}" data-cal-appt="${esc(a.id)}" aria-label="${esc(t12(a.time) + ", " + name + ", " + a.city + ", " + STATUS[a.access].label + (a.ms !== a.access ? ", doesn’t match MarketSharp" : ""))}">
      <span class="cal3-time m-num">${esc(t12(a.time))}</span>
      <span class="cal3-main"><span class="cal3-name">${esc(name)}</span><span class="cal3-sub">${esc(a.city)}${a.products.length ? " · " + esc(a.products.join(", ")) : ""}</span></span>
      <span class="cal3-right">${chip(a.access, true)}${a.ms !== a.access ? `<span class="cal3-ne" title="Doesn’t match MarketSharp (MS: ${esc(STATUS[a.ms].label)})"><b aria-hidden="true">≠</b> MS ${esc(STATUS[a.ms].label)}</span>` : ""}${a.dnc ? (M().dncBadge ? M().dncBadge("dnc") : `<span class="m-dnc">DNC</span>`) : ""}</span>
    </button>`;
  }

  function listHtml(appts, days, today) {
    const earlier = days.indexOf(today) > 0 && !st.showEarlier ? days.filter((d) => d < today) : [];
    const nEarlier = appts.filter((a) => earlier.indexOf(a.date) >= 0).length;
    const more = earlier.length && nEarlier ? `<button type="button" class="cal3-earlier" id="cal3-earlier" aria-expanded="false">Earlier this week · ${nEarlier} ${nEarlier === 1 ? "appointment" : "appointments"} <span aria-hidden="true">▾</span></button>` : "";
    return `<div class="cal3-agenda">${more}${days.filter((d) => earlier.indexOf(d) < 0).map((d) => {
      const items = appts.filter((a) => a.date === d);
      return `<section class="cal3-day" data-cal-dayblock="${d}" aria-label="${esc(dayHeading(d, today))}">
        <h3 class="cal3-dayhead ${d === today ? "is-today" : ""}" id="cal3-h-${d}"><span>${esc(dayHeading(d, today))}</span><span class="cal3-n">${items.length ? items.length + (items.length === 1 ? " appt" : " appts") : ""}</span></h3>
        ${items.map((a) => row(a, today)).join("") || `<p class="cal3-none">${dow(d) === 0 ? "Sunday · office closed" : "No appointments"}</p>`}
      </section>`;
    }).join("")}</div>`;
  }

  function dayHtml(appts, day, today) {
    const items = appts.filter((a) => a.date === day);
    const hours = [];
    for (let h = DAY_START; h < DAY_END; h++) hours.push(h);
    const nowM = nowMinutesET();
    const nowLine = day === today && nowM >= DAY_START * 60 && nowM <= DAY_END * 60
      ? `<div class="cal3-now" style="top:${((nowM - DAY_START * 60) / 60) * HOUR_PX}px" aria-hidden="true"></div>` : "";
    return `<section class="cal3-dayview" aria-label="${esc(dayHeading(day, today))}">
      <h3 class="cal3-dayhead ${day === today ? "is-today" : ""}"><span>${esc(dayHeading(day, today))}</span><span class="cal3-n">${items.length ? items.length + (items.length === 1 ? " appt" : " appts") : "No appointments"}</span></h3>
      <div class="cal3-grid" style="height:${(DAY_END - DAY_START) * HOUR_PX}px">
        ${hours.map((h) => `<div class="cal3-hour" style="top:${(h - DAY_START) * HOUR_PX}px"><span class="m-num">${h % 12 || 12} ${h < 12 ? "AM" : "PM"}</span></div>`).join("")}
        ${nowLine}
        ${items.map((a) => {
          const [hh, mm] = a.time.split(":").map(Number);
          const top = ((hh * 60 + mm - DAY_START * 60) / 60) * HOUR_PX;
          const name = (a.first + " " + a.last).trim();
          return `<button type="button" class="cal3-ev st-${STATUS[a.access].cls} ${a.date < today ? "past" : ""}" style="top:${Math.max(0, top) + 2}px;height:${APPT_HOURS * HOUR_PX - 6}px" data-cal-appt="${esc(a.id)}" aria-label="${esc(t12(a.time) + ", " + name + ", " + a.city + ", " + STATUS[a.access].label)}">
            <span class="cal3-ev-top"><span class="m-num">${esc(t12(a.time))}</span>${chip(a.access, true)}</span>
            <span class="cal3-name">${esc(name)}</span>
            <span class="cal3-sub">${esc(a.city)}${a.products.length ? " · " + esc(a.products.join(", ")) : ""}${a.ms !== a.access ? ` · <b class="cal3-ne-inline">≠ MS</b>` : ""}</span>
          </button>`;
        }).join("")}
        ${items.length ? "" : `<p class="cal3-grid-empty">${dow(day) === 0 ? "Sunday · office closed" : "Nothing booked this day."}</p>`}
      </div>
    </section>`;
  }

  function stripHtml(appts, days, today, selected) {
    return `<div class="cal3-strip" role="group" aria-label="Week, swipe sideways to change week">
      ${days.map((d) => {
        const n = appts.filter((a) => a.date === d).length;
        const dots = n ? `<span class="cal3-dots" aria-hidden="true">${"<i></i>".repeat(Math.min(n, 3))}${n > 3 ? "<b>+</b>" : ""}</span>` : `<span class="cal3-dots" aria-hidden="true"></span>`;
        return `<button type="button" class="cal3-sd ${d === today ? "is-today" : ""} ${d === selected ? "is-sel" : ""}" data-cal-day="${d}" aria-pressed="${d === selected}" aria-label="${esc(dayHeading(d, today) + ", " + n + (n === 1 ? " appointment" : " appointments"))}">
          <span class="cal3-sd-dow">${DOW[dow(d)].slice(0, 3)}</span><span class="cal3-sd-num m-num">${dnum(d)}</span>${dots}</button>`;
      }).join("")}
    </div>`;
  }

  function monthSheetHtml(today) {
    const base = toD(st.selected || today);
    const y = base.getUTCFullYear(), m = base.getUTCMonth();
    const first = iso(new Date(Date.UTC(y, m, 1, 12)));
    const start = weekStartOf(first);
    const cells = [];
    for (let i = 0; i < 42; i++) { const d = addDays(start, i); if (i >= 35 && toD(d).getUTCMonth() !== m) break; cells.push(d); }
    return `<div class="cal3-month">
      <div class="cal3-month-head"><button type="button" class="cal3-iconbtn" data-cal-month="-1" aria-label="Previous month">‹</button><strong>${MONTHS[m]} ${y}</strong><button type="button" class="cal3-iconbtn" data-cal-month="1" aria-label="Next month">›</button><button type="button" class="cal3-iconbtn" data-cal-close aria-label="Close month picker">✕</button></div>
      <div class="cal3-month-grid" role="grid">${DOW.map((w) => `<span class="cal3-mw" aria-hidden="true">${w.slice(0, 1)}</span>`).join("")}
        ${cells.map((d) => `<button type="button" class="cal3-md ${toD(d).getUTCMonth() !== m ? "out" : ""} ${d === today ? "is-today" : ""} ${d === st.selected ? "is-sel" : ""}" data-cal-goto="${d}" aria-label="${esc(dayHeading(d, today))}">${dnum(d)}</button>`).join("")}
      </div></div>`;
  }

  function detailHtml(a, rep, today) {
    const name = (a.first + " " + a.last).trim();
    const addr = [a.address, a.city, [a.state, a.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const showFull = true; /* sheet = lead detail → full number allowed (data map rule 8); read-only text */
    const phone = a.phone ? (M().CALLS_ENABLED === true && M().phoneActions ? M().phoneActions(a.phone, { compact: false }) : `<span class="m-phone m-phone-ro">${esc(showFull ? a.phone : (M().maskPhone ? M().maskPhone(a.phone) : a.phone))}</span>`) : "—";
    const accessWho = a.confirmBy ? `${esc(a.confirmBy)}${a.confirmByName ? " (" + esc(a.confirmByName) + ")" : ""} · Access, time not stored` : "Nobody yet";
    const msLine = a.ms === a.access
      ? (a.confirmMsAt ? `MarketSharp: ${esc(STATUS[a.ms].label)} · ${esc(a.confirmByName || a.confirmBy)} ${esc(a.confirmMsAt)}` : `MarketSharp: ${esc(STATUS[a.ms].label)}`)
      : "";
    return `<div class="cal3-detail">
      <div class="cal3-detail-head">
        <div><h2 id="cal3-sheet-title">${esc(name)}</h2><p class="cal3-detail-when">${esc(dayHeading(a.date, today))} · <span class="m-num">${esc(t12(a.time))}</span></p></div>
        <button type="button" class="cal3-iconbtn" data-cal-close aria-label="Close">✕</button>
      </div>
      ${a.dnc ? `<p>${M().dncBadge ? M().dncBadge("dnc") : '<span class="m-dnc">DNC</span>'}</p>` : ""}
      <dl class="cal3-dl">
        <div><dt>Confirm status</dt><dd>${chip(a.access)} ${mismatchHtml(a)}</dd></div>
        <div><dt>Confirmed by</dt><dd>${accessWho}${msLine ? `<span class="cal3-ms">${msLine}</span>` : ""}</dd></div>
        <div><dt>Address</dt><dd>${addr ? (M().mapLink ? M().mapLink(addr, addr) : `<a class="m-map" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}" target="_blank" rel="noopener">${esc(addr)}</a>`) + `<span class="cal3-hint">Tap to navigate (Google Maps)</span>` : "—"}</dd></div>
        <div><dt>Phone</dt><dd>${phone}</dd></div>
        <div><dt>Products</dt><dd>${esc(a.products.join(", ") || "—")}</dd></div>
        ${a.owners ? `<div><dt>Decision-makers</dt><dd>${esc(a.owners)}</dd></div>` : ""}
        <div><dt>Lead source</dt><dd><span class="cal3-src">${esc(a.source || "—")}</span> ${pills(a.systems)}</dd></div>
        ${a.notes ? `<div><dt>Note</dt><dd>${esc(a.notes)}</dd></div>` : ""}
        <div><dt>Rep</dt><dd>${esc(rep.name)}</dd></div>
      </dl>
      <p class="cal3-foot">Read-only · sample data. Confirm status: Michigan Access first, MarketSharp second.</p>
    </div>`;
  }

  /* bottom sheet (local; scoped .cal3-sheet so it can't collide with the shell's sheet framework) */
  function openSheet(html, label) {
    closeSheet();
    const bd = document.createElement("div"); bd.className = "cal3-sheet-bd"; bd.setAttribute("data-cal-close", "");
    const sh = document.createElement("div"); sh.className = "cal3-sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-label", label || "Details");
    sh.innerHTML = `<div class="cal3-grab" aria-hidden="true"></div>${html}`;
    document.body.appendChild(bd); document.body.appendChild(sh);
    sh.addEventListener("click", (e) => { if (e.target.closest("[data-cal-close]")) closeSheet(); });
    bd.addEventListener("click", closeSheet);
    requestAnimationFrame(() => { bd.classList.add("open"); sh.classList.add("open"); const f = sh.querySelector("[data-cal-close]"); if (f) f.focus(); });
    return sh;
  }
  function closeSheet() {
    document.querySelectorAll(".cal3-sheet, .cal3-sheet-bd").forEach((n) => n.remove());
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.querySelector(".cal3-sheet")) closeSheet(); });

  function render(el, ctx) {
    const today = todayISO();
    const rep = resolveRep(ctx, st);
    if (!rep) {
      el.innerHTML = `<div class="card empty-state cal3-empty"><strong>Calendar is for sales reps</strong>Sign in as a sales rep to see your appointments. Sample data only.</div>`;
      return;
    }
    const repKey = rep.id + "|" + (ctx && ctx.office);
    if (st.repKey !== repKey) { st.repKey = repKey; st.showEarlier = false; st.weekStart = weekStartOf(today); st.selected = today; st.focusDay = today; }
    if (!st.weekStart) st.weekStart = weekStartOf(today);
    if (!st.selected) st.selected = today;
    draw(el, ctx, rep, today);
  }

  function draw(el, ctx, rep, today) {
    const days = []; for (let i = 0; i < 7; i++) days.push(addDays(st.weekStart, i));
    if (days.indexOf(st.selected) < 0) st.selected = days.indexOf(today) >= 0 ? today : days[1];
    const res = apptsFor(rep, st.weekStart, ctx && ctx.office);
    const appts = res.list.filter((a) => st.status === "all" || a.access === st.status);
    const offToday = st.selected !== today || days.indexOf(today) < 0;
    const m0 = toD(days[0]).getUTCMonth(), m6 = toD(days[6]).getUTCMonth();
    const title = m0 === m6 ? MONTHS[m0] + " " + toD(days[0]).getUTCFullYear() : MONTHS[m0].slice(0, 3) + " – " + MONTHS[m6].slice(0, 3) + " " + toD(days[6]).getUTCFullYear();
    const counts = Object.keys(STATUS).map((k) => [k, res.list.filter((a) => a.access === k).length]).filter((x) => x[1] || x[0] === st.status);
    const dir = repDirectory();
    const picker = rep.picker ? `<label class="cal3-repPick">View as rep <select id="cal3-rep">${dir.map((d) => `<option value="${esc(d.id)}" ${d.id === rep.id ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select></label>` : "";
    el.innerHTML = `<div class="cal3" data-view="${st.view}">
      ${picker}
      <div class="cal3-top">
        <button type="button" class="cal3-title" id="cal3-month" aria-haspopup="dialog" aria-label="${esc(title)}, open month picker">${esc(title)} <span aria-hidden="true">▾</span></button>
        <div class="cal3-top-r">
          ${offToday ? `<button type="button" class="cal3-today" id="cal3-today">Today</button>` : ""}
          <button type="button" class="cal3-iconbtn" data-cal-week="-1" aria-label="Previous week">‹</button>
          <button type="button" class="cal3-iconbtn" data-cal-week="1" aria-label="Next week">›</button>
        </div>
      </div>
      ${stripHtml(res.list, days, today, st.selected)}
      <div class="cal3-tools">
        <div class="cal3-seg" role="tablist" aria-label="Calendar view">
          <button type="button" role="tab" aria-selected="${st.view === "list"}" data-cal-view="list">List</button>
          <button type="button" role="tab" aria-selected="${st.view === "day"}" data-cal-view="day">Day</button>
        </div>
        <label class="cal3-filter"><span class="sr-only">Confirm status</span>
          <select id="cal3-status" aria-label="Filter by confirm status"><option value="all">All statuses (${res.list.length})</option>${counts.map(([k, n]) => `<option value="${k}" ${st.status === k ? "selected" : ""}>${esc(STATUS[k].label)} (${n})</option>`).join("")}</select></label>
      </div>
      <p class="cal3-scope">${esc(rep.name)} · your appointments only · ${ctx && ctx.office === "IL" ? "Illinois" : "Michigan"}</p>
      ${st.view === "day" ? dayHtml(appts, st.selected, today) : listHtml(appts, days, today)}
      ${freshLine()}
      <p class="cal3-foot">Sample data, read-only. Confirm status shows Michigan Access first; an amber ≠ means MarketSharp says something different.</p>
    </div>`;
    wire(el, ctx, rep, today, res.list);
    if (st.view === "list" && st.focusDay) {
      const h = el.querySelector("#cal3-h-" + st.focusDay);
      st.focusDay = null;
      if (h && st.selected !== days[0] && st.scroll) h.scrollIntoView({ block: "start", behavior: "smooth" });
      st.scroll = false;
    }
  }

  function wire(el, ctx, rep, today, all) {
    const redraw = () => draw(el, ctx, rep, today);
    el.querySelectorAll("[data-cal-view]").forEach((b) => b.addEventListener("click", () => {
      st.view = b.getAttribute("data-cal-view"); redraw();
      if (st.view === "day") { const ev = el.querySelector(".cal3-ev"); if (ev) { const r = ev.getBoundingClientRect(); if (r.top > window.innerHeight - 96) ev.scrollIntoView({ block: "center", behavior: "smooth" }); } }
    }));
    el.querySelectorAll("[data-cal-week]").forEach((b) => b.addEventListener("click", () => shiftWeek(+b.getAttribute("data-cal-week"))));
    function shiftWeek(n) { st.weekStart = addDays(st.weekStart, 7 * n); st.selected = addDays(st.selected, 7 * n); redraw(); }
    const tb = el.querySelector("#cal3-today");
    if (tb) tb.addEventListener("click", () => { st.showEarlier = false; st.weekStart = weekStartOf(today); st.selected = today; st.focusDay = today; st.scroll = true; redraw(); });
    const ea = el.querySelector("#cal3-earlier");
    if (ea) ea.addEventListener("click", () => { st.showEarlier = true; redraw(); });
    el.querySelectorAll("[data-cal-day]").forEach((b) => b.addEventListener("click", () => { st.selected = b.getAttribute("data-cal-day"); if (st.selected < today) st.showEarlier = true; st.focusDay = st.selected; st.scroll = true; redraw(); }));
    el.querySelectorAll("[data-cal-appt]").forEach((b) => b.addEventListener("click", () => {
      const a = all.find((x) => x.id === b.getAttribute("data-cal-appt"));
      if (a) openSheet(detailHtml(a, rep, today), (a.first + " " + a.last).trim());
    }));
    const s = el.querySelector("#cal3-status");
    if (s) s.addEventListener("change", () => { st.status = s.value; redraw(); });
    const rp = el.querySelector("#cal3-rep");
    if (rp) rp.addEventListener("change", () => { st.repPick = rp.value; render(el, ctx); });
    const mb = el.querySelector("#cal3-month");
    if (mb) mb.addEventListener("click", () => {
      const sh = openSheet(monthSheetHtml(today), "Pick a day");
      const bindMonth = (root) => {
        if (!root) return;
        root.addEventListener("click", (e) => {
          const g = e.target.closest("[data-cal-goto]");
          if (g) { const d = g.getAttribute("data-cal-goto"); st.weekStart = weekStartOf(d); st.selected = d; st.focusDay = d; st.scroll = true; closeSheet(); redraw(); return; }
          const mm = e.target.closest("[data-cal-month]");
          if (mm) { const b0 = toD(st.selected); b0.setUTCMonth(b0.getUTCMonth() + (+mm.getAttribute("data-cal-month")), 1); st.selected = iso(b0); const box = root.querySelector(".cal3-month"); if (box) box.outerHTML = monthSheetHtml(today); }
        });
      };
      bindMonth(sh);
    });
    /* swipe the week strip sideways (not from the screen edges: those belong to Android back) */
    const strip = el.querySelector(".cal3-strip");
    if (strip) {
      let x0 = null, y0 = null;
      strip.addEventListener("touchstart", (e) => { const t = e.touches[0]; const edge = 24; x0 = (t.clientX < edge || t.clientX > window.innerWidth - edge) ? null : t.clientX; y0 = t.clientY; }, { passive: true });
      strip.addEventListener("touchend", (e) => {
        if (x0 == null) return; const t = e.changedTouches[0]; const dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftWeek(dx < 0 ? 1 : -1);
      }, { passive: true });
    }
  }

  function badge(user) { void user; return null; } /* no count badge on Calendar */

  (window.IHIPages = window.IHIPages || { _q: [], register: function (r, d) { this._q.push([r, d]); } }).register("calendar", {
    title: "Calendar", short: "Calendar", icon: "▦", roles: ["salesrep", "manager"],
    tip: "Your appointments by day or week (sample, read-only).",
    badge, render
  });
  /* test hooks (sample only) */
  window.IHICalendar = { render, _st: st, _apptsFor: apptsFor, _repDirectory: repDirectory, _todayISO: todayISO, _normalize: normalize };
})();
