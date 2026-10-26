import {
  and as y,
  asc as ascendente,
  eq as igual,
  lte as menorOIgual,
} from "drizzle-orm";
import { conexionCompartida } from "../db/instancia.js";
import { recordatorios } from "../db/esquema.js";
import { normalizarCamposDeTexto } from "./normalizacion.js";

/** Mantenimiento de recordatorios y selección de los que ya vencieron. */
export class Recordatorios {
  /** Algoritmo: selecciona todos los recordatorios o filtra por libro si se
   * recibió su ID; en ambos casos ordena por fecha ascendente.
   */
  static async listar(libroId?: number, usuarioId = 1) {
    const { baseDatos } = await conexionCompartida;
    const filtro = libroId === undefined
      ? igual(recordatorios.usuarioId, usuarioId)
      : y(
          igual(recordatorios.usuarioId, usuarioId),
          igual(recordatorios.libroId, libroId),
        );
    return baseDatos
      .select()
      .from(recordatorios)
      .where(filtro)
      .orderBy(ascendente(recordatorios.fechaHora));
  }

  /** Algoritmo: normaliza mensaje y fecha, inserta la fila con sus indicadores
   * y devuelve el recordatorio creado.
   */
  static async crear(datos: typeof recordatorios.$inferInsert) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "mensaje",
      "fechaHora",
    ]);
    const [recordatorioCreado] = await baseDatos
      .insert(recordatorios)
      .values(datosNormalizados)
      .returning();
    return recordatorioCreado;
  }

  /** Algoritmo: consulta por clave primaria, limita a una fila y devuelve la
   * coincidencia o `undefined`.
   */
  static async obtenerPorId(id: number, usuarioId = 1) {
    const { baseDatos } = await conexionCompartida;
    const [recordatorio] = await baseDatos
      .select()
      .from(recordatorios)
      .where(y(igual(recordatorios.id, id), igual(recordatorios.usuarioId, usuarioId)))
      .limit(1);
    return recordatorio;
  }

  /** Algoritmo: normaliza mensaje y fecha, actualiza solo si el ID coincide y
   * el aviso continúa sin notificar, y devuelve la fila o `undefined`.
   */
  static async actualizar(
    id: number,
    datos: Partial<Omit<typeof recordatorios.$inferInsert, "id">>,
    usuarioId = 1,
  ) {
    const { baseDatos } = await conexionCompartida;
    const datosNormalizados = normalizarCamposDeTexto(datos, [
      "mensaje",
      "fechaHora",
    ]);
    const [recordatorioActualizado] = await baseDatos
      .update(recordatorios)
      .set(datosNormalizados)
      // El estado se comprueba en la misma escritura para impedir que un
      // recordatorio ya notificado se modifique incluso con solicitudes simultáneas.
      .where(
        y(
          igual(recordatorios.id, id),
          igual(recordatorios.usuarioId, usuarioId),
          igual(recordatorios.notificado, false),
        ),
      )
      .returning();
    return recordatorioActualizado;
  }

  /** Algoritmo: borra por ID y devuelve si se eliminó una fila. */
  static async eliminar(id: number, usuarioId = 1): Promise<boolean> {
    const { baseDatos } = await conexionCompartida;
    const eliminados = await baseDatos
      .delete(recordatorios)
      .where(y(igual(recordatorios.id, id), igual(recordatorios.usuarioId, usuarioId)))
      .returning({ id: recordatorios.id });
    return eliminados.length > 0;
  }

  /** Algoritmo: convierte el instante límite a ISO, filtra activos y no
   * notificados con fecha menor o igual, y ordena por fecha ascendente.
   */
  static async obtenerPendientes(ahora: Date = new Date(), usuarioId = 1) {
    const { baseDatos } = await conexionCompartida;
    return baseDatos
      .select()
      .from(recordatorios)
      .where(
        y(
          igual(recordatorios.activo, true),
          igual(recordatorios.notificado, false),
          igual(recordatorios.usuarioId, usuarioId),
          menorOIgual(recordatorios.fechaHora, ahora.toISOString()),
        ),
      )
      .orderBy(ascendente(recordatorios.fechaHora));
  }

  /** Algoritmo: establece `notificado` en verdadero para el ID y devuelve la
   * fila modificada o `undefined` si ese ID no existe.
   */
  static async marcarComoNotificado(id: number, usuarioId = 1) {
    const { baseDatos } = await conexionCompartida;
    const [recordatorioActualizado] = await baseDatos
      .update(recordatorios)
      .set({ notificado: true })
      .where(y(igual(recordatorios.id, id), igual(recordatorios.usuarioId, usuarioId)))
      .returning();
    return recordatorioActualizado;
  }
}
