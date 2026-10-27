import {
  crearBaseDeDatos,
  type BaseDatosBiblioteca,
  type ClienteBaseDeDatos,
} from "./conexion.js";
import { sembrarDatos, librosIniciales } from "./sembrar.js";

/** Sentencias DDL para crear las tablas del modelo si no existen aún en la base activa. */
const SENTENCIAS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    nombre TEXT NOT NULL,
    avatarColor TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    icono TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS libros (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    categoriaId INTEGER NOT NULL REFERENCES categorias(id),
    titulo TEXT NOT NULL,
    autor TEXT NOT NULL,
    portadaUrl TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    contenidoCompleto TEXT NOT NULL,
    totalPaginas INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS resumenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    libroId INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    capitulo INTEGER NOT NULL,
    tituloCapitulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    orden INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mapasConceptuales (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    libroId INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    resumenId INTEGER REFERENCES resumenes(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    datosNodos TEXT NOT NULL,
    datosConexiones TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS lexico (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    libroId INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    termino TEXT NOT NULL,
    definicion TEXT NOT NULL,
    ejemplo TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS examenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    libroId INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    resumenId INTEGER REFERENCES resumenes(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    totalPreguntas INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS preguntas (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    examenId INTEGER NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
    enunciado TEXT NOT NULL,
    opcionA TEXT NOT NULL,
    opcionB TEXT NOT NULL,
    opcionC TEXT NOT NULL,
    opcionD TEXT NOT NULL,
    respuestaCorrecta TEXT NOT NULL,
    explicacion TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS progresoUsuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    libroId INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    usuarioId INTEGER NOT NULL DEFAULT 1 REFERENCES usuarios(id) ON DELETE CASCADE,
    paginaActual INTEGER NOT NULL,
    completado INTEGER NOT NULL,
    ultimaLectura TEXT,
    porcentaje INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "progresoUsuario_libroId_usuarioId_unico" ON progresoUsuario(libroId, usuarioId)`,
  `CREATE TABLE IF NOT EXISTS modulos (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    libroId INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    orden INTEGER NOT NULL,
    completado INTEGER NOT NULL,
    fechaCompletado TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS recordatorios (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    libroId INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    usuarioId INTEGER NOT NULL DEFAULT 1 REFERENCES usuarios(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    fechaHora TEXT NOT NULL,
    activo INTEGER NOT NULL,
    notificado INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS resultadosExamen (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    examenId INTEGER NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
    usuarioId INTEGER NOT NULL DEFAULT 1 REFERENCES usuarios(id) ON DELETE CASCADE,
    correctas INTEGER NOT NULL,
    incorrectas INTEGER NOT NULL,
    porcentaje REAL NOT NULL,
    fecha TEXT NOT NULL
  )`,
];

/**
 * Asegura que todas las tablas existan en la base de datos (sea SQLite local o Turso remoto).
 * Si la base de datos está vacía (sin categorías), ejecuta automáticamente la siembra inicial
 * para que la aplicación web funcione de inmediato al desplegarse.
 */
export async function asegurarEsquemaYDatos(
  conexionExistente?: {
    baseDatos: BaseDatosBiblioteca;
    cliente: ClienteBaseDeDatos;
    modo: "turso" | "sqlite";
  },
) {
  const debeCerrar = !conexionExistente;
  const conexion = conexionExistente ?? (await crearBaseDeDatos());
  const { cliente } = conexion;

  try {
    for (const sql of SENTENCIAS_DDL) {
      await cliente.execute(sql);
    }

    // Comprueba si la base tiene categorías cargadas
    const resultado = await cliente.execute("SELECT COUNT(*) AS total FROM categorias");
    const totalCategorias = Number(
      (resultado.rows[0] as Record<string, unknown>)?.total ?? 0,
    );

    if (totalCategorias === 0) {
      console.log("Base de datos sin registros. Ejecutando siembra inicial automática...");
      await sembrarDatos(conexion);
      console.log("Siembra inicial automática completada.");
    } else {
      // Si la base ya estaba sembrada con los textos cortos antiguos, actualiza los 6 libros
      // iniciales a capítulos completos con marcadores de página navegables
      for (const libro of librosIniciales) {
        try {
          await cliente.execute({
            sql: "UPDATE libros SET contenidoCompleto = ?, totalPaginas = ? WHERE id = ? AND (contenidoCompleto NOT LIKE '%--- PÁGINA%' OR length(contenidoCompleto) < 600)",
            args: [libro.contenidoCompleto, libro.totalPaginas, libro.id],
          });
        } catch {
          // Ignora si el libro fue modificado o eliminado por el usuario
        }
      }
    }
  } catch (error) {
    console.error("Error al asegurar el esquema y datos iniciales:", error);
  } finally {
    if (debeCerrar) {
      await cliente.close();
    }
  }
}
