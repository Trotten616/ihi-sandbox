/* Infinity Home Improvement Command Center — v16 phone shell (PWA-shell track).
   Phone (≤760px) app is for SALES REPS ONLY: 4 tabs Today | My Leads | Calendar | My Activity.
   Manager gets a "View as rep" picker first; everyone else gets a friendly "use the desktop" card.
   Also: demo passcode gate, 30-minute idle sign-out, top-bar menu, sheets + system Back, install prompt,
   service-worker registration, offline bar. Desktop (>760px) is untouched. See MOBILE-shell.md. */
(function () {
  "use strict";
  var M = window.IHIMobile || (window.IHIMobile = {});
  var P = window.IHIPages;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = M.esc || function (v) { return String(v == null ? "" : v); };
  var roleKey = function (r) { return P ? P.roleKey(r) : String(r || "").toLowerCase(); };

  /* ———————————————————— config ———————————————————— */
  var IDLE_MINUTES = 30;                      /* HR draft policy: auto sign-out after 30 min of no activity */
  var APP_VERSION = "v16"; /* app version label (menu footer); bump with ?v= in index.html and CACHE in sw.js */
  var GATE_KEY = "mkc-gate-v16";
  /* SHA-256 of the demo passcode (lower-case, spaces removed). Keeps casual visitors out only — sample data. */
  var GATE_HASH = "2978748a5b4178948546114de647523634573c3eb446e6e8ad8a512f34a7e21b";
  var TABS = [
    { route: "today", label: "Today", icon: "⌂" },
    { route: "my-leads", label: "My Leads", icon: "☰" },
    { route: "calendar", label: "Calendar", icon: "▦" },
    { route: "my-activity", label: "My Activity", icon: "✓" }
  ];
  var PHONE_ROUTES = TABS.map(function (t) { return t.route; });
  var CACHE_PREFIX = "mkc-cc-sandbox-";
  var CACHE_NAME = "mkc-cc-sandbox-v16";

  function app() { return window.IHIApp; }
  function isPhone() { return !!(M.isPhone && M.isPhone()); }
  function appActive() { var a = $("#screen-app"); return !!(a && a.classList.contains("active")); }
  function users() { return (window.SampleData && SampleData.users) || []; }
  function isRepUser(u) { return !!u && (u.rep === true || roleKey(u.role) === "salesrep" || (Array.isArray(u.roles) && u.roles.some(function (r) { return roleKey(r) === "salesrep"; }))); }
  function isManager(u) { return !!u && roleKey(u.role) === "manager"; }
  /* Sales reps for "View as rep": sample users with role "Sales rep"; until those exist, the active sample
     salespeople (Mitch, Danny, Dylan, James) from SampleData.salesFilters/salespeople. */
  function salespeople() {
    var sd = window.SampleData || {}, list = sd.salespeople || (sd.salesFilters && sd.salesFilters.salespeople) || [];
    if (!list.length) { for (var k in sd) { if (sd[k] && Array.isArray(sd[k].salespeople)) { list = sd[k].salespeople; break; } } }
    return list.filter(function (s) { return s && s.active !== false && s.name; }).map(function (s) {
      return { id: s.id, name: s.name, initials: s.initials || s.name.split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(), role: "Sales rep", salesperson: true };
    });
  }
  /* View-as-rep list = only reps that have sample appointments (window.SAMPLE_REP_APPTS, js/data/rep-appts.js).
     Fallbacks (rep-role users, then salespeople) only apply to builds without that file. */
  function repUsers() {
    var data = window.SAMPLE_REP_APPTS || null;
    var hasData = function (r) { return !data || (Array.isArray(data[r.id]) && data[r.id].length > 0); };
    var sr = window.SampleReps && Array.isArray(SampleReps.users) ? SampleReps.users.filter(hasData) : null;
    if (sr && sr.length) return sr;
    if (window.SAMPLE_REP_APPTS) {
      var ids = Object.keys(SAMPLE_REP_APPTS), fromIds = users().filter(function (x) { return ids.indexOf(x.id) >= 0; });
      if (fromIds.length) return fromIds;
    }
    var u = users().filter(isRepUser); return u.length ? u : salespeople();
  }

  /* ———————————————————— rep scope ———————————————————— */
  function repKey(mgr) { return "mkc-phone-rep:" + (mgr ? mgr.id : ""); }
  function chosenRep() {
    var a = app(); if (!a) return null;
    var u = a.currentUser(); if (!u) return null;
    if (isRepUser(u)) return u;
    if (isManager(u)) { var id = localStorage.getItem(repKey(u)); return repUsers().filter(function (r) { return r.id === id; })[0] || null; }
    return null;
  }
  function setChosenRep(id) {
    var u = app().currentUser();
    if (id) localStorage.setItem(repKey(u), id); else localStorage.removeItem(repKey(u));
    syncChrome();
    app().navigate("home");
  }
  /* ctx passed to registered pages: adds rep (the rep being viewed: the rep themself, or the manager's pick). */
  function ctx(base) {
    var u = base.user, rep = chosenRep();
    rep = rep || (isRepUser(u) ? u : null);
    base.rep = rep ? Object.assign({}, rep, { id: rep.id, name: rep.name }) : null; /* pages match by id or name */
    base.role = u ? roleKey(u.role) : null;
    base.viewingAsRep = !!(u && rep && u.id !== rep.id);
    return base;
  }

  /* ———————————————————— phone intercept (called by app.js renderCurrentView) ———————————————————— */
  function showPane(id) {
    document.querySelectorAll("#screen-app .view").forEach(function (v) { v.classList.remove("active"); });
    var p = document.getElementById(id); if (p) p.classList.add("active");
    return p;
  }
  function card(html) { var p = showPane("view-phone"); p.innerHTML = '<div class="card m-card-center">' + html + "</div>"; return p; }
  function intercept(view) {
    if (!isPhone() || !app()) return false;
    var u = app().currentUser();
    syncChrome();
    /* Future Board (whole week) is usable on phone for managers/marketers: horizontal scroll */
    if (view === "appointments" && u && !isRepUser(u)) { showPane("view-appointments"); return false; }
    if (view === "jobs" && u) { showPane("view-jobs"); return false; } /* Jobs Board: every user + manager, phone too */
    if (!isRepUser(u) && !isManager(u)) {
      card('<div class="m-card-icon" aria-hidden="true">📱</div><h2>The phone app is for sales reps.</h2>' +
        '<p>Use the desktop Command Center. You’re signed in as ' + esc(u ? u.name : "") + ' (' + esc(u ? (u.roleLabel || u.role) : "") + ').</p>' +
        '<button type="button" class="btn btn-primary" data-m-signout>Sign out</button>');
      return true;
    }
    /* Future Board (whole week) is usable on phone for managers/marketers: horizontal scroll */
    if (isManager(u) && !chosenRep()) { renderRepPicker(); return true; }
    if (view === "home") { app().navigate("today"); return true; } /* phone Today = registry route "today" */
    if (PHONE_ROUTES.indexOf(view) < 0) {
      card('<div class="m-card-icon" aria-hidden="true">🖥</div><h2>This page is on the desktop Command Center</h2>' +
        '<p>The phone app has Today, My Leads, Calendar and My Activity.</p>' +
        '<button type="button" class="btn btn-primary" data-m-go="home">Go to Today</button>');
      return true;
    }
    return false; /* registered phone route → normal registry render */
  }
  function runPage(route) {
    var pane = showPane("view-page"), root = $("#page-root");
    try {
      var out = app().renderPage(route, root);
      if (out && typeof out.then === "function") out.catch(function (e) { pageError(root, e); });
    } catch (e) { pageError(root, e); }
    return pane;
  }
  function pageError(root, e) {
    console.error("[Command Center] phone page failed:", e);
    root.innerHTML = '<div class="card view-error" role="alert"><h2>This page couldn’t load</h2><p>Nothing was changed. Try Today, or sign out and back in.</p><button type="button" class="btn btn-primary" data-m-go="home">Go to Today</button></div>';
  }
  function renderRepPicker() {
    var reps = repUsers(), u = app().currentUser();
    card('<h2>View as rep</h2><p>The phone app shows one sales rep’s day. Pick a rep to see exactly what they see (sample data).</p>' +
      (reps.length ? '<div class="m-rep-list" role="list">' + reps.map(function (r) {
        return '<button type="button" class="m-rep-btn" role="listitem" data-m-rep="' + esc(r.id) + '"><span class="avatar">' + esc(r.initials || "") + '</span><span>' + esc(r.name) + '</span></button>';
      }).join("") + "</div>" : '<p class="m-muted">No sample sales reps yet.</p>') +
      '<button type="button" class="btn btn-ghost m-wide" data-m-signout>Sign out ' + esc(u ? u.name : "") + "</button>");
  }

  /* ———————————————————— chrome: tab bar, title, menu button ———————————————————— */
  function buildTabbar() {
    var nav = $("#m-tabbar"); if (!nav) return;
    nav.innerHTML = TABS.map(function (t) {
      return '<button type="button" class="m-tab" data-m-tab="' + t.route + '"><span class="m-tab-icon" aria-hidden="true">' + t.icon + '</span><span class="m-tab-label">' + t.label + "</span></button>";
    }).join("");
  }
  function syncChrome() {
    var a = app(); if (!a || !document.body) return;
    var u = a.currentUser(), phone = isPhone();
    var tabs = phone && appActive() && (isRepUser(u) || (isManager(u) && !!chosenRep()));
    document.body.classList.toggle("m-has-tabs", !!tabs);
    var route = a.route();
    document.querySelectorAll("#m-tabbar [data-m-tab]").forEach(function (b) {
      var on = b.getAttribute("data-m-tab") === route;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    var viewing = $("#m-viewing");
    if (viewing) {
      var rep = chosenRep();
      var show = phone && isManager(u) && rep;
      viewing.hidden = !show;
      if (show) viewing.innerHTML = 'Viewing as <strong>' + esc(rep.name) + '</strong> · change in ⋮ menu';
    }
    if (phone && appActive()) {
      var t = TABS.filter(function (x) { return x.route === route; })[0];
      if (t) { var pt = $("#page-title"); if (pt) pt.textContent = t.label; }
    }
  }

  /* --banner-h / --m-topbar-h stay current (banner can wrap; topbar height on phone). Desktop at normal widths: no change. */
  function syncBars() {
    var root = document.documentElement, b = $(".sample-banner"), t = $(".topbar");
    root.style.removeProperty("--banner-h");
    if (b) {
      var cssH = b.getBoundingClientRect().height, prev = b.style.height;
      b.style.height = "auto"; var natural = b.getBoundingClientRect().height; b.style.height = prev;
      if (natural > cssH + 1) root.style.setProperty("--banner-h", Math.ceil(natural) + "px");
    }
    if (isPhone() && t && t.offsetHeight) root.style.setProperty("--m-topbar-h", t.offsetHeight + "px");
    else root.style.removeProperty("--m-topbar-h");
  }

  /* ———————————————————— sheets + system Back ———————————————————— */
  var stack = [], ignorePops = 0, seq = 0;
  function pushOverlay(id, closeFn) {
    stack.push({ id: id, close: closeFn, href: location.href });
    try { history.pushState({ ihiOverlay: id }, "", location.href); } catch (e) { /* ignore */ }
  }
  function overlayClosed(id) {
    for (var i = stack.length - 1; i >= 0; i--) {
      if (stack[i].id !== id) continue;
      var o = stack.splice(i, 1)[0];
      if (history.state && history.state.ihiOverlay === id && location.href === o.href) { ignorePops++; history.back(); }
      else if (history.state && history.state.ihiOverlay === id) { history.replaceState(null, "", location.href); }
      return;
    }
  }
  window.addEventListener("popstate", function () {
    if (ignorePops > 0) { ignorePops--; return; }
    var top = stack.pop();
    if (top) top.close(true);
  });
  /* IHIMobile.openSheet({ title, html | render(el), variant: 'full' (default; full-screen on phone with Back) | 'bottom' | 'menu', onClose })
     → { el, body, close() }. On desktop a 'full' sheet shows as a right-hand panel. */
  function openSheet(opts) {
    opts = opts || {};
    var id = "sheet-" + (++seq), variant = opts.variant || "full";
    var bd = document.createElement("div"); bd.className = "m-sheet-backdrop";
    var el = document.createElement("section");
    el.className = "m-sheet m-sheet-" + variant + (opts.className ? " " + opts.className : "");
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", opts.title || "Details");
    el.innerHTML = '<header class="m-sheet-head">' +
      (variant === "full" ? '<button type="button" class="m-back" data-m-sheet-close aria-label="Back">‹ Back</button>' : "") +
      '<h2 class="m-sheet-title">' + esc(opts.title || "") + "</h2>" +
      (variant !== "full" ? '<button type="button" class="icon-btn m-sheet-x" data-m-sheet-close aria-label="Close">✕</button>' : "") +
      '</header><div class="m-sheet-body"></div>';
    document.body.appendChild(bd); document.body.appendChild(el);
    var body = el.querySelector(".m-sheet-body"), closed = false;
    if (opts.html != null) body.innerHTML = opts.html;
    function close(fromPop) {
      if (closed) return; closed = true;
      el.classList.remove("open"); bd.classList.remove("open");
      setTimeout(function () { el.remove(); bd.remove(); }, 220);
      if (!fromPop) overlayClosed(id); else stack = stack.filter(function (o) { return o.id !== id; });
      document.body.classList.toggle("m-sheet-open", !!document.querySelector(".m-sheet.open"));
      if (opts.onClose) try { opts.onClose(); } catch (e) { console.error(e); }
    }
    bd.addEventListener("click", function () { close(); });
    el.addEventListener("click", function (e) { if (e.target.closest("[data-m-sheet-close]")) close(); });
    el.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); close(); } });
    if (typeof opts.render === "function") try { opts.render(body, { close: close }); } catch (e) { console.error(e); body.innerHTML = '<p class="m-muted">Couldn’t show this.</p>'; }
    pushOverlay(id, close);
    requestAnimationFrame(function () { el.classList.add("open"); bd.classList.add("open"); document.body.classList.add("m-sheet-open"); var f = el.querySelector("[data-m-sheet-close]"); if (f) f.focus(); });
    return { el: el, body: body, close: function () { close(); } };
  }
  function closeSheets() { stack.slice().reverse().forEach(function (o) { if (o.id.indexOf("sheet-") === 0) o.close(); }); }
  /* existing drawer (customer record) + report modal join the Back stack */
  function watchOverlay(el, id, closeFn) {
    if (!el || !window.MutationObserver) return;
    var wasOpen = el.classList.contains("open");
    new MutationObserver(function () {
      var open = el.classList.contains("open");
      if (open === wasOpen) return; wasOpen = open;
      if (open) pushOverlay(id, function () { closeFn(); });
      else overlayClosed(id);
    }).observe(el, { attributes: true, attributeFilter: ["class"] });
  }

  /* Page-owned modal sheets (e.g. track 2 .rl-sheet, track 3 .cal3-sheet) also join the Back stack:
     any [role=dialog][aria-modal=true] added to <body> gets a history entry; Back closes it via its close button
     ([data-m-sheet-close], [data-rl-close], [data-cal-close], [aria-label=Close]) or Escape. */
  var pageDialogs = [];
  function closePageDialog(d) {
    var b = d.querySelector('[data-m-sheet-close], [data-rl-close], [data-cal-close], [aria-label="Close"]');
    if (b) b.click();
    else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  }
  function watchPageDialogs() {
    if (!window.MutationObserver) return;
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.removedNodes, function (n) {
          if (n.nodeType !== 1) return;
          pageDialogs = pageDialogs.filter(function (pd) {
            if (n === pd.el || n.contains(pd.el)) { overlayClosed(pd.id); return false; }
            return true;
          });
        });
        Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (n.nodeType !== 1 || !n.matches) return;
          var d = n.matches('[role="dialog"][aria-modal="true"]') ? n : n.querySelector('[role="dialog"][aria-modal="true"]');
          if (!d || d.closest(".m-sheet, .drawer, .modal")) return;
          if (pageDialogs.some(function (pd) { return pd.el === d; })) return;
          var id = "page-dlg-" + (++seq);
          pageDialogs.push({ el: d, id: id });
          pushOverlay(id, function () { closePageDialog(d); });
        });
      });
    }).observe(document.body, { childList: true });
  }

  /* ———————————————————— top-bar menu (phone): Sign out, theme, Install app (+ View as rep for manager) ———————————————————— */
  function openMenu() {
    var a = app(), u = a.currentUser(), dark = a.theme() === "dark";
    var standalone = window.matchMedia && matchMedia("(display-mode: standalone)").matches;
    var install = standalone || installed ? '<p class="m-menu-note">✓ Installed as an app</p>'
      : deferredPrompt ? '<button type="button" class="m-menu-item" data-m-install><span aria-hidden="true">⤓</span> Install app</button>'
      : '<button type="button" class="m-menu-item" data-m-install-help><span aria-hidden="true">⤓</span> Install app</button><p class="m-menu-note" id="m-install-help" hidden>In Chrome, tap the menu (⋮) &gt; <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</p>';
    var rep = chosenRep();
    openSheet({
      title: u ? u.name : "Menu", variant: "menu",
      html: '<p class="m-menu-who">' + esc(u ? (u.roleLabel || u.role) : "") + (rep && u && rep.id !== u.id ? " · viewing as " + esc(rep.name) : "") + "</p>" +
        (isManager(u) ? '<button type="button" class="m-menu-item" data-m-change-rep><span aria-hidden="true">👤</span> View as rep…</button>' : "") +
        '<button type="button" class="m-menu-item" data-m-theme role="switch" aria-checked="' + dark + '"><span aria-hidden="true">' + (dark ? "☀" : "☾") + "</span> " + (dark ? "Light mode" : "Dark mode") + "</button>" +
        install +
        '<button type="button" class="m-menu-item m-menu-signout" data-m-signout><span aria-hidden="true">⎋</span> Sign out</button>' +
        '<p class="m-menu-note m-menu-version">Version ' + esc(APP_VERSION) + ' · sample data</p>',
      render: function (body, s) {
        body.addEventListener("click", function (e) {
          if (e.target.closest("[data-m-theme]")) { a.toggleTheme(); s.close(); }
          else if (e.target.closest("[data-m-change-rep]")) { s.close(); setChosenRep(null); }
          else if (e.target.closest("[data-m-install]")) { s.close(); promptInstall(); }
          else if (e.target.closest("[data-m-install-help]")) { var h = body.querySelector("#m-install-help"); if (h) h.hidden = false; }
        });
      }
    });
  }

  /* ———————————————————— install prompt ———————————————————— */
  var deferredPrompt = null, installed = false;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; document.body && document.body.classList.add("m-can-install"); });
  window.addEventListener("appinstalled", function () { installed = true; deferredPrompt = null; if (M.toast) M.toast("Installed. Open Command Center from your home screen."); });
  function promptInstall() {
    if (!deferredPrompt) { if (M.toast) M.toast("In Chrome: menu (⋮) > Install app"); return; }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function () { deferredPrompt = null; });
  }

  /* ———————————————————— passcode gate ———————————————————— */
  function gatePassed() { try { return localStorage.getItem(GATE_KEY) === GATE_HASH; } catch (e) { return false; } }
  function sha256(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      });
    }
    return Promise.resolve(sha256js(text)); /* plain-http LAN fallback (no crypto.subtle) */
  }
  function sha256js(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, max = mp(2, 32), result = "", words = [], i, j;
    ascii = unescape(encodeURIComponent(ascii));
    var bitLen = ascii.length * 8, hash = [], k = [], pc = 0, isC = {};
    for (var c = 2; pc < 64; c++) { if (!isC[c]) { for (i = 0; i < 313; i += c) isC[i] = c; hash[pc] = (mp(c, .5) * max) | 0; k[pc++] = (mp(c, 1 / 3) * max) | 0; } }
    hash = hash.slice(0, 8); ascii += "\x80";
    while (ascii.length % 64 - 56) ascii += "\x00";
    for (i = 0; i < ascii.length; i++) { j = ascii.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
    words[words.length] = ((bitLen / max) | 0); words[words.length] = bitLen;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = hash; hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
          (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : "") + b.toString(16); }
    return result;
  }
  function bindGate() {
    var f = $("#gate-form"); if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var inp = $("#gate-code"), err = $("#gate-error");
      var v = (inp.value || "").trim().toLowerCase().replace(/\s+/g, "");
      sha256(v).then(function (h) {
        if (h === GATE_HASH) {
          try { localStorage.setItem(GATE_KEY, GATE_HASH); } catch (x) { /* private mode */ }
          err.hidden = true; inp.value = "";
          app().showScreen("screen-login");
          var em = $("#email"); if (em && !isPhone()) em.focus();
        } else { err.textContent = "That passcode isn’t right. Ask Thomas for the demo passcode."; err.hidden = false; inp.select(); }
      });
    });
  }

  /* ———————————————————— idle sign-out ———————————————————— */
  var lastActive = Date.now();
  function idleLimitMs() {
    var o = parseFloat(localStorage.getItem("mkc-idle-minutes") || ""); /* QA override only */
    return (o > 0 ? o : api.IDLE_MINUTES) * 60000;
  }
  function touch() { lastActive = Date.now(); }
  function checkIdle() {
    if (!appActive()) { touch(); return; }
    if (Date.now() - lastActive >= idleLimitMs()) { closeSheets(); app().signOut("idle"); touch(); }
  }

  /* ———————————————————— service worker + caches ———————————————————— */
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    var ok = location.protocol === "https:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (!ok) return;
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function (e) { console.warn("[Command Center] service worker not registered:", e && e.message); });
  }
  function clearCaches() {
    if (!window.caches) return;
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf(CACHE_PREFIX) === 0; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return caches.open(CACHE_NAME).then(function (c) { return c.add("offline.html"); }); }).catch(function () { /* offline: fine */ });
  }

  /* ———————————————————— offline bar ———————————————————— */
  function syncOnline() { document.body.classList.toggle("is-offline", navigator.onLine === false); }

  /* ———————————————————— wiring ———————————————————— */
  var api = {
    IDLE_MINUTES: IDLE_MINUTES, TABS: TABS, PHONE_ROUTES: PHONE_ROUTES,
    gatePassed: gatePassed, intercept: intercept, ctx: ctx,
    VERSION: APP_VERSION, chosenRep: chosenRep, setChosenRep: setChosenRep, isRepUser: isRepUser, repUsers: repUsers,
    openMenu: openMenu, syncChrome: syncChrome, syncBars: syncBars, clearCaches: clearCaches, sha256: sha256
  };
  window.IHIShell = api;
  M.openSheet = openSheet;
  M.closeSheets = closeSheets;

  document.addEventListener("DOMContentLoaded", function () {
    buildTabbar(); bindGate(); registerSW(); syncOnline(); syncBars();
    window.addEventListener("resize", syncBars); window.addEventListener("orientationchange", syncBars);
    document.addEventListener("ihi:signin", function () { setTimeout(syncBars, 0); });
    window.addEventListener("online", syncOnline); window.addEventListener("offline", syncOnline);
    watchOverlay($(".drawer"), "drawer", function () { app().closeDrawer(); });
    watchPageDialogs();
    watchOverlay($("#report-modal"), "report-modal", function () { app().closeReportModal(); });
    var db = $("#drawer-back"); if (db) db.addEventListener("click", function () { app().closeDrawer(); });
    var mb = $("#report-modal-back"); if (mb) mb.addEventListener("click", function () { app().closeReportModal(); });
    var menuBtn = $("#m-menu-btn"); if (menuBtn) menuBtn.addEventListener("click", openMenu);
    var chip = $("#user-chip"); if (chip) chip.addEventListener("click", function () { if (isPhone()) openMenu(); });

    document.addEventListener("click", function (e) {
      var t;
      if ((t = e.target.closest("[data-m-tab]"))) { closeSheets(); app().navigate(t.getAttribute("data-m-tab")); }
      else if ((t = e.target.closest("[data-m-go]"))) app().navigate(t.getAttribute("data-m-go"));
      else if ((t = e.target.closest("[data-m-rep]"))) setChosenRep(t.getAttribute("data-m-rep"));
      else if (e.target.closest("[data-m-signout]")) { closeSheets(); app().signOut(); }
    });
    document.addEventListener("ihi:navigate", syncChrome);
    document.addEventListener("ihi:signin", function () { touch(); syncChrome(); });
    document.addEventListener("ihi:signout", function () { document.body.classList.remove("m-has-tabs"); clearCaches(); });
    document.addEventListener("ihi:layout", function () {
      if (!appActive() || !app()) return;
      var r = app().route();
      /* back to desktop width: phone-only tabs go back to the v15 Home */
      if (!isPhone() && PHONE_ROUTES.indexOf(r) >= 0) r = "home";
      app().navigate(r, { keepScroll: true });
      syncChrome();
    });
    ["pointerdown", "keydown", "touchstart", "wheel", "scroll"].forEach(function (ev) { window.addEventListener(ev, touch, { passive: true, capture: true }); });
    setInterval(checkIdle, 15000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) checkIdle(); });
    window.addEventListener("pageshow", checkIdle);
    window.addEventListener("focus", checkIdle);
  });
})();
