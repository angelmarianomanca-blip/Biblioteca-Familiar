// Este paso crea la tabla padre antes de que Drizzle agregue las claves
// usuarioId a una base existente. El DEFAULT 1 conserva el dueño de los datos.
import "dotenv/config";
import { crearBaseDeDatos } from "./conexion.js";

const { cliente } = await crearBaseDeDatos();

try {
  await cliente.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      nombre TEXT NOT NULL,
      avatarColor TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'lector'
    )
  `);
  await cliente.execute({
    sql: "INSERT OR IGNORE INTO usuarios (id, nombre, avatarColor, rol) VALUES (?, ?, ?, ?), (?, ?, ?, ?)",
    args: [1, "Lector 1", "#e2b04a", "admin", 2, "Lector 2", "#6179c9", "lector"],
  });
} finally {
  await cliente.close();
}
