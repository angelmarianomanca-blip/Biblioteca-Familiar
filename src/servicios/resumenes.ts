import { and as y, asc as ascendente, eq as igual } from "drizzle-orm";
import { conexionCompartida } from "../db/instancia.js";
import { resumenes } from "../db/esquema.js";
import { normalizarCamposDeTexto } from "./normalizacion.js";

/** Operaciones CRUD de resúmenes vinculados a un libro. */
export class Resumenes {
  /** Algoritmo: filtra por `libroId`, ordena primero por capítulo y luego por
   * posición, y devuelve todas las filas coincidentes.
   */
  static async listarPorLibro(libroId: number) {
    const { baseDatos } = await conexionCompartida;
    return baseDatos
      .select()
      .from(resumenes)
      .where(igual(resumenes.libroId, libroId))
      .orderBy(ascendente(resumenes.capitulo), ascendente(resumenes.orden));
  }

  /** Algoritmo: normaliza título y contenido, inserta el registro vinculado al
   * libro recibido y devuelve la fila creada.
   */
  static async crear(datos: typeof resumenes.$inferInsert) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "tituloCapitulo",
      "contenido",
    ]);
    const [resumenCreado] = await baseDatos
      .insert(resumenes)
      .values(datosNormalizados)
      .returning();
    return resumenCreado;
  }

  /** Algoritmo: consulta por clave primaria, limita a una fila y devuelve el
   * resumen o `undefined` si no existe.
   */
  static async obtenerPorId(id: number) {
    const { baseDatos } = await conexionCompartida;
    const [resumen] = await baseDatos
      .select()
      .from(resumenes)
      .where(igual(resumenes.id, id))
      .limit(1);
    return resumen;
  }

  /** Algoritmo: normaliza título y contenido si fueron recibidos, actualiza
   * solo las columnas indicadas y devuelve la fila resultante.
   */
  static async actualizar(
    id: number,
    datos: Partial<Omit<typeof resumenes.$inferInsert, "id">>,
  ) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "tituloCapitulo",
      "contenido",
    ]);
    const [resumenActualizado] = await baseDatos
      .update(resumenes)
      .set(datosNormalizados)
      .where(igual(resumenes.id, id))
      .returning();
    return resumenActualizado;
  }

  /** Actualiza un resumen solo si pertenece al libro indicado. */
  static async actualizarDeLibro(
    libroId: number,
    id: number,
    datos: Partial<Omit<typeof resumenes.$inferInsert, "id" | "libroId">>,
  ) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "tituloCapitulo",
      "contenido",
    ]);
    const [resumenActualizado] = await baseDatos
      .update(resumenes)
      .set(datosNormalizados)
      .where(y(igual(resumenes.id, id), igual(resumenes.libroId, libroId)))
      .returning();
    return resumenActualizado;
  }

  /** Algoritmo: elimina por ID; las claves foráneas en cascada eliminan sus
   * mapas y exámenes asociados; devuelve si se encontró una fila que borrar.
   */
  static async eliminar(id: number): Promise<boolean> {
    const { baseDatos } = await conexionCompartida;
    const eliminados = await baseDatos
      .delete(resumenes)
      .where(igual(resumenes.id, id))
      .returning({ id: resumenes.id });
    return eliminados.length > 0;
  }

  /** Elimina un resumen solo si pertenece al libro indicado. */
  static async eliminarDeLibro(libroId: number, id: number): Promise<boolean> {
    const { baseDatos } = await conexionCompartida;
    const eliminados = await baseDatos
      .delete(resumenes)
      .where(y(igual(resumenes.id, id), igual(resumenes.libroId, libroId)))
      .returning({ id: resumenes.id });
    return eliminados.length > 0;
  }
}
