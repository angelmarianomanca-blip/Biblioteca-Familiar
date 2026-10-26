import type { RequestHandler } from "express";
import { Progreso } from "../../servicios/index.js";
import { leerUsuarioId } from "./http.js";

/** Expone las estadísticas globales calculadas por el servicio de progreso. */
export const obtenerEstadisticas: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  respuesta.json(await Progreso.obtenerEstadisticas(await leerUsuarioId(solicitud)));
};
