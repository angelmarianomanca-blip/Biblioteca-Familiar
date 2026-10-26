import { Router } from "express";
import {
  actualizarCategoria,
  crearCategoria,
  eliminarCategoria,
  listarCategorias,
} from "../controladores/categorias.js";

/** Enruta las cuatro operaciones HTTP de categorías. */
const rutasCategorias = Router();
rutasCategorias.get("/", listarCategorias);
rutasCategorias.post("/", crearCategoria);
rutasCategorias.put("/:id", actualizarCategoria);
rutasCategorias.delete("/:id", eliminarCategoria);

export { rutasCategorias };
