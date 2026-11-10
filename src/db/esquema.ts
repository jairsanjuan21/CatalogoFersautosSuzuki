import {
  pgTable,
  pgEnum,
  pgSequence,
  pgView,
  smallint,
  integer,
  bigint,
  bigserial,
  text,
  boolean,
  date,
  timestamp,
  uuid,
  inet,
  jsonb,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ============================================================================
   CONVENCIONES
   - Dinero en pesos colombianos como bigint (enteros). Nunca float: 0.1 + 0.2
     no da 0.3 en punto flotante, y en plata eso no se negocia.
   - Fechas con zona horaria (timestamptz).
   - Nombres en camelCase en TypeScript; Drizzle los convierte a snake_case.
   ========================================================================== */

const pesos = () => bigint({ mode: "number" });
const creadoEn = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const actualizadoEn = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ============================================================================
   ENUMS: la base de datos rechaza cualquier valor fuera de estas listas
   ========================================================================== */

export const estadoSolicitud = pgEnum("estado_solicitud", [
  "pendiente_valor",
  "lista_para_cargar",
  "en_estudio",
  "aprobada",
  "negada",
  "entregada",
  "desistio",
]);
export const origenSolicitud = pgEnum("origen_solicitud", [
  "instagram",
  "facebook",
  "whatsapp",
  "estados",
  "catalogo",
  "qr",
  "directo",
]);
export const tipoVehiculo = pgEnum("tipo_vehiculo", [
  "hatchback",
  "sedan",
  "suv",
  "todoterreno",
  "familiar",
]);
export const tipoIdentificacion = pgEnum("tipo_identificacion", ["cc", "ce"]);
export const genero = pgEnum("genero", ["f", "m"]);
export const estadoCivil = pgEnum("estado_civil", [
  "soltero",
  "casado",
  "union_libre",
  "separado",
  "divorciado",
  "viudo",
]);
export const tipoVivienda = pgEnum("tipo_vivienda", ["familiar", "propia", "arrendada"]);
export const actividadEconomica = pgEnum("actividad_economica", [
  "empleado",
  "independiente",
  "pensionado",
  "rentista",
]);
export const tipoContrato = pgEnum("tipo_contrato", ["fijo", "indefinido", "servicios"]);
export const tipoReferencia = pgEnum("tipo_referencia", ["familiar", "personal", "comercial"]);
export const claseInmueble = pgEnum("clase_inmueble", ["apartamento", "casa", "local", "finca"]);
export const tipoArchivo = pgEnum("tipo_archivo", [
  "cedula_frente",
  "cedula_reves",
  "firma",
  "pdf_formulario",
  "pdf_cedula",
]);
export const origenPrecio = pgEnum("origen_precio", ["manual", "pdf_ia"]);
export const actor = pgEnum("actor", ["cliente", "asesora", "admin", "sistema"]);

/* ============================================================================
   AUTENTICACIÓN (Better Auth)
   Los nombres en inglés son los que espera la librería; así su documentación
   aplica tal cual. Solo hay dos cuentas: Natalia (asesora) y Jair (admin).
   ========================================================================== */

export const user = pgTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    role: text().notNull().default("asesora"),
    banned: boolean().default(false), // "desactivar cuenta" desde el panel de admin
    banReason: text(),
    banExpires: timestamp({ withTimezone: true }),
    createdAt: creadoEn(),
    updatedAt: actualizadoEn(),
  },
  (t) => [check("user_rol_valido", sql`${t.role} in ('asesora', 'admin')`)],
);

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: creadoEn(),
    updatedAt: actualizadoEn(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text(),
  },
  (t) => [index("session_usuario").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(), // hash, nunca la contraseña
    createdAt: creadoEn(),
    updatedAt: actualizadoEn(),
  },
  (t) => [index("account_usuario").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: creadoEn(),
    updatedAt: actualizadoEn(),
  },
  (t) => [index("verification_identificador").on(t.identifier)],
);

/* ============================================================================
   CONFIGURACIÓN Y CLÁUSULAS
   ========================================================================== */

/** Fila única (id = 1) con los datos fijos del formulario y las reglas del sistema. */
export const configuracion = pgTable(
  "configuracion",
  {
    id: smallint().primaryKey().default(1),
    asesoraNombre: text().notNull(),
    asesoraCc: text().notNull(),
    asesoraWhatsapp: text(),
    asesoraFrase: text().notNull().default("Te acompaño en todo el proceso para que estrenes tu Suzuki."),
    asesoraFoto: text(), // clave base de la foto pública (sin tamaño ni extensión)
    ciudad: text().notNull().default("Cúcuta"),
    sede: text().notNull(),
    marcaPorDefecto: text().notNull().default("Suzuki"),
    planFinanciacion: text().notNull().default("Tradicional"),
    plazosMeses: integer().array().notNull().default(sql`'{12,24,36,48,60,72,84}'`),
    diasVigenciaPrecio: smallint().notNull().default(7),
    diasRetencionDocumentos: smallint().notNull().default(90),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    check("configuracion_fila_unica", sql`${t.id} = 1`),
    check("configuracion_frase_corta", sql`char_length(${t.asesoraFrase}) <= 140`),
    check("configuracion_whatsapp", sql`${t.asesoraWhatsapp} is null or ${t.asesoraWhatsapp} ~ '^3[0-9]{9}$'`),
  ],
);

/** Versiones del texto de autorización. Cada solicitud guarda cuál aceptó el cliente. */
export const clausulas = pgTable("clausulas", {
  id: smallint().primaryKey().generatedAlwaysAsIdentity(),
  version: smallint().notNull().unique(),
  texto: text().notNull(),
  nota: text(),
  vigenteDesde: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/* ============================================================================
   CATÁLOGO
   ========================================================================== */

export const modelos = pgTable(
  "modelos",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(), // para la URL: /modelo/swift
    linea: text().notNull(),
    tipo: tipoVehiculo().notNull(),
    puestos: smallint().notNull(),
    motor: text(),
    transmision: text(),
    descripcion: text(),
    visible: boolean().notNull().default(false), // nace oculto hasta que esté completo
    mostrarPrecio: boolean().notNull().default(true),
    orden: smallint().notNull().default(0),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    check("modelos_puestos", sql`${t.puestos} between 1 and 9`),
    check("modelos_slug_formato", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("modelos_descripcion_corta", sql`char_length(${t.descripcion}) <= 140`),
  ],
);

export const fotosModelo = pgTable(
  "fotos_modelo",
  {
    id: uuid().primaryKey().defaultRandom(),
    modeloId: uuid()
      .notNull()
      .references(() => modelos.id, { onDelete: "cascade" }),
    claveArchivo: text().notNull(), // ruta dentro del bucket de R2
    textoAlternativo: text(),
    orden: smallint().notNull().default(0), // 0 = portada
    creadoEn: creadoEn(),
  },
  (t) => [uniqueIndex("fotos_modelo_orden_unico").on(t.modeloId, t.orden)],
);

/**
 * Historial de precios: cada actualización es una fila nueva, nunca se sobrescribe.
 * El precio vigente de un modelo es su fila más reciente (ver la vista precios_vigentes).
 */
export const precios = pgTable(
  "precios",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    modeloId: uuid()
      .notNull()
      .references(() => modelos.id, { onDelete: "restrict" }),
    precioLista: pesos().notNull(),
    vigenteDesde: timestamp({ withTimezone: true }).notNull().defaultNow(),
    origen: origenPrecio().notNull().default("manual"),
    loteId: uuid(), // agrupa los precios que llegaron en un mismo PDF
    usuarioId: text().references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    check("precios_positivo", sql`${t.precioLista} > 0`),
    index("precios_modelo_reciente").on(t.modeloId, t.vigenteDesde.desc()),
  ],
);

export const promociones = pgTable(
  "promociones",
  {
    id: uuid().primaryKey().defaultRandom(),
    modeloId: uuid()
      .notNull()
      .references(() => modelos.id, { onDelete: "cascade" }),
    descripcion: text().notNull(),
    valorBono: pesos(),
    hasta: date().notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [
    check("promociones_bono_no_negativo", sql`${t.valorBono} is null or ${t.valorBono} >= 0`),
    index("promociones_modelo_hasta").on(t.modeloId, t.hasta),
  ],
);

/* ============================================================================
   SOLICITUDES
   Una solicitud es una "foto" de lo que el cliente declaró ese día. Por eso los
   datos personales viven aquí y no en una tabla de clientes: si alguien vuelve
   en seis meses con otro salario, la solicitud vieja debe seguir diciendo lo
   mismo que el PDF que se radicó. Desnormalización a propósito.
   ========================================================================== */

export const secuenciaRadicado = pgSequence("radicado_seq", { startWith: 1000 });

export const solicitudes = pgTable(
  "solicitudes",
  {
    id: uuid().primaryKey().defaultRandom(),
    radicado: text()
      .notNull()
      .unique()
      .default(
        sql`'FS-' || to_char(now() at time zone 'America/Bogota', 'YYMMDD') || '-' || lpad(nextval('radicado_seq')::text, 4, '0')`,
      ),
    estado: estadoSolicitud().notNull().default("pendiente_valor"),
    origen: origenSolicitud().notNull().default("directo"),
    vistaEn: timestamp({ withTimezone: true }), // null = Natalia no la ha abierto
    financiera: text(),

    // Vehículo y financiación
    lineaInteres: text(),
    modeloId: uuid().references(() => modelos.id, { onDelete: "set null" }),
    valorVehiculo: pesos(), // lo pone Natalia
    cuotaInicial: pesos().notNull(),
    valorAFinanciar: pesos().generatedAlwaysAs(
      sql`case when valor_vehiculo is null then null else valor_vehiculo - cuota_inicial end`,
    ),
    plazoMeses: smallint().notNull(),

    // Datos personales
    primerApellido: text().notNull(),
    segundoApellido: text(),
    nombres: text().notNull(),
    tipoIdentificacion: tipoIdentificacion().notNull(),
    numeroIdentificacion: text().notNull(),
    fechaExpedicion: date().notNull(),
    lugarExpedicion: text().notNull(),
    fechaNacimiento: date().notNull(),
    lugarNacimiento: text().notNull(),
    genero: genero().notNull(),
    estadoCivil: estadoCivil().notNull(),
    personasACargo: smallint().notNull().default(0),
    profesion: text().notNull(),

    // Contacto y vivienda
    celular: text().notNull(),
    telefonoFijo: text(),
    correo: text().notNull(),
    direccion: text().notNull(),
    barrio: text().notNull(),
    ciudad: text().notNull(),
    estrato: smallint().notNull(),
    tipoVivienda: tipoVivienda().notNull(),
    tiempoVivienda: text().notNull(),
    arrendadorNombre: text(),
    arrendadorTelefono: text(),
    valorArriendo: pesos(),

    // Actividad económica
    actividad: actividadEconomica().notNull(),
    empresa: text(),
    direccionEmpresa: text(),
    telefonoEmpresa: text(),
    cargo: text(),
    antiguedad: text(),
    tipoContrato: tipoContrato(),
    anteriorEmpresa: text(),
    anteriorCargo: text(),
    anteriorAntiguedad: text(),
    anteriorTelefono: text(),
    anteriorTipoContrato: tipoContrato(),

    // Información financiera
    ingresosMensuales: pesos().notNull(),
    egresosMensuales: pesos().notNull(),
    declaraRenta: boolean().notNull(),
    monedaExtranjera: boolean().notNull(),

    // Consentimiento y evidencia de la firma
    clausulaId: smallint()
      .notNull()
      .references(() => clausulas.id),
    aceptaAutorizacionEn: timestamp({ withTimezone: true }).notNull(),
    aceptaDatosEn: timestamp({ withTimezone: true }).notNull(),
    ipFirma: inet(),
    agenteUsuario: text(),

    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
    cerradaEn: timestamp({ withTimezone: true }), // desde aquí cuentan los días de retención
  },
  (t) => [
    check("solicitudes_cuota_positiva", sql`${t.cuotaInicial} > 0`),
    check(
      "solicitudes_cuota_menor_valor",
      sql`${t.valorVehiculo} is null or ${t.cuotaInicial} <= ${t.valorVehiculo}`,
    ),
    check("solicitudes_plazo", sql`${t.plazoMeses} in (12, 24, 36, 48, 60, 72, 84)`),
    check("solicitudes_estrato", sql`${t.estrato} between 1 and 6`),
    check("solicitudes_celular", sql`${t.celular} ~ '^3[0-9]{9}$'`),
    check("solicitudes_identificacion", sql`${t.numeroIdentificacion} ~ '^[0-9]{5,11}$'`),
    check("solicitudes_ingresos", sql`${t.ingresosMensuales} > 0 and ${t.egresosMensuales} >= 0`),
    check(
      "solicitudes_valor_requerido",
      sql`${t.estado} in ('pendiente_valor', 'desistio') or ${t.valorVehiculo} is not null`,
    ),
    index("solicitudes_estado_fecha").on(t.estado, t.creadoEn.desc()),
    index("solicitudes_identificacion").on(t.numeroIdentificacion),
    index("solicitudes_creado").on(t.creadoEn.desc()),
    index("solicitudes_cerrada").on(t.cerradaEn),
  ],
);

export const referencias = pgTable(
  "referencias",
  {
    id: uuid().primaryKey().defaultRandom(),
    solicitudId: uuid()
      .notNull()
      .references(() => solicitudes.id, { onDelete: "cascade" }),
    tipo: tipoReferencia().notNull(),
    nombre: text().notNull(),
    parentesco: text(),
    celular: text().notNull(),
  },
  (t) => [
    uniqueIndex("referencias_una_por_tipo").on(t.solicitudId, t.tipo),
    check("referencias_celular", sql`${t.celular} ~ '^3[0-9]{9}$'`),
  ],
);

/** Relación 1 a 1: la llave primaria es la misma de la solicitud. */
export const conyuges = pgTable("conyuges", {
  solicitudId: uuid()
    .primaryKey()
    .references(() => solicitudes.id, { onDelete: "cascade" }),
  primerApellido: text().notNull(),
  segundoApellido: text(),
  nombres: text().notNull(),
  tipoIdentificacion: tipoIdentificacion().notNull(),
  numeroIdentificacion: text().notNull(),
  fechaNacimiento: date(),
  celular: text().notNull(),
  profesion: text(),
  actividad: actividadEconomica(),
  empresa: text(),
  ingresoMensual: pesos(),
});

export const inmuebles = pgTable("inmuebles", {
  id: uuid().primaryKey().defaultRandom(),
  solicitudId: uuid()
    .notNull()
    .references(() => solicitudes.id, { onDelete: "cascade" }),
  clase: claseInmueble().notNull(),
  direccion: text().notNull(),
  ciudad: text().notNull(),
  matricula: text(),
  valor: pesos().notNull(),
  saldoHipoteca: pesos(),
});

export const vehiculosCliente = pgTable("vehiculos_cliente", {
  id: uuid().primaryKey().defaultRandom(),
  solicitudId: uuid()
    .notNull()
    .references(() => solicitudes.id, { onDelete: "cascade" }),
  marca: text().notNull(),
  placa: text().notNull(),
  modeloAnio: smallint(),
  valor: pesos(),
  pignoradoA: text(),
  saldoObligacion: pesos(),
});

/**
 * Archivos de cada solicitud (fotos de cédula, firma y PDF generados).
 * El archivo vive en R2; aquí solo queda la referencia y su huella SHA-256.
 * Cuando se aplica la retención se borra el archivo y se marca eliminadoEn,
 * pero la fila queda como constancia.
 */
export const documentos = pgTable(
  "documentos",
  {
    id: uuid().primaryKey().defaultRandom(),
    solicitudId: uuid()
      .notNull()
      .references(() => solicitudes.id, { onDelete: "cascade" }),
    tipo: tipoArchivo().notNull(),
    claveArchivo: text().notNull(),
    tipoMime: text().notNull(),
    tamanoBytes: integer().notNull(),
    sha256: text().notNull(),
    creadoEn: creadoEn(),
    eliminadoEn: timestamp({ withTimezone: true }),
  },
  (t) => [uniqueIndex("documentos_uno_por_tipo").on(t.solicitudId, t.tipo)],
);

export const historial = pgTable(
  "historial",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    solicitudId: uuid()
      .notNull()
      .references(() => solicitudes.id, { onDelete: "cascade" }),
    actor: actor().notNull(),
    usuarioId: text().references(() => user.id, { onDelete: "set null" }),
    descripcion: text().notNull(),
    datos: jsonb().$type<{ campo?: string; antes?: unknown; despues?: unknown }>(),
    creadoEn: creadoEn(),
  },
  (t) => [index("historial_solicitud_fecha").on(t.solicitudId, t.creadoEn)],
);

export const notas = pgTable(
  "notas",
  {
    id: uuid().primaryKey().defaultRandom(),
    solicitudId: uuid()
      .notNull()
      .references(() => solicitudes.id, { onDelete: "cascade" }),
    texto: text().notNull(),
    usuarioId: text().references(() => user.id, { onDelete: "set null" }),
    creadoEn: creadoEn(),
  },
  (t) => [index("notas_solicitud_fecha").on(t.solicitudId, t.creadoEn)],
);

/** Mensajes que el bot envió con PDF, para borrarlos del chat a las 24 horas. */
export const enviosTelegram = pgTable(
  "envios_telegram",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    solicitudId: uuid().references(() => solicitudes.id, { onDelete: "set null" }),
    tipo: tipoArchivo().notNull(),
    chatId: bigint({ mode: "number" }).notNull(),
    mensajeId: integer().notNull(),
    enviadoEn: creadoEn(),
    borrarDespuesDe: timestamp({ withTimezone: true }).notNull(),
    borradoEn: timestamp({ withTimezone: true }),
  },
  (t) => [
    index("envios_telegram_pendientes")
      .on(t.borrarDespuesDe)
      .where(sql`${t.borradoEn} is null`),
  ],
);

/* ============================================================================
   AUDITORÍA
   Solo se puede insertar. Un trigger (migración de reglas) bloquea UPDATE y
   DELETE, salvo borrar registros con más de un año.
   usuarioId NO es llave foránea a propósito: el registro debe sobrevivir
   aunque algún día se borre el usuario, y el trigger impediría ponerlo en null.
   ========================================================================== */

export const auditoria = pgTable(
  "auditoria",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    creadoEn: creadoEn(),
    actor: actor().notNull(),
    usuarioId: text(),
    accion: text().notNull(),
    entidad: text(),
    entidadId: text(),
    ip: inet(),
    detalle: jsonb(),
  },
  (t) => [
    index("auditoria_fecha").on(t.creadoEn.desc()),
    index("auditoria_entidad").on(t.entidad, t.entidadId),
  ],
);

/* ============================================================================
   VISTA: precio vigente de cada modelo
   La crea la migración de reglas a mano (SQL); aquí solo se declara para poder
   consultarla con tipos. .existing() le dice a Drizzle que no la administre.
   ========================================================================== */

export const preciosVigentes = pgView("precios_vigentes", {
  modeloId: uuid().notNull(),
  precioLista: pesos().notNull(),
  vigenteDesde: timestamp({ withTimezone: true }).notNull(),
  origen: origenPrecio().notNull(),
  desactualizado: boolean().notNull(),
}).existing();
