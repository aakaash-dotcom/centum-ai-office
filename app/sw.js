/* CENTUM AI Office service worker — v3 (network-first)
   Why v3 exists: v1/v2 served the app SHELL cache-first, so a phone kept an old app.js
   forever while office.json updated — new data on old UI. This version is network-first
   for everything, purges old caches on activate, and reloads open tabs once so the new
   build appears without the owner doing anything.
   Offline is still supported: the last good copy of each asset stays in the cache. */
var CACHE = "centum-office-v3";
var SHELL = ["./", "index.html", "styles.css", "office.js", "app.js", "manifest.json",
             "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      var old = keys.filter(function (k) { return k !== CACHE; });
      return Promise.all(old.map(function (k) { return caches.delete(k); }))
        .then(function () { return old.length; });
    }).then(function (purged) {
      return self.clients.claim().then(function () {
        // If we just replaced an older cache, the open tab is showing the old app.
        // Reload it ONCE so the new build appears. Guarded so it cannot loop.
        if (!purged) return;
        return self.clients.matchAll({ type: "window" }).then(function (cs) {
          cs.forEach(function (c) {
            var u = new URL(c.url);
            if (u.searchParams.get("swreload")) return;            // already reloaded once
            u.searchParams.set("swreload", String(Date.now()));    // unique: no cache can serve it
            c.navigate(u.toString()).catch(function () {});
          });
        });
      });
    })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;

  // network-first for everything; fall back to the last good copy when offline
  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.ok && url.protocol.indexOf("http") === 0) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          if (req.mode === "navigate") return caches.match("index.html");
          return new Response("", { status: 504, statusText: "offline" });
        });
      })
  );
});

/* let the page ask the worker to step aside (used by the ?fresh=1 escape hatch) */
self.addEventListener("message", function (e) {
  if (e.data === "skip-waiting") self.skipWaiting();
});
