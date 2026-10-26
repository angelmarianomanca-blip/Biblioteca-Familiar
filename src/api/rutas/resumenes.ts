import { Router } from "express";
import {
  actualizarResumen,
  crearResumen,
  eliminarResumen,
  listarResumenes,
} from "../controladores/resumenes.js";

/** Router hijo que conserva `libroId` de su ruta padre. */
const rutasResumenes = Router({ mergeParams: true });
rutasResumenes.get("/", listarResumenes);
rutasResumenes.post("/", crearResumen);
rutasResumenes.put("/:id", actualizarResumen);
rutasResumenes.delete("/:id", eliminarResumen);

export { rutasResumenes };
