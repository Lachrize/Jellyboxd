/* Jellyboxd service worker — lightweight offline support.
 * Strategy:
 *   - Navigations: network-first, fall back to the last cached version of the
 *     page, then to a minimal offline shell.
 *   - Static assets (same-origin GET): stale-while-revalidate.
 * The SW is only registered in production (see ServiceWorkerRegister).
 */
const VERSION = "jellyboxd-v2";
const RUNTIME = `${VERSION}-runtime`;
const OFFLINE_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hors ligne · Jellyboxd</title>
<style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
background:#0B0B0D;color:#ECE7DA;font-family:ui-sans-serif,system-ui,sans-serif;text-align:center;padding:2rem}
h1{font-family:Georgia,serif;font-weight:600}p{color:#8C887E}</style></head>
<body><div><h1>Vous êtes hors ligne</h1><p>Reconnectez-vous pour reprendre votre carnet.</p></div></body></html>`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(RUNTIME).then((cache) =>
      cache.put("/offline", new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const { pathname, searchParams } = new URL(request.url);

  // App Router refreshes use React Server Component payloads. They must always
  // hit the network, otherwise UI actions look stale until a full reload.
  const isNextDataRequest =
    searchParams.has("_rsc") ||
    request.headers.has("RSC") ||
    request.headers.has("Next-Router-State-Tree") ||
    request.headers.has("Next-Url") ||
    request.headers.get("Accept")?.includes("text/x-component");
  if (isNextDataRequest) {
    event.respondWith(fetch(request));
    return;
  }

  // Next.js chunks are content-addressed by the current build. Serving an old
  // cached chunk after a rebuild causes ChunkLoadError / missing vendor modules.
  if (pathname.startsWith("/_next/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/offline"))),
    );
    return;
  }

  // Cache only static-ish public assets. Dynamic same-origin GETs should remain
  // network-first so mutations are visible immediately after router.refresh().
  const isStaticAsset = /\.(?:png|jpg|jpeg|webp|gif|svg|ico|webmanifest|css|woff2?)$/i.test(pathname);
  if (!isStaticAsset) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
