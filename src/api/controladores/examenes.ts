import type { RequestHandler } from "express";
import type { RespuestaCorrecta } from "../../db/esquema.js";
import { Examenes, type RespuestasDeExamen } from "../../servicios/examenes.js";
import {
  ErrorHttp,
  leerCuerpo,
  leerIdParametro,
  leerIdTexto,
  leerUsuarioId,
} from "./http.js";

/** Lista los exámenes de un libro con sus preguntas. */
export const listarExamenes: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  respuesta.json(await Examenes.obtenerPorLibro(libroId));
};

/** Obtiene un examen y sus preguntas cuando pertenece al libro de la ruta. */
export const obtenerExamen: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const id = leerIdParametro(solicitud, "id");
  const examen = await Examenes.obtenerPorIdDeLibro(libroId, id);
  if (!examen) throw new ErrorHttp(404, "No existe el examen en ese libro.");
  respuesta.json(examen);
};

/** Valida letras e IDs de las respuestas y guarda la corrección del examen. */
export const corregirExamen: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const examenId = leerIdParametro(solicitud, "id");
  const usuarioId = await leerUsuarioId(solicitud);
  const examen = await Examenes.obtenerPorIdDeLibro(libroId, examenId);
  if (!examen) throw new ErrorHttp(404, "No existe el examen en ese libro.");

  const cuerpo = leerCuerpo<{ respuestas?: unknown }>(solicitud);
  const respuestasRecibidas = cuerpo.respuestas;
  if (
    respuestasRecibidas === null ||
    typeof respuestasRecibidas !== "object" ||
    Array.isArray(respuestasRecibidas)
  ) {
    throw new ErrorHttp(400, "respuestas debe ser un objeto JSON.");
  }

  const respuestas: RespuestasDeExamen = {};
  for (const [idTexto, opcion] of Object.entries(respuestasRecibidas)) {
    const preguntaId = leerIdTexto(idTexto, "preguntaId");
    if (!esRespuestaCorrecta(opcion)) {
      throw new ErrorHttp(400, "Cada respuesta debe ser A, B, C o D.");
    }
    respuestas[preguntaId] = opcion;
  }

  respuesta.json(await Examenes.corregir(examenId, respuestas, usuarioId));
};

/** Devuelve el historial solo si el examen pertenece al libro indicado. */
export const listarResultados: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const libroId = leerIdParametro(solicitud, "libroId");
  const examenId = leerIdParametro(solicitud, "id");
  const usuarioId = await leerUsuarioId(solicitud);
  const examen = await Examenes.obtenerPorIdDeLibro(libroId, examenId);
  if (!examen) throw new ErrorHttp(404, "No existe el examen en ese libro.");
  respuesta.json(
    await Examenes.historialPorExamenDeLibro(libroId, examenId, usuarioId),
  );
};

/** Comprueba que el valor recibido sea una letra de respuesta admitida. */
function esRespuestaCorrecta(valor: unknown): valor is RespuestaCorrecta {
  return valor === "A" || valor === "B" || valor === "C" || valor === "D";
}
