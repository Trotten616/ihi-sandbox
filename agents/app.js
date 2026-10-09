/* IntelliGro.AI: a generic, local-first phone dashboard for your own agents.
   No data ships in the build. Everything the user adds lives on this device (localStorage).
   Modes (IG_CONFIG.mode): "app" (normal) and "sandbox" (demo set preloaded, no network, quick actions simulated). */
(function () {
  "use strict";
  var CFG = window.IG_CONFIG || { mode: "preview" };
  var SANDBOX = CFG.mode === "sandbox";
  var P = SANDBOX ? "igxs." : "igx."; // separate storage namespaces per mode
  var DAY = 864e5, MIN = 6e4;

  /* ---------------- utilities ---------------- */
  function $(id) { return document.getElementById(id); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function initials(n) {
    var i = n.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("");
    return i || n.slice(0, 2).toUpperCase();
  }
  function sget(k, d) { try { var v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function sset(k, v) { try { if (v == null) localStorage.removeItem(P + k); else localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) {} }
  function gget(k, d) { try { var v = localStorage.getItem(P + "g." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function gset(k, v) { try { if (v == null) localStorage.removeItem(P + "g." + k); else localStorage.setItem(P + "g." + k, JSON.stringify(v)); } catch (e) {} }
  function fmtClock(t) { return new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  function fmtShort(t) {
    var d = new Date(t), now = new Date();
    if (d.toDateString() === now.toDateString()) return fmtClock(t);
    if (now - d < 6 * DAY) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  function rel(t) {
    var s = (Date.now() - t) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 7 * 86400) return Math.floor(s / 86400) + "d ago";
    return new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
  }
  function dayLabel(t) {
    var d = new Date(t), now = new Date(), y = new Date(Date.now() - DAY);
    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  }
  function cap(n) { return n > 99 ? "99+" : String(n); }
  function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) {} }
  var toastTimer, toastUndo;
  function toast(msg, undoFn, ms) {
    var t = $("toast");
    t.innerHTML = "<span>" + esc(msg) + "</span>" + (undoFn ? '<button type="button" id="toastUndo">Undo</button>' : "");
    toastUndo = undoFn || null;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); toastUndo = null; }, ms || (undoFn ? 5000 : 2200));
  }
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "toastUndo" && toastUndo) { var f = toastUndo; toastUndo = null; $("toast").classList.remove("show"); f(); }
  });

  /* ---------------- SHA-256 (fallback when crypto.subtle is unavailable) ---------------- */
  function sha256Fallback(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, maxWord = mp(2, 32), result = "", words = [], len = ascii.length * 8, hash = [], k = [], pc = 0, cand = {};
    for (var c = 2; pc < 64; c++) { if (!cand[c]) { for (var i = 0; i < 313; i += c) cand[i] = c; hash[pc] = (mp(c, .5) * maxWord) | 0; k[pc++] = (mp(c, 1 / 3) * maxWord) | 0; } }
    hash = hash.slice(0, 8);
    ascii += "\x80"; while (ascii.length % 64 - 56) ascii += "\x00";
    for (i = 0; i < ascii.length; i++) words[i >> 2] |= ascii.charCodeAt(i) << ((3 - i) % 4) * 8;
    words[words.length] = ((len / maxWord) | 0); words[words.length] = len;
    for (var j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = hash; hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += (b < 16 ? "0" : "") + b.toString(16); }
    return result;
  }
  function sha256(str) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      });
    }
    return Promise.resolve(sha256Fallback(str));
  }

  /* ---------------- theme ---------------- */
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function themePref() { try { return localStorage.getItem("ig.theme") || "system"; } catch (e) { return "system"; } }
  function applyTheme() {
    var t = themePref();
    var dark = t === "dark" || (t === "system" && mq && mq.matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    qa('meta[name="theme-color"]').forEach(function (m) {
      if (t === "system") m.setAttribute("content", m.getAttribute("media").indexOf("dark") > -1 ? "#0b0f17" : "#f5f7fa");
      else m.setAttribute("content", dark ? "#0b0f17" : "#f5f7fa");
    });
  }
  function setTheme(t) { try { localStorage.setItem("ig.theme", t); } catch (e) {} applyTheme(); if (curTab === "you") renderYou(); }
  if (mq && mq.addEventListener) mq.addEventListener("change", applyTheme);
  applyTheme();
  if (SANDBOX) { document.documentElement.classList.add("sandbox"); $("sbxBanner").hidden = false; }

  /* ---------------- offline banner ---------------- */
  function netState() { $("offlineBanner").hidden = navigator.onLine !== false; }
  window.addEventListener("online", netState); window.addEventListener("offline", netState); netState();

  /* ---------------- service worker ---------------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  /* ---------------- install prompt ---------------- */
  var deferredInstall = null;
  var isStandalone = function () { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; };
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredInstall = e; if (curTab === "you") renderYou(); });
  window.addEventListener("appinstalled", function () { deferredInstall = null; toast("Installed. Open it from your home screen."); if (curTab === "you") renderYou(); });
  function doInstall() {
    if (deferredInstall) {
      deferredInstall.prompt();
      deferredInstall.userChoice.then(function () { deferredInstall = null; if (curTab === "you") renderYou(); });
    } else openInstallHelp();
  }
  function openInstallHelp() {
    openSheet('<div class="sheet-head"><div class="t"><h2>Install on Android</h2><p>Takes about 20 seconds</p></div></div>' +
      '<ol class="hint" style="margin-left:20px;font-size:15px;line-height:1.7;color:var(--text)">' +
      "<li>Open this page in <b>Chrome</b>.</li><li>Tap the <b>&#8942;</b> menu (top right).</li>" +
      "<li>Tap <b>Add to Home screen</b> or <b>Install app</b>.</li><li>Tap <b>Install</b>. The IntelliGro.AI icon appears on your home screen.</li></ol>" +
      '<p class="hint">If you already installed it, open it from the home screen icon.</p>' +
      '<button type="button" class="btn block" data-close style="margin-top:14px">Done</button>', { label: "Install help" });
  }

  /* ---------------- layers (sheets, menus, confirm, chat) + Android back ---------------- */
  // One history entry stands for "a layer is open", so Android Back closes the top layer instead of leaving.
  var layers = [], hasEntry = false, pendingBack = 0;
  function ensureEntry() { if (!hasEntry && layers.length && !pendingBack) { try { history.pushState({ igl: 1 }, ""); hasEntry = true; } catch (e) {} } }
  function pushLayer(el, onClose) { layers.push({ el: el, onClose: onClose }); ensureEntry(); }
  function dropEntry() { if (hasEntry) { hasEntry = false; pendingBack++; try { history.back(); } catch (e) { pendingBack--; } } }
  function closeTopLayer(fromPop) {
    var l = layers.pop(); if (!l) return;
    if (l.el && l.el.parentNode) l.el.parentNode.removeChild(l.el);
    if (l.onClose) l.onClose();
    if (!fromPop && !layers.length) dropEntry();
  }
  window.addEventListener("popstate", function () {
    if (pendingBack > 0) { pendingBack--; ensureEntry(); return; }
    hasEntry = false;
    if (layers.length) { closeTopLayer(true); ensureEntry(); }
  });
  function closeAllLayers() { while (layers.length) { var l = layers.pop(); if (l.el && l.el.parentNode) l.el.parentNode.removeChild(l.el); if (l.onClose) l.onClose(); } dropEntry(); }
  function openSheet(html, opts) {
    opts = opts || {};
    var wrap = document.createElement("div");
    wrap.innerHTML = '<div class="scrim" data-close></div><div class="sheet' + (opts.full ? " full" : "") + '" role="dialog" aria-modal="true"' +
      (opts.label ? ' aria-label="' + esc(opts.label) + '"' : "") + '><div class="sheet-grip"></div><div class="sheet-body">' + html + "</div></div>";
    $("layerRoot").appendChild(wrap);
    wrap.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) { e.preventDefault(); closeTopLayer(); } });
    pushLayer(wrap, opts.onClose);
    return wrap;
  }


  /* ---------------- passcode gate (optional device passcode; optional preview gate for test links) ---------------- */
  var pin = "", fails = gget("fails", 0), lockedOutUntil = gget("lockout", 0), checking = false, booted = false;
  function deviceLock() { var l = sget("lock", null); return l && l.salt && l.hash ? l : null; }
  function gateNeeded() { return !!(deviceLock() || CFG.previewGateHash); }
  function pinLen() { var l = deviceLock(); return l ? (l.len || 4) : 4; }
  function unlockedValid() {
    if (!gateNeeded()) return true;
    var u = gget("unlockUntil", 0), last = gget("lastActive", 0);
    if (!u || Date.now() > u) return false;
    if (last && Date.now() - last > (CFG.idleLockMin || 30) * MIN) return false;
    return true;
  }
  function renderDots() {
    var d = $("pinDots"), n = pinLen();
    if (d.children.length !== n) d.innerHTML = new Array(n + 1).join("<i></i>");
    qa("#pinDots i").forEach(function (x, i) { x.classList.toggle("on", i < pin.length); });
  }
  function gateMsg(t, err) { var m = $("gateMsg"); m.textContent = t; m.classList.toggle("err", !!err); }
  function pinKey(k) {
    if (checking) return;
    if (Date.now() < lockedOutUntil) { gateMsg("Too many tries. Wait " + Math.ceil((lockedOutUntil - Date.now()) / 1000) + "s", true); return; }
    if (k === "del") pin = pin.slice(0, -1); else if (/^\d$/.test(k) && pin.length < pinLen()) pin += k;
    renderDots();
    if (pin.length === pinLen()) tryPin();
  }
  function checkPin(p) {
    var l = deviceLock();
    if (l) return sha256(l.salt + ":" + p).then(function (h) { return h === l.hash; });
    return sha256(p).then(function (h) { return h === CFG.previewGateHash; });
  }
  function tryPin() {
    checking = true;
    var attempt = pin;
    checkPin(attempt).then(function (ok) {
      checking = false;
      if (ok) {
        pin = ""; fails = 0; gset("fails", 0);
        gset("unlockUntil", Date.now() + (CFG.rememberDays || 30) * DAY);
        gset("lastActive", Date.now()); lastTouchSave = Date.now();
        openApp();
      } else {
        fails++; gset("fails", fails); pin = ""; renderDots();
        var d = $("pinDots"); d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake"); haptic(60);
        if (fails >= 5) { lockedOutUntil = Date.now() + 30000; gset("lockout", lockedOutUntil); fails = 0; gset("fails", 0); gateMsg("Too many tries. Wait 30s", true); }
        else gateMsg("Wrong passcode. Try again.", true);
      }
    });
  }
  $("pinpad").addEventListener("click", function (e) { var b = e.target.closest("[data-k]"); if (b) pinKey(b.getAttribute("data-k")); });
  document.addEventListener("keydown", function (e) {
    if ($("gate").hidden) return;
    if (/^\d$/.test(e.key)) { e.preventDefault(); pinKey(e.key); }
    else if (e.key === "Backspace") { e.preventDefault(); pinKey("del"); }
  });
  function showGate(msg) {
    closeAllLayers();
    $("stage").hidden = true; $("gate").hidden = false;
    $("gateFoot").textContent = deviceLock() ? "Enter the passcode you set on this device." : "Test link. Enter the preview passcode.";
    pin = ""; renderDots(); gateMsg(msg || "Enter passcode");
  }
  function lock(reason) {
    if (!gateNeeded()) { toast("Set a device passcode in You first"); return; }
    gset("unlockUntil", null);
    if (window.caches && caches.keys) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); }).catch(function () {});
    showGate(reason ? reason + ". Enter passcode" : "Locked. Enter passcode");
  }
  var lastTouchSave = 0;
  function touch() { var n = Date.now(); if (n - lastTouchSave > 15000) { gset("lastActive", n); lastTouchSave = n; } }
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, function () { if ($("gate").hidden) touch(); }, { passive: true, capture: true }); });
  setInterval(function () {
    if (!$("gate").hidden || !gateNeeded()) return;
    if (Date.now() - gget("lastActive", Date.now()) > (CFG.idleLockMin || 30) * MIN) lock("Locked after 30 min idle");
  }, 30000);
  var hiddenAt = 0;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { hiddenAt = Date.now(); if ($("gate").hidden) { gset("lastActive", Date.now()); lastTouchSave = Date.now(); } return; }
    if ($("gate").hidden && gateNeeded() && hiddenAt && Date.now() - hiddenAt > (CFG.backgroundLockMin || 5) * MIN) lock("Locked while away");
    hiddenAt = 0;
  });

  /* ---------------- data model (schema: SCHEMA.md, version 1) ---------------- */
  var SCHEMA_ID = "intelligro.setup", SCHEMA_VERSION = 1;
  var PALETTE = ["#38bdf8", "#f472b6", "#a3e635", "#34d399", "#fbbf24", "#a78bfa", "#fb923c", "#f87171", "#94a3b8"];
  var DB = { groups: [], agents: [], pins: [] };
  function uid(p) { var a = new Uint8Array(6); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (x, i) { a[i] = Math.random() * 256; }); return p + Array.prototype.map.call(a, function (b) { return ("0" + b.toString(36)).slice(-2); }).join(""); }
  function save() { sset("setup", { groups: DB.groups, agents: DB.agents, pins: DB.pins }); }
  function load() { var s = sget("setup", null); if (s) { var r = sanitizeSetup(s, true); DB = { groups: r.groups, agents: r.agents, pins: r.pins }; } }
  function groupById(id) { for (var i = 0; i < DB.groups.length; i++) if (DB.groups[i].id === id) return DB.groups[i]; return null; }
  function agentById(id) { for (var i = 0; i < DB.agents.length; i++) if (DB.agents[i].id === id) return DB.agents[i]; return null; }
  function sortedGroups() { return DB.groups.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
  function agentsIn(gid) { return DB.agents.filter(function (a) { return gid === "__none" ? !groupById(a.groupId) : a.groupId === gid; }); }
  function hasUngrouped() { return DB.agents.some(function (a) { return !groupById(a.groupId); }); }
  function hasDemo() { return DB.agents.some(function (a) { return a.demo; }); }

  /* validation */
  var BLOCKED_SCHEMES = ["javascript", "data", "vbscript", "file", "blob", "about", "filesystem"];
  function checkOpenUrl(u) {
    u = String(u || "").trim();
    if (!u) return { ok: true, value: "" };
    if (u.length > 2000) return { ok: false, msg: "That link is too long." };
    if (/[\s\u0000-\u001f]/.test(u)) return { ok: false, msg: "Links can't contain spaces." };
    var m = /^([a-z][a-z0-9+.\-]*):/i.exec(u);
    if (!m) return { ok: false, msg: "Start with https:// or an app link like myapp://" };
    if (BLOCKED_SCHEMES.indexOf(m[1].toLowerCase()) > -1) return { ok: false, msg: m[1].toLowerCase() + ": links aren't allowed." };
    if (/^https?:$/i.test(m[0])) { try { new URL(u); } catch (e) { return { ok: false, msg: "That web address isn't valid." }; } }
    return { ok: true, value: u };
  }
  function checkHookUrl(u) {
    u = String(u || "").trim();
    var url; try { url = new URL(u); } catch (e) { return { ok: false, msg: "Enter a full web address starting with https://" }; }
    var local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return { ok: false, msg: "Webhooks must use https://" };
    if (url.username || url.password) return { ok: false, msg: "Put credentials in the auth header, not the address." };
    return { ok: true, value: url.href };
  }
  function checkJsonBody(b) { b = String(b || "").trim(); if (!b) return { ok: true, value: "" }; try { JSON.parse(b); return { ok: true, value: b }; } catch (e) { return { ok: false, msg: "Body isn't valid JSON." }; } }
  function validColor(c) { return /^#[0-9a-f]{6}$/i.test(String(c || "")) ? String(c).toLowerCase() : null; }
  function validAvatar(d) { return typeof d === "string" && d.length < 200000 && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(d) ? d : null; }
  function str(v, max) { return typeof v === "string" ? v.slice(0, max) : ""; }
  var METHODS = ["POST", "GET", "PUT", "PATCH", "DELETE"];

  /* sanitize an imported or stored setup; returns {groups, agents, pins, warnings, stats} */
  function sanitizeSetup(src, trusted) {
    var warnings = [], groups = [], agents = [], gids = {}, aids = {};
    if (!src || typeof src !== "object") throw new Error("This isn't a setup file.");
    if (!trusted) {
      if (src.schema !== SCHEMA_ID) throw new Error('Missing "schema": "' + SCHEMA_ID + '".');
      if (typeof src.version !== "number") throw new Error('Missing "version".');
      if (src.version > SCHEMA_VERSION) throw new Error("This file is from a newer version (" + src.version + "). Update the app first.");
    }
    if (!Array.isArray(src.groups || [])) throw new Error('"groups" must be a list.');
    if (!Array.isArray(src.agents || [])) throw new Error('"agents" must be a list.');
    (src.groups || []).slice(0, 100).forEach(function (g, i) {
      if (!g || typeof g !== "object" || !str(g.name, 40).trim()) { warnings.push("Skipped a group with no name."); return; }
      var id = /^[\w-]{1,40}$/.test(g.id || "") && !gids[g.id] ? g.id : uid("g_");
      gids[id] = 1;
      groups.push({ id: id, name: str(g.name, 40).trim(), color: validColor(g.color) || PALETTE[i % PALETTE.length], order: typeof g.order === "number" ? g.order : i });
      if (g.id && g.id !== id) gids["__map_" + g.id] = id;
    });
    var qaCount = 0, authCount = 0, noteCount = 0;
    (src.agents || []).slice(0, 500).forEach(function (a) {
      if (!a || typeof a !== "object" || !str(a.name, 60).trim()) { warnings.push("Skipped an agent with no name."); return; }
      var id = /^[\w-]{1,40}$/.test(a.id || "") && !aids[a.id] ? a.id : uid("a_");
      aids[id] = 1;
      var gid = typeof a.groupId === "string" ? (gids[a.groupId] ? a.groupId : gids["__map_" + a.groupId] || "") : "";
      var open = checkOpenUrl(a.openUrl);
      if (!open.ok) warnings.push(str(a.name, 60) + ": open link removed (" + open.msg + ")");
      var qas = [];
      (Array.isArray(a.quickActions) ? a.quickActions : []).slice(0, 20).forEach(function (q) {
        if (!q || !str(q.label, 40).trim()) return;
        var hu = checkHookUrl(q.url); if (!hu.ok) { warnings.push(str(a.name, 60) + ' / "' + str(q.label, 40) + '": skipped (' + hu.msg + ")"); return; }
        var body = checkJsonBody(q.body); if (!body.ok) { warnings.push(str(a.name, 60) + ' / "' + str(q.label, 40) + '": body removed (not JSON)'); }
        var auth = null;
        if (q.auth && typeof q.auth === "object" && /^[A-Za-z0-9-]{1,64}$/.test(q.auth.header || "") && typeof q.auth.value === "string" && !/[\r\n]/.test(q.auth.value)) { auth = { header: q.auth.header, value: q.auth.value.slice(0, 4000) }; authCount++; }
        qas.push({ id: /^[\w-]{1,40}$/.test(q.id || "") ? q.id : uid("q_"), label: str(q.label, 40).trim(), url: hu.value, method: METHODS.indexOf(String(q.method || "POST").toUpperCase()) > -1 ? String(q.method || "POST").toUpperCase() : "POST", body: body.ok ? body.value : "", auth: auth });
        qaCount++;
      });
      if (str(a.notes, 20000).trim()) noteCount++;
      agents.push({
        id: id, name: str(a.name, 60).trim(), role: str(a.role, 140), groupId: gid,
        initials: str(a.initials, 3).replace(/[^\w]/g, "").toUpperCase(), color: validColor(a.color) || "", avatar: validAvatar(a.avatar),
        openUrl: open.ok ? open.value : "", notes: str(a.notes, 20000), quickActions: qas, hideSecrets: !!a.hideSecrets, demo: !!a.demo,
        // Plug-in point (reserved, ignored for now): a future live-status source. Kept so exports round-trip.
        statusUrl: typeof a.statusUrl === "string" ? a.statusUrl.slice(0, 2000) : undefined,
        updatedAt: typeof a.updatedAt === "number" ? a.updatedAt : Date.now()
      });
    });
    var pins = (Array.isArray(src.pins) ? src.pins : []).filter(function (p) { return aids[p]; });
    return { groups: groups, agents: agents, pins: pins, warnings: warnings, stats: { groups: groups.length, agents: agents.length, notes: noteCount, pins: pins.length, actions: qaCount, auth: authCount } };
  }
  function exportSetup(includeAuth) {
    return {
      schema: SCHEMA_ID, version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), app: "IntelliGro.AI",
      groups: sortedGroups().map(function (g, i) { return { id: g.id, name: g.name, color: g.color, order: i }; }),
      agents: DB.agents.map(function (a) {
        var o = { id: a.id, name: a.name, role: a.role, groupId: a.groupId || null, initials: a.initials || undefined, color: a.color || undefined, avatar: a.avatar || undefined,
          openUrl: a.openUrl || undefined, notes: a.notes || undefined, hideSecrets: a.hideSecrets || undefined, demo: a.demo || undefined, statusUrl: a.statusUrl,
          quickActions: (a.quickActions || []).map(function (q) {
            var x = { id: q.id, label: q.label, url: q.url, method: q.method, body: q.body || undefined };
            if (q.auth) { if (includeAuth) x.auth = { header: q.auth.header, value: q.auth.value }; else x.authOmitted = q.auth.header; }
            return x;
          }) };
        if (!o.quickActions.length) delete o.quickActions;
        return o;
      }),
      pins: DB.pins.slice()
    };
  }

  /* ---------------- demo set: fictional sample agents ---------------- */
  function demoSetup() {
    var g1 = "g_demo_sales", g2 = "g_demo_home", g3 = "g_demo_build";
    function A(id, name, role, gid, extra) { var a = { id: id, name: name, role: role, groupId: gid, demo: true, quickActions: [] }; for (var k in extra) a[k] = extra[k]; return a; }
    return {
      groups: [{ id: g1, name: "Sales (demo)", color: "#38bdf8", order: 0 }, { id: g2, name: "Home (demo)", color: "#f472b6", order: 1 }, { id: g3, name: "Projects (demo)", color: "#a3e635", order: 2 }],
      agents: [
        A("a_demo_pilot", "Pipeline Pilot", "Tracks deals and reminds you about follow-ups", g1, { openUrl: "https://example.com/pipeline-pilot", quickActions: [{ id: "q_demo_1", label: "Morning summary", url: "https://example.com/hooks/morning-summary", method: "POST", body: "{\"period\":\"today\"}" }] }),
        A("a_demo_ivy", "Inbox Ivy", "Sorts email and drafts replies for review", g1, {}),
        A("a_demo_cal", "Calendar Cal", "Books and confirms meetings", g1, {}),
        A("a_demo_budget", "Budget Buddy", "Monthly budget and bill reminders", g2, { notes: "Demo note: ask about the utility bill." }),
        A("a_demo_meals", "Meal Planner", "Weekly meals and a shopping list", g2, {}),
        A("a_demo_build", "Build Bot", "Runs code builds and checks", g3, { openUrl: "https://example.com/build-bot", quickActions: [{ id: "q_demo_2", label: "Start a build", url: "https://example.com/hooks/build", method: "POST", body: "{\"branch\":\"main\"}" }] }),
        A("a_demo_rae", "Research Rae", "Finds and summarizes sources", g3, {})
      ],
      pins: ["a_demo_pilot"]
    };
  }
  function loadDemo() {
    var d = sanitizeSetup(demoSetup(), true);
    d.groups.forEach(function (g) { if (!groupById(g.id)) { g.order = DB.groups.length + g.order; DB.groups.push(g); } });
    d.agents.forEach(function (a) { if (!agentById(a.id)) DB.agents.push(a); });
    d.pins.forEach(function (p) { if (DB.pins.indexOf(p) < 0) DB.pins.push(p); });
    save(); renderAll(); toast("Demo agents added");
  }
  function removeDemo() {
    var before = JSON.parse(JSON.stringify(DB));
    var ids = DB.agents.filter(function (a) { return a.demo; }).map(function (a) { return a.id; });
    DB.agents = DB.agents.filter(function (a) { return !a.demo; });
    DB.pins = DB.pins.filter(function (p) { return ids.indexOf(p) < 0; });
    DB.groups = DB.groups.filter(function (g) { return g.id.indexOf("g_demo_") !== 0 || DB.agents.some(function (a) { return a.groupId === g.id; }); });
    save(); renderAll();
    toast("Demo agents removed", function () { DB = before; save(); renderAll(); });
  }

  /* ---------------- boot after unlock ---------------- */
  function openApp() {
    $("gate").hidden = true; $("stage").hidden = false;
    if (!booted) {
      booted = true;
      load();
      if (SANDBOX && !sget("seeded", false)) { var d = sanitizeSetup(demoSetup(), true); DB = { groups: d.groups, agents: d.agents, pins: d.pins }; save(); sset("seeded", true); }
      var qp = new URLSearchParams(location.search).get("tab"), st = null;
      try { st = sessionStorage.getItem(P + "tab"); } catch (e) {}
      switchTab(TABS.indexOf(qp) > -1 ? qp : (TABS.indexOf(st) > -1 ? st : "agents"));
    } else renderAll();
  }

  /* ---------------- local-only state ---------------- */
  function isPinned(id) { return DB.pins.indexOf(id) > -1; }
  function togglePin(id) {
    var i = DB.pins.indexOf(id);
    if (i > -1) DB.pins.splice(i, 1); else DB.pins.unshift(id);
    save(); toast(i > -1 ? "Unpinned" : "Pinned to top"); renderAll();
  }
  function lastOpened() { return sget("lastOpened", {}); }
  function markOpened(id) { var lo = lastOpened(); lo[id] = Date.now(); sset("lastOpened", lo); var a = agentById(id); if (a) logLocal("open", id, "Opened " + a.name); }
  function recentIds(n) { var lo = lastOpened(); return Object.keys(lo).filter(function (id) { return agentById(id); }).sort(function (a, b) { return lo[b] - lo[a]; }).slice(0, n || 6); }
  function logLocal(kind, id, text, extra) {
    var l = sget("log", []); var e = { t: Date.now(), kind: kind, id: id, text: text }; if (extra) e.result = extra;
    l.unshift(e); sset("log", l.slice(0, 300));
    if (curTab === "activity" && booted) renderActivity();
  }

  /* ---------------- avatars ---------------- */
  function agentColor(a) { if (a.color) return a.color; var g = groupById(a.groupId); return g ? g.color : "#94a3b8"; }
  function textOn(hex) {
    var c = (hex || "#94a3b8").replace("#", ""), r = parseInt(c.substr(0, 2), 16) / 255, g = parseInt(c.substr(2, 2), 16) / 255, b = parseInt(c.substr(4, 2), 16) / 255;
    function lin(v) { return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }
    var L = .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
    return (L + .05) / .05 >= 4.5 ? "#0b0f17" : "#ffffff";
  }
  function initialsOf(a) { return a.initials || initials(a.name || "?"); }
  function avatar(a, size) {
    var col = agentColor(a);
    if (a.avatar) return '<span class="av' + (size ? " " + size : "") + '" aria-hidden="true" style="background:' + col + '"><img src="' + esc(a.avatar) + '" alt=""></span>';
    return '<span class="av' + (size ? " " + size : "") + '" aria-hidden="true" style="background:' + col + ";color:" + textOn(col) + '">' + esc(initialsOf(a)) + "</span>";
  }
  function openLink(a, extraCls, label) {
    if (!a.openUrl) return "";
    var cls = /primary/.test(extraCls || "") ? "btn " + extraCls : "btn open " + (extraCls || "");
    if (SANDBOX) return '<button type="button" class="' + cls + '" disabled aria-disabled="true">Disabled in sandbox</button>';
    return '<a class="' + cls + '" href="' + esc(a.openUrl) + '" data-open-agent="' + esc(a.id) + '" rel="noopener noreferrer" aria-label="Open ' + esc(a.name) + '">' + (label || "Open") + " &#8599;</a>";
  }
  document.addEventListener("click", function (e) {
    var dl = e.target.closest && e.target.closest("[data-open-agent]");
    if (!dl || SANDBOX) return;
    var a = agentById(dl.getAttribute("data-open-agent")); if (!a) return;
    var chk = checkOpenUrl(a.openUrl); if (!chk.ok || !chk.value) { e.preventDefault(); toast("That link isn't allowed"); return; }
    if (/^https?:/i.test(chk.value)) dl.setAttribute("target", "_blank");
    markOpened(a.id); setTimeout(renderAll, 60);
  }, true);

  /* ---------------- tabs ---------------- */
  var TABS = ["agents", "groups", "activity", "you"], curTab = "agents", scrollPos = {};
  var TITLES = { agents: "Agents", groups: "Groups", activity: "Activity", you: "You" };
  function switchTab(t) {
    var views = $("views");
    scrollPos[curTab] = views.scrollTop;
    curTab = t; try { sessionStorage.setItem(P + "tab", t); } catch (e) {}
    qa(".tab").forEach(function (b) { var on = b.getAttribute("data-tab") === t; b.classList.toggle("active", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    qa(".view").forEach(function (v) { v.hidden = v.getAttribute("data-view") !== t; });
    $("viewTitle").textContent = TITLES[t];
    $("searchBtn").hidden = !(t === "agents" || t === "groups") || !DB.agents.length;
    $("addBtn").hidden = !(t === "agents" || t === "groups");
    $("addBtn").setAttribute("aria-label", t === "groups" ? "New group" : "Add agent");
    renderTab(t);
    views.scrollTop = scrollPos[t] || 0;
  }
  function renderTab(t) { if (t === "agents") renderAgents(); else if (t === "groups") renderGroups(); else if (t === "activity") renderActivity(); else renderYou(); }
  function renderAll() {
    if (!booted) return;
    var y = $("views").scrollTop; renderTab(curTab); $("views").scrollTop = y;
    $("searchBtn").hidden = !(curTab === "agents" || curTab === "groups") || !DB.agents.length;
  }
  qa(".tab").forEach(function (b) {
    b.addEventListener("click", function () { var t = b.getAttribute("data-tab"); if (t === curTab) { $("views").scrollTo({ top: 0, behavior: "smooth" }); return; } switchTab(t); });
  });
  $("addBtn").addEventListener("click", function () { if (curTab === "groups") openGroupEditor(null); else openEditor(null); });

  /* ---------------- Agents tab ---------------- */
  var gtab = sget("gtab", "all");
  function gtabList() {
    var l = [{ k: "all", t: "All", c: "var(--accent)" }].concat(sortedGroups().map(function (g) { return { k: g.id, t: g.name, c: g.color }; }));
    if (hasUngrouped() && DB.groups.length) l.push({ k: "__none", t: "Ungrouped", c: "#94a3b8" });
    return l;
  }
  function agentRow(a) {
    var lo = lastOpened()[a.id], g = groupById(a.groupId);
    var meta = [];
    if (a.demo) meta.push('<span class="tag demo">Demo</span>');
    if (lo) meta.push("<span>Last opened " + rel(lo) + "</span>");
    else if (g && gtab === "all") meta.push("<span>" + esc(g.name) + "</span>");
    if ((a.quickActions || []).length) meta.push('<span aria-label="' + a.quickActions.length + ' quick actions">\u26A1' + a.quickActions.length + "</span>");
    if (a.notes && a.notes.trim()) meta.push('<span aria-label="Has notes">\u270E</span>');
    return '<li class="row" data-agent="' + esc(a.id) + '">' + avatar(a, "") +
      '<div class="row-main" role="button" tabindex="0" aria-label="' + esc(a.name) + ', details">' +
      '<span class="row-name"><span class="nm">' + esc(a.name) + "</span>" + (isPinned(a.id) ? '<span class="pin-ico" aria-label="Pinned">\uD83D\uDCCC</span>' : "") + "</span>" +
      (a.role ? '<span class="row-role">' + esc(a.role) + "</span>" : "") + (meta.length ? '<span class="row-st">' + meta.join(" · ") + "</span>" : "") + "</div>" +
      '<div class="row-side">' + openLink(a) + "</div></li>";
  }
  function orderAgents(list) {
    var lo = lastOpened();
    return list.slice().sort(function (a, b) {
      var pa = DB.pins.indexOf(a.id), pb = DB.pins.indexOf(b.id);
      if ((pa > -1) !== (pb > -1)) return pa > -1 ? -1 : 1;
      if (pa > -1) return pa - pb;
      var la = lo[a.id] || 0, lb = lo[b.id] || 0;
      if (la !== lb) return lb - la;
      return DB.agents.indexOf(a) - DB.agents.indexOf(b);
    });
  }
  function onboarding() {
    return '<div class="onboard"><img src="icons/icon-192.png" width="88" height="88" alt="IntelliGro.AI logo"><h2>Add your first agent</h2>' +
      "<p>Keep the links, notes and quick actions for the AI agents you use in one place on your phone. Everything stays on this device.</p>" +
      '<button type="button" class="btn primary block" data-ob="add">\uFF0B Add agent</button>' +
      '<button type="button" class="btn block" data-ob="import">Import setup</button>' +
      '<button type="button" class="btn block ghost" data-ob="demo">Try demo agents</button>' +
      '<p class="hint">Demo agents are fictional samples. You can remove them with one tap.</p></div>';
  }
  function renderAgents() {
    var v = $("view-agents");
    if (!DB.agents.length) { v.innerHTML = onboarding(); return; }
    var tabs = gtabList();
    if (!tabs.some(function (x) { return x.k === gtab; })) gtab = "all";
    var html = tabs.length > 1 ? '<div class="gtabs" role="tablist" aria-label="Groups">' + tabs.map(function (g) {
      return '<button type="button" role="tab" class="gtab' + (gtab === g.k ? " active" : "") + '" data-gtab="' + esc(g.k) + '" aria-selected="' + (gtab === g.k) + '" style="--gc:' + g.c + '">' + esc(g.t) + "</button>";
    }).join("") + "</div>" : "";
    html += '<div class="swipe-area">';
    if (hasDemo()) html += '<div class="notice demo-note"><span><b>Demo agents</b> are fictional samples.</span><button type="button" class="btn sm" data-ob="rmdemo">Remove demo agents</button></div>';
    var rec = recentIds(6), lo = lastOpened();
    if (gtab === "all" && rec.length) {
      html += '<div class="sec-h">Recently opened</div><div class="recent-strip">' + rec.map(function (id) {
        var a = agentById(id);
        return '<button type="button" class="recent-item" data-recent="' + esc(id) + '" aria-label="' + esc(a.name) + '">' + avatar(a, "lg") + '<span class="nm">' + esc(a.name) + "</span></button>";
      }).join("") + "</div>";
    }
    if (gtab === "all") {
      var pinned = orderAgents(DB.agents.filter(function (a) { return isPinned(a.id); }));
      var recentNP = DB.agents.filter(function (a) { return !isPinned(a.id) && lo[a.id]; });
      if (pinned.length) html += '<div class="sec-h">Pinned</div><ul class="rows">' + pinned.map(agentRow).join("") + "</ul>";
      if (recentNP.length) html += '<div class="sec-h">Recent</div><ul class="rows">' + orderAgents(recentNP).map(agentRow).join("") + "</ul>";
      sortedGroups().concat(hasUngrouped() ? [{ id: "__none", name: DB.groups.length ? "Ungrouped" : "Agents", color: "#94a3b8" }] : []).forEach(function (g) {
        var rest = agentsIn(g.id).filter(function (a) { return !isPinned(a.id) && !lo[a.id]; });
        if (!rest.length) return;
        html += '<div class="sec-h" style="--gc:' + g.color + '"><span class="bar"></span>' + esc(g.name) + '</div><ul class="rows">' + rest.map(agentRow).join("") + "</ul>";
      });
    } else {
      var list = orderAgents(agentsIn(gtab));
      html += list.length ? '<ul class="rows" style="margin-top:6px">' + list.map(agentRow).join("") + "</ul>" : '<div class="empty">No agents in this group yet.<br><button type="button" class="btn sm" data-ob="add" style="margin-top:12px">\uFF0B Add agent</button></div>';
    }
    html += '<p class="hint" style="text-align:center;padding:14px 16px">' + (tabs.length > 1 ? "Swipe sideways to switch groups. " : "") + "Long-press an agent for Pin, Edit, Notes, Duplicate and Delete.</p></div>";
    v.innerHTML = html;
  }
  function setGtab(k) { if (k === gtab) return; gtab = k; sset("gtab", k); renderAgents(); $("views").scrollTop = 0; var a = document.querySelector(".gtab.active"); if (a && a.scrollIntoView) a.scrollIntoView({ inline: "nearest", block: "nearest" }); }
  $("view-agents").addEventListener("click", function (e) {
    var g = e.target.closest("[data-gtab]"); if (g) { setGtab(g.getAttribute("data-gtab")); return; }
    var r = e.target.closest("[data-recent]"); if (r) { openAgentSheet(r.getAttribute("data-recent")); return; }
    var ob = e.target.closest("[data-ob]"); if (!ob) return;
    var k = ob.getAttribute("data-ob");
    if (k === "add") openEditor(null, gtab !== "all" && gtab !== "__none" ? gtab : null);
    else if (k === "import") openImport(); else if (k === "demo") loadDemo(); else if (k === "rmdemo") removeDemo();
  });
  (function () { // swipe between group tabs; ignores the screen edges (Android back gesture)
    var sx = 0, sy = 0, active = false, el = $("view-agents");
    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse") return;
      active = e.clientX > 28 && e.clientX < window.innerWidth - 28 && !e.target.closest(".gtabs,.recent-strip"); sx = e.clientX; sy = e.clientY;
    }, { passive: true });
    el.addEventListener("pointerup", function (e) {
      if (!active) return; active = false;
      var dx = e.clientX - sx, dy = e.clientY - sy, tabs = gtabList();
      if (tabs.length > 1 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) {
        var i = tabs.map(function (g) { return g.k; }).indexOf(gtab), ni = dx < 0 ? Math.min(tabs.length - 1, i + 1) : Math.max(0, i - 1);
        if (ni !== i) { suppressClick = true; setTimeout(function () { suppressClick = false; }, 350); setGtab(tabs[ni].k); }
      }
    }, { passive: true });
    el.addEventListener("pointercancel", function () { active = false; });
  })();

  /* row tap + long-press (450ms) */
  var suppressClick = false;
  function bindLongPress(root, sel, onLong) {
    var timer = null, sx = 0, sy = 0, target = null;
    root.addEventListener("pointerdown", function (e) {
      var el = e.target.closest(sel); if (!el || e.target.closest("a,.row-side button")) return;
      target = el; sx = e.clientX; sy = e.clientY; clearTimeout(timer);
      timer = setTimeout(function () { timer = null; suppressClick = true; setTimeout(function () { suppressClick = false; }, 700); haptic(15); onLong(target); }, 450);
    }, { passive: true });
    root.addEventListener("pointermove", function (e) { if (timer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) { clearTimeout(timer); timer = null; } }, { passive: true });
    ["pointerup", "pointercancel"].forEach(function (ev) { root.addEventListener(ev, function () { clearTimeout(timer); timer = null; }, { passive: true }); });
    root.addEventListener("contextmenu", function (e) { var el = e.target.closest(sel); if (el && !e.target.closest("a")) { e.preventDefault(); if (!suppressClick) onLong(el); } });
  }
  ["view-agents", "view-groups"].forEach(function (vid) {
    var v = $(vid);
    bindLongPress(v, ".row[data-agent]", function (el) { openActionSheet(el.getAttribute("data-agent")); });
    v.addEventListener("click", function (e) {
      if (suppressClick) { e.preventDefault(); return; }
      var m = e.target.closest(".row-main"); if (!m) return;
      var row = m.closest("[data-agent]"); if (row) openAgentSheet(row.getAttribute("data-agent"));
    });
    v.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("row-main")) { e.preventDefault(); e.target.click(); } });
  });

  /* ---------------- agent sheet: open, quick actions, notes ---------------- */
  function maskUrl(u) { try { var x = new URL(u); return x.protocol + "//" + x.host + "/\u2022\u2022\u2022\u2022"; } catch (e) { return "\u2022\u2022\u2022\u2022"; } }
  function openAgentSheet(id, focusNotes) {
    var a = agentById(id); if (!a) return;
    var g = groupById(a.groupId), lo = lastOpened()[id];
    var html = '<div class="sheet-head">' + avatar(a, "xl") + '<div class="t"><h2>' + esc(a.name) + (a.demo ? ' <span class="tag demo">Demo</span>' : "") + "</h2><p>" + esc(a.role || "") + "</p></div></div>" +
      '<div class="kv" style="margin-bottom:6px"><span>Group</span><span>' + esc(g ? g.name : "Ungrouped") + "</span></div>" +
      '<div class="kv" style="margin-bottom:12px"><span>Last opened</span><span>' + (lo ? rel(lo) : "Not yet") + "</span></div>";
    if (a.openUrl) html += openLink(a, "primary block", "Open") + '<p class="hint dl">' + (SANDBOX ? "Links are off in the sandbox." : "Uses the link you saved. App links open the app if it's installed on this device.") + "</p>";
    else html += '<button type="button" class="btn block" data-act="edit">Add an open link</button>';
    var qas = a.quickActions || [];
    if (qas.length) {
      html += '<div class="field-lbl">Quick actions <span>' + (a.hideSecrets ? "Secrets hidden" : "") + "</span></div><div class=\"qa-list\">" + qas.map(function (q) {
        return '<button type="button" class="btn block qa-btn" data-qa="' + esc(q.id) + '"><span>\u26A1 ' + esc(q.label) + '</span><small>' + esc(q.method) + " " + esc(a.hideSecrets ? maskUrl(q.url) : q.url) + "</small></button>";
      }).join("") + "</div><p class=\"hint\">You'll confirm before anything is sent." + (SANDBOX || a.demo ? " Demo and sandbox actions are simulated." : "") + "</p>";
    }
    html += '<div class="sheet-actions" style="margin-top:14px">' +
      '<button type="button" class="btn" data-act="pin">' + (isPinned(id) ? "\uD83D\uDCCC Unpin" : "\uD83D\uDCCC Pin") + "</button>" +
      '<button type="button" class="btn" data-act="edit">\u270F\uFE0F Edit</button>' +
      '<button type="button" class="btn" data-act="dup">\uD83D\uDCC4 Duplicate</button>' +
      '<button type="button" class="btn" data-act="del">\uD83D\uDDD1 Delete</button></div>' +
      '<div class="field-lbl">Notes <span id="noteSaved"></span></div>' +
      '<textarea class="notes" id="noteBox" placeholder="Jot down what you want to ask or remember…" aria-label="Notes for ' + esc(a.name) + '">' + esc(a.notes || "") + "</textarea>" +
      '<p class="hint">Saved on this device only.</p>';
    var w = openSheet(html, { label: a.name });
    var box = w.querySelector("#noteBox"), saveT;
    if (focusNotes) setTimeout(function () { box.focus(); box.scrollIntoView({ block: "center" }); }, 80);
    box.addEventListener("input", function () {
      var val = box.value; w.querySelector("#noteSaved").textContent = "Saving…"; clearTimeout(saveT);
      saveT = setTimeout(function () {
        var ag = agentById(id); if (!ag) return;
        ag.notes = val.slice(0, 20000); ag.updatedAt = Date.now(); save();
        var s = w.querySelector("#noteSaved"); if (s) s.textContent = val.trim() ? "Saved " + fmtClock(Date.now()) : "Cleared";
        var lg = sget("log", []);
        if (!(lg[0] && lg[0].kind === "note" && lg[0].id === id && Date.now() - lg[0].t < 5 * MIN)) logLocal("note", id, "Edited notes for " + ag.name);
      }, 450);
    });
    w.addEventListener("click", function (e) {
      if (e.target.closest("[data-open-agent]")) { setTimeout(function () { if (layers.length && layers[layers.length - 1].el === w) closeTopLayer(); }, 80); return; }
      var q = e.target.closest("[data-qa]"); if (q) { confirmQuickAction(id, q.getAttribute("data-qa")); return; }
      var b = e.target.closest("[data-act]"); if (!b) return;
      var act = b.getAttribute("data-act"); closeTopLayer();
      setTimeout(function () { agentAction(act, id); }, 30);
    });
  }
  function openActionSheet(id) {
    var a = agentById(id); if (!a) return;
    var w = openSheet('<div class="sheet-head">' + avatar(a, "md") + '<div class="t"><h2>' + esc(a.name) + '</h2></div></div><ul class="sheet-list" style="list-style:none">' +
      '<li><button type="button" data-act="pin"><span class="ico" aria-hidden="true">\uD83D\uDCCC</span>' + (isPinned(id) ? "Unpin" : "Pin") + "</button></li>" +
      '<li><button type="button" data-act="edit"><span class="ico" aria-hidden="true">\u270F\uFE0F</span>Edit</button></li>' +
      '<li><button type="button" data-act="notes"><span class="ico" aria-hidden="true">\u270E</span>Notes</button></li>' +
      '<li><button type="button" data-act="dup"><span class="ico" aria-hidden="true">\uD83D\uDCC4</span>Duplicate</button></li>' +
      '<li><button type="button" data-act="del" class="danger-txt"><span class="ico" aria-hidden="true">\uD83D\uDDD1</span>Delete</button></li></ul>', { label: a.name + " actions" });
    w.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      var act = b.getAttribute("data-act"); closeTopLayer();
      setTimeout(function () { agentAction(act, id); }, 30);
    });
  }
  function agentAction(act, id) {
    var a = agentById(id); if (!a) return;
    if (act === "pin") togglePin(id);
    else if (act === "edit") openEditor(id);
    else if (act === "notes") openAgentSheet(id, true);
    else if (act === "dup") {
      var c = JSON.parse(JSON.stringify(a)); c.id = uid("a_"); c.name = (a.name + " copy").slice(0, 60); c.demo = false; c.updatedAt = Date.now();
      (c.quickActions || []).forEach(function (q) { q.id = uid("q_"); });
      DB.agents.splice(DB.agents.indexOf(a) + 1, 0, c); save(); renderAll(); toast("Duplicated");
    } else if (act === "del") {
      confirmScreen({ title: "Delete " + a.name + "?", fields: [["What happens", "Removes this agent, its notes and quick actions from this device."]], approve: "Delete", danger: true, onApprove: function () {
        var idx = DB.agents.indexOf(a), pidx = DB.pins.indexOf(id);
        DB.agents.splice(idx, 1); if (pidx > -1) DB.pins.splice(pidx, 1); save(); renderAll();
        toast("Deleted " + a.name, function () { DB.agents.splice(idx, 0, a); if (pidx > -1) DB.pins.splice(pidx, 0, id); save(); renderAll(); });
      } });
    }
  }

  /* ---------------- quick actions (webhooks) ---------------- */
  function confirmQuickAction(aid, qid) {
    var a = agentById(aid); if (!a) return;
    var q = (a.quickActions || []).filter(function (x) { return x.id === qid; })[0]; if (!q) return;
    var simulated = SANDBOX || a.demo;
    var fields = [["Agent", a.name], ["Action", q.label], ["Method", q.method], ["Address", a.hideSecrets ? maskUrl(q.url) : q.url]];
    if (q.body) fields.push(["Body (JSON)", q.body]);
    if (q.auth) fields.push(["Auth header", q.auth.header + ": \u2022\u2022\u2022\u2022 (hidden)"]);
    confirmScreen({
      sim: simulated, title: simulated ? "Run this action? (simulated)" : "Send this request?",
      sub: simulated ? "Demo and sandbox actions never touch the network." : "This sends a real request from your phone. Check the address before you tap Run.",
      fields: fields, approve: simulated ? "Run (simulated)" : "Run", cancel: "Cancel",
      onApprove: function () { runQuickAction(a, q, simulated); }
    });
  }
  function runQuickAction(a, q, simulated) {
    var target = a.hideSecrets ? maskUrl(q.url) : q.url;
    if (simulated) {
      var msg = "Simulated: would " + q.method + " to " + target;
      logLocal("action", a.id, q.label + " on " + a.name, msg);
      resultSheet("Simulated", msg + (q.body ? "\n\nBody: " + q.body : ""), true);
      return;
    }
    if (navigator.onLine === false) { resultSheet("You're offline", "Connect to the internet, then try again.", false); return; }
    var headers = {};
    if (q.body) headers["Content-Type"] = "application/json";
    if (q.auth) headers[q.auth.header] = q.auth.value;
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    toast("Sending…");
    fetch(q.url, { method: q.method, headers: headers, body: q.method === "GET" || !q.body ? undefined : q.body, mode: "cors", credentials: "omit", cache: "no-store", redirect: "follow", referrerPolicy: "no-referrer", signal: ctl ? ctl.signal : undefined })
      .then(function (res) {
        clearTimeout(tm);
        var line = res.status + (res.statusText ? " " + res.statusText : "");
        logLocal("action", a.id, q.label + " on " + a.name, (res.ok ? "Done: " : "Failed: ") + line);
        resultSheet(res.ok ? "Done" : "The service answered with an error", "Status " + line + "\n" + q.method + " " + target, res.ok);
      })
      .catch(function (err) {
        clearTimeout(tm);
        var aborted = err && err.name === "AbortError";
        var why = aborted ? "No answer after 15 seconds." : "The request didn't go through. The most common reason: this service doesn't allow calls from a browser (CORS). It can also mean the address is wrong or the service is down.";
        logLocal("action", a.id, q.label + " on " + a.name, aborted ? "Timed out" : "Blocked or unreachable (likely CORS)");
        resultSheet(aborted ? "Timed out" : "Couldn't send", why + "\n\n" + q.method + " " + target, false);
      });
  }
  function resultSheet(title, body, ok) {
    openSheet('<div class="sheet-head"><span class="result-ico ' + (ok ? "ok" : "bad") + '" aria-hidden="true">' + (ok ? "\u2713" : "!") + '</span><div class="t"><h2>' + esc(title) + '</h2></div></div><p class="result-body">' + esc(body) + '</p><button type="button" class="btn block" data-close style="margin-top:14px">OK</button>', { label: title });
  }

  /* ---------------- agent editor ---------------- */
  function colorSwatches(name, current) {
    return '<div class="swatches" role="radiogroup" aria-label="Color">' + PALETTE.map(function (c) {
      return '<button type="button" class="sw" role="radio" aria-checked="' + (current === c) + '" aria-label="Color ' + c + '" data-color="' + c + '" style="background:' + c + '"></button>';
    }).join("") + '<label class="sw custom" aria-label="Custom color"><input type="color" data-color-custom value="' + esc(current || "#34d399") + '"></label></div>';
  }
  function qaFieldset(q, i) {
    q = q || { id: uid("q_"), label: "", url: "", method: "POST", body: "", auth: null };
    return '<fieldset class="qa-edit" data-qid="' + esc(q.id) + '"><legend>Quick action ' + (i + 1) + '</legend>' +
      '<label class="f"><span>Label</span><input data-q="label" maxlength="40" value="' + esc(q.label) + '" placeholder="e.g. Morning summary"></label>' +
      '<label class="f"><span>Webhook address</span><input data-q="url" type="url" inputmode="url" autocomplete="off" value="' + esc(q.url) + '" placeholder="https://"></label>' +
      '<label class="f"><span>Method</span><select data-q="method">' + METHODS.map(function (m) { return "<option" + (q.method === m ? " selected" : "") + ">" + m + "</option>"; }).join("") + "</select></label>" +
      '<label class="f"><span>JSON body (optional)</span><textarea data-q="body" rows="3" spellcheck="false" placeholder=\'{"key":"value"}\'>' + esc(q.body || "") + "</textarea></label>" +
      '<div class="f2"><label class="f"><span>Auth header name (optional)</span><input data-q="authh" maxlength="64" autocomplete="off" value="' + esc(q.auth ? q.auth.header : "") + '" placeholder="Authorization"></label>' +
      '<label class="f"><span>Auth header value</span><input data-q="authv" type="password" autocomplete="new-password" placeholder="Bearer …"></label></div>' +
      '<p class="ferr" data-q="err" hidden></p><button type="button" class="link-btn danger-txt" data-q-remove>Remove this action</button></fieldset>';
  }
  function openEditor(id, presetGroup) {
    var a = id ? agentById(id) : null, isNew = !a;
    var d = a ? JSON.parse(JSON.stringify(a)) : { id: uid("a_"), name: "", role: "", groupId: presetGroup || (gtab !== "all" && groupById(gtab) ? gtab : ""), initials: "", color: "", avatar: null, openUrl: "", notes: "", quickActions: [], hideSecrets: false };
    var groups = sortedGroups();
    var html = '<div class="sheet-head"><div class="t"><h2>' + (isNew ? "Add agent" : "Edit agent") + "</h2>" + (d.demo ? '<p>Demo agent. Saving keeps it marked Demo.</p>' : "") + '</div></div><form id="edForm" novalidate>' +
      '<div class="av-edit"><span id="edAv"></span><div class="av-btns"><label class="btn sm">Choose image<input type="file" accept="image/*" id="edImg" hidden></label><button type="button" class="btn sm ghost" id="edImgRm"' + (d.avatar ? "" : " hidden") + ">Remove image</button></div></div>" +
      '<label class="f"><span>Name *</span><input id="edName" maxlength="60" required value="' + esc(d.name) + '" placeholder="e.g. Research assistant" autocomplete="off"></label>' +
      '<label class="f"><span>Role</span><input id="edRole" maxlength="140" value="' + esc(d.role) + '" placeholder="What it does, in a few words"></label>' +
      '<label class="f"><span>Group</span><select id="edGroup"><option value="">No group</option>' + groups.map(function (g) { return '<option value="' + esc(g.id) + '"' + (d.groupId === g.id ? " selected" : "") + ">" + esc(g.name) + "</option>"; }).join("") + '<option value="__new">+ New group…</option></select></label>' +
      '<div class="f2"><label class="f"><span>Initials</span><input id="edIni" maxlength="3" value="' + esc(d.initials) + '" placeholder="Auto" autocapitalize="characters"></label><div class="f"><span>Color</span>' + colorSwatches("ed", d.color) + "</div></div>" +
      '<label class="f"><span>Open link</span><input id="edUrl" type="url" inputmode="url" autocomplete="off" value="' + esc(d.openUrl) + '" placeholder="https://… or myapp://…"></label><p class="ferr" id="edUrlErr" hidden></p>' +
      '<p class="hint" style="margin-top:-2px">Any web address or app link. javascript: and data: links are blocked.</p>' +
      '<div class="field-lbl">Quick actions <span>optional</span></div><div id="edQas">' + (d.quickActions || []).map(qaFieldset).join("") + "</div>" +
      '<button type="button" class="btn sm" id="edQaAdd">\uFF0B Add quick action</button>' +
      '<label class="toggle"><input type="checkbox" id="edHide"' + (d.hideSecrets ? " checked" : "") + '><span>Hide secrets (mask webhook addresses on screen)</span></label>' +
      '<p class="warn">Quick actions and auth headers are stored on this device only. Anyone who can use this unlocked phone can run them. Set a device passcode in You.</p>' +
      '</form><div class="sheet-foot">' + (isNew ? "" : '<button type="button" class="btn ghost danger-txt" id="edDel">Delete</button>') + '<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" id="edSave">Save</button></div>';
    var w = openSheet(html, { full: true, label: isNew ? "Add agent" : "Edit agent" });
    var $w = function (s) { return w.querySelector(s); };
    // Secrets never go into markup: fill the masked auth fields through the .value property only.
    (d.quickActions || []).forEach(function (q) {
      if (!q.auth || !q.auth.value) return;
      qa("fieldset.qa-edit", w).forEach(function (fs) { if (fs.getAttribute("data-qid") === q.id) { var inp = fs.querySelector('[data-q="authv"]'); if (inp) inp.value = q.auth.value; } });
    });
    function preview() { var tmp = { name: $w("#edName").value || "?", initials: $w("#edIni").value.toUpperCase(), color: d.color, avatar: d.avatar, groupId: $w("#edGroup").value }; $w("#edAv").innerHTML = avatar(tmp, "xl"); $w("#edImgRm").hidden = !d.avatar; }
    preview();
    w.addEventListener("input", function (e) { if (e.target.id === "edName" || e.target.id === "edIni") preview(); if (e.target.hasAttribute("data-color-custom")) { d.color = validColor(e.target.value) || d.color; qa(".sw[data-color]", w).forEach(function (s) { s.setAttribute("aria-checked", "false"); }); preview(); } });
    w.addEventListener("change", function (e) {
      if (e.target.id === "edGroup") {
        if (e.target.value === "__new") { var nm = (prompt("New group name") || "").trim().slice(0, 40); if (nm) { var g = { id: uid("g_"), name: nm, color: PALETTE[DB.groups.length % PALETTE.length], order: DB.groups.length }; DB.groups.push(g); save(); var o = document.createElement("option"); o.value = g.id; o.textContent = nm; e.target.insertBefore(o, e.target.lastElementChild); e.target.value = g.id; } else e.target.value = d.groupId || ""; }
        preview();
      }
      if (e.target.id === "edImg" && e.target.files && e.target.files[0]) {
        shrinkImage(e.target.files[0], function (url) { if (url) { d.avatar = url; preview(); } else toast("Couldn't read that image"); });
      }
    });
    w.addEventListener("click", function (e) {
      var s = e.target.closest("[data-color]"); if (s) { d.color = s.getAttribute("data-color"); qa(".sw[data-color]", w).forEach(function (x) { x.setAttribute("aria-checked", String(x === s)); }); preview(); return; }
      if (e.target.closest("#edImgRm")) { d.avatar = null; $w("#edImg").value = ""; preview(); return; }
      if (e.target.closest("#edQaAdd")) { var n = qa(".qa-edit", w).length; if (n >= 20) return; $w("#edQas").insertAdjacentHTML("beforeend", qaFieldset(null, n)); return; }
      var rm = e.target.closest("[data-q-remove]"); if (rm) { rm.closest(".qa-edit").remove(); return; }
      if (e.target.closest("#edDel")) { closeTopLayer(); setTimeout(function () { agentAction("del", d.id); }, 30); return; }
      if (e.target.closest("#edSave")) doSave();
    });
    function doSave() {
      var ok = true, name = $w("#edName").value.trim();
      if (!name) { $w("#edName").focus(); toast("Add a name"); return; }
      var url = checkOpenUrl($w("#edUrl").value), ue = $w("#edUrlErr");
      ue.hidden = url.ok; ue.textContent = url.ok ? "" : url.msg; if (!url.ok) ok = false;
      var qas = [];
      qa(".qa-edit", w).forEach(function (fs) {
        var g = function (k) { return fs.querySelector('[data-q="' + k + '"]'); }, err = g("err"), msgs = [];
        var label = g("label").value.trim(), hu = checkHookUrl(g("url").value), body = checkJsonBody(g("body").value), ah = g("authh").value.trim(), av = g("authv").value;
        if (!label && !g("url").value.trim()) return; // empty row: ignore
        if (!label) msgs.push("Add a label.");
        if (!hu.ok) msgs.push(hu.msg);
        if (!body.ok) msgs.push(body.msg);
        if (ah && !/^[A-Za-z0-9-]{1,64}$/.test(ah)) msgs.push("Header name: letters, numbers and dashes only.");
        if (/[\r\n]/.test(av)) msgs.push("Header value can't have line breaks.");
        err.hidden = !msgs.length; err.textContent = msgs.join(" ");
        if (msgs.length) { ok = false; return; }
        qas.push({ id: fs.getAttribute("data-qid"), label: label, url: hu.value, method: g("method").value, body: body.value, auth: ah && av ? { header: ah, value: av } : null });
      });
      if (!ok) { toast("Fix the highlighted fields"); var f = w.querySelector(".ferr:not([hidden])"); if (f) f.scrollIntoView({ block: "center" }); return; }
      var rec = { id: d.id, name: name, role: $w("#edRole").value.trim().slice(0, 140), groupId: groupById($w("#edGroup").value) ? $w("#edGroup").value : "",
        initials: $w("#edIni").value.replace(/[^\w]/g, "").toUpperCase().slice(0, 3), color: d.color || "", avatar: d.avatar || null, openUrl: url.value,
        notes: d.notes || "", quickActions: qas, hideSecrets: $w("#edHide").checked, demo: !!d.demo, statusUrl: d.statusUrl, updatedAt: Date.now() };
      if (isNew) DB.agents.push(rec); else DB.agents[DB.agents.indexOf(agentById(d.id))] = rec;
      save(); closeTopLayer(); renderAll(); toast(isNew ? "Agent added" : "Saved");
      if (isNew && curTab !== "agents") switchTab("agents");
    }
    if (isNew) setTimeout(function () { $w("#edName").focus(); }, 80);
  }
  function shrinkImage(file, cb) {
    if (!/^image\//.test(file.type) || file.size > 15e6) { cb(null); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var S = 128, c = document.createElement("canvas"); c.width = S; c.height = S;
        var x = c.getContext("2d"), m = Math.min(img.width, img.height);
        x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
        var out = c.toDataURL("image/jpeg", .82);
        cb(validAvatar(out));
      };
      img.onerror = function () { cb(null); };
      img.src = fr.result;
    };
    fr.onerror = function () { cb(null); };
    fr.readAsDataURL(file);
  }

  /* ---------------- Groups tab (user-defined: create, rename, recolor, reorder, delete) ---------------- */
  function stack(list) {
    return '<span class="stack" aria-hidden="true">' + list.slice(0, 3).map(function (a) { return avatar(a, "sm"); }).join("") + (list.length > 3 ? '<span class="more">+' + (list.length - 3) + "</span>" : "") + "</span>";
  }
  function renderGroups() {
    var v = $("view-groups"), open = sget("groupOpen", {}), gs = sortedGroups(), html = "";
    if (!gs.length) {
      v.innerHTML = '<div class="empty"><span class="big" aria-hidden="true">\uD83D\uDDC2\uFE0F</span>No groups yet. Groups become the tabs on your Agents list.<br><button type="button" class="btn primary" data-gnew style="margin-top:14px">\uFF0B New group</button></div>' +
        (DB.agents.length ? '<div class="sec-h">Agents</div><ul class="rows">' + orderAgents(DB.agents).map(agentRow).join("") + "</ul>" : "");
      return;
    }
    var all = gs.concat(hasUngrouped() ? [{ id: "__none", name: "Ungrouped", color: "#94a3b8", virtual: true }] : []);
    all.forEach(function (g, i) {
      var members = orderAgents(agentsIn(g.id)), isOpen = open[g.id] !== false;
      html += '<section class="crew' + (isOpen ? "" : " closed") + '" style="--gc:' + g.color + '"><div class="crew-hrow">' +
        '<button type="button" class="crew-h" data-gtoggle="' + esc(g.id) + '" aria-expanded="' + isOpen + '"><span class="bar"></span>' +
        '<span class="ttl"><b>' + esc(g.name) + "</b><small>" + members.length + (members.length === 1 ? " agent" : " agents") + "</small></span>" + stack(members) + '<span class="chev" aria-hidden="true">\u25BE</span></button>' +
        (g.virtual ? "" : '<button type="button" class="icon-btn gmenu" data-gmenu="' + esc(g.id) + '" aria-label="Manage ' + esc(g.name) + '"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>') +
        '</div><div class="crew-body"><ul class="rows">' + (members.length ? members.map(agentRow).join("") : '<li class="empty" style="padding:18px">No agents here yet.</li>') + "</ul>" +
        (g.virtual ? "" : '<div style="padding:8px 16px 12px"><button type="button" class="btn sm" data-gadd="' + esc(g.id) + '">\uFF0B Add agent to ' + esc(g.name) + "</button></div>") + "</div></section>";
    });
    html += '<div style="padding:16px;text-align:center"><button type="button" class="btn" data-gnew>\uFF0B New group</button></div>';
    v.innerHTML = html;
  }
  $("view-groups").addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-gtoggle]"))) {
      var id = t.getAttribute("data-gtoggle"), open = sget("groupOpen", {}); open[id] = open[id] === false; sset("groupOpen", open);
      t.closest(".crew").classList.toggle("closed", !open[id]); t.setAttribute("aria-expanded", String(open[id])); return;
    }
    if (e.target.closest("[data-gnew]")) { openGroupEditor(null); return; }
    if ((t = e.target.closest("[data-gadd]"))) { openEditor(null, t.getAttribute("data-gadd")); return; }
    if ((t = e.target.closest("[data-gmenu]"))) groupMenu(t.getAttribute("data-gmenu"));
  });
  function groupMenu(id) {
    var g = groupById(id); if (!g) return;
    var gs = sortedGroups(), i = gs.indexOf(g);
    var w = openSheet('<div class="sheet-head"><span class="gdot" style="background:' + g.color + '"></span><div class="t"><h2>' + esc(g.name) + '</h2></div></div><ul class="sheet-list" style="list-style:none">' +
      '<li><button type="button" data-g="edit"><span class="ico" aria-hidden="true">\u270F\uFE0F</span>Rename or recolor</button></li>' +
      (i > 0 ? '<li><button type="button" data-g="up"><span class="ico" aria-hidden="true">\u2191</span>Move up</button></li>' : "") +
      (i < gs.length - 1 ? '<li><button type="button" data-g="down"><span class="ico" aria-hidden="true">\u2193</span>Move down</button></li>' : "") +
      '<li><button type="button" data-g="del" class="danger-txt"><span class="ico" aria-hidden="true">\uD83D\uDDD1</span>Delete group</button></li></ul>', { label: g.name });
    w.addEventListener("click", function (e) {
      var b = e.target.closest("[data-g]"); if (!b) return;
      var act = b.getAttribute("data-g"); closeTopLayer();
      setTimeout(function () {
        if (act === "edit") openGroupEditor(id);
        else if (act === "up" || act === "down") { var j = act === "up" ? i - 1 : i + 1; var tmp = gs[i]; gs[i] = gs[j]; gs[j] = tmp; gs.forEach(function (x, k) { x.order = k; }); save(); renderAll(); }
        else if (act === "del") {
          var n = agentsIn(id).length;
          confirmScreen({ title: "Delete group " + g.name + "?", fields: [["What happens", n ? "The group is removed. Its " + n + " agent" + (n === 1 ? "" : "s") + " move to Ungrouped; nothing else is deleted." : "The empty group is removed."]], approve: "Delete group", danger: true, onApprove: function () {
            var before = JSON.parse(JSON.stringify(DB));
            DB.groups = DB.groups.filter(function (x) { return x.id !== id; });
            DB.agents.forEach(function (a) { if (a.groupId === id) a.groupId = ""; });
            if (gtab === id) gtab = "all";
            save(); renderAll(); toast("Group deleted", function () { DB = before; save(); renderAll(); });
          } });
        }
      }, 30);
    });
  }
  function openGroupEditor(id) {
    var g = id ? groupById(id) : null, d = { name: g ? g.name : "", color: g ? g.color : PALETTE[DB.groups.length % PALETTE.length] };
    var w = openSheet('<div class="sheet-head"><div class="t"><h2>' + (g ? "Edit group" : "New group") + '</h2></div></div>' +
      '<label class="f"><span>Name</span><input id="gName" maxlength="40" value="' + esc(d.name) + '" placeholder="e.g. Work" autocomplete="off"></label>' +
      '<div class="f"><span>Color</span>' + colorSwatches("g", d.color) + '</div><div class="sheet-foot"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" id="gSave">Save</button></div>', { label: g ? "Edit group" : "New group" });
    setTimeout(function () { w.querySelector("#gName").focus(); }, 80);
    w.addEventListener("input", function (e) { if (e.target.hasAttribute("data-color-custom")) d.color = validColor(e.target.value) || d.color; });
    w.addEventListener("click", function (e) {
      var s = e.target.closest("[data-color]"); if (s) { d.color = s.getAttribute("data-color"); qa(".sw[data-color]", w).forEach(function (x) { x.setAttribute("aria-checked", String(x === s)); }); return; }
      if (!e.target.closest("#gSave")) return;
      var nm = w.querySelector("#gName").value.trim().slice(0, 40); if (!nm) { toast("Add a name"); return; }
      if (g) { g.name = nm; g.color = d.color; } else DB.groups.push({ id: uid("g_"), name: nm, color: d.color, order: DB.groups.length });
      save(); closeTopLayer(); renderAll(); toast(g ? "Group saved" : "Group added");
    });
  }

  /* ---------------- search sheet (fuzzy: name, role, group) ---------------- */
  function fuzzyScore(q, s) {
    s = String(s || "").toLowerCase(); if (!q) return 1;
    var i = s.indexOf(q); if (i === 0) return 100; if (i > 0) return (s[i - 1] === " " ? 80 : 60) - i * .1;
    var qi = 0, score = 0, last = -2;
    for (var k = 0; k < s.length && qi < q.length; k++) if (s[k] === q[qi]) { score += (k === last + 1 ? 3 : 1); last = k; qi++; }
    return qi === q.length ? score : 0;
  }
  $("searchBtn").addEventListener("click", function () {
    var w = openSheet('<input class="search-in" id="sq" type="search" placeholder="Search agents, roles or groups" autocomplete="off" enterkeyhint="search" aria-label="Search agents"><ul class="rows" id="sres" style="margin:8px -16px 0"></ul>', { full: true, label: "Search" });
    var inp = w.querySelector("#sq"), res = w.querySelector("#sres");
    function run() {
      var q = inp.value.trim().toLowerCase(), rec = recentIds(50);
      var list = DB.agents.map(function (a) {
        var g = groupById(a.groupId);
        var s = Math.max(fuzzyScore(q, a.name) * 1.5, fuzzyScore(q, a.role), fuzzyScore(q, g ? g.name : "") * .8);
        if (!q && rec.indexOf(a.id) > -1) s += 1000 - rec.indexOf(a.id);
        return { a: a, s: s };
      }).filter(function (x) { return x.s > 0; }).sort(function (x, y) { return y.s - x.s || DB.agents.indexOf(x.a) - DB.agents.indexOf(y.a); });
      res.innerHTML = list.length ? list.map(function (x) { return agentRow(x.a); }).join("") : '<li class="empty">No agents match "' + esc(inp.value) + '".</li>';
    }
    inp.addEventListener("input", run); run();
    setTimeout(function () { inp.focus(); }, 60);
    res.addEventListener("click", function (e) {
      if (e.target.closest("[data-open-agent]")) { setTimeout(function () { closeTopLayer(); }, 60); return; }
      var r = e.target.closest("[data-agent]"); if (!r) return;
      var id = r.getAttribute("data-agent"); closeTopLayer(); setTimeout(function () { openAgentSheet(id); }, 30);
    });
  });

  /* ---------------- top menu ---------------- */
  $("menuBtn").addEventListener("click", function () {
    var wrap = document.createElement("div"), dark = document.documentElement.getAttribute("data-theme") === "dark";
    wrap.innerHTML = '<div class="scrim" data-close style="background:transparent"></div><div class="menu" role="menu" aria-label="Menu">' +
      (gateNeeded() ? '<button type="button" role="menuitem" data-m="lock">\uD83D\uDD12 Lock now</button>' : "") +
      '<button type="button" role="menuitem" data-m="theme">' + (dark ? "\u2600\uFE0F Light mode" : "\uD83C\uDF19 Dark mode") + "</button>" +
      '<button type="button" role="menuitem" data-m="add">\uFF0B Add agent</button>' +
      '<button type="button" role="menuitem" data-m="export">\u2B06\uFE0F Export setup</button>' +
      '<button type="button" role="menuitem" data-m="import">\u2B07\uFE0F Import setup</button>' +
      (isStandalone() ? "" : '<button type="button" role="menuitem" data-m="install">\uD83D\uDCF2 Install app</button>') + "</div>";
    $("layerRoot").appendChild(wrap);
    pushLayer(wrap);
    wrap.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) { closeTopLayer(); return; }
      var b = e.target.closest("[data-m]"); if (!b) return;
      var m = b.getAttribute("data-m"); closeTopLayer();
      setTimeout(function () {
        if (m === "lock") lock(); else if (m === "theme") setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
        else if (m === "add") openEditor(null); else if (m === "export") openExport(); else if (m === "import") openImport(); else if (m === "install") doInstall();
      }, 30);
    });
  });

  /* ---------------- Activity tab: local log on this device ---------------- */
  var actFilter = "all";
  var LOCAL_ICO = { open: "\u2197", note: "\u270E", action: "\u26A1" };
  function groupByDay(items, render) {
    var out = "", cur = "";
    items.forEach(function (it) { var d = dayLabel(it.t); if (d !== cur) { cur = d; out += '<div class="day-h">' + esc(d) + "</div>"; } out += render(it); });
    return out;
  }
  function renderActivity() {
    var v = $("view-activity"), log = sget("log", []).filter(function (it) { return LOCAL_ICO[it.kind]; });
    var chips = [{ k: "all", t: "All" }, { k: "open", t: "Opens" }, { k: "action", t: "Quick actions" }, { k: "note", t: "Notes" }];
    var html = '<div class="chips" role="tablist" aria-label="Filter">' + chips.map(function (c) { return '<button type="button" class="chip' + (actFilter === c.k ? " active" : "") + '" data-af="' + c.k + '" role="tab" aria-selected="' + (actFilter === c.k) + '">' + c.t + "</button>"; }).join("") + "</div>";
    html += '<p class="hint" style="padding:10px 16px 0">What you did in this app, on this device only. Agents don\'t report activity here.</p>';
    var items = log.filter(function (it) { return actFilter === "all" || it.kind === actFilter; });
    if (!items.length) html += '<div class="empty"><span class="big" aria-hidden="true">\uD83D\uDDD2\uFE0F</span>Nothing yet. Opening an agent, running a quick action or editing notes shows up here.</div>';
    else {
      html += groupByDay(items, function (it) {
        var a = it.id && agentById(it.id);
        return '<div class="act"' + (a ? ' data-open-sheet="' + esc(it.id) + '" role="button" tabindex="0"' : "") + '>' + (a ? avatar(a, "") : '<span class="act-ico" aria-hidden="true">' + LOCAL_ICO[it.kind] + "</span>") +
          '<div class="act-main"><div class="act-top"><b>' + esc(it.text) + "</b><time>" + fmtClock(it.t) + "</time></div>" + (it.result ? '<div class="act-txt">' + esc(it.result) + "</div>" : "") +
          '<div class="act-kind k-local"><span aria-hidden="true">' + LOCAL_ICO[it.kind] + "</span>" + { open: "Opened", note: "Notes", action: "Quick action" }[it.kind] + "</div></div></div>";
      });
      html += '<div style="text-align:center;padding:16px"><button type="button" class="btn sm ghost" data-clearlog>Clear activity</button></div>';
    }
    v.innerHTML = html;
  }
  $("view-activity").addEventListener("click", function (e) {
    var c = e.target.closest("[data-af]"); if (c) { actFilter = c.getAttribute("data-af"); renderActivity(); return; }
    if (e.target.closest("[data-clearlog]")) { var old = sget("log", []); sset("log", []); renderActivity(); toast("Activity cleared", function () { sset("log", old); renderActivity(); }); return; }
    var s = e.target.closest("[data-open-sheet]"); if (s) openAgentSheet(s.getAttribute("data-open-sheet"));
  });

  /* ---------------- You tab ---------------- */
  function renderYou() {
    var t = themePref(), lockOn = !!deviceLock(), s = exportSetup(false), html = "";
    var nActions = DB.agents.reduce(function (n, a) { return n + (a.quickActions || []).length; }, 0);
    html += '<div class="set-h">Appearance</div><div class="set-group"><div class="set-row"><div class="lbl"><b>Theme</b><small>Follows your phone unless you pick one.</small></div></div>' +
      '<div class="set-row" style="border-top:0;padding-top:0"><div class="seg" role="group" aria-label="Theme" style="width:100%">' +
      ["system", "light", "dark"].map(function (k) { return '<button type="button" style="flex:1" data-theme-set="' + k + '" aria-pressed="' + (t === k) + '">' + k.charAt(0).toUpperCase() + k.slice(1) + "</button>"; }).join("") + "</div></div></div>";
    html += '<div class="set-h">Your setup</div><div class="set-group">' +
      '<div class="set-row"><div class="lbl"><b>' + s.agents.length + " agents · " + s.groups.length + " groups</b><small>" + nActions + " quick actions · " + DB.pins.length + " pinned</small></div></div>" +
      '<div class="set-row"><div class="lbl"><b>Export setup</b><small>Save everything as a JSON file. Auth headers are left out unless you choose to include them.</small></div><button type="button" class="btn sm" data-y="export">Export</button></div>' +
      '<div class="set-row"><div class="lbl"><b>Import setup</b><small>Load a setup file. You\'ll see a preview, then choose Merge or Replace.</small></div><button type="button" class="btn sm" data-y="import">Import</button></div>' +
      '<div class="set-row"><div class="lbl"><b>Demo agents</b><small>' + (hasDemo() ? "Fictional samples are loaded." : "Add a few fictional samples to try things out.") + "</small></div>" +
      (hasDemo() ? '<button type="button" class="btn sm" data-y="rmdemo">Remove</button>' : '<button type="button" class="btn sm" data-y="demo">Add</button>') + "</div></div>";
    html += '<div class="set-h">Passcode and lock</div><div class="set-group">' +
      '<div class="set-row"><div class="lbl"><b>Device passcode</b><small>' + (lockOn ? "On. Asks for it after 30 min idle or 5 min in the background." : "Off. Turn it on if you store webhooks or auth headers.") + "</small></div>" +
      (lockOn ? '<button type="button" class="btn sm" data-y="pcchange">Change</button>' : '<button type="button" class="btn sm primary" data-y="pcset">Set</button>') + "</div>" +
      (lockOn ? '<div class="set-row"><div class="lbl"><b>Turn passcode off</b></div><button type="button" class="btn sm" data-y="pcoff">Turn off</button></div>' : "") +
      (gateNeeded() ? '<div class="set-row"><div class="lbl"><b>Lock now</b><small>Locking also clears the saved app files.</small></div><button type="button" class="btn sm" data-y="lock">\uD83D\uDD12 Lock</button></div>' : "") +
      (CFG.previewGateHash && !lockOn ? '<div class="set-row"><div class="lbl"><small>This test link also has a preview passcode. Published builds don\'t.</small></div></div>' : "") + "</div>";
    html += '<div class="set-h">App</div><div class="set-group">' +
      '<div class="set-row"><div class="lbl"><b>Install on this phone</b><small>' + (isStandalone() ? "Installed. You're using the app." : deferredInstall ? "Adds an IntelliGro.AI icon to your home screen." : "In Chrome: tap \u22EE, then Add to Home screen or Install app.") + "</small></div>" +
      (isStandalone() ? "" : '<button type="button" class="btn sm" data-y="install">' + (deferredInstall ? "Install" : "How to") + "</button>") + "</div>" +
      '<div class="set-row"><div class="lbl"><b>Live status and alerts</b><small>Not available yet. Agents can\'t report status into this app.</small></div><span class="tag">Not yet</span></div></div>';
    html += '<div class="set-h">Privacy</div><div class="set-group">' +
      '<div class="set-row"><div class="lbl"><b>Everything stays on this device</b><small>No account, no analytics. Nothing is sent anywhere except the webhooks you set up and run yourself.</small></div></div>' +
      '<div class="set-row"><div class="lbl"><b>Privacy policy</b></div><a class="btn sm" href="privacy.html" target="_blank" rel="noopener">Read</a></div>' +
      '<div class="set-row"><div class="lbl"><b>Erase everything</b><small>Deletes all agents, groups, notes, quick actions, activity and the passcode on this device.</small></div><button type="button" class="btn sm danger-txt" data-y="erase">Erase</button></div></div>';
    if (SANDBOX) html += '<div class="set-h">Sandbox</div><div class="set-group"><div class="set-row"><div class="lbl"><b>Reset sandbox</b><small>Wipes sandbox data on this device and reloads the demo agents.</small></div><button type="button" class="btn sm" data-y="reset">Reset</button></div></div>';
    html += '<p class="hint" style="text-align:center;padding:18px 16px 4px">IntelliGro.AI · v' + esc(CFG.version || "") + (SANDBOX ? " · Sandbox" : "") + "<br>Setup file format: version " + SCHEMA_VERSION + "</p>";
    $("view-you").innerHTML = html;
  }
  $("view-you").addEventListener("click", function (e) {
    var b = e.target.closest("[data-theme-set]"); if (b) { setTheme(b.getAttribute("data-theme-set")); return; }
    var y = e.target.closest("[data-y]"); if (!y) return;
    var k = y.getAttribute("data-y");
    if (k === "export") openExport(); else if (k === "import") openImport(); else if (k === "demo") loadDemo(); else if (k === "rmdemo") removeDemo();
    else if (k === "pcset") openPasscode("set"); else if (k === "pcchange") openPasscode("change"); else if (k === "pcoff") openPasscode("off");
    else if (k === "lock") lock(); else if (k === "install") doInstall();
    else if (k === "erase") confirmScreen({ title: "Erase everything on this device?", fields: [["What happens", "Deletes all agents, groups, notes, quick actions, activity and the device passcode stored by this app on this device. Export first if you want a backup."]], approve: "Erase", danger: true, onApprove: eraseAll });
    else if (k === "reset") confirmScreen({ sim: true, title: "Reset sandbox?", fields: [["What happens", "Wipes sandbox data on this device and reloads the demo agents."]], approve: "Reset", danger: true, onApprove: eraseAll });
  });
  function eraseAll() {
    try { Object.keys(localStorage).filter(function (k) { return k.indexOf(P) === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    if (window.caches && caches.keys) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); });
    if (CFG.previewGateHash) gset("unlockUntil", Date.now() + (CFG.rememberDays || 30) * DAY);
    location.reload();
  }

  /* ---------------- device passcode (SHA-256 + salt, local only) ---------------- */
  function openPasscode(mode) {
    var cur = mode !== "set";
    var html = '<div class="sheet-head"><div class="t"><h2>' + { set: "Set a device passcode", change: "Change passcode", off: "Turn passcode off" }[mode] + "</h2><p>4 to 8 digits. Stored only as a salted hash on this device.</p></div></div>" +
      (cur ? '<label class="f"><span>Current passcode</span><input id="pcCur" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off"></label>' : "") +
      (mode !== "off" ? '<label class="f"><span>New passcode</span><input id="pcNew" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="new-password"></label><label class="f"><span>Repeat new passcode</span><input id="pcNew2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="new-password"></label>' : "") +
      '<p class="ferr" id="pcErr" hidden></p><p class="hint">If you forget it, the only way back in is to clear this site\'s data in Chrome, which erases your setup. Export a backup first.</p>' +
      '<div class="sheet-foot"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" id="pcSave">' + (mode === "off" ? "Turn off" : "Save") + "</button></div>";
    var w = openSheet(html, { label: "Passcode" }), err = w.querySelector("#pcErr");
    setTimeout(function () { var f = w.querySelector("input"); if (f) f.focus(); }, 80);
    function fail(m) { err.textContent = m; err.hidden = false; }
    w.addEventListener("click", function (e) {
      if (!e.target.closest("#pcSave")) return;
      var curV = cur ? w.querySelector("#pcCur").value : "", nv = mode !== "off" ? w.querySelector("#pcNew").value : "", nv2 = mode !== "off" ? w.querySelector("#pcNew2").value : "";
      if (mode !== "off") { if (!/^\d{4,8}$/.test(nv)) return fail("Use 4 to 8 digits."); if (nv !== nv2) return fail("The two new passcodes don't match."); }
      (cur ? checkPin(curV) : Promise.resolve(true)).then(function (ok) {
        if (!ok) return fail("Current passcode is wrong.");
        if (mode === "off") { sset("lock", null); closeTopLayer(); renderYou(); toast("Passcode off"); return; }
        var salt = new Uint8Array(16); crypto.getRandomValues(salt);
        var sh = Array.prototype.map.call(salt, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
        sha256(sh + ":" + nv).then(function (h) {
          sset("lock", { salt: sh, hash: h, len: nv.length, v: 1 });
          gset("unlockUntil", Date.now() + (CFG.rememberDays || 30) * DAY); gset("lastActive", Date.now());
          closeTopLayer(); renderYou(); toast(mode === "set" ? "Passcode on" : "Passcode changed");
        });
      });
    });
  }

  /* ---------------- export ---------------- */
  function openExport() {
    var hasAuth = DB.agents.some(function (a) { return (a.quickActions || []).some(function (q) { return q.auth; }); });
    var w = openSheet('<div class="sheet-head"><div class="t"><h2>Export setup</h2><p>Groups, agents, notes, pins and quick actions as one JSON file.</p></div></div>' +
      (hasAuth ? '<label class="toggle"><input type="checkbox" id="exAuth"><span>Include auth headers (secrets)</span></label><p class="warn">Leave this off unless you\'re moving to your own new phone. Anyone with the file can use those secrets.</p>' : '<p class="hint">No auth headers to include.</p>') +
      '<div class="sheet-foot"><button type="button" class="btn" id="exCopy">Copy JSON</button><button type="button" class="btn primary" id="exDl">Download file</button></div>', { label: "Export setup" });
    function json() { var inc = hasAuth && w.querySelector("#exAuth").checked; return JSON.stringify(exportSetup(inc), null, 2); }
    w.addEventListener("click", function (e) {
      if (e.target.closest("#exDl")) {
        var blob = new Blob([json()], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = "intelligro-setup-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000); closeTopLayer(); toast("Setup file saved to Downloads");
      } else if (e.target.closest("#exCopy")) {
        var t = json();
        (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("Copied"); }, function () { toast("Couldn't copy. Use Download instead."); });
      }
    });
  }

  /* ---------------- import (validate, preview, then Merge or Replace) ---------------- */
  function openImport() {
    var w = openSheet('<div class="sheet-head"><div class="t"><h2>Import setup</h2><p>Choose a setup file (.json) or paste its contents.</p></div></div>' +
      '<label class="btn block">Choose file<input type="file" id="imFile" accept="application/json,.json" hidden></label>' +
      '<div class="field-lbl">Or paste JSON</div><textarea class="notes" id="imText" spellcheck="false" placeholder=\'{"schema":"intelligro.setup","version":1,...}\'></textarea>' +
      '<p class="ferr" id="imErr" hidden></p><div class="sheet-foot"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" id="imCheck">Check</button></div>', { label: "Import setup" });
    var err = w.querySelector("#imErr");
    function check(text) {
      var parsed, r;
      try { if (text.length > 5e6) throw new Error("That file is too big."); parsed = JSON.parse(text); } catch (e) { err.textContent = e.message.indexOf("too big") > -1 ? e.message : "That isn't valid JSON."; err.hidden = false; return; }
      try { r = sanitizeSetup(parsed, false); } catch (e) { err.textContent = e.message; err.hidden = false; return; }
      closeTopLayer(); setTimeout(function () { importPreview(r); }, 30);
    }
    w.addEventListener("change", function (e) {
      if (e.target.id !== "imFile" || !e.target.files[0]) return;
      var f = e.target.files[0]; if (f.size > 5e6) { err.textContent = "That file is too big."; err.hidden = false; return; }
      var fr = new FileReader(); fr.onload = function () { check(String(fr.result)); }; fr.readAsText(f);
    });
    w.addEventListener("click", function (e) { if (e.target.closest("#imCheck")) check(w.querySelector("#imText").value.trim()); });
  }
  function importPreview(r) {
    var st = r.stats;
    var names = r.agents.slice(0, 12).map(function (a) { return a.name; }).join(", ") + (r.agents.length > 12 ? ", +" + (r.agents.length - 12) + " more" : "");
    var el = document.createElement("div"); el.className = "confirm"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Import preview");
    el.innerHTML = '<div class="inner"><div class="scroll"><h2>Import preview</h2><p class="hint">Nothing changes until you choose Merge or Replace.</p>' +
      '<div class="field"><small>In this file</small><div>' + st.agents + " agents · " + st.groups + " groups · " + st.notes + " with notes · " + st.pins + " pinned · " + st.actions + " quick actions" + (st.auth ? " (" + st.auth + " with auth headers)" : "") + "</div></div>" +
      (r.groups.length ? '<div class="field"><small>Groups</small><div>' + esc(r.groups.map(function (g) { return g.name; }).join(", ")) + "</div></div>" : "") +
      (names ? '<div class="field"><small>Agents</small><div>' + esc(names) + "</div></div>" : "") +
      (r.warnings.length ? '<div class="field warnf"><small>Fixed or skipped</small><div>' + esc(r.warnings.slice(0, 20).join("\n")) + (r.warnings.length > 20 ? "\n…and " + (r.warnings.length - 20) + " more" : "") + "</div></div>" : "") +
      '<div class="field"><small>Merge</small><div>Adds new agents and groups; ones with the same id are updated from the file. Your other agents stay.</div></div>' +
      '<div class="field"><small>Replace</small><div>Deletes your current agents, groups, notes and pins on this device, then loads the file.</div></div>' +
      '</div><div class="btns three"><button type="button" class="btn" data-i="cancel">Cancel</button><button type="button" class="btn primary" data-i="merge">Merge</button><button type="button" class="btn danger" data-i="replace">Replace</button></div></div>';
    $("layerRoot").appendChild(el); pushLayer(el);
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-i]"); if (!b) return;
      var k = b.getAttribute("data-i"); closeTopLayer();
      if (k === "cancel") return;
      var before = JSON.parse(JSON.stringify(DB));
      if (k === "replace") DB = { groups: r.groups, agents: r.agents, pins: r.pins };
      else {
        r.groups.forEach(function (g) { var ex = groupById(g.id) || DB.groups.filter(function (x) { return x.name.toLowerCase() === g.name.toLowerCase(); })[0]; if (ex) { if (ex.id !== g.id) r.agents.forEach(function (a) { if (a.groupId === g.id) a.groupId = ex.id; }); ex.color = g.color; } else { g.order = DB.groups.length; DB.groups.push(g); } });
        r.agents.forEach(function (a) { var ex = agentById(a.id); if (ex) DB.agents[DB.agents.indexOf(ex)] = a; else DB.agents.push(a); });
        r.pins.forEach(function (p) { if (DB.pins.indexOf(p) < 0) DB.pins.push(p); });
      }
      save(); gtab = "all"; switchTab("agents");
      toast(k === "replace" ? "Setup replaced" : "Setup merged", function () { DB = before; save(); renderAll(); });
    });
  }

  /* ---------------- full-screen confirm ---------------- */
  function confirmScreen(o) {
    var el = document.createElement("div"); el.className = "confirm"; el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", o.title);
    el.innerHTML = '<div class="inner"><div class="scroll">' + (o.sim ? '<span class="tag sim">Simulated: nothing is sent</span>' : "") + "<h2>" + esc(o.title) + "</h2>" +
      (o.sub ? '<p class="hint">' + esc(o.sub) + "</p>" : "") +
      o.fields.map(function (f) { return '<div class="field"><small>' + esc(f[0]) + "</small><div>" + esc(f[1]) + "</div></div>"; }).join("") +
      '</div><div class="btns"><button type="button" class="btn" data-c="no">' + esc(o.cancel || "Cancel") + '</button><button type="button" class="btn ' + (o.danger ? "danger" : "primary") + '" data-c="yes">' + esc(o.approve || "OK") + "</button></div></div>";
    $("layerRoot").appendChild(el);
    var done = false;
    pushLayer(el, function () { done = true; });
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-c]"); if (!b || done) return;
      var yes = b.getAttribute("data-c") === "yes";
      closeTopLayer();
      if (yes && o.onApprove) o.onApprove();
    });
    setTimeout(function () { var c = el.querySelector('[data-c="no"]'); if (c) c.focus(); }, 30);
  }

  /* ---------------- start ---------------- */
  if (unlockedValid()) { gset("lastActive", Date.now()); openApp(); } else { gset("unlockUntil", null); showGate(); }
})();
