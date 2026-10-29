import type {
  ErrorRequestHandler,
  Request,
} from "express";
import { Usuarios } from "../../servicios/usuarios.js";

/** Error con código HTTP para respuestas previsibles de la API. */
export class ErrorHttp extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorHttp";
  }
}

/** Convierte un parámetro de ruta en un ID entero positivo o responde 400. */
export function leerIdParametro(
  solicitud: Request,
  nombre: string,
): number {
  const valor = solicitud.params[nombre];
  return leerIdTexto(valor, nombre);
}

/** Valida el formato decimal de un ID recibido en ruta o query string. */
export function leerIdTexto(valor: unknown, nombre: string): number {
  if (typeof valor !== "string" || !/^\d+$/u.test(valor)) {
    throw new ErrorHttp(400, `El parámetro ${nombre} debe ser un entero positivo.`);
  }

  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ErrorHttp(400, `El parámetro ${nombre} debe ser un entero positivo.`);
  }
  return id;
}

/** Lee el perfil del encabezado; los clientes antiguos continúan usando el perfil 1. */
export async function leerUsuarioId(solicitud: Request): Promise<number> {
  const encabezado = solicitud.get("X-Usuario-Id");
  const usuarioId = encabezado === undefined
    ? 1
    : leerIdTexto(encabezado, "X-Usuario-Id");
  if (!await Usuarios.obtenerPorId(usuarioId)) {
    throw new ErrorHttp(404, `No existe el usuario ${usuarioId}.`);
  }
  return usuarioId;
}

/** Lee un query string simple y rechaza arrays u objetos repetidos. */
export function leerTextoQuery(
  solicitud: Request,
  nombre: string,
): string | undefined {
  const valor: unknown = solicitud.query[nombre];
  if (valor === undefined) return undefined;
  if (typeof valor !== "string") {
    throw new ErrorHttp(400, `El parámetro ${nombre} debe ser un texto único.`);
  }
  return valor;
}

/** Asegura que el cuerpo JSON sea un objeto antes de tratarlo como tipo Drizzle. */
export function leerCuerpo<T extends object>(solicitud: Request): T {
  const cuerpo: unknown = solicitud.body;
  if (cuerpo === null || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    throw new ErrorHttp(400, "El cuerpo debe ser un objeto JSON.");
  }
  return cuerpo as T;
}

/** Quita IDs y relaciones que el cliente no puede cambiar desde esta ruta. */
export function quitarCampos(
  datos: Record<string, unknown>,
  campos: readonly string[],
): Record<string, unknown> {
  const nombresExcluidos = new Set(campos);
  return Object.fromEntries(
    Object.entries(datos).filter(([nombre]) => !nombresExcluidos.has(nombre)),
  );
}

/** Convierte errores de controladores y del parser JSON en respuestas JSON. */
export const manejarErrorHttp: ErrorRequestHandler = (
  error: unknown,
  _solicitud,
  respuesta,
  siguiente,
) => {
  if (respuesta.headersSent) {
    siguiente(error);
    return;
  }

  // Express incluye un estado numérico en los errores de parser (ej. 400 malformado, 413 límite excedido).
  const estadoDeParser =
    typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : undefined;
  const esEstadoClienteParser =
    typeof estadoDeParser === "number" && estadoDeParser >= 400 && estadoDeParser < 500;
  const estado = error instanceof ErrorHttp
    ? error.estado
    : error instanceof RangeError
      ? 400
      : esEstadoClienteParser
        ? estadoDeParser
        : 500;
  const mensaje = estado === 500
    ? "Error interno del servidor."
    : error instanceof Error
      ? error.message
      : "Solicitud inválida.";

  respuesta.status(estado).json({ error: mensaje });
};
