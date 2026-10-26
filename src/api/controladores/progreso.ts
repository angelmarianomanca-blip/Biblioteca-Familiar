import type { RequestHandler } from "express";
import { Progreso } from "../../servicios/index.js";
import { ErrorHttp, leerCuerpo, leerIdParametro, leerUsuarioId } from "./http.js";

/** Devuelve el progreso guardado del libro. */
export const obtenerProgreso: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const usuarioId = await leerUsuarioId(solicitud);
  const progreso = await Progreso.obtenerPorLibro(libroId, usuarioId);
  if (!progreso) throw new ErrorHttp(404, "El libro no tiene progreso guardado.");
  respuesta.json(progreso);
};

/** Valida paginaActual y delega su cálculo y persistencia al servicio. */
export const actualizarProgreso: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const usuarioId = await leerUsuarioId(solicitud);
  const cuerpo = leerCuerpo<{ paginaActual?: unknown }>(solicitud);
  if (typeof cuerpo.paginaActual !== "number") {
    throw new ErrorHttp(400, "paginaActual debe ser un número entero.");
  }
  respuesta.json(
    await Progreso.actualizarPagina(libroId, cuerpo.paginaActual, usuarioId),
  );
};

/** Marca como completo el libro de la ruta. */
export const completarProgreso: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const usuarioId = await leerUsuarioId(solicitud);
  respuesta.json(await Progreso.marcarLibroCompletado(libroId, usuarioId));
};
