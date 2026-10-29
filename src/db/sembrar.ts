// Carga .env antes de leer ENTORNO, URL_BASE_TURSO y TOKEN_TURSO.
import "dotenv/config";

// Se usan para completar fechas faltantes en módulos ya presentes en la base.
import {
  and as y,
  eq as igual,
  isNull as esNulo,
  sql as consultaSQL,
} from "drizzle-orm";

// Se importa únicamente la fábrica de conexión y las tablas del modelo.
import {
  crearBaseDeDatos,
  type BaseDatosBiblioteca,
  type ClienteBaseDeDatos,
} from "./conexion.js";
import {
  categorias,
  examenes,
  lexico,
  libros,
  mapasConceptuales,
  modulos,
  preguntas,
  progresoUsuario,
  recordatorios,
  resultadosExamen,
  resumenes,
  usuarios,
} from "./esquema.js";

/** Datos de comprensión que alimentan las cinco preguntas de cada capítulo. */
type DatosDePregunta = {
  personaje: string;
  lugar: string;
  objeto: string;
  conflicto: string;
  resultado: string;
};

/** Estructura de un capítulo ficticio antes de asignarle un ID de base. */
type CapituloInicial = {
  libroId: number;
  capitulo: number;
  tituloCapitulo: string;
  contenido: string;
  datosPregunta: DatosDePregunta;
};

/** Nombre de uno de los aspectos usados para construir una pregunta. */
type AspectoPregunta = keyof DatosDePregunta;

// Tres categorías de ejemplo; los IDs estables hacen repetible la carga.
export const categoriasIniciales = [
  {
    id: 1,
    nombre: "Ficción",
    descripcion: "Relatos imaginarios de misterio, aventura y vida cotidiana.",
    icono: "📚",
  },
  {
    id: 2,
    nombre: "Ciencia",
    descripcion: "Historias y conocimientos sobre la naturaleza y el universo.",
    icono: "🔬",
  },
  {
    id: 3,
    nombre: "Historia",
    descripcion: "Relatos ficticios ambientados en épocas y lugares del pasado.",
    icono: "🏺",
  },
];

// Cada categoría tiene dos libros; los textos largos se estructuran en capítulos navegables.
export const librosIniciales = [
  {
    id: 1,
    categoriaId: 1,
    titulo: "El faro de las mareas quietas",
    autor: "Mara Luján",
    portadaUrl: "/portadas/el-faro-de-las-mareas-quietas.jpg",
    descripcion:
      "Una restauradora vuelve a la costa y descubre por qué el faro dejó de guiar a los barcos.",
    contenidoCompleto:
      `--- PÁGINA 1: Prólogo - El silencio de la bahía ---
Inés Vidal regresa a Puerto Bruma con una maleta de cuero y una misión que nadie le ha pedido explícitamente: ordenar la antigua bitácora de su abuelo, el último farero del litoral sur. El viento salino azota los acantilados mientras el transbordador amarra en el muelle de madera desgastada. Los habitantes comentan que el faro no ha vuelto a encender su haz giratorio desde aquella noche de tormenta en que las mareas parecieron detenerse. Entre las pertenencias olvidadas en la caseta de guardia, una vieja llave de bronce cuelga junto a una nota descolorida.

--- PÁGINA 2: Capítulo 1 - La bitácora cerrada ---
Inés Vidal vuelve a Puerto Bruma para ordenar los papeles de su abuelo. Una tormenta apaga el faro y, dentro de una bitácora con pastas de lona encerada, ella descubre una brújula de latón que no apunta al norte magnético, sino hacia una ruta trazada a mano alzada en el reverso de una carta náutica de 1942. El mecanismo de la brújula vibra débilmente cuando se acerca a la pared norte del faro, donde una grieta disimula un pequeño compartimento sellado con brea.

--- PÁGINA 3: Capítulo 2 - La cueva del vidrio ---
Siguiendo las coordenadas de la brújula y las marcas en las rocas batidas por el oleaje, Inés desciende hacia la Cueva Azul con la bajamar. Allí encuentra un espejo cóncavo de bronce y cristal de roca cubierto de salitre y algas secas. Los pescadores del puerto desconfían de su plan y temen aventurarse cerca de los arrecifes, pero una prueba realizada durante el crepúsculo demuestra que el espejo, adecuadamente alineado con la curvatura del acantilado, es capaz de concentrar y orientar la luz aún en medio de la neblina más espesa.

--- PÁGINA 4: Capítulo 3 - La señal compartida ---
Con el viento en calma y la marea en su punto medio, Inés y los vecinos de Puerto Bruma colaboran para transportar la lente restaurada hasta la torre del faro. Ajustan los contrapesos del reloj mecánico y encienden la lámpara central. El faro vuelve a iluminar la bahía con un compás firme de destellos blancos y dorados. En lugar de guardar el secreto en soledad, Inés abre una nueva bitácora comunitaria en la biblioteca del pueblo, donde cada marino y habitante escribe sus propias observaciones del mar.

--- PÁGINA 5: Epílogo - Memoria en el horizonte ---
Cuidar la memoria no consiste en conservar reliquias intactas en una vitrina cerrada, sino en mantener encendidas las señales que permiten a otros encontrar el camino a casa. El faro de Puerto Bruma no solo guía a las embarcaciones nocturnas; recuerda a toda la comunidad que las historias más valiosas son aquellas que se escriben y se comparten entre muchas manos.`,
    totalPaginas: 5,
  },
  {
    id: 2,
    categoriaId: 1,
    titulo: "El mapa de los naranjos",
    autor: "Tomás Echevarría",
    portadaUrl: "/portadas/el-mapa-de-los-naranjos.jpg",
    descripcion:
      "Un joven cartógrafo busca el antiguo cauce que puede devolver agua a su barrio.",
    contenidoCompleto:
      `--- PÁGINA 1: Prólogo - Tierra seca en San Telmo ---
Durante tres veranos consecutivos, las lluvias han esquivado los tejados de San Telmo del Valle. Las históricas fuentes de piedra de la plaza principal apenas dejan caer unas gotas marrones al amanecer, y los viejos naranjos sembrados en los patios coloniales comienzan a perder sus hojas aromáticas. Julián Soria, que pasa sus días restaurando planos topográficos en el archivo municipal, se niega a aceptar que el barrio deba resignarse a la sequía.

--- PÁGINA 2: Capítulo 1 - El patio de azulejos ---
Julián Soria encuentra un plano trazado sobre azulejos de mayólica bajo las baldosas levantadas del patio de los Naranjos, en la antigua casa de su tía. El mapa revela un cauce subterráneo construido por los primeros alarifes del valle, justo cuando las fuentes públicas del barrio empiezan a secarse por completo. Las inscripciones en los bordes de los azulejos señalan compuertas ocultas bajo nombres de árboles que ya nadie recuerda.

--- PÁGINA 3: Capítulo 2 - La acequia enterrada ---
Armado con una cinta métrica de lino y un cuaderno de bocetos, Julián recorre la calle empinada de los Tilos escuchando las memorias contradictorias de los vecinos más ancianos. Una marca de cal viva grabada bajo los pilares del puente de piedra le permite identificar el tramo exacto donde el cauce fue tapiado hace sesenta años sin necesidad de demoler las viviendas. Con precisión geométrica, calcula el punto de desahogo ideal.

--- PÁGINA 4: Capítulo 3 - Agua para la plaza ---
Ante una asamblea de vecinos reunida en la plaza del Molino, Julián despliega una réplica del plano y propone abrir un canal lateral de drenaje aprovechando la pendiente natural de la colina. Cuando una lluvia torrencial desciende desde la sierra amenazando con desbordar los albañales, la cuadrilla abre la compuerta restaurada. El torrente limpio circula por el antiguo cauce y el agua fresca vuelve a regar las raíces de los naranjos.

--- PÁGINA 5: Epílogo - El mural de la memoria ---
Para que ningún trazado vuelva a perderse en el olvido, los habitantes de San Telmo deciden pintar el mapa completo en el muro este de la escuela comunitaria. Julián comprende que la verdadera cartografía no se limita a medir distancias entre puntos fijos: consiste en trazar puentes entre el pasado de un pueblo y su porvenir colectivo.`,
    totalPaginas: 5,
  },
  {
    id: 3,
    categoriaId: 2,
    titulo: "El jardín de las lunas",
    autor: "Alma Quiroga",
    portadaUrl: "/portadas/el-jardin-de-las-lunas.jpg",
    descripcion:
      "Una botánica investiga cómo mantener un invernadero experimental en una estación lunar.",
    contenidoCompleto:
      `--- PÁGINA 1: Prólogo - El domo de polvo y cristal ---
A cuatrocientos mil kilómetros de la biosfera terrestre, el domo bioclimático de la estación Selene resplandece como una perla suspendida en el Mar de la Tranquilidad. En su interior, filas de brotes de leguminosas y hortalizas crecen bajo una atmósfera presurizada pero desafiada por la radiación cósmica y una gravedad seis veces menor. Vera Montes sabe que la supervivencia a largo plazo de la base depende del éxito de este pequeño ecosistema sellado.

--- PÁGINA 2: Capítulo 1 - Semillas en Selene ---
Vera Montes inicia el ciclo de observación tras detectar que los brotes experimentales pierden hasta un cuarenta por ciento de su humedad celular durante la noche lunar simulada. El equipo de ingenieros de soporte vital insiste en que las lámparas de sodio deben cambiarse por emisores ultravioleta, pero las primeras mediciones espectrométricas de Vera revelan que el problema radica en la estructura microscópica del regolito lunar utilizado como lecho.

--- PÁGINA 3: Capítulo 2 - La sombra del domo ---
Junto a la técnica de sistemas térmicos, Vera analiza el comportamiento del calor en los límites del domo cuando el sol se oculta tras los montes Apeninos de la Luna. Descubren que el choque térmico cristaliza el vapor de agua antes de que las hojas logren absorberlo. La solución no consiste en bombear más agua líquida a las raíces, sino en redistribuir el calor residual de los reactores mediante una red de conductos de cerámica porosa colocados en las sombras.

--- PÁGINA 4: Capítulo 3 - La primera cosecha ---
Tras quince rotaciones de ajuste cuidadoso, los sensores confirman una transpiración vegetal equilibrada. Los primeros tomates lunares maduran con un tono escarlata brillante, y las hojas de espinaca retienen su turgencia natural incluso en los periodos de penumbra más prolongados. El centro de control en la Tierra autoriza la ampliación del módulo hortícola y la tripulación degusta la primera ensalada fresca producida fuera del planeta de origen.

--- PÁGINA 5: Epílogo - Echar raíces en el cosmos ---
El pequeño jardín de Selene se convierte en un símbolo de esperanza científica. Demuestra que la vida no es un accidente frágil confinado a un solo mundo, sino una fuerza tenaz capaz de florecer allá donde la curiosidad humana, la paciencia y el conocimiento decidan tenderle una mano.`,
    totalPaginas: 5,
  },
  {
    id: 4,
    categoriaId: 2,
    titulo: "Frecuencia de una estrella",
    autor: "Nicolás Ferreyra",
    portadaUrl: "/portadas/frecuencia-de-una-estrella.jpg",
    descripcion:
      "Un equipo de radioastronomía separa una señal celeste de las interferencias terrestres.",
    contenidoCompleto:
      `--- PÁGINA 1: Prólogo - El valle de los ecos cósmicos ---
En la meseta solitaria de Piedra Clara, siete antenas parabólicas de treinta metros de diámetro apuntan en silencio hacia el hemisferio sur celeste. La noche es tan oscura que la Vía Láctea parece proyectar sombras sobre la roca rojiza. Nicolás Arce ajusta los amplificadores criogénicos del receptor principal mientras el monitor de fósforo verde dibuja una línea de ruido de fondo casi plana, esperando la mínima perturbación en la banda de veintiún centímetros.

--- PÁGINA 2: Capítulo 1 - El pulso lejano ---
A las 03:14 horas, la tercera antena del complejo registra una serie de pulsos electromagnéticos de periodicidad rigurosa: 1.337 segundos entre cada pico, con un desplazamiento Doppler característico de una fuente situada más allá del sistema solar. La emoción invade la sala de control, pero una súbita tormenta eléctrica sobre la sierra cercana introduce fluctuaciones en la red eléctrica que amenazan con descalibrar los osciladores locales.

--- PÁGINA 3: Capítulo 2 - El filtro de la tormenta ---
Nicolás se niega a apresurar conclusiones sensacionalistas. Revisa minuciosamente su cuaderno de bitácora y compara las frecuencias observadas con los armónicos emitidos por los transformadores de alta tensión de la ciudad vecina. Con la ayuda de un software de correlación cruzada diseñado por su equipo, filtra las microinterferencias industriales y orienta el conjunto de radiotelescopios hacia una coordenada estelar muda y libre de rebotes terrestres.

--- PÁGINA 4: Capítulo 3 - El registro compartido ---
La señal persiste con una nitidez matemática asombrosa. No se trata de una transmisión artificial ni de un error de software: han captado el nacimiento de un púlsar de milisegundos en el corazón de una nebulosa lejana que acaba de colapsar. En lugar de guardar el descubrimiento con celo competitivo, el observatorio publica los datos en código abierto para que astrónomos de todo el mundo puedan triangular el fenómeno simultáneamente.

--- PÁGINA 5: Epílogo - La humildad del científico ---
La verdadera ciencia no busca respuestas cómodas ni triunfos inmediatos; abraza el rigor de saber distinguir la voz auténtica del universo del ruido que nosotros mismos generamos en la Tierra. En Piedra Clara, las antenas siguen escuchando, recordando que allá afuera cada estrella tiene una frecuencia que espera ser comprendida con paciencia y verdad.`,
    totalPaginas: 5,
  },
  {
    id: 5,
    categoriaId: 3,
    titulo: "Cartas desde el puerto de 1810",
    autor: "Lucía Montalvo",
    portadaUrl: "/portadas/cartas-desde-el-puerto-de-1810.jpg",
    descripcion:
      "Una aprendiz de imprenta encuentra cartas que revelan decisiones cotidianas en tiempos de cambio.",
    contenidoCompleto:
      `--- PÁGINA 1: Prólogo - El olor a tinta y salitre ---
En el otoño de 1810, el puerto de Buenos Aires es un hervidero de carretas, pregones callejeros y rumores clandestinos. En la imprenta de los Niños Expósitos, las prensas de roble y hierro no descansan. Emilia Sanz, una joven de dieciocho años con los dedos permanentemente manchados de tinta negra de humo, limpia tipos móviles de plomo mientras en las esquinas de la Plaza Mayor se discuten proclamas que cambiarán para siempre el destino del Virreinato.

--- PÁGINA 2: Capítulo 1 - Los plomos de mayo ---
Entre resmas de papel de hilo y fajos de bandos oficiales del Virrey Cisneros, Emilia descubre una bolsa de arpillera oculta en el doble fondo de un cajón de tipos de letra cursiva. En su interior descansan decenas de cartas manuscritas firmadas por Clara, una comerciante del barrio del Retiro. Las misivas no hablan de batallas pomposas ni de generales, sino de la angustia de conseguir harina para las panaderías, del precio del cuero y de los debates que las familias sostienen a la luz de las velas.

--- PÁGINA 3: Capítulo 2 - Las cartas en el muelle ---
Cuando un oficial del Cabildo llega a la imprenta con una orden perentoria para requisar cualquier escrito no visado por la censura, Emilia arriesga su puesto y esconde las cartas bajo su manto de paño. Con el corazón latiéndole con fuerza, las traslada hasta el muelle de las carretas, donde una red solidaria de arrieros y lavanderas las protege en toneles secos. Comprende que salvar esos testimonios es defender la memoria de la gente común frente al olvido histórico.

--- PÁGINA 4: Capítulo 3 - La voz de los vecinos ---
Consumados los acontecimientos del veinticinco de mayo, el nuevo gobierno municipal necesita proclamar sus decretos al pueblo llano. Emilia propone al maestro impresor un formato de pliego accesible en lenguaje claro y cercano, integrando en pequeños márgenes las inquietudes que Clara relataba en sus cartas. La imprenta no solo publica edictos políticos: se convierte en un espejo donde la ciudadanía se reconoce protagonista de su propia emancipación.

--- PÁGINA 5: Epílogo - Las palabras que perduran ---
Muchos años más tarde, las cartas de Clara y los pliegos de Emilia descansan en el archivo histórico de la ciudad. Recuerdan a las nuevas generaciones que la libertad de los pueblos no se fragua únicamente en los salones de gobierno, sino en las manos trabajadoras de quienes se atreven a imprimir, conversar y preservar la verdad sin mordazas.`,
    totalPaginas: 5,
  },
  {
    id: 6,
    categoriaId: 3,
    titulo: "El último taller de los mapas",
    autor: "Rafael Cárdenas",
    portadaUrl: "/portadas/el-ultimo-taller-de-los-mapas.jpg",
    descripcion:
      "Un aprendiz de cartógrafo intenta preservar los nombres locales ante un nuevo trazado ferroviario.",
    contenidoCompleto:
      `--- PÁGINA 1: Prólogo - El compás y las vías de acero ---
Hacia finales del siglo diecinueve, los silbatos de las locomotoras a vapor comienzan a quebrar la serenidad milenaria de las serranías de Córdoba. Las cuadrillas de ingenieros trazan líneas rectas sobre el papel sin importarles las cañadas ancestrales ni las huellas de pastoreo. En el gabinete de cartografía de don Anselmo, el joven aprendiz Mateo Ríos sostiene el tiralíneas con reverencia, temiendo que la modernidad borre de un plumazo siglos de geografía humana.

--- PÁGINA 2: Capítulo 1 - La libreta de campo ---
Mateo Ríos recibe la instrucción de confeccionar el plano oficial para la inauguración del ramal ferroviario. Sin embargo, al cotejar las minutas de los agrimensores ingleses con la realidad del terreno, nota con indignación que los mapas oficiales omiten deliberadamente los vados, las aguadas comunitarias y los nombres que las familias criollas han utilizado durante generaciones. Decide salir al campo con su libreta de tela y un altímetro aneroide.

--- PÁGINA 3: Capítulo 2 - El cruce de los arrieros ---
En el paraje de Las Vertientes, Mateo se entrevista con doña Lorenza, una arriera veterana que conduce recuas de mulas a través de las abras de la sierra. Con paciencia infinita, Lorenza le enseña a leer los accidentes geográficos en función de las fuentes de agua, las corrientes de aire y las leyendas de cada risco. Mateo anota cada topónimo originario y comprueba que trazar una vía férrea sin respetar los pasos de arriería aislará a tres aldeas de la comarca.

--- PÁGINA 4: Capítulo 3 - Las dos capas del mapa ---
Al regresar al taller, Mateo enfrenta la oposición inicial de don Anselmo, quien teme perder el contrato gubernamental. No obstante, el aprendiz diseña una solución cartográfica magistral: una litografía a dos tintas superpuestas, donde la línea férrea en carmín convive armónicamente con la red de senderos vernáculos en sepia y azul. El ministerio no solo aprueba la propuesta, sino que adopta el formato bicolor como norma para futuros relevamientos territoriales.

--- PÁGINA 5: Epílogo - El territorio habitado ---
Medir un territorio no significa imponer una cuadrícula fría sobre la tierra viva; implica escuchar las pisadas de quienes la caminaron antes. El último mapa del taller de don Anselmo demostró que el progreso material y el respeto por las raíces culturales no son caminos opuestos, sino senderos complementarios que deben figurar con igual dignidad en la cartografía de una nación.`,
    totalPaginas: 5,
  },
];

// Cada capítulo tiene un resumen y cinco hechos que luego se convierten en
// preguntas sobre personaje, lugar, objeto, conflicto y resultado.
const capitulosIniciales: CapituloInicial[] = [
  {
    libroId: 1,
    capitulo: 1,
    tituloCapitulo: "La bitácora cerrada",
    contenido:
      "Inés Vidal vuelve a Puerto Bruma para ordenar los papeles de su abuelo. Una tormenta apaga el faro y, dentro de una bitácora, ella descubre una brújula de latón que apunta hacia una ruta dibujada a mano.",
    datosPregunta: {
      personaje: "Inés Vidal",
      lugar: "Puerto Bruma",
      objeto: "brújula de latón",
      conflicto: "la tormenta deja el faro sin señal",
      resultado: "Inés encuentra una ruta anotada por su abuelo",
    },
  },
  {
    libroId: 1,
    capitulo: 2,
    tituloCapitulo: "La cueva del vidrio",
    contenido:
      "Siguiendo la brújula, Inés llega a la Cueva Azul y encuentra un espejo de faro cubierto de sal. Los pescadores desconfían de su plan, pero una prueba con la marea muestra que el espejo puede volver a orientar la luz.",
    datosPregunta: {
      personaje: "Inés Vidal",
      lugar: "Cueva Azul",
      objeto: "espejo de faro cubierto de sal",
      conflicto: "los pescadores dudan de la ruta que propone Inés",
      resultado: "la prueba confirma que el espejo puede orientar la luz",
    },
  },
  {
    libroId: 1,
    capitulo: 3,
    tituloCapitulo: "La señal compartida",
    contenido:
      "Con el viento en calma, Inés y los vecinos limpian la lente y alinean el mecanismo. El faro vuelve a iluminar la bahía y una bitácora nueva guarda las observaciones de todo el pueblo.",
    datosPregunta: {
      personaje: "Inés Vidal",
      lugar: "bahía de Puerto Bruma",
      objeto: "lente del faro",
      conflicto: "la niebla oculta la entrada segura a la bahía",
      resultado: "el pueblo enciende el faro y comparte una nueva bitácora",
    },
  },
  {
    libroId: 2,
    capitulo: 1,
    tituloCapitulo: "El patio de azulejos",
    contenido:
      "Julián Soria encuentra un plano de azulejos bajo el patio de los Naranjos, en San Telmo del Valle. El mapa muestra un cauce antiguo justo cuando las fuentes del barrio empiezan a secarse.",
    datosPregunta: {
      personaje: "Julián Soria",
      lugar: "San Telmo del Valle",
      objeto: "plano de azulejos",
      conflicto: "las fuentes del barrio se están secando",
      resultado: "Julián descubre el trazado de un cauce antiguo",
    },
  },
  {
    libroId: 2,
    capitulo: 2,
    tituloCapitulo: "La acequia enterrada",
    contenido:
      "Julián recorre la calle de los Tilos con una cinta de medir y escucha versiones distintas sobre la acequia. Una marca de cal bajo un puente le permite localizar el tramo enterrado sin abrir las casas.",
    datosPregunta: {
      personaje: "Julián Soria",
      lugar: "calle de los Tilos",
      objeto: "cinta de medir",
      conflicto: "los testimonios del barrio no coinciden sobre la acequia",
      resultado: "Julián localiza el tramo enterrado junto al puente",
    },
  },
  {
    libroId: 2,
    capitulo: 3,
    tituloCapitulo: "Agua para la plaza",
    contenido:
      "Julián presenta el plano en la plaza del Molino y propone abrir un canal lateral. El agua vuelve a los naranjos después de una lluvia y los vecinos pintan el mapa para que todos puedan conservarlo.",
    datosPregunta: {
      personaje: "Julián Soria",
      lugar: "plaza del Molino",
      objeto: "mapa pintado por los vecinos",
      conflicto: "una lluvia intensa amenaza con inundar la plaza",
      resultado: "el canal lleva agua a los naranjos sin anegar la plaza",
    },
  },
  {
    libroId: 3,
    capitulo: 1,
    tituloCapitulo: "Semillas en Selene",
    contenido:
      "Vera Montes llega a la estación Selene para estudiar el jardín experimental. Las hojas pierden humedad durante la noche artificial y sus primeras mediciones señalan que el problema puede estar en el sustrato.",
    datosPregunta: {
      personaje: "Vera Montes",
      lugar: "estación lunar Selene",
      objeto: "muestra de regolito",
      conflicto: "las plantas pierden humedad durante la noche artificial",
      resultado: "Vera relaciona la pérdida de agua con el sustrato",
    },
  },
  {
    libroId: 3,
    capitulo: 2,
    tituloCapitulo: "La cámara fría",
    contenido:
      "Vera revisa la cámara de sombra y encuentra un registro térmico con caídas bruscas. En vez de añadir agua, ajusta los paneles para conservar calor sin alterar el ciclo de luz de las plantas.",
    datosPregunta: {
      personaje: "Vera Montes",
      lugar: "cámara de sombra de Selene",
      objeto: "registro térmico",
      conflicto: "la temperatura cae durante el ciclo de sombra",
      resultado: "Vera ajusta los paneles para conservar calor",
    },
  },
  {
    libroId: 3,
    capitulo: 3,
    tituloCapitulo: "Un ciclo completo",
    contenido:
      "Vera compara tres ciclos y confirma que las plantas mantienen la humedad con el nuevo ajuste. El equipo etiqueta las semillas supervivientes y convierte el jardín en un archivo de la misión.",
    datosPregunta: {
      personaje: "Vera Montes",
      lugar: "invernadero de la estación Selene",
      objeto: "bandeja de semillas etiquetadas",
      conflicto: "el equipo necesita comprobar que el ajuste funciona más de una noche",
      resultado: "el jardín supera tres ciclos y conserva semillas para futuras pruebas",
    },
  },
  {
    libroId: 4,
    capitulo: 1,
    tituloCapitulo: "Pulsos en Piedra Clara",
    contenido:
      "Nicolás Arce detecta pulsos regulares en el observatorio de Piedra Clara. La señal aparece durante una tormenta y el equipo teme que proceda de un aparato terrestre cercano.",
    datosPregunta: {
      personaje: "Nicolás Arce",
      lugar: "observatorio de Piedra Clara",
      objeto: "antena parabólica",
      conflicto: "la señal puede ser una interferencia terrestre",
      resultado: "Nicolás registra pulsos regulares para compararlos",
    },
  },
  {
    libroId: 4,
    capitulo: 2,
    tituloCapitulo: "El cuaderno de guardia",
    contenido:
      "Nicolás encuentra en el cuaderno de guardia una tabla de frecuencias que ayuda a separar el ruido de la ciudad. Reorienta la antena hacia el valle y logra repetir la observación en una noche despejada.",
    datosPregunta: {
      personaje: "Nicolás Arce",
      lugar: "valle detrás del observatorio",
      objeto: "cuaderno de guardia con frecuencias",
      conflicto: "el ruido de la ciudad tapa parte de la señal",
      resultado: "la antena capta los pulsos con menos interferencia",
    },
  },
  {
    libroId: 4,
    capitulo: 3,
    tituloCapitulo: "Una señal y muchas preguntas",
    contenido:
      "El equipo compara observaciones de varias noches y verifica que el patrón vuelve con un ritmo preciso. Nicolás prepara un informe que separa los datos medidos de las explicaciones todavía hipotéticas.",
    datosPregunta: {
      personaje: "Nicolás Arce",
      lugar: "sala de análisis de Piedra Clara",
      objeto: "gráfico de pulsos repetidos",
      conflicto: "el equipo debe distinguir una medición de una explicación posible",
      resultado: "el informe publica el patrón y deja abiertas sus causas",
    },
  },
  {
    libroId: 5,
    capitulo: 1,
    tituloCapitulo: "Tipos de plomo",
    contenido:
      "Emilia Sanz trabaja como aprendiz en una imprenta del puerto de Buenos Aires en 1810. Al ordenar los tipos de plomo, encuentra una carta de Clara que describe problemas para repartir harina.",
    datosPregunta: {
      personaje: "Emilia Sanz",
      lugar: "puerto de Buenos Aires en 1810",
      objeto: "carta de Clara",
      conflicto: "el barrio tiene dificultades para repartir harina",
      resultado: "Emilia encuentra una voz cotidiana entre los papeles de imprenta",
    },
  },
  {
    libroId: 5,
    capitulo: 2,
    tituloCapitulo: "La tinta y el sello",
    contenido:
      "Emilia lleva la carta al almacén de la Recova y compara su sello con otros documentos. Dos órdenes distintas ponen en riesgo el taller, pero una copia fechada permite saber quién escribió cada instrucción.",
    datosPregunta: {
      personaje: "Emilia Sanz",
      lugar: "almacén de la Recova",
      objeto: "copia fechada de la carta",
      conflicto: "dos órdenes distintas ponen en riesgo la imprenta",
      resultado: "la fecha y el sello aclaran el origen de cada instrucción",
    },
  },
  {
    libroId: 5,
    capitulo: 3,
    tituloCapitulo: "El cuaderno abierto",
    contenido:
      "Emilia reúne las cartas en un cuaderno y lo lleva a la plaza del Mercado. Los vecinos reconocen sus propias experiencias y acuerdan conservar las copias para que la historia no quede en una sola voz.",
    datosPregunta: {
      personaje: "Emilia Sanz",
      lugar: "plaza del Mercado",
      objeto: "cuaderno con las cartas copiadas",
      conflicto: "las cartas pueden perderse o quedar contadas por una sola voz",
      resultado: "el barrio conserva las copias como archivo compartido",
    },
  },
  {
    libroId: 6,
    capitulo: 1,
    tituloCapitulo: "El trazado nuevo",
    contenido:
      "Mateo Ríos aprende cartografía en Córdoba en 1897 mientras el ferrocarril cambia los caminos. En un plano recién llegado, nota que faltan nombres usados por arrieros y habitantes de la región.",
    datosPregunta: {
      personaje: "Mateo Ríos",
      lugar: "taller de mapas de Córdoba en 1897",
      objeto: "plano del ferrocarril",
      conflicto: "el plano nuevo omite caminos y nombres locales",
      resultado: "Mateo anota las diferencias en su libreta de campo",
    },
  },
  {
    libroId: 6,
    capitulo: 2,
    tituloCapitulo: "La libreta de campo",
    contenido:
      "Mateo viaja hasta el cruce de Los Sauces y escucha a una arriera que conoce los senderos. Con una regla de escala comprueba que los caminos antiguos siguen conectando las estancias.",
    datosPregunta: {
      personaje: "Mateo Ríos",
      lugar: "cruce de Los Sauces",
      objeto: "regla de escala",
      conflicto: "el nuevo trazado ignora rutas que todavía conectan las estancias",
      resultado: "Mateo confirma los senderos con una habitante de la región",
    },
  },
  {
    libroId: 6,
    capitulo: 3,
    tituloCapitulo: "Dos capas de memoria",
    contenido:
      "Mateo propone imprimir una lámina transparente sobre el mapa oficial en el taller de la calle Ancha. El maestro acepta mostrar el ferrocarril junto a los caminos comunitarios y conserva los nombres que los viajeros usan.",
    datosPregunta: {
      personaje: "Mateo Ríos",
      lugar: "taller de la calle Ancha",
      objeto: "lámina transparente para el mapa",
      conflicto: "el mapa debe mostrar el ferrocarril sin borrar los caminos comunitarios",
      resultado: "el taller imprime un plano con las dos capas de información",
    },
  },
];

// Cinco términos de vocabulario por libro, con ejemplos cuando ayudan a
// entender cómo aparece el término dentro del relato.
const lexicoPorLibro: Record<
  number,
  { termino: string; definicion: string; ejemplo?: string }[]
> = {
  1: [
    { termino: "bitácora", definicion: "Cuaderno donde se anotan sucesos y observaciones.", ejemplo: "Inés ordenó la bitácora del farero." },
    { termino: "bajamar", definicion: "Momento en que la marea alcanza su nivel más bajo." },
    { termino: "lente", definicion: "Pieza transparente que concentra o dirige la luz.", ejemplo: "La lente devolvió el destello hacia la bahía." },
    { termino: "rompeolas", definicion: "Construcción que reduce la fuerza de las olas junto a la costa." },
    { termino: "derrotero", definicion: "Ruta que sigue una embarcación durante un viaje." },
  ],
  2: [
    { termino: "acequia", definicion: "Canal pequeño que conduce agua para riego o abastecimiento.", ejemplo: "La acequia llevaba agua hasta los naranjos." },
    { termino: "cauce", definicion: "Lecho por el que corre o ha corrido agua." },
    { termino: "escorrentía", definicion: "Agua de lluvia que circula por la superficie del terreno." },
    { termino: "azulejo", definicion: "Baldosa de cerámica esmaltada usada para cubrir superficies." },
    { termino: "nivelación", definicion: "Medición que compara alturas de distintos puntos." },
  ],
  3: [
    { termino: "regolito", definicion: "Capa de polvo y fragmentos sueltos que cubre una superficie rocosa." },
    { termino: "germinación", definicion: "Inicio del desarrollo de una semilla bajo condiciones adecuadas.", ejemplo: "La germinación comenzó después de ajustar el calor." },
    { termino: "sustrato", definicion: "Material donde se fijan las raíces y del que obtienen soporte." },
    { termino: "fotosíntesis", definicion: "Proceso por el que ciertas plantas usan luz para producir nutrientes." },
    { termino: "microclima", definicion: "Condiciones ambientales particulares de un espacio reducido." },
  ],
  4: [
    { termino: "frecuencia", definicion: "Cantidad de ciclos de una señal que ocurren por unidad de tiempo." },
    { termino: "interferencia", definicion: "Alteración que dificulta distinguir una señal de otras emisiones." },
    { termino: "antena", definicion: "Dispositivo que recibe o transmite ondas electromagnéticas.", ejemplo: "Nicolás orientó la antena hacia el valle." },
    { termino: "pulso", definicion: "Variación breve y reconocible dentro de una señal." },
    { termino: "observatorio", definicion: "Lugar equipado para estudiar fenómenos astronómicos." },
  ],
  5: [
    { termino: "imprenta", definicion: "Taller o sistema que reproduce textos en múltiples copias." },
    { termino: "tipo móvil", definicion: "Pieza individual con una letra o signo usada para componer una página." },
    { termino: "archivo", definicion: "Conjunto organizado de documentos que se conservan como registro." },
    { termino: "sello", definicion: "Marca que identifica o cierra un documento.", ejemplo: "El sello ayudó a reconocer el origen de la carta." },
    { termino: "abastecimiento", definicion: "Provisión de bienes necesarios para una comunidad." },
  ],
  6: [
    { termino: "cartografía", definicion: "Técnica y conocimiento para elaborar mapas." },
    { termino: "escala", definicion: "Relación entre una distancia en el mapa y la distancia real." },
    { termino: "topónimo", definicion: "Nombre propio asignado a un lugar geográfico." },
    { termino: "trazado", definicion: "Recorrido o disposición de una ruta sobre el territorio.", ejemplo: "El trazado ferroviario cruzaba antiguos senderos." },
    { termino: "leyenda", definicion: "Clave que explica símbolos y colores usados en un mapa." },
  ],
};

// Progreso independiente para ambos perfiles de lectura.
const progresoInicial = [
  { id: 1, libroId: 1, usuarioId: 1, paginaActual: 240, completado: true, ultimaLectura: "2026-10-22T19:10:00.000Z", porcentaje: 100 },
  { id: 2, libroId: 2, usuarioId: 1, paginaActual: 62, completado: false, ultimaLectura: "2026-10-21T17:30:00.000Z", porcentaje: 34 },
  { id: 3, libroId: 3, usuarioId: 1, paginaActual: 0, completado: false, ultimaLectura: null, porcentaje: 0 },
  { id: 4, libroId: 4, usuarioId: 1, paginaActual: 111, completado: false, ultimaLectura: "2026-10-20T20:15:00.000Z", porcentaje: 57 },
  { id: 5, libroId: 5, usuarioId: 1, paginaActual: 140, completado: true, ultimaLectura: "2026-10-19T15:00:00.000Z", porcentaje: 100 },
  { id: 6, libroId: 6, usuarioId: 1, paginaActual: 0, completado: false, ultimaLectura: null, porcentaje: 0 },
  { id: 7, libroId: 1, usuarioId: 2, paginaActual: 48, completado: false, ultimaLectura: "2026-10-24T12:00:00.000Z", porcentaje: 20 },
  { id: 8, libroId: 2, usuarioId: 2, paginaActual: 0, completado: false, ultimaLectura: null, porcentaje: 0 },
  { id: 9, libroId: 3, usuarioId: 2, paginaActual: 160, completado: true, ultimaLectura: "2026-10-23T11:00:00.000Z", porcentaje: 100 },
  { id: 10, libroId: 4, usuarioId: 2, paginaActual: 0, completado: false, ultimaLectura: null, porcentaje: 0 },
  { id: 11, libroId: 5, usuarioId: 2, paginaActual: 35, completado: false, ultimaLectura: "2026-10-24T10:15:00.000Z", porcentaje: 25 },
  { id: 12, libroId: 6, usuarioId: 2, paginaActual: 0, completado: false, ultimaLectura: null, porcentaje: 0 },
];

// Colores contrastantes distinguen los perfiles también en el selector.
const usuariosIniciales = [
  { id: 1, nombre: "Lector 1", avatarColor: "#e2b04a", rol: "admin" as const },
  { id: 2, nombre: "Lector 2", avatarColor: "#6179c9", rol: "lector" as const },
];

// Recordatorios activos para cada perfil.
const recordatoriosIniciales = [
  {
    id: 1,
    libroId: 2,
    usuarioId: 1,
    mensaje: "Retomar el capítulo de la acequia enterrada.",
    fechaHora: "2026-10-24T18:00:00.000Z",
    activo: true,
    notificado: false,
  },
  {
    id: 2,
    libroId: 4,
    usuarioId: 1,
    mensaje: "Revisar las notas sobre la señal de Piedra Clara.",
    fechaHora: "2026-10-25T16:30:00.000Z",
    activo: true,
    notificado: false,
  },
  {
    id: 3,
    libroId: 3,
    usuarioId: 2,
    mensaje: "Repasar las notas sobre germinación y regolito.",
    fechaHora: "2026-10-25T19:00:00.000Z",
    activo: true,
    notificado: false,
  },
];

// Historial inicial de intentos para demostrar la recarga según el perfil activo.
const resultadosIniciales = [
  {
    id: 1,
    examenId: 1,
    usuarioId: 1,
    correctas: 4,
    incorrectas: 1,
    porcentaje: 80,
    fecha: "2026-10-23T14:00:00.000Z",
  },
  {
    id: 2,
    examenId: 7,
    usuarioId: 2,
    correctas: 5,
    incorrectas: 0,
    porcentaje: 100,
    fecha: "2026-10-24T15:30:00.000Z",
  },
];

// La misma tabla de hechos ofrece respuestas incorrectas plausibles para las
// preguntas. Se eliminan valores repetidos, por ejemplo el personaje de varios
// capítulos del mismo libro.
const valoresPorAspecto: Record<AspectoPregunta, string[]> = {
  personaje: [...new Set(capitulosIniciales.map((capitulo) => capitulo.datosPregunta.personaje))],
  lugar: [...new Set(capitulosIniciales.map((capitulo) => capitulo.datosPregunta.lugar))],
  objeto: [...new Set(capitulosIniciales.map((capitulo) => capitulo.datosPregunta.objeto))],
  conflicto: [...new Set(capitulosIniciales.map((capitulo) => capitulo.datosPregunta.conflicto))],
  resultado: [...new Set(capitulosIniciales.map((capitulo) => capitulo.datosPregunta.resultado))],
};

// Cada resumen genera una pregunta por cada uno de sus cinco aspectos.
const aspectosDePregunta: { clave: AspectoPregunta; enunciado: string }[] = [
  { clave: "personaje", enunciado: "¿Quién protagoniza" },
  { clave: "lugar", enunciado: "¿En qué lugar se desarrolla" },
  { clave: "objeto", enunciado: "¿Qué elemento importante aparece en" },
  { clave: "conflicto", enunciado: "¿Qué problema enfrenta el personaje en" },
  { clave: "resultado", enunciado: "¿Qué ocurre al final de" },
];

/**
 * Construye cinco preguntas de opción múltiple para un resumen.
 *
 * Algoritmo:
 * 1. Recorre los cinco aspectos definidos: protagonista, lugar, objeto,
 *    conflicto y resultado.
 * 2. Toma el dato correcto del resumen actual.
 * 3. Elige tres valores distintos del mismo aspecto en otros capítulos para
 *    usarlos como distractores.
 * 4. Inserta la respuesta correcta en A, B, C o D de forma rotativa, así la
 *    posición no queda siempre en la misma opción.
 * 5. Devuelve filas con IDs deterministas y una explicación para cada respuesta.
 */
function crearPreguntasDeExamen(
  idExamen: number,
  idResumen: number,
  resumen: CapituloInicial,
) {
  const letrasDeRespuesta = ["A", "B", "C", "D"] as const;

  return aspectosDePregunta.map((aspecto, indicePregunta) => {
    // La respuesta correcta sale directamente de los hechos de este capítulo.
    const respuesta = resumen.datosPregunta[aspecto.clave];

    // Se filtra el valor correcto antes de recorrer las alternativas posibles.
    const alternativasDisponibles = valoresPorAspecto[aspecto.clave].filter(
      (alternativa) => alternativa !== respuesta,
    );

    // El desplazamiento hace que los distractores varíen entre capítulos.
    const inicioAlternativas =
      (idResumen + indicePregunta) % alternativasDisponibles.length;
    const opcionesIncorrectas: string[] = [];

    // Se toman tres alternativas en orden circular para cubrir todos los casos.
    for (
      let desplazamiento = 0;
      desplazamiento < alternativasDisponibles.length &&
      opcionesIncorrectas.length < 3;
      desplazamiento += 1
    ) {
      const indiceAlternativa =
        (inicioAlternativas + desplazamiento) % alternativasDisponibles.length;
      opcionesIncorrectas.push(alternativasDisponibles[indiceAlternativa]!);
    }

    // La letra correcta rota entre las cuatro posiciones disponibles.
    const indiceRespuesta = indicePregunta % letrasDeRespuesta.length;
    const opciones = [...opcionesIncorrectas];
    opciones.splice(indiceRespuesta, 0, respuesta);

    return {
      id: (idExamen - 1) * aspectosDePregunta.length + indicePregunta + 1,
      examenId: idExamen,
      enunciado: `${aspecto.enunciado} el capítulo «${resumen.tituloCapitulo}»?`,
      opcionA: opciones[0]!,
      opcionB: opciones[1]!,
      opcionC: opciones[2]!,
      opcionD: opciones[3]!,
      respuestaCorrecta: letrasDeRespuesta[indiceRespuesta],
      explicacion: `El resumen indica que «${respuesta}» es la respuesta correcta.`,
    };
  });
}

/**
 * Puebla la base de datos con categorías, libros, resúmenes, mapas, vocabulario,
 * preguntas, usuarios y módulos iniciales.
 */
export async function sembrarDatos(conexionExistente?: {
  baseDatos: BaseDatosBiblioteca;
  cliente: ClienteBaseDeDatos;
  modo: "turso" | "sqlite";
}) {
  const debeCerrar = !conexionExistente;
  const conexion = conexionExistente ?? (await crearBaseDeDatos());
  const { baseDatos, cliente, modo } = conexion;

  try {
  // Los IDs de los resúmenes se calculan a partir del libro y el capítulo.
  const resumenesIniciales = capitulosIniciales.map((capitulo) => ({
    id: (capitulo.libroId - 1) * 3 + capitulo.capitulo,
    libroId: capitulo.libroId,
    capitulo: capitulo.capitulo,
    tituloCapitulo: capitulo.tituloCapitulo,
    contenido: capitulo.contenido,
    orden: capitulo.capitulo,
  }));

  // Un mapa y un examen se relacionan con cada resumen mediante el mismo ID.
  const mapasIniciales = capitulosIniciales.map((capitulo) => {
    const idResumen = (capitulo.libroId - 1) * 3 + capitulo.capitulo;

    return {
      id: idResumen,
      libroId: capitulo.libroId,
      resumenId: idResumen,
      titulo: `Mapa conceptual: ${capitulo.tituloCapitulo}`,
      datosNodos: [
        { id: "personaje", etiqueta: capitulo.datosPregunta.personaje },
        { id: "lugar", etiqueta: capitulo.datosPregunta.lugar },
        { id: "objeto", etiqueta: capitulo.datosPregunta.objeto },
        { id: "conflicto", etiqueta: capitulo.datosPregunta.conflicto },
        { id: "resultado", etiqueta: capitulo.datosPregunta.resultado },
      ],
      datosConexiones: [
        { origen: "personaje", destino: "lugar", etiqueta: "actúa en" },
        { origen: "lugar", destino: "objeto", etiqueta: "revela" },
        { origen: "objeto", destino: "conflicto", etiqueta: "se relaciona con" },
        { origen: "conflicto", destino: "resultado", etiqueta: "se resuelve en" },
      ],
    };
  });

  // Los términos reciben IDs únicos y estables calculados por libro y posición.
  const lexicoInicial = librosIniciales.flatMap((libro) =>
    lexicoPorLibro[libro.id]!.map((termino, indiceTermino) => ({
      id: (libro.id - 1) * 5 + indiceTermino + 1,
      libroId: libro.id,
      termino: termino.termino,
      definicion: termino.definicion,
      ejemplo: termino.ejemplo ?? null,
    })),
  );

  // Los exámenes tienen IDs iguales a los resúmenes a los que pertenecen.
  const examenesIniciales = capitulosIniciales.map((capitulo) => {
    const idResumen = (capitulo.libroId - 1) * 3 + capitulo.capitulo;

    return {
      id: idResumen,
      libroId: capitulo.libroId,
      resumenId: idResumen,
      titulo: `Examen: ${capitulo.tituloCapitulo}`,
      totalPreguntas: aspectosDePregunta.length,
    };
  });

  // Cada examen se expande a las cinco preguntas definidas por sus hechos.
  const preguntasIniciales = examenesIniciales.flatMap((examen) => {
    const resumen = capitulosIniciales[examen.id - 1]!;
    return crearPreguntasDeExamen(examen.id, examen.id, resumen);
  });

  // Se generan dos módulos por libro y su estado refleja el progreso de lectura.
  const modulosIniciales = librosIniciales.flatMap((libro) => {
    const progreso = progresoInicial.find((elemento) => elemento.libroId === libro.id)!;

    return [
      {
        id: (libro.id - 1) * 2 + 1,
        libroId: libro.id,
        titulo: "Lectura de los capítulos 1 y 2",
        orden: 1,
        completado: progreso.completado || progreso.porcentaje >= 50,
        fechaCompletado: progreso.completado || progreso.porcentaje >= 50
          ? progreso.ultimaLectura
          : null,
      },
      {
        id: (libro.id - 1) * 2 + 2,
        libroId: libro.id,
        titulo: "Lectura del capítulo 3",
        orden: 2,
        completado: progreso.completado,
        fechaCompletado: progreso.completado ? progreso.ultimaLectura : null,
      },
    ];
  });

  // Toda la carga ocurre en una transacción: ante un error no queda una siembra
  // parcial que luego sea difícil de distinguir de una carga completa.
  if (modo === "turso") {
    await (baseDatos as any).transaction(async (transaccion: any) => {
      // Se insertan primero las tablas padre para que las claves foráneas existan.
      await transaccion.insert(usuarios).values(usuariosIniciales).onConflictDoNothing();
      await transaccion.insert(categorias).values(categoriasIniciales).onConflictDoNothing();
      await transaccion.insert(libros).values(librosIniciales).onConflictDoNothing();
      await transaccion.insert(resumenes).values(resumenesIniciales).onConflictDoNothing();

      // Luego se insertan las tablas dependientes de libros y resúmenes.
      await transaccion.insert(mapasConceptuales).values(mapasIniciales).onConflictDoNothing();
      await transaccion.insert(lexico).values(lexicoInicial).onConflictDoNothing();
      await transaccion.insert(examenes).values(examenesIniciales).onConflictDoNothing();
      await transaccion.insert(preguntas).values(preguntasIniciales).onConflictDoNothing();
      await transaccion.insert(progresoUsuario).values(progresoInicial).onConflictDoNothing();
      await transaccion.insert(modulos).values(modulosIniciales).onConflictDoNothing();
      // Al repetir la siembra, se asigna a los módulos anteriores la fecha de
      // lectura existente sin reemplazar fechas de finalización ya registradas.
      await transaccion
        .update(modulos)
        .set({
          fechaCompletado: consultaSQL`(
            SELECT ${progresoUsuario.ultimaLectura}
            FROM ${progresoUsuario}
            WHERE ${progresoUsuario.libroId} = ${modulos.libroId}
              AND ${progresoUsuario.usuarioId} = 1
          )`,
        })
        .where(
          y(
            igual(modulos.completado, true),
            esNulo(modulos.fechaCompletado),
          ),
        );
      await transaccion.insert(recordatorios).values(recordatoriosIniciales).onConflictDoNothing();
      await transaccion.insert(resultadosExamen).values(resultadosIniciales).onConflictDoNothing();
    });
  } else {
    (baseDatos as any).transaction((transaccion: any) => {
      transaccion.insert(usuarios).values(usuariosIniciales).onConflictDoNothing().run();
      transaccion.insert(categorias).values(categoriasIniciales).onConflictDoNothing().run();
      transaccion.insert(libros).values(librosIniciales).onConflictDoNothing().run();
      transaccion.insert(resumenes).values(resumenesIniciales).onConflictDoNothing().run();

      transaccion.insert(mapasConceptuales).values(mapasIniciales).onConflictDoNothing().run();
      transaccion.insert(lexico).values(lexicoInicial).onConflictDoNothing().run();
      transaccion.insert(examenes).values(examenesIniciales).onConflictDoNothing().run();
      transaccion.insert(preguntas).values(preguntasIniciales).onConflictDoNothing().run();
      transaccion.insert(progresoUsuario).values(progresoInicial).onConflictDoNothing().run();
      transaccion.insert(modulos).values(modulosIniciales).onConflictDoNothing().run();
      transaccion
        .update(modulos)
        .set({
          fechaCompletado: consultaSQL`(
            SELECT ${progresoUsuario.ultimaLectura}
            FROM ${progresoUsuario}
            WHERE ${progresoUsuario.libroId} = ${modulos.libroId}
              AND ${progresoUsuario.usuarioId} = 1
          )`,
        })
        .where(
          y(
            igual(modulos.completado, true),
            esNulo(modulos.fechaCompletado),
          ),
        )
        .run();
      transaccion.insert(recordatorios).values(recordatoriosIniciales).onConflictDoNothing().run();
      transaccion.insert(resultadosExamen).values(resultadosIniciales).onConflictDoNothing().run();
    });
  }

  // La consulta posterior informa los totales realmente presentes en la base.
  const conteos = await cliente.execute(`
    SELECT
      (SELECT COUNT(*) FROM usuarios) AS usuarios,
      (SELECT COUNT(*) FROM categorias) AS categorias,
      (SELECT COUNT(*) FROM libros) AS libros,
      (SELECT COUNT(*) FROM resumenes) AS resumenes,
      (SELECT COUNT(*) FROM mapasConceptuales) AS mapasConceptuales,
      (SELECT COUNT(*) FROM lexico) AS lexico,
      (SELECT COUNT(*) FROM examenes) AS examenes,
      (SELECT COUNT(*) FROM preguntas) AS preguntas,
      (SELECT COUNT(*) FROM progresoUsuario) AS progresoUsuario,
      (SELECT COUNT(*) FROM modulos) AS modulos,
      (SELECT COUNT(*) FROM recordatorios WHERE activo = 1) AS recordatoriosActivos,
      (SELECT COUNT(*) FROM resultadosExamen) AS resultadosExamen
  `);

  // Se imprime la fila de conteos para que la ejecución de la siembra sea
  // revisable sin abrir manualmente el archivo SQLite.
  console.log("Siembra completada. Filas presentes:", conteos.rows[0]);
  return conteos.rows[0];
} finally {
  // Se cierra el cliente solo si fue creado dentro de esta invocación
  if (debeCerrar) {
    await cliente.close();
  }
}
}

// Ejecución directa por CLI con `tsx src/db/sembrar.ts`
const archivoEjecutado = process.argv[1]?.replace(/\\/g, "/");
if (archivoEjecutado && (archivoEjecutado.endsWith("sembrar.ts") || archivoEjecutado.endsWith("sembrar.js"))) {
  await sembrarDatos();
}

