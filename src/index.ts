import "dotenv/config";
import { aplicacion } from "./api/aplicacion.js";

// Captura errores no controlados para evitar que el proceso muera inesperadamente
process.on("unhandledRejection", (error) => {
  console.error("Promesa no manejada:", error);
});
process.on("uncaughtException", (error) => {
  console.error("Excepción no capturada:", error);
});

// El puerto se configura dinámicamente según la variable de entorno del hosting (Render/Railway).
// Escuchar en 0.0.0.0 es indispensable para que Render detecte el servicio.
const puerto = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";

// Inicia la API; los servicios comparten la conexión configurada para SQLite o Turso.
aplicacion.listen(puerto, host, () => {
  console.log(
    `Biblioteca disponible en http://${host}:${puerto} (API REST en /api)`,
  );
});

