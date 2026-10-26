import * as comprobaciones from "node:assert/strict";
import { test as prueba } from "node:test";
import { sql as consultaSQL } from "drizzle-orm";
import { crearBaseDeDatos } from "./conexion.js";

/**
 * Comprueba que Drizzle pueda conectarse a SQLite local usando better-sqlite3
 * cuando no hay variables de Turso presentes.
 */
prueba("conecta Drizzle con SQLite local en memoria usando better-sqlite3", async function probarConexionSQLiteLocal() {
  const { baseDatos, cliente, modo } = await crearBaseDeDatos({
    urlLocal: ":memory:",
  });

  try {
    comprobaciones.equal(modo, "sqlite");
    const resultado = await baseDatos.get(consultaSQL`select 1 as valor`);
    comprobaciones.deepEqual(resultado, { valor: 1 });
  } finally {
    await cliente.close();
  }
});

/**
 * Comprueba la conexión condicional a Turso (@libsql/client) cuando
 * existen TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.
 */
prueba("conecta condicionalmente a Turso (@libsql/client) cuando existen credenciales", async function probarConexionTursoCondicional() {
  const envUrlOriginal = process.env.TURSO_DATABASE_URL;
  const envTokenOriginal = process.env.TURSO_AUTH_TOKEN;

  try {
    process.env.TURSO_DATABASE_URL = ":memory:";
    process.env.TURSO_AUTH_TOKEN = "token-de-prueba";

    const { baseDatos, cliente, modo } = await crearBaseDeDatos();

    try {
      comprobaciones.equal(modo, "turso");
      const resultado = await baseDatos.get(consultaSQL`select 42 as valor`);
      comprobaciones.deepEqual(resultado, { valor: 42 });
    } finally {
      await cliente.close();
    }
  } finally {
    process.env.TURSO_DATABASE_URL = envUrlOriginal;
    process.env.TURSO_AUTH_TOKEN = envTokenOriginal;
  }
});

/**
 * Comprueba que si solo existe una de las dos variables de Turso,
 * se utiliza el fallback a SQLite local (better-sqlite3).
 */
prueba("usa SQLite local (better-sqlite3) si falta el token de autenticación de Turso", async function probarFallbackSinToken() {
  const envUrlOriginal = process.env.TURSO_DATABASE_URL;
  const envTokenOriginal = process.env.TURSO_AUTH_TOKEN;
  const envLocalOriginal = process.env.SQLITE_DATABASE_PATH;

  try {
    process.env.TURSO_DATABASE_URL = "libsql://base-incompleta.turso.io";
    delete process.env.TURSO_AUTH_TOKEN;
    delete process.env.TOKEN_TURSO;
    process.env.SQLITE_DATABASE_PATH = ":memory:";

    const { cliente, modo } = await crearBaseDeDatos();

    try {
      comprobaciones.equal(modo, "sqlite");
    } finally {
      await cliente.close();
    }
  } finally {
    process.env.TURSO_DATABASE_URL = envUrlOriginal;
    process.env.TURSO_AUTH_TOKEN = envTokenOriginal;
    process.env.SQLITE_DATABASE_PATH = envLocalOriginal;
  }
});
