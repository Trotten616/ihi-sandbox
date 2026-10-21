/* Jobs hub (generic template): MAIN MENU (Board · Board Search · Service · Costs · Contracts · Deposits · Reports),
   the BOARD record form, the SERVICE ticket form, spreadsheet-style search grids (click header to sort A→Z / Z→A,
   per-column text filter, select checkbox, double-click to open), and simple sample reports.
   Layout mirrors the office jobs database: colored section blocks, ALL-CAPS labels, dense 3-column forms.
   Sample data only. Files are kept in this browser only. "Notify customer" only previews; nothing is sent. */
(function () {
  var I = function () { return JobsBoard._int; }, C = function () { return I().cfg(); };
  var esc = function (s) { return I().esc(s); }, money = function (n) { return I().money(n); }, fmt = function (d) { return I().fmt(d); };
  var ui = { view: "board", sort: {}, filt: {}, sel: {} };
  var FKEY = "jobs-files-v1";
  function db() { var m = I().load(); m.svc = m.svc || null; if (!m.svc) seedSvc(m); return m; }
  function n(v) { return +v || 0; }
  function user() { var u = window.IHIApp && IHIApp.currentUser ? IHIApp.currentUser() : null; return (u && u.name) || "Sandbox user"; }

  /* ---------- job defaults (fills Access-style fields from the list fields, once) ---------- */
  function ensure(j) {
    if (j._ax) return j;
    var p = String(j.customer || "").split(" "), r = I().rng(parseInt(String(j.id).replace(/\D/g, ""), 10) || 5);
    j.first = j.first || p[0] || ""; j.last = j.last || p.slice(1).join(" ");
    j.address = j.address || (100 + Math.floor(r() * 9800)) + " Sample " + ["St", "Ave", "Dr", "Ln", "Ct"][Math.floor(r() * 5)];
    j.state = j.state || "MI"; j.altPhone = j.altPhone || ""; j.email = j.email || (j.first + "." + j.last).toLowerCase().replace(/[^a-z.]/g, "") + "@example.com";
    j.types = j.types || { Retail: true };
    j.items = j.items || {}; var it = C().itemOf ? C().itemOf(j.trade) : null; if (it) j.items[it] = true;
    j.tasks = j.tasks || {}; j.parts = j.parts || {}; j.dateSold = j.dateSold || I().addDays(j.projStart, -(14 + Math.floor(r() * 30)));
    j.measureDate = j.measureDate || I().addDays(j.dateSold, 3); j.measureBy = j.measureBy || j.salesman; j.schedDate = j.schedDate || j.projStart; j.schedTime = j.schedTime || "8:00 AM";
    var gross = j.sale || 0; j.fin = j.fin || { gross: gross, down: Math.round(gross * 0.3), addon: 0, final: j.stage === "completed" ? gross - Math.round(gross * 0.3) : 0, financed: 0 };
    var cost = j.cost || 0; j.prof = j.prof || { material: Math.round(cost * 0.55), labor: Math.round(cost * 0.3), commission: Math.round(gross * 0.1), other: Math.max(0, cost - Math.round(cost * 0.55) - Math.round(cost * 0.3) - Math.round(gross * 0.1)) };
    j.warranty = j.warranty || { reported: "", resolved: "", notes: "" }; j.notes = j.notes || []; j.files = j.files || [];
    j.dateEntered = j.dateEntered || j.dateSold; j._ax = 1; return j;
  }
  function calc(j) {
    var f = j.fin, p = j.prof, sale = n(f.gross) + n(f.addon), cost = n(p.material) + n(p.labor) + n(p.commission) + n(p.other);
    return { balance: sale - n(f.down) - n(f.final) - n(f.financed), sale: sale, cost: cost, net: sale - cost, margin: sale ? (sale - cost) / sale : 0 };
  }
  function jobs() { return I().all().map(ensure); }
  function job(id) { var m = I().load(); return m.jobs[id] ? ensure(m.jobs[id]) : null; }

  /* ---------- service tickets ---------- */
  function seedSvc(m) {
    m.svc = {}; var done = Object.keys(m.jobs).map(function (k) { return ensure(m.jobs[k]); }).filter(function (j) { return j.stage === "completed"; }).slice(0, 8), st = C().serviceStatuses;
    done.forEach(function (j, i) { var t = newTicket(j); t.id = "S-" + (1001 + i); t.status = st[i % st.length]; t.description = ["Leak at chimney flashing after heavy rain", "Window sash sticks, hard to open", "Gutter pulling away at corner", "Siding panel loose on north wall", "Door threshold gap, draft", "Seal failure, fogging between panes", "Downspout clog / overflow", "Trim nail pops"][i % 8]; t.tech = C().techs[i % C().techs.length]; t.schedDate = I().addDays(I().todayISO(), i - 3); t.dateEntered = I().addDays(I().todayISO(), -(i * 4 + 2)); if (t.status === "CLOSED") { t.complete = true; t.resolved = true; t.dateCompleted = I().addDays(I().todayISO(), -i); } m.svc[t.id] = t; });
    I().save();
  }
  function newTicket(j) {
    j = j || {}; return { id: "", jobId: j.id || "", first: j.first || "", last: j.last || "", address: j.address || "", city: j.city || "", state: j.state || "MI", zip: j.zip || "", phone: j.phone || "", altPhone: "", email: j.email || "",
      types: { Warranty: true }, status: "OPEN", complete: false, description: "", dateCompleted: "", parts: {}, tech: "", schedDate: "", time: "", resolution: "", needsFollowUp: false, resolved: false, items: Object.assign({}, j.items || {}),
      orig: { rep: j.salesman || "", jobNo: j.id || "", dateSold: j.dateSold || "", total: j.fin ? calc(j).sale : 0, finished: j.stage === "completed" ? j.projFinish : "" }, files: [], notes: [], dateEntered: I().todayISO() };
  }
  function tickets() { var m = db(); return Object.keys(m.svc).map(function (k) { return m.svc[k]; }); }

  /* ---------- files (browser only) ---------- */
  function files() { try { return JSON.parse(localStorage.getItem(FKEY)) || {}; } catch (e) { return {}; } }
  function putFile(key, f, cb) {
    if (f.size > 700 * 1024) { I().toast("Sandbox limit: files up to 700 KB (kept in this browser only)"); return; }
    var rd = new FileReader(); rd.onload = function () { var all = files(); (all[key] = all[key] || []).push({ id: "F" + Date.now().toString(36), name: f.name, type: f.type, size: f.size, data: rd.result, at: I().todayISO() }); try { localStorage.setItem(FKEY, JSON.stringify(all)); } catch (e) { I().toast("Browser storage is full"); return; } cb(); }; rd.readAsDataURL(f);
  }
  function delFile(key, id) { var all = files(); all[key] = (all[key] || []).filter(function (x) { return x.id !== id; }); localStorage.setItem(FKEY, JSON.stringify(all)); }

  /* ---------- UI helpers ---------- */
  function opts(list, sel, any) { return I().opts(list, sel, any); }
  function inp(k, v, type, extra) { return '<input class="ax-in" data-k="' + k + '" type="' + (type || "text") + '" value="' + esc(v == null ? "" : v) + '"' + (extra || "") + ">"; }
  function fld(label, html, wide) { return '<label class="ax-f' + (wide ? " wide" : "") + '"><span>' + esc(label.toUpperCase()) + "</span>" + html + "</label>"; }
  function chk(k, on, label) { return '<label class="ax-chk"><input type="checkbox" data-k="' + k + '"' + (on ? " checked" : "") + "> " + esc(label.toUpperCase()) + "</label>"; }
  function block(title, color, body, cls) { return '<section class="ax-block ax-' + color + (cls ? " " + cls : "") + '"><h4>' + esc(title) + '</h4><div class="ax-body">' + body + "</div></section>"; }
  function get(o, path) { return path.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function set(o, path, v) { var ks = path.split("."), last = ks.pop(); var t = ks.reduce(function (a, k) { a[k] = a[k] || {}; return a[k]; }, o); t[last] = v; }
  function readForm(w, o) { w.querySelectorAll("[data-k]").forEach(function (el) { var k = el.getAttribute("data-k"); var v = el.type === "checkbox" ? el.checked : el.type === "number" ? (el.value === "" ? 0 : +el.value) : el.value; set(o, k, v); }); return o; }
  function customerBlock(o) {
    return block("CUSTOMER", "navy", '<div class="ax-g2">' + fld("First Name", inp("first", o.first)) + fld("Last Name", inp("last", o.last)) + fld("Address", inp("address", o.address), true) + fld("City", inp("city", o.city)) + fld("State", inp("state", o.state)) + fld("Zip", inp("zip", o.zip)) + fld("Primary Phone", inp("phone", o.phone)) + fld("Alt Phone", inp("altPhone", o.altPhone)) + fld("Email", inp("email", o.email, "email"), true) + "</div>");
  }
  function partsBlock(o) { var p = o.parts || {}; return block("PARTS", "yellow", '<div class="ax-g2">' + fld("Vendor", '<select class="ax-in" data-k="parts.vendor">' + opts(C().vendors, p.vendor, "—") + "</select>") + fld("PO Number", inp("parts.po", p.po)) + fld("Order Date", inp("parts.orderDate", p.orderDate, "date")) + fld("Est Arrival", inp("parts.eta", p.eta, "date")) + fld("Date Received", inp("parts.received", p.received, "date")) + "</div>"); }
  function itemsBlock(o) { return '<div class="ax-sub">ITEMS INVOLVED</div><div class="ax-chks">' + C().items.map(function (x) { return chk("items." + x, (o.items || {})[x], x); }).join("") + "</div>"; }
  function filesBlock(key) {
    var list = files()[key] || [];
    return block("PICTURES / DOCUMENTS", "navy", '<div class="ax-files">' + (list.length ? list.map(function (f) { return '<div class="ax-file" data-file="' + f.id + '">' + (/^image\//.test(f.type) ? '<img src="' + f.data + '" alt="">' : '<span class="ax-doc">📄</span>') + '<a href="' + f.data + '" download="' + esc(f.name) + '">' + esc(f.name) + '</a><button type="button" class="ax-x" data-del-file="' + f.id + '" aria-label="Remove ' + esc(f.name) + '">×</button></div>'; }).join("") : '<p class="ax-muted">No files yet.</p>') +
      '</div><label class="btn btn-secondary ax-attach">📎 Attach files<input type="file" multiple hidden data-attach="' + esc(key) + '"></label><p class="ax-muted">Kept in this browser only (sandbox).</p>', "ax-wide");
  }
  function notesBlock(title, o) {
    return block(title, "gray", '<table class="ax-log"><thead><tr><th>ID</th><th>DATE</th><th>NOTE</th><th>USER</th></tr></thead><tbody>' + (o.notes.length ? o.notes.map(function (x) { return "<tr><td>" + x.id + "</td><td>" + fmt(x.date) + "</td><td>" + esc(x.text) + "</td><td>" + esc(x.user) + "</td></tr>"; }).join("") : '<tr><td colspan="4" class="ax-muted">No notes yet.</td></tr>') +
      '</tbody></table><div class="ax-addnote"><input class="ax-in" id="ax-note" placeholder="Add a note…" aria-label="New note"><button type="button" class="btn btn-secondary" data-add-note>+ Add note</button></div>', "ax-wide");
  }
  function modal(id, title, body, foot) {
    var old = document.getElementById(id); if (old) old.remove();
    var w = document.createElement("div"); w.className = "fb-modal-wrap ax-wrap"; w.id = id;
    w.innerHTML = '<div class="fb-modal ax-modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="fb-modal-head ax-head"><h3>' + esc(title) + '</h3><button type="button" class="fb-x" data-close aria-label="Close">×</button></div><div class="fb-modal-body">' + body + '</div><div class="fb-modal-foot ax-foot">' + (foot || "") + "</div></div>";
    document.body.appendChild(w); w.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) w.remove(); });
    return w;
  }
  function live(w, o, recalc) { w.querySelectorAll("[data-k]").forEach(function (el) { el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", function () { readForm(w, o); recalc && recalc(); }); }); }
  function wireFilesNotes(w, key, o, rerender) {
    var at = w.querySelector("[data-attach]"); if (at) at.onchange = function () { var fs = [].slice.call(at.files), left = fs.length; if (!left) return; fs.forEach(function (f) { putFile(key, f, function () { if (--left <= 0) rerender(); }); }); };
    w.querySelectorAll("[data-del-file]").forEach(function (b) { b.onclick = function () { delFile(key, b.getAttribute("data-del-file")); rerender(); }; });
    var an = w.querySelector("[data-add-note]"); if (an) an.onclick = function () { var t = w.querySelector("#ax-note").value.trim(); if (!t) return; readForm(w, o); o.notes.push({ id: o.notes.length + 1, date: I().todayISO(), text: t, user: user() }); rerender(); };
  }

  /* ---------- BOARD record form ---------- */
  function openJob(id, draft) {
    var m = I().load(), isNew = !id, src = id ? job(id) : null;
    var o = draft || JSON.parse(JSON.stringify(src || ensure({ id: "J-" + (30000 + Object.keys(m.jobs).length + Math.floor(Math.random() * 900)), customer: "Sample Homeowner", first: "Sample", last: "Homeowner", city: "", zip: "", phone: "555-01" + I().pad(10 + Math.floor(Math.random() * 89)), trade: C().trades[0], scope: "", salesman: "", setter: "", crew: "", stage: "pending", projStart: I().addDays(I().todayISO(), 14), actualStart: "", projFinish: I().addDays(I().todayISO(), 16), sale: 0, cost: 0, alert: "", crmId: "NEW", sample: true, _new: 1 })));
    var ids = jobs().map(function (j) { return j.id; }), idx = ids.indexOf(o.id);
    var stOpts = C().stages.map(function (s) { return [s.id, s.label]; });
    var left = customerBlock(o) + block("CUSTOMER TYPE", "navy", '<div class="ax-chks">' + C().customerTypes.map(function (t) { return chk("types." + t, o.types[t], t); }).join("") + "</div>");
    var mid = '<section class="ax-status"><span>STATUS</span><select class="ax-in" data-k="stage" aria-label="Status">' + opts(stOpts, o.stage) + "</select></section>" +
      block("BOARD DETAILS", "gray", '<div class="ax-g2">' + fld("Job #", '<input class="ax-in" value="' + esc(o.id) + '" readonly>') + fld("Date Sold", inp("dateSold", o.dateSold, "date")) + fld("Sales Rep", '<select class="ax-in" data-k="salesman">' + opts(C().salesmen, o.salesman, "—") + "</select>") + fld("Measure Date", inp("measureDate", o.measureDate, "date")) + fld("Measure By", '<select class="ax-in" data-k="measureBy">' + opts(C().salesmen, o.measureBy, "—") + "</select>") + fld("Trade", '<select class="ax-in" data-k="trade">' + opts(C().trades, o.trade) + "</select>") + fld("Job Description", inp("scope", o.scope), true) + "</div>" + itemsBlock(o) + '<div class="ax-sub">TASKS</div><div class="ax-chks">' + C().tasks.map(function (t) { return chk("tasks." + t, o.tasks[t], t); }).join("") + "</div>") +
      partsBlock(o) +
      block("INSTALL CREW", "green", '<div class="ax-g2">' + fld("Crew Assigned", '<select class="ax-in" data-k="crew">' + opts([["", "Unassigned"]].concat(C().crews), o.crew) + "</select>") + fld("Scheduled Date", inp("schedDate", o.schedDate, "date")) + fld("Time", '<select class="ax-in" data-k="schedTime">' + opts(C().times, o.schedTime) + "</select>") + fld("Projected Start", inp("projStart", o.projStart, "date")) + fld("Actual Start", inp("actualStart", o.actualStart, "date")) + fld("Projected Finish", inp("projFinish", o.projFinish, "date")) + fld("Alert / Down Status", inp("alert", o.alert), true) + "</div>");
    var right = block("FINANCIALS", "blue", '<div class="ax-g1">' + fld("Gross Sale", inp("fin.gross", o.fin.gross, "number")) + fld("Down Payment", inp("fin.down", o.fin.down, "number")) + fld("Addon / Change Order", inp("fin.addon", o.fin.addon, "number")) + fld("Final Payment", inp("fin.final", o.fin.final, "number")) + fld("Amount Financed", inp("fin.financed", o.fin.financed, "number")) + "</div>") +
      '<section class="ax-balance"><span>TOTAL BALANCE DUE</span><strong id="ax-bal"></strong></section>' +
      block("PROFITABILITY", "gray", '<div class="ax-g1">' + fld("Material Cost", inp("prof.material", o.prof.material, "number")) + fld("Labor Cost", inp("prof.labor", o.prof.labor, "number")) + fld("Commission", inp("prof.commission", o.prof.commission, "number")) + fld("Permit / Dump / Other", inp("prof.other", o.prof.other, "number")) + '</div><div class="ax-calc"><div><span>TOTAL JOB COST</span><strong id="ax-cost"></strong></div><div><span>NET PROFIT</span><strong id="ax-net"></strong></div><div><span>MARGIN %</span><strong id="ax-margin"></strong></div></div>') +
      block("SERVICE / WARRANTY", "red", '<div class="ax-g2">' + fld("Date Issue Reported", inp("warranty.reported", o.warranty.reported, "date")) + fld("Resolved Date", inp("warranty.resolved", o.warranty.resolved, "date")) + fld("Notes", '<textarea class="ax-in" data-k="warranty.notes" rows="2">' + esc(o.warranty.notes) + "</textarea>", true) + '</div><button type="button" class="btn btn-secondary ax-mini" data-new-svc>+ Service ticket for this job</button>');
    var body = '<div class="ax-cols"><div>' + left + "</div><div>" + mid + "</div><div>" + right + "</div></div>" + '<div class="ax-bottom">' + filesBlock("job:" + o.id) + notesBlock("BOARD NOTES", o) + "</div>";
    var foot = '<div class="ax-nav"><button type="button" class="btn btn-secondary" data-rec="-1"' + (idx <= 0 ? " disabled" : "") + '>◀ Prev</button><span class="ax-muted">' + (idx >= 0 ? "Record " + (idx + 1) + " of " + ids.length : "New record") + '</span><button type="button" class="btn btn-secondary" data-rec="1"' + (idx < 0 || idx >= ids.length - 1 ? " disabled" : "") + '>Next ▶</button></div><p class="fb-err" id="ax-err" role="alert"></p>' +
      (isNew ? "" : '<button type="button" class="btn btn-danger" data-del>Delete</button>') + '<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="button" class="btn btn-primary" data-save>Save</button>';
    var w = modal("ax-job", "BOARD · " + (isNew ? "New job" : o.id + " · " + (o.first + " " + o.last).trim()), body, foot);
    function recalc() { var c = calc(o); w.querySelector("#ax-bal").textContent = money(c.balance); w.querySelector("#ax-cost").textContent = money(c.cost); w.querySelector("#ax-net").textContent = money(c.net); w.querySelector("#ax-margin").textContent = Math.round(c.margin * 100) + "%"; w.querySelector(".ax-status").className = "ax-status ax-st-" + o.stage; }
    live(w, o, recalc); recalc();
    wireFilesNotes(w, "job:" + o.id, o, function () { openJob(isNew ? null : o.id, o); });
    w.querySelector("[data-save]").onclick = function () {
      readForm(w, o); var err = w.querySelector("#ax-err");
      if (!/^555-\d{4}$/.test(o.phone)) { err.textContent = "Sandbox phones must be 555-xxxx"; return; }
      if ((o.first + o.last).trim().length < 2) { err.textContent = "Enter the customer's name"; return; }
      if (o.projFinish && o.projStart && o.projFinish < o.projStart) { err.textContent = "Projected finish is before projected start"; return; }
      var c = calc(o); o.customer = (o.first + " " + o.last).trim(); o.sale = c.sale; o.cost = c.cost; if (o.stage === "progress" && !o.actualStart) o.actualStart = I().todayISO(); delete o._new;
      I().load().jobs[o.id] = o; I().save(); w.remove(); I().toast("Saved " + o.id); JobsBoard.render();
    };
    var d = w.querySelector("[data-del]"); if (d) d.onclick = function () { if (!confirm("Delete job " + o.id + " from the board? (sample)")) return; delete I().load().jobs[o.id]; I().save(); w.remove(); I().toast("Deleted " + o.id); JobsBoard.render(); };
    w.querySelectorAll("[data-rec]").forEach(function (b) { b.onclick = function () { var to = ids[idx + +b.getAttribute("data-rec")]; if (to) openJob(to); }; });
    w.querySelector("[data-new-svc]").onclick = function () { readForm(w, o); w.remove(); openTicket(null, null, o.id); };
    return w;
  }

  /* ---------- SERVICE ticket form ---------- */
  function openTicket(id, draft, fromJob) {
    var m = db(), isNew = !id, o = draft || JSON.parse(JSON.stringify(id ? m.svc[id] : newTicket(fromJob ? job(fromJob) : null)));
    if (isNew && !o.id) o.id = "S-" + (1001 + Object.keys(m.svc).length + Math.floor(Math.random() * 50));
    var ids = tickets().map(function (t) { return t.id; }), idx = ids.indexOf(o.id);
    var jobOpts = [["", "— not linked —"]].concat(jobs().map(function (j) { return [j.id, j.id + " · " + j.customer]; }));
    var left = customerBlock(o) + block("CUSTOMER TYPE", "navy", '<div class="ax-chks">' + C().serviceTypes.map(function (t) { return chk("types." + t, o.types[t], t); }).join("") + "</div>") +
      block("ORIGINAL JOB INFO", "gray", '<div class="ax-g2">' + fld("Board Job", '<select class="ax-in" data-k="jobId" id="ax-link">' + opts(jobOpts, o.jobId) + "</select>", true) + fld("Tech / Rep Who Sold", inp("orig.rep", o.orig.rep)) + fld("Job #", inp("orig.jobNo", o.orig.jobNo)) + fld("Date Sold", inp("orig.dateSold", o.orig.dateSold, "date")) + fld("Total Job Amount", inp("orig.total", o.orig.total, "number")) + fld("Date Entered Finished", inp("orig.finished", o.orig.finished, "date")) + "</div>" + (o.jobId ? '<button type="button" class="btn btn-secondary ax-mini" data-open-job="' + esc(o.jobId) + '">Open board job ' + esc(o.jobId) + "</button>" : ""));
    var mid = '<section class="ax-status ax-svc-' + (o.complete ? "done" : "open") + '"><span>STATUS</span><select class="ax-in" data-k="status" aria-label="Status">' + opts(C().serviceStatuses, o.status) + "</select>" + chk("complete", o.complete, "Click box when complete") + "</section>" +
      block("DESCRIPTION OF SERVICE ISSUE", "red", '<textarea class="ax-in" data-k="description" rows="4" aria-label="Description of service issue">' + esc(o.description) + "</textarea>" + fld("Date Completed", inp("dateCompleted", o.dateCompleted, "date"))) +
      partsBlock(o) + block("CREW / TECH", "green", '<div class="ax-g2">' + fld("Assigned Tech", '<select class="ax-in" data-k="tech">' + opts(C().techs, o.tech, "—") + "</select>") + fld("Scheduled Date", inp("schedDate", o.schedDate, "date")) + fld("Time", '<select class="ax-in" data-k="time">' + opts(C().times, o.time, "—") + "</select>") + "</div>");
    var right = block("SERVICE RESOLUTION", "blue", '<textarea class="ax-in" data-k="resolution" rows="4" aria-label="Service resolution notes">' + esc(o.resolution) + '</textarea><div class="ax-chks">' + chk("needsFollowUp", o.needsFollowUp, "Needs follow up") + chk("resolved", o.resolved, "Resolved") + '</div><button type="button" class="btn btn-secondary" data-notify>✉ Notify customer of service repair or delay</button>') +
      block("ITEMS INVOLVED", "gray", '<div class="ax-chks">' + C().items.map(function (x) { return chk("items." + x, (o.items || {})[x], x); }).join("") + "</div>");
    var body = '<div class="ax-cols"><div>' + left + "</div><div>" + mid + "</div><div>" + right + '</div></div><div class="ax-bottom">' + filesBlock("svc:" + o.id) + notesBlock("SERVICE NOTES", o) + "</div>";
    var foot = '<div class="ax-nav"><button type="button" class="btn btn-secondary" data-rec="-1"' + (idx <= 0 ? " disabled" : "") + '>◀ Prev</button><span class="ax-muted">' + (idx >= 0 ? "Ticket " + (idx + 1) + " of " + ids.length : "New ticket") + '</span><button type="button" class="btn btn-secondary" data-rec="1"' + (idx < 0 || idx >= ids.length - 1 ? " disabled" : "") + '>Next ▶</button></div><p class="fb-err" id="ax-err" role="alert"></p>' +
      (isNew ? "" : '<button type="button" class="btn btn-danger" data-del>Delete</button>') + '<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="button" class="btn btn-primary" data-save>Save</button>';
    var w = modal("ax-svc", "SERVICE · " + o.id + " · " + (o.first + " " + o.last).trim(), body, foot);
    live(w, o, function () { w.querySelector(".ax-status").className = "ax-status ax-svc-" + (o.complete ? "done" : "open"); });
    w.querySelector("#ax-link").addEventListener("change", function () { readForm(w, o); var j = job(o.jobId); if (j) { var t = newTicket(j); ["first", "last", "address", "city", "state", "zip", "phone", "email", "orig", "items"].forEach(function (k) { o[k] = t[k]; }); } openTicket(isNew ? null : o.id, o); });
    wireFilesNotes(w, "svc:" + o.id, o, function () { openTicket(isNew ? null : o.id, o); });
    w.querySelector("[data-notify]").onclick = function () {
      readForm(w, o); var msg = "Hi " + (o.first || "there") + ", this is " + (C().companyName || "our") + " service team about your " + Object.keys(o.items || {}).filter(function (k) { return o.items[k]; }).join("/").toLowerCase() + " service request (" + o.id + "). " + (o.schedDate ? "Your repair is scheduled for " + fmt(o.schedDate) + (o.time ? " at " + o.time : "") + ". " : "We're waiting on parts and will call to schedule as soon as they arrive. ") + "Reply or call us with any questions.";
      modal("ax-notify", "Notify customer · preview only", '<p class="ax-muted">SAMPLE ONLY. Nothing is sent from the sandbox.</p><p><b>To:</b> ' + esc(o.phone) + " · " + esc(o.email) + '</p><textarea class="ax-in" rows="5" id="ax-notify-text">' + esc(msg) + "</textarea>", '<button type="button" class="btn btn-secondary" data-close>Close</button><button type="button" class="btn btn-primary" disabled title="Sending is off in the sandbox">Send (disabled in sandbox)</button>');
    };
    w.querySelector("[data-save]").onclick = function () {
      readForm(w, o); var err = w.querySelector("#ax-err");
      if (o.phone && !/^555-\d{4}$/.test(o.phone)) { err.textContent = "Sandbox phones must be 555-xxxx"; return; }
      if (!o.description.trim()) { err.textContent = "Describe the service issue"; return; }
      if (o.complete) { o.status = "CLOSED"; o.dateCompleted = o.dateCompleted || I().todayISO(); }
      db().svc[o.id] = o; I().save(); w.remove(); I().toast("Saved " + o.id); ui.view = "service"; JobsBoard.render();
    };
    var d = w.querySelector("[data-del]"); if (d) d.onclick = function () { if (!confirm("Delete service ticket " + o.id + "? (sample)")) return; delete db().svc[o.id]; I().save(); w.remove(); JobsBoard.render(); };
    w.querySelectorAll("[data-rec]").forEach(function (b) { b.onclick = function () { var to = ids[idx + +b.getAttribute("data-rec")]; if (to) openTicket(to); }; });
    var oj = w.querySelector("[data-open-job]"); if (oj) oj.onclick = function () { w.remove(); openJob(oj.getAttribute("data-open-job")); };
    return w;
  }

  /* ---------- spreadsheet grid (sort A→Z / Z→A, per-column filter, select, double-click open) ---------- */
  function grid(name, cols, rows, openAttr) {
    var s = ui.sort[name] || {}, f = ui.filt[name] = ui.filt[name] || {}, sel = ui.sel[name] = ui.sel[name] || {};
    var out = rows.filter(function (r) { return cols.every(function (c) { var q = (f[c.k] || "").toLowerCase(); return !q || String(c.v(r)).toLowerCase().indexOf(q) >= 0; }); });
    if (s.k) { var col = cols.filter(function (c) { return c.k === s.k; })[0]; out.sort(function (a, b) { var x = col.v(a), y = col.v(b); var r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true }); return s.dir === "desc" ? -r : r; }); }
    return '<div class="ax-grid-wrap"><table class="ax-grid" data-grid="' + name + '"><thead><tr><th class="ax-sel"><input type="checkbox" data-sel-all aria-label="Select all"' + (out.length && out.every(function (r) { return sel[r.id]; }) ? " checked" : "") + "></th>" +
      cols.map(function (c) { return '<th><button type="button" class="ax-sort" data-sort="' + c.k + '" aria-sort="' + (s.k === c.k ? (s.dir === "desc" ? "descending" : "ascending") : "none") + '">' + esc(c.label) + (s.k === c.k ? (s.dir === "desc" ? " ▼" : " ▲") : "") + "</button></th>"; }).join("") + '</tr><tr class="ax-filters"><th></th>' +
      cols.map(function (c) { return '<th><input class="ax-filter" data-filter="' + c.k + '" value="' + esc(f[c.k] || "") + '" placeholder="Filter" aria-label="Filter ' + esc(c.label) + '"></th>'; }).join("") + "</tr></thead><tbody>" +
      (out.length ? out.map(function (r) { return '<tr ' + openAttr + '="' + esc(r.id) + '" tabindex="0" class="' + (sel[r.id] ? "is-sel" : "") + '"><td class="ax-sel"><input type="checkbox" data-sel="' + esc(r.id) + '"' + (sel[r.id] ? " checked" : "") + ' aria-label="Select ' + esc(r.id) + '"></td>' + cols.map(function (c) { var v = c.v(r); return "<td" + (c.num ? ' class="num"' : "") + ">" + esc(c.f ? c.f(v) : v) + "</td>"; }).join("") + "</tr>"; }).join("") : '<tr><td colspan="' + (cols.length + 1) + '" class="ax-muted">No records match these filters.</td></tr>') +
      '</tbody></table></div><p class="ax-muted ax-count">' + out.length + " of " + rows.length + " records · " + Object.keys(sel).filter(function (k) { return sel[k]; }).length + " selected · click a header to sort A→Z / Z→A · double-click a row to open</p>";
  }
  function bindGrid(root, name) {
    var g = root.querySelector('[data-grid="' + name + '"]'); if (!g) return;
    g.querySelectorAll("[data-sort]").forEach(function (b) { b.onclick = function () { var k = b.getAttribute("data-sort"), s = ui.sort[name] || {}; ui.sort[name] = { k: k, dir: s.k === k && s.dir === "asc" ? "desc" : "asc" }; JobsBoard.render(); }; });
    g.querySelectorAll("[data-filter]").forEach(function (el) { el.oninput = function () { ui.filt[name][el.getAttribute("data-filter")] = el.value; var k = el.getAttribute("data-filter"), pos = el.selectionStart; JobsBoard.render(); var nx = JobsBoard.ui.root.querySelector('[data-grid="' + name + '"] [data-filter="' + k + '"]'); if (nx) { nx.focus(); try { nx.setSelectionRange(pos, pos); } catch (e) {} } }; });
    g.querySelectorAll("[data-sel]").forEach(function (c) { c.onclick = function (e) { e.stopPropagation(); ui.sel[name][c.getAttribute("data-sel")] = c.checked; JobsBoard.render(); }; });
    var all = g.querySelector("[data-sel-all]"); if (all) all.onclick = function () { g.querySelectorAll("[data-sel]").forEach(function (c) { ui.sel[name][c.getAttribute("data-sel")] = all.checked; }); JobsBoard.render(); };
    g.querySelectorAll("tbody tr[data-open-job],tbody tr[data-open-svc]").forEach(function (tr) {
      var go = function () { var j = tr.getAttribute("data-open-job"), s = tr.getAttribute("data-open-svc"); if (j) openJob(j); else openTicket(s); };
      tr.ondblclick = go; tr.onkeydown = function (e) { if (e.key === "Enter") go(); };
    });
  }
  var JOB_COLS = [
    { k: "id", label: "ID", v: function (j) { return j.id; } }, { k: "entered", label: "Date Entered", v: function (j) { return j.dateEntered; }, f: fmt },
    { k: "last", label: "Last Name", v: function (j) { return j.last; } }, { k: "first", label: "First Name", v: function (j) { return j.first; } },
    { k: "address", label: "Address", v: function (j) { return j.address; } }, { k: "city", label: "City", v: function (j) { return j.city; } },
    { k: "phone", label: "Phone", v: function (j) { return j.phone; } }, { k: "status", label: "Status", v: function (j) { return JobsBoard._int.stage(j.stage).label; } },
    { k: "desc", label: "Job Description", v: function (j) { return j.scope; } }, { k: "cost", label: "Total Job Cost", v: function (j) { return calc(j).cost; }, f: money, num: true }
  ];
  var SVC_COLS = [
    { k: "id", label: "ID", v: function (t) { return t.id; } }, { k: "entered", label: "Date Entered", v: function (t) { return t.dateEntered; }, f: fmt },
    { k: "last", label: "Last Name", v: function (t) { return t.last; } }, { k: "first", label: "First Name", v: function (t) { return t.first; } },
    { k: "city", label: "City", v: function (t) { return t.city; } }, { k: "phone", label: "Phone", v: function (t) { return t.phone; } },
    { k: "status", label: "Status", v: function (t) { return t.status; } }, { k: "issue", label: "Service Issue", v: function (t) { return t.description; } },
    { k: "tech", label: "Tech", v: function (t) { return t.tech; } }, { k: "sched", label: "Scheduled", v: function (t) { return t.schedDate; }, f: fmt }, { k: "job", label: "Board Job", v: function (t) { return t.jobId; } }
  ];

  /* ---------- MAIN MENU + views ---------- */
  var MENU = [["board", "📋", "Board"], ["search", "▦", "Board Search"], ["service", "🛠", "Service"], ["costs", "💲", "Costs"], ["contracts", "📝", "Contracts"], ["deposits", "🏦", "Deposits"], ["reports", "📊", "Reports"]];
  function menu() { return '<nav class="ax-menu" aria-label="Jobs main menu"><span class="ax-menu-t">JOBS · MAIN MENU</span>' + MENU.map(function (x) { return '<button type="button" class="ax-menu-btn" data-jx-view="' + x[0] + '" aria-pressed="' + (ui.view === x[0]) + '"><span aria-hidden="true">' + x[1] + "</span> " + x[2] + "</button>"; }).join("") + "</nav>"; }
  function table(cols, rows, foot) { return '<div class="ax-grid-wrap"><table class="ax-grid ax-report"><thead><tr>' + cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (v, i) { return '<td' + (typeof v === "number" || /^\$/.test(v) ? ' class="num"' : "") + ">" + esc(v) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody>" + (foot ? "<tfoot><tr>" + foot.map(function (v) { return "<td><b>" + esc(v) + "</b></td>"; }).join("") + "</tr></tfoot>" : "") + "</table></div>"; }
  function view(title, sub, html, actions) { return menu() + '<section class="jb ax-view" data-jx="' + ui.view + '"><div class="jb-head"><div><h2 class="jb-title">' + esc(title) + '</h2><p class="jb-subtitle">' + esc(sub) + '</p></div><div class="jb-actions">' + (actions || "") + "</div></div>" + html + '<p class="jb-foot">Sample data only.</p></section>'; }
  function route(root) {
    if (ui.view === "board") return false;
    var J = jobs(), html = "";
    if (ui.view === "search") html = view("Board / Entry Search", "Every board job in one spreadsheet-style list. Click a column header to sort, type in a filter box, double-click a row to open the board record.", grid("jobs", JOB_COLS, J, "data-open-job"), '<button type="button" class="btn btn-secondary" data-jx-view="board">☰ Board list &amp; KPIs</button><button type="button" class="btn btn-primary" data-jx-new-job>+ Add Job to Board</button>');
    else if (ui.view === "service") html = view("Service", "Open and past service / warranty tickets. Double-click a row to open the ticket.", grid("svc", SVC_COLS, tickets(), "data-open-svc"), '<button type="button" class="btn btn-primary" data-jx-new-svc>+ New Service Ticket</button>');
    else if (ui.view === "costs") { var tc = 0, tn = 0; html = view("Costs", "Job cost and profit by job (from each board record's PROFITABILITY block).", table(["Job #", "Customer", "Status", "Gross + Addon", "Material", "Labor", "Commission", "Other", "Total Job Cost", "Net Profit", "Margin %"], J.map(function (j) { var c = calc(j); tc += c.cost; tn += c.net; return [j.id, j.customer, I().stage(j.stage).label, money(c.sale), money(j.prof.material), money(j.prof.labor), money(j.prof.commission), money(j.prof.other), money(c.cost), money(c.net), Math.round(c.margin * 100) + "%"]; }), ["Total", "", "", "", "", "", "", "", money(tc), money(tn), ""])); }
    else if (ui.view === "contracts") html = view("Contracts", "Sold contracts: date sold, rep, gross sale, change orders and financing (sample).", table(["Job #", "Customer", "Date Sold", "Sales Rep", "Gross Sale", "Addon / CO", "Amount Financed", "Status"], J.slice().sort(function (a, b) { return a.dateSold < b.dateSold ? 1 : -1; }).map(function (j) { return [j.id, j.customer, fmt(j.dateSold), j.salesman, money(j.fin.gross), money(j.fin.addon), money(j.fin.financed), I().stage(j.stage).label]; })));
    else if (ui.view === "deposits") { var td = 0, tb = 0; html = view("Deposits", "Down payments, final payments and balance due per job (sample).", table(["Job #", "Customer", "Date Sold", "Down Payment", "Final Payment", "Amount Financed", "Total Balance Due"], J.map(function (j) { var c = calc(j); td += n(j.fin.down); tb += c.balance; return [j.id, j.customer, fmt(j.dateSold), money(j.fin.down), money(j.fin.final), money(j.fin.financed), money(c.balance)]; }), ["Total", "", "", money(td), "", "", money(tb)])); }
    else if (ui.view === "reports") {
      var bySt = C().stages.map(function (s) { var l = J.filter(function (j) { return j.stage === s.id; }); return [s.label, l.length, money(l.reduce(function (a, j) { return a + calc(j).sale; }, 0))]; });
      var reps = {}; J.forEach(function (j) { var r = reps[j.salesman] = reps[j.salesman] || [0, 0, 0]; var c = calc(j); r[0]++; r[1] += c.sale; r[2] += c.net; });
      var open = tickets().filter(function (t) { return t.status !== "CLOSED"; });
      html = view("Reports", "Quick sample reports.", '<div class="ax-reports"><section data-report="status"><h3>Jobs by status</h3>' + table(["Status", "Jobs", "Sales"], bySt) + '</section><section data-report="rep"><h3>Profit by rep</h3>' + table(["Sales Rep", "Jobs", "Sales", "Net Profit", "Margin %"], Object.keys(reps).sort().map(function (k) { var r = reps[k]; return [k, r[0], money(r[1]), money(r[2]), (r[1] ? Math.round(r[2] / r[1] * 100) : 0) + "%"]; })) + '</section><section data-report="service"><h3>Open service tickets</h3>' + table(["Ticket", "Customer", "Status", "Issue", "Tech", "Scheduled"], open.map(function (t) { return [t.id, (t.first + " " + t.last).trim(), t.status, t.description, t.tech, fmt(t.schedDate)]; })) + "</section></div>");
    }
    root.innerHTML = html; bindCommon(root); bindGrid(root, "jobs"); bindGrid(root, "svc");
    var nj = root.querySelector("[data-jx-new-job]"); if (nj) nj.onclick = function () { openJob(null); };
    var ns = root.querySelector("[data-jx-new-svc]"); if (ns) ns.onclick = function () { openTicket(null); };
    return true;
  }
  function bindCommon(root) {
    root.querySelectorAll("[data-jx-view]").forEach(function (b) { b.onclick = function () { ui.view = b.getAttribute("data-jx-view"); JobsBoard.render(); }; });
    root.querySelectorAll("[data-jx-open]").forEach(function (b) { b.onclick = function () { openJob(b.getAttribute("data-jx-open")); }; });
  }
  window.JobsAccess = { route: route, menu: menu, bindCommon: bindCommon, openJob: openJob, openTicket: openTicket, calc: calc, jobs: jobs, tickets: tickets, ui: ui };
})();
