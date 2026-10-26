import { Router } from "express";
import {
  actualizarProgreso,
  completarProgreso,
  obtenerProgreso,
} from "../controladores/progreso.js";

/** Router hijo para el estado de lectura de un libro. */
const rutasProgreso = Router({ mergeParams: true });
rutasProgreso.get("/", obtenerProgreso);
rutasProgreso.put("/", actualizarProgreso);
rutasProgreso.post("/completar", completarProgreso);

export { rutasProgreso };
