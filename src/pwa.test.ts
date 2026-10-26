import * as comprobaciones from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test as prueba } from "node:test";

const directorioPublico = resolve(process.cwd(), "public");

prueba("PWA: manifest.json cumple con los requerimientos de instalación", () => {
  const rutaManifest = resolve(directorioPublico, "manifest.json");
  comprobaciones.ok(existsSync(rutaManifest), "manifest.json debe existir en public/");

  const contenido = readFileSync(rutaManifest, "utf-8");
  const manifest = JSON.parse(contenido);

  comprobaciones.equal(manifest.name, "BiblioTeca", "name debe ser 'BiblioTeca'");
  comprobaciones.equal(manifest.short_name, "BiblioTeca", "short_name debe ser 'BiblioTeca'");
  comprobaciones.equal(manifest.theme_color, "#1a1a2e", "theme_color debe ser '#1a1a2e'");
  comprobaciones.equal(manifest.background_color, "#1a1a2e", "background_color debe ser '#1a1a2e'");
  comprobaciones.equal(manifest.display, "standalone", "display debe ser 'standalone'");
  comprobaciones.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "Debe tener array de iconos");

  // Verifica que los iconos referenciados existan en el sistema de archivos
  for (const icono of manifest.icons) {
    const rutaIcono = resolve(directorioPublico, icono.src.replace(/^\//, ""));
    comprobaciones.ok(existsSync(rutaIcono), `El archivo de icono ${icono.src} debe existir en public/`);
  }

  // Verifica icono SVG y PNG
  const tieneSvg = manifest.icons.some((i: { type?: string }) => i.type === "image/svg+xml");
  const tienePng192 = manifest.icons.some((i: { sizes?: string }) => i.sizes === "192x192");
  const tienePng512 = manifest.icons.some((i: { sizes?: string }) => i.sizes === "512x512");
  comprobaciones.ok(tieneSvg, "Debe incluir icono en SVG");
  comprobaciones.ok(tienePng192, "Debe incluir icono PNG 192x192");
  comprobaciones.ok(tienePng512, "Debe incluir icono PNG 512x512");
});

prueba("PWA: biblioteca.html incluye meta-tags para iOS y móvil", () => {
  const rutaHtml = resolve(directorioPublico, "biblioteca.html");
  comprobaciones.ok(existsSync(rutaHtml), "biblioteca.html debe existir");

  const html = readFileSync(rutaHtml, "utf-8");

  comprobaciones.ok(
    html.includes('meta name="apple-mobile-web-app-capable" content="yes"'),
    "Debe incluir apple-mobile-web-app-capable",
  );
  comprobaciones.ok(
    html.includes('meta name="apple-mobile-web-app-status-bar-style"'),
    "Debe incluir apple-mobile-web-app-status-bar-style",
  );
  comprobaciones.ok(
    html.includes('meta name="apple-mobile-web-app-title" content="BiblioTeca"'),
    "Debe incluir apple-mobile-web-app-title",
  );
  comprobaciones.ok(
    html.includes('rel="apple-touch-icon"'),
    "Debe incluir link apple-touch-icon",
  );
  comprobaciones.ok(
    html.includes('rel="manifest" href="/manifest.json"'),
    "Debe incluir link al manifest.json",
  );
  comprobaciones.ok(
    html.includes("viewport-fit=cover"),
    "Debe incluir viewport-fit=cover para áreas seguras de pantalla completa",
  );
});

prueba("PWA: optimizaciones de interfaz táctil, navegación para pulgar y audio", () => {
  const rutaHtml = resolve(directorioPublico, "biblioteca.html");
  const html = readFileSync(rutaHtml, "utf-8");

  // Verificación de área táctil mínima de 44px
  comprobaciones.ok(
    html.includes("min-width: 44px") && html.includes("min-height: 44px"),
    "Debe incluir estilos CSS para áreas táctiles mínimas de 44px",
  );

  // Verificación de barra de navegación inferior para pulgar
  comprobaciones.ok(
    html.includes("barra-navegacion-inferior"),
    "Debe implementar la barra inferior de navegación cómoda con el pulgar",
  );
  comprobaciones.ok(
    html.includes("barra-inferior-item"),
    "Debe tener botones de acción en la barra inferior",
  );

  // Verificación de gestos de deslizamiento (swipe)
  comprobaciones.ok(
    html.includes("onTouchStart") && html.includes("onTouchEnd"),
    "Debe incluir listeners de eventos táctiles para detección de swipe",
  );

  // Verificación de soporte de audio en segundo plano (Media Session API y audio loop)
  comprobaciones.ok(
    html.includes("mediaSession"),
    "Debe soportar Media Session API para pantalla de bloqueo",
  );
  comprobaciones.ok(
    html.includes("data:audio/wav;base64"),
    "Debe incluir pista de audio para mantener la sesión activa en segundo plano",
  );
});

prueba("PWA: registro y configuración del Service Worker", () => {
  const rutaSw = resolve(directorioPublico, "sw.js");
  comprobaciones.ok(existsSync(rutaSw), "sw.js debe existir en public/");

  const sw = readFileSync(rutaSw, "utf-8");
  comprobaciones.ok(sw.includes('addEventListener("install"'), "Service Worker debe escuchar 'install'");
  comprobaciones.ok(sw.includes('addEventListener("activate"'), "Service Worker debe escuchar 'activate'");
  comprobaciones.ok(sw.includes('addEventListener("fetch"'), "Service Worker debe interceptar 'fetch'");
  comprobaciones.ok(sw.includes("caches.open"), "Service Worker debe gestionar el almacenamiento en caché");

  // Verificación del registro en biblioteca.html
  const rutaHtml = resolve(directorioPublico, "biblioteca.html");
  const html = readFileSync(rutaHtml, "utf-8");
  comprobaciones.ok(
    html.includes('navigator.serviceWorker.register("/sw.js")'),
    "biblioteca.html debe registrar el service worker /sw.js",
  );
});
