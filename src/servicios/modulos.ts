import {
  and as y,
  asc as ascendente,
  eq as igual,
  sql as consultaSQL,
} from "drizzle-orm";
import { conexionCompartida } from "../db/instancia.js";
import { modulos } from "../db/esquema.js";

/** Consultas y cambios de estado de los módulos de lectura. */
export class Modulos {
  /** Algoritmo: filtra por libro, ordena por `orden` y devuelve sus módulos. */
  static async listarPorLibro(libroId: number) {
    const { baseDatos } = await conexionCompartida;
    return baseDatos
      .select()
      .from(modulos)
      .where(igual(modulos.libroId, libroId))
      .orderBy(ascendente(modulos.orden));
  }

  /** Algoritmo: establece `completado` en verdadero y guarda la fecha actual
   * solo si no existía una fecha previa; limita por libro cuando se indicó y
   * devuelve la fila actualizada o `undefined` si no existe ese módulo.
   */
  static async marcarComoCompletado(id: number, libroId?: number) {
    const { baseDatos } = await conexionCompartida;
    const ahora = new Date().toISOString();
    const [moduloActualizado] = await baseDatos
      .update(modulos)
      .set({
        completado: true,
        // Una llamada repetida conserva la primera fecha de finalización.
        fechaCompletado: consultaSQL`COALESCE(${modulos.fechaCompletado}, ${ahora})`,
      })
      .where(
        libroId === undefined
          ? igual(modulos.id, id)
          : y(
              igual(modulos.id, id),
              igual(modulos.libroId, libroId),
            ),
      )
      .returning();
    return moduloActualizado;
  }

  /** Algoritmo: obtiene los módulos del libro; devuelve falso si la lista está
   * vacía y, en caso contrario, exige que cada indicador sea verdadero.
   */
  static async todosCompletos(libroId: number): Promise<boolean> {
    const listaModulos = await Modulos.listarPorLibro(libroId);
    return listaModulos.length > 0 && listaModulos.every((modulo) => modulo.completado);
  }
}
