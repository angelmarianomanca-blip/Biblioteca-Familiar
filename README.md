# Biblioteca digital

Proyecto mínimo con Node.js, TypeScript, Drizzle y SQLite/libSQL. En desarrollo
usa el archivo local `desarrollo.sqlite`; con `ENTORNO=produccion` conecta con
Turso. Incluye el esquema solicitado y una carga de datos ficticios repetible.

## Requisitos

- Node.js 22 o posterior.
- npm.
- Una base de datos Turso y su token solo para producción.

## Instalación

Instala las dependencias:

```bash
npm install
```

Crea el archivo `.env` desde la plantilla.

En PowerShell:

```powershell
Copy-Item .env.example .env
```

En macOS o Linux:

```bash
cp .env.example .env
```

La plantilla selecciona `ENTORNO=desarrollo`, por lo que la base local es el
destino predeterminado.

## Crear el esquema y cargar los datos

Desde el directorio del proyecto, ejecuta primero:

```bash
npm run db:push
```

Drizzle Kit crea o actualiza las tablas en el destino seleccionado por
`ENTORNO`. En desarrollo, el archivo `desarrollo.sqlite` aparece en la raíz.

Luego ejecuta la siembra:

```bash
npm run db:seed
```

La siembra usa IDs estables y `ON CONFLICT DO NOTHING`; volver a ejecutar el
comando no agrega copias de las filas ya insertadas. Los registros existentes
con esos IDs no se sobrescriben.

El resultado muestra el total de filas por tabla. La primera carga local deja:

| Tabla | Filas |
| --- | ---: |
| `usuarios` | 2 |
| `categorias` | 3 |
| `libros` | 6 |
| `resumenes` | 18 |
| `mapasConceptuales` | 18 |
| `lexico` | 30 |
| `examenes` | 18 |
| `preguntas` | 90 |
| `progresoUsuario` | 6 |
| `modulos` | 12 |
| `recordatorios` activos | 2 |
| `resultadosExamen` | 0 |

`resultadosExamen` queda sin filas porque no se solicitaron intentos de ejemplo.

## Ejecución

Para ejecutar en modo de desarrollo:

```bash
npm run dev
```

El servidor queda escuchando en `http://localhost:3000`; puedes cambiar el
puerto con la variable `PORT`. Antes de usar los endpoints, crea el esquema y
carga los datos con `npm run db:push` y `npm run db:seed`. Para compilar y
ejecutar JavaScript:

```bash
npm run build
npm start
```

## API REST

La API usa JSON y tiene el prefijo `/api`. Las operaciones de creación devuelven
`201`, las eliminaciones exitosas `204`, y una ruta o registro inexistente
devuelve `404`. Los cuerpos de escritura deben ser objetos JSON; las relaciones
de las rutas anidadas se toman del parámetro `libroId`.

| Método | Ruta | Operación |
| --- | --- | --- |
| `GET` | `/api/categorias` | Listar categorías con `cantidadLibros` |
| `POST` | `/api/categorias` | Crear categoría |
| `PUT` | `/api/categorias/:id` | Editar categoría |
| `DELETE` | `/api/categorias/:id` | Eliminar categoría |
| `GET` | `/api/libros?busqueda=texto&categoriaId=N` | Listar y filtrar libros |
| `GET` | `/api/libros/:id` | Obtener libro y contenido relacionado |
| `POST` | `/api/libros` | Crear libro |
| `PUT` | `/api/libros/:id` | Editar libro |
| `DELETE` | `/api/libros/:id` | Eliminar libro |
| `GET` | `/api/libros/:libroId/resumenes` | Listar resúmenes |
| `POST` | `/api/libros/:libroId/resumenes` | Crear resumen |
| `PUT` | `/api/libros/:libroId/resumenes/:id` | Editar resumen |
| `DELETE` | `/api/libros/:libroId/resumenes/:id` | Eliminar resumen |
| `GET` | `/api/libros/:libroId/lexico?busqueda=texto` | Listar o buscar términos |
| `POST` | `/api/libros/:libroId/lexico` | Crear término |
| `PUT` | `/api/libros/:libroId/lexico/:id` | Editar término |
| `DELETE` | `/api/libros/:libroId/lexico/:id` | Eliminar término |
| `GET` | `/api/libros/:libroId/mapas` | Listar mapas |
| `GET` | `/api/libros/:libroId/mapas/:id` | Obtener mapa |
| `POST` | `/api/libros/:libroId/mapas` | Crear mapa |
| `PUT` | `/api/libros/:libroId/mapas/:id` | Actualizar mapa |
| `GET` | `/api/libros/:libroId/examenes` | Listar exámenes con preguntas |
| `GET` | `/api/libros/:libroId/examenes/:id` | Obtener examen con preguntas |
| `POST` | `/api/libros/:libroId/examenes/:id/corregir` | Corregir y guardar resultado |
| `GET` | `/api/libros/:libroId/examenes/:id/resultados` | Historial del examen |
| `GET` | `/api/libros/:libroId/progreso` | Obtener progreso |
| `PUT` | `/api/libros/:libroId/progreso` | Actualizar `paginaActual` |
| `POST` | `/api/libros/:libroId/progreso/completar` | Marcar libro completo |
| `GET` | `/api/libros/:libroId/modulos` | Listar módulos |
| `POST` | `/api/libros/:libroId/modulos/:id/completar` | Completar módulo |
| `GET` | `/api/recordatorios?libroId=N` | Listar recordatorios |
| `GET` | `/api/recordatorios/pendientes` | Listar recordatorios vencidos pendientes |
| `POST` | `/api/recordatorios` | Crear recordatorio |
| `PUT` | `/api/recordatorios/:id` | Editar recordatorio |
| `DELETE` | `/api/recordatorios/:id` | Eliminar recordatorio |
| `POST` | `/api/recordatorios/:id/notificar` | Marcar como notificado |
| `GET` | `/api/estadisticas` | Resumen de lectura, categorías, actividad reciente y libros en curso |
| `GET` | `/api/usuarios` | Listar perfiles disponibles |

### Perfiles

La base incluye los perfiles `Lector 1` y `Lector 2`. La página permite
alternarlos desde el avatar del encabezado y recuerda la elección en ese
navegador. Las solicitudes de progreso, resultados de exámenes, estadísticas y
recordatorios indican el perfil con el encabezado `X-Usuario-Id`; si se omite,
la API usa `1` para mantener compatibilidad con clientes anteriores. La
interfaz añade ese encabezado automáticamente.

El mismo identificador se pasa como `usuarioId` a las herramientas MCP de
progreso, exámenes, estadísticas y recordatorios. En ambos transportes el
perfil inicial es `1`.

La corrección recibe respuestas por ID de pregunta:

```json
{
  "respuestas": {
    "1": "A",
    "2": "C"
  }
}
```

La actualización del progreso recibe, por ejemplo, `{ "paginaActual": 20 }`.
Los routers solo asignan rutas HTTP; los controladores validan parámetros y
traducen las respuestas; los cálculos y reglas de datos continúan en los
servicios.

La página de inicio se sirve en `/` y también en `/biblioteca.html`. Está en
`public/biblioteca.html`: el JSX se compila en el navegador con Babel standalone
configurado para `runtime: "classic"`, y React 18.3.1, ReactDOM 18.3.1 y Babel
7.26.10 se cargan desde CDN con versiones fijas. La página obtiene categorías,
libros y progreso por medio de funciones de servicio que llaman a la API. Al
seleccionar un libro, el catálogo se reemplaza por una vista con pestañas de
lectura paginada, resúmenes, léxico con búsqueda, mapa conceptual y módulos.
Los cambios de página y el marcado de módulos se guardan mediante los endpoints
de progreso y módulos.

## Turso en producción

Configura las variables en el entorno de despliegue o en un `.env` no versionado:

```dotenv
ENTORNO=produccion
URL_BASE_TURSO=libsql://tu-base-de-datos.turso.io
TOKEN_TURSO=tu-token-de-acceso
```

Para crear el esquema y cargar los datos en la base remota:

```bash
npm run db:push
npm run db:seed
```

La misma variable `ENTORNO` selecciona Turso tanto para la aplicación como para
Drizzle Kit. No guardes el token real en el repositorio; `.env` está excluido en
`.gitignore`.

## Pruebas

Ejecuta la prueba automatizada:

```bash
npm test
```

La prueba conecta Drizzle a `file::memory:`, ejecuta `SELECT 1`, comprueba la
respuesta y cierra la conexión. No necesita Turso ni modifica la base de
desarrollo.

## Modelo

El archivo `src/db/esquema.ts` define estas tablas y claves foráneas:

- `categorias`: `id`, `nombre`, `descripcion`, `icono`.
- `libros`: `id`, `categoriaId`, `titulo`, `autor`, `portadaUrl`, `descripcion`,
  `contenidoCompleto`, `totalPaginas`.
- `resumenes`: `id`, `libroId`, `capitulo`, `tituloCapitulo`, `contenido`, `orden`.
- `mapasConceptuales`: `id`, `libroId`, `resumenId` opcional, `titulo`,
  `datosNodos`, `datosConexiones`.
- `lexico`: `id`, `libroId`, `termino`, `definicion`, `ejemplo` opcional.
- `examenes`: `id`, `libroId`, `resumenId` opcional, `titulo`, `totalPreguntas`.
- `preguntas`: `id`, `examenId`, `enunciado`, `opcionA`, `opcionB`, `opcionC`,
  `opcionD`, `respuestaCorrecta`, `explicacion`.
- `usuarios`: `id`, `nombre`, `avatarColor`.
- `progresoUsuario`: `id`, `libroId`, `usuarioId`, `paginaActual`, `completado`,
  `ultimaLectura`, `porcentaje`.
- `modulos`: `id`, `libroId`, `titulo`, `orden`, `completado`,
  `fechaCompletado` opcional.
- `recordatorios`: `id`, `libroId`, `usuarioId`, `mensaje`, `fechaHora`, `activo`, `notificado`.
- `resultadosExamen`: `id`, `examenId`, `usuarioId`, `correctas`, `incorrectas`, `porcentaje`,
  `fecha`.

Los valores de fecha se guardan como texto ISO 8601. SQLite representa los
booleanos como enteros y Drizzle los convierte a `true`/`false`. Los mapas se
guardan en columnas `TEXT` con serialización JSON. `ultimaLectura` admite `NULL`
para representar un libro sin iniciar.

## Servicios

Las clases estáticas están en `src/servicios/` y se pueden importar desde el
índice común:

```ts
import { Libros, Progreso } from "./servicios/index.js";

const coincidencias = await Libros.buscar("ficcion");
const avance = await Progreso.actualizarPagina(1, 20);
```

Los argumentos de escritura usan los tipos inferidos de Drizzle:
`typeof tabla.$inferInsert`; las filas devueltas usan los tipos inferidos de
`$inferSelect`. Los métodos CRUD devuelven la fila creada/actualizada, `undefined`
si una búsqueda por ID no encuentra el registro, y `boolean` en eliminaciones.
Los textos de entrada se normalizan en Unicode NFC, se recortan y se limpian los
espacios repetidos. La búsqueda de libros y términos ignora mayúsculas y
acentos. Las cadenas dentro de los datos JSON de los mapas también se normalizan.

### `Libros`

- `crear(datos)`: normaliza los campos de texto y crea una fila.
- `obtenerPorId(id)`: consulta una fila por su clave primaria.
- `listar()`: une libros con categorías y ordena por título.
- `buscar(texto)`: normaliza la consulta y compara fragmentos con título, autor
  y nombre de categoría; una consulta vacía devuelve el catálogo.
- `obtenerPorCategoria(categoriaId)`: filtra por clave foránea y ordena por título.
- `listarConFiltros({ busqueda, categoriaId })`: aplica ambos filtros, cuando se
  proporcionan, sobre el catálogo ordenado.
- `obtenerCompleto(id)`: consulta primero el libro; si existe, carga en paralelo
  resúmenes, léxico, mapas y módulos y los devuelve junto al libro.
- `actualizar(id, datos)`: normaliza los campos de texto recibidos y actualiza
  solo esos campos.
- `eliminar(id)`: elimina el libro; las tablas dependientes se eliminan mediante
  claves foráneas con cascada.

### `Categorias`

- `listar()`: hace `LEFT JOIN` con libros, agrupa cada categoría y devuelve su
  cantidad, incluidos los resultados con cero libros.
- `crear(datos)`, `obtenerPorId(id)`, `actualizar(id, datos)` y `eliminar(id)`:
  `crear` normaliza los tres textos e inserta; `obtenerPorId` consulta la clave
  primaria; `actualizar` normaliza y modifica solo el parche recibido; `eliminar`
  borra por ID y devuelve si encontró una fila. La clave foránea impide borrar
  una categoría que todavía tenga libros.

### `Resumenes`

- `listarPorLibro(libroId)`: filtra por libro y ordena por capítulo y luego por
  posición `orden`.
- `crear(datos)`, `obtenerPorId(id)`, `actualizar(id, datos)` y `eliminar(id)`:
  `crear` normaliza título y contenido e inserta con `libroId`; `obtenerPorId`
  consulta la clave primaria; `actualizar` normaliza y modifica el parche;
  `eliminar` borra por ID y deja que las claves foráneas eliminen mapas y
  exámenes dependientes.

- `actualizarDeLibro(libroId, id, datos)` y `eliminarDeLibro(libroId, id)`:
  aplican la misma actualización o eliminación de un resumen, condicionada a
  que coincidan el libro y el resumen de la ruta.

### `MapasConceptuales`

- `obtenerPorResumen(resumenId)`: devuelve el primer mapa asociado o `undefined`.
- `obtenerPorIdDeLibro(libroId, id)`: devuelve el mapa solo si coinciden ambos
  IDs.
- `obtenerPorLibro(libroId)`: devuelve todos los mapas de ese libro ordenados
  por ID.
- `guardar(datos)`: normaliza el título y las cadenas de nodos/conexiones, y
  deja que la columna JSON de Drizzle las serialice como texto.
- `actualizar(id, datos)`: modifica solo las propiedades recibidas y normaliza
  de la misma forma las estructuras JSON; acepta un `libroId` opcional para
  filtrar también por libro.

### `Lexico`

- `listarPorLibro(libroId)`: filtra por libro y ordena por término.
- `buscar(texto, libroId?)`: compara la consulta sin distinguir mayúsculas ni
  acentos con término y definición; `libroId` limita opcionalmente el catálogo.
- `obtenerPorId(id)`, `crear(datos)`, `actualizar(id, datos)` y `eliminar(id)`:
  `obtenerPorId` consulta la clave primaria; `crear` normaliza término,
  definición y ejemplo e inserta; `actualizar` normaliza y modifica el parche;
  `eliminar` borra por ID y devuelve si encontró una fila.

- `actualizarDeLibro(libroId, id, datos)` y `eliminarDeLibro(libroId, id)`:
  restringen el cambio o borrado del término al libro asociado.

### `Examenes`

- `obtenerPorResumen(resumenId)` y `obtenerPorLibro(libroId)`: consultan los
  exámenes y agregan a cada uno sus preguntas ordenadas por ID.
- `corregir(examenId, respuestas)`: usa las respuestas indexadas por ID de
  pregunta, compara cada una con `respuestaCorrecta`, cuenta como incorrecta la
  omitida, calcula el porcentaje sobre las preguntas existentes (dos decimales)
  y guarda el resultado con fecha ISO. Un examen sin preguntas da 0%.
- `historialPorLibro(libroId)`: une resultados con exámenes y los ordena del más
  reciente al más antiguo. `historialPorExamenDeLibro(libroId, examenId)` limita
  el historial a un examen concreto.

- `obtenerPorIdDeLibro(libroId, id)` busca un examen solo dentro del libro.

### `Progreso`

- `obtenerPorLibro(libroId)`: consulta la fila de progreso asociada al libro.
- `actualizarPagina(libroId, paginaActual)`: valida que sea una página entera
  dentro del rango del libro, calcula el porcentaje redondeado y crea o actualiza
  la única fila de progreso del libro. La lectura queda completada al llegar a
  la última página.
- `marcarLibroCompletado(libroId)`: guarda la última página, 100% y fecha actual;
  valida que el libro exista y tenga páginas, e inserta el progreso si aún no
  existía.
- `obtenerEstadisticas()`: une libros con su progreso, calcula los totales y el
  avance promedio de libros en curso, agrupa el avance por categoría (incluye
  libros sin iniciar como 0%), y determina cuántos exámenes se aprobaron alguna
  vez con 70% o más. Combina lecturas, intentos de examen y módulos con fecha de
  finalización, ordena la actividad por fecha y devuelve sus diez elementos más
  recientes. También ordena los libros en curso por porcentaje descendente y
  adjunta el próximo recordatorio activo de cada uno.

### `Modulos`

- `listarPorLibro(libroId)`: filtra por libro y ordena por `orden`.
- `marcarComoCompletado(id, libroId?)`: actualiza el indicador booleano y guarda
  la fecha de finalización una sola vez; limita el cambio al libro cuando se
  proporciona ese ID.
- `todosCompletos(libroId)`: devuelve verdadero cuando el libro tiene al menos
  un módulo y todos están completos.

### `Recordatorios`

- `listar(libroId?)`: lista todos los recordatorios o filtra por libro.
- `crear(datos)`, `obtenerPorId(id)`, `actualizar(id, datos)` y `eliminar(id)`:
  `crear` normaliza mensaje y fecha e inserta; `obtenerPorId` consulta la clave
  primaria; `actualizar` normaliza y modifica el parche; `eliminar` borra por
  ID y devuelve si encontró una fila.
- `obtenerPendientes(ahora?)`: selecciona recordatorios activos, aún no
  notificados, cuya fecha ISO sea menor o igual al instante indicado (por defecto,
  la hora actual).
- `marcarComoNotificado(id)`: cambia el indicador `notificado` a verdadero.

Para usar las consultas, configura primero el destino de la base de datos como
se explica arriba. Los métodos de servicio comparten una conexión creada al
importar los servicios.

## Estructura

```text
public/
└── biblioteca.html
src/
├── db/
│   ├── conexion.test.ts
│   ├── conexion.ts
│   ├── instancia.ts
│   ├── esquema.ts
│   └── sembrar.ts
├── api/
│   ├── aplicacion.ts
│   ├── controladores/
│   │   ├── categorias.ts
│   │   ├── estadisticas.ts
│   │   ├── examenes.ts
│   │   ├── http.ts
│   │   ├── lexico.ts
│   │   ├── libros.ts
│   │   ├── mapas.ts
│   │   ├── modulos.ts
│   │   ├── progreso.ts
│   │   ├── recordatorios.ts
│   │   └── resumenes.ts
│   └── rutas/
│       ├── categorias.ts
│       ├── examenes.ts
│       ├── index.ts
│       ├── lexico.ts
│       ├── libros.ts
│       ├── mapas.ts
│       ├── modulos.ts
│       ├── progreso.ts
│       ├── recordatorios.ts
│       └── resumenes.ts
├── servicios/
│   ├── categorias.ts
│   ├── examenes.ts
│   ├── lexico.ts
│   ├── libros.ts
│   ├── mapasConceptuales.ts
│   ├── modulos.ts
│   ├── normalizacion.ts
│   ├── progreso.ts
│   ├── recordatorios.ts
│   ├── resumenes.ts
│   └── index.ts
└── index.ts
drizzle.config.ts
```

## Algoritmos del código

### `crearBaseDeDatos`

Está en `src/db/conexion.ts`.

1. Lee `ENTORNO`; si no existe, usa `desarrollo`.
2. Rechaza valores distintos de `desarrollo` y `produccion`.
3. Selecciona `file:./desarrollo.sqlite` en desarrollo o exige la URL y el token
   de Turso en producción.
4. Crea el cliente libSQL, activa las claves foráneas y pasa el cliente junto
   con el esquema a Drizzle.
5. Devuelve el cliente y la instancia tipada de Drizzle.

### `crearPreguntasDeExamen`

Está en `src/db/sembrar.ts` y crea cinco preguntas para cada resumen.

1. Lee los cinco hechos del capítulo: personaje, lugar, objeto, conflicto y
   resultado.
2. Toma el hecho correspondiente como respuesta correcta.
3. Elige tres respuestas de otros capítulos del mismo aspecto como distractores.
4. Rota la ubicación de la respuesta correcta entre A, B, C y D.
5. Asigna un ID estable y guarda la explicación junto con las cuatro opciones.

### Siembra de datos

`src/db/sembrar.ts` prepara los IDs de resúmenes, mapas, exámenes, preguntas,
léxico y módulos a partir del libro y su posición. Después inserta primero las
categorías y libros, y luego sus registros dependientes en una sola transacción.
Los IDs explícitos junto con `onConflictDoNothing()` evitan duplicados al repetir
la carga. Finalmente consulta los conteos reales y cierra la conexión.

### `probarConexionSQLiteLocal`

Está en `src/db/conexion.test.ts`. Abre una base SQLite en memoria, ejecuta una
consulta mínima por Drizzle, compara la fila obtenida y cierra el cliente incluso
si la consulta falla.

### Normalización de texto

Las funciones están en `src/servicios/normalizacion.ts`.

- `normalizarTexto(texto)`: compone Unicode en NFC, convierte finales de línea
  a `\n`, recorta los extremos, reduce espacios/tabs seguidos a uno y limita
  separaciones de párrafo a dos saltos.
- `normalizarCamposDeTexto(datos, campos)`: copia el objeto, recorre solo las
  propiedades nombradas, normaliza sus valores cuando son cadenas y conserva
  todos los demás valores y el tipo inferido.
- `normalizarJson(valor)`: recorre recursivamente listas y objetos; normaliza
  sus cadenas y mantiene números, booleanos y nulos.
- `normalizarTextoParaBusqueda(texto)`: aplica la normalización general,
  descompone caracteres Unicode, quita diacríticos y convierte a minúsculas
  según la configuración regional española.

## Servidor MCP

El servidor MCP usa el [SDK oficial de TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
y transporte **Streamable HTTP**. La [guía oficial de conexión](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/clients/connect.md)
describe el cliente `Client` y `StreamableHTTPClientTransport`.
Está montado en `POST`, `GET` y `DELETE /mcp` en el mismo proceso Express que
la API REST. Comparte los servicios y la conexión a SQLite local o Turso; no
mantiene una base de datos separada.

Con la aplicación en marcha, configura tu cliente MCP con esta dirección:

```text
http://localhost:3000/mcp
```

En producción, usa la URL pública del servidor y el mismo sufijo `/mcp`, por
ejemplo `https://tu-dominio.example/mcp`.

Un cliente propio puede conectarse con el cliente oficial de TypeScript:

```bash
npm install @modelcontextprotocol/client
```

```ts
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const cliente = new Client({ name: "cliente-biblioteca", version: "1.0.0" });
const transporte = new StreamableHTTPClientTransport(
  new URL("http://localhost:3000/mcp"),
);

await cliente.connect(transporte);
const { tools } = await cliente.listTools();
console.log(tools.map(({ name }) => name));

const resultado = await cliente.callTool({
  name: "buscar_libros",
  arguments: { busqueda: "ciencia" },
});
console.log(resultado.content);

await cliente.close();
```

La página también permite alternar el origen de datos desde el control `REST` /
`MCP` del encabezado. REST es el modo inicial. Al elegir MCP, el navegador carga
el cliente oficial `@modelcontextprotocol/client` versión `2.4.0` desde esm.sh y
se conecta al endpoint del mismo servidor (`/mcp`); al elegir REST vuelve a
consultar la API. La preferencia se conserva en ese navegador. Si el servidor no
responde o no ofrece alguna herramienta requerida por la interfaz, se muestra
un aviso y la página permanece en REST.

El servidor publica estas herramientas. Los IDs son enteros positivos; las
entradas de texto no vacías se validan y las respuestas de examen solo admiten
`A`, `B`, `C` o `D`.

| Herramienta | Entrada |
| --- | --- |
| `listar_usuarios` | sin campos |
| `buscar_libros` | `busqueda?`, `categoriaId?` |
| `listar_categorias` | sin campos |
| `obtener_libro_completo` | `libroId` |
| `crear_libro` | `datos` del libro |
| `actualizar_libro` | `libroId`, `datos` parciales |
| `obtener_resumenes` | `libroId` |
| `crear_resumen` | `libroId`, `datos` |
| `actualizar_resumen` | `libroId`, `resumenId`, `datos` parciales |
| `eliminar_resumen` | `libroId`, `resumenId` |
| `obtener_lexico` | `libroId`, `busqueda?` |
| `crear_termino_lexico` | `libroId`, `datos` |
| `actualizar_termino_lexico` | `libroId`, `terminoId`, `datos` parciales |
| `eliminar_termino_lexico` | `libroId`, `terminoId` |
| `obtener_mapas` | `libroId` |
| `crear_mapa` | `libroId`, `datos` del mapa |
| `actualizar_mapa` | `libroId`, `mapaId`, `datos` parciales |
| `consultar_progreso` | `libroId`, `usuarioId?` |
| `actualizar_progreso` | `libroId`, `paginaActual`, `usuarioId?` |
| `completar_lectura` | `libroId`, `usuarioId?` |
| `listar_modulos` | `libroId` |
| `completar_modulo` | `libroId`, `moduloId` |
| `obtener_examenes` | `libroId` |
| `obtener_examen` | `libroId`, `examenId` |
| `corregir_examen` | `examenId`, `respuestas`; `libroId?`, `usuarioId?` |
| `historial_examen` | `libroId`, `examenId`, `usuarioId?` |
| `consultar_estadisticas` | `usuarioId?` |
| `listar_recordatorios` | `libroId?`, `usuarioId?` |
| `listar_recordatorios_pendientes` | `usuarioId?` |
| `crear_recordatorio` | `libroId`, `mensaje`, `fechaHora` ISO 8601 con zona horaria, `usuarioId?` |
| `actualizar_recordatorio` | `id`, `usuarioId?` y al menos uno de `mensaje`, `fechaHora`, `activo` |
| `eliminar_recordatorio` | `id`, `usuarioId?` |
| `marcar_recordatorio_notificado` | `id`, `usuarioId?` |

Las fechas deben incluir su zona horaria, por ejemplo
`2026-10-25T18:30:00-03:00`. Un error de validación o de servicio se devuelve
como error de herramienta MCP con un mensaje legible. Los recordatorios ya
notificados no se pueden editar.

---

## Despliegue en Producción (Render / Railway)

La aplicación está lista para producción en plataformas cloud como Render o Railway:
- **Puerto dinámico**: Express escucha automáticamente en el puerto asignado por el host mediante `process.env.PORT || 3000`.
- **Compilación**: `npm run build` compila TypeScript desde `src/` hacia `dist/`.
- **Archivos estáticos y PWA**: Express sirve la interfaz web y los activos estáticos desde la carpeta `public/` (incluyendo `biblioteca.html`, `manifest.json`, iconos y `sw.js`).
- **Base de datos**: En producción se recomienda conectar con [Turso](https://turso.tech/) (`TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`) para disponer de persistencia serverless distribuida. Si no se configuran, la aplicación utiliza SQLite local (`better-sqlite3`).

### Opción A: Despliegue en Render con `render.yaml` (Blueprint en 1 clic)

El proyecto incluye el archivo [`render.yaml`](file:///render.yaml) configurado para desplegar un **Web Service** gratuito:

1. Sube tu proyecto a un repositorio en **GitHub** o **GitLab**.
2. Ingresa a tu panel en [dashboard.render.com](https://dashboard.render.com/).
3. Haz clic en **New +** y selecciona **Blueprint**.
4. Conecta tu repositorio de GitHub. Render detectará automáticamente `render.yaml`.
5. En la pantalla de configuración, ingresa tus credenciales de Turso:
   - `TURSO_DATABASE_URL`: URL de tu base de datos Turso (`libsql://...`).
   - `TURSO_AUTH_TOKEN`: Token de autenticación generado en Turso.
6. Haz clic en **Apply**. Render creará el servicio, instalará dependencias con Node 22, compilará el código y lo pondrá en marcha con HTTPS gratuito.

---

### Opción B: Despliegue manual paso a paso en Render

Si prefieres configurar el servicio manualmente sin Blueprint:

#### Paso 1: Subir el proyecto a GitHub
Asegúrate de que tus últimos cambios estén confirmados y enviados a tu repositorio:
```bash
git add .
git commit -m "Prepara proyecto para despliegue en Render"
git push origin main
```

#### Paso 2: Crear el Web Service en Render
1. Inicia sesión en [Render Dashboard](https://dashboard.render.com/).
2. Haz clic en **New +** > **Web Service**.
3. Selecciona **Build and deploy from a Git repository** y conecta tu repositorio.

#### Paso 3: Configurar los comandos de ejecución
Completa los campos del formulario con los siguientes valores:
- **Name**: `biblioteca-digital` (o el nombre que prefieras).
- **Region**: Selecciona la más cercana a tus usuarios (ej. *Oregon (US West)* o *Frankfurt (EU)*).
- **Branch**: `main`.
- **Root Directory**: Déjalo en blanco (raíz).
- **Runtime**: `Node`.
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Start Command**:
  ```bash
  npm start
  ```
- **Instance Type**: Selecciona el plan **Free**.

#### Paso 4: Configurar las variables de entorno
Desplázate a la sección **Environment Variables** y añade las siguientes claves:

| Variable | Valor | Descripción |
| --- | --- | --- |
| `NODE_VERSION` | `22` | Fuerza el uso del runtime Node.js 22 LTS en Render. |
| `TURSO_DATABASE_URL` | `libsql://tu-base.turso.io` | URL de tu base de datos remota de Turso. |
| `TURSO_AUTH_TOKEN` | `tu-token-secreto` | Token de autenticación emitido por Turso. |

> [!NOTE]
> No es necesario configurar la variable `PORT`. Render la inyecta automáticamente en tiempo de ejecución y la aplicación la toma directamente mediante `process.env.PORT || 3000`.

#### Paso 5: Aplicar migraciones y sembrar la base de datos en Turso
Antes o después del primer despliegue, aplica el esquema y carga los datos ficticios en Turso. Puedes hacerlo:
- **Desde tu terminal local** con tu archivo `.env` configurado con las credenciales de Turso:
  ```bash
  npm run db:push
  npm run db:seed
  ```
- **O desde la pestaña Shell** del servicio en Render:
  ```bash
  npm run db:push && npm run db:seed
  ```

#### Paso 6: HTTPS gratuito automático
Una vez completado el despliegue:
1. Render asignará una URL pública con certificado TLS/SSL activo:
   ```text
   https://tu-servicio.onrender.com
   ```
2. **El certificado HTTPS es 100% gratuito** y se emite y renueva automáticamente mediante Let's Encrypt.
3. Para asociar un dominio propio (por ejemplo `biblioteca.tudominio.com`):
   - Ve a la pestaña **Settings** > **Custom Domains** en tu servicio de Render.
   - Agrega tu dominio o subdominio.
   - Configura el registro CNAME o A en tu proveedor DNS siguiendo las instrucciones que muestra Render.
   - Render aprovisionará el certificado SSL para tu dominio de forma automática en pocos minutos.

---

### Opción C: Despliegue en Railway

Railway detecta automáticamente aplicaciones Node.js o el [`Dockerfile`](file:///Dockerfile) incluido:

1. Ingresa a [railway.app](https://railway.app/) y crea un nuevo proyecto.
2. Selecciona **Deploy from GitHub repo** y elige este repositorio.
3. En la pestaña **Variables**, agrega:
   - `TURSO_DATABASE_URL`: Tu URL de Turso.
   - `TURSO_AUTH_TOKEN`: Tu token de Turso.
4. Railway compilará con `npm run build` y ejecutará `npm start`, asignando automáticamente el puerto dinámico y un dominio `https://tu-app.up.railway.app` con HTTPS gratuito.

