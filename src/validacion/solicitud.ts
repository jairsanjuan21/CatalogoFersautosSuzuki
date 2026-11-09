import { z } from "zod";

// Mensajes de Zod en español para los casos que no personalizamos
z.config(z.locales.es());

/* ============================================================================
   VALIDACIÓN DE LA SOLICITUD DE CRÉDITO
   Este archivo se usa en el navegador (para mostrar errores al cliente) y en el
   servidor (para no confiar en lo que llega). Una sola fuente de verdad.

   Los datos van agrupados por paso del formulario: cada paso se valida con su
   propio esquema, y la solicitud completa es la unión de todos los pasos.
   ========================================================================== */

export const PLAZOS = [12, 24, 36, 48, 60, 72, 84] as const;

export const OPCIONES = {
  tipoIdentificacion: { cc: "Cédula de ciudadanía", ce: "Cédula de extranjería" },
  genero: { f: "Femenino", m: "Masculino" },
  estadoCivil: {
    soltero: "Soltero(a)",
    casado: "Casado(a)",
    union_libre: "Unión libre",
    separado: "Separado(a)",
    divorciado: "Divorciado(a)",
    viudo: "Viudo(a)",
  },
  tipoVivienda: { familiar: "Familiar", propia: "Propia", arrendada: "Arrendada" },
  actividad: {
    empleado: "Empleado",
    independiente: "Independiente",
    pensionado: "Pensionado",
    rentista: "Rentista de capital",
  },
  tipoContrato: { fijo: "Fijo", indefinido: "Indefinido", servicios: "Prestación de servicios" },
  claseInmueble: { apartamento: "Apartamento", casa: "Casa", local: "Local", finca: "Finca" },
} as const;

const claves = <T extends Record<string, string>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/* ---------- piezas reutilizables ---------- */

const requerido = (campo: string) => ({ error: `Escribe ${campo}.` });
const elige = { error: "Elige una opción." };

const texto = (campo: string, max = 80) =>
  z
    .string(requerido(campo))
    .trim()
    .min(1, requerido(campo))
    .max(max, { error: `Máximo ${max} caracteres.` });

const textoOpcional = (max = 80) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres.` })
    .optional()
    .transform((v) => (v ? v : undefined));

const celular = z
  .string({ error: "Escribe un celular." })
  .regex(/^3\d{9}$/, { error: "Escribe un celular de 10 dígitos que empiece por 3." });

const telefono = z
  .string()
  .regex(/^(\d{7}|\d{10})$/, { error: "Escribe un teléfono de 7 o 10 dígitos." });

const telefonoOpcional = z
  .union([telefono, z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

const pesos = (campo: string) =>
  z
    .number({ error: `Escribe ${campo}.` })
    .int({ error: "Escribe un valor sin decimales." })
    .positive({ error: "Escribe un valor mayor que cero." })
    .max(99_999_999_999, { error: "El valor es demasiado alto." });

const pesosOpcional = z
  .number()
  .int()
  .nonnegative()
  .max(99_999_999_999)
  .optional();

const fecha = (campo: string) =>
  z.iso.date({ error: `Escribe ${campo}.` }).refine((v) => new Date(v) <= new Date(), {
    error: "La fecha no puede ser futura.",
  });

function edad(fechaNacimiento: string, hoy = new Date()) {
  const n = new Date(fechaNacimiento);
  let anios = hoy.getFullYear() - n.getFullYear();
  const cumplioEsteAnio =
    hoy.getMonth() > n.getMonth() || (hoy.getMonth() === n.getMonth() && hoy.getDate() >= n.getDate());
  if (!cumplioEsteAnio) anios--;
  return anios;
}

/* ============================================================================
   PASOS
   ========================================================================== */

export const pasoVehiculo = z.object({
  lineaInteres: textoOpcional(60),
  cuotaInicial: pesos("la cuota inicial"),
  plazoMeses: z
    .number(elige)
    .refine((v) => (PLAZOS as readonly number[]).includes(v), elige),
});

export const pasoPersonal = z
  .object({
    primerApellido: texto("tu primer apellido", 60),
    segundoApellido: textoOpcional(60),
    nombres: texto("tus nombres", 80),
    tipoIdentificacion: z.enum(claves(OPCIONES.tipoIdentificacion), elige),
    numeroIdentificacion: z
      .string(requerido("tu número de documento"))
      .regex(/^\d{5,11}$/, { error: "Escribe solo números, entre 5 y 11 dígitos." }),
    fechaExpedicion: fecha("la fecha de expedición"),
    lugarExpedicion: texto("el lugar de expedición", 60),
    fechaNacimiento: fecha("tu fecha de nacimiento").refine((v) => edad(v) >= 18, {
      error: "Para solicitar el crédito debes ser mayor de edad.",
    }),
    lugarNacimiento: texto("tu lugar de nacimiento", 60),
    genero: z.enum(claves(OPCIONES.genero), elige),
    estadoCivil: z.enum(claves(OPCIONES.estadoCivil), elige),
    personasACargo: z
      .number(requerido("cuántas personas tienes a cargo"))
      .int()
      .min(0)
      .max(20, { error: "Revisa este número." }),
    profesion: texto("tu profesión u ocupación", 80),
  })
  .superRefine((d, ctx) => {
    if (d.fechaExpedicion && d.fechaNacimiento && d.fechaExpedicion <= d.fechaNacimiento) {
      ctx.addIssue({
        code: "custom",
        path: ["fechaExpedicion"],
        message: "La expedición debe ser posterior a tu nacimiento.",
      });
    }
  });

export const pasoContacto = z
  .object({
    celular,
    telefonoFijo: telefonoOpcional,
    correo: z.email({ error: "Revisa el correo: debe verse como nombre@dominio.com" }).max(120),
    direccion: texto("tu dirección", 120),
    barrio: texto("tu barrio", 60),
    ciudad: texto("tu ciudad", 60),
    estrato: z.number(elige).int().min(1, elige).max(6, elige),
    tipoVivienda: z.enum(claves(OPCIONES.tipoVivienda), elige),
    tiempoVivienda: texto("el tiempo en la vivienda", 40),
    arrendadorNombre: textoOpcional(80),
    arrendadorTelefono: telefonoOpcional,
    valorArriendo: pesosOpcional,
  })
  .superRefine((d, ctx) => {
    if (d.tipoVivienda !== "arrendada") return;
    if (!d.arrendadorNombre)
      ctx.addIssue({ code: "custom", path: ["arrendadorNombre"], message: "Escribe el nombre del arrendador." });
    if (!d.arrendadorTelefono)
      ctx.addIssue({ code: "custom", path: ["arrendadorTelefono"], message: "Escribe el teléfono del arrendador." });
    if (!d.valorArriendo)
      ctx.addIssue({ code: "custom", path: ["valorArriendo"], message: "Escribe el valor del arriendo." });
  });

export const pasoActividad = z
  .object({
    actividad: z.enum(claves(OPCIONES.actividad), elige),
    empresa: textoOpcional(120),
    direccionEmpresa: textoOpcional(120),
    telefonoEmpresa: telefonoOpcional,
    cargo: textoOpcional(80),
    antiguedad: textoOpcional(40),
    tipoContrato: z.enum(claves(OPCIONES.tipoContrato), elige).optional(),
    tieneEmpleoAnterior: z.boolean().default(false),
    anteriorEmpresa: textoOpcional(120),
    anteriorCargo: textoOpcional(80),
    anteriorAntiguedad: textoOpcional(40),
    anteriorTelefono: telefonoOpcional,
    anteriorTipoContrato: z.enum(claves(OPCIONES.tipoContrato), elige).optional(),
  })
  .superRefine((d, ctx) => {
    const falta = (campo: string, mensaje: string) =>
      ctx.addIssue({ code: "custom", path: [campo], message: mensaje });
    if (!d.empresa) falta("empresa", "Completa este dato.");
    const conLugarDeTrabajo = d.actividad === "empleado" || d.actividad === "independiente";
    if (conLugarDeTrabajo && !d.direccionEmpresa) falta("direccionEmpresa", "Escribe la dirección.");
    if (conLugarDeTrabajo && !d.antiguedad) falta("antiguedad", "Escribe la antigüedad.");
    if (d.actividad === "empleado") {
      if (!d.cargo) falta("cargo", "Escribe tu cargo.");
      if (!d.tipoContrato) falta("tipoContrato", "Elige el tipo de contrato.");
      if (d.tieneEmpleoAnterior && !d.anteriorEmpresa) falta("anteriorEmpresa", "Escribe la empresa anterior.");
    }
  });

const inmueble = z.object({
  clase: z.enum(claves(OPCIONES.claseInmueble), elige),
  direccion: texto("la dirección del inmueble", 120),
  ciudad: texto("la ciudad", 60),
  matricula: textoOpcional(40),
  valor: pesos("el valor del inmueble"),
  saldoHipoteca: pesosOpcional,
});

const vehiculoCliente = z.object({
  marca: texto("la marca", 40),
  placa: z
    .string(requerido("la placa"))
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}\d{2}[A-Z0-9]$/, { error: "Escribe la placa como ABC123." }),
  modeloAnio: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional(),
  valor: pesosOpcional,
  pignoradoA: textoOpcional(80),
  saldoObligacion: pesosOpcional,
});

export const pasoFinanzas = z.object({
  ingresosMensuales: pesos("tus ingresos mensuales"),
  egresosMensuales: z
    .number(requerido("tus gastos mensuales"))
    .int()
    .nonnegative({ error: "Revisa este valor." })
    .max(99_999_999_999),
  declaraRenta: z.boolean(elige),
  monedaExtranjera: z.boolean(elige),
  inmueble: inmueble.optional(),
  vehiculo: vehiculoCliente.optional(),
});

const referenciaConParentesco = z.object({
  nombre: texto("el nombre completo", 80),
  parentesco: texto("el parentesco", 40),
  celular,
});
const referencia = z.object({ nombre: texto("el nombre", 80), celular });

export const pasoReferencias = z
  .object({
    familiar: referenciaConParentesco,
    personal: referencia,
    comercial: referencia,
  })
  .superRefine((d, ctx) => {
    const vistos = new Map<string, string>();
    for (const tipo of ["familiar", "personal", "comercial"] as const) {
      const cel = d[tipo]?.celular;
      if (!cel) continue;
      if (vistos.has(cel)) {
        ctx.addIssue({ code: "custom", path: [tipo, "celular"], message: "Este número ya está en otra referencia." });
      }
      vistos.set(cel, tipo);
    }
  });

export const pasoConyuge = z.object({
  conyuge: z
    .object({
      primerApellido: texto("el primer apellido", 60),
      segundoApellido: textoOpcional(60),
      nombres: texto("los nombres", 80),
      tipoIdentificacion: z.enum(claves(OPCIONES.tipoIdentificacion), elige),
      numeroIdentificacion: z
        .string(requerido("el número de documento"))
        .regex(/^\d{5,11}$/, { error: "Escribe solo números, entre 5 y 11 dígitos." }),
      fechaNacimiento: z
        .union([z.iso.date(), z.literal("")])
        .optional()
        .transform((v) => (v ? v : undefined)),
      celular,
      profesion: textoOpcional(80),
      actividad: z.enum(claves(OPCIONES.actividad), elige).optional(),
      empresa: textoOpcional(120),
      ingresoMensual: pesosOpcional,
    })
    .optional(),
});

export const pasoConsentimiento = z.object({
  clausulaVersion: z.number().int().positive(),
  aceptaAutorizacion: z.literal(true, { error: "Debes aceptar la autorización para enviar la solicitud." }),
  aceptaDatos: z.literal(true, { error: "Debes autorizar el tratamiento de tus datos." }),
});

/* ============================================================================
   SOLICITUD COMPLETA
   ========================================================================== */

export const esquemaSolicitud = z
  .object({
    vehiculo: pasoVehiculo,
    personal: pasoPersonal,
    contacto: pasoContacto,
    actividad: pasoActividad,
    finanzas: pasoFinanzas,
    referencias: pasoReferencias,
    conyuge: pasoConyuge,
    consentimiento: pasoConsentimiento,
  })
  .superRefine((d, ctx) => {
    // Reglas que cruzan pasos
    const celularPropio = d.contacto?.celular;
    for (const tipo of ["familiar", "personal", "comercial"] as const) {
      if (celularPropio && d.referencias?.[tipo]?.celular === celularPropio) {
        ctx.addIssue({
          code: "custom",
          path: ["referencias", tipo, "celular"],
          message: "La referencia no puede tener tu mismo número.",
        });
      }
    }
    const doc = d.personal?.numeroIdentificacion;
    if (doc && d.conyuge?.conyuge?.numeroIdentificacion === doc) {
      ctx.addIssue({
        code: "custom",
        path: ["conyuge", "conyuge", "numeroIdentificacion"],
        message: "Debe ser distinto a tu número de documento.",
      });
    }
  });

export type Solicitud = z.output<typeof esquemaSolicitud>;
export type SolicitudEntrada = z.input<typeof esquemaSolicitud>;
export type NombrePaso = keyof Solicitud;

/** Convierte los errores de Zod en { "contacto.celular": "mensaje" } para pintarlos. */
export function erroresPorCampo(error: z.ZodError) {
  const salida: Record<string, string> = {};
  for (const issue of error.issues) {
    const clave = issue.path.join(".");
    if (!(clave in salida)) salida[clave] = issue.message;
  }
  return salida;
}

/* ============================================================================
   ARCHIVOS
   ========================================================================== */

export const ARCHIVOS = {
  tiposFoto: ["image/jpeg", "image/png", "image/webp"],
  maxBytesFoto: 8 * 1024 * 1024,
  maxBytesFirma: 512 * 1024,
} as const;
