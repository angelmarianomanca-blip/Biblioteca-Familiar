import "dotenv/config";
import { aplicacion } from "./api/aplicacion.js";
import { conexionCompartida } from "./db/instancia.js";
import { asegurarEsquemaYDatos } from "./db/inicializar.js";

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

// Asegura que todas las tablas y datos iniciales existan en la base (Turso o SQLite local)
try {
  const conexion = await conexionCompartida;
  await asegurarEsquemaYDatos(conexion);
} catch (error) {
  console.error("No se pudo autoverificar el esquema:", error);
}

// Inicia la API; los servicios comparten la conexión configurada para SQLite o Turso.
aplicacion.listen(puerto, host, () => {
  console.log(
    `Biblioteca disponible en http://${host}:${puerto} (API REST en /api)`,
  );
});


