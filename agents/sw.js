/* Service worker: caches ONLY the app shell plus an offline page. Never caches anything else. */
var VERSION = "ig-shell-v3";
var SHELL = ["./", "index.html", "styles.css", "config.js", "boot.js", "app.js", "offline.html", "privacy.html", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/favicon-32.png"];
var EXTRA = ["/ihi-sandbox/shared/sandbox.css", "/ihi-sandbox/shared/sandbox.js"];
var SHELL_SET = SHELL.concat(EXTRA).map(function (p) { return new URL(p, self.registration.scope).href; });

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL.concat(EXTRA)).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function offlineResponse() {
  return caches.match(new URL("offline.html", self.registration.scope).href).then(function (r) {
    return r || new Response("<!doctype html><meta name=viewport content='width=device-width'><meta name=robots content=noindex><title>Offline</title><body style='font-family:system-ui;padding:24px;background:#0b0f17;color:#e6edf6'><h1>You're offline</h1><p>Reconnect and try again.</p><a href='./' style='color:#34d399'>Try again</a>", { headers: { "Content-Type": "text/html" } });
  });
}
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    // network first; fall back to the cached shell, then the offline page
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok && SHELL_SET.indexOf(new URL("index.html", self.registration.scope).href) > -1 && (url.pathname.endsWith("/") || url.pathname.endsWith("index.html"))) {
        var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(new URL("index.html", self.registration.scope).href, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(new URL("index.html", self.registration.scope).href).then(function (r) { return r || offlineResponse(); });
    }));
    return;
  }
  var key = url.origin + url.pathname;
  if (SHELL_SET.indexOf(key) < 0) return; // not part of the shell: never cached
  // stale-while-revalidate for shell files (refills the cache after Lock clears it)
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(key).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res.ok) c.put(key, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
