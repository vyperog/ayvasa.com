const CACHE_NAME = "ayvasa-cache-v2";

const ASSETS = [
  "/",
  "/index.html",
  "/practice.html",
  "/styles.css?v=20260113",
  "/app.js?v=20260113",
  "/manifest.webmanifest",
  "/icons/icon.svg"
];

const cacheResponse = async (request, response) => {
  if (!response || !response.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
};

const networkFirst = async (request) => {
  try {
    const response = await fetch(request);
    await cacheResponse(request, response);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
};

const staleWhileRevalidate = async (request) => {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then((response) => cacheResponse(request, response))
    .catch(() => null);

  if (cached) {
    return cached;
  }
  const response = await fetchPromise;
  return response || Response.error();
};

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});
