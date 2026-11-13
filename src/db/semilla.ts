import "dotenv/config";
import { count, eq, sql } from "drizzle-orm";
import { db, pool } from "./index";
import * as t from "./esquema";
import { CLAUSULA_V1 } from "./clausula-v1";

/**
 * Semilla idempotente: se puede correr varias veces sin duplicar nada.
 * - Datos base (configuración, cláusula, modelos): siempre.
 * - Datos de ejemplo (precios, promociones, solicitudes): solo fuera de producción.
 */

const DIA = 86_400_000;
const haceDias = (d: number) => new Date(Date.now() - d * DIA);
const enDias = (d: number) => new Date(Date.now() + d * DIA).toISOString().slice(0, 10);

type Version = readonly [nombre: string, transmision: "mecanica" | "automatica" | null, precio: number];

const MODELOS = [
  { slug: "swift", linea: "Swift", tipo: "hatchback", puestos: 5, motor: "1.2 L gasolina", transmision: "Mecánica o automática", descripcion: "Ágil en la ciudad, fácil de parquear y económico en el día a día.", precioBase: 76_990_000,
    versiones: [["GL 1.2", "mecanica", 78_990_000], ["GLX 1.2", "automatica", 87_490_000]] },
  { slug: "dzire", linea: "Dzire", tipo: "sedan", puestos: 5, motor: "1.2 L gasolina", transmision: "Mecánica o automática", descripcion: "Sedán compacto con baúl amplio para la familia y los viajes.", precioBase: 78_990_000,
    versiones: [["GL 1.2", "mecanica", 79_990_000], ["GLX 1.2", "automatica", 88_990_000]] },
  { slug: "s-presso", linea: "S-Presso", tipo: "hatchback", puestos: 5, motor: "1.0 L gasolina", transmision: "Mecánica", descripcion: "El Suzuki más accesible, ideal como primer carro.", precioBase: 59_990_000,
    versiones: [["GL 1.0", "mecanica", 60_490_000]] },
  { slug: "ignis", linea: "Ignis", tipo: "hatchback", puestos: 5, motor: "1.2 L gasolina", transmision: "Mecánica o automática", descripcion: "Compacto con altura de crossover y mucha personalidad.", precioBase: 74_990_000,
    versiones: [["GLX 1.2", "mecanica", 75_490_000], ["GLX 1.2", "automatica", 82_990_000]] },
  { slug: "vitara", linea: "Vitara", tipo: "suv", puestos: 5, motor: "1.5 L híbrido", transmision: "Automática", descripcion: "Camioneta cómoda para ciudad y carretera, con buena altura al piso.", precioBase: 119_990_000,
    versiones: [["1.5 Hybrid AllGrip", "automatica", 120_990_000]] },
  { slug: "jimny", linea: "Jimny", tipo: "todoterreno", puestos: 4, motor: "1.5 L gasolina", transmision: "Mecánica o automática", descripcion: "Todoterreno de verdad, para los que no se quedan en el pavimento.", precioBase: 139_990_000, mostrarPrecio: false,
    versiones: [["GLX 1.5", "mecanica", 139_990_000], ["GLX 1.5", "automatica", 149_990_000]] },
  { slug: "ertiga", linea: "Ertiga", tipo: "familiar", puestos: 7, motor: "1.5 L gasolina", transmision: "Mecánica o automática", descripcion: "Siete puestos para que nadie se quede en la casa.", precioBase: 99_990_000,
    versiones: [["GLX 1.5", "mecanica", 99_990_000]] },
] as const satisfies readonly { versiones: readonly Version[]; [k: string]: unknown }[];

async function datosBase() {
  await db
    .insert(t.configuracion)
    .values({ id: 1, asesoraNombre: "Dayerly Natalia Garcia Sierra", asesoraCc: "1094044975", sede: "Diagonal Santander" })
    .onConflictDoNothing();

  await db
    .insert(t.clausulas)
    .values({ version: 1, texto: CLAUSULA_V1, nota: "Formato F-NS-01, versión 1 (5/04/2016)" })
    .onConflictDoNothing();

  await db
    .insert(t.modelos)
    // Las versiones van en su propia tabla: se quitan del objeto antes de insertar el modelo
    .values(MODELOS.map((m, i) => ({ ...Object.fromEntries(Object.entries(m).filter(([k]) => k !== "versiones")), visible: true, orden: i, precioBaseActualizado: new Date() }) as typeof t.modelos.$inferInsert))
    .onConflictDoNothing({ target: t.modelos.slug });

  // Versiones de cada modelo (estructura del catálogo, no datos de ejemplo)
  const ids = await db.select({ id: t.modelos.id, slug: t.modelos.slug }).from(t.modelos);
  const filas = MODELOS.flatMap((m) => {
    const modeloId = ids.find((x) => x.slug === m.slug)?.id;
    return modeloId ? m.versiones.map(([nombre, transmision], orden) => ({ modeloId, nombre, transmision, orden })) : [];
  });
  if (filas.length) await db.insert(t.versiones).values(filas).onConflictDoNothing();

  console.log("✔ Datos base: configuración, cláusula, 7 modelos y sus versiones");
}

async function datosDeEjemplo() {
  const [{ total }] = await db.select({ total: count() }).from(t.solicitudes);
  if (total > 0) {
    console.log("• Ya hay solicitudes; no se cargan datos de ejemplo");
    return;
  }

  const modelos = await db.select({ id: t.modelos.id, slug: t.modelos.slug }).from(t.modelos);
  const id = (slug: string) => modelos.find((m) => m.slug === slug)!.id;
  const [clausula] = await db.select({ id: t.clausulas.id }).from(t.clausulas).where(eq(t.clausulas.version, 1));

  await db.transaction(async (tx) => {
    // Precios por versión. Vitara (9 días) y Ertiga (12 días) quedan desactualizados a propósito
    const versiones = await tx.select({ id: t.versiones.id, modeloId: t.versiones.modeloId, nombre: t.versiones.nombre, transmision: t.versiones.transmision }).from(t.versiones);
    const antiguedad: Record<string, number> = { vitara: 9, ertiga: 12 };
    const precios = MODELOS.flatMap((m) =>
      m.versiones.flatMap(([nombre, transmision, precio]) => {
        const v = versiones.find((x) => x.modeloId === id(m.slug) && x.nombre === nombre && x.transmision === transmision);
        return v ? [{ versionId: v.id, precioLista: precio, vigenteDesde: haceDias(antiguedad[m.slug] ?? 1) }] : [];
      }),
    );
    const swiftGl = versiones.find((x) => x.modeloId === id("swift") && x.transmision === "mecanica")!;
    await tx.insert(t.precios).values([{ versionId: swiftGl.id, precioLista: 77_990_000, vigenteDesde: haceDias(20) }, ...precios]);
    const versionDe = (slug: string, tr: "mecanica" | "automatica") => versiones.find((x) => x.modeloId === id(slug) && x.transmision === tr)?.id;

    // Ventas manuales repartidas en los últimos meses, para que el gráfico de comisiones tenga forma
    const dia = (dias: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(haceDias(dias));
    const ejemplos: [string, "mecanica" | "automatica", number, number, "contado" | "credito", string | null][] = [
      ["swift", "mecanica", 78_990_000, 3, "contado", "Carlos R."],
      ["dzire", "automatica", 88_990_000, 12, "credito", null],
      ["s-presso", "mecanica", 60_490_000, 38, "credito", "Familia Peña"],
      ["swift", "automatica", 87_490_000, 45, "contado", null],
      ["vitara", "automatica", 119_990_000, 70, "credito", "Andrea M."],
      ["ignis", "mecanica", 75_490_000, 104, "contado", null],
      ["dzire", "mecanica", 79_990_000, 131, "credito", null],
    ];
    await tx.insert(t.ventas).values(
      ejemplos.map(([slug, tr, valor, dias, formaPago, cliente]) => {
        const m = MODELOS.find((x) => x.slug === slug)!;
        const v = versiones.find((x) => x.modeloId === id(slug) && x.transmision === tr);
        const etiqueta = m.versiones.find((x) => x[1] === tr)?.[0];
        return { fecha: dia(dias), modeloId: id(slug), versionId: v?.id ?? null, vehiculo: `${m.linea} ${etiqueta} ${tr === "mecanica" ? "mecánica" : "automática"}`, valor, formaPago, cliente };
      }),
    );

    await tx.insert(t.promociones).values([
      { modeloId: id("swift"), descripcion: "Bono de descuento por compra a crédito", valorBono: 3_000_000, hasta: enDias(12) },
      { modeloId: id("vitara"), descripcion: "Kit de accesorios y primer mantenimiento", hasta: enDias(3) },
    ]);

    const consentimiento = {
      clausulaId: clausula.id,
      aceptaAutorizacionEn: haceDias(0),
      aceptaDatosEn: haceDias(0),
      ipFirma: "190.85.10.20",
      agenteUsuario: "Datos de ejemplo",
    };

    const [andres, jhon, laura] = await tx
      .insert(t.solicitudes)
      .values([
        {
          ...consentimiento, origen: "instagram", lineaInteres: "Swift", cuotaInicial: 15_000_000, plazoMeses: 60,
          primerApellido: "Rojas", segundoApellido: "Díaz", nombres: "Andrés Felipe", tipoIdentificacion: "cc", numeroIdentificacion: "1090123456",
          fechaExpedicion: "2012-03-15", lugarExpedicion: "Cúcuta", fechaNacimiento: "1994-02-10", lugarNacimiento: "Cúcuta", genero: "m",
          estadoCivil: "union_libre", personasACargo: 1, profesion: "Técnico electricista",
          celular: "3001234567", correo: "andres.rojas@correo.com", direccion: "Calle 10 # 5-20", barrio: "La Riviera", ciudad: "Cúcuta",
          estrato: 3, tipoVivienda: "arrendada", tiempoVivienda: "2 años", arrendadorNombre: "Martha Pérez", arrendadorTelefono: "3109876543", valorArriendo: 900_000,
          actividad: "empleado", empresa: "Distribuidora del Norte S.A.S.", direccionEmpresa: "Av. 7 # 12-40", telefonoEmpresa: "6075712345",
          cargo: "Técnico de mantenimiento", antiguedad: "3 años", tipoContrato: "indefinido",
          ingresosMensuales: 4_200_000, egresosMensuales: 2_100_000, declaraRenta: false, monedaExtranjera: false,
        },
        {
          ...consentimiento, origen: "whatsapp", lineaInteres: "Ertiga", modeloId: id("ertiga"), versionId: versionDe("ertiga", "mecanica"), valorVehiculo: 99_990_000,
          estado: "lista_para_cargar", vistaEn: haceDias(1), cuotaInicial: 30_000_000, plazoMeses: 36, creadoEn: haceDias(1),
          primerApellido: "Carrillo", nombres: "Jhon Fredy", tipoIdentificacion: "cc", numeroIdentificacion: "88234567",
          fechaExpedicion: "2005-07-22", lugarExpedicion: "Cúcuta", fechaNacimiento: "1987-05-30", lugarNacimiento: "Ocaña", genero: "m",
          estadoCivil: "casado", personasACargo: 2, profesion: "Comerciante",
          celular: "3142223344", correo: "jf.carrillo@correo.com", direccion: "Cra 7 # 3-45", barrio: "Centro", ciudad: "Los Patios",
          estrato: 2, tipoVivienda: "propia", tiempoVivienda: "8 años",
          actividad: "independiente", empresa: "Distribuidora de abarrotes", antiguedad: "6 años",
          ingresosMensuales: 7_500_000, egresosMensuales: 3_900_000, declaraRenta: true, monedaExtranjera: true,
        },
        {
          ...consentimiento, origen: "catalogo", lineaInteres: "S-Presso", modeloId: id("s-presso"), versionId: versionDe("s-presso", "mecanica"), valorVehiculo: 60_490_000,
          estado: "en_estudio", financiera: "Bancolombia", vistaEn: haceDias(3), cuotaInicial: 12_000_000, plazoMeses: 72, creadoEn: haceDias(3),
          primerApellido: "Ortiz", nombres: "Laura Valentina", tipoIdentificacion: "cc", numeroIdentificacion: "1093789012",
          fechaExpedicion: "2016-01-12", lugarExpedicion: "Cúcuta", fechaNacimiento: "1998-01-05", lugarNacimiento: "Cúcuta", genero: "f",
          estadoCivil: "soltero", profesion: "Docente",
          celular: "3205551234", correo: "laura.ortiz@correo.com", direccion: "Calle 18 # 2-10", barrio: "La Ceiba", ciudad: "Cúcuta",
          estrato: 4, tipoVivienda: "familiar", tiempoVivienda: "Toda la vida",
          actividad: "empleado", empresa: "Colegio Sagrado Corazón", cargo: "Docente de inglés", antiguedad: "2 años", tipoContrato: "fijo",
          ingresosMensuales: 3_600_000, egresosMensuales: 1_500_000, declaraRenta: false, monedaExtranjera: false,
        },
      ])
      .returning({ id: t.solicitudes.id, radicado: t.solicitudes.radicado });

    const refs = (solicitudId: string, fam: [string, string, string], per: [string, string], com: [string, string]) => [
      { solicitudId, tipo: "familiar" as const, nombre: fam[0], parentesco: fam[1], celular: fam[2] },
      { solicitudId, tipo: "personal" as const, nombre: per[0], celular: per[1] },
      { solicitudId, tipo: "comercial" as const, nombre: com[0], celular: com[1] },
    ];
    await tx.insert(t.referencias).values([
      ...refs(andres.id, ["Luisa Rojas", "Hermana", "3157654321"], ["Carlos Méndez", "3204567890"], ["Ferretería El Tornillo", "3112223344"]),
      ...refs(jhon.id, ["Ana Carrillo", "Esposa", "3150001122"], ["Pedro León", "3006667788"], ["Proveedor La Fama", "3128889900"]),
      ...refs(laura.id, ["Jorge Ortiz", "Padre", "3101112233"], ["Sara Gómez", "3145556677"], ["Tienda Alkosto", "3189990011"]),
    ]);

    await tx.insert(t.conyuges).values({
      solicitudId: jhon.id, primerApellido: "Carrillo", nombres: "Ana", tipoIdentificacion: "cc",
      numeroIdentificacion: "1093456789", celular: "3150001122", actividad: "independiente", empresa: "Venta por catálogo", ingresoMensual: 1_500_000,
    });

    await tx.insert(t.historial).values([
      { solicitudId: andres.id, actor: "cliente", descripcion: "Solicitud recibida desde el formulario" },
      { solicitudId: jhon.id, actor: "cliente", descripcion: "Solicitud recibida desde el formulario", creadoEn: haceDias(1) },
      { solicitudId: jhon.id, actor: "asesora", descripcion: "Valor asignado: $ 99.990.000 (Ertiga GLX 1.5 mecánica)", datos: { campo: "valorVehiculo", antes: null, despues: 99_990_000 } },
      { solicitudId: laura.id, actor: "cliente", descripcion: "Solicitud recibida desde el formulario", creadoEn: haceDias(3) },
      { solicitudId: laura.id, actor: "asesora", descripcion: "Valor asignado: $ 60.490.000 (S-Presso GL 1.0 mecánica)", creadoEn: haceDias(3) },
      { solicitudId: laura.id, actor: "asesora", descripcion: "Cargada en la plataforma de Fersautos (Bancolombia)", creadoEn: haceDias(2) },
    ]);

    await tx.insert(t.notas).values({ solicitudId: laura.id, texto: "La financiera pidió extractos bancarios, los manda el lunes." });

    await tx.insert(t.auditoria).values([
      { actor: "sistema", accion: "Datos de ejemplo cargados", entidad: "semilla" },
      { actor: "sistema", accion: "Solicitud recibida", entidad: "solicitudes", entidadId: andres.radicado },
    ]);
  });

  console.log("✔ Datos de ejemplo: precios por versión, 2 promociones, 3 solicitudes y 7 ventas");
}

async function main() {
  await datosBase();
  if (process.env.NODE_ENV === "production") {
    console.log("• Producción: se omiten los datos de ejemplo");
  } else {
    await datosDeEjemplo();
  }
  const vigentes = await db.execute(sql`select count(*)::int as n from precios_vigentes where not desactualizado`);
  console.log(`✔ Listo. Precios vigentes visibles: ${vigentes.rows[0].n}`);
}

main()
  .catch((e) => {
    console.error("✖ Error al sembrar datos:", e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
