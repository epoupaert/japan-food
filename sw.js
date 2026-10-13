// Service worker : rend la checklist disponible hors ligne.
// ⚠️ Après chaque modification du site, changez VERSION pour que les téléphones récupèrent la nouvelle version.
const VERSION = "v1";
const APP_CACHE = `japan-food-app-${VERSION}`;
const FONT_CACHE = "japan-food-fonts"; // polices Google, conservées entre les versions

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

// Installation : mise en cache des fichiers de l'appli
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting())
  );
});

// Activation : suppression des anciennes versions du cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("japan-food-app-") && key !== APP_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Polices Google : cache d'abord, réseau en secours (et mise en cache au passage)
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(request).then((cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok || response.type === "opaque") cache.put(request, response.clone());
            return response;
          }).catch(() => new Response("", { status: 503 }))
        )
      )
    );
    return;
  }

  // Fichiers du site : cache d'abord, réseau en secours
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(request).catch(() =>
          request.mode === "navigate" ? caches.match("./index.html") : Response.error()
        );
      })
    );
  }
});
