import type { RequestHandler } from "express";
import { recordatorios } from "../../db/esquema.js";
import { Recordatorios } from "../../servicios/index.js";
import {
  ErrorHttp,
  leerCuerpo,
  leerIdParametro,
  leerIdTexto,
  leerTextoQuery,
  leerUsuarioId,
  quitarCampos,
} from "./http.js";

/** Lista recordatorios y limita por libro cuando se envía libroId. */
export const listarRecordatorios: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroTexto = leerTextoQuery(solicitud, "libroId");
  const libroId = libroTexto === undefined
    ? undefined
    : leerIdTexto(libroTexto, "libroId");
  const usuarioId = await leerUsuarioId(solicitud);
  respuesta.json(await Recordatorios.listar(libroId, usuarioId));
};

/** Devuelve recordatorios activos vencidos que todavía no se notificaron. */
export const listarRecordatoriosPendientes: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const usuarioId = await leerUsuarioId(solicitud);
  respuesta.json(await Recordatorios.obtenerPendientes(new Date(), usuarioId));
};

/** Crea un recordatorio con los campos proporcionados en JSON. */
export const crearRecordatorio: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const datos = leerCuerpo<typeof recordatorios.$inferInsert>(solicitud);
  const usuarioId = await leerUsuarioId(solicitud);
  respuesta.status(201).json(await Recordatorios.crear({ ...datos, usuarioId }));
};

/** Actualiza recordatorios pendientes; rechaza con 409 los ya notificados. */
export const actualizarRecordatorio: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const id = leerIdParametro(solicitud, "id");
  const usuarioId = await leerUsuarioId(solicitud);
  const cuerpo = leerCuerpo<Record<string, unknown>>(solicitud);
  const datos = quitarCampos(cuerpo, ["id", "usuarioId"]);
  const recordatorio = await Recordatorios.actualizar(
    id,
    datos as Partial<Omit<typeof recordatorios.$inferInsert, "id">>,
    usuarioId,
  );
  if (!recordatorio) {
    const registroExistente = await Recordatorios.obtenerPorId(id, usuarioId);
    if (registroExistente?.notificado) {
      throw new ErrorHttp(409, "Los recordatorios completados no se pueden editar.");
    }
    throw new ErrorHttp(404, "No existe el recordatorio indicado.");
  }
  respuesta.json(recordatorio);
};

/** Elimina un recordatorio y devuelve 204 cuando se encontró. */
export const eliminarRecordatorio: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const id = leerIdParametro(solicitud, "id");
  const usuarioId = await leerUsuarioId(solicitud);
  const eliminado = await Recordatorios.eliminar(id, usuarioId);
  if (!eliminado) {
    throw new ErrorHttp(404, "No existe el recordatorio indicado.");
  }
  respuesta.status(204).end();
};

/** Actualiza la bandera de notificación del recordatorio. */
export const notificarRecordatorio: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const id = leerIdParametro(solicitud, "id");
  const usuarioId = await leerUsuarioId(solicitud);
  const recordatorio = await Recordatorios.marcarComoNotificado(id, usuarioId);
  if (!recordatorio) {
    throw new ErrorHttp(404, "No existe el recordatorio indicado.");
  }
  respuesta.json(recordatorio);
};
