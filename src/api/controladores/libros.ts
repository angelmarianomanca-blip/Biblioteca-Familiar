import type { RequestHandler } from "express";
import { libros } from "../../db/esquema.js";
import { Libros } from "../../servicios/index.js";
import {
  ErrorHttp,
  leerCuerpo,
  leerIdParametro,
  leerIdTexto,
  leerTextoQuery,
  quitarCampos,
} from "./http.js";

/** Lista libros y aplica simultáneamente los filtros de texto y categoría. */
export const listarLibros: RequestHandler = async (solicitud, respuesta) => {
  const busqueda = leerTextoQuery(solicitud, "busqueda");
  const categoriaTexto = leerTextoQuery(solicitud, "categoriaId");
  const categoriaId = categoriaTexto === undefined
    ? undefined
    : leerIdTexto(categoriaTexto, "categoriaId");
  respuesta.json(
    await Libros.listarConFiltros({ busqueda, categoriaId }),
  );
};

/** Devuelve los datos del libro junto con resúmenes, léxico, mapas y módulos. */
export const obtenerLibroCompleto: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const id = leerIdParametro(solicitud, "id");
  const libro = await Libros.obtenerCompleto(id);
  if (!libro) throw new ErrorHttp(404, "No existe el libro indicado.");
  respuesta.json(libro);
};

/** Valida un objeto JSON, crea el libro y devuelve 201. */
export const crearLibro: RequestHandler = async (solicitud, respuesta) => {
  const datos = leerCuerpo<typeof libros.$inferInsert>(solicitud);
  respuesta.status(201).json(await Libros.crear(datos));
};

/** Actualiza un libro sin aceptar una clave primaria enviada en el cuerpo. */
export const actualizarLibro: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const id = leerIdParametro(solicitud, "id");
  const cuerpo = leerCuerpo<Record<string, unknown>>(solicitud);
  const datos = quitarCampos(cuerpo, ["id"]);
  const libro = await Libros.actualizar(
    id,
    datos as Partial<Omit<typeof libros.$inferInsert, "id">>,
  );
  if (!libro) throw new ErrorHttp(404, "No existe el libro indicado.");
  respuesta.json(libro);
};

/** Elimina el libro y su contenido dependiente cuando existe. */
export const eliminarLibro: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const id = leerIdParametro(solicitud, "id");
  const eliminado = await Libros.eliminar(id);
  if (!eliminado) throw new ErrorHttp(404, "No existe el libro indicado.");
  respuesta.status(204).end();
};
