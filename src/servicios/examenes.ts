import {
  and as y,
  asc as ascendente,
  desc as descendente,
  eq as igual,
} from "drizzle-orm";
import { conexionCompartida } from "../db/instancia.js";
import {
  examenes,
  preguntas,
  resultadosExamen,
  type RespuestaCorrecta,
} from "../db/esquema.js";

/** Respuestas elegidas, indexadas por el ID de cada pregunta. */
export type RespuestasDeExamen = Partial<
  Record<number, RespuestaCorrecta>
>;

/** Consultas de exámenes, corrección de respuestas e historial de resultados. */
export class Examenes {
  /** Algoritmo: filtra los exámenes por resumen, ordena por ID y para cada
   * examen consulta sus preguntas ordenadas; devuelve cada examen anidado.
   */
  static async obtenerPorResumen(resumenId: number) {
    const { baseDatos } = await conexionCompartida;
    const listaExamenes = await baseDatos
      .select()
      .from(examenes)
      .where(igual(examenes.resumenId, resumenId))
      .orderBy(ascendente(examenes.id));

    // Cada fila del examen recibe su lista tipada de preguntas asociadas.
    return Promise.all(
      listaExamenes.map(async (examen) => ({
        ...examen,
        preguntas: await baseDatos
          .select()
          .from(preguntas)
          .where(igual(preguntas.examenId, examen.id))
          .orderBy(ascendente(preguntas.id)),
      })),
    );
  }

  /** Algoritmo: filtra los exámenes por libro, ordena por ID y consulta las
   * preguntas de cada resultado para devolver exámenes autocontenidos.
   */
  static async obtenerPorLibro(libroId: number) {
    const { baseDatos } = await conexionCompartida;
    const listaExamenes = await baseDatos
      .select()
      .from(examenes)
      .where(igual(examenes.libroId, libroId))
      .orderBy(ascendente(examenes.id));

    // Se consultan preguntas por examen para devolver un objeto autocontenido.
    return Promise.all(
      listaExamenes.map(async (examen) => ({
        ...examen,
        preguntas: await baseDatos
          .select()
          .from(preguntas)
          .where(igual(preguntas.examenId, examen.id))
          .orderBy(ascendente(preguntas.id)),
      })),
    );
  }

  /** Devuelve un examen con preguntas cuando pertenece al libro indicado. */
  static async obtenerPorIdDeLibro(libroId: number, id: number) {
    const { baseDatos } = await conexionCompartida;
    const [examen] = await baseDatos
      .select()
      .from(examenes)
      .where(y(igual(examenes.libroId, libroId), igual(examenes.id, id)))
      .limit(1);
    if (!examen) return undefined;

    const listaPreguntas = await baseDatos
      .select()
      .from(preguntas)
      .where(igual(preguntas.examenId, examen.id))
      .orderBy(ascendente(preguntas.id));
    return { ...examen, preguntas: listaPreguntas };
  }

  /**
   * Algoritmo: verifica que exista el examen; lee sus preguntas; compara la
   * respuesta elegida por cada ID con la correcta; cuenta omisiones como error;
   * calcula el porcentaje sobre preguntas existentes y guarda el resultado.
   * Un examen sin preguntas da 0%.
   */
  static async corregir(
    examenId: number,
    respuestas: RespuestasDeExamen,
    usuarioId = 1,
  ) {
    const { baseDatos } = await conexionCompartida;
    const [examen] = await baseDatos
      .select()
      .from(examenes)
      .where(igual(examenes.id, examenId))
      .limit(1);
    if (!examen) throw new Error(`No existe el examen ${examenId}.`);

    // La cantidad real de preguntas determina el denominador de la calificación.
    const listaPreguntas = await baseDatos
      .select()
      .from(preguntas)
      .where(igual(preguntas.examenId, examenId));
    const correctas = listaPreguntas.reduce(
      (acumulado, pregunta) =>
        acumulado +
        (respuestas[pregunta.id] === pregunta.respuestaCorrecta ? 1 : 0),
      0,
    );
    const incorrectas = listaPreguntas.length - correctas;
    const porcentaje = listaPreguntas.length
      ? Math.round((correctas / listaPreguntas.length) * 10000) / 100
      : 0;

    // El resultado y su fecha ISO se insertan juntos para preservar el historial.
    const [resultado] = await baseDatos
      .insert(resultadosExamen)
      .values({
        examenId,
        usuarioId,
        correctas,
        incorrectas,
        porcentaje,
        fecha: new Date().toISOString(),
      })
      .returning();

    return { resultado, examen, correctas, incorrectas, porcentaje };
  }

  /** Algoritmo: une resultados con sus exámenes, filtra por libro y ordena las
   * filas por fecha descendente para presentar primero el intento más reciente.
   */
  static async historialPorLibro(libroId: number, usuarioId = 1) {
    const { baseDatos } = await conexionCompartida;
    return baseDatos
      .select({ resultado: resultadosExamen, examen: examenes })
      .from(resultadosExamen)
      .innerJoin(examenes, igual(resultadosExamen.examenId, examenes.id))
      .where(
        y(
          igual(examenes.libroId, libroId),
          igual(resultadosExamen.usuarioId, usuarioId),
        ),
      )
      .orderBy(descendente(resultadosExamen.fecha));
  }

  /** Lista resultados de un examen limitado al libro de la ruta. */
  static async historialPorExamenDeLibro(
    libroId: number,
    examenId: number,
    usuarioId = 1,
  ) {
    const { baseDatos } = await conexionCompartida;
    return baseDatos
      .select({ resultado: resultadosExamen, examen: examenes })
      .from(resultadosExamen)
      .innerJoin(examenes, igual(resultadosExamen.examenId, examenes.id))
      .where(
        y(
          igual(examenes.libroId, libroId),
          igual(examenes.id, examenId),
          igual(resultadosExamen.usuarioId, usuarioId),
        ),
      )
      .orderBy(descendente(resultadosExamen.fecha));
  }
}
