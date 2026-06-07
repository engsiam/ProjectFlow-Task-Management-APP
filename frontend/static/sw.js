// ProjectFlow service worker — cache-first for static assets,
// network-first for navigations, never cache the API.
const CACHE_VERSION = "v2";
const STATIC_CACHE = `projectflow-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `projectflow-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/tasks",
  "/projects",
  "/analytics",
  "/settings",
  "/notifications",
  "/members",
  "/login",
  "/signup",
  "/offline",
  "/favicon.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Best-effort precache — ignore individual failures
      })
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      )
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept API calls — they need live data and have their own
  // caching headers (Cache-Control: no-store on auth, etc.).
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Skip non-GET requests.
  if (req.method !== "GET") return;

  // Skip cross-origin requests (CDNs, OAuth providers, etc.).
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML navigations — fall back to cache when offline.
  if (
    req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) =>
            cached ||
            caches.match("/dashboard") ||
            caches.match("/") ||
            caches.match("/offline")
          )
        ),
    );
    return;
  }

  // Network-first for CSS — always fetch latest styles, fall back to cache offline.
  if (url.pathname.endsWith(".css")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // Cache-first for everything else (JS, fonts, images).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && (res.type === "basic" || res.type === "default")) {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
