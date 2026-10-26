import * as comprobaciones from "node:assert/strict";
import { test as prueba } from "node:test";
import {
  Examenes,
  Progreso,
  Recordatorios,
  Usuarios,
} from "./index.js";

prueba("perfiles de usuario: lista los dos usuarios por defecto", async function probarListadoUsuarios() {
  const lista = await Usuarios.listar();
  comprobaciones.ok(lista.length >= 2, "Debe haber al menos 2 usuarios sembrados");

  const lector1 = lista.find((u) => u.id === 1);
  const lector2 = lista.find((u) => u.id === 2);

  comprobaciones.ok(lector1, "Debe existir Lector 1");
  comprobaciones.equal(lector1.nombre, "Lector 1");
  comprobaciones.equal(lector1.avatarColor, "#e2b04a");

  comprobaciones.ok(lector2, "Debe existir Lector 2");
  comprobaciones.equal(lector2.nombre, "Lector 2");
  comprobaciones.equal(lector2.avatarColor, "#6179c9");
});

prueba("perfiles de usuario: progreso independiente por usuarioId", async function probarProgresoPorUsuario() {
  const progresoLector1 = await Progreso.obtenerPorLibro(1, 1);
  const progresoLector2 = await Progreso.obtenerPorLibro(1, 2);

  comprobaciones.ok(progresoLector1, "Lector 1 debe tener progreso en Libro 1");
  comprobaciones.ok(progresoLector2, "Lector 2 debe tener progreso en Libro 1");

  comprobaciones.equal(progresoLector1.usuarioId, 1);
  comprobaciones.equal(progresoLector2.usuarioId, 2);
  comprobaciones.notEqual(
    progresoLector1.porcentaje,
    progresoLector2.porcentaje,
    "Los dos lectores deben tener porcentajes independientes",
  );
});

prueba("perfiles de usuario: historial de exámenes vinculado a usuarioId", async function probarHistorialExamenesPorUsuario() {
  const historial1 = await Examenes.historialPorLibro(1, 1);
  const historial2 = await Examenes.historialPorLibro(1, 2);

  comprobaciones.ok(Array.isArray(historial1));
  comprobaciones.ok(Array.isArray(historial2));

  // Cada intento debe pertenecer al usuario consultado
  for (const fila of historial1) {
    comprobaciones.equal(fila.resultado.usuarioId, 1);
  }
  for (const fila of historial2) {
    comprobaciones.equal(fila.resultado.usuarioId, 2);
  }
});

prueba("perfiles de usuario: recordatorios vinculados a usuarioId", async function probarRecordatoriosPorUsuario() {
  const recLector1 = await Recordatorios.listar(undefined, 1);
  const recLector2 = await Recordatorios.listar(undefined, 2);

  comprobaciones.ok(recLector1.length > 0, "Lector 1 debe tener recordatorios");
  for (const r of recLector1) {
    comprobaciones.equal(r.usuarioId, 1);
  }

  comprobaciones.ok(recLector2.length > 0, "Lector 2 debe tener recordatorios");
  for (const r of recLector2) {
    comprobaciones.equal(r.usuarioId, 2);
  }
});
