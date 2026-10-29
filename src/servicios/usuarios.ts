import { asc as ascendente, eq as igual } from "drizzle-orm";
import { conexionCompartida } from "../db/instancia.js";
import { usuarios, type RolUsuario } from "../db/esquema.js";

/** Gestión de perfiles y roles de la biblioteca. */
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

  /** Crea un nuevo usuario con el rol indicado y devuelve la fila creada. */
  static async crear(datos: { nombre: string; avatarColor: string; rol?: RolUsuario }) {
    const { baseDatos } = await conexionCompartida;
    const [creado] = await baseDatos
      .insert(usuarios)
      .values({
        nombre: datos.nombre,
        avatarColor: datos.avatarColor,
        rol: datos.rol ?? "lector",
      })
      .returning();
    return creado;
  }

  /** Actualiza nombre, color o rol de un perfil existente. */
  static async actualizar(
    id: number,
    datos: Partial<{ nombre: string; avatarColor: string; rol: RolUsuario }>,
  ) {
    const { baseDatos } = await conexionCompartida;
    const [actualizado] = await baseDatos
      .update(usuarios)
      .set(datos)
      .where(igual(usuarios.id, id))
      .returning();
    return actualizado;
  }

  /** Elimina un perfil; devuelve si efectivamente se borró una fila. */
  static async eliminar(id: number): Promise<boolean> {
    const { baseDatos } = await conexionCompartida;
    const eliminados = await baseDatos
      .delete(usuarios)
      .where(igual(usuarios.id, id))
      .returning({ id: usuarios.id });
    return eliminados.length > 0;
  }

  /** Comprueba si el usuario tiene rol de administrador. */
  static async esAdmin(id: number): Promise<boolean> {
    const usuario = await Usuarios.obtenerPorId(id);
    return usuario?.rol === "admin";
  }
}
