// Lee .env para que Drizzle Kit use el mismo destino que la aplicación.
import "dotenv/config";
import { defineConfig as definirConfiguracion } from "drizzle-kit";

// Comprueba condicionalmente si existen credenciales de Turso
const urlTurso = process.env.TURSO_DATABASE_URL ?? process.env.URL_BASE_TURSO;
const tokenTurso = process.env.TURSO_AUTH_TOKEN ?? process.env.TOKEN_TURSO;
const usarTurso = Boolean(urlTurso && tokenTurso);

export default definirConfiguracion({
  schema: "./src/db/esquema.ts",
  out: "./drizzle",
  ...(usarTurso
    ? {
        dialect: "turso" as const,
        dbCredentials: {
          url: urlTurso!,
          authToken: tokenTurso!,
        },
      }
    : {
        dialect: "sqlite" as const,
        dbCredentials: {
          url: process.env.SQLITE_DATABASE_PATH ?? "file:./desarrollo.sqlite",
        },
      }),
});
