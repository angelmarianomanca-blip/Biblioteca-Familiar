import { Router } from "express";
import {
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
  listarUsuarios,
} from "../controladores/usuarios.js";

/** Expone los perfiles disponibles con CRUD completo en /api/usuarios. */
const rutasUsuarios = Router();
rutasUsuarios.get("/", listarUsuarios);
rutasUsuarios.post("/", crearUsuario);
rutasUsuarios.put("/:id", actualizarUsuario);
rutasUsuarios.delete("/:id", eliminarUsuario);

export { rutasUsuarios };
