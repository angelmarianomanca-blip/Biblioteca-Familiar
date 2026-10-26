// Reconstruye las tablas con perfil cuando una base preexistente no permite
// añadir las nuevas claves foráneas mediante ALTER TABLE.
import "dotenv/config";
import { crearBaseDeDatos } from "./conexion.js";

type DefinicionTablaPerfil = {
  nombre: "progresoUsuario" | "resultadosExamen" | "recordatorios";
  columnas: readonly string[];
  definicion: string;
  indiceOpcional?: string;
};

const tablasConPerfil: readonly DefinicionTablaPerfil[] = [
  {
    nombre: "progresoUsuario",
    columnas: [
      "id", "libroId", "usuarioId", "paginaActual", "completado",
      "ultimaLectura", "porcentaje",
    ],
    definicion: `
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "libroId" INTEGER NOT NULL REFERENCES "libros"("id") ON DELETE CASCADE,
      "usuarioId" INTEGER NOT NULL DEFAULT 1 REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "paginaActual" INTEGER NOT NULL,
      "completado" INTEGER NOT NULL,
      "ultimaLectura" TEXT,
      "porcentaje" INTEGER NOT NULL
    `,
    indiceOpcional: `CREATE UNIQUE INDEX "progresoUsuario_libroId_usuarioId_unico" ON "progresoUsuario" ("libroId", "usuarioId")`,
  },
  {
    nombre: "resultadosExamen",
    columnas: ["id", "examenId", "usuarioId", "correctas", "incorrectas", "porcentaje", "fecha"],
    definicion: `
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "examenId" INTEGER NOT NULL REFERENCES "examenes"("id") ON DELETE CASCADE,
      "usuarioId" INTEGER NOT NULL DEFAULT 1 REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "correctas" INTEGER NOT NULL,
      "incorrectas" INTEGER NOT NULL,
      "porcentaje" REAL NOT NULL,
      "fecha" TEXT NOT NULL
    `,
  },
  {
    nombre: "recordatorios",
    columnas: ["id", "libroId", "usuarioId", "mensaje", "fechaHora", "activo", "notificado"],
    definicion: `
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "libroId" INTEGER NOT NULL REFERENCES "libros"("id") ON DELETE CASCADE,
      "usuarioId" INTEGER NOT NULL DEFAULT 1 REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "mensaje" TEXT NOT NULL,
      "fechaHora" TEXT NOT NULL,
      "activo" INTEGER NOT NULL,
      "notificado" INTEGER NOT NULL
    `,
  },
];

/** Añade restricciones de usuario sin reemplazar ni descartar filas guardadas. */
async function migrarTabla(
  cliente: Awaited<ReturnType<typeof crearBaseDeDatos>>["cliente"],
  tabla: DefinicionTablaPerfil,
) {
  const [existencia] = await cliente.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [tabla.nombre],
  }).then((resultado) => resultado.rows);
  if (!existencia) return;

  const columnasActuales = await cliente.execute(`PRAGMA table_info("${tabla.nombre}")`);
  const clavesActuales = await cliente.execute(`PRAGMA foreign_key_list("${tabla.nombre}")`);
  const nombresColumnas = new Set(columnasActuales.rows.map((columna) => columna.name));
  const yaTieneClaveDeUsuario = clavesActuales.rows.some(
    (clave) => clave.from === "usuarioId" && clave.table === "usuarios",
  );
  const yaTieneColumnas = tabla.columnas.every((columna) => nombresColumnas.has(columna));
  const yaTieneIndice = tabla.nombre !== "progresoUsuario" ||
    (await cliente.execute(`PRAGMA index_list("${tabla.nombre}")`)).rows.some(
      (indice) => indice.name === "progresoUsuario_libroId_usuarioId_unico",
    );

  if (yaTieneClaveDeUsuario && yaTieneColumnas && yaTieneIndice) return;

  const tablaTemporal = `__migracion_${tabla.nombre}`;
  const columnasParaCopiar = tabla.columnas.map((columna) => {
    if (columna === "usuarioId" && !nombresColumnas.has("usuarioId")) {
      return "1 AS \"usuarioId\"";
    }
    return `"${columna}"`;
  });

  await cliente.execute(`CREATE TABLE "${tablaTemporal}" (${tabla.definicion})`);
  await cliente.execute(
    `INSERT INTO "${tablaTemporal}" (${tabla.columnas.map((columna) => `"${columna}"`).join(", ")}) SELECT ${columnasParaCopiar.join(", ")} FROM "${tabla.nombre}"`,
  );
  await cliente.execute(`DROP TABLE "${tabla.nombre}"`);
  await cliente.execute(`ALTER TABLE "${tablaTemporal}" RENAME TO "${tabla.nombre}"`);
  if (tabla.indiceOpcional) await cliente.execute(tabla.indiceOpcional);
}

const { cliente } = await crearBaseDeDatos();

try {
  for (const tabla of tablasConPerfil) {
    await migrarTabla(cliente, tabla);
  }
} finally {
  await cliente.close();
}
