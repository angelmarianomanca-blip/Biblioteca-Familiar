import {
  and as y,
  asc as ascendente,
  eq as igual,
  isNotNull as noEsNulo,
} from "drizzle-orm";
import { conexionCompartida } from "../db/instancia.js";
import {
  categorias,
  examenes,
  libros,
  modulos,
  progresoUsuario,
  recordatorios,
  resultadosExamen,
} from "../db/esquema.js";

/** Actualización de lectura y estadísticas generales del catálogo. */
export class Progreso {
  /** Obtiene la fila de progreso asociada al libro. */
  static async obtenerPorLibro(libroId: number, usuarioId = 1) {
    const { baseDatos } = await conexionCompartida;
    const [progreso] = await baseDatos
      .select()
      .from(progresoUsuario)
      .where(
        y(
          igual(progresoUsuario.libroId, libroId),
          igual(progresoUsuario.usuarioId, usuarioId),
        ),
      )
      .limit(1);
    return progreso;
  }

  /**
   * Algoritmo: busca el total de páginas; valida libro, rango y enteros;
   * calcula el avance redondeado; inserta o actualiza por `libroId` con la
   * fecha actual y marca completado solo al llegar a la última página.
   */
  static async actualizarPagina(
    libroId: number,
    paginaActual: number,
    usuarioId = 1,
  ) {
    const { baseDatos } = await conexionCompartida;
    const [libro] = await baseDatos
      .select({ totalPaginas: libros.totalPaginas })
      .from(libros)
      .where(igual(libros.id, libroId))
      .limit(1);
    if (!libro) throw new Error(`No existe el libro ${libroId}.`);

    // Se rechazan páginas fuera de rango antes de escribir y se limita el
    // cálculo a enteros, tal como requiere la página actual del esquema.
    if (
      !Number.isInteger(paginaActual) ||
      paginaActual < 0 ||
      paginaActual > libro.totalPaginas
    ) {
      throw new RangeError(
        `La página debe ser un entero entre 0 y ${libro.totalPaginas}.`,
      );
    }
    if (libro.totalPaginas <= 0) {
      throw new RangeError("El libro debe tener al menos una página.");
    }

    const porcentaje = Math.round((paginaActual / libro.totalPaginas) * 100);
    const ahora = new Date().toISOString();
    const [progresoActualizado] = await baseDatos
      .insert(progresoUsuario)
      .values({
        libroId,
        usuarioId,
        paginaActual,
        completado: paginaActual === libro.totalPaginas,
        ultimaLectura: ahora,
        porcentaje,
      })
      .onConflictDoUpdate({
        target: [progresoUsuario.libroId, progresoUsuario.usuarioId],
        set: {
          paginaActual,
          completado: paginaActual === libro.totalPaginas,
          ultimaLectura: ahora,
          porcentaje,
        },
      })
      .returning();
    return progresoActualizado;
  }

  /**
   * Algoritmo: busca la cantidad de páginas, rechaza un ID inexistente o un
   * libro sin páginas y crea/actualiza el progreso con página final, 100%,
   * estado completado y fecha ISO actual.
   */
  static async marcarLibroCompletado(libroId: number, usuarioId = 1) {
    const { baseDatos } = await conexionCompartida;
    const [libro] = await baseDatos
      .select({ totalPaginas: libros.totalPaginas })
      .from(libros)
      .where(igual(libros.id, libroId))
      .limit(1);
    if (!libro) throw new Error(`No existe el libro ${libroId}.`);
    if (libro.totalPaginas <= 0) {
      throw new RangeError("El libro debe tener al menos una página.");
    }

    const ahora = new Date().toISOString();
    const [progresoCompletado] = await baseDatos
      .insert(progresoUsuario)
      .values({
        libroId,
        usuarioId,
        paginaActual: libro.totalPaginas,
        completado: true,
        ultimaLectura: ahora,
        porcentaje: 100,
      })
      .onConflictDoUpdate({
        target: [progresoUsuario.libroId, progresoUsuario.usuarioId],
        set: {
          paginaActual: libro.totalPaginas,
          completado: true,
          ultimaLectura: ahora,
          porcentaje: 100,
        },
      })
      .returning();
    return progresoCompletado;
  }

  /**
   * Algoritmo: consulta libros con progreso, categorías con libros, exámenes
   * con intentos, módulos finalizados y próximos recordatorios; calcula los
   * contadores y promedios, combina actividades fechadas y devuelve las diez
   * más recientes junto con la lista de libros todavía en lectura.
   */
  static async obtenerEstadisticas(usuarioId = 1) {
    const { baseDatos } = await conexionCompartida;
    const filasLibros = await baseDatos
      .select({
        libroId: libros.id,
        titulo: libros.titulo,
        categoriaId: categorias.id,
        categoriaNombre: categorias.nombre,
        porcentaje: progresoUsuario.porcentaje,
        completado: progresoUsuario.completado,
        paginaActual: progresoUsuario.paginaActual,
        ultimaLectura: progresoUsuario.ultimaLectura,
      })
      .from(libros)
      .leftJoin(categorias, igual(libros.categoriaId, categorias.id))
      .leftJoin(
        progresoUsuario,
        y(
          igual(libros.id, progresoUsuario.libroId),
          igual(progresoUsuario.usuarioId, usuarioId),
        ),
      );

    const librosCompletados = filasLibros.filter(
      (fila) => fila.completado === true,
    ).length;
    const librosEnProgreso = filasLibros.filter(
      (fila) => fila.completado === false && (fila.paginaActual ?? 0) > 0,
    );
    const sumaPorcentajes = filasLibros.reduce(
      (suma, fila) => suma + (fila.porcentaje ?? 0),
      0,
    );
    const porcentajeGlobal = filasLibros.length
      ? Math.round((sumaPorcentajes / filasLibros.length) * 100) / 100
      : 0;
    const porcentajePromedioEnProgreso = librosEnProgreso.length
      ? Math.round(
          (librosEnProgreso.reduce(
            (suma, fila) => suma + (fila.porcentaje ?? 0),
            0,
          ) /
            librosEnProgreso.length) *
            100,
        ) / 100
      : 0;

    // El promedio de cada categoría incluye los libros todavía sin empezar.
    const filasCategorias = await baseDatos
      .select({
        categoriaId: categorias.id,
        nombre: categorias.nombre,
        libroId: libros.id,
        porcentaje: progresoUsuario.porcentaje,
      })
      .from(categorias)
      .leftJoin(libros, igual(libros.categoriaId, categorias.id))
      .leftJoin(
        progresoUsuario,
        y(
          igual(libros.id, progresoUsuario.libroId),
          igual(progresoUsuario.usuarioId, usuarioId),
        ),
      );
    const categoriasAgrupadas = new Map();
    for (const fila of filasCategorias) {
      if (!categoriasAgrupadas.has(fila.categoriaId)) {
        categoriasAgrupadas.set(fila.categoriaId, {
          categoriaId: fila.categoriaId,
          nombre: fila.nombre,
          totalLibros: 0,
          sumaPorcentajes: 0,
        });
      }
      const categoriaAgrupada = categoriasAgrupadas.get(fila.categoriaId);
      if (fila.libroId !== null) {
        categoriaAgrupada.totalLibros += 1;
        categoriaAgrupada.sumaPorcentajes += fila.porcentaje ?? 0;
      }
    }
    const progresoPorCategoria = [...categoriasAgrupadas.values()].map(
      (categoriaAgrupada) => ({
        categoriaId: categoriaAgrupada.categoriaId,
        nombre: categoriaAgrupada.nombre,
        totalLibros: categoriaAgrupada.totalLibros,
        porcentajePromedio: categoriaAgrupada.totalLibros
          ? Math.round(
              (categoriaAgrupada.sumaPorcentajes /
                categoriaAgrupada.totalLibros) *
                100,
            ) / 100
          : 0,
      }),
    );

    // Cada examen cuenta una sola vez y queda aprobado al tener algún intento
    // igual o superior al 70 por ciento.
    const filasExamenes = await baseDatos
      .select({
        examenId: examenes.id,
        tituloExamen: examenes.titulo,
        libroId: libros.id,
        tituloLibro: libros.titulo,
        resultadoId: resultadosExamen.id,
        porcentaje: resultadosExamen.porcentaje,
        fecha: resultadosExamen.fecha,
      })
      .from(examenes)
      .innerJoin(libros, igual(examenes.libroId, libros.id))
      .leftJoin(
        resultadosExamen,
        y(
          igual(examenes.id, resultadosExamen.examenId),
          igual(resultadosExamen.usuarioId, usuarioId),
        ),
      );
    const estadoExamenes = new Map();
    const actividadReciente = [];
    for (const fila of filasExamenes) {
      if (!estadoExamenes.has(fila.examenId)) {
        estadoExamenes.set(fila.examenId, false);
      }
      if (fila.porcentaje !== null) {
        if (fila.porcentaje >= 70) estadoExamenes.set(fila.examenId, true);
        if (fila.fecha) {
          actividadReciente.push({
            id: `examen-${fila.resultadoId}`,
            tipo: "examen",
            descripcion: `Obtuviste ${fila.porcentaje}% en «${fila.tituloExamen}»`,
            libroId: fila.libroId,
            libroTitulo: fila.tituloLibro,
            fecha: fila.fecha,
          });
        }
      }
    }
    const examenesAprobados = [...estadoExamenes.values()].filter(Boolean).length;

    // El último avance guardado de cada libro sirve como su actividad reciente.
    for (const fila of filasLibros) {
      if (fila.ultimaLectura && (fila.paginaActual ?? 0) > 0) {
        actividadReciente.push({
          id: `lectura-${fila.libroId}`,
          tipo: "lectura",
          descripcion: `Leíste hasta la página ${fila.paginaActual}`,
          libroId: fila.libroId,
          libroTitulo: fila.titulo,
          fecha: fila.ultimaLectura,
        });
      }
    }

    // Los módulos solo se muestran como actividad cuando se guardó su fecha.
    const filasModulosCompletados = await baseDatos
      .select({
        moduloId: modulos.id,
        tituloModulo: modulos.titulo,
        libroId: libros.id,
        tituloLibro: libros.titulo,
        fecha: modulos.fechaCompletado,
      })
      .from(modulos)
      .innerJoin(libros, igual(modulos.libroId, libros.id))
      .where(
        y(
          igual(modulos.completado, true),
          noEsNulo(modulos.fechaCompletado),
        ),
      );
    for (const fila of filasModulosCompletados) {
      if (fila.fecha) {
        actividadReciente.push({
          id: `modulo-${fila.moduloId}`,
          tipo: "modulo",
          descripcion: `Completaste «${fila.tituloModulo}»`,
          libroId: fila.libroId,
          libroTitulo: fila.tituloLibro,
          fecha: fila.fecha,
        });
      }
    }

    actividadReciente.sort(
      (primera, segunda) =>
        new Date(segunda.fecha).getTime() - new Date(primera.fecha).getTime(),
    );

    // Se consideran recordatorios activos y pendientes, incluidos los vencidos,
    // para mostrar el aviso más próximo que todavía requiere atención.
    const filasRecordatorios = await baseDatos
      .select({
        libroId: recordatorios.libroId,
        mensaje: recordatorios.mensaje,
        fechaHora: recordatorios.fechaHora,
      })
      .from(recordatorios)
      .where(
        y(
          igual(recordatorios.activo, true),
          igual(recordatorios.notificado, false),
          igual(recordatorios.usuarioId, usuarioId),
        ),
      )
      .orderBy(ascendente(recordatorios.fechaHora));
    const siguienteRecordatorioPorLibro = new Map();
    for (const recordatorio of filasRecordatorios) {
      if (!siguienteRecordatorioPorLibro.has(recordatorio.libroId)) {
        siguienteRecordatorioPorLibro.set(recordatorio.libroId, {
          mensaje: recordatorio.mensaje,
          fechaHora: recordatorio.fechaHora,
        });
      }
    }

    const librosPorCompletar = librosEnProgreso
      .map((fila) => ({
        libroId: fila.libroId,
        titulo: fila.titulo,
        porcentaje: fila.porcentaje ?? 0,
        siguienteRecordatorio:
          siguienteRecordatorioPorLibro.get(fila.libroId) ?? null,
      }))
      .sort((primero, segundo) => segundo.porcentaje - primero.porcentaje);

    const resumen = {
      totalLibros: filasLibros.length,
      librosEnProgreso: librosEnProgreso.length,
      porcentajePromedioEnProgreso,
      librosCompletados,
      examenesAprobados,
      totalExamenes: estadoExamenes.size,
      porcentajeGlobal,
    };

    // Se conservan los campos previos de la respuesta para no romper clientes.
    return {
      ...resumen,
      librosLeidos: librosCompletados,
      resumen,
      progresoPorCategoria,
      actividadReciente: actividadReciente.slice(0, 10),
      librosPorCompletar,
    };
  }
}
