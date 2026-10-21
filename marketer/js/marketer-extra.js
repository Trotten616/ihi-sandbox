/* /marketer/ add-ons (make-marketer-cc.sh): lead inquiry + appointment + confirmation-activity modals,
 * saved in localStorage ("mkc-crm-v1", cleared by "Reset this app"), shown in the customer record and on the
 * Future Board; user switcher for every tenant user; manager Team view with drill-down. Sample data only. */
(function () {
  "use strict";
  var KEY = "mkc-crm-v1";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { inq: {}, acts: {} }; } catch (e) { return { inq: {}, acts: {} }; } }
  function save(db) { localStorage.setItem(KEY, JSON.stringify(db)); }
  var STATUSES = ["Lead", "Set Appointment", "Do Not Call", "DNC Request", "Sales Presentation", "SERVICE"];
  var APPT_TYPES = ["Sales Presentation", "Service", "Rehash", "Measure"];
  var RESULTS = ["Confirmed", "Unconfirmed", "Sold", "No Sale", "Cancelled", "Reset"];
  var ACT_TYPES = ["Text Out", "Email Out", "Call Out"];
  var CALL_RESULTS = ["Completed", "No Answer", "Left VM", "Busy"];
  var TIMES = [["10:00", "10:00 AM"], ["12:00", "12:00 PM"], ["14:00", "2:00 PM"], ["16:00", "4:00 PM"], ["18:00", "6:00 PM"]];
  var BOARD_T = { "10:00": "10:00", "12:00": "12:00", "14:00": "2:00", "16:00": "4:00", "18:00": "6:00" };
  var TEMPLATES = {
    "Customer - Appointment Reminder Email": "Hi {FirstName},\n\nThis is a friendly reminder of your free in-home estimate on {ApptDate} at {ApptTime}. {RepName} will bring samples for your {Product} project. Reply to this email or call {OfficePhone} if you need to change the time.\n\nThank you,\n{CompanyName}",
    "Customer - Appointment Confirmation Email": "Hi {FirstName},\n\nYour appointment is confirmed for {ApptDate} at {ApptTime} with {RepName}. Please plan for all homeowners to be present; the visit takes about 90 minutes.\n\n{CompanyName}",
    "Customer - Thank You for Your Inquiry": "Hi {FirstName},\n\nThank you for asking about {Product}. A member of our team will reach out shortly to find a time that works for you.\n\n{CompanyName}"
  };
  var REASONS = ["", "Price", "Thinking it over", "Spouse not present", "Financing", "Went with another company", "Rescheduled by homeowner"];
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var today = function () { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  var nowT = function () { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  var addDays = function (iso, n) { var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  var mdY = function (iso) { return iso ? (+iso.slice(5, 7)) + "/" + (+iso.slice(8, 10)) + "/" + iso.slice(0, 4) : ""; };
  var t12 = function (t) { if (!t) return ""; var h = +t.slice(0, 2), ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return h + ":" + t.slice(3, 5) + " " + ap; };
  var uid = function (p) { return p + "-" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); };
  var me = function () { return (window.IHIApp && IHIApp.currentUser && IHIApp.currentUser()) || { name: "Chris Baareman", id: "u-chris" }; };
  var T = function () { return window.IHITenant || { users: function () { return []; }, products: function () { return []; }, config: {} }; };
  var reps = function () { return T().users("rep").map(function (u) { return u.name; }); };
  var staff = function () { return T().users().filter(function (u) { return !u.offTenant; }); };
  var opts = function (list, sel, blank) { return (blank ? '<option value="">' + esc(blank) + "</option>" : "") + list.map(function (x) { var v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (v === sel ? " selected" : "") + ">" + esc(l) + "</option>"; }).join(""); };

  /* ---------- toast ---------- */
  function toast(msg) {
    var t = $("#mkc-toast"); if (!t) { t = document.createElement("div"); t.id = "mkc-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.className = "show"; clearTimeout(t._h); t._h = setTimeout(function () { t.className = ""; }, 3200);
  }

  /* ---------- modal shell ---------- */
  function modal(id, title, body, foot) {
    closeModal(id);
    var w = document.createElement("div"); w.className = "mkc-modal-wrap"; w.id = id;
    w.innerHTML = '<div class="mkc-modal" role="dialog" aria-modal="true" aria-labelledby="' + id + '-t"><header><h3 id="' + id + '-t">' + esc(title) + '</h3><button type="button" class="mkc-x" data-close aria-label="Close">×</button></header><div class="mkc-body">' + body + '</div><footer>' + foot + "</footer></div>";
    document.body.appendChild(w);
    $$("[data-close]", w).forEach(function (b) { b.addEventListener("click", function () { closeModal(id); }); });
    return w;
  }
  function closeModal(id) { var e = document.getElementById(id); if (e) e.remove(); }

  /* ---------- inquiry modal ---------- */
  var ctx = { cust: null }; /* {id, name, first, city} */
  function productLine(p) {
    p = p || {};
    return '<div class="mkc-pline"><select class="select" data-f="product" aria-label="Product">' + opts(T().products(), p.product, "Pick a product") + '</select>' +
      '<input class="input" data-f="desc" placeholder="Description" aria-label="Description" value="' + esc(p.desc || "") + '">' +
      '<input class="input" data-f="price" type="number" min="0" step="1" placeholder="Price quoted" aria-label="Price quoted" value="' + esc(p.price || "") + '">' +
      '<button type="button" class="mkc-icon" data-rm-line aria-label="Remove product">×</button></div>';
  }
  function openInquiry(cust, existing) {
    var src = (T().config && T().config.leadSources) || { Internet: ["Website"] };
    var q = existing || { date: today(), time: nowT(), srcPrimary: Object.keys(src)[0], srcSecondary: "", status: "Lead", products: [{}] };
    var pick = cust ? "" : '<label class="mkc-f wide">Customer<select class="select" id="mkc-cust">' + leadOptions() + "</select></label>";
    var body = pick +
      '<div class="mkc-grid">' +
      '<label class="mkc-f">Inquiry date<input class="input" type="date" id="mkc-inq-date" value="' + esc(q.date) + '"></label>' +
      '<label class="mkc-f">Inquiry time<input class="input" type="time" id="mkc-inq-time" value="' + esc(q.time) + '"></label>' +
      '<label class="mkc-f">Lead source (primary)<select class="select" id="mkc-src1">' + opts(Object.keys(src), q.srcPrimary) + "</select></label>" +
      '<label class="mkc-f">Lead source (secondary)<select class="select" id="mkc-src2"></select></label>' +
      '<label class="mkc-f">Inquiry status<select class="select" id="mkc-status">' + opts(STATUSES, q.status) + "</select></label></div>" +
      '<h4 class="mkc-h">Product interest</h4><div id="mkc-plines">' + (q.products.length ? q.products : [{}]).map(productLine).join("") + "</div>" +
      '<button type="button" class="btn btn-secondary btn-sm" id="mkc-add-pi">+ Add Product Interest</button><p class="mkc-err" id="mkc-inq-err" hidden></p>';
    var w = modal("mkc-inq", (existing ? "Edit" : "Add") + " lead inquiry" + (cust ? " · " + cust.name : ""), body,
      '<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="button" class="btn btn-secondary" id="mkc-inq-save">Save</button><button type="button" class="btn btn-primary" id="mkc-inq-save-appt">Save &amp; Add Appointment</button>');
    var s1 = $("#mkc-src1", w), s2 = $("#mkc-src2", w);
    var fill2 = function () { s2.innerHTML = opts(src[s1.value] || [], q.srcSecondary, "—"); };
    fill2(); s1.addEventListener("change", function () { q.srcSecondary = ""; fill2(); });
    $("#mkc-add-pi", w).addEventListener("click", function () { $("#mkc-plines", w).insertAdjacentHTML("beforeend", productLine()); });
    $("#mkc-plines", w).addEventListener("click", function (e) { if (e.target.closest("[data-rm-line]") && $$(".mkc-pline", w).length > 1) e.target.closest(".mkc-pline").remove(); });
    var go = function (withAppt) {
      var c = cust || custFromSelect();
      var products = $$(".mkc-pline", w).map(function (l) { return { product: $("[data-f=product]", l).value, desc: $("[data-f=desc]", l).value.trim(), price: $("[data-f=price]", l).value }; }).filter(function (p) { return p.product; });
      var err = $("#mkc-inq-err", w);
      if (!c) { err.textContent = "Pick a customer."; err.hidden = false; return; }
      if (!products.length) { err.textContent = "Add at least one product interest."; err.hidden = false; return; }
      var db = load(); var list = db.inq[c.id] = db.inq[c.id] || [];
      var rec = existing || { id: uid("inq"), appointments: [], by: me().name, cust: c };
      Object.assign(rec, { date: $("#mkc-inq-date", w).value || today(), time: $("#mkc-inq-time", w).value, srcPrimary: s1.value, srcSecondary: s2.value, status: $("#mkc-status", w).value, products: products, cust: c });
      if (!existing) list.unshift(rec); else list.forEach(function (x, i) { if (x.id === rec.id) list[i] = rec; });
      save(db); closeModal("mkc-inq"); toast("The Marketing Queue has been updated.");
      refreshRecord("inq");
      if (withAppt) openAppointment(c, rec.id);
    };
    $("#mkc-inq-save", w).addEventListener("click", function () { go(false); });
    $("#mkc-inq-save-appt", w).addEventListener("click", function () { go(true); });
  }
  function leadOptions() {
    var rows = $$("#leads-table tr[data-lead]").slice(0, 80);
    return '<option value="">Pick a customer</option>' + rows.map(function (tr) { var n = (tr.querySelector("td strong, td b") || tr.cells[0]).textContent.trim(); return '<option value="' + esc(tr.getAttribute("data-lead")) + '" data-name="' + esc(n) + '" data-city="' + esc(tr.cells[2] ? tr.cells[2].textContent.trim() : "") + '">' + esc(n) + "</option>"; }).join("");
  }
  function custFromSelect() {
    var s = $("#mkc-cust"); if (!s || !s.value) return null; var o = s.options[s.selectedIndex];
    var n = o.getAttribute("data-name"); var parts = n.split(","); return { id: s.value, name: n, first: (parts[1] || parts[0]).trim(), city: o.getAttribute("data-city") };
  }

  /* ---------- appointment modal (+ confirmation activity) ---------- */
  function openAppointment(cust, inqId) {
    var boardDates = ((window.SampleData && SampleData.boardDays) || []).map(function (d) { return d.date; });
    var defDate = boardDates.filter(function (d) { return d >= today(); })[0] || boardDates[0] || addDays(today(), 1);
    var issued = [today(), addDays(today(), -1), addDays(today(), -2), addDays(today(), -3)];
    var body = '<div class="mkc-grid">' +
      '<label class="mkc-f">Appt set by<select class="select" id="mkc-setby">' + opts(staff().map(function (u) { return u.name; }), me().name) + "</select></label>" +
      '<label class="mkc-f">Date<input class="input" type="date" id="mkc-ap-date" value="' + esc(defDate) + '"></label>' +
      '<label class="mkc-f">Time<select class="select" id="mkc-ap-time">' + opts(TIMES, "14:00") + "</select></label>" +
      '<label class="mkc-f">Salesperson 1<select class="select" id="mkc-sp1">' + opts(reps(), reps()[0]) + "</select></label>" +
      '<label class="mkc-f">Salesperson 2<select class="select" id="mkc-sp2">' + opts(reps(), "", "None") + "</select></label>" +
      '<label class="mkc-f">Date issued<input class="input" type="date" id="mkc-issued" value="' + today() + '"><span class="mkc-quick">' + issued.map(function (d, i) { return '<button type="button" class="mkc-chip" data-issued="' + d + '">' + (i === 0 ? "Today" : i === 1 ? "Yesterday" : mdY(d)) + "</button>"; }).join("") + "</span></label>" +
      '<label class="mkc-f">Appt type<select class="select" id="mkc-ap-type">' + opts(APPT_TYPES, "Sales Presentation") + "</select></label>" +
      '<label class="mkc-f">Appt result<select class="select" id="mkc-ap-result">' + opts(RESULTS, "Unconfirmed") + "</select></label>" +
      '<label class="mkc-f">Result reason<select class="select" id="mkc-ap-reason">' + opts(REASONS, "") + "</select></label>" +
      '<label class="mkc-f wide">Notes<textarea class="input" id="mkc-ap-notes" rows="2"></textarea></label></div>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="mkc-add-conf">+ Add Confirmation Activity</button>' +
      '<section id="mkc-act" hidden><h4 class="mkc-h">Activity details</h4><div class="mkc-grid">' +
      '<label class="mkc-f">Type<select class="select" id="mkc-act-type">' + opts(ACT_TYPES, "Text Out") + "</select></label>" +
      '<label class="mkc-f">Assigned to<select class="select" id="mkc-act-to">' + opts(staff().map(function (u) { return u.name; }), (T().users("confirmer")[0] || me()).name) + "</select></label>" +
      '<label class="mkc-f">Due by (date)<input class="input" type="date" id="mkc-act-date"></label>' +
      '<label class="mkc-f">Due by (time)<input class="input" type="time" id="mkc-act-time" value="10:00"></label>' +
      '<div class="mkc-email wide" hidden><label class="mkc-check"><input type="checkbox" id="mkc-auto"> Auto send email</label>' +
      '<label class="mkc-f">Send date<input class="input" type="date" id="mkc-send-date"></label><label class="mkc-f">Send time<input class="input" type="time" id="mkc-send-time" value="09:00"></label>' +
      '<label class="mkc-f">Email template<select class="select" id="mkc-tpl">' + opts(Object.keys(TEMPLATES), "", "Pick a template") + "</select></label></div>" +
      '<label class="mkc-f mkc-call" hidden>Result<select class="select" id="mkc-call-result">' + opts(CALL_RESULTS, "", "Not done yet") + "</select></label>" +
      '<label class="mkc-f wide">Notes<textarea class="input" id="mkc-act-notes" rows="5"></textarea></label></div></section><p class="mkc-err" id="mkc-ap-err" hidden></p>';
    var w = modal("mkc-appt", "Add lead appointment · " + cust.name, body, '<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="button" class="btn btn-primary" id="mkc-ap-save">Save</button>');
    $$("[data-issued]", w).forEach(function (b) { b.addEventListener("click", function () { $("#mkc-issued", w).value = b.getAttribute("data-issued"); }); });
    var syncDue = function () { var d = $("#mkc-ap-date", w).value; $("#mkc-act-date", w).value = addDays(d, -1); $("#mkc-send-date", w).value = addDays(d, -1); };
    syncDue(); $("#mkc-ap-date", w).addEventListener("change", syncDue);
    $("#mkc-add-conf", w).addEventListener("click", function () { var s = $("#mkc-act", w); s.hidden = !s.hidden; this.textContent = s.hidden ? "+ Add Confirmation Activity" : "− Remove Confirmation Activity"; });
    var syncType = function () { var t = $("#mkc-act-type", w).value; $(".mkc-email", w).hidden = t !== "Email Out"; $(".mkc-call", w).hidden = t !== "Call Out"; };
    syncType(); $("#mkc-act-type", w).addEventListener("change", syncType);
    $("#mkc-tpl", w).addEventListener("change", function () { var v = this.value; if (TEMPLATES[v]) $("#mkc-act-notes", w).value = TEMPLATES[v]; });
    $("#mkc-ap-save", w).addEventListener("click", function () {
      var date = $("#mkc-ap-date", w).value; if (!date) { var e = $("#mkc-ap-err", w); e.textContent = "Pick a date."; e.hidden = false; return; }
      var ap = { id: uid("apt"), date: date, time: $("#mkc-ap-time", w).value, setBy: $("#mkc-setby", w).value, salesperson: $("#mkc-sp1", w).value, salesperson2: $("#mkc-sp2", w).value,
        issued: $("#mkc-issued", w).value, type: $("#mkc-ap-type", w).value, result: $("#mkc-ap-result", w).value, resultReason: $("#mkc-ap-reason", w).value, notes: $("#mkc-ap-notes", w).value.trim() };
      var db = load(); var inq = (db.inq[cust.id] || []).filter(function (q) { return q.id === inqId; })[0];
      if (!inq) { inq = { id: uid("inq"), date: today(), time: nowT(), srcPrimary: "", srcSecondary: "", status: "Set Appointment", products: [], appointments: [], cust: cust, by: me().name }; (db.inq[cust.id] = db.inq[cust.id] || []).unshift(inq); }
      inq.appointments.push(ap); if (inq.status === "Lead") inq.status = "Set Appointment";
      if (!$("#mkc-act", w).hidden) {
        var type = $("#mkc-act-type", w).value, cr = $("#mkc-call-result", w).value;
        var act = { id: uid("act"), apptId: ap.id, type: type, reference: "Confirm Appointment", assignedTo: $("#mkc-act-to", w).value, dueDate: $("#mkc-act-date", w).value, dueTime: $("#mkc-act-time", w).value,
          text: $("#mkc-act-notes", w).value, result: type === "Call Out" && cr ? cr : null, completedDate: type === "Call Out" && cr ? today() : null, completedTime: type === "Call Out" && cr ? nowT() : null };
        if (type === "Email Out") { act.autoSend = $("#mkc-auto", w).checked; act.sendDate = $("#mkc-send-date", w).value; act.sendTime = $("#mkc-send-time", w).value; act.template = $("#mkc-tpl", w).value; }
        (db.acts[cust.id] = db.acts[cust.id] || []).unshift(act);
      }
      save(db); closeModal("mkc-appt"); applyBoard(); toast("The Marketing Queue has been updated.");
      refreshRecord("inq");
    });
  }

  /* ---------- customer record: merge saved data, extra header contacts ---------- */
  var last = null;
  function mergeInto(r) {
    var db = load(), id = r.id;
    var mine = (db.inq[id] || []).map(function (q) {
      return { id: q.id, mkc: true, date: q.date, kind: "", source: [q.srcPrimary, q.srcSecondary].filter(Boolean).join(" / ") || "—",
        product: q.products.map(function (p) { return p.product + (p.price ? " ($" + Number(p.price).toLocaleString() + ")" : ""); }).join(", ") || "—",
        jobSite: r.fullAddr, status: q.status, statusSub: "", canvasser: "", telemarketer: q.by, promoter: "", system: "Command Center",
        note: q.products.filter(function (p) { return p.desc; }).map(function (p) { return p.product + ": " + p.desc; }).join(" · "),
        appointments: q.appointments.map(function (a) { return { id: a.id, date: a.date, time: a.time, type: a.type, salesperson: a.salesperson + (a.salesperson2 ? " + " + a.salesperson2 : ""), result: a.result, resultReason: a.resultReason, system: "Command Center" }; }) };
    });
    var acts = (db.acts[id] || []).map(function (a) { return Object.assign({ system: "Command Center" }, a); });
    var out = Object.assign({}, r, { inquiries: mine.concat((r.inquiries || []).filter(function (q) { return !q.mkc; })), activities: acts.concat(r.activities || []) });
    var nm = (r.first || "customer").toLowerCase().replace(/[^a-z]/g, ""), ln = (r.last || "").toLowerCase().replace(/[^a-z]/g, "");
    if (!out.phones || !out.phones.length) out.phones = [{ label: "Home", number: "(616) 555-01" + pad(id.length % 90) }, { label: "Cell", number: "(616) 555-02" + pad((id.charCodeAt(id.length - 1) || 7) % 90) }];
    if (!out.emails || !out.emails.length) out.emails = [{ label: "Personal", address: nm + "." + ln + "@example.com" }];
    return out;
  }
  function refreshRecord(tab) {
    if (!last || !document.body.contains(last.root)) return;
    if (tab) CustomerRecord.setTab(tab);
    CustomerRecord.render(last.root, last.r, last.ctx);
  }
  function hookRecord() {
    if (!window.CustomerRecord || CustomerRecord._mkc) return;
    var orig = CustomerRecord.render;
    CustomerRecord.render = function (root, r, c) {
      if (r && !r.restricted) { last = { root: root, r: r, ctx: c }; r = mergeInto(r); }
      orig(root, r, c);
      if (r && !r.restricted) {
        var bar = root.querySelector(".cr-head");
        if (bar && !root.querySelector("#mkc-new-inq-cr")) bar.insertAdjacentHTML("afterend", '<div class="mkc-rbar"><button type="button" class="btn btn-primary btn-sm" id="mkc-new-inq-cr">+ New inquiry</button></div>');
      }
    };
    CustomerRecord._mkc = true;
  }
  function custOf() { var r = last && last.r; return r ? { id: r.id, name: r.name || ((r.last || "") + ", " + (r.first || "")), first: r.first, city: r.city } : null; }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-cr-sample], #mkc-new-inq-cr, #mkc-new-inq");
    if (!b) return;
    if (b.id === "mkc-new-inq") { e.preventDefault(); openInquiry(null); return; }
    var what = b.id === "mkc-new-inq-cr" ? "Add Lead Inquiry" : b.getAttribute("data-cr-sample");
    if (what === "Add Lead Inquiry" || what === "Add Appointment" || what === "Edit inquiry") {
      var c = custOf(); if (!c) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (what === "Add Lead Inquiry") return openInquiry(c);
      var sec = b.closest(".cr-inq"), idx = sec ? $$(".cr-inq", sec.parentNode).indexOf(sec) : -1;
      var mine = load().inq[c.id] || [];
      if (what === "Edit inquiry") { if (mine[idx]) openInquiry(c, mine[idx]); else openInquiry(c); return; }
      openAppointment(c, mine[idx] ? mine[idx].id : null);
    }
  }, true);

  /* ---------- Future Board ---------- */
  var baseBoard = null;
  function applyBoard() {
    var S = window.SampleData; if (!S || !S.boardDays) return;
    if (!baseBoard) baseBoard = JSON.stringify(S.boardDays);
    S.boardDays = JSON.parse(baseBoard);
    var names = (S.boardReps || []).map(function (r) { return r.name; });
    var db = load();
    Object.keys(db.inq).forEach(function (cid) {
      db.inq[cid].forEach(function (q) {
        q.appointments.forEach(function (a) {
          var day = S.boardDays.filter(function (d) { return d.date === a.date; })[0];
          if (!day) {
            var dd = new Date(a.date + "T12:00:00");
            day = { id: "mkc-" + a.date, label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dd.getDay()], date: a.date, confirmAge: "same",
              slots: TIMES.map(function (t) { return { time: BOARD_T[t[0]], cells: names.map(function () { return null; }) }; }) };
            S.boardDays.push(day); S.boardDays.sort(function (x, y) { return x.date < y.date ? -1 : 1; });
          }
          var slot = day.slots.filter(function (s) { return s.time === BOARD_T[a.time]; })[0], ri = names.indexOf(a.salesperson);
          if (!slot || ri < 0) return;
          var prod = q.products.map(function (p) { return p.product.slice(0, 2).toUpperCase(); }).join("/");
          var setter = (a.setBy || "").split(" ").map(function (p) { return p[0]; }).join("");
          slot.cells[ri] = { type: a.result === "Confirmed" ? "confirmed-next" : "set", lead: q.cust ? q.cust.name : "", state: "MI", mkc: true,
            label: (q.cust && q.cust.city ? q.cust.city.split(",")[0] + " " : "") + prod + " " + setter + ".", city: q.cust && q.cust.city, product: prod };
        });
      });
    });
  }

  /* ---------- user switcher + manager Team view ---------- */
  var ROLE_ORDER = [["marketer", "Marketers / setters"], ["confirmer", "Confirmer"], ["dataproc", "Data processors"], ["rep", "Sales reps"], ["manager", "Manager"]];
  function switchUser(id) {
    var u = T().users().filter(function (x) { return x.id === id; })[0]; if (!u) return;
    closeModal("mkc-team"); if (window.IHIApp) IHIApp.closeDrawer();
    if (window.IHIApp) IHIApp.signOut("switch");
    var sel = $("#login-user"), em = $("#email");
    if (sel && !$$("option", sel).some(function (o) { return o.value === id; })) sel.insertAdjacentHTML("beforeend", '<option value="' + esc(id) + '">' + esc(u.name) + "</option>");
    if (sel) sel.value = id; if (em) em.value = u.email;
    var f = $("#login-form"); if (f && f.requestSubmit) f.requestSubmit();
  }
  function switcherHTML() {
    var cur = me().id;
    return '<label class="mkc-switch" title="Switch user (sandbox)"><span class="sr-only">Signed-in user</span><select id="mkc-user" class="select" aria-label="Switch user">' +
      ROLE_ORDER.map(function (r) { var l = T().users(r[0]); return l.length ? '<optgroup label="' + esc(r[1]) + '">' + l.map(function (u) { return '<option value="' + esc(u.id) + '"' + (u.id === cur ? " selected" : "") + ">" + esc(u.name) + "</option>"; }).join("") + "</optgroup>" : ""; }).join("") + "</select></label>";
  }
  function stats(u) {
    var h = 0; for (var i = 0; i < u.id.length; i++) h = (h * 31 + u.id.charCodeAt(i)) >>> 0;
    var n = function (m, b) { h = (h * 1103515245 + 12345) >>> 0; return b + (h % m); };
    var db = load(), mine = 0; Object.keys(db.inq).forEach(function (k) { db.inq[k].forEach(function (q) { q.appointments.forEach(function (a) { if (a.setBy === u.name) mine++; }); }); });
    if (u.tenantRole === "marketer") return { a: n(60, 40) + " calls", b: (n(8, 2) + mine) + " appts set", c: n(30, 55) + "% contact rate" };
    if (u.tenantRole === "confirmer") return { a: n(30, 20) + " confirm calls", b: n(15, 10) + " confirmed", c: n(4, 0) + " cancels saved" };
    if (u.tenantRole === "dataproc") return { a: n(40, 20) + " leads entered", b: n(10, 2) + " dupes merged", c: n(5, 0) + " fixes pending" };
    if (u.tenantRole === "rep") return { a: n(4, 1) + " appts today", b: n(3, 0) + " sold this week", c: "$" + (n(30, 10) * 1000).toLocaleString() + " sold" };
    return { a: "—", b: "—", c: "—" };
  }
  function openTeam() {
    var rows = ROLE_ORDER.map(function (r) {
      return T().users(r[0]).map(function (u) { var s = stats(u); return '<tr data-team-user="' + esc(u.id) + '"><td><b>' + esc(u.name) + "</b></td><td>" + esc(u.roleLabel || u.role) + "</td><td>" + esc(u.division || "") + "</td><td>" + esc(s.a) + "</td><td>" + esc(s.b) + "</td><td>" + esc(s.c) + '</td><td><button type="button" class="btn btn-secondary btn-sm" data-view-as="' + esc(u.id) + '">Open their view</button></td></tr>'; }).join("");
    }).join("");
    var w = modal("mkc-team", "Team · today (sample stats)", '<div class="cr-table-wrap"><table class="cr-table mkc-team"><thead><tr><th>Name</th><th>Role</th><th>Division</th><th colspan="3">Today</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div><p class=\"mkc-note\">Open their view signs you in as that person (sandbox). Use the user switcher at the top to come back.</p>", '<button type="button" class="btn btn-secondary" data-close>Close</button>');
    $$("[data-view-as]", w).forEach(function (b) { b.addEventListener("click", function () { switchUser(b.getAttribute("data-view-as")); }); });
  }
  function decorate() {
    var top = $(".topbar") || $("#screen-app header");
    var old = $("#mkc-user-wrap"); if (old) old.remove();
    if (top) { var d = document.createElement("div"); d.id = "mkc-user-wrap"; d.innerHTML = switcherHTML(); top.insertBefore(d, top.firstChild ? top.lastElementChild : null);
      $("#mkc-user", d).addEventListener("change", function () { switchUser(this.value); }); }
    var nav = $(".sidebar nav") || $(".sidebar");
    var tb = $("#mkc-team-btn");
    if (nav && !tb) { nav.insertAdjacentHTML("beforeend", '<button type="button" class="nav-btn" id="mkc-team-btn"><span class="nav-icon" aria-hidden="true">👥</span> Team</button>'); tb = $("#mkc-team-btn"); tb.addEventListener("click", openTeam); }
    if (tb) tb.hidden = me().role !== "Manager";
    var vl = $("#view-leads");
    if (vl && !$("#mkc-new-inq")) vl.insertAdjacentHTML("afterbegin", '<div class="mkc-rbar"><button type="button" class="btn btn-primary btn-sm" id="mkc-new-inq">+ New inquiry</button></div>');
    var lu = $("#login-user");
    if (lu) $$("option", lu).forEach(function (o) { var u = T().users().filter(function (x) { return x.id === o.value; })[0]; if (u && u.offTenant && !/Sample$/.test(u.name)) o.remove(); });
  }
  document.addEventListener("ihi:signin", function () { setTimeout(decorate, 0); });
  document.addEventListener("DOMContentLoaded", function () { hookRecord(); applyBoard(); decorate(); });
  hookRecord();
  window.MkcExtra = { load: load, switchUser: switchUser, openTeam: openTeam, applyBoard: applyBoard, TEMPLATES: TEMPLATES };
})();
