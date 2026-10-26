import { Router } from "express";
import {
  actualizarRecordatorio,
  crearRecordatorio,
  eliminarRecordatorio,
  listarRecordatorios,
  listarRecordatoriosPendientes,
  notificarRecordatorio,
} from "../controladores/recordatorios.js";

/** Enruta el listado, mantenimiento y notificación de recordatorios. */
const rutasRecordatorios = Router();
rutasRecordatorios.get("/pendientes", listarRecordatoriosPendientes);
rutasRecordatorios.get("/", listarRecordatorios);
rutasRecordatorios.post("/", crearRecordatorio);
rutasRecordatorios.put("/:id", actualizarRecordatorio);
rutasRecordatorios.delete("/:id", eliminarRecordatorio);
rutasRecordatorios.post("/:id/notificar", notificarRecordatorio);

export { rutasRecordatorios };
