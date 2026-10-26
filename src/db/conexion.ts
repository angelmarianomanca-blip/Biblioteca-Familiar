import Database from "better-sqlite3";
import { createClient as crearClienteLibsql } from "@libsql/client";
import { drizzle as crearInstanciaDrizzleLibsql, type LibSQLDatabase } from "drizzle-orm/libsql";
import { drizzle as crearInstanciaDrizzleBetterSqlite, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as esquema from "./esquema.js";

/** Tipo de instancia Drizzle para la aplicación compatible con las consultas del proyecto. */
export type BaseDatosBiblioteca = LibSQLDatabase<typeof esquema>;

/**
 * Cliente de base de datos unificado con soporte para `execute` y `close`.
 * Permite que scripts de migración, tests y siembra funcionen idénticamente
 * con Turso (@libsql/client) y SQLite local (better-sqlite3).
 */
export interface ClienteBaseDeDatos {
  execute(
    instruccion: string | { sql: string; args?: any[] },
  ): Promise<{ rows: any[]; rowsAffected?: number }>;
  close(): Promise<void> | void;
}

/**
 * Describe las opciones para inicializar la conexión.
 * Las opciones son opcionales porque se toman del entorno si no se especifican.
 */
export type ConfiguracionBaseDeDatos = {
  /** Entorno opcional ("desarrollo" o "produccion") para retrocompatibilidad. */
  entorno?: "desarrollo" | "produccion";
  /** Ruta o URI para la base SQLite local (ej. "./desarrollo.sqlite" o ":memory:"). */
  urlLocal?: string;
  /** Dirección remota de Turso (TURSO_DATABASE_URL). */
  urlTurso?: string;
  /** Token de autenticación de Turso (TURSO_AUTH_TOKEN). */
  tokenTurso?: string;
};

/**
 * Normaliza rutas para better-sqlite3:
 * Remueve el prefijo "file:" y convierte "file::memory:" en ":memory:".
 */
function normalizarRutaSqlite(ruta: string): string {
  if (ruta === "file::memory:" || ruta === ":memory:") {
    return ":memory:";
  }
  if (ruta.startsWith("file:")) {
    return ruta.slice(5);
  }
  return ruta;
}

/**
 * Crea la conexión a la base de datos de forma condicional:
 * - Si existen TURSO_DATABASE_URL y TURSO_AUTH_TOKEN: conecta a Turso mediante @libsql/client.
 * - Si no existen: conecta a SQLite local usando better-sqlite3.
 */
export async function crearBaseDeDatos(
  configuracion: ConfiguracionBaseDeDatos = {},
): Promise<{
  baseDatos: BaseDatosBiblioteca;
  cliente: ClienteBaseDeDatos;
  modo: "turso" | "sqlite";
}> {
  // Comprueba credenciales de Turso (con soporte retrocompatible para URL_BASE_TURSO/TOKEN_TURSO)
  const urlTurso =
    configuracion.urlTurso ??
    process.env.TURSO_DATABASE_URL ??
    process.env.URL_BASE_TURSO;

  const tokenTurso =
    configuracion.tokenTurso ??
    process.env.TURSO_AUTH_TOKEN ??
    process.env.TOKEN_TURSO;

  const tieneCredencialesTurso = Boolean(urlTurso && tokenTurso);
  // Si urlLocal es pasado explícitamente (ej: en conexion.test.ts con :memory:),
  // se fuerza el modo SQLite local a menos que se hayan pasado urlTurso y tokenTurso explícitos.
  const forzarLocal = Boolean(configuracion.urlLocal && !configuracion.urlTurso);
  const usarTurso = tieneCredencialesTurso && !forzarLocal;

  if (usarTurso) {
    // Modo Turso con @libsql/client
    const clienteLibsql = crearClienteLibsql({
      url: urlTurso!,
      authToken: tokenTurso!,
    });

    await clienteLibsql.execute("PRAGMA foreign_keys = ON");
    const baseDatos = crearInstanciaDrizzleLibsql(clienteLibsql, { schema: esquema });

    return {
      baseDatos: baseDatos as BaseDatosBiblioteca,
      cliente: clienteLibsql as unknown as ClienteBaseDeDatos,
      modo: "turso",
    };
  }

  // Modo SQLite local con better-sqlite3
  const rutaCruda =
    configuracion.urlLocal ??
    process.env.SQLITE_DATABASE_PATH ??
    "./desarrollo.sqlite";
  const rutaNormalizada = normalizarRutaSqlite(rutaCruda);

  const dbSqlite = new Database(rutaNormalizada);
  dbSqlite.pragma("foreign_keys = ON");

  const clienteAdaptado: ClienteBaseDeDatos = {
    async execute(instruccion: string | { sql: string; args?: any[] }) {
      const sql = typeof instruccion === "string" ? instruccion : instruccion.sql;
      const args = typeof instruccion === "string" ? [] : (instruccion.args ?? []);
      const sqlLimpio = sql.trim();

      // Múltiples sentencias DDL/DML sin argumentos
      if (sqlLimpio.includes(";") && !args.length && !/^(select|pragma|with)\b/i.test(sqlLimpio)) {
        dbSqlite.exec(sqlLimpio);
        return { rows: [], rowsAffected: 0 };
      }

      const stmt = dbSqlite.prepare(sql);
      if (stmt.reader) {
        const rows = Array.isArray(args) ? stmt.all(...args) : stmt.all(args);
        return { rows, rowsAffected: 0 };
      } else {
        const info = Array.isArray(args) ? stmt.run(...args) : stmt.run(args);
        return { rows: [], rowsAffected: info.changes };
      }
    },
    async close() {
      dbSqlite.close();
    },
  };

  const baseDatos = crearInstanciaDrizzleBetterSqlite(dbSqlite, { schema: esquema });

  return {
    baseDatos: baseDatos as unknown as BaseDatosBiblioteca,
    cliente: clienteAdaptado,
    modo: "sqlite",
  };
}
