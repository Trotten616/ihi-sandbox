/* ==========================================================================
   SANDBOX shared overlay. Every app on the sandbox site includes it LAST in <head>:
     <link rel="stylesheet" href="/ihi-sandbox/shared/sandbox.css">
     <script src="/ihi-sandbox/shared/sandbox.js" data-app="cc"></script>
   Optional attributes on the script tag:
     data-keys="pfx1,pfx2"       extra localStorage/sessionStorage key prefixes owned by this app
     data-caches="pfx1,pfx2"     extra Cache Storage name prefixes owned by this app
     data-layout="flow|cc|none"  how the banner sits (default flow = in-flow first child of <body>, before the
                                 app's own shell; cc = fixed bar that shifts the Command Center's --banner-h)
     data-unlock-preset="key"    localStorage key the app's OWN passcode gate checks; set to the
                                 sandbox hash when the sandbox is unlocked (so there is only one gate)
   What it does: shared SANDBOX banner (Home / Reset this app / Reset everything), passcode gate
   (unlock flag set on the launcher), blocks tel:/sms:/mailto:/app-link:/other schemes and external
   links (map links allowed), blocks non-same-origin fetch / XHR / sendBeacon / WebSocket /
   EventSource / window.open / form posts, forces IHIMobile.CALLS_ENABLED = false.
   Sample data only. Nothing here talks to any real system.
   ========================================================================== */
(function () {
  "use strict";
  if (window.__SANDBOX_OVERLAY__) return;
  window.__SANDBOX_OVERLAY__ = true;

  var me = document.currentScript;
  var attr = function (n) { return (me && me.getAttribute(n)) || ""; };
  var APP = attr("data-app") || "unknown";
  var VERSION = "sandbox-overlay-3";
  var BASE = "/ihi-sandbox";   /* GitHub Pages project-site prefix */

  /* ---------------- passcode (hash only; passcode itself is NOT in this file) ---------------- */
  var UNLOCK_KEY = "sandbox:unlock";
  var UNLOCK_HASH = "2978748a5b4178948546114de647523634573c3eb446e6e8ad8a512f34a7e21b"; /* SHA-256 */
  var KEEP_KEYS = [UNLOCK_KEY];   /* survive "Reset everything" so testers aren't re-gated */

  /* ---------------- app registry ----------------
     prefixes: localStorage + sessionStorage key prefixes the app owns
     caches:   Cache Storage name prefixes the app owns
     path:     URL path; service workers whose scope is under it belong to the app
     resetAs:  reset another app's data instead (the rep page just frames /cc/)
     To add an app: add an entry here, create /<path>/, include the script tag with data-app. */
  var REGISTRY = {
    launcher: { label: "Sandbox home", path: BASE + "/", prefixes: ["sandbox:launcher:"], caches: [] },
    cc: {
      label: "Command Center", path: "/ihi-sandbox/cc/",
      /* discovered by grepping /cc/js (make-cc-sandbox.sh re-checks every build):
         ihi-command-theme[:user], ihi-command-office, ihi-command-user, ihi-gate-v16,
         ihi-phone-rep:<mgr>, ihi-idle-minutes, legacy ig-command-theme / ig-command-office */
      prefixes: ["ihi-", "ig-command-"],
      caches: ["ihi-cc-sandbox-", "ihi-cc-"]
    },
    rep: { label: "Sales rep phone app", path: "/ihi-sandbox/rep/", resetAs: "cc", prefixes: [], caches: [] },
    /* IntelliGro Agent Platform (built by another worker). Current desktop app uses "intelligro.*" keys;
       the phone build is expected to use "igm_". Both apps can extend these with data-keys. */
    agents: { label: "Agent Platform phone", path: "/ihi-sandbox/agents/", prefixes: ["igm_", "igm-", "intelligro.mobile.", "intelligro-mobile"], caches: ["igm-", "intelligro-mobile", "agents-sandbox-"] },
    /* agents-desktop: keys "igd_*"; the app's own simulator reset (window.IGD_SIM.reset) is called when present */
    "agents-desktop": { label: "Agent Platform desktop", path: "/ihi-sandbox/agents-desktop/", prefixes: ["igd_"], caches: ["igd-", "agents-desktop-sandbox-"], hook: "IGD_SIM" }
  };
  var reg = REGISTRY[APP] || { label: APP, path: BASE + "/" + APP + "/", prefixes: [APP + ":"], caches: [APP + "-"] };
  var split = function (s) { return s ? s.split(",").map(function (x) { return x.trim(); }).filter(Boolean) : []; };
  reg.prefixes = (reg.prefixes || []).concat(split(attr("data-keys")));
  reg.caches = (reg.caches || []).concat(split(attr("data-caches")));
  REGISTRY[APP] = reg;

  var ls = (function () { try { return window.localStorage; } catch (e) { return null; } })();
  var ss = (function () { try { return window.sessionStorage; } catch (e) { return null; } })();
  function unlocked() { try { return !!ls && ls.getItem(UNLOCK_KEY) === UNLOCK_HASH; } catch (e) { return false; } }

  document.documentElement.setAttribute("data-sb-app", APP);
  document.documentElement.setAttribute("data-sb-layout", attr("data-layout") || "flow");
  document.documentElement.classList.add("sb-on");

  /* ---------------- gate: not unlocked -> launcher, then back ---------------- */
  if (APP !== "launcher" && !unlocked()) {
    document.documentElement.style.visibility = "hidden";
    var target = window.top !== window ? null : location.pathname + location.search + location.hash;
    var dest = BASE + "/?next=" + encodeURIComponent(target || (BASE + "/"));
    try { (window.top !== window ? window.top : window).location.replace(target ? dest : BASE + "/"); } catch (e) { location.replace(dest); }
    return;
  }
  /* one gate only: pre-satisfy the app's own demo gate with the sandbox hash */
  if (APP !== "launcher" && unlocked()) {
    split(attr("data-unlock-preset")).forEach(function (k) { try { if (ls.getItem(k) !== UNLOCK_HASH) ls.setItem(k, UNLOCK_HASH); } catch (e) {} });
  }

  /* ---------------- URL classification ---------------- */
  var MAP_HOSTS = [/^(www\.)?google\.[a-z.]+$/i, /^maps\.google\.[a-z.]+$/i, /^maps\.app\.goo\.gl$/i, /^goo\.gl$/i,
    /^(www\.)?mapquest\.com$/i, /^(www\.)?bing\.com$/i, /^maps\.apple\.com$/i];
  function parse(u) { try { return new URL(u, location.href); } catch (e) { return null; } }
  function sameOrigin(u) { var x = parse(u); return !!x && x.origin === location.origin; }
  function isMapUrl(x) {
    if (!x) return false;
    if (x.protocol === "geo:") return true;
    if (!/^https?:$/.test(x.protocol)) return false;
    var h = x.hostname, p = x.pathname;
    if (/^maps\.(google\.[a-z.]+|apple\.com)$/i.test(h) || /^maps\.app\.goo\.gl$/i.test(h)) return true;
    if (/google\.[a-z.]+$/i.test(h) && /^\/maps(\/|$)/.test(p)) return true;
    if (/^goo\.gl$/i.test(h) && /^\/maps\//.test(p)) return true;
    if (/(^|\.)mapquest\.com$/i.test(h)) return true;
    if (/(^|\.)bing\.com$/i.test(h) && /^\/maps(\/|$)/.test(p)) return true;
    return false;
  }
  /* returns "ok" | "map" | "blocked" */
  function classify(href) {
    if (href == null) return "ok";
    var raw = String(href).trim();
    if (!raw || raw.charAt(0) === "#") return "ok";
    if (/^javascript:/i.test(raw)) return "ok";            /* in-page app handlers */
    var x = parse(raw);
    if (!x) return "blocked";
    if (x.protocol === "blob:" || x.protocol === "data:") return "ok";   /* locally generated files */
    if (isMapUrl(x)) return "map";
    if (/^https?:$/.test(x.protocol)) return x.origin === location.origin ? "ok" : "blocked";
    return "blocked";                                        /* tel: sms: mailto: intent: whatsapp: ... */
  }
  function why(href) {   /* "Disabled in sandbox: <this>" */
    var m = /^([a-z][a-z0-9+.-]*):/i.exec(String(href || "").trim());
    var s = m ? m[1].toLowerCase() : "";
    if (s === "tel") return "phone calls are off here.";
    if (s === "sms") return "texting is off here.";
    if (s === "mailto") return "email is off here.";
    if (s === "http" || s === "https") return "outside links are off here.";
    return "this link is off here.";
  }

  /* ---------------- toast ---------------- */
  var toastEl, toastTimer;
  function toast(msg) {
    try {
      if (!toastEl) {
        toastEl = document.createElement("div");
        toastEl.className = "sb-toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
        (document.body || document.documentElement).appendChild(toastEl);
      }
      toastEl.textContent = msg;
      toastEl.classList.add("sb-toast-show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove("sb-toast-show"); }, 2600);
    } catch (e) {}
  }
  var blockedLog = window.__SANDBOX_BLOCKED__ = [];
  function noteBlocked(kind, url) {
    blockedLog.push({ kind: kind, url: String(url), at: new Date().toISOString() });
    try { console.info("[sandbox] blocked " + kind + ": " + url); } catch (e) {}
  }

  /* ---------------- link kill-switch (capture phase, runs before app handlers) ---------------- */
  function onLinkActivate(ev) {
    if (ev.defaultPrevented && ev.type === "click") { /* still check: app may preventDefault then navigate itself */ }
    var t = ev.target && ev.target.closest ? ev.target.closest("a[href], area[href]") : null;
    if (!t) return;
    if (t.closest(".sb-banner")) return;
    var href = t.getAttribute("href");
    var c = classify(href);
    if (c === "blocked") {
      ev.preventDefault(); ev.stopPropagation(); if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      noteBlocked("link", t.href || href);
      toast("Disabled in sandbox: " + why(href));
    } else if (c === "map") {
      t.setAttribute("target", "_blank"); t.setAttribute("rel", "noopener noreferrer");
    }
  }
  window.addEventListener("click", onLinkActivate, true);
  window.addEventListener("auxclick", onLinkActivate, true);

  /* forms that post somewhere else */
  window.addEventListener("submit", function (ev) {
    var f = ev.target; if (!f || !f.getAttribute) return;
    var a = f.getAttribute("action");
    if (a && classify(a) !== "ok") { ev.preventDefault(); ev.stopImmediatePropagation(); noteBlocked("form", a); toast("Disabled in sandbox: sending forms outside the sandbox is off."); }
  }, true);

  /* mark links so testers can see what is safe and what is off */
  function mark(root) {
    try {
      var list = (root || document).querySelectorAll ? (root || document).querySelectorAll("a[href], area[href]") : [];
      for (var i = 0; i < list.length; i++) {
        var a = list[i];
        if (a.__sbMarked === a.getAttribute("href")) continue;
        a.__sbMarked = a.getAttribute("href");
        if (a.closest(".sb-banner")) continue;
        var c = classify(a.getAttribute("href"));
        a.classList.toggle("sb-map-link", c === "map");
        a.classList.toggle("sb-blocked-link", c === "blocked");
        if (c === "map") { a.setAttribute("title", "Opens Google Maps in a new tab (allowed in sandbox, read-only)"); a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer"); }
        else if (c === "blocked") a.setAttribute("title", "Disabled in sandbox");
      }
    } catch (e) {}
  }

  /* ---------------- network kill-switch ---------------- */
  function blockedNet(kind, url) { noteBlocked(kind, url); toast("Disabled in sandbox: a network call to an outside system was blocked."); }
  if (window.fetch) {
    var _fetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || String(input);
      if (!sameOrigin(url)) { blockedNet("fetch", url); return Promise.reject(new TypeError("Blocked in sandbox: " + url)); }
      return _fetch.apply(this, arguments);
    };
  }
  if (window.XMLHttpRequest) {
    var XP = XMLHttpRequest.prototype, _open = XP.open, _send = XP.send;
    XP.open = function (method, url) { this.__sbUrl = url; this.__sbBlocked = !sameOrigin(url); return _open.apply(this, arguments); };
    XP.send = function () {
      if (this.__sbBlocked) {
        var x = this; blockedNet("xhr", x.__sbUrl);
        setTimeout(function () { try { x.dispatchEvent(new ProgressEvent("error")); x.dispatchEvent(new ProgressEvent("loadend")); } catch (e) {} }, 0);
        return;
      }
      return _send.apply(this, arguments);
    };
  }
  if (navigator.sendBeacon) {
    var _beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) { if (!sameOrigin(url)) { noteBlocked("beacon", url); return false; } return _beacon(url, data); };
  }
  ["WebSocket", "EventSource"].forEach(function (name) {
    var Orig = window[name]; if (!Orig) return;
    var Wrapped = function (url, opt) {
      var x = parse(url), ok = x && (x.host === location.host);
      if (!ok) { blockedNet(name, url); throw new DOMException("Blocked in sandbox: " + url, "SecurityError"); }
      return opt === undefined ? new Orig(url) : new Orig(url, opt);
    };
    Wrapped.prototype = Orig.prototype;
    ["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach(function (k) { if (k in Orig) Wrapped[k] = Orig[k]; });
    window[name] = Wrapped;
  });
  var _wopen = window.open;
  window.open = function (url) {
    var c = url == null || url === "" ? "ok" : classify(url);
    if (c === "blocked") { noteBlocked("window.open", url); toast("Disabled in sandbox: " + why(url)); return null; }
    return _wopen.apply(window, arguments);
  };

  /* ---------------- phone calling flag: always off in the sandbox ---------------- */
  function lockCalls(o) {
    if (!o || typeof o !== "object") return;
    try { Object.defineProperty(o, "CALLS_ENABLED", { get: function () { return false; }, set: function () {}, enumerable: true, configurable: false }); } catch (e) { try { o.CALLS_ENABLED = false; } catch (e2) {} }
  }
  (function () {
    var cur = window.IHIMobile && typeof window.IHIMobile === "object" ? window.IHIMobile : {};
    lockCalls(cur);
    try {
      Object.defineProperty(window, "IHIMobile", {
        configurable: true, enumerable: true,
        get: function () { return cur; },
        set: function (v) { if (v && typeof v === "object") { lockCalls(v); cur = v; } }
      });
    } catch (e) { window.IHIMobile = cur; }
  })();

  /* ---------------- title ---------------- */
  function fixTitle() {
    if (APP === "launcher") return;
    var t = document.title || "";
    if (t.indexOf("[SANDBOX] ") !== 0) document.title = "[SANDBOX] " + t.replace(/^\[SANDBOX\]\s*/, "");
  }

  /* ---------------- reset ---------------- */
  function hasPrefix(k, list) { for (var i = 0; i < list.length; i++) if (k.indexOf(list[i]) === 0) return true; return false; }
  function clearStore(store, prefixes, all) {
    if (!store) return [];
    var gone = [], keys = [];
    for (var i = 0; i < store.length; i++) keys.push(store.key(i));
    keys.forEach(function (k) {
      if (KEEP_KEYS.indexOf(k) !== -1) return;
      if (all || hasPrefix(k, prefixes)) { store.removeItem(k); gone.push(k); }
    });
    return gone;
  }
  function appFor(name) { var r = REGISTRY[name] || reg; return r.resetAs ? REGISTRY[r.resetAs] : r; }
  function resetApp(name, all) {
    var r = appFor(name);
    var gone = clearStore(ls, r.prefixes, all).concat(clearStore(ss, r.prefixes, all));
    var jobs = [];
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      jobs.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.filter(function (g) {
          if (all) return true;
          try { return new URL(g.scope).pathname.indexOf(r.path) === 0 && r.path !== BASE + "/"; } catch (e) { return false; }
        }).map(function (g) { return g.unregister(); }));
      }).catch(function () {}));
    }
    if (window.caches && caches.keys) {
      jobs.push(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) { return all || hasPrefix(k, r.caches); }).map(function (k) { return caches.delete(k); }));
      }).catch(function () {}));
    }
    return Promise.all(jobs).then(function () { return gone; });
  }
  function doReset(all) {
    var label = all ? "everything in the sandbox (all apps)" : appFor(APP).label;
    if (!window.confirm("Reset " + label + " to fresh sample data?")) return;
    resetApp(APP, all).then(function () {
      var r = appFor(APP), h = r.hook && window[r.hook];
      if (!all && h && typeof h.reset === "function") {   /* app-provided simulator reset (it reloads itself) */
        try { ss && ss.setItem("sandbox:just-reset", APP); } catch (e) {}
        try { h.reset(); return; } catch (e) { /* fall through to plain reload */ }
      }
      try { ss && ss.setItem("sandbox:just-reset", all ? "all" : APP); } catch (e) {}
      if (window.top !== window) { try { window.top.location.reload(); return; } catch (e) {} }
      var u = location.pathname + location.search; location.replace(u);
    });
  }

  /* ---------------- banner ---------------- */
  function buildBanner() {
    if (document.querySelector(".sb-banner")) return;
    var b = document.createElement("div");
    b.className = "sb-banner"; b.setAttribute("role", "region"); b.setAttribute("aria-label", "Sandbox notice");
    var isHome = APP === "launcher";
    b.innerHTML =
      '<div class="sb-msg"><strong>SANDBOX:</strong> <span>sample data, nothing is saved to or sent to any real system</span></div>' +
      '<div class="sb-actions">' +
      (isHome ? "" : '<a class="sb-btn" href="' + BASE + '/" data-sb="home" title="Sandbox home"><span aria-hidden="true">⌂</span><span class="sb-lbl">Home</span></a>') +
      (isHome ? "" : '<button type="button" class="sb-btn" data-sb="reset-app" title="Reset this app to fresh sample data"><span aria-hidden="true">↺</span><span class="sb-lbl">Reset this app</span></button>') +
      '<button type="button" class="sb-btn sb-btn-strong" data-sb="reset-all" title="Reset every sandbox app"><span aria-hidden="true">⟲</span><span class="sb-lbl">Reset everything</span></button>' +
      "</div>";
    b.addEventListener("click", function (e) {
      var el = e.target.closest("[data-sb]"); if (!el) return;
      var k = el.getAttribute("data-sb");
      if (k === "reset-app") { e.preventDefault(); doReset(false); }
      else if (k === "reset-all") { e.preventDefault(); doReset(true); }
      else if (k === "home" && window.top !== window) { e.preventDefault(); window.top.location.href = BASE + "/"; }
    });
    document.body.insertBefore(b, document.body.firstChild);
    var just = null; try { just = ss && ss.getItem("sandbox:just-reset"); ss && ss.removeItem("sandbox:just-reset"); } catch (e) {}
    if (just) setTimeout(function () { toast(just === "all" ? "Sandbox reset: every app is back to fresh sample data." : "Reset done: fresh sample data."); }, 300);
  }

  function onReady() {
    buildBanner(); fixTitle(); mark(document);
    try {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === "attributes") { mark(m.target.parentNode || document); continue; }
          for (var j = 0; j < m.addedNodes.length; j++) { var n = m.addedNodes[j]; if (n.nodeType === 1) { if (n.matches && n.matches("a[href],area[href]")) mark(n.parentNode); else mark(n); } }
        }
      }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
      var tEl = document.querySelector("title");
      if (tEl) new MutationObserver(fixTitle).observe(tEl, { childList: true, characterData: true, subtree: true });
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady); else onReady();
  fixTitle();

  /* ---------------- public API (used by the launcher + tests) ---------------- */
  window.Sandbox = {
    version: VERSION, base: BASE, app: APP, registry: REGISTRY, unlockKey: UNLOCK_KEY, unlockHash: UNLOCK_HASH,
    unlocked: unlocked, classify: classify, toast: toast, blocked: blockedLog,
    resetApp: function (name) { return resetApp(name || APP, false); },
    resetAll: function () { return resetApp(APP, true); },
    reset: doReset,
    unlock: function (hash) { if (hash === UNLOCK_HASH) { ls.setItem(UNLOCK_KEY, UNLOCK_HASH); return true; } return false; },
    lock: function () { try { ls.removeItem(UNLOCK_KEY); } catch (e) {} }
  };
})();
