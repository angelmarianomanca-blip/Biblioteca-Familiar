import type { RequestHandler } from "express";
import { Usuarios } from "../../servicios/index.js";
import {
  ErrorHttp,
  leerCuerpo,
  leerIdParametro,
  leerUsuarioId,
  quitarCampos,
} from "./http.js";

/** Lista los perfiles que puede elegir la página de biblioteca. */
export const listarUsuarios: RequestHandler = async (_solicitud, respuesta) => {
  respuesta.json(await Usuarios.listar());
};

/** Crea un usuario nuevo con nombre, color y rol. */
export const crearUsuario: RequestHandler = async (solicitud, respuesta) => {
  // Solo administradores pueden crear usuarios.
  const solicitanteId = await leerUsuarioId(solicitud);
  if (!await Usuarios.esAdmin(solicitanteId)) {
    throw new ErrorHttp(403, "Solo los administradores pueden crear usuarios.");
  }
  const datos = leerCuerpo<{ nombre: string; avatarColor: string; rol?: "admin" | "lector" }>(solicitud);
  if (!datos.nombre || !datos.avatarColor) {
    throw new ErrorHttp(400, "Se requieren nombre y avatarColor.");
  }
  respuesta.status(201).json(await Usuarios.crear(datos));
};

/** Actualiza un usuario existente sin permitir cambiar su ID. */
export const actualizarUsuario: RequestHandler = async (solicitud, respuesta) => {
  const solicitanteId = await leerUsuarioId(solicitud);
  if (!await Usuarios.esAdmin(solicitanteId)) {
    throw new ErrorHttp(403, "Solo los administradores pueden modificar usuarios.");
  }
  const id = leerIdParametro(solicitud, "id");
  const cuerpo = leerCuerpo<Record<string, unknown>>(solicitud);
  const datos = quitarCampos(cuerpo, ["id"]);
  const usuario = await Usuarios.actualizar(
    id,
    datos as Partial<{ nombre: string; avatarColor: string; rol: "admin" | "lector" }>,
  );
  if (!usuario) throw new ErrorHttp(404, "No existe el usuario indicado.");
  respuesta.json(usuario);
};

/** Elimina un perfil y devuelve 204. */
export const eliminarUsuario: RequestHandler = async (solicitud, respuesta) => {
  const solicitanteId = await leerUsuarioId(solicitud);
  if (!await Usuarios.esAdmin(solicitanteId)) {
    throw new ErrorHttp(403, "Solo los administradores pueden eliminar usuarios.");
  }
  const id = leerIdParametro(solicitud, "id");
  if (id === solicitanteId) {
    throw new ErrorHttp(400, "No puedes eliminar tu propio perfil.");
  }
  const eliminado = await Usuarios.eliminar(id);
  if (!eliminado) throw new ErrorHttp(404, "No existe el usuario indicado.");
  respuesta.status(204).end();
};
