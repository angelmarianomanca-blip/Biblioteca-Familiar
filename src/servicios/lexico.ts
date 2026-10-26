import { and as y, asc as ascendente, eq as igual } from "drizzle-orm";
import { conexionCompartida } from "../db/instancia.js";
import { lexico } from "../db/esquema.js";
import {
  normalizarCamposDeTexto,
  normalizarTextoParaBusqueda,
} from "./normalizacion.js";

/** Operaciones CRUD y búsqueda del léxico asociado a los libros. */
export class Lexico {
  /** Algoritmo: filtra por `libroId`, ordena por el texto del término y devuelve
   * todas las entradas léxicas del libro.
   */
  static async listarPorLibro(libroId: number) {
    const { baseDatos } = await conexionCompartida;
    return baseDatos
      .select()
      .from(lexico)
      .where(igual(lexico.libroId, libroId))
      .orderBy(ascendente(lexico.termino));
  }

  /**
   * Algoritmo: carga el léxico completo o el del libro indicado; normaliza la
   * consulta y cada término/definición; devuelve las filas que contienen el
   * fragmento sin distinguir mayúsculas ni acentos.
   */
  static async buscar(texto: string, libroId?: number) {
    const { baseDatos } = await conexionCompartida;
    const terminos = libroId === undefined
      ? await baseDatos.select().from(lexico)
      : await baseDatos.select().from(lexico).where(igual(lexico.libroId, libroId));
    const consultaNormalizada = normalizarTextoParaBusqueda(texto);
    if (!consultaNormalizada) return terminos;

    return terminos.filter(({ termino, definicion }) =>
      [termino, definicion].some((campo) =>
        normalizarTextoParaBusqueda(campo).includes(consultaNormalizada),
      ),
    );
  }

  /** Algoritmo: consulta por clave primaria, limita a una fila y devuelve el
   * término o `undefined` cuando no se encuentra.
   */
  static async obtenerPorId(id: number) {
    const { baseDatos } = await conexionCompartida;
    const [termino] = await baseDatos
      .select()
      .from(lexico)
      .where(igual(lexico.id, id))
      .limit(1);
    return termino;
  }

  /** Algoritmo: normaliza término, definición y ejemplo, inserta la fila y
   * devuelve el término guardado con su ID.
   */
  static async crear(datos: typeof lexico.$inferInsert) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "termino",
      "definicion",
      "ejemplo",
    ]);
    const [terminoCreado] = await baseDatos
      .insert(lexico)
      .values(datosNormalizados)
      .returning();
    return terminoCreado;
  }

  /** Algoritmo: normaliza las propiedades textuales recibidas, actualiza solo
   * esas columnas por ID y devuelve la fila resultante.
   */
  static async actualizar(
    id: number,
    datos: Partial<Omit<typeof lexico.$inferInsert, "id">>,
  ) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "termino",
      "definicion",
      "ejemplo",
    ]);
    const [terminoActualizado] = await baseDatos
      .update(lexico)
      .set(datosNormalizados)
      .where(igual(lexico.id, id))
      .returning();
    return terminoActualizado;
  }

  /** Actualiza una entrada solo si está vinculada al libro indicado. */
  static async actualizarDeLibro(
    libroId: number,
    id: number,
    datos: Partial<Omit<typeof lexico.$inferInsert, "id" | "libroId">>,
  ) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "termino",
      "definicion",
      "ejemplo",
    ]);
    const [terminoActualizado] = await baseDatos
      .update(lexico)
      .set(datosNormalizados)
      .where(y(igual(lexico.id, id), igual(lexico.libroId, libroId)))
      .returning();
    return terminoActualizado;
  }

  /** Algoritmo: elimina por ID y devuelve `true` solo si se borró una fila. */
  static async eliminar(id: number): Promise<boolean> {
    const { baseDatos } = await conexionCompartida;
    const eliminados = await baseDatos
      .delete(lexico)
      .where(igual(lexico.id, id))
      .returning({ id: lexico.id });
    return eliminados.length > 0;
  }

  /** Elimina una entrada solo si está vinculada al libro indicado. */
  static async eliminarDeLibro(libroId: number, id: number): Promise<boolean> {
    const { baseDatos } = await conexionCompartida;
    const eliminados = await baseDatos
      .delete(lexico)
      .where(y(igual(lexico.id, id), igual(lexico.libroId, libroId)))
      .returning({ id: lexico.id });
    return eliminados.length > 0;
  }
}
