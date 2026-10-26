import { asc as ascendente, eq as igual } from "drizzle-orm";
import { conexionCompartida } from "../db/instancia.js";
import { usuarios } from "../db/esquema.js";

/** Lectura de los perfiles disponibles para la interfaz. */
export class Usuarios {
  /** Devuelve perfiles ordenados por ID para alternarlos de forma estable. */
  static async listar() {
    const { baseDatos } = await conexionCompartida;
    return baseDatos.select().from(usuarios).orderBy(ascendente(usuarios.id));
  }

  /** Busca un perfil por ID o devuelve undefined si ya no existe. */
  static async obtenerPorId(id: number) {
    const { baseDatos } = await conexionCompartida;
    const [usuario] = await baseDatos
      .select()
      .from(usuarios)
      .where(igual(usuarios.id, id))
      .limit(1);
    return usuario;
  }
}
