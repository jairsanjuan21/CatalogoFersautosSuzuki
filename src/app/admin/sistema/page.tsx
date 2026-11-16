import { Suspense } from "react";
import { exigirRol } from "@/lib/sesion";
import { haceCuanto } from "@/lib/etiquetas";
import { estadoSistema, legible } from "@/modulos/admin/sistema";
import { Titulo } from "../componentes";
import { BotonRetencion } from "./BotonRetencion";

export default function Sistema() {
  return (
    <>
      <Titulo sub="Estado de los servicios, almacenamiento, retención de documentos y respaldos.">Sistema</Titulo>
      <Suspense fallback={<p className="mt-8 text-texto-2">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </>
  );
}

type Tono = "ok" | "ambar" | "gris";

const Punto = ({ tono }: { tono: Tono }) => (
  <span aria-hidden className={`mr-2 inline-block size-2.5 rounded-full ${tono === "ok" ? "bg-ok" : tono === "ambar" ? "bg-ambar" : "bg-linea-2"}`} />
);

const ZONA = "America/Bogota";
/** "2026-11-06" (columna date) → "6 nov 2026" */
const fechaDeLista = (f: string) => new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${f}T00:00:00Z`));
const fechaHora = (d: Date) => new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
/** Hoy en Colombia, como "2026-11-15", para comparar con fechas de la base */
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());

async function Contenido() {
  await exigirRol("admin");
  const s = await estadoSistema();

  const ia: [Tono, string, string] = !s.ia.configurada
    ? ["ambar", "Sin configurar", "Falta GEMINI_API_KEY en el .env del servidor. Sin ella no funcionan «Sugerir con IA» ni «Completar con IA»."]
    : [
        s.ia.usados >= s.ia.tope ? "ambar" : "ok",
        s.ia.usados >= s.ia.tope ? "Tope alcanzado" : "Activa",
        `Modelo ${s.ia.modelo}. ${s.ia.usados} de ${s.ia.tope} usos este mes entre descripciones y fichas técnicas${s.ia.ultimo ? `; el último ${haceCuanto(s.ia.ultimo)}` : ""}. El tope se cambia con IA_USOS_MES.`,
      ];

  const l = s.lista;
  const vencida = !!l?.vigenteHasta && l.vigenteHasta < hoy();
  const lista: [Tono, string, string] = !l
    ? ["ambar", "Sin importar", "Ninguna lista de Excel cargada todavía. Se sube en Catálogo › Precios."]
    : [
        vencida ? "ambar" : "ok",
        vencida ? "Vencida" : l.vigenteHasta ? "Vigente" : "Cargada",
        [
          `Lista${l.numero ? ` No. ${l.numero}` : ""}${l.fecha ? ` del ${fechaDeLista(l.fecha)}` : ""}, ${l.versiones} precios, importada ${haceCuanto(l.creadoEn)}.`,
          l.vigenteHasta ? `${vencida ? "Venció" : "Vigente hasta"} el ${fechaDeLista(l.vigenteHasta)}.` : "Sin fecha de vencimiento.",
          vencida ? "Hay que subir la lista nueva de Fersautos." : "",
        ]
          .filter(Boolean)
          .join(" "),
      ];

  const sinPrecio = s.catalogo.versiones - s.catalogo.conPrecio;
  const servicios: [string, Tono, string, string][] = [
    ["Base de datos", "ok", "PostgreSQL conectado", `${s.tamanoBd}, ${s.solicitudes} solicitudes, ${s.auditoria} registros de auditoría.`],
    ["Almacenamiento", "ok", s.almacenamiento, `Documentos: ${legible(s.documentos.bytes)} (${s.documentos.n}). Fotos públicas: ${legible(s.fotosBytes)} (${s.fotos} fotos).`],
    ["IA (Gemini)", ...ia],
    ["Lista de precios", ...lista],
    [
      "Catálogo público",
      sinPrecio ? "ambar" : "ok",
      `${s.catalogo.modelos} modelos publicados`,
      sinPrecio
        ? `${s.catalogo.conPrecio} de ${s.catalogo.versiones} versiones tienen precio vigente. ${sinPrecio === 1 ? "Revisa la que falta" : `Revisa las ${sinPrecio} que faltan`} en Catálogo › Precios.`
        : `Las ${s.catalogo.versiones} versiones publicadas tienen precio vigente.`,
    ],
    ["Generador de PDF", "ok", "Funcionando", "Formulario F-NS-01, cédula, y formulario + cédula en un solo archivo."],
    ["Monitoreo del VPS", s.metricas ? "ok" : "gris", s.metricas ? "Conectado" : "Sin configurar", s.metricas ? "Envía las visitas y la actividad al panel de MetricasVPS." : "Opcional: METRICAS_INGESTA_URL y METRICAS_TOKEN."],
    [
      "Bot de Telegram",
      !s.telegram.configurado ? "gris" : s.telegram.vinculadoEn ? "ok" : "ambar",
      !s.telegram.configurado ? "Sin configurar" : s.telegram.vinculadoEn ? "Vinculado" : "Sin vincular",
      !s.telegram.configurado
        ? "Crea el bot con @BotFather y pon su token en TELEGRAM_BOT_TOKEN. Entrega a Natalia los PDF de las solicitudes."
        : s.telegram.vinculadoEn
          ? `Entrega a Natalia el PDF formulario + cédula desde cada solicitud. Vinculado ${haceCuanto(s.telegram.vinculadoEn)}.`
          : "El token está puesto. Falta que Natalia lo vincule en Mi perfil › Telegram.",
    ],
    ["Correo", "gris", "No se usa", "Cada cuenta cambia su contraseña: Natalia en Mi perfil y tú en Usuarios. Si Natalia la olvida, le asignas una nueva en Usuarios."],
  ];

  return (
    <>
      <div className="mt-6 rounded-xl border border-linea bg-superficie p-4">
        <p className="text-sm font-semibold text-texto-2">Versión en funcionamiento</p>
        {s.compilada ? (
          <>
            <p className="font-display mt-0.5 text-xl font-semibold">
              Compilada el {fechaHora(s.compilada)} <span className="text-base font-normal text-texto-2">({haceCuanto(s.compilada)})</span>
            </p>
            <p className="mt-1 text-[13px] text-texto-2">Si después de desplegar esta fecha no cambia, el servidor sigue con la versión anterior: reconstruye la imagen de la app.</p>
          </>
        ) : (
          <p className="mt-0.5">Servidor de desarrollo: se actualiza solo al guardar cambios.</p>
        )}
        <p className="mt-2 text-[13px] text-texto-2">
          Entorno: {s.entorno}. Node.js {s.node}.
        </p>
      </div>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Servicios</h2>
      <div className="overflow-hidden rounded-xl border border-linea bg-superficie">
        <ul>
          {servicios.map(([nombre, tono, estado, detalle]) => (
            <li key={nombre} className="grid gap-x-4 gap-y-0.5 border-b border-linea px-4 py-3 text-[15px] last:border-b-0 sm:grid-cols-[170px_190px_1fr]">
              <span className="font-semibold">{nombre}</span>
              <span className="flex items-center self-start">
                <Punto tono={tono} />
                {estado}
              </span>
              <span className="text-texto-2">{detalle}</span>
            </li>
          ))}
        </ul>
      </div>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Retención de documentos</h2>
      <div className="rounded-xl border border-linea bg-superficie p-4">
        <p>
          Las fotos de cédula y las firmas se borran {s.retencion.dias} días después de cerrar cada solicitud. En producción esto se ejecuta solo cada noche.
        </p>
        <p className={`mt-2 font-semibold ${s.retencion.archivos ? "text-ambar" : "text-ok"}`}>
          {s.retencion.archivos ? `${s.retencion.archivos} archivos de ${s.retencion.solicitudes} solicitudes ya cumplieron el plazo.` : "No hay documentos vencidos."}
        </p>
        <BotonRetencion pendientes={s.retencion.archivos} />
      </div>

      <h2 className="font-display mt-7 mb-2.5 text-[22px] font-semibold">Respaldos</h2>
      <div className="rounded-xl border border-linea bg-superficie p-4 text-[15px]">
        <p>
          El script <code className="rounded bg-fondo px-1.5 py-0.5 text-sm">respaldo.sh</code> copia la base de datos y los archivos (cédulas, firmas y fotos) a{" "}
          <code className="rounded bg-fondo px-1.5 py-0.5 text-sm">/opt/respaldos/fersautos</code> y conserva los últimos 14 días. Se programa con cron en el VPS para que corra cada noche.
        </p>
        <p className="mt-2 text-ambar">Esas copias quedan en el mismo servidor: si el VPS falla, se pierden con él. De vez en cuando descarga una copia a otro lugar.</p>
      </div>
    </>
  );
}
