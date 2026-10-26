import { Router } from "express";
import {
  actualizarLibro,
  crearLibro,
  eliminarLibro,
  listarLibros,
  obtenerLibroCompleto,
} from "../controladores/libros.js";
import { rutasExamenes } from "./examenes.js";
import { rutasLexico } from "./lexico.js";
import { rutasMapas } from "./mapas.js";
import { rutasModulos } from "./modulos.js";
import { rutasProgreso } from "./progreso.js";
import { rutasResumenes } from "./resumenes.js";

/** Agrupa las operaciones de libros y sus routers hijos. */
const rutasLibros = Router();
rutasLibros.get("/", listarLibros);
rutasLibros.post("/", crearLibro);
rutasLibros.get("/:id", obtenerLibroCompleto);
rutasLibros.put("/:id", actualizarLibro);
rutasLibros.delete("/:id", eliminarLibro);
rutasLibros.use("/:libroId/resumenes", rutasResumenes);
rutasLibros.use("/:libroId/lexico", rutasLexico);
rutasLibros.use("/:libroId/mapas", rutasMapas);
rutasLibros.use("/:libroId/examenes", rutasExamenes);
rutasLibros.use("/:libroId/progreso", rutasProgreso);
rutasLibros.use("/:libroId/modulos", rutasModulos);

export { rutasLibros };
