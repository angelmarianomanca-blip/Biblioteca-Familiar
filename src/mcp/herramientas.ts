import type {
  McpServer,
  StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {
  Categorias,
  Examenes,
  Lexico,
  Libros,
  MapasConceptuales,
  Modulos,
  Progreso,
  Recordatorios,
  Resumenes,
  Usuarios,
} from "../servicios/index.js";

// Los identificadores de entrada son números JSON enteros y positivos.
const esquemaId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const esquemaRespuesta = z.enum(["A", "B", "C", "D"]);

// Exige una fecha ISO 8601 válida con zona horaria para guardar un instante
// que tenga el mismo significado al consultarlo desde otro equipo.
const esquemaFechaHora = z.string().refine(
  (valor) =>
    !Number.isNaN(Date.parse(valor)) &&
    /(?:Z|[+-]\d{2}:\d{2})$/u.test(valor),
  "Usa una fecha ISO 8601 con zona horaria, por ejemplo 2026-10-25T18:30:00Z.",
);

/** Convierte cada resultado de servicio en texto JSON que un cliente MCP puede mostrar. */
function respuestaCorrecta(datos: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(datos, null, 2) }],
  };
}

/** Devuelve errores legibles como errores de herramienta, sin romper la conexión MCP. */
function respuestaConError(operacion: string, error: unknown) {
  const detalle = error instanceof Error ? error.message : "Error desconocido.";
  return {
    isError: true,
    content: [{
      type: "text" as const,
      text: `No se pudo ${operacion}. ${detalle}`,
    }],
  };
}

/** Verifica que una operación que depende de un libro use un ID existente. */
async function exigirLibro(libroId: number) {
  const libro = await Libros.obtenerPorId(libroId);
  if (!libro) throw new Error(`No existe el libro ${libroId}.`);
  return libro;
}

/** Registra una acción repetible con respuesta uniforme y captura de errores. */
function registrarOperacion<
  TEsquema extends z.ZodObject<z.ZodRawShape> & StandardSchemaWithJSON,
>(
  servidor: McpServer,
  nombre: string,
  descripcion: string,
  esquema: TEsquema,
  accion: (entrada: z.infer<TEsquema>) => Promise<unknown>,
) {
  servidor.registerTool<never, StandardSchemaWithJSON>(
    nombre,
    { description: descripcion, inputSchema: esquema as StandardSchemaWithJSON },
    async (entrada) => {
      try {
        return respuestaCorrecta(await accion(entrada as z.infer<TEsquema>));
      } catch (error) {
        return respuestaConError(descripcion.toLocaleLowerCase("es"), error);
      }
    },
  );
}

// Esquemas de los objetos que el formulario de administración ya utiliza.
const esquemaCamposLibro = z.object({
  categoriaId: esquemaId,
  titulo: z.string().trim().min(1),
  autor: z.string().trim().min(1),
  portadaUrl: z.string(),
  descripcion: z.string(),
  contenidoCompleto: z.string(),
  totalPaginas: z.number().int().positive(),
}).strict();
const esquemaCamposResumen = z.object({
  capitulo: z.number().int().positive(),
  tituloCapitulo: z.string().trim().min(1),
  contenido: z.string().trim().min(1),
  orden: z.number().int().positive(),
}).strict();
const esquemaCamposLexico = z.object({
  termino: z.string().trim().min(1),
  definicion: z.string().trim().min(1),
  ejemplo: z.string().nullable().optional(),
}).strict();
const esquemaNodoConceptual = z.object({
  id: z.string(),
  etiqueta: z.string(),
}).strict();
const esquemaConexionConceptual = z.object({
  origen: z.string(),
  destino: z.string(),
  etiqueta: z.string(),
}).strict();
const esquemaCamposMapa = z.object({
  resumenId: esquemaId.nullable().optional(),
  titulo: z.string().trim().min(1),
  datosNodos: z.array(esquemaNodoConceptual),
  datosConexiones: z.array(esquemaConexionConceptual),
}).strict();

/** Registra herramientas MCP del catálogo sobre las clases de servicio existentes. */
export function registrarHerramientas(servidor: McpServer) {
  // Las siguientes herramientas completan la cobertura que necesita la web:
  // todas llaman directamente a los mismos servicios usados por los routers.
  registrarOperacion(
    servidor,
    "listar_usuarios",
    "Listar los perfiles disponibles para la biblioteca.",
    z.object({}).strict(),
    async () => Usuarios.listar(),
  );

  registrarOperacion(
    servidor,
    "listar_categorias",
    "Listar categorías con su cantidad de libros.",
    z.object({}).strict(),
    async () => Categorias.listar(),
  );

  registrarOperacion(
    servidor,
    "obtener_libro_completo",
    "Obtener el libro completo con resúmenes, léxico, mapas y módulos.",
    z.object({ libroId: esquemaId }).strict(),
    async ({ libroId }) => {
      const libro = await Libros.obtenerCompleto(libroId);
      if (!libro) throw new Error(`No existe el libro ${libroId}.`);
      return libro;
    },
  );

  registrarOperacion(
    servidor,
    "crear_libro",
    "Crear un libro con sus datos de catálogo.",
    z.object({ datos: esquemaCamposLibro }).strict(),
    async ({ datos }) => Libros.crear(datos),
  );

  registrarOperacion(
    servidor,
    "actualizar_libro",
    "Actualizar los campos de un libro existente.",
    z.object({ libroId: esquemaId, datos: esquemaCamposLibro.partial() }).strict(),
    async ({ libroId, datos }) => {
      const actualizado = await Libros.actualizar(libroId, datos);
      if (!actualizado) throw new Error(`No existe el libro ${libroId}.`);
      return actualizado;
    },
  );

  registrarOperacion(
    servidor,
    "eliminar_libro",
    "Eliminar un libro y su contenido dependiente por completo.",
    z.object({ libroId: esquemaId }).strict(),
    async ({ libroId }) => {
      const eliminado = await Libros.eliminar(libroId);
      if (!eliminado) throw new Error(`No existe el libro ${libroId}.`);
      return { eliminado: true, libroId };
    },
  );

  registrarOperacion(
    servidor,
    "eliminar_categoria",
    "Eliminar una categoría y sus libros asociados.",
    z.object({ categoriaId: esquemaId }).strict(),
    async ({ categoriaId }) => {
      const eliminada = await Categorias.eliminar(categoriaId);
      if (!eliminada) throw new Error(`No existe la categoría ${categoriaId}.`);
      return { eliminada: true, categoriaId };
    },
  );

  registrarOperacion(
    servidor,
    "crear_resumen",
    "Crear un resumen asociado al libro indicado.",
    z.object({ libroId: esquemaId, datos: esquemaCamposResumen }).strict(),
    async ({ libroId, datos }) => {
      await exigirLibro(libroId);
      return Resumenes.crear({ ...datos, libroId });
    },
  );

  registrarOperacion(
    servidor,
    "actualizar_resumen",
    "Actualizar un resumen sin cambiar su libro asociado.",
    z.object({
      libroId: esquemaId,
      resumenId: esquemaId,
      datos: esquemaCamposResumen.partial(),
    }).strict(),
    async ({ libroId, resumenId, datos }) => {
      const actualizado = await Resumenes.actualizarDeLibro(libroId, resumenId, datos);
      if (!actualizado) throw new Error("No existe el resumen en ese libro.");
      return actualizado;
    },
  );

  registrarOperacion(
    servidor,
    "eliminar_resumen",
    "Eliminar un resumen del libro indicado.",
    z.object({ libroId: esquemaId, resumenId: esquemaId }).strict(),
    async ({ libroId, resumenId }) => {
      if (!await Resumenes.eliminarDeLibro(libroId, resumenId)) {
        throw new Error("No existe el resumen en ese libro.");
      }
      return { eliminado: true, resumenId };
    },
  );

  registrarOperacion(
    servidor,
    "crear_termino_lexico",
    "Agregar un término al léxico de un libro.",
    z.object({ libroId: esquemaId, datos: esquemaCamposLexico }).strict(),
    async ({ libroId, datos }) => {
      await exigirLibro(libroId);
      return Lexico.crear({ ...datos, libroId });
    },
  );

  registrarOperacion(
    servidor,
    "actualizar_termino_lexico",
    "Actualizar un término léxico del libro indicado.",
    z.object({
      libroId: esquemaId,
      terminoId: esquemaId,
      datos: esquemaCamposLexico.partial(),
    }).strict(),
    async ({ libroId, terminoId, datos }) => {
      const actualizado = await Lexico.actualizarDeLibro(libroId, terminoId, datos);
      if (!actualizado) throw new Error("No existe el término en ese libro.");
      return actualizado;
    },
  );

  registrarOperacion(
    servidor,
    "eliminar_termino_lexico",
    "Eliminar un término léxico del libro indicado.",
    z.object({ libroId: esquemaId, terminoId: esquemaId }).strict(),
    async ({ libroId, terminoId }) => {
      if (!await Lexico.eliminarDeLibro(libroId, terminoId)) {
        throw new Error("No existe el término en ese libro.");
      }
      return { eliminado: true, terminoId };
    },
  );

  registrarOperacion(
    servidor,
    "obtener_mapas",
    "Listar mapas conceptuales de un libro.",
    z.object({ libroId: esquemaId }).strict(),
    async ({ libroId }) => MapasConceptuales.obtenerPorLibro(libroId),
  );

  registrarOperacion(
    servidor,
    "crear_mapa",
    "Crear un mapa conceptual y guardar sus nodos y conexiones.",
    z.object({ libroId: esquemaId, datos: esquemaCamposMapa }).strict(),
    async ({ libroId, datos }) => {
      await exigirLibro(libroId);
      return MapasConceptuales.guardar({ ...datos, libroId });
    },
  );

  registrarOperacion(
    servidor,
    "actualizar_mapa",
    "Actualizar el título, los nodos o las conexiones de un mapa.",
    z.object({
      libroId: esquemaId,
      mapaId: esquemaId,
      datos: esquemaCamposMapa.partial(),
    }).strict(),
    async ({ libroId, mapaId, datos }) => {
      const actualizado = await MapasConceptuales.actualizar(mapaId, datos, libroId);
      if (!actualizado) throw new Error("No existe el mapa en ese libro.");
      return actualizado;
    },
  );

  registrarOperacion(
    servidor,
    "actualizar_progreso",
    "Guardar la página actual y recalcular el avance del libro.",
    z.object({ libroId: esquemaId, paginaActual: z.number().int().nonnegative(), usuarioId: esquemaId.optional() }).strict(),
    async ({ libroId, paginaActual, usuarioId }) => Progreso.actualizarPagina(libroId, paginaActual, usuarioId ?? 1),
  );

  registrarOperacion(
    servidor,
    "completar_lectura",
    "Marcar un libro como completado.",
    z.object({ libroId: esquemaId, usuarioId: esquemaId.optional() }).strict(),
    async ({ libroId, usuarioId }) => Progreso.marcarLibroCompletado(libroId, usuarioId ?? 1),
  );

  registrarOperacion(
    servidor,
    "listar_modulos",
    "Listar módulos ordenados de un libro.",
    z.object({ libroId: esquemaId }).strict(),
    async ({ libroId }) => Modulos.listarPorLibro(libroId),
  );

  registrarOperacion(
    servidor,
    "completar_modulo",
    "Marcar como completado un módulo del libro indicado.",
    z.object({ libroId: esquemaId, moduloId: esquemaId }).strict(),
    async ({ libroId, moduloId }) => {
      const modulo = await Modulos.marcarComoCompletado(moduloId, libroId);
      if (!modulo) throw new Error("No existe el módulo en ese libro.");
      return modulo;
    },
  );

  registrarOperacion(
    servidor,
    "obtener_examenes",
    "Listar exámenes y preguntas de un libro.",
    z.object({ libroId: esquemaId }).strict(),
    async ({ libroId }) => Examenes.obtenerPorLibro(libroId),
  );

  registrarOperacion(
    servidor,
    "obtener_examen",
    "Obtener las preguntas de un examen del libro indicado.",
    z.object({ libroId: esquemaId, examenId: esquemaId }).strict(),
    async ({ libroId, examenId }) => {
      const examen = await Examenes.obtenerPorIdDeLibro(libroId, examenId);
      if (!examen) throw new Error("No existe el examen en ese libro.");
      return examen;
    },
  );

  registrarOperacion(
    servidor,
    "historial_examen",
    "Consultar intentos anteriores de un examen del libro indicado.",
    z.object({ libroId: esquemaId, examenId: esquemaId, usuarioId: esquemaId.optional() }).strict(),
    async ({ libroId, examenId, usuarioId }) => {
      const examen = await Examenes.obtenerPorIdDeLibro(libroId, examenId);
      if (!examen) throw new Error("No existe el examen en ese libro.");
      return Examenes.historialPorExamenDeLibro(libroId, examenId, usuarioId ?? 1);
    },
  );

  // La búsqueda admite texto vacío para listar el catálogo y un filtro opcional
  // de categoría; el servicio compara título, autor y nombre de categoría.
  servidor.registerTool(
    "buscar_libros",
    {
      description:
        "Busca libros por título, autor o categoría. Se puede combinar con categoriaId; sin filtros devuelve todo el catálogo.",
      inputSchema: z.object({
        busqueda: z.string().trim().optional(),
        categoriaId: esquemaId.optional(),
      }).strict(),
    },
    async ({ busqueda, categoriaId }) => {
      try {
        return respuestaCorrecta(await Libros.listarConFiltros({
          busqueda,
          categoriaId,
        }));
      } catch (error) {
        return respuestaConError("buscar libros", error);
      }
    },
  );

  // Los resúmenes se consultan por libro y mantienen el orden por capítulo
  // que aplica el servicio de dominio.
  servidor.registerTool(
    "obtener_resumenes",
    {
      description: "Lista los resúmenes de un libro ordenados por capítulo.",
      inputSchema: z.object({ libroId: esquemaId }).strict(),
    },
    async ({ libroId }) => {
      try {
        await exigirLibro(libroId);
        return respuestaCorrecta(await Resumenes.listarPorLibro(libroId));
      } catch (error) {
        return respuestaConError("obtener los resúmenes", error);
      }
    },
  );

  // El servicio realiza la búsqueda sin distinguir mayúsculas ni acentos;
  // aquí se conserva el orden alfabético en cualquier modalidad de consulta.
  servidor.registerTool(
    "obtener_lexico",
    {
      description:
        "Lista el léxico de un libro, ordenado alfabéticamente, y permite filtrar por término o definición.",
      inputSchema: z.object({
        libroId: esquemaId,
        busqueda: z.string().trim().optional(),
      }).strict(),
    },
    async ({ libroId, busqueda }) => {
      try {
        await exigirLibro(libroId);
        const terminos = await Lexico.buscar(busqueda ?? "", libroId);
        terminos.sort((primero, segundo) =>
          primero.termino.localeCompare(segundo.termino, "es"),
        );
        return respuestaCorrecta(terminos);
      } catch (error) {
        return respuestaConError("obtener el léxico", error);
      }
    },
  );

  // Las claves de respuestas llegan como texto en JSON; se convierten a
  // identificadores numéricos antes de entregarlas al servicio de corrección.
  servidor.registerTool(
    "corregir_examen",
    {
      description:
        "Corrige un examen, guarda el intento y devuelve el puntaje y el desglose de respuestas.",
      inputSchema: z.object({
        libroId: esquemaId.optional(),
        examenId: esquemaId,
        usuarioId: esquemaId.optional(),
        respuestas: z.record(
          z.string()
            .regex(/^[1-9]\d*$/u, "La clave debe ser un ID de pregunta positivo.")
            .refine(
              (id) => Number.isSafeInteger(Number(id)),
              "El ID de pregunta debe ser un entero seguro.",
            ),
          esquemaRespuesta,
        ),
      }).strict(),
    },
    async ({ libroId, examenId, respuestas, usuarioId }) => {
      try {
        if (libroId !== undefined && !await Examenes.obtenerPorIdDeLibro(libroId, examenId)) {
          throw new Error("No existe el examen en ese libro.");
        }
        const respuestasNumericas = Object.fromEntries(
          Object.entries(respuestas).map(([id, respuesta]) => [Number(id), respuesta]),
        );
        return respuestaCorrecta(
          await Examenes.corregir(examenId, respuestasNumericas, usuarioId ?? 1),
        );
      } catch (error) {
        return respuestaConError("corregir el examen", error);
      }
    },
  );

  // Distingue un libro sin progreso (respuesta null) de un libro inexistente.
  servidor.registerTool(
    "consultar_progreso",
    {
      description: "Consulta el avance de lectura guardado para un libro.",
      inputSchema: z.object({ libroId: esquemaId, usuarioId: esquemaId.optional() }).strict(),
    },
    async ({ libroId, usuarioId }) => {
      try {
        await exigirLibro(libroId);
        return respuestaCorrecta({
          libroId,
          usuarioId: usuarioId ?? 1,
          progreso: await Progreso.obtenerPorLibro(libroId, usuarioId ?? 1) ?? null,
        });
      } catch (error) {
        return respuestaConError("consultar el progreso", error);
      }
    },
  );

  // La herramienta de estadísticas no recibe parámetros y delega los cálculos
  // a la misma clase que usa la API REST.
  servidor.registerTool(
    "consultar_estadisticas",
    {
      description:
        "Devuelve estadísticas generales de lectura, exámenes, categorías y actividad reciente.",
      inputSchema: z.object({ usuarioId: esquemaId.optional() }).strict(),
    },
    async ({ usuarioId }) => {
      try {
        return respuestaCorrecta(await Progreso.obtenerEstadisticas(usuarioId ?? 1));
      } catch (error) {
        return respuestaConError("consultar las estadísticas", error);
      }
    },
  );

  // Permite listar los recordatorios de toda la biblioteca o de un libro.
  servidor.registerTool(
    "listar_recordatorios",
    {
      description: "Lista recordatorios y permite filtrarlos por libro.",
      inputSchema: z.object({ libroId: esquemaId.optional(), usuarioId: esquemaId.optional() }).strict(),
    },
    async ({ libroId, usuarioId }) => {
      try {
        if (libroId !== undefined) await exigirLibro(libroId);
        return respuestaCorrecta(await Recordatorios.listar(libroId, usuarioId ?? 1));
      } catch (error) {
        return respuestaConError("listar los recordatorios", error);
      }
    },
  );

  // Solo incluye recordatorios activos, pendientes de notificación y vencidos.
  servidor.registerTool(
    "listar_recordatorios_pendientes",
    {
      description:
        "Lista recordatorios activos no notificados cuya fecha y hora ya vencieron.",
      inputSchema: z.object({ usuarioId: esquemaId.optional() }).strict(),
    },
    async ({ usuarioId }) => {
      try {
        return respuestaCorrecta(await Recordatorios.obtenerPendientes(new Date(), usuarioId ?? 1));
      } catch (error) {
        return respuestaConError("listar los recordatorios pendientes", error);
      }
    },
  );

  // Al crear se fijan los indicadores iniciales para que el aviso sea visible
  // y pueda aparecer en la consulta de pendientes al llegar su fecha.
  servidor.registerTool(
    "crear_recordatorio",
    {
      description: "Programa un recordatorio para un libro existente.",
      inputSchema: z.object({
        libroId: esquemaId,
        usuarioId: esquemaId.optional(),
        mensaje: z.string().trim().min(1, "El mensaje no puede estar vacío."),
        fechaHora: esquemaFechaHora,
      }).strict(),
    },
    async ({ libroId, usuarioId, mensaje, fechaHora }) => {
      try {
        await exigirLibro(libroId);
        return respuestaCorrecta(await Recordatorios.crear({
          libroId,
          usuarioId: usuarioId ?? 1,
          mensaje,
          fechaHora,
          activo: true,
          notificado: false,
        }));
      } catch (error) {
        return respuestaConError("crear el recordatorio", error);
      }
    },
  );

  // La clase Recordatorios protege en base de datos los avisos ya notificados;
  // este esquema también rechaza una edición sin cambios que aplicar.
  servidor.registerTool(
    "actualizar_recordatorio",
    {
      description:
        "Edita un recordatorio todavía no notificado. Los recordatorios completados no se pueden editar.",
      inputSchema: z.object({
        id: esquemaId,
        usuarioId: esquemaId.optional(),
        mensaje: z.string().trim().min(1).optional(),
        fechaHora: esquemaFechaHora.optional(),
        activo: z.boolean().optional(),
      }).strict().refine(
        ({ mensaje, fechaHora, activo }) =>
          mensaje !== undefined || fechaHora !== undefined || activo !== undefined,
        "Indica al menos un campo para actualizar.",
      ),
    },
    async ({ id, usuarioId, ...cambios }) => {
      try {
        const actualizado = await Recordatorios.actualizar(id, cambios, usuarioId ?? 1);
        if (!actualizado) {
          throw new Error(
            "No existe el recordatorio o ya fue notificado y no se puede editar.",
          );
        }
        return respuestaCorrecta(actualizado);
      } catch (error) {
        return respuestaConError("actualizar el recordatorio", error);
      }
    },
  );

  // La eliminación informa claramente si el identificador no estaba guardado.
  servidor.registerTool(
    "eliminar_recordatorio",
    {
      description: "Elimina un recordatorio por su ID.",
      inputSchema: z.object({ id: esquemaId, usuarioId: esquemaId.optional() }).strict(),
    },
    async ({ id, usuarioId }) => {
      try {
        if (!await Recordatorios.eliminar(id, usuarioId ?? 1)) {
          throw new Error(`No existe el recordatorio ${id}.`);
        }
        return respuestaCorrecta({ eliminado: true, id });
      } catch (error) {
        return respuestaConError("eliminar el recordatorio", error);
      }
    },
  );

  // Marca el aviso como atendido y evita que vuelva a salir entre pendientes.
  servidor.registerTool(
    "marcar_recordatorio_notificado",
    {
      description: "Marca un recordatorio como notificado o leído.",
      inputSchema: z.object({ id: esquemaId, usuarioId: esquemaId.optional() }).strict(),
    },
    async ({ id, usuarioId }) => {
      try {
        const actualizado = await Recordatorios.marcarComoNotificado(id, usuarioId ?? 1);
        if (!actualizado) throw new Error(`No existe el recordatorio ${id}.`);
        return respuestaCorrecta(actualizado);
      } catch (error) {
        return respuestaConError("marcar el recordatorio", error);
      }
    },
  );
}
