import { asc as ascendente, count as contar, eq as igual } from "drizzle-orm";
import { conexionCompartida } from "../db/instancia.js";
import { categorias, libros } from "../db/esquema.js";
import { Libros } from "./libros.js";
import { normalizarCamposDeTexto } from "./normalizacion.js";

/** Operaciones CRUD para las categorías de la biblioteca. */
export class Categorias {
  /**
   * Algoritmo: une categorías y libros con `LEFT JOIN`, agrupa por categoría,
   * cuenta IDs de libro (cero para grupos vacíos) y ordena por nombre.
   */
  static async listar() {
    const { baseDatos } = await conexionCompartida;
    const filas = await baseDatos
      .select({
        categoria: categorias,
        cantidadLibros: contar(libros.id),
      })
      .from(categorias)
      .leftJoin(libros, igual(categorias.id, libros.categoriaId))
      .groupBy(categorias.id)
      .orderBy(ascendente(categorias.nombre));
    return filas.map(({ categoria, cantidadLibros }) => ({
      ...categoria,
      cantidadLibros,
    }));
  }

  /** Algoritmo: normaliza nombre, descripción e icono, inserta la categoría y
   * devuelve la fila creada con el ID asignado por SQLite.
   */
  static async crear(datos: typeof categorias.$inferInsert) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "nombre",
      "descripcion",
      "icono",
    ]);
    const [categoriaCreada] = await baseDatos
      .insert(categorias)
      .values(datosNormalizados)
      .returning();
    return categoriaCreada;
  }

  /** Algoritmo: filtra por clave primaria, limita a una fila y devuelve la
   * categoría o `undefined` si el ID no existe.
   */
  static async obtenerPorId(id: number) {
    const { baseDatos } = await conexionCompartida;
    const [categoria] = await baseDatos
      .select()
      .from(categorias)
      .where(igual(categorias.id, id))
      .limit(1);
    return categoria;
  }

  /** Algoritmo: normaliza los textos incluidos en el parche, actualiza solo
   * esas columnas para el ID indicado y devuelve la fila resultante.
   */
  static async actualizar(
    id: number,
    datos: Partial<Omit<typeof categorias.$inferInsert, "id">>,
  ) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "nombre",
      "descripcion",
      "icono",
    ]);
    const [categoriaActualizada] = await baseDatos
      .update(categorias)
      .set(datosNormalizados)
      .where(igual(categorias.id, id))
      .returning();
    return categoriaActualizada;
  }

  /** Elimina la categoría y todos los libros asociados con su contenido en cascada. */
  static async eliminar(id: number): Promise<boolean> {
    const { baseDatos } = await conexionCompartida;
    const librosEnCategoria = await baseDatos
      .select({ id: libros.id })
      .from(libros)
      .where(igual(libros.categoriaId, id));
    for (const lib of librosEnCategoria) {
      await Libros.eliminar(lib.id);
    }
    const eliminadas = await baseDatos
      .delete(categorias)
      .where(igual(categorias.id, id))
      .returning({ id: categorias.id });
    return eliminadas.length > 0;
  }
}
