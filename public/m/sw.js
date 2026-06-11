// Service worker do /m (escopo /m — não toca no cockpit desktop).
// Estratégia: cache-first para estáticos imutáveis, network-first para
// navegações; NUNCA intercepta /api (o SSE não pode passar por cache).

const CACHE = "m-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return; // SSE/auth passam direto

  // estáticos com hash: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/m/icons/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }),
    );
    return;
  }

  // navegações no /m: network-first com fallback ao último shell cacheado
  if (event.request.mode === "navigate" && url.pathname.startsWith("/m")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("/m", copy));
          }
          return response;
        })
        .catch(() => caches.match("/m")),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { titulo: "Cockpit", corpo: event.data ? event.data.text() : "" };
  }
  const titulo = data.titulo || "Cockpit do Candidato";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: data.corpo || "",
      icon: "/m/icons/icon-192.png",
      badge: "/m/icons/icon-192.png",
      tag: data.id || undefined,
      data: { tab: data.tab || "ticker" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const tab = (event.notification.data && event.notification.data.tab) || "ticker";
  const alvo = `/m/${tab}`;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (win.url.includes("/m")) {
          win.navigate(alvo);
          return win.focus();
        }
      }
      return self.clients.openWindow(alvo);
    }),
  );
});
