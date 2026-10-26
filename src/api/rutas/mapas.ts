import { Router } from "express";
import {
  actualizarMapa,
  crearMapa,
  listarMapas,
  obtenerMapa,
} from "../controladores/mapas.js";

/** Router hijo para los mapas conceptuales de un libro. */
const rutasMapas = Router({ mergeParams: true });
rutasMapas.get("/", listarMapas);
rutasMapas.get("/:id", obtenerMapa);
rutasMapas.post("/", crearMapa);
rutasMapas.put("/:id", actualizarMapa);

export { rutasMapas };
