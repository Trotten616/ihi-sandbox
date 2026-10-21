/* Infinity Home Improvement Command Center — service worker (v16 PWA shell).
   Caches ONLY the app shell (CSS, JS code, icons, manifest) and an offline page.
   Never caches lead / appointment / board / confirmation data: js/sample-data.js, js/data/**, any /api/ or JSON.
   Navigations: network-first, offline page when the network is down. Assets: stale-while-revalidate. */
const CACHE = "ihb-cc-sandbox-v16";
const PRECACHE = [
  "./offline.html",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-96.png",
  "./assets/infinity-logo.png"
];
const NO_CACHE = [/\/js\/sample-data\.js/, /\/js\/data\//, /\/api\//, /\.json(\?|$)/, /\/reference\//];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ihb-cc-sandbox-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "clear-caches") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("ihb-cc-sandbox-")).map((k) => caches.delete(k))))
      .then(() => caches.open(CACHE)).then((c) => c.add("./offline.html")));
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("./offline.html")));
    return;
  }
  if (NO_CACHE.some((re) => re.test(url.pathname + url.search))) return; /* data: straight to network */
  if (!/\.(css|js|png|jpg|jpeg|svg|webp|ico|webmanifest|woff2?)$/.test(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    )
  );
});
