import { Router } from "express";
import {
  actualizarTermino,
  crearTermino,
  eliminarTermino,
  listarLexico,
} from "../controladores/lexico.js";

/** Router hijo para términos vinculados a un libro. */
const rutasLexico = Router({ mergeParams: true });
rutasLexico.get("/", listarLexico);
rutasLexico.post("/", crearTermino);
rutasLexico.put("/:id", actualizarTermino);
rutasLexico.delete("/:id", eliminarTermino);

export { rutasLexico };
