import { Router } from "express";
import {
  completarModulo,
  listarModulos,
} from "../controladores/modulos.js";

/** Router hijo para módulos de lectura. */
const rutasModulos = Router({ mergeParams: true });
rutasModulos.get("/", listarModulos);
rutasModulos.post("/:id/completar", completarModulo);

export { rutasModulos };
