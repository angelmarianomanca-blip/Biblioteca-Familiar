import { Router } from "express";
import {
  corregirExamen,
  listarExamenes,
  listarResultados,
  obtenerExamen,
} from "../controladores/examenes.js";

/** Router hijo para consulta, corrección e historial de exámenes. */
const rutasExamenes = Router({ mergeParams: true });
rutasExamenes.get("/", listarExamenes);
rutasExamenes.get("/:id/resultados", listarResultados);
rutasExamenes.post("/:id/corregir", corregirExamen);
rutasExamenes.get("/:id", obtenerExamen);

export { rutasExamenes };
