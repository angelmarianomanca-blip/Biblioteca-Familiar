import type { RequestHandler } from "express";
import { categorias } from "../../db/esquema.js";
import { Categorias } from "../../servicios/index.js";
import {
  ErrorHttp,
  leerCuerpo,
  leerIdParametro,
  quitarCampos,
} from "./http.js";

/** Lista categorías y su cantidad de libros. */
export const listarCategorias: RequestHandler = async (_solicitud, respuesta) => {
  respuesta.json(await Categorias.listar());
};

/** Valida un objeto JSON y crea una categoría. */
export const crearCategoria: RequestHandler = async (solicitud, respuesta) => {
  const datos = leerCuerpo<typeof categorias.$inferInsert>(solicitud);
  respuesta.status(201).json(await Categorias.crear(datos));
};

/** Actualiza una categoría existente sin permitir cambiar su ID. */
export const actualizarCategoria: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const id = leerIdParametro(solicitud, "id");
  const cuerpo = leerCuerpo<Record<string, unknown>>(solicitud);
  const datos = quitarCampos(cuerpo, ["id"]);
  const categoria = await Categorias.actualizar(
    id,
    datos as Partial<Omit<typeof categorias.$inferInsert, "id">>,
  );
  if (!categoria) throw new ErrorHttp(404, "No existe la categoría indicada.");
  respuesta.json(categoria);
};

/** Elimina la categoría y devuelve 204 cuando existe. */
export const eliminarCategoria: RequestHandler = async (
  solicitud,
  respuesta,
) => {
  const id = leerIdParametro(solicitud, "id");
  const eliminada = await Categorias.eliminar(id);
  if (!eliminada) throw new ErrorHttp(404, "No existe la categoría indicada.");
  respuesta.status(204).end();
};
