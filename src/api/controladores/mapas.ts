import type { RequestHandler } from "express";
import { mapasConceptuales } from "../../db/esquema.js";
import { MapasConceptuales } from "../../servicios/index.js";
import {
  ErrorHttp,
  leerCuerpo,
  leerIdParametro,
  quitarCampos,
} from "./http.js";

/** Lista los mapas conceptuales de un libro. */
export const listarMapas: RequestHandler = async (solicitud, respuesta) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  respuesta.json(await MapasConceptuales.obtenerPorLibro(libroId));
};

/** Devuelve un mapa específico si pertenece al libro indicado. */
export const obtenerMapa: RequestHandler = async (solicitud, respuesta) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const id = leerIdParametro(solicitud, "id");
  const mapa = await MapasConceptuales.obtenerPorIdDeLibro(libroId, id);
  if (!mapa) throw new ErrorHttp(404, "No existe el mapa en ese libro.");
  respuesta.json(mapa);
};

/** Crea un mapa y asigna libroId desde la ruta para mantener su pertenencia. */
export const crearMapa: RequestHandler = async (solicitud, respuesta) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const cuerpo = leerCuerpo<Record<string, unknown>>(solicitud);
  const datos = quitarCampos(cuerpo, ["id", "libroId"]);
  respuesta.status(201).json(
    await MapasConceptuales.guardar({
      ...datos,
      libroId,
    } as typeof mapasConceptuales.$inferInsert),
  );
};

/** Actualiza un mapa sin permitir cambiar su libro o ID. */
export const actualizarMapa: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const id = leerIdParametro(solicitud, "id");
  const cuerpo = leerCuerpo<Record<string, unknown>>(solicitud);
  const datos = quitarCampos(cuerpo, ["id", "libroId"]);
  const mapa = await MapasConceptuales.actualizar(
    id,
    datos as Partial<Omit<typeof mapasConceptuales.$inferInsert, "id">>,
    libroId,
  );
  if (!mapa) throw new ErrorHttp(404, "No existe el mapa en ese libro.");
  respuesta.json(mapa);
};
