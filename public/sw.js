// Self-destroying service worker script to unregister active workers and purge stale caches across all mobile/desktop devices.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Always pass fetch requests straight to network
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
