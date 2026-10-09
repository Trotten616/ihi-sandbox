/* SANDBOX simulator for the IntelliGro Agent Platform desktop copy.
   Nothing here talks to a real bot or the network. All state lives in localStorage keys prefixed igd_. */
(function () {
  "use strict";
  var IG = window.IG || {}, byId = IG.byId || {}, esc = IG.esc || String, initials = IG.initials || function (n) { return n.slice(0, 2); };
  var STATUS_KEY = "igd_status", PAUSED_KEY = "igd_paused", CHAT_KEY = "igd_chat.";
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function toast(m) { if (IG.toast) IG.toast(m); }
  function $(id) { return document.getElementById(id); }
  function now() { return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }

  /* ---------- simulated statuses ---------- */
  var CYCLE = ["online", "online", "idle", "online", "busy", "online", "idle"];
  var LABEL = { online: "Online", idle: "Idle", busy: "Working", paused: "Paused" };
  function statuses() {
    var s; try { s = JSON.parse(get(STATUS_KEY) || "null"); } catch (e) { s = null; }
    if (!s) { s = {}; Object.keys(byId).forEach(function (id, i) { s[id] = CYCLE[i % CYCLE.length]; }); set(STATUS_KEY, JSON.stringify(s)); }
    return s;
  }
  function paused() { return get(PAUSED_KEY) === "1"; }
  function renderStatus() {
    var s = statuses(), p = paused();
    document.querySelectorAll("[data-status]").forEach(function (el) {
      var st = p ? "paused" : (s[el.getAttribute("data-status")] || "online");
      el.className = "sim-status " + st;
      el.innerHTML = '<span class="sd"></span>' + LABEL[st] + ' <span class="tag">Simulated</span>';
    });
    var b = $("stopAll");
    if (b) { b.classList.toggle("paused", p); b.innerHTML = p ? "&#9654; Resume all" : "&#9632; Stop all"; }
  }

  /* ---------- modal helpers ---------- */
  function modal(cls, html) {
    var m = document.createElement("div"); m.className = "igd-modal show " + (cls || ""); m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML = '<div class="igd-dlg">' + html + '</div>';
    m.addEventListener("click", function (e) { if (e.target === m || e.target.closest("[data-close]")) close(m); });
    document.body.appendChild(m); return m;
  }
  function close(m) { if (m && m.parentNode) m.parentNode.removeChild(m); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { var ms = document.querySelectorAll(".igd-modal"); if (ms.length) close(ms[ms.length - 1]); } });
  function confirmBox(title, body, okLabel, onOk) {
    var m = modal("igd-confirm", '<div class="igd-dh"><h4>' + esc(title) + '</h4><span class="sim-tag" style="margin-left:auto">Sandbox</span></div>' +
      '<div class="igd-cbody">' + body + '</div><div class="igd-cbtns"><button class="btn" data-close>Cancel</button><button class="btn danger" data-ok>' + esc(okLabel) + '</button></div>');
    m.querySelector("[data-ok]").addEventListener("click", function () { close(m); onOk(); });
    m.querySelector("[data-ok]").focus();
  }

  /* ---------- STOP ALL (simulated) ---------- */
  var stop = $("stopAll");
  if (stop) stop.addEventListener("click", function () {
    if (paused()) {
      set(PAUSED_KEY, null); renderStatus(); toast("Simulated: all bots resumed (sandbox)");
    } else {
      confirmBox("Stop all bots?", "This would pause every bot. <b>Sandbox:</b> nothing real is stopped; this is a simulation only.", "Stop all (simulated)",
        function () { set(PAUSED_KEY, "1"); renderStatus(); toast("Simulated: all bots paused (sandbox)"); });
    }
  });

  /* ---------- simulated chat ---------- */
  var REPLIES = [
    "Got it. In the live app I'd start on that now; here I'm only a sample.",
    "Understood. I'd check the latest sample records and report back.",
    "On it. (No real work happens in the sandbox.)",
    "Noted. I'd add that to my list and send an update when done.",
    "Sure, here's a sample answer so you can see how chat looks."
  ];
  function history(id) {
    var h; try { h = JSON.parse(get(CHAT_KEY + id) || "null"); } catch (e) { h = null; }
    if (!h) { var a = byId[id]; h = [{ me: false, t: "Hi Thomas, this is a sandbox chat with " + a.name + ". Messages here are sample data and my replies are simulated.", at: now() }]; }
    return h;
  }
  function save(id, h) { set(CHAT_KEY + id, JSON.stringify(h.slice(-200))); }
  function msgHtml(m) {
    return '<div class="igd-m' + (m.me ? " me" : "") + '"><div class="meta">' + (m.me ? "You" : '<span class="sim-tag">Simulated reply</span>') + " · " + esc(m.at) + '</div>' + esc(m.t) + '</div>';
  }
  function openChat(id) {
    var a = byId[id]; if (!a) return;
    document.querySelectorAll(".igd-modal.igd-chat").forEach(close);
    var m = modal("igd-chat",
      '<div class="igd-dh ' + a.group + '"><div class="ico">' + esc(initials(a.name)) + '</div><div><h4>' + esc(a.name) + '</h4><p>' + esc(a.role) + '</p></div>' +
      '<span class="sim-tag" style="margin-left:auto">Simulated chat</span><button class="igd-x" style="margin-left:8px" data-close aria-label="Close">&times;</button></div>' +
      '<div class="igd-note">Sandbox: this chat is not connected to the real bot. Replies are canned and labeled "Simulated reply".</div>' +
      '<div class="igd-msgs" data-msgs></div>' +
      '<div class="igd-quick"><button class="chip" data-cmd="Status check">Status check</button><button class="chip" data-cmd="Run routine">Run routine</button><button class="chip" data-cmd="Pause this bot">Pause this bot</button></div>' +
      '<form class="igd-in"><input type="text" placeholder="Type a message (simulated)…" aria-label="Message"><button class="btn primary" type="submit">Send</button></form>');
    m.setAttribute("data-agent", id);
    var box = m.querySelector("[data-msgs]"), input = m.querySelector("input"), h = history(id);
    function draw() { box.innerHTML = h.map(msgHtml).join(""); box.scrollTop = box.scrollHeight; }
    function reply(text) { setTimeout(function () { h.push({ me: false, t: text, at: now() }); save(id, h); if (m.parentNode) draw(); }, 450); }
    function send(text) {
      text = String(text || "").trim(); if (!text) return;
      h.push({ me: true, t: text, at: now() }); save(id, h); draw();
      var c = text.toLowerCase();
      if (c === "status check") reply("Simulated status: " + (paused() ? "Paused" : LABEL[statuses()[id]] || "Online") + ". No real bot was contacted.");
      else if (c === "run routine") reply("Simulated: routine run queued (sandbox). Nothing actually ran.");
      else if (c === "pause this bot") { var s = statuses(); s[id] = "idle"; set(STATUS_KEY, JSON.stringify(s)); renderStatus(); reply("Simulated: " + a.name + " set to Idle (sandbox)."); }
      else reply(REPLIES[(h.length + text.length) % REPLIES.length]);
    }
    m.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); send(input.value); input.value = ""; });
    m.querySelectorAll("[data-cmd]").forEach(function (b) { b.addEventListener("click", function () { send(b.getAttribute("data-cmd")); }); });
    draw(); input.focus();
    toast("Simulated chat opened: " + a.name);
  }

  window.IGD_SIM = {
    openChat: openChat,
    blocked: function (url) { toast("Blocked in sandbox: no external links"); },
    keys: function () { var k = []; for (var i = 0; i < localStorage.length; i++) { var n = localStorage.key(i); if (n.indexOf("igd_") === 0) k.push(n); } return k; },
    reset: function () { window.IGD_SIM.keys().forEach(function (k) { localStorage.removeItem(k); }); location.reload(); }
  };
  renderStatus();
})();
