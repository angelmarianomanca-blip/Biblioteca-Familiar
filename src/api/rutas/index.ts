import { Router } from "express";
import { obtenerEstadisticas } from "../controladores/estadisticas.js";
import { rutasCategorias } from "./categorias.js";
import { rutasLibros } from "./libros.js";
import { rutasRecordatorios } from "./recordatorios.js";
import { rutasUsuarios } from "./usuarios.js";

/** Monta todos los recursos bajo el prefijo `/api`. */
const rutasApi = Router();
rutasApi.use("/categorias", rutasCategorias);
rutasApi.use("/libros", rutasLibros);
rutasApi.use("/recordatorios", rutasRecordatorios);
rutasApi.use("/usuarios", rutasUsuarios);
rutasApi.get("/estadisticas", obtenerEstadisticas);

export { rutasApi };
