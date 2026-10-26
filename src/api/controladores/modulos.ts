import type { RequestHandler } from "express";
import { Modulos } from "../../servicios/index.js";
import { ErrorHttp, leerIdParametro } from "./http.js";

/** Lista módulos ordenados del libro de la ruta. */
export const listarModulos: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  respuesta.json(await Modulos.listarPorLibro(libroId));
};

/** Marca un módulo si su ID pertenece al libro señalado en la URL. */
export const completarModulo: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const id = leerIdParametro(solicitud, "id");
  const modulo = await Modulos.marcarComoCompletado(id, libroId);
  if (!modulo) throw new ErrorHttp(404, "No existe el módulo en ese libro.");
  respuesta.json(modulo);
};
