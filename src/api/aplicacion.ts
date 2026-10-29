import express from "express";
import { resolve as resolverRuta, dirname as obtenerDirectorio } from "node:path";
import { existsSync as existeRuta } from "node:fs";
import { fileURLToPath as convertirUrlArchivo } from "node:url";
import { manejarErrorHttp } from "./controladores/http.js";
import { rutasApi } from "./rutas/index.js";
import { montarServidorMcp } from "../mcp/servidor.js";

/** Crea la aplicación Express con JSON y las rutas REST de la biblioteca. */
const aplicacion = express();

// Resuelve la ruta a la carpeta public tanto en desarrollo como en producción (dist/)
const rutaModulo = resolverRuta(
  obtenerDirectorio(convertirUrlArchivo(import.meta.url)),
  "../../public",
);
const rutaTrabajo = resolverRuta(process.cwd(), "public");
const directorioPublico = existeRuta(rutaModulo) ? rutaModulo : rutaTrabajo;

// El middleware transforma cuerpos JSON en objetos para los controladores.
// El límite elevado permite recibir el texto completo de PDFs extensos (cientos de páginas).
aplicacion.use(express.json({ limit: "50mb" }));

// El servidor MCP comparte esta aplicación Express y sus servicios de datos.
montarServidorMcp(aplicacion);

aplicacion.use("/api", rutasApi);

// Las rutas desconocidas bajo /api conservan el formato de error JSON.
aplicacion.use("/api", (_solicitud, respuesta) => {
  respuesta.status(404).json({ error: "No existe ese endpoint." });
});

// Publica la página solicitada y sus archivos estáticos desde public/.
aplicacion.use(
  express.static(directorioPublico, {
    setHeaders(res, ruta) {
      if (ruta.endsWith("sw.js")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Service-Worker-Allowed", "/");
      }
    },
  }),
);

aplicacion.get(["/", "/index.html", "/biblioteca.html"], (_solicitud, respuesta) => {
  respuesta.sendFile(resolverRuta(directorioPublico, "biblioteca.html"));
});

// Express ejecuta el middleware de error después de las rutas y el fallback.
aplicacion.use(manejarErrorHttp);

export { aplicacion };
