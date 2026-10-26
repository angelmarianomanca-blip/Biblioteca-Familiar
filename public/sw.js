const NOMBRE_CACHE = "biblioteca-pwa-v1";

const RECURSOS_ESTATICOS = [
  "/",
  "/biblioteca.html",
  "/manifest.json",
  "/icono.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js",
  "https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
  "https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.10/babel.min.js"
];

// Instalación: precachea recursos esenciales de la interfaz y shell de la aplicación
self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(NOMBRE_CACHE).then((cache) => {
      return cache.addAll(RECURSOS_ESTATICOS).catch((error) => {
        console.warn("Advertencia al precachear recursos estáticos:", error);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación: limpia cachés antiguas y toma el control inmediato de los clientes
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) => {
      return Promise.all(
        claves
          .filter((clave) => clave !== NOMBRE_CACHE)
          .map((clave) => caches.delete(clave))
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptación de peticiones: estrategias optimizadas para offline y rendimiento
self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  const url = new URL(request.url);

  // No interceptar peticiones que no sean GET
  if (request.method !== "GET") {
    return;
  }

  // Peticiones de datos (API REST o MCP): Network-First con fallback
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/mcp")) {
    evento.respondWith(
      fetch(request)
        .then((respuestaRed) => {
          if (respuestaRed && respuestaRed.status === 200) {
            const copia = respuestaRed.clone();
            caches.open(NOMBRE_CACHE).then((cache) => cache.put(request, copia));
          }
          return respuestaRed;
        })
        .catch(() => {
          return caches.match(request).then((respuestaCache) => {
            if (respuestaCache) {
              return respuestaCache;
            }
            return new Response(
              JSON.stringify({
                error: "Sin conexión a internet. Los datos solicitados no están en caché.",
                offline: true
              }),
              {
                status: 503,
                headers: { "Content-Type": "application/json; charset=utf-8" }
              }
            );
          });
        })
    );
    return;
  }

  // Navegación (HTML de la app): Network-First con fallback a biblioteca.html en caché
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    evento.respondWith(
      fetch(request)
        .then((respuestaRed) => {
          const copia = respuestaRed.clone();
          caches.open(NOMBRE_CACHE).then((cache) => cache.put(request, copia));
          return respuestaRed;
        })
        .catch(() => {
          return caches.match(request).then((respuestaCache) => {
            return respuestaCache || caches.match("/") || caches.match("/biblioteca.html");
          });
        })
    );
    return;
  }

  // Recursos estáticos (CDN, imágenes, CSS, scripts): Cache-First con actualización en segundo plano
  evento.respondWith(
    caches.match(request).then((respuestaCache) => {
      const peticionRed = fetch(request)
        .then((respuestaRed) => {
          if (respuestaRed && respuestaRed.status === 200) {
            const copia = respuestaRed.clone();
            caches.open(NOMBRE_CACHE).then((cache) => cache.put(request, copia));
          }
          return respuestaRed;
        })
        .catch(() => null);

      return respuestaCache || peticionRed;
    })
  );
});
