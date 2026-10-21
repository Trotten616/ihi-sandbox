(function () {
  "use strict";
  /* SANDBOX: no deep links. Every "open chat" goes to the in-page simulator (sim.js). */
  var LINK_BASE = "#sim-chat/";
  var NOTES_KEY = "ihb-agents-notes.";
  var NOTES_TIME_KEY = "ihb-agents-notesTime.";
  var SELECTED_KEY = "ihb-agents-selected";
  var RECENT_KEY = "ihb-agents-recent";

  var IG = window.IG = {
    linkFor: function (id) { return LINK_BASE + encodeURIComponent(id); },
    navigate: function (url) { if (window.IGD_SIM) window.IGD_SIM.blocked(url); } // SANDBOX: never leaves the page
  };

  var GROUPS = window.IG_GROUPS || [];
  var byId = {};
  GROUPS.forEach(function (g) { g.agents.forEach(function (a) { a.group = g.key; byId[a.id] = a; }); });
  var total = Object.keys(byId).length;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]; }); }
  function initials(n) {
    var i = n.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("");
    return i || n.slice(0, 2);
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function fmtTime(ts) {
    var d = new Date(+ts); if (isNaN(d)) return "";
    var today = new Date().toDateString() === d.toDateString();
    return (today ? "" : d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", ") + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  var toastTimer;
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800); }

  /* ---------- open chat ---------- */
  function getRecent() { try { return JSON.parse(store(RECENT_KEY) || "[]").filter(function (id) { return byId[id]; }); } catch (e) { return []; } }
  function openAgent(id) {
    var a = byId[id]; if (!a) return;
    var r = getRecent().filter(function (x) { return x !== id; }); r.unshift(id); store(RECENT_KEY, JSON.stringify(r.slice(0, 6)));
    renderRecent();
    if (window.IGD_SIM) window.IGD_SIM.openChat(id); else toast("Simulated chat unavailable (sandbox)");
  }
  IG.openAgent = openAgent; IG.byId = byId; IG.toast = toast; IG.initials = initials; IG.esc = esc;

  /* ---------- render ---------- */
  var side = $("sidebar"), main = $("groups"), sel = $("pSel");
  GROUPS.forEach(function (g) {
    side.insertAdjacentHTML("beforeend",
      '<div class="group ' + g.key + '" data-group="' + g.key + '"><div class="group-title">' + esc(g.title) + '<span class="count">' + g.agents.length + '</span></div>' +
      g.agents.map(function (a) {
        return '<button type="button" class="agent-link" data-open="' + a.id + '" data-search="' + esc((a.name + " " + a.role).toLowerCase()) + '">' +
          '<span class="mini">' + esc(initials(a.name)) + '</span><span class="name">' + esc(a.name) + '</span><span class="go">&#8599;</span></button>';
      }).join("") + '</div>');
    main.insertAdjacentHTML("beforeend",
      '<div class="section-wrap" data-group="' + g.key + '"><div class="section-h"><span class="bar" style="background:' + g.color + '"></span>' + esc(g.title) +
      '<span class="count">' + g.agents.length + '</span></div><div class="grid ' + g.key + '">' +
      g.agents.map(function (a) {
        return '<div class="card" tabindex="0" data-select="' + a.id + '" data-search="' + esc((a.name + " " + a.role).toLowerCase()) + '">' +
          '<div class="card-top"><div class="ico">' + esc(initials(a.name)) + '</div><h3>' + esc(a.name) + '</h3></div>' +
          '<div class="role">' + esc(a.role) + '</div>' +
          '<div class="sim-status" data-status="' + a.id + '"></div>' +
          '<div class="card-foot"><span class="note-flag" data-flag="' + a.id + '"></span>' +
          '<button type="button" class="open" data-open="' + a.id + '">Open &#8599;</button></div></div>';
      }).join("") + '</div></div>');
    var og = document.createElement("optgroup"); og.label = g.title;
    g.agents.forEach(function (a) { var o = document.createElement("option"); o.value = a.id; o.textContent = a.name; og.appendChild(o); });
    sel.appendChild(og);
  });

  var h = new Date().getHours();
  $("greet").textContent = (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + ", Thomas";
  $("summary").textContent = total + " agents across " + GROUPS.map(function (g) { return g.title; }).join(", ").replace(/, ([^,]*)$/, " and $1");

  /* ---------- notes panel ---------- */
  var current = null;
  function refreshFlags() {
    document.querySelectorAll("[data-flag]").forEach(function (el) {
      var has = !!(store(NOTES_KEY + el.getAttribute("data-flag")) || "").trim();
      el.className = "note-flag" + (has ? " has" : "");
      el.textContent = has ? "\u270E Has notes" : "";
    });
  }
  function select(id) {
    var a = byId[id]; if (!a) return;
    current = id; store(SELECTED_KEY, id);
    var ico = $("pIco"); ico.textContent = initials(a.name);
    ico.parentNode.className = "panel-head " + a.group;
    $("pName").textContent = a.name; $("pRole").textContent = a.role;
    sel.value = id;
    $("notes").value = store(NOTES_KEY + id) || "";
    var t = store(NOTES_TIME_KEY + id); $("saved").textContent = t ? "Saved " + fmtTime(t) : "";
    document.querySelectorAll(".card").forEach(function (c) { c.classList.toggle("selected", c.getAttribute("data-select") === id); });
  }
  var saveTimer;
  $("notes").addEventListener("input", function () {
    var id = current, val = this.value;
    $("saved").textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (val.trim()) { store(NOTES_KEY + id, val); store(NOTES_TIME_KEY + id, String(Date.now())); }
      else { store(NOTES_KEY + id, null); store(NOTES_TIME_KEY + id, null); }
      if (id === current) { var t = store(NOTES_TIME_KEY + id); $("saved").textContent = t ? "Saved " + fmtTime(t) : "Cleared"; }
      refreshFlags();
    }, 400);
  });
  sel.addEventListener("change", function () { select(this.value); });
  $("openFull").addEventListener("click", function () { if (current) openAgent(current); });

  function renderRecent() {
    var r = getRecent(), box = $("recent");
    box.innerHTML = r.length ? r.map(function (id) { return '<button type="button" class="chip" data-open="' + id + '">' + esc(byId[id].name) + ' &#8599;</button>'; }).join("")
      : '<span class="none">Agents you open from here will show up for one-click access.</span>';
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var o = e.target.closest("[data-open]");
    if (o) { e.stopPropagation(); openAgent(o.getAttribute("data-open")); return; }
    var c = e.target.closest("[data-select]");
    if (c) select(c.getAttribute("data-select"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== $("q") && document.activeElement !== $("notes")) { e.preventDefault(); $("q").focus(); return; }
    var c = e.target.closest && e.target.closest(".card");
    if (c && e.key === "Enter" && !e.target.closest("[data-open]")) openAgent(c.getAttribute("data-select"));
    if (c && e.key === " ") { e.preventDefault(); select(c.getAttribute("data-select")); }
  });
  $("q").addEventListener("input", function () {
    var v = this.value.trim().toLowerCase(), shown = 0;
    document.querySelectorAll(".card,.agent-link").forEach(function (el) {
      var ok = !v || el.getAttribute("data-search").indexOf(v) !== -1;
      el.style.display = ok ? "" : "none";
      if (ok && el.classList.contains("card")) shown++;
    });
    document.querySelectorAll(".section-wrap,.group").forEach(function (w) {
      w.style.display = w.querySelector(".card:not([style*='none']),.agent-link:not([style*='none'])") ? "" : "none";
    });
    $("empty").style.display = shown ? "none" : "block";
  });

  refreshFlags();
  renderRecent();
  select(byId[store(SELECTED_KEY)] ? store(SELECTED_KEY) : GROUPS[0].agents[0].id);
})();
