import { Router } from "express";
import { listarUsuarios } from "../controladores/usuarios.js";

/** Expone los perfiles disponibles en GET /api/usuarios. */
const rutasUsuarios = Router();
rutasUsuarios.get("/", listarUsuarios);

export { rutasUsuarios };
