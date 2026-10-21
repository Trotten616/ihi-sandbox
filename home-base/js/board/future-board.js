/* Future Board engine — infinite week board, booking with auto rep pick, actions, routes.
   Generic: reads everything from FutureBoardConfig.get(). Sample customers only (Sample Homeowner, 555 phones).
   State lives in localStorage "fb-board-v1": { appts: {id: appt}, seeded: {date: 1}, overrides: {date: {repId: "off"|[times]}}, needsRep: [] } */
(function () {
  var KEY = "fb-board-v1";
  var C = function () { return FutureBoardConfig.get(); };
  var DAYN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }
  function D(s) { return new Date(s + "T12:00:00Z"); }
  function addDays(s, n) { return iso(new Date(D(s).getTime() + n * 864e5)); }
  function dow(s) { return D(s).getUTCDay(); }
  function todayISO() { var n = new Date(); return n.getFullYear() + "-" + pad(n.getMonth() + 1) + "-" + pad(n.getDate()); }
  function weekStart(s) { var w = C().weekStartsOn || 0; return addDays(s, -((dow(s) - w + 7) % 7)); }
  function daysBetween(a, b) { return Math.round((D(b) - D(a)) / 864e5); }
  function fmtMD(s) { var d = D(s); return (d.getUTCMonth() + 1) + "/" + d.getUTCDate(); }
  function hm(t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; }
  function label12(t) { var m = hm(t), h = Math.floor(m / 60), mm = m % 60; return ((h + 11) % 12 + 1) + (mm ? ":" + pad(mm) : "") + " " + (h >= 12 ? "PM" : "AM"); }
  function slotLabel(t) { var h = Math.floor(hm(t) / 60); return String((h + 11) % 12 + 1); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var x = seed || 1; return function () { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

  /* ---------- store ---------- */
  var mem = null;
  function load() { if (mem) return mem; try { mem = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { mem = null; } mem = mem || {}; mem.appts = mem.appts || {}; mem.seeded = mem.seeded || {}; mem.overrides = mem.overrides || {}; mem.needsRep = mem.needsRep || []; return mem; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} listeners.forEach(function (f) { try { f(); } catch (e) {} }); }
  var listeners = [];
  function uid() { return "fb" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  /* ---------- config helpers ---------- */
  function product(code) { code = String(code || "").toUpperCase().trim(); return C().products.filter(function (p) { return p.code === code || (p.aliases || []).indexOf(code) >= 0; })[0]; }
  function normCode(code) { var p = product(code); return p ? p.code : String(code || "").toUpperCase(); }
  function repById(id) { return C().reps.filter(function (r) { return r.id === id; })[0]; }
  function repByName(n) { return C().reps.filter(function (r) { return r.name === n; })[0]; }
  function repsOn(date) { return C().reps.filter(function (r) { return (!r.from || date >= r.from) && (!r.to || date <= r.to); }); }
  function repsInWeek(ws) { var seen = {}, out = []; for (var i = 0; i < 7; i++) repsOn(addDays(ws, i)).forEach(function (r) { if (!seen[r.id]) { seen[r.id] = 1; out.push(r); } }); return out; }
  function sells(rep, code) { code = normCode(code); return rep.skills === "*" || (rep.skills || []).indexOf(code) >= 0; }
  function city(n) { var c = C().cities; if (c[n]) return c[n]; var k = Object.keys(c).filter(function (x) { return x.toLowerCase() === String(n || "").toLowerCase(); })[0]; return k ? c[k] : null; }
  function cityKey(n) { var c = C().cities; return Object.keys(c).filter(function (x) { return x.toLowerCase() === String(n || "").toLowerCase(); })[0] || n; }
  function isOff(rep, date, time) {
    if (!repsOn(date).some(function (r) { return r.id === rep.id; })) return true;
    var o = (load().overrides[date] || {})[rep.id];
    if (o === "off") return true;
    if (o === "on") return false;
    if (Array.isArray(o) && time && o.indexOf(time) >= 0) return true;
    var cfgO = (C().overrides[date] || {})[rep.id];
    if (cfgO === "off") return true;
    if (Array.isArray(cfgO) && time && cfgO.indexOf(time) >= 0) return true;
    if (cfgO === "on") return false;
    if ((rep.offDays || []).indexOf(dow(date)) >= 0) return true;
    return !!(time && (rep.offSlots || []).some(function (s) { return s.dow === dow(date) && s.time === time; }));
  }
  function slotFor(time) { var s = C().slots, m = hm(time), best = s[0]; s.forEach(function (x) { if (hm(x) <= m) best = x; }); return best; }

  /* ---------- drive time (approximate, no paid map API) ---------- */
  function km(a, b) { var R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r, x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2); return 2 * R * Math.asin(Math.sqrt(x)); }
  function driveMin(c1, c2) { var a = city(c1), b = city(c2); if (!a || !b) return null; var R = C().routing; return Math.round(km(a, b) * R.roadFactor / R.kmh * 60); }

  /* ---------- appointments ---------- */
  function apptsOn(date) { ensureSeeded(date); var A = load().appts; return Object.keys(A).map(function (k) { return A[k]; }).filter(function (a) { return a.date === date && a.status !== "cancelled"; }); }
  function cellAppt(date, time, repId) { return apptsOn(date).filter(function (a) { return a.time === time && a.repId === repId; })[0]; }
  function repDay(repId, date) { return apptsOn(date).filter(function (a) { return a.repId === repId && a.kind !== "note" && a.kind !== "backup"; }).sort(function (a, b) { return hm(a.at || a.time) - hm(b.at || b.time); }); }
  function cellText(a) {
    if (a.kind === "note") return a.note || "";
    if (a.kind === "backup") return "CONFIRMED BACKUP" + (a.note ? " " + a.note : "");
    var t = (a.prefix ? "(" + a.prefix + ") " : "") + [String(a.city || "").toUpperCase(), a.phone, a.product, a.setter].filter(Boolean).join(" ");
    return t + (a.note ? " " + a.note : "");
  }
  function cellStyle(a) {
    var col = C().colors;
    if (!a || a.kind === "note" || a.kind === "cb" || a.kind === "backup") return "";
    if (a.status === "unconfirmed") return "background:" + col.unconfirmedFill + ";color:" + col.unconfirmedText + ";";
    if (a.status === "confirmed") { var n = daysBetween(todayISO(), a.date); if (n < 0) return ""; n = Math.max(1, n); var f = col.confirmed[n]; if (f) return "background:" + f + ";color:" + (n === 1 ? "#fff" : "#111") + ";"; }
    return "";
  }
  function leadOffice(a) { var c = city(a.city); return c ? c.office : ""; }
  function mismatch(a) { var r = repById(a.repId); var lo = leadOffice(a); return !!(r && lo && r.office !== lo); }

  /* sample seeding: deterministic Sample Homeowner appts near today only; never real data */
  function ensureSeeded(date) {
    var db = load(); if (db.seeded[date]) return; db.seeded[date] = 1;
    var t = todayISO(), off = daysBetween(t, date), S = C().sample || {};
    if (off < -(S.pastDays || 0) || off > (S.futureDays || 0)) { save(); return; }
    var r = rng(hash(C().tenant + date)), cities = Object.keys(C().cities).filter(function (c) { return C().cities[c].office; }), prods = C().products.filter(function (p) { return p.code !== "RHASH"; }), setters = C().setters;
    var density = off < 0 ? 0.55 : Math.max(0.15, 0.55 - off * 0.04), n = 0;
    repsOn(date).forEach(function (rep) {
      var home = city(rep.home);
      C().slots.forEach(function (time) {
        if (isOff(rep, date, time) || r() > density) return;
        var near = cities.filter(function (c) { var m = driveMin(rep.home, c); return home && m != null && m <= 50; });
        var cName = (near.length ? near : cities)[Math.floor(r() * (near.length ? near.length : cities.length))];
        var ps = prods.filter(function (p) { return sells(rep, p.code); }), p = ps[Math.floor(r() * ps.length)] || prods[0];
        var st = setters[Math.floor(r() * setters.length)] || { initials: "" };
        var kind = r() < 0.06 ? "cb" : "appt", id = "seed-" + date + "-" + rep.id + "-" + time;
        var status = off < 0 ? "confirmed" : (r() < 0.5 ? "confirmed" : "unconfirmed");
        var a = { id: id, date: date, time: time, repId: rep.id, kind: kind, status: kind === "cb" ? "cb" : status, city: cName, phone: (S.phonePrefix || "555-01") + pad(10 + (n++ * 7 + Math.floor(r() * 80)) % 90), product: kind === "cb" ? "CB" : p.code, setter: st.initials, customer: "Sample Homeowner " + String.fromCharCode(65 + Math.floor(r() * 26)), sample: true };
        if (r() < 0.12 && kind === "appt") { a.prefix = label12(time.replace(":00", ":30")); a.at = time.replace(":00", ":30"); }
        db.appts[id] = a;
      });
    });
    save();
  }

  /* ---------- rep ranking ---------- */
  function rank(req) {
    var date = req.date, time = slotFor(req.time || "10:00"), code = normCode(req.product), maxLeg = C().routing.maxLegMinutes;
    var orig = req.rehashOf ? (repByName(req.rehashOf) || repById(req.rehashOf)) : null;
    return repsOn(date).map(function (rep) {
      var why = [], ok = true;
      if (isOff(rep, date, time)) { ok = false; why.push("off"); }
      else if (cellAppt(date, time, rep.id)) { ok = false; why.push("slot taken"); }
      if (code && !sells(rep, code)) { ok = false; why.push("doesn't sell " + code); }
      if (code === "RHASH" && orig && orig.id === rep.id) { ok = false; why.push("ran the original demo"); }
      var stops = repDay(rep.id, date).filter(function (a) { return a.id !== req.ignoreId; });
      var legs = stops.map(function (a) { return driveMin(a.city, req.city); }).filter(function (m) { return m != null; });
      var worst = legs.length ? Math.max.apply(null, legs) : driveMin(rep.home, req.city);
      var within = legs.length ? worst <= maxLeg : (worst == null || worst <= maxLeg * 2);
      if (legs.length && !within) why.push("~" + worst + " min from other stops");
      var lo = (city(req.city) || {}).office;
      return { rep: rep, ok: ok, within: within, minutes: worst == null ? 999 : worst, reasons: why, officeMismatch: !!(lo && lo !== rep.office) };
    }).sort(function (a, b) { return (b.ok - a.ok) || (b.within - a.within) || (a.officeMismatch - b.officeMismatch) || (a.minutes - b.minutes); });
  }

  /* book: { date, time ("14:30" ok), city, phone, product, setter, customer?, note?, repId?|repName? (manual override), rehashOf?, status? }
     returns { ok, appt?, error? }. Auto-picks the best rep unless overridden. Conflict check on the exact cell. */
  function book(req) {
    if (!req.date || !req.time) return { ok: false, error: "Pick a date and time" };
    var time = slotFor(req.time), code = normCode(req.product);
    var rep = req.repId ? repById(req.repId) : req.repName ? repByName(req.repName) : null;
    if (!rep) { var top = rank(req).filter(function (x) { return x.ok; })[0]; if (!top) return { ok: false, error: "No rep is open for that slot" }; rep = top.rep; }
    if (isOff(rep, req.date, time)) return { ok: false, error: rep.name + " is off for that slot" };
    if (cellAppt(req.date, time, rep.id)) return { ok: false, error: "That slot was just taken. Pick another slot or rep." };
    if (code === "RHASH" && req.rehashOf && (repByName(req.rehashOf) || repById(req.rehashOf) || {}).id === rep.id) return { ok: false, error: "A rehash must go to a different rep than the original demo" };
    var a = { id: uid(), date: req.date, time: time, repId: rep.id, kind: req.kind || "appt", status: req.status || "unconfirmed", city: cityKey(req.city || ""), phone: req.phone || "", product: code, setter: req.setter || "", customer: req.customer || "", note: req.note || "", rehashOf: req.rehashOf || "", source: req.source || "board" };
    if (req.time !== time) { a.prefix = label12(req.time); a.at = req.time; }
    load().appts[a.id] = a; save();
    return { ok: true, appt: a, rep: rep };
  }
  function update(id, patch) { var a = load().appts[id]; if (!a) return null; Object.keys(patch).forEach(function (k) { a[k] = patch[k]; }); save(); return a; }
  function move(id, date, time, repId) {
    var a = load().appts[id]; if (!a) return { ok: false, error: "Not found" };
    var rep = repById(repId); if (!rep) return { ok: false, error: "Pick a rep" };
    if (isOff(rep, date, time)) return { ok: false, error: rep.name + " is off for that slot" };
    var other = cellAppt(date, time, repId); if (other && other.id !== id) return { ok: false, error: "That slot was just taken. Pick another slot or rep." };
    if (a.product === "RHASH" && a.rehashOf && (repByName(a.rehashOf) || {}).id === repId) return { ok: false, error: "A rehash must go to a different rep than the original demo" };
    a.date = date; a.time = time; a.repId = repId; if (a.at && slotFor(a.at) !== time) { delete a.at; delete a.prefix; } save(); return { ok: true, appt: a };
  }
  function setOverride(date, repId, val) { var o = load().overrides; o[date] = o[date] || {}; if (val == null) delete o[date][repId]; else o[date][repId] = val; save(); }
  function markOffSlot(date, repId, time) { var o = load().overrides, cur = (o[date] || {})[repId]; var arr = Array.isArray(cur) ? cur.slice() : []; if (arr.indexOf(time) < 0) arr.push(time); setOverride(date, repId, arr); }
  /* rep out: mark off for the day and reassign every lead by the same rules; leftovers go to the "needs a rep" list */
  function repOut(date, repId) {
    var mine = repDay(repId, date); setOverride(date, repId, "off"); var moved = [], stuck = [];
    mine.forEach(function (a) {
      var c = rank({ date: date, time: a.time, city: a.city, product: a.product, rehashOf: a.rehashOf, ignoreId: a.id }).filter(function (x) { return x.ok && x.rep.id !== repId; })[0];
      if (c) { a.repId = c.rep.id; moved.push({ appt: a, to: c.rep.name }); } else { a.status = a.status; a.repId = ""; a.needsRep = true; stuck.push(a); }
    });
    save(); return { moved: moved, stuck: stuck };
  }
  function needsRep(date) { var A = load().appts; return Object.keys(A).map(function (k) { return A[k]; }).filter(function (a) { return a.date === date && a.needsRep && !a.repId && a.status !== "cancelled"; }); }
  function backupList(date) { return repsOn(date).filter(function (r) { return !isOff(r, date) && repDay(r.id, date).length === 0; }); }

  /* ---------- routes (recomputed on every render, so always reflect book/move/cancel/reassign) ---------- */
  function route(repId, date) {
    var rep = repById(repId), stops = repDay(repId, date), R = C().routing, legs = [], prev = rep ? { city: rep.home, t: null } : null;
    stops.forEach(function (a, i) {
      var from = i === 0 ? (rep && rep.home) : stops[i - 1].city, m = driveMin(from, a.city), gap = i === 0 ? null : hm(a.at || a.time) - hm(stops[i - 1].at || stops[i - 1].time) - C().apptMinutes;
      var flag = m == null ? "unknown" : m > R.maxLegMinutes ? "overlong" : (gap != null && m > gap) ? "tight" : "";
      legs.push({ from: from, to: a.city, minutes: m, gap: gap, flag: flag, appt: a, first: i === 0 });
    });
    var pts = [rep && rep.home].concat(stops.map(function (a) { return a.city; })).filter(Boolean);
    var url = pts.length > 1 ? "https://www.google.com/maps/dir/" + pts.map(function (p) { return encodeURIComponent(p + ", MI"); }).join("/") : "";
    return { rep: rep, date: date, stops: stops, legs: legs, mapsUrl: url, total: legs.reduce(function (s, l) { return s + (l.minutes || 0); }, 0) };
  }

  /* ================= UI ================= */
  var ui = { view: "week", anchor: null, day: null, weeks: [], root: null, office: null, dragId: null };
  function confirmAgeLabel(date) { var n = daysBetween(todayISO(), date); return n === 1 ? "NEXT DAY" : n === 2 ? "DAY 2" : n === 3 ? "DAY 3" : n === 0 ? "TODAY" : n < 0 ? "HISTORY" : ""; }
  function cellHtml(date, time, rep) {
    var a = cellAppt(date, time, rep.id), off = isOff(rep, date, time), base = 'class="board-cell fb-cell" data-date="' + date + '" data-time="' + time + '" data-rep="' + rep.id + '"';
    if (off && !a) return '<div ' + base + ' data-state="off" style="background:' + C().colors.off + ';" aria-label="' + esc(rep.name) + ' off"></div>';
    if (!a) return '<div ' + base + ' data-state="open"><button type="button" class="fb-open" data-fb-book aria-label="Book ' + esc(rep.name) + " " + fmtMD(date) + " " + label12(time) + '">Open</button></div>';
    var st = a.kind === "note" ? "note" : a.kind === "cb" ? "cb" : a.kind === "backup" ? "backup" : a.status;
    var flag = mismatch(a) ? '<span class="fb-flag" title="Lead office ' + esc(leadOffice(a)) + ' ≠ rep office ' + esc(rep.office) + '">⚑ ' + esc(leadOffice(a)) + "</span>" : "";
    return '<div ' + base + ' data-state="' + st + '" data-appt="' + a.id + '"><div class="slot fb-slot" draggable="true" data-fb-appt="' + a.id + '" tabindex="0" style="' + cellStyle(a) + '">' + esc(cellText(a)) + flag + "</div></div>";
  }
  function dayHtml(date, reps) {
    var age = confirmAgeLabel(date), backups = backupList(date), need = needsRep(date), isToday = date === todayISO();
    var head = '<div class="board-cell week-day-head fb-day-head' + (isToday ? " is-today" : "") + '" data-week-date="' + date + '" id="fb-day-' + date + '" style="grid-column:1 / -1;">' +
      "<strong>" + DAYN[dow(date)] + " " + fmtMD(date) + "/" + D(date).getUTCFullYear() + "</strong>" + (age ? ' <span class="week-age">' + age + "</span>" : "") +
      ' <button type="button" class="fb-mini" data-fb-routes="' + date + '">Routes</button>' +
      ' <select class="fb-mini" data-fb-repout="' + date + '" aria-label="Rep out on ' + date + '"><option value="">Rep out…</option>' + reps.filter(function (r) { return !isOff(r, date); }).map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + "</option>"; }).join("") + "</select>" +
      (backups.length ? ' <span class="fb-backups" data-fb-backups="' + date + '">Same-day / backup: ' + backups.map(function (r) { return esc(r.name); }).join(", ") + "</span>" : "") +
      (need.length ? ' <span class="fb-need">Needs a rep: ' + need.map(function (a) { return '<button type="button" class="fb-mini" data-fb-appt-open="' + a.id + '">' + esc(cellText(a)) + "</button>"; }).join(" ") + "</span>" : "") + "</div>";
    return head + C().slots.map(function (t) { return '<div class="board-cell time">' + slotLabel(t) + "</div>" + reps.map(function (r) { return cellHtml(date, t, r); }).join(""); }).join("");
  }
  function repHeads(reps) { return '<div class="board-cell head">Time</div>' + reps.map(function (r) { return '<div class="board-cell head board-rep-head" data-rep-head="' + r.id + '"><div class="rep-name">' + esc(r.name) + '</div><span class="rep-city">' + esc(r.office) + " · 🏠 " + esc(r.home) + "</span></div>"; }).join(""); }
  function weekHtml(ws) {
    var reps = repsInWeek(ws), days = [];
    for (var i = 0; i < 7; i++) days.push(addDays(ws, i));
    return '<section class="fb-week" data-week="' + ws + '"><h3 class="fb-week-title">Week of ' + fmtMD(ws) + " – " + fmtMD(addDays(ws, 6)) + "/" + D(addDays(ws, 6)).getUTCFullYear() + '</h3>' +
      '<div class="board-grid board-week-grid fb-grid" role="grid" aria-label="Future Board week of ' + ws + '" style="grid-template-columns:52px repeat(' + reps.length + ', minmax(128px,1fr));">' + repHeads(reps) + days.map(function (d) { return dayHtml(d, reps); }).join("") + "</div></section>";
  }
  function legend() {
    var c = C().colors;
    return '<div class="board-legend fb-legend" aria-label="Color legend">' +
      '<span><i class="legend-dot" style="background:' + c.off + '"></i>Rep off</span>' +
      '<span><i class="legend-dot" style="background:' + c.unconfirmedFill + ';box-shadow:inset 0 0 0 3px ' + c.unconfirmedText + '"></i>Unconfirmed</span>' +
      '<span><i class="legend-dot" style="background:' + c.confirmed[1] + '"></i>Confirmed · next day</span>' +
      '<span><i class="legend-dot" style="background:' + c.confirmed[2] + '"></i>Confirmed · day 2</span>' +
      '<span><i class="legend-dot" style="background:' + c.confirmed[3] + '"></i>Confirmed · day 3</span>' +
      '<span><i class="legend-dot" style="background:#fff;border:1px solid #999"></i>CB / note / open / later</span>' +
      '<span class="fb-flag">⚑</span> lead office ≠ rep office</div>';
  }
  function toolbar() {
    return '<div class="board-view-toggle" role="group" aria-label="Board view"><button type="button" data-fb-view="week" aria-pressed="' + (ui.view === "week") + '">Whole week</button><button type="button" data-fb-view="day" aria-pressed="' + (ui.view === "day") + '">Single day</button></div>' +
      '<div class="board-week-nav" role="group" aria-label="Navigate">' +
      '<button type="button" data-fb-nav="-1" aria-label="Previous ' + ui.view + '">‹ Prev</button>' +
      '<button type="button" data-fb-today>Today</button>' +
      '<button type="button" data-fb-nav="1" aria-label="Next ' + ui.view + '">Next ›</button>' +
      '<label class="fb-jump">Jump to <input type="date" id="fb-jump" value="' + (ui.view === "day" ? ui.day : ui.anchor) + '"></label>' +
      '<strong class="board-week-label" id="fb-label"></strong>' +
      '<button type="button" class="btn btn-primary fb-book-btn" data-fb-new>+ Book appointment</button></div>';
  }
  function render(root, opts) {
    ui.root = root || ui.root; opts = opts || {};
    if (!ui.anchor) { ui.anchor = weekStart(todayISO()); ui.day = todayISO(); }
    var html = toolbar() + legend() + '<div class="board-scroll board-week-scroll fb-scroll" id="fb-scroll">';
    if (ui.view === "week") { ui.weeks = [addDays(ui.anchor, -7), ui.anchor, addDays(ui.anchor, 7)]; html += '<div class="fb-sentinel" data-fb-more="up">Loading earlier weeks…</div><div id="fb-weeks">' + ui.weeks.map(weekHtml).join("") + '</div><div class="fb-sentinel" data-fb-more="down">Loading later weeks…</div>'; }
    else { var reps = repsOn(ui.day); html += '<section class="fb-week fb-single" data-day="' + ui.day + '"><div class="board-grid fb-grid" role="grid" aria-label="Future Board ' + ui.day + '" style="grid-template-columns:52px repeat(' + reps.length + ', minmax(128px,1fr));">' + repHeads(reps) + dayHtml(ui.day, reps) + "</div></section>"; }
    html += "</div><p class=\"fb-foot\">Sunday–Saturday period weeks generate themselves from the rep schedule; no board to create. Sample Homeowner customers and 555 numbers only.</p>";
    ui.root.innerHTML = html; setLabel(); bind();
    if (ui.view === "week") { var sc = ui.root.querySelector("#fb-scroll"), tgt = ui.root.querySelector('[data-week="' + ui.anchor + '"]'); if (sc && tgt) sc.scrollTop += tgt.getBoundingClientRect().top - sc.getBoundingClientRect().top; if (opts.focusDate) scrollToDate(opts.focusDate); else if (ui.anchor === weekStart(todayISO())) scrollToDate(todayISO()); setTimeout(observe, 50); }
  }
  function setLabel() { var l = ui.root && ui.root.querySelector("#fb-label"); if (!l) return; l.textContent = ui.view === "day" ? DAYN[dow(ui.day)] + " " + fmtMD(ui.day) + "/" + D(ui.day).getUTCFullYear() : "Week of " + fmtMD(ui.anchor) + " – " + fmtMD(addDays(ui.anchor, 6)) + "/" + D(addDays(ui.anchor, 6)).getUTCFullYear(); }
  function addWeek(dir) {
    var box = ui.root.querySelector("#fb-weeks"), sc = ui.root.querySelector("#fb-scroll"); if (!box) return;
    if (dir > 0) { var w = addDays(ui.weeks[ui.weeks.length - 1], 7); ui.weeks.push(w); box.insertAdjacentHTML("beforeend", weekHtml(w)); }
    else { var w2 = addDays(ui.weeks[0], -7), h0 = sc.scrollHeight; ui.weeks.unshift(w2); box.insertAdjacentHTML("afterbegin", weekHtml(w2)); sc.scrollTop += sc.scrollHeight - h0; }
  }
  var io = null;
  function observe() {
    if (io) io.disconnect(); if (!("IntersectionObserver" in window)) return;
    var sc = ui.root.querySelector("#fb-scroll");
    io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) addWeek(e.target.getAttribute("data-fb-more") === "down" ? 1 : -1); }); trackAnchor(); }, { root: sc, rootMargin: "400px 0px" });
    ui.root.querySelectorAll("[data-fb-more]").forEach(function (s) { io.observe(s); });
    sc.addEventListener("scroll", trackAnchor, { passive: true });
  }
  function trackAnchor() { var sc = ui.root.querySelector("#fb-scroll"); if (!sc) return; var top = sc.getBoundingClientRect().top + 60, cur = ui.anchor; ui.root.querySelectorAll(".fb-week[data-week]").forEach(function (s) { if (s.getBoundingClientRect().top <= top) cur = s.getAttribute("data-week"); }); if (cur !== ui.anchor) { ui.anchor = cur; setLabel(); var j = ui.root.querySelector("#fb-jump"); if (j) j.value = cur; } }
  function scrollToDate(date) {
    var sc = ui.root.querySelector("#fb-scroll"), ws = weekStart(date);
    if (ui.weeks.indexOf(ws) < 0) { ui.anchor = ws; render(ui.root, { focusDate: date === ws ? null : date }); return; }
    var el = ui.root.querySelector("#fb-day-" + date) || ui.root.querySelector('[data-week="' + ws + '"]'); if (sc && el) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - (el.classList.contains("fb-day-head") ? 56 : 0);
    ui.anchor = ws; setLabel();
  }
  function rerender() { if (!ui.root || !document.body.contains(ui.root)) return; var sc = ui.root.querySelector("#fb-scroll"), st = sc ? sc.scrollTop : 0, sl = sc ? sc.scrollLeft : 0; if (ui.view === "week") { var box = ui.root.querySelector("#fb-weeks"); box.innerHTML = ui.weeks.map(weekHtml).join(""); bindCells(); } else render(); sc = ui.root.querySelector("#fb-scroll"); if (sc) { sc.scrollTop = st; sc.scrollLeft = sl; } }

  function bind() {
    var R = ui.root;
    R.querySelectorAll("[data-fb-view]").forEach(function (b) { b.onclick = function () { ui.view = b.getAttribute("data-fb-view"); if (ui.view === "day" && weekStart(ui.day) !== ui.anchor) ui.day = ui.anchor <= todayISO() && todayISO() <= addDays(ui.anchor, 6) ? todayISO() : addDays(ui.anchor, 1); render(); }; });
    R.querySelectorAll("[data-fb-nav]").forEach(function (b) { b.onclick = function () { var v = +b.getAttribute("data-fb-nav"); if (ui.view === "day") { ui.day = addDays(ui.day, v); render(); } else scrollToDate(addDays(ui.anchor, 7 * v)); }; });
    R.querySelector("[data-fb-today]").onclick = function () { ui.day = todayISO(); if (ui.view === "day") render(); else scrollToDate(todayISO()); };
    R.querySelector("#fb-jump").onchange = function (e) { var v = e.target.value; if (!v) return; ui.day = v; if (ui.view === "day") render(); else { ui.anchor = weekStart(v); render(null, { focusDate: v }); } };
    R.querySelector("[data-fb-new]").onclick = function () { bookDialog({ date: ui.view === "day" ? ui.day : (ui.anchor < todayISO() && todayISO() <= addDays(ui.anchor, 6) ? addDays(todayISO(), 1) : addDays(ui.anchor, 1)), time: "14:00" }); };
    bindCells();
  }
  function bindCells() {
    var R = ui.root;
    R.querySelectorAll("[data-fb-book]").forEach(function (b) { b.onclick = function () { var c = b.closest(".fb-cell"); bookDialog({ date: c.dataset.date, time: c.dataset.time, repId: c.dataset.rep }); }; });
    R.querySelectorAll("[data-fb-appt]").forEach(function (el) {
      el.onclick = function () { cellMenu(el.getAttribute("data-fb-appt")); };
      el.onkeydown = function (e) { if (e.key === "Enter") cellMenu(el.getAttribute("data-fb-appt")); };
      el.ondragstart = function (e) { ui.dragId = el.getAttribute("data-fb-appt"); e.dataTransfer.setData("text/plain", ui.dragId); };
    });
    R.querySelectorAll('.fb-cell[data-state="open"]').forEach(function (c) {
      c.ondragover = function (e) { e.preventDefault(); c.classList.add("fb-drop"); };
      c.ondragleave = function () { c.classList.remove("fb-drop"); };
      c.ondrop = function (e) { e.preventDefault(); var id = (e.dataTransfer && e.dataTransfer.getData("text/plain")) || ui.dragId; var r = move(id, c.dataset.date, c.dataset.time, c.dataset.rep); if (!r.ok) toast(r.error, true); else toast("Moved"); rerender(); };
    });
    R.querySelectorAll("[data-fb-routes]").forEach(function (b) { b.onclick = function () { routesDialog(b.getAttribute("data-fb-routes")); }; });
    R.querySelectorAll("[data-fb-repout]").forEach(function (s) { s.onchange = function () { if (!s.value) return; var rep = repById(s.value), r = repOut(s.getAttribute("data-fb-repout"), s.value); toast(rep.name + " out: " + r.moved.length + " reassigned" + (r.stuck.length ? ", " + r.stuck.length + " need a rep" : "")); rerender(); }; });
    R.querySelectorAll("[data-fb-appt-open]").forEach(function (b) { b.onclick = function () { moveDialog(b.getAttribute("data-fb-appt-open")); }; });
  }

  /* ---------- dialogs ---------- */
  function dlg(id, title, body, foot) {
    var old = document.getElementById(id); if (old) old.remove();
    var w = document.createElement("div"); w.className = "fb-modal-wrap"; w.id = id;
    w.innerHTML = '<div class="fb-modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="fb-modal-head"><h3>' + esc(title) + '</h3><button type="button" class="fb-x" data-fb-close aria-label="Close">×</button></div><div class="fb-modal-body">' + body + '</div><div class="fb-modal-foot">' + (foot || "") + "</div></div>";
    document.body.appendChild(w);
    w.addEventListener("click", function (e) { if (e.target === w || e.target.closest("[data-fb-close]")) w.remove(); });
    return w;
  }
  function toast(msg, bad) { var t = document.getElementById("fb-toast"); if (!t) { t = document.createElement("div"); t.id = "fb-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = msg; t.className = "fb-toast show" + (bad ? " bad" : ""); clearTimeout(t._h); t._h = setTimeout(function () { t.className = "fb-toast"; }, 3200); }
  function opt(v, l, sel) { return '<option value="' + esc(v) + '"' + (sel ? " selected" : "") + ">" + esc(l) + "</option>"; }
  function times() { var out = []; C().slots.forEach(function (t) { out.push(t); out.push(t.replace(":00", ":30")); }); return out; }
  function suggestHtml(req) {
    if (!req.city) return '<p class="fb-muted">Pick a city to see rep suggestions.</p>';
    return '<ol class="fb-suggest" id="fb-suggest">' + rank(req).map(function (x, i) {
      return '<li data-rep="' + x.rep.id + '" class="' + (x.ok ? (x.within ? "ok" : "warn") : "no") + '"><strong>' + esc(x.rep.name) + "</strong> · " + esc(x.rep.office) + (x.ok ? " · open" : "") + (x.minutes < 999 ? " · ~" + x.minutes + " min" : "") + (x.officeMismatch ? ' · <span class="fb-flag">⚑ office</span>' : "") + (x.reasons.length ? " · " + esc(x.reasons.join(", ")) : "") + (i === 0 && x.ok ? " · <em>best</em>" : "") + "</li>";
    }).join("") + "</ol>";
  }
  function bookDialog(pre) {
    var c = C(), cities = Object.keys(c.cities).sort();
    var body = '<div class="fb-form">' +
      '<label>Date<input type="date" id="fb-b-date" value="' + esc(pre.date) + '"></label>' +
      '<label>Time<select id="fb-b-time">' + times().map(function (t) { return opt(t, label12(t), t === pre.time); }).join("") + "</select></label>" +
      '<label>City<select id="fb-b-city"><option value="">Pick a city</option>' + cities.map(function (x) { return opt(x, x + " (" + c.cities[x].office + ")", x === pre.city); }).join("") + "</select></label>" +
      '<label>Phone<input id="fb-b-phone" value="' + esc(pre.phone || "555-01" + pad(10 + Math.floor(Math.random() * 89))) + '" placeholder="555-0101"></label>' +
      '<label>Product<select id="fb-b-prod">' + c.products.map(function (p) { return opt(p.code, p.code + " · " + p.label, p.code === (pre.product || "WIN")); }).join("") + "</select></label>" +
      '<label>Setter<select id="fb-b-setter">' + c.setters.map(function (s) { return opt(s.initials, s.name + " (" + s.initials + ")", s.initials === pre.setter); }).join("") + "</select></label>" +
      '<label id="fb-b-rh-wrap" hidden>Original demo rep<select id="fb-b-rehash"><option value="">Pick</option>' + c.reps.map(function (r) { return opt(r.name, r.name); }).join("") + "</select></label>" +
      '<label>Note<input id="fb-b-note" placeholder="e.g. W/I 90 MINS GR"></label>' +
      '<label>Rep<select id="fb-b-rep"><option value="">Auto: best rep</option>' + c.reps.map(function (r) { return opt(r.id, r.name, r.id === pre.repId); }).join("") + "</select></label>" +
      '</div><h4>Rep suggestions</h4><div id="fb-b-sug"></div><p class="fb-err" id="fb-b-err" role="alert"></p>';
    var w = dlg("fb-book", "Book appointment", body, '<button type="button" class="btn btn-secondary" data-fb-close>Cancel</button><button type="button" class="btn btn-primary" id="fb-b-save">Book</button>');
    function req() { return { date: w.querySelector("#fb-b-date").value, time: w.querySelector("#fb-b-time").value, city: w.querySelector("#fb-b-city").value, phone: w.querySelector("#fb-b-phone").value.trim(), product: w.querySelector("#fb-b-prod").value, setter: w.querySelector("#fb-b-setter").value, note: w.querySelector("#fb-b-note").value.trim().toUpperCase(), repId: w.querySelector("#fb-b-rep").value, rehashOf: w.querySelector("#fb-b-rehash").value }; }
    function refresh() { var r = req(); w.querySelector("#fb-b-rh-wrap").hidden = r.product !== "RHASH"; w.querySelector("#fb-b-sug").innerHTML = suggestHtml(r); }
    w.querySelectorAll("input,select").forEach(function (el) { el.addEventListener("change", refresh); });
    refresh();
    w.querySelector("#fb-b-save").onclick = function () {
      var r = req(), err = w.querySelector("#fb-b-err");
      if (!r.city) { err.textContent = "Pick a city"; return; }
      if (!/^555-\d{4}$/.test(r.phone)) { err.textContent = "Sandbox phones must be 555-xxxx"; return; }
      if (r.product === "RHASH" && !r.rehashOf) { err.textContent = "Pick the rep who ran the original demo"; return; }
      r.customer = "Sample Homeowner"; r.source = "board";
      var res = book(r); if (!res.ok) { err.textContent = res.error; refresh(); return; }
      w.remove(); toast("Booked with " + res.rep.name + " · unconfirmed"); rerender();
    };
  }
  function cellMenu(id) {
    var a = load().appts[id]; if (!a) return; var rep = repById(a.repId);
    var body = '<p class="fb-cell-preview" style="' + cellStyle(a) + '">' + esc(cellText(a)) + "</p>" +
      "<p>" + esc(rep ? rep.name + " (" + rep.office + ")" : "No rep") + " · " + DAYN[dow(a.date)] + " " + fmtMD(a.date) + " · " + label12(a.at || a.time) + (a.customer ? " · " + esc(a.customer) : "") + (mismatch(a) ? ' · <span class="fb-flag">⚑ lead office ' + esc(leadOffice(a)) + "</span>" : "") + "</p>" +
      '<div class="fb-actions">' +
      (a.kind === "appt" ? '<button type="button" class="btn btn-secondary" data-a="confirm">Mark confirmed</button><button type="button" class="btn btn-secondary" data-a="unconfirm">Mark unconfirmed</button>' : "") +
      '<button type="button" class="btn btn-secondary" data-a="move">Move / rebook</button>' +
      '<button type="button" class="btn btn-secondary" data-a="offslot">Cancel + mark rep off this slot</button>' +
      '<button type="button" class="btn btn-danger" data-a="cancel">Cancel appointment</button></div>';
    var w = dlg("fb-cell", "Board cell", body);
    w.querySelectorAll("[data-a]").forEach(function (b) { b.onclick = function () {
      var k = b.getAttribute("data-a");
      if (k === "confirm") update(id, { status: "confirmed" }); else if (k === "unconfirm") update(id, { status: "unconfirmed" });
      else if (k === "cancel") update(id, { status: "cancelled" });
      else if (k === "offslot") { update(id, { status: "cancelled" }); markOffSlot(a.date, a.repId, a.time); }
      else if (k === "move") { w.remove(); moveDialog(id); return; }
      w.remove(); toast(b.textContent); rerender();
    }; });
  }
  function moveDialog(id) {
    var a = load().appts[id]; if (!a) return;
    var body = '<div class="fb-form"><label>Date<input type="date" id="fb-m-date" value="' + a.date + '"></label><label>Slot<select id="fb-m-time">' + C().slots.map(function (t) { return opt(t, label12(t), t === a.time); }).join("") + '</select></label><label>Rep<select id="fb-m-rep">' + C().reps.map(function (r) { return opt(r.id, r.name, r.id === a.repId); }).join("") + '</select></label></div><h4>Rep suggestions</h4><div id="fb-m-sug"></div><p class="fb-err" id="fb-m-err" role="alert"></p>';
    var w = dlg("fb-move", "Move / rebook · " + cellText(a), body, '<button type="button" class="btn btn-secondary" data-fb-close>Cancel</button><button type="button" class="btn btn-primary" id="fb-m-save">Move</button>');
    function refresh() { w.querySelector("#fb-m-sug").innerHTML = suggestHtml({ date: w.querySelector("#fb-m-date").value, time: w.querySelector("#fb-m-time").value, city: a.city, product: a.product, rehashOf: a.rehashOf, ignoreId: a.id }); }
    w.querySelectorAll("input,select").forEach(function (el) { el.addEventListener("change", refresh); }); refresh();
    w.querySelector("#fb-m-save").onclick = function () { var r = move(id, w.querySelector("#fb-m-date").value, w.querySelector("#fb-m-time").value, w.querySelector("#fb-m-rep").value); if (!r.ok) { w.querySelector("#fb-m-err").textContent = r.error; return; } delete r.appt.needsRep; save(); w.remove(); toast("Moved"); rerender(); };
  }
  function routesDialog(date) {
    var reps = repsOn(date).filter(function (r) { return repDay(r.id, date).length; });
    var body = reps.length ? reps.map(function (r) {
      var R = route(r.id, date), pts = [r.home].concat(R.stops.map(function (s) { return s.city; })).map(city).filter(Boolean);
      var la = pts.map(function (p) { return p.lat; }), lo = pts.map(function (p) { return p.lng; }), a0 = Math.min.apply(null, la), a1 = Math.max.apply(null, la), o0 = Math.min.apply(null, lo), o1 = Math.max.apply(null, lo);
      var X = function (p) { return 10 + (o1 - o0 ? (p.lng - o0) / (o1 - o0) : 0.5) * 180; }, Y = function (p) { return 10 + (a1 - a0 ? (a1 - p.lat) / (a1 - a0) : 0.5) * 80; };
      var svg = '<svg class="fb-map" viewBox="0 0 200 100" aria-hidden="true"><polyline fill="none" stroke="#1d4ed8" stroke-width="1.5" points="' + pts.map(function (p) { return X(p).toFixed(1) + "," + Y(p).toFixed(1); }).join(" ") + '"/>' + pts.map(function (p, i) { return '<circle cx="' + X(p).toFixed(1) + '" cy="' + Y(p).toFixed(1) + '" r="3.5" fill="' + (i ? "#C00000" : "#111") + '"/><text x="' + (X(p) + 5).toFixed(1) + '" y="' + (Y(p) - 4).toFixed(1) + '" font-size="7">' + (i || "H") + "</text>"; }).join("") + "</svg>";
      return '<section class="fb-route" data-route-rep="' + r.id + '"><h4>' + esc(r.name) + " · " + esc(r.office) + " · ~" + R.total + " min driving</h4>" + svg + "<ol>" +
        R.legs.map(function (l) { return '<li class="fb-leg ' + l.flag + '"><span class="fb-leg-drive">' + esc(l.from) + " → " + esc(l.to) + " · ~" + (l.minutes == null ? "?" : l.minutes) + " min" + (l.flag === "tight" ? " · TIGHT (" + l.gap + " min between visits)" : l.flag === "overlong" ? " · OVER " + C().routing.maxLegMinutes + " MIN" : "") + "</span><br><strong>" + label12(l.appt.at || l.appt.time) + "</strong> " + esc(cellText(l.appt)) + "</li>"; }).join("") +
        "</ol>" + (R.mapsUrl ? '<a href="' + R.mapsUrl + '" target="_blank" rel="noopener noreferrer" class="fb-maps">Open directions in Google Maps</a>' : "") + "</section>";
    }).join("") : '<p class="fb-muted">No appointments this day.</p>';
    dlg("fb-routes", "Routes · " + DAYN[dow(date)] + " " + fmtMD(date), body);
  }

  window.FutureBoard = {
    render: render, rerender: rerender, book: book, rank: rank, move: move, update: update, repOut: repOut, route: route,
    markOffSlot: markOffSlot, setOverride: setOverride, isOff: function (repId, date, time) { return isOff(repById(repId), date, time); },
    apptsOn: apptsOn, cellAppt: cellAppt, cellText: cellText, backupList: backupList, needsRep: needsRep, repsOn: repsOn,
    issueBackup: function (date, time, repId) { return book({ date: date, time: time, repId: repId, kind: "backup", status: "backup" }); },
    slotFor: slotFor, driveMin: driveMin, weekStart: weekStart, today: todayISO, onChange: function (f) { listeners.push(f); },
    _reset: function () { mem = null; localStorage.removeItem(KEY); }, ui: ui
  };
})();
