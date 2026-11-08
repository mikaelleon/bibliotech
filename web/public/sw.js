/* This site's static shell only. Book files stay in IndexedDB. */
const SHELL = "elib-shell-v2";
const READER = "elib-read-v1";
const PRECACHE = ["/", "/browse"];

function own(url) {
  return url.origin === self.location.origin;
}

function personal(pathname) {
  return /^\/(library|downloads|profile|admin)(\/|$)/.test(pathname);
}

function shellPath(pathname) {
  return pathname === "/" || pathname === "/browse" || pathname === "/search" || pathname.startsWith("/_next/static") || pathname.startsWith("/icons/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL, READER]);
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data !== "clear-shell") return;
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("elib-")).map((key) => caches.delete(key)))));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !own(url)) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname.includes(".epub")) return;
  if (personal(url.pathname)) return;

  const bucket = url.pathname.startsWith("/read/") ? READER : SHELL;
  const store = bucket === READER || shellPath(url.pathname);
  if (!store && bucket !== READER) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === "basic" && store) {
          const copy = response.clone();
          void caches.open(bucket).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || (event.request.mode === "navigate" ? caches.match("/browse") : undefined))),
  );
});
