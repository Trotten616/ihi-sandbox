/* IntelliGro.AI Home Base Command Center (SANDBOX build only, added by /workspace/sandbox/make-home-base.sh).
   One-click "Agent Platform" page: a left-nav item (desktop) and an "Agents" tab (phone) that load the Agent Platform
   (./agent-platform/, sample agents, simulated actions) inside the Command Center shell via the IHIPages registry.
   The framed page has no banner of its own (data-layout="embed") and follows this page's light/dark theme. */
(function () {
  "use strict";
  var ROUTE = "agents", TITLE = "Agent Platform", TAB = "Agents", ICON = "◈", SRC = "agent-platform/";
  var TIP = "Your agents, one click from the Command Center. Sample agents only; chats and actions are simulated.";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function app() { return window.IHIApp; }
  function user() { return app() && app().currentUser ? app().currentUser() : null; }
  function isManager(u) { return !!u && !!window.IHIPages && IHIPages.roleKey && IHIPages.roleKey(u.role) === "manager"; }
  function isPhone() { return !!(window.IHIMobile && IHIMobile.isPhone && IHIMobile.isPhone()); }

  /* ---- the page: a same-origin frame that fills the content area (one scroller: the frame's own) ---- */
  var frame = null;
  function fit() {
    if (!frame || !frame.isConnected || !frame.offsetParent) return;
    var top = frame.getBoundingClientRect().top + window.scrollY;
    var tab = $("#m-tabbar"), tabH = tab && getComputedStyle(tab).display !== "none" ? tab.getBoundingClientRect().height : 0;
    var h = Math.max(320, Math.floor(window.innerHeight - top - tabH - 12));
    frame.style.height = h + "px";
  }
  function render(el) {
    document.body.classList.add("hb-agents-on");
    el.innerHTML = '<section class="hb-agents" aria-label="' + TITLE + '">' +
      '<span class="hb-sr">' + TITLE + ': sample agents; chats and actions are simulated.</span>' +   /* text so the empty-page guard (ensureFilled) sees content */
      '<iframe class="hb-agents-frame" name="hb-agent-platform" title="' + TITLE + ' (sample agents)" src="' + SRC + '"></iframe></section>';
    frame = el.querySelector("iframe");
    fit(); requestAnimationFrame(fit); setTimeout(fit, 300);
  }
  (window.IHIPages = window.IHIPages || { _q: [], register: function (r, d) { this._q.push([r, d]); } }).register(ROUTE, {
    title: TITLE, icon: ICON, roles: ["manager"], tip: TIP, render: function (el) { render(el); }
  });

  /* ---- desktop left nav: one click, right above Settings ---- */
  var nav = $(".sidebar .nav");
  if (nav && !$('.nav-btn[data-view="' + ROUTE + '"]', nav)) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "nav-btn"; b.setAttribute("data-view", ROUTE);
    b.title = "Agent Platform: your agents inside the Command Center (sample agents, simulated actions)";
    b.innerHTML = '<span class="nav-icon" aria-hidden="true">' + ICON + "</span> " + TITLE;
    var before = $('.nav-btn[data-view="settings"]', nav);
    if (before && before.parentNode === nav) nav.insertBefore(b, before); else nav.appendChild(b);
  }

  /* ---- phone: a 5th bottom tab (managers; the phone shell shows tabs once a rep is picked) ---- */
  var S = window.IHIShell;
  if (S && S.TABS && !S.TABS.some(function (t) { return t.route === ROUTE; })) S.TABS.push({ route: ROUTE, label: TAB, icon: ICON });
  if (S && typeof S.intercept === "function") {
    var orig = S.intercept;
    S.intercept = function (view) {
      if (view === ROUTE && isPhone() && isManager(user()) && S.chosenRep && S.chosenRep()) { if (S.syncChrome) S.syncChrome(); return false; }
      return orig.apply(this, arguments);
    };
  }
  function syncTab() {
    var show = isManager(user());
    document.querySelectorAll('#m-tabbar [data-m-tab="' + ROUTE + '"]').forEach(function (t) { t.hidden = !show; });
    if (isPhone() && app() && app().route() === ROUTE) { var pt = $("#page-title"); if (pt) pt.textContent = TAB; }
  }

  document.addEventListener("ihi:navigate", function (e) {
    var on = !!(e.detail && e.detail.route === ROUTE);
    document.body.classList.toggle("hb-agents-on", on);
    if (!on) {   /* leaving: drop the frame (its own state lives in localStorage) */
      frame = null;
      var pr = $("#page-root"); if (pr && pr.querySelector(".hb-agents")) pr.innerHTML = "";
    }
    setTimeout(function () {
      syncTab();
      var un = $("#view-unavailable.active");   /* reached by URL without access: the stock text says "for sales reps" */
      if (on && un) un.innerHTML = un.innerHTML.replace("is for sales reps", "is for managers");
    }, 0);
  });
  document.addEventListener("ihi:signin", function () { setTimeout(syncTab, 0); });
  document.addEventListener("DOMContentLoaded", function () { setTimeout(syncTab, 0); });
  window.addEventListener("resize", fit);
  document.addEventListener("ihi:layout", function () { setTimeout(fit, 50); });
  window.HomeBaseAgents = { route: ROUTE, fit: fit, frame: function () { return frame; } };
})();
