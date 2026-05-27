/* ═══════════════════════════════════════════════════════════════
   RAJSHA DASHBOARD — SERVICE WORKER (v2 — always-fresh dashboard)
   ───────────────────────────────────────────────────────────────
   This version fixes the "old version keeps showing after upload"
   problem. The dashboard HTML is ALWAYS fetched fresh from the network.
   The cache is used only as an offline backup, never to serve a stale
   page when the device is online.
   ═══════════════════════════════════════════════════════════════ */

// Bumping this version makes every device throw away its old cache and
// start clean the next time it opens the app. Increment it on each release.
const CACHE_VERSION = 'rajsha-v4-2026-05-27-prodfix';
const CACHE_NAME = 'rajsha-cache-' + CACHE_VERSION;

// ── INSTALL: activate immediately, do NOT pre-cache the HTML ──
// (Not pre-caching means a freshly uploaded dashboard is always fetched
//  from the network, never served from an old install cache.)
self.addEventListener('install', function () {
  self.skipWaiting();
});

// ── ACTIVATE: delete every old cache so no stale code survives ──
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ── FETCH: network-first, always. Cache only as offline fallback. ──
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never touch Apps Script / API calls
  if (url.pathname.indexOf('/macros/') !== -1) return;

  event.respondWith(
    fetch(req).then(function (resp) {
      // Save a fresh copy for offline use, then return the fresh response
      var copy = resp.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(req, copy).catch(function () {});
      });
      return resp;
    }).catch(function () {
      // Only reached when offline — serve the saved copy if we have one
      return caches.match(req).then(function (cached) {
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('./rajsha_dashboard.html');
      });
    })
  );
});

/* Step 3 (Firebase push) will be added here later. */
