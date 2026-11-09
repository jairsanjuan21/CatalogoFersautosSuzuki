/**
 * MAPA DEL FORMATO F-NS-01 (versión 1, 5/04/2016)
 *
 * Coordenadas medidas sobre el PDF original con pdfplumber, en puntos (1/72 de
 * pulgada), con el origen ARRIBA a la izquierda, igual que en la herramienta.
 * El generador las convierte al sistema de pdf-lib (origen ABAJO a la izquierda).
 *
 * Si Fersautos saca una versión nueva del formato, solo cambia este archivo.
 *
 *   Celda   = [x0, x1, arriba, abajo]  → caja donde va el texto
 *   Marca   = [centroX, abajoDelSubrayado] → donde va la "X"
 *   Linea   = [x, yDelSubrayado]       → texto sobre una línea, sin celda
 */

export type Celda = readonly [x0: number, x1: number, arriba: number, abajo: number];
export type Marca = readonly [cx: number, abajo: number];
export type Linea = readonly [x: number, y: number];
export type Fecha = readonly [dd: Celda, mm: Celda, aa: Celda];

export const ALTO_PAGINA = 841.92;

const fila = (arriba: number, abajo: number) => (x0: number, x1: number): Celda => [x0, x1, arriba, abajo];

/* ---------- PÁGINA 1 ---------- */

const encabezado = fila(103.0, 116.8);
const filaAsesor = fila(139.3, 153.1);
const filaVehiculo = fila(183.5, 197.3);
const filaValores = fila(227.7, 241.5);
const filaPlazo = fila(241.5, 255.3);
const filaApellidos = fila(271.8, 285.6);
const filaDocumento = fila(285.6, 299.4);
const filaFechas = fila(299.4, 313.2);
const filaCivil = fila(313.2, 327.0);
const filaDireccion = fila(327.0, 340.8);
const filaBarrio = fila(340.8, 354.6);
const filaCelular = fila(354.6, 368.4);
const filaResidencia = fila(368.4, 382.2);
const filaArrendador = fila(382.2, 396.0);
const filaEmpresa = fila(426.4, 446.2);
const filaDirEmpresa = fila(446.2, 460.0);
const filaCargo = fila(460.0, 473.8);
const filaAnterior = fila(473.8, 487.6);
const filaAnterior2 = fila(487.6, 501.4);
const filaInmueble = fila(692.9, 713.9);
const filaVehiculoCliente = fila(748.7, 762.5);

export const P1 = {
  ciudad: [72, 116.8] as Linea,
  sede: [260, 116.8] as Linea,
  fechaDiligenciamiento: [encabezado(444.7, 471.6), encabezado(471.6, 498.5), encabezado(498.5, 552.2)] as Fecha,

  asesor: filaAsesor(68.3, 364.0),
  asesorCc: filaAsesor(390.9, 565.7),
  marcaSolicitante: [140.0, 164.2] as Marca,
  marcaCredito: [406.4, 164.2] as Marca,

  marca: filaVehiculo(68.3, 175.8),
  clase: filaVehiculo(202.7, 310.3),
  linea: filaVehiculo(337.1, 458.1),
  modelo: filaVehiculo(498.5, 565.7),
  marcaNuevo: [138.6, 208.3] as Marca,
  marcaParticular: [447.8, 208.3] as Marca,

  valorVehiculo: filaValores(108.6, 216.2),
  cuotaInicial: filaValores(283.4, 390.9),
  valorAFinanciar: filaValores(471.6, 565.7),
  plazo: filaPlazo(54.9, 175.8),
  planFinanciacion: filaPlazo(269.9, 458.1),

  primerApellido: filaApellidos(95.2, 189.3),
  segundoApellido: filaApellidos(269.9, 364.0),
  nombres: filaApellidos(404.4, 565.7),
  marcaCc: [156.9, 296.7] as Marca,
  marcaCe: [210.4, 296.7] as Marca,
  numeroIdentificacion: filaDocumento(269.9, 417.8),
  lugarExpedicion: filaDocumento(444.7, 565.7),
  fechaExpedicion: [filaFechas(122.1, 149.0), filaFechas(149.0, 175.8), filaFechas(175.8, 202.7)] as Fecha,
  fechaNacimiento: [filaFechas(296.8, 323.7), filaFechas(323.7, 350.6), filaFechas(350.6, 377.5)] as Fecha,
  lugarNacimiento: filaFechas(471.6, 565.7),

  marcaF: [94.1, 324.3] as Marca,
  marcaM: [123.7, 324.3] as Marca,
  estadoCivil: filaCivil(189.3, 269.9),
  personasACargo: filaCivil(350.6, 377.5),
  profesion: filaCivil(471.6, 565.7),

  direccion: filaDireccion(135.5, 458.1),
  estrato: filaDireccion(511.9, 565.7),
  barrio: filaBarrio(54.9, 229.6),
  ciudadResidencia: filaBarrio(269.9, 404.4),
  telefonoFijo: filaBarrio(485.0, 565.7),
  celular: filaCelular(68.3, 216.2),
  correo: filaCelular(296.8, 565.7),

  marcaVivienda: { familiar: [207.8, 379.5], propia: [274.3, 379.5], arrendada: [352.9, 379.5] } as Record<string, Marca>,
  tiempoVivienda: filaResidencia(471.6, 565.7),
  arrendadorNombre: filaArrendador(108.6, 269.9),
  arrendadorTelefono: filaArrendador(364.0, 431.3),
  valorArriendo: filaArrendador(498.5, 565.7),

  marcaActividad: {
    empleado: [183.1, 423.7],
    independiente: [287.2, 423.7],
    pensionado: [378.7, 423.7],
    rentista: [457.1, 423.7],
  } as Record<string, Marca>,
  empresa: filaEmpresa(296.8, 565.7),
  direccionEmpresa: filaDirEmpresa(108.6, 404.4),
  telefonoEmpresa: filaDirEmpresa(485.0, 565.7),
  cargo: filaCargo(68.3, 216.2),
  antiguedad: filaCargo(269.9, 323.7),
  marcaContrato: { fijo: [433.7, 471.1], indefinido: [492.9, 471.1], servicios: [549.9, 471.1] } as Record<string, Marca>,

  anteriorEmpresa: filaAnterior(189.3, 350.6),
  anteriorCargo: filaAnterior(390.9, 565.7),
  anteriorAntiguedad: filaAnterior2(81.7, 162.4),
  anteriorTelefono: filaAnterior2(243.1, 323.7),
  marcaContratoAnterior: { fijo: [433.7, 498.7], indefinido: [492.9, 498.7], servicios: [549.9, 498.7] } as Record<string, Marca>,

  totalIngresos: [120, 599.1] as Linea,
  totalEgresos: [402, 612.9] as Linea,
  marcaRenta: { si: [148.8, 659.7], no: [184.5, 659.7] } as Record<string, Marca>,
  marcaMonedaExtranjera: { si: [481.0, 659.7], no: [516.8, 659.7] } as Record<string, Marca>,

  inmueble: {
    numero: filaInmueble(28.0, 54.9),
    direccion: filaInmueble(54.9, 175.8),
    ciudad: filaInmueble(175.8, 243.1),
    marcaClase: { apartamento: [271.4, 702.7], casa: [299.9, 702.7], local: [271.8, 712.4], finca: [302.1, 712.4] } as Record<string, Marca>,
    matricula: filaInmueble(310.3, 404.4),
    valor: filaInmueble(404.4, 485.0),
    hipoteca: filaInmueble(485.0, 565.7),
  },
  vehiculo: {
    marca: filaVehiculoCliente(28.0, 95.2),
    placa: filaVehiculoCliente(95.2, 135.5),
    modelo: filaVehiculoCliente(135.5, 202.7),
    valor: filaVehiculoCliente(202.7, 323.7),
    pignoradoA: filaVehiculoCliente(323.7, 444.7),
    saldo: filaVehiculoCliente(444.7, 565.7),
  },
} as const;

/* ---------- PÁGINA 2 ---------- */

const c = (x0: number, x1: number, arriba: number, abajo: number): Celda => [x0, x1, arriba, abajo];

export const P2 = {
  refFamiliarNombre: c(95.2, 256.5, 69.4, 83.2),
  refFamiliarParentesco: c(323.7, 431.3, 69.4, 83.2),
  refFamiliarCelular: c(471.6, 565.7, 69.4, 83.2),
  refPersonalNombre: c(95.2, 431.3, 124.6, 138.4),
  refPersonalCelular: c(471.6, 565.7, 124.6, 138.4),
  refComercialNombre: c(95.2, 431.3, 179.8, 193.6),
  refComercialCelular: c(471.6, 565.7, 179.8, 193.6),

  conyuge: {
    primerApellido: c(95.2, 189.3, 251.6, 265.4),
    segundoApellido: c(269.9, 364.0, 251.6, 265.4),
    nombres: c(404.4, 565.7, 251.6, 265.4),
    marcaCc: [163.6, 276.4] as Marca,
    marcaCe: [217.1, 276.4] as Marca,
    numeroIdentificacion: c(283.4, 390.9, 265.4, 279.2),
    fechaNacimiento: [c(122.1, 149.0, 279.2, 293.0), c(149.0, 175.8, 279.2, 293.0), c(175.8, 202.7, 279.2, 293.0)] as Fecha,
    profesion: c(122.1, 256.5, 293.0, 306.8),
    marcaActividad: {
      empleado: [323.3, 304.0],
      independiente: [410.2, 304.0],
      pensionado: [484.4, 304.0],
      rentista: [545.6, 304.0],
    } as Record<string, Marca>,
    empresa: c(296.8, 565.7, 306.8, 328.8),
    celular: c(68.3, 175.8, 342.6, 356.4),
    ingresoMensual: c(364.0, 565.7, 356.4, 370.2),
  },

  // Firma sobre la línea "FIRMA DEL SOLICITANTE" (x 33–174, línea en y ≈ 728)
  firma: { x0: 36, x1: 172, arriba: 680, abajo: 726 },
  firmaCc: [72, 749] as Linea,
  constancia: [30, 790] as Linea,
} as const;
