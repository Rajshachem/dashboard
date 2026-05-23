/* ═══════════════════════════════════════════════════════════════
   RAJSHA DASHBOARD — SERVICE WORKER (Step 1: install + offline)
   ───────────────────────────────────────────────────────────────
   This file enables:
     • PWA installation ("Add to Home Screen" / "Install App")
     • Basic offline support (the app shell loads even with no network)
   Push notifications (Firebase) will be added in Step 3 — this file
   is already structured so that addition is clean.
   ═══════════════════════════════════════════════════════════════ */

// Bump this version string whenever you update the dashboard so that
// devices fetch the fresh copy instead of an old cached one.
const CACHE_VERSION = 'rajsha-v1';
const CACHE_NAME = 'rajsha-cache-' + CACHE_VERSION;

// Files that make up the "app shell" — cached on install so the app
// opens instantly and works offline. Icons are embedded in the manifest
// as data URIs (no separate PNG files), so only HTML + manifest are listed.
const SHELL_FILES = [
  './rajsha_dashboard.html',
  './manifest.json'
];

// ── INSTALL: pre-cache the app shell ──
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // addAll fails the whole install if any file 404s, so we add them
      // individually and ignore failures (e.g. an icon not yet uploaded).
      return Promise.all(
        SHELL_FILES.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] Could not cache', url, err);
          });
        })
      );
    })
  );
  // Activate this new service worker immediately
  self.skipWaiting();
});

// ── ACTIVATE: clean up old caches ──
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Take control of any open pages right away
  self.clients.claim();
});

// ── FETCH: network-first for the dashboard, cache fallback offline ──
self.addEventListener('fetch', function (event) {
  var req = event.request;

  // Only handle GET requests from our own origin. Let everything else
  // (Apps Script calls, Firebase, external APIs) go straight to network.
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache or interfere with Apps Script / API calls
  if (url.pathname.indexOf('/macros/') !== -1) return;

  event.respondWith(
    fetch(req)
      .then(function (resp) {
        // Got a fresh copy from network — update the cache and return it
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(req, copy).catch(function () {});
        });
        return resp;
      })
      .catch(function () {
        // Offline — serve from cache if we have it
        return caches.match(req).then(function (cached) {
          if (cached) return cached;
          // Last resort: if it's a navigation, serve the cached dashboard
          if (req.mode === 'navigate') {
            return caches.match('./rajsha_dashboard.html');
          }
        });
      })
  );
});

/* ───────────────────────────────────────────────────────────────
   STEP 3 PLACEHOLDER — Firebase Cloud Messaging will add here:
     importScripts('https://www.gstatic.com/firebasejs/.../firebase-messaging-compat.js');
     firebase.initializeApp({ ...your config... });
     const messaging = firebase.messaging();
     messaging.onBackgroundMessage(function(payload) { ... show notification ... });
   Leaving this comment so you know exactly where it goes.
   ─────────────────────────────────────────────────────────────── */
