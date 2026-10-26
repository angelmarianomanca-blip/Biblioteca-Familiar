import "dotenv/config";
import { aplicacion } from "./api/aplicacion.js";

// El puerto se configura dinámicamente según la variable de entorno del hosting (Render/Railway).
const puerto = process.env.PORT || 3000;

// Inicia la API; los servicios comparten la conexión configurada para SQLite o Turso.
aplicacion.listen(puerto, () => {
  console.log(
    `Biblioteca disponible en http://localhost:${puerto} (API REST en /api)`,
  );
});
