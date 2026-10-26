import { and as y, asc as ascendente, eq as igual } from "drizzle-orm";
import { conexionCompartida } from "../db/instancia.js";
import { mapasConceptuales } from "../db/esquema.js";
import { normalizarCamposDeTexto, normalizarJson } from "./normalizacion.js";

/** Operaciones para guardar mapas y sus estructuras JSON tipadas por Drizzle. */
export class MapasConceptuales {
  /** Algoritmo: filtra por `resumenId`, limita a un mapa y devuelve `undefined`
   * si no hay una fila asociada.
   */
  static async obtenerPorResumen(resumenId: number) {
    const { baseDatos } = await conexionCompartida;
    const [mapa] = await baseDatos
      .select()
      .from(mapasConceptuales)
      .where(igual(mapasConceptuales.resumenId, resumenId))
      .limit(1);
    return mapa;
  }

  /** Obtiene un mapa solo cuando el mapa y el libro coinciden. */
  static async obtenerPorIdDeLibro(libroId: number, id: number) {
    const { baseDatos } = await conexionCompartida;
    const [mapa] = await baseDatos
      .select()
      .from(mapasConceptuales)
      .where(
        y(
          igual(mapasConceptuales.libroId, libroId),
          igual(mapasConceptuales.id, id),
        ),
      )
      .limit(1);
    return mapa;
  }

  /** Algoritmo: filtra por `libroId`, ordena por ID ascendente y devuelve todos
   * los mapas del libro.
   */
  static async obtenerPorLibro(libroId: number) {
    const { baseDatos } = await conexionCompartida;
    return baseDatos
      .select()
      .from(mapasConceptuales)
      .where(igual(mapasConceptuales.libroId, libroId))
      .orderBy(ascendente(mapasConceptuales.id));
  }

  /** Algoritmo: normaliza el título y los textos recursivos de ambas estructuras
   * JSON, inserta el mapa y devuelve la representación tipada de la fila.
   */
  static async guardar(datos: typeof mapasConceptuales.$inferInsert) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, ["titulo"]);
    const [mapaCreado] = await baseDatos
      .insert(mapasConceptuales)
      .values({
        ...datosNormalizados,
        datosNodos: normalizarJson(datosNormalizados.datosNodos),
        datosConexiones: normalizarJson(datosNormalizados.datosConexiones),
      })
      .returning();
    return mapaCreado;
  }

  /**
   * Actualiza el título, los nodos y/o las conexiones indicados.
   * Las cadenas dentro de ambas estructuras JSON también se normalizan.
   */
  static async actualizar(
    id: number,
    datos: Partial<Omit<typeof mapasConceptuales.$inferInsert, "id">>,
    libroId?: number,
  ) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, ["titulo"]);
    const cambios = {
      ...datosNormalizados,
      ...(datosNormalizados.datosNodos
        ? { datosNodos: normalizarJson(datosNormalizados.datosNodos) }
        : {}),
      ...(datosNormalizados.datosConexiones
        ? {
            datosConexiones: normalizarJson(
              datosNormalizados.datosConexiones,
            ),
          }
        : {}),
    };
    const [mapaActualizado] = await baseDatos
      .update(mapasConceptuales)
      .set(cambios)
      .where(
        libroId === undefined
          ? igual(mapasConceptuales.id, id)
          : y(
              igual(mapasConceptuales.id, id),
              igual(mapasConceptuales.libroId, libroId),
            ),
      )
      .returning();
    return mapaActualizado;
  }
}
