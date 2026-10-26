import {
  integer as entero,
  real as numeroReal,
  sqliteTable as tablaSQLite,
  text as texto,
  uniqueIndex as indiceUnico,
} from "drizzle-orm/sqlite-core";

/** Representa un nodo que se serializa dentro de datosNodos. */
export type NodoConceptual = {
  id: string;
  etiqueta: string;
};

/** Representa una relación entre dos nodos del mapa conceptual. */
export type ConexionConceptual = {
  origen: string;
  destino: string;
  etiqueta: string;
};

/** Limita en TypeScript las letras que puede guardar una pregunta. */
export type RespuestaCorrecta = "A" | "B" | "C" | "D";

/** Agrupa las categorías para que los libros apunten a una categoría válida. */
export const categorias = tablaSQLite("categorias", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  nombre: texto("nombre").notNull(),
  descripcion: texto("descripcion").notNull(),
  icono: texto("icono").notNull(),
});

/** Guarda los datos principales y el texto completo de cada libro. */
export const libros = tablaSQLite("libros", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  categoriaId: entero("categoriaId")
    .notNull()
    .references(() => categorias.id),
  titulo: texto("titulo").notNull(),
  autor: texto("autor").notNull(),
  portadaUrl: texto("portadaUrl").notNull(),
  descripcion: texto("descripcion").notNull(),
  contenidoCompleto: texto("contenidoCompleto").notNull(),
  totalPaginas: entero("totalPaginas").notNull(),
});

/** Divide un libro en capítulos con resumen y posición numérica. */
export const resumenes = tablaSQLite("resumenes", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  libroId: entero("libroId")
    .notNull()
    .references(() => libros.id, { onDelete: "cascade" }),
  capitulo: entero("capitulo").notNull(),
  tituloCapitulo: texto("tituloCapitulo").notNull(),
  contenido: texto("contenido").notNull(),
  orden: entero("orden").notNull(),
});

/** Guarda mapas conceptuales y su estructura JSON representada como texto. */
export const mapasConceptuales = tablaSQLite("mapasConceptuales", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  libroId: entero("libroId")
    .notNull()
    .references(() => libros.id, { onDelete: "cascade" }),
  resumenId: entero("resumenId").references(() => resumenes.id, {
    onDelete: "cascade",
  }),
  titulo: texto("titulo").notNull(),
  // mode json mantiene el tipo físico TEXT y transforma JSON al leer/escribir.
  datosNodos: texto("datosNodos", { mode: "json" })
    .$type<NodoConceptual[]>()
    .notNull(),
  datosConexiones: texto("datosConexiones", { mode: "json" })
    .$type<ConexionConceptual[]>()
    .notNull(),
});

/** Guarda vocabulario propio de cada libro y un ejemplo opcional. */
export const lexico = tablaSQLite("lexico", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  libroId: entero("libroId")
    .notNull()
    .references(() => libros.id, { onDelete: "cascade" }),
  termino: texto("termino").notNull(),
  definicion: texto("definicion").notNull(),
  ejemplo: texto("ejemplo"),
});

/** Relaciona cada examen con un libro y, si corresponde, un resumen. */
export const examenes = tablaSQLite("examenes", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  libroId: entero("libroId")
    .notNull()
    .references(() => libros.id, { onDelete: "cascade" }),
  resumenId: entero("resumenId").references(() => resumenes.id, {
    onDelete: "cascade",
  }),
  titulo: texto("titulo").notNull(),
  totalPreguntas: entero("totalPreguntas").notNull(),
});

/** Guarda preguntas de opción múltiple y la letra de la respuesta correcta. */
export const preguntas = tablaSQLite("preguntas", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  examenId: entero("examenId")
    .notNull()
    .references(() => examenes.id, { onDelete: "cascade" }),
  enunciado: texto("enunciado").notNull(),
  opcionA: texto("opcionA").notNull(),
  opcionB: texto("opcionB").notNull(),
  opcionC: texto("opcionC").notNull(),
  opcionD: texto("opcionD").notNull(),
  respuestaCorrecta: texto("respuestaCorrecta", {
    enum: ["A", "B", "C", "D"],
  })
    .$type<RespuestaCorrecta>()
    .notNull(),
  explicacion: texto("explicacion").notNull(),
});

/** Perfiles sencillos entre los que puede alternar la interfaz. */
export const usuarios = tablaSQLite("usuarios", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  nombre: texto("nombre").notNull(),
  avatarColor: texto("avatarColor").notNull(),
});

/** Representa la lectura de un perfil para cada libro. */
export const progresoUsuario = tablaSQLite(
  "progresoUsuario",
  {
    id: entero("id").primaryKey({ autoIncrement: true }),
    libroId: entero("libroId")
      .notNull()
      .references(() => libros.id, { onDelete: "cascade" }),
    usuarioId: entero("usuarioId")
      .notNull()
      .default(1)
      .references(() => usuarios.id, { onDelete: "cascade" }),
    paginaActual: entero("paginaActual").notNull(),
    completado: entero("completado", { mode: "boolean" }).notNull(),
    // NULL representa que el usuario todavía no inició la lectura del libro.
    ultimaLectura: texto("ultimaLectura"),
    porcentaje: entero("porcentaje").notNull(),
  },
  (tabla) => [
    indiceUnico("progresoUsuario_libroId_usuarioId_unico").on(
      tabla.libroId,
      tabla.usuarioId,
    ),
  ],
);

/** Divide la lectura de cada libro en módulos ordenados. */
export const modulos = tablaSQLite("modulos", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  libroId: entero("libroId")
    .notNull()
    .references(() => libros.id, { onDelete: "cascade" }),
  titulo: texto("titulo").notNull(),
  orden: entero("orden").notNull(),
  completado: entero("completado", { mode: "boolean" }).notNull(),
  // Conserva el momento real de finalización para mostrar actividad reciente.
  fechaCompletado: texto("fechaCompletado"),
});

/** Guarda avisos programados que pertenecen a un libro. */
export const recordatorios = tablaSQLite("recordatorios", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  libroId: entero("libroId")
    .notNull()
    .references(() => libros.id, { onDelete: "cascade" }),
  usuarioId: entero("usuarioId")
    .notNull()
    .default(1)
    .references(() => usuarios.id, { onDelete: "cascade" }),
  mensaje: texto("mensaje").notNull(),
  fechaHora: texto("fechaHora").notNull(),
  activo: entero("activo", { mode: "boolean" }).notNull(),
  notificado: entero("notificado", { mode: "boolean" }).notNull(),
});

/** Guarda el resultado numérico de cada intento de examen. */
export const resultadosExamen = tablaSQLite("resultadosExamen", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  examenId: entero("examenId")
    .notNull()
    .references(() => examenes.id, { onDelete: "cascade" }),
  usuarioId: entero("usuarioId")
    .notNull()
    .default(1)
    .references(() => usuarios.id, { onDelete: "cascade" }),
  correctas: entero("correctas").notNull(),
  incorrectas: entero("incorrectas").notNull(),
  porcentaje: numeroReal("porcentaje").notNull(),
  fecha: texto("fecha").notNull(),
});
