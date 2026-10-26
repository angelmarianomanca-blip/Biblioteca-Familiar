import type { RequestHandler } from "express";
import { lexico } from "../../db/esquema.js";
import { Lexico } from "../../servicios/index.js";
import {
  ErrorHttp,
  leerCuerpo,
  leerIdParametro,
  leerTextoQuery,
  quitarCampos,
} from "./http.js";

/** Lista el léxico del libro o busca en sus términos y definiciones. */
export const listarLexico: RequestHandler = async (solicitud, respuesta) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const busqueda = leerTextoQuery(solicitud, "busqueda");
  const terminos = busqueda
    ? await Lexico.buscar(busqueda, libroId)
    : await Lexico.listarPorLibro(libroId);
  respuesta.json(terminos);
};

/** Agrega un término al libro indicado, ignorando libroId del cuerpo. */
export const crearTermino: RequestHandler = async (solicitud, respuesta) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const cuerpo = leerCuerpo<Record<string, unknown>>(solicitud);
  const datos = quitarCampos(cuerpo, ["id", "libroId"]);
  respuesta.status(201).json(
    await Lexico.crear({ ...datos, libroId } as typeof lexico.$inferInsert),
  );
};

/** Edita un término únicamente dentro del libro de la ruta. */
export const actualizarTermino: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const id = leerIdParametro(solicitud, "id");
  const cuerpo = leerCuerpo<Record<string, unknown>>(solicitud);
  const datos = quitarCampos(cuerpo, ["id", "libroId"]);
  const termino = await Lexico.actualizarDeLibro(
    libroId,
    id,
    datos as Partial<Omit<typeof lexico.$inferInsert, "id" | "libroId">>,
  );
  if (!termino) throw new ErrorHttp(404, "No existe el término en ese libro.");
  respuesta.json(termino);
};

/** Elimina el término solo cuando está vinculado al libro de la ruta. */
export const eliminarTermino: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const id = leerIdParametro(solicitud, "id");
  const eliminado = await Lexico.eliminarDeLibro(libroId, id);
  if (!eliminado) throw new ErrorHttp(404, "No existe el término en ese libro.");
  respuesta.status(204).end();
};
