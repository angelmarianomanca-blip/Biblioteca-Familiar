import type { RequestHandler } from "express";
import { Usuarios } from "../../servicios/index.js";

/** Lista los perfiles que puede elegir la página de biblioteca. */
export const listarUsuarios: RequestHandler = async (_solicitud, respuesta) => {
  respuesta.json(await Usuarios.listar());
};
