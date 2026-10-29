import { asc as ascendente, eq as igual } from "drizzle-orm";
import { conexionCompartida } from "../db/instancia.js";
import {
  categorias,
  lexico,
  libros,
  mapasConceptuales,
  modulos,
  resumenes,
} from "../db/esquema.js";
import {
  normalizarCamposDeTexto,
  normalizarTextoParaBusqueda,
} from "./normalizacion.js";

/** Operaciones de consulta y mantenimiento de los libros del catálogo. */
export class Libros {
  /**
   * Algoritmo: normaliza título, autor, portada, descripción y contenido;
   * inserta la fila con los datos restantes intactos; devuelve la fila creada.
   */
  static async crear(datos: typeof libros.$inferInsert) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "titulo",
      "autor",
      "portadaUrl",
      "descripcion",
      "contenidoCompleto",
    ]);
    if (!datosNormalizados.portadaUrl?.trim()) {
      datosNormalizados.portadaUrl =
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80";
    }
    const [libroCreado] = await baseDatos
      .insert(libros)
      .values(datosNormalizados)
      .returning();
    return libroCreado;
  }

  /** Algoritmo: filtra por clave primaria, limita a una fila y devuelve la
   * primera coincidencia o `undefined` cuando el ID no está en el catálogo.
   */
  static async obtenerPorId(id: number) {
    const { baseDatos } = await conexionCompartida;
    const [libro] = await baseDatos
      .select()
      .from(libros)
      .where(igual(libros.id, id))
      .limit(1);
    return libro;
  }

  /** Algoritmo: une cada libro con su categoría, ordena por título y devuelve
   * las dos entidades para evitar una consulta adicional por cada libro.
   */
  static async listar() {
    const { baseDatos } = await conexionCompartida;
    return baseDatos
      .select({ libro: libros, categoria: categorias })
      .from(libros)
      .innerJoin(categorias, igual(libros.categoriaId, categorias.id))
      .orderBy(ascendente(libros.titulo));
  }

  /**
   * Algoritmo: normaliza la consulta, carga libros con su categoría, compara el
   * fragmento sin acentos ni distinción de mayúsculas contra título, autor y
   * categoría, y conserva las coincidencias en el orden original.
   */
  static async buscar(texto: string) {
    return Libros.listarConFiltros({ busqueda: texto });
  }

  /** Filtra el catálogo por texto y categoría, aplicando ambos filtros juntos. */
  static async listarConFiltros(filtros: {
    busqueda?: string;
    categoriaId?: number;
  } = {}) {
    const librosConCategoria = await Libros.listar();
    const librosDeCategoria = filtros.categoriaId === undefined
      ? librosConCategoria
      : librosConCategoria.filter(
          ({ libro }) => libro.categoriaId === filtros.categoriaId,
        );
    const consultaNormalizada = normalizarTextoParaBusqueda(
      filtros.busqueda ?? "",
    );

    // La consulta vacía deja pasar todos los registros filtrados por categoría.
    if (!consultaNormalizada) return librosDeCategoria;

    // Título, autor y categoría se comparan sin distinguir acentos ni mayúsculas.
    return librosDeCategoria.filter(({ libro, categoria }) =>
      [libro.titulo, libro.autor, categoria.nombre].some((campo) =>
        normalizarTextoParaBusqueda(campo).includes(consultaNormalizada),
      ),
    );
  }

  /** Algoritmo: selecciona por `categoriaId` y ordena las coincidencias por
   * título antes de devolverlas.
   */
  static async obtenerPorCategoria(categoriaId: number) {
    const { baseDatos } = await conexionCompartida;
    return baseDatos
      .select()
      .from(libros)
      .where(igual(libros.categoriaId, categoriaId))
      .orderBy(ascendente(libros.titulo));
  }

  /**
   * Algoritmo: obtiene el libro; si no existe, devuelve `undefined`; si existe,
   * carga en paralelo resúmenes, léxico, mapas y módulos y combina las cuatro
   * listas con los campos principales del libro.
   */
  static async obtenerCompleto(id: number) {
    const { baseDatos } = await conexionCompartida;
    const libro = await Libros.obtenerPorId(id);
    if (!libro) return undefined;

    const [listaResumenes, listaLexico, listaMapas, listaModulos] =
      await Promise.all([
        baseDatos
          .select()
          .from(resumenes)
          .where(igual(resumenes.libroId, id))
          .orderBy(ascendente(resumenes.capitulo)),
        baseDatos
          .select()
          .from(lexico)
          .where(igual(lexico.libroId, id))
          .orderBy(ascendente(lexico.termino)),
        baseDatos
          .select()
          .from(mapasConceptuales)
          .where(igual(mapasConceptuales.libroId, id)),
        baseDatos
          .select()
          .from(modulos)
          .where(igual(modulos.libroId, id))
          .orderBy(ascendente(modulos.orden)),
      ]);

    return {
      ...libro,
      resumenes: listaResumenes,
      lexico: listaLexico,
      mapasConceptuales: listaMapas,
      modulos: listaModulos,
    };
  }

  /** Algoritmo: normaliza los campos de texto presentes, actualiza solo esos
   * campos para el ID indicado y devuelve la fila o `undefined`.
   */
  static async actualizar(
    id: number,
    datos: Partial<Omit<typeof libros.$inferInsert, "id">>,
  ) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "titulo",
      "autor",
      "portadaUrl",
      "descripcion",
      "contenidoCompleto",
    ]);
    const [libroActualizado] = await baseDatos
      .update(libros)
      .set(datosNormalizados)
      .where(igual(libros.id, id))
      .returning();
    return libroActualizado;
  }

  /** Algoritmo: elimina por ID, deja que las claves foráneas en cascada borren
   * datos dependientes y devuelve si SQLite reportó una fila eliminada.
   */
  static async eliminar(id: number): Promise<boolean> {
    const { baseDatos } = await conexionCompartida;
    const eliminados = await baseDatos
      .delete(libros)
      .where(igual(libros.id, id))
      .returning({ id: libros.id });
    return eliminados.length > 0;
  }
}
