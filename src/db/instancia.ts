// Carga las variables de entorno antes de preparar la conexión compartida.
import "dotenv/config";

import { crearBaseDeDatos } from "./conexion.js";

/**
 * Promesa compartida de conexión para todas las clases de servicio.
 *
 * Se inicializa una sola vez al importar este módulo, de modo que los métodos
 * estáticos compartan el mismo cliente libSQL y no abran una conexión nueva
 * para cada consulta.
 */
export const conexionCompartida = crearBaseDeDatos();
