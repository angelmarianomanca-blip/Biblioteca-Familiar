import type { RequestHandler } from "express";
import { resumenes } from "../../db/esquema.js";
import { Resumenes } from "../../servicios/index.js";
import {
  ErrorHttp,
  leerCuerpo,
  leerIdParametro,
  quitarCampos,
} from "./http.js";

/** Lista resúmenes ordenados del libro indicado en la ruta. */
export const listarResumenes: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  respuesta.json(await Resumenes.listarPorLibro(libroId));
};

/** Crea un resumen vinculado al libro de la ruta. */
export const crearResumen: RequestHandler = async (solicitud, respuesta) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const cuerpo = leerCuerpo<Record<string, unknown>>(solicitud);
  const datos = quitarCampos(cuerpo, ["id", "libroId"]);
  respuesta.status(201).json(
    await Resumenes.crear({
      ...datos,
      libroId,
    } as typeof resumenes.$inferInsert),
  );
};

/** Actualiza únicamente el resumen que corresponde a ambos IDs de la ruta. */
export const actualizarResumen: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const id = leerIdParametro(solicitud, "id");
  const cuerpo = leerCuerpo<Record<string, unknown>>(solicitud);
  const datos = quitarCampos(cuerpo, ["id", "libroId"]);
  const resumen = await Resumenes.actualizarDeLibro(
    libroId,
    id,
    datos as Partial<
      Omit<typeof resumenes.$inferInsert, "id" | "libroId">
    >,
  );
  if (!resumen) throw new ErrorHttp(404, "No existe el resumen en ese libro.");
  respuesta.json(resumen);
};

/** Elimina el resumen solo cuando pertenece al libro de la ruta. */
export const eliminarResumen: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const id = leerIdParametro(solicitud, "id");
  const eliminado = await Resumenes.eliminarDeLibro(libroId, id);
  if (!eliminado) throw new ErrorHttp(404, "No existe el resumen en ese libro.");
  respuesta.status(204).end();
};
